# T3.C attempt 05 — same-device support appendices

## Appendix E. SessionTranscript and same-device byte ladder

This appendix is explanatory support for the same-device `org-iso-mdoc` presentation flow in §8. Section 8 is the source of normative requirements for request construction, `SessionTranscript` construction, optional reader authentication, mdoc response construction, HPKE processing, and Verifier validation. This appendix does not define alternate field names, request carriers, response carriers, HPKE parameters, or clinical semantics.

The purpose of the ladder is to help implementers and fixture authors identify which intermediate values are logical CBOR/JSON values and which are exact bytes. Whenever a value is hashed, signed, digested, encrypted, base64url-encoded, or compared byte-for-byte, implementations use the exact serialized bytes identified by §8, not a diagnostic rendering of those bytes.

### E.1 Byte and value conventions for this ladder

- **SMART request JSON** and **SMART response JSON** are UTF-8 JSON text serializations of the transport-neutral objects defined in §§5-6. The clinical model does not define canonical JSON serialization, so a byte ladder or fixture must preserve the exact JSON text used for the transaction.
- **CBOR(value)** means the exact CBOR serialization of the logical value in the selected implementation or fixture. Appendix C owns the final CDDL and conformance-vector encoding rules.
- **tag24(CBOR(value))** means a CBOR tag 24 data item whose content is a byte string containing the encoded CBOR data item. The tag-24 wrapper bytes are part of the value when §8 says they are signed, hashed, or embedded.
- **base64url** in this flow means base64url without `=` padding. The exact base64url string for `encryptionInfo` is bound into the `SessionTranscript`; re-encoding the same CBOR bytes in a different textual form would change the transcript input if the string differs.
- **Origin** means the authenticated web origin or deployment-approved privileged-caller origin-equivalent supplied through the Browser / User Agent or platform. It is not derived from the SMART request body, `purpose`, item text, selector URLs, kiosk metadata, or returned Artifacts.

### E.2 Request-side ladder

The request-side ladder begins with the Requester-created clinical request and ends with the Digital Credentials API request data supplied to the Browser / User Agent.

1. **SMART request object.** The Requester constructs a `SmartHealthCheckinRequest` under §5.
2. **SMART request JSON text.** The Verifier serializes that object as UTF-8 JSON text. Section 8 requires the SMART request to be carried only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
3. **`ItemsRequest` logical value.** The Verifier constructs an `ItemsRequest` with:

   ```text
   {
     "docType": "org.smarthealthit.checkin.1",
     "nameSpaces": {
       "org.smarthealthit.checkin": {
         "smart_health_checkin_response": true / false
       }
     },
     "requestInfo": {
       "org.smarthealthit.checkin.request": <SMART request JSON text>
     }
   }
   ```

   The stable requested element is `smart_health_checkin_response`. The SMART request is not represented by dynamic mdoc element names and is not placed in a kiosk wrapper field for this same-device flow.
4. **`ItemsRequestBytes`.** The Verifier CBOR-encodes the `ItemsRequest` and wraps those bytes in tag 24:

   ```text
   ItemsRequestBytes = tag24(CBOR(ItemsRequest))
   ```

   These exact tag-24 bytes are embedded in `DocRequest.itemsRequest`. They are also the bytes bound into optional `readerAuth`.
