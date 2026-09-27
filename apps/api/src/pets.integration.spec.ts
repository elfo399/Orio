import { beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import { species } from '@orio/database';
import postgres from 'postgres';
import { PetsService } from './pets.service';

const databaseUrl = process.env.TEST_DATABASE_URL;
const testOrSkip = databaseUrl ? describe : describe.skip;

testOrSkip('PetsService PostgreSQL integration', () => {
  const client = postgres(databaseUrl!, { max: 2 });
  const db = drizzle(client);
  let service: PetsService;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    await client.unsafe('TRUNCATE pet_events, pet_action_cooldowns, pets, species RESTART IDENTITY CASCADE');
    await db.insert(species).values({ slug: 'orio', displayName: 'Orio' });
    service = new PetsService();
  });

  it('allows exactly one concurrent adoption and persists it', async () => {
    const attempts = await Promise.allSettled([service.adopt({ name: 'Miso' }), service.adopt({ name: 'Pip' })]);
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect((await service.current()).pet.name).toMatch(/Miso|Pip/);
  });

  it('replays an idempotent action without applying it twice', async () => {
    const key = '79a262b0-ec1d-48ba-92e0-2aa9c6b0d1ac';
    const first = await service.act('feed', { idempotencyKey: key });
    const replay = await service.act('feed', { idempotencyKey: key });
    expect(replay.replayed).toBe(true);
    expect(replay.pet.stats.satiety).toBe(first.pet.stats.satiety);
  });
});
