import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: ['../.env', '.env'] });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in .env');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/*.schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
