#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${1:-"$ROOT/_site"}"

rm -rf "$SITE_DIR" "$ROOT/rp-web/dist"
mkdir -p "$SITE_DIR/verifier"

(cd "$ROOT/rp-web" && bun run build)

cp "$ROOT/index.html" "$SITE_DIR/index.html"
cp "$ROOT/explainer.html" "$SITE_DIR/explainer.html"
cp "$ROOT/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md" "$SITE_DIR/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md"
cp -R "$ROOT/fixtures" "$SITE_DIR/fixtures"
cp -R "$ROOT/rp-web/dist/." "$SITE_DIR/verifier/"
touch "$SITE_DIR/.nojekyll"

find "$SITE_DIR" -type f -name ".DS_Store" -delete

echo "Built GitHub Pages site at $SITE_DIR"

