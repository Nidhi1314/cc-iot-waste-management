import { z } from 'zod';

import {
  binStatusEnum,
  generatorTypeEnum,
  wasteCategoryEnum,
} from './bins.schema';

const generatorFields = {
  generatorName: z.string().trim().min(1).optional(),

  generatorType: z.enum(generatorTypeEnum.enumValues).optional(),

  wasteCategory: z.enum(wasteCategoryEnum.enumValues).optional(),

  estDailyKg: z.number().positive().optional(),

  pickupWindowStart: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),

  pickupWindowEnd: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),

  contactName: z.string().trim().min(1).optional(),

  contactPhone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/)
    .optional(),
};

export const createBinSchema = z
  .object({
    address: z.string().trim().min(1),

    latitude: z.number().min(-90).max(90),

    longitude: z.number().min(-180).max(180),

    totalDepthCm: z.number().positive(),

    maxCapacityKg: z.number().positive(),

    status: z.enum(binStatusEnum.enumValues).optional().default('ACTIVE'),

    ...generatorFields,
  })
  .strict();

export type CreateBinDto = z.infer<typeof createBinSchema>;

export const updateBinSchema = z
  .object({
    address: z.string().trim().min(1).optional(),

    latitude: z.number().min(-90).max(90).optional(),

    longitude: z.number().min(-180).max(180).optional(),

    totalDepthCm: z.number().positive().optional(),

    maxCapacityKg: z.number().positive().optional(),

    status: z.enum(binStatusEnum.enumValues).optional(),

    ...generatorFields,
  })
  .strict();

export type UpdateBinDto = z.infer<typeof updateBinSchema>;

export const updateFillLevelSchema = z.object({
  fillLevel: z.number().int().min(0).max(100),
});

export type UpdateFillLevelDto = z.infer<typeof updateFillLevelSchema>;
