# Raspberry Pi deployment

## Prerequisites

Use a 64-bit Raspberry Pi OS / Debian-family host, Docker Engine with Compose v2, internet access for pulling images, and storage backed up outside the Pi. Verify CPU architecture:

```bash
uname -m
docker version --format '{{.Server.Arch}}'
```

Both commands should report `aarch64`/`arm64`. ORIO images target `linux/arm64`; a 32-bit `armv7l` operating system is not compatible. Install a 64-bit OS instead of attempting emulation.

## Install prebuilt images

1. Copy `compose.prod.yaml` and `.env.example` to a private directory on the Pi.
2. Create `.env`, set a long `POSTGRES_PASSWORD`, matching `DATABASE_URL`, `ORIO_API_IMAGE`, `ORIO_WEB_IMAGE`, and optionally `WEB_PORT`.
3. Pull and start:

```bash
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml ps
```

The GitHub workflow publishes manifest lists for `linux/amd64,linux/arm64` when it runs on an authorized `main` push or version tag. `docker compose up --build -d` remains available only for development-capable hosts; a Pi normally pulls prebuilt images.

## Private access (recommended)

By default the web port binds only to `127.0.0.1`, so it is not reachable from the LAN or public internet. Install and sign in to Tailscale **on the host**, then expose the loopback service through the Tailnet using Tailscale Serve (consult `tailscale serve --help` for your installed version):

```bash
tailscale serve --https=443 http://127.0.0.1:8080
```

Use the resulting HTTPS Tailnet URL from your phone or desktop. HTTPS is required for remote PWA installation and service worker registration.

## Existing reverse proxy alternative

Keep ORIO loopback-only. Point an existing, Internet-facing reverse proxy at `http://127.0.0.1:8080`, terminate valid HTTPS there, and require HTTP Basic Auth (or an equivalent strong access-control layer) for **all** paths, including `/api`. Never commit a plaintext password; generate/store its hash in the proxy’s secret configuration, e.g. `caddy hash-password --plaintext 'choose-a-password'`. Do not disable TLS verification to bypass certificate problems.

## Backup, restore, and updates

Back up before updating:

```bash
docker compose -f compose.prod.yaml exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > orio-$(date +%F).dump
```

To restore, stop the web/API services (leave DB running) and run:

```bash
cat orio-2026-01-01.dump | docker compose -f compose.prod.yaml exec -T db pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

Update with `docker compose -f compose.prod.yaml pull && docker compose -f compose.prod.yaml up -d`. Migrations run before the API. The named volume survives container replacement.

## Troubleshooting

- `migrate` fails: compare the password in `DATABASE_URL` with `POSTGRES_PASSWORD`, then inspect `docker compose logs migrate`.
- Web is unavailable: `docker compose logs web api` and confirm the port is still loopback-only.
- PWA will not install: use the HTTPS Tailscale/proxy URL, not plain remote HTTP.
- Low memory: inspect `docker stats`; limits are conservative starting points, not a Pi model guarantee.
