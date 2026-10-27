import { z } from 'zod';

export const generateRouteSchema = z.object({
  assignedCarId: z.uuid('assignedCarId must be a valid UUID'),
});

export type GenerateRouteDto = z.infer<typeof generateRouteSchema>;

export const directionsRequestSchema = z.object({
  coordinates: z
    .array(
      z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
    )
    .min(2)
    .max(50),
});

export type DirectionsRequestDto = z.infer<typeof directionsRequestSchema>;

export const directionsResponseSchema = z.object({
  features: z
    .array(
      z.object({
        geometry: z.object({
          coordinates: z.array(z.tuple([z.number(), z.number()])),
        }),
      }),
    )
    .min(1),
});

export interface AlgorithmRoute {
  assigned_car_id: string;
  total_collected_kg?: number;
  total_distance_km?: number;
  waypoints_order: {
    step: number;
    bin_id: string;
    collected_kg: number;
  }[];
}

export interface AlgorithmResponse {
  status: 'success' | 'error' | 'info';
  routes?: AlgorithmRoute[];
  message?: string;
}

export const algorithmRouteSchema = z.object({
  assigned_car_id: z
    .string()
    .uuid('Algorithm route assigned_car_id must be UUID'),
  total_collected_kg: z.number().optional(),
  total_distance_km: z.number().nonnegative().optional(),
  waypoints_order: z.array(
    z.object({
      step: z.number().int().nonnegative(),
      bin_id: z.string().uuid('Algorithm waypoint bin_id must be UUID'),
      collected_kg: z.number().nonnegative(),
    }),
  ),
});

export const algorithmResponseSchema = z.object({
  status: z.enum(['success', 'error', 'info']),
  message: z.string().optional(),
  routes: z.array(algorithmRouteSchema).optional(),
});
