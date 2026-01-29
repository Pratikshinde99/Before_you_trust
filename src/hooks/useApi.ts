import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  searchEntities,
  getEntity,
  getRiskScore,
  submitIncident,
  flagIncident,
  SearchResponse,
  EntityDetailResponse,
  RiskScoreResponse,
  SubmitIncidentRequest,
  FlagIncidentRequest,
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

export function useEntity(id: string | undefined, includeIncidents = true) {
  return useQuery<EntityDetailResponse>({
    queryKey: ['entity', id, includeIncidents],
    queryFn: () => getEntity(id!, includeIncidents),
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
  
  return useMutation({
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
