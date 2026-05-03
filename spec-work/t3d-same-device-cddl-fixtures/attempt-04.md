# T3.D attempt 04 — same-device CDDL and fixture material

## Appendix C. Same-device CBOR/CDDL profile material

This appendix describes the CBOR, COSE, HPKE, and Digital Credentials API structures used by the same-device direct `org-iso-mdoc` flow in §8. It profiles ISO/IEC 18013-5-style mdoc structures and the W3C Digital Credentials API direct response wrapper for SMART Health Check-in. It does not define a second presentation binding, a second SMART request carrier, a second SMART response carrier, a kiosk wrapper, new HPKE parameters, new trust semantics, or new clinical semantics.

Where this appendix names ISO/IEC 18013-5 structures such as `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceAuthentication`, `COSE_Sign1`, and `COSE_Key`, those structures are reused from the base mdoc specifications except where §8 and this profile constrain their values. The pseudo-CDDL below is intentionally profile CDDL: it identifies SMART Health Check-in constraints and byte boundaries. It is not a complete replacement for the ISO/IEC 18013-5 CDDL, and it does not claim exactness for ISO map labels or optional fields not confirmed in the active profile.

### C.x.1 Constants

The same-device profile uses these fixed values:

```cddl
smart-mdoc-protocol = "org-iso-mdoc"
smart-doc-type = "org.smarthealthit.checkin.1"
smart-namespace = "org.smarthealthit.checkin"
smart-response-element = "smart_health_checkin_response"
smart-request-info-key = "org.smarthealthit.checkin.request"
dcapi-label = "dcapi"
```

A same-device Verifier SHALL use these values when constructing the §8 direct `org-iso-mdoc` request. A Wallet/Responder SHALL use these values when identifying a SMART Health Check-in request and constructing the returned mdoc document.

### C.x.2 Digital Credentials API request JSON wrapper

The W3C Digital Credentials API request wrapper is JSON, not CBOR or CDDL. For this profile the Verifier invokes a request equivalent to:

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

`data.deviceRequest` and `data.encryptionInfo` are base64url-without-padding strings. `data.deviceRequest` encodes the CBOR `DeviceRequest`. `data.encryptionInfo` encodes the CBOR `encryptionInfo` value in C.x.5. The Verifier SHALL preserve the exact `data.encryptionInfo` base64url string because §8.3 and Appendix E bind that text string into the `SessionTranscript`.

### C.x.3 `DeviceRequest`, `DocRequest`, tag-24 `ItemsRequest`, and `requestInfo`

The active profile uses `DeviceRequest.version` exactly `"1.0"`, with one or more ISO `DocRequest` entries. A conforming SMART Health Check-in request contains a `DocRequest` whose tag-24 `itemsRequest` decodes to an `ItemsRequest` for `org.smarthealthit.checkin.1`.

Pseudo-CDDL, using text-string map labels as shown by the active fixtures and implementation:

```cddl
; Profile constraint over ISO DeviceRequest, not full ISO CDDL.
smart-device-request = {
  "version" => "1.0",
  "docRequests" => [ + smart-doc-request ],
  * tstr => any
}

smart-doc-request = {
  "itemsRequest" => encoded-cbor smart-items-request,
  ? "readerAuth" => cose-sign1-reader-auth,
  * tstr => any
}

encoded-cbor<T> = #6.24(bstr) ; bstr contains CBOR(T)

smart-items-request = {
  "docType" => smart-doc-type,
  "nameSpaces" => {
    smart-namespace => {
      smart-response-element => bool ; mdoc intentToRetain
    }
  },
  "requestInfo" => {
    smart-request-info-key => smart-request-json-tstr,
    * tstr => any
  },
  * tstr => any
}

smart-request-json-tstr = tstr ; UTF-8 JSON text for SmartHealthCheckinRequest
```

