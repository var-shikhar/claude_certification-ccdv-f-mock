// Applies the SQL migrations in ./drizzle to DATABASE_URL (Neon) or the local PGlite store.
import 'dotenv/config';
import { db, usingPglite } from '@/db';

async function main() {
  const folder = { migrationsFolder: 'drizzle' };
  if (usingPglite()) {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(db as never, folder);
  } else {
    const { migrate } = await import('drizzle-orm/neon-serverless/migrator');
    await migrate(db, folder);
  }
  console.log(`Migrations applied (${usingPglite() ? 'local PGlite' : 'Neon'}).`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
