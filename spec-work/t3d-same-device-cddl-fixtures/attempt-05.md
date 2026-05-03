# T3.D attempt 05 — same-device CDDL and fixture material

## Appendix C: CDDL and diagnostic structure for the same-device binding

This appendix profiles the CBOR and Digital Credentials API structures used by the same-device direct `org-iso-mdoc` flow in §8. Section 8 is the normative source of behavior. This appendix is intended to make the byte-oriented structure reviewable, to identify tag-24 and signature inputs, and to state the SMART Health Check-in profile constraints on top of ISO/IEC 18013-5 structures.

The exact ISO/IEC 18013-5 base CDDL is not reproduced here. Unless a rule below explicitly constrains a SMART Health Check-in field, implementations reuse the corresponding ISO/IEC 18013-5 structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, and COSE objects. The pseudo-CDDL in this appendix is intentionally profile-level: it names logical fields and byte boundaries confirmed by §8 and the active fixtures, but it does not claim to be a complete replacement for ISO/IEC 18013-5 CDDL or COSE/CBOR specifications.

### C.1 Notation and scope

The notation follows §1.5.2 and Appendix F. `bstr .cbor X` means a byte string containing a CBOR serialization of `X`. `#6.24(bstr .cbor X)` means CBOR tag 24 around the encoded bytes of `X`. `COSE_Sign1` and `COSE_Key` are references to COSE structures, not redefinitions.

The SMART same-device profile uses these fixed identifiers:

```text
smart-protocol-id = "org-iso-mdoc"
smart-doc-type = "org.smarthealthit.checkin.1"
smart-namespace = "org.smarthealthit.checkin"
smart-response-element = "smart_health_checkin_response"
smart-request-info-key = "org.smarthealthit.checkin.request"
```

A Verifier, Wallet/Responder, or Verifier-side processor that implements this same-device profile SHALL apply the §8 constraints when producing or consuming the corresponding structures. This appendix does not define alternate request carriers, response carriers, HPKE parameters, trust semantics, or clinical semantics.

### C.2 Digital Credentials API request wrapper

The browser-facing request wrapper is JSON, not CBOR, so it is described prose-first rather than as CDDL. The Verifier invokes the Digital Credentials API with a request entry whose `protocol` is `org-iso-mdoc` and whose `data` contains:

- `deviceRequest`: unpadded base64url of the CBOR `DeviceRequest` bytes; and
- `encryptionInfo`: unpadded base64url of the CBOR `encryptionInfo` bytes.

The exact `encryptionInfo` base64url string is later incorporated into the direct `dcapi` `SessionTranscript`. Producers and consumers SHALL NOT treat a decoded and re-encoded spelling as interchangeable for transcript construction.

### C.3 `DeviceRequest`, `DocRequest`, and tag-24 `ItemsRequest`

The core same-device request uses ISO/IEC 18013-5 `DeviceRequest` version `"1.0"` and a per-document request. The SMART profile constrains the relevant logical shape as follows:

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

The `bool` under `nameSpaces` is the mdoc `intentToRetain` value. It is not Holder consent. The SMART request SHALL appear only as the text string at `requestInfo["org.smarthealthit.checkin.request"]` for this version 1.0 flow. The requested clinical content, FHIR selectors, questionnaire selectors, accepted media types, and response status semantics remain inside the SMART request and response models; they are not separate mdoc elements in the core profile.

### C.4 Optional per-`DocRequest.readerAuth`

Reader authentication is optional in the core profile unless a deployment profile requires it. When present, it is the ISO/IEC 18013-5 per-`DocRequest.readerAuth` mechanism for `DeviceRequest` version `"1.0"`; `readerAuthAll` from `DeviceRequest` version `"1.1"` is not the SMART Health Check-in 1.0 core mechanism.

```cddl
; COSE_Sign1 is defined by COSE. This profile constrains its algorithm,
; payload treatment, and certificate evidence.
cose-sign1-reader-auth = COSE_Sign1

reader-authentication-bytes = #6.24(bstr .cbor [
  "ReaderAuthentication",
  session-transcript-bytes,
  smart-items-request-bytes
])
```

A Verifier that includes `readerAuth` SHALL construct a detached `COSE_Sign1` with protected header `{1: -7}` for ES256, serialized payload `null`, empty external AAD, and `ReaderAuthenticationBytes` as the detached payload in the COSE `Signature1` structure. It SHALL include reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Wallet/Responder acceptance of a certificate chain, trust anchor, revocation status, or organizational assurance label is deployment-policy work under §7.

### C.5 `encryptionInfo` and `SessionTranscript` carrier

