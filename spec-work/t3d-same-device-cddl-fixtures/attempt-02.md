# T3.D attempt 02 — same-device CDDL and fixture material

## Appendix C same-device CDDL and diagnostic structure

This appendix constrains the SMART Health Check-in portions of the same-device direct `org-iso-mdoc` flow defined in §8. ISO/IEC 18013-5 base structures remain the source of truth for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key` except where this appendix profiles a field value, byte boundary, or extension point for SMART Health Check-in.

The CDDL below is intentionally profile CDDL and pseudo-CDDL. It names logical fields and byte boundaries used by §8 and Appendix E, but it does not claim to reproduce every ISO map label, optional field, certificate field, validity-info field, or COSE grammar. Implementers MUST apply the exact ISO/IEC 18013-5 and COSE encodings when producing or validating wire bytes. If this appendix appears to conflict with §8, §8 controls.

### C.same-device.1 Digital Credentials API JSON wrapper

The W3C Digital Credentials API request and result are JSON wrappers around CBOR byte strings encoded as base64url without padding. They are not themselves CDDL structures.

A Verifier implementing the same-device flow SHALL invoke `org-iso-mdoc` with request data containing both `deviceRequest` and `encryptionInfo`:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
    "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
  }
}
```

A Wallet/Responder implementing the same-device flow SHALL return a result equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

`data.deviceRequest`, `data.encryptionInfo`, and `data.response` are JSON strings carrying encoded CBOR bytes. A processor MUST NOT interpret those JSON strings as plaintext SMART request or SMART response JSON.

### C.same-device.2 Request-side CBOR profile

The same-device request uses ISO `DeviceRequest` version `"1.0"`, with one SMART Health Check-in `DocRequest` in the core profile. Multiple `DocRequest` entries can exist in the underlying ISO structure, but the SMART profile accepts a `DocRequest` only when its enclosed `ItemsRequest` has the profile values below.

```cddl
; Profile pseudo-CDDL. ISO/IEC 18013-5 defines the exact base structures.

smart-device-request = device-request .within iso-device-request

; Logical profile constraints on the ISO DeviceRequest map:
smart-device-request-constraints = {
  version: "1.0",
  docRequests: [+ smart-doc-request]
}

smart-doc-request = doc-request .within iso-doc-request

; DocRequest.itemsRequest is CBOR tag 24 containing the CBOR serialization
; of ItemsRequest. These exact tagged bytes are ItemsRequestBytes.
smart-doc-request-constraints = {
  itemsRequest: tag24-items-request,
  ? readerAuth: cose-sign1-reader-auth
}

tag24-items-request = #6.24(bstr .cbor smart-items-request)

smart-items-request = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": bool
    }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": smart-request-json-text,
    * tstr => any
  },
  * tstr => any
}

smart-request-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinRequest
```

A Verifier SHALL place the SMART request JSON text only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT accept dynamic mdoc element names, kiosk wrapper fields, archived claim-name encodings, or other request locations as the SMART Health Check-in 1.0 same-device request carrier.

The requested namespace entry requests the stable element `smart_health_checkin_response`; the boolean is the ISO `intentToRetain` value. It is not Holder consent, not Requester identity, and not a clinical selector.

### C.same-device.3 `readerAuth` profile

`readerAuth` is optional in the core version 1.0 same-device flow unless a deployment profile requires it. When present, it is per-`DocRequest.readerAuth`; `DeviceRequest` version `"1.1"` `readerAuthAll` is not the SMART Health Check-in 1.0 core mechanism.

```cddl
; Logical detached-payload input, encoded and then tag-24 wrapped.
reader-authentication = [
  "ReaderAuthentication",
  session-transcript-bytes,
  tag24-items-request
]

reader-authentication-bytes = #6.24(bstr .cbor reader-authentication)

; COSE exact grammar is defined by COSE and ISO. Profile constraints:
cose-sign1-reader-auth = cose-sign1 .within cose-sign1
```

A Verifier that includes `readerAuth` SHALL create a detached `COSE_Sign1` with protected header `{1: -7}` for ES256, serialized payload `null`, empty external AAD, and `ReaderAuthenticationBytes` as the detached payload. For this core profile, `readerAuth` SHALL include reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate. A Wallet/Responder that verifies `readerAuth` SHALL verify the signature over the exact `ReaderAuthenticationBytes`, including the exact tag-24 `ItemsRequest` bytes and exact `SessionTranscript` bytes for the presentation session.

