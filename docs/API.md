# REST API

All endpoints are under `/api`. Apart from health and authentication, every route requires the ORIO HttpOnly session cookie. Caddy serves the web app and API on one origin; browser mutations must present that same origin.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Process and PostgreSQL health |
| `POST` | `/auth/register` | Create an account and session |
| `POST` | `/auth/login` | Start a session; invalid credentials remain generic |
| `POST` | `/auth/logout` | Revoke the current session and clear the cookie |
| `GET` | `/auth/me` | Return the authenticated display name and email |
| `GET` | `/pets/current` | Simulate and return the current user's pet, or `404` before adoption |
| `POST` | `/pets` | Adopt the current user's pet |
| `POST` | `/pets/current/actions/feed` | Feed (+20 satiety, 5 min cooldown) |
| `POST` | `/pets/current/actions/play` | Play (+15 joy, -10 energy, -5 satiety, 5 min cooldown) |
| `POST` | `/pets/current/actions/clean` | Clean (+25 hygiene, 10 min cooldown) |
| `POST` | `/pets/current/actions/sleep` | Start sleeping |
| `POST` | `/pets/current/actions/wake` | Wake up |

Registration accepts `email`, `displayName`, `password`, `confirmPassword`, and optionally `inviteCode`. Emails are normalized and passwords require at least 12 characters with uppercase, lowercase, and a number. Set server-side `REGISTRATION_MODE` to `invite`, `open`, or `disabled`; in invite mode, `INVITE_CODES` is never sent to clients.

Adoption accepts `{ "name": "Miso" }`. Actions accept `{ "idempotencyKey": "uuid-optional" }`; a retry can replay only a prior action for that same pet. Clients never send user IDs, statistics, or timestamps.
