# T3.C attempt 01 — Same-device support appendices

## Appendix E. SessionTranscript and same-device byte ladder

This appendix is explanatory support for the normative same-device flow in §8. It is intended to help implementers, fixture authors, and reviewers reproduce the same bytes on both sides of the direct `org-iso-mdoc` W3C Digital Credentials API flow. If any statement here appears to conflict with §8, §8 controls. Appendix C owns exact CDDL, and Appendix D owns authoritative fixture classification.

The most important implementation rule is to keep logical values, serialized bytes, CBOR tag-24 byte strings, and base64url text distinct. Several later cryptographic operations use the exact serialized bytes from earlier steps. Re-decoding and re-encoding a logically equivalent value can change the byte string and therefore change the `readerAuth`, `SessionTranscript`, issuer value digest, device signature, or HPKE context.

### E.1 End-to-end ladder overview

The same-device flow uses the following ordered transformations.

1. **SMART request JSON**: the Requester/Verifier starts with a `SmartHealthCheckinRequest` object that conforms to §5 and serializes it as UTF-8 JSON text. The SMART request is clinical content, not an origin credential and not reader identity metadata.
2. **`ItemsRequest` logical value**: the Verifier places that JSON text as a CBOR text string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, requests `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`, and sets the element's `intentToRetain` value as described in §8.2.
3. **`ItemsRequest` CBOR and tag 24**: the Verifier CBOR-encodes the `ItemsRequest` logical value, then wraps the resulting encoded bytes in CBOR tag 24. The resulting tagged data item is `ItemsRequestBytes` in §8. The tag-24 boundary includes the tag and the embedded encoded CBOR byte string; those exact bytes are used when `readerAuth` is present.
4. **`DeviceRequest` logical value and bytes**: the Verifier constructs `DeviceRequest` with `version` exactly `"1.0"`, one or more `docRequests`, and the SMART Health Check-in `DocRequest.itemsRequest` set to the tag-24 `ItemsRequestBytes`. Optional reader authentication is per `DocRequest.readerAuth`; version 1.0 does not use `readerAuthAll` as the core mechanism. The Verifier CBOR-encodes this `DeviceRequest`.
5. **`encryptionInfo` logical value and bytes**: the Verifier constructs `encryptionInfo = ["dcapi", {"nonce": <fresh unpredictable bytes>, "recipientPublicKey": <P-256 COSE_Key>}]` and CBOR-encodes it. The recipient public key is an EC2 P-256 COSE_Key with labels `1`, `-1`, `-2`, and `-3` as described in §8.2.5.
6. **Base64url request fields**: the Verifier base64url-encodes the CBOR `DeviceRequest` bytes and the CBOR `encryptionInfo` bytes without padding for the Digital Credentials API request. The exact unpadded `encryptionInfo` string, not merely equivalent decoded bytes, is an input to the `SessionTranscript` construction.
7. **`dcapiInfo`**: both sides compute `dcapiInfo = CBOR([encryptionInfoBase64Url, origin])`, where `encryptionInfoBase64Url` is the exact unpadded string from the request and `origin` is the authenticated web origin or deployment-defined privileged-caller origin-equivalent supplied by the Browser / User Agent or platform.
8. **`handover`**: both sides compute `handover = ["dcapi", SHA-256(dcapiInfo)]`. The SHA-256 input is the bytes of `dcapiInfo`, not a diagnostic rendering and not decoded `encryptionInfo` bytes alone.
9. **`SessionTranscript`**: both sides compute `SessionTranscript = CBOR([null, null, handover])`. These exact bytes are reused for optional `readerAuth` verification, `DeviceAuthentication`, HPKE `info`, and verifier-side checks.
10. **Optional `ReaderAuthentication`**: when `readerAuth` is present, the Verifier constructs `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))` and signs it with a detached `COSE_Sign1` using ES256 (`alg` `-7`), empty external AAD, payload `null`, and certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate. The Wallet verifies the signature against the exact same `SessionTranscript` and exact tag-24 `ItemsRequestBytes`.
11. **SMART response JSON**: after Holder review and Wallet policy, the Wallet/Responder constructs a `SmartHealthCheckinResponse` under §6. Its `requestId` exactly equals the accepted SMART request `id`. Trust and clinical-source provenance remain governed by §§7-8 and by the Artifact payloads.
12. **`IssuerSignedItem` and tag 24**: the Wallet serializes the SMART response as UTF-8 JSON text and places that text as `IssuerSignedItem.elementValue` for `elementIdentifier` `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. The Wallet CBOR-encodes the `IssuerSignedItem` and wraps the encoded bytes in tag 24.
13. **MSO value digest**: the Wallet computes the MSO value digest over the complete tag-24-wrapped `IssuerSignedItem` bytes. The `IssuerSignedItem.digestID` and `MSO.valueDigests["org.smarthealthit.checkin"]` entry identify the same digest. A verifier recomputes the digest over the disclosed tag-24 item bytes.
14. **`issuerAuth`**: the Wallet constructs the Mobile Security Object for `docType` `org.smarthealthit.checkin.1`, signs the tag-24 MSO bytes as `issuerAuth` using ES256 `COSE_Sign1`, and supplies issuer evidence for the mdoc layer. Deployment policy determines whether the issuer evidence is production-trusted, test, pinned, self-attested, or otherwise acceptable.
15. **`DeviceAuthentication`**: the Wallet constructs `DeviceAuthenticationBytes = tag24(CBOR(["DeviceAuthentication", SessionTranscript, "org.smarthealthit.checkin.1", tag24(CBOR(DeviceNameSpaces))]))`. In the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element remains issuer-signed and is not moved into `DeviceNameSpaces`.
16. **`deviceSignature`**: the Wallet signs the `DeviceAuthentication` payload using the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`. The Verifier validates this signature using the same `SessionTranscript` bytes and the tag-24 `DeviceNameSpaces` bytes present in the response.
17. **`DeviceResponse`**: the Wallet constructs a CBOR `DeviceResponse` with version `"1.0"`, status success for the accepted document, the issuer-signed SMART Health Check-in document, and device-signed authentication evidence.
18. **HPKE seal**: the Wallet encrypts the CBOR `DeviceResponse` plaintext using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and `aad = empty byte string`. The `enc` value is the encapsulated KEM value, and `cipherText` is the AEAD ciphertext including its authentication tag.
19. **`dcapiResponse`**: the Wallet wraps the HPKE output as `dcapiResponse = ["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`, CBOR-encodes it, and returns the Digital Credentials API result with `protocol` `org-iso-mdoc` and `data.response` equal to unpadded base64url of those bytes.
20. **Verifier opening and extraction**: the Verifier decodes `data.response`, verifies the `dcapiResponse` shape, HPKE-opens with the retained recipient private key, the same HPKE suite, `info = SessionTranscript bytes`, and empty AAD, validates the mdoc response, extracts the `smart_health_checkin_response` `elementValue` string, parses it as the SMART response JSON, and applies §6.6 cross-validation against the original SMART request.

