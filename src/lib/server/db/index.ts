import { config } from 'dotenv';

// Try local first, in prod this will not be present so fallback to productiion

try {
	config({ path: '.env.local' });
} catch (e) {
	// ignore
}
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

// Choose DB URL:
// Prefer LOCAL_DATABASE_URL when it points at localhost (developer machine).
// Fallback to DATABASE_URL otherwise. This prevents a checked-in placeholder
// DATABASE_URL from being chosen over a valid local URL in .env.local.
const chooseLocal = (url?: string) => {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
	} catch (e) {
		return false;
	}
};

// If a LOCAL_DATABASE_URL points at localhost, prefer it in development.
const dbUrl = chooseLocal(process.env.LOCAL_DATABASE_URL)
	? process.env.LOCAL_DATABASE_URL
	: process.env.DATABASE_URL ?? undefined;

if (dbUrl) {
	pool = new Pool({ connectionString: dbUrl });
	db = drizzle(pool, { schema });
} else {
	console.warn('No suitable DATABASE_URL found. Skipping DB initialization — exports `db` and `pool` will be undefined.');
}

export * from './schema';
