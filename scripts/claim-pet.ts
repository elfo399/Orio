import 'reflect-metadata';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pets, users } from '@orio/database';

function emailArgument(): string {
  const index = process.argv.indexOf('--email');
  const value = index >= 0 ? process.argv[index + 1] : process.argv.find((argument) => argument.startsWith('--email='))?.slice('--email='.length);
  if (!value || !/^\S+@\S+\.\S+$/.test(value.trim())) throw new Error('Usage: pnpm admin:claim-pet --email user@example.com');
  return value.trim().toLowerCase();
}

async function main(): Promise<void> {
  const client = postgres(process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio', { max: 1 });
  try {
    const email = emailArgument();
    const result = await drizzle(client).transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(9182028)`);
      const [user] = await tx.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) throw new Error(`No user exists for ${email}.`);
      const [owned] = await tx.select({ id: pets.id }).from(pets).where(eq(pets.ownerId, user.id)).limit(1);
      if (owned) return { status: 'already-owned' as const, petId: owned.id };
      const [legacy] = await tx.select({ id: pets.id }).from(pets).where(isNull(pets.ownerId)).orderBy(pets.id).limit(1);
      if (!legacy) throw new Error('No unowned legacy pet is available to claim.');
      const [claimed] = await tx.update(pets).set({ ownerId: user.id, updatedAt: new Date() }).where(and(eq(pets.id, legacy.id), isNull(pets.ownerId))).returning({ id: pets.id });
      if (!claimed) throw new Error('The legacy pet was claimed concurrently; retry the command.');
      return { status: 'claimed' as const, petId: claimed.id };
    });
    console.log(result.status === 'claimed' ? `Claimed legacy pet ${result.petId} for ${email}.` : `User ${email} already owns pet ${result.petId}; nothing changed.`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => { console.error(error); process.exit(1); });
