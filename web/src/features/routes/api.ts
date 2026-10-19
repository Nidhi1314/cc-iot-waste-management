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

// ============================================================================
// SIMULATION & DEMO ENDPOINTS (FastAPI - Port 8000)
// ============================================================================

export async function resetBinsToZero() {
  const response = await fetch('http://localhost:8000/reset-bins', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to reset bins');
  }
  return response.json();
}

export async function simulateNextDay() {
  const response = await fetch('http://localhost:8000/simulate-next-day', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to simulate next day');
  }
  return response.json();
}
