# T3.C attempt 03 — Same-device support appendices

## Appendix E. SessionTranscript and same-device byte ladder

This appendix is explanatory support for the same-device presentation flow in §8. Section 8 owns the normative behavior. The ladder below is intended to help implementers and fixture authors reproduce the same bytes without introducing alternate field names, alternate request carriers, alternate response carriers, alternate HPKE parameters, or alternate clinical semantics.

The most important rule of this appendix is to distinguish logical values from serialized bytes. CBOR diagnostic notation such as `[...]`, `{...}`, `h'...'`, or `24(...)` is readable notation. Hashes, signatures, HPKE inputs, tag-24 payloads, and base64url encodings operate on the exact serialized bytes identified by §8, not on diagnostic text, pretty-printed JSON, decoded logical maps, or re-encoded substitutes.

### E.1 Byte-ladder overview

The same-device flow transforms one SMART request JSON text into a DC API `org-iso-mdoc` request, then transforms one SMART response JSON text into an encrypted DC API response. The ordered ladder is:

1. SMART request JSON text.
2. `ItemsRequest` logical CBOR value containing that JSON text in `requestInfo`.
3. `ItemsRequest` CBOR bytes wrapped in CBOR tag 24.
4. `DeviceRequest` logical CBOR value containing `DeviceRequest.version = "1.0"`, one `DocRequest`, the tag-24 `itemsRequest`, and optional per-`DocRequest.readerAuth`.
5. `DeviceRequest` CBOR bytes.
6. `encryptionInfo` logical CBOR value.
7. `encryptionInfo` CBOR bytes.
8. `encryptionInfo` base64url string without padding.
9. `dcapiInfo = CBOR([encryptionInfoBase64Url, origin])`.
10. `handover = ["dcapi", SHA-256(dcapiInfo)]`.
11. `SessionTranscript = CBOR([null, null, handover])`.
12. Optional `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))` and detached `readerAuth`.
13. SMART response JSON text.
14. `IssuerSignedItem` logical CBOR value whose `elementValue` is the SMART response JSON text.
15. Tag-24-wrapped `IssuerSignedItem` bytes.
16. MSO value digest over the complete tag-24-wrapped `IssuerSignedItem` bytes.
17. MSO and `issuerAuth` COSE_Sign1.
18. `DeviceAuthenticationBytes = tag24(CBOR(["DeviceAuthentication", SessionTranscript, docType, tag24(CBOR(DeviceNameSpaces))]))`.
19. Device `deviceSignature` COSE_Sign1.
20. `DeviceResponse` CBOR bytes.
21. HPKE seal of the `DeviceResponse` bytes with `info = SessionTranscript bytes` and `aad = empty byte string`.
22. `dcapiResponse = ["dcapi", {"enc": <HPKE enc bstr>, "cipherText": <HPKE ciphertext bstr>}]`.
23. `dcapiResponse` CBOR bytes base64url-encoded without padding as `data.response`.

Appendix D owns authoritative fixture classification. Confirmed active fixture roots that contain material useful for this ladder include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

### E.2 SMART request JSON to tag-24 `ItemsRequest`

The starting point is the exact SMART request JSON text selected by the Verifier. Section 5 defines the request object; §8.2.1 defines its same-device carriage. The request is carried as a CBOR text string containing UTF-8 JSON text at exactly:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

It is not carried as a CBOR map representation of the request, not as base64url JSON, not as dynamic mdoc element names, and not in kiosk wrapper fields. This specification does not define canonical JSON serialization for the SMART request. A fixture that needs byte-for-byte repeatability therefore records the exact JSON text used before it is inserted as the CBOR text string.

The logical `ItemsRequest` value is:

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

The Verifier CBOR-encodes that value and wraps the resulting bytes in CBOR tag 24 before placing it in `DocRequest.itemsRequest`:

```text
ItemsRequestBytes = tag24(CBOR(ItemsRequest))
```

The tag-24 boundary is part of the signed and hashed byte ladder. For optional reader authentication, `ReaderAuthentication` includes the tag-24 `ItemsRequestBytes`, not a decoded-and-reencoded logical `ItemsRequest` chosen later.

