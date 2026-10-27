
import { apiRequest } from '../../lib/api-client';

export type SystemSettings = {
  id: number;
  fillThreshold: number;
  maxWasteAgeHours: number;
  updatedAt: string;
};

export type UpdateSettingsRequest = {
  fillThreshold: number;
  maxWasteAgeHours: number;
};

export function getSettings(): Promise<SystemSettings> {
  return apiRequest<SystemSettings>('/settings');
}

export function updateSettings(
  data: UpdateSettingsRequest,
): Promise<SystemSettings> {
  return apiRequest<SystemSettings>('/settings', {
    method: 'PATCH',
    body: data,
  });
}
