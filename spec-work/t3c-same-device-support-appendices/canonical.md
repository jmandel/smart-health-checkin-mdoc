# Appendix E: Same-device byte ladder and SessionTranscript derivation

This appendix is explanatory support for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended to help implementers, fixture authors, and reviewers identify byte boundaries and reproduce the same hashes, signatures, HPKE context, and response extraction behavior. It does not define alternate request carriers, response carriers, field names, HPKE parameters, trust semantics, clinical semantics, CDDL, or fixture classifications. If this appendix appears to conflict with §8, §8 controls.

## E.1 Logical values, encoded bytes, and text encodings

The same-device flow crosses several representation boundaries:

- A **SMART request** and **SMART response** are clinical JSON objects defined by §§5-6. In this binding each is carried as UTF-8 JSON text at a specific CBOR text-string location. The specification does not define canonical JSON serialization for these clinical objects. Fixtures may preserve the exact JSON text used in a capture, but semantically equivalent JSON text can have different bytes.
- A **CBOR logical value** is an abstract value such as an array, map, text string, byte string, tag, boolean, or `null`.
- **CBOR bytes** are a particular serialization of a logical value. Hashes, signatures, HPKE `info`, tag-24 wrappers, base64url fields, and fixture byte comparisons use bytes, not diagnostic notation.
- **base64url without padding** is the textual encoding used by the Digital Credentials API request and result fields for selected CBOR byte strings. The direct `dcapi` `SessionTranscript` binds the exact `encryptionInfo` base64url text string from the request.

CBOR tag 24 is the “encoded CBOR data item” tag. In this appendix, `tag24(CBOR(X))` means a CBOR tag 24 whose content is a byte string containing the complete CBOR serialization of `X`. The outer tag, the byte-string header, and the enclosed bytes are part of the tagged value. Implementations can decode the inner value for inspection, but byte operations use the exact tag-24 value identified by §8.

## E.2 Ordered same-device byte ladder

The following ladder names the ordered transformations in the base same-device flow. It uses placeholders rather than fabricated hashes, signatures, or ciphertexts.

1. **SMART request JSON.** The Requester constructs a `SmartHealthCheckinRequest` under §5. The Verifier serializes it as UTF-8 JSON text.
2. **`ItemsRequest` logical value.** Section 8 carries the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. The requested mdoc element is `smart_health_checkin_response` in namespace `org.smarthealthit.checkin` under `docType` `org.smarthealthit.checkin.1`:

   ```text
   ItemsRequest = {
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

   The boolean is the mdoc `intentToRetain` value for the requested element. It is not Holder consent.

3. **`ItemsRequest` CBOR and tag 24.** The Verifier serializes `ItemsRequest` as CBOR and wraps it in tag 24:

   ```text
   ItemsRequestBytes = tag24(CBOR(ItemsRequest))
   ```

   These exact tagged bytes are placed in `DocRequest.itemsRequest` and are bound by `readerAuth` when reader authentication is present.

4. **`DeviceRequest`.** The core flow uses `DeviceRequest.version` `"1.0"` and per-`DocRequest.readerAuth` when reader authentication is present:

   ```text
   DeviceRequest = {
     "version": "1.0",
     "docRequests": [{
       "itemsRequest": ItemsRequestBytes,
       "readerAuth": COSE_Sign1 / optional
     }]
   }
   ```

   Core version 1.0 does not use `readerAuthAll` as its reader-authentication mechanism. The Verifier serializes the `DeviceRequest` as CBOR and base64url-encodes those bytes without padding as `data.deviceRequest`.

5. **`encryptionInfo`.** The Verifier prepares an HPKE recipient key pair and constructs the direct DC API encryption information:

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

   The Verifier serializes `encryptionInfo` as CBOR and base64url-encodes those bytes without padding as `data.encryptionInfo`.

6. **Exact `encryptionInfo` base64url string.** Let `encryptionInfoBase64Url` be the exact unpadded string supplied as `data.encryptionInfo`. The transcript binds this text string. A component that decodes and re-encodes `encryptionInfo` into a different textual spelling has changed the transcript input.

7. **Digital Credentials API request.** The Verifier invokes direct `org-iso-mdoc` with request data equivalent to:

   ```json
   {
     "protocol": "org-iso-mdoc",
     "data": {
       "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
       "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
     }
   }
   ```

8. **`dcapiInfo`, handover, and `SessionTranscript`.** Both sides use the exact `encryptionInfoBase64Url` string and the authenticated origin, or deployment-approved privileged-caller origin-equivalent, supplied by the Browser / User Agent or platform:

   ```text
   dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
   handover = ["dcapi", SHA-256(dcapiInfo)]
   SessionTranscript = CBOR([null, null, handover])
   ```

   Equivalently, the formula can be written as:

   ```text
   SessionTranscript = CBOR([null, null, ["dcapi", SHA-256(CBOR([encryptionInfoBase64Url, origin]))]])
   ```

   The origin is not derived from the SMART request body, `purpose`, item display text, selector URLs, request ids, kiosk metadata, callback-looking strings, or returned Artifacts.

9. **Optional `ReaderAuthentication`.** If `readerAuth` is present, §8 defines the detached payload as:

   ```text
   ReaderAuthenticationBytes = tag24(CBOR([
     "ReaderAuthentication",
     SessionTranscript,
     ItemsRequestBytes
   ]))
   ```

   The `readerAuth` COSE_Sign1 uses ES256 (`alg` `-7`), has serialized payload `null`, signs the COSE `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as the detached payload, and carries reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Reader authentication is optional in core v1 unless a deployment profile requires it.

