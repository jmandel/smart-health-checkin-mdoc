# T3.D attempt 01 — Appendix C/D same-device CDDL and fixture material

## Appendix C. CDDL and diagnostic structures for same-device `org-iso-mdoc`

This appendix gives CDDL-oriented profile constraints and diagnostic structure sketches for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended for implementers, fixture authors, and conformance-test authors who need to identify byte boundaries and SMART-specific constraints inside the ISO/IEC 18013-5-style structures used by the W3C Digital Credentials API direct mdoc path.

Section 8 is the source of normative same-device behavior. This appendix reuses ISO/IEC 18013-5 base structures wherever applicable and constrains only the SMART Health Check-in profile portions: identifiers, request and response carriers, tag-24 boundaries, direct `dcapi` encryption envelopes, HPKE context, and the single stable SMART response element. If this appendix appears to conflict with §8, §8 controls.

The fragments below are profile CDDL or pseudo-CDDL. They are not a full transcription of ISO/IEC 18013-5, COSE, or COSE_Key CDDL. Exact ISO map labels, full certificate/MSO grammar, COSE validation, and deployment trust-anchor rules remain governed by ISO/IEC 18013-5, COSE, HPKE, §7, and §8. A future publication pass can replace pseudo-CDDL labels with exact imported ISO CDDL names once the imported base grammar is selected.

### C.1 Notation and imported base structures

The same-device profile uses the following imported or externally defined structures by reference:

- `COSE_Sign1` from COSE for `readerAuth`, `issuerAuth`, and `deviceSignature`.
- `COSE_Key` from COSE for EC2 P-256 public keys in `encryptionInfo` and in the MSO `deviceKeyInfo.deviceKey`.
- ISO/IEC 18013-5-style `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, and related certificate and validity structures.
- CBOR tag 24, the encoded-CBOR data item tag. This appendix writes `tag24<T>` for a CBOR tag 24 whose content is a byte string containing a complete CBOR serialization of `T`.

The profile-specific constants are:

```cddl
smart-protocol-id = "org-iso-mdoc"
smart-doc-type = "org.smarthealthit.checkin.1"
smart-namespace = "org.smarthealthit.checkin"
smart-response-element = "smart_health_checkin_response"
smart-request-info-key = "org.smarthealthit.checkin.request"
dcapi-label = "dcapi"
```

### C.2 Digital Credentials API request and result wrappers

The W3C Digital Credentials API outer request and result are JSON, not CBOR. This appendix does not define CDDL for those JSON objects. For the same-device flow, a Verifier constructs a JSON request equivalent to:

```json
{
  "mediation": "required",
  "digital": {
    "requests": [
      {
        "protocol": "org-iso-mdoc",
        "data": {
          "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
          "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
        }
      }
    ]
  }
}
```

A Wallet/Responder returns a JSON result equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

A Verifier or Wallet/Responder that claims conformance to this Appendix C profile SHALL use unpadded base64url strings for `data.deviceRequest`, `data.encryptionInfo`, and `data.response`, and SHALL interpret the decoded bytes according to §8 and this appendix. The exact `data.encryptionInfo` base64url string is a transcript input under §8.3; processors SHALL NOT replace it with a decoded-and-re-encoded spelling when computing `SessionTranscript`.

### C.3 Same-device request CBOR subset

The profile reuses ISO/IEC 18013-5 `DeviceRequest` and `DocRequest` structure. The SMART Health Check-in constraints are:

```cddl
SmartDeviceRequest = {
  "version": "1.0",
  "docRequests": [ + SmartDocRequest ],
  * tstr => any
}

SmartDocRequest = {
  "itemsRequest": tag24<SmartItemsRequest>,
  ? "readerAuth": COSE_Sign1,
  * tstr => any
}

SmartItemsRequest = {
  "docType": smart-doc-type,
  "nameSpaces": {
    smart-namespace: {
      smart-response-element: bool
    },
    * tstr => any
  },
  "requestInfo": {
    smart-request-info-key: smart-request-json,
    * tstr => any
  },
  * tstr => any
}

