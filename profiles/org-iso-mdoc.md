# Active profile: SMART Health Check-in over direct `org-iso-mdoc`

This is the only active protocol profile for this prototype.

## Identifiers

| Field | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo` |
| SMART response carrier | `IssuerSignedItem.elementValue` for `smart_health_checkin_response` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signatures | ES256 / alg `-7` |

## Browser request

The RP calls:

```js
await navigator.credentials.get({
  mediation: "required",
  digital: {
    requests: [{
      protocol: "org-iso-mdoc",
      data: {
        deviceRequest: "<base64url CBOR DeviceRequest>",
        encryptionInfo: "<base64url CBOR ['dcapi', {...}]>"
      }
    }]
  }
});
```

Both byte fields are base64url without padding.

## DeviceRequest

Decoded `deviceRequest`:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [{
    "itemsRequest": tag24(CBOR(ItemsRequest)),
    "readerAuth": COSE_Sign1 / optional
  }]
}
```

Decoded `ItemsRequest`:

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": false
    }
  },
  "requestInfo": {
    "smart_health_checkin": JSON.stringify(SMART request)
  }
}
```

The checked-in implementation currently uses the prototype
`requestInfo.smart_health_checkin` key and `intentToRetain = false` in existing
fixtures. The implementation target is
`SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`, using
`requestInfo["org.smarthealthit.checkin.request"]` and defaulting
`intentToRetain = true` for the stable `smart_health_checkin_response` element.

The RP web verifier now includes per-`DocRequest.readerAuth` when it knows the
page origin. The current implementation deliberately uses DeviceRequest version
`"1.0"` and does not use version `"1.1"` `readerAuthAll`.

```text
ItemsRequestBytes =
  tag24(CBOR(ItemsRequest))

ReaderAuthenticationBytes =
  tag24(CBOR([
    "ReaderAuthentication",
    SessionTranscript,
    ItemsRequestBytes
  ]))

readerAuth =
  COSE_Sign1[
    protected:   bstr .cbor { 1: -7 },  ; ES256
    unprotected: { 33: [reader certificate DER] },
    payload:     null,                  ; detached
    signature:   ES256 over Sig_structure(..., ReaderAuthenticationBytes)
  ]
```

The Android handler preserves the exact tag-24 `ItemsRequest` bytes, computes the
same direct `dcapi` SessionTranscript used for HPKE, verifies this detached
COSE_Sign1 signature against the leaf certificate in `x5chain`, and surfaces the
readerAuth result in the consent UI and debug bundle. Current RP builds use an
ephemeral demo reader certificate per request; production reader identity and
trust anchors remain policy work.

The SMART request JSON is:

```json
{
  "version": "1",
  "items": [
    {
      "id": "patient",
      "profile": "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
      "required": true,
      "description": "Demographics for check-in"
    }
  ]
}
```

Each item has exactly one of `profile`, `questionnaire`, or `questionnaireUrl`.

## EncryptionInfo

Decoded `encryptionInfo`:

```text
[
  "dcapi",
  {
    "nonce": <32 random bytes>,
    "recipientPublicKey": {
       1: 2,        ; kty = EC2
      -1: 1,        ; crv = P-256
      -2: <x bstr>,
      -3: <y bstr>
    }
  }
]
```

The verifier keeps the matching private key for HPKE open.

## Origin and SessionTranscript

The verifier origin is not taken from request JSON. On Android it comes from
Credential Manager / browser caller metadata:

```kotlin
callingAppInfo.getOrigin(privilegedAllowlistJson)
```

The direct `dcapi` SessionTranscript used by this prototype is:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

These exact bytes are used as:

- HPKE `info` when sealing/opening the response;
- the `DeviceAuthentication` SessionTranscript signed by the device key.

The promoted real fixture proves Android computed the same
`session-transcript.cbor` as the TypeScript/Kotlin builders for
`origin = "http://127.0.0.1:3010"`.

## Matcher contract

The WASM matcher intentionally stays coarse:

1. Check request bytes for the literal string `"org-iso-mdoc"`.
2. Find `deviceRequest` JSON strings and base64url-decode them.
3. Check decoded CBOR bytes for the literal UTF-8 substring
   `"org.smarthealthit.checkin.1"`.
4. Emit one `AddStringIdEntry`.

CBOR text strings contain UTF-8 verbatim, so the matcher does not need tag-24
unwrapping, map traversal, heap-heavy data structures, or randomness.

The handler performs full CBOR parsing after the user selects the entry.

## Wallet response

The Android wallet returns Credential Manager JSON:

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
    "enc": <65-byte uncompressed ephemeral P-256 public key>,
    "cipherText": <AES-128-GCM ciphertext || tag>
  }
]
```

The ciphertext plaintext is CBOR `DeviceResponse`.

## DeviceResponse

The wallet builds one mdoc document:

```text
DeviceResponse = {
  "version": "1.0",
  "documents": [Document],
  "status": 0
}

Document.docType = "org.smarthealthit.checkin.1"
```

The SMART response is carried as a string:

```text
issuerSigned.nameSpaces["org.smarthealthit.checkin"][0]
  .elementIdentifier = "smart_health_checkin_response"
  .elementValue      = JSON.stringify(SMART response)
```

The SMART response JSON is:

```json
{
  "version": "1",
  "artifacts": [
    {
      "id": "artifact-patient",
      "type": "fhir_resource",
      "data": { "resourceType": "Bundle" }
    }
  ],
  "answers": {
    "patient": ["artifact-patient"]
  }
}
```

## mdoc / COSE invariants

The response builder and fixtures enforce:

- `IssuerSignedItem` is CBOR tag-24 wrapped before digesting.
- `MSO.valueDigests["org.smarthealthit.checkin"][0]` equals
  `SHA-256(tag24(IssuerSignedItem))`.
- `issuerAuth` is COSE_Sign1 with protected header `{1: -7}`.
- `issuerAuth.payload` is tag-24-wrapped MSO bytes.
- `issuerAuth` verifies with the x5chain certificate public key.
- `DeviceAuthentication` is tag-24-wrapped CBOR:

  ```text
  [
    "DeviceAuthentication",
    SessionTranscript,
    "org.smarthealthit.checkin.1",
    tag24(CBOR(DeviceNameSpaces))
  ]
  ```

- `deviceSignature` is COSE_Sign1 with protected header `{1: -7}`.
- `deviceSignature` verifies with `MSO.deviceKeyInfo.deviceKey`.

## Fixtures and proof

Current proof fixtures:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
```

The response fixture includes `pymdoc-byte-check.json`, which records successful
Python verification of the issuer/device signatures, digest binding, and exact
SessionTranscript binding.

The paired request fixture includes an intentionally public, test-only
`recipient-private.jwk.json`, so RP web `openWalletResponse()` can reopen the
checked-in encrypted `dcapi-response.cbor` offline and prove it decrypts to the
same `device-response.cbor`.

## Fallbacks and archived profiles

The `shc1j.<base64url(JSON)>` dynamic element-name fallback is not active. It is
only a contingency if a future platform hides `requestInfo`.

OpenID4VP / `dc_api.jwt` / DCQL research is archived under `archive/` and is not
part of the active implementation.