The SMART request carrier is only `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. The value SHALL be a CBOR text string containing the SMART request serialized as UTF-8 JSON text. It is not a CBOR map form of the SMART request and not base64url-encoded JSON. A Wallet/Responder SHALL NOT treat dynamic mdoc element names, archived compressed-element experiments, kiosk wrapper fields, or other `requestInfo` keys as version 1.0 SMART request carriers.

The `nameSpaces` boolean is the mdoc `intentToRetain` value for the requested response element. It is not Holder consent, not a retention authorization, and not a clinical request item.

### C.x.4 Optional `readerAuth`

Core SMART Health Check-in 1.0 uses optional per-`DocRequest.readerAuth`. It does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core reader-authentication mechanism.

When present, `readerAuth` is a detached `COSE_Sign1` over:

```cddl
reader-authentication = encoded-cbor [
  "ReaderAuthentication",
  session-transcript,        ; exact CBOR SessionTranscript value from §8.3
  encoded-cbor smart-items-request
]
```

The serialized `COSE_Sign1` payload field SHALL be `null`. The protected header SHALL contain COSE algorithm label `1` with ES256 value `-7`. The COSE Signature1 structure uses empty external AAD and the tag-24 `ReaderAuthenticationBytes` above as detached payload. The `COSE_Sign1` SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Trust anchors, path validation, revocation, display names, and policy acceptance remain deployment-profile matters under §7.

Pseudo-CDDL for the relevant profile shape:

```cddl
cose-sign1-reader-auth = [
  protected: bstr .cbor { 1 => -7, * int => any },
  unprotected: { 33 => x5chain, * int => any },
  payload: null,
  signature: bstr
]

x5chain = [ + bstr ] / bstr ; DER certificate bytes; at least leaf certificate
```

A Wallet/Responder that supports or relies on reader authentication SHALL verify the signature over the exact `ReaderAuthenticationBytes`, including the same `SessionTranscript` and the exact tag-24 `ItemsRequest` bytes. It SHALL distinguish absent, syntactically invalid, cryptographically failed, cryptographically valid but untrusted, and trusted reader-authentication states.

### C.x.5 `encryptionInfo` and `SessionTranscript` carrier

The direct Digital Credentials API `encryptionInfo` value is CBOR:

```cddl
smart-encryption-info = [
  "dcapi",
  {
    "nonce" => bstr,
    "recipientPublicKey" => p256-ec2-cose-key,
    * tstr => any
  }
]

p256-ec2-cose-key = {
   1 => 2,      ; kty = EC2
  -1 => 1,      ; crv = P-256
  -2 => bstr,   ; x-coordinate
  -3 => bstr,   ; y-coordinate
  * int => any
}
```

A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. This appendix does not make 32 bytes mandatory for all conforming requests: active TypeScript defaults to 32 bytes but enforces only at least 16 bytes. A conformance-vector profile MAY require 32-byte nonces for deterministic fixture comparability if that decision is made in Appendix D, Appendix A, or a deployment profile.

The `SessionTranscript` is the ISO-style session transcript value constrained by §8.3:

```cddl
session-transcript = [
  null,
  null,
  [ "dcapi", bstr .size 32 ] ; SHA-256(CBOR([encryptionInfoBase64Url, origin]))
]
```

The hash input is the exact CBOR serialization of `[encryptionInfoBase64Url, origin]`, where `encryptionInfoBase64Url` is the exact unpadded base64url text from the request JSON and `origin` is the authenticated origin or deployment-approved origin-equivalent supplied by the Browser / User Agent or platform. Neither value is derived from the SMART request JSON.

### C.x.6 Digital Credentials API result and direct `dcapiResponse`

The Digital Credentials API result wrapper is JSON:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

The CBOR `dcapiResponse` inside `data.response` is:

```cddl
smart-dcapi-response = [
  "dcapi",
  {
    "enc" => bstr,
    "cipherText" => bstr,
    * tstr => any
  }
]
```

`enc` is the HPKE encapsulated public key for DHKEM(P-256, HKDF-SHA256). Active fixtures encode it as a 65-byte uncompressed P-256 point. `cipherText` is the AES-128-GCM ciphertext and authentication tag over `CBOR(DeviceResponse)`.

The Wallet/Responder SHALL use HPKE base mode with:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

### C.x.7 `DeviceResponse` subset and stable SMART response element

The returned mdoc response reuses ISO `DeviceResponse`, `Document`, `issuerSigned`, `deviceSigned`, `MobileSecurityObject`, and device-authentication structures. The profile-constrained subset is:

```cddl
smart-device-response = {
  "version" => "1.0",
  "documents" => [ + smart-document ],
  "status" => uint,
  * tstr => any
}