### E.2 Bytes versus logical values

A logical value is an abstract CBOR value such as `["dcapi", {"nonce": bstr, "recipientPublicKey": map}]`. A byte string is a particular serialization of that value. This profile uses both:

- the logical shape determines what fields mean;
- the serialized bytes determine hashes, signatures, tag-24 wrappers, HPKE `info`, and fixture comparisons.

CBOR tag 24 is used when an already-encoded CBOR data item is carried as bytes inside another CBOR value. In this profile, the tag-24 boundaries around `ItemsRequest`, `IssuerSignedItem`, MSO, `DeviceNameSpaces`, `ReaderAuthentication`, and `DeviceAuthentication` are security-relevant where §8 says the tagged bytes are hashed or signed. A fixture that stores both decoded diagnostic notation and `.cbor` bytes should make clear which file contains the digest or signature input.

Base64url fields in the Digital Credentials API request and response use base64url without padding. The request's `encryptionInfo` base64url string is part of the `SessionTranscript` input as text. A Verifier and Wallet that decode the bytes and then re-encode them with different padding, different line wrapping, or another equivalent spelling will not compute the same `SessionTranscript`.

### E.3 Origin binding

The `origin` in `dcapiInfo = CBOR([encryptionInfoBase64Url, origin])` is presentation-transport evidence supplied by the Browser / User Agent or platform, or a deployment-defined privileged-caller origin-equivalent. It is not copied from the SMART request body. `purpose`, request item `title`, request item `summary`, selector URLs, callback-looking strings, kiosk metadata, and Artifact payloads are not origin inputs.

