# T3.C attempt 04 — Same-device support appendices

## Appendix E. SessionTranscript and same-device byte ladder

This appendix is explanatory support for the same-device presentation flow in §8. It is intended to help implementers, test authors, and fixture authors identify the exact byte boundaries that matter for direct `org-iso-mdoc` over the W3C Digital Credentials API. If any statement here appears to conflict with §8, §8 controls. Appendix C owns exact CDDL, and Appendix D owns authoritative fixture classification.

The most important rule is that the profile moves between logical values and encoded bytes several times. Some hashes and signatures cover a logical value after a specific CBOR encoding; others cover a CBOR tag-24 wrapper whose byte string contains an already encoded CBOR value; HPKE uses the serialized `SessionTranscript` bytes as `info`; Digital Credentials API request and response fields carry unpadded base64url text strings. Re-encoding an equivalent logical value can change the bytes and therefore change signatures, digests, HPKE context, or fixture results.

### E.1 Conventions for this ladder

In this appendix:

- `CBOR(x)` means the exact CBOR serialization of logical value `x` used at that step.
- `tag24(CBOR(x))` means CBOR tag 24 whose content is a byte string containing `CBOR(x)`. The tag and the byte string are part of the outer bytes.
- `base64url(bytes)` means base64url without padding (`=` characters omitted).
- `SHA-256(bytes)` means the 32-byte digest of exactly those bytes.
- `JSON.stringify(...)` is shorthand for the exact UTF-8 JSON text selected by the implementation or fixture. The core profile does not define canonical JSON serialization for the SMART request or SMART response.
- Field names and carriers are those defined by §8: no alternate request carrier, response carrier, or element-name encoding is introduced here.

At a glance, the same-device byte ladder is:

```text
SMART request JSON
  -> ItemsRequest CBOR and tag24(ItemsRequest)
  -> DeviceRequest CBOR
  -> encryptionInfo CBOR
  -> encryptionInfoBase64Url
  -> dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
  -> handover = ["dcapi", SHA-256(dcapiInfo)]
  -> SessionTranscript = CBOR([null, null, handover])
  -> optional ReaderAuthenticationBytes and per-DocRequest readerAuth
  -> SMART response JSON
  -> IssuerSignedItem CBOR and tag24(IssuerSignedItem)
  -> MSO value digest over tag24(IssuerSignedItem)
  -> issuerAuth over tag24(MSO)
  -> DeviceAuthenticationBytes
  -> deviceSignature
  -> DeviceResponse CBOR
  -> HPKE seal with info = SessionTranscript bytes and aad = empty bstr
  -> dcapiResponse CBOR
```

### E.2 Request-side ladder

The request-side ladder starts with a transport-neutral SMART request object that is valid under §5. The same clinical object can be serialized in more than one JSON byte sequence; fixtures therefore need to preserve the exact JSON text used for the capture.

1. **SMART request JSON text**

   The Verifier serializes the SMART request object as UTF-8 JSON text. This value is a JSON text string at the application layer and becomes a CBOR text string when embedded in `ItemsRequest.requestInfo`.

   ```text
   smartRequestJson = JSON.stringify(SmartHealthCheckinRequest)
   ```

   The SMART request is carried only in:

   ```text
   ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
   ```

   It is not carried in dynamic mdoc element names, `DeviceRequest` metadata, `dcapiInfo`, `encryptionInfo`, a kiosk wrapper field, or a separate Digital Credentials API request field.