### E.3 `DeviceRequest` bytes and Digital Credentials request fields

The logical `DeviceRequest` for the core profile uses version `"1.0"`:

```text
{
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": ItemsRequestBytes,
      "readerAuth": COSE_Sign1 / optional
    }
  ]
}
```

When present, `readerAuth` is per-`DocRequest`. Core SMART Health Check-in 1.0 does not use ISO/IEC 18013-5 version 1.1 `readerAuthAll` as its reader-authentication mechanism. The `DeviceRequest` is CBOR-encoded and then base64url-encoded without padding into `data.deviceRequest` in the W3C Digital Credentials API request.

The Verifier also constructs `encryptionInfo` as CBOR for the direct DC API envelope:

```text
[
  "dcapi",
  {
    "nonce": <fresh unpredictable bstr>,
    "recipientPublicKey": {
       1: 2,        ; kty = EC2
      -1: 1,        ; crv = P-256
      -2: <P-256 x-coordinate bstr>,
      -3: <P-256 y-coordinate bstr>
    }
  }
]
```

The resulting `encryptionInfo` bytes are base64url-encoded without padding into `data.encryptionInfo`. Section 8 requires preservation of the exact `encryptionInfo` base64url string because the SessionTranscript binds the string that appears in the DC API request, not merely an equivalent decoded CBOR value. Re-encoding the same logical `encryptionInfo` can change map ordering or byte-string encoding choices and therefore change the transcript hash.

### E.4 Origin binding and SessionTranscript bytes

Both sides compute the direct `dcapi` `SessionTranscript` from the exact `encryptionInfo` base64url string and the authenticated origin, or a deployment-defined privileged-caller origin-equivalent value, supplied by the Browser / User Agent or platform.

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`dcapiInfo` is a CBOR byte string only after serialization. The SHA-256 input is those exact `dcapiInfo` bytes. `handover` is a logical array whose second item is the 32-byte digest. `SessionTranscript` bytes are the exact CBOR serialization of `[null, null, handover]`.

The `null` values are literal CBOR null values. They are not omitted fields, empty byte strings, JSON null text, or placeholders. The origin is not taken from the SMART request JSON, `purpose`, item display text, selector URLs, kiosk metadata, or returned Artifacts.

The same `SessionTranscript` bytes are used in three separate places in this profile:

- optional `ReaderAuthentication` verification and signing;
- `DeviceAuthentication` device-key proof; and
- HPKE response encryption and opening as `info`.

Any mismatch in the origin string, the exact `encryptionInfo` base64url string, the CBOR serialization of `dcapiInfo`, or the final `SessionTranscript` bytes changes the reader-authentication payload, the device-authentication payload, and the HPKE context.

### E.5 Optional `ReaderAuthentication` and detached `readerAuth`

Core version 1.0 makes `readerAuth` optional unless a deployment profile requires it. When §8 reader authentication is present, it is a detached `COSE_Sign1` using ES256 over `ReaderAuthenticationBytes`:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

Here `SessionTranscript` and `ItemsRequestBytes` are embedded as CBOR values corresponding to the already-serialized bytes. `ItemsRequestBytes` is the complete tag-24-wrapped `ItemsRequest`. The `COSE_Sign1` payload field is `null`, and the COSE Sig_structure uses empty external AAD and the detached `ReaderAuthenticationBytes` as the payload. The protected header contains `{1: -7}` for ES256. The core profile carries reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate; deployment profiles define chain validation, anchors, revocation, and assurance labels.

### E.6 SMART response JSON to issuer-signed mdoc element

After Holder review, the Wallet/Responder constructs the SMART response under §6. The same-device flow carries the response as a UTF-8 JSON text string in a single stable issuer-signed mdoc element:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": <SMART response JSON text>
}
```

The namespace is `org.smarthealthit.checkin`. The response is not returned as a separate mdoc element per request item, not in `requestInfo`, not in `DeviceNameSpaces`, and not as plaintext JSON outside the mdoc response. As with request JSON, this specification does not define canonical JSON serialization for the SMART response object; fixtures that need byte reproducibility preserve the exact JSON text placed in `elementValue`.

The complete CBOR encoding of `IssuerSignedItem` is wrapped in tag 24 before being placed in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`. The MSO value digest is computed over the complete tag-24-wrapped `IssuerSignedItem` bytes:

```text
IssuerSignedItemBytes = tag24(CBOR(IssuerSignedItem))
valueDigest = SHA-256(IssuerSignedItemBytes)
```

`IssuerSignedItem.digestID` identifies the corresponding entry in `MSO.valueDigests["org.smarthealthit.checkin"]`. The digest id value itself is not a separate clinical identifier.

### E.7 MSO, `issuerAuth`, `DeviceAuthentication`, and device signature

The Mobile Security Object binds the document type, digest algorithm, disclosed-element digests, validity information, and the device public key used for device authentication. For this profile, the relevant document type is `org.smarthealthit.checkin.1`, the digest algorithm is `SHA-256`, and the value digest covers the tag-24 `smart_health_checkin_response` `IssuerSignedItem`.

`issuerAuth` is a `COSE_Sign1` over the MSO according to §8. It authenticates the MSO and supplies issuer evidence for the mdoc container. It does not by itself prove clinical-source provenance for unsigned raw FHIR JSON Artifacts.

The Wallet/Responder also constructs device authentication for the same session:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response remains the issuer-signed element; it is not moved into `DeviceNameSpaces` to make the device signature cover a different response carrier. The `deviceSignature` is a `COSE_Sign1` created with the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`.

### E.8 `DeviceResponse`, HPKE, and `dcapiResponse`

The Wallet/Responder constructs a `DeviceResponse` containing the SMART Health Check-in document, issuer-signed response element, `issuerAuth`, device-signed namespaces, and device signature. The `DeviceResponse` plaintext for HPKE is the exact CBOR serialization of that logical value.

Section 8 defines the HPKE parameters for the core flow:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

The HPKE `info` input is the `SessionTranscript` bytes, not a diagnostic string, not the `dcapiInfo` bytes, and not the base64url `encryptionInfo` string by itself. The HPKE AAD is the zero-length byte string. The HPKE output is wrapped as:

```text
[
  "dcapi",
  {
    "enc": <HPKE enc bstr>,
    "cipherText": <HPKE ciphertext bstr>
  }
]
```

The CBOR encoding of this `dcapiResponse` is base64url-encoded without padding as `data.response` in the Digital Credentials API result. A Verifier reverses this ladder: base64url-decodes `data.response`, parses the direct `dcapi` envelope, reconstructs the expected `SessionTranscript` from the original request context, HPKE-opens with the retained recipient private key, parses the `DeviceResponse`, verifies mdoc issuer/digest/device evidence, extracts the SMART response JSON string from the stable issuer-signed element, and finally applies §6 and §6.6 response validation against the original SMART request.

## Appendix F. CBOR diagnostic notation cheat-sheet for this specification

This appendix explains the notation used in examples, appendices, reviews, and fixture diagnostics for SMART Health Check-in same-device material. It is explanatory. It does not override §8, Appendix C CDDL, RFC 8949, COSE, HPKE, or ISO/IEC 18013-5.

### F.1 General conventions

CBOR diagnostic notation is a readable representation of CBOR data items. It is not the wire encoding. A diagnostic example can help a human see that a map contains `"docType"` or that an array begins with `"dcapi"`, but byte-level operations use serialized CBOR bytes.

In this specification:

- arrays appear as `[item1, item2, ...]`;
- maps appear as `{key1: value1, key2: value2}`;
- text strings appear in double quotes, for example `"org-iso-mdoc"`;
- byte strings appear as `h'010203'` or as descriptive placeholders such as `<ciphertext bstr>`;
- integers appear as decimal numbers, including negative COSE labels such as `-1`;
- `null` is the CBOR simple value null;
- comments after `;` are explanatory and are not CBOR data;
- ellipses and angle-bracketed names are placeholders unless a surrounding fixture explicitly supplies bytes.

Map ordering in diagnostic notation is editorial unless a section or fixture states that a displayed byte string is the exact CBOR serialization. Do not infer deterministic CBOR requirements from the order in a diagnostic map. Appendix C owns CDDL and any deterministic-encoding or fixture-canonicalization rules.

### F.2 Byte strings, text strings, and base64url strings

A CBOR text string (`tstr`) is a Unicode string encoded by CBOR. The SMART request and SMART response are carried as JSON text strings at specific fields:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"] = <SMART request JSON tstr>
IssuerSignedItem.elementValue = <SMART response JSON tstr>
```

