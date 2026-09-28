# Raspberry Pi deployment

Use a 64-bit Raspberry Pi OS / Debian-family host with Docker Engine and Compose v2. Both `uname -m` and `docker version --format '{{.Server.Arch}}'` should report `aarch64`/`arm64`.

## Install prebuilt images

1. Copy `compose.prod.yaml` and `.env.example` to a private directory.
2. Create `.env` with a long `POSTGRES_PASSWORD`, matching `DATABASE_URL`, `ORIO_API_IMAGE`, `ORIO_WEB_IMAGE`, and optionally `WEB_PORT`.
3. Use invite registration in production: set `REGISTRATION_MODE=invite` and a long random `INVITE_CODES` value that remains only in `.env`.
4. When public HTTPS is used, set `PUBLIC_ORIGIN=https://your-orio-host`, `COOKIE_SECURE=true`, and `TRUST_PROXY=true`.

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml ps
```

The API performs migration and idempotent seeding before serving. The named volume survives containers being replaced.

The Jenkins deployment also applies `compose.proxy.yaml`, joining only the Caddy `web` service to Nginx Proxy Manager's external `proxy-net`. Configure the proxy host to forward to `orio-web:80`; do not expose the API or PostgreSQL.

## Private access and backup

By default, ORIO binds only to host loopback. Use Tailscale Serve or an existing HTTPS reverse proxy that points to the loopback port. Preserve HTTPS so secure session cookies work.

Back up before updates:

```bash
docker compose -f compose.prod.yaml exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > orio-$(date +%F).dump
```

If the API never becomes healthy, compare the password in `DATABASE_URL` with `POSTGRES_PASSWORD`, then inspect `docker compose logs api`; there is no separate `migrate` service.
