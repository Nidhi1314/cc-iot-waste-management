import {
  pgTable,
  uuid,
  real,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { vehicles } from '../vehicles/vehicles.schema';
import { destinations } from '../destinations/destinations.schema';

// Shape of each waypoint stored in the JSONB array
// This matches what the Python algorithm returns
export interface Waypoint {
  step: number;
  binId: string;
  collectedKg: number;
}

export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignedCarId: uuid('assigned_car_id').references(() => vehicles.id, {
    onDelete: 'set null',
  }),
  destinationId: uuid('destination_id').references(() => destinations.id, {
    onDelete: 'set null',
  }),
  // JSONB: [{ step: 1, binId: "uuid", collectedKg: 60 }, ...]
  waypointsOrder: jsonb('waypoints_order')
    .$type<Waypoint[]>()
    .notNull()
    .default([]),
  totalDistanceKm: real('total_distance_km'),
  isCompleted: boolean('is_completed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- TYPES ----------

export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