This origin binding makes the same `encryptionInfo` bytes produce different `SessionTranscript` bytes when invoked from a different authenticated origin. It also binds optional `readerAuth`, device authentication, and HPKE opening to the same caller context when those checks are performed under §8.

### E.4 HPKE context

For the core same-device flow, HPKE uses:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

The `info` value is the exact serialized `SessionTranscript` bytes. It is not the diagnostic text, not the SHA-256 hash alone, and not the `dcapiInfo` bytes. The `aad` value is the empty byte string, not CBOR `null`, not an empty CBOR byte string data item, and not omitted in a way that changes the HPKE API's authenticated-data input.

### E.5 Active fixture pointers

The following checked-in roots exist and are useful for Appendix D classification and Appendix E byte-ladder examples:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

Some of these directories include files such as `encryption-info.b64u`, `session-transcript.cbor`, `items-request-tag24.cbor`, `reader-auth.cbor`, `issuer-signed-item-tag24.cbor`, `device-authentication.cbor`, `device-response.cbor`, and `dcapi-response.cbor`. This appendix does not classify them as conformance vectors or historical captures; Appendix D owns that classification.

## Appendix F. CBOR diagnostic notation cheat-sheet

This appendix is informative. It explains notation used in examples and diagnostic dumps in this specification. It does not override the normative prose in §8 or the CDDL in Appendix C.

### F.1 General conventions

CBOR diagnostic notation is a human-readable presentation of CBOR values. It is not the wire encoding. Implementations sign, hash, encrypt, compare, and base64url-encode bytes, not diagnostic text.

Common forms used in this specification are:

- **Arrays** use square brackets: `["dcapi", h'0102']`.
- **Maps** use braces with key-value pairs: `{ "nonce": h'...', "recipientPublicKey": {1: 2} }`. CBOR map keys can be text strings, integers, or other CBOR values. Examples may order map entries for readability even when the wire encoding's order is not semantically meaningful.
- **Text strings (`tstr`)** appear in double quotes, for example `"org-iso-mdoc"` or `"smart_health_checkin_response"`. The displayed string denotes a CBOR text string, not a JSON string unless the surrounding field says the text string contains JSON text.
- **Byte strings (`bstr`)** appear as `h'...'` for hexadecimal bytes, for example `h'001122'`. Long byte strings may be abbreviated in explanatory examples only when explicitly non-normative.
- **Tag 24** appears as `24(h'...')`, `tag24(CBOR(...))`, or `Tag(24, cbor(...))` depending on the example style. All mean CBOR tag 24 around a byte string that contains an encoded CBOR data item. The tag and the embedded bytes are part of the tagged data item.
- **`null`** denotes the CBOR simple value null. In `COSE_Sign1` with a detached payload, the payload field is CBOR `null`; the signed detached payload bytes are supplied separately in the COSE `Sig_structure`.
- **Comments** in examples use `;` in CBOR diagnostic blocks. Comments are explanatory and are not part of the value.
- **Placeholders** such as `<x-coordinate bstr>`, `<HPKE ciphertext bstr>`, or `h'...'` in an example are non-normative placeholders unless the example is explicitly identified as a fixture value. A complete conformance fixture must provide actual bytes.

### F.2 COSE notation used by this profile

`COSE_Sign1` refers to the single-signer COSE signature structure from COSE. Diagnostic examples often show it as a four-element array:

```text
COSE_Sign1 = [
  protected:   bstr .cbor { 1: -7 },
  unprotected: { 33: [<certificate DER bstr>] },
  payload:     null,
  signature:   <signature bstr>
]
```

The protected header is itself a byte string containing a CBOR-encoded protected-header map. Header label `1` is `alg`; value `-7` identifies ES256. The unprotected header is a CBOR map carried directly. Header label `33` is `x5chain`; in this profile, `readerAuth` carries at least the leaf reader certificate there when present, and `issuerAuth` may also carry certificate evidence according to the mdoc and deployment profile. Certificate-chain trust policy is not defined by diagnostic notation.

When the payload field is `null`, the signature is detached. For `readerAuth`, the detached payload is the exact `ReaderAuthenticationBytes` from §8.2.4. For device authentication and issuer authentication, §8 and Appendix C define the corresponding payload bytes.

### F.3 COSE_Key notation for EC2 P-256

The recipient HPKE public key and mdoc device public key examples use COSE_Key labels. A P-256 EC2 public key is shown as:

```text
{
   1: 2,                 ; kty = EC2
  -1: 1,                 ; crv = P-256
  -2: <x-coordinate bstr>,
  -3: <y-coordinate bstr>
}
```

The labels are integer CBOR map keys. The `x` and `y` coordinates are byte strings. Diagnostic examples do not imply a JSON Web Key representation or a textual coordinate encoding unless a separate example explicitly says so.

### F.4 SMART JSON inside CBOR

The SMART request and SMART response remain JSON objects at the clinical layer. In the same-device mdoc flow they are carried as CBOR text strings containing UTF-8 JSON text:

- request: `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
- response: `IssuerSignedItem.elementValue` for `smart_health_checkin_response`.

They are not converted into CBOR maps by the mdoc flow. This specification does not define a canonical JSON serialization for the clinical objects, so byte fixtures must preserve the exact JSON text used in the captured or generated request or response.

### F.5 Relationship to CDDL and examples

Appendix C CDDL is expected to define the grammar for accepted CBOR shapes. Diagnostic snippets in prose are explanatory sketches. If an example omits fields, uses ellipses, or uses placeholder labels, it is not a complete wire value. If diagnostic notation and Appendix C disagree, the disagreement should be treated as an editorial/specification defect; implementations should follow the normative prose and final CDDL.

## Appendix G. Compatibility notes for ISO/IEC 18013-5 §9 and W3C Digital Credentials API

This appendix explains how SMART Health Check-in 1.0 uses mdoc-style request and response structures with the W3C Digital Credentials API direct `org-iso-mdoc` path. It is compatibility guidance. Section 8 remains the canonical definition of version 1.0 same-device behavior.

### G.1 What this profile reuses

The profile reuses familiar ISO/IEC 18013-5 mdoc presentation structures and concepts:

- a `DeviceRequest` with `version` `"1.0"` and per-document `DocRequest` entries;
- an `ItemsRequest` that identifies a `docType`, requested namespaces/elements, `intentToRetain`, and optional `requestInfo`;
- optional per-`DocRequest.readerAuth` as a detached `COSE_Sign1` over ISO-style `ReaderAuthentication` bytes;
- an mdoc `DeviceResponse` containing issuer-signed items, an MSO, `issuerAuth`, device authentication, and device-key proof;
- value digest validation over tag-24 issuer-signed item bytes;
- COSE signatures using ES256 in the core profile; and
- HPKE-protected direct response delivery for the Digital Credentials API flow.

The profile constrains those structures to carry one SMART-specific response element rather than a generic mDL attribute set. The requested and disclosed element is `smart_health_checkin_response` in namespace `org.smarthealthit.checkin` under `docType` `org.smarthealthit.checkin.1`.

### G.2 SMART-specific request and response carriage

The SMART request is carried only in:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

The value is a CBOR text string containing the UTF-8 JSON serialization of the §5 SMART request. The profile does not use dynamic mdoc element names, mDL fields, kiosk wrapper fields, or Digital Credentials API wrapper metadata as alternate SMART request carriers.

The SMART response is carried as:

```text
IssuerSignedItem.elementValue
```

for the issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`. The value is a CBOR text string containing the UTF-8 JSON serialization of the §6 SMART response. The profile does not carry the SMART response in `requestInfo`, `DeviceNameSpaces`, an unprotected transport field, or a generic mDL attribute.

### G.3 `DeviceRequest` version and reader authentication

Version 1.0 of this SMART Health Check-in profile uses `DeviceRequest.version == "1.0"`. When reader authentication is present, it is per `DocRequest.readerAuth` and is computed over `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))` as defined in §8.

The core profile does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as its reader-authentication mechanism. A future version or deployment profile could define another variant, but Appendix G does not create that alternate behavior.

Reader authentication is optional in the core v1 flow unless a deployment profile requires it. When present, it proves only the reader-authentication properties that the Wallet verifies and trusts under §7 and deployment policy. It does not prove clinical-source provenance, patient identity, or downstream authorization.

### G.4 Direct Digital Credentials API handover and SessionTranscript

The W3C Digital Credentials API request uses protocol `org-iso-mdoc` and supplies base64url-without-padding CBOR fields under `data.deviceRequest` and `data.encryptionInfo`. This profile's direct handover uses:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

