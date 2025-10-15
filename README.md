instructions to setup:
run npm install
update the DATABASE_URL And staff at .env
run npx drizzle-kit push

update src/lib/server/db/index.ts to 
import { config } from 'dotenv';

// Load environment variables from .env file
config();

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// The DB module expects a DATABASE_URL. For local development you can set LOCAL_DATABASE_URL
// and the server will only use it when it points to localhost. See .env.example for placeholders.

===

set an admin with
psql 'url' -c "UPDATE \"user\" SET \"isAdmin\" = true WHERE \"slackId\" = 'U091DE0M4NB';"