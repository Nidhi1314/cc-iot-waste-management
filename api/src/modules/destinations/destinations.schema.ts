import {
  pgTable,
  pgEnum,
  uuid,
  text,
  real,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const destinationTypeEnum = pgEnum('destination_type', [
  'BIOGAS',
  'LIVESTOCK_FEED',
]);

export const destinations = pgTable('destinations', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: text('name').notNull(),

  type: destinationTypeEnum('type').notNull(),

  address: text('address').notNull(),

  latitude: real('latitude').notNull(),

  longitude: real('longitude').notNull(),

  acceptedCategories: text('accepted_categories').array().notNull(),

  dailyCapacityKg: real('daily_capacity_kg').notNull(),

  openFrom: text('open_from').notNull(),

  openTo: text('open_to').notNull(),

  active: boolean('active').notNull().default(true),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export type Destination = typeof destinations.$inferSelect;

export type NewDestination = typeof destinations.$inferInsert;
