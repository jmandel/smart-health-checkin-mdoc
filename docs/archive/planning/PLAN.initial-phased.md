# Phased implementation plan

This plan targets the direct mdoc mapping:

```text
Digital Credentials API
└─ protocol: "org-iso-mdoc"
   ├─ data.deviceRequest  = base64url(cbor(DeviceRequest))
   └─ data.encryptionInfo = base64url(cbor(["dcapi", {...}]))
```

The dynamic SMART request is carried in `ItemsRequest.requestInfo`:

```text
docType:   org.smarthealthit.checkin.1
namespace: org.smarthealthit.checkin
element:   smart_health_checkin_response
requestInfo.smart_health_checkin: <SMART request JSON string>
```

The earlier `shc1j.<base64url(JSON)>` element-name encoding remains documented
as a fallback if a real wallet API hides `requestInfo`, but it is not the active
path.

## Goals

1. Show a real browser request quickly.
2. Keep every byte boundary inspectable and fixture-friendly.
3. Build the Android wallet in small steps: matcher first, handler next,
   response packaging last.
4. Keep Chrome/CDP and Safari/Web Inspector capture as normal development tools.
5. Stay inside the path Safari appears to support, because Android can adapt
   more easily than iOS.

## Stack choices

- **RP web**: Bun + TypeScript + React + Zustand.
- **Protocol TS**: pure functions usable from browser UI, Bun tests, and CDP
  scripts.
- **Android wallet**: Kotlin/Compose.
- **Matcher**: Rust or C WASM using the existing `credman` import ABI.
- **Fixture sidecar**: `fixtures-tool/` with pyMDOC-CBOR for mdoc response
  grounding.

## Constants

```text
protocol:        org-iso-mdoc
docType:         org.smarthealthit.checkin.1
namespace:       org.smarthealthit.checkin
requestInfo key: smart_health_checkin
element:         smart_health_checkin_response
fallback:        shc1j.<base64url(UTF-8 compact SMART request JSON)>
reserved:        shc1d.<base64url(deflate(JSON))>
```

## Shared artifact policy

Every fixture/capture folder should be self-describing:

```text
fixtures/captures/<label>/
  manifest.json
  browser-console.log
  cdp-events.jsonl
  navigator-credentials-get.arg.json
  device-request.cbor
  device-request.cbor.hex
  device-request.diag
  items-request.cbor
  items-request.decoded.json
  encryption-info.cbor
  encryption-info.diag
  verifier-public.jwk.json
  verifier-private.jwk.json          # test fixtures only
  session-transcript.cbor
  session-transcript.diag
  smart-request.json
  request-info.json
  requested-element.txt
  wallet-request-as-seen.json
  wallet-response.digital-credential.json
  dcapi-response.cbor
  dcapi-response.diag
  device-response.cbor
  device-response.diag
  smart-response.json
  verification-report.json
```

Rules:

- No PHI in checked-in fixtures.
- Binary files get `.hex` and/or `.diag` siblings.
- Inspectors regenerate derived files from raw captures.
- Tests load fixtures from disk.

## Core TypeScript APIs

Already started in `rp-web/src/protocol/index.ts`:

```ts
export const SMART_RESPONSE_ELEMENT_ID = "smart_health_checkin_response";
export function encodeDynamicElement(request: SmartCheckinRequest): string;
export function decodeDynamicElement(element: string): SmartCheckinRequest;

export async function buildOrgIsoMdocRequest(
  request: SmartCheckinRequest,
  options?: {
    nonce?: Uint8Array;
    verifierKeyPair?: CryptoKeyPair;
    deviceRequestVersion?: "1.0" | "1.1";
    responseElementIdentifier?: string;
  }
): Promise<OrgIsoMdocRequestBundle>;

export function buildDeviceRequestBytes(...): Uint8Array;
export function buildEncryptionInfoBytes(...): Uint8Array;
export async function buildDcapiSessionTranscript(...): Promise<Uint8Array>;
export function buildDcapiMdocResponse(...): DcapiMdocResponse;
export function inspectDcapiMdocResponse(...): DcapiResponseInspection;
export async function inspectDeviceResponseBytes(...): Promise<DeviceResponseInspection>;
export async function hpkeSealDirectMdoc(...): Promise<HpkeSealResult>;
export async function openWalletResponse(...): Promise<OpenWalletResponseResult>;
export async function inspectOrgIsoMdocNavigatorArgument(...): Promise<OrgIsoMdocInspection>;
export function inspectDeviceRequestBytes(...): DeviceRequestInspection;
export function inspectItemsRequestBytes(...): ItemsRequestInspection;
export function inspectEncryptionInfoBytes(...): EncryptionInfoInspection;
```

