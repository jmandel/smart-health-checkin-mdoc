# smart-checkin-mdoc

`smart-checkin-mdoc` is the Android direct-mdoc transport library for SMART
Health Check-in. It adapts the transport-neutral SMART request/response model
from `smart-checkin-core` to W3C Digital Credentials API direct
`org-iso-mdoc`.

Use this module when you need to:

- parse Digital Credentials API `org-iso-mdoc` request data;
- extract the embedded SMART Check-in request from mdoc `ItemsRequest`;
- compute the DC API SessionTranscript;
- verify optional readerAuth signatures;
- build an encrypted direct-mdoc wallet response containing a SMART response.

## Protocol constants

The active profile uses:

```text
protocol:  org-iso-mdoc
doctype:   org.smarthealthit.checkin.1
namespace: org.smarthealthit.checkin
request:   ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
response:  smart_health_checkin_response
```

See [`../../docs/profiles/org-iso-mdoc.md`](../../docs/profiles/org-iso-mdoc.md) for the
wire profile and invariants.

## Key types and APIs

| API | Purpose |
| --- | --- |
| `DirectMdocRequestParser.parseRequestJson(...)` | Parses outer Credential Manager/browser JSON and finds `org-iso-mdoc` data. |
| `DirectMdocRequestParser.parseData(...)` | Parses a direct `data` object with `deviceRequest` and `encryptionInfo`. |
| `DirectMdocRequest` | Parsed request bytes, decoded `ItemsRequest`, encryption info, SessionTranscript, readerAuth status. |
| `DirectMdocEncryptionInfo` | HPKE nonce and recipient public key from `encryptionInfo`. |
| `SmartHealthMdocResponder.buildCredentialResponse(...)` | Builds the encrypted direct-mdoc response returned to Credential Manager. |
| `DirectMdocWalletResponse` | Response JSON plus debug/test byte artifacts. |
| `MdocCbor` | Minimal CBOR reader/writer used by the profile. |
| `SmartMdocCrypto` | P-256, COSE, SHA-256, certificate, and HPKE helpers. |
| `SmartMdocBase64` | Base64url helpers for DC API data fields. |

## Parse flow

```kotlin
val direct = DirectMdocRequestParser.parseData(
    data = credentialOptionData,
    origin = verifierOrigin,
)

val smartRequestJson = direct.itemsRequest.smartRequest
val readerAuth = direct.readerAuth
```

`parseData` validates that:

- `data.deviceRequest` is present;
- `data.encryptionInfo` is present;
- the mdoc `DeviceRequest` contains a SMART Health Check-in `ItemsRequest`;
- `encryptionInfo` is the expected `["dcapi", {...}]` CBOR structure;
- SessionTranscript can be reconstructed from `encryptionInfo` and origin;
- readerAuth is verified when present.

The parser supports the active `org-iso-mdoc` protocol string and the older
`org.iso.mdoc` spelling when searching wrapper JSON.

## Response flow

Build SMART response JSON in `smart-checkin-core`, then pass it to the mdoc
responder:

```kotlin
val smartResponse = SmartCheckinResponseFactory.build(
    request = verifiedRequest,
    selectedItems = selectedItems,
    questionnaireAnswers = questionnaireAnswers,
    walletStore = walletStore,
)

val walletResponse = SmartHealthMdocResponder.buildCredentialResponse(
    request = directMdocRequest,
    smartResponse = smartResponse,
)

val credentialJson = walletResponse.credentialJson
```

`credentialJson` is the object returned through Android Credential Manager. It
contains:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url CBOR [\"dcapi\", { enc, cipherText }]>"
  }
}
```

The encrypted plaintext is an mdoc `DeviceResponse` whose issuer-signed item
contains the SMART response JSON as `smart_health_checkin_response`.

## Security and test notes

The current demo responder generates per-response demo issuer/device key
material and a self-signed issuer certificate. This is sufficient for fixture
grounding and protocol experiments; it is not a production issuer trust model.

The response builder exposes byte artifacts in `DirectMdocWalletResponse`
because tests and debug tools need to verify:

- issuer-signed item tag-24 bytes;
- value digest binding;
- MSO bytes and issuerAuth;
- DeviceAuthentication bytes and device signature;
- HPKE `enc` and `cipherText`;
- outer DC API response wrapper.

Production APIs should keep this evidence available under an explicit debug or
audit policy rather than silently discarding it.

## Dependency rules

This module depends on `smart-checkin-core` for shared models and on
BouncyCastle for crypto helpers. It should not depend on:

- Android Credential Manager registration;
- Compose UI;
- demo assets or `DemoWalletStore`;
- a concrete backend/kiosk relay.
