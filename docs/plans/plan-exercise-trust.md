# Plan: exercise every trust slot end-to-end

## Goal

Make our SMART Health Check-in / direct `org-iso-mdoc` flow byte-shaped exactly
like a CA-rooted production deployment, while keeping the policy at every trust
slot pinned to **"accept-any (debug)"**. The wire becomes indistinguishable from
the production wire. Only the policy decides to say "yes" to self-signed certs.

Concretely: every cert, every signature, every key that *would* travel in a
real deployment must travel in our demo too. Each one must be validated against
a policy hook. The default policy is `AcceptAnySelfSigned`, but the hook is
real, audited, and labelled in the UI/debug output.

## Non-goals

- Building a production CA / IACA / VICAL.
- Trust-list distribution, revocation, OCSP.
- Any UX for managing keys beyond "first-run bootstrap, persisted forever".
- Changing the SMART payload shape inside `requestInfo`.

## Trust-slot inventory

Inventory of every place a key/cert/signature *could* live in the wire, and
where we are today vs. where this plan moves us.

| Slot | Direction | What it carries | Today | Target |
| ---- | --------- | --------------- | ----- | ------ |
| `IssuerAuth` (COSE_Sign1) | wallet → verifier | wallet's issuer cert (`x5chain`) + ES256 sig over MSO | Wired (ephemeral key per response) | Wired (stable Android Keystore key, self-signed cert) |
| MSO `deviceKeyInfo.deviceKey` | wallet → verifier | wallet's device public key | Wired (ephemeral) | Wired (stable Android Keystore key) |
| `deviceSignature` (COSE_Sign1) | wallet → verifier | ES256 sig over `DeviceAuthentication` with device key | Wired | Wired (stable device key) |
| `DocRequest.readerAuth` (COSE_Sign1) | verifier → wallet | verifier's reader cert (`x5chain`) + ES256 sig over `ReaderAuthentication` | Wired with ephemeral per-request demo cert | Wired with stable browser-localStorage reader key, self-signed cert |
| HPKE recipient pub (`encryptionInfo`) | verifier → wallet | per-request P-256 pub | Wired (ephemeral) | Wired (still ephemeral — correct) |
| HPKE sender pub (`enc` in response) | wallet → verifier | per-request P-256 pub | Wired (ephemeral) | Wired (still ephemeral — correct) |
| `getOrigin` allowlist | host → wallet | trusted browser package signature | Dynamic-allowlist hack | Same hack, but surfaced as a `Trust.AcceptedByDebugPolicy` outcome |
| Issuer trust list (verifier side) | local | accepted issuer roots | Implicit ("we don't check") | Explicit `Trust.AcceptedByDebugPolicy` w/ subject + reason in UI |
| Reader trust list (wallet side) | local | accepted reader roots | n/a | Explicit `Trust.AcceptedByDebugPolicy` w/ subject + reason in UI |

## Shared design: `Trust` outcome

Both sides get a small sealed type that captures *exactly* what happened at a
trust slot. This is what the UI, logs, and debug artifacts render.

Current implementation status: the readerAuth wire shape, detached COSE
signature, Android parse/verify path, UI label, and debug artifacts are now
wired. The remaining trust-model work is to replace the simple boolean
`ReaderAuthVerification` with this richer `Trust` outcome vocabulary and to make
reader identity stable instead of per-request ephemeral.

```text
sealed Trust {
  NotProvided                                           // slot was absent on the wire
  SignatureBad(reason)                                  // bytes/sig didn't verify at all
  UntrustedSelfSigned(subject)                          // sig OK, leaf == root, no anchor
  ChainBroken(reason)                                   // x5chain present but doesn't chain
  Anchored(subject, root)                               // chains to a configured anchor
  AcceptedByDebugPolicy(subject, reason)                // would have failed, debug said yes
}
```

Each side renders this everywhere a slot is consumed:

- verifier UI on each `DocRequest`/each `Document`,
- wallet consent screen for the incoming reader,
- debug bundles/logs for fixture review.