### C.same-device.4 `encryptionInfo` and `SessionTranscript` carrier

The direct DC API `encryptionInfo` value is CBOR, encoded in the DC API request as base64url without padding.

```cddl
encryption-info = [
  "dcapi",
  {
    "nonce": bstr,
    "recipientPublicKey": p256-ec2-cose-key
  }
]

p256-ec2-cose-key = {
   1: 2,       ; kty = EC2
  -1: 1,       ; crv = P-256
  -2: bstr,    ; x coordinate
  -3: bstr,    ; y coordinate
  * int => any
}
```

A Verifier SHALL use a fresh unpredictable nonce. Implementations SHOULD use at least 16 bytes of nonce entropy; active fixtures use 32 bytes. This appendix does not make 32 bytes mandatory for core conformance unless a later conformance-vector profile explicitly adopts that tighter size.

The direct `dcapi` `SessionTranscript` binds the exact unpadded `data.encryptionInfo` base64url string and the authenticated origin or deployment-approved origin-equivalent string:

```cddl
dcapi-info = [ encryption-info-base64url: tstr, origin: tstr ]
dcapi-handover = [ "dcapi", sha256-dcapi-info: bstr ]
session-transcript = [ null, null, dcapi-handover ]
```

The SHA-256 input is the exact CBOR serialization of `dcapi-info`. The `SessionTranscript` bytes are the exact CBOR serialization of `session-transcript`. Wallets/Responders and Verifiers MUST NOT derive the origin from SMART request fields such as `purpose`, item display text, selector URLs, request ids, kiosk metadata, callback-looking strings, or returned Artifact content.

### C.same-device.5 Response-side CBOR profile

The SMART response is carried as the `elementValue` of an issuer-signed item in namespace `org.smarthealthit.checkin` with element identifier `smart_health_checkin_response`.

```cddl
smart-device-response = device-response .within iso-device-response

smart-device-response-constraints = {
  version: "1.0",
  documents: [+ smart-document],
  status: 0,
  * any => any
}

smart-document = document .within iso-document

smart-document-constraints = {
  docType: "org.smarthealthit.checkin.1",
  issuerSigned: smart-issuer-signed,
  deviceSigned: smart-device-signed,
  * any => any
}

smart-issuer-signed = {
  nameSpaces: {
    "org.smarthealthit.checkin": [+ tag24-smart-issuer-signed-item]
  },
  issuerAuth: cose-sign1-issuer-auth,
  * any => any
}

tag24-smart-issuer-signed-item = #6.24(bstr .cbor smart-issuer-signed-item)

smart-issuer-signed-item = {
  digestID: uint,
  random: bstr,
  elementIdentifier: "smart_health_checkin_response",
  elementValue: smart-response-json-text,
  * any => any
}

smart-response-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinResponse
```

A Wallet/Responder SHALL compute the MSO value digest over the complete tag-24-wrapped `IssuerSignedItem` bytes, not over diagnostic notation, not over only the decoded inner map, and not over only `elementValue`. The `IssuerSignedItem.digestID` SHALL identify the corresponding entry in `MSO.valueDigests["org.smarthealthit.checkin"]`. This appendix does not make digest id `0` a core constant; a conformance fixture MAY choose a deterministic digest id convention if clearly labeled.

### C.same-device.6 MSO, `issuerAuth`, and device authentication references

The SMART profile reuses ISO/IEC 18013-5 MSO, issuer authentication, value digest, device key, and device authentication structures. The profile constraints are:

```cddl
smart-mso-constraints = {
  docType: "org.smarthealthit.checkin.1",
  digestAlgorithm: "SHA-256",
  valueDigests: {
    "org.smarthealthit.checkin": {
      + uint => bstr .size 32
    }
  },
  deviceKeyInfo: {
    deviceKey: cose-key,
    * any => any
  },
  * any => any
}

; Logical value signed by the device, then tag-24 wrapped as defined by ISO.
device-authentication = [
  "DeviceAuthentication",
  session-transcript-bytes,
  "org.smarthealthit.checkin.1",
  tag24-device-name-spaces
]

tag24-device-name-spaces = #6.24(bstr .cbor device-name-spaces)
device-name-spaces = { * tstr => any }
```

