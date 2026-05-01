# SMART Health Card sample fixtures

End-to-end test data for the wallet's `application/smart-health-card`
artifact branch. Every sample here is a real, signed JWS produced by a
known issuer; signatures are independently re-verified against the
published JWKS by `verify.ts`.

## Status

| Samples | Issuers | Verified |
|---------|---------|----------|
| 4       | 1       | 4 / 4    |

The single issuer is the **synthetic** `https://spec.smarthealth.cards/examples/issuer`
key set published by the SMART Health Cards specification site. All four
samples are HL7-curated synthetic vectors (no real patient data, no real
provider data — see the FHIR Bundles for "John B. Anyperson" and "Johnny
Revoked").

## Layout

```
fixtures/sample-shc/
├── README.md          <- this file
├── manifest.json      <- machine-readable index, written by verify.ts
├── verify.ts          <- bun script that re-verifies every sample
├── issuers/
│   └── spec-smarthealth-cards-issuer/
│       ├── jwks.json  <- as published at /.well-known/jwks.json
│       ├── url.txt    <- the iss claim that maps to this issuer
│       └── source.txt <- where the JWKS was fetched from + key notes
└── samples/
    └── spec-example-{00..03}/
        ├── credential.jws        <- raw single-line JWS (deflate payload)
        ├── credential.json       <- {"verifiableCredential":[...]} wrapper
        ├── decoded-payload.json  <- inflated + JSON-parsed JWS payload
        ├── notes.md              <- what this card asserts and why we want it
        └── source.txt            <- fetch URL + date
```

## What each sample exercises

| Slug              | Content type                                | kid prefix       | Why                                        |
|-------------------|---------------------------------------------|------------------|--------------------------------------------|
| spec-example-00   | COVID-19 immunization, 3 doses              | `3Kfdg-…`        | Plain happy-path, no `x5c`                 |
| spec-example-01   | COVID-19 immunization, 3 doses              | `EBKOr…`         | Signed with the JWKS entry that has `x5c` |
| spec-example-02   | Diagnostic report + ~50 lab observations    | `3Kfdg-…`        | Non-vaccination payload, ~3 KB JWS         |
| spec-example-03   | COVID-19 immunization, 2 doses              | `3Kfdg-…`        | Card flagged "Revoked" by the spec for CRL exercises |

## Re-running verification

```sh
bun run fixtures/sample-shc/verify.ts
```

Each pass:

1. Reads `samples/<slug>/credential.jws`.
2. Parses the JWS header, locates the JWK matching `kid` in
   `issuers/<slug>/jwks.json` (selected by matching the payload's `iss`
   claim against `issuers/*/url.txt`).
3. Verifies the ES256 signature over `<protected>.<payload>` with WebCrypto.
4. Inflates the payload via raw DEFLATE (Node's `zlib.inflateRawSync`).
5. Confirms the inflated JSON deep-equals the on-disk `decoded-payload.json`.
6. Confirms `vc.credentialSubject.fhirBundle` is a Bundle.
7. Re-writes `manifest.json` with the result.

If anything fails the script exits non-zero.

## Provenance

| Item                  | URL                                                                              | Fetched     |
|-----------------------|----------------------------------------------------------------------------------|-------------|
| Spec issuer JWKS      | https://spec.smarthealth.cards/examples/issuer/.well-known/jwks.json             | 2026-05-01  |
| example-00..03 JWS    | https://spec.smarthealth.cards/examples/example-{00..03}-d-jws.txt               | 2026-05-01  |
| example-00..03 wrapper| https://spec.smarthealth.cards/examples/example-{00..03}-e-file.smart-health-card| 2026-05-01  |
| Expanded payloads     | https://spec.smarthealth.cards/examples/example-{00..03}-b-jws-payload-expanded.json | 2026-05-01 |

License: published under the SMART Health Cards Implementation Guide. The
HL7 Cross-Project Material License covers IG examples; these vectors are
synthetic and intended to be redistributed with implementations.

## Gaps and notes for future work

- **Only one issuer.** We could not find a publicly hosted, signed JWS from
  a *different* synthetic issuer to exercise multi-issuer trust-list logic
  end-to-end. We *did* successfully reach two real public-health JWKS
  endpoints during this collection pass:
    - `https://myvaccinerecord.cdph.ca.gov/creds/.well-known/jwks.json` (CDPH)
    - `https://healthcardcert.lawallet.com/.well-known/jwks.json` (Louisiana)
  but neither of these issuers publishes a sample signed card we can point
  to, and we deliberately do not include any real-person vaccination QR
  data here. If a synthetic test card ever surfaces from a second issuer
  (e.g. a state health department demo), drop it under
  `samples/<new-slug>/` plus an `issuers/<new-slug>/` and rerun
  `verify.ts`.
- **No CRL exercise.** The spec issuer's JWKS includes a `crlVersion: 1`
  on its primary key, but the corresponding `crl/1.json` was not present
  at the time of this fetch (404). When/if the spec restores it, we can
  add a `samples/<slug>/crl-context.md` describing how `spec-example-03`
  ("Johnny Revoked") is meant to be used in revocation testing.
- **No content-type diversity beyond Immunization + DiagnosticReport.**
  spec-example-02 covers labs; we have no published sample for an ID
  card / insurance card. If one appears in a future release of the spec
  examples, prefer it over fabricating synthetic data.
- **Microsoft validator testdata** (`microsoft/health-cards-validation-SDK
  /testdata/`) is intentionally full of malformed cards for negative
  testing; none of those are useful as positive samples and none are
  included here.