5. **Optional `ReaderAuthenticationBytes`.** If per-`DocRequest.readerAuth` is present, §8 requires it to be a detached `COSE_Sign1` over:

   ```text
   ReaderAuthenticationBytes = tag24(CBOR([
     "ReaderAuthentication",
     SessionTranscript,
     ItemsRequestBytes
   ]))
   ```

   Because this input includes `SessionTranscript`, the Verifier first completes the `encryptionInfo` and transcript steps below. `readerAuth` is optional in core v1. When present, it is per `DocRequest`, uses ES256 (`alg` `-7`), has a `null` payload in the serialized `COSE_Sign1`, signs the COSE `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as detached payload, and carries certificate evidence in COSE header label `33` (`x5chain`) as specified by §8.
6. **`DeviceRequest` logical value.** The Verifier constructs a version `"1.0"` `DeviceRequest` containing the SMART Health Check-in `DocRequest`:

   ```text
   {
     "version": "1.0",
     "docRequests": [{
       "itemsRequest": ItemsRequestBytes,
       "readerAuth": COSE_Sign1 / optional
     }]
   }
   ```

   Core SMART Health Check-in 1.0 uses per-`DocRequest.readerAuth` when reader authentication is present. It does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core reader-authentication mechanism.
7. **`DeviceRequest` bytes and base64url.** The Verifier CBOR-encodes `DeviceRequest` and base64url-encodes the resulting bytes without padding for `data.deviceRequest`.
8. **`encryptionInfo` logical value.** The Verifier constructs the direct DC API encryption information:

   ```text
   encryptionInfo = [
     "dcapi",
     {
       "nonce": <fresh unpredictable bytes>,
       "recipientPublicKey": {
          1: 2,        ; kty = EC2
         -1: 1,        ; crv = P-256
         -2: <x-coordinate bstr>,
         -3: <y-coordinate bstr>
       }
     }
   ]
   ```

   The public key is the HPKE recipient public key for DHKEM(P-256, HKDF-SHA256). Section 8 defines freshness and key-retention requirements; Appendix E does not tighten the nonce length.
9. **`encryptionInfo` bytes and exact base64url string.** The Verifier CBOR-encodes `encryptionInfo` and base64url-encodes those bytes without padding:

   ```text
   encryptionInfoBase64Url = b64u(CBOR(encryptionInfo))
   ```

   The exact string supplied as `data.encryptionInfo` is a transcript input. Implementations must preserve it for subsequent transcript construction and HPKE opening.
10. **Digital Credentials API request.** The Verifier invokes direct `org-iso-mdoc` with `data.deviceRequest = b64u(CBOR(DeviceRequest))` and `data.encryptionInfo = encryptionInfoBase64Url`.

### E.3 `SessionTranscript` ladder

Both sides derive the direct `dcapi` `SessionTranscript` from the exact `encryptionInfo` base64url string and origin value identified for the same presentation invocation:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

Important byte boundaries:

- `dcapiInfo` is CBOR bytes for the two-item array `[encryptionInfoBase64Url, origin]`; the SHA-256 input is not the UTF-8 concatenation of the two strings and not decoded `encryptionInfo` bytes alone.
- `handover` is a logical CBOR array containing the text string `"dcapi"` and the SHA-256 digest byte string.
- `SessionTranscript` is the exact CBOR serialization of `[null, null, handover]`.
- The two leading `null` values are the direct DC API shape used by §8. Implementers must not replace them with ISO engagement or handover structures from another transport.
- The same `SessionTranscript` bytes are used for optional `readerAuth` verification, `DeviceAuthentication`, HPKE `info`, and Verifier-side response processing.

### E.4 Wallet request handling ladder

On receipt, the Wallet/Responder performs the reverse boundary checks before Holder review:

1. Confirm the `org-iso-mdoc` protocol and base64url-decode `data.deviceRequest` and `data.encryptionInfo` without padding.
2. Parse `DeviceRequest` as CBOR and require version `"1.0"` for the core flow.
3. Locate a `DocRequest.itemsRequest` that is tag 24 around CBOR `ItemsRequest` bytes. Preserve the complete tag-24 `ItemsRequestBytes`.
4. Decode the enclosed `ItemsRequest` and check `docType`, namespace, requested element, and `intentToRetain` as defined in §8.
5. Recover `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a CBOR text string containing SMART request JSON. Parse it as UTF-8 JSON and validate it under §5.
6. Parse `encryptionInfo` as the direct `"dcapi"` value with recipient P-256 COSE_Key material.
7. Obtain the authenticated origin or approved origin-equivalent from the platform, not from the SMART request body, and compute the §8 `SessionTranscript` from the exact `encryptionInfoBase64Url` string and that origin.
8. If `readerAuth` is present and supported or relied on, verify the detached `COSE_Sign1` against the exact `ReaderAuthenticationBytes` for this `SessionTranscript` and `ItemsRequestBytes`, then evaluate the `x5chain` evidence under deployment policy. Absence, syntax failure, signature failure, valid-but-untrusted, and trusted states remain distinct for policy and display.

### E.5 Response-side ladder

After Holder review and Wallet policy, the Wallet/Responder constructs the response ladder.

1. **SMART response object.** The Wallet/Responder creates a `SmartHealthCheckinResponse` under §6. Its `requestId` exactly equals the accepted SMART request `id`; Artifacts, `fulfills[]`, and `requestStatus[]` retain the clinical semantics from §6.
2. **SMART response JSON text.** The Wallet/Responder serializes the SMART response as UTF-8 JSON text. The clinical model does not define a canonical JSON serialization.
3. **`IssuerSignedItem` logical value.** The Wallet/Responder places the SMART response JSON string in the stable mdoc element:

   ```text
   IssuerSignedItem = {
     "digestID": <integer digest id>,
     "random": <random bstr>,
     "elementIdentifier": "smart_health_checkin_response",
     "elementValue": <SMART response JSON text>
   }
   ```

