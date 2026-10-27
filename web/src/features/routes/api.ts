import { apiRequest } from '../../lib/api-client';
import type { GenerateRouteRequest, RouteItem } from '../../types/api';

export function getRoutes(limit = 100, offset = 0) {
  return apiRequest<RouteItem[]>(`/routes?limit=${limit}&offset=${offset}`);
}

export function getActiveRoutes() {
  return apiRequest<RouteItem[]>('/routes/active');
}

export function generateRoutes(payload: GenerateRouteRequest) {
  return apiRequest<RouteItem[]>('/routes/generate', {
    method: 'POST',
    body: payload,
  });
}

export function generatePredictiveRoutes(payload: GenerateRouteRequest) {
  return apiRequest<RouteItem[]>('/routes/generate-predictive', {
    method: 'POST',
    body: payload,
  });
}

export function generateOrganicRoutes(payload: GenerateRouteRequest) {
  return apiRequest<RouteItem[]>('/routes/generate-organic', {
    method: 'POST',
    body: payload,
  });
}

export function completeRoute(routeId: string) {
  return apiRequest<RouteItem>(`/routes/${routeId}/complete`, {
    method: 'PATCH',
  });
}

export function deleteRoute(routeId: string) {
  return apiRequest<RouteItem>(`/routes/${routeId}`, {
    method: 'DELETE',
  });
}

export async function resetBinsToZero() {
  return apiRequest<{ status: string; message: string }>('/simulation/reset', {
    method: 'POST',
  });
}

export async function simulateNextDay() {
  return apiRequest<{
    status: string;
    message: string;
    simulated_generators?: number;
  }>('/simulation/next-day', {
    method: 'POST',
  });
}
