# matcher-c

Diagnostic always-yes matcher in C, sister to the Rust always-yes matcher at
[`../../wallet-android/app/matcher/src/bin/yes.rs`](../../wallet-android/app/matcher/src/bin/yes.rs).

The single source file `c_yes_matcher.c` always emits one
`AddStringIdEntry` call titled `"SMART Health Check-in (c-diag)"`, with
no inspection of the request. Use it to localize "Your info wasn't found"
failures by A/B-ing against the Rust matcher.

## Provenance

`credentialmanager.h` is copied verbatim from upstream
`digitalcredentialsdev/CMWallet/matcher/credentialmanager.h` (HEAD as of
April 2026). It carries the canonical `credman` / `credman_v2`–`v6` import
ABI declarations.

The build invocation mirrors the upstream pattern (also documented in
`../../docs/research/03-matcher-wasm-abi.md`): wasi-sdk's clang, `--target=wasm32-wasi`
for the libc headers, `-nostdlib` to avoid pulling wasi crt + libc, and
`--allow-undefined` so the host imports resolve at instantiation time.

## Build

Requires WASI SDK at `/opt/wasi-sdk` (override with `WASI_SDK_PATH=...`).
Get it from <https://github.com/WebAssembly/wasi-sdk/releases>.

```sh
bash build.sh
# wrote c_yes.wasm (506 B)
```

Result: tiny 506-byte module that imports exactly one host function and
exports both `main` and `_start` (Credential Manager invokes one or the
other across versions).

## A/B test

```sh
# 1. Stage the C matcher
cp tools/matcher-c/c_yes.wasm wallet-android/app/src/main/assets/matcher.wasm

# 2. Reinstall, suppressing Gradle's automatic Rust matcher rebuild
./gradlew :app:installDebug -Pskip-matcher

# 3. In the app: tap Re-register.
# 4. Trigger a verifier request.
```

Outcomes:

- **C entry appears**: WASM sandbox is healthy and the host is calling our
  matcher. If the Rust always-yes matcher (`yes.wasm`) **also** works, the
  bug is in `wallet-android/app/matcher/src/lib.rs::request_is_eligible` — eligibility logic
  is too strict for the actual request shape. Capture request bytes from
  the wallet's debug bundle and tighten the loop.
- **C entry appears, Rust always-yes does not**: Rust toolchain or
  build-std / panic-immediate-abort interaction is tripping the host
  sandbox. Compare the two `.wasm` modules with `wasm2wat` and look for
  imports we declare but the host doesn't provide.
- **Neither C nor Rust always-yes appears**: registration didn't activate,
  the verifier isn't sending `org-iso-mdoc`, or the host doesn't load the
  WASM. Verify the home-screen "Registered" status and check the verifier's
  actual `protocol`.

## What's not in here

No icons, no JSON parsing, no base64, no allocator. The upstream CMWallet
matcher pulls in cJSON, base64.c, dcql.c, and a 56 KB icon header — those
are useful for the production matcher but pure noise for an always-yes
diagnostic.
