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
payload shape defined in `../../../spec.md`. The requested mdoc element
remains the stable `smart_health_checkin_response`.

Canonical `|version` rule of thumb: preserve the original wire string exactly.
Direct HTTP dereference is only appropriate for unversioned canonicals. Versioned
canonicals require resolver or FHIR-search semantics that check both URL and
version, and responses must preserve exact returned profile/canonical strings.

CLI wrapper:

```sh
bun run inspect:mdoc <navigator-arg.json|fixture-dir> [--origin <origin>] [--out <dir>]
bun run inspect:response <wallet-response.json|device-response.cbor> [--out <dir>]
```
