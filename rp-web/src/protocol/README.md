# protocol/

Temporary TypeScript protocol surface for the active SMART Check-in mapping.

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
- `openWalletResponse(...)`
- `inspectOrgIsoMdocNavigatorArgument(...)`
- `inspectDeviceRequestBytes(...)`
- `inspectItemsRequestBytes(...)`
- `inspectEncryptionInfoBytes(...)`
- `cborDecode(...)`, `cborDiagnostic(...)`, `cborToJsonValue(...)`
- `publicJwkToCoseKey(jwk)`
- `validateSmartCheckinRequest(v)`
- `SmartCheckinRequest`, `SmartCheckinResponse` types

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
payload shape in `../../SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`. The requested
mdoc element remains the stable `smart_health_checkin_response`.

The `shc1j`/`shc1d` dynamic element encoding remains a fallback strategy if a
real wallet API hides `requestInfo`; it is not used by the active request
builder.

CLI wrapper:

```sh
bun run inspect:mdoc <navigator-arg.json|fixture-dir> [--origin <origin>] [--out <dir>]
bun run inspect:response <wallet-response.json|device-response.cbor> [--out <dir>]
```
