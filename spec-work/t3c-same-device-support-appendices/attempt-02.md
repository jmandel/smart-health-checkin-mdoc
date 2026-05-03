# Appendix E. SessionTranscript and same-device byte ladder

This appendix is explanatory support for the same-device direct `org-iso-mdoc` flow in §8. It is intended to help implementers, fixture authors, and reviewers find byte boundaries and reproduce the same hashes, signatures, and HPKE context. It does not define an alternate request carrier, response carrier, field name, HPKE parameter set, CDDL rule, fixture class, or clinical semantic. If this appendix appears to conflict with §8, §8 controls.

## E.1 Values, bytes, and textual encodings

The same-device flow crosses three representation domains that must not be collapsed:

1. **SMART clinical JSON text**: the SMART request and SMART response are UTF-8 JSON text when carried by this binding. The clinical model does not define canonical JSON serialization. Fixtures can preserve a particular serialization, but semantically equivalent JSON reserialization changes the bytes used at transport boundaries.
2. **CBOR logical values and CBOR bytes**: mdoc, COSE, `encryptionInfo`, `SessionTranscript`, `DeviceRequest`, and `DeviceResponse` are CBOR data items. A diagnostic representation is not the signed, hashed, encrypted, or compared value.
3. **Text encodings of bytes**: Digital Credentials API request and response members carry selected CBOR byte strings as base64url without padding. Where §8 says the exact base64url string is an input, the input is the text string as carried, not a decoded-and-reencoded substitute.

CBOR tag 24 is especially important. In this profile, `tag24(CBOR(X))` means a CBOR tag 24 whose content is a byte string containing the complete CBOR serialization of `X`. The tag-24 wrapper bytes are part of the value for `ItemsRequestBytes`, `IssuerSignedItem` digesting, `DeviceAuthentication`, and `ReaderAuthentication` where applicable. Implementations that decode the inner value for inspection must still retain the exact tagged bytes required by §8.

## E.2 Ordered same-device byte ladder

The following ladder names the ordered transformations in the base same-device flow. It intentionally uses symbolic placeholders rather than fabricated hashes or ciphertexts.

### E.2.1 SMART request JSON to tag-24 `ItemsRequest`

1. The Requester constructs a `SmartHealthCheckinRequest` under §5.
2. The Verifier serializes that object as UTF-8 JSON text. This JSON text is the value placed in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
3. The Verifier constructs the logical `ItemsRequest`:

   ```text
   {
     "docType": "org.smarthealthit.checkin.1",
     "nameSpaces": {
       "org.smarthealthit.checkin": {
         "smart_health_checkin_response": true
       }
     },
     "requestInfo": {
       "org.smarthealthit.checkin.request": <SMART request JSON text>
     }
   }
   ```

4. The Verifier serializes the `ItemsRequest` as CBOR.
5. The Verifier wraps the CBOR serialization in CBOR tag 24:

   ```text
   ItemsRequestBytes = tag24(CBOR(ItemsRequest))
   ```

   These exact tagged bytes are inserted as `DocRequest.itemsRequest` and are also the request bytes bound by `readerAuth` when `readerAuth` is present.

### E.2.2 `DeviceRequest` and `encryptionInfo`

6. The Verifier constructs the logical `DeviceRequest` with version exactly `"1.0"` and a `docRequests` entry containing the tagged `ItemsRequestBytes`. If `readerAuth` is used, it is the per-`DocRequest.readerAuth` value described in E.2.5; core v1 does not use `readerAuthAll`.
7. The Verifier serializes the `DeviceRequest` as CBOR and base64url-encodes those bytes without padding for `data.deviceRequest`.
8. The Verifier prepares a P-256 HPKE recipient key pair and constructs `encryptionInfo` as the logical CBOR value:

   ```text
   [
     "dcapi",
     {
       "nonce": <fresh unpredictable bytes>,
       "recipientPublicKey": {
          1: 2,       ; kty = EC2
         -1: 1,       ; crv = P-256
         -2: <x-coordinate bstr>,
         -3: <y-coordinate bstr>
       }
     }
   ]
   ```

