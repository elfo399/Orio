CREATE TABLE "minigame_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "pet_id" integer NOT NULL REFERENCES "pets"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "game_type" varchar(16) NOT NULL CHECK ("game_type" IN ('feed', 'play', 'clean')),
  "status" varchar(16) NOT NULL DEFAULT 'active' CHECK ("status" IN ('active', 'completed', 'abandoned', 'expired')),
  "configuration" jsonb NOT NULL,
  "result_data" jsonb,
  "score" integer CHECK ("score" BETWEEN 0 AND 100),
  "reward" integer CHECK ("reward" >= 0),
  "completion_key" varchar(80),
  "started_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "minigame_sessions_user_id_idx" ON "minigame_sessions" ("user_id");
CREATE INDEX "minigame_sessions_pet_status_idx" ON "minigame_sessions" ("pet_id", "status");
CREATE INDEX "minigame_sessions_expires_at_idx" ON "minigame_sessions" ("expires_at");
CREATE UNIQUE INDEX "minigame_sessions_one_active_per_pet_uq" ON "minigame_sessions" ("pet_id") WHERE "status" = 'active';
