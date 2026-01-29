import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchEntities,
  getEntity,
  getRiskScore,
  submitIncident,
  flagIncident,
  categorizeIncident,
  detectDuplicates,
  generateSummary,
  calculateRisk,
  SearchResponse,
  EntityDetailResponse,
  RiskScoreResponse,
  SubmitIncidentRequest,
  SubmitIncidentResponse,
  FlagIncidentRequest,
  CategorizationResult,
  DuplicateResult,
  PatternSummary,
  ExplainableRiskScore,
} from '@/lib/api';
import { EntityType } from '@/types';

export function useSearchEntities(query: string, type?: EntityType, enabled = true) {
  return useQuery<SearchResponse>({
    queryKey: ['search-entities', query, type],
    queryFn: () => searchEntities(query, type),
    enabled: enabled && query.length >= 2,
    staleTime: 30000, // 30 seconds
  });
}

export function useEntity(
  id: string | undefined,
  includeIncidents = true,
  limit = 10,
  offset = 0
) {
  return useQuery<EntityDetailResponse>({
    queryKey: ['entity', id, includeIncidents, limit, offset],
    queryFn: () => getEntity(id!, includeIncidents, limit, offset),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

export function useRiskScore(entityId: string | undefined) {
  return useQuery<RiskScoreResponse>({
    queryKey: ['risk-score', entityId],
    queryFn: () => getRiskScore(entityId!),
    enabled: !!entityId,
    staleTime: 60000,
  });
}

export function useSubmitIncident() {
  const queryClient = useQueryClient();
  
  return useMutation<SubmitIncidentResponse, Error, SubmitIncidentRequest>({
    mutationFn: (data: SubmitIncidentRequest) => submitIncident(data),
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['entity', result.entity_id] });
      queryClient.invalidateQueries({ queryKey: ['risk-score', result.entity_id] });
      queryClient.invalidateQueries({ queryKey: ['search-entities'] });
    },
  });
}

export function useFlagIncident() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: FlagIncidentRequest) => flagIncident(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity'] });
    },
  });
}

// AI-Assisted Hooks

export function useCategorizeIncident() {
  return useMutation<CategorizationResult, Error, {
    title: string;
    description: string;
    what_was_promised?: string;
    what_actually_happened?: string;
  }>({
    mutationFn: (data) => categorizeIncident(data),
  });
}

export function useDetectDuplicates() {
  return useMutation<DuplicateResult, Error, {
    entity_id: string;
    new_incident: {
      title: string;
      description: string;
      date_occurred: string;
      category: string;
    };
  }>({
    mutationFn: (data) => detectDuplicates(data),
  });
}

export function useGenerateSummary(entityId: string | undefined) {
  return useQuery<PatternSummary>({
    queryKey: ['ai-summary', entityId],
    queryFn: () => generateSummary(entityId!),
    enabled: !!entityId,
    staleTime: 300000, // 5 minutes - AI summaries don't change often
  });
}

export function useCalculateRisk(entityId: string | undefined) {
  return useQuery<ExplainableRiskScore>({
    queryKey: ['ai-risk', entityId],
    queryFn: () => calculateRisk(entityId!),
    enabled: !!entityId,
    staleTime: 120000, // 2 minutes
  });
}