10. **Wallet request extraction.** The Wallet/Responder decodes `data.deviceRequest` and `data.encryptionInfo`, parses CBOR, locates the tag-24 `DocRequest.itemsRequest`, verifies the SMART Health Check-in `docType`, namespace, and requested element, preserves the exact `ItemsRequestBytes`, and extracts the SMART request JSON string only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.

11. **Wallet transcript and readerAuth checks.** The Wallet/Responder recomputes the `SessionTranscript` from the exact `encryptionInfoBase64Url` string and platform-provided origin or origin-equivalent context. If `readerAuth` is present and relevant to policy, it verifies the detached signature over the same `ReaderAuthenticationBytes` and evaluates `x5chain` evidence under deployment policy.

12. **SMART response JSON.** After Holder review and Wallet policy, the Wallet/Responder constructs a `SmartHealthCheckinResponse` under §6. Its `requestId` is the accepted SMART request `id`. The Wallet/Responder serializes the response as UTF-8 JSON text; the clinical model does not define canonical JSON serialization.

13. **`IssuerSignedItem`.** The SMART response is carried as the `elementValue` of the issuer-signed item for the stable element:

   ```text
   IssuerSignedItem = {
     "digestID": <integer digest id>,
     "random": <random bstr>,
     "elementIdentifier": "smart_health_checkin_response",
     "elementValue": <SMART response JSON text>
   }
   ```

14. **Tag-24 `IssuerSignedItem` and MSO value digest.** The Wallet/Responder serializes the item, wraps it in tag 24, and computes the MSO value digest over the complete tagged value:

   ```text
   IssuerSignedItemBytes = tag24(CBOR(IssuerSignedItem))
   MSO.valueDigests["org.smarthealthit.checkin"][digestID]
     = SHA-256(IssuerSignedItemBytes)
   ```

   The digest input is not only `elementValue`, not only the decoded inner map, and not diagnostic notation.

15. **MSO and `issuerAuth`.** The Wallet/Responder constructs an MSO for `docType` `org.smarthealthit.checkin.1`, covering the disclosed issuer-signed item and identifying the device key. Section 8 defines `issuerAuth` as ES256 `COSE_Sign1` over the tag-24-wrapped MSO bytes unless Appendix C or an ISO-compatible profile defines an equivalent encoding.

