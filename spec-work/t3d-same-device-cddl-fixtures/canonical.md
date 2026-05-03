# Appendix C: Same-device CDDL and profile constraints

This appendix gives profile constraints and diagnostic pseudo-CDDL for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended to make SMART Health Check-in byte boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The profile reuses ISO/IEC 18013-5 mdoc, COSE, COSE_Key, CBOR, and HPKE structures. ISO/IEC 18013-5 and the referenced COSE/HPKE specifications own the base structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key`. This appendix constrains only SMART Health Check-in profile portions: fixed identifiers, carriers, tag-24 boundaries, direct `dcapi` wrappers, HPKE context, and the stable SMART response element.

The snippets below are profile pseudo-CDDL. They use field names and byte-boundary names from §8 and Appendix E. They are not a complete replacement for ISO/IEC 18013-5 CDDL, and they do not claim exactness for ISO map labels or optional fields not confirmed by the active profile. If this appendix conflicts with §8, §8 controls.

## C.1 Notation and constants

`bstr .cbor X` means a CBOR byte string containing a complete CBOR serialization of `X`. `#6.24(bstr .cbor X)` means CBOR tag 24 around that byte string. `COSE_Sign1` and `COSE_Key` are references to COSE structures.

The same-device profile uses these fixed values:

```text
smart-protocol-id        = "org-iso-mdoc"
smart-doc-type           = "org.smarthealthit.checkin.1"
smart-namespace          = "org.smarthealthit.checkin"
smart-response-element   = "smart_health_checkin_response"
smart-request-info-key   = "org.smarthealthit.checkin.request"
dcapi-label              = "dcapi"
```

A Verifier, Wallet/Responder, or Verifier-side processor that implements the same-device profile SHALL apply the §8 constraints restated in this appendix when producing or consuming the corresponding structures.

## C.2 Digital Credentials API request and result wrappers

The W3C Digital Credentials API wrappers are JSON, not CBOR. The Verifier invokes direct `org-iso-mdoc` with request data equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
    "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
  }
}
```

The Wallet/Responder returns a result equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

`data.deviceRequest`, `data.encryptionInfo`, and `data.response` are JSON strings carrying encoded CBOR bytes. Processors SHALL NOT interpret these wrapper strings as plaintext SMART request or SMART response JSON. The exact unpadded `data.encryptionInfo` base64url string is a `SessionTranscript` input; processors SHALL NOT substitute a decoded-and-re-encoded spelling when constructing or verifying the transcript.

## C.3 `DeviceRequest`, `DocRequest`, and tag-24 `ItemsRequest`

The core same-device request uses ISO/IEC 18013-5 `DeviceRequest` version `"1.0"` and `DocRequest.itemsRequest` as a tag-24-wrapped `ItemsRequest`.

```cddl
; Pseudo-CDDL profile constraints, not full ISO replacement CDDL.
smart-device-request = {
  "version" => "1.0",
  "docRequests" => [ + smart-doc-request ],
  * tstr => any
}

smart-doc-request = {
  "itemsRequest" => smart-items-request-bytes,
  ? "readerAuth" => cose-sign1-reader-auth,
  * tstr => any
}

smart-items-request-bytes = #6.24(bstr .cbor smart-items-request)

smart-items-request = {
  "docType" => "org.smarthealthit.checkin.1",
  "nameSpaces" => {
    "org.smarthealthit.checkin" => {
      "smart_health_checkin_response" => bool
    }
  },
  "requestInfo" => {
    "org.smarthealthit.checkin.request" => smart-request-json-text,
    * tstr => any
  },
  * tstr => any
}

smart-request-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinRequest
```

A Verifier SHALL set `DeviceRequest.version` to exactly `"1.0"` for the core version 1.0 flow. A Verifier SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`.

A Verifier SHALL carry the SMART request only as a CBOR text string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic mdoc element names, archived compressed-element experiments, implementation-defined initiation wrapper fields, other `requestInfo` keys, `readerAuth`, `encryptionInfo`, or Digital Credentials API wrapper fields as version 1.0 SMART request carriers.

