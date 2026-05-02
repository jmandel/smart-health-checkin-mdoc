# Grounding the TS verifier against pyMDOC-CBOR

How we use IdentityPython's [pyMDOC-CBOR](https://github.com/IdentityPython/pyMDOC-CBOR)
as ground truth without letting its idioms leak into our public API.

## Why bother grounding at all

mdoc has dozens of byte-level subtleties (canonical CBOR ordering, tag-24
wrapping, COSE_Sign1 protected-header bytes, MSO digest input bytes). Public
specs are prose; reference implementations are bytes. Without a second
implementation to diff against, we'd be debugging signature mismatches in M3
with no way to tell whose CBOR is wrong.

pyMDOC-CBOR is a small (~2 KLOC), generic, mDL-agnostic Python library used
across the EUDI/IdentityPython ecosystem. Apache-2.0. It's the cheapest
"second implementation" we can lean on — much cheaper than running another TS
mdoc lib (all of which are mDL-shaped — see research/08).

## What pyMDOC-CBOR gives us — and what it doesn't

### Gives us

- **MSO encoding** — `pymdoccbor.mso.issuer.MsoIssuer` produces canonical CBOR
  with deterministic key ordering. We test our `cborg`-based encoder against
  this byte-for-byte.
- **IssuerSignedItem layout** — including the tag-24 wrap, `digestID` integer
  type, `random` bytes, and the canonical bytes used as input to SHA-256 for
  `valueDigests`. This is where most mdoc verifiers fail; pinning it byte-exact
  against pyMDOC-CBOR removes ambiguity.
- **COSE_Sign1 structure for issuerAuth** — protected header CBOR encoding,
  external_aad treatment, Sig_structure layout. pyMDOC-CBOR delegates to
  `pycose`, which is itself battle-tested.
- **MSO verification path** — `MsoVerifier.verify_signature()` is a clean
  reference for what our verifier must check (cert chain, leaf key extraction,
  payload hash recomputation).
- **Doctype/namespace agnosticism** — pyMDOC-CBOR takes both as arbitrary
  strings, no mDL hardcoding. We can issue `org.smarthealthit.checkin`
  fixtures with one `elementIdentifier == "smart_health_checkin_response"` and
  it Just Works.

### Doesn't give us — we write from scratch

| Layer | Why pyMDOC-CBOR doesn't cover it |
| ----- | -------------------------------- |
| `DeviceRequest` construction | Library is issuer-side; verifier-side parses but doesn't build requests. |
| `SessionTranscript` (any flavor) | No DC-API or 18013-7 Annex C support. |
| `DeviceAuth` (`deviceSignature` / `deviceMac`) | Stubbed; the verifier surface ends at `IssuerSigned`. |
| HPKE seal/open | Out of scope; pyMDOC-CBOR is offline-only. |
| Chrome's outer `providers[i]` envelope shape | Not relevant to a Python lib. |

These four are the DC-API-specific pieces. They're also the ones with the
biggest M3 risk. We supply them, and we test them with our own captures and
golden files — not pyMDOC-CBOR.

## Strategy in three phases

### Phase 1 — Read, don't port

We do **not** transliterate Python to TypeScript. The goal is to understand
the byte-level invariants, not to clone the API.

Required reading, in order:

1. `pymdoccbor/mso/issuer.py::MsoIssuer.sign` — how the MSO is built and how
   `valueDigests` are computed. Note the exact bytes that go into SHA-256.
2. `pymdoccbor/mdoc/issuer.py::MdocCborIssuer.new` — the full Document
   assembly, including which fields are required vs optional, and where tag 24
   appears.
3. `pymdoccbor/mso/verifier.py::MsoVerifier` — the `phdr`/`uhdr` walk for
   x5chain at COSE label 33, and the double-unwrap for the payload (`tag 24
   bstr → MSO map`).
4. `pymdoccbor/mdoc/verifier.py::MdocCbor` — how documents are walked and how
   `IssuerSignedItem` is unwrapped during decoding.

For each file, write a one-page note in `notes/pymdoc-XXX.md`
capturing the byte-level decisions. Those notes become the spec-internal
checklist for our TS implementation.

### Phase 2 — Cross-implementation fixtures

Set up a tiny Python sidecar tool that drives pyMDOC-CBOR with deterministic
inputs:

```text
fixtures-tool/
  pyproject.toml
  bin/
    issue-checkin.py        # builds an mdoc Document for our doctype
    parse-checkin.py        # parses an mdoc Document, prints walk
    canon-encode.py         # encodes an arbitrary CBOR diag → bytes
  fixtures/
    01-empty/
    02-one-fhir-resource/
    03-large-questionnaire-response/
```

Each fixture directory holds:
- `input.json` — the deterministic inputs (private key seed, nonce hex, doc
  contents)
- `document.cbor` — pyMDOC-CBOR's response-side mdoc document bytes
- `document.diag` — CBOR diagnostic notation
- intermediate artifacts such as `issuer-signed-item-tag24.cbor`,
  `value-digest-input.cbor`, `mso-tag24.cbor`, and `mso.cbor`
- `expected-walk.json` — what a verifier should extract

These fixtures live in `fixtures/` (per PLAN's repo shape) and are checked in.

Practical caveat: final `document.cbor` can include nondeterministic ECDSA
signature bytes from pycose/cryptography. Treat final document bytes primarily
as parse fixtures. Use the intermediate unsigned/tagged artifacts for
byte-stable comparisons where possible.

The TS verifier's test suite reads each fixture and asserts:
- `inspectDeviceResponse(bytes).docType === "org.smarthealthit.checkin"`
- The single element value parses back to the JSON in `input.json`
- COSE_Sign1 verification succeeds against the embedded x5chain leaf

Conversely, the TS verifier's **unit tests for our encoder** (we don't have
production encoder, but tests can synthesize one) emit `device-response.cbor`
that `parse-checkin.py` opens cleanly. This is the cross-direction test.

