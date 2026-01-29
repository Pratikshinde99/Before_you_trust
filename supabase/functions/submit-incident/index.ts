import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * POST /submit-incident
 * 
 * Submit a new incident report (anonymous allowed)
 * 
 * Request Body: {
 *   entity_id: uuid (required if entity exists),
 *   entity: { type, name, identifier } (required if entity_id not provided),
 *   title: string (10-200 chars),
 *   description: string (50-2000 chars),
 *   what_was_promised?: string (max 1000 chars),
 *   what_actually_happened?: string (max 1000 chars),
 *   category: incident_category enum,
 *   severity: "low" | "medium" | "high" | "critical",
 *   date_occurred: "YYYY-MM-DD",
 *   location?: string (max 100 chars),
 *   evidence?: [{ file_url, file_type, file_name?, file_size_bytes?, mime_type? }]
 * }
 * 
 * Response: {
 *   id: uuid,
 *   entity_id: uuid,
 *   title: string,
 *   status: "pending",
 *   created_at: timestamp
 * }
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

  try {
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
      evidence
    } = body;

    // Validation
    const validCategories = [
      'fraud', 'scam', 'harassment', 'misrepresentation',
      'non_delivery', 'quality_issue', 'safety_concern',
      'data_breach', 'unauthorized_charges', 'other'
    ];
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    let resolvedEntityId = entity_id;

    // Create entity if not provided
    if (!entity_id && entity) {
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

      // Check if exists
      const { data: existing } = await supabase
        .from('entities')
        .select('id')
        .eq('type', type)
        .eq('normalized_identifier', normalizedIdentifier)
        .maybeSingle();

      if (existing) {
        resolvedEntityId = existing.id;
      } else {
        const { data: newEntity, error: entityError } = await supabase
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

    // Hash IP for abuse prevention
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const encoder = new TextEncoder();
    const data = encoder.encode(clientIp + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const ipHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

    // Calculate initial confidence based on details provided
    const hasDetails = !!(what_was_promised?.trim() || what_actually_happened?.trim());
    const initialConfidence = hasDetails ? 20 : 10; // Base confidence

    // Create incident report
    const { data: incident, error: incidentError } = await supabase
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

    console.log(`Incident submitted: ${incident.id} for entity ${resolvedEntityId} (confidence: ${initialConfidence})`);

    // Note: Evidence should be uploaded separately using /upload-evidence endpoint
    // This ensures proper file handling and security

    return new Response(
      JSON.stringify(incident),
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