smart-document = {
  "docType" => smart-doc-type,
  "issuerSigned" => smart-issuer-signed,
  "deviceSigned" => smart-device-signed,
  * tstr => any
}

smart-issuer-signed = {
  "nameSpaces" => {
    smart-namespace => [ + encoded-cbor smart-issuer-signed-item ]
  },
  "issuerAuth" => cose-sign1-issuer-auth,
  * tstr => any
}

smart-issuer-signed-item = {
  "digestID" => uint,
  "random" => bstr,
  "elementIdentifier" => smart-response-element,
  "elementValue" => smart-response-json-tstr,
  * tstr => any
}

smart-response-json-tstr = tstr ; UTF-8 JSON text for SmartHealthCheckinResponse
```

A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`. The SMART response is not returned in `requestInfo`, not returned as plaintext Digital Credentials API JSON, and not moved into `DeviceNameSpaces` as a substitute for the issuer-signed element.

The `elementValue` text string contains the SMART response JSON defined by §6. Its `requestId` SHALL equal the accepted SMART request `id`, and a Verifier SHALL apply §6.6 cross-validation after extracting the JSON.

### C.x.8 MSO and value digest references

The Mobile Security Object is the ISO mdoc MSO constrained by the SMART document type and namespace. The profile-relevant conditions are:

```cddl
smart-mso-profile = {
  "version" => tstr,
  "digestAlgorithm" => "SHA-256",
  "docType" => smart-doc-type,
  "valueDigests" => {
    smart-namespace => {
      + uint => bstr .size 32
    },
    * tstr => any
  },
  "deviceKeyInfo" => {
    "deviceKey" => p256-ec2-cose-key,
    * tstr => any
  },
  "validityInfo" => any,
  * tstr => any
}
```

For each disclosed SMART response `IssuerSignedItem`, the item `digestID` SHALL identify the corresponding digest in `MSO.valueDigests["org.smarthealthit.checkin"]`. The digest value SHALL be `SHA-256` over the complete tag-24-wrapped `IssuerSignedItem` bytes, not over the decoded map alone and not over `elementValue` alone. Active Android fixtures use digest id `0` for the single response item, but this appendix does not make `0` a universal protocol constant unless a future conformance-vector profile does so.

`issuerAuth` is a `COSE_Sign1` over the tag-24-wrapped MSO bytes according to the mdoc rules used by §8. It uses ES256 (`alg` `-7`) in the core profile. Issuer trust is evaluated under §7.3 and deployment policy; successful structural and signature validation does not by itself establish production issuer trust.

### C.x.9 `DeviceAuthentication`, `DeviceNameSpaces`, and device signature

Device authentication is bound to the same session transcript used for HPKE and optional reader authentication:

