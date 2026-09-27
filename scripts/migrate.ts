import 'reflect-metadata';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function main(): Promise<void> {
  const client = postgres(process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio', { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: 'libs/database/drizzle' });
    console.log('Migrations applied.');
  } finally { await client.end(); }
}
void main();