9. The Verifier serializes `encryptionInfo` as CBOR and base64url-encodes those bytes without padding for `data.encryptionInfo`.
10. The Verifier preserves the exact `encryptionInfo` base64url string. Re-decoding and re-encoding `encryptionInfo` can change the string and therefore changes the `SessionTranscript` input, even if the decoded CBOR value appears equivalent.

### E.2.3 `dcapiInfo`, handover, and `SessionTranscript`

11. Let `encryptionInfoBase64Url` be the exact unpadded base64url text in the Digital Credentials API request.
12. Let `origin` be the authenticated origin, or deployment-approved privileged-caller origin-equivalent value, supplied by the Browser / User Agent or platform. It is not derived from `purpose`, item display text, request ids, selector URLs, kiosk metadata, or any field in the SMART request body.
13. The direct `dcapi` handover input is:

   ```text
   dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
   ```

14. The handover value is:

   ```text
   handover = ["dcapi", SHA-256(dcapiInfo)]
   ```

15. The `SessionTranscript` bytes are:

   ```text
   SessionTranscript = CBOR([null, null, handover])
   ```

The SHA-256 input is the exact CBOR serialization of the two text strings `[encryptionInfoBase64Url, origin]`. The HPKE `info`, optional `ReaderAuthentication`, and `DeviceAuthentication` all use the resulting `SessionTranscript` bytes for the same presentation session.

### E.2.4 Digital Credentials API request

16. The Verifier invokes the Digital Credentials API with protocol `org-iso-mdoc` and request data equivalent to:

   ```json
   {
     "protocol": "org-iso-mdoc",
     "data": {
       "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
       "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
     }
   }
   ```

The `deviceRequest` and `encryptionInfo` strings are transport encodings of CBOR bytes. They are not JSON encodings of the decoded CBOR values.

### E.2.5 Optional `ReaderAuthentication`

17. If `readerAuth` is present, the Verifier constructs the detached payload:

   ```text
   ReaderAuthenticationBytes = tag24(CBOR([
     "ReaderAuthentication",
     SessionTranscript,
     ItemsRequestBytes
   ]))
   ```

18. The Verifier signs a detached `COSE_Sign1` with ES256 (`alg` `-7`). The serialized `COSE_Sign1` payload field is `null`; the `Signature1` structure uses empty external AAD and `ReaderAuthenticationBytes` as the detached payload.
19. The `readerAuth` carries certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate, as specified by §8. Deployment policy decides whether that evidence is trusted.
20. The resulting `COSE_Sign1` is placed in the same `DocRequest` as the `ItemsRequestBytes`. The signature is not reusable across origins, `encryptionInfo` values, `SessionTranscript` bytes, SMART request serializations, or requested element sets.

### E.2.6 Wallet request extraction

21. The Wallet/Responder base64url-decodes `data.deviceRequest` and `data.encryptionInfo`, parses CBOR, locates the `DocRequest.itemsRequest` tag-24 value for `docType` `org.smarthealthit.checkin.1`, and preserves the exact tagged `ItemsRequestBytes`.
22. The Wallet/Responder decodes the enclosed `ItemsRequest`, verifies that namespace `org.smarthealthit.checkin` requests `smart_health_checkin_response`, and extracts the SMART request JSON string only from `requestInfo["org.smarthealthit.checkin.request"]`.
23. The Wallet/Responder recomputes the `SessionTranscript` from the exact `encryptionInfoBase64Url` string and authenticated origin or origin-equivalent context.
24. If `readerAuth` is present and relevant to policy, the Wallet/Responder verifies the detached `COSE_Sign1` over the same `ReaderAuthenticationBytes`, then evaluates trust policy without treating mere presence of a certificate as trusted reader authentication.

### E.2.7 SMART response JSON to issuer-signed item and MSO digest