```cddl
device-authentication = encoded-cbor [
  "DeviceAuthentication",
  session-transcript,
  smart-doc-type,
  encoded-cbor device-name-spaces
]

device-name-spaces = { * tstr => any }

smart-device-signed = {
  "nameSpaces" => encoded-cbor device-name-spaces,
  "deviceAuth" => {
    "deviceSignature" => cose-sign1-device-signature,
    * tstr => any
  },
  * tstr => any
}
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. A Verifier SHALL verify the device signature using `MSO.deviceKeyInfo.deviceKey` and the expected `DeviceAuthentication` value for the same `SessionTranscript`, `docType`, and tag-24 `DeviceNameSpaces` bytes.

### C.x.10 COSE and key references

This profile uses COSE structures rather than redefining them. Profile constraints are:

- `readerAuth`, `issuerAuth`, and `deviceSignature` use `COSE_Sign1` with ES256 (`alg` `-7`) in the core profile.
- `readerAuth` is detached and has serialized payload `null`; `issuerAuth` and `deviceSignature` follow the mdoc signing contexts described above and in §8.
- HPKE recipient keys and mdoc device keys are COSE_Key EC2 P-256 public keys using labels `1`, `-1`, `-2`, and `-3` as shown above.
- COSE header label `33` (`x5chain`) is used for reader certificate evidence when `readerAuth` is present, with at least the leaf certificate.

### C.x.11 Clinical-source trust reminder

A Verifier SHALL keep transport validation and clinical-source trust separate. Successful HPKE opening, `SessionTranscript` binding, MSO validation, digest matching, device authentication, optional reader authentication, or extraction of a syntactically valid SMART response does not create clinical-source provenance for unsigned raw FHIR JSON. Clinical-source trust comes from the returned Artifact payload, such as SMART Health Card signatures or other provenance accepted by deployment policy, and from the rules in §§6-7.

## Appendix D. Same-device fixture index and classification guidance

This appendix indexes confirmed same-device fixture material and classifies how each fixture class should be used. Paths named here were verified in the repository. Fixture files can be conformance vectors, diagnostic aids, or historical captures; the label matters because not every checked-in byte sequence should become a normative requirement.

### D.x.1 Classification labels

Recommended labels:

| Label | Meaning |
| --- | --- |
| `conformance-vector` | Stable vector intended for automated pass/fail tests of a normative §8 or Appendix C requirement. It should identify exact inputs, byte boundaries, expected decoded values, and expected validation result. |
| `diagnostic-vector` | Useful for implementers, debuggers, byte-ladder explanation, or cross-library comparison, but not itself a required conformance case. |
| `historical-capture` | Real or archived capture retained to document observed platform behavior. It may include demo origins, public test keys, or old shapes and should not silently define current conformance. |
| `negative-control` | Fixture intentionally not accepted as a SMART Health Check-in same-device request/response, useful for rejection tests. |
| `test-material-only` | Contains public demo keys, self-signed certificates, synthetic signatures, or generated values that must not be used as production trust material. |

A fixture index entry SHOULD state whether the fixture is byte-exact, whether it contains intentionally public private keys, whether it contains PHI, whether signatures are deterministic or nondeterministic, and whether it is expected to pass full transport validation, only structural inspection, or only a selected byte-boundary check.

### D.x.2 Generated TypeScript request vectors

Root:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
```

Verified files include:

```text
request.json
navigator-credentials-get.arg.json
device-request.b64u
device-request.cbor.hex
encryption-info.b64u
encryption-info.cbor.hex
inspection.json
metadata.json
recipient-public.jwk.json
recipient-private.jwk.json
smart-request.expected.json
```

Recommended classification: `conformance-vector` for request construction and structural inspection, with `test-material-only` for the included private key. This class is synthetic and deterministic enough to test the Verifier-side construction rules in §8.2 and the `SessionTranscript` inputs when an origin is supplied by the test harness.

Byte boundaries to expose:

1. SMART request JSON text placed in `requestInfo["org.smarthealthit.checkin.request"]`.
2. Inner `ItemsRequest` CBOR bytes.
3. Tag-24 `ItemsRequest` bytes placed in `DocRequest.itemsRequest`.
4. Full `DeviceRequest` CBOR bytes and base64url spelling.
5. `encryptionInfo` CBOR bytes and exact base64url spelling.
6. Derived `SessionTranscript` bytes for the fixture origin.
7. Decoded requested element: namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and `intentToRetain` value.

The fixture should not be used to imply that 32-byte nonces are mandatory for all conforming deployments unless the final conformance suite explicitly labels this fixture class as a 32-byte-nonce vector profile.

### D.x.3 Generated TypeScript `readerAuth` vectors

Root:

```text
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
```

Verified files include:

```text
request.json
navigator-credentials-get.arg.json
device-request.b64u
device-request.cbor.hex
encryption-info.b64u
encryption-info.cbor.hex
items-request-tag24.cbor
session-transcript.cbor
reader-auth.cbor
reader-certificate.der
reader-public.jwk.json
recipient-public.jwk.json
recipient-private.jwk.json
inspection.json
metadata.json
smart-request.expected.json
```