A CBOR byte string (`bstr`) is raw bytes. Examples include nonce bytes, P-256 coordinate bytes, HPKE `enc`, HPKE `cipherText`, COSE protected-header bytes, signatures, DER certificates, MSO digest values, and serialized CBOR values carried inside tag 24.

Base64url without padding is a textual presentation of bytes outside CBOR in the DC API JSON request or result. In this profile, `data.deviceRequest`, `data.encryptionInfo`, and `data.response` are base64url strings without `=` padding. Section 8.3 binds the exact `data.encryptionInfo` base64url string into `dcapiInfo`; that is one of the unusual places where the textual base64url representation is itself an input to a later CBOR serialization and hash.

### F.3 CBOR tag 24

CBOR tag 24 means “encoded CBOR data item” in RFC 8949 diagnostic terminology. In this specification, tag 24 marks bytes that are themselves a CBOR encoding and are used in ISO-style signed or digested structures.

Common tag-24 boundaries are:

```text
DocRequest.itemsRequest = 24(h'<CBOR ItemsRequest bytes>')
ReaderAuthenticationBytes = 24(h'<CBOR ReaderAuthentication array bytes>')
issuerSigned.nameSpaces[namespace][i] = 24(h'<CBOR IssuerSignedItem bytes>')
issuerAuth.payload = 24(h'<CBOR MSO bytes>')
DeviceAuthenticationBytes = 24(h'<CBOR DeviceAuthentication array bytes>')
DeviceAuthentication[3] = 24(h'<CBOR DeviceNameSpaces bytes>')
```

Some tooling displays `tag24(CBOR(...))`, `24(...)`, or `18(...)` depending on diagnostic dialect. This appendix uses `tag24(CBOR(value))` when emphasizing the construction and `24(h'...')` when emphasizing the serialized bytes.

### F.4 COSE_Sign1 notation

`COSE_Sign1` is the COSE single-signer signature structure. Diagnostic examples often show it as a four-element array:

```text
[
  protected:   h'<CBOR protected header map>',
  unprotected: { ... },
  payload:     null / bstr,
  signature:   h'<signature bytes>'
]
```

The labels `protected:`, `unprotected:`, `payload:`, and `signature:` are explanatory labels, not CBOR map keys. The actual COSE_Sign1 is an array.

For ES256 in this profile, protected headers include label `1` (`alg`) with value `-7`:

```text
{1: -7}
```

A detached `readerAuth` has `payload: null` and signs a Sig_structure whose detached payload is `ReaderAuthenticationBytes`. `issuerAuth` signs the tag-24-wrapped MSO bytes as its payload under §8. A device `deviceSignature` signs `DeviceAuthenticationBytes` according to mdoc device-authentication rules.

### F.5 COSE_Key EC2 P-256 labels

