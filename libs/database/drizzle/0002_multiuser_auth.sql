CREATE TABLE "users" (
  "id" uuid PRIMARY KEY NOT NULL,
  "email" varchar(320) NOT NULL UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "display_name" varchar(80) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_login_at" timestamp with time zone
);
CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone
);
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions" ("expires_at");
ALTER TABLE "pets" DROP CONSTRAINT IF EXISTS "pets_id_check";
ALTER TABLE "pets" ADD COLUMN "owner_id" uuid REFERENCES "users"("id") ON DELETE RESTRICT;
CREATE UNIQUE INDEX "pets_owner_id_uq" ON "pets" ("owner_id") WHERE "owner_id" IS NOT NULL;
DROP INDEX IF EXISTS "pet_events_idempotency_key_uq";
CREATE UNIQUE INDEX "pet_events_pet_id_idempotency_key_uq" ON "pet_events" ("pet_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
