# Docker

Copy `.env.example` to `.env`, choose a long random `POSTGRES_PASSWORD`, and set `DATABASE_URL` with the exact same encoded password:

```dotenv
POSTGRES_PASSWORD=a-long-random-secret
DATABASE_URL=postgres://orio:a-long-random-secret@db:5432/orio
WEB_PORT=8080
```

For a local source build (both `linux/amd64` and `linux/arm64` are supported by the base images):

```bash
docker compose up --build -d
docker compose ps
docker compose exec api node -e "fetch('http://localhost:3000/api/health').then(r=>r.json()).then(console.log)"
```

Open `http://127.0.0.1:8080` on the host. PostgreSQL and NestJS deliberately have no published ports. `orio-postgres` is a named persistent volume: rebuilding or updating images does not erase it. Do not use `docker compose down -v` unless you intentionally want to destroy the save.

The API image is multi-stage, runs as a non-root user, and copies only compiled code, migrations, and production dependencies. The web image contains Caddy and static Angular assets only. `migrate` applies Drizzle migrations and idempotently seeds the species before the API starts.

Run the smoke test after the stack is healthy:

```bash
ORIO_BASE_URL=http://127.0.0.1:8080 pnpm docker:smoke
```

`compose.prod.yaml` contains no build instructions. Set `ORIO_API_IMAGE` and `ORIO_WEB_IMAGE` to immutable multi-arch GHCR tags, then run `docker compose -f compose.prod.yaml up -d`.

## Verification note

The local acceptance run in this repository uses `linux/amd64`. The Dockerfile bases (`node:22-bookworm-slim`, `caddy:2.10-alpine`, and `postgres:17-alpine`) publish ARM64 variants, and CI is configured to build both `linux/amd64` and `linux/arm64`; an actual ARM64 container run was not performed on this workstation.
