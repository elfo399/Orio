# syntax=docker/dockerfile:1.7
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS dependencies
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json angular.json tsconfig.base.json tsconfig.server.json drizzle.config.ts tailwind.config.cjs postcss.config.cjs eslint.config.mjs vitest.config.ts vitest.integration.config.ts playwright.config.ts ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
WORKDIR /workspace
COPY apps ./apps
COPY libs ./libs
COPY scripts ./scripts
RUN pnpm build

FROM build AS production-deps
WORKDIR /workspace
RUN pnpm prune --prod

FROM node:22-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system orio && useradd --system --gid orio --no-create-home orio
COPY --from=production-deps --chown=orio:orio /workspace/node_modules ./node_modules
COPY --from=build --chown=orio:orio /workspace/dist/server ./dist/server
COPY --from=build --chown=orio:orio /workspace/libs/database/drizzle ./libs/database/drizzle
USER orio
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=4s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server/apps/api/src/main.js"]

FROM caddy:2.10-alpine AS web
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /workspace/dist/web/browser /srv
EXPOSE 80

FROM mcr.microsoft.com/playwright:v1.63.0-noble AS e2e
WORKDIR /workspace
COPY --from=build /workspace /workspace
CMD ["./node_modules/.bin/playwright", "test"]
