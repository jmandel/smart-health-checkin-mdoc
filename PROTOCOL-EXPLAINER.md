# Protocol explainer: SMART Check-in over direct mdoc

## Summary

The relying party asks for a SMART Health Check-in mdoc using the Digital
Credentials API direct mdoc path:

```text
navigator.credentials.get
  protocol: "org-iso-mdoc"
  data.deviceRequest   = base64url(cbor(DeviceRequest))
  data.encryptionInfo  = base64url(cbor(["dcapi", {...}]))
```

The mdoc request asks for one stable element:

```text
docType:   org.smarthealthit.checkin.1
namespace: org.smarthealthit.checkin
element:   smart_health_checkin_response
```

The current implementation carries prototype SMART request JSON in:

```text
ItemsRequest.requestInfo.smart_health_checkin
```

The implementation target is `SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`, which
keeps `requestInfo` as the load-bearing channel but uses
`requestInfo["org.smarthealthit.checkin.request"]` and the transport-neutral
`SmartHealthCheckinRequest` / `SmartHealthCheckinResponse` payloads. Encoding the
request JSON into a claim name (`shc1j...`) is only a fallback if a real platform
API hides `requestInfo`.

## Roles

### Relying-party web app

The RP is both verifier and test harness. It:

- builds SMART request JSON;
- places it into `ItemsRequest.requestInfo`;
- requests the stable mdoc element `smart_health_checkin_response`;
- generates a verifier P-256 keypair and mdoc `encryptionInfo`;
- calls `navigator.credentials.get`;
- decodes `data.response`;
- HPKE-opens the `DeviceResponse` using the SessionTranscript;
- verifies mdoc structure, MSO value digests, and COSE signatures in fixture
  oracles;
- parses the SMART response JSON from the returned stable element.

### Browser and Credential Manager

The browser binds the request to the web origin and forwards it to platform
credential selection. Android Credential Manager runs our matcher, shows the
eligible wallet entry, launches the handler activity, and returns the wallet's
`DigitalCredential` response to the browser. Safari appears to use this direct
mdoc shape for mdoc presentation.

### Wallet

The wallet:

- registers a matcher and handler;
- matches `docType = org.smarthealthit.checkin.1`;
- reads SMART request JSON from `ItemsRequest.requestInfo`;
- shows a consent UI with decoded SMART request items;
- builds `{artifacts, answers}`;
- constructs an mdoc `DeviceResponse`;
- HPKE-seals it for the verifier key from `encryptionInfo`;
- returns `{"protocol":"org-iso-mdoc","data":{"response":"<b64u>"}}`.

If `requestInfo` is missing, the wallet may support a contingency parser for
`shc1j.<base64url(json)>` element identifiers, but that is not the normal path.
The promoted real Chrome/Android fixture proves `requestInfo` survives in the
current Android path.

## DeviceRequest

The RP sends:

```json
{
  "mediation": "required",
  "digital": {
    "requests": [{
      "protocol": "org-iso-mdoc",
      "data": {
        "deviceRequest": "<base64url CBOR>",
        "encryptionInfo": "<base64url CBOR>"
      }
    }]
  }
}
```

Decoded `DeviceRequest`:

```text
{
  "version": "1.0",
  "docRequests": [{
    "itemsRequest": Tag(24, cbor(ItemsRequest))
  }]
}
```

Decoded `ItemsRequest`:

```text
{
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": false
    }
  },
  "requestInfo": {
    "smart_health_checkin": "<SMART request JSON>"
  }
}
```

The `false` value is the mdoc `intentToRetain` flag.
The target payload spec defaults this to `true` for SMART Check-in carriers; the
current checked-in fixtures still show the prototype `false` value.

## SMART Request JSON

The `requestInfo.smart_health_checkin` value is a compact JSON string:

```json
{
  "version": "1",
  "items": [
    {
      "id": "coverage",
      "profile": "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage",
      "required": true,
      "description": "Insurance card"
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

Rules:

- `version` is `"1"`.
- `items[].id` is the verifier's stable response correlation key.
- Exactly one of `profile`, `questionnaire`, or `questionnaireUrl` appears on
  each item.
- `required`, `signing`, and `description` are wallet policy and UX hints.

## EncryptionInfo and SessionTranscript

`encryptionInfo` is:

```text
[
  "dcapi",
  {
    "nonce": <random bytes>,
    "recipientPublicKey": <COSE_Key for verifier P-256 public key>
  }
]
```

The SessionTranscript is:

```text
dcapiInfo = cbor([base64url(encryptionInfo), origin])
handover  = ["dcapi", sha256(dcapiInfo)]
SessionTranscript = [null, null, handover]
```

Those exact SessionTranscript bytes are used as:

- HPKE `info` for response decryption;
- the mdoc DeviceAuth context.

## Response

The wallet returns:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url CBOR>"
  }
}
```

Decoded `data.response`:

```text
[
  "dcapi",
  {
    "enc": <HPKE encapsulated key>,
    "cipherText": <HPKE ciphertext of DeviceResponse CBOR>
  }
]
```

The decrypted `DeviceResponse` contains one document with:

```text
docType = org.smarthealthit.checkin.1
issuerSigned.nameSpaces["org.smarthealthit.checkin"][0]
  elementIdentifier = smart_health_checkin_response
  elementValue      = SMART response JSON string
```

SMART response JSON:

```json
{
  "version": "1",
  "artifacts": [
    {
      "id": "a1",
      "type": "fhir_resource",
      "data": { "resourceType": "Patient" }
    }
  ],
  "answers": {
    "patient": ["a1"]
  }
}
```

## Fallback Claim-Name Encoding

If a platform wallet API exposes requested namespace/element pairs but hides
`requestInfo`, we can move the same SMART request JSON into an element
identifier:

```text
shc1j.<base64url(UTF-8 compact JSON)>
```

`shc1d.<base64url(deflate(JSON))>` is reserved for the same fallback if size
limits force compression. This is intentionally not used unless `requestInfo`
fails in real platform tests.

## Debug artifacts

Every capture or fixture should preserve the byte boundaries:

```text
navigator-credentials-get.arg.json
inspection.json
device-request.cbor
device-request.diag
items-request.cbor
items-request.decoded.json
request-info.json
requested-element.txt
encryption-info.cbor
session-transcript.cbor
wallet-response.digital-credential.json
dcapi-response.cbor
device-response.cbor
smart-request.json
smart-response.json
pymdoc-byte-check.json
verification-report.json
```

This lets us test each boundary independently: SMART request serialization,
mdoc request construction, matcher extraction, HPKE wrapping, mdoc validation,
and SMART response parsing.

The current real fixture set is:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
```

`pymdoc-byte-check.json` records independent verification of the MSO digest,
`issuerAuth`, `deviceSignature`, and exact SessionTranscript binding.
