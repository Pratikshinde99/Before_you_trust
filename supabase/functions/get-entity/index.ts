import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GET /get-entity?id=uuid
 * GET /get-entity?id=uuid&include_incidents=true&limit=20&offset=0
 * 
 * Fetch entity details with risk score and optionally incidents
 * 
 * Query Parameters:
 * - id (required): Entity UUID
 * - include_incidents (optional): Include incident reports, default false
 * - limit (optional): Max incidents to return, default 20
 * - offset (optional): Incidents pagination offset, default 0
 * 
 * Response: {
 *   entity: { id, type, name, identifier, created_at, updated_at },
 *   risk_score: { total_incidents, verified_incidents, severity_score, risk_level, last_incident_at },
 *   incidents?: [{ id, title, description, category, severity, date_occurred, status, ... }],
 *   incidents_total?: number
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const entityId = url.searchParams.get('id');
    const includeIncidents = url.searchParams.get('include_incidents') === 'true';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!entityId) {
      return new Response(
        JSON.stringify({ error: 'Entity id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(entityId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid entity id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Fetch entity with risk score
    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select(`
        id, type, name, identifier, created_at, updated_at,
        entity_risk_scores (
          total_incidents, verified_incidents, severity_score, risk_level, last_incident_at, calculated_at
        )
      `)
      .eq('id', entityId)
      .maybeSingle();

    if (entityError) {
      console.error('Fetch entity error:', entityError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch entity' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!entity) {
      return new Response(
        JSON.stringify({ error: 'Entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response: any = {
      entity: {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        identifier: entity.identifier,
        created_at: entity.created_at,
        updated_at: entity.updated_at
      },
      risk_score: entity.entity_risk_scores?.[0] || {
        total_incidents: 0,
        verified_incidents: 0,
        severity_score: 0,
        risk_level: 'unknown',
        last_incident_at: null,
        calculated_at: null
      }
    };

    // Fetch incidents if requested
    if (includeIncidents) {
      const { data: incidents, error: incidentsError, count } = await supabase
        .from('incident_reports')
        .select(`
          id, title, description, what_was_promised, what_actually_happened,
          category, severity, date_occurred, location, status,
          verification_confidence, created_at,
          incident_evidence (id, file_url, file_type, file_name)
        `, { count: 'exact' })
        .eq('entity_id', entityId)
        .in('status', ['verified', 'pending'])
        .order('date_occurred', { ascending: false })
        .range(offset, offset + limit - 1);

      if (incidentsError) {
        console.error('Fetch incidents error:', incidentsError);
      } else {
        response.incidents = incidents || [];
        response.incidents_total = count || 0;
      }
    }

    return new Response(
      JSON.stringify(response),
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