16. **`DeviceAuthentication` and `deviceSignature`.** The Wallet/Responder constructs device authentication for the same presentation session:

   ```text
   DeviceAuthenticationBytes = tag24(CBOR([
     "DeviceAuthentication",
     SessionTranscript,
     "org.smarthealthit.checkin.1",
     tag24(CBOR(DeviceNameSpaces))
   ]))
   ```

   In the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response remains the issuer-signed `smart_health_checkin_response` element; it is not moved into `DeviceNameSpaces`. The Wallet/Responder signs the device-authentication payload with the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`.

17. **`DeviceResponse`.** The Wallet/Responder constructs and serializes a CBOR `DeviceResponse` containing the issuer-signed SMART Health Check-in document, issuer authentication, device-signed namespaces, and device authentication. These bytes are the HPKE plaintext.

18. **HPKE seal.** Section 8 defines HPKE response protection for the core flow as:

   ```text
   KEM       = DHKEM(P-256, HKDF-SHA256)
   KDF       = HKDF-SHA256
   AEAD      = AES-128-GCM
   info      = SessionTranscript bytes
   aad       = empty byte string
   plaintext = CBOR(DeviceResponse)
   ```

   The empty AAD is the zero-length byte string. It is not CBOR `null`, an empty text string, or an implementation-defined omitted value.

19. **`dcapiResponse`.** The Wallet/Responder wraps the HPKE output in the direct DC API response value:

   ```text
   dcapiResponse = [
     "dcapi",
     {
       "enc": <HPKE enc bstr>,
       "cipherText": <HPKE ciphertext bstr>
     }
   ]
   ```

   It serializes `dcapiResponse` as CBOR, base64url-encodes those bytes without padding, and returns a Digital Credentials API result equivalent to:

   ```json
   {
     "protocol": "org-iso-mdoc",
     "data": {
       "response": "<base64url-without-padding CBOR dcapiResponse>"
     }
   }
   ```

20. **Verifier opening and extraction.** The Verifier checks the returned protocol, decodes `data.response`, parses `dcapiResponse`, reconstructs the expected `SessionTranscript` from the original exact `encryptionInfoBase64Url` string and origin, and HPKE-opens with `info = SessionTranscript bytes` and empty AAD. It then validates the mdoc response, MSO, digest binding, issuer evidence under policy, and device signature, extracts the SMART response JSON string from the `smart_health_checkin_response` `elementValue`, validates it under §6, and applies §6.6 cross-validation against the original SMART request.

## E.3 Fixture pointers

Appendix D owns authoritative fixture classification, conformance-vector labeling, and the final fixture index. Confirmed active roots that currently contain useful same-device byte-boundary material include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

This appendix intentionally does not fabricate inline byte examples, hashes, signatures, ciphertexts, fixture metadata, or vector classifications.

# Appendix F: CBOR diagnostic notation cheat-sheet

This appendix is an explanatory notation guide for CBOR, COSE, and byte-oriented examples in this specification. It does not override §8, Appendix C CDDL, Appendix D fixtures, RFC 8949 CBOR rules, COSE rules, HPKE rules, or ISO/IEC 18013-5 structures.

## F.1 General conventions

CBOR diagnostic notation is a human-readable rendering of CBOR values. It is not the wire encoding. Byte-level operations use serialized bytes, not diagnostic text.

Common forms used in this specification include:

| Notation | Meaning in examples |
| --- | --- |
| `{ key: value }` | CBOR map. Keys can be text strings, integers, or other CBOR values as allowed by the referenced structure. |
| `[ a, b, c ]` | CBOR array. Array order is part of the value. |
| `"text"` | CBOR text string (`tstr`). When used for SMART request or response JSON text, the text string contains the JSON serialization. |
| `h'0102'` | CBOR byte string (`bstr`) containing bytes `0x01 0x02`. Whitespace in displayed hex is editorial. |
| `true` / `false` | CBOR booleans. In `ItemsRequest.nameSpaces`, the boolean is the mdoc `intentToRetain` flag. |
| `null` | CBOR simple value null. In direct `SessionTranscript`, the first two array entries are `null`. In detached `COSE_Sign1`, the payload field is `null`. |
| `; comment` | Human-readable comment in diagnostic examples. Comments are not part of CBOR, JSON, COSE, CDDL, or HPKE inputs. |
| `<placeholder>` | Non-normative placeholder for a value or bytes supplied by an implementation or fixture. |
| `...` | Omitted material for readability. It is never a literal protocol value. |

Map ordering in diagnostic notation is editorial unless an example is explicitly identified as byte-exact. Appendix C owns CDDL and any deterministic-encoding or conformance-vector encoding rules.

## F.2 Text strings, byte strings, and base64url strings

A CBOR text string (`tstr`) and a CBOR byte string (`bstr`) are different values. For example, `"{}"` is a text string containing two characters, while `h'7b7d'` is a byte string containing two bytes.

In the same-device flow:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"] = <SMART request JSON tstr>
IssuerSignedItem.elementValue = <SMART response JSON tstr>
```

