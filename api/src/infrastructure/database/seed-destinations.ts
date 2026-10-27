import * as dotenv from 'dotenv';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import {
  destinations,
  type NewDestination,
} from '../../modules/destinations/destinations.schema';

dotenv.config({ path: ['../.env', '.env'] });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

const db = drizzle(neon(databaseUrl));

const demoDestinations: NewDestination[] = [
  {
    name: 'Biogas Processing Unit - Okhla',
    type: 'BIOGAS',
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
    type: 'BIOGAS',
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
    type: 'LIVESTOCK_FEED',
    address: 'Chhatarpur, New Delhi',
    latitude: 28.5067,
    longitude: 77.174,
    acceptedCategories: ['VEG_SCRAPS'],
    dailyCapacityKg: 500,
    openFrom: '06:00',
    openTo: '16:00',
    active: true,
  },
  {
    name: 'Demo Farm Feed Centre - Najafgarh',
    type: 'LIVESTOCK_FEED',
    address: 'Najafgarh, Delhi',
    latitude: 28.6092,
    longitude: 76.9798,
    acceptedCategories: ['VEG_SCRAPS'],
    dailyCapacityKg: 600,
    openFrom: '06:00',
    openTo: '17:00',
    active: true,
  },
];

async function main() {
  console.log('Seeding Delhi NCR demo destinations...');

  const existing = await db
    .select({
      name: destinations.name,
    })
    .from(destinations);

  const existingNames = new Set(existing.map((row) => row.name));

  const newDestinations = demoDestinations.filter(
    (destination) => !existingNames.has(destination.name),
  );

  if (newDestinations.length === 0) {
    console.log('Demo destinations already exist.');
    return;
  }

  await db.insert(destinations).values(newDestinations);

  console.log(`Created ${newDestinations.length} destinations.`);
  console.log('No existing destinations were deleted.');
}

main().catch((error) => {
  console.error('Destination seed failed:', error);
  process.exitCode = 1;
});
