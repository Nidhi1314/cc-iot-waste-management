import { z } from 'zod';
import { vehicleRoleEnum } from './vehicles.schema';

export const createVehicleSchema = z.object({
  userCode: z
    .string()
    .min(3, 'User code must be at least 3 characters')
    .max(64, 'User code must be at most 64 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(vehicleRoleEnum.enumValues).optional().default('DRIVER'),
  maxCapacityKg: z.number().positive('Max capacity must be a positive number'),
});

export type CreateVehicleDto = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = z.object({
  userCode: z
    .string()
    .min(3, 'User code must be at least 3 characters')
    .max(64, 'User code must be at most 64 characters')
    .optional(),
  maxCapacityKg: z
    .number()
    .positive('Max capacity must be a positive number')
    .optional(),
  role: z.enum(vehicleRoleEnum.enumValues).optional(),
});

export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>;
