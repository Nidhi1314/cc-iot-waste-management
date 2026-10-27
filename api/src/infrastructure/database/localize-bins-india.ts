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

// Approximate Delhi NCR coordinates for demo purposes.
// These are NOT real registered waste-bin installations.
const locationMappings = [
  {
    oldAddress: 'Kadikoy Square, Istanbul',
    newAddress: 'Connaught Place, New Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
  },
  {
    oldAddress: 'Bagdat Avenue No. 45, Istanbul',
    newAddress: 'Karol Bagh, New Delhi',
    latitude: 28.6519,
    longitude: 77.1909,
  },
  {
    oldAddress: 'Moda Seaside Park, Istanbul',
    newAddress: 'India Gate Area, New Delhi',
    latitude: 28.6129,
    longitude: 77.2295,
  },
  {
    oldAddress: 'Feneryolu Station, Istanbul',
    newAddress: 'Lajpat Nagar, New Delhi',
    latitude: 28.5677,
    longitude: 77.2433,
  },
  {
    oldAddress: 'Goztepe Metro Station, Istanbul',
    newAddress: 'Saket, New Delhi',
    latitude: 28.5244,
    longitude: 77.2066,
  },
  {
    oldAddress: 'Suadiye Beach, Istanbul',
    newAddress: 'Hauz Khas, New Delhi',
    latitude: 28.5494,
    longitude: 77.2001,
  },
  {
    oldAddress: 'Caddebostan Shore, Istanbul',
    newAddress: 'Nehru Place, New Delhi',
    latitude: 28.5491,
    longitude: 77.2533,
  },
];

async function main() {
  console.log('Checking existing bin locations...');

  const existingBins = await db
    .select({
      id: smartBins.id,
      address: smartBins.address,
    })
    .from(smartBins);

  // Verify all seven source locations exist before editing.
  const missing = locationMappings.filter(
    (mapping) =>
      !existingBins.some((bin) => bin.address === mapping.oldAddress),
  );

  if (missing.length > 0) {
    console.error('Expected Istanbul demo records were not all found.');

    console.error(
      'No updates performed. Current addresses:',
      existingBins.map((bin) => bin.address),
    );

    process.exitCode = 1;
    return;
  }

  console.log('Updating demo coordinates to Delhi NCR...');

  for (const location of locationMappings) {
    await db
      .update(smartBins)
      .set({
        address: location.newAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdated: new Date(),
      })
      .where(eq(smartBins.address, location.oldAddress));

    console.log(`${location.oldAddress} -> ${location.newAddress}`);
  }

  console.log('Successfully localized seven demo bins!');
  console.log('Existing bin IDs and sensor data preserved.');
}

main().catch((error) => {
  console.error('Location update failed:', error);
  process.exitCode = 1;
});
