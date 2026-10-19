import { apiRequest } from '../../lib/api-client';
import type { VehiclePublic } from '../../types/api';

export function getOperatorAccounts(limit = 100, offset = 0) {
  return apiRequest<VehiclePublic[]>(`/vehicles?limit=${limit}&offset=${offset}`);
}
