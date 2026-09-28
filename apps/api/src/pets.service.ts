import { ConflictException, Injectable, NotFoundException, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { type ActionResponse, type AdoptionInput, type ApiPet, type IdempotencyInput, type PetAction, type PetResponse } from '@orio/contracts';
import { petActionCooldowns, petEvents, pets, species } from '@orio/database';
import { applyAction, cooldownFor, type PetState, simulate } from '@orio/game-engine';

type Database = PostgresJsDatabase;
type CurrentRow = { pet: typeof pets.$inferSelect; species: typeof species.$inferSelect };

@Injectable()
export class PetsService implements OnModuleDestroy {
  private readonly client = postgres(process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio', { max: 5, idle_timeout: 20 });
  private readonly db: Database = drizzle(this.client);

  async onModuleDestroy(): Promise<void> { await this.client.end({ timeout: 5 }); }

  async health(): Promise<{ status: 'ok'; database: 'ok' }> {
    await this.client`select 1`;
    return { status: 'ok', database: 'ok' };
  }

  async current(userId: string): Promise<PetResponse> {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const row = await this.currentLocked(tx, userId);
      const now = new Date();
      const state = this.fromRow(row.pet, row.species.slug);
      const simulation = simulate(state, now);
      if (simulation.elapsedHours > 0) await this.persistState(tx, row.pet.id, simulation.state);
      return this.response(tx, simulation.state, row.species, now);
    });
  }

  async adopt(userId: string, input: AdoptionInput): Promise<PetResponse> {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const present = await tx.select({ id: pets.id }).from(pets).where(eq(pets.ownerId, userId)).limit(1);
      if (present.length) throw new ConflictException('You have already adopted an ORIO.');
      const [defaultSpecies] = await tx.select().from(species).where(eq(species.slug, 'orio')).limit(1);
      if (!defaultSpecies) throw new ServiceUnavailableException('The species catalogue has not been seeded.');
      const now = new Date();
      const [created] = await tx.insert(pets).values({
        ownerId: userId, speciesId: defaultSpecies.id, name: input.name,
        satiety: 75, happiness: 75, energy: 70, hygiene: 75, health: 100,
        isSleeping: false, adoptedAt: now, lastSimulatedAt: now, updatedAt: now
      }).returning();
      if (!created) throw new ServiceUnavailableException('Could not create ORIO.');
      const state = this.fromRow(created, defaultSpecies.slug);
      await tx.insert(petEvents).values({ petId: created.id, action: 'adopt', payload: { name: created.name }, occurredAt: now });
      return this.response(tx, state, defaultSpecies, now);
    });
  }

  async act(userId: string, action: PetAction, input: IdempotencyInput): Promise<ActionResponse> {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const row = await this.currentLocked(tx, userId);
      if (input.idempotencyKey) {
        const [previous] = await tx.select().from(petEvents).where(and(eq(petEvents.petId, row.pet.id), eq(petEvents.idempotencyKey, input.idempotencyKey))).limit(1);
        if (previous) return { ...(previous.payload as PetResponse), message: 'Action already applied.', replayed: true };
      }
      const now = new Date();
      const cooldown = await tx.select().from(petActionCooldowns).where(and(eq(petActionCooldowns.petId, row.pet.id), eq(petActionCooldowns.action, action))).limit(1);
      if (cooldown[0] && cooldown[0].availableAt > now) throw new ConflictException(`This action is ready at ${cooldown[0].availableAt.toISOString()}.`);

      let result;
      try { result = applyAction(this.fromRow(row.pet, row.species.slug), action, now); }
      catch (error) { throw new ConflictException(error instanceof Error ? error.message : 'Action unavailable.'); }
      await this.persistState(tx, row.pet.id, result.state);
      const availableAt = cooldownFor(action, now);
      if (availableAt) await tx.insert(petActionCooldowns).values({ petId: row.pet.id, action, availableAt, updatedAt: now }).onConflictDoUpdate({ target: [petActionCooldowns.petId, petActionCooldowns.action], set: { availableAt, updatedAt: now } });
      const response = await this.response(tx, result.state, row.species, now);
      const resultBody: ActionResponse = { ...response, message: result.event?.message ?? 'Done.' };
      await tx.insert(petEvents).values({ petId: row.pet.id, action, idempotencyKey: input.idempotencyKey, payload: resultBody, occurredAt: now });
      return resultBody;
    });
  }

  private async lockUser(tx: Database, userId: string): Promise<void> {
    await tx.execute(sql`select pg_advisory_xact_lock(9182026, hashtext(${userId}))`);
  }

  private async currentLocked(tx: Database, userId: string): Promise<CurrentRow> {
    const rows = await tx.select({ pet: pets, species }).from(pets).innerJoin(species, eq(pets.speciesId, species.id)).where(eq(pets.ownerId, userId)).limit(1);
    if (!rows[0]) throw new NotFoundException('No pet adopted yet.');
    return rows[0];
  }

  private fromRow(row: typeof pets.$inferSelect, speciesSlug: string): PetState {
    return { id: row.id, name: row.name, speciesSlug, stats: { satiety: row.satiety, happiness: row.happiness, energy: row.energy, hygiene: row.hygiene, health: row.health }, isSleeping: row.isSleeping, adoptedAt: row.adoptedAt, lastSimulatedAt: row.lastSimulatedAt };
  }

  private async persistState(tx: Database, id: number, state: PetState): Promise<void> {
    await tx.update(pets).set({ ...state.stats, isSleeping: state.isSleeping, lastSimulatedAt: state.lastSimulatedAt, updatedAt: new Date(), revision: sql`${pets.revision} + 1` }).where(eq(pets.id, id));
  }

  private async response(tx: Database, state: PetState, speciesRow: typeof species.$inferSelect, now: Date): Promise<PetResponse> {
    const cooldowns = await tx.select().from(petActionCooldowns).where(eq(petActionCooldowns.petId, state.id));
    const cooldownMap: PetResponse['cooldowns'] = {};
    for (const cooldown of cooldowns) cooldownMap[cooldown.action as PetAction] = cooldown.availableAt.toISOString();
    const pet: ApiPet = {
      id: state.id, name: state.name, species: { slug: speciesRow.slug, displayName: speciesRow.displayName }, stats: state.stats,
      status: simulate(state, now).status, isSleeping: state.isSleeping,
      adoptedAt: state.adoptedAt.toISOString(), lastSimulatedAt: state.lastSimulatedAt.toISOString(),
      ageMinutes: Math.max(0, Math.floor((now.getTime() - state.adoptedAt.getTime()) / 60_000))
    };
    return { pet, cooldowns: cooldownMap };
  }
}