smart-request-json = tstr ; UTF-8 JSON text for SmartHealthCheckinRequest
```

A Verifier SHALL set `DeviceRequest.version` to exactly `"1.0"` for the core SMART Health Check-in 1.0 flow. A Verifier SHALL place the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a CBOR text string containing the selected UTF-8 JSON serialization of the §5 `SmartHealthCheckinRequest`. A Wallet/Responder SHALL NOT treat dynamic element names, kiosk wrapper fields, `readerAuth`, `encryptionInfo`, or Digital Credentials API JSON wrapper fields as alternate SMART request carriers.

The `nameSpaces["org.smarthealthit.checkin"]["smart_health_checkin_response"]` boolean is the mdoc `intentToRetain` value for the requested stable response element. It is not Holder consent and does not override Holder decision, Wallet policy, or downstream retention rules.

The `DocRequest.itemsRequest` value is a tag-24-wrapped `ItemsRequest`. The tag-24 bytes, including the tag and enclosed byte string, are the `ItemsRequestBytes` used in `ReaderAuthenticationBytes` when `readerAuth` is present. Fixture material SHOULD expose both decoded `ItemsRequest` and complete tag-24 `items-request-tag24` bytes.

### C.4 Optional `readerAuth`

Core SMART Health Check-in 1.0 uses optional per-`DocRequest.readerAuth`; it does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core mechanism. When present, `readerAuth` is a detached `COSE_Sign1` over:

```cddl
ReaderAuthenticationBytes = tag24<ReaderAuthentication>

ReaderAuthentication = [
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]

ItemsRequestBytes = tag24<SmartItemsRequest>
```

The `COSE_Sign1` protected header SHALL include `{1: -7}` for ES256. The serialized `COSE_Sign1` payload field SHALL be `null`. The COSE `Signature1` structure SHALL use empty external AAD and `ReaderAuthenticationBytes` as the detached payload. For this core profile, `readerAuth` SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Certificate path validation, accepted trust anchors, revocation, key-usage policy, and Holder display names are deployment-policy matters under §7.2.

### C.5 Direct `encryptionInfo`, `SessionTranscript`, and HPKE context

The Digital Credentials API `data.encryptionInfo` field carries unpadded base64url of CBOR `SmartEncryptionInfo`:

```cddl
SmartEncryptionInfo = [
  dcapi-label,
  {
    "nonce": bstr,
    "recipientPublicKey": P256RecipientPublicKey,
    * tstr => any
  }
]

P256RecipientPublicKey = {
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: bstr,     ; x-coordinate
  -3: bstr,     ; y-coordinate
  * int => any
}
```

A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy. Active TypeScript builders default to 32 bytes and active fixtures often use 32 bytes, but this appendix does not make 32 bytes mandatory unless a future conformance-vector profile explicitly does so.

`SessionTranscript` is the ISO-style transcript value defined by §8.3 for direct `dcapi` handover:

```cddl
SessionTranscript = [
  null,
  null,
  [ dcapi-label, bstr .size 32 ] ; SHA-256(CBOR([encryptionInfoBase64Url, origin]))
]
```

The SHA-256 input is the exact CBOR serialization of `[encryptionInfoBase64Url, origin]`, where `encryptionInfoBase64Url` is the exact unpadded base64url string from the Digital Credentials API request and `origin` is the authenticated origin or deployment-defined privileged-caller origin-equivalent. A Wallet/Responder SHALL NOT derive `origin` from the SMART request body.

The response plaintext is CBOR `DeviceResponse`. HPKE uses:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

### C.6 Direct `dcapiResponse`

After HPKE sealing, the Wallet/Responder wraps the HPKE output in CBOR:

```cddl
SmartDcapiResponse = [
  dcapi-label,
  {
    "enc": bstr,
    "cipherText": bstr,
    * tstr => any
  }
]
```

The `enc` value is the HPKE encapsulated key for DHKEM(P-256, HKDF-SHA256). Active fixtures encode it as a 65-byte uncompressed P-256 point. The `cipherText` value is the AES-128-GCM ciphertext with authentication tag as produced by HPKE. A Wallet/Responder SHALL NOT use this envelope to carry plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a kiosk submission, or ciphertext produced with a different HPKE suite for the core same-device flow.

### C.7 Same-device response CBOR subset

The profile reuses ISO/IEC 18013-5 `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, and device-authentication structures. The SMART-specific response element is issuer-signed:

```cddl
SmartDeviceResponse = {
  "version": "1.0",
  "documents": [ + SmartDocument ],
  "status": 0,
  * tstr => any
}

SmartDocument = {
  "docType": smart-doc-type,
  "issuerSigned": SmartIssuerSigned,
  "deviceSigned": SmartDeviceSigned,
  * tstr => any
}

SmartIssuerSigned = {
  "nameSpaces": {
    smart-namespace: [ + tag24<SmartIssuerSignedItem> ],
    * tstr => any
  },
  "issuerAuth": COSE_Sign1,
  * tstr => any
}

SmartIssuerSignedItem = {
  "digestID": uint,
  "random": bstr,
  "elementIdentifier": smart-response-element,
  "elementValue": smart-response-json,
  * tstr => any
}

smart-response-json = tstr ; UTF-8 JSON text for SmartHealthCheckinResponse
```

A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`. A Wallet/Responder SHALL NOT move the SMART response into `DeviceNameSpaces`, `requestInfo`, `dcapiResponse`, or another unprotected carrier as a substitute for the issuer-signed stable element.

The MSO `docType` is `org.smarthealthit.checkin.1`. Its `valueDigests["org.smarthealthit.checkin"][digestID]` entry covers the complete tag-24-wrapped `IssuerSignedItem` bytes for the disclosed SMART response item. The `IssuerSignedItem.digestID` value and the MSO `valueDigests` key SHALL match. This appendix does not make digest id `0` a normative constant; active Android response fixtures use `0` for the single element, but consistency with the MSO is the protocol requirement.

The `issuerAuth` value is `COSE_Sign1` with ES256 (`alg` `-7`) over the tag-24-wrapped MSO bytes, unless an imported ISO-compatible profile defines an equivalent encoding. Verifiers evaluate issuer evidence under §7.3 and deployment policy.

### C.8 Device authentication and device-signed namespaces

For the core SMART Health Check-in profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response remains issuer-signed.

```cddl
SmartDeviceSigned = {
  "nameSpaces": tag24<DeviceNameSpaces>,
  "deviceAuth": { "deviceSignature": COSE_Sign1, * tstr => any },
  * tstr => any
}

DeviceNameSpaces = { * tstr => any }

DeviceAuthenticationBytes = tag24<DeviceAuthentication>

