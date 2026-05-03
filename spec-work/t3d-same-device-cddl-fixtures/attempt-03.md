# T3.D attempt 03 — Appendix C same-device CDDL and Appendix D same-device fixture material

## Appendix C. CDDL and diagnostic structures for same-device `org-iso-mdoc`

This appendix gives profile constraints and diagnostic-structure guidance for the same-device flow defined in §8. It is intended for implementers, fixture authors, and conformance-tool authors who need stable names for byte boundaries and SMART-specific fields. It does not replace ISO/IEC 18013-5 base definitions for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `IssuerSigned`, `MobileSecurityObject`, `DeviceAuthentication`, `COSE_Sign1`, or `COSE_Key`. Where this appendix shows partial CDDL or pseudo-CDDL, the exact ISO base structure remains authoritative and the snippets only constrain the SMART Health Check-in profile portions.

A processor that claims conformance to Appendix C same-device constraints SHALL apply the §8 requirements that are restated here. If this appendix appears to conflict with §8, §8 controls.

### C.1 Notation, scope, and reuse of ISO structures

The following notation is used in this appendix:

- `bstr .cbor X` means a CBOR byte string containing an encoded CBOR item matching `X`. CBOR tag 24 wraps such a byte string as an encoded CBOR data item.
- `COSE_Sign1` and `COSE_Key` are the COSE structures defined by COSE specifications and reused by ISO/IEC 18013-5. This appendix constrains the algorithm and selected header/key labels for this profile; it does not redefine COSE.
- Map key names shown as text strings, such as `"docType"`, are profile-visible names used by the active direct `org-iso-mdoc` structures. Exact ISO labels and complete CDDL should be taken from the referenced ISO/DC API profile when incorporated into a full CDDL module.
- `SmartHealthCheckinRequestJSON` and `SmartHealthCheckinResponseJSON` are CBOR text strings containing UTF-8 JSON serializations of the §§5-6 clinical objects. The clinical JSON objects are not encoded as CBOR maps in this binding, and this specification does not define canonical JSON serialization for them.

The SMART-specific constants are:

```cddl
smart-doc-type = "org.smarthealthit.checkin.1"
smart-namespace = "org.smarthealthit.checkin"
smart-response-element = "smart_health_checkin_response"
smart-request-info-key = "org.smarthealthit.checkin.request"
dcapi-protocol = "dcapi"
```

### C.2 Digital Credentials API request wrapper

The browser-facing Digital Credentials API request is JSON, not CBOR, so this appendix does not provide CDDL for the outer `navigator.credentials.get` argument. For this same-device profile, the Verifier invokes protocol `org-iso-mdoc` with request `data` containing base64url-without-padding encodings of two CBOR byte strings:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
    "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
  }
}
```

A Verifier SHALL preserve the exact `data.encryptionInfo` base64url string because §8.3 uses that text string as an input to `SessionTranscript` construction. A Wallet/Responder SHALL NOT derive the SMART request from any Digital Credentials API JSON member other than the decoded CBOR `ItemsRequest.requestInfo[smart-request-info-key]` described below.

### C.3 `DeviceRequest`, `DocRequest`, and tag-24 `ItemsRequest`

The same-device flow reuses the ISO `DeviceRequest` and `DocRequest` structures. The SMART profile constrains the logical shape as follows:

```cddl
; Pseudo-CDDL: exact complete DeviceRequest and DocRequest grammar is reused
; from ISO/IEC 18013-5 / direct org-iso-mdoc. This profile constrains values.

SMART-DeviceRequest = {
  "version" => "1.0",
  "docRequests" => [+ SMART-DocRequest],
  * tstr => any
}

SMART-DocRequest = {
  "itemsRequest" => tag24-smart-items-request,
  ? "readerAuth" => COSE-Sign1-readerAuth,
  * tstr => any
}

tag24-smart-items-request = #6.24(bstr .cbor SMART-ItemsRequest)