The boolean at `nameSpaces["org.smarthealthit.checkin"]["smart_health_checkin_response"]` is the mdoc `intentToRetain` flag for the requested stable response element. It is not Holder consent, not authenticated requester identity, not a retention authorization, and not a clinical selector.

## C.4 Optional per-`DocRequest.readerAuth`

Core SMART Health Check-in 1.0 uses optional per-`DocRequest.readerAuth`. It does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core reader-authentication mechanism.

When present, `readerAuth` is a detached `COSE_Sign1` bound to the exact direct `dcapi` `SessionTranscript` bytes and the exact tag-24 `ItemsRequest` bytes:

```cddl
reader-authentication-bytes = #6.24(bstr .cbor [
  "ReaderAuthentication",
  session-transcript-bytes,
  smart-items-request-bytes
])

cose-sign1-reader-auth = COSE_Sign1
```

A Verifier that includes `readerAuth` SHALL construct a detached `COSE_Sign1` with protected header `{1: -7}` for ES256, serialized payload `null`, empty external AAD in the COSE `Signature1` structure, and `reader-authentication-bytes` as the detached payload. It SHALL include reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Wallet/Responder acceptance of a certificate chain, trust anchor, revocation status, key usage, display name, or organizational assurance label is deployment-policy work under §7.

A Wallet/Responder that supports or relies on reader authentication SHALL verify the signature over the exact `reader-authentication-bytes`, including the same `SessionTranscript` and tag-24 `ItemsRequest` bytes. It SHALL distinguish absent, syntactically invalid, cryptographically failed, cryptographically valid but untrusted, and trusted reader-authentication states for policy and display.

## C.5 `encryptionInfo`, `SessionTranscript`, and HPKE context

The direct Digital Credentials API `encryptionInfo` value is CBOR carried as unpadded base64url text in the JSON wrapper:

```cddl
smart-encryption-info = [
  "dcapi",
  {
    "nonce" => bstr,
    "recipientPublicKey" => p256-recipient-public-key,
    * tstr => any
  }
]

p256-recipient-public-key = {
   1  => 2,       ; kty = EC2
  -1  => 1,       ; crv = P-256
  -2  => bstr,    ; x-coordinate
  -3  => bstr,    ; y-coordinate
  * int => any
}
```

The `recipientPublicKey` is a COSE_Key for an EC2 P-256 public key. A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy. Active request builders and fixtures commonly use 32 bytes, but 32 bytes is not a universal core requirement unless a later conformance-vector profile or deployment profile explicitly makes it one.

The direct `dcapi` transcript is byte-sensitive:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact unpadded base64url text from the request wrapper. `origin` is supplied by the Browser / User Agent, platform, or deployment-approved privileged-caller mechanism. It is not derived from the SMART request, `purpose`, item display text, selector URLs, request ids, implementation-defined initiation metadata, callback-looking strings, or returned Artifacts.

The Wallet/Responder encrypts CBOR `DeviceResponse` bytes using HPKE base mode with:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

## C.6 Direct `dcapiResponse`

The HPKE output is wrapped as CBOR before being base64url-encoded in the JSON result:

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

`enc` is the HPKE KEM encapsulated key for DHKEM(P-256, HKDF-SHA256). `cipherText` is the AEAD ciphertext, including its authentication tag, over `CBOR(DeviceResponse)`. A Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a different `dcapiResponse` carrier, non-empty HPKE AAD, or another HPKE suite for the core version 1.0 flow.

## C.7 `DeviceResponse` subset and issuer-signed SMART response item

After HPKE opening, the plaintext is a CBOR `DeviceResponse` using ISO/IEC 18013-5 structures. The SMART profile constrains the accepted subset to include a successful response containing a document for `docType` `org.smarthealthit.checkin.1` with the SMART response in an issuer-signed namespace item.

