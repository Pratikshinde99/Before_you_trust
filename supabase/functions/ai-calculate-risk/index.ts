import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Risk Calculation Algorithm - Explainable Logic
 * 
 * The risk indicator is calculated using a weighted formula considering:
 * 
 * 1. FREQUENCY FACTOR (30% weight)
 *    - Number of incidents reported
 *    - Normalized against typical reporting patterns
 *    - Formula: min(incident_count / threshold, 1) * 30
 * 
 * 2. SEVERITY FACTOR (35% weight)
 *    - Weighted average of incident severity levels
 *    - Weights: critical=4, high=3, medium=2, low=1
 *    - Formula: (weighted_sum / max_possible) * 35
 * 
 * 3. RECENCY FACTOR (20% weight)
 *    - Time decay applied to incidents
 *    - Recent incidents (< 30 days) = full weight
 *    - Older incidents decay exponentially
 *    - Formula: sum(decay_weight) / incident_count * 20
 * 
 * 4. VERIFICATION FACTOR (15% weight)
 *    - Proportion of verified vs pending incidents
 *    - Verified incidents increase confidence
 *    - Formula: verified_ratio * 15
 * 
 * RISK LEVELS:
 * - Unknown: score = 0 (no incidents)
 * - Low: score 1-25
 * - Moderate: score 26-50
 * - High: score 51-75
 * - Critical: score 76-100
 */

const SEVERITY_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const FREQUENCY_THRESHOLD = 10; // incidents for max frequency score
const RECENCY_HALF_LIFE_DAYS = 90; // days for half decay