DeviceAuthentication = [
  "DeviceAuthentication",
  SessionTranscript,
  smart-doc-type,
  tag24<DeviceNameSpaces>
]
```

A Wallet/Responder SHALL produce device authentication for the same `SessionTranscript` used for HPKE response encryption and optional `readerAuth` verification. A Verifier SHALL verify the device `COSE_Sign1` with the public key from `MSO.deviceKeyInfo.deviceKey` and SHALL reject or quarantine the response if device authentication is not bound to the expected session transcript, `docType`, and tag-24 `DeviceNameSpaces` bytes.

### C.9 Diagnostic extraction checklist

A byte-level inspector for same-device fixtures should expose at least these boundaries:

1. exact SMART request JSON text from `requestInfo[smart-request-info-key]`;
2. decoded `ItemsRequest` and complete tag-24 `ItemsRequestBytes`;
3. CBOR `DeviceRequest` bytes and Digital Credentials API `data.deviceRequest` base64url string;
4. CBOR `encryptionInfo` bytes and exact `data.encryptionInfo` base64url string;
5. `dcapiInfo`, `SessionTranscript`, and optional `ReaderAuthenticationBytes`;
6. optional `readerAuth` `COSE_Sign1`, protected header, payload-null state, `x5chain` label 33, and signature validation status;
7. CBOR `dcapiResponse` bytes, `enc`, and `cipherText`;
8. HPKE-opened CBOR `DeviceResponse` plaintext;
9. disclosed tag-24 `IssuerSignedItem` bytes and extracted SMART response JSON text;
10. MSO bytes, tag-24 MSO bytes if exposed, `issuerAuth`, `valueDigests`, and recomputed digest;
11. tag-24 `DeviceNameSpaces`, `DeviceAuthenticationBytes`, and `deviceSignature`; and
12. §6.6 SMART response cross-validation results against the original SMART request.

Successful mdoc parsing, HPKE opening, issuer/MSO validation, or device authentication does not create clinical-source provenance for unsigned raw FHIR JSON. Verifiers still apply §6, §7, and deployment policy to the extracted SMART response and returned Artifacts.

## Appendix D. Same-device fixture index and classification guidance

This appendix indexes current same-device fixture roots and gives classification guidance for conformance, diagnostic, and historical use. It is not a source of alternate same-device behavior. Fixture expectations derive from §8, Appendix C, and Appendix E. Kiosk fixtures belong to the later kiosk Appendix D material.

A fixture entry can be labeled:

- **Conformance vector**: intended to be stable enough for pass/fail testing of a named requirement or byte boundary. It should include metadata, expected decoded values, expected hashes or signatures where feasible, and an explicit statement that private keys are test-only when included.
- **Diagnostic vector**: useful for implementation debugging, byte-walking, or cross-library comparison, but not by itself a mandatory pass/fail artifact for all conforming implementations.
- **Historical capture**: retained to document platform behavior or a prior experiment. It should not be treated as normative unless refreshed and promoted.
- **Negative vector**: expected not to satisfy SMART Health Check-in same-device recognition or validation.

Fixture roots and filenames below were verified in the repository. Do not cite unlisted files in the final specification without checking that they exist.

### D.1 `fixtures/dcapi-requests/ts-smart-checkin-basic/`

Classification: candidate conformance vector for generated request construction; diagnostic until final conformance-vector policy is frozen.

Purpose: generated TypeScript request vector without `readerAuth`, produced by `rp-web/scripts/generate-dcapi-request-fixtures.ts`. It exercises the stable SMART identifiers, `DeviceRequest.version` `"1.0"`, tag-24 `ItemsRequest`, SMART request JSON in `requestInfo`, `encryptionInfo`, and `SessionTranscript` inputs.

Confirmed files include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/request.json
fixtures/dcapi-requests/ts-smart-checkin-basic/navigator-credentials-get.arg.json
fixtures/dcapi-requests/ts-smart-checkin-basic/metadata.json
fixtures/dcapi-requests/ts-smart-checkin-basic/inspection.json
fixtures/dcapi-requests/ts-smart-checkin-basic/device-request.cbor.hex
fixtures/dcapi-requests/ts-smart-checkin-basic/device-request.b64u
fixtures/dcapi-requests/ts-smart-checkin-basic/encryption-info.cbor.hex
fixtures/dcapi-requests/ts-smart-checkin-basic/encryption-info.b64u
fixtures/dcapi-requests/ts-smart-checkin-basic/recipient-public.jwk.json
fixtures/dcapi-requests/ts-smart-checkin-basic/recipient-private.jwk.json
fixtures/dcapi-requests/ts-smart-checkin-basic/smart-request.expected.json
```

Byte boundaries to expose: `data.deviceRequest` base64url, decoded `DeviceRequest`, tag-24 `ItemsRequest`, `requestInfo` SMART JSON string, `data.encryptionInfo` base64url, decoded `encryptionInfo`, recipient public key, paired test private key, and computed `SessionTranscript` when origin metadata is supplied. The included private key is test material only and MUST NOT be reused outside the fixture.

### D.2 `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`

Classification: candidate conformance vector for generated request construction with optional `readerAuth`; diagnostic until trust-anchor policy is frozen.

Purpose: generated TypeScript request vector with per-`DocRequest.readerAuth`. It exercises the detached `COSE_Sign1` over `ReaderAuthenticationBytes`, ES256 protected header, null payload, empty external AAD, `x5chain` label 33, tag-24 `ItemsRequest` binding, and `SessionTranscript` binding.

Confirmed files include:

```text
fixtures/dcapi-requests/ts-smart-checkin-readerauth/request.json
fixtures/dcapi-requests/ts-smart-checkin-readerauth/navigator-credentials-get.arg.json
fixtures/dcapi-requests/ts-smart-checkin-readerauth/metadata.json
fixtures/dcapi-requests/ts-smart-checkin-readerauth/inspection.json
fixtures/dcapi-requests/ts-smart-checkin-readerauth/device-request.cbor.hex
fixtures/dcapi-requests/ts-smart-checkin-readerauth/device-request.b64u
fixtures/dcapi-requests/ts-smart-checkin-readerauth/encryption-info.cbor.hex
fixtures/dcapi-requests/ts-smart-checkin-readerauth/encryption-info.b64u
fixtures/dcapi-requests/ts-smart-checkin-readerauth/items-request-tag24.cbor
fixtures/dcapi-requests/ts-smart-checkin-readerauth/session-transcript.cbor
fixtures/dcapi-requests/ts-smart-checkin-readerauth/reader-auth.cbor
fixtures/dcapi-requests/ts-smart-checkin-readerauth/reader-certificate.der
fixtures/dcapi-requests/ts-smart-checkin-readerauth/reader-public.jwk.json
fixtures/dcapi-requests/ts-smart-checkin-readerauth/recipient-public.jwk.json
fixtures/dcapi-requests/ts-smart-checkin-readerauth/recipient-private.jwk.json
fixtures/dcapi-requests/ts-smart-checkin-readerauth/smart-request.expected.json
```

