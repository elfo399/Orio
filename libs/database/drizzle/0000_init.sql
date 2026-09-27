CREATE TABLE "species" (
  "id" serial PRIMARY KEY NOT NULL,
  "slug" varchar(48) NOT NULL UNIQUE,
  "display_name" varchar(80) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE "pets" (
  "id" serial PRIMARY KEY NOT NULL CHECK ("id" = 1),
  "species_id" integer NOT NULL REFERENCES "species"("id"),
  "name" varchar(24) NOT NULL,
  "satiety" integer NOT NULL CHECK ("satiety" BETWEEN 0 AND 100),
  "happiness" integer NOT NULL CHECK ("happiness" BETWEEN 0 AND 100),
  "energy" integer NOT NULL CHECK ("energy" BETWEEN 0 AND 100),
  "hygiene" integer NOT NULL CHECK ("hygiene" BETWEEN 0 AND 100),
  "health" integer NOT NULL CHECK ("health" BETWEEN 0 AND 100),
  "is_sleeping" boolean DEFAULT false NOT NULL,
  "adopted_at" timestamp with time zone NOT NULL,
  "last_simulated_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revision" integer DEFAULT 0 NOT NULL
);
CREATE INDEX "pets_species_id_idx" ON "pets" ("species_id");
CREATE TABLE "pet_action_cooldowns" (
  "pet_id" integer NOT NULL REFERENCES "pets"("id") ON DELETE CASCADE,
  "action" varchar(16) NOT NULL,
  "available_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pet_action_cooldowns_pk" PRIMARY KEY("pet_id", "action")
);
CREATE TABLE "pet_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "pet_id" integer NOT NULL REFERENCES "pets"("id") ON DELETE CASCADE,
  "action" varchar(16) NOT NULL,
  "idempotency_key" varchar(80),
  "payload" jsonb NOT NULL,
  "occurred_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "pet_events_idempotency_key_uq" ON "pet_events" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
