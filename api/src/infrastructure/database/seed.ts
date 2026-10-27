import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

import { smartBins } from '../../modules/bins/bins.schema';
import { vehicles } from '../../modules/vehicles/vehicles.schema';
import { sensorData } from '../../modules/sensors/sensors.schema';
import { routes } from '../../modules/routes/routes.schema';
import { systemSettings } from '../../modules/settings/settings.schema';

dotenv.config({ path: ['../.env', '.env'] });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

const db = drizzle(neon(databaseUrl));

async function seed() {
  console.log('Seeding WasteWise Delhi NCR demo data...');

  // WARNING: Use only on disposable demo databases.
  // Delete dependent records before their parents.
  await db.delete(routes);
  await db.delete(sensorData);
  await db.delete(smartBins);
  await db.delete(vehicles);

  console.log('Existing demo records cleared.');

  // Demo admin and drivers
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

  console.log('Demo accounts created.');

  // Approximate coordinates for simulated
  // Delhi NCR waste collection points.
  const demoBins = [
    {
      address: 'Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'ACTIVE' as const,
      currentFillLevel: 85,
    },
    {
      address: 'Karol Bagh, New Delhi',
      latitude: 28.6519,
      longitude: 77.1909,
      totalDepthCm: 80,
      maxCapacityKg: 200,
      status: 'ACTIVE' as const,
      currentFillLevel: 75,
    },
    {
      address: 'India Gate Area, New Delhi',
      latitude: 28.6129,
      longitude: 77.2295,
      totalDepthCm: 100,
      maxCapacityKg: 150,
      status: 'ACTIVE' as const,
      currentFillLevel: 100,
    },
    {
      address: 'Lajpat Nagar, New Delhi',
      latitude: 28.5677,
      longitude: 77.2433,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'ACTIVE' as const,
      currentFillLevel: 80,
    },
    {
      address: 'Saket, New Delhi',
      latitude: 28.5244,
      longitude: 77.2066,
      totalDepthCm: 120,
      maxCapacityKg: 200,
      status: 'ACTIVE' as const,
      currentFillLevel: 78,
    },
    {
      address: 'Hauz Khas, New Delhi',
      latitude: 28.5494,
      longitude: 77.2001,
      totalDepthCm: 90,
      maxCapacityKg: 120,
      status: 'ACTIVE' as const,
      currentFillLevel: 45,
    },
    {
      address: 'Nehru Place, New Delhi',
      latitude: 28.5491,
      longitude: 77.2533,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'OUT_OF_SERVICE' as const,
      currentFillLevel: 0,
    },
  ];

  // Read the persisted collection threshold.
  // This ensures seeded flags respect dashboard settings.
  const savedSettings = await db.select().from(systemSettings).limit(1);

  const threshold = savedSettings[0]?.fillThreshold ?? 75;

  await db.insert(smartBins).values(
    demoBins.map((bin) => ({
      ...bin,
      needsCollection:
        bin.status === 'ACTIVE' && bin.currentFillLevel >= threshold,
    })),
  );

  console.log('Seven Delhi NCR demo bins created.');
  console.log(`Collection threshold: ${threshold}%`);
  console.log('Seed completed successfully.');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
