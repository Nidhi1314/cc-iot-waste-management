import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

import { smartBins } from '../../modules/bins/bins.schema';
import { vehicles } from '../../modules/vehicles/vehicles.schema';
import { sensorData } from '../../modules/sensors/sensors.schema';
import { routes } from '../../modules/routes/routes.schema';
import { systemSettings } from '../../modules/settings/settings.schema';
import { destinations } from '../../modules/destinations/destinations.schema';
import { collections } from '../../modules/collections/collections.schema';

dotenv.config({ path: ['../.env', '.env'] });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

const db = drizzle(neon(databaseUrl));

async function seed() {
  console.log('Seeding ReGenix Delhi NCR demo data...');

  // WARNING: Use only on disposable demo databases.
  // Delete dependent records before their parents.
  try {
    await db.delete(collections);
  } catch {
    // collections table might be newly created
  }
  await db.delete(routes);
  await db.delete(sensorData);
  await db.delete(smartBins);
  await db.delete(vehicles);

  console.log('Existing demo records cleared.');

  // Demo admin and drivers with enterprise payload capacities
  const hashedPassword = await bcrypt.hash('wastewise123', 10);

  await db.insert(vehicles).values([
    {
      userCode: 'ADMIN-01',
      password: hashedPassword,
      role: 'ADMIN',
      maxCapacityKg: 2000,
    },
    {
      userCode: 'DRIVER-01',
      password: hashedPassword,
      role: 'DRIVER',
      maxCapacityKg: 2500,
    },
    {
      userCode: 'DRIVER-02',
      password: hashedPassword,
      role: 'DRIVER',
      maxCapacityKg: 3200,
    },
  ]);

  console.log('Demo accounts created with realistic fleet capacities.');

  // Ensure default system settings exist
  const existingSettings = await db.select().from(systemSettings).limit(1);
  let threshold = 75;

  if (existingSettings.length === 0) {
    await db.insert(systemSettings).values({
      fillThreshold: 75,
      maxWasteAgeHours: 48,
      feedContaminationMaxPct: 10,
    });
    console.log('Default system settings initialized.');
  } else {
    threshold = existingSettings[0].fillThreshold ?? 75;
  }

  // Delhi NCR organic waste generators
  const demoBins = [
    {
      address: 'Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'ACTIVE' as const,
      currentFillLevel: 85,
      generatorName: 'CP Food Court',
      generatorType: 'RESTAURANT' as const,
      wasteCategory: 'COOKED_FOOD' as const,
      estDailyKg: 65,
      pickupWindowStart: '09:00',
      pickupWindowEnd: '18:00',
    },
    {
      address: 'Karol Bagh, New Delhi',
      latitude: 28.6519,
      longitude: 77.1909,
      totalDepthCm: 80,
      maxCapacityKg: 200,
      status: 'ACTIVE' as const,
      currentFillLevel: 75,
      generatorName: 'Karol Bagh Hotel',
      generatorType: 'HOTEL' as const,
      wasteCategory: 'MIXED_ORGANIC' as const,
      estDailyKg: 90,
      pickupWindowStart: '08:00',
      pickupWindowEnd: '17:00',
    },
    {
      address: 'India Gate Area, New Delhi',
      latitude: 28.6129,
      longitude: 77.2295,
      totalDepthCm: 100,
      maxCapacityKg: 150,
      status: 'ACTIVE' as const,
      currentFillLevel: 100,
      generatorName: 'Central Canteen',
      generatorType: 'CANTEEN' as const,
      wasteCategory: 'COOKED_FOOD' as const,
      estDailyKg: 45,
      pickupWindowStart: '14:00',
      pickupWindowEnd: '19:00',
    },
    {
      address: 'Lajpat Nagar, New Delhi',
      latitude: 28.5677,
      longitude: 77.2433,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'ACTIVE' as const,
      currentFillLevel: 80,
      generatorName: 'Lajpat Central Market',
      generatorType: 'VEGETABLE_MARKET' as const,
      wasteCategory: 'VEG_SCRAPS' as const,
      estDailyKg: 120,
      pickupWindowStart: '06:00',
      pickupWindowEnd: '12:00',
    },
    {
      address: 'Saket, New Delhi',
      latitude: 28.5244,
      longitude: 77.2066,
      totalDepthCm: 120,
      maxCapacityKg: 200,
      status: 'ACTIVE' as const,
      currentFillLevel: 78,
      generatorName: 'Select Citywalk Dine',
      generatorType: 'RESTAURANT' as const,
      wasteCategory: 'COOKED_FOOD' as const,
      estDailyKg: 80,
      pickupWindowStart: '10:00',
      pickupWindowEnd: '22:00',
    },
    {
      address: 'Hauz Khas, New Delhi',
      latitude: 28.5494,
      longitude: 77.2001,
      totalDepthCm: 90,
      maxCapacityKg: 120,
      status: 'ACTIVE' as const,
      currentFillLevel: 45,
      generatorName: 'Hauz Khas Village Cafe',
      generatorType: 'RESTAURANT' as const,
      wasteCategory: 'MIXED_ORGANIC' as const,
      estDailyKg: 35,
      pickupWindowStart: '11:00',
      pickupWindowEnd: '23:00',
    },
    {
      address: 'Nehru Place, New Delhi',
      latitude: 28.5491,
      longitude: 77.2533,
      totalDepthCm: 80,
      maxCapacityKg: 100,
      status: 'OUT_OF_SERVICE' as const,
      currentFillLevel: 0,
      generatorName: 'Nehru Food Plaza',
      generatorType: 'CANTEEN' as const,
      wasteCategory: 'MIXED_ORGANIC' as const,
      estDailyKg: 40,
      pickupWindowStart: '12:00',
      pickupWindowEnd: '18:00',
    },
  ];

  await db.insert(smartBins).values(
    demoBins.map((bin) => ({
      ...bin,
      needsCollection:
        bin.status === 'ACTIVE' && bin.currentFillLevel >= threshold,
    })),
  );

  console.log('Seven Delhi NCR organic waste generators created.');

  // Seed demo destinations (processing facilities)
  const demoDestinations = [
    {
      name: 'Biogas Processing Unit - Okhla',
      type: 'BIOGAS' as const,
      address: 'Okhla, New Delhi',
      latitude: 28.5355,
      longitude: 77.272,
      acceptedCategories: ['VEG_SCRAPS', 'COOKED_FOOD', 'MIXED_ORGANIC'],
      dailyCapacityKg: 2000,
      openFrom: '08:00',
      openTo: '20:00',
      active: true,
    },
    {
      name: 'Organic Energy Facility - Ghazipur',
      type: 'BIOGAS' as const,
      address: 'Ghazipur, Delhi',
      latitude: 28.625,
      longitude: 77.326,
      acceptedCategories: ['VEG_SCRAPS', 'COOKED_FOOD', 'MIXED_ORGANIC'],
      dailyCapacityKg: 1500,
      openFrom: '07:00',
      openTo: '19:00',
      active: true,
    },
    {
      name: 'Demo Livestock Feed Hub - Chhatarpur',
      type: 'LIVESTOCK_FEED' as const,
      address: 'Chhatarpur, New Delhi',
      latitude: 28.5067,
      longitude: 77.174,
      acceptedCategories: ['VEG_SCRAPS'],
      dailyCapacityKg: 800,
      openFrom: '06:00',
      openTo: '14:00',
      active: true,
    },
  ];

  const existingDest = await db.select({ name: destinations.name }).from(destinations);
  const existingDestNames = new Set(existingDest.map((d) => d.name));
  const newDestinations = demoDestinations.filter((d) => !existingDestNames.has(d.name));

  if (newDestinations.length > 0) {
    await db.insert(destinations).values(newDestinations);
    console.log(`Created ${newDestinations.length} organic processing destinations.`);
  } else {
    console.log('Destinations already up to date.');
  }

  console.log(`Collection threshold: ${threshold}%`);
  console.log('ReGenix Delhi seed completed successfully.');
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
