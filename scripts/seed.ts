import 'reflect-metadata';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { species } from '@orio/database';

async function main(): Promise<void> {
  const client = postgres(process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio', { max: 1 });
  try {
    await drizzle(client).insert(species).values({ slug: 'orio', displayName: 'Orio' }).onConflictDoNothing();
    console.log('Species seed is ready.');
  } finally { await client.end(); }
}
void main();