2. **`ItemsRequest` logical value**

   The Verifier constructs the logical `ItemsRequest` value for `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and requested element `smart_health_checkin_response`.

   ```text
   ItemsRequest = {
     "docType": "org.smarthealthit.checkin.1",
     "nameSpaces": {
       "org.smarthealthit.checkin": {
         "smart_health_checkin_response": true
       }
     },
     "requestInfo": {
       "org.smarthealthit.checkin.request": smartRequestJson
     }
   }
   ```

   The `true` value is the mdoc `intentToRetain` value for the requested response element. It is not Holder consent and does not change §12 retention or privacy rules.

3. **`ItemsRequest` CBOR and tag 24**

   The Verifier CBOR-encodes the logical `ItemsRequest` and wraps the resulting bytes in CBOR tag 24.

   ```text
   ItemsRequestCbor      = CBOR(ItemsRequest)
   ItemsRequestBytes     = tag24(ItemsRequestCbor)
   ```

   `ItemsRequestBytes` includes the tag-24 wrapper. These exact bytes are used as `DocRequest.itemsRequest` and, when `readerAuth` is present, inside `ReaderAuthenticationBytes`. A parser can decode the tag to recover the logical `ItemsRequest`, but a signature verifier must preserve or reconstruct the exact tag-24 byte sequence being signed.

4. **Optional per-`DocRequest.readerAuth` input**

   Core version 1.0 uses `DeviceRequest.version == "1.0"` and optional per-`DocRequest.readerAuth`. It does not use `readerAuthAll` as the core v1 mechanism.

   When present, `readerAuth` is a detached `COSE_Sign1` using ES256 over `ReaderAuthenticationBytes`:

   ```text
   ReaderAuthenticationBytes = tag24(CBOR([
     "ReaderAuthentication",
     SessionTranscript,
     ItemsRequestBytes
   ]))
   ```

   This step depends on the `SessionTranscript`, so it can only be finalized after the Verifier has constructed `encryptionInfo`, base64url-encoded it, and established the origin string used for the request. The COSE payload field is `null`; the detached payload is the tag-24 `ReaderAuthenticationBytes`. The protected header includes algorithm `-7`, and the COSE headers carry `x5chain` certificate evidence at label `33` with at least the leaf certificate for the core profile. Deployment policy decides whether the certificate evidence is trusted.

5. **`DeviceRequest` logical value and CBOR bytes**

   The Verifier embeds the tag-24 `ItemsRequestBytes` in the `DocRequest` and includes optional `readerAuth` in that same `DocRequest`.

   ```text
   DeviceRequest = {
     "version": "1.0",
     "docRequests": [
       {
         "itemsRequest": ItemsRequestBytes,
         "readerAuth": COSE_Sign1 / optional
       }
     ]
   }

   DeviceRequestBytes = CBOR(DeviceRequest)
   deviceRequestBase64Url = base64url(DeviceRequestBytes)
   ```

   The Digital Credentials API `data.deviceRequest` field carries `deviceRequestBase64Url` as text. Base64url padding is omitted.

6. **`encryptionInfo` logical value, CBOR bytes, and base64url text**

   The Verifier constructs direct `dcapi` `encryptionInfo` with a fresh unpredictable nonce and a P-256 recipient public key represented as a COSE_Key.

   ```text
   encryptionInfo = [
     "dcapi",
     {
       "nonce": <fresh unpredictable bstr>,
       "recipientPublicKey": {
          1: 2,        ; kty = EC2
         -1: 1,        ; crv = P-256
         -2: <x-coordinate bstr>,
         -3: <y-coordinate bstr>
       }
     }
   ]

   encryptionInfoBytes = CBOR(encryptionInfo)
   encryptionInfoBase64Url = base64url(encryptionInfoBytes)
   ```

   Section 8 requires fresh unpredictable nonce bytes and recommends at least 16 bytes of entropy; active version 1.0 fixtures use 32 bytes. This appendix does not tighten that rule.

7. **Digital Credentials API request object**

   The Verifier passes both unpadded base64url strings to the Digital Credentials API under protocol `org-iso-mdoc`.

   ```text
   navigator.credentials.get(... digital.requests[i] ...) carries:

   protocol: "org-iso-mdoc"
   data.deviceRequest:  deviceRequestBase64Url
   data.encryptionInfo: encryptionInfoBase64Url
   ```

   The exact `encryptionInfoBase64Url` string, not merely equivalent decoded bytes, is an input to the `SessionTranscript` construction below.

### E.3 Direct `dcapi` `SessionTranscript` construction

The direct same-device flow uses the §8.3 `SessionTranscript` construction:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The `origin` value is the authenticated Browser / User Agent origin or deployment-defined privileged-caller origin-equivalent value supplied by the platform for the presentation invocation. It is not taken from the SMART request body, `purpose`, item display text, request ids, selector URLs, kiosk metadata, or returned Artifacts.

The `SessionTranscript` item used inside `ReaderAuthenticationBytes` and `DeviceAuthentication` is the logical decoded CBOR value `[null, null, handover]` encoded as part of those structures. The HPKE `info` parameter is the exact serialized `SessionTranscript` bytes:

```text
hpkeInfo = SessionTranscriptBytes = CBOR([null, null, handover])
```

The Wallet/Responder uses the same `SessionTranscript` bytes for reader-auth verification, device authentication, and HPKE response sealing. The Verifier uses the same bytes for reader-auth construction, HPKE response opening, and device-signature verification.

### E.4 Response-side ladder

The response-side ladder starts after the Wallet/Responder has validated the request wrapper, parsed the SMART request under §5, processed origin and optional reader-auth evidence under §§7-8, and run Holder review or equivalent Holder-control processing.

1. **SMART response JSON text**

   The Wallet/Responder constructs a SMART response object under §6. Its `requestId` equals the accepted SMART request `id`, but that equality is a clinical correlation check rather than a freshness proof, patient identity proof, requester identity proof, or clinical-source proof.

   ```text
   smartResponseJson = JSON.stringify(SmartHealthCheckinResponse)
   ```

2. **`IssuerSignedItem` logical value and tag 24**

   The SMART response is carried as the `elementValue` of the issuer-signed mdoc item for the stable element.

   ```text
   IssuerSignedItem = {
     "digestID": <integer digest id>,
     "random": <random bstr>,
     "elementIdentifier": "smart_health_checkin_response",
     "elementValue": smartResponseJson
   }

   IssuerSignedItemCbor       = CBOR(IssuerSignedItem)
   IssuerSignedItemTag24Bytes = tag24(IssuerSignedItemCbor)
   ```

   The `elementValue` is a CBOR text string containing the SMART response JSON text. It is not a CBOR map representation of the SMART response. The SMART response is not carried in `requestInfo`, `DeviceNameSpaces`, `dcapiResponse` metadata, or a plaintext Digital Credentials API response field.

3. **MSO value digest input**

   The MSO value digest is computed over the complete tag-24-wrapped `IssuerSignedItem` bytes:

   ```text
   valueDigest = SHA-256(IssuerSignedItemTag24Bytes)
   ```

   The `IssuerSignedItem.digestID` value identifies the corresponding entry in:

   ```text
   MSO.valueDigests["org.smarthealthit.checkin"][digestID]
   ```

   The active Android response builder uses digest id `0` for its single disclosed item, but the important protocol condition is consistency between the item `digestID` and the MSO value-digest map.

4. **MSO and `issuerAuth`**

   The Wallet/Responder constructs an MSO for `docType` `org.smarthealthit.checkin.1`, digest algorithm `SHA-256`, value digests covering the disclosed SMART response item, validity information, and `deviceKeyInfo.deviceKey` for the device authentication key.

   ```text
   MSOBytes      = CBOR(MSO)
   MSOTag24Bytes = tag24(MSOBytes)
   issuerAuth    = COSE_Sign1(ES256, payload = MSOTag24Bytes)
   ```

   Production issuer trust, self-attested/demo issuer treatment, trust anchors, registries, revocation, and assurance labels are deployment policy and §7 matters. Regardless of trust label, a Verifier still validates the COSE signature, MSO structure, digest binding, and device proof before accepting the presentation response as protocol-valid.

5. **`DeviceAuthentication` and device signature**

   The Wallet/Responder constructs `DeviceAuthenticationBytes` using the same `SessionTranscript` bytes and the tag-24-wrapped `DeviceNameSpaces` bytes.

   ```text
   DeviceNameSpacesBytes = CBOR(DeviceNameSpaces)

   DeviceAuthenticationBytes = tag24(CBOR([
     "DeviceAuthentication",
     SessionTranscript,
     "org.smarthealthit.checkin.1",
     tag24(DeviceNameSpacesBytes)
   ]))
   ```

   For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element remains issuer-signed; it is not moved into `DeviceNameSpaces` as a substitute carrier.

   The device signature is an ES256 `COSE_Sign1` over the mdoc device-authentication payload, using the private key corresponding to `MSO.deviceKeyInfo.deviceKey`.

6. **`DeviceResponse` plaintext**

   The Wallet/Responder constructs the CBOR `DeviceResponse` plaintext with the issuer-signed SMART response item and device authentication evidence.

   ```text
   DeviceResponse = {
     "version": "1.0",
     "documents": [
       {
         "docType": "org.smarthealthit.checkin.1",
         "issuerSigned": {
           "nameSpaces": {
             "org.smarthealthit.checkin": [IssuerSignedItemTag24Bytes]
           },
           "issuerAuth": issuerAuth
         },
         "deviceSigned": {
           "nameSpaces": tag24(DeviceNameSpacesBytes),
           "deviceAuth": { "deviceSignature": COSE_Sign1 }
         }
       }
     ],
     "status": 0
   }

   DeviceResponseBytes = CBOR(DeviceResponse)
   ```

7. **HPKE sealing**

   The Wallet/Responder encrypts `DeviceResponseBytes` using the recipient public key from `encryptionInfo` and the HPKE suite fixed by §8.

   ```text
   KEM       = DHKEM(P-256, HKDF-SHA256)
   KDF       = HKDF-SHA256
   AEAD      = AES-128-GCM
   info      = SessionTranscriptBytes
   aad       = empty byte string
   plaintext = DeviceResponseBytes
   ```

   The HPKE `enc` output is the encapsulated ephemeral P-256 public key for the KEM. The `cipherText` output is the AEAD ciphertext including its authentication tag. A Verifier opens the response with the retained recipient private key, the expected `SessionTranscriptBytes` as `info`, and empty AAD.

8. **`dcapiResponse` and Digital Credentials API result**

   The Wallet/Responder wraps the HPKE output in the direct DC API response value and base64url-encodes the CBOR bytes without padding.

   ```text
   dcapiResponse = [
     "dcapi",
     {
       "enc": <HPKE enc bstr>,
       "cipherText": <HPKE ciphertext bstr>
     }
   ]

   dcapiResponseBytes = CBOR(dcapiResponse)
   responseBase64Url  = base64url(dcapiResponseBytes)
   ```

   The Digital Credentials API result carries:

   ```json
   {
     "protocol": "org-iso-mdoc",
     "data": {
       "response": "<base64url-without-padding CBOR dcapiResponse>"
     }
   }
   ```

   The Verifier then reverses the response-side ladder: decode `data.response`, parse `dcapiResponse`, HPKE-open with `info = SessionTranscriptBytes` and empty AAD, parse `DeviceResponse`, validate issuer/MSO/value-digest/device evidence, extract `smart_health_checkin_response.elementValue` as SMART response JSON, validate §6, and apply all §6.6 cross-validation rules against the original SMART request.

### E.5 Confirmed fixture roots

This appendix does not define conformance-vector status. Appendix D owns authoritative fixture classification. The following active paths have been verified to exist and can inform Appendix D and future byte-ladder work:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

The real Chrome/Android request and response fixture roots include paired `session-transcript.cbor` material and response artifacts such as `issuer-signed-item-tag24.cbor`, `value-digest.bin`, `device-authentication.cbor`, `device-response.cbor`, `hpke-enc.bin`, `hpke-ciphertext.bin`, and `dcapi-response.cbor`. The synthetic request roots include deterministic request material, including a reader-auth variant. The `pymdoc-minimal` response root includes minimal issuer-signed-item, MSO, value-digest-input, issuer-auth, and document material. Appendix D should decide which are normative conformance vectors, diagnostics, or historical captures.

## Appendix F. CBOR diagnostic notation cheat-sheet

This appendix explains the CBOR diagnostic notation used in examples for this specification. It is informative. It does not override Appendix C CDDL, §8 same-device behavior, RFC 8949 CBOR rules, COSE rules, HPKE rules, or ISO/IEC 18013-5 structures.

### F.1 Basic CBOR values

Examples use a compact diagnostic style:

| Notation | Meaning |
| --- | --- |
| `{ key: value }` | CBOR map. Keys can be text strings, integers, or other CBOR values as allowed by the referenced structure. |
| `[ a, b, c ]` | CBOR array. |
| `"text"` | CBOR text string (`tstr`), encoded as UTF-8. |
| `h'0102'` or `<... bstr ...>` | CBOR byte string (`bstr`). Examples often use placeholders instead of long hex. |
| `true`, `false` | CBOR simple values for booleans. In `ItemsRequest.nameSpaces`, `true` is the mdoc `intentToRetain` flag. |
| `null` | CBOR simple value null. In detached `COSE_Sign1`, `payload: null` means the payload is detached. In `SessionTranscript`, the first two array entries are `null`. |
| `; comment` | Explanatory comment in diagnostic examples. Comments are not part of CBOR bytes. |
| `<placeholder>` | Non-normative placeholder for bytes or values supplied by the implementation or fixture. |

Examples are illustrative unless a fixture or Appendix D vector states that exact bytes are being shown.

### F.2 Tag 24: encoded CBOR data item

CBOR tag 24 wraps a byte string that contains an encoded CBOR data item. This profile uses tag 24 at security-sensitive boundaries inherited from mdoc structures.

Diagnostic examples may write any of the following equivalent explanatory forms:

```text
tag24(CBOR(ItemsRequest))
24(h'...encoded ItemsRequest CBOR...')
Tag(24, h'...encoded CBOR...')
```

The important boundary is that the outer item is a tag-24 value, and the tag content is a byte string containing a complete inner CBOR serialization. For example:

- `DocRequest.itemsRequest` contains tag-24-wrapped `ItemsRequest` bytes.
- `ReaderAuthenticationBytes` are tag-24-wrapped bytes for the `ReaderAuthentication` array.
- `IssuerSignedItem` is tag-24-wrapped before placement in issuer-signed namespaces and before MSO value-digest computation.
- The MSO is tag-24-wrapped as the `issuerAuth` payload in this profile's §8 description.
- `DeviceAuthenticationBytes` are tag-24-wrapped bytes for the `DeviceAuthentication` array.
- `deviceSigned.nameSpaces` carries tag-24-wrapped `DeviceNameSpaces` bytes.

A diagnostic rendering that decodes through tag 24 is useful for humans, but digest and signature checks often need the exact outer tag-24 bytes, not just the decoded logical value.

### F.3 COSE structures

Examples use COSE terminology consistent with COSE_Sign1. A `COSE_Sign1` is a four-element array:

```text
COSE_Sign1 = [
  protected:   bstr .cbor protected-map,
  unprotected: unprotected-map,
  payload:     bstr / null,
  signature:   bstr
]
```

For ES256 in this profile, the protected header map includes algorithm label `1` with value `-7`:

```text
protected = h'...CBOR({1: -7})...'
```

When `readerAuth` is present, its payload field is `null`, meaning the payload is detached. The detached payload is `ReaderAuthenticationBytes`, and the COSE Sig_structure uses empty external AAD. The `readerAuth` COSE headers carry certificate evidence at header label `33` (`x5chain`) with at least the leaf reader certificate for the core profile.

`issuerAuth` is a `COSE_Sign1` over the tag-24-wrapped MSO bytes. `deviceSignature` is a `COSE_Sign1` over the mdoc device-authentication payload. Examples may omit long certificate chains, validity values, or signatures with placeholders when the exact byte value is not the point of the example.

### F.4 COSE_Key notation for EC2 P-256

The HPKE recipient public key and mdoc device keys are represented as COSE_Key values. This profile's examples use EC2 P-256 labels:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: h'...',   ; x-coordinate, 32-byte bstr for P-256
  -3: h'...'    ; y-coordinate, 32-byte bstr for P-256
}
```