`issuerAuth` and the device signature use `COSE_Sign1` with ES256 (`alg` `-7`) for the core profile. The `issuerAuth` payload is the tag-24-wrapped MSO bytes under the active profile, subject to ISO-compatible refinements in a later conformance profile. `DeviceAuthentication` uses the same `SessionTranscript` bytes that bind `encryptionInfo` and origin. In the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element remains issuer-signed; it is not moved into `DeviceNameSpaces` as a substitute for the issuer-signed element.

Successful MSO validation, value-digest validation, device-key proof, HPKE opening, or `requestId` matching does not create clinical-source provenance for unsigned raw FHIR JSON. Clinical-source trust comes from the Artifact payload, such as SMART Health Card signatures or accepted provenance, and from deployment policy.

### C.same-device.7 HPKE and `dcapiResponse`

The Wallet/Responder encrypts CBOR `DeviceResponse` bytes using HPKE base mode:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

The direct DC API response CBOR value is:

```cddl
dcapi-response = [
  "dcapi",
  {
    "enc": bstr,
    "cipherText": bstr
  }
]
```

A Wallet/Responder SHALL return `dcapiResponse` as base64url-without-padding CBOR in the Digital Credentials API result `data.response`. It SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a different response carrier, a different HPKE suite, or non-empty HPKE AAD for the core version 1.0 same-device flow.

### C.same-device.8 Byte boundaries exposed by CDDL/profile examples

Appendix D fixtures and Appendix E byte ladders should expose these byte boundaries when available:

1. SMART request JSON text as carried in `requestInfo`.
2. decoded `ItemsRequest` CBOR and tag-24 `ItemsRequestBytes`.
3. CBOR `DeviceRequest` and its base64url wrapper string.
4. CBOR `encryptionInfo`, its base64url wrapper string, `dcapiInfo`, and `SessionTranscript` bytes.
5. optional `ReaderAuthenticationBytes`, `readerAuth` `COSE_Sign1`, reader leaf certificate or `x5chain` material, and signature result.
6. SMART response JSON text.
7. tag-24 `IssuerSignedItem`, MSO `valueDigests` input and digest output, MSO bytes, and `issuerAuth`.
8. tag-24 `DeviceNameSpaces`, `DeviceAuthenticationBytes`, and device signature.
9. CBOR `DeviceResponse` plaintext.
10. HPKE `enc`, HPKE ciphertext, CBOR `dcapiResponse`, and the Digital Credentials API result wrapper.
11. verifier inspection outputs that bind the extracted SMART response back to the original SMART request under §6.6.

## Appendix D same-device fixture index material

Appendix D is the fixture index. Fixture labels are conformance labels only when Appendix D or a conformance profile explicitly says so. Historical captures and diagnostic fixtures are still useful, but their presence in the repository does not by itself make their byte-for-byte quirks mandatory for all implementations.

### D.same-device.1 Classification labels

Appendix D should use these labels consistently:

| Label | Meaning |
| --- | --- |
| **Conformance vector** | A stable vector intended for automated conformance testing of one or more requirements. It must identify the exact requirements or byte boundaries it tests and must avoid depending on demo-only secrets except where the vector is explicitly a test key fixture. |
| **Diagnostic vector** | A fixture intended for debugging, independent implementation comparison, byte-ladder explanation, or regression testing. It can contain implementation-specific or nondeterministic material and should not be treated as a universal conformance requirement. |
| **Historical capture** | A real or older implementation capture preserved for evidence, investigation, or compatibility history. It can be promoted only after review against current §8, Appendix C, and conformance rules. |
| **Negative vector** | A fixture that is expected to be rejected or ignored, with the rejection reason stated. |

Fixtures containing intentionally public test-only private keys, demo certificates, demo issuer material, or debug plaintext should be marked non-production. Such material MUST NOT be reused as production cryptographic material.

### D.same-device.2 Confirmed same-device fixture roots

The following roots exist in the repository and are in scope for same-device Appendix D material:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
fixtures/responses/android-kotlin-generated/
wallet-android/app/src/test/resources/test-vectors.json
```

The root `fixtures/dcapi-requests/negative-mattr-mdl/` also exists and appears to be a negative non-SMART mDL request fixture. It is useful for rejection tests but is not a positive SMART Health Check-in same-device fixture.

### D.same-device.3 Generated TypeScript request vectors

Root:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
```

Purpose: synthetic deterministic request material generated from the TypeScript protocol builder. This class is appropriate for request-construction conformance or regression tests when the generation parameters are fixed.

