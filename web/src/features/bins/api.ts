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

import type {
  BinStatus,
  GeneratorType,
  WasteCategory,
} from '../../types/api';

export type GeneratorPayload = {
  address: string;
  latitude: number;
  longitude: number;
  totalDepthCm: number;
  maxCapacityKg: number;
  status: BinStatus;
  generatorName: string;
  generatorType: GeneratorType;
  wasteCategory: WasteCategory;
  estDailyKg: number;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  contactName?: string;
  contactPhone?: string;
};

export function createGenerator(
  data: GeneratorPayload,
): Promise<SmartBin> {
  return apiRequest<SmartBin>('/bins', {
    method: 'POST',
    body: data,
  });
}

export function updateGenerator(
  id: string,
  data: GeneratorPayload,
): Promise<SmartBin> {
  return apiRequest<SmartBin>(`/bins/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