```cddl
; Pseudo-CDDL profile constraints. Base structures and map labels are ISO-owned.
smart-device-response = {
  "version" => "1.0",
  "documents" => [ + smart-document ],
  "status" => 0,
  * tstr => any
}

smart-document = {
  "docType" => "org.smarthealthit.checkin.1",
  "issuerSigned" => smart-issuer-signed,
  "deviceSigned" => smart-device-signed,
  * tstr => any
}

smart-issuer-signed = {
  "nameSpaces" => {
    "org.smarthealthit.checkin" => [ + smart-issuer-signed-item-bytes ]
  },
  "issuerAuth" => COSE_Sign1,
  * tstr => any
}

smart-issuer-signed-item-bytes = #6.24(bstr .cbor smart-issuer-signed-item)

smart-issuer-signed-item = {
  "digestID" => uint,
  "random" => bstr,
  "elementIdentifier" => "smart_health_checkin_response",
  "elementValue" => smart-response-json-text,
  * tstr => any
}

smart-response-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinResponse
```

A Wallet/Responder SHALL carry the SMART response only as the `elementValue` of the issuer-signed `smart_health_checkin_response` item in namespace `org.smarthealthit.checkin`. It SHALL NOT carry the SMART response as `requestInfo`, as plaintext Digital Credentials API JSON, as plaintext `dcapiResponse` content, or as a device-signed namespace element in place of the issuer-signed item.

The `elementValue` text string contains a SMART response conforming to §6. Its `requestId`, `artifacts[]`, `fulfills[]`, media types, FHIR version fields, SMART Health Card payloads, and `requestStatus[]` are validated under §6 and §6.6, not by mdoc CDDL alone.

## C.8 MSO value digest, `issuerAuth`, and device authentication

The Mobile Security Object and `issuerAuth` are ISO/IEC 18013-5 and COSE structures. This profile constrains these relationships:

- `MSO.docType` is `org.smarthealthit.checkin.1`.
- `MSO.digestAlgorithm` is `SHA-256` for the core profile.
- `MSO.valueDigests["org.smarthealthit.checkin"][digestID]` corresponds to the disclosed `IssuerSignedItem.digestID`.
- The value-digest input is the complete tag-24-wrapped `IssuerSignedItem` bytes, not only the inner map, not only `elementValue`, and not diagnostic notation.
- `MSO.deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.
- `issuerAuth` is a `COSE_Sign1` using ES256 (`alg` `-7`) over the MSO payload form required by §8 and the selected ISO-compatible encoding.

Active Android fixtures use digestID `0` for the single stable element, but the core protocol requirement is consistency between the disclosed item `digestID` and the corresponding MSO `valueDigests` entry. A fixture profile MAY freeze digestID `0` for a named vector class, but this appendix does not make that value a general protocol constant.

The device-authentication payload binds the document to the same presentation session:

```cddl
smart-device-signed = {
  "nameSpaces" => device-name-spaces-bytes,
  "deviceAuth" => {
    "deviceSignature" => COSE_Sign1,
    * tstr => any
  },
  * tstr => any
}

device-name-spaces-bytes = #6.24(bstr .cbor device-name-spaces)
device-name-spaces = { * tstr => any }