SMART-ItemsRequest = {
  "docType" => smart-doc-type,
  "nameSpaces" => {
    smart-namespace => {
      smart-response-element => bool
    }
  },
  "requestInfo" => {
    smart-request-info-key => SmartHealthCheckinRequestJSON,
    * tstr => any
  },
  * tstr => any
}

SmartHealthCheckinRequestJSON = tstr
```

The `bool` value under `nameSpaces[smart-namespace][smart-response-element]` is the mdoc `intentToRetain` flag. It is not Holder consent and does not change response-accounting semantics. The Verifier SHALL request the stable `smart_health_checkin_response` element and SHALL carry the SMART request only as `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.

`DeviceRequest.version` is exactly `"1.0"` in the core flow. Core SMART Health Check-in 1.0 uses optional per-`DocRequest.readerAuth`; it does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core reader-authentication carrier.

### C.4 Detached `readerAuth` and `ReaderAuthenticationBytes`

When `readerAuth` is present, it is a detached `COSE_Sign1` bound to the exact tag-24 `ItemsRequest` bytes and exact direct `dcapi` `SessionTranscript` bytes for the presentation:

```cddl
ReaderAuthentication = [
  "ReaderAuthentication",
  SessionTranscriptBytes,
  tag24-smart-items-request
]

ReaderAuthenticationBytes = #6.24(bstr .cbor ReaderAuthentication)

; COSE_Sign1 array shape is from COSE. Profile constraints:
COSE-Sign1-readerAuth = COSE_Sign1
```

A Verifier that includes `readerAuth` SHALL use ES256 (`alg` `-7`), a serialized `COSE_Sign1` payload field of `null`, empty external AAD in the COSE `Signature1` structure, and `ReaderAuthenticationBytes` as the detached payload. For this core profile, `readerAuth` SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate. The value may be encoded according to COSE conventions for `x5chain`; diagnostic examples commonly render it as one DER certificate byte string or an array of DER certificate byte strings. Trust anchors, chain building, revocation, assurance labels, and mandatory-use policy remain deployment-profile decisions under §7.

### C.5 `encryptionInfo`, COSE_Key, and `SessionTranscript` carrier

The `encryptionInfo` value is CBOR encoded and base64url-encoded without padding into the Digital Credentials API request. Its same-device logical shape is:

```cddl
SMART-encryptionInfo = [
  "dcapi",
  {
    "nonce" => bstr,
    "recipientPublicKey" => HPKE-recipient-P256-COSE-Key,
    * tstr => any
  }
]

HPKE-recipient-P256-COSE-Key = {
   1 => 2,       ; kty = EC2
  -1 => 1,       ; crv = P-256
  -2 => bstr,    ; x coordinate
  -3 => bstr,    ; y coordinate
  * int => any
}
```

The nonce SHALL be fresh and unpredictable for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy. Active TypeScript-generated fixtures use 32 bytes, but 32 bytes is not a core protocol requirement unless a later conformance-vector profile explicitly makes it one.

`SessionTranscript` construction is defined in §8.3 and Appendix E. This appendix records the carrier dependency because it affects signatures and HPKE:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The `encryptionInfoBase64Url` value is the exact unpadded text string from the request wrapper, not a decoded and re-encoded equivalent. The origin is the authenticated origin or deployment-approved privileged-caller origin-equivalent supplied by the Browser / User Agent or platform. It is not copied from the SMART request body.

### C.6 Direct `dcapiResponse` result wrapper

The Digital Credentials API result is JSON, not CDDL. For this profile the result contains protocol `org-iso-mdoc` and `data.response`, a base64url-without-padding encoding of CBOR `dcapiResponse` bytes:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

The decoded CBOR value is constrained as:

```cddl
SMART-dcapiResponse = [
  "dcapi",
  {
    "enc" => bstr,
    "cipherText" => bstr,
    * tstr => any
  }
]
```

