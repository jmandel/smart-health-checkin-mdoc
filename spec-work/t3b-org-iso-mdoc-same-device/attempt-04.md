## 8. Same-device presentation flow over `org-iso-mdoc`

This section defines the base SMART Health Check-in 1.0 presentation flow. A Verifier carries the transport-neutral SMART request defined in §5 to a Wallet/Responder through the W3C Digital Credentials API direct `org-iso-mdoc` path, and the Wallet/Responder returns the transport-neutral SMART response defined in §6 inside an mdoc `DeviceResponse` encrypted for the Verifier.

The clinical request and response semantics are not redefined here. A Verifier that successfully opens and validates the mdoc presentation still applies §6.6 to the extracted SMART response. A Wallet/Responder that successfully parses the mdoc request still applies §5 to the extracted SMART request and still performs Holder review at the request-item granularity. Trust processing remains layered as described in §7: origin evidence, optional reader authentication, mdoc issuer/device evidence, and clinical-source provenance are distinct.

The cross-device kiosk flow in §9 re-enters this same-device flow on the phone. This section does not define kiosk pointer, relay, submission, or Completion display behavior.

### 8.1 Identifiers

The version 1.0 same-device flow uses the following fixed identifiers. Section 13 registers these values; Appendix C supplies aligned CDDL; Appendix D indexes fixture files; Appendix E supplies byte-ladder detail.

| Protocol field | Value |
| --- | --- |
| W3C Digital Credentials API protocol id | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Stable response element identifier | `smart_health_checkin_response` |
| SMART request carrier key in `ItemsRequest.requestInfo` | `org.smarthealthit.checkin.request` |
| HPKE KEM | DHKEM(P-256, HKDF-SHA256), HPKE KEM id `0x0010` |
| HPKE KDF | HKDF-SHA256, HPKE KDF id `0x0001` |
| HPKE AEAD | AES-128-GCM, HPKE AEAD id `0x0001` |
| COSE signature algorithm | ES256, COSE alg `-7` |

A Verifier SHALL use the protocol id `org-iso-mdoc` for this flow. A Wallet/Responder SHALL reject this flow as a SMART Health Check-in same-device request if the requested mdoc `docType` is not exactly `org.smarthealthit.checkin.1` or if the requested namespace/element pair does not include `org.smarthealthit.checkin` / `smart_health_checkin_response`.

A Verifier SHALL carry the SMART request JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL treat any archived dynamic element-name encoding as non-normative for this flow.

A Wallet/Responder SHALL carry the SMART response JSON string as the disclosed mdoc element value whose `elementIdentifier` is exactly `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`.

### 8.2 Verifier-side request construction

#### 8.2.1 SMART request JSON in `requestInfo`

The Requester constructs a SMART request according to §5. The Verifier SHALL serialize that SMART request as UTF-8 JSON text conforming to §5.1 and place the resulting JSON string, not a parsed CBOR object and not a base64url string, at:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

This section does not define a canonical JSON serialization for the SMART request. The Verifier MAY use any JSON serialization that preserves the §5 data model. The Wallet/Responder SHALL parse and validate the JSON string according to §5 before using it for Holder review or response construction.

#### 8.2.2 `ItemsRequest` shape