Byte boundaries to expose: all D.1 request boundaries plus `reader-auth.cbor`, `ReaderAuthenticationBytes` if available through inspection, protected/unprotected COSE headers, `x5chain` certificate bytes, signature input hash or verification result, and certificate subject if decoded. The reader certificate and private material are test-only; production reader trust is not implied.

### D.3 `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`

Classification: diagnostic real-platform request capture; candidate historical or promoted conformance-support fixture after final review.

Purpose: real Chrome/Android Credential Manager request capture using demo data. It proves that the current platform path preserves `requestInfo`, includes populated web-origin metadata, and can carry `readerAuth` through the Android Wallet path.

Confirmed files include:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/request.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/navigator-credentials-get.arg.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/credential-manager-request.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/metadata.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/inspection.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/device-request.cbor
fixtures/dcapi-requests/real-chrome-android-smart-checkin/device-request.cbor.hex
fixtures/dcapi-requests/real-chrome-android-smart-checkin/device-request.b64u
fixtures/dcapi-requests/real-chrome-android-smart-checkin/items-request.cbor
fixtures/dcapi-requests/real-chrome-android-smart-checkin/items-request.cbor.hex
fixtures/dcapi-requests/real-chrome-android-smart-checkin/items-request-tag24.cbor
fixtures/dcapi-requests/real-chrome-android-smart-checkin/items-request-tag24.cbor.hex
fixtures/dcapi-requests/real-chrome-android-smart-checkin/items-request.decoded.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/items-request.diag
fixtures/dcapi-requests/real-chrome-android-smart-checkin/request-info.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/requested-element.txt
fixtures/dcapi-requests/real-chrome-android-smart-checkin/smart-request.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/smart-request.raw.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/smart-request.hydrated.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/smart-request.expected.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/encryption-info.cbor
fixtures/dcapi-requests/real-chrome-android-smart-checkin/encryption-info.cbor.hex
fixtures/dcapi-requests/real-chrome-android-smart-checkin/encryption-info.diag
fixtures/dcapi-requests/real-chrome-android-smart-checkin/encryption-info.b64u
fixtures/dcapi-requests/real-chrome-android-smart-checkin/session-transcript.cbor
fixtures/dcapi-requests/real-chrome-android-smart-checkin/session-transcript.cbor.hex
fixtures/dcapi-requests/real-chrome-android-smart-checkin/session-transcript.diag
fixtures/dcapi-requests/real-chrome-android-smart-checkin/reader-auth.cbor
fixtures/dcapi-requests/real-chrome-android-smart-checkin/reader-auth.cbor.hex
fixtures/dcapi-requests/real-chrome-android-smart-checkin/reader-auth-detached-payload.cbor
fixtures/dcapi-requests/real-chrome-android-smart-checkin/reader-auth-detached-payload.cbor.hex
fixtures/dcapi-requests/real-chrome-android-smart-checkin/recipient-public.jwk.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/recipient-private.jwk.json
fixtures/dcapi-requests/real-chrome-android-smart-checkin/request-artifacts.json
```

Byte boundaries to expose: complete browser argument, Credential Manager request, `DeviceRequest`, tag-24 `ItemsRequest`, decoded `requestInfo`, raw and parsed SMART request JSON, `encryptionInfo` exact base64url and bytes, `SessionTranscript`, `readerAuth`, detached reader-auth payload, and paired HPKE recipient keys for offline response opening. Metadata currently labels the request as non-PHI demo data and includes an intentionally public test-only HPKE private JWK for the paired response fixture.

### D.4 `fixtures/responses/pymdoc-minimal/`

Classification: diagnostic mdoc response byte-walk vector; candidate conformance vector for plaintext `DeviceResponse` structure and digest boundaries after final CDDL alignment.

Purpose: minimal response generated through pyMDOC-CBOR tooling. It is useful for inspecting `IssuerSignedItem`, tag-24 digest input, MSO, `issuerAuth`, `DeviceResponse`, and extracted SMART response JSON independent of real-platform HPKE capture.

Confirmed files include:

```text
fixtures/responses/pymdoc-minimal/manifest.json
fixtures/responses/pymdoc-minimal/input.json
fixtures/responses/pymdoc-minimal/smart-response.json
fixtures/responses/pymdoc-minimal/expected-walk.json
fixtures/responses/pymdoc-minimal/document.cbor
fixtures/responses/pymdoc-minimal/document.cbor.hex
fixtures/responses/pymdoc-minimal/document.diag
fixtures/responses/pymdoc-minimal/issuer-signed-item.cbor
fixtures/responses/pymdoc-minimal/issuer-signed-item.cbor.hex
fixtures/responses/pymdoc-minimal/issuer-signed-item.diag
fixtures/responses/pymdoc-minimal/issuer-signed-item-tag24.cbor
fixtures/responses/pymdoc-minimal/issuer-signed-item-tag24.cbor.hex
fixtures/responses/pymdoc-minimal/issuer-signed-item-tag24.diag
fixtures/responses/pymdoc-minimal/value-digest-input.cbor
fixtures/responses/pymdoc-minimal/value-digest-input.cbor.hex
fixtures/responses/pymdoc-minimal/value-digest-input.diag
fixtures/responses/pymdoc-minimal/mso.cbor
fixtures/responses/pymdoc-minimal/mso.cbor.hex
fixtures/responses/pymdoc-minimal/mso.diag
fixtures/responses/pymdoc-minimal/mso-tag24.cbor
fixtures/responses/pymdoc-minimal/mso-tag24.cbor.hex
fixtures/responses/pymdoc-minimal/mso-tag24.diag
fixtures/responses/pymdoc-minimal/issuer-auth.cbor
fixtures/responses/pymdoc-minimal/issuer-auth.cbor.hex
fixtures/responses/pymdoc-minimal/issuer-auth.diag
```

Byte boundaries to expose: `document.cbor` plaintext `DeviceResponse`, tag-24 `IssuerSignedItem`, `value-digest-input.cbor`, recomputed value digest, MSO, tag-24 MSO, `issuerAuth`, extracted `smart-response.json`, and expected walk. The manifest notes that `document.cbor` may contain nondeterministic ECDSA signature bytes; conformance tests should compare stable hashes only where the fixture explicitly provides them.

### D.5 `fixtures/responses/real-chrome-android-smart-checkin/`

Classification: diagnostic real-platform response capture; candidate conformance-support fixture for end-to-end same-device response opening and validation after final review.

Purpose: real Android Wallet response capture paired with D.3. It includes the Digital Credentials API result, direct `dcapiResponse`, HPKE `enc` and `cipherText`, session transcript, HPKE-opened `DeviceResponse`, issuer-signed item, MSO, device authentication, extracted SMART response, and inspection files.

Confirmed files include:

```text
fixtures/responses/real-chrome-android-smart-checkin/credential.json
fixtures/responses/real-chrome-android-smart-checkin/wallet-response.digital-credential.json
fixtures/responses/real-chrome-android-smart-checkin/submit.json
fixtures/responses/real-chrome-android-smart-checkin/metadata.json
fixtures/responses/real-chrome-android-smart-checkin/dcapi-response.cbor
fixtures/responses/real-chrome-android-smart-checkin/dcapi-response.cbor.hex
fixtures/responses/real-chrome-android-smart-checkin/dcapi-response.cbor.b64u
fixtures/responses/real-chrome-android-smart-checkin/dcapi-response-inspection.json
fixtures/responses/real-chrome-android-smart-checkin/hpke-enc.bin
fixtures/responses/real-chrome-android-smart-checkin/hpke-enc.bin.hex
fixtures/responses/real-chrome-android-smart-checkin/hpke-enc.bin.b64u
fixtures/responses/real-chrome-android-smart-checkin/hpke-ciphertext.bin
fixtures/responses/real-chrome-android-smart-checkin/hpke-ciphertext.bin.hex
fixtures/responses/real-chrome-android-smart-checkin/hpke-ciphertext.bin.b64u
fixtures/responses/real-chrome-android-smart-checkin/device-response.cbor
fixtures/responses/real-chrome-android-smart-checkin/device-response.cbor.hex
fixtures/responses/real-chrome-android-smart-checkin/device-response.cbor.b64u
fixtures/responses/real-chrome-android-smart-checkin/issuer-signed-item-tag24.cbor
fixtures/responses/real-chrome-android-smart-checkin/issuer-signed-item-tag24.cbor.hex
fixtures/responses/real-chrome-android-smart-checkin/issuer-signed-item-tag24.cbor.b64u
fixtures/responses/real-chrome-android-smart-checkin/value-digest.bin
fixtures/responses/real-chrome-android-smart-checkin/value-digest.bin.hex
fixtures/responses/real-chrome-android-smart-checkin/value-digest.bin.b64u
fixtures/responses/real-chrome-android-smart-checkin/mso.cbor
fixtures/responses/real-chrome-android-smart-checkin/mso.cbor.hex
fixtures/responses/real-chrome-android-smart-checkin/mso.cbor.b64u
fixtures/responses/real-chrome-android-smart-checkin/issuer-auth.cbor
fixtures/responses/real-chrome-android-smart-checkin/issuer-auth.cbor.hex
fixtures/responses/real-chrome-android-smart-checkin/issuer-auth.cbor.b64u
fixtures/responses/real-chrome-android-smart-checkin/device-authentication.cbor
fixtures/responses/real-chrome-android-smart-checkin/device-authentication.cbor.hex
fixtures/responses/real-chrome-android-smart-checkin/device-authentication.cbor.b64u
fixtures/responses/real-chrome-android-smart-checkin/session-transcript.cbor
fixtures/responses/real-chrome-android-smart-checkin/session-transcript.cbor.hex
fixtures/responses/real-chrome-android-smart-checkin/session-transcript.cbor.b64u
fixtures/responses/real-chrome-android-smart-checkin/smart-response.json
fixtures/responses/real-chrome-android-smart-checkin/smart-response.raw.json
fixtures/responses/real-chrome-android-smart-checkin/smart-response.expected.json
fixtures/responses/real-chrome-android-smart-checkin/response-inspection.json
fixtures/responses/real-chrome-android-smart-checkin/opened-response-inspection.json
fixtures/responses/real-chrome-android-smart-checkin/hpke-opened-response-inspection.json
fixtures/responses/real-chrome-android-smart-checkin/pymdoc-byte-check.json
```

Byte boundaries to expose: Digital Credentials API `data.response`, CBOR `dcapiResponse`, HPKE `enc`, HPKE ciphertext, HPKE plaintext `DeviceResponse`, issuer-signed item tag-24 bytes, value digest, MSO, `issuerAuth`, `DeviceAuthenticationBytes`, `deviceSignature` verification status through inspection, `SessionTranscript`, and extracted SMART response JSON. This fixture should be paired with D.3 for offline HPKE opening and §6.6 cross-validation against the original SMART request.

### D.6 `fixtures/responses/android-kotlin-generated/`

Classification: diagnostic generated Android/Kotlin response check material; status uncertain for conformance until a metadata file or manifest is added.

Purpose: generated response inspection material from Android/Kotlin response code. It appears useful for comparing Android responder output against pyMDOC byte checks and SMART response extraction, but this root currently lacks a manifest in the file listing reviewed for this attempt.

Confirmed files are:

```text
fixtures/responses/android-kotlin-generated/opened-response-inspection.json
fixtures/responses/android-kotlin-generated/pymdoc-byte-check.json
```

Byte boundaries to expose: inspection of opened response, digest id, namespace, element identifier, MSO digest comparison, COSE verification states, and extracted SMART response. Before promotion to conformance-vector status, add or verify metadata covering generation command, input request, keys, intended stability, PHI status, and expected pairing.

### D.7 `wallet-android/app/src/test/resources/test-vectors.json`

Classification: Android test-vector aggregate; candidate conformance-support material for request construction constants and session transcript derivation.

Purpose: checked-in Android test resources generated from TypeScript request-vector tooling. It records `doctype`, `namespace`, `responseElement`, `requestInfoKey`, request vector JSON strings and `deviceRequestHex`, a negative Mattr mDL request vector, and session transcript vectors.

Byte boundaries to expose: SMART request JSON text, `deviceRequestHex`, expected constants, rejection vectors, `encryptionInfoHex`, `encryptionInfoBase64Url`, `origin`, and `sessionTranscriptHex`. The session transcript vectors are especially useful for independent implementations because they bind the exact `encryptionInfo` base64url text string and origin into the SHA-256 handover.

### D.8 `fixtures/dcapi-requests/negative-mattr-mdl/`

Classification: negative vector / historical interoperability diagnostic.

Purpose: confirms that an `org-iso-mdoc` request for a non-SMART mDL `docType` is not a SMART Health Check-in request. It should be used to test rejection or non-selection behavior, not to infer SMART field names.

Confirmed file:

```text
fixtures/dcapi-requests/negative-mattr-mdl/metadata.json
```

### D.9 Fixture promotion guidance

A same-device fixture promoted to conformance-vector status should declare:

1. its conformance target and requirement references, such as request construction, `readerAuth`, transcript derivation, HPKE opening, MSO digest binding, device authentication, SMART response extraction, or §6.6 cross-validation;
2. whether it is synthetic generated material, real-platform capture, or historical capture;
3. whether it contains PHI, demo-only data, private keys, reader certificates, issuer keys, or HPKE recipient private keys;
4. which byte files are canonical comparison inputs and which inspection files are derived;
5. which ECDSA signatures, timestamps, nonces, random values, or HPKE outputs are deterministic for the vector;
6. whether included trust material is production, deployment-local, self-attested, demo, or test-only; and
7. whether the vector is intended to be accepted, rejected, or inspected only.

Real Chrome/Android captures are valuable because they demonstrate platform behavior, but they can be brittle as browser, Credential Manager, wallet, and demo-code versions evolve. Generated TypeScript and Android/Kotlin vectors are better candidates for stable conformance inputs when their randomness, keys, timestamps, and expected hashes are fixed. Historical captures should remain labeled historical unless refreshed against the current §8/App C rules and paired with current metadata.

## Organizer notes

Strengths:

- Aligns Appendix C with accepted §8 and T3.C byte-ladder vocabulary without introducing alternate carriers, HPKE parameters, trust semantics, or clinical semantics.
- Clearly labels CDDL as profile constraints/pseudo-CDDL where exact ISO/IEC 18013-5 base grammar is not imported.
- Preserves request carrier in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and response carrier in issuer-signed `smart_health_checkin_response` `elementValue`.
- Lists only fixture paths verified in the repository and classifies uncertain material cautiously.

Caveats:

- The pseudo-CDDL uses active implementation text-string map labels for readability. Final publication should reconcile this with the exact ISO/IEC 18013-5 CDDL import strategy.
- Duplicate document, duplicate namespace, and duplicate stable-element handling are not closed here. §8 validation implies selecting the accepted document/element, but conformance closure should decide whether duplicates are reject-always.
- Nonce length remains “at least 16 bytes, 32-byte default in active fixtures,” not a mandatory 32-byte rule.
- `android-kotlin-generated` lacks an obvious manifest in the reviewed file listing, so it remains diagnostic/uncertain.

Open issues:

- Decide whether digest id `0`, deterministic map ordering, or exact deterministic CBOR encoding profiles are mandatory for conformance vectors only or for all implementations.
- Decide whether real Chrome/Android captures should be promoted to conformance-support status or kept as diagnostic/historical after browser/platform behavior changes.
- Final Appendix D should add kiosk fixture entries after T4.D and should avoid mixing same-device and kiosk conformance labels.
- Final Appendix C should import or cite exact ISO/IEC 18013-5 CDDL names and any needed COSE_Key/COSE_Sign1 grammar.

Downstream dependencies:

- §11 security closure: replay/freshness, reduced-assurance origin UX, reader impersonation, plaintext fixture/debug handling, and clinical-source overclaiming.
- §13/conformance closure: registry entries, production-vs-test trust labels, authenticated-origin expectations, 32-byte nonce decision if any, duplicate handling, and fixture promotion rules.
- T6.C final fixture alignment: ensure generated vectors, Android resources, real captures, worked examples, and Appendix D labels remain synchronized.
