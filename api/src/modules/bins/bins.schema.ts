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

// Existing bin status
export const binStatusEnum = pgEnum('bin_status', [
  'ACTIVE',
  'DAMAGED',
  'OUT_OF_SERVICE',
]);

export type BinStatus = (typeof binStatusEnum.enumValues)[number];

// NEW: Types of organic waste generators
export const generatorTypeEnum = pgEnum('generator_type', [
  'RESTAURANT',
  'HOTEL',
  'CANTEEN',
  'VEGETABLE_MARKET',
]);

// NEW: Waste categories
export const wasteCategoryEnum = pgEnum('waste_category', [
  'VEG_SCRAPS',
  'COOKED_FOOD',
  'MIXED_ORGANIC',
]);

// Existing table, extended for organic waste.
export const smartBins = pgTable('smart_bins', {
  id: uuid('id').primaryKey().defaultRandom(),

  address: text('address').notNull(),

  latitude: real('latitude').notNull(),

  longitude: real('longitude').notNull(),

  totalDepthCm: real('total_depth_cm').notNull(),

  maxCapacityKg: real('max_capacity_kg').notNull(),

  status: binStatusEnum('status').notNull().default('ACTIVE'),

  currentFillLevel: integer('current_fill_level').notNull().default(0),

  needsCollection: boolean('needs_collection').notNull().default(false),

  lastUpdated: timestamp('last_updated', {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),

  // ===== ORGANIC WASTE GENERATOR FIELDS =====

  generatorName: text('generator_name'),

  generatorType: generatorTypeEnum('generator_type'),

  wasteCategory: wasteCategoryEnum('waste_category'),

  estDailyKg: real('est_daily_kg'),

  pickupWindowStart: text('pickup_window_start'),

  pickupWindowEnd: text('pickup_window_end'),

  // Time at which the current waste accumulation began.
  fillStartedAt: timestamp('fill_started_at', {
    withTimezone: true,
  }),

  lastCollectedAt: timestamp('last_collected_at', {
    withTimezone: true,
  }),

  contactName: text('contact_name'),

  contactPhone: text('contact_phone'),
});

// Database types
export type SmartBin = typeof smartBins.$inferSelect;

export type NewSmartBin = typeof smartBins.$inferInsert;

export type UpdateSmartBin = Partial<Omit<NewSmartBin, 'id'>>;