The Digital Credentials API request and result use JSON strings containing base64url-without-padding encodings of CBOR bytes:

```text
data.deviceRequest  = base64url(CBOR(DeviceRequest))
data.encryptionInfo = base64url(CBOR(encryptionInfo))
data.response       = base64url(CBOR(dcapiResponse))
```

The direct `dcapi` transcript is unusual because the exact `data.encryptionInfo` base64url text string is placed in a CBOR text string inside `dcapiInfo` before hashing.

## F.3 CBOR tag 24

CBOR tag 24 denotes an encoded CBOR data item. This specification commonly writes tag 24 in either construction-oriented or byte-oriented form:

```text
tag24(CBOR(ItemsRequest))
24(h'...encoded CBOR bytes...')
```

Both forms mean that the tagged value contains a byte string holding a complete encoded CBOR data item. A diagnostic renderer may decode the enclosed bytes for humans, but §8 byte operations use the tag-24 boundary where specified.

Common same-device tag-24 boundaries include:

```text
DocRequest.itemsRequest = tag24(CBOR(ItemsRequest))
ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))
issuerSigned.nameSpaces["org.smarthealthit.checkin"][i] = tag24(CBOR(IssuerSignedItem))
issuerAuth payload = tag24(CBOR(MSO))
DeviceAuthenticationBytes = tag24(CBOR(["DeviceAuthentication", SessionTranscript, docType, tag24(CBOR(DeviceNameSpaces))]))
deviceSigned.nameSpaces = tag24(CBOR(DeviceNameSpaces))
```

Examples are logical or diagnostic unless explicitly identified as byte-exact. Appendix C owns accepted CDDL and Appendix E/D own byte ladders and fixtures.

## F.4 `COSE_Sign1` notation

`COSE_Sign1` is the COSE single-signer signature structure. Diagnostic examples often render it as a four-element array with explanatory labels:

```text
COSE_Sign1 = [
  protected:   <protected header bstr>,
  unprotected: <unprotected header map>,
  payload:     <payload bstr or null>,
  signature:   <signature bstr>
]
```

The labels `protected:`, `unprotected:`, `payload:`, and `signature:` are not CBOR map keys. The protected header is a byte string containing a CBOR map; diagnostic notation may decode that map for readability. For ES256 examples in this profile, the protected header map includes COSE algorithm label `1` with value `-7`:

```text
protected = bstr .cbor { 1: -7 }
```

For detached `readerAuth`, the serialized `COSE_Sign1` payload field is `null`. The signed COSE `Signature1` structure uses empty external AAD and `ReaderAuthenticationBytes` as the detached payload. `issuerAuth` and `deviceSignature` are also `COSE_Sign1` values in the core flow, but their payload and verification context are defined by §8 and Appendix C.

## F.5 COSE_Key EC2 P-256 labels

