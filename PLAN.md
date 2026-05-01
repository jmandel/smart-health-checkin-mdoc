# Current plan

This project now has a working SMART Health Check-in prototype over direct
`org-iso-mdoc`:

```text
navigator.credentials.get(...)
  digital.requests[0].protocol = "org-iso-mdoc"
  data.deviceRequest           = base64url(CBOR(DeviceRequest))
  data.encryptionInfo          = base64url(CBOR(["dcapi", {...}]))
```

The checked-in implementation carries SMART request JSON in
`ItemsRequest.requestInfo`:

```text
docType:   org.smarthealthit.checkin.1
namespace: org.smarthealthit.checkin
element:   smart_health_checkin_response
requestInfo["org.smarthealthit.checkin.request"]: <SMART request JSON string>
```

The active payload shape is the transport-neutral schema in
`SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`, carried under
`requestInfo["org.smarthealthit.checkin.request"]`, with responses returned in
the same stable `smart_health_checkin_response` mdoc element.

The older `shc1j.<base64url(JSON)>` element-name encoding is archived as a
fallback idea only. It is not the active path.

## What is implemented

| Area | State |
| ---- | ----- |
| RP web verifier | Builds direct `org-iso-mdoc` requests, adds per-`DocRequest.readerAuth` when it knows the page origin, emits debug artifacts, calls `navigator.credentials.get`, opens HPKE responses when it has the per-request recipient private key, and inspects plaintext `DeviceResponse` bytes. |
| Android matcher | Rust WASM matcher self-filters by `"org-iso-mdoc"` and byte-searches decoded `deviceRequest` for `org.smarthealthit.checkin.1`. No CBOR parser is required in WASM. |
| Android wallet handler | Parses Credential Manager requests, obtains the browser origin, decodes `DeviceRequest` / `ItemsRequest` / `EncryptionInfo`, verifies optional detached `DocRequest.readerAuth`, hydrates SMART request items, renders consent, builds SMART responses, writes debug bundles, and returns `DigitalCredential` JSON. |
| mdoc response builder | Builds `IssuerSignedItem`, MSO, `issuerAuth`, `DeviceAuthentication`, `deviceSignature`, plaintext `DeviceResponse`, and direct `dcapi` HPKE wrapper. |
| Fixtures | Synthetic deterministic fixtures plus a real Chrome/Android handler run are checked in under `fixtures/`. |
| Oracles | TypeScript inspection/HPKE-open, Android JVM parser tests, Python pyMDOC-style byte checks, and COSE signature verification are wired. |
| Explainer | `explainer.html` renders the checked-in real request/response fixtures byte-by-byte, including nested CBOR/tag-24 and contained SMART JSON. |

## Current proof points

The real run from `/tmp/shc-handler-runs/run-1777656438734` is promoted to:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
```

Those fixtures prove:

- Chrome/Android delivered a real `org-iso-mdoc` request with
  `requestInfo["org.smarthealthit.checkin.request"]`.
- Android parsed the web origin as `http://127.0.0.1:3010` via Credential
  Manager / browser caller metadata.
- Android generated a real `DigitalCredential` response with
  `data.response = base64url(CBOR(["dcapi", {"enc", "cipherText"}]))`.
- The captured plaintext `DeviceResponse` contains the SMART response under
  `org.smarthealthit.checkin/smart_health_checkin_response`.
- `valueDigest == SHA-256(tag24(IssuerSignedItem))`.
- `issuerAuth` is ES256 COSE_Sign1 and verifies against the included x5chain
  certificate.
- `deviceSignature` is ES256 COSE_Sign1 and verifies against
  `MSO.deviceKeyInfo.deviceKey`.
- `DeviceAuthentication` contains the exact captured `session-transcript.cbor`.
- The checked-in encrypted `dcapi-response.cbor` reopens offline with RP web
  `openWalletResponse()` using the paired, intentionally public test-only HPKE
  recipient JWK fixture.
- The synthetic `ts-smart-checkin-readerauth` request fixture proves the RP can
  emit per-`DocRequest.readerAuth` and Android can verify its detached COSE_Sign1
  signature over `ReaderAuthenticationBytes`.

## Validation commands

Run the focused checks that cover the promoted real fixtures:

```sh
cd wallet-android
./gradlew :app:testDebugUnitTest --tests 'org.smarthealthit.checkin.wallet.RequestFixtureParserTest' --no-daemon

cd ../rp-web
bun test src/protocol/index.test.ts

cd ../fixtures-tool
uv run pytest tests/test_checkin_fixture.py
```

Run the deterministic Android response oracle ladder:

```sh
bash vendor/scripts/validate-android-mdoc-response.sh
```

Optional upstream parity checks:

```sh
RUN_MULTIPAZ_REFERENCE=1 bash vendor/scripts/validate-android-mdoc-response.sh
```

## Remaining work

| Priority | Work | Why it matters |
| -------- | ---- | -------------- |
| High | Migrate RP web and Android wallet from the prototype `{version, items}` payload to `SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`. | This is the greenfield clinical payload contract we want before building more product behavior; no legacy dual parsing is required. |
| High | Decide production trust model for issuer certificates / IACA / VICAL. | Current COSE signatures are structurally valid, but use demo/self-signed issuer material. |
| High | Replace `DemoWalletStore` with a real holder data source and profile-aware matching. | Current data is demo fixture data only. |
| Medium | Harden origin policy and trusted-browser package/signature allowlist. | The wallet should accept arbitrary web origins, but only trusted browser apps should be allowed to assert those origins. |
| Medium | Probe practical `requestInfo` size limits across Chrome, Android Credential Manager, and Safari/WebKit. | Inline questionnaires can make requests large; we need empirical caps. |
| Medium | Run real Safari/WebKit capture and document iOS wallet feasibility. | Mattr's Safari branch was captured via Chromium UA spoofing; Android is proven, iOS is not. |
| Low | Keep OpenID4VP material archived and revisit only if a verifier requires that profile. | The implementation target is direct `org-iso-mdoc`. |

## Current source-of-truth docs

- `CONTEXT.md` - design summary and trust model.
- `SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` - draft active transport-neutral
  clinical request/response payload shape to migrate to from the prototype
  `{version, items}` JSON.
- `PROTOCOL-EXPLAINER.md` - protocol walkthrough.
- `profiles/org-iso-mdoc.md` - exact active profile.
- `fixtures/README.md` and `vendor/FIXTURES.md` - fixture/test matrix.
- `wallet-android/README.md` and `rp-web/README.md` - app-specific usage.

Historical plans, alternate profiles, and older explainers are under
`archive/`.