4. **Tag-24 `IssuerSignedItem` and MSO value digest.** The Wallet/Responder computes:

   ```text
   IssuerSignedItemBytes = tag24(CBOR(IssuerSignedItem))
   valueDigest = SHA-256(IssuerSignedItemBytes)
   ```

   The digest covers the complete tag-24-wrapped item, not only `elementValue` and not a diagnostic representation. `IssuerSignedItem.digestID` is matched to the corresponding `MSO.valueDigests["org.smarthealthit.checkin"]` entry.
5. **MSO and `issuerAuth`.** The Wallet/Responder builds an MSO for `docType` `org.smarthealthit.checkin.1`, `digestAlgorithm` `SHA-256`, the SMART namespace value digest, and the device public key. The MSO is signed as `issuerAuth` using `COSE_Sign1` ES256. Section 7 and deployment policy decide how issuer evidence is trusted; Appendix E does not define production trust anchors.
6. **`DeviceAuthenticationBytes`.** The Wallet/Responder constructs device authentication for the same session:

   ```text
   DeviceAuthenticationBytes = tag24(CBOR([
     "DeviceAuthentication",
     SessionTranscript,
     "org.smarthealthit.checkin.1",
     tag24(CBOR(DeviceNameSpaces))
   ]))
   ```

   For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element remains issuer-signed; it is not moved into `DeviceNameSpaces`.
7. **`deviceSignature`.** The Wallet/Responder signs the device-authentication structure with ES256 using the private key corresponding to `MSO.deviceKeyInfo.deviceKey`.
8. **`DeviceResponse` logical value.** The Wallet/Responder builds a version `"1.0"` successful `DeviceResponse` containing the document, `issuerSigned.nameSpaces["org.smarthealthit.checkin"] = [IssuerSignedItemBytes]`, `issuerAuth`, tag-24 `DeviceNameSpaces`, and `deviceAuth.deviceSignature`.
9. **HPKE seal.** The Wallet/Responder CBOR-encodes `DeviceResponse` and seals the bytes using §8 parameters:

   ```text
   KEM       = DHKEM(P-256, HKDF-SHA256)
   KDF       = HKDF-SHA256
   AEAD      = AES-128-GCM
   info      = SessionTranscript bytes
   aad       = empty byte string
   plaintext = CBOR(DeviceResponse)
   ```

   `info` is the exact `SessionTranscript` bytes, not its hex, diagnostic notation, or a decoded logical array. `aad` is the zero-length byte string.
10. **`dcapiResponse`.** The Wallet/Responder wraps the HPKE output as:

   ```text
   dcapiResponse = [
     "dcapi",
     {
       "enc": <HPKE enc bstr>,
       "cipherText": <HPKE ciphertext bstr>
     }
   ]
   ```

11. **Digital Credentials API response.** The Wallet/Responder CBOR-encodes `dcapiResponse`, base64url-encodes it without padding, and returns it as `data.response` with protocol `org-iso-mdoc`.

### E.6 Verifier response ladder

The Verifier opens the ladder in the opposite direction:

1. Require the returned protocol `org-iso-mdoc` and unpadded base64url `data.response`.
2. Decode and parse CBOR `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]`.
3. Reconstruct the expected `SessionTranscript` from the original exact `encryptionInfoBase64Url` string and origin.
4. HPKE-open with the retained recipient private key, required HPKE suite, received `enc`, `info = SessionTranscript bytes`, and empty `aad`.
5. Parse plaintext as CBOR `DeviceResponse`.
6. Validate `DeviceResponse.version`, status, `docType`, `issuerAuth`, MSO `docType`, digest algorithm, validity information, issuer evidence under policy, disclosed `IssuerSignedItem` tag-24 digest binding, and device signature over `DeviceAuthentication` bound to the same `SessionTranscript`.
7. Extract the string `elementValue` from the disclosed issuer-signed item whose namespace is `org.smarthealthit.checkin` and `elementIdentifier` is `smart_health_checkin_response`.
8. Parse that string as SMART response JSON, validate it under §6, and apply §6.6 cross-validation against the original SMART request before Requester use.

### E.7 Fixture pointers

Appendix D owns authoritative fixture classification and conformance-vector status. Confirmed active fixture roots useful for byte-ladder debugging include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

