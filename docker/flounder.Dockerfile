# syntax=docker/dockerfile:1
#
# Flounder control-plane image (dashboard + REST API + co-located daemon).
# Published to ghcr.io/<owner>/flounder by .github/workflows/docker-publish.yml.
#
# The server is bundled with esbuild into one self-contained ESM file
# (scripts/bundle-server.mjs), so the runtime image runs on Alpine with the
# bundle plus a couple of fs-read resources and NO node_modules.

# ---- builder: install deps, compile TS + UI, bundle to a single file ----
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build && npm run bundle

# ---- runtime: Alpine with the bundle + fs-read resources only ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# git: Prepare clones target repos. docker-cli: sandbox is docker-out-of-docker
# (flounder spawns `docker` against the host daemon — mount /var/run/docker.sock).
# ca-certificates: HTTPS to providers.
RUN apk add --no-cache git docker-cli ca-certificates

# Self-contained server bundle — no node_modules required.
COPY --from=builder /app/dist/server.mjs ./server.mjs
# fs-read runtime resources: UI static files (./public, resolved relative to the
# bundle) and sandbox Dockerfiles (resolved via process.cwd()/docker). configs
# holds optional domain profiles.
COPY --from=builder /app/dist/server/public ./public
COPY --from=builder /app/docker ./docker
COPY --from=builder /app/configs ./configs

EXPOSE 4500

# Control plane + co-located daemon on 0.0.0.0:4500.
#   Operator auth: binding to 0.0.0.0 REQUIRES -e FLOUNDER_UI_TOKEN=<secret>;
#                  clients then send `Authorization: Bearer <secret>`.
#   Persist state:  -v flounder-data:/root/.flounder
#   Sandbox exec:   mount the host docker socket
#                   (-v /var/run/docker.sock:/var/run/docker.sock).
# Example:
#   docker run -d -p 4500:4500 -e FLOUNDER_UI_TOKEN=$(openssl rand -hex 16) \
#     -v flounder-data:/root/.flounder \
#     -v /var/run/docker.sock:/var/run/docker.sock \
#     ghcr.io/lollipopkit/flounder:latest
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4500/api').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "server.mjs"]
CMD ["ui", "--host", "0.0.0.0", "--port", "4500"]