The recipient HPKE public key in `encryptionInfo` and the mdoc device key in the MSO use COSE_Key-style labels for an EC2 P-256 public key:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: h'<x-coordinate>',
  -3: h'<y-coordinate>'
}
```

The comments name the conventional COSE meanings. The comments are not encoded. The coordinate byte strings are fixed-width P-256 field-element encodings in the active implementation and fixtures; Appendix C and the relevant cryptographic specifications own any exact conformance grammar.

### F.6 Header label 33 (`x5chain`)

COSE header label `33` is used for `x5chain` certificate evidence. In this profile, `readerAuth` carries at least the leaf reader certificate under label `33` in a COSE header. Diagnostic examples may show either protected or unprotected headers, for example:

```text
unprotected: {33: [h'<reader certificate DER>']}
```

The presence of certificate bytes is not the same as successful reader trust. Section 7 and §8 distinguish absent, malformed, cryptographically failed, cryptographically valid but untrusted, and trusted reader-authentication states.

### F.7 Non-normative placeholders and comments

Angle-bracketed values such as `<SMART response JSON text>`, `<nonce bstr>`, `<HPKE enc bstr>`, `<P-256 x-coordinate bstr>`, and `<COSE_Sign1>` are non-normative placeholders unless a fixture explicitly replaces them with concrete bytes. Placeholder names describe the kind of value; they are not strings, map keys, or registry entries.

Comments beginning with `;` explain a line. They are not part of JSON, CBOR, COSE, CDDL, or HPKE inputs. A complete fixture must not include comments or ellipses as protocol data.

## Appendix G. Compatibility notes for ISO/IEC 18013-5 §9 and W3C Digital Credentials API

This appendix explains how SMART Health Check-in 1.0 profiles direct `org-iso-mdoc` presentation for a same-device SMART clinical exchange. It is a compatibility note. Section 8 controls the normative same-device behavior, Appendix C controls detailed CDDL, and Appendix D controls fixture classification.

### G.1 Reuse of mdoc structures

The profile reuses mdoc presentation concepts rather than defining a new presentation container. The Verifier constructs a `DeviceRequest` with `docRequests`, an `ItemsRequest`, an optional per-`DocRequest.readerAuth`, and a direct DC API `encryptionInfo` value. The Wallet/Responder returns a `DeviceResponse` containing an mdoc `Document`, issuer-signed namespaces, an MSO signed as `issuerAuth`, device-signed namespaces, and device authentication.

SMART Health Check-in constrains the mdoc content to one version 1.0 document type and one stable element:

```text
docType:   org.smarthealthit.checkin.1
namespace: org.smarthealthit.checkin
element:   smart_health_checkin_response
```

The requested and disclosed element is stable. Request items, FHIR profiles, questionnaires, accepted media types, Artifacts, fulfillment links, and item statuses are not modeled as separate generic mDL or mdoc data elements in the core profile.

### G.2 SMART-specific request and response placement

The SMART request is a SMART Health Check-in clinical JSON object defined by §5. In this same-device profile, it is carried only as a JSON text string in:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

The SMART response is a SMART Health Check-in clinical JSON object defined by §6. It is carried only as the `elementValue` string of the issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`.

This placement lets the profile reuse mdoc request, issuer-signed-item, MSO digest, device-authentication, and encrypted-response mechanics while keeping clinical semantics in §§5-6. It also avoids embedding requester identity metadata in the SMART request body; origin, reader authentication, issuer evidence, device proof, and clinical-source provenance remain separate trust layers under §7.

### G.3 `DeviceRequest` version and reader authentication

The core profile uses `DeviceRequest.version` exactly `"1.0"`. When reader authentication is present, it uses per-`DocRequest.readerAuth` as a detached `COSE_Sign1` over `ReaderAuthenticationBytes`, including the direct `dcapi` `SessionTranscript` and exact tag-24 `ItemsRequestBytes`.

The core profile does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as its reader-authentication mechanism. A future version or explicit deployment profile could define such a variant, but it would not be the core SMART Health Check-in 1.0 flow described by §8.

`readerAuth` is optional in core v1. A deployment can require it, but successful reader authentication requires signature verification and policy acceptance of the supplied certificate evidence. The `x5chain` certificate evidence under COSE label `33` is evidence for policy evaluation, not a self-contained authorization decision.

### G.4 Direct DC API handover and SessionTranscript

The profile uses a direct DC API handover/session transcript:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The first input is the exact unpadded base64url `encryptionInfo` string from the DC API request. The second input is the authenticated origin or deployment-approved privileged-caller origin-equivalent supplied by the Browser / User Agent or platform. This binds the presentation session to the caller context and the HPKE recipient public key material conveyed in `encryptionInfo`.

The same `SessionTranscript` bytes bind optional reader authentication, mdoc device authentication, and HPKE encryption. HPKE uses DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, with `info = SessionTranscript bytes` and `aad = empty byte string`.

### G.5 Roles of issuerAuth, deviceSignature, and HPKE

`issuerAuth` signs the MSO. It supports validation of the document type, digest algorithm, disclosed-element digest, validity information, and device key under the applicable issuer or deployment trust policy.

