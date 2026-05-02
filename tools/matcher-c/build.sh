#!/usr/bin/env bash
#
# Build the always-yes C matcher.
#
# Mirrors the clang invocation pattern from the upstream
# digitalcredentialsdev/CMWallet matcher (also documented in
# docs/research/03-matcher-wasm-abi.md):
#
#   clang \
#     --target=wasm32 -nostdlib \
#     -Wl,--no-entry \
#     -Wl,--export=main \
#     -Wl,--allow-undefined \
#     -O2 \
#     <sources> -o matcher.wasm
#
# No CMake needed for a single source file. Output:
#
#   tools/matcher-c/c_yes.wasm
#
# Then copy into the wallet's matcher.wasm slot to A/B against the Rust
# matchers:
#
#   cp tools/matcher-c/c_yes.wasm \
#     wallet-android/app/src/main/assets/matcher.wasm
#   ./gradlew :app:installDebug -Pskip-matcher

set -euo pipefail

cd "$(dirname "$0")"

# Use wasi-sdk's clang so we pick up wasi-libc headers (size_t, stdint.h)
# while still producing a freestanding-style wasm module. Override with
# WASI_SDK_PATH=/path/to/wasi-sdk if installed elsewhere.
WASI_SDK_PATH="${WASI_SDK_PATH:-/opt/wasi-sdk}"
CLANG="$WASI_SDK_PATH/bin/clang"
if [ ! -x "$CLANG" ]; then
    echo "wasi-sdk clang not found at $CLANG" >&2
    echo "set WASI_SDK_PATH or install from https://github.com/WebAssembly/wasi-sdk/releases" >&2
    exit 2
fi

OUT=c_yes.wasm

"$CLANG" \
    --target=wasm32-wasi \
    -nostdlib \
    -Wl,--no-entry \
    -Wl,--export=main \
    -Wl,--export=_start \
    -Wl,--allow-undefined \
    -O2 \
    c_yes_matcher.c \
    -o "$OUT"

# Provide a `_start` alias since some Credential Manager versions invoke
# `_start` while others invoke `main`. With `-Wl,--export=main,_start` the
# linker only exports symbols that exist; we add the alias here so both
# names point at the same code.
#
# (Defining `_start` in C would conflict with linker conventions on some
# targets; instead, we patch the produced wasm with a tiny stub if needed.)

if command -v wasm-opt >/dev/null 2>&1; then
    wasm-opt -Oz \
        --strip-debug \
        --enable-bulk-memory \
        --enable-sign-ext \
        --enable-nontrapping-float-to-int \
        "$OUT" -o "$OUT"
fi

SIZE=$(stat -c%s "$OUT")
echo "wrote $OUT ($SIZE B)"