device-authentication-bytes = #6.24(bstr .cbor [
  "DeviceAuthentication",
  session-transcript-bytes,
  "org.smarthealthit.checkin.1",
  device-name-spaces-bytes
])
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The device `COSE_Sign1` SHALL use ES256 (`alg` `-7`) and the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`. The SMART response item remains issuer-signed; moving it into `DeviceNameSpaces` is not an equivalent SMART Health Check-in response carrier.

## C.9 Extraction, validation, and deferred exactness

Appendix C identifies expected carriers and byte boundaries, but it cannot by itself establish trust or clinical validity. A Verifier accepting a same-device response SHALL perform the §8.7 and §8.8 checks: decode the JSON wrapper, HPKE-open using the expected transcript, parse `DeviceResponse`, validate `issuerAuth`, validate the MSO and digest binding, validate device authentication, extract the SMART response JSON string from the stable issuer-signed item, validate it under §6, and apply §6.6 cross-validation against the original SMART request.

Successful mdoc parsing, HPKE opening, digest validation, issuer evidence, device signature validation, optional reader authentication, or `requestId` matching does not create clinical-source provenance for unsigned raw FHIR JSON. Source trust for raw FHIR JSON, SMART Health Cards, provenance-bearing FHIR, or other Artifact forms remains governed by §7.4 and the Artifact evidence itself.

The following exactness issues are intentionally unresolved here and should be closed by §11, §13, Appendix A, a deployment profile, or a future fixture-vector profile before being treated as pass/fail conformance requirements:

- duplicate CBOR or JSON map key handling;
- multiple matching `docRequests` or multiple matching `DeviceResponse.documents`;
- duplicate `smart_health_checkin_response` issuer-signed items or duplicate stable elements;
- deterministic CBOR map ordering or canonical encoding for vector generation;
- digestID conventions such as always using `0` for single-item vectors;
- fixed nonce-size constraints beyond fresh unpredictable bytes and the 16-byte recommendation; and
- complete imported ISO/IEC 18013-5 CDDL and exact base-structure map labels.

# Appendix D: Same-device fixture index and classification

This appendix indexes confirmed same-device fixture material and classifies how each fixture class should be used. It does not define alternate same-device behavior. Fixture expectations derive from §8, Appendix C, and Appendix E.

A fixture path is listed only when it exists in the repository. The labels below are conservative: checked-in material is not a normative conformance vector merely because it exists.

## D.1 Classification scheme

| Class | Meaning |
| --- | --- |
| **Conformance candidate** | Stable-looking material that can become an automated pass/fail vector after Appendix A/§13/T6.C identify exact requirements, producer assumptions, byte boundaries, and expected results. |
| **Diagnostic** | Material useful for implementer debugging, byte-ladder review, cross-library comparison, or regression testing, but not itself a universal conformance oracle. |
| **Historical capture** | Real platform or older behavior retained as evidence. It should not silently define current conformance after the specification changes. |
| **Implementation regression** | Material primarily used by repository tests for a particular implementation or cross-language check. It may support conformance work but is not automatically the public fixture suite. |
| **Illustrative** | Example material useful for documentation or walkthroughs, without pass/fail force. |

Each final fixture entry should state whether validation is byte-exact, structure-exact, semantic, or diagnostic-only; whether it contains PHI; whether it contains intentionally public private keys or demo certificates; and whether cryptographic trust material is production, test-only, self-signed, or unknown.

## D.2 `fixtures/dcapi-requests/ts-smart-checkin-basic/`

**Purpose:** Generated TypeScript request material for the core same-device request shape without `readerAuth`.

**Likely classification:** Conformance candidate for verifier request construction and transcript inputs; diagnostic until deterministic encoding, nonce profile, and final clinical example content are frozen.

**Key byte boundaries and files:**

- `request.json` and `navigator-credentials-get.arg.json`: JSON Digital Credentials API request views.
- `device-request.b64u` and `device-request.cbor.hex`: encoded `DeviceRequest` wrapper.
- `encryption-info.b64u` and `encryption-info.cbor.hex`: transcript-bound HPKE recipient information.
- `inspection.json`: decoded request structure.
- `smart-request.expected.json`: expected SMART request extracted from `requestInfo`.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: test-only HPKE key material for offline checks.

**Caveats:** The included private key is intentionally public test material and must not be reused in production. This root should not be used to imply that 32-byte nonces, exact map ordering, or demo clinical content are mandatory for all conforming deployments unless a future vector profile says so.

## D.3 `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`

**Purpose:** Generated TypeScript request material with optional per-`DocRequest.readerAuth`.

**Likely classification:** Conformance candidate for optional reader-authentication structure and byte binding; diagnostic for reader trust because production chain policy is not defined here.

**Key byte boundaries and files:**

- All request and `encryptionInfo` boundaries from D.2.
- `items-request-tag24.cbor`: exact tag-24 `ItemsRequest` bytes used in `ReaderAuthenticationBytes`.
- `session-transcript.cbor`: exact transcript component.
- `reader-auth.cbor`: detached `COSE_Sign1`.
- `reader-certificate.der` and `reader-public.jwk.json`: demo reader material.
- `inspection.json`: decoded readerAuth properties, including protected alg `-7`, payload `null`, and x5chain label `33` when exposed.

**Caveats:** The vector can test syntactic and cryptographic readerAuth validity, but it does not imply that core deployments must require `readerAuth` or trust the demo certificate. Trust anchors, revocation, and assurance labels remain deployment-policy decisions.

## D.4 `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`

**Purpose:** Real Chrome/Android Credential Manager request capture using demo data. It demonstrates that the current platform path can carry the SMART request through `ItemsRequest.requestInfo`, preserve the exact `encryptionInfo` base64url string, carry `readerAuth`, and reproduce the direct `dcapi` transcript inputs.

**Likely classification:** Diagnostic real-platform capture and historical capture. Selected byte boundaries may be promoted to conformance status only after §11/§13/T6.C decide that the captured origin, nonce profile, readerAuth behavior, demo certificates, and payloads remain stable and appropriate.

**Key byte boundaries and files:**

- `credential-manager-request.json`, `navigator-credentials-get.arg.json`, and `request.json`: platform/request wrapper views.
- `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, and `device-request.diag`: complete request bytes and diagnostics.
- `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request.decoded.json`, `items-request-tag24.cbor`, and `items-request-tag24.cbor.hex`: request item boundaries.
- `request-info.json`, `requested-element.txt`, `smart-request.raw.json`, `smart-request.json`, `smart-request.hydrated.json`, and `smart-request.expected.json`: SMART request extraction and comparison material.
- `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, and `encryption-info.diag`: encryptionInfo bytes and exact wrapper spelling.
- `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.diag`: transcript material.
- `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, and `reader-auth-detached-payload.cbor.hex`: reader-authentication material.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: paired test-only HPKE recipient material for offline response opening.
- `metadata.json`, `inspection.json`, and `request-artifacts.json`: capture context and decoded inspection.