`enc` is the HPKE KEM encapsulated key for DHKEM(P-256, HKDF-SHA256). `cipherText` is the AES-128-GCM HPKE ciphertext, including authentication tag, over `CBOR(DeviceResponse)`. The HPKE suite SHALL be DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM; `info` SHALL be the exact `SessionTranscript` bytes; `aad` SHALL be the empty byte string.

### C.7 `DeviceResponse` subset and SMART response item

The same-device response plaintext is a CBOR `DeviceResponse` reused from ISO/IEC 18013-5. The SMART profile constrains the accepted subset as follows:

```cddl
; Pseudo-CDDL: complete DeviceResponse, Document, IssuerSigned,
; DeviceSigned, MSO, and status definitions are ISO base structures.

SMART-DeviceResponse = {
  "version" => "1.0",
  "documents" => [+ SMART-Document],
  "status" => int,
  * tstr => any
}

SMART-Document = {
  "docType" => smart-doc-type,
  "issuerSigned" => SMART-IssuerSigned,
  "deviceSigned" => SMART-DeviceSigned,
  * tstr => any
}

SMART-IssuerSigned = {
  "nameSpaces" => {
    smart-namespace => [+ tag24-smart-issuer-signed-item]
  },
  "issuerAuth" => COSE-Sign1-issuerAuth,
  * tstr => any
}

tag24-smart-issuer-signed-item = #6.24(bstr .cbor SMART-IssuerSignedItem)

SMART-IssuerSignedItem = {
  "digestID" => int,
  "random" => bstr,
  "elementIdentifier" => smart-response-element,
  "elementValue" => SmartHealthCheckinResponseJSON,
  * tstr => any
}

SmartHealthCheckinResponseJSON = tstr
```

A Wallet/Responder SHALL carry the SMART response as the `elementValue` of the issuer-signed `smart_health_checkin_response` item. It SHALL NOT carry the SMART response as `requestInfo`, as a plaintext Digital Credentials API JSON field, or as a device-signed namespace element in place of the issuer-signed item.

The `digestID` value is an integer chosen consistently with the MSO `valueDigests` map. Active Android fixtures use digest id `0` for the single SMART item, but this appendix does not make `0` a core protocol constant. A conformance-vector profile MAY choose a deterministic digest-id convention for reproducible vectors if it labels that choice as vector-specific.

### C.8 MSO value digest and `issuerAuth`

The MSO and issuer-signed namespace machinery are ISO/IEC 18013-5 structures. This profile constrains the SMART-specific digest relationship:

```text
IssuerSignedItemBytes = tag24(CBOR(SMART-IssuerSignedItem))
MSO.valueDigests["org.smarthealthit.checkin"][digestID]
  = SHA-256(IssuerSignedItemBytes)
```

The digest input is the complete tag-24 value containing the encoded `IssuerSignedItem`, not only `elementValue`, not the untagged inner map, and not diagnostic notation. `issuerAuth` is a `COSE_Sign1` over the MSO payload according to the ISO/mdoc rules profiled in §8. For the core flow, §8 uses ES256 (`alg` `-7`) and an MSO `docType` of `org.smarthealthit.checkin.1`, with `digestAlgorithm` `SHA-256` and `deviceKeyInfo.deviceKey` identifying the device public key used for device authentication.

Issuer trust evaluation is separate from structural validation. Demo, self-attested, pinned, registry-trusted, or production issuer evidence can all have the same CBOR shape but different policy status.

### C.9 Device authentication and device-signed namespaces

The core profile normally uses empty `DeviceNameSpaces` unless a deployment profile defines additional device-signed elements. The SMART response itself remains issuer-signed.

