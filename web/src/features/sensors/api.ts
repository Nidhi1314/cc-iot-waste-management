import { apiRequest } from '../../lib/api-client';

export type SensorReading = {
  id: string;
  binId: string;
  measureDistanceCm: number;
  fillPercentage: number;
  batteryVoltage: number | null;
  recordedAt: string;
  createdAt: string;
};

export function getSensorHistory(binId: string, limit = 24) {
  return apiRequest<SensorReading[]>(`/sensors/history/${binId}?limit=${limit}`);
}