For the stable response element, the Verifier SHALL construct an ISO-style `ItemsRequest` with this logical shape:

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": true
    }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": <SMART request JSON string>
  }
}
```

The `true` value is the mdoc `intentToRetain` value for the requested element. For SMART Health Check-in 1.0, a Verifier SHALL default `intentToRetain` to `true` because ordinary clinical check-in workflows expect returned Artifacts to be ingested, retained, or routed by the Requester. A deployment profile MAY require `false` only for a workflow that is truly ephemeral and for which retention by the Verifier is not intended. A Verifier that sets `intentToRetain` to `false` SHALL still process any returned SMART response according to §6, §7, this section, and applicable retention policy.

A Verifier SHALL NOT request separate mdoc elements for FHIR profiles, request items, questionnaire answers, Artifact media types, status codes, or individual clinical resources in this core flow. The stable element carries one SMART response whose internal clinical semantics are defined by §6.

#### 8.2.3 `DeviceRequest` version and Tag-24 wrapping

The Verifier SHALL encode the `ItemsRequest` as CBOR and then wrap the encoded `ItemsRequest` bytes in CBOR tag 24. The `DocRequest.itemsRequest` value SHALL be this tag-24 value:

```text
ItemsRequestBytes = tag24(CBOR(ItemsRequest))
```

The Verifier SHALL construct a `DeviceRequest` with version `"1.0"` and a `docRequests` array containing the `DocRequest` for this SMART Health Check-in document:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": ItemsRequestBytes,
      "readerAuth": <optional COSE_Sign1>
    }
  ]
}
```

Version 1.0 of this specification uses per-`DocRequest.readerAuth` when reader authentication is present. A Verifier SHALL NOT use the ISO/IEC 18013-5 version `"1.1"` `readerAuthAll` mechanism for this core v1.0 flow unless a future deployment profile explicitly defines such a variant.

#### 8.2.4 Optional `readerAuth`

`readerAuth` is OPTIONAL in the core version 1.0 same-device flow unless a deployment profile requires it. Absent `readerAuth` and failed `readerAuth` are distinct trust states under §7.2.3.

A Verifier that includes `readerAuth` SHALL compute it for the same `SessionTranscript` and exact `ItemsRequestBytes` used in the request. It SHALL NOT reuse a `readerAuth` value across origins, encryption information, request bytes, sessions, or Holder interactions.

The detached reader-authentication payload is:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The `readerAuth` value SHALL be a `COSE_Sign1` using ES256 (`alg` `-7`). The protected header SHALL contain `{1: -7}`. The payload SHALL be detached (`null` in the serialized `COSE_Sign1` structure), and the signature SHALL be over the COSE `Sig_structure` for `ReaderAuthenticationBytes`. When the Verifier supplies certificate material for reader trust, it SHALL place that material in the COSE header location required by the reader-authentication profile, such as `x5chain` header label `33` containing DER certificate bytes. A deployment profile owns the certificate-chain, trust-anchor, revocation, and display policy.

#### 8.2.5 HPKE recipient key and `encryptionInfo`

For each presentation request, the Verifier SHALL generate or select a fresh HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256). The public key carried in `encryptionInfo` SHALL be the P-256 public key corresponding to the private key the Verifier will use to open the Wallet response.

The Verifier SHALL construct `encryptionInfo` as CBOR with this logical shape:

```text
encryptionInfo = CBOR([
  "dcapi",
  {
    "nonce": <32 random bytes>,
    "recipientPublicKey": {
       1: 2,          ; kty = EC2
      -1: 1,          ; crv = P-256
      -2: <x bstr>,
      -3: <y bstr>
    }
  }
])
```

A Verifier SHALL use a fresh unpredictable `nonce` value for each request and SHOULD use 32 bytes, as used by the version 1.0 fixtures. The `recipientPublicKey` SHALL be a COSE_Key for an EC2 P-256 public key. The Verifier SHALL base64url-encode the `encryptionInfo` CBOR bytes without padding when passing the value to the Digital Credentials API.

#### 8.2.6 `navigator.credentials.get(...)` argument

The Verifier SHALL invoke the W3C Digital Credentials API with the direct mdoc protocol and with base64url-without-padding CBOR fields:

```json
{
  "mediation": "required",
  "digital": {
    "requests": [
      {
        "protocol": "org-iso-mdoc",
        "data": {
          "deviceRequest": "<base64url CBOR DeviceRequest>",
          "encryptionInfo": "<base64url CBOR encryptionInfo>"
        }
      }
    ]
  }
}
```

