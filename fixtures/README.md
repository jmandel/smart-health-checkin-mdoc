# Fixtures

Checked-in fixtures and normalized captures live here.

Rules:

- Do not promote captures containing PHI.
- Every binary CBOR artifact should have a `.hex` or `.diag` sibling.
- Every fixture directory should have a `manifest.json` or `metadata.json`.
- Test private keys may be checked in only when they are intentionally public,
  one-run fixture material, explicitly marked in metadata, and unlock no PHI.
- Generated debug summaries should be stable JSON so they can become unit-test
  inputs.

Current fixture roots:

- `dcapi-requests/` - DeviceRequest and ItemsRequest fixtures.
- `responses/` - DeviceResponse or response-side mdoc fixtures.
- `transcripts/` - SessionTranscript byte fixtures.
- `captures/` - normalized browser/Android capture bundles.

Notable checked-in fixtures:

- `dcapi-requests/real-chrome-android-smart-checkin/` - real Chrome/Android
    Credential Manager SMART Health Check-in request from a local handler run, with
    decoded `DeviceRequest`, `ItemsRequest`, `EncryptionInfo`, and
    `SessionTranscript` sidecars. Includes an intentionally public test-only RP
    HPKE private JWK for reopening the matching encrypted response fixture.
- `dcapi-requests/ts-smart-checkin-readerauth/` - synthetic SMART request with
   per-`DocRequest.readerAuth`, the exact tag-24 `ItemsRequest`,
   `SessionTranscript`, detached readerAuth COSE_Sign1, and test-only reader
   certificate artifacts. Android parses this fixture and verifies the detached
   signature.
- `responses/real-chrome-android-smart-checkin/` - matching real Android wallet
    response debug artifacts, including the encrypted `dcapi` wrapper, plaintext
    `DeviceResponse`, issuer/device COSE artifacts, Python byte-check output, and
   saved RP-web HPKE-open inspection.
