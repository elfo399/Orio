# Architecture

ORIO is a single-player modular monorepo. `apps/web` is the Angular PWA, `apps/api` is the NestJS REST server, and PostgreSQL is the only authoritative state store.

```text
browser (Angular Signals) ── HTTPS /api ──> Caddy ──> NestJS ──> PostgreSQL
        visual interpolation only                 game-engine       persistent single pet
```

## Boundaries

- `libs/game-engine` is pure deterministic TypeScript. It receives both state and `now`; it never calls `Date.now`, accesses HTTP, or knows about Angular/PostgreSQL.
- `libs/contracts` owns Zod request validation and typed API shapes.
- `libs/database` owns Drizzle schema and versioned SQL migrations.
- `libs/shared` contains framework-free presentation helpers.

The API turns database rows into `PetState`, simulates elapsed time, then persists the result inside a PostgreSQL transaction before applying an action. An advisory transaction lock serializes every access to the one shared pet. `pet_events.idempotency_key` returns a prior action response if a retry presents the same UUID.

There is deliberately no identity layer, fake user header, localStorage state, scheduler, or background mutation process. A future multi-user repository can replace the current save-access boundary without changing the engine.