**Caveats:** This is a real platform capture with demo material. Incidental browser, package, localhost-origin, timestamp, nonce, certificate, and debug-bundle details are not core protocol requirements. Any included private key is intentionally public test material only.

## D.5 `fixtures/responses/pymdoc-minimal/`

**Purpose:** Minimal response material generated independently for walking issuer-signed SMART response carriage, tag-24 digest inputs, MSO contents, `issuerAuth`, and decoded document structure without requiring a live platform capture.

**Likely classification:** Diagnostic response byte-walk vector; conformance candidate for response substructure and value-digest boundaries if deterministic fields and expected results are frozen.

**Key byte boundaries and files:**

- `smart-response.json` and `input.json`: clinical response/input material.
- `issuer-signed-item.cbor`, `issuer-signed-item.cbor.hex`, and `issuer-signed-item.diag`: untagged issuer-signed item.
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, and `issuer-signed-item-tag24.diag`: tag-24 item bytes.
- `value-digest-input.cbor`, `value-digest-input.cbor.hex`, and `value-digest-input.diag`: digest input oracle.
- `mso.cbor`, `mso.cbor.hex`, `mso.diag`, `mso-tag24.cbor`, `mso-tag24.cbor.hex`, and `mso-tag24.diag`: MSO material.
- `issuer-auth.cbor`, `issuer-auth.cbor.hex`, and `issuer-auth.diag`: issuer authentication.
- `document.cbor`, `document.cbor.hex`, and `document.diag`: document-level structure.
- `expected-walk.json` and `manifest.json`: expected inspection and fixture context.

**Caveats:** This root does not by itself exercise the Digital Credentials API result wrapper, HPKE `dcapiResponse`, live origin binding, or response opening. Complete-document bytes may include nondeterministic ECDSA signatures; conformance tests should compare only explicitly stable byte or digest targets unless deterministic signing is fixed.

## D.6 `fixtures/responses/real-chrome-android-smart-checkin/`

**Purpose:** Real Android Wallet response artifacts paired with the real Chrome/Android request capture. It demonstrates the complete same-device response path: Digital Credentials API result, CBOR `dcapiResponse`, HPKE `enc` and `cipherText`, HPKE-opened `DeviceResponse`, issuer-signed SMART response item, MSO value digest, device authentication, and extracted SMART response JSON.

**Likely classification:** Diagnostic real-platform response capture and historical capture; conformance candidate only for named end-to-end checks after the paired request, test keys, origin, trust policy, and expected validation policy are frozen.

