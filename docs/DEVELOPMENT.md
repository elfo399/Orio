# Development

## Requirements

- Node.js 22 or newer, Corepack, and pnpm 10
- Docker Desktop or Docker Engine for PostgreSQL and full-stack verification

```bash
corepack enable
pnpm install --frozen-lockfile
copy .env.example .env # use cp on macOS/Linux; set matching password in both URLs
pnpm dev:api
pnpm dev:web
```

The web dev server is normally at `http://localhost:4200`; it proxies only when you configure a local proxy, so use the compose stack for the closest production path.

## Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm db:migrate && pnpm db:seed
pnpm test:integration # requires TEST_DATABASE_URL and migrated PostgreSQL
E2E_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e
ORIO_BASE_URL=http://127.0.0.1:8080 pnpm docker:smoke
```

The PostgreSQL integration suite verifies the transaction/one-adoption race and idempotent replay. It intentionally skips when `TEST_DATABASE_URL` is absent. The E2E test must start with an empty database because it adopts the one available pet.

Nx project metadata is included for graph/caching (`pnpm exec nx graph`, `pnpm exec nx run-many -t build`); project scripts remain intentionally direct and portable.