```cddl
SMART-DeviceSigned = {
  "nameSpaces" => tag24-device-name-spaces,
  "deviceAuth" => {
    "deviceSignature" => COSE-Sign1-deviceSignature,
    * tstr => any
  },
  * tstr => any
}

tag24-device-name-spaces = #6.24(bstr .cbor DeviceNameSpaces)
DeviceNameSpaces = { * tstr => any }

DeviceAuthentication = [
  "DeviceAuthentication",
  SessionTranscriptBytes,
  smart-doc-type,
  tag24-device-name-spaces
]

DeviceAuthenticationBytes = #6.24(bstr .cbor DeviceAuthentication)
```

The Wallet/Responder signs the device-authentication payload with the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`. The Verifier uses the expected `SessionTranscript`, `docType`, and tag-24 `DeviceNameSpaces` bytes when verifying the device signature.

### C.10 Duplicate handling and acceptance profile

Section 8 requires the Verifier to locate a document with `docType` `org.smarthealthit.checkin.1`, locate the issuer-signed `smart_health_checkin_response` element in namespace `org.smarthealthit.checkin`, verify its MSO digest binding, and validate the extracted SMART response under §6. This appendix recommends, but does not yet finalize as a separate core rule, that conformance tools reject ambiguous fixture cases with duplicate SMART documents, duplicate stable response elements, or multiple disclosed items with the same `digestID` in the SMART namespace unless a later conformance section defines deterministic selection rules. Appendix A and §13 should decide whether duplicate rejection is a core SHALL, deployment-profile requirement, or test-suite constraint.

Successful mdoc presentation, HPKE opening, issuer/MSO validation, and device authentication do not by themselves create clinical-source provenance for unsigned raw FHIR JSON Artifacts. Provenance for clinical content remains governed by §7.4 and by the Artifact payload or deployment evidence.

## Appendix D. Same-device fixture index and classification guidance

Appendix D is the authoritative fixture index for checked-in vectors. The entries below are limited to same-device roots confirmed in the repository. Kiosk fixture material belongs to later T4/T6 work.

Fixture labels should distinguish:

- **Conformance vector**: stable enough for automated pass/fail requirements. It exposes exact byte boundaries and expected validation results. Private keys in such fixtures are test-only and intentionally public.
- **Diagnostic vector**: useful for debugging, byte-ladder review, documentation, or implementation comparison, but not a normative pass/fail oracle by itself.
- **Historical capture**: a real or older capture preserved for regression, evidence, or browser/platform behavior. It may be valuable but should not silently define current conformance if the specification has moved.
- **Negative vector**: a fixture that should be rejected or classified as not SMART Health Check-in, with an explicit expected failure reason.

### D.1 `fixtures/dcapi-requests/ts-smart-checkin-basic/`

Classification: candidate conformance vector for unsigned-readerAuth request construction; diagnostic until Appendix A/D freezes deterministic encoding rules.

Purpose: generated TypeScript request vectors for the core direct `org-iso-mdoc` request without `readerAuth`. The root contains the browser request wrapper, `DeviceRequest` bytes/base64url, `encryptionInfo` bytes/base64url, recipient key material, inspection output, and expected extracted SMART request JSON.

Byte boundaries this class should expose:

1. exact SMART request JSON text;
2. decoded `ItemsRequest` logical contents;
3. tag-24 `ItemsRequest` bytes;
4. CBOR `DeviceRequest` bytes and `data.deviceRequest` base64url string;
5. CBOR `encryptionInfo` bytes and exact `data.encryptionInfo` base64url string;
6. recipient P-256 public/private test keys;
7. `SessionTranscript` bytes when origin is known; and
8. expected Wallet extraction of `requestInfo["org.smarthealthit.checkin.request"]`.

This root should not be used to require 32-byte nonces generally unless the vector profile explicitly says “this conformance vector uses 32-byte nonces”.

### D.2 `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`

Classification: candidate conformance vector for request construction with per-`DocRequest.readerAuth`; diagnostic until reader certificate trust expectations are fixed.

Purpose: generated TypeScript request vectors including detached ES256 `readerAuth`. The root includes the reader certificate, public key material, `reader-auth.cbor`, `items-request-tag24.cbor`, `session-transcript.cbor`, request wrappers, inspection output, and expected SMART request JSON.

Byte boundaries this class should expose in addition to D.1:

1. exact `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))`;
2. serialized `COSE_Sign1` for `readerAuth`;
3. protected header containing `alg = -7`;
4. serialized payload field `null`;
5. empty external AAD in the signing calculation;
6. header label `33` (`x5chain`) with at least the leaf certificate; and
7. expected verification classification: syntactically valid, cryptographically valid, and test-certificate-only unless a deployment profile trusts the fixture certificate.

### D.3 `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`

Classification: historical real-platform capture and high-value diagnostic vector; candidate conformance fixture only for byte-boundary checks that Appendix D explicitly freezes.

Purpose: real Chrome/Android Credential Manager request capture for SMART Health Check-in. The root includes the captured Digital Credentials API request, `credential-manager-request.json`, decoded/request inspection files, `DeviceRequest`, `ItemsRequest`, tag-24 `ItemsRequest`, `readerAuth`, detached payload, `encryptionInfo`, `SessionTranscript`, extracted SMART request JSON, recipient public/private test JWKs, and request-artifacts metadata.

Byte boundaries this class should expose:

1. exact browser JSON request wrapper as captured;
2. `data.deviceRequest` and decoded CBOR bytes;
3. `data.encryptionInfo` exact base64url string and decoded CBOR bytes;
4. platform origin used for the transcript;
5. `dcapiInfo`/`SessionTranscript` bytes;
6. `readerAuth` bytes and detached payload bytes;
7. tag-24 `ItemsRequest` bytes and decoded SMART request JSON;
8. SHA-256 hashes for files used as byte oracles; and
9. paired recipient private JWK labeled as intentionally public test fixture material.

Because this root came from a real platform run, Appendix D should preserve capture metadata such as browser/package, origin source, capture time, and “containsPhi: false”. It should not turn incidental browser or demo-run behavior into a core protocol rule.

### D.4 `fixtures/dcapi-requests/negative-mattr-mdl/`

Classification: negative vector / historical non-SMART mdoc request.

Purpose: captured `org-iso-mdoc` request for an mDL-style document, not SMART Health Check-in. It is useful to prove that a Wallet/Responder does not treat arbitrary `org-iso-mdoc` requests, mDL namespaces, or dynamic element names as SMART check-in requests.

Expected classification: not a valid SMART Health Check-in same-device request because it does not request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable response element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request` in the required shape.