25. After Holder review and response construction under §6, the Wallet/Responder serializes the `SmartHealthCheckinResponse` as UTF-8 JSON text. The response `requestId` is the accepted SMART request `id`.
26. The Wallet/Responder constructs the logical `IssuerSignedItem`:

   ```text
   {
     "digestID": <integer digest id>,
     "random": <random bstr>,
     "elementIdentifier": "smart_health_checkin_response",
     "elementValue": <SMART response JSON text>
   }
   ```

27. The Wallet/Responder serializes the `IssuerSignedItem` as CBOR and wraps it in tag 24:

   ```text
   IssuerSignedItemBytes = tag24(CBOR(IssuerSignedItem))
   ```

28. The MSO value digest input is the complete tag-24-wrapped `IssuerSignedItemBytes`, not only the inner map and not only `elementValue`:

   ```text
   MSO.valueDigests["org.smarthealthit.checkin"][digestID]
     = SHA-256(IssuerSignedItemBytes)
   ```

29. The Wallet/Responder constructs an MSO for `docType` `org.smarthealthit.checkin.1`, covering the disclosed issuer-signed item and identifying the device key used for device authentication.
30. The Wallet/Responder signs the MSO as `issuerAuth` using `COSE_Sign1` with ES256. Section 8 owns the exact requirement that `issuerAuth.payload` is the tag-24-wrapped MSO bytes unless Appendix C or an ISO-compatible profile defines an equivalent encoding.

### E.2.8 `DeviceAuthentication`, device signature, and `DeviceResponse`

31. The Wallet/Responder constructs `DeviceNameSpaces`. In the core profile it is normally empty unless a deployment profile defines additional device-signed elements. The SMART response remains the issuer-signed `smart_health_checkin_response` element; it is not moved into `DeviceNameSpaces`.
32. The Wallet/Responder constructs:

   ```text
   DeviceAuthenticationBytes = tag24(CBOR([
     "DeviceAuthentication",
     SessionTranscript,
     "org.smarthealthit.checkin.1",
     tag24(CBOR(DeviceNameSpaces))
   ]))
   ```

