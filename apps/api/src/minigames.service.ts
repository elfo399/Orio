import { ConflictException, Injectable, NotFoundException, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { and, eq, lt, sql } from 'drizzle-orm';
import { randomInt, randomUUID } from 'node:crypto';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  type ApiPet, type MiniGameCompleteInput, type MiniGameConfiguration, type MiniGameResult, type MiniGameSession,
  type MiniGameStartInput, type MiniGameType, type PetResponse
} from '@orio/contracts';
import { minigameSessions, petActionCooldowns, petEvents, pets, species } from '@orio/database';
import {
  DEFAULT_GAME_RULES, cooldownFor, getPetStatus, minigameReward, scoreBubbleBath, scoreMemoryLights, scoreSnackCatch,
  simulate, type PetState
} from '@orio/game-engine';

type Database = PostgresJsDatabase;
type CurrentRow = { pet: typeof pets.$inferSelect; species: typeof species.$inferSelect };
type SessionRow = typeof minigameSessions.$inferSelect;

@Injectable()
export class MinigamesService implements OnModuleDestroy {
  private readonly client = postgres(process.env.DATABASE_URL ?? 'postgres://orio:orio@localhost:5432/orio', { max: 5, idle_timeout: 20 });
  private readonly db: Database = drizzle(this.client);

  async onModuleDestroy(): Promise<void> { await this.client.end({ timeout: 5 }); }

