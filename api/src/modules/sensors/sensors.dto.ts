import { z } from 'zod';

export const createSensorDataSchema = z.object({
  binId: z.uuid('binId must be a valid UUID'),
  measureDistanceCm: z.number().positive('Measured distance must be positive'),
  fillPercentage: z
    .number()
    .min(0, 'Fill percentage cannot be negative')
    .max(100, 'Fill percentage cannot exceed 100'),
  batteryVoltage: z.number().positive().optional(),
});

export type CreateSensorDataDto = z.infer<typeof createSensorDataSchema>;