This appendix intentionally does not fabricate inline byte examples or hashes. Fixture authors should preserve named intermediates such as `device-request.cbor`, `items-request.cbor`, `encryption-info.cbor`, `session-transcript.cbor`, `dcapi-response.cbor`, `device-response.cbor`, `smart-request.json`, and `smart-response.json` when available, so Appendix D and Appendix C can classify and test exact bytes.

## Appendix F. CBOR diagnostic notation cheat-sheet

This appendix is informative. It explains how CBOR diagnostic notation is used in SMART Health Check-in examples and fixture reports. It does not override §8, Appendix C CDDL, RFC 8949, COSE, or HPKE. Wire encodings are CBOR bytes, not diagnostic text.

### F.1 General notation

- **Arrays** are shown as `[a, b, c]`. Array order is part of the CBOR value.
- **Maps** are shown as `{key: value, key2: value2}`. Diagnostic map order is for readability unless a byte-level fixture identifies the exact CBOR encoding. Map key uniqueness and deterministic-order expectations are owned by the relevant normative text or Appendix C.
- **Text strings (`tstr`)** are shown in double quotes, for example `"dcapi"` or `"org.smarthealthit.checkin.1"`.
- **Byte strings (`bstr`)** are shown as `h'010203'` or as placeholders such as `<cipherText bstr>`. In prose, `bstr` means bytes, not a hex string.
- **Integers** are shown as decimal numeric labels such as `1`, `-1`, `-7`, and `33`.
- **Booleans and null** are shown as `true`, `false`, and `null`. For example, the direct `SessionTranscript` logical array contains two `null` values before the handover array.
- **Comments** may appear after `;` in diagnostic examples. Comments are explanatory and are not part of the CBOR value.
- **Placeholders** such as `<SMART response JSON text>`, `<x-coordinate bstr>`, and `<digest bstr>` are non-normative placeholders. They are not literal protocol values and must be replaced by actual values in fixtures.

### F.2 Tag 24 and embedded CBOR bytes

CBOR tag 24 means “encoded CBOR data item.” In this specification, tag 24 is important because several signed or digested values include the tag wrapper itself:

```text
24(h'...encoded CBOR bytes...')
```

For readability, examples often write the same idea as:

```text
tag24(CBOR(ItemsRequest))
tag24(CBOR(IssuerSignedItem))
tag24(CBOR(DeviceNameSpaces))
```

These expressions describe bytes. A diagnostic renderer might display a tag-24 value by decoding the enclosed bytes for humans, but digest and signature operations use the exact tag-24-wrapped bytes required by §8. Implementers should avoid accidentally hashing or signing the decoded inner map when §8 requires the outer tag-24 item.

### F.3 COSE structures

`COSE_Sign1` is a four-element COSE array:

```text
COSE_Sign1 = [
  protected,    ; bstr containing a CBOR header map
  unprotected,  ; map
  payload,      ; bstr or null
  signature     ; bstr
]
```

For ES256 in this profile, the protected header map includes COSE algorithm label `1` with value `-7`:

```text
protected = h'...CBOR({1: -7})...'
```

When `readerAuth` is present, §8 uses a detached `COSE_Sign1`: the serialized payload field is `null`, and the signature is computed over the COSE `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as the detached payload. `readerAuth` carries certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate. Examples may show this as either a byte string or an array of byte strings according to COSE x5chain conventions and Appendix C refinements:

```text
{
  33: [h'...DER certificate...']
}
```

`issuerAuth` and `deviceSignature` are also `COSE_Sign1` values using ES256 in the core profile, but they sign different payloads: tag-24 MSO bytes for `issuerAuth`, and `DeviceAuthenticationBytes` for device authentication.

### F.4 COSE_Key EC2 P-256 labels

P-256 public keys in `encryptionInfo.recipientPublicKey`, MSO `deviceKeyInfo.deviceKey`, and related examples use COSE_Key EC2 labels:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: h'...',   ; x coordinate
  -3: h'...'    ; y coordinate
}
```

The coordinate values are byte strings containing the affine coordinates. The diagnostic notation does not imply JWK encoding, compressed-point encoding, or textual hex in the actual CBOR value.

### F.5 Common SMART Health Check-in CBOR shapes

Representative diagnostic shapes used by §8 and Appendix E include:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [{
    "itemsRequest": tag24(CBOR(ItemsRequest)),
    "readerAuth": COSE_Sign1 / optional
  }]
}

