import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { smartBins } from '../../modules/bins/bins.schema';

dotenv.config({ path: ['../.env', '.env'] });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set in .env');
}

const db = drizzle(neon(databaseUrl));

const addressTranslations = [
  ['Kadıköy Meydanı, İstanbul', 'Kadikoy Square, Istanbul'],
  ['Bağdat Caddesi No:45, İstanbul', 'Bagdat Avenue No. 45, Istanbul'],
  ['Moda Sahili Parkı, İstanbul', 'Moda Seaside Park, Istanbul'],
  ['Feneryolu Durağı, İstanbul', 'Feneryolu Station, Istanbul'],
  ['Göztepe Metro İstasyonu, İstanbul', 'Goztepe Metro Station, Istanbul'],
  ['Suadiye Plajı, İstanbul', 'Suadiye Beach, Istanbul'],
  ['Caddebostan Sahili, İstanbul', 'Caddebostan Shore, Istanbul'],
] as const;

async function translateBinAddresses() {
  let updatedCount = 0;

  for (const [oldAddress, newAddress] of addressTranslations) {
    const updatedBins = await db
      .update(smartBins)
      .set({ address: newAddress })
      .where(eq(smartBins.address, oldAddress))
      .returning({ id: smartBins.id });

    updatedCount += updatedBins.length;
  }

  console.log(`Updated ${updatedCount} bin address(es) to English.`);
}

translateBinAddresses().catch((error: unknown) => {
  console.error('Failed to update bin addresses:', error);
  process.exitCode = 1;
});
