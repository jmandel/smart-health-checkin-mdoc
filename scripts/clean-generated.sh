#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

paths=(
  "$ROOT/_site"
  "$ROOT/rp-web/dist"
  "$ROOT/wallet-android/.gradle"
  "$ROOT/wallet-android/.kotlin"
  "$ROOT/wallet-android/app/build"
  "$ROOT/wallet-android/smart-checkin-core/build"
  "$ROOT/wallet-android/smart-checkin-mdoc/build"
  "$ROOT/wallet-android/smart-checkin-credential-manager/build"
  "$ROOT/wallet-android/smart-checkin-ui-compose/build"
  "$ROOT/wallet-android/app/matcher-rs/target"
  "$ROOT/tools/capture/browser-branching"
  "$ROOT/tools/capture/android-rp-flow"
  "$ROOT/tools/capture/current-handler-run"
  "$ROOT/tools/fixtures-tool/.pytest_cache"
  "$ROOT/tools/matcher-c/c_yes.wasm"
)

for path in "${paths[@]}"; do
  if [[ -e "$path" ]]; then
    rm -rf "$path"
    echo "removed ${path#$ROOT/}"
  fi
done