33. The Wallet/Responder signs the device authentication payload with the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`, producing `deviceSignature` as a `COSE_Sign1` with ES256.
34. The Wallet/Responder constructs the logical `DeviceResponse`:

   ```text
   {
     "version": "1.0",
     "documents": [{
       "docType": "org.smarthealthit.checkin.1",
       "issuerSigned": {
         "nameSpaces": {
           "org.smarthealthit.checkin": [IssuerSignedItemBytes]
         },
         "issuerAuth": COSE_Sign1
       },
       "deviceSigned": {
         "nameSpaces": tag24(CBOR(DeviceNameSpaces)),
         "deviceAuth": { "deviceSignature": COSE_Sign1 }
       }
     }],
     "status": 0
   }
   ```

35. The Wallet/Responder serializes the `DeviceResponse` as CBOR. These bytes are the HPKE plaintext.

### E.2.9 HPKE seal and `dcapiResponse`

36. The Wallet/Responder HPKE-seals the CBOR `DeviceResponse` plaintext to the recipient public key from `encryptionInfo` using the §8 suite:

   ```text
   KEM       = DHKEM(P-256, HKDF-SHA256)
   KDF       = HKDF-SHA256
   AEAD      = AES-128-GCM
   info      = SessionTranscript bytes
   aad       = empty byte string
   plaintext = CBOR(DeviceResponse)
   ```

   The empty AAD is the zero-length byte string. It is not CBOR `null`, an empty text string, an omitted parameter with implementation-defined semantics, or the diagnostic representation of an empty byte string.

37. The HPKE output is placed in the direct DC API response CBOR value:

   ```text
   dcapiResponse = [
     "dcapi",
     {
       "enc": <HPKE enc bstr>,
       "cipherText": <HPKE ciphertext bstr>
     }
   ]
   ```

38. The Wallet/Responder serializes `dcapiResponse` as CBOR, base64url-encodes those bytes without padding, and returns a Digital Credentials API result equivalent to:

   ```json
   {
     "protocol": "org-iso-mdoc",
     "data": {
       "response": "<base64url-without-padding CBOR dcapiResponse>"
     }
   }
   ```

### E.2.10 Verifier reopening and response extraction

39. The Verifier checks `protocol`, base64url-decodes `data.response`, parses `dcapiResponse`, reconstructs the expected `SessionTranscript` from the original `encryptionInfoBase64Url` and origin, and HPKE-opens `cipherText` with `info = SessionTranscript bytes` and empty `aad`.
40. The Verifier parses the plaintext CBOR `DeviceResponse`, validates `issuerAuth`, the MSO, digest binding, and device signature, and checks that the device signature is bound to the expected `SessionTranscript`.
41. The Verifier locates the disclosed issuer-signed item in namespace `org.smarthealthit.checkin` whose `elementIdentifier` is `smart_health_checkin_response`, verifies its MSO digest over the exact tag-24 item bytes, and extracts `elementValue` as the SMART response JSON string.
42. The Verifier parses the SMART response JSON under §6 and applies the §6.6 cross-validation rules against the original SMART request before accepting the clinical response.

## E.3 Confirmed active fixture roots

Appendix D owns authoritative fixture classification, conformance-vector labeling, and any final fixture index. Confirmed active roots that currently contain useful same-device byte-boundary material include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

Some fixture directories contain generated vectors, some contain real Chrome/Android captures, and some are minimal response construction fixtures. This appendix intentionally does not classify them as normative conformance vectors; Appendix D should do that after Appendix C and §8 are stable.

# Appendix F. CBOR diagnostic notation cheat-sheet

This appendix is an explanatory notation guide for examples in this specification. It does not override Appendix C CDDL, §8 normative prose, RFC 8949 CBOR encoding rules, COSE rules, HPKE rules, or mdoc processing rules.

## F.1 General conventions

CBOR diagnostic notation is a readable rendering of a CBOR value. It is not the wire encoding and is not the value to hash, sign, encrypt, or compare. When the specification needs the actual bytes, it says `CBOR(...)`, `tag24(CBOR(...))`, a named `...Bytes` value, or references a fixture byte file.

Common diagnostic forms used in this specification are:

| Notation | Meaning in examples |
| --- | --- |
| `{ "k": v }` | CBOR map with text-string key `"k"` and value `v`. Map order in diagnostic notation is editorial unless a fixture or deterministic encoding rule fixes bytes. |
| `[a, b, c]` | CBOR array in the displayed order. |
| `h'0102'` | CBOR byte string with bytes `0x01 0x02`. Whitespace in displayed hex is editorial. |
| `"text"` | CBOR text string. When used for SMART request or response JSON text, the text string contains the JSON serialization. |
| `24(h'...')` or `tag24(CBOR(X))` | CBOR tag 24 around a byte string containing a complete CBOR data item. `tag24(CBOR(X))` is pseudocode for the exact tagged bytes. |
| `null` | CBOR simple value null. It is not an empty byte string, not JSON text `"null"`, and not omitted. |
| `true` / `false` | CBOR booleans. In `ItemsRequest.nameSpaces`, the boolean is the mdoc `intentToRetain` value. |
| `; comment` | Human-readable comment in diagnostic or pseudocode blocks. Comments are not CBOR, not JSON, and not fixture bytes. |
| `<placeholder>` | Non-normative placeholder. A complete wire value or conformance fixture must replace it with concrete bytes or values. |
| `...` | Omitted material for readability. It is never a literal protocol value. |

## F.2 Maps and arrays in mdoc examples

Examples often use string-keyed maps because the relevant mdoc structures use text-string member names such as `"version"`, `"docRequests"`, `"itemsRequest"`, `"docType"`, `"nameSpaces"`, `"requestInfo"`, `"documents"`, `"issuerSigned"`, `"issuerAuth"`, `"deviceSigned"`, and `"deviceAuth"`.

COSE and COSE_Key structures also use integer labels. For example, a P-256 EC2 public key appears as:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: h'...',   ; x-coordinate
  -3: h'...'    ; y-coordinate
}
```

The labels are COSE labels, not JSON member names. Diagnostic comments explain their meaning but are not part of the map.

## F.3 Byte strings, text strings, and base64url strings

