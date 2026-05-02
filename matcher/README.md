# matcher

Self-contained Rust WASM matcher for the SMART Health Check-in wallet.

The Credential Manager runs this in its sandbox to decide whether to surface
our wallet entry for a given Digital Credentials API request. The eligibility
rule is documented in
[`../docs/profiles/org-iso-mdoc.md`](../docs/profiles/org-iso-mdoc.md) §"Matcher
contract":

1. The outer Credential Manager request bytes must contain the literal
   substring `"org-iso-mdoc"`. The matcher is the **only** protocol filter
   on this path: see "Why the matcher must self-filter" below.
2. The base64url-decoded `data.deviceRequest` bytes must contain the literal
   UTF-8 of our doctype `org.smarthealthit.checkin.1`. CBOR text strings are
   stored verbatim, so a substring search is sufficient — **no CBOR parser
   needed**.

If both hold, emit one `AddStringIdEntry`. Title / subtitle / id are read
from the registered credentials blob, with compiled-in fallbacks.

## Why the matcher must self-filter

Earlier drafts of these notes claimed the host pre-filters matchers by the
protocol declared at registration — that's wrong. The current AndroidX
`registry-provider` path forwards an empty `protocolTypes` list to the GMS
bridge:

- `RegisterCredentialsRequest(type, id, credentials, matcher)` — the
  second arg's kdoc says it's "the unique id that identifies this
  registry, such that it won't be overwritten by other different
  registries of the same `type`." Not a protocol filter.
- `RegistryManagerProviderPlayServicesImpl.kt` (registry-provider-play-services)
  builds the GMS `RegistrationRequest` with `protocolTypes = emptyList()`.
- The typed `OpenId4VpRegistry` subclass also exposes no `protocolTypes`
  parameter; it just forwards `(id, credentials, defaultMatcher,
  intentAction)` to the parent.

Therefore Credential Manager invokes **every registered DC matcher for
every `navigator.credentials.get({digital:…})` request** of the matching
`type`. Each matcher receives the full outer request JSON (including any
other-protocol entries the page asked for) and is responsible for deciding
whether anything in there is its problem.

CMWallet's matcher binaries (`matcher/openid4vp1_0.c`, `matcher/openid4vp.c`,
`matcher/pnv/openid4vp1_0.c`) all do `strcmp(protocol, "openid4vp-v1-…") == 0`
on each `requests[i]` entry — empirical confirmation that the matcher is
the line of defence. The registration `id` strings (`"openid4vp"`,
`"openid4vp1.0"`) are just primary keys that let one wallet have multiple
registrations without clobbering each other.

## Stack

Mirrors the upstream `digitalcredentialsdev/CMWallet` `matcher-rs` (April 2026
HEAD):

- Rust **edition 2024**.
- Target **`wasm32-unknown-unknown`** (NOT `wasm32-wasi`). Manual `_start`
  export.
- `nanoserde 0.1` is on the dep list for future structured parsing — the
  current matcher does not use it; the byte-search approach has zero
  parsing cost.
- `log 0.4`, gated off by default (`static_log_off` feature). Flip with
  `--features logging` for native debug runs.
- Build: `cargo +nightly -Z panic-immediate-abort -Z build-std`, post-process
  with `wasm-opt -Oz`.

## Layout

```
matcher/
  Cargo.toml
  build.sh                # the canonical build command
  src/
    lib.rs                # re-exports
    bindings.rs           # raw `credman` FFI
    credman.rs            # CredmanApi trait + host-backed impl (testable seam)
    matcher.rs            # eligibility logic + entry emission
    logger.rs
    bin/
      checkin.rs          # WASM entry point — `_start` calls `matcher::run`
      cli.rs              # native fixture-driven harness (--features cli)
  tests/
    integration.rs
  fixtures/
    smart-checkin-request.json     # synthetic; matcher MUST match
    mattr-safari-mdl-request.json  # captured Safari mDL; matcher MUST NOT match
    credentials-blob.json          # what we register with RegistryManager
```

## Build

```sh
# Prereq: rustup toolchain install nightly + rust-src component
rustup component add rust-src --toolchain nightly
rustup target add wasm32-unknown-unknown --toolchain nightly

# (optional) wasm-opt for the size-shrinking post-pass
sudo apt install binaryen   # or: brew install binaryen

./build.sh
# → target/wasm32-unknown-unknown/release/checkin.wasm
```

The Gradle build in `wallet-android/app/build.gradle` invokes `build.sh` and
copies the output into `wallet-android/app/src/main/assets/matcher.wasm`,
replacing the placeholder shipped in earlier stages.

## Test

```sh
# Native unit + integration tests (run on the host, no WASM toolchain needed)
cargo test

# Fixture-driven CLI harness — same matcher logic, native binary
cargo run --features cli --bin checkin-cli -- \
  fixtures/smart-checkin-request.json \
  fixtures/credentials-blob.json
# expected: outcome: Eligible, one entry "checkin-default"

cargo run --features cli --bin checkin-cli -- \
  fixtures/mattr-safari-mdl-request.json \
  fixtures/credentials-blob.json
# expected: outcome: NotApplicable, zero entries
```

## What's NOT in here (deliberately)

- No real CBOR parser — substring search on the doctype is sufficient.
- No clock, no entropy, no filesystem (WASI restrictions; the matcher must
  not pull `getrandom` or anything that uses a default-hashed `HashMap`).
- No FHIR awareness. The matcher decides eligibility only; the handler
  activity does all FHIR profile / Questionnaire interpretation.
- No issuance / OID4VCI / payments paths. The upstream `matcher-rs` ships
  those; we don't need them for SMART Check-in v1.

## ABI reference

We import a strict subset of the canonical `credman` host imports
(see upstream `digitalcredentialsdev/CMWallet/matcher/credentialmanager.h`,
April 2026):

| Function | Purpose |
| --- | --- |
| `GetRequestSize`, `GetRequestBuffer` | Read the outer Credential Manager request JSON. |
| `GetCredentialsSize`, `ReadCredentialsBuffer` | Read the wallet-defined credentials blob registered with `RegistryManager`. |
| `GetCallingAppInfo` | Verifier package + origin (currently unused; reserved for future debug fields). |
| `AddStringIdEntry` | Emit our SMART Check-in entry. |
| `AddFieldForStringIdEntry` | Optional metadata rows (currently unused). |

Newer additions to the host ABI (`credman_v2`–`credman_v6`,
`AddInlineIssuanceEntry`, `AddEntrySet`, etc.) are intentionally not
imported. They expand to credential-set / issuance / payment flows we don't
need today.