SessionTranscript = [null, null, ["dcapi", h'...sha256 digest...']]

dcapiResponse = [
  "dcapi",
  {
    "enc": h'...HPKE enc...',
    "cipherText": h'...HPKE ciphertext and tag...'
  }
]
```

These examples are explanatory. Appendix C owns complete CDDL, including which map keys are text strings, which fields are optional, and any conformance-vector constraints.

### F.6 Diagnostic notation and base64url

Diagnostic notation and base64url serve different purposes:

- Diagnostic notation is a human-readable rendering of decoded CBOR values.
- Base64url without padding is the textual encoding used by the Digital Credentials API request and response fields for CBOR byte strings.
- Hex strings in fixtures and Markdown are another presentation of bytes.

When §8 says the `SessionTranscript` uses `encryptionInfoBase64Url`, the input is the exact unpadded base64url string supplied to the API, encoded as a CBOR text string inside `dcapiInfo`. It is not the diagnostic notation for `encryptionInfo` and not the decoded `encryptionInfo` bytes.

## Appendix G. Compatibility notes for ISO/IEC 18013-5 §9 and W3C Digital Credentials API

This appendix is explanatory interoperability guidance. It describes how SMART Health Check-in 1.0 reuses mdoc and direct Digital Credentials API structures while constraining them for a SMART-specific same-device profile. Section 8 remains the normative source for the version 1.0 same-device flow.

### G.1 Reuse of mdoc structures

The profile reuses familiar mdoc presentation structures:

- `DeviceRequest` with version `"1.0"` and `docRequests[]`;
- per-`DocRequest` `itemsRequest` containing tag-24 `ItemsRequest` bytes;
- optional per-`DocRequest.readerAuth` as detached `COSE_Sign1` over `ReaderAuthentication`;
- `DeviceResponse` with version `"1.0"`, `documents[]`, document `docType`, `issuerSigned`, `issuerAuth`, `deviceSigned`, `deviceAuth`, and status;
- issuer-signed items whose tag-24 bytes are digested by the MSO;
- MSO value digest and device-key binding; and
- device authentication bound to the presentation `SessionTranscript`.

The SMART-specific document type is `org.smarthealthit.checkin.1`. The SMART-specific namespace is `org.smarthealthit.checkin`. The stable requested and disclosed element is `smart_health_checkin_response`.

### G.2 SMART request and response placement

This profile constrains where the clinical objects appear:

- The SMART request is carried only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a CBOR text string containing SMART request JSON.
- The SMART response is carried as `IssuerSignedItem.elementValue` for the disclosed issuer-signed item whose `elementIdentifier` is `smart_health_checkin_response`.

Implementations do not model FHIR profiles, questionnaires, request items, Artifact media types, or status codes as separate mdoc element identifiers in the core flow. Those semantics remain inside the SMART request and SMART response JSON models defined by §§5-6.

### G.3 DeviceRequest version and reader authentication

Core SMART Health Check-in 1.0 uses `DeviceRequest.version` `"1.0"`. When reader authentication is present, it is per `DocRequest.readerAuth`, detached, ES256, bound to the same `SessionTranscript` and exact tag-24 `ItemsRequestBytes`, and carries reader certificate evidence in `x5chain` label `33`.

The core version 1.0 profile does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as its reader-authentication mechanism. A future version or deployment profile could define additional compatibility behavior, but such behavior would not change the §8 core flow.

`readerAuth` remains optional in the core profile unless a deployment profile requires it. A Wallet/Responder that accepts unsigned requests treats reader authentication as absent, not as successful. A Wallet/Responder or Verifier that relies on signed reader authentication evaluates the signature and certificate evidence under §7 and deployment policy.

### G.4 Direct DC API handover and SessionTranscript

The same-device flow uses direct DC API handover rather than an ISO engagement or cross-device handover object:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The origin component is supplied by the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It is not a SMART request field. The exact `encryptionInfo` base64url string is used as a CBOR text string in `dcapiInfo`, preserving the W3C Digital Credentials API request binding.

### G.5 HPKE response protection

The profile uses the direct DC API `encryptionInfo` recipient key and HPKE to protect the mdoc `DeviceResponse` returned through the API. Section 8 fixes the HPKE suite for the core profile:

```text
DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM
info = SessionTranscript bytes
aad = empty byte string
```

The HPKE output is returned as CBOR `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]`, then base64url-encoded without padding in `data.response`. HPKE protects the mdoc response transport. It does not by itself establish clinical-source provenance for unsigned raw FHIR JSON or replace §6 response validation.

### G.6 Roles of issuerAuth, deviceSignature, HPKE, and clinical-source evidence

The reused mdoc evidence layers have distinct roles:

- `issuerAuth` signs the MSO and supports validation of document type, value digests, validity information, issuer evidence, and device-key binding.
- The value digest binds the disclosed tag-24 `IssuerSignedItem` containing `smart_health_checkin_response` to the MSO.
- `deviceSignature` proves possession of the device private key for `DeviceAuthentication` bound to the same `SessionTranscript`.
- HPKE encrypts the CBOR `DeviceResponse` for the Verifier's recipient key and binds encryption to the same `SessionTranscript` through HPKE `info`.
- Clinical-source trust for returned Artifacts is evaluated from Artifact payload evidence, such as SMART Health Card signatures, provenance, or deployment-accepted source evidence, not from transport success alone.

These layers are cumulative validation inputs. A Verifier still validates the extracted SMART response under §6 and cross-validates it against the original SMART request under §6.6.

### G.7 What this profile intentionally does not define

SMART Health Check-in 1.0 does not define a generic mDL document, generic mdoc attribute vocabulary, or generic holder identity credential. It does not assign meanings to ISO mDL fields such as name, age, portrait, driving privileges, or address. It does not require Wallets to store or issue generic mdoc documents outside the SMART Health Check-in document type.

The profile also does not define a generic DC API credential query language. It uses the direct `org-iso-mdoc` request and response shapes needed to carry one SMART-specific response element and one SMART request in `requestInfo`. Future bindings, including reserved OpenID4VP work, must preserve the clinical semantics of §§5-6 and must not be treated as version 1.0 core behavior unless specified by a future version.

### G.8 Relationship to fixtures and CDDL

Appendix C owns CDDL and detailed same-device data model constraints. Appendix D owns fixture classification, including which captures are conformance vectors, diagnostics, generated examples, or historical evidence. This Appendix G identifies compatibility intent and profile constraints so those appendices can align with §8 without creating alternate encodings.

## Organizer notes

### Strengths

- Preserves §8 as the normative owner and explicitly treats Appendix E/F/G as explanatory support.
- Provides a complete ordered ladder from SMART request JSON through tag-24 `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, direct `dcapi` `SessionTranscript`, optional `readerAuth`, SMART response issuer-signed item, MSO digest, `DeviceAuthentication`, HPKE, `dcapiResponse`, and Verifier extraction.
- Separates logical values from exact bytes, especially tag-24 wrappers, the exact `encryptionInfoBase64Url` string, origin binding, HPKE `info`, and empty HPKE `aad`.
- Reinforces accepted T3.B decisions: request in `requestInfo`, response in `IssuerSignedItem.elementValue`, version `"1.0"`, per-`DocRequest.readerAuth`, no core `readerAuthAll`, and distinct trust layers.
- Gives fixture authors useful intermediate names while deferring authoritative fixture classification to Appendix D and exact CDDL to Appendix C.