A CBOR byte string (`bstr`) and a CBOR text string (`tstr`) are different values:

- `h'7b7d'` is a byte string containing two bytes.
- `"{}"` is a text string containing two characters, whose UTF-8 bytes happen to be `0x7b 0x7d`.
- `e30` is a base64url-without-padding text representation of bytes and appears in JSON or CBOR as a text string only when the surrounding field is defined as text.

In the same-device flow, `data.deviceRequest`, `data.encryptionInfo`, and `data.response` are JSON strings containing base64url-without-padding encodings of CBOR bytes. Inside `dcapiInfo`, `encryptionInfoBase64Url` is a CBOR text string whose content is the exact base64url text from the request. The hash input is CBOR over that text string and the origin text string.

## F.4 CBOR tag 24 boundaries

CBOR tag 24 is displayed in two equivalent explanatory styles:

```text
24(h'...')
tag24(CBOR(ItemsRequest))
```

Both mean that the tagged value contains a byte string holding a complete encoded CBOR data item. The inner CBOR item can be decoded for inspection, but the outer tag and byte string are part of the bytes used by the profile at important boundaries:

- `DocRequest.itemsRequest` contains `tag24(CBOR(ItemsRequest))`.
- `ReaderAuthenticationBytes` is `tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))` when `readerAuth` is present.
- The disclosed issuer-signed item is `tag24(CBOR(IssuerSignedItem))` and the MSO digest is computed over that complete tagged value.
- `DeviceAuthenticationBytes` is `tag24(CBOR(["DeviceAuthentication", SessionTranscript, docType, tag24(CBOR(DeviceNameSpaces))]))`.
- `deviceSigned.nameSpaces` carries `tag24(CBOR(DeviceNameSpaces))`.

A common fixture error is to hash or sign the decoded map instead of the complete tag-24 value required by §8.

## F.5 COSE structures in examples

`COSE_Sign1` denotes the four-element single-signer COSE structure:

```text
[
  protected:   <protected header bstr>,
  unprotected: <unprotected header map>,
  payload:     <payload bstr or null>,
  signature:   <signature bstr>
]
```

The protected header is itself a byte string containing a CBOR map. For ES256 examples, that map contains `{1: -7}`, where label `1` is `alg` and `-7` is ES256. The unprotected header is a CBOR map. Header label `33` is `x5chain`; in this profile, §8 requires `readerAuth` to carry certificate evidence in COSE header label `33` with at least the leaf reader certificate. Examples may render the value as an array of DER certificate byte strings:

```text
{ 33: [h'...'] }
```

For detached `readerAuth`, the serialized `COSE_Sign1` payload field is `null`, while the COSE `Signature1` signature input uses `ReaderAuthenticationBytes` as the detached payload and empty external AAD. For `issuerAuth` and `deviceSignature`, §8 and Appendix C own the exact payload and verification context.

## F.6 Non-normative placeholders and comments

Blocks in Appendices E, F, and G that contain `<SMART request JSON text>`, `<HPKE ciphertext bstr>`, `<x-coordinate bstr>`, `<origin>`, or similar placeholders are explanatory templates. They are not sample bytes and should not be copied into test vectors. A conformance fixture needs concrete byte files, decoded inspections, and expected validation results as defined by Appendix D.

Comments beginning with `;` are explanatory. JSON examples intended to be literal JSON do not contain comments. CBOR diagnostic examples may contain comments because they are not literal wire bytes.

# Appendix G. Compatibility notes for ISO/IEC 18013-5 §9 and W3C Digital Credentials API

This appendix explains how the SMART Health Check-in 1.0 same-device profile relates to ISO/IEC 18013-5 mdoc presentation structures and the W3C Digital Credentials API direct `org-iso-mdoc` path. It is compatibility guidance; §8 remains the normative source for the version 1.0 same-device flow.

## G.1 Reused mdoc structures

The profile deliberately reuses the mdoc presentation container rather than inventing a new presentation token format. In particular, the same-device flow uses familiar mdoc concepts:

- `DeviceRequest` with `docRequests[]`;
- per-`DocRequest` `itemsRequest` carrying `tag24(CBOR(ItemsRequest))`;
- optional per-`DocRequest.readerAuth` as a detached `COSE_Sign1` over `ReaderAuthentication`;
- `DeviceResponse` with `documents[]`;
- `issuerSigned.nameSpaces` containing tag-24 `IssuerSignedItem` values;
- `issuerAuth` as `COSE_Sign1` over the MSO;
- MSO `valueDigests` binding disclosed issuer-signed items;
- `deviceSigned.nameSpaces`, `DeviceAuthentication`, and `deviceSignature` for device-key proof; and
- a session transcript that binds presentation context into reader authentication, device authentication, and HPKE response protection.

The SMART-specific content is intentionally narrow. The request side carries the SMART request JSON string only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. The response side carries the SMART response JSON string as `IssuerSignedItem.elementValue` for the issuer-signed element named `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`.

## G.2 Constraints adopted by this profile

For SMART Health Check-in 1.0, §8 constrains the general mdoc/DC API surface in the following ways:

- The Digital Credentials API protocol id is `org-iso-mdoc`.
- The mdoc `docType` is `org.smarthealthit.checkin.1`.
- The mdoc namespace is `org.smarthealthit.checkin`.
- The single stable requested and disclosed element is `smart_health_checkin_response`.
- `DeviceRequest.version` is exactly `"1.0"` for the core flow.
- Reader authentication, when present, is per-`DocRequest.readerAuth`; version `"1.1"` `readerAuthAll` is not the core SMART Health Check-in 1.0 mechanism.
- The SMART request is not encoded in dynamic element names, `docType`, `namespace`, `purpose`, kiosk wrapper fields, or Digital Credentials API extension fields.
- The SMART response is not returned as plaintext JSON, a `requestInfo` value, a device-signed-only element, a generic DC API field, or a kiosk submission object in the same-device flow.
- HPKE uses DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty `aad`.

These constraints are intended to make independently produced requests and responses byte-debuggable and to keep the clinical request/response model transport-neutral.

## G.3 Direct Digital Credentials API handover and session transcript

The direct `org-iso-mdoc` handover used by this profile is:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

This construction binds the returned mdoc presentation and HPKE response to both the Verifier's HPKE recipient information and the authenticated origin or deployment-approved origin-equivalent context. It is a direct DC API binding. It is not a QR-code handover, not a BLE/NFC handover, not a kiosk pointer transcript, and not an OpenID4VP transcript.

The `origin` input comes from the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. The SMART request body is not an origin source. If a deployment cannot supply an authenticated origin or approved origin-equivalent context, §7 and §8 define the resulting reduced-assurance or failure handling; this appendix does not create a substitute transcript.

## G.4 Roles of issuerAuth, deviceSignature, and HPKE

The mdoc and HPKE layers provide different evidence and protections:

- `issuerAuth` signs the MSO and lets a Verifier validate the mdoc issuer evidence, document type, validity information, device key binding, and value digests under §7.3 and deployment policy.
- The MSO value digest binds the disclosed tag-24 `IssuerSignedItem` for `smart_health_checkin_response` to the issuer-signed container. It does not validate the clinical semantics of the JSON response by itself.
- `deviceSignature` proves possession of the device private key corresponding to `MSO.deviceKeyInfo.deviceKey` for the `DeviceAuthentication` value bound to the expected `SessionTranscript` and `DeviceNameSpaces`.
- HPKE protects the CBOR `DeviceResponse` in transit back to the Verifier. Its `info` is the exact `SessionTranscript` bytes and its AAD is empty. HPKE success does not replace MSO digest validation, device-authentication verification, SMART response parsing, or §6.6 cross-validation.

Successful mdoc presentation can establish presentation-container integrity and session binding. It does not by itself prove real-world patient identity, legal authority, downstream EHR write-back authorization, or clinical-source provenance for unsigned raw FHIR JSON. Those trust questions remain governed by §7 and deployment policy.

## G.5 SMART-specific response element and requestInfo

