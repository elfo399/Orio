# Jenkins on Raspberry Pi

`Jenkinsfile` is deliberately a small declarative ARM64 deployment pipeline. It has exactly three stages:

1. **Scarica main** — clean checkout of `elfo399/Orio` branch `main`.
2. **Compila** — builds the local `api` and `web` Docker images.
3. **Aggiorna ORIO** — starts or replaces the local Compose stack, including migrations, and shows its status.

It intentionally has no test, registry, cleanup, or Declarative Post Actions stages.

## One-time host setup

Use 64-bit Raspberry Pi OS (`uname -m` must show `aarch64`), Docker Engine + Compose v2, and a Jenkins agent whose operating-system user can invoke Docker. If Jenkins itself runs in a container, prefer an SSH agent on the Raspberry Pi host instead of mounting `/var/run/docker.sock` into the controller. The host needs Java 21 for current Jenkins remoting.

Confirm Docker availability from the Jenkins agent:

```bash
docker version
docker compose version
```

Create a Pipeline job pointed at this repository, set its agent label to `raspberry-pi && docker`, and use the `main` branch.

## Jenkins credentials

Create this credential before the first build:

| ID | Type | Use |
| --- | --- | --- |
| `orio-postgres-password` | Secret text | Persistent ORIO database password. Use a URL-safe random value made only of letters, digits, `_`, and `-`. |

On the first build the pipeline creates `/home/elfo/services/orio/.env` with mode `0600`; later deployments retain that password and the `orio-postgres` volume.

## Pipeline behaviour

The stack listens on `127.0.0.1:18080`, avoiding Jenkins on port 8080. Configure the reverse proxy separately if ORIO must be publicly available.
