# fixtures-tool

Developer-only Python sidecar for grounding response-side mdoc fixtures against
IdentityPython's `pyMDOC-CBOR`.

This tool does not run in the RP web app or Android wallet. It generates and
parses fixture bytes that the TypeScript and Kotlin implementations can test
against.

## Commands

```sh
uv run pytest

uv run python bin/issue-checkin.py \
  --out ../fixtures/responses/pymdoc-minimal \
  --force

uv run python bin/parse-checkin.py \
  ../fixtures/responses/pymdoc-minimal/document.cbor
```

## Scope

Covers:

- mdoc document shape for `org.smarthealthit.checkin`
- `IssuerSignedItem` tag-24 wrapping
- MSO `valueDigests` input bytes
- `issuerAuth` payload extraction

Does not cover:

- `DeviceRequest`
- Annex C `SessionTranscript`
- HPKE
- DeviceAuth
- Chrome's Digital Credentials API envelope

`document.cbor` can contain nondeterministic signature bytes. Use
`expected-walk.json` and the intermediate artifacts for stable semantic checks.
