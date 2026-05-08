#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SITE_DIR="${1:-"$ROOT/_site"}"

rm -rf "$SITE_DIR" "$ROOT/rp-web/dist" "$ROOT/rp-web/dist-wallet"
mkdir -p "$SITE_DIR/verifier" "$SITE_DIR/wallet"

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
(cd "$ROOT/rp-web" && bun run build:wallet)

for page in \
  index.html \
  smart-model-explainer.html \
  kiosk-flow-explainer.html \
  wire-protocol-explainer.html \
  wire-protocol-inspector.html \
  smart-design.css \
  smart-chrome.js
do
  cp "$ROOT/site/$page" "$SITE_DIR/$page"
done
cp "$ROOT/spec.md" "$SITE_DIR/spec.md"
cp "$ROOT/rp-web/src/sdk-web-wallet/WALLET-INTEGRATION-PROTOCOL.md" "$SITE_DIR/web-wallet-protocol.md"
(cd "$ROOT/rp-web" && bun scripts/render-spec.ts "$ROOT/spec.md" "$SITE_DIR/spec.html")
(cd "$ROOT/rp-web" && bun scripts/render-spec.ts \
  "$ROOT/rp-web/src/sdk-web-wallet/WALLET-INTEGRATION-PROTOCOL.md" \
  "$SITE_DIR/web-wallet-protocol.html" \
  "SMART Health Check-in — Web Wallet Protocol Sketch" \
  "Experimental web-wallet listen/respond contract for producing SMART Health Check-in org-iso-mdoc responses from a web app wallet." \
  "./web-wallet-protocol.md" \
  "Web Wallet Protocol Sketch")
bun "$ROOT/scripts/generate-llms-txt.mjs" "$SITE_DIR/llms.txt"
cp -R "$ROOT/fixtures" "$SITE_DIR/fixtures"
cp -R "$ROOT/rp-web/dist/." "$SITE_DIR/verifier/"
cp -R "$ROOT/rp-web/dist-wallet/." "$SITE_DIR/wallet/"

clean_verifier_alias() {
  local name="$1"
  local source="$SITE_DIR/verifier/$name.html"
  local target_dir="$SITE_DIR/verifier/$name"
  mkdir -p "$target_dir"
  sed -e 's#<head>#<head>\n    <base href="../" />#' "$source" > "$target_dir/index.html"
}

clean_verifier_alias creator
clean_verifier_alias submit
clean_verifier_alias wallet-choice

touch "$SITE_DIR/.nojekyll"

find "$SITE_DIR" -type f -name ".DS_Store" -delete

echo "Built GitHub Pages site at $SITE_DIR"