The integer labels are COSE labels, not JSON property names. The byte strings are unsigned fixed-width coordinate encodings for P-256. Diagnostic examples can show them as hex byte strings or placeholders.

### F.5 Protected and unprotected headers

COSE protected headers are encoded as a byte string containing a CBOR map. Unprotected headers are a CBOR map directly in the `COSE_Sign1` array. Diagnostic examples often decode the protected byte string for readability, but implementers need to remember which bytes are signed.

For example, a readable rendering of reader authentication can be shown as:

```text
readerAuth = COSE_Sign1[
  protected:   bstr .cbor { 1: -7 },
  unprotected: { 33: [h'...reader cert DER...'] },
  payload:     null,
  signature:   h'...'
]
```

The `33` label is `x5chain`. This profile does not define production reader trust anchors in Appendix F; those are deployment-policy and §7 matters.

### F.6 Diagnostic notation is not CDDL

Diagnostic examples are not a substitute for Appendix C CDDL. In particular:

- map ordering in examples is for readability unless exact fixture bytes are being shown;
- placeholders such as `<fresh nonce>` and `<signature>` are not literal values;
- comments are not part of the encoded bytes;
- decoded tag-24 renderings can hide byte boundaries that are security-relevant; and
- examples do not create new optional fields, alternate field names, or alternate carriers.

