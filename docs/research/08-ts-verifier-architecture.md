# Bun/TypeScript verifier architecture

We're building the RP-side verifier from scratch in TypeScript, structurally
mirroring pyMDOC-CBOR but layered on top of mature TS primitives. This doc pins
library choices and sketches the module shape.

## Why not just use an existing TS mdoc library

Surveyed:

| Library | Status | Fits our use case? |
| ------- | ------ | ------------------ |
| `auth0-lab/mdl` (`@auth0/mdl`) | **Deprecated** — migrated to `@owf/mdoc` | n/a |
| `@owf/mdoc` (OpenWallet Foundation) | Active | mDL-shaped public API (`new Document('org.iso.18013.5.1.mDL').addIssuerNameSpace('org.iso.18013.5.1', ...)`); doctype/namespace strings are constructor args, so probably works, but verifier path assumes mDL-style selective disclosure flows |
| `animo/mdoc` | Active | Same shape as @owf, also mDL-flavored |
| `@protokoll/mdoc-client` | Active | Similar; client-tilted |
| `@m-doc/cbor` | Active | Just CBOR; useful as a primitive, not a full mdoc lib |

All of them assume "real mDL with a real issuer cert chain and real selective
disclosure." Our case is degenerate: one element, self-signed issuer, no real
disclosure semantics, custom doctype with one rich opaque payload. Trying to
contort an mDL-shaped library around that is more work than building our own
thin layer.

**Decision: skip the mdoc-specific libraries. Build directly on primitives,
mirroring pyMDOC-CBOR's module layout.**

Rationale: pyMDOC-CBOR is small, generic, and has a clean class structure
(`MdocCborIssuer`/`MdocCbor`, `MsoIssuer`/`MsoVerifier`). It does not assume mDL
content. The pieces it doesn't cover (SessionTranscript, DeviceAuth, HPKE) are
exactly the ones we need to write anyway because they're DC-API-specific.

## pyMDOC-CBOR structure to mirror

```
pymdoccbor/
  mdoc/
    issuer.py     ← MdocCborIssuer    (builds DeviceResponse documents)
    verifier.py   ← MdocCbor          (parses DeviceResponse, walks docs)
  mso/
    issuer.py     ← MsoIssuer         (builds MSO + COSE_Sign1 issuerAuth)
    verifier.py   ← MsoVerifier       (parses + verifies COSE_Sign1)
```

We don't need an Issuer for v1 (the wallet is the issuer; the RP is verifier-
only and request-builder). But we'll write a tiny request-builder module since
pyMDOC-CBOR doesn't cover DeviceRequest construction either.

## Our module layout

```
verifier-bun/
  package.json
  src/
    cbor.ts                ← deterministic encode/decode, tag 24 helpers
    cose.ts                ← COSE_Sign1 verify (delegates to @ldclabs/cose-ts)
    hpke.ts                ← HPKE seal/open helpers (delegates to @hpke/core)
    session-transcript.ts  ← ISO 18013-7 Annex C handover construction
    device-request.ts      ← build DeviceRequest CBOR, including requestInfo
    device-response.ts     ← parse DeviceResponse, walk to IssuerSignedItem
    mso.ts                 ← parse + (optionally) verify MSO digests
    smart-checkin.ts       ← high-level: build request JSON, parse response JSON
  tests/
    golden.test.ts         ← byte-exact fixtures for each layer
    e2e.test.ts            ← round-trip with a fake wallet
  README.md
```

Top-level public API a verifier app calls:

```ts
import { buildRequest, openResponse } from './smart-checkin';

const { dcApiArg, ephemeralPriv, sessionTranscript } = await buildRequest({
  items: [
    { id: 'insurance', profile: 'http://hl7.org/.../C4DIC-Coverage', required: true },
    { id: 'intake',    questionnaire: { resourceType: 'Questionnaire', ... } },
  ],
  origin: window.location.origin,
});

const cred = await navigator.credentials.get({ digital: { requests: [dcApiArg] } });

const result = await openResponse(cred, { ephemeralPriv, sessionTranscript });
// result = { artifacts: [...], answers: { insurance: ['a1'], intake: ['a4'] } }
```

