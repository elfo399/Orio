# Jenkins on Raspberry Pi

`Jenkinsfile` follows the same two stages as Synapse:

1. **Scarica main** checks out `elfo399/Orio` branch `main`.
2. **Compila e aggiorna ORIO** sends the validated commit SHA to the restricted SSH deploy command. It stages the release, builds local images, starts Compose, and checks health. The API performs its own migrations before listening.

The Jenkins controller uses a separate restricted SSH deploy key, so it does not need Docker's socket mounted.

Create these credentials before the first build:

| ID | Type | Use |
| --- | --- | --- |
| `orio-deploy-ssh` | SSH username with private key | Restricted key that can run only ORIO deploy. |
| `orio-deploy-known-hosts` | Secret file | Verified host key for `host.docker.internal`. |

The host deploy script maintains `/home/elfo/services/orio/.env` with mode `0600`. On first update it provisions invite-only registration without printing the generated invite code; retrieve or replace `INVITE_CODES` directly from that protected file. Persistent PostgreSQL data is never removed by the pipeline.
