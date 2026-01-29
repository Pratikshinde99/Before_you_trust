import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a neutral summary writer for the "Before You Trust" platform. Your role is to generate objective, factual summaries of reported incident patterns.

CRITICAL RULES:
- Use neutral, factual language only
- NEVER use accusatory language like "scammer", "fraudster", "criminal"
- NEVER make legal judgments or determinations of guilt
- Use phrases like "reports indicate", "according to submissions", "reported concerns include"
- Present information as reported, not as established fact
- Acknowledge when information is limited or conflicting
- Focus on patterns and frequency rather than conclusions
- Include caveats about the nature of user-submitted reports

Your summary should:
1. Provide a high-level overview of report volume and timeframe
2. Identify common themes in reported incidents
3. Note the distribution across categories
4. Highlight any temporal patterns
5. Include appropriate disclaimers`;

// Rate limit configuration
const AI_RATE_LIMIT = 30;

async function hashIp(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('cf-connecting-ip') || 
         req.headers.get('x-real-ip') ||
         'unknown';
}

/**
 * POST /ai-generate-summary
 * 
 * Generates a neutral summary of incident patterns for an entity.
 * Rate limited to prevent abuse.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Rate limiting check
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);
    const windowStart = new Date(Date.now() - 60 * 60 * 1000);

    const { count } = await supabaseAdmin
      .from('submission_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('action_type', 'ai_call')
      .gte('created_at', windowStart.toISOString());

    if ((count || 0) >= AI_RATE_LIMIT) {
      console.log(`AI rate limit exceeded for IP hash ${ipHash}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' } }
      );
    }

    const { entity_id } = await req.json();

    if (!entity_id) {
      return new Response(
        JSON.stringify({ error: 'entity_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch entity info using service role
    const { data: entity, error: entityError } = await supabaseAdmin
      .from('entities')
      .select('name, type, identifier')
      .eq('id', entity_id)
      .maybeSingle();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({ error: 'Entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch incidents for analysis using service role
    const { data: incidents, error: incidentsError } = await supabaseAdmin
      .from('incident_reports')
      .select('title, description, category, severity, date_occurred, status, what_was_promised, what_actually_happened')
      .eq('entity_id', entity_id)
      .in('status', ['pending', 'verified'])
      .order('date_occurred', { ascending: false })
      .limit(50);

    if (incidentsError) {
      console.error('Fetch error:', incidentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch incidents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!incidents || incidents.length === 0) {
      return new Response(
        JSON.stringify({
          summary: 'No incidents have been reported for this entity.',
          key_patterns: [],
          temporal_analysis: null,
          category_distribution: {},
          data_quality: { total_reports: 0, verified_count: 0, confidence_note: 'No data available' },
          disclaimer: 'This summary is based on user-submitted reports and does not constitute verification of any claims.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record rate limit event (only charge after validation passes)
    await supabaseAdmin
      .from('submission_rate_limits')
      .insert({ ip_hash: ipHash, action_type: 'ai_call' });

    // Calculate basic stats
    const verifiedCount = incidents.filter(i => i.status === 'verified').length;
    const categoryCount: Record<string, number> = {};
    incidents.forEach(inc => {
      categoryCount[inc.category] = (categoryCount[inc.category] || 0) + 1;
    });

    const userPrompt = `Generate a neutral summary for this entity based on reported incidents:

ENTITY:
Name: ${entity.name}
Type: ${entity.type}
Identifier: ${entity.identifier}

REPORT STATISTICS:
Total Reports: ${incidents.length}
Verified Reports: ${verifiedCount}
Date Range: ${incidents[incidents.length - 1]?.date_occurred} to ${incidents[0]?.date_occurred}

CATEGORY DISTRIBUTION:
${Object.entries(categoryCount).map(([cat, count]) => `${cat}: ${count}`).join('\n')}

INCIDENT DETAILS:
${incidents.map((inc, i) => `
[${i + 1}] ${inc.title}
Category: ${inc.category} | Severity: ${inc.severity} | Date: ${inc.date_occurred} | Status: ${inc.status}
Description: ${inc.description}
${inc.what_was_promised ? `Promised: ${inc.what_was_promised}` : ''}
${inc.what_actually_happened ? `Happened: ${inc.what_actually_happened}` : ''}
`).join('\n')}

Generate a neutral, factual summary following the rules provided.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_summary',
              description: 'Generate a neutral summary of incident patterns',
              parameters: {
                type: 'object',
                properties: {
                  summary: {
                    type: 'string',
                    description: 'A neutral, factual summary paragraph (100-200 words)'
                  },
                  key_patterns: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        pattern: { type: 'string' },
                        frequency: { type: 'string' },
                        description: { type: 'string' }
                      },
                      required: ['pattern', 'frequency', 'description']
                    },
                    description: 'Key patterns identified in the reports'
                  },
                  temporal_analysis: {
                    type: 'object',
                    properties: {
                      earliest: { type: 'string' },
                      latest: { type: 'string' },
                      peak_period: { type: 'string' },
                      trend: { type: 'string' }
                    },
                    description: 'Analysis of when incidents were reported'
                  },
                  confidence_note: {
                    type: 'string',
                    description: 'Note about data quality and reliability'
                  }
                },
                required: ['summary', 'key_patterns', 'temporal_analysis', 'confidence_note'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_summary' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'AI summary generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({
        summary: result.summary,
        key_patterns: result.key_patterns,
        temporal_analysis: result.temporal_analysis,
        category_distribution: categoryCount,
        data_quality: {
          total_reports: incidents.length,
          verified_count: verifiedCount,
          confidence_note: result.confidence_note
        },
        disclaimer: 'This summary is generated from user-submitted reports and represents reported experiences, not verified facts. It does not constitute evidence of wrongdoing or legal determination.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
