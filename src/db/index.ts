import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client/web';
import * as schema from './schema';

const url = process.env.TURSO_CONNECTION_URL;
if (!url) throw new Error('TURSO_CONNECTION_URL env var is required');

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
