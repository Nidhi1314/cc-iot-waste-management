import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

import { smartBins } from '../../modules/bins/bins.schema';

dotenv.config({ path: ['../.env', '.env'] });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

const db = drizzle(neon(databaseUrl));

// Fictional organic waste generators for demo purposes.
// Locations and daily waste amounts are illustrative.

const generators = [
  {
    address: 'Connaught Place, New Delhi',
    generatorName: 'CP Food Court',
    generatorType: 'RESTAURANT' as const,
    wasteCategory: 'COOKED_FOOD' as const,
    estDailyKg: 65,
    pickupWindowStart: '09:00',
    pickupWindowEnd: '18:00',
  },
  {
    address: 'Karol Bagh, New Delhi',
    generatorName: 'Karol Bagh Hotel',
    generatorType: 'HOTEL' as const,
    wasteCategory: 'MIXED_ORGANIC' as const,
    estDailyKg: 90,
    pickupWindowStart: '08:00',
    pickupWindowEnd: '17:00',
  },
  {
    address: 'India Gate Area, New Delhi',
    generatorName: 'Central Canteen',
    generatorType: 'CANTEEN' as const,
    wasteCategory: 'COOKED_FOOD' as const,
    estDailyKg: 45,
    pickupWindowStart: '14:00',
    pickupWindowEnd: '19:00',
  },
  {
    address: 'Lajpat Nagar, New Delhi',
    generatorName: 'Lajpat Vegetable Market',
    generatorType: 'VEGETABLE_MARKET' as const,
    wasteCategory: 'VEG_SCRAPS' as const,
    estDailyKg: 120,
    pickupWindowStart: '06:00',
    pickupWindowEnd: '12:00',
  },
  {
    address: 'Saket, New Delhi',
    generatorName: 'Saket Restaurant',
    generatorType: 'RESTAURANT' as const,
    wasteCategory: 'COOKED_FOOD' as const,
    estDailyKg: 55,
    pickupWindowStart: '10:00',
    pickupWindowEnd: '20:00',
  },
  {
    address: 'Hauz Khas, New Delhi',
    generatorName: 'Hauz Khas Café',
    generatorType: 'RESTAURANT' as const,
    wasteCategory: 'VEG_SCRAPS' as const,
    estDailyKg: 25,
    pickupWindowStart: '09:00',
    pickupWindowEnd: '16:00',
  },
  {
    address: 'Nehru Place, New Delhi',
    generatorName: 'Nehru Place Canteen',
    generatorType: 'CANTEEN' as const,
    wasteCategory: 'MIXED_ORGANIC' as const,
    estDailyKg: 40,
    pickupWindowStart: '12:00',
    pickupWindowEnd: '18:00',
  },
];

async function main() {
  console.log('Checking Delhi demo generators...');

  const bins = await db
    .select({
      id: smartBins.id,
      address: smartBins.address,
      generatorName: smartBins.generatorName,
    })
    .from(smartBins);

  // Preflight: avoid partial updates if a location
  // is missing, duplicated, or already populated.
  for (const generator of generators) {
    const matches = bins.filter((bin) => bin.address === generator.address);

    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one bin at ${generator.address}; found ${matches.length}`,
      );
    }

    if (matches[0].generatorName !== null) {
      throw new Error(
        `Generator already exists at ${generator.address}. No updates performed.`,
      );
    }
  }

  console.log('Adding organic generator metadata...');

  for (const generator of generators) {
    const { address, ...metadata } = generator;

    await db
      .update(smartBins)
      .set(metadata)
      .where(eq(smartBins.address, address));

    console.log(`Added ${metadata.generatorName} (${metadata.wasteCategory})`);
  }

  console.log('Seven organic generators updated.');
  console.log('Existing IDs, fill levels, and history preserved.');
}

main().catch((error) => {
  console.error('Organic generator update failed:', error);
  process.exitCode = 1;
});
