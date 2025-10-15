import { config } from 'dotenv';

// Load environment variables from .env file (best-effort)
try {
	config();
} catch (e) {
	// ignore
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export let pool: Pool | undefined;
export let db: any | undefined;

// Do not log raw environment variable values to avoid leaking secrets in logs.
// Log only which source is being used.
if (process.env.DATABASE_URL) {
	console.log('Using DATABASE_URL for DB connection');
} else if (process.env.LOCAL_DATABASE_URL) {
	console.log('Using LOCAL_DATABASE_URL (local-only) for DB connection');
} else {
	console.log('No database URL configured; DB initialization will be skipped');
}

// Choose DB URL in the following order:
// 1. DATABASE_URL (explicit/production)
// 2. LOCAL_DATABASE_URL (if and only if in local dev)
const chooseLocal = (url?: string) => {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
	} catch (e) {
		return false;
	}
};

const dbUrl = process.env.DATABASE_URL ?? (chooseLocal(process.env.LOCAL_DATABASE_URL) ? process.env.LOCAL_DATABASE_URL : undefined);

if (dbUrl) {
	pool = new Pool({ connectionString: dbUrl });
	db = drizzle(pool, { schema });
} else {
	console.warn('No suitable DATABASE_URL found. Skipping DB initialization — exports `db` and `pool` will be undefined.');
}

export * from './schema';