**Key byte boundaries and files:**

- `wallet-response.digital-credential.json`, `credential.json`, and `submit.json`: JSON wrapper/result views.
- `dcapi-response.cbor`, `dcapi-response.cbor.hex`, and `dcapi-response.cbor.b64u`: direct response envelope.
- `hpke-enc.bin`, `hpke-enc.bin.hex`, `hpke-enc.bin.b64u`, `hpke-ciphertext.bin`, `hpke-ciphertext.bin.hex`, and `hpke-ciphertext.bin.b64u`: HPKE fields.
- `device-response.cbor`, `device-response.cbor.hex`, and `device-response.cbor.b64u`: HPKE plaintext.
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.cbor.b64u`, `value-digest.bin`, `value-digest.bin.hex`, and `value-digest.bin.b64u`: issuer-signed item and digest boundary.
- `mso.cbor`, `mso.cbor.hex`, `mso.cbor.b64u`, `issuer-auth.cbor`, `issuer-auth.cbor.hex`, and `issuer-auth.cbor.b64u`: issuer proof material.
- `device-authentication.cbor`, `device-authentication.cbor.hex`, `device-authentication.cbor.b64u`, `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.cbor.b64u`: device-authentication context.
- `smart-response.raw.json`, `smart-response.json`, and `smart-response.expected.json`: extracted SMART response material.
- `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, and `pymdoc-byte-check.json`: decoded inspections and byte checks.
- `metadata.json`: capture context and pairing metadata.

**Caveats:** The fixture proves the active Android demo response shape, not production issuer trust. It must be paired with the request fixture and its intentionally public test-only HPKE private JWK for offline HPKE opening. Successful mdoc/HPKE validation in this fixture does not create clinical-source provenance for unsigned raw FHIR JSON.

## D.7 `wallet-android/app/src/test/resources/test-vectors.json`

**Purpose:** Android unit-test resource generated from TypeScript protocol code. It records active identifiers, generated request vectors, rejection vectors, and SessionTranscript vectors for cross-language checks.

**Likely classification:** Implementation regression and conformance candidate for identifiers, request parsing, rejection of non-SMART mdoc material, and SessionTranscript derivation.

**Key byte boundaries and fields:**

- Top-level `doctype`, `namespace`, `responseElement`, and `requestInfoKey` identifiers.
- `requestVectors[].smartRequestJson` and `requestVectors[].deviceRequestHex`.
- `rejectionVectors[]` for negative/non-SMART mdoc material.
- `sessionTranscriptVectors[]` with `origin`, `encryptionInfoHex`, `encryptionInfoBase64Url`, and `sessionTranscriptHex`.

**Caveats:** This file is a supporting implementation test resource, not the whole public fixture suite. Fixed nonce values, exact clinical example bodies, and included negative cases should not be read as required clinical content or universal production policy unless a final conformance profile says so.

## D.8 Fixture refresh and promotion triggers

A same-device fixture should be refreshed, reclassified, or demoted when any of the following changes:

1. the §8 byte ladder, including request carrier, tag-24 boundaries, `SessionTranscript`, HPKE `info`, or response carrier;
2. the active demo SMART request or SMART response clinical JSON used by fixtures;
3. browser, Credential Manager, or platform Digital Credentials API behavior that affects wrapper shape, origin, or transcript inputs;
4. readerAuth policy, certificate evidence, x5chain encoding, or whether readerAuth is required in a deployment profile;
5. HPKE, COSE, issuerAuth, deviceSignature, MSO, digest, or CBOR implementation behavior;
6. a decision to move a diagnostic or historical capture into conformance status;
7. a decision to freeze nonce size, digestID convention, deterministic CBOR, duplicate handling, or byte-exact signing behavior for vector purposes; or
8. discovery that a fixture contains PHI, non-test secrets, stale trust material, or operational metadata unsuitable for publication.

Promotion from diagnostic or historical status to conformance-vector status should identify the exact §8/App C obligations exercised, the byte-exact files or decoded fields to compare, the expected validation outcome, and all test-only trust material.
