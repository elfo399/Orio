# REST API

All endpoints are under `/api`. Apart from health and authentication, every route requires the ORIO HttpOnly session cookie. Caddy serves the web app and API on one origin; browser mutations must present that same origin.

`POST /api/pets` hatches the authenticated account's one mystery egg. The server selects one of `orio`, `rabbit`, `fox`, `bear`, or `chick` with `crypto.randomInt`; repeat or concurrent requests return the already adopted pet rather than selecting another species.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Process and PostgreSQL health |
| `POST` | `/auth/register` | Create an account and session |
| `POST` | `/auth/login` | Start a session; invalid credentials remain generic |
| `POST` | `/auth/logout` | Revoke the current session and clear the cookie |
| `GET` | `/auth/me` | Return the authenticated display name and email |
| `POST` | `/auth/password-reset` | Request a one-time password-reset email; always returns a generic response |
| `POST` | `/auth/password-reset/confirm` | Consume a valid reset token, set the new password, and revoke all sessions |
| `GET` | `/pets/current` | Simulate and return the current user's pet, or `404` before adoption |
| `POST` | `/pets` | Adopt the current user's pet |
| `POST` | `/minigames/sessions` | Start Feed, Play, or Clean and return the server-generated configuration |
| `GET` | `/minigames/sessions/:id` | Read the authenticated owner's session and its status |
| `POST` | `/minigames/sessions/:id/complete` | Verify game interactions, award the result once, and apply the cooldown |
| `POST` | `/minigames/sessions/:id/abandon` | Close an active round without a reward or cooldown |
| `POST` | `/pets/current/actions/sleep` | Start sleeping |
| `POST` | `/pets/current/actions/wake` | Wake up |

Registration accepts `email`, `displayName`, `password`, `confirmPassword`, and optionally `inviteCode`. Emails are normalized and passwords require at least 12 characters with uppercase, lowercase, and a number. Set server-side `REGISTRATION_MODE` to `invite`, `open`, or `disabled`; in invite mode, `INVITE_CODES` is never sent to clients.

Password reset uses Resend. Configure `RESEND_API_KEY`, a Resend-verified `RESEND_FROM` value such as `ORIO <no-reply@your-domain>`, and an HTTPS `PUBLIC_ORIGIN`. A request stores only a SHA-256 hash of a random token; each link expires after `PASSWORD_RESET_TTL_MINUTES` (30 by default), is invalidated by a later request, can be used once, and revokes every existing session after success. Reset requests are rate-limited and deliberately return the same success message for known and unknown addresses.

Adoption accepts `{ "name": "Miso" }`. Sleep and wake actions accept `{ "idempotencyKey": "uuid-optional" }`; a retry can replay only a prior action for that same pet. Clients never send user IDs, statistics, or timestamps.

To start a game, send `{ "gameType": "feed" | "play" | "clean" }`. Only one active session is permitted for each pet. Sessions expire, can be abandoned without a cooldown, and can be completed only by their owner. Completion accepts only interaction data: Snack Catch sends capped, chronologically plausible catches; Memory Lights sends attempted sequences which are compared with the server-generated sequence; Bubble Bath sends unique configured zone IDs. The server calculates score, reward, stat clamping, energy cost, cooldown, event record, and idempotent replay in one transaction.

The browser is not a trusted execution environment. These validations reject arbitrary final scores, impossible event rates, invalid zones, expired sessions, and duplicate completion, but they are plausibility controls rather than anti-cheat protection for a competitive game.