That's the entire surface the RP app code touches. Everything below
`smart-checkin.ts` is internal.

## Library picks

| Concern | Pick | Why |
| ------- | ---- | --- |
| CBOR encode/decode | **`cborg`** | Deterministic encoding mode (RFC 8949 §4.2.1); explicitly designed for content-addressed / signature-friendly CBOR. |
| Tag 24 wrap/unwrap | `cborg` | Built in; just wrap as `new Tagged(24, encoded)`. |
| COSE_Sign1 | **`@ldclabs/cose-ts`** | Full RFC 9052 incl. Sign1; ES256 first-class; covers EC2Key. Active maintenance. |
| HPKE | **`@hpke/core`** + `@hpke/dhkem-p256` | Standard suite (DHKEM-P256, HKDF-SHA256, AES-128-GCM); WebCrypto-backed; works in Bun + browser. |
| Raw EC ops (if needed) | `@noble/curves` | If we end up doing JWK thumbprints, raw P-256 sigs outside COSE, etc. |
| SHA-256 | `crypto.subtle` | Native; no dep. |

**No more libraries unless a specific need shows up.**

## Implementation order

1. **`cbor.ts` + `cose.ts` + `hpke.ts`** — thin wrappers + golden tests against
   pyMDOC-CBOR-generated fixtures. Get the primitives bulletproof.
2. **`session-transcript.ts`** — port the byte layout from
   `google/mdoc-credential` (Kotlin) by reading its source. Golden-file the
   bytes; the wallet uses the same fixtures.
3. **`device-request.ts`** — build the CBOR `DeviceRequest` with our
   `requestInfo.smart_health_checkin` tstr. Confirm shape against a Chrome 141
   capture (see `tools/capture/`).
4. **`device-response.ts`** — parse, walk, extract the lone IssuerSignedItem.
5. **`mso.ts`** — verify COSE_Sign1, recompute digests. Self-signed issuer is
   fine; we just check the cert chain ends at the embedded x5chain leaf.
6. **`smart-checkin.ts`** — wire it all together; expose `buildRequest` /
   `openResponse`.

## What pyMDOC-CBOR does NOT cover for us

From reading the source:

- **DeviceRequest construction** — pyMDOC-CBOR is issuer-side only.
- **SessionTranscript / handover** — not implemented; the `MobileDocument`
  verifier has no DeviceAuth path.
- **HPKE** — not used; pyMDOC-CBOR is an offline / NFC-style tool.

We supply all three from scratch.

## What pyMDOC-CBOR maps to almost line-for-line

- **MSO encoding** (`MsoIssuer.sign`) → our `mso.ts` `buildMso(...)` for tests
  even though the wallet builds MSOs in production, not the RP.
- **MSO verification** (`MsoVerifier`) → our `mso.ts` `verifyMso(...)`.
- **Tag-24 IssuerSignedItem unwrap pattern** — direct port; cborg's `Tagged`
  type is the equivalent of cbor2's `CBORTag`.

## Test strategy

Three pillars; full strategy in
[`09-pymdoc-cbor-grounding-strategy.md`](09-pymdoc-cbor-grounding-strategy.md).

- **Cross-implementation golden files** — pyMDOC-CBOR issues; our TS verifier
  opens. Drives CBOR/MSO/COSE_Sign1 byte-level correctness for the layers it
  covers.
- **DC-API-specific golden files** — DeviceRequest construction,
  SessionTranscript bytes, HPKE seal/open, and the outer `providers[i]`
  envelope. pyMDOC-CBOR doesn't cover these; we build them ourselves with
  real Chrome captures as ground truth.
- **Round-trip tests** — fake-wallet test harness so the verifier can be
  developed without an Android device in the loop.
