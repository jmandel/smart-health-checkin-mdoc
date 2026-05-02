#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${SITE_DIR:-"$ROOT/_site"}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-${1:-3015}}"

"$ROOT/scripts/build-pages.sh" "$SITE_DIR"

cat <<EOF
Serving the GitHub Pages artifact from: $SITE_DIR

Local URLs:
  http://localhost:$PORT/
  http://localhost:$PORT/smart-model-explainer.html
  http://localhost:$PORT/kiosk-flow-explainer.html
  http://localhost:$PORT/wire-protocol-explainer.html
  http://localhost:$PORT/verifier/
  http://localhost:$PORT/verifier/creator.html
  http://localhost:$PORT/verifier/submit.html
EOF

exec bun "$ROOT/scripts/serve-static.mjs" "$SITE_DIR" "$HOST" "$PORT"
