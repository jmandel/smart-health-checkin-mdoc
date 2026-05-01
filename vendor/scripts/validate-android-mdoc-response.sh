#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/wallet-android"
GENERATED_DIR="$ANDROID_DIR/app/build/generated/mdoc-validation/ts-smart-checkin-basic"
REQUEST_FIXTURE_DIR="$PROJECT_DIR/fixtures/dcapi-requests/ts-smart-checkin-basic"
OUT_DIR="$PROJECT_DIR/fixtures/responses/android-kotlin-generated"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required for RP web validation" >&2
  exit 1
fi

echo "==> Generate request fixtures"
cd "$PROJECT_DIR/rp-web"
bun scripts/generate-dcapi-request-fixtures.ts

echo "==> Generate Android deterministic response fixture"
cd "$ANDROID_DIR"
./gradlew :app:testDebugUnitTest --tests 'org.smarthealthit.checkin.wallet.AndroidMdocValidationFixtureTest' --no-daemon

echo "==> Validate Android response with RP web"
cd "$PROJECT_DIR/rp-web"
bun scripts/validate-android-mdoc-response.ts "$GENERATED_DIR" "$REQUEST_FIXTURE_DIR" --out "$OUT_DIR"

if command -v uv >/dev/null 2>&1; then
  echo "==> Validate Android response issuer-signed bytes with pyMDOC tooling"
  cd "$PROJECT_DIR/fixtures-tool"
  uv run python bin/check-android-response.py "$GENERATED_DIR" \
    --out "$OUT_DIR/pymdoc-byte-check.json"
else
  echo "uv not found; skipped pyMDOC issuer-signed byte checks" >&2
fi

if [[ "${RUN_MULTIPAZ_REFERENCE:-0}" == "1" ]]; then
  echo "==> Run optional Multipaz reference checks"
  bash "$PROJECT_DIR/vendor/scripts/run-reference-checks.sh" multipaz
else
  echo "RUN_MULTIPAZ_REFERENCE=1 not set; skipped optional Multipaz reference checks"
fi
