import { supabase } from '@/integrations/supabase/client';
import { EntityType, IncidentCategory } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export interface EntityWithRisk {
  id: string;
  type: EntityType;
  name: string;
  identifier: string;
  created_at: string;
  risk_score: {
    total_incidents: number;
    verified_incidents: number;
    severity_score: number;
    risk_level: string;
    last_incident_at: string | null;
  };
}

export interface SearchResponse {
  results: EntityWithRisk[];
  total: number;
  limit: number;
  offset: number;
}

export interface IncidentWithEvidence {
  id: string;
  title: string;
  description: string;
  what_was_promised: string | null;
  what_actually_happened: string | null;
  category: IncidentCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  date_occurred: string;
  location: string | null;
  status: 'pending' | 'verified' | 'disputed';
  verification_confidence: number;
  created_at: string;
  incident_evidence: Array<{
    id: string;
    file_url: string;
    file_type: string;
    file_name: string | null;
  }>;
}

export interface EntityDetailResponse {
  entity: {
    id: string;
    type: EntityType;
    name: string;
    identifier: string;
    created_at: string;
    updated_at: string;
  };
  risk_score: {
    total_incidents: number;
    verified_incidents: number;
    severity_score: number;
    risk_level: string;
    last_incident_at: string | null;
    calculated_at: string | null;
  };
  incidents?: IncidentWithEvidence[];
  incidents_total?: number;
}

export interface RiskScoreResponse {
  entity_id: string;
  total_incidents: number;
  verified_incidents: number;
  severity_score: number;
  risk_level: string;
  last_incident_at: string | null;
  calculated_at: string;
  breakdown: {
    by_category: Record<string, number>;
    by_severity: { low: number; medium: number; high: number; critical: number };
    by_status: { pending: number; verified: number; disputed: number };
  };
}

export async function searchEntities(
  query: string,
  type?: EntityType,
  limit = 20,
  offset = 0
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
    offset: offset.toString(),
  });
  
  if (type) {
    params.append('type', type);
  }

  const response = await fetch(`${FUNCTIONS_URL}/search-entities?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Search failed');
  }

  return response.json();
}

export async function getEntity(
  id: string,
  includeIncidents = true,
  limit = 20,
  offset = 0
): Promise<EntityDetailResponse> {
  const params = new URLSearchParams({
    id,
    include_incidents: includeIncidents.toString(),
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`${FUNCTIONS_URL}/get-entity?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch entity');
  }

  return response.json();
}

export async function getRiskScore(entityId: string): Promise<RiskScoreResponse> {
  const response = await fetch(`${FUNCTIONS_URL}/get-risk-score?entity_id=${entityId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch risk score');
  }

  return response.json();
}

export interface SubmitIncidentRequest {
  entity_id?: string;
  entity?: {
    type: EntityType;
    name: string;
    identifier: string;
  };
  title: string;
  description: string;
  what_was_promised?: string;
  what_actually_happened?: string;
  category: IncidentCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  date_occurred: string;
  location?: string;
}

export async function submitIncident(data: SubmitIncidentRequest): Promise<{ id: string; entity_id: string }> {
  const response = await fetch(`${FUNCTIONS_URL}/submit-incident`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit incident');
  }

  return response.json();
}

export interface FlagIncidentRequest {
  incident_id: string;
  action: 'dispute' | 'flag_false' | 'flag_duplicate';
  reason: string;
  contact_email?: string;
}

export async function flagIncident(data: FlagIncidentRequest): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${FUNCTIONS_URL}/flag-incident`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to flag incident');
  }

  return response.json();
}