Recommended classification: `conformance-vector` for optional reader-authentication byte binding and `test-material-only` for the demo reader certificate and private keys. The vector should verify that `readerAuth` is per-`DocRequest`, detached, ES256, payload `null`, empty external AAD, and bound to the exact `SessionTranscript` and exact tag-24 `ItemsRequest` bytes.

Byte boundaries to expose:

1. `items-request-tag24.cbor` as the exact third item in `ReaderAuthentication`.
2. `session-transcript.cbor` as the exact second item in `ReaderAuthentication`.
3. `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))`.
4. Serialized `reader-auth.cbor` and its protected header `{1: -7}`.
5. COSE header label `33` (`x5chain`) with at least the leaf certificate from `reader-certificate.der`.
6. Signature verification result under the demo certificate key, while labeling certificate trust as test-only.

### D.x.4 Real Chrome/Android same-device request capture

Root:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
```

Verified files include:

```text
credential-manager-request.json
navigator-credentials-get.arg.json
request.json
request-artifacts.json
metadata.json
device-request.b64u
device-request.cbor
device-request.cbor.hex
device-request.diag
items-request.cbor
items-request.cbor.hex
items-request.diag
items-request-tag24.cbor
items-request-tag24.cbor.hex
request-info.json
requested-element.txt
smart-request.json
smart-request.raw.json
smart-request.expected.json
smart-request.hydrated.json
encryption-info.b64u
encryption-info.cbor
encryption-info.cbor.hex
encryption-info.diag
session-transcript.cbor
session-transcript.cbor.hex
session-transcript.diag
reader-auth.cbor
reader-auth.cbor.hex
reader-auth-detached-payload.cbor
reader-auth-detached-payload.cbor.hex
recipient-public.jwk.json
recipient-private.jwk.json
inspection.json
```

Recommended classification: `historical-capture` plus `diagnostic-vector`; selected byte boundaries may be promoted to `conformance-vector` only if the final suite intentionally accepts this real-platform capture as stable. It documents that Chrome/Android Credential Manager preserved the `requestInfo` SMART request carrier and supplied an origin used for the direct `dcapi` `SessionTranscript`. The included private key is intentionally public fixture material and must be labeled `test-material-only`.

Byte boundaries to expose:

1. Platform JSON request wrapper and `org-iso-mdoc` protocol field.
2. Exact `data.encryptionInfo` base64url string and decoded `encryption-info.cbor`.
3. Exact `session-transcript.cbor` derived from the base64url string and captured origin.
4. Full `device-request.cbor` and tag-24 `items-request-tag24.cbor`.
5. Decoded `requestInfo` and hydrated SMART request JSON.
6. Optional `reader-auth.cbor` and detached payload.
7. Requested stable element in `requested-element.txt`.

The fixture should be labeled non-PHI if that remains true. Because it is a real-platform capture with demo material, it should not by itself establish production trust-anchor behavior, origin policy, or required browser behavior for all conforming implementations.

### D.x.5 Minimal pymdoc response fixture

Root:

```text
fixtures/responses/pymdoc-minimal/
```

Verified files include:

```text
manifest.json
input.json
smart-response.json
issuer-signed-item.cbor
issuer-signed-item.cbor.hex
issuer-signed-item.diag
issuer-signed-item-tag24.cbor
issuer-signed-item-tag24.cbor.hex
issuer-signed-item-tag24.diag
value-digest-input.cbor
value-digest-input.cbor.hex
value-digest-input.diag
mso.cbor
mso.cbor.hex
mso.diag
mso-tag24.cbor
mso-tag24.cbor.hex
mso-tag24.diag
issuer-auth.cbor
issuer-auth.cbor.hex
issuer-auth.diag
document.cbor
document.cbor.hex
document.diag
expected-walk.json
```

Recommended classification: `diagnostic-vector`, with selected digest and issuer-signed-item checks eligible for `conformance-vector` if the final suite wants a minimal response-container vector independent of live platform capture. The manifest notes that `document.cbor` may contain nondeterministic ECDSA signature bytes; conformance tests should avoid requiring regenerated signatures to match byte-for-byte unless deterministic test signing is fixed.

Byte boundaries to expose:

1. `smart-response.json` as the UTF-8 JSON text carried in the issuer-signed item.
2. `issuer-signed-item.cbor` as the decoded item CBOR.
3. `issuer-signed-item-tag24.cbor` / `value-digest-input.cbor` as the exact digest input.
4. `mso.cbor` and `mso-tag24.cbor` as MSO and issuerAuth payload material.
5. `issuer-auth.cbor` as the COSE_Sign1 over tag-24 MSO bytes.
6. `document.cbor` as an mdoc document-level structure for walking `issuerSigned.nameSpaces` and `issuerAuth`.

This fixture does not, by itself, exercise the HPKE `dcapiResponse`, live `SessionTranscript`, or Digital Credentials API result wrapper.

### D.x.6 Real Chrome/Android same-device response capture

Root:

```text
fixtures/responses/real-chrome-android-smart-checkin/
```

Verified files include:

```text
wallet-response.digital-credential.json
credential.json
submit.json
metadata.json
dcapi-response.cbor
dcapi-response.cbor.b64u
dcapi-response.cbor.hex
dcapi-response-inspection.json
hpke-enc.bin
hpke-enc.bin.b64u
hpke-enc.bin.hex
hpke-ciphertext.bin
hpke-ciphertext.bin.b64u
hpke-ciphertext.bin.hex
session-transcript.cbor
session-transcript.cbor.b64u
session-transcript.cbor.hex
device-response.cbor
device-response.cbor.b64u
device-response.cbor.hex
opened-response-inspection.json
hpke-opened-response-inspection.json
response-inspection.json
issuer-signed-item-tag24.cbor
issuer-signed-item-tag24.cbor.b64u
issuer-signed-item-tag24.cbor.hex
value-digest.bin
value-digest.bin.b64u
value-digest.bin.hex
mso.cbor
mso.cbor.b64u
mso.cbor.hex
issuer-auth.cbor
issuer-auth.cbor.b64u
issuer-auth.cbor.hex
device-authentication.cbor
device-authentication.cbor.b64u
device-authentication.cbor.hex
smart-response.raw.json
smart-response.json
smart-response.expected.json
pymdoc-byte-check.json
```

Recommended classification: `historical-capture` plus `diagnostic-vector`; selected HPKE-open, digest, and device-authentication checks may be promoted to `conformance-vector` if the matching request fixture and its intentionally public private key remain stable. The fixture should be linked to `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` through `metadata.json`.

Byte boundaries to expose:

1. Digital Credentials API result JSON and base64url `data.response`.
2. `dcapi-response.cbor` as `[
   "dcapi", {"enc": ..., "cipherText": ...}
   ]`.
3. `hpke-enc.bin` and `hpke-ciphertext.bin` as separate HPKE fields.
4. `session-transcript.cbor` as HPKE `info` and device-authentication transcript.
5. `device-response.cbor` as HPKE plaintext.
6. `issuer-signed-item-tag24.cbor` as digest input and `value-digest.bin` as expected SHA-256 digest.
7. `mso.cbor`, `issuer-auth.cbor`, and `device-authentication.cbor` as issuer/device proof material.
8. Extracted SMART response JSON and expected normalized comparison JSON.

The response fixture proves the active Android wallet response shape for demo material. It does not make self-signed demo issuer evidence production-trusted and does not turn unsigned raw FHIR JSON into clinical-source provenance.

### D.x.7 Android test vectors

Path:

```text
wallet-android/app/src/test/resources/test-vectors.json
```

Recommended classification: `conformance-vector` for Android unit tests and cross-implementation request construction checks; `diagnostic-vector` for human appendix examples. The file contains generated request vectors, a negative mDL rejection vector, and session transcript vectors.

Byte boundaries to expose:

1. For each request vector: SMART request JSON text and full `deviceRequestHex`.
2. For rejection vectors: the non-SMART `docType`/namespace reason the request must not be accepted as SMART Health Check-in.
3. For session transcript vectors: origin, `encryptionInfoHex`, exact `encryptionInfoBase64Url`, and expected `sessionTranscriptHex`.

These vectors are valuable because they bridge TypeScript generation and Android parsing. They should not be treated as production trust material.

### D.x.8 Additional checked-in response diagnostics

Root:

```text
fixtures/responses/android-kotlin-generated/
```

Verified files include:

```text
opened-response-inspection.json
pymdoc-byte-check.json
```

Recommended classification: `diagnostic-vector` unless the final fixture suite adds metadata and stable source descriptions. The root appears to contain inspection and byte-check outputs from Android/Kotlin response generation. Because no root metadata file was verified, the final Appendix D should either add metadata before promoting it or keep it as an auxiliary diagnostic path.

### D.x.9 Negative direct-mdoc fixture material

Root:

```text
fixtures/dcapi-requests/negative-mattr-mdl/
```

Verified files include:

```text
metadata.json
```

Recommended classification: `negative-control` or `historical-capture`, not a SMART Health Check-in conformance-positive fixture. It may be useful to prove that a direct mdoc request for another `docType`, such as an mDL request, is not accepted as a SMART Health Check-in request solely because it uses direct mdoc transport.

### D.x.10 Fixture index entry template

Each Appendix D same-device fixture entry should include:

```text
Path: <verified path>
Class: conformance-vector | diagnostic-vector | historical-capture | negative-control
Flow phase: request | readerAuth | response | transcript | negative
Expected result: accepted | rejected | diagnostic only
Contains PHI: yes | no | unknown
Contains public test private key: yes | no
Trust material status: production | test-only | self-signed | unknown
Byte-exact files: <list>
Decoded inspection files: <list>
Normative rules exercised: <section references>
Notes: <caveats>
```

Fixture indices SHALL NOT fabricate paths or expected byte values. If a root exists but lacks enough metadata to classify, Appendix D SHOULD label it diagnostic or unknown rather than promoting it to conformance.

## Organizer notes

### Strengths

- Aligns Appendix C with accepted §8 and T3.C: request in `ItemsRequest.requestInfo`, response in issuer-signed `smart_health_checkin_response` `elementValue`, exact `encryptionInfo` base64url transcript binding, optional per-`DocRequest.readerAuth`, HPKE suite, and direct `dcapiResponse`.
- Avoids pretending to provide complete ISO/IEC 18013-5 CDDL where only profile constraints are confirmed.
- Provides fixture classifications and byte-boundary expectations for all confirmed same-device fixture classes requested, including generated TypeScript requests, readerAuth vectors, real Chrome/Android request and response captures, minimal pymdoc response material, and Android test vectors.

### Caveats

- The pseudo-CDDL uses active text-string map labels and profile structure. A final editor should reconcile it with exact ISO/IEC 18013-5 CDDL notation and any official label aliases before publication.
- Duplicate document/element handling, deterministic CBOR requirements, and digest-id conventions remain open conformance decisions.
- Nonce guidance preserves the active 16-byte minimum / 32-byte default distinction; final conformance may still choose a fixed nonce-size profile for vectors.

### Open issues

- Decide whether the real Chrome/Android capture remains historical/diagnostic or becomes a stable conformance vector.
- Decide whether `fixtures/responses/android-kotlin-generated/` needs metadata before inclusion in the final Appendix D.
- Decide whether negative direct-mdoc material belongs in Appendix D same-device fixtures or a later conformance-test appendix.
- Decide whether Appendix C should require rejection of duplicate `smart_health_checkin_response` elements or multiple matching documents, or leave this to §11/§13 conformance closure.

### Downstream dependencies

- Appendix A / §4 should convert only settled Appendix C/D requirements into conformance rows.
- §11 should address replay/freshness, origin spoofing, reader impersonation, HPKE key reuse, plaintext fixture/debug leakage, duplicate-element security behavior, and raw-FHIR provenance overclaiming.
- §13 should register the SMART mdoc identifiers and define any deployment-profile hooks for reader trust, issuer trust, origin requirements, and fixture-vector profiles.
- T6.C should reconcile this fixture guidance with final worked examples and any refreshed captures.
