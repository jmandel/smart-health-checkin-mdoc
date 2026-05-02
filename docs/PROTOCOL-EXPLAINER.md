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

The current implementation carries SMART request JSON in:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

`SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` defines the active
transport-neutral `SmartHealthCheckinRequest` /
`SmartHealthCheckinResponse` payloads. Real Chrome/Android fixture captures
confirm that `requestInfo` survives into the wallet, so archived claim-name
experiments are not part of the active profile.

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
- builds `{artifacts, requestStatus}`;
- constructs an mdoc `DeviceResponse`;
- HPKE-seals it for the verifier key from `encryptionInfo`;
- returns `{"protocol":"org-iso-mdoc","data":{"response":"<b64u>"}}`.

The promoted real Chrome/Android fixture proves `requestInfo` survives in the
current Android path. The wallet therefore treats `requestInfo` as the active
request carrier, not as a speculative or optional path.

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
      "smart_health_checkin_response": true
    }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": "<SMART request JSON>"
  }
}
```

The `true` value is the mdoc `intentToRetain` flag. SMART Check-in defaults to
retention because realistic clinical workflows ingest the shared artifacts into
the EHR.

## SMART Request JSON

The `requestInfo["org.smarthealthit.checkin.request"]` value is a compact JSON
string:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "demo-us-core-checkin",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "coverage",
      "title": "Insurance card",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "clinical-history",
      "title": "US Core clinical resources",
      "summary": "US Core resources, including patient demographics, problems, medications, and allergies.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Intake form",
      "content": {
        "kind": "questionnaire",
        "questionnaire": {
          "resourceType": "Questionnaire",
          "status": "active",
          "item": []
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Rules:

- `type` is `"smart-health-checkin-request"` and `version` is `"1"`.
- `id` is the verifier's request id; the response echoes it as `requestId`.
- `items[].id` is the stable item correlation key.
- `items[].content.kind` identifies FHIR-resource selectors versus
  questionnaire selectors.
- `items[].accept` declares acceptable response media types.

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
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "demo-us-core-checkin",
  "artifacts": [
    {
      "id": "a1",
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

## Archived claim-name encoding

Earlier design notes explored placing SMART request JSON directly in dynamic
mdoc element names. That path is archived. The active profile keeps a stable
element name and carries the SMART request in `ItemsRequest.requestInfo`.

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
