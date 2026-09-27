# REST API

All endpoints are under `/api`; there is no application authentication in this personal edition. Keep the deployment private as described in [Raspberry Pi](RASPBERRY_PI.md).

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Process and PostgreSQL health |
| `GET` | `/pets/current` | Simulate and return the saved pet, or `404` before adoption |
| `POST` | `/pets` | Adopt the only pet |
| `POST` | `/pets/current/actions/feed` | Feed (+20 satiety, 5 min cooldown) |
| `POST` | `/pets/current/actions/play` | Play (+15 joy, -10 energy, -5 satiety, 5 min cooldown) |
| `POST` | `/pets/current/actions/clean` | Clean (+25 hygiene, 10 min cooldown) |
| `POST` | `/pets/current/actions/sleep` | Start sleeping |
| `POST` | `/pets/current/actions/wake` | Wake up |

Adoption accepts `{ "name": "Miso" }`; names are trimmed, 2–24 characters, and limited to letters, numbers, spaces, apostrophes, and hyphens. An action accepts `{ "idempotencyKey": "uuid-optional" }`. Reuse the same UUID only to safely retry the same request. Requests are Zod-validated; clients cannot submit statistics or timestamps.

Successful pet responses include the full pet state and ISO timestamps keyed by action in `cooldowns`. `409` means a cooldown, sleep restriction, or duplicate adoption prevents a change.