A Verifier SHALL retain the original SMART request object or parsed equivalent, the serialized SMART request JSON string if needed for diagnostics, the `DeviceRequest` bytes, `encryptionInfo` bytes, the HPKE recipient private key, and the `SessionTranscript` inputs needed to validate the response.

Appendix E should provide a byte ladder from SMART request JSON to `ItemsRequestBytes`, `DeviceRequest`, `encryptionInfo`, `dcapiInfo`, `SessionTranscript`, and `readerAuth` where present. Appendix D should point to checked-in request fixtures rather than duplicating long byte strings in this section.

### 8.3 `SessionTranscript` construction

A Verifier and Wallet/Responder SHALL compute the same `SessionTranscript` bytes for the same request. The `SessionTranscript` binds the direct DC API handover to the Verifier's encrypted response context and to mdoc device authentication.

The inputs are:

1. `encryptionInfoBase64Url`: the exact base64url-without-padding string supplied as `digital.requests[0].data.encryptionInfo`; and
2. `origin`: the authenticated serialized web origin for the invoking Verifier context.

The construction is:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

A Verifier SHALL use the serialized origin of the invoking page or application context as defined by the W3C Digital Credentials API environment. A Wallet/Responder SHALL obtain the origin from the Browser / User Agent, Credential Manager, privileged caller, or platform channel that is authenticated for this purpose. A Wallet/Responder SHALL NOT derive the origin from the SMART request JSON, `purpose`, item text, callback-looking URLs, request ids, `requestInfo`, reader certificates, or mdoc element values.

A Browser / User Agent that supports this flow is assumed to convey enough authenticated caller context for the Wallet/Responder to compute the same origin string. If the Wallet/Responder cannot obtain authenticated origin context for this flow, it SHALL fail the origin-bound same-device processing unless a deployment profile explicitly defines a reduced-assurance alternative. Such a profile SHALL still preserve §7 trust-layer separation and SHALL define how `SessionTranscript`, HPKE `info`, device authentication, and Holder display behave.

The `SessionTranscript` bytes SHALL be used as HPKE `info` in §8.6 and as the `SessionTranscript` member of `DeviceAuthentication` in §8.5. A Verifier SHALL reject a response whose device authentication or HPKE opening does not bind to the expected `SessionTranscript`.

### 8.4 Wallet-side request handling

A Wallet/Responder receiving a same-device `org-iso-mdoc` request SHALL perform these steps before constructing a SMART response.

