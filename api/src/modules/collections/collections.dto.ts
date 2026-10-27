import { z } from 'zod';

export const createCollectionSchema = z
  .object({
    binId: z.uuid(),
    routeId: z.uuid().optional(),
    destinationId: z.uuid(),
    measuredKg: z.number().positive(),
    contaminationPercent: z.number().min(0).max(100).default(0),
    collectedAt: z.iso.datetime().optional(),
  })
  .strict();

export type CreateCollectionDto = z.infer<typeof createCollectionSchema>;

export const confirmDeliverySchema = z
  .object({ deliveredAt: z.iso.datetime().optional() })
  .strict();

export type ConfirmDeliveryDto = z.infer<typeof confirmDeliverySchema>;
