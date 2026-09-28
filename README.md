<p align="center"><img src="apps/web/src/assets/orio-icon.svg" width="112" alt="ORIO mascot" /></p>
<h1 align="center">ORIO</h1>
<p align="center"><strong>Your little world, alive.</strong></p>

ORIO is a calm virtual companion for your own server. Every account has a separate pet, authenticated with an Argon2id password and a server-side HttpOnly session. No auth token is stored in the browser.

<p align="center"><a href="docs/DOCKER.md">Run with Docker</a> · <a href="docs/RASPBERRY_PI.md">Raspberry Pi</a> · <a href="docs/API.md">API</a></p>

The Docker configuration supports AMD64 and ARM64, keeps PostgreSQL private behind Caddy, and retains saves in a named volume. Use invite-only registration and HTTPS when exposing ORIO outside your private network.
