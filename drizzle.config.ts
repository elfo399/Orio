import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './libs/database/src/schema.ts',
  out: './libs/database/drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio' },
  strict: true,
  verbose: true
});