1. Decode `deviceRequest` from base64url without padding and parse it as CBOR `DeviceRequest` version `"1.0"`.
2. Locate a `DocRequest` whose tag-24 `itemsRequest` decodes to `docType` `org.smarthealthit.checkin.1` and whose `nameSpaces` request includes `org.smarthealthit.checkin` / `smart_health_checkin_response`.
3. Preserve the exact tag-24 `ItemsRequestBytes` for reader-authentication verification if `readerAuth` is present.
4. Recover `requestInfo["org.smarthealthit.checkin.request"]` as a JSON string. If the key is absent, if the value is not a string, or if the string cannot be parsed and validated as a SMART request under §5, the Wallet/Responder SHALL reject the presentation request or fail with an appropriate user-facing and protocol error.
5. Decode `encryptionInfo` from base64url without padding, validate the `"dcapi"` envelope, validate the recipient public key as P-256 COSE_Key material, and compute the `SessionTranscript` from §8.3 using authenticated origin context.
6. If per-`DocRequest.readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, verify the `COSE_Sign1`, detached `ReaderAuthenticationBytes`, protected algorithm, certificate or public-key material, and deployment trust policy. Invalid, malformed, mismatched, unsupported, or untrusted `readerAuth` SHALL be treated as failed reader authentication, not as absent reader authentication.
7. Apply Wallet policy, deployment policy, and Holder review. The Wallet/Responder SHOULD display or otherwise make available the authenticated origin and any successfully validated reader information when useful and safe, and SHOULD distinguish those trust signals from unauthenticated SMART request display text.
8. Present requested items for Holder review at the granularity of `SmartHealthCheckinRequest.items[]`, subject to accessibility, safety, local policy, and applicable law. The Wallet/Responder SHALL NOT use `required: true`, `purpose`, `title`, `summary`, or any request body field to bypass Holder control.

A Wallet/Responder MAY decline the entire presentation before building a SMART response when Holder action, Wallet policy, missing trust evidence, unsupported selectors, malformed transport, or platform behavior requires that outcome. If the Wallet/Responder proceeds to construct a SMART response, it SHALL account for every request item according to §6.4.

### 8.5 Wallet-side response construction

After request validation and Holder review, the Wallet/Responder constructs the SMART response and packages it as an mdoc `DeviceResponse`.

#### 8.5.1 SMART response JSON

The Wallet/Responder SHALL construct a SMART response according to §6. The response `requestId` SHALL exactly equal the SMART request `id`. The response SHALL include `artifacts[]` and `requestStatus[]`, and `requestStatus[]` SHALL account for every request item exactly once.

The Wallet/Responder SHALL serialize the SMART response as UTF-8 JSON text and use that JSON string as the mdoc element value for `smart_health_checkin_response`. This section does not define a canonical JSON serialization for the clinical response object; §6 defines the data model and §8.7 defines Verifier validation after extraction.

#### 8.5.2 `IssuerSignedItem` and digest

The Wallet/Responder SHALL create one issuer-signed item for the stable response element:

```text
IssuerSignedItem = {
  "digestID": 0,
  "random": <fresh random bytes>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": <SMART response JSON string>
}
```

The Wallet/Responder SHALL CBOR-encode the `IssuerSignedItem`, wrap the encoded bytes in CBOR tag 24, and compute the value digest as:

```text
valueDigest = SHA-256(tag24(CBOR(IssuerSignedItem)))
```

The Wallet/Responder SHALL place the tag-24 `IssuerSignedItem` in:

```text
issuerSigned.nameSpaces["org.smarthealthit.checkin"]
```

The Wallet/Responder SHALL use the same `digestID` in the `IssuerSignedItem` and in the MSO `valueDigests` map for namespace `org.smarthealthit.checkin`.

#### 8.5.3 MSO and `issuerAuth`

The Wallet/Responder SHALL construct a Mobile Security Object for `docType` `org.smarthealthit.checkin.1` whose `digestAlgorithm` is `SHA-256` and whose `valueDigests["org.smarthealthit.checkin"][digestID]` equals the `valueDigest` from §8.5.2. The MSO SHALL contain `deviceKeyInfo.deviceKey` identifying the device public key used for device authentication. Validity information and issuer certificate material SHALL be supplied according to the mdoc profile and deployment trust policy.

The Wallet/Responder SHALL wrap the encoded MSO bytes in CBOR tag 24 and place that tagged value as the payload of `issuerAuth`, a `COSE_Sign1` using ES256 (`alg` `-7`). A Verifier evaluates the issuer signature and issuer certificate or key evidence according to §7.3 and deployment policy.

#### 8.5.4 Device authentication and `DeviceResponse`

The Wallet/Responder SHALL create `DeviceNameSpaces` and encode it as CBOR tag 24. When this profile has no device-signed namespace elements, `DeviceNameSpaces` can be an empty map; it is still the value bound into device authentication.

The device-authentication payload is:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

The Wallet/Responder SHALL create `deviceSignature` as a `COSE_Sign1` using ES256 (`alg` `-7`) and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`, with `DeviceAuthenticationBytes` as the signed payload according to the mdoc device-authentication rules.

The Wallet/Responder SHALL construct a `DeviceResponse` with logical shape:

```text
DeviceResponse = {
  "version": "1.0",
  "documents": [
    {
      "docType": "org.smarthealthit.checkin.1",
      "issuerSigned": {
        "nameSpaces": {
          "org.smarthealthit.checkin": [tag24(CBOR(IssuerSignedItem))]
        },
        "issuerAuth": COSE_Sign1
      },
      "deviceSigned": {
        "nameSpaces": tag24(CBOR(DeviceNameSpaces)),
        "deviceAuth": { "deviceSignature": COSE_Sign1 }
      }
    }
  ],
  "status": 0
}
```

A Wallet/Responder SHALL NOT place additional SMART Health Check-in clinical semantics outside the SMART response JSON string. Additional mdoc, issuer, device, certificate, or validity fields are presentation evidence; they do not change the SMART response model.

### 8.6 HPKE encryption and DC API response envelope

The Wallet/Responder SHALL encrypt the CBOR-encoded `DeviceResponse` using HPKE base mode with:

- KEM: DHKEM(P-256, HKDF-SHA256), id `0x0010`;
- KDF: HKDF-SHA256, id `0x0001`;
- AEAD: AES-128-GCM, id `0x0001`;
- recipient public key: the P-256 public key from `encryptionInfo.recipientPublicKey`;
- `info`: the exact `SessionTranscript` bytes from §8.3;
- `aad`: the empty byte string.

The HPKE encapsulated key `enc` SHALL be the uncompressed ephemeral P-256 public key bytes for this HPKE operation, encoded in the standard 65-byte form beginning with `0x04`. The ciphertext SHALL be the AES-128-GCM ciphertext with authentication tag as produced by HPKE.

The Wallet/Responder SHALL wrap the HPKE output as CBOR:

```text
dcapiResponse = CBOR([
  "dcapi",
  {
    "enc": <HPKE enc bstr>,
    "cipherText": <HPKE ciphertext bstr>
  }
])
```

The Wallet/Responder SHALL return the Digital Credentials API response object with protocol `org-iso-mdoc` and with `data.response` equal to base64url-without-padding encoding of the `dcapiResponse` CBOR bytes:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url CBOR dcapiResponse>"
  }
}
```

### 8.7 Verifier-side response processing

A Verifier receiving a Digital Credentials API result for this flow SHALL process it in this order.

1. Confirm that the outer response has `protocol` equal to `org-iso-mdoc` and has a string `data.response`.
2. Base64url-decode `data.response` and parse the resulting CBOR as `dcapiResponse = ["dcapi", {"enc": ..., "cipherText": ...}]`.
3. Validate `enc` as a P-256 HPKE encapsulated public key in the format required by §8.6, and validate that `cipherText` is a byte string.
4. Recompute the `SessionTranscript` from the original `encryptionInfo` base64url string and origin. HPKE-open the ciphertext using the retained recipient private key, the corresponding recipient public key, `info = SessionTranscript`, and empty `aad`. If HPKE opening fails, the Verifier SHALL reject the response.
5. Parse the plaintext as CBOR `DeviceResponse`. The Verifier SHALL require `version` `"1.0"`, `status` `0`, and at least one document with `docType` `org.smarthealthit.checkin.1`.
6. For the SMART Health Check-in document, verify `issuerAuth` as a COSE_Sign1, decode the tag-24 MSO payload, verify the MSO signature and issuer certificate or key evidence according to §7.3 and deployment policy, and confirm that the MSO `docType` is `org.smarthealthit.checkin.1` and `digestAlgorithm` is `SHA-256`.
7. For each disclosed issuer-signed item in namespace `org.smarthealthit.checkin`, require CBOR tag 24, decode the `IssuerSignedItem`, recompute `SHA-256(tag24(CBOR(IssuerSignedItem)))`, and compare it to `MSO.valueDigests["org.smarthealthit.checkin"][digestID]`. A mismatch SHALL cause rejection of the mdoc presentation.
8. Locate exactly one disclosed item whose `elementIdentifier` is `smart_health_checkin_response`. The Verifier SHALL reject the presentation if the stable response element is absent, duplicated, in the wrong namespace, or not a JSON string.
9. Verify `deviceSignature` using `MSO.deviceKeyInfo.deviceKey` and a `DeviceAuthentication` payload containing the same `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24 `DeviceNameSpaces` from the response. If device proof fails or is not bound to the expected `SessionTranscript`, the Verifier SHALL reject the presentation.
10. Parse the stable element's JSON string as a SMART response and validate it according to §6. The Verifier SHALL apply all §6.6 cross-validation rules against the original SMART request before the Requester consumes returned content.
11. Apply §7 trust policy and deployment policy, including issuer/device assurance, reader-authentication expectations if any, origin policy, and clinical-source provenance. The Verifier or receiver SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from transport success alone.