### D.5 `fixtures/responses/pymdoc-minimal/`

Classification: diagnostic response-construction vector; candidate conformance vector for issuer-signed item digest boundaries after CDDL and deterministic expectations are frozen.

Purpose: minimal pyMDOC/CBOR-generated response material. The root exposes `smart-response.json`, `issuer-signed-item.cbor`, `issuer-signed-item-tag24.cbor`, `value-digest-input.cbor`, `mso.cbor`, `mso-tag24.cbor`, `issuer-auth.cbor`, `document.cbor`, diagnostics, and an `expected-walk.json`.

Byte boundaries this class should expose:

1. exact SMART response JSON text carried as `IssuerSignedItem.elementValue`;
2. untagged `IssuerSignedItem` bytes;
3. tag-24 `IssuerSignedItem` bytes;
4. value-digest input bytes and SHA-256 digest;
5. MSO bytes and tag-24 MSO bytes where applicable;
6. `issuerAuth` COSE bytes;
7. document/response walk showing namespace, element identifier, digest id, and digest match; and
8. clear notice where nondeterministic ECDSA signatures make some complete-document bytes unsuitable as stable conformance oracles.

This root does not by itself exercise HPKE, browser `dcapiResponse`, or real platform origin binding.

### D.6 `fixtures/responses/real-chrome-android-smart-checkin/`

Classification: historical real-platform response capture and high-value diagnostic vector; candidate end-to-end conformance fixture only if Appendix D freezes the paired request, test keys, and expected validation policy.

