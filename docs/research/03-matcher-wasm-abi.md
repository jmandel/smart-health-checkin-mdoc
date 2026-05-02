# WASM matcher ABI (the `credman` import module)

Authoritative source: `../matcher/credentialmanager.h` in this repo. Google has not
publicly published a formal spec; this header is the de-facto reference.

## Imports (host → matcher)

All under module name `credman`.

| C name | Notes |
| ------ | ----- |
| `void GetRequestSize(uint32_t* out)` | Length of the requestJson UTF-8 bytes. |
| `void GetRequestBuffer(void* dst)` | Copy requestJson bytes into `dst`. |
| `void GetCredentialsSize(uint32_t* out)` | Length of the wallet-defined cred-DB blob. |
| `size_t ReadCredentialsBuffer(void* dst, size_t off, size_t len)` | Stream cred-DB bytes. |
| `void GetCallingAppInfo(CallingAppInfo*)` | `{ char package_name[256]; char origin[512]; }`. Origin set for browser callers. |
| `void AddStringIdEntry(char* cred_id, char* icon, size_t icon_len, char* title, char* subtitle, char* disclaimer, char* warning)` | Surface a tappable entry. **Use this**, not the deprecated `AddEntry`. |
| `void AddFieldForStringIdEntry(char* cred_id, char* field_name, char* field_value)` | Add one row of "this is what would be shared" under a previously-added entry. |
| `void AddPaymentEntry(...)` | Payments-flavor entry; not relevant here. |
| `void AddEntry(...)`, `void AddField(...)` | **Deprecated** (long-long ID variants). |

## Important behaviors / gotchas

- All arguments are pointers into linear memory; the matcher allocates strings and
  hands raw pointers. `clang -nostdlib` builds with a tiny bump allocator suffice.
- The icon buffers are raw bytes (PNG/JPEG); pass `NULL, 0` to skip.
- WASI in this sandbox is **incomplete**: no source of randomness. Anything that
  pulls entropy on init (Rust `HashSet`, `HashMap` with default hasher,
  `getrandom::getrandom`) silently panics → matcher returns no entries with no
  diagnostic. This is the trap from the LinkedIn write-up. **Confirmed mitigation
  in production**: Josh's `shl-wallet/matcher_rs` (mirrored locally at
  `shl-wallet-matcher_rs/`) compiles for `wasm32-wasi` with serde and `BTreeMap` —
  the source still carries the marker comment `// Changed from HashMap to BTreeMap`
  on the line that broke before the fix. Either of:
  - C with `-nostdlib` (CMWallet's path)
  - Rust with `BTreeMap`/`BTreeSet` only, no `getrandom`, no default-hashed stdlib
    types

  works. If you do use `getrandom` for some reason, gate it with
  `getrandom = { features = ["custom"] }` and a deterministic stub.
- The matcher must finish in tens of ms. No long loops over the cred DB.
- The matcher cannot do any I/O beyond the listed imports. No clock, no logging.
  Debug by emitting structured fields via `AddFieldForStringIdEntry`.

## Registration that activates the matcher

Per LinkedIn write-up: the `type` field in `RegistrationRequest` **must** be the
exact string `com.credman.IdentityCredential`. Anything else (e.g. an
app-specific reverse-DNS string) registers without error but never matches.

```kotlin
val req = RegistrationRequest(
    credentials = blobBytes,    // becomes ReadCredentialsBuffer source
    matcher     = wasmBytes,    // your compiled .wasm
    type        = "com.credman.IdentityCredential",
    id          = "smart-health-checkin"
)
IdentityCredentialManager.getClient(context).registerCredentials(req)
```

The `id` is a stable identifier for this registration (used to update or replace
later). `credentials` is wallet-defined — we choose JSON so cJSON in the matcher can
parse it directly.

## Build recipe — C (mirrors CMWallet's `matcher/`)

```sh
clang \
  --target=wasm32 -nostdlib \
  -Wl,--no-entry \
  -Wl,--export=main \                   # entrypoint name; system invokes "main"
  -Wl,--allow-undefined \                # imports resolved at instantiation
  -O2 \
  matcher.c cJSON/cJSON.c base64.c \
  -o matcher.wasm
```

`testharness.c` (desktop) defines stub implementations of the `credman` imports so
the same .c sources can be compiled with system clang and run with golden inputs in
unit tests.

## Build recipe — Rust (mirrors `shl-wallet/matcher_rs`)

```toml
# Cargo.toml
[profile.release]
lto = true
opt-level = 's'
strip = true

[dependencies]
serde      = { version = "1", features = ["derive"] }
serde_json = "1"
once_cell  = "1"
```

```sh
rustup target add wasm32-wasi
cargo build --target wasm32-wasi --release
# output: target/wasm32-wasi/release/matcher.wasm
```

The `extern "C"` block declaring the `credman` imports goes in `main.rs` with
`#[link(wasm_import_module = "credman")]` — see
`shl-wallet-matcher_rs/matcher_rs_src_main.rs` lines 16–73 for the exact signatures
and FFI plumbing (`CString`, raw pointer marshalling for icon bytes, etc.).
