## 8. Same-device direct `org-iso-mdoc` presentation flow

This section defines the version 1.0 base presentation flow for SMART Health Check-in: direct `org-iso-mdoc` over the W3C Digital Credentials API on the same device as the Wallet. The flow carries the transport-neutral SMART request defined in §5 and returns the transport-neutral SMART response defined in §6. It does not define a kiosk wrapper, a second clinical request language, or alternate response semantics. The cross-device kiosk flow in §9 re-enters this same-device flow rather than redefining it.

The conformance targets in this section are the Verifier and the Wallet/Responder. The Browser / User Agent is not a SMART Health Check-in conformance target except for the platform behavior assumed here: it mediates `navigator.credentials.get`, supplies or protects caller-origin context according to the W3C Digital Credentials API and platform rules, and returns the Wallet result to the Verifier page. Deployment profiles MAY add stricter trust, browser, reader, issuer, or clinical-source requirements under §7, but they do not change the clinical semantics of §§5-6.

### 8.1 Identifiers

The same-device direct mdoc flow uses the following fixed version 1.0 identifiers.

| Purpose | Identifier |
| --- | --- |
| Digital Credentials API protocol id | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| stable requested and disclosed element identifier | `smart_health_checkin_response` |
| SMART request carrier in `ItemsRequest.requestInfo` | `org.smarthealthit.checkin.request` |
| HPKE KEM | DHKEM(P-256, HKDF-SHA256), HPKE KEM id `0x0010` |
| HPKE KDF | HKDF-SHA256, HPKE KDF id `0x0001` |
| HPKE AEAD | AES-128-GCM, HPKE AEAD id `0x0001` |
| COSE signature algorithm | ES256, COSE `alg` value `-7` |

A Verifier SHALL use protocol id `org-iso-mdoc` when invoking the Digital Credentials API for this flow. A Wallet/Responder SHALL treat another protocol id as outside this flow.

A Verifier SHALL request mdoc `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`. A Wallet/Responder SHALL return a SMART response for this flow only in the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`.

A Verifier SHALL carry the SMART request JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic element names, archived claim-name experiments, kiosk wrapper fields, or other request locations as the version 1.0 request carrier for this direct `org-iso-mdoc` flow.

### 8.2 Verifier-side request construction

A Verifier begins with a SMART request object that conforms to §5. The Verifier SHALL serialize that object as UTF-8 JSON text and place the resulting JSON string, not a CBOR data item and not a nested JSON object, in:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

This section does not define a canonical JSON serialization for the clinical object. The Wallet/Responder validates the parsed SMART request according to §5. Byte-level fixtures in Appendix D and byte ladders in Appendix E can preserve the exact JSON text used in a capture, but that fixture text does not create a global JSON canonicalization rule.

The Verifier SHALL construct an `ItemsRequest` with this logical shape:

```cbor-diag
{
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": true
    }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": "<UTF-8 JSON text of the SMART request>"
  }
}
```

The `true` value in `nameSpaces["org.smarthealthit.checkin"]["smart_health_checkin_response"]` is the mdoc `intentToRetain` signal. A Verifier SHALL set it to `true` unless the Verifier truly intends only ephemeral use and a deployment profile or local policy permits requesting non-retention. This default reflects ordinary check-in workflows in which returned Artifacts are consumed by downstream administrative or clinical systems. It does not by itself authorize unlimited retention, EHR write-back, or secondary use; privacy and retention policy remain subject to §12 and deployment rules.

The Verifier SHALL encode the `ItemsRequest` as CBOR and wrap those bytes in CBOR tag 24 for the `DocRequest.itemsRequest` value:

```text
itemsRequest = tag24(CBOR(ItemsRequest))
```

The Verifier SHALL construct a `DeviceRequest` with version `"1.0"` and at least one `DocRequest` containing that tag-24-wrapped `itemsRequest`:

```cbor-diag
{
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": tag24(CBOR(ItemsRequest)),
      "readerAuth": COSE_Sign1 / optional
    }
  ]
}
```

Version 1.0 of this specification uses per-`DocRequest.readerAuth` when reader authentication is present. A Verifier SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as the version 1.0 SMART Health Check-in core encoding unless a future profile explicitly defines that mapping.

The Verifier MAY include `readerAuth`. If included, `readerAuth` SHALL be a detached-payload `COSE_Sign1` using ES256 (`alg` `-7`) over the ISO-style `ReaderAuthentication` bytes:

```text
ReaderAuthenticationBytes =
  tag24(CBOR([
    "ReaderAuthentication",
    SessionTranscript,
    itemsRequest
  ]))

