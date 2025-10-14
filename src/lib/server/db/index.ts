import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

console.log('All environment variables:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
console.log('DATABASE_URL value:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not defined.');

const pool = new Pool({
	connectionString: process.env.DATABASE_URL
});

export const db = drizzle(pool, { schema });

export * from './schema';

export { pool };
