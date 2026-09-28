# Jenkins on Raspberry Pi

`Jenkinsfile` intentionally follows the same two-stage model as the Synapse pipeline:

1. **Scarica main** — clean checkout of `elfo399/Orio` branch `main`.
2. **Compila e aggiorna ORIO** — sends the validated commit SHA to ORIO's restricted SSH deploy command. That command stages the release, builds local images, runs migrations, starts Compose, and verifies HTTP health.

Like Synapse, it includes only success/failure post messages and never removes persistent volumes.

## One-time host setup

Use 64-bit Raspberry Pi OS (`uname -m` must show `aarch64`) and Docker Engine + Compose v2. As with Synapse, the Jenkins controller invokes a separate SSH deploy key; it does not need the Docker socket mounted.

Confirm Docker availability on the Raspberry Pi host:

```bash
docker version
docker compose version
```

Create a Pipeline job pointed at this repository and use the `main` branch. The job runs on the Jenkins controller and deploys to `host.docker.internal`, exactly like Synapse.

## Jenkins credentials

Create these credentials before the first build:

| ID | Type | Use |
| --- | --- | --- |
| `orio-deploy-ssh` | SSH username with private key | Restricted key that can only run ORIO's deploy command. |
| `orio-deploy-known-hosts` | Secret file | The verified SSH host key for `host.docker.internal`. |

The host deploy script creates `/home/elfo/services/orio/.env` with mode `0600` only on its first run. Later deployments retain that password and the `orio-postgres` volume.

## Pipeline behaviour

The stack listens on `127.0.0.1:18080`, avoiding Jenkins on port 8080. Configure the reverse proxy separately if ORIO must be publicly available.