Expected exposed boundaries include:

- `request.json` / `navigator-credentials-get.arg.json` as the Digital Credentials API invocation shape;
- `device-request.b64u` and `device-request.cbor.hex` as the request byte wrapper;
- `encryption-info.b64u` and `encryption-info.cbor.hex` as the HPKE recipient information;
- `inspection.json` as decoded request structure;
- `smart-request.expected.json` as the expected clinical request object; and
- `recipient-public.jwk.json` / `recipient-private.jwk.json` as test-only HPKE key material when offline response-opening tests need it.

Recommended Appendix D label: **conformance vector candidate** for unsigned request construction, `requestInfo` placement, stable element request, `DeviceRequest.version == "1.0"`, `encryptionInfo` shape, and SessionTranscript input derivation if the exact origin and base64url strings are fixed. Mark any private key material as intentionally public test-only material.

### D.same-device.4 Generated TypeScript `readerAuth` request vectors

Root:

```text
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
```

Purpose: synthetic deterministic request material generated from the TypeScript protocol builder with per-`DocRequest.readerAuth` present.

Expected exposed boundaries include the unsigned request boundaries from D.same-device.3 plus:

- `items-request-tag24.cbor` as the exact detached request bytes;
- `session-transcript.cbor` as the exact transcript bytes;
- `reader-auth.cbor` as detached `COSE_Sign1`;
- `reader-certificate.der` and `reader-public.jwk.json` as test reader material; and
- metadata identifying `readerAuth.present == true`.

Recommended Appendix D label: **conformance vector candidate** for optional `readerAuth` construction and verification, including ES256 protected header, null payload, empty external AAD, `ReaderAuthenticationBytes`, and x5chain label 33 with at least the leaf certificate. It should be labeled test-only for the demo reader certificate and keys, and it should not imply that core deployments must require `readerAuth`.

### D.same-device.5 Real Chrome/Android same-device request capture

Root:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
```

Purpose: real browser / Android Credential Manager / Wallet request capture for the current direct `org-iso-mdoc` path using demo data. This fixture demonstrates that `requestInfo` survives the platform path and that the platform-origin binding can be reproduced.

Expected exposed boundaries include:

- `navigator-credentials-get.arg.json` / `request.json` as the browser invocation;
- `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, and `device-request.diag`;
- `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request.decoded.json`, and `items-request-tag24.cbor`;
- `request-info.json`, `smart-request.raw.json`, `smart-request.json`, `smart-request.expected.json`, and `smart-request.hydrated.json`;
- `requested-element.txt`;
- `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, and `encryption-info.diag`;
- `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.diag`;
- `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, and `reader-auth-detached-payload.cbor.hex`; and
- `credential-manager-request.json`, `recipient-public.jwk.json`, and the intentionally public test-only `recipient-private.jwk.json` when paired response opening is supported.

Recommended Appendix D label: **diagnostic vector** and **real-platform capture**. It may become a conformance vector only for byte boundaries explicitly selected by the conformance profile. Keep implementation-specific facts such as package name, localhost origin, demo reader certificate, and included private key test-only and non-production. If later §13 makes authenticated origin, nonce length, or duplicate handling testable, this capture should be re-reviewed before promotion.

### D.same-device.6 Minimal pyMDOC response fixture

Root:

```text
fixtures/responses/pymdoc-minimal/
```

Purpose: minimal independently generated response material for inspecting issuer-signed SMART response carriage, MSO value digest input, `issuerAuth`, and decoded document structure without requiring a real platform capture.

Expected exposed boundaries include:

- `smart-response.json`;
- `issuer-signed-item.cbor`, `issuer-signed-item.cbor.hex`, `issuer-signed-item.diag`;
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.diag`;
- `value-digest-input.cbor`, `value-digest-input.cbor.hex`, `value-digest-input.diag`;
- `mso.cbor`, `mso.cbor.hex`, `mso.diag`;
- `mso-tag24.cbor`, `mso-tag24.cbor.hex`, `mso-tag24.diag`;
- `issuer-auth.cbor`, `issuer-auth.cbor.hex`, `issuer-auth.diag`;
- `document.cbor`, `document.cbor.hex`, `document.diag`;
- `expected-walk.json`, `input.json`, and `manifest.json`.

Recommended Appendix D label: **diagnostic vector** and **conformance vector candidate** for issuer-signed item digest boundaries if deterministic fields are fixed. Because `document.cbor` may contain nondeterministic ECDSA signature bytes, conformance tests should target stable decoded fields and explicitly named digest inputs unless the vector pins exact bytes.

### D.same-device.7 Real Chrome/Android same-device response capture

Root:

```text
fixtures/responses/real-chrome-android-smart-checkin/
```

Purpose: real Android Wallet response capture paired with the real request capture. It includes the encrypted Digital Credentials API response, HPKE-opened `DeviceResponse`, issuer/device proof material, and extracted SMART response using demo data.

Expected exposed boundaries include:

- `wallet-response.digital-credential.json` / `credential.json` as the platform result;
- `dcapi-response.cbor`, `dcapi-response.cbor.hex`, `dcapi-response.cbor.b64u`;
- `hpke-enc.bin`, `hpke-enc.bin.hex`, `hpke-enc.bin.b64u`;
- `hpke-ciphertext.bin`, `hpke-ciphertext.bin.hex`, `hpke-ciphertext.bin.b64u`;
- `device-response.cbor`, `device-response.cbor.hex`, `device-response.cbor.b64u`;
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.cbor.b64u`;
- `value-digest.bin`, `value-digest.bin.hex`, `value-digest.bin.b64u`;
- `mso.cbor`, `mso.cbor.hex`, `mso.cbor.b64u`;
- `issuer-auth.cbor`, `issuer-auth.cbor.hex`, `issuer-auth.cbor.b64u`;
- `device-authentication.cbor`, `device-authentication.cbor.hex`, `device-authentication.cbor.b64u`;
- `session-transcript.cbor`, `session-transcript.cbor.hex`, `session-transcript.cbor.b64u`;
- `smart-response.raw.json`, `smart-response.json`, and `smart-response.expected.json`;
- `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, and `pymdoc-byte-check.json`; and
- `metadata.json` / `submit.json` for capture context.

Recommended Appendix D label: **diagnostic vector** and **real-platform capture**. It is a strong candidate for conformance tests of response-opening, HPKE parameters, `dcapiResponse` shape, MSO digest binding, device authentication, and response extraction only after Appendix D states which platform-specific and demo-material fields are normative for the vector. The paired request fixture contains an intentionally public test-only HPKE private key; Appendix D should explicitly warn never to reuse it.

### D.same-device.8 Android Kotlin generated response inspection

Root:

```text
fixtures/responses/android-kotlin-generated/
```

Purpose: currently limited Android-generated response inspection artifacts. The root exists and contains response-inspection material, but it does not expose the full byte ladder visible in the real Chrome/Android response capture.

Expected exposed boundaries, based on current files, include:

- `opened-response-inspection.json`; and
- `pymdoc-byte-check.json`.

Recommended Appendix D label: **diagnostic vector** unless and until a manifest or full byte set is added. Do not make this root a conformance vector without documenting its generation inputs and required byte boundaries.

### D.same-device.9 Android app test vectors

Path:

```text
wallet-android/app/src/test/resources/test-vectors.json
```

Purpose: Android test resource containing generated request vectors, rejection vectors, and SessionTranscript vectors used by Android tests and cross-implementation checks.

Expected exposed boundaries include:

- fixed identifiers: `doctype`, `namespace`, `responseElement`, and `requestInfoKey`;
- `requestVectors[]` with SMART request JSON text and `deviceRequestHex` values;
- `rejectionVectors[]`, including non-SMART mDL material expected not to match the SMART profile; and
- `sessionTranscriptVectors[]` with fixed origins, `encryptionInfoHex`, `encryptionInfoBase64Url`, and expected `sessionTranscriptHex`.

Recommended Appendix D label: **conformance vector candidate** for constants, SMART request embedding, and SessionTranscript derivation. The fixed-nonce transcript vectors are appropriate as deterministic byte tests but MUST NOT be read as requiring fixed nonces or making 32-byte nonces mandatory outside the labeled vector profile.

### D.same-device.10 Negative non-SMART mDL fixture

Root:

```text
fixtures/dcapi-requests/negative-mattr-mdl/
```

Purpose: negative request material for a captured mDL request that does not use the SMART Health Check-in `docType`, namespace, stable response element, or requestInfo key.

Recommended Appendix D label: **negative vector**. It should be used to test that matchers and parsers do not treat arbitrary `org-iso-mdoc` mDL requests as SMART Health Check-in requests. It is not a SMART same-device positive fixture.

### D.same-device.11 Fixture-index guidance for conformance vs diagnostics

Appendix D should not make every checked-in byte mandatory. Recommended conformance choices are:

1. **Core positive request conformance:** use generated TypeScript request vectors to test `DeviceRequest.version`, tag-24 `ItemsRequest`, `docType`, namespace, stable element, `requestInfo` key, SMART request JSON parse, `encryptionInfo` shape, and exact SessionTranscript derivation.
2. **Optional readerAuth conformance:** use generated TypeScript readerAuth vectors to test detached ES256 `COSE_Sign1`, null payload, empty external AAD, label 33 `x5chain`, and binding to exact `SessionTranscript` and tag-24 `ItemsRequestBytes`.
3. **Response structural conformance:** use `pymdoc-minimal` and/or a selected real response capture to test `IssuerSignedItem.elementValue`, tag-24 digest input, MSO value digest, `issuerAuth`, `DeviceAuthentication`, device signature, `DeviceResponse`, and SMART response extraction.
4. **HPKE/DC API response conformance:** use a fixture with disclosed test-only recipient private key and retained `encryptionInfo` string to test HPKE open with the required suite, `info = SessionTranscript bytes`, empty AAD, and `dcapiResponse = ["dcapi", {"enc", "cipherText"}]`.
5. **Real-platform diagnostics:** keep real Chrome/Android request and response captures as diagnostic/historical evidence unless the conformance profile explicitly pins the captured origin string, browser/platform behavior, demo certificate, nonce length, and fixture keys.
6. **Negative matching:** use non-SMART mDL material to ensure implementations do not accept unrelated mdoc requests or responses as SMART Health Check-in.

Appendix D should state, for each conformance vector, whether validation is byte-exact or structure-exact. Byte-exact vectors compare named byte files or hex/base64url strings. Structure-exact vectors decode and compare logical fields while allowing nondeterministic signatures, random values, map ordering, certificate metadata, or implementation-specific diagnostics to vary.

## Organizer notes

### Strengths

- Aligns Appendix C with accepted §8 and Appendix E/F/G terminology without creating a second same-device protocol.
- Keeps ISO/IEC 18013-5 base structures authoritative and labels the CDDL as profile pseudo-CDDL where exact labels are not confirmed.
- Preserves the accepted request carrier, response carrier, `DeviceRequest` version, optional per-`DocRequest.readerAuth`, exact `encryptionInfo` string transcript binding, HPKE suite, empty AAD, and raw-FHIR provenance limitation.
- Names only fixture roots verified in this repository and separates conformance-vector candidates from diagnostic and historical captures.

### Caveats

- Exact ISO map labels and complete CDDL for `DeviceRequest`, `DocRequest`, `DeviceResponse`, MSO, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key` still need final confirmation against the chosen ISO/CDDL reference text.
- The fixture labels here are recommendations for organizer synthesis. Final Appendix D should decide which candidates become conformance vectors and which remain diagnostics.
- `fixtures/responses/android-kotlin-generated/` currently has limited artifacts and should not be promoted without a manifest and generation notes.
- Real-platform captures include demo keys, demo certificates, localhost origin, and implementation-specific context. They are valuable evidence but should not silently define production trust or browser requirements.

### Open issues

- Decide whether duplicate documents, duplicate namespaces, or duplicate `smart_health_checkin_response` elements are rejected by core conformance, by deployment profile, or by test-vector policy.
- Decide whether a fixed nonce size, such as 32 bytes, is a conformance-vector profile rule while preserving the core minimum of at least 16 bytes of entropy.
- Decide whether digest id `0` is only a fixture convention or a profile-level deterministic encoding convention.
- Decide whether Appendix C should import a formal ISO CDDL module, cite an external CDDL source, or keep the profile pseudo-CDDL style.
- Decide how much fixture plaintext and intentionally public private-key material Appendix D should permit in published conformance bundles.

### Downstream dependencies

- §11 security should consume the fixture/plaintext-key caveats, replay/freshness decisions, origin spoofing risks, reader impersonation handling, and raw-FHIR provenance warning.
- §13 conformance/registries should decide which identifiers and vector profiles are testable core requirements.
- T6 fixture and worked-example alignment should refresh any historical capture whose clinical request or response no longer matches final §§5-8.
