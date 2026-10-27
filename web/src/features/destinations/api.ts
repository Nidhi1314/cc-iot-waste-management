
import { apiRequest } from '../../lib/api-client';

export type DestinationType =
  | 'BIOGAS'
  | 'LIVESTOCK_FEED';

export type WasteCategory =
  | 'VEG_SCRAPS'
  | 'COOKED_FOOD'
  | 'MIXED_ORGANIC';

export type Destination = {
  id: string;
  name: string;
  type: DestinationType;
  address: string;
  latitude: number;
  longitude: number;
  acceptedCategories: WasteCategory[];
  dailyCapacityKg: number;
  openFrom: string;
  openTo: string;
  active: boolean;
  createdAt: string;
};

export type DestinationPayload = Omit<
  Destination,
  'id' | 'createdAt'
>;

export function getDestinations() {
  return apiRequest<Destination[]>('/destinations');
}

export function createDestination(
  data: DestinationPayload,
) {
  return apiRequest<Destination>('/destinations', {
    method: 'POST',
    body: data,
  });
}

export function updateDestination(
  id: string,
  data: DestinationPayload,
) {
  return apiRequest<Destination>(`/destinations/${id}`, {
    method: 'PATCH',
    body: data,
  });
}