readerAuth =
  COSE_Sign1[
    protected:   bstr .cbor { 1: -7 },
    unprotected: { 33: [reader certificate DER] } / deployment-profile key material,
    payload:     null,
    signature:   ES256 over Sig_structure("Signature1", protected, external_aad, ReaderAuthenticationBytes)
  ]
```

For this construction, `external_aad` is the empty byte string. A Verifier that includes `readerAuth` SHALL compute it for the exact `SessionTranscript` and exact tag-24 `itemsRequest` bytes used in the presentation request and SHALL NOT reuse it across sessions, origins, encryption information, or requested-item bytes. `readerAuth` is optional in the core version 1.0 flow unless a deployment profile requires it. Absent `readerAuth` and failed `readerAuth` are distinct trust states under §7.2.

The Verifier SHALL generate an HPKE recipient key pair for the response. The recipient public key in `encryptionInfo` SHALL be a COSE_Key for a P-256 EC2 public key:

```cbor-diag
{
   1: 2,        / kty = EC2 /
  -1: 1,        / crv = P-256 /
  -2: h'<x-coordinate>',
  -3: h'<y-coordinate>'
}
```

The Verifier SHALL construct `encryptionInfo` as CBOR:

```cbor-diag
[
  "dcapi",
  {
    "nonce": h'<fresh nonce bytes>',
    "recipientPublicKey": {
       1: 2,
      -1: 1,
      -2: h'<x-coordinate>',
      -3: h'<y-coordinate>'
    }
  }
]
```

The nonce SHALL be freshly generated for the presentation request and SHALL contain at least 16 bytes of cryptographic randomness. The active implementation uses 32 bytes; Appendix E may show 32-byte examples. A Verifier SHALL retain the matching private key and the exact serialized `encryptionInfo` bytes until response processing completes.

The Verifier SHALL pass the base64url-without-padding encodings of the CBOR `DeviceRequest` and CBOR `encryptionInfo` in the W3C Digital Credentials API request:

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

Appendix D indexes captured fixture files, and Appendix E provides byte-ladder material for examples such as `DeviceRequest`, `ItemsRequest`, `encryptionInfo`, and `readerAuth`. This section defines the construction; those appendices should not introduce alternate field names or encodings.

### 8.3 `SessionTranscript` construction

The same-device direct `org-iso-mdoc` flow binds the request and response to the DC API handover by constructing `SessionTranscript` from the serialized `encryptionInfo` and the caller origin.

The Verifier and Wallet/Responder SHALL use the exact base64url-without-padding string supplied as `data.encryptionInfo` in the Digital Credentials API request as the first element of `dcapiInfo`. They SHALL use the authenticated origin string supplied by the Browser / User Agent or platform as the second element. They SHALL then compute:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The bytes used as `SessionTranscript` are the CBOR serialization of `[null, null, handover]`. The `handover` array is decoded as the third element of that CBOR structure when used inside `ReaderAuthentication` and `DeviceAuthentication`.

A Verifier SHALL use the same origin string and `encryptionInfoBase64Url` when constructing any `readerAuth`, when opening HPKE, and when verifying device authentication. A Wallet/Responder SHALL recompute `SessionTranscript` from the `encryptionInfo` value in the request and the platform-provided origin it receives for the same invocation. A Wallet/Responder SHALL NOT derive origin from the SMART request body, request ids, selector URLs, `purpose`, item text, kiosk metadata, or Artifact contents.

When the Browser / User Agent or platform cannot provide authenticated origin or privileged-caller context, the Wallet/Responder SHALL treat origin trust as absent under §7.1.3. If the Wallet/Responder cannot construct the `SessionTranscript` required for this flow, it SHALL fail the presentation or continue only when a deployment profile explicitly defines the reduced-assurance behavior and an unambiguous origin input for the cryptographic transcript. A Wallet/Responder SHALL NOT silently substitute an unauthenticated request field as the origin.

The platform-neutral requirement is byte agreement: the Verifier and Wallet/Responder use the same `encryptionInfoBase64Url` string, the same origin string, the same CBOR encoding inputs, and the same SHA-256 digest result. Appendix E should include diagnostic and hex ladders for this computation, including checked-in fixture examples where available.

### 8.4 Wallet-side request handling

After the Browser / User Agent routes the request to the Wallet/Responder, the Wallet/Responder SHALL parse and validate the direct mdoc request before constructing a clinical response.

A Wallet/Responder SHALL recover the `DeviceRequest`, locate a `DocRequest` whose `itemsRequest` is CBOR tag 24, preserve the exact tag-24 `itemsRequest` bytes for `readerAuth` verification, and decode the enclosed `ItemsRequest` CBOR. It SHALL verify that:

1. `ItemsRequest.docType` is exactly `org.smarthealthit.checkin.1`;
2. `ItemsRequest.nameSpaces["org.smarthealthit.checkin"]` requests `smart_health_checkin_response`;
3. the request for `smart_health_checkin_response` is acceptable under Wallet policy, including the `intentToRetain` signal;
4. `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` is present and is a string; and
5. that string parses as a SMART request and satisfies §5, including the version, item, selector, media-type, and requester-identity metadata rules.

If the SMART request JSON is absent, not a string, unparsable, or invalid under §5, the Wallet/Responder SHALL fail the presentation or report failure according to the selected platform mechanism. It SHALL NOT infer a clinical request from mdoc element names, display strings, archived encodings, or kiosk wrappers.

The Wallet/Responder SHALL recompute the `SessionTranscript` according to §8.3. If `readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, the Wallet/Responder SHALL verify the detached `COSE_Sign1` over `ReaderAuthenticationBytes`, including the protected algorithm, detached payload, `SessionTranscript`, exact tag-24 `itemsRequest` bytes, signature, key material, and deployment trust policy. A malformed, cryptographically invalid, mismatched, expired, unsupported, or policy-unacceptable `readerAuth` is failed reader authentication. The Wallet/Responder SHALL distinguish that state from absent `readerAuth` as required by §7.2.3.