Where exact byte equality matters, use the fixture bytes and fixture metadata classified by Appendix D.

## Appendix G. Compatibility notes for ISO/IEC 18013-5 §9 and W3C Digital Credentials API

This appendix explains how the SMART Health Check-in same-device profile reuses mdoc and direct Digital Credentials API concepts while constraining them for SMART Health Check-in 1.0. It is explanatory and compatibility-oriented. Section 8 remains the canonical source for version 1.0 same-device behavior.

### G.1 What this profile reuses

SMART Health Check-in reuses the `org-iso-mdoc` Digital Credentials API path to carry an ISO/IEC 18013-5-style mdoc presentation request and encrypted mdoc response on the same device. The Verifier invokes the Digital Credentials API with:

```text
protocol = "org-iso-mdoc"
data.deviceRequest  = base64url(CBOR(DeviceRequest))
data.encryptionInfo = base64url(CBOR(["dcapi", {...}]))
```

The Wallet/Responder returns:

```text
protocol = "org-iso-mdoc"
data.response = base64url(CBOR(["dcapi", {"enc": bstr, "cipherText": bstr}]))
```

The profile reuses mdoc concepts including `DeviceRequest`, `DocRequest`, tag-24 `ItemsRequest`, optional reader authentication, `DeviceResponse`, issuer-signed namespaces, `IssuerSignedItem`, MSO value digests, `issuerAuth`, `DeviceAuthentication`, `deviceSignature`, `DeviceNameSpaces`, and HPKE response protection.

