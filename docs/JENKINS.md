# Jenkins on Raspberry Pi

`Jenkinsfile` is a declarative pipeline for a native ARM64 Jenkins agent running on the same Raspberry Pi that can host ORIO. It validates the project, runs isolated PostgreSQL integration and Playwright E2E tests, and can optionally publish and deploy immutable ARM64 images.

## One-time host setup

Use 64-bit Raspberry Pi OS (`uname -m` must show `aarch64`), Docker Engine + Compose v2, and a Jenkins agent whose operating-system user can invoke Docker. If Jenkins itself runs in a container, mount the Docker socket only after understanding that it effectively grants host-level Docker control; limit job configuration permissions accordingly.

The pipeline requires Docker Buildx. Confirm its availability from the Jenkins agent:

```bash
docker version
docker compose version
docker buildx inspect --bootstrap
```

If you retain the default `/opt/orio` deployment directory, create it once and give the Jenkins agent user ownership; do not grant unrestricted `sudo` to the job:

```bash
sudo install -d -o jenkins -g jenkins -m 0750 /opt/orio
```

Create a **Multibranch Pipeline** pointed at this repository and set its agent label to `raspberry-pi && docker`. Deployment is intentionally restricted to the `main` branch. A tag build may publish but never deploy automatically.

## Jenkins credentials

Create these credentials before the first build:

| ID | Type | Use |
| --- | --- | --- |
| `orio-postgres-password` | Secret text | Temporary CI database password. Use a URL-safe random value made only of letters, digits, `_`, and `-`. |
| `orio-registry` | Username with password | OCI/GHCR username and token; required to publish or pull private deployment images. |

The CI stack gets a build-specific Docker volume (`orio-ci-<build>-postgres`) through `compose.ci.yaml`; its teardown removes only that volume. It never uses the production `orio-postgres` save volume.

## Pipeline behaviour

1. Validates ARM64 Docker/Buildx availability.
2. Builds the normal `build` target and runs lint, typecheck, and unit tests.
3. Creates an isolated Compose project; applies migrations and idempotent seed.
4. Runs PostgreSQL integration tests and the Chromium Playwright E2E test on the Compose network.
5. If `PUBLISH_IMAGES=true`, builds and pushes ARM64 `api` and `web` images with an immutable tag.
6. If `DEPLOY=true` on `main`, pulls the chosen images and runs `compose.prod.yaml` locally.

The official Playwright image used by the `e2e` Docker target is pinned to the same Playwright version as the project. Playwright publishes ARM64 Docker support, including Raspberry Pi-compatible Ubuntu ARM64 support. [Playwright Docker documentation](https://playwright.dev/docs/docker) and its [ARM64 release notes](https://playwright.dev/docs/release-notes) provide the upstream details.

## Publishing and deployment

Set `IMAGE_NAMESPACE` to your registry namespace, for example `alfon/orio`. Keep `IMAGE_TAG` empty to use `build-<number>`, or enter an immutable release tag such as `v0.2.0`.

Before using `DEPLOY`, prepare `/opt/orio/.env` yourself from `.env.example`, with the password and database URL matching exactly. Do not put that file, registry tokens, or plaintext passwords in Jenkinsfile or Git. The deployment stage writes only `compose.prod.yaml`, injects `ORIO_API_IMAGE`/`ORIO_WEB_IMAGE` for the selected run, and retains the persistent PostgreSQL volume.

For a safer first deployment, run a `PUBLISH_IMAGES=true` build, inspect its images, then launch a separate `main` build with `DEPLOY=true` and the same image tag.
