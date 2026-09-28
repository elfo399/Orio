# Docker

Copy `.env.example` to `.env`, choose a long random PostgreSQL password, and set the matching `DATABASE_URL`.

```dotenv
POSTGRES_PASSWORD=a-long-random-secret
DATABASE_URL=postgres://orio:a-long-random-secret@db:5432/orio
WEB_PORT=8080
REGISTRATION_MODE=open
COOKIE_SECURE=false
```

For a local source build (both `linux/amd64` and `linux/arm64` are supported):

```bash
docker compose up --build -d
docker compose ps
```

Open `http://127.0.0.1:8080`. PostgreSQL and NestJS have no published ports. `orio-postgres` is a persistent named volume; rebuilding or updating images does not erase it. Do not use `docker compose down -v` unless intentionally removing all data.

There is no separate migration container. The API waits for PostgreSQL, locks migrations, applies them, and seeds species before opening port 3000. Migration failure keeps the API unavailable.

For a public HTTPS deployment set `PUBLIC_ORIGIN=https://orio.example.com`, `COOKIE_SECURE=true`, and `TRUST_PROXY=true`. `compose.prod.yaml` defaults to `REGISTRATION_MODE=invite`; put a long random, server-only code in `INVITE_CODES`. It has no build instructions and expects immutable multi-architecture API and web images.