This profile intentionally uses one mdoc element as a stable carrier for the whole SMART response. It does not model individual FHIR resources, FHIR profiles, request items, questionnaire answers, Artifact ids, or per-item statuses as separate mdoc elements. Those concepts remain inside the SMART response JSON defined by §6.

Likewise, the SMART request remains one JSON string inside `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. `requestInfo` carries the SMART clinical request because the request is about what the Verifier wants the Wallet/Responder to return, not because the request defines a new mdoc namespace of many independently disclosed data elements.

This design means generic mdoc processors can still inspect the mdoc container, signatures, digests, and device authentication, while SMART Health Check-in processors parse the request and response JSON at the defined points.

## G.6 What this profile does not define

SMART Health Check-in 1.0 is not a generic mDL or generic mdoc data model. It does not define, require, or reinterpret generic mDL fields such as family name, given name, portrait, birth date, driving privileges, resident address, age-over claims, issuing authority, or other jurisdiction-specific identity attributes. It also does not define credential issuance, issuer onboarding, general-purpose mdoc namespace registration outside the SMART Health Check-in identifiers, or a universal wallet storage model.

A Wallet can use mdoc machinery to present the SMART response container, and a deployment can define issuer trust policy for that container. Those facts do not make the returned clinical Artifacts generic mDL attributes or issuer-signed clinical credentials unless the Artifact payload itself carries suitable provenance or signature evidence, such as a SMART Health Card, and the receiver accepts that evidence under policy.

## G.7 Relationship to fixtures and future appendices

Appendix C should provide the exact same-device CDDL and any ISO compatibility refinements needed to remove ambiguity from labels, tag-24 boundaries, duplicate handling, and encoding constraints. Appendix D should classify checked-in same-device fixtures, including real Chrome/Android captures and generated vectors, and identify which are conformance vectors versus diagnostic or historical material. Appendix E supplies the explanatory byte ladder; it should remain derived from §8 and Appendix C rather than becoming a second source of wire-format rules.

# Organizer notes

## Strengths

- The draft keeps Appendix E/F/G explanatory and repeatedly defers normative control to §8, Appendix C, and Appendix D.
- The byte ladder preserves the accepted carriers: SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and SMART response only in `IssuerSignedItem.elementValue` for `smart_health_checkin_response`.
- It explicitly covers bytes versus logical values, tag-24 boundaries, exact `encryptionInfo` base64url text, origin binding, optional detached per-DocRequest `readerAuth`, MSO digest input, device authentication, HPKE `info`, and empty AAD.
- Appendix F gives implementers a compact diagnostic-notation guide without turning examples into CDDL.
- Appendix G states the ISO/DC API compatibility story and the deliberate exclusions from generic mDL semantics.

## Caveats

- This draft does not include concrete hex, hashes, signatures, or ciphertexts. That is intentional because Appendix D should own fixture classification and authoritative vector material.
- The draft names confirmed fixture roots but does not classify them as normative conformance vectors.
- The exact placement of `x5chain` in protected versus unprotected COSE headers should remain aligned with §8 and Appendix C; this appendix only says header label `33` is certificate evidence.
- Duplicate document/element handling, deterministic CBOR requirements, and precise nonce-size conformance remain deferred.

## Open issues

- Appendix C must settle exact CDDL, map labels, duplicate handling, deterministic-encoding expectations if any, and final tag-24 byte-boundary language.
- Appendix D must classify generated request vectors, readerAuth vectors, real Chrome/Android captures, minimal response fixtures, and any historical captures.
- Security/privacy sections should revisit reduced-assurance origin handling, reader impersonation, replay/freshness, HPKE key reuse, plaintext debug artifacts, and raw-FHIR provenance overclaiming.

## Downstream dependencies

- T3.D should reuse this ladder terminology for same-device CDDL and fixture material.
- §11 and §12 should cite the trust-layer distinctions rather than copying byte-ladder detail.
- §13 registry work should mirror the accepted `docType`, namespace, requestInfo key, response element, protocol id, and deployment-profile hooks.