Purpose: real Android wallet response artifacts paired with `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`. The root includes the Digital Credentials API wallet response JSON, `dcapi-response.cbor`, `DeviceResponse` bytes, HPKE `enc` and ciphertext bytes, `SessionTranscript`, `DeviceAuthentication`, issuer-signed item, value digest, MSO, `issuerAuth`, extracted SMART response JSON, response inspections, HPKE-opened inspection, and submission/debug artifacts.

Byte boundaries this class should expose:

1. exact `data.response` base64url string and CBOR `dcapiResponse` bytes;
2. HPKE `enc` bytes and ciphertext bytes;
3. `SessionTranscript` bytes used as HPKE `info` and device-authentication input;
4. plaintext `DeviceResponse` bytes after HPKE open with the paired test private key;
5. tag-24 `IssuerSignedItem` bytes and `value-digest.bin`;
6. MSO and `issuerAuth` bytes;
7. `DeviceAuthenticationBytes` and device signature validation context;
8. extracted `smart_health_checkin_response` JSON and expected SMART response JSON; and
9. opened-response inspection proving §6.6 correlation to the paired SMART request.

Appendix D should label the paired HPKE private key as intentionally public test-only material and should keep “successful mdoc/HPKE presentation” separate from clinical-source provenance for any raw FHIR JSON in the SMART response.

### D.7 `fixtures/responses/android-kotlin-generated/`

Classification: diagnostic Android byte-check material unless and until its generator and expected validation policy are promoted to conformance-vector status.

Purpose: Android-generated response inspection and pyMDOC byte-check comparison material. Confirmed files include `pymdoc-byte-check.json` and `opened-response-inspection.json`. This root is useful for comparing Android response construction with the pyMDOC/minimal and real-platform response walks.

Byte boundaries this class should expose or reference:

1. opened `DeviceResponse` inspection;
2. issuer-signed SMART response item location and decoded `elementValue`;
3. MSO value-digest comparison;
4. device-authentication context; and
5. differences from pyMDOC or real Chrome/Android captures, if any.

Because the root contains inspection JSON rather than the full byte ladder currently visible in other roots, Appendix D should avoid labeling it a full conformance vector without further generator documentation.

### D.8 `wallet-android/app/src/test/resources/test-vectors.json`

Classification: candidate conformance vector for Android/TypeScript interoperability checks; generated test resource.

Purpose: generated request and transcript vectors consumed by Android tests. The file records the SMART docType, namespace, response element, requestInfo key, TypeScript-generated `DeviceRequest` hex values, rejection vectors, and `SessionTranscript` vectors.

Byte boundaries this class should expose:

1. exact SMART request JSON strings;
2. exact `DeviceRequest` hex for representative clinical request shapes;
3. expected rejection vector(s) for non-SMART mdoc requests;
4. `encryptionInfo` hex/base64url and origin inputs; and
5. expected `SessionTranscript` hex.

This file is especially useful for ensuring Android parsing remains aligned with TypeScript request construction. Appendix D should state the generator source and generation date where present, and should not treat all included clinical examples as required clinical content for conformant Wallets.

### D.9 Fixture-index table draft