`encryptionInfo` is a CBOR value carried as base64url text in the Digital Credentials API request wrapper:

```cddl
smart-encryption-info = [
  "dcapi",
  {
    "nonce" => bstr,
    "recipientPublicKey" => p256-recipient-public-key,
    * tstr => any
  }
]

p256-recipient-public-key = COSE_Key ; constrained to EC2 P-256 public key
```

The `recipientPublicKey` SHALL be a COSE_Key for EC2 P-256 and include the public x and y coordinates. The nonce SHALL be fresh and unpredictable for the presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy. Active TypeScript request construction defaults to 32 bytes, and fixtures may choose to require 32-byte nonces for their own reproducibility profile, but this appendix should not make 32 bytes a universal core requirement unless conformance closure does so explicitly.

The direct `dcapi` transcript construction is byte-sensitive:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact unpadded text from the request wrapper. `origin` is supplied by the Browser / User Agent, platform, or deployment-approved privileged-caller mechanism. It is not derived from the SMART request, `purpose`, display text, selector URLs, kiosk metadata, callback-looking strings, or returned Artifacts.

### C.6 Direct `dcapiResponse` and HPKE result wrapper

The Wallet/Responder encrypts CBOR `DeviceResponse` bytes using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. The HPKE output is wrapped as CBOR before being base64url-encoded in the JSON result:

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

`enc` is the HPKE encapsulated key for the selected KEM. Active fixtures expose it as the P-256 KEM encapsulated public key bytes. `cipherText` is the AEAD ciphertext including its authentication tag. The Digital Credentials API result is JSON, not CBOR CDDL:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR smart-dcapi-response>"
  }
}
```

A Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a different `dcapiResponse` carrier, or another HPKE suite for the core version 1.0 flow.

### C.7 `DeviceResponse` subset and issuer-signed SMART response item

After HPKE opening, the plaintext is a CBOR `DeviceResponse` using ISO/IEC 18013-5 structures. The SMART profile constrains the accepted subset to include a successful response containing a document for `docType` `org.smarthealthit.checkin.1` with the SMART response in an issuer-signed namespace item:

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

The Wallet/Responder SHALL carry the SMART response only as the `elementValue` of the issuer-signed `smart_health_checkin_response` item. The SMART response is not a `requestInfo` value, not a device-signed namespace item in the core profile, and not a plaintext field outside the mdoc response.

The `elementValue` string contains a SMART response conforming to §6. Its `requestId`, `artifacts[]`, `fulfills[]`, media types, FHIR version fields, SMART Health Card payloads, and `requestStatus[]` are validated under §6, not by mdoc CDDL alone.

### C.8 MSO valueDigest references and `issuerAuth`

The Mobile Security Object and `issuerAuth` are ISO/IEC 18013-5 and COSE structures. This profile constrains them as follows:

- `MSO.docType` is `org.smarthealthit.checkin.1`.
- `MSO.digestAlgorithm` is `SHA-256` for the core profile.
- `MSO.valueDigests["org.smarthealthit.checkin"][digestID]` corresponds to the disclosed `IssuerSignedItem.digestID`.
- The value digest input is the complete tag-24-wrapped `IssuerSignedItem` bytes, not only the inner map and not only `elementValue`.
- `MSO.deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.
- `issuerAuth` is a `COSE_Sign1` using ES256 (`alg` `-7`) over the MSO payload form required by §8 and the ISO-compatible encoding selected by Appendix C/conformance closure.

Active Android fixtures use digest ID `0` for the single stable element, but the core protocol requirement is consistency between the disclosed item `digestID` and the corresponding MSO `valueDigests` entry. A fixture profile may freeze digest ID `0` for a named vector class, but this appendix should not silently make that value a general protocol constant.

### C.9 `DeviceAuthentication`, device `COSE_Sign1`, and `DeviceNameSpaces`

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

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The device `COSE_Sign1` SHALL use the device private key corresponding to `MSO.deviceKeyInfo.deviceKey` and the mdoc device-authentication signing rules. The SMART response item remains issuer-signed; moving it into `DeviceNameSpaces` is not an equivalent SMART Health Check-in response carrier.

### C.10 Verifier extraction and validation implications

Appendix C CDDL can identify the expected carriers, but it cannot by itself establish trust or clinical validity. A Verifier accepting a same-device response SHALL perform the §8.7 and §8.8 checks: decode the JSON wrapper, HPKE-open using the expected transcript, parse `DeviceResponse`, validate `issuerAuth`, validate the MSO and digest binding, validate device authentication, extract the SMART response JSON string from the stable issuer-signed item, validate it under §6, and apply §6.6 cross-validation against the original SMART request.

