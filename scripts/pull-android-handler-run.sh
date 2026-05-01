#!/usr/bin/env bash
set -euo pipefail

PKG="${PKG:-org.smarthealthit.checkin.wallet}"
ADB="${ADB:-adb}"
OUT_ROOT="${1:-artifacts/android-handler-runs}"
RUN_ID="${2:-latest}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$OUT_ROOT"
OUT_ROOT="$(cd "$OUT_ROOT" && pwd)"

if [ "$RUN_ID" = "latest" ]; then
  RUN_ID="$(
    "$ADB" shell "run-as $PKG sh -c 'ls -1 files/handler-runs 2>/dev/null | sort | tail -n 1'" |
      tr -d '\r'
  )"
fi

if [ -z "$RUN_ID" ]; then
  echo "No handler run found for $PKG" >&2
  exit 1
fi

echo "Pulling $PKG files/handler-runs/$RUN_ID -> $OUT_ROOT/$RUN_ID" >&2
"$ADB" exec-out run-as "$PKG" tar -C files/handler-runs -cf - "$RUN_ID" |
  tar -x -C "$OUT_ROOT"

RUN_DIR="$OUT_ROOT/$RUN_ID"
ANALYSIS_DIR="$RUN_DIR/analysis"
mkdir -p "$ANALYSIS_DIR"

origin="$(
  bun -e '
    const fs = require("fs");
    const path = process.argv[1];
    try {
      const m = JSON.parse(fs.readFileSync(path, "utf8"));
      process.stdout.write(m.origin || "");
    } catch {}
  ' "$RUN_DIR/metadata.json"
)"

if [ -n "$origin" ]; then
  (cd "$ROOT/rp-web" && bun scripts/inspect-mdoc-request.ts "$RUN_DIR" --origin "$origin" --out "$ANALYSIS_DIR/request")
else
  (cd "$ROOT/rp-web" && bun scripts/inspect-mdoc-request.ts "$RUN_DIR" --out "$ANALYSIS_DIR/request")
fi

if [ -f "$RUN_DIR/wallet-response.digital-credential.json" ]; then
  (cd "$ROOT/rp-web" && bun scripts/inspect-mdoc-response.ts "$RUN_DIR/wallet-response.digital-credential.json" --out "$ANALYSIS_DIR/dcapi-response")
fi

if [ -f "$RUN_DIR/device-response.cbor" ]; then
  (cd "$ROOT/rp-web" && bun scripts/inspect-mdoc-response.ts "$RUN_DIR/device-response.cbor" --out "$ANALYSIS_DIR/device-response")
fi

echo "$RUN_DIR"