After request validation and trust processing, the Wallet/Responder SHALL present or otherwise process the request at request-item granularity. Holder review SHALL preserve item `id` values for response accounting. The Wallet/Responder MAY group, summarize, reorder, or suppress display details according to accessibility, safety, localization, and local policy, but it SHALL NOT treat `required: true` as consent, SHALL NOT treat `purpose`, `title`, or `summary` as authenticated requester identity, and SHALL NOT bypass Holder control merely because the transport request validated.

The Wallet/Responder SHALL apply §5 selector rules and §6 status rules when deciding which Artifacts, if any, can be returned for each item. Unsupported selectors, unavailable data, Holder refusal, partial sharing, and processing errors are clinical response outcomes, not necessarily transport failures.

### 8.5 Wallet-side response construction

The Wallet/Responder constructs a SMART response object according to §6. It SHALL set `SmartHealthCheckinResponse.requestId` to the exact `SmartHealthCheckinRequest.id` value from the request it accepted. It SHALL include `artifacts[]` and `requestStatus[]` as defined in §6 and SHALL serialize the SMART response as UTF-8 JSON text for carriage as the mdoc element value.

The Wallet/Responder SHALL build an `IssuerSignedItem` for the single stable response element. The logical contents are:

```cbor-diag
{
  "digestID": <integer>,
  "random": h'<issuer-signed-item random>',
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": "<UTF-8 JSON text of the SMART response>"
}
```

The Wallet/Responder SHALL encode the `IssuerSignedItem` as CBOR and wrap those bytes in CBOR tag 24 before placing it in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`. The Wallet/Responder SHALL compute the MSO value digest over the complete tag-24-wrapped `IssuerSignedItem` bytes:

```text
valueDigest = SHA-256(tag24(CBOR(IssuerSignedItem)))
```

The Wallet/Responder SHALL construct the Mobile Security Object so that it identifies `docType` `org.smarthealthit.checkin.1`, uses digest algorithm `SHA-256`, binds `valueDigests["org.smarthealthit.checkin"][digestID]` to the disclosed response element digest, carries or references the device key as required by mdoc validation, and satisfies applicable validity and issuer-policy requirements. Appendix C will provide CDDL details for the same-device structures; Appendix D will index concrete fixture values.

The Wallet/Responder SHALL sign the MSO as `issuerAuth` using `COSE_Sign1` with protected header `{1: -7}` unless a future registered profile defines another algorithm. The `issuerAuth.payload` SHALL be the tag-24-wrapped MSO bytes. The issuer certificate, key evidence, and trust-anchor interpretation are deployment policy under §7.3; a self-attested or test issuer model does not relax the structural, digest, device, or SMART response validation rules.

The Wallet/Responder SHALL construct `DeviceNameSpaces` containing the disclosed `org.smarthealthit.checkin` namespace and the tag-24-wrapped `IssuerSignedItem`. It SHALL construct the device-authentication payload as:

```text
DeviceAuthenticationBytes =
  tag24(CBOR([
    "DeviceAuthentication",
    SessionTranscript,
    "org.smarthealthit.checkin.1",
    tag24(CBOR(DeviceNameSpaces))
  ]))