function calculateRecencyWeight(dateOccurred: string): number {
  const incidentDate = new Date(dateOccurred);
  const now = new Date();
  const daysDiff = (now.getTime() - incidentDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Exponential decay with half-life
  return Math.pow(0.5, daysDiff / RECENCY_HALF_LIFE_DAYS);
}

function determineRiskLevel(score: number): string {
  if (score === 0) return 'unknown';
  if (score <= 25) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'critical';
}

interface Incident {
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  date_occurred: string;
}

function calculateRiskScore(incidents: Incident[]): {
  score: number;
  level: string;
  factors: {
    frequency: { raw: number; weighted: number; explanation: string };
    severity: { raw: number; weighted: number; explanation: string };
    recency: { raw: number; weighted: number; explanation: string };
    verification: { raw: number; weighted: number; explanation: string };
  };
} {
  if (!incidents || incidents.length === 0) {
    return {
      score: 0,
      level: 'unknown',
      factors: {
        frequency: { raw: 0, weighted: 0, explanation: 'No incidents reported' },
        severity: { raw: 0, weighted: 0, explanation: 'No severity data available' },
        recency: { raw: 0, weighted: 0, explanation: 'No recent activity' },
        verification: { raw: 0, weighted: 0, explanation: 'No verified incidents' }
      }
    };
  }

  const totalIncidents = incidents.length;
  const verifiedIncidents = incidents.filter(i => i.status === 'verified').length;

  // 1. FREQUENCY FACTOR (30% weight)
  const frequencyRaw = Math.min(totalIncidents / FREQUENCY_THRESHOLD, 1);
  const frequencyWeighted = frequencyRaw * 30;
  const frequencyExplanation = `${totalIncidents} incident${totalIncidents !== 1 ? 's' : ''} reported. ` +
    `Score: ${(frequencyRaw * 100).toFixed(0)}% of threshold (${FREQUENCY_THRESHOLD} incidents = max).`;

  // 2. SEVERITY FACTOR (35% weight)
  const severitySum = incidents.reduce((sum, inc) => 
    sum + (SEVERITY_WEIGHTS[inc.severity] || 1), 0);
  const maxPossibleSeverity = totalIncidents * 4; // all critical
  const severityRaw = severitySum / maxPossibleSeverity;
  const severityWeighted = severityRaw * 35;
  
  const severityCounts = {
    low: incidents.filter(i => i.severity === 'low').length,
    medium: incidents.filter(i => i.severity === 'medium').length,
    high: incidents.filter(i => i.severity === 'high').length,
    critical: incidents.filter(i => i.severity === 'critical').length
  };
  const severityExplanation = `Severity distribution: ` +
    `${severityCounts.critical} critical, ${severityCounts.high} high, ` +
    `${severityCounts.medium} medium, ${severityCounts.low} low. ` +
    `Weighted average: ${(severityRaw * 100).toFixed(0)}% of maximum.`;

  // 3. RECENCY FACTOR (20% weight)
  const recencyWeights = incidents.map(inc => calculateRecencyWeight(inc.date_occurred));
  const avgRecency = recencyWeights.reduce((a, b) => a + b, 0) / recencyWeights.length;
  const recencyWeighted = avgRecency * 20;
  
  const recentCount = incidents.filter(inc => {
    const daysDiff = (Date.now() - new Date(inc.date_occurred).getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30;
  }).length;
  const recencyExplanation = `${recentCount} incident${recentCount !== 1 ? 's' : ''} in the last 30 days. ` +
    `Average recency weight: ${(avgRecency * 100).toFixed(0)}% (older incidents decay over ${RECENCY_HALF_LIFE_DAYS} days).`;

  // 4. VERIFICATION FACTOR (15% weight)
  const verificationRaw = totalIncidents > 0 ? verifiedIncidents / totalIncidents : 0;
  const verificationWeighted = verificationRaw * 15;
  const verificationExplanation = `${verifiedIncidents} of ${totalIncidents} incidents verified ` +
    `(${(verificationRaw * 100).toFixed(0)}%). Verified incidents increase indicator confidence.`;

  // TOTAL SCORE
  const totalScore = Math.round(frequencyWeighted + severityWeighted + recencyWeighted + verificationWeighted);
  const level = determineRiskLevel(totalScore);

  return {
    score: totalScore,
    level,
    factors: {
      frequency: { raw: frequencyRaw, weighted: frequencyWeighted, explanation: frequencyExplanation },
      severity: { raw: severityRaw, weighted: severityWeighted, explanation: severityExplanation },
      recency: { raw: avgRecency, weighted: recencyWeighted, explanation: recencyExplanation },
      verification: { raw: verificationRaw, weighted: verificationWeighted, explanation: verificationExplanation }
    }
  };
}

/**
 * POST /ai-calculate-risk
 * 
 * Calculates risk indicator with explainable logic
 * 
 * Request body: {
 *   entity_id: string
 * }
 * 
 * Response: {
 *   entity_id: string,
 *   risk_score: number (0-100),
 *   risk_level: "unknown" | "low" | "moderate" | "high" | "critical",
 *   factors: {
 *     frequency: { raw, weighted, explanation },
 *     severity: { raw, weighted, explanation },
 *     recency: { raw, weighted, explanation },
 *     verification: { raw, weighted, explanation }
 *   },
 *   algorithm_version: string,
 *   calculated_at: string,
 *   disclaimer: string
 * }
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { entity_id } = await req.json();

    if (!entity_id) {
      return new Response(
        JSON.stringify({ error: 'entity_id is required' }),
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
      .select('id, name')
      .eq('id', entity_id)
      .maybeSingle();

    if (entityError || !entity) {
      return new Response(
        JSON.stringify({ error: 'Entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all incidents for this entity
    const { data: incidents, error: incidentsError } = await supabase
      .from('incident_reports')
      .select('severity, status, date_occurred')
      .eq('entity_id', entity_id)
      .in('status', ['pending', 'verified']);

    if (incidentsError) {
      console.error('Fetch error:', incidentsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch incidents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate risk score with explainable factors
    const riskResult = calculateRiskScore(incidents || []);

    // Update stored risk score
    const verifiedCount = (incidents || []).filter(i => i.status === 'verified').length;
    const lastIncident = incidents && incidents.length > 0 
      ? incidents.sort((a, b) => new Date(b.date_occurred).getTime() - new Date(a.date_occurred).getTime())[0]
      : null;

    await supabase
      .from('entity_risk_scores')
      .upsert({
        entity_id,
        total_incidents: incidents?.length || 0,
        verified_incidents: verifiedCount,
        severity_score: riskResult.score,
        risk_level: riskResult.level,
        last_incident_at: lastIncident?.date_occurred || null,
        calculated_at: new Date().toISOString()
      }, { onConflict: 'entity_id' });

    return new Response(
      JSON.stringify({
        entity_id,
        risk_score: riskResult.score,
        risk_level: riskResult.level,
        factors: riskResult.factors,
        algorithm_version: '1.0.0',
        calculated_at: new Date().toISOString(),
        disclaimer: 'This risk indicator is calculated algorithmically based on reported incidents. ' +
          'It is not a determination of guilt or wrongdoing. The indicator reflects the volume, ' +
          'severity, and recency of user-submitted reports, which have not been independently verified.'
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
