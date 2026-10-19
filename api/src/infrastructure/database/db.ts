import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

export const createDrizzleClient = (databaseUrl: string) => {
  const sql = neon(databaseUrl);
  return drizzle(sql);
};

export type DrizzleClient = ReturnType<typeof createDrizzleClient>;
