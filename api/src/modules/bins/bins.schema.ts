import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const binStatusEnum = pgEnum('bin_status', [
  'ACTIVE',
  'DAMAGED',
  'OUT_OF_SERVICE',
]);

export type BinStatus = (typeof binStatusEnum.enumValues)[number];

export const smartBins = pgTable('smart_bins', {
  id: uuid('id').primaryKey().defaultRandom(),
  address: text('address').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  totalDepthCm: real('total_depth_cm').notNull(),
  maxCapacityKg: real('max_capacity_kg').notNull(),
  status: binStatusEnum('status').notNull().default('ACTIVE'),
  currentFillLevel: integer('current_fill_level').notNull().default(0), // 0-100
  needsCollection: boolean('needs_collection').notNull().default(false),
  lastUpdated: timestamp('last_updated', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------- TYPES ----------

// Full row returned from DB
export type SmartBin = typeof smartBins.$inferSelect;

// Used when inserting — id, lastUpdated etc. are optional (have defaults)
export type NewSmartBin = typeof smartBins.$inferInsert;

// Partial update type — everything optional except we need at least one field
export type UpdateSmartBin = Partial<Omit<NewSmartBin, 'id'>>;
