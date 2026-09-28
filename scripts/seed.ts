import 'reflect-metadata';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { species } from '@orio/database';
import { petSpeciesSlugs } from '@orio/contracts';

const speciesNames: Record<(typeof petSpeciesSlugs)[number], string> = {
  orio: 'Orio', rabbit: 'Rabbit', fox: 'Fox', bear: 'Bear', chick: 'Chick'
};

async function main(): Promise<void> {
  const client = postgres(process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio', { max: 1 });
  try {
    await drizzle(client).insert(species).values(
      petSpeciesSlugs.map((slug) => ({ slug, displayName: speciesNames[slug] }))
    ).onConflictDoNothing();
    console.log('Species seed is ready.');
  } finally { await client.end(); }
}
void main();