```

The Wallet/Responder SHALL sign `DeviceAuthenticationBytes` with the device private key corresponding to `MSO.deviceKeyInfo.deviceKey` and return the result as the mdoc device `COSE_Sign1` signature, using ES256 (`alg` `-7`) for the version 1.0 suite. The signature SHALL be bound to the `SessionTranscript` computed under §8.3.

The Wallet/Responder SHALL wrap the mdoc document in a `DeviceResponse` with version `"1.0"` and status `0` for a successful response:

```cbor-diag
{
  "version": "1.0",
  "documents": [
    {
      "docType": "org.smarthealthit.checkin.1",
      "issuerSigned": {
        "nameSpaces": {
          "org.smarthealthit.checkin": [
            tag24(CBOR(IssuerSignedItem))
          ]
        },
        "issuerAuth": COSE_Sign1
      },
      "deviceSigned": {
        "nameSpaces": DeviceNameSpaces,
        "deviceAuth": {
          "deviceSignature": COSE_Sign1
        }
      }
    }
  ],
  "status": 0
}
```

This diagnostic shape is illustrative of the fields this profile depends on; Appendix C should provide complete CDDL and ISO compatibility notes. The Wallet/Responder SHALL NOT put the SMART response in a second mdoc element or in an unprotected transport field as a substitute for the issuer-signed response element.

### 8.6 HPKE encryption and DC API response envelope

The Wallet/Responder SHALL encrypt the CBOR `DeviceResponse` bytes to the Verifier's recipient public key from `encryptionInfo` using HPKE base mode with:

```text
KEM  = DHKEM(P-256, HKDF-SHA256)  / 0x0010 /
KDF  = HKDF-SHA256                / 0x0001 /
AEAD = AES-128-GCM                / 0x0001 /
info = SessionTranscript bytes
aad  = empty byte string
```

The HPKE `info` input SHALL be the exact `SessionTranscript` bytes from §8.3. The additional authenticated data SHALL be the empty byte string unless a future profile explicitly defines a non-empty value. The plaintext SHALL be the exact CBOR serialization of `DeviceResponse`.

The HPKE encapsulated key `enc` SHALL be the uncompressed P-256 public key bytes for the ephemeral sender key, as produced by the HPKE DHKEM(P-256, HKDF-SHA256) suite. The `cipherText` value SHALL be the AES-128-GCM ciphertext concatenated with its authentication tag as defined by HPKE.

The Wallet/Responder SHALL wrap the HPKE output in this CBOR DC API response envelope:

```cbor-diag
[
  "dcapi",
  {
    "enc": h'<HPKE encapsulated key>',
    "cipherText": h'<HPKE ciphertext || tag>'
  }
]
```

The Wallet/Responder SHALL base64url-without-padding encode that CBOR envelope as `data.response` in the Digital Credentials API result:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url CBOR dcapiResponse>"
  }
}
```

The Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, or a response encrypted under a different HPKE suite for this core version 1.0 flow.

### 8.7 Verifier-side response processing

The Verifier SHALL process the returned Digital Credentials result before passing any clinical content to the Requester or downstream receiver.

The Verifier SHALL verify that the returned protocol is `org-iso-mdoc`, base64url-decode `data.response`, decode the CBOR `dcapiResponse` envelope, and require the envelope to have the logical shape `["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`. The Verifier SHALL open the HPKE ciphertext using the retained recipient private key, the recipient public key corresponding to `encryptionInfo`, `info` equal to the exact `SessionTranscript` bytes from §8.3, and empty `aad`. Failure to decrypt or authenticate the ciphertext is a transport failure.

After HPKE open, the Verifier SHALL decode the plaintext as a CBOR `DeviceResponse`. The Verifier SHALL require `DeviceResponse.version` `"1.0"`, successful response status, and at least one document with `docType` exactly `org.smarthealthit.checkin.1`.

For the SMART Health Check-in document, the Verifier SHALL validate the mdoc issuer-signed layer before relying on the disclosed element:

1. verify `issuerAuth` as a `COSE_Sign1` over the tag-24-wrapped MSO payload using ES256 (`alg` `-7`) or a future profile-approved algorithm;
2. evaluate issuer certificate or key evidence according to the applicable §7.3 trust-anchor policy before claiming production issuer trust;
3. verify that the MSO identifies `docType` `org.smarthealthit.checkin.1` and digest algorithm `SHA-256`;
4. locate `valueDigests["org.smarthealthit.checkin"][digestID]` for each disclosed issuer-signed item in the SMART namespace; and
5. recompute `SHA-256(tag24(CBOR(IssuerSignedItem)))` and compare it with the corresponding MSO digest.

The Verifier SHALL validate the device-signed layer before accepting the presentation as bound to the session. It SHALL reconstruct `DeviceAuthenticationBytes` using the same `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes, and SHALL verify the device `COSE_Sign1` signature using `MSO.deviceKeyInfo.deviceKey`. If device authentication fails, is missing when required by the mdoc structure, uses the wrong `SessionTranscript`, or does not correspond to the MSO device key, the Verifier SHALL reject the transport response.

The Verifier SHALL locate exactly the disclosed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`. The Verifier SHALL require its `elementValue` to be a string containing SMART response JSON. It SHALL parse that JSON and validate the result according to §6, including fixed `type`, fixed `version`, Artifact shape, status code set, raw FHIR JSON `fhirVersion`, and SMART Health Card wrapper rules.

The Verifier SHALL then apply the §6.6 cross-validation rules against the original SMART request, including exact `requestId` match, `fulfills[]` resolution, per-item `accept[]` compatibility, unique `requestStatus[]` coverage for every request item, FHIR-version consistency, and selector-responsiveness checks where applicable. Successful mdoc transport, origin binding, reader authentication, issuer signature, device proof, or HPKE decryption SHALL NOT substitute for §6.6 validation.

The Verifier or downstream receiver SHALL apply the trust policy from §7 before relying on origin, reader, issuer/device, or clinical-source claims. In particular, raw FHIR JSON remains patient-mediated unless separate provenance, signature, source attestation, extension rules, or deployment policy establishes clinical-source trust. Transport success does not by itself create raw-FHIR source trust.

### 8.8 Required validation checklist

A Verifier that accepts a same-device direct `org-iso-mdoc` SMART Health Check-in response SHALL complete the following checks before the Requester consumes returned content:

1. Confirm the returned Digital Credentials result uses protocol `org-iso-mdoc`.
2. Decode `data.response` as base64url without padding and parse it as CBOR `["dcapi", {"enc": bstr, "cipherText": bstr}]`.
3. Reconstruct the §8.3 `SessionTranscript` from the original `encryptionInfoBase64Url` and origin.
4. HPKE-open `cipherText` with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty `aad`.
5. Decode plaintext as `DeviceResponse` and require version `"1.0"` and successful status.
6. Require a document with `docType` `org.smarthealthit.checkin.1`.
7. Verify `issuerAuth` signature and evaluate issuer trust according to §7.3 and deployment policy.
8. Verify MSO digest algorithm `SHA-256`, namespace `org.smarthealthit.checkin`, disclosed tag-24 `IssuerSignedItem` bytes, and matching value digest for `smart_health_checkin_response`.
9. Verify device authentication over `DeviceAuthentication` using the same `SessionTranscript`, `docType`, tag-24 `DeviceNameSpaces`, and `MSO.deviceKeyInfo.deviceKey`.
10. Extract `elementValue` for `smart_health_checkin_response` as SMART response JSON.
11. Validate the SMART response shape under §6.
12. Apply all §6.6 cross-validation rules against the original SMART request.
13. Apply §7 trust-policy decisions for origin, reader authentication if present or required, issuer/device assurance, and clinical-source provenance.
14. Enforce deployment policy, security requirements in §11, privacy requirements in §12, and any stricter registered profile requirements before downstream use.

A Wallet/Responder that processes a same-device direct `org-iso-mdoc` SMART Health Check-in request SHALL complete the following checks before disclosing content:

1. Confirm the request uses protocol `org-iso-mdoc` and a decodable CBOR `DeviceRequest`.
2. Locate a tag-24 `ItemsRequest` for `docType` `org.smarthealthit.checkin.1`.
3. Confirm the stable element request for namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and process the `intentToRetain` value under Wallet policy.
4. Extract `requestInfo["org.smarthealthit.checkin.request"]` as a string and validate the parsed SMART request under §5.
5. Recompute the §8.3 `SessionTranscript` from request `encryptionInfo` and authenticated platform origin.
6. If `readerAuth` is present and supported or required, verify the detached `COSE_Sign1`, exact tag-24 `ItemsRequest` binding, `SessionTranscript`, algorithm, key material, and deployment trust policy.
7. Distinguish absent `readerAuth` from failed `readerAuth` and apply §7.2 policy.
8. Run Holder review and Wallet policy at request-item granularity.
9. Construct a §6 SMART response and an mdoc response following §§8.5-8.6.

### 8.9 Annotated end-to-end byte capture pointers

Appendix D should index, and Appendix E should annotate, checked-in captures and generated vectors that correspond to this section. Known active evidence includes:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

The request capture directory is expected to contain byte boundaries such as the `navigator.credentials.get` argument, `device-request.cbor`, decoded `ItemsRequest`, `request-info.json`, `encryption-info.cbor`, and `session-transcript.cbor` when those files are present in the fixture set. The response capture directory is expected to contain the returned Digital Credential JSON, `dcapi-response.cbor`, decrypted `device-response.cbor`, extracted `smart-response.json`, and independent verification artifacts such as `pymdoc-byte-check.json` or `verification-report.json` when present.

This section deliberately does not invent new fixture paths or byte strings. If Appendix D or Appendix E includes additional paths, they should be derived from actual checked-in fixtures or generated conformance vectors and should map each byte file back to the construction steps in §§8.2-8.7.

## Organizer notes

### Strengths

- Provides a complete normative spine for the base same-device flow and keeps SMART request/response semantics delegated to §§5-6.
- Preserves the active identifiers, `requestInfo` carrier, stable response element, `DeviceRequest` version `"1.0"`, per-`DocRequest.readerAuth`, direct `dcapi` `SessionTranscript`, HPKE suite, and COSE ES256 algorithm from active docs and code.
- Keeps §7 trust layers distinct: origin, reader, issuer/device, and clinical-source provenance are validated separately, and raw FHIR JSON is not upgraded by transport success.
- Makes the kiosk relationship clear without defining kiosk wrapper behavior in this section.

### Caveats

- The exact full mdoc CDDL and ISO/IEC 18013-5 compatibility details should be completed in Appendix C and the §8 support appendices; this draft intentionally uses logical and diagnostic shapes where complete CDDL would be premature.
- The issuer and reader certificate trust-anchor policies remain deployment-profile work, matching §7. Production profiles will need to state certificate path, revocation, EKU/policy, and registry expectations.
- The draft states a minimum nonce length of 16 bytes while noting the active 32-byte implementation; conformance closure may choose to make 32 bytes mandatory for simpler testing.

### Open issues

- Decide whether core conformance requires authenticated origin for every same-device presentation or permits a documented reduced-assurance mode.
- Decide whether response processing should reject more than one disclosed `smart_health_checkin_response` element or select the first valid one; this draft says to locate the disclosed item but does not fully specify duplicate-element handling.
- Confirm whether Appendix C will model `deviceSigned.nameSpaces` as decoded `DeviceNameSpaces` or tag-24 bytes at each layer; the normative device-authentication input must remain byte-exact.
- Confirm any hard size limits for SMART request JSON in `requestInfo`, response JSON element values, and HPKE ciphertext for §11 / conformance testing.

### Downstream dependencies

- Appendix A should convert each SHALL/SHOULD here into role-scoped checklist rows.
- Appendix C should define CDDL for `DeviceRequest`, `ItemsRequest`, `encryptionInfo`, `dcapiResponse`, `DeviceResponse`, `IssuerSignedItem`, MSO fields used here, `DeviceNameSpaces`, `ReaderAuthentication`, and `DeviceAuthentication`.
- Appendix D should index only actual generated or checked-in fixtures and should include the real Chrome/Android request and response captures where present.
- Appendix E should provide byte ladders for `encryptionInfo`, `SessionTranscript`, tag-24 `ItemsRequest`, optional `readerAuth`, HPKE `info`, `IssuerSignedItem` digesting, and device authentication.
- §11 should revisit replay/freshness, UI redress, reader impersonation, crypto agility, plaintext leakage, and failure handling. §12 should revisit `intentToRetain`, status-message privacy, logs, telemetry, and downstream retention.
