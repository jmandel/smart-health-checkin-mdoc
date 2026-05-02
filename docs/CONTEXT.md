# Context: SMART Health Check-in over direct `org-iso-mdoc`

## What we're building

Two pieces that exercise each other end to end:

1. A standalone Android app that registers as a credential provider with Android
   Credential Manager and responds to W3C Digital Credentials API requests.
2. A relying-party web app that builds direct `org-iso-mdoc` requests, calls
   `navigator.credentials.get`, opens the HPKE-protected mdoc response, decodes
   the embedded `DeviceResponse`, and displays the SMART Health Check-in payload.

The active request shape is the Safari-compatible branch we observed from the
Mattr verifier:

```json
{
  "mediation": "required",
  "digital": {
    "requests": [{
      "protocol": "org-iso-mdoc",
      "data": {
        "deviceRequest": "<base64url CBOR DeviceRequest>",
        "encryptionInfo": "<base64url CBOR ['dcapi', {...}]>"
      }
    }]
  }
}
```

Android appears more flexible, but Safari/iOS appears to use the direct mdoc
path. We are using that as the portability baseline. A real Chrome/Android
handler run is now checked in as fixtures under:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
```

That capture proves the request survives into Android with `requestInfo`, and
that the wallet can return a direct `org-iso-mdoc` response with valid mdoc/COSE
structure. The current fixture uses
`requestInfo["org.smarthealthit.checkin.request"]` and includes a test-only
verifier HPKE private JWK, so the encrypted `dcapi` wrapper can be reopened
offline by the RP web oracle.

## SMART request carrier

The active transport uses `ItemsRequest.requestInfo` as the load-bearing dynamic
request channel:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"] =
  JSON.stringify(SmartHealthCheckinRequest)
```

The mdoc claim request itself stays stable:

```text
docType:   org.smarthealthit.checkin.1
namespace: org.smarthealthit.checkin
element:   smart_health_checkin_response
```

Earlier notes explored encoding the SMART request into the mdoc element
identifier as `shc1j.<base64url(json)>`, with `shc1d` reserved for compressed
JSON. The real Android run proves `requestInfo` is available in our current
Chrome/Credential Manager path, so the encoded-element approach is archived as a
fallback only.

Decoded SMART request JSON:

```json
{
  "version": "1",
  "items": [
    {
      "id": "coverage",
      "profile": "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
      "required": true
    },
    {
      "id": "intake",
      "questionnaire": {
        "resourceType": "Questionnaire",
        "status": "active",
        "item": []
      }
    }
  ]
}
```

The wallet returns the stable requested element identifier with an element value
containing the SMART response JSON:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "demo-request",
  "artifacts": [
    {
      "id": "artifact-patient",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["patient"],
      "value": { "resourceType": "Patient" }
    }
  ],
  "requestStatus": [
    { "item": "patient", "status": "fulfilled" }
  ]
}
```

## Direct mdoc request model

The RP builds:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [{
    "itemsRequest": Tag(24, cbor({
      "docType": "org.smarthealthit.checkin.1",
      "nameSpaces": {
        "org.smarthealthit.checkin": {
          "smart_health_checkin_response": true
        }
      },
      "requestInfo": {
        "org.smarthealthit.checkin.request": "<SMART request JSON>"
      }
    }))
  }]
}
```

The `true` value is mdoc `intentToRetain`; SMART Check-in defaults to retention
because clinical check-in artifacts are typically ingested into the EHR.

The RP also builds:

```text
encryptionInfo = cbor([
  "dcapi",
  {
    "nonce": <32 random bytes>,
    "recipientPublicKey": <P-256 COSE_Key>
  }
])
```

The browser returns a credential whose `data.response` is base64url CBOR:

```text
["dcapi", { "enc": <HPKE enc>, "cipherText": <HPKE ciphertext> }]
```

The RP computes the direct mdoc SessionTranscript as:

```text
dcapiInfo = cbor([base64url(encryptionInfo), origin])
handover  = ["dcapi", sha256(dcapiInfo)]
SessionTranscript = cbor([null, null, handover])
```

HPKE uses P-256, HKDF-SHA256, and AES-128-GCM. The SessionTranscript bytes are
the HPKE `info` value and the DeviceAuth signature context.

## Trust model

- **Verifier identity** = browser origin. The wallet displays it.
- **Request binding** = direct `dcapi` SessionTranscript binds origin and
  encryptionInfo.
- **Response confidentiality** = mdoc response bytes are HPKE-encrypted to the
  verifier key from `encryptionInfo`.
- **Response integrity** = mdoc `DeviceAuth` signs over the same
  SessionTranscript; MSO digests bind the returned SMART element value.
- **Issuer trust** = self-signed / local for prototype milestones. COSE
  signatures verify; production IACA/VICAL or other trust-chain policy remains
  out of scope for the prototype.

## Reuse from prior art

- The SMART Health Check-in artifact/answers pattern remains the application
  response model.
- The CMWallet POC and shl-wallet Rust matcher remain useful for Android matcher
  mechanics.
- The Mattr verifier showed browser branching: Chrome identity emitted
  OpenID4VP, while Safari identities emitted direct `org-iso-mdoc`.
- `universal-verify/id-verifier` corroborates the direct request/response shape
  and has Android/iOS direct-mdoc response fixtures. We use it as a reference
  point, not as a dependency.

## Out of scope

- Encoding dynamic request JSON into mdoc claim names in the primary path. The
  `shc1j`/`shc1d` approach is only a fallback if `requestInfo` proves unusable.
- Compression in v1; `shc1d` is reserved for fallback work only.
- Real issuer trust / IACA / VICAL.
- Production provisioning UI for FHIR data.
- Cross-device QR/relay flows.
- OpenID4VP/JWE as the active path. It remains useful research, but direct
  `org-iso-mdoc` is now the implementation target.