The disclosed issuer-signed item carries the SMART response JSON string. Its tag-24 bytes hash to the corresponding MSO value digest. This digest binding protects the stable response element inside the mdoc presentation container.

`deviceSignature` proves possession of the private key corresponding to `MSO.deviceKeyInfo.deviceKey` for this session's `DeviceAuthentication` payload. The `DeviceAuthentication` payload includes the same `SessionTranscript`, the SMART Health Check-in `docType`, and tag-24 `DeviceNameSpaces` bytes.

HPKE encrypts the CBOR `DeviceResponse` to the Verifier's recipient public key from `encryptionInfo`. HPKE confidentiality and integrity protect the response in transit through the direct DC API result. HPKE success is necessary for Verifier processing, but it is not a substitute for mdoc issuer/digest/device validation or §6.6 SMART response cross-validation.

These roles remain separate trust layers. A successful mdoc presentation does not by itself prove patient matching, legal authority, EHR write-back authorization, downstream clinical acceptance, or clinical-source provenance for unsigned raw FHIR JSON. Clinical-source provenance remains governed by §7 and by evidence inside returned Artifacts, such as SMART Health Card signatures or accepted provenance.

### G.6 What this profile intentionally does not define

SMART Health Check-in 1.0 does not define generic mobile driving license fields, generic mDL attribute semantics, or a general-purpose data-element registry for arbitrary mdoc claims. It does not map `family_name`, `given_name`, `birth_date`, portrait, driving privileges, address fields, or other ISO mDL elements into SMART request or response semantics.

The profile also does not define a second request language inside mdoc element names, a generic FHIR query language, separate mdoc elements for each requested FHIR profile, or kiosk-specific clinical fields for same-device processing. Kiosk re-enters this same §8 flow on the phone with the embedded SMART request; kiosk pointer, relay, submission encryption, and completion behavior belong to §9.

Implementations can support other mdoc document types or other Digital Credentials API protocols independently. Such support is outside this profile unless it preserves the §8 carrier locations, identifiers, transcript construction, HPKE parameters, and SMART clinical validation rules for SMART Health Check-in 1.0.

## Organizer notes

### Strengths

- The draft keeps Appendix E, F, and G subordinate to §8 and uses them as explanatory implementation support rather than alternate normative sources.
- It preserves the accepted carrier decisions: request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, response only in the issuer-signed `smart_health_checkin_response` `elementValue`.
- It calls out byte-vs-logical-value boundaries, tag-24 boundaries, exact base64url-without-padding use, origin binding, optional per-DocRequest `readerAuth`, HPKE `info`, and empty AAD.
- It avoids fabricated byte strings and points only to fixture roots verified in the repository.

### Caveats

- Appendix E is a ladder narrative, not a concrete worked vector. Appendix D/T3.D should decide which checked-in fixtures are conformance vectors, diagnostics, generated vectors, or historical captures.
- Exact duplicate-handling behavior, deterministic CBOR requirements, map labels beyond the §8 prose, and any nonce-size hardening are left to Appendix C/D or conformance closure.
- The active implementation has demo and self-attested certificate material; this draft avoids treating those fixtures as production trust guidance.

### Open issues

- Whether Appendix C should require deterministic CBOR for any generated conformance vectors while still allowing ordinary CBOR for live protocol messages where byte equivalence is not later re-derived.
- Whether core conformance should require authenticated origin availability, or whether reduced-assurance privileged-caller origin-equivalent flows remain deployment-profile behavior.
- Whether nonce length should remain “fresh unpredictable, at least 16 bytes recommended by active code” or be fixed to 32 bytes for conformance vectors.
- How Appendix D should label the real Chrome/Android capture relative to generated TypeScript vectors and minimal pymdoc response fixtures.

### Downstream dependencies

- T3.D / Appendix C should convert the §8 structures referenced here into precise CDDL without changing field names or carriers.
- T3.D / Appendix D should index the fixture roots and identify which files demonstrate each ladder step.
- §11 should reuse the trust separation described here for replay, origin spoofing, reader impersonation, HPKE key reuse, plaintext debug artifacts, and raw-FHIR overclaiming.
- §13 and Appendix A should register or checklist only identifiers and requirements already fixed by §8 and related canonical sections.
