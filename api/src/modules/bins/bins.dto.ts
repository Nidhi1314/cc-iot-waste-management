import { z } from 'zod';
import { binStatusEnum } from './bins.schema';

export const createBinSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  totalDepthCm: z.number().positive('Total depth must be positive'),
  maxCapacityKg: z.number().positive('Max capacity must be positive'),
  // Status defaults to ACTIVE if not provided
  status: z.enum(binStatusEnum.enumValues).optional().default('ACTIVE'),
});

export type CreateBinDto = z.infer<typeof createBinSchema>;

// All fields optional — at least one must be present (validated in service)
export const updateBinSchema = z.object({
  address: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  totalDepthCm: z.number().positive().optional(),
  maxCapacityKg: z.number().positive().optional(),
  status: z.enum(binStatusEnum.enumValues).optional(),
});

export type UpdateBinDto = z.infer<typeof updateBinSchema>;

export const updateFillLevelSchema = z.object({
  fillLevel: z
    .number()
    .int('Fill level must be an integer')
    .min(0, 'Fill level cannot be negative')
    .max(100, 'Fill level cannot exceed 100'),
});

export type UpdateFillLevelDto = z.infer<typeof updateFillLevelSchema>;
