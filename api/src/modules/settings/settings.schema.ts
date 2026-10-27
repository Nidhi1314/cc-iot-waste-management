import { pgTable, integer, timestamp } from 'drizzle-orm/pg-core';

export const systemSettings = pgTable('system_settings', {
  id: integer('id').primaryKey(),

  fillThreshold: integer('fill_threshold').notNull().default(75),

  maxWasteAgeHours: integer('max_waste_age_hours').notNull().default(24),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export type SystemSettings = typeof systemSettings.$inferSelect;
