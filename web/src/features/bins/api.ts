import { apiRequest } from '../../lib/api-client';
import type { SmartBin } from '../../types/api';

export function getBins(limit = 100, offset = 0) {
  return apiRequest<SmartBin[]>(`/bins?limit=${limit}&offset=${offset}`);
}

export function getCriticalBins() {
  return apiRequest<SmartBin[]>('/bins/critical');
}

export function updateBinFillLevel(id: string, fillLevel: number) {
  return apiRequest<SmartBin>(`/bins/${id}/fill-level`, {
    method: 'PATCH',
    body: { fillLevel },
  });
}