The verifier's UI must show `Trust` with the same vocabulary the wallet uses, so
a developer reading both sides side-by-side gets symmetric language.

## Stable identities

Trust slots are only useful if the keys persist. Otherwise every run looks
like a brand new self-signed cert with no continuity.

### Wallet

- **Issuer key**: Android Keystore alias `smart-checkin-issuer-v1`, P-256, EC.
  Self-signed X.509 cert generated once, persisted in `SharedPreferences` (or
  a small DB) alongside the alias. CN = `SMART Health Check-in Demo Wallet`.
- **Device key**: Android Keystore alias `smart-checkin-device-v1`, P-256.
  Public key embedded in MSO `deviceKeyInfo` every response.
- Bootstrap: first call into `SmartHealthMdocResponder` lazily creates both,
  then the same material is reused for every subsequent response.

### Verifier (rp-web)

- **Reader key**: P-256 keypair, persisted as JWK in `localStorage`
  (`smart-checkin/reader-key-v1`). Self-signed X.509 cert generated once and
  also persisted. CN = `SMART Health Check-in Demo Verifier`.
- Bootstrap: protocol library exposes `getOrCreateReaderIdentity()`. UI shows
  "your verifier identity: <fingerprint>" and offers a debug "rotate" button.

Both sides surface the cert fingerprint in the UI and the explainer so a reader
can see "this is the same key I saw last time".

Privacy caveat: stable wallet keys create continuity. For this demo that is
useful because it exercises trust state across requests, but production should
decide whether identity is stable per credential, per issuer, per installation,
or per presentation. Do not silently turn this into a global wallet identifier.

## Wire-shape diff

### Today

```text
DeviceRequest = {
  version: "1.0",
  docRequests: [
    DocRequest {
      itemsRequest: tag24(ItemsRequest),
      // no readerAuth
    }
  ]
}
```

### After this plan

```text
DocRequest {
  itemsRequest:  #6.24(bstr .cbor ItemsRequest),
  readerAuth:    COSE_Sign1 {
    protected:   { 1: -7 },                // ES256
    unprotected: { 33: x5chain },          // verifier's self-signed cert chain
    payload:     null,                     // detached payload
    signature:   <ES256 over ReaderAuthenticationBytes>
  }
}

ItemsRequestBytes =
  #6.24(bstr .cbor ItemsRequest)

ReaderAuthenticationBytes =
  #6.24(bstr .cbor [
    "ReaderAuthentication",
    SessionTranscript,
    ItemsRequestBytes
  ])
```

`ReaderAuthentication` mirrors `DeviceAuthentication` (ISO 18013-5 §9.1.4),
but with only three array entries. The COSE_Sign1 payload is detached: the
payload slot is `null`, and the Sig_structure payload is exactly
`ReaderAuthenticationBytes`.

This shape is grounded in the pinned Multipaz source listed in
`vendor/sources.lock.json`:

- `DeviceRequest.kt` verifies `DocRequest.readerAuth` by rebuilding
  `#6.24(["ReaderAuthentication", sessionTranscript, itemsRequestBytes])` and
  passing it as detached data to COSE verification.
- `DeviceRequestGenerator.kt` builds the same bytes and signs with
  `includeMessageInPayload = false`.
- `digitalCredentialsPresentment.kt` computes the direct `dcapi`
  SessionTranscript and calls `deviceRequest.verifyReaderAuthentication(...)`
  before presentment.

Implementation note: our current `SmartMdocCrypto.signCoseSign1(...)` embeds
the payload. `readerAuth` needs a detached COSE helper or an `includePayload`
option, plus matching detached verification.

Defer `readerAuthAll`: Multipaz also supports DeviceRequest version `1.1`
`readerAuthAll` using `"ReaderAuthenticationAll"` over all doc requests. Our
active request is a single-doc `version: "1.0"` request, so per-`DocRequest`
`readerAuth` is the correct first target.

No SMART payload changes. No HPKE changes. No `encryptionInfo` changes.

## Phase rollout

