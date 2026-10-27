import { z } from 'zod';

import { destinationTypeEnum } from './destinations.schema';

import { wasteCategoryEnum } from '../bins/bins.schema';

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

export const createDestinationSchema = z
  .object({
    name: z.string().trim().min(1),

    type: z.enum(destinationTypeEnum.enumValues),

    address: z.string().trim().min(1),

    latitude: z.number().min(-90).max(90),

    longitude: z.number().min(-180).max(180),

    acceptedCategories: z
      .array(z.enum(wasteCategoryEnum.enumValues))
      .min(1)
      .refine(
        (values) => new Set(values).size === values.length,
        'Accepted categories must be unique',
      ),

    dailyCapacityKg: z.number().positive(),

    openFrom: timeSchema,

    openTo: timeSchema,

    active: z.boolean().optional().default(true),
  })
  .strict()
  .refine((data) => data.openFrom < data.openTo, {
    message: 'Closing time must be after opening time',
    path: ['openTo'],
  })
  .refine(
    (data) =>
      data.type !== 'LIVESTOCK_FEED' ||
      data.acceptedCategories.every((category) => category === 'VEG_SCRAPS'),
    {
      message: 'Livestock-feed destinations may only accept VEG_SCRAPS',
      path: ['acceptedCategories'],
    },
  );

export type CreateDestinationDto = z.infer<typeof createDestinationSchema>;

export const updateDestinationSchema = z
  .object({
    name: z.string().trim().min(1).optional(),

    type: z.enum(destinationTypeEnum.enumValues).optional(),

    address: z.string().trim().min(1).optional(),

    latitude: z.number().min(-90).max(90).optional(),

    longitude: z.number().min(-180).max(180).optional(),

    acceptedCategories: z
      .array(z.enum(wasteCategoryEnum.enumValues))
      .min(1)
      .refine(
        (values) => new Set(values).size === values.length,
        'Accepted categories must be unique',
      )
      .optional(),

    dailyCapacityKg: z.number().positive().optional(),

    openFrom: timeSchema.optional(),

    openTo: timeSchema.optional(),

    active: z.boolean().optional(),
  })
  .strict();

export type UpdateDestinationDto = z.infer<typeof updateDestinationSchema>;