### Phase 3 — Side-by-side diff harness

When a byte mismatch shows up, we need to see *exactly* where the encoders
diverge. A small script:

```text
fixtures-tool/bin/diff-encoders.sh <input.json>
  → runs both:
       python issue-checkin.py < input.json > py.cbor
       bun  ts-encode.ts        < input.json > ts.cbor
  → diffs:
       cbor diag py.cbor > py.diag
       cbor diag ts.cbor > ts.diag
       diff py.diag ts.diag
       and a byte-level diff with offsets
```

Both diag outputs go through the same canonicalizer (`cbor2 -t -d` works) so
formatting differences don't show up as content differences.

This harness is the M3 debugging backbone. When DeviceAuth signatures fail at
the verifier, we run it; it tells us whether the bug is in our CBOR
serialization or somewhere else (handover, signing input).

## Where we deliberately diverge from pyMDOC-CBOR (idiomatic to our case)

These are the places the Python idiom does not fit our use case. We document
each so future-us doesn't second-guess the divergence.

| pyMDOC-CBOR idiom | Our idiom | Why |
| ----------------- | --------- | --- |
| `MsoIssuer(data={ns: {claim: value}})` — per-claim attributes | One element with `elementValue = JSON.stringify(response)` | We don't do real selective disclosure. Treating the response as one opaque payload is simpler and matches our trust model. |
| `disclosure_map` exposed as a verifier output | We don't expose disclosure_map | It would always be a one-key dict; misleading API. |
| `verify(trusted_root_certs=[...], verify_hashes=True)` — two flags, both default to bypass | Our `openResponse()` always recomputes hashes; cert-chain trust is opt-in via a `trustAnchor` param that defaults to "self-signed allowed" with a warning surfaced in the result. | Our trust model is "the wallet is self-attesting on purpose"; we shouldn't pretend cert chains mean something here. But we want to keep the door open for verifiers who plug in real anchors. |
| Issuer + Verifier symmetry (both halves of the lib) | TS verifier-only; the wallet's Kotlin code is the issuer | Wallet is on Android. There's nothing to issue from the RP web app. |
| `MdocCborIssuer.dumps()` returns hex by default | Always `Uint8Array` in TS; hex is a debug helper | Native binary handling in TS, no string-as-bytes confusion. |
| Cert-chain validation walks `attest_public_key` with separate root + DS | We only check leaf-extracted-key matches the COSE_Sign1 signature | We don't care about chain validity for self-signed wallet certs. Make the API explicit: "leaf-only" vs "chain-anchored." |

## Where pyMDOC-CBOR is incomplete or wrong (known caveats)

Surface findings from reading the source:

- DeviceAuth handling is essentially a stub; do not use it as a reference for
  the `DeviceAuthentication` Sig_structure. Use ISO 18013-5 §9.1.3 directly.
- SessionTranscript is not constructed or consumed. Do not look here for
  transcript shape.
- The library does not enforce CBOR canonical encoding rigorously on the
  verifier path — it only asserts canonical encoding on the issuer side. Our
  verifier should still re-encode and compare for `valueDigests`
  recomputation.
- It accepts COSE_Sign1 with x5chain present in either protected or
  unprotected headers. Our wallet writes to unprotected; we'll only test that
  path.

These caveats become test gaps we fill ourselves: explicit DeviceAuth tests,
transcript-byte-layout golden files, canonical-encoding comparisons.

## Practical workflow during implementation

1. **Before writing any TS code for layer L (e.g., MSO encoding):**
   - Read the pyMDOC-CBOR source for L.
   - Write a note in `notes/` capturing the byte-level checklist.
   - Build a deterministic Python fixture for L.

2. **While writing the TS:**
   - Aim to produce bytes equal to the Python fixture for the same input.
   - When they don't match, run `diff-encoders.sh`.
   - Don't move to layer L+1 until the diff is empty.

3. **Once the TS layer matches:**
   - Add the fixture to `fixtures/`.
   - Wire it into `rp-web/test/fixtures.test.ts`.
   - Move on.

4. **When we capture a Chrome 141 DC-API request:**
   - Save the raw bytes under `fixtures/captures/<date>-<label>/`.
   - Add a Python script that parses just the inner ItemsRequest from the
     capture. If pyMDOC-CBOR can parse it, our TS should too.
   - If pyMDOC-CBOR can't parse it (because of the outer DC-API envelope or
     SessionTranscript bytes), write a `*-py-skip.md` note explaining why
     and what we test it against instead.

## Tooling commitment

We add one Python project (`fixtures-tool/`) to the repo, with `uv` /
`pyproject.toml`, locked dependencies, and clean CLI scripts. It's not
shipped to users — only used in dev for fixtures and diffs. Total surface
should stay under ~300 LOC.

The Python tool stays version-locked in CI: any `uv lock` change triggers a
fixture regeneration job, and any fixture-bytes change triggers TS test
re-runs. If pyMDOC-CBOR ships a release that changes byte output, we either
update our golden files (with explanation in commit message) or pin to the
prior version.

## What this strategy is NOT

- It is not "use pyMDOC-CBOR at runtime." We never call into Python from the
  RP web app or from CI's TS test runs (only from the fixture-build job).
- It is not "match pyMDOC-CBOR exactly." We match the bytes pyMDOC-CBOR
  produces *within the layers it covers*, and we deviate explicitly elsewhere.
- It is not "treat pyMDOC-CBOR as spec." When pyMDOC-CBOR and the ISO spec
  disagree (or pyMDOC-CBOR is silent), the spec wins.