| Phase | Scope | Wire change | Risk |
| ----- | ----- | ----------- | ---- |
| 0 | Plumbing both sides: `Trust` types, policy hooks, `NotProvided` everywhere | None | Low — pure type plumbing |
| 1 | Wallet stable demo identity (Keystore-backed issuer + device keys, after privacy review) | Same schema, stable keys | Medium — changes linkability semantics |
| 2 | Verifier stable identity (localStorage-backed reader key + cert) | None until phase 3 | Low |
| 3 | Reader auth on the wire: rp-web emits `DocRequest.readerAuth`, wallet verifies | New `readerAuth` field appears | Medium — Chromium / matcher behavior with the larger DeviceRequest needs a real-device check |
| 4 | Trust UI on both sides | None | Low |
| 5 | Anchored case (a "self-anchor" debug toggle that makes the same self-signed cert behave as a configured root) | None | Low |
| 6 | Real capture proof: promote a readerAuth-bearing Chrome/Android run and validate the exact bytes | Request includes readerAuth | Medium — depends on real-device transport behavior |

Phase 0–2 are independent of the wire change and can land first. Phase 3 is the
only one with real protocol risk.

## File-by-file changes

### rp-web (verifier)

- `src/protocol/index.ts`
  - Export `Trust` discriminated union.
  - Add `readerAuthPolicy: TrustPolicy<...>` and `issuerTrustPolicy` parameters
    to the existing `buildOrgIsoMdocRequest()` / `openWalletResponse()`.
    Defaults: `acceptAnySelfSigned` for both.
  - Implement `getOrCreateReaderIdentity()` and
    `signReaderAuth(itemsRequestBytes, sessionTranscriptBytes)`.
  - Add detached COSE_Sign1 support: `payload = null`, Sig_structure payload =
    `#6.24(["ReaderAuthentication", sessionTranscript, itemsRequestBytes])`.
  - In `openWalletResponse`, return `Trust` for `issuerAuth` and `deviceSignature`.
- `src/protocol/index.test.ts`
  - Cross-impl fixtures for `readerAuth` round-trip.
  - Negative cases: bad sig, broken chain, missing slot.
- `src/app/Inspector.tsx` (or wherever the response panel lives)
  - Render `Trust` per slot.
- `src/app/RequestPreview.tsx`
  - Show "this request is signed as <reader cn> · <fingerprint>".

### wallet-android

- `SmartMdocCrypto.kt`
  - Add `getOrCreateKeystoreKey(alias)` returning a wrapper exposing sign, pub,
    and a self-signed cert.
  - Add detached COSE helpers for `readerAuth` sign/verify. Keep existing
    embedded-payload signing for `issuerAuth` and `deviceSignature`.
  - Add `verifyReaderAuth(coseSign1, sessionTranscript, itemsRequestTag24, policy)` returning `Trust`.
- `DirectMdocRequest.kt`
  - Parse optional `readerAuth` out of each `DocRequest` (currently only
    `itemsRequest` is parsed). Preserve the exact tag-24 `itemsRequest` bytes
    because those are part of `ReaderAuthenticationBytes`.
  - Add a `VerifiedRequest` field carrying `Trust` for the reader.
- `SmartHealthMdocResponder.kt`
  - Replace ephemeral key generation with the persisted issuer + device keys.
- `HandlerActivity.kt`
  - Surface `Trust` in the consent UI: who is asking, was the request signed,
    debug-policy banner.
- New: `TrustPolicy.kt`
  - Sealed `Trust`, `TrustPolicy` with `AcceptAnySelfSigned` default.
- Tests
  - `RequestFixtureParserTest`: parse the new `readerAuth`-bearing fixture.
  - New `ReaderAuthVerifyTest`: bad-sig and broken-chain cases.

### matcher

- No code change needed — the matcher already substring-checks the SMART
  doctype and doesn't care about `readerAuth`. But:
  - Re-run with a `readerAuth`-bearing fixture and confirm the larger
    `DeviceRequest` still survives the GMS request transport.

### fixtures