### Caveats

- This attempt intentionally avoids fabricated byte strings, hashes, and inline captures. It relies on fixture paths that were confirmed present, but Appendix D still needs to classify them.
- Some ISO terminology is summarized rather than exhaustively specified because Appendix C should own precise CDDL and ISO-compatible structural refinements.
- Nonce size is not tightened here; §8 notes active fixtures use 32 bytes while core text currently requires fresh unpredictable bytes and suggests at least 16 bytes.

### Open issues

- Appendix C should decide exact CDDL labels, duplicate element/document handling, deterministic encoding expectations for conformance vectors, and any fixed nonce-size rule.
- Appendix D should mark which fixture roots are conformance vectors versus diagnostic or historical captures and should align file names with the final byte ladder.
- §11 should revisit replay/freshness, origin spoofing, reduced-assurance origin UX, reader impersonation, HPKE key reuse, debug artifact leakage, and overclaiming raw-FHIR source trust.
- §13 should decide how to register the SMART mdoc `docType`, namespace, requestInfo key, response element, and any deployment-profile hooks.

### Downstream dependencies

- T3.D should use this appendix as input for CDDL and fixture-byte material, without changing the accepted §8 field names or carriers.
- T4 kiosk text should continue to describe kiosk as wrapper/re-entry into §8 and should not introduce another same-device request or response carrier.
- T5 conformance and security/privacy sections should turn only actual normative §8 requirements into checklist items; explanatory appendix text should not become an independent source of obligations.
