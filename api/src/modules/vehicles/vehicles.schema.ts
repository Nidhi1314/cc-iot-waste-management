import {
  pgTable,
  uuid,
  varchar,
  text,
  real,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const vehicleRoleEnum = pgEnum('vehicle_role', ['ADMIN', 'DRIVER']);

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userCode: varchar('user_code', { length: 64 }).notNull().unique(),
  password: text('password').notNull(), // stored as bcrypt hash
  role: vehicleRoleEnum('role').notNull().default('DRIVER'),
  maxCapacityKg: real('max_capacity_kg').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type VehicleRole = (typeof vehicleRoleEnum.enumValues)[number];
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type UpdateVehicle = Partial<Omit<NewVehicle, 'id' | 'createdAt'>>;
export type VehiclePublic = Omit<Vehicle, 'password'>;