Successful mdoc parsing, HPKE opening, digest validation, issuer evidence, or device signature validation does not create clinical-source provenance for unsigned raw FHIR JSON. Source trust for raw FHIR JSON, SMART Health Cards, provenance-bearing FHIR, or other Artifact forms remains governed by §7.4 and the Artifact evidence itself.

## Appendix D: same-device fixture index and classification guidance

Appendix D is an index of checked-in fixture material under `fixtures/` and related Android test resources. It should label each fixture class by purpose and by conformance status. A fixture path MUST be listed only when it exists in the repository. The paths below were verified as existing roots or files for this draft.

### D.1 Classification labels

Appendix D should use labels such as:

- **Conformance vector**: stable, intentional material suitable for automated pass/fail checks of version 1.0 requirements. A conformance vector should identify exact producer assumptions, expected byte boundaries, and all secrets as test-only.
- **Diagnostic vector**: useful for implementer debugging, byte-ladder explanation, or interoperability investigation, but not by itself a normative acceptance test.
- **Real platform capture**: output captured from a browser, Android Credential Manager, or Android Wallet path. It is valuable interoperability evidence; it should be labeled either current conformance evidence or historical capture depending on freshness and alignment with the final spec.
- **Historical / negative fixture**: material retained to document rejected profiles, archived experiments, non-SMART mdoc requests, or older behavior. It should not be used as evidence of the active profile except to test rejection or migration behavior.

Fixture entries should state whether they contain PHI. Current metadata for the confirmed same-device real Chrome/Android request and response says `containsPhi: false`, but Appendix D should still avoid encouraging reuse of demo private keys, certificates, or captured ciphertexts outside tests.

### D.2 Generated TypeScript request vectors

Path:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
```

Purpose: generated deterministic TypeScript request material for the basic SMART Health Check-in same-device request shape without `readerAuth`. This class is useful for confirming `org-iso-mdoc` request wrapper construction, `DeviceRequest.version == "1.0"`, tag-24 `ItemsRequest`, SMART request JSON in `requestInfo`, requested `smart_health_checkin_response`, `encryptionInfo`, and direct `SessionTranscript` derivation.

Byte boundaries to expose:

- `request.json` / `navigator-credentials-get.arg.json` as the JSON Digital Credentials API request wrapper;
- `device-request.b64u` and `device-request.cbor.hex` as the outer request bytes;
- `encryption-info.b64u` and `encryption-info.cbor.hex` as the transcript-bound encryption information;
- `inspection.json` for decoded structure; and
- `smart-request.expected.json` for the clinical JSON extracted from `requestInfo`.

Recommended label: **conformance vector candidate** for verifier request construction if generation is deterministic and aligned with the final §8/App C text. If generation remains tied to non-final demo request content, label as **diagnostic vector** until T6.C final alignment.

### D.3 Generated TypeScript request vectors with `readerAuth`

Path:

```text
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
```

Purpose: generated TypeScript request material that includes optional per-`DocRequest.readerAuth`. This class exercises the same request byte boundaries as D.2 plus reader-authentication signing and certificate evidence.

Byte boundaries to expose:

- all D.2 request and `encryptionInfo` boundaries;
- `items-request-tag24.cbor` as the detached reader-auth payload component;
- `session-transcript.cbor` as the transcript component;
- `reader-auth.cbor` as the detached `COSE_Sign1`;
- `reader-certificate.der`, `reader-public.jwk.json`, and related test-only key material; and
- inspection output showing protected algorithm `-7`, payload `null`, `x5chain` label `33`, and signature binding.

Recommended label: **conformance vector candidate** for optional `readerAuth` structure and byte binding. Trust-chain acceptance should be labeled **deployment-policy test-only** unless a deployment profile defines anchors and revocation behavior.

### D.4 Real Chrome/Android request capture

Path:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
```

Purpose: real browser / Android Credential Manager request capture proving that the active platform path can carry the SMART request through `ItemsRequest.requestInfo` and can preserve the direct `dcapi` transcript inputs. Metadata identifies it as a positive real-platform request with origin `http://127.0.0.1:3010`, `readerAuth.present = true`, and `readerAuth.signatureValid = true`.

Byte boundaries to expose:

- `credential-manager-request.json`, `navigator-credentials-get.arg.json`, and `request.json` for JSON wrapper views;
- `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, and `device-request.diag`;
- `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request-tag24.cbor`, and `items-request-tag24.cbor.hex`;
- `request-info.json`, `smart-request.raw.json`, `smart-request.expected.json`, and `smart-request.hydrated.json`;
- `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, and `encryption-info.diag`;
- `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.diag`;
- `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, and `reader-auth-detached-payload.cbor.hex`; and
- `recipient-public.jwk.json` and intentionally public test-only `recipient-private.jwk.json` when paired with the response fixture for offline HPKE opening.

Recommended label: **real platform capture; conformance evidence candidate** for current same-device request behavior. If final conformance requires a production origin, final reader certificate policy, different nonce profile, or refreshed demo payload, relabel this root as **diagnostic / historical real platform capture** rather than silently treating it as normative.

### D.5 Minimal pymdoc response fixture

Path:

```text
fixtures/responses/pymdoc-minimal/
```

Purpose: minimal response material generated by the pymdoc fixture tooling. It isolates issuer-signed response structures, MSO contents, value-digest input, and SMART response extraction without requiring a full real platform capture. The manifest notes that `value-digest-input.cbor` is the exact tag-24 issuer item digest input and that `document.cbor` may contain nondeterministic ECDSA signature bytes.

Byte boundaries to expose:

- `smart-response.json` and `input.json` for clinical payload inputs/outputs;
- `issuer-signed-item.cbor`, `issuer-signed-item-tag24.cbor`, and their `.diag` / `.hex` forms;
- `value-digest-input.cbor`, `.diag`, and `.hex` as the digest oracle;
- `mso.cbor`, `mso-tag24.cbor`, `issuer-auth.cbor`, and diagnostic/hex forms;
- `document.cbor` and `document.diag`; and
- `expected-walk.json` for decoded response walking.

Recommended label: **diagnostic vector** or **conformance vector candidate for response substructure**. It should not be labeled as a complete same-device DC API response unless it includes the `DeviceResponse`, HPKE, `dcapiResponse`, and Digital Credentials API result wrapper required by §8.

### D.6 Real Chrome/Android response capture

Path:

```text
fixtures/responses/real-chrome-android-smart-checkin/
```

Purpose: real Android Wallet response debug artifacts paired with the real Chrome/Android request capture. This class demonstrates the complete same-device response path: Digital Credentials API result wrapper, CBOR `dcapiResponse`, HPKE `enc` and `cipherText`, opened `DeviceResponse`, issuer-signed SMART response item, MSO value digest, device authentication, and extracted SMART response JSON. Metadata points to the paired request fixture and to the intentionally public test-only HPKE private JWK used for offline opening.

Byte boundaries to expose:

- `wallet-response.digital-credential.json`, `credential.json`, and `submit.json` as JSON wrapper/submission views;
- `dcapi-response.cbor`, `.cbor.hex`, and `.cbor.b64u`;
- `hpke-enc.bin`, `hpke-ciphertext.bin`, and their `.hex` / `.b64u` forms;
- `device-response.cbor`, `.cbor.hex`, and `.cbor.b64u`;
- `issuer-signed-item-tag24.cbor`, `value-digest.bin`, `mso.cbor`, `issuer-auth.cbor`, `device-authentication.cbor`, and `session-transcript.cbor` with available `.hex` / `.b64u` forms;
- `smart-response.raw.json`, `smart-response.expected.json`, and `smart-response.json`;
- `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, and `hpke-opened-response-inspection.json`; and
- `pymdoc-byte-check.json` as an external byte-check report for signatures, digest binding, and transcript binding.

Recommended label: **real platform capture; conformance evidence candidate** for end-to-end same-device response processing and byte-boundary diagnostics. Keep the label conditional until final §11/§13/T6.C decisions settle origin assurance, reader trust, issuer trust, deterministic encoding expectations, and whether a refreshed platform capture is required.

### D.7 Android/Kotlin-generated response checks

Path:

```text
fixtures/responses/android-kotlin-generated/
```

Purpose: Android/Kotlin-generated response inspection material. The verified files at this root are:

```text
fixtures/responses/android-kotlin-generated/pymdoc-byte-check.json
fixtures/responses/android-kotlin-generated/opened-response-inspection.json
```

This class appears useful for checking Android-generated issuer/device signatures, digest binding, SessionTranscript binding, and decoded SMART response walks. Because this draft did not inspect a root manifest for this class, Appendix D should describe it cautiously until T6.C confirms generation inputs and reproducibility.

Byte boundaries to expose: at minimum, the opened response inspection and byte-check report. If future fixture refresh adds raw CBOR siblings, Appendix D should index those explicit files only after verifying their existence.

Recommended label: **diagnostic vector** until generation provenance, stability, and expected inputs are documented.

### D.8 Android test vector JSON

Path:

```text
wallet-android/app/src/test/resources/test-vectors.json
```

