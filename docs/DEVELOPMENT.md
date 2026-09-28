# Development

## Requirements

- Node.js 22+, Corepack, and pnpm 10
- Docker Desktop or Docker Engine for PostgreSQL and full-stack runs

```bash
corepack enable
pnpm install --frozen-lockfile
copy .env.example .env # use cp on macOS/Linux
pnpm dev:api
pnpm dev:web
```

The web dev server is normally at `http://localhost:4200`; use Compose for the same-origin production path.

## Commands

```bash
pnpm build
pnpm db:migrate
pnpm db:seed
pnpm admin:claim-pet --email user@example.com
```

`admin:claim-pet` is deliberately server-only. It atomically assigns the first unowned legacy pet to an existing account, or makes no change when that account already owns a pet. Never implement this operation as a public API route.

Nx metadata is included for graph/caching (`pnpm exec nx graph`, `pnpm exec nx run-many -t build`); project scripts remain portable.
