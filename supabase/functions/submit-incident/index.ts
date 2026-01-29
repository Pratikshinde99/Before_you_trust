import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CATEGORIES = [
  'fraud', 'scam', 'harassment', 'misrepresentation',
  'non_delivery', 'quality_issue', 'safety_concern',
  'data_breach', 'unauthorized_charges', 'other'
];

// Rate limit configuration
const RATE_LIMITS = {
  incident_submission: 10,
  entity_creation: 20
};

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
 * POST /submit-incident
 * 
 * Submit a new incident report with rate limiting and AI-assisted processing.
 * Uses service role for database operations to ensure proper RLS enforcement.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use service role for all database operations
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Rate limiting check
    const clientIp = getClientIp(req);
    const ipHash = await hashIp(clientIp);
    const windowStart = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const { count: submissionCount } = await supabaseAdmin
      .from('submission_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .eq('action_type', 'incident_submission')
      .gte('created_at', windowStart.toISOString());

    if ((submissionCount || 0) >= RATE_LIMITS.incident_submission) {
      console.log(`Rate limit exceeded for IP hash ${ipHash}`);
      return new Response(
        JSON.stringify({ 
          error: 'Too many submissions. Please try again later.',
          retry_after_seconds: 3600 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': '3600'
          } 
        }
      );
    }

    const body = await req.json();
    const {
      entity_id,
      entity,
      title,
      description,
      what_was_promised,
      what_actually_happened,
      category,
      severity,
      date_occurred,
      location,
    } = body;

    // Validation
    const validCategories = CATEGORIES;
    const validSeverities = ['low', 'medium', 'high', 'critical'];

    if (!title || typeof title !== 'string' || title.trim().length < 10 || title.trim().length > 200) {
      return new Response(
        JSON.stringify({ error: 'Title must be 10-200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length < 50 || description.trim().length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Description must be 50-2000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!category || !validCategories.includes(category)) {
      return new Response(
        JSON.stringify({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!severity || !validSeverities.includes(severity)) {
      return new Response(
        JSON.stringify({ error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date_occurred || !/^\d{4}-\d{2}-\d{2}$/.test(date_occurred)) {
      return new Response(
        JSON.stringify({ error: 'date_occurred must be in YYYY-MM-DD format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let resolvedEntityId = entity_id;

    // Create entity if not provided (also rate limited)
    if (!entity_id && entity) {
      // Check entity creation rate limit
      const { count: entityCount } = await supabaseAdmin
        .from('submission_rate_limits')
        .select('*', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .eq('action_type', 'entity_creation')
        .gte('created_at', windowStart.toISOString());

      if ((entityCount || 0) >= RATE_LIMITS.entity_creation) {
        return new Response(
          JSON.stringify({ error: 'Too many entity creations. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' } }
        );
      }

      const { type, name, identifier } = entity;
      const validTypes = ['person', 'business', 'phone', 'website', 'service'];

      if (!type || !validTypes.includes(type)) {
        return new Response(
          JSON.stringify({ error: 'Invalid entity type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!name || !identifier) {
        return new Response(
          JSON.stringify({ error: 'Entity name and identifier are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedIdentifier = identifier.toLowerCase().trim().replace(/\s+/g, '');

      // Check if entity exists
      const { data: existing } = await supabaseAdmin
        .from('entities')
        .select('id')
        .eq('type', type)
        .eq('normalized_identifier', normalizedIdentifier)
        .maybeSingle();

      if (existing) {
        resolvedEntityId = existing.id;
      } else {
        // Record entity creation for rate limiting
        await supabaseAdmin
          .from('submission_rate_limits')
          .insert({ ip_hash: ipHash, action_type: 'entity_creation' });

        const { data: newEntity, error: entityError } = await supabaseAdmin
          .from('entities')
          .insert({
            type,
            name: name.trim(),
            identifier: identifier.trim(),
            normalized_identifier: normalizedIdentifier
          })
          .select('id')
          .single();

        if (entityError) {
          console.error('Create entity error:', entityError);
          return new Response(
            JSON.stringify({ error: 'Failed to create entity' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        resolvedEntityId = newEntity.id;
      }
    }

    if (!resolvedEntityId) {
      return new Response(
        JSON.stringify({ error: 'Either entity_id or entity object is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record rate limit event for incident submission
    await supabaseAdmin
      .from('submission_rate_limits')
      .insert({ ip_hash: ipHash, action_type: 'incident_submission' });

    // Calculate initial confidence based on details provided
    const hasDetails = !!(what_was_promised?.trim() || what_actually_happened?.trim());
    const initialConfidence = hasDetails ? 20 : 10;

    // Create incident report using service role
    const { data: incident, error: incidentError } = await supabaseAdmin
      .from('incident_reports')
      .insert({
        entity_id: resolvedEntityId,
        title: title.trim(),
        description: description.trim(),
        what_was_promised: what_was_promised?.trim() || null,
        what_actually_happened: what_actually_happened?.trim() || null,
        category,
        severity,
        date_occurred,
        location: location?.trim() || null,
        submitter_ip_hash: ipHash,
        status: 'pending',
        verification_confidence: initialConfidence,
        evidence_count: 0
      })
      .select('id, entity_id, title, status, created_at, verification_confidence')
      .single();

    if (incidentError) {
      console.error('Create incident error:', incidentError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit incident report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Incident submitted: ${incident.id} for entity ${resolvedEntityId} (IP hash: ${ipHash})`);

    // AI Processing (non-blocking - run in parallel)
    let aiCategory: { primary_category: string; confidence: number; explanation: string } | null = null;
    let similarIncidents: Array<{ incident_id: string; similarity_score: number; title: string }> = [];
    let similarityWarning = false;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (LOVABLE_API_KEY) {
      try {
        // Run AI categorization and duplicate detection in parallel
        const [categorizationResult, duplicatesResult] = await Promise.allSettled([
          // AI Categorization
          (async () => {
            const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-3-flash-preview',
                messages: [
                  {
                    role: 'system',
                    content: `You are an incident categorization assistant. Analyze the incident and determine the most appropriate category.
Categories: ${CATEGORIES.join(', ')}`
                  },
                  {
                    role: 'user',
                    content: `Title: ${title}\nDescription: ${description}\n${what_was_promised ? `Promised: ${what_was_promised}` : ''}\n${what_actually_happened ? `Happened: ${what_actually_happened}` : ''}`
                  }
                ],
                tools: [{
                  type: 'function',
                  function: {
                    name: 'categorize',
                    description: 'Categorize the incident',
                    parameters: {
                      type: 'object',
                      properties: {
                        primary_category: { type: 'string', enum: CATEGORIES },
                        confidence: { type: 'number', description: '0-100' },
                        explanation: { type: 'string' }
                      },
                      required: ['primary_category', 'confidence', 'explanation'],
                      additionalProperties: false
                    }
                  }
                }],
                tool_choice: { type: 'function', function: { name: 'categorize' } }
              }),
            });
            
            if (!response.ok) return null;
            const data = await response.json();
            const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
            if (!toolCall?.function?.arguments) return null;
            return JSON.parse(toolCall.function.arguments);
          })(),

          // Duplicate Detection - use service role to read all incidents
          (async () => {
            const { data: existingIncidents } = await supabaseAdmin
              .from('incident_reports')
              .select('id, title, description, category, date_occurred')
              .eq('entity_id', resolvedEntityId)
              .neq('id', incident.id)
              .limit(20);

            if (!existingIncidents || existingIncidents.length === 0) {
              return { similar: [] };
            }

            const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-3-flash-preview',
                messages: [
                  {
                    role: 'system',
                    content: `You are a duplicate detection assistant. Compare the new incident against existing incidents and identify any that are similar or potential duplicates. Be conservative - only flag truly similar incidents.`
                  },
                  {
                    role: 'user',
                    content: `New Incident:
Title: ${title}
Description: ${description}
Category: ${category}
Date: ${date_occurred}

Existing Incidents:
${existingIncidents.map((inc, i) => `[${i}] ID: ${inc.id}\nTitle: ${inc.title}\nDescription: ${inc.description}\nCategory: ${inc.category}\nDate: ${inc.date_occurred}`).join('\n\n')}`
                  }
                ],
                tools: [{
                  type: 'function',
                  function: {
                    name: 'detect_similar',
                    description: 'Identify similar incidents',
                    parameters: {
                      type: 'object',
                      properties: {
                        similar: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              incident_id: { type: 'string' },
                              similarity_score: { type: 'number', description: '0-100' },
                              reason: { type: 'string' }
                            },
                            required: ['incident_id', 'similarity_score', 'reason'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ['similar'],
                      additionalProperties: false
                    }
                  }
                }],
                tool_choice: { type: 'function', function: { name: 'detect_similar' } }
              }),
            });

            if (!response.ok) return { similar: [] };
            const data = await response.json();
            const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
            if (!toolCall?.function?.arguments) return { similar: [] };
            
            const result = JSON.parse(toolCall.function.arguments);
            
            return {
              similar: (result.similar || []).map((s: { incident_id: string; similarity_score: number }) => {
                const matching = existingIncidents.find(inc => inc.id === s.incident_id);
                return {
                  ...s,
                  title: matching?.title || 'Unknown'
                };
              }).filter((s: { similarity_score: number }) => s.similarity_score >= 50)
            };
          })()
        ]);

        // Process categorization result
        if (categorizationResult.status === 'fulfilled' && categorizationResult.value) {
          const catResult = categorizationResult.value;
          aiCategory = catResult;
          console.log(`AI suggested category: ${catResult.primary_category} (user selected: ${category})`);
        }

        // Process duplicates result
        if (duplicatesResult.status === 'fulfilled' && duplicatesResult.value) {
          similarIncidents = duplicatesResult.value.similar || [];
          similarityWarning = similarIncidents.length > 0;
          
          if (similarityWarning) {
            console.log(`Found ${similarIncidents.length} similar incidents for ${incident.id}`);
            
            const highestSimilarity = Math.max(...similarIncidents.map(s => s.similarity_score), 0);
            
            await supabaseAdmin
              .from('incident_reports')
              .update({
                verification_confidence: Math.max(initialConfidence - Math.floor(highestSimilarity / 10), 5)
              })
              .eq('id', incident.id);
          }
        }
      } catch (aiError) {
        console.error('AI processing error (non-blocking):', aiError);
      }
    }

    return new Response(
      JSON.stringify({
        ...incident,
        ai_category: aiCategory ? {
          suggested: aiCategory.primary_category,
          confidence: aiCategory.confidence,
          explanation: aiCategory.explanation,
          differs_from_submitted: aiCategory.primary_category !== category
        } : null,
        similar_incidents: similarIncidents,
        similarity_warning: similarityWarning,
        similarity_message: similarityWarning 
          ? 'Similar incidents have been reported for this entity. Your report has been submitted and will be reviewed.'
          : null
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