Purpose: Android unit-test resource generated from TypeScript protocol code. It records active identifiers, generated request vectors, rejection vectors, and SessionTranscript vectors. It is useful as a cross-language check that Android parsing and transcript construction agree with TypeScript generation.

Byte boundaries to expose:

- top-level `doctype`, `namespace`, `responseElement`, and `requestInfoKey` identifiers;
- `requestVectors[].smartRequestJson` and `requestVectors[].deviceRequestHex`;
- `rejectionVectors[]` for negative/historical mdoc material; and
- `sessionTranscriptVectors[]` with `origin`, `encryptionInfoHex`, `encryptionInfoBase64Url`, and `sessionTranscriptHex`.

Recommended label: **conformance vector candidate** for identifiers, request parsing, rejection of non-SMART mdoc requests, and SessionTranscript derivation. Because it is an Android test resource rather than an Appendix D fixture root, Appendix D should cross-reference it as supporting test material, not as the only canonical fixture index.

### D.9 Negative / historical request material

Path:

```text
fixtures/dcapi-requests/negative-mattr-mdl/
```

Purpose: negative request material for a non-SMART mDL request. The verified root currently exposes `metadata.json`. It is useful to document rejection behavior and to prevent accidental broad matching of arbitrary `org-iso-mdoc` requests as SMART Health Check-in requests.

Byte boundaries to expose: only verified files should be named. If later fixture refresh adds `deviceRequest` bytes or decoded inspections under this root, Appendix D can index them after verification.

Recommended label: **negative / historical fixture**, not a positive SMART Health Check-in conformance vector.

### D.10 Guidance for final Appendix D entries

Each final Appendix D entry should include:

1. the exact path or root;
2. fixture class and label (`conformance vector`, `diagnostic vector`, `real platform capture`, `historical`, or `negative`);
3. producer and date when known;
4. whether PHI is present;
5. which §8/App C obligations it exercises;
6. byte boundaries exposed, including where tag-24 inputs, transcript inputs, COSE payloads, HPKE inputs, and JSON wrappers are found;
7. trust status for keys, certificates, issuer evidence, and private JWKs, explicitly marking test-only material; and
8. whether final conformance depends on exact bytes, decoded structure, semantic validation, or diagnostic comparison only.

Appendix D should avoid making active demo artifacts stronger than they are. A real Chrome/Android capture is strong evidence for interoperability with current platforms, but final conformance status depends on whether final §8, Appendix C, §11, §13, and T6.C preserve the same origin, nonce, readerAuth, issuer, and payload assumptions.

## Organizer notes

Strengths:

- Aligns Appendix C with accepted §8 and Appendix E/F/G: request in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, response in issuer-signed `smart_health_checkin_response` `elementValue`, exact `encryptionInfo` base64url transcript binding, HPKE suite, empty AAD, and optional per-`DocRequest.readerAuth`.
- Explicitly avoids inventing complete ISO/IEC 18013-5 CDDL where only profile constraints are confirmed.
- Separates conformance-vector candidates from diagnostic and real-platform evidence, so final Appendix D can avoid overclaiming.
- Preserves the accepted rule that mdoc/HPKE success does not create clinical-source provenance for unsigned raw FHIR JSON.

Caveats:

- Map labels are shown using field names from §8 and active diagnostic material. If final Appendix C needs exact ISO CDDL labels for every map, an ISO source pass is still required.
- `issuerAuth` payload wording should be reconciled with the exact ISO-compatible payload representation chosen during CDDL/conformance closure.
- Android/Kotlin-generated response classification is cautious because this draft verified files in the root but did not find or read a manifest for that class.
- The real Chrome/Android metadata contains capture provenance and test-only key details; final Appendix D should keep provenance useful without publishing operational logs or implying production trust.

Open issues:

- Decide whether duplicate `DeviceResponse` documents or duplicate `smart_health_checkin_response` items are rejected, quarantined, or handled by first-match policy.
- Decide whether fixture conformance freezes 32-byte nonces, digest ID `0`, deterministic CBOR map ordering, ECDSA signature treatment, or other vector-only conventions.
- Decide whether real platform captures remain conformance evidence or become historical once final §11/§13 origin, reader trust, issuer trust, and replay/freshness rules are set.
- Decide whether Appendix D should include file-level SHA-256 values inline or leave them in fixture metadata.

Downstream dependencies:

- §11 should close security treatment for replay/freshness, origin spoofing, reader impersonation, recipient-key reuse, debug/plaintext fixture handling, and duplicate element behavior.
- §13 and Appendix A should decide which profile constraints become testable conformance requirements versus deployment-profile policy.
- T6.C should perform final fixture alignment, refresh captures if needed, and promote only stable, reproducible vectors to conformance status.