A Verifier MAY expose diagnostic information for test fixtures and conformance tooling, but it SHALL avoid logging secrets, private keys, access tokens, unnecessary patient details, or sensitive Holder decisions except as allowed by deployment policy and privacy requirements in §12.

### 8.8 Required validation checklist

A Verifier implementing the same-device `org-iso-mdoc` flow SHALL validate at least the following before accepting the returned SMART response for Requester use:

| Layer | Required validation |
| --- | --- |
| DC API wrapper | Outer `protocol` is `org-iso-mdoc`; `data.response` is present and base64url without padding. |
| HPKE envelope | Decoded CBOR is `["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`; `enc` and `cipherText` are byte strings with the required HPKE suite. |
| Session binding | `SessionTranscript` is recomputed from exact `encryptionInfoBase64Url` and authenticated origin; HPKE `info` and device authentication use the same bytes. |
| HPKE open | Ciphertext opens with the Verifier's recipient private key, the request's recipient public key, empty `aad`, and the expected `SessionTranscript`. |
| DeviceResponse | CBOR parses; `version` is `"1.0"`; `status` is `0`; document `docType` is `org.smarthealthit.checkin.1`. |
| Issuer evidence | `issuerAuth` COSE_Sign1 verifies under accepted issuer evidence and policy; MSO `docType`, `digestAlgorithm`, validity, and trust anchors satisfy §7 and deployment policy. |
| Digest binding | Every accepted `IssuerSignedItem` is tag-24 wrapped and hashes to the MSO value digest for its namespace and `digestID`. |
| Stable element | Namespace is `org.smarthealthit.checkin`; exactly one accepted element has `elementIdentifier` `smart_health_checkin_response`; `elementValue` is a JSON string. |
| Device proof | `deviceSignature` verifies with the MSO device key over `DeviceAuthentication` bound to the expected `SessionTranscript`, `docType`, and `DeviceNameSpaces`. |
| SMART response shape | Extracted JSON validates as `SmartHealthCheckinResponse` under §6. |
| Request/response binding | §6.6 checks pass: `requestId` equals request `id`; `fulfills[]` references resolve; Artifact `mediaType` is accepted by each fulfilled item; `requestStatus[]` covers every item exactly once; raw FHIR and SMART Health Card FHIR-version rules are enforced. |
| Trust interpretation | The Verifier preserves §7 trust-layer separation and applies deployment policy for origin, reader, issuer/device, and clinical-source trust. |

A Wallet/Responder implementing the same-device flow SHALL validate at least the corresponding request-side inputs: protocol id, `DeviceRequest` version, `docType`, requested namespace and element, tag-24 `ItemsRequest`, SMART request JSON from `requestInfo`, `encryptionInfo`, authenticated origin for `SessionTranscript`, and optional `readerAuth` when present and supported or required by policy.

### 8.9 Annotated end-to-end byte capture pointers

Normative behavior is defined by this section, not by any one fixture. Appendix D should index current and future fixtures and identify which are normative conformance vectors, historical captures, or implementation diagnostics.

