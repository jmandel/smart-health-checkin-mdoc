# Vendor references

This directory records pinned upstream projects used as references for the
SMART Health Check-in direct `org-iso-mdoc` implementation. The upstream source
trees are fetched into `vendor/_src/`, which is intentionally ignored by git.

## Quick start

```sh
# Fetch pinned upstream references into vendor/_src/
bash vendor/scripts/fetch.sh

# Regenerate local pyMDOC-CBOR grounding fixtures and run local fixture tests
bash vendor/scripts/regenerate-local-fixtures.sh

# Run relevant upstream reference tests after fetching sources
bash vendor/scripts/run-reference-checks.sh multipaz
bash vendor/scripts/run-reference-checks.sh pymdoc-cbor
bash vendor/scripts/run-reference-checks.sh auth0-mdl
```

## Files

| File | Purpose |
| ---- | ------- |
| `sources.lock.json` | Exact upstream URLs, commits, licenses, and roles. |
| `INDEX.md` | Where to look in each upstream for the behavior we need to mirror. |
| `FIXTURES.md` | Fixture and test-vector generation/check matrix. |
| `scripts/fetch.sh` | Clones or updates pinned upstreams into ignored `vendor/_src/`. |
| `scripts/regenerate-local-fixtures.sh` | Regenerates project-owned fixtures with existing local tools. |
| `scripts/run-reference-checks.sh` | Runs targeted upstream reference checks when source trees are fetched. |

## Reference strategy

Use **Multipaz** as the primary implementation reference for Android/Kotlin
direct `org-iso-mdoc`: request decoding, direct `dcapi` SessionTranscript,
DeviceResponse generation, HPKE seal, and `["dcapi", {enc, cipherText}]`
wrapping.

Use **pyMDOC-CBOR** and the existing `fixtures/responses/pymdoc-minimal`
fixture as an independent byte-level oracle for the issuer-signed layer:
`IssuerSignedItem`, exact `valueDigests` input bytes, MSO payload, and
`issuerAuth`.

Use the local RP TypeScript tests as the final interop oracle: Android-built
responses should HPKE-open through `openWalletResponse()` and inspect through
`inspectDeviceResponseBytes()`.
