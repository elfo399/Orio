import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, primaryKey, real, serial, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true })
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true })
}, (table) => [index('sessions_user_id_idx').on(table.userId), index('sessions_expires_at_idx').on(table.expiresAt)]);

export const species = pgTable('species', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 48 }).notNull().unique(),
  displayName: varchar('display_name', { length: 80 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const pets = pgTable('pets', {
  id: serial('id').primaryKey(),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'restrict' }),
  speciesId: integer('species_id').notNull().references(() => species.id),
  name: varchar('name', { length: 24 }).notNull(),
  satiety: real('satiety').notNull(),
  happiness: real('happiness').notNull(),
  energy: real('energy').notNull(),
  hygiene: real('hygiene').notNull(),
  health: real('health').notNull(),
  isSleeping: boolean('is_sleeping').notNull().default(false),
  adoptedAt: timestamp('adopted_at', { withTimezone: true }).notNull(),
  lastSimulatedAt: timestamp('last_simulated_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  revision: integer('revision').notNull().default(0)
}, (table) => [index('pets_species_id_idx').on(table.speciesId), uniqueIndex('pets_owner_id_uq').on(table.ownerId).where(sql`${table.ownerId} is not null`)]);

export const petActionCooldowns = pgTable('pet_action_cooldowns', {
  petId: integer('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 16 }).notNull(),
  availableAt: timestamp('available_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [primaryKey({ columns: [table.petId, table.action], name: 'pet_action_cooldowns_pk' })]);

export const petEvents = pgTable('pet_events', {
  id: serial('id').primaryKey(),
  petId: integer('pet_id').notNull().references(() => pets.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 16 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 80 }),
  payload: jsonb('payload').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex('pet_events_pet_id_idempotency_key_uq').on(table.petId, table.idempotencyKey).where(sql`${table.idempotencyKey} is not null`)]);
