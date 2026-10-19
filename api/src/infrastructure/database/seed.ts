import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import { smartBins } from '../../modules/bins/bins.schema';
import { vehicles } from '../../modules/vehicles/vehicles.schema';
import { sensorData } from '../../modules/sensors/sensors.schema';
import { routes } from '../../modules/routes/routes.schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: ['../.env', '.env'] });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

const db = drizzle(neon(databaseUrl));

async function seed() {
  console.log('🌱 Seeding database...');

  // Delete order matters — child tables first, then parent tables
  // routes → vehicles (FK: assigned_car_id)
  // sensor_data → smart_bins (FK: bin_id, onDelete: cascade — but explicit is safer)
  await db.delete(routes);
  await db.delete(sensorData);
  await db.delete(smartBins);
  await db.delete(vehicles);
  console.log('🗑️  Cleared existing data.');

  // ---------- VEHICLES ----------
  const hashedPassword = await bcrypt.hash('wastewise123', 10);

  await db.insert(vehicles).values([
    {
      userCode: 'ADMIN-01',
      password: hashedPassword,
      role: 'ADMIN',
      maxCapacityKg: 0,
    },
    {
      userCode: 'DRIVER-01',
      password: hashedPassword,
      role: 'DRIVER',
      maxCapacityKg: 400,
    },
    {
      userCode: 'DRIVER-02',
      password: hashedPassword,
      role: 'DRIVER',
      maxCapacityKg: 400,
    },
  ]);
  console.log('✅ Vehicles seeded.');

  // ---------- SMART BINS ----------
  await db.insert(smartBins).values([
    {
      address: 'Kadıköy Meydanı, İstanbul',
      latitude: 40.99,
      longitude: 29.023,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'ACTIVE',
      currentFillLevel: 85,
      needsCollection: true,
    },
    {
      address: 'Bağdat Caddesi No:45, İstanbul',
      latitude: 40.9713,
      longitude: 29.0556,
      totalDepthCm: 80,
      maxCapacityKg: 200,
      status: 'ACTIVE',
      currentFillLevel: 75,
      needsCollection: true,
    },
    {
      address: 'Moda Sahili Parkı, İstanbul',
      latitude: 40.9847,
      longitude: 29.0285,
      totalDepthCm: 100,
      maxCapacityKg: 150,
      status: 'ACTIVE',
      currentFillLevel: 100,
      needsCollection: true,
    },
    {
      address: 'Feneryolu Durağı, İstanbul',
      latitude: 40.9787958,
      longitude: 29.0488297,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'ACTIVE',
      currentFillLevel: 80,
      needsCollection: true,
    },
    {
      address: 'Göztepe Metro İstasyonu, İstanbul',
      latitude: 40.9756,
      longitude: 29.022,
      totalDepthCm: 120,
      maxCapacityKg: 200,
      status: 'ACTIVE',
      currentFillLevel: 78,
      needsCollection: true,
    },
    {
      address: 'Suadiye Plajı, İstanbul',
      latitude: 40.9612,
      longitude: 29.0681,
      totalDepthCm: 90,
      maxCapacityKg: 120,
      status: 'ACTIVE',
      currentFillLevel: 45,
      needsCollection: false,
    },
    {
      address: 'Caddebostan Sahili, İstanbul',
      latitude: 40.965,
      longitude: 29.059,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'OUT_OF_SERVICE',
      currentFillLevel: 0,
      needsCollection: false,
    },
  ]);
  console.log('✅ Smart bins seeded.');

  console.log('🎉 All done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
