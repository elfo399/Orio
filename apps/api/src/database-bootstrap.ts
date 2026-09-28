import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { species } from '@orio/database';

const migrationLock = 9182027;
const databaseUrl = process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio';

async function waitForDatabase(): Promise<ReturnType<typeof postgres>> {
  const deadline = Date.now() + Number(process.env.DATABASE_STARTUP_TIMEOUT_MS ?? 90_000);
  let lastError: unknown;
  while (Date.now() < deadline) {
    const client = postgres(databaseUrl, { max: 1, connect_timeout: 5 });
    try {
      await client`select 1`;
      return client;
    } catch (error) {
      lastError = error;
      await client.end({ timeout: 1 }).catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(`PostgreSQL did not become available before startup timeout: ${lastError instanceof Error ? lastError.message : 'unknown error'}`);
}

/** Runs before Nest is created: a failed migration never exposes an HTTP listener. */
export async function prepareDatabase(): Promise<void> {
  const client = await waitForDatabase();
  try {
    await client`select pg_advisory_lock(${migrationLock})`;
    await migrate(drizzle(client), { migrationsFolder: 'libs/database/drizzle' });
    await drizzle(client).insert(species).values({ slug: 'orio', displayName: 'Orio' }).onConflictDoNothing();
  } finally {
    await client`select pg_advisory_unlock(${migrationLock})`.catch(() => undefined);
    await client.end({ timeout: 5 });
  }
}
