import { pgEnum, pgTable, real, timestamp, uuid } from 'drizzle-orm/pg-core';
import { smartBins } from '../bins/bins.schema';
import { destinations } from '../destinations/destinations.schema';
import { routes } from '../routes/routes.schema';

export const collectionStatusEnum = pgEnum('collection_status', [
  'COLLECTED',
  'DELIVERED',
]);

export const collections = pgTable('organic_collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  binId: uuid('bin_id')
    .notNull()
    .references(() => smartBins.id, { onDelete: 'cascade' }),
  routeId: uuid('route_id').references(() => routes.id, {
    onDelete: 'set null',
  }),
  destinationId: uuid('destination_id')
    .notNull()
    .references(() => destinations.id, { onDelete: 'restrict' }),
  measuredKg: real('measured_kg').notNull(),
  contaminationPercent: real('contamination_percent').notNull().default(0),
  status: collectionStatusEnum('status').notNull().default('COLLECTED'),
  collectedAt: timestamp('collected_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Collection = typeof collections.$inferSelect;
