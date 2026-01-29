import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * GET /get-risk-score?entity_id=uuid
 * 
 * Compute and return risk indicator for an entity
 * 
 * Query Parameters:
 * - entity_id (required): Entity UUID
 * 
 * Response: {
 *   entity_id: uuid,
 *   total_incidents: number,
 *   verified_incidents: number,
 *   severity_score: number (0-100),
 *   risk_level: "unknown" | "low" | "moderate" | "high" | "critical",
 *   last_incident_at: timestamp | null,
 *   calculated_at: timestamp,
 *   breakdown: {
 *     by_category: { [category]: count },
 *     by_severity: { low, medium, high, critical },
 *     by_status: { pending, verified, disputed }
 *   }
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const entityId = url.searchParams.get('entity_id');

    if (!entityId) {
      return new Response(
        JSON.stringify({ error: 'entity_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(entityId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid entity_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    // Check entity exists
    const { data: entity, error: entityError } = await supabase
      .from('entities')
      .select('id')
      .eq('id', entityId)
      .maybeSingle();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({ error: 'Entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get stored risk score
    const { data: riskScore } = await supabase
      .from('entity_risk_scores')
      .select('*')
      .eq('entity_id', entityId)
      .maybeSingle();

    // Get incident breakdown
    const { data: incidents } = await supabase
      .from('incident_reports')
      .select('category, severity, status')
      .eq('entity_id', entityId);

    // Calculate breakdown
    const breakdown = {
      by_category: {} as Record<string, number>,
      by_severity: { low: 0, medium: 0, high: 0, critical: 0 },
      by_status: { pending: 0, verified: 0, disputed: 0 }
    };

    if (incidents) {
      for (const inc of incidents) {
        // By category
        breakdown.by_category[inc.category] = (breakdown.by_category[inc.category] || 0) + 1;
        
        // By severity
        if (inc.severity in breakdown.by_severity) {
          breakdown.by_severity[inc.severity as keyof typeof breakdown.by_severity]++;
        }
        
        // By status (only count visible statuses)
        if (inc.status === 'pending' || inc.status === 'verified' || inc.status === 'disputed') {
          breakdown.by_status[inc.status as keyof typeof breakdown.by_status]++;
        }
      }
    }

    const response = {
      entity_id: entityId,
      total_incidents: riskScore?.total_incidents || 0,
      verified_incidents: riskScore?.verified_incidents || 0,
      severity_score: riskScore?.severity_score || 0,
      risk_level: riskScore?.risk_level || 'unknown',
      last_incident_at: riskScore?.last_incident_at || null,
      calculated_at: riskScore?.calculated_at || new Date().toISOString(),
      breakdown
    };

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
