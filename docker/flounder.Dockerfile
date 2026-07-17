# syntax=docker/dockerfile:1
#
# Flounder control-plane image (dashboard + REST API + co-located daemon).
# Published to ghcr.io/<owner>/flounder by .github/workflows/docker-publish.yml.
#
# NOTE: Flounder's runtime dependencies (@earendil-works/pi-ai, pi-coding-agent,
# typebox) live in devDependencies, so the full node_modules built in the
# builder stage is shipped as-is. Do NOT prune with --omit=dev.

# ---- builder: install deps + compile TS/UI ----
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ---- runtime: slim image with build output + full node_modules ----
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# git: Prepare clones target repos. ca-certificates: HTTPS to providers/registries.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prompts ./prompts
COPY --from=builder /app/configs ./configs
COPY --from=builder /app/skills ./skills
COPY --from=builder /app/fixtures ./fixtures
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/docker ./docker

EXPOSE 4500

# Control plane + co-located daemon on 0.0.0.0:4500.
#   Operator auth: binding to 0.0.0.0 REQUIRES -e FLOUNDER_UI_TOKEN=<secret>;
#                  clients then send `Authorization: Bearer <secret>`.
#   Persist state:  -v flounder-data:/root/.flounder
#   Sandbox exec:   mount the host docker socket
#                   (-v /var/run/docker.sock:/var/run/docker.sock), or run with
#                   --sandbox-backend host only in a trusted environment.
# Example:
#   docker run -d -p 4500:4500 -e FLOUNDER_UI_TOKEN=$(openssl rand -hex 16) \
#     -v flounder-data:/root/.flounder ghcr.io/lollipopkit/flounder:latest
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4500/api').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "dist/cli.js"]
CMD ["ui", "--host", "0.0.0.0", "--port", "4500"]