Current active same-device evidence includes these checked-in fixture directories:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
```

The request directory contains byte boundaries for `navigator-credentials-get.arg.json`, `device-request.cbor`, `items-request.cbor`, `items-request-tag24.cbor`, `request-info.json`, `smart-request.json`, `encryption-info.cbor`, `session-transcript.cbor`, `reader-auth.cbor`, and related diagnostic files.

The response directory contains byte boundaries for `wallet-response.digital-credential.json`, `dcapi-response.cbor`, `hpke-enc.bin`, `hpke-ciphertext.bin`, `device-response.cbor`, `issuer-signed-item-tag24.cbor`, `value-digest.bin`, `mso.cbor`, `issuer-auth.cbor`, `device-authentication.cbor`, `smart-response.json`, `pymdoc-byte-check.json`, and related inspection files.

Appendix E should annotate these boundaries as a byte ladder, including at least:

1. SMART request JSON string in `requestInfo`;
2. tag-24 `ItemsRequestBytes`;
3. `DeviceRequest` CBOR and base64url API field;
4. `encryptionInfo` CBOR and base64url API field;
5. `dcapiInfo`, `handover`, and `SessionTranscript`;
6. optional `readerAuth` detached payload and COSE_Sign1;
7. SMART response JSON string in `IssuerSignedItem.elementValue`;
8. tag-24 `IssuerSignedItem` and MSO digest;
9. `issuerAuth`, `DeviceAuthentication`, and `deviceSignature`;
10. `DeviceResponse` plaintext;
11. HPKE `enc`, ciphertext, `dcapiResponse`, and outer Digital Credentials API response; and
12. extracted SMART response validation against the original SMART request.

Appendix C CDDL should mirror the structures above without introducing alternate field names or alternate clinical payload semantics.

## Organizer notes

### Strengths

- Preserves the architectural invariant that the SMART request and SMART response are transport-neutral JSON objects carried by this flow, not redefined by mdoc.
- Uses the active identifiers from docs and code: `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`.
- Makes `requestInfo`, tag-24 wrapping, `SessionTranscript`, HPKE `info`, digest validation, device proof, and §6.6 cross-validation explicit enough for byte-level tests.
- Keeps `readerAuth` optional in core v1 and distinguishes absent from failed reader authentication, consistent with §7.
- Avoids defining kiosk wrapper behavior while making clear that §9 re-enters this same-device flow.

### Caveats

- This attempt specifies `digestID: 0` for the single stable element because that is the active fixture behavior. The organizer should confirm whether the final spec wants to require `0` or merely require consistency between the item and MSO.
- This attempt says the `encryptionInfo` nonce SHOULD be 32 bytes while requiring freshness. Active docs show 32 bytes; active TypeScript enforces a lower bound. The organizer should decide whether to make 32 bytes a hard requirement for testability.
- DeviceAuthentication and readerAuth COSE details follow active evidence, but Appendix C / Appendix E should verify exact COSE payload-detachment language against ISO/IEC 18013-5 terminology.

### Open issues

- Whether authenticated origin is mandatory for every core same-device flow or whether a reduced-assurance origin-absent variant can exist should be closed with §4, §7, §11, and Appendix A.
- Production reader certificate profiles, mdoc issuer trust anchors, revocation checking, and Holder display labels remain deployment-profile work.
- Final fixture status needs Appendix D classification: real Chrome/Android captures, generated request vectors, historical Mattr mDL capture, and any future conformance vectors should be clearly labeled.

### Downstream dependencies

- Appendix A should extract each Verifier and Wallet/Responder SHALL/SHOULD into checklist rows.
- Appendix C should provide CDDL for `ItemsRequest`, `DeviceRequest`, `dcapiInfo`, `dcapiResponse`, the SMART Check-in mdoc document subset, and any same-device response envelope fragments.
- Appendix D should index the fixture paths named above without inventing nonexistent files.
- Appendix E should provide the annotated byte ladder and test-vector derivations from the fixture bytes.
- §11 should revisit replay, freshness, origin spoofing, reader impersonation, issuer-trust pivots, plaintext logging, and reduced-assurance UX.
