# Architecture

ORIO is a multiuser modular monorepo. `apps/web` is the Angular PWA, `apps/api` is the NestJS REST server, and PostgreSQL is the authoritative store.

```text
browser (Angular Signals) -- HTTPS /api --> Caddy --> NestJS --> PostgreSQL
        HttpOnly session cookie              game engine   one pet per account
```

## Boundaries

- `libs/game-engine` is deterministic TypeScript. It receives state and `now`, and never accesses HTTP, PostgreSQL, or `Date.now`.
- `libs/contracts` owns Zod request validation and typed API shapes.
- `libs/database` owns Drizzle schema and versioned SQL migrations.
- `libs/shared` contains framework-free presentation helpers.

Before Nest creates an HTTP listener, the API waits for PostgreSQL, obtains a dedicated advisory lock, applies missing Drizzle migrations, and idempotently seeds the species catalogue. A failure exits non-zero without serving HTTP. `pnpm db:migrate` remains available for operators.

Passwords are Argon2id hashes. Sessions use random opaque tokens sent only in an HttpOnly, SameSite cookie; PostgreSQL stores only the SHA-256 token hash. The global Nest guard resolves the authenticated user and every pet query is scoped to that user. A per-user PostgreSQL advisory lock serializes simulation, adoption, actions, cooldowns, and idempotent retries.

The multiuser migration deliberately leaves a personal-edition pet unowned. An operator can assign it, once, with `pnpm admin:claim-pet --email user@example.com`; this transactional command is idempotent and has no public HTTP endpoint.
