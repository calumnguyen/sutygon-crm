import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// Create a Neon SQL client
const sql = neon(process.env.DATABASE_URL);

// Create a Drizzle ORM instance
export const db = drizzle(sql, { schema });

// Export the schema for use in other files
export * from './schema';