| Root or file | Draft label | Main use | Conformance status guidance |
| --- | --- | --- | --- |
| `fixtures/dcapi-requests/ts-smart-checkin-basic/` | TypeScript request vectors | Basic request, `DeviceRequest`, `ItemsRequest`, `encryptionInfo`, extraction | Candidate request conformance vector after deterministic encoding and nonce-profile wording are frozen |
| `fixtures/dcapi-requests/ts-smart-checkin-readerauth/` | TypeScript readerAuth vectors | Detached readerAuth, x5chain, SessionTranscript binding | Candidate readerAuth conformance vector for cryptographic validity; trust remains test-only unless profile says otherwise |
| `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` | Real Chrome/Android request capture | Platform request wrapper, origin, transcript, readerAuth, byte hashes | Historical/diagnostic by default; promote only named byte checks |
| `fixtures/dcapi-requests/negative-mattr-mdl/` | Negative mDL request | Rejection of non-SMART mdoc request | Negative vector |
| `fixtures/responses/pymdoc-minimal/` | Minimal pyMDOC response | Issuer-signed item, value digest, MSO, issuerAuth walk | Diagnostic; candidate digest-boundary vector |
| `fixtures/responses/real-chrome-android-smart-checkin/` | Real Chrome/Android response capture | HPKE response, DeviceResponse, issuer/device proofs, extraction | Historical/diagnostic by default; candidate paired end-to-end vector |
| `fixtures/responses/android-kotlin-generated/` | Android generated response inspections | Android byte-check and opened-response comparison | Diagnostic unless promoted by generator/test policy |
| `wallet-android/app/src/test/resources/test-vectors.json` | Android test vectors | TypeScript/Android request and transcript interoperability | Candidate conformance test resource for request and transcript cases |

### D.10 General fixture publication rules

Fixture entries SHOULD identify whether they contain PHI; the confirmed same-device fixture metadata reviewed here indicates demo/test material and `containsPhi: false` where real captures expose that field. Fixture entries that include private keys SHALL label them as intentionally public test-only keys and SHALL warn against reuse. Fixture entries SHOULD include SHA-256 hashes for byte-oracle files and SHOULD separate logical decoded JSON from byte-exact CBOR, tag-24, HPKE, and COSE artifacts.

A fixture can be protocol-valid while relying on test-only issuer or reader material. Appendix D should therefore label structural/cryptographic pass status separately from deployment trust status. Conversely, a historical capture can be useful evidence even when it is not a normative conformance vector.

## Organizer notes

Strengths:

- Aligns Appendix C with §8 and Appendix E/F/G without inventing alternate request carriers, response carriers, HPKE parameters, trust semantics, or clinical semantics.
- Clearly marks CDDL as profile constraints / pseudo-CDDL where exact ISO labels or full structures are not confirmed.
- Preserves the accepted SMART request carrier, issuer-signed SMART response item, `DeviceRequest` version, optional per-`DocRequest.readerAuth`, exact `encryptionInfo` string transcript binding, HPKE suite, empty AAD, and raw-FHIR provenance boundary.
- Names only fixture roots and files confirmed in the repository listing or inspected metadata.

Caveats:

- Complete CDDL needs an editor pass against the chosen ISO/IEC 18013-5 and direct `org-iso-mdoc` reference grammar before publication.
- Duplicate document/element handling is security-relevant but not finalized here as a core SHALL because upstream conformance closure has not decided it.
- The fixture classifications are intentionally conservative: many roots are diagnostic or candidate conformance vectors rather than current normative pass/fail fixtures.

Open issues:

- Decide whether Appendix A/§13 makes duplicate SMART document or duplicate stable element rejection a core requirement, deployment-profile requirement, or conformance-suite rule.
- Decide whether any conformance-vector profile mandates 32-byte nonces while preserving the core rule of fresh unpredictable nonce bytes with at least 16 bytes recommended.
- Decide whether digest id `0` becomes a deterministic fixture convention for single-item vectors or remains purely implementation-selected.
- Decide which real Chrome/Android capture checks are stable enough for conformance versus historical diagnostics, especially if browser/Credential Manager behavior changes.

Downstream dependencies:

- T4.D will add kiosk CDDL and kiosk fixture material without changing the same-device request/response carriers.
- T5.A/T5.F should turn any accepted Appendix C/D requirements into conformance checklist rows with clear targets.
- T5.B/T5.C should address fixture private-key hygiene, plaintext debug artifacts, replay/freshness, origin assurance, and raw-FHIR provenance overclaiming.
- T6.C should reconcile this draft fixture index with worked examples and any refreshed Android/browser captures.
