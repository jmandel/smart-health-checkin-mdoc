# protocol/

Low-level TypeScript protocol surface for the active SMART Check-in mapping.

App-level integrations should prefer `../sdk/`:

- `sdk/core.ts` for transport-neutral SMART request/response types and validation.
- `sdk/dcapi-verifier.ts` for browser W3C Digital Credentials API verifier flow.
- `sdk/kiosk-session.ts` for QR/session descriptors and return-channel adapters.

Stable exports:

- `PROTOCOL_ID` (`"org-iso-mdoc"`)
- `MDOC_DOC_TYPE` (`"org.smarthealthit.checkin.1"`)
- `MDOC_NAMESPACE` (`"org.smarthealthit.checkin"`)
- `SMART_REQUEST_INFO_KEY` (`"org.smarthealthit.checkin.request"`)
- `SMART_RESPONSE_ELEMENT_ID` (`"smart_health_checkin_response"`)
- `DYNAMIC_ELEMENT_PREFIX` (`"shc1j"`) — fallback only
- `encodeDynamicElement(request)`
- `decodeDynamicElement(element)`
- `buildOrgIsoMdocRequest(request, options?)`
- `buildDeviceRequestBytes(...)`
- `buildEncryptionInfoBytes(...)`
- `buildDcapiSessionTranscript(...)`
- `buildDcapiMdocResponse(...)`
- `inspectDcapiMdocResponse(...)`
- `inspectDeviceResponseBytes(...)`
- `hpkeSealDirectMdoc(...)`
- `openWalletResponse(...)` — pass `smartRequest` when available so the opened
  response is cross-validated against request item ids and `requestId`
- `inspectOrgIsoMdocNavigatorArgument(...)`
- `inspectDeviceRequestBytes(...)`
- `inspectItemsRequestBytes(...)`
- `inspectEncryptionInfoBytes(...)`
- `cborDecode(...)`, `cborDiagnostic(...)`, `cborToJsonValue(...)`
- `publicJwkToCoseKey(jwk)`
- `validateSmartCheckinRequest(v)` (re-exported from `sdk/core.ts`)
- `validateResponseAgainstRequest(request, response)` (re-exported from `sdk/core.ts`)
- `SmartCheckinRequest`, `SmartCheckinResponse` types (re-exported from `sdk/core.ts`)

The active request shape is direct `org-iso-mdoc`:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "<base64url CBOR DeviceRequest>",
    "encryptionInfo": "<base64url CBOR ['dcapi', {...}]>"
  }
}
```

The checked-in implementation carries SMART request JSON in
`ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, using the
payload shape in `../../../docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`. The requested
mdoc element remains the stable `smart_health_checkin_response`.

The `shc1j`/`shc1d` dynamic element encoding remains a fallback strategy if a
real wallet API hides `requestInfo`; it is not used by the active request
builder.

Canonical `|version` rule of thumb: strip the suffix for HTTP fetches,
profile-family routing, and IG membership checks; preserve it in returned
records, `QuestionnaireResponse.questionnaire`, logs, fixtures, and exact
conformance comparisons.

CLI wrapper:

```sh
bun run inspect:mdoc <navigator-arg.json|fixture-dir> [--origin <origin>] [--out <dir>]
bun run inspect:response <wallet-response.json|device-response.cbor> [--out <dir>]
```