This is the same `SessionTranscript` input used for optional `readerAuth`, device authentication, and HPKE response encryption/opening. The first two entries are `null` for this direct `dcapi` construction. The handover element carries the string `"dcapi"` and the SHA-256 digest of the encoded `[encryptionInfoBase64Url, origin]` pair.

The `origin` comes from the Browser / User Agent or platform origin/privileged-caller mechanism. It is not a SMART request field. A Wallet that lacks authenticated origin evidence treats origin trust as absent under §7 and §8 rather than substituting self-asserted clinical request text.

### G.5 IssuerAuth, deviceSignature, and HPKE roles

These mechanisms protect different layers and should not be collapsed:

- **`issuerAuth` and the MSO** authenticate and integrity-protect the mdoc issuer-signed namespace data, including the digest for the disclosed `smart_health_checkin_response` issuer-signed item. Deployment policy determines issuer trust.
- **`deviceSignature`** proves possession of the mdoc device private key bound in the MSO and binds the presentation to the `SessionTranscript`, `docType`, and device namespaces.
- **HPKE** protects the `DeviceResponse` in transit back to the Verifier using the recipient key from `encryptionInfo`, with `info = SessionTranscript bytes` and empty AAD.
- **SMART response validation** checks the clinical JSON object after extraction, including `requestId`, `artifacts[]`, `fulfills[]`, `mediaType`, `requestStatus[]`, and media-type-specific validation under §6.6.

A successful HPKE open does not replace mdoc signature and digest validation. A valid mdoc presentation does not replace SMART response validation. A valid mdoc presentation or HPKE response does not by itself prove that unsigned raw FHIR JSON came from a clinical source.

### G.6 What this profile intentionally does not define

SMART Health Check-in 1.0 does not define generic mDL fields, generic age-over attributes, driving privileges, portrait data, address attributes, or other ISO mDL namespaces. It also does not define a general-purpose mdoc document model for all clinical credentials. It profiles one check-in document type, one namespace, one stable response element, and one requestInfo key to carry the transport-neutral SMART request and SMART response models.

The profile also does not define a generic Digital Credentials API conformance class, browser UI behavior, production browser allow-list policy, production reader certificate authority, universal issuer registry, or downstream EHR ingestion policy. Those are deployment-profile, trust-framework, implementation-guidance, or future-work topics unless another section of this specification makes a narrower requirement.

## Organizer notes

### Strengths

- The draft keeps Appendix E/F/G explanatory and consistently points back to §8 for normative behavior, Appendix C for CDDL, and Appendix D for fixture classification.
- The byte ladder preserves the accepted carriers: SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and SMART response only in `IssuerSignedItem.elementValue` for `smart_health_checkin_response`.
- The draft explicitly separates logical CBOR values, exact serialized bytes, tag-24 boundaries, unpadded base64url strings, origin binding, and HPKE `info`/`aad` inputs.
- Appendix G separates issuer/MSO, device proof, HPKE, readerAuth, origin, and clinical-source trust instead of treating one layer as a substitute for another.

### Caveats

- This attempt avoids inline hex, hashes, and fabricated bytes. Appendix D or T3.D should decide which checked-in fixtures are conformance vectors, diagnostic captures, or historical captures before any worked byte table is embedded in the final spec.
- The exact CDDL labels and any stricter duplicate-handling, nonce-size, or deterministic-encoding requirements are intentionally deferred to Appendix C and conformance closure.
- The draft says `x5chain` label 33 is used for reader certificate evidence, following accepted §8 text, but does not define certificate path validation or production trust anchors.

### Open issues

- Decide whether final Appendix E should include a concrete worked fixture table drawn from `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` and `fixtures/responses/real-chrome-android-smart-checkin/`, or keep Appendix E purely procedural with Appendix D owning all bytes.
- Decide whether core conformance fixes a nonce length such as 32 bytes or preserves §8's current minimum-entropy guidance with fixture-specific 32-byte examples.
- Confirm final Appendix C terminology for tag-24 values so Appendix F can use one notation consistently (`tag24(CBOR(...))`, `24(h'...')`, or both).

### Downstream dependencies

- T3.D should align CDDL and fixture/vector material with the tag-24 boundaries and exact request/response carriers described here.
- Appendix A should not add new conformance requirements from these explanatory appendices except where they restate §8 requirements.
- §§11-12 should reuse the trust-layer separation here when discussing replay, origin spoofing, reader impersonation, HPKE key reuse, debug bundles, and raw-FHIR provenance.