Next TS work:

- Add a checked-in HPKE fixture generated from a fixed test key or external
  reference implementation.
- Add UI rendering for `DCAPI_RESPONSE_OPENED` beyond the debug event log.

## Phase 1: RP shows a direct mdoc request

Deliverable: browser page builds and logs the exact
`navigator.credentials.get` argument.

Status: started.

Completed:

- `requestInfo.smart_health_checkin` request carrier.
- Stable `smart_health_checkin_response` requested element.
- Fallback dynamic element encode/decode utilities.
- Direct `DeviceRequest` builder.
- `encryptionInfo` builder.
- direct `dcapi` SessionTranscript vector.
- `data.response` wrapper vector.
- DeviceRequest / ItemsRequest / encryptionInfo inspector.
- `inspect:mdoc` CLI that writes normalized artifact bundles.
- `inspect:response` CLI for direct `dcapi` wrappers and plaintext
  `DeviceResponse` bytes.
- Plaintext `DeviceResponse` inspector with SMART response extraction and MSO
  value digest check.
- Minimal HPKE P-256/HKDF-SHA256/AES-128-GCM seal/open helpers using direct
  `dcapi` SessionTranscript as HPKE `info`.
- RP UI tries to HPKE-open `navigator.credentials.get` results and emits
  `DCAPI_RESPONSE_OPENED`.
- RP UI emits `SMART_REQUEST_INFO`, `DEVICE_REQUEST`, `ENCRYPTION_INFO`, and
  `DCAPI_ARGUMENT`.

Remaining:

- Add UI display for decoded `DeviceRequest` and `requestInfo`.
- Add a browser "copy capture bundle" button that invokes or mirrors the CLI
  artifact layout.

Acceptance:

- CDP captures our generated request.
- `bun test` validates deterministic CBOR vectors.
- Safari-style Mattr capture and our generated request have the same outer
  shape: `protocol: "org-iso-mdoc"`, `data.deviceRequest`,
  `data.encryptionInfo`.

## Phase 2: Capture and inspect public verifier examples

Deliverable: normalized fixtures from Mattr and any other public direct-mdoc
verifiers.

Tasks:

- Promote the useful Mattr browser-branching scratch captures into
  `fixtures/captures/browser-branching/`.
- Add an inspector that decodes:
  - `DeviceRequest`;
  - tag-24 `ItemsRequest`;
  - namespace/element flags;
  - `requestInfo`;
  - `encryptionInfo`;
  - direct `dcapi` SessionTranscript.
- Run `manual-safari-hook.js` in real Safari/Web Inspector and compare with the
  Chromium Safari-UA capture.

Acceptance:

- We can prove which fields are present in real Safari request bytes.
- We know whether `requestInfo` survives in the request bytes.

## Phase 3: Matcher proof of life

Deliverable: standalone matcher tests parse direct `org-iso-mdoc` request JSON
and emit one entry for SMART Check-in.

Matcher logic:

1. Read Credential Manager request JSON.
2. Find `digital.requests[]` or provider request where
   `protocol == "org-iso-mdoc"`.
