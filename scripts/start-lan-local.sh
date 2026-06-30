#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
fi

if [ -f .env.flounder-openai ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.flounder-openai
  set +a
fi

: "${FLOUNDER_UI_TOKEN:?FLOUNDER_UI_TOKEN is required}"
: "${FLOUNDER_PROXY_PASS:?FLOUNDER_PROXY_PASS is required}"

FLOUNDER_PROXY_USER="${FLOUNDER_PROXY_USER:-flounder}"
FLOUNDER_UI_HOST="${FLOUNDER_UI_HOST:-0.0.0.0}"
FLOUNDER_UI_PORT="${FLOUNDER_UI_PORT:-4500}"
FLOUNDER_LAN_PROXY_HOST="${FLOUNDER_LAN_PROXY_HOST:-0.0.0.0}"
FLOUNDER_LAN_PROXY_PORT="${FLOUNDER_LAN_PROXY_PORT:-4501}"
FLOUNDER_OUT="${FLOUNDER_OUT:-./.flounder/out}"
FLOUNDER_WORKSPACE="${FLOUNDER_WORKSPACE:-./.flounder/workspace}"
FLOUNDER_OPENAI_COMPAT_API_KEY="${FLOUNDER_OPENAI_COMPAT_API_KEY:-${PIMM_API_KEY:-}}"
FLOUNDER_OPENAI_COMPAT_BASE_URL="${FLOUNDER_OPENAI_COMPAT_BASE_URL:-http://100.103.213.81:8317/v1}"
FLOUNDER_OPENAI_COMPAT_MODEL="${FLOUNDER_OPENAI_COMPAT_MODEL:-deepseek-v4-pro}"

export FLOUNDER_OPENAI_COMPAT_API_KEY
export FLOUNDER_OPENAI_COMPAT_BASE_URL
export FLOUNDER_OPENAI_COMPAT_MODEL

node dist/cli.js ui \
  --host "$FLOUNDER_UI_HOST" \
  --port "$FLOUNDER_UI_PORT" \
  --out "$FLOUNDER_OUT" \
  --workspace "$FLOUNDER_WORKSPACE" &
ui_pid=$!

cleanup() {
  kill "$ui_pid" "$proxy_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

FLOUNDER_TARGET_HOST=127.0.0.1 \
FLOUNDER_TARGET_PORT="$FLOUNDER_UI_PORT" \
FLOUNDER_PROXY_USER="$FLOUNDER_PROXY_USER" \
FLOUNDER_PROXY_PASS="$FLOUNDER_PROXY_PASS" \
node local-lan-proxy.mjs &
proxy_pid=$!

wait -n "$ui_pid" "$proxy_pid"