### G.2 What this profile fixes or constrains

The profile fixes a narrow mdoc document type and namespace for check-in:

| Purpose | Value |
| --- | --- |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| requested/disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| SMART response carrier | `IssuerSignedItem.elementValue` for `smart_health_checkin_response` |

The SMART request is a JSON string in `requestInfo`. The SMART response is a JSON string in the issuer-signed item `elementValue`. The profile intentionally does not spread SMART request items, FHIR selectors, response Artifacts, status codes, or clinical resources across generic mdoc elements. The mdoc layer carries and protects one SMART response element whose clinical semantics are defined by §§5-6.

### G.3 `DeviceRequest` version and reader authentication

Core version 1.0 uses `DeviceRequest.version == "1.0"` and optional per-`DocRequest.readerAuth`. When `readerAuth` is present, it is a detached `COSE_Sign1` using ES256 over `ReaderAuthenticationBytes` and carries `x5chain` certificate evidence at COSE header label `33`.

This profile does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core v1 reader-authentication mechanism. A future version or deployment profile could define a different mechanism, but that would not change the core v1 byte ladder in §8 and Appendix E.

Reader authentication is only one trust layer. An absent, syntactically invalid, cryptographically failed, cryptographically valid but untrusted, and trusted `readerAuth` are distinct states. Deployment profiles decide when trusted reader authentication is mandatory and how certificate paths, anchors, revocation, and assurance labels are evaluated.

