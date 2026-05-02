#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${1:-"$ROOT/_site"}"

rm -rf "$SITE_DIR" "$ROOT/rp-web/dist"
mkdir -p "$SITE_DIR/verifier"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT/.env"
  set +a
fi
if [[ -n "${INSTANT_DB_PUBLIC_ID:-}" && -z "${BUN_PUBLIC_INSTANT_APP_ID:-}" ]]; then
  export BUN_PUBLIC_INSTANT_APP_ID="$INSTANT_DB_PUBLIC_ID"
fi

(cd "$ROOT/rp-web" && bun run build)

for page in \
  index.html \
  smart-model-explainer.html \
  kiosk-flow-explainer.html \
  wire-protocol-explainer.html \
  explainer.html \
  kiosk.html \
  wire-protocol.html
do
  cp "$ROOT/site/$page" "$SITE_DIR/$page"
done
cp "$ROOT/docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md" "$SITE_DIR/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md"
bun "$ROOT/scripts/generate-llms-txt.mjs" "$SITE_DIR/llms.txt"
cp -R "$ROOT/fixtures" "$SITE_DIR/fixtures"
cp -R "$ROOT/rp-web/dist/." "$SITE_DIR/verifier/"
touch "$SITE_DIR/.nojekyll"

find "$SITE_DIR" -type f -name ".DS_Store" -delete

echo "Built GitHub Pages site at $SITE_DIR"
