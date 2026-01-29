import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a neutral duplicate detection assistant for the "Before You Trust" platform. Your role is to analyze incident descriptions and determine if they describe the same or similar events.

RULES:
- Be objective and factual in your analysis
- Do not make assumptions about intent or guilt
- Focus on factual similarities: dates, descriptions, amounts, parties involved
- A duplicate is the same incident reported multiple times
- A similar incident is a different occurrence with comparable characteristics
- Provide clear reasoning for your determination

Analyze pairs of incidents and determine:
1. Whether they are duplicates, similar, or distinct
2. Similarity score (0-100)
3. Specific matching elements
4. Distinguishing elements
5. Recommendation for handling`;

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
 * POST /ai-detect-duplicates
 * 
 * Detects duplicate or similar incidents. Rate limited to prevent abuse.
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

    const { entity_id, new_incident } = await req.json();

    if (!entity_id || !new_incident) {
      return new Response(
        JSON.stringify({ error: 'entity_id and new_incident are required' }),
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

    // Record rate limit event
    await supabaseAdmin
      .from('submission_rate_limits')
      .insert({ ip_hash: ipHash, action_type: 'ai_call' });

    // Fetch existing incidents for this entity using service role
    const { data: existingIncidents, error: fetchError } = await supabaseAdmin
      .from('incident_reports')
      .select('id, title, description, date_occurred, category, what_was_promised, what_actually_happened')
      .eq('entity_id', entity_id)
      .in('status', ['pending', 'verified'])
      .order('date_occurred', { ascending: false })
      .limit(20);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing incidents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingIncidents || existingIncidents.length === 0) {
      return new Response(
        JSON.stringify({
          has_duplicates: false,
          has_similar: false,
          duplicates: [],
          similar: [],
          recommendation: 'No existing incidents found for comparison.',
          processing_note: 'This is the first reported incident for this entity.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userPrompt = `Compare this new incident against existing incidents:

NEW INCIDENT:
Title: ${new_incident.title}
Description: ${new_incident.description}
Date: ${new_incident.date_occurred}
Category: ${new_incident.category}

EXISTING INCIDENTS:
${existingIncidents.map((inc, i) => `
[${i + 1}] ID: ${inc.id}
Title: ${inc.title}
Description: ${inc.description}
Date: ${inc.date_occurred}
Category: ${inc.category}
${inc.what_was_promised ? `Promised: ${inc.what_was_promised}` : ''}
${inc.what_actually_happened ? `Happened: ${inc.what_actually_happened}` : ''}
`).join('\n')}

For each existing incident, determine if it's a duplicate (same event), similar (comparable but distinct), or unrelated.`;

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
              name: 'analyze_duplicates',
              description: 'Analyze incidents for duplicates and similarities',
              parameters: {
                type: 'object',
                properties: {
                  duplicates: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        incident_id: { type: 'string' },
                        similarity_score: { type: 'number' },
                        matching_elements: { type: 'array', items: { type: 'string' } },
                        explanation: { type: 'string' }
                      },
                      required: ['incident_id', 'similarity_score', 'matching_elements', 'explanation']
                    },
                    description: 'Incidents that appear to be duplicates (same event)'
                  },
                  similar: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        incident_id: { type: 'string' },
                        similarity_score: { type: 'number' },
                        matching_elements: { type: 'array', items: { type: 'string' } },
                        distinguishing_elements: { type: 'array', items: { type: 'string' } }
                      },
                      required: ['incident_id', 'similarity_score', 'matching_elements', 'distinguishing_elements']
                    },
                    description: 'Incidents that are similar but distinct events'
                  },
                  recommendation: {
                    type: 'string',
                    description: 'Neutral recommendation for how to proceed'
                  }
                },
                required: ['duplicates', 'similar', 'recommendation'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_duplicates' } }
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
        JSON.stringify({ error: 'AI analysis failed' }),
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
        has_duplicates: result.duplicates.length > 0,
        has_similar: result.similar.length > 0,
        duplicates: result.duplicates,
        similar: result.similar,
        recommendation: result.recommendation,
        processing_note: 'Duplicate detection is AI-assisted and serves as a suggestion. Final determination requires human review.'
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