- New synthetic fixture `fixtures/dcapi-requests/synthetic-with-readerauth/`.
- New real capture `fixtures/dcapi-requests/real-chrome-android-with-readerauth/`
  once we have a phase-3 device run.

## Persistence flows

```text
First wallet run:
  if (no keystore alias smart-checkin-issuer-v1)
    generate P-256 keypair, build self-signed cert, store cert in prefs

  if (no keystore alias smart-checkin-device-v1)
    generate P-256 keypair, store

  reuse forever after.

First verifier run (browser):
  if (no localStorage smart-checkin/reader-key-v1)
    generate P-256 JWK + self-signed cert PEM, store both

  reuse forever after.

Debug rotate:
  delete keys/certs, re-bootstrap on next request.
```

## Test plan

- `bun test src/protocol/index.test.ts`
  - readerAuth COSE_Sign1 sign+verify round-trip
  - readerAuth payload slot is `null`; detached bytes are exactly
    `#6.24(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes])`
  - bad-sig → `SignatureBad`
  - broken-chain → `ChainBroken`
  - omitted slot → `NotProvided`
  - self-signed → `UntrustedSelfSigned` under default policy → `AcceptedByDebugPolicy` after policy mapping
- `wallet-android` JVM tests
  - parse `DocRequest.readerAuth`
  - `SmartMdocCrypto.verifyReaderAuth` against the cross-impl fixture
  - issuer/device key persistence: same key across two responder invocations
- TS-generated cross-impl fixtures: extend `gen-test-vectors.ts` to emit
  `readerAuth` request and a matching `Trust` outcome, asserted by both sides.
- Real-device pass on a Pixel: confirm `DeviceRequest` with `readerAuth` reaches
  the matcher and the handler.

## Risks / open questions

- **Request size**: `readerAuth` adds a COSE_Sign1, signature, and DER
  certificate chain; assume hundreds of bytes to more than 1 KB, not a tiny
  constant. Combined with a large inline Questionnaire `requestInfo`, do we hit
  any of the Credential Manager / matcher / intent-extra limits flagged in
  `../OPEN-QUESTIONS.md` §4? Probe before phase 3.
- **Browser cert provisioning**: localStorage is per-origin and survives, but
  any "clear site data" wipes the verifier identity. Acceptable for a demo;
  document the rotate-on-clear behavior.
- **AndroidX getOrigin allowlist**: still a separate concern from `readerAuth`.
  The reader cert in `readerAuth` does NOT replace the browser-package
  allowlist — they answer different questions ("who built this request?" vs
  "which Android app handed it to me?"). Make this distinction explicit in the
  trust UI.
- **Anchored case ergonomics**: in phase 5 we want `Trust.Anchored` to fire
  cleanly. Easiest path: a "self-anchor mode" where we add the wallet's own
  self-signed cert to a configured trust list. That makes the ladder
  `AcceptAny → SelfSigned → Anchored` exercisable with one toggle on each side.
- **Cross-impl golden update**: every wire change ripples through
  `gen-test-vectors.ts`. Keep that script the single source of truth so the
  Kotlin tests don't drift.
- **COSE payload mode**: `issuerAuth` and `deviceSignature` currently embed
  their payloads; `readerAuth` must not. Tests should fail if the
  `readerAuth` payload slot is non-null.

## Definition of done

- `DocRequest.readerAuth` is on the wire by default in every rp-web request.
- `readerAuth` uses detached COSE_Sign1 with `payload = null` and signs the
  exact tag-24 `ReaderAuthenticationBytes` shape verified above.
- Wallet logs and surfaces the reader's `Trust` on every consent screen.
- Verifier logs and surfaces issuer + deviceSignature `Trust` on every response.
- A run with `readerAuth` deliberately corrupted shows `Trust.SignatureBad`
  in the wallet UI, and consent is *still allowed* under the debug policy.
- Stable wallet keys produce identical `deviceKey` / issuer cert across two
  consecutive responses, verified by a test.
- Stable verifier key produces identical reader cert across two consecutive
  requests, verified by a test.
