import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GET /search-entities?q=searchterm&type=business&limit=20&offset=0
 * 
 * Search entities by name, identifier (phone, website, etc.)
 * 
 * Query Parameters:
 * - q (required): Search query string
 * - type (optional): Filter by entity_type (person, business, phone, website, service)
 * - limit (optional): Max results, default 20, max 100
 * - offset (optional): Pagination offset, default 0
 * 
 * Response: {
 *   results: [{
 *     id, type, name, identifier,
 *     risk_score: { total_incidents, severity_score, risk_level }
 *   }],
 *   total: number,
 *   limit: number,
 *   offset: number
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q');
    const entityType = url.searchParams.get('type');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search query must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const normalizedQuery = query.toLowerCase().trim();

    // Build query
    let dbQuery = supabase
      .from('entities')
      .select(`
        id, type, name, identifier, created_at,
        entity_risk_scores (
          total_incidents, verified_incidents, severity_score, risk_level, last_incident_at
        )
      `, { count: 'exact' })
      .or(`name.ilike.%${normalizedQuery}%,identifier.ilike.%${normalizedQuery}%,normalized_identifier.ilike.%${normalizedQuery}%`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType && ['person', 'business', 'phone', 'website', 'service'].includes(entityType)) {
      dbQuery = dbQuery.eq('type', entityType);
    }

    const { data, error, count } = await dbQuery;

    if (error) {
      console.error('Search error:', error);
      return new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform results
    const results = (data || []).map(entity => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      identifier: entity.identifier,
      created_at: entity.created_at,
      risk_score: entity.entity_risk_scores?.[0] || {
        total_incidents: 0,
        verified_incidents: 0,
        severity_score: 0,
        risk_level: 'unknown',
        last_incident_at: null
      }
    }));

    return new Response(
      JSON.stringify({
        results,
        total: count || 0,
        limit,
        offset
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
