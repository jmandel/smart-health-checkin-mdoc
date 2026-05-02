#!/usr/bin/env bash
#
# Build the SMART Health Check-in matcher for Android Credential Manager.
#
# Mirrors the upstream digitalcredentialsdev/CMWallet matcher-rs build:
# nightly toolchain + panic-immediate-abort + build-std + wasm-opt -Oz
# post-process for absolute minimum size.
#
# Usage:
#   bash build.sh          # production matcher
#   bash build.sh yes      # diagnostic always-match matcher
#
# Output:
#   target/wasm32-unknown-unknown/release/<matcher-bin>.wasm
#
# Then copied to wallet-android/app/src/main/assets/matcher.wasm by the
# Gradle preBuild task in wallet-android/app/build.gradle.

set -euo pipefail

cd "$(dirname "$0")"

# `bash build.sh`        → builds the production `checkin` matcher.
# `bash build.sh yes`    → builds the diagnostic always-emit `yes` matcher.
BIN="${1:-checkin}"
case "$BIN" in
  checkin|yes) ;;
  *)
    echo "usage: $0 [checkin|yes]" >&2
    exit 2
    ;;
esac

CARGO_PROFILE_RELEASE_PANIC=immediate-abort \
CARGO_PROFILE_RELEASE_OPT_LEVEL="z" \
CARGO_PROFILE_RELEASE_CODEGEN_UNITS=1 \
CARGO_PROFILE_RELEASE_STRIP=true \
CARGO_PROFILE_RELEASE_LTO=true \
cargo +nightly build \
  -Z panic-immediate-abort \
  -Z build-std \
  --target wasm32-unknown-unknown \
  --release \
  --bin "$BIN"

OUT="target/wasm32-unknown-unknown/release/${BIN}.wasm"

if [ ! -f "$OUT" ]; then
  echo "build failed: $OUT not found" >&2
  exit 1
fi

ORIG=$(stat -c%s "$OUT")

if command -v wasm-opt >/dev/null 2>&1; then
  wasm-opt -Oz \
    --strip-debug \
    --enable-bulk-memory \
    --enable-sign-ext \
    --enable-nontrapping-float-to-int \
    "$OUT" -o "$OUT"
  OPT=$(stat -c%s "$OUT")
  echo "${BIN}.wasm: $ORIG B -> $OPT B (after wasm-opt -Oz)"
else
  echo "${BIN}.wasm: $ORIG B (wasm-opt not found; skipping post-process)" >&2
fi

echo "wrote $OUT"