### G.4 Direct `dcapi` handover and `SessionTranscript`

The profile uses the direct `dcapi` handover form described in §8:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The `origin` comes from the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It is not copied from the SMART request. The exact `encryptionInfoBase64Url` string is hashed into `dcapiInfo`; re-encoding the same `encryptionInfo` bytes into a different string would change the transcript.

The resulting `SessionTranscript` binds the presentation session to the direct Digital Credentials API handover context. The same bytes are used for optional reader authentication, mdoc device authentication, and HPKE response encryption/opening.

### G.5 Issuer, device, and HPKE roles

The response has three distinct protection roles:

1. **Issuer/MSO and value digest.** The SMART response JSON is the `elementValue` of an issuer-signed item. The MSO value digest covers the complete tag-24 `IssuerSignedItem` bytes. `issuerAuth` signs the MSO and provides issuer evidence for the mdoc container.
2. **Device authentication.** `deviceSignature` proves possession of the device private key corresponding to `MSO.deviceKeyInfo.deviceKey` and binds the presentation to the expected `SessionTranscript`, `docType`, and `DeviceNameSpaces`.
3. **HPKE transport confidentiality/integrity.** HPKE seals the CBOR `DeviceResponse` to the Verifier's recipient public key from `encryptionInfo`, using the fixed suite DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD.