3. Read `data.deviceRequest`, base64url-decode CBOR.
4. Decode `docRequests[*].itemsRequest` tag 24.
5. Match `docType == "org.smarthealthit.checkin.1"`.
6. Extract SMART request:
   - primary path: `requestInfo.smart_health_checkin`;
   - contingency path only: namespace element starting `shc1j.`.
7. Emit `AddStringIdEntry`.
8. Emit one or more `AddFieldForStringIdEntry` rows for decoded item labels.

Acceptance:

- Matcher emits one entry for our request.
- Matcher emits zero entries for Mattr mDL captures.
- Matcher never needs network, clock, randomness, or filesystem.

## Phase 4: Android handler decodes request

Deliverable: tapping the entry opens a handler activity showing origin and
decoded SMART items.

Tasks:

- Retrieve `ProviderGetCredentialRequest`.
- Persist raw request JSON into an export/debug panel.
- Decode direct `org-iso-mdoc` request.
- Decode `encryptionInfo` and derive SessionTranscript.
- Display:
  - origin/package;
  - docType;
  - requested stable response element;
  - decoded `requestInfo.smart_health_checkin`;
  - fallback dynamic element presence, if any;
  - requested FHIR profiles / Questionnaires.

Acceptance:

- A real browser click opens Android UI.
- UI can show "Patient", "Coverage", "IPS", and "Questionnaire" from the
  decoded SMART request.
- The same raw request can be saved as a fixture and replayed in JVM tests.

## Phase 5: DeviceResponse builder

Deliverable: pure Kotlin/JVM module builds a deterministic mdoc response from a
SMART response JSON string.

Tasks:

- Build `IssuerSignedItem` with:
  - namespace `org.smarthealthit.checkin`;
  - element identifier `smart_health_checkin_response`;
  - element value equal to SMART response JSON string.
- Generate MSO with value digest over exact tag-24 issuer item bytes.
- Sign `issuerAuth` with a persistent self-signed key.
- Sign `DeviceAuth` over:

  ```text
  ["DeviceAuthentication", SessionTranscript, docType, DeviceNameSpacesBytes]
  ```

- Keep a JVM test fixture with fixed keys/randoms.

Acceptance:

- pyMDOC-CBOR or our verifier can validate:
  - issuerAuth signature;
  - value digests;
  - DeviceAuth signature for a fixed SessionTranscript.

## Phase 6: HPKE response packaging

Deliverable: wallet returns a hard-coded encrypted direct mdoc response that the
RP page opens.

Tasks:

- Implement HPKE seal with:
  - KEM: DHKEM(P-256, HKDF-SHA256);
  - KDF: HKDF-SHA256;
  - AEAD: AES-128-GCM;
  - info: SessionTranscript bytes.
- Return:

  ```json
  {
    "protocol": "org-iso-mdoc",
    "data": {
      "response": "<base64url cbor(['dcapi', {enc, cipherText}])>"
    }
  }
  ```

- Implement RP-side HPKE open.

Acceptance:

- Browser promise resolves.
- RP decodes `data.response`, HPKE-opens `DeviceResponse`, validates mdoc
  structure, and prints SMART response JSON.

## Phase 7: FHIR store and forms

Deliverable: wallet returns real selected local data.

Tasks:

- Tiny local FHIR store seeded with sample Patient, Coverage, IPS Bundle.
- Profile matching by `meta.profile` and resource type.
- Consent UI for selecting resources.
- Inline Questionnaire renderer for small questionnaires.
- Build `QuestionnaireResponse`.

Acceptance:

- Patient-only, Patient+Coverage, IPS, and Questionnaire presets all round-trip.

## Current open risks

- Exact Android Credential Manager request JSON shape for direct
  `org-iso-mdoc`.
- Whether iOS wallet APIs expose full `requestInfo`. This is now a core
  assumption; the `shc1j` claim-name path is the fallback if it fails.
- Direct mdoc response envelope quirks across Android vs Safari.
- HPKE library choice on Android and TS.
- `requestInfo` length limits.