The HPKE recipient public key and mdoc device public key examples use COSE_Key EC2 P-256 labels:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: h'...',   ; x-coordinate bstr
  -3: h'...'    ; y-coordinate bstr
}
```

The integer labels are COSE labels, not JSON property names. The coordinate values are byte strings. Diagnostic notation does not imply JWK encoding, compressed-point encoding, or textual hex in the actual CBOR value.

## F.6 Header label 33 (`x5chain`)

COSE header label `33` is used for `x5chain` certificate evidence. In this profile, when `readerAuth` is present, §8 requires it to carry reader certificate evidence under label `33` with at least the leaf reader certificate. Diagnostic examples may show the header in protected or unprotected form; the value is commonly rendered as an array of DER certificate byte strings:

```text
unprotected: { 33: [h'...reader certificate DER...'] }
```

Certificate bytes are evidence for policy evaluation. Their presence is not the same as trusted reader authentication; §7 and §8 distinguish absent, malformed, cryptographically failed, cryptographically valid but untrusted, and trusted reader-authentication states.

## F.7 JSON placeholders and non-literal examples

Some examples use `JSON.stringify(SmartHealthCheckinRequest)` or `JSON.stringify(SmartHealthCheckinResponse)` as shorthand for “the exact UTF-8 JSON text selected by the implementation or fixture.” This is explanatory shorthand, not a JavaScript API requirement and not a canonical JSON rule.

Angle-bracketed values such as `<SMART request JSON text>`, `<nonce bstr>`, `<HPKE enc bstr>`, `<P-256 x-coordinate bstr>`, and `<COSE_Sign1>` are placeholders unless a fixture explicitly replaces them with concrete bytes. Literal JSON examples do not contain comments or ellipses. Complete fixtures replace placeholders with actual values and identify which files are byte-exact under Appendix D.

# Appendix G: ISO/IEC 18013-5 and Digital Credentials API compatibility notes

This appendix explains how SMART Health Check-in 1.0 profiles ISO/IEC 18013-5-style mdoc structures and the W3C Digital Credentials API direct `org-iso-mdoc` path for the same-device SMART clinical exchange. It is compatibility guidance. Section 8 remains the source for version 1.0 same-device behavior.

## G.1 Reused mdoc and Digital Credentials API structures

The profile reuses mdoc presentation concepts rather than defining a new presentation token format. In particular, the same-device flow uses:

- a Digital Credentials API request with protocol `org-iso-mdoc`;
- `data.deviceRequest` as base64url-without-padding CBOR `DeviceRequest` bytes;
- `data.encryptionInfo` as base64url-without-padding CBOR direct `dcapi` encryption information;
- `DeviceRequest.version` `"1.0"` and `docRequests[]`;
- tag-24 `DocRequest.itemsRequest` containing an `ItemsRequest`;
- optional per-`DocRequest.readerAuth` as detached `COSE_Sign1` over `ReaderAuthenticationBytes`;
- an encrypted `DeviceResponse` containing issuer-signed namespaces, an MSO signed as `issuerAuth`, device-signed namespaces, and `deviceSignature`;
- MSO value digests over tag-24 issuer-signed item bytes;
- device authentication bound to the direct `dcapi` `SessionTranscript`; and
- HPKE response protection using the recipient public key from `encryptionInfo`.

The Wallet/Responder returns a Digital Credentials API result with protocol `org-iso-mdoc` and `data.response` containing base64url-without-padding CBOR `dcapiResponse` bytes.

## G.2 SMART-specific document type, namespace, element, and carriers

SMART Health Check-in constrains the mdoc content to one document type, one namespace, one stable response element, and one request-info key:

| Purpose | Value |
| --- | --- |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| requested/disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| SMART response carrier | `IssuerSignedItem.elementValue` for `smart_health_checkin_response` |

The SMART request is a CBOR text string containing the §5 SMART request JSON serialization. The SMART response is a CBOR text string containing the §6 SMART response JSON serialization. The profile does not encode request items, FHIR profiles, questionnaires, Artifacts, fulfillment links, or item statuses as separate generic mdoc or mDL data elements in the core flow. Those clinical semantics remain inside the SMART request and SMART response JSON models.

## G.3 DeviceRequest version and reader authentication

Core SMART Health Check-in 1.0 uses `DeviceRequest.version` `"1.0"`. When reader authentication is present, it is per `DocRequest.readerAuth` and is computed over:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The core profile does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as its reader-authentication mechanism. A future version or deployment profile could define additional compatibility behavior, but that would not change the §8 core v1 byte ladder.

`readerAuth` is optional in core v1 unless a deployment profile requires it. When present, it is detached `COSE_Sign1` with ES256 (`alg` `-7`), a `null` serialized payload, empty external AAD for the COSE `Signature1` structure, and `x5chain` certificate evidence under COSE header label `33` with at least the leaf reader certificate. Trust anchors, certificate path validation, revocation, assurance labels, and required-use policy are deployment-profile or trust-framework decisions.

## G.4 Direct `dcapi` handover and origin binding

The profile uses the direct Digital Credentials API handover/session transcript defined in §8:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The `encryptionInfoBase64Url` input is the exact unpadded base64url string from the DC API request. The `origin` input is the authenticated origin, or deployment-approved privileged-caller origin-equivalent, supplied by the Browser / User Agent or platform. It is not copied from the SMART request body.

The resulting `SessionTranscript` binds the presentation to the caller context and to the HPKE recipient information conveyed in `encryptionInfo`. The same bytes are used for optional reader authentication, mdoc device authentication, and HPKE response sealing/opening.

## G.5 IssuerAuth, MSO value digest, deviceSignature, and HPKE roles

The reused evidence and protection layers have distinct roles:

1. **MSO value digest and `issuerAuth`.** The SMART response JSON is the `elementValue` of an issuer-signed item. The MSO value digest covers the complete tag-24 `IssuerSignedItem` bytes. `issuerAuth` signs the MSO and supplies issuer evidence for the mdoc container.
2. **Device authentication and `deviceSignature`.** The device signature proves possession of the device private key corresponding to `MSO.deviceKeyInfo.deviceKey` and binds the presentation to the expected `SessionTranscript`, `docType`, and device namespaces.
3. **HPKE transport protection.** HPKE encrypts the CBOR `DeviceResponse` to the Verifier's recipient public key from `encryptionInfo` using DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD.
4. **SMART response validation.** After extraction, the Verifier validates the SMART response under §6 and applies §6.6 cross-validation against the original SMART request.

These roles are complementary, not interchangeable. HPKE opening does not validate the mdoc signatures or SMART response shape. A valid mdoc presentation does not by itself prove patient matching, legal authority, EHR write-back authorization, downstream clinical acceptance, or clinical-source provenance for unsigned raw FHIR JSON.

## G.6 What this profile does not define

SMART Health Check-in 1.0 is not a generic mDL profile and does not define generic mDL data elements such as family name, given name, birth date, portrait, driving privileges, age-over claims, resident address, issuing authority, or document number. It does not define a general-purpose mdoc clinical credential model, generic FHIR-resource mdoc elements, generic reader certificate PKI, universal issuer registry, or universal browser allow-list policy.

The profile also does not define clinical-source provenance beyond §7. Raw FHIR JSON Artifacts remain patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof.

## G.7 Relationship to kiosk and later appendices

The cross-device kiosk flow re-enters the same-device §8 flow on the phone with an embedded SMART request. Appendix G does not define kiosk wrapper mechanics such as pointer URLs, kiosk request signatures, request-envelope encryption, submission encryption, relay behavior, expiration, or Completion display processing; those belong to §9 and its dependent appendix work.

Appendix C owns precise CDDL and any ISO compatibility refinements needed to remove ambiguity from labels, tag-24 boundaries, duplicate handling, and encoding constraints. Appendix D owns fixture classification and the final vector index. Appendix G records compatibility intent and profile constraints so those appendices align with §8 without creating alternate encodings or semantics.