These roles are complementary, not interchangeable. HPKE opening does not validate the SMART response shape. `issuerAuth` and `deviceSignature` do not establish clinical-source provenance for unsigned raw FHIR JSON. `requestId` matching does not prove freshness or patient identity. Verifiers apply the §8 mdoc/transport checks and then the §6.6 SMART response cross-validation checks.

### G.6 Relationship to generic mDL fields

This profile defines a SMART Health Check-in mdoc document type. It does not define, require, or reinterpret generic mobile driving licence fields such as family name, given name, birth date, portrait, driving privileges, address, age-over flags, issuing authority, or document number. A Wallet can hold mDLs or other mdoc document types independently, but those documents are outside the SMART Health Check-in 1.0 same-device profile unless a future profile explicitly defines a bridge.

Similarly, this profile does not define generic FHIR resource mdoc elements. FHIR resources, SMART Health Cards, QuestionnaireResponses, and other clinical Artifacts appear inside the transport-neutral SMART response JSON as defined by §6. Their source trust is evaluated under §7.4 and Artifact-specific rules, not by pretending each clinical resource is a native mDL field.

### G.7 W3C Digital Credentials API compatibility posture

The W3C Digital Credentials API provides the mediation and same-device credential invocation surface. This profile uses only the direct `org-iso-mdoc` request/response shape described in §8. It does not define a parallel `dc_api.jwt`, OpenID4VP, DCQL, or browser-specific request carrier for version 1.0. Reserved future bindings can be described elsewhere, but they do not change the v1 same-device `org-iso-mdoc` requirements.

Implementations should treat platform origin binding and privileged-caller behavior as part of the trust model. When authenticated web origin is unavailable, the Wallet/Responder needs an explicit deployment-approved origin-equivalent context or must treat origin trust as absent under §7. The SMART request body cannot repair missing platform origin evidence.

## Organizer notes

### Strengths

- The draft keeps Appendices E, F, and G supportive and derives them from §8 rather than inventing new normative behavior.
- The byte ladder preserves all required accepted dependency facts: request in `requestInfo`, response in issuer-signed `elementValue`, tag-24 boundaries, direct `dcapi` `SessionTranscript`, optional per-`DocRequest.readerAuth`, HPKE `info = SessionTranscript bytes`, and empty AAD.
- Appendix F gives implementers a readable diagnostic notation guide while explicitly deferring CDDL and exact byte conformance to Appendices C and D.
- Appendix G separates mdoc container evidence, HPKE transport protection, reader authentication, origin evidence, and clinical-source provenance.

### Caveats

- This draft intentionally does not include inline hex byte examples or hashes beyond pointing to verified fixture paths, because Appendix D should classify authoritative vectors.
- The exact CDDL shape, duplicate-field handling, duplicate-document/element policy, and any tighter nonce-size rule remain downstream Appendix C / conformance decisions.
- Some active fixture metadata records historical source paths outside the repository; this draft cites only repository fixture roots and does not rely on those external paths.

### Open issues

- Decide in T3.D whether active fixtures using 32-byte nonces should become conformance requirements or remain example-vector choices.
- Decide whether digest id `0` for the single response item should be fixed by CDDL/conformance or remain an implementation/vector convention.
- Decide how Appendix D labels real Chrome/Android captures versus synthetic deterministic fixtures versus minimal pyMDOC fixtures.
- Decide whether duplicate `smart_health_checkin_response` elements are rejected, quarantined, or resolved by a deterministic rule in core conformance.

### Downstream dependencies

- Appendix C should define exact CDDL for `ItemsRequest`, `DeviceRequest`, `ReaderAuthentication`, `encryptionInfo`, `IssuerSignedItem`, MSO subset, `DeviceAuthentication`, `DeviceResponse`, and `dcapiResponse` using the same field names and tag-24 boundaries.
- Appendix D should index the confirmed fixture roots and identify which files are conformance vectors, diagnostics, generated fixtures, or historical captures.
- §11 should reuse the trust distinctions here when discussing replay, origin spoofing, reader impersonation, HPKE key reuse, debug-bundle leakage, and raw-FHIR overclaiming.
- §13 / conformance closure should decide which deployment-profile hooks become mandatory for specific ecosystems, especially authenticated origin, reader certificate trust, issuer trust anchors, nonce length, and fixture requirements.
