// Database client.
//
// DATABASE_URL points at Neon (serverless driver over WebSockets, which keeps
// interactive transactions available). Without it, or with
// DATABASE_URL=pglite:<dir>, an embedded Postgres (PGlite) is used so the app
// and tests run with zero setup.

import net from 'node:net';
import { Pool } from '@neondatabase/serverless';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleNeon, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import * as schema from './schema';

export type DB = NeonDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

export const usingPglite = () => {
  const url = process.env.DATABASE_URL;
  return !url || url.startsWith('pglite:');
};

function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (!usingPglite()) {
    // Node tries each resolved address for only 250 ms before moving on ("happy eyeballs"). On
    // networks with broken IPv6 and a slow IPv4 handshake every attempt times out, so allow longer.
    net.setDefaultAutoSelectFamilyAttemptTimeout(2_500);
    // Opening a connection costs several network round trips (WebSocket, TLS, auth), so keep
    // idle connections for a few minutes instead of the driver's 10-second default.
    const pool = new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 5 * 60_000, connectionTimeoutMillis: 20_000 });
    return drizzleNeon({ client: pool, schema, casing: 'snake_case' });
  }
  const dir = url?.slice('pglite:'.length) || '.data/pglite';
  const client = dir === 'memory' ? new PGlite() : new PGlite(dir);
  return drizzlePglite({ client, schema, casing: 'snake_case' }) as unknown as DB;
}

// One client per process; Next dev re-evaluates modules on every edit.
const g = globalThis as unknown as { __quizmonkeyDb?: DB };
export const db: DB = (g.__quizmonkeyDb ??= createDb());
export { schema };