  async start(userId: string, input: MiniGameStartInput): Promise<MiniGameSession> {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const now = new Date();
      await this.expireActive(tx, userId, now);
      const row = await this.currentLocked(tx, userId);
      const state = simulate(this.fromRow(row.pet, row.species.slug), now).state;
      if (state.lastSimulatedAt.getTime() !== row.pet.lastSimulatedAt.getTime()) await this.persistState(tx, row.pet.id, state);
      if (state.isSleeping) throw new ConflictException('Wake your companion before starting a minigame.');

      const rules = DEFAULT_GAME_RULES.minigames[input.gameType];
      if (rules.minimumEnergy && state.stats.energy < rules.minimumEnergy) throw new ConflictException('Your companion needs more energy before playing.');
      const [cooldown] = await tx.select().from(petActionCooldowns).where(and(eq(petActionCooldowns.petId, row.pet.id), eq(petActionCooldowns.action, input.gameType))).limit(1);
      if (cooldown && cooldown.availableAt > now) throw new ConflictException(`This minigame is ready at ${cooldown.availableAt.toISOString()}.`);

      const active = await tx.select().from(minigameSessions).where(and(eq(minigameSessions.petId, row.pet.id), eq(minigameSessions.status, 'active'))).limit(1);
      if (active[0]) throw new ConflictException('Finish or close the current minigame first.');

      const configuration = this.configurationFor(input.gameType);
      const expiresAt = new Date(now.getTime() + this.sessionLifetimeMs(configuration));
      const [created] = await tx.insert(minigameSessions).values({
        id: randomUUID(), petId: row.pet.id, userId, gameType: input.gameType, status: 'active', configuration, startedAt: now, expiresAt, updatedAt: now
      }).returning();
      if (!created) throw new ServiceUnavailableException('Could not prepare the minigame.');
      return this.toSession(created);
    });
  }

  async get(userId: string, id: string): Promise<MiniGameSession> {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const [session] = await tx.select().from(minigameSessions).where(and(eq(minigameSessions.id, id), eq(minigameSessions.userId, userId))).limit(1);
      if (!session) throw new NotFoundException('Minigame session not found.');
      const now = new Date();
      if (session.status === 'active' && session.expiresAt <= now) {
        const [expired] = await tx.update(minigameSessions).set({ status: 'expired', updatedAt: now }).where(eq(minigameSessions.id, id)).returning();
        return this.toSession(expired ?? session);
      }
      return this.toSession(session);
    });
  }

  async abandon(userId: string, id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const [session] = await tx.select().from(minigameSessions).where(and(eq(minigameSessions.id, id), eq(minigameSessions.userId, userId))).limit(1);
      if (!session) throw new NotFoundException('Minigame session not found.');
      if (session.status !== 'active') return;
      const now = new Date();
      await tx.update(minigameSessions).set({ status: session.expiresAt <= now ? 'expired' : 'abandoned', updatedAt: now }).where(eq(minigameSessions.id, id));
    });
  }

  async complete(userId: string, id: string, input: MiniGameCompleteInput): Promise<MiniGameResult> {
    return this.db.transaction(async (tx) => {
      await this.lockUser(tx, userId);
      const [session] = await tx.select().from(minigameSessions).where(and(eq(minigameSessions.id, id), eq(minigameSessions.userId, userId))).limit(1);
      if (!session) throw new NotFoundException('Minigame session not found.');
      if (session.status === 'completed') {
        const replay = (session.resultData as { response?: MiniGameResult } | null)?.response;
        if (!replay) throw new ServiceUnavailableException('The completed minigame has no result.');
        return { ...replay, replayed: true };
      }
      const now = new Date();
      if (session.status !== 'active' || session.expiresAt <= now) {
        if (session.status === 'active') await tx.update(minigameSessions).set({ status: 'expired', updatedAt: now }).where(eq(minigameSessions.id, id));
        throw new ConflictException('This minigame session has expired or was closed.');
      }

      const gameType = session.gameType as MiniGameType;
      const configuration = session.configuration as MiniGameConfiguration;
      const elapsedMs = now.getTime() - session.startedAt.getTime();
      const verification = this.verify(gameType, configuration, input, elapsedMs);
      const row = await this.currentLocked(tx, userId);
      if (row.pet.id !== session.petId) throw new ConflictException('This session belongs to a different companion.');
      const state = simulate(this.fromRow(row.pet, row.species.slug), now).state;
      if (state.isSleeping) throw new ConflictException('Wake your companion before completing a minigame.');

      const rules = DEFAULT_GAME_RULES.minigames[gameType];
      const reward = minigameReward(verification.score, rules.maximumReward);
      state.stats[rules.rewardStat] = Math.min(100, state.stats[rules.rewardStat] + reward);
      if (rules.energyCost) state.stats.energy = Math.max(0, state.stats.energy - rules.energyCost);
      state.lastSimulatedAt = now;
      await this.persistState(tx, row.pet.id, state);

      const availableAt = cooldownFor(gameType, now);
      if (availableAt) await tx.insert(petActionCooldowns).values({ petId: row.pet.id, action: gameType, availableAt, updatedAt: now }).onConflictDoUpdate({
        target: [petActionCooldowns.petId, petActionCooldowns.action], set: { availableAt, updatedAt: now }
      });
      const petResponse = await this.response(tx, state, row.species, now);
      const response: MiniGameResult = {
        ...petResponse, sessionId: session.id, gameType, score: verification.score, reward, rewardStat: rules.rewardStat,
        message: verification.message
      };
      await tx.update(minigameSessions).set({ status: 'completed', score: verification.score, reward, completedAt: now, completionKey: input.idempotencyKey, resultData: { input, response }, updatedAt: now }).where(eq(minigameSessions.id, id));
      await tx.insert(petEvents).values({ petId: row.pet.id, action: `game-${gameType}`, idempotencyKey: input.idempotencyKey, payload: response, occurredAt: now });
      return response;
    });
  }

  private configurationFor(gameType: MiniGameType): MiniGameConfiguration {
    const rules = DEFAULT_GAME_RULES.minigames[gameType];
    if (gameType === 'feed') return { gameType, durationSeconds: rules.durationSeconds!, minimumCompletionSeconds: rules.minimumCompletionSeconds!, maxEvents: rules.maxEvents! };
    if (gameType === 'play') return { gameType, levels: rules.levels!, minimumCompletionSeconds: rules.minimumCompletionSeconds!, sequence: Array.from({ length: rules.levels! }, () => randomInt(4)) };
    return { gameType, durationSeconds: rules.durationSeconds!, zones: [...(rules.zones ?? [])] };
  }

  private sessionLifetimeMs(configuration: MiniGameConfiguration): number {
    return configuration.gameType === 'play' ? 120_000 : (configuration.durationSeconds + 20) * 1_000;
  }

  private verify(gameType: MiniGameType, configuration: MiniGameConfiguration, input: MiniGameCompleteInput, elapsedMs: number): { score: number; message: string } {
    if (gameType === 'feed' && configuration.gameType === 'feed') {
      if (elapsedMs < configuration.minimumCompletionSeconds * 1_000) throw new ConflictException('Snack Catch needs a little more play time.');
      const events = input.feedEvents ?? [];
      if (events.length > configuration.maxEvents || !this.plausibleEvents(events, configuration.durationSeconds)) throw new ConflictException('The Snack Catch result is not plausible.');
      return { score: scoreSnackCatch(events), message: 'Snack Catch complete!' };
    }
    if (gameType === 'play' && configuration.gameType === 'play') {
      if (elapsedMs < configuration.minimumCompletionSeconds * 1_000) throw new ConflictException('Memory Lights needs a little more play time.');
      let completed = 0;
      for (const [index, answers] of (input.memoryLevels ?? []).entries()) {
        const expected = configuration.sequence.slice(0, index + 1);
        if (index >= configuration.levels || answers.length !== expected.length || !answers.every((answer, answerIndex) => answer === expected[answerIndex])) break;
        completed += 1;
      }
      return { score: scoreMemoryLights(completed, configuration.levels), message: completed === configuration.levels ? 'Memory Lights mastered!' : 'A bright memory was made!' };
    }
    if (gameType === 'clean' && configuration.gameType === 'clean') {
      const cleaned = [...new Set(input.cleanedZones ?? [])].filter((zone) => configuration.zones.includes(zone));
      const score = scoreBubbleBath(cleaned.length, configuration.zones.length);
      if (score < 100 && elapsedMs < configuration.durationSeconds * 1_000) throw new ConflictException('Bubble Bath finishes when the timer ends, or when every spot is clean.');
      return { score, message: score === 100 ? 'Sparkling clean!' : 'A lovely freshen-up!' };
    }
    throw new ConflictException('The result did not match this minigame.');
  }

  private plausibleEvents(events: Array<{ kind: 'good' | 'spoiled'; atMs: number }>, durationSeconds: number): boolean {
    let previous = -350;
    for (const event of events) {
      if (event.atMs < previous + 350 || event.atMs > durationSeconds * 1_000) return false;
      previous = event.atMs;
    }
    return events.length <= Math.floor((durationSeconds * 1_000) / 350) + 1;
  }

  private async expireActive(tx: Database, userId: string, now: Date): Promise<void> {
    await tx.update(minigameSessions).set({ status: 'expired', updatedAt: now }).where(and(eq(minigameSessions.userId, userId), eq(minigameSessions.status, 'active'), lt(minigameSessions.expiresAt, now)));
  }

  private async lockUser(tx: Database, userId: string): Promise<void> { await tx.execute(sql`select pg_advisory_xact_lock(9182026, hashtext(${userId}))`); }

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
    for (const cooldown of cooldowns) cooldownMap[cooldown.action as keyof PetResponse['cooldowns']] = cooldown.availableAt.toISOString();
    const pet: ApiPet = {
      id: state.id, name: state.name, species: { slug: speciesRow.slug, displayName: speciesRow.displayName }, stats: state.stats,
      status: getPetStatus(state), isSleeping: state.isSleeping, adoptedAt: state.adoptedAt.toISOString(), lastSimulatedAt: state.lastSimulatedAt.toISOString(),
      ageMinutes: Math.max(0, Math.floor((now.getTime() - state.adoptedAt.getTime()) / 60_000))
    };
    return { pet, cooldowns: cooldownMap };
  }

  private toSession(row: SessionRow): MiniGameSession {
    return { id: row.id, gameType: row.gameType as MiniGameType, status: row.status as MiniGameSession['status'], configuration: row.configuration as MiniGameConfiguration, startedAt: row.startedAt.toISOString(), expiresAt: row.expiresAt.toISOString() };
  }
}
