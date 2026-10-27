import { apiRequest } from '../../lib/api-client';

export type CollectionRecord = {
  id: string;
  binId: string;
  routeId: string | null;
  destinationId: string;
  measuredKg: number;
  contaminationPercent: number;
  status: 'COLLECTED' | 'DELIVERED';
  collectedAt: string;
  deliveredAt: string | null;
  createdAt: string;
};

export type CollectionPayload = {
  binId: string;
  routeId?: string;
  destinationId: string;
  measuredKg: number;
  contaminationPercent: number;
};

export type ImpactSummary = {
  deliveredKg: number;
  avgContaminationPercent: number;
  confirmedDeliveries: number;
  completedTrips: number;
  totalDistanceKm: number;
  pendingDeliveries: number;
};

export function getCollections() {
  return apiRequest<CollectionRecord[]>('/collections');
}

export function createCollection(payload: CollectionPayload) {
  return apiRequest<CollectionRecord>('/collections', {
    method: 'POST',
    body: payload,
  });
}

export function confirmDelivery(collectionId: string) {
  return apiRequest<CollectionRecord>(`/collections/${collectionId}/delivery`, {
    method: 'PATCH',
    body: {},
  });
}

export function getImpactSummary() {
  return apiRequest<ImpactSummary>('/collections/impact');
}
