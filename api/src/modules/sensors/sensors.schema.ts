import { pgTable, uuid, real, timestamp } from 'drizzle-orm/pg-core';
import { smartBins } from '../bins/bins.schema';

export const sensorData = pgTable('sensor_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  binId: uuid('bin_id')
    .notNull()
    .references(() => smartBins.id, { onDelete: 'cascade' }),
  measureDistanceCm: real('measure_distance_cm').notNull(),
  fillPercentage: real('fill_percentage').notNull(),
  batteryVoltage: real('battery_voltage'), // nullable — not all hardware has this
  recordedAt: timestamp('recorded_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SensorData = typeof sensorData.$inferSelect;
export type NewSensorData = typeof sensorData.$inferInsert;
