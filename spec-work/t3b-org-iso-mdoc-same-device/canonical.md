## 8. Same-device presentation flow over `org-iso-mdoc`

This section defines the base SMART Health Check-in 1.0 same-device presentation flow. A Verifier carries the transport-neutral SMART request defined in §5 to a Wallet/Responder through the W3C Digital Credentials API direct `org-iso-mdoc` path, and the Wallet/Responder returns the transport-neutral SMART response defined in §6 inside an mdoc `DeviceResponse` encrypted for the Verifier.

This section does not redefine clinical request or response semantics. A Wallet/Responder validates and uses the extracted SMART request under §5. A Verifier validates the extracted SMART response under §6, including the §6.6 cross-validation rules. Trust interpretation follows §7: origin evidence, optional reader authentication, mdoc issuer/device evidence, and clinical-source provenance are distinct.

The cross-device kiosk flow in §9 re-enters this same-device flow on the phone. Kiosk pointer, relay, submission, and Completion display behavior are defined in §9, not here.

### 8.1 Identifiers and constants

The version 1.0 same-device flow uses the fixed identifiers and algorithm choices in Table 8-1.

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested and disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

A Verifier SHALL use `org-iso-mdoc` as the Digital Credentials API protocol id for this flow. A Verifier SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`.

A Verifier SHALL carry the SMART request only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic element names, kiosk wrapper fields, archived claim-name experiments, or other locations as the version 1.0 request carrier for this flow.

A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`.

### 8.2 Verifier-side request construction

A Verifier begins with a SMART request object that conforms to §5.

#### 8.2.1 SMART request JSON in `requestInfo`

A Verifier SHALL serialize the SMART request as UTF-8 JSON text and place the resulting string at:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

The value is a CBOR text string containing the JSON serialization. It is not a CBOR map representation of the SMART request and not a base64url-encoded JSON string. This specification does not define a canonical JSON serialization for the SMART request object, although fixtures and byte ladders can preserve the exact JSON text used in a capture.

#### 8.2.2 `ItemsRequest` shape

For the core profile, a Verifier SHALL construct an `ItemsRequest` with this logical shape:

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": true
    }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": JSON.stringify(SmartHealthCheckinRequest)
  }
}
```

The `true` value is the mdoc `intentToRetain` value for the requested element. A Verifier SHALL default `intentToRetain` to `true` for `smart_health_checkin_response` because ordinary clinical check-in workflows commonly ingest or route returned Artifacts. A Verifier MAY set it to `false` only when the Verifier truly intends ephemeral use and applicable deployment policy permits that signal. The flag does not override Holder choice, Wallet policy, legal requirements, §12 privacy requirements, or downstream retention policy.

A Verifier SHALL NOT model FHIR profiles, request items, questionnaires, Artifact media types, status codes, or individual clinical resources as separate mdoc elements in the core flow. The stable mdoc element carries one SMART response whose internal clinical semantics are defined by §6.

#### 8.2.3 Tag-24 wrapping

A Verifier SHALL CBOR-encode the `ItemsRequest` and wrap those bytes in CBOR tag 24 before placing it in `DocRequest.itemsRequest`:

```text
ItemsRequestBytes = tag24(CBOR(ItemsRequest))
```

The exact tag-24 value is security-relevant when `readerAuth` is present and for byte-level fixtures.

#### 8.2.4 `DeviceRequest` version 1.0 and optional `readerAuth`

A Verifier SHALL construct a `DeviceRequest` with version exactly `"1.0"` and a `docRequests` array containing the SMART Health Check-in `DocRequest`:

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
```

Version 1.0 of this specification uses per-`DocRequest.readerAuth` when reader authentication is present. A Verifier SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core SMART Health Check-in 1.0 reader-authentication mechanism unless a future version or deployment profile explicitly defines that variant.

`readerAuth` is optional in the core version 1.0 flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as a detached `COSE_Sign1` using ES256 (`alg` `-7`) over this payload:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The `readerAuth` protected header SHALL include `{1: -7}`. The serialized `COSE_Sign1` payload field SHALL be `null`. The COSE signature input SHALL be the `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as the detached payload. For this core profile, `readerAuth` SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate; deployment profiles define acceptable chains, trust anchors, revocation handling, and assurance labels.

A Verifier that includes `readerAuth` SHALL compute it for the exact `SessionTranscript` and exact `ItemsRequestBytes` used in the presentation request and SHALL NOT reuse it across sessions, origins, encryption information, SMART request serializations, or requested element sets.

#### 8.2.5 HPKE recipient public key and `encryptionInfo`

For each presentation request, a Verifier SHALL generate or select an HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256). A Verifier SHOULD use a fresh recipient key pair for each presentation session. A deployment profile that permits recipient-key reuse SHALL define replay, correlation, retention, and key-compromise handling.

The public key in `encryptionInfo` SHALL be a COSE_Key for an EC2 P-256 public key, including at least:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: <x-coordinate bstr>,
  -3: <y-coordinate bstr>
}
```

A Verifier SHALL construct `encryptionInfo` as CBOR for this logical value:

```text
encryptionInfo = [
  "dcapi",
  {
    "nonce": <fresh unpredictable bytes>,
    "recipientPublicKey": <P-256 COSE_Key>
  }
]
```

A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy; active version 1.0 fixtures use 32 bytes. Appendix C, Appendix E, or a deployment profile can impose a tighter nonce-size rule for conformance vectors.

The Verifier SHALL retain the matching HPKE private key and the exact `encryptionInfo` CBOR bytes until response processing completes or the presentation session is abandoned.

#### 8.2.6 Digital Credentials API request shape

A Verifier SHALL base64url-encode the CBOR `DeviceRequest` bytes and CBOR `encryptionInfo` bytes without padding. It SHALL invoke the Digital Credentials API with a request equivalent to:

```js
await navigator.credentials.get({
  mediation: "required",
  digital: {
    requests: [{
      protocol: "org-iso-mdoc",
      data: {
        deviceRequest: "<base64url-without-padding CBOR DeviceRequest>",
        encryptionInfo: "<base64url-without-padding CBOR encryptionInfo>"
      }
    }]
  }
});
```

A Verifier SHALL preserve the exact `encryptionInfo` base64url string because §8.3 binds that string, not a re-encoded equivalent, into the `SessionTranscript`.

### 8.3 `SessionTranscript` and origin binding

Both sides SHALL compute the same direct `dcapi` `SessionTranscript` bytes for a presentation session.

Let `encryptionInfoBase64Url` be the exact unpadded base64url string placed in `navigator.credentials.get(...).digital.requests[i].data.encryptionInfo`. Let `origin` be the authenticated origin value, or deployment-defined privileged-caller origin-equivalent value, supplied by the Browser / User Agent or platform for the presentation invocation.

The construction is:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The SHA-256 input is the exact CBOR serialization of `[encryptionInfoBase64Url, origin]`. The `SessionTranscript` bytes are the exact CBOR serialization of `[null, null, handover]`.

A Wallet/Responder SHALL obtain `origin` from an authenticated Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. A Wallet/Responder SHALL NOT derive `origin` from the SMART request JSON, `purpose`, item `title`, item `summary`, selector URLs, request ids, kiosk metadata, callback-looking strings, or Artifact contents.

A Verifier SHALL use the same origin value that the platform/requester context uses for this invocation when constructing `readerAuth`, HPKE `info`, and expected device authentication inputs. A Wallet/Responder SHALL use the same `SessionTranscript` bytes for optional `readerAuth` verification, for `DeviceAuthentication`, and for HPKE response encryption. A Verifier SHALL use the same bytes for HPKE opening and device-signature verification.

If authenticated origin or deployment-approved privileged-caller context is unavailable, the Wallet/Responder SHALL treat origin trust as absent under §7.1.3. If the Wallet/Responder cannot construct the `SessionTranscript` required for this flow, it SHALL fail the presentation or proceed only under an explicit deployment profile that defines the serialized origin-equivalent input, resulting assurance level, Holder display, and Verifier validation behavior. A Wallet/Responder SHALL NOT silently substitute a self-asserted SMART request field as the origin.

### 8.4 Wallet-side request handling

A Wallet/Responder that receives a candidate direct `org-iso-mdoc` request SHALL validate the presentation request before constructing a SMART response.

The Wallet/Responder SHALL:

1. confirm that the presentation request is for protocol `org-iso-mdoc`;
2. base64url-decode `data.deviceRequest` without padding and parse it as CBOR `DeviceRequest`;
3. confirm `DeviceRequest.version` is `"1.0"` for this core flow;
4. locate a `DocRequest.itemsRequest` that is CBOR tag 24 around CBOR `ItemsRequest` bytes;
5. preserve the exact tag-24 `ItemsRequestBytes` for `readerAuth` verification;
6. decode the enclosed `ItemsRequest`;
7. confirm `ItemsRequest.docType` is exactly `org.smarthealthit.checkin.1`;
8. confirm `ItemsRequest.nameSpaces["org.smarthealthit.checkin"]` requests `smart_health_checkin_response` and recover the `intentToRetain` value for Holder review or policy;
9. recover `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a string;
10. parse that string as UTF-8 JSON and validate it as a SMART request under §5;
11. base64url-decode `data.encryptionInfo`, parse it as CBOR, require the direct `"dcapi"` envelope, and validate the recipient public key as P-256 COSE_Key material; and
12. recompute the `SessionTranscript` under §8.3 using the exact request `encryptionInfo` base64url string and authenticated origin or approved origin-equivalent context.

If the SMART request JSON is absent, not a string, unparsable, not a JSON object, or invalid under §5, the Wallet/Responder SHALL reject the presentation request, report failure through the selected platform mechanism, or otherwise fail safely. The Wallet/Responder SHALL NOT infer clinical request semantics from mdoc element names, display strings, archived dynamic-element encodings, unknown request fields, or kiosk wrappers.

If `readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, the Wallet/Responder SHALL verify the detached `COSE_Sign1`, protected algorithm, `ReaderAuthenticationBytes`, `SessionTranscript`, exact tag-24 `ItemsRequestBytes`, signature, `x5chain` certificate evidence, and deployment trust policy. The Wallet/Responder SHALL distinguish at least these states for policy and display purposes: absent `readerAuth`; syntactically invalid `readerAuth`; cryptographically failed `readerAuth`; cryptographically valid but untrusted or policy-unacceptable `readerAuth`; and trusted `readerAuth` under the applicable deployment policy.

After request and trust processing, the Wallet/Responder SHALL run Holder review or equivalent Holder-control processing at request-item granularity. It SHALL preserve request item `id` values for response accounting. It MAY group, summarize, reorder, or suppress display details according to accessibility, safety, localization, local policy, and applicable law, but it SHALL NOT treat `required: true` as consent and SHALL NOT present `purpose`, item `title`, item `summary`, or other SMART request fields as authenticated requester identity.

Unsupported selectors, unavailable data, Holder refusal, partial sharing, and processing errors are clinical response outcomes when the request was otherwise valid enough to answer. They are not necessarily transport failures and are reported through §6 status rules when the Wallet/Responder proceeds to construct a SMART response.

### 8.5 Wallet-side response construction

A Wallet/Responder that proceeds after request validation and Holder review SHALL construct a SMART response according to §6. The response `requestId` SHALL exactly equal the accepted SMART request `id`; `artifacts[]`, `fulfills[]`, and `requestStatus[]` SHALL follow §§6.1-6.5. This exact match is a clinical correlation check only; it is not a freshness proof, patient identity proof, requester identity proof, or clinical-source proof.

#### 8.5.1 Stable response element

The Wallet/Responder SHALL serialize the SMART response as UTF-8 JSON text. This specification does not define a canonical JSON serialization for the SMART response object.

The Wallet/Responder SHALL create an `IssuerSignedItem` for namespace `org.smarthealthit.checkin` with logical contents:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": JSON.stringify(SmartHealthCheckinResponse)
}
```

The Wallet/Responder SHALL CBOR-encode the `IssuerSignedItem`, wrap those bytes in CBOR tag 24, and place that tagged item in:

```text
issuerSigned.nameSpaces["org.smarthealthit.checkin"]
```

The Wallet/Responder SHALL compute the MSO value digest over the complete tag-24-wrapped `IssuerSignedItem` bytes. The `IssuerSignedItem.digestID` SHALL match the corresponding key in `MSO.valueDigests["org.smarthealthit.checkin"]`.

#### 8.5.2 MSO and `issuerAuth`

The Wallet/Responder SHALL construct a Mobile Security Object whose `docType` is `org.smarthealthit.checkin.1`, whose `digestAlgorithm` is `SHA-256` for this profile, whose `valueDigests` cover the disclosed `smart_health_checkin_response` issuer-signed item, and whose `deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.

The Wallet/Responder SHALL sign the MSO as `issuerAuth` using `COSE_Sign1` with ES256 (`alg` `-7`). The `issuerAuth.payload` SHALL be the tag-24-wrapped MSO bytes unless Appendix C or an ISO-compatible profile defines an equivalent encoding.

A deployment profile or Verifier trust policy decides whether the issuer evidence is production issuer-trusted, registry-trusted, pinned, self-attested, test-only, or otherwise acceptable under §7.3. Demo or self-attested issuer evidence does not relax structural mdoc validation, digest validation, device authentication, SMART response validation, or §6.6 cross-validation.

#### 8.5.3 `DeviceAuthentication`, device signature, and `DeviceResponse`

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same presentation session using the §8.3 `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element is issuer-signed; it is not moved into `DeviceNameSpaces` as a substitute for the issuer-signed element.

The Wallet/Responder SHALL produce a device `COSE_Sign1` signature using ES256 (`alg` `-7`) and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`, with `DeviceAuthenticationBytes` as the device-authentication payload according to the mdoc device-authentication rules.

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

Appendix C owns the complete CDDL and any ISO/IEC 18013-5 compatibility refinements. Additional mdoc, certificate, validity, or device fields are presentation evidence; they do not change the SMART response model. A successful same-device presentation does not create clinical-source provenance for unsigned raw FHIR JSON. Production clinical-source trust must come from Artifact payload evidence, such as SMART Health Card signatures or accepted provenance, as described in §7.4.

### 8.6 HPKE encryption

The Wallet/Responder SHALL encrypt the CBOR `DeviceResponse` plaintext to the recipient public key from `encryptionInfo` using HPKE base mode with:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

The HPKE `enc` value is the encapsulated ephemeral P-256 public key for the KEM. Active fixtures encode it as the 65-byte uncompressed P-256 point. The `cipherText` value is the HPKE AEAD ciphertext including its authentication tag.

The Wallet/Responder SHALL wrap the HPKE output in the direct DC API response CBOR value:

```text
dcapiResponse = [
  "dcapi",
  {
    "enc": <HPKE enc bstr>,
    "cipherText": <HPKE ciphertext bstr>
  }
]
```

The Wallet/Responder SHALL base64url-encode the CBOR `dcapiResponse` bytes without padding and return a Digital Credentials API result equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

The Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, or a response encrypted with another HPKE suite for this core version 1.0 flow.

### 8.7 Verifier-side processing

A Verifier receiving a Digital Credentials API result SHALL process it before passing any clinical content to the Requester or downstream receiver.

The Verifier SHALL:

1. require the returned `protocol` to equal `org-iso-mdoc`;
2. require `data.response` to be an unpadded base64url string;
3. base64url-decode `data.response` and parse it as CBOR `dcapiResponse`;
4. require `dcapiResponse` to have the direct shape `["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`;
5. reconstruct the expected §8.3 `SessionTranscript` from the original `encryptionInfo` base64url string and origin used for the request;
6. HPKE-open `cipherText` using the retained recipient private key, the corresponding recipient public key from `encryptionInfo`, the received `enc`, the required HPKE suite, `info = SessionTranscript bytes`, and empty `aad`;
7. reject the response if HPKE opening fails;
8. parse the plaintext as CBOR `DeviceResponse`;
9. require `DeviceResponse.version` to be `"1.0"` and `DeviceResponse.status` to indicate success for the document being accepted;
10. locate a document whose `docType` is `org.smarthealthit.checkin.1`;
11. verify `issuerAuth` as an ES256 `COSE_Sign1`, decode and validate the MSO, verify the MSO `docType`, validity information, device key, and issuer signature, and evaluate issuer evidence under §7.3 and deployment policy before claiming production issuer trust;
12. locate the disclosed issuer-signed item in namespace `org.smarthealthit.checkin` whose `elementIdentifier` is `smart_health_checkin_response`;
13. recompute the value digest over the exact tag-24-wrapped `IssuerSignedItem` bytes and compare it to the MSO `valueDigests["org.smarthealthit.checkin"][digestID]` entry;
14. verify the device `COSE_Sign1` signature using `MSO.deviceKeyInfo.deviceKey` over `DeviceAuthentication` constructed with the expected `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes;
15. require the `smart_health_checkin_response` `elementValue` to be a string;
16. parse that string as JSON and validate it as a `SmartHealthCheckinResponse` under §6; and
17. apply all §6.6 cross-validation rules against the original SMART request before accepting the response as protocol-valid.

A Verifier SHALL reject or quarantine the presentation response if HPKE opening fails, mdoc issuer/MSO validation fails, value-digest validation fails, device authentication fails, the stable response element is absent or malformed, SMART response JSON validation fails, or §6.6 cross-validation fails.

A Verifier SHALL keep trust decisions distinct. HPKE success, origin binding, reader authentication, issuer/MSO validation, device-key proof, syntactic SMART response validity, and SMART Health Card verification are separate checks. None of those checks, by itself, proves patient identity, request freshness beyond the selected session controls, downstream authorization, or clinical-source provenance for unsigned raw FHIR JSON.

### 8.8 Required validation checklist

#### 8.8.1 Verifier checklist

A Verifier implementing the same-device `org-iso-mdoc` flow SHALL validate at least the following before accepting the returned SMART response for Requester use:

| Layer | Required validation |
| --- | --- |
| Original request | The original SMART request is valid under §5 and retained for §6.6 cross-validation. |
| Request construction | The Verifier used protocol `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, tag-24 `ItemsRequest`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, requested element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`. |
| Session setup | `encryptionInfo` has the direct `"dcapi"` shape with fresh nonce and P-256 recipient public key; the expected `SessionTranscript` is derived from the exact `encryptionInfoBase64Url` and origin. |
| Reader authentication | If deployment policy requires `readerAuth`, it is present, cryptographically valid, bound to the same `SessionTranscript` and exact tag-24 `ItemsRequest`, and trusted under policy. If `readerAuth` is absent or fails, that state is not conflated with trusted reader authentication. |
| Response wrapper | Returned protocol is `org-iso-mdoc`; `data.response` base64url-decodes to `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]`. |
| HPKE | HPKE opening succeeds with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty `aad`. |
| `DeviceResponse` | Plaintext parses as CBOR `DeviceResponse`; version is `"1.0"`; status is successful; a document has `docType` `org.smarthealthit.checkin.1`. |
| Issuer/MSO | `issuerAuth` verifies as ES256 `COSE_Sign1`; MSO `docType`, `digestAlgorithm`, validity information, value digests, device key, and issuer evidence satisfy §7.3 and deployment policy. |
| Digest binding | The disclosed tag-24 `IssuerSignedItem` for namespace `org.smarthealthit.checkin` hashes to the corresponding MSO value digest. |
| Stable element | The accepted disclosed element has `elementIdentifier` `smart_health_checkin_response` and a string `elementValue`. |
| Device proof | `deviceSignature` verifies with `MSO.deviceKeyInfo.deviceKey` over `DeviceAuthentication` bound to the expected `SessionTranscript`, `docType`, and `DeviceNameSpaces`. |
| SMART response | Extracted JSON validates as a SMART response under §6. |
| Request/response cross-validation | §6.6 checks pass: exact `requestId` match, `fulfills[]` references resolve, Artifact `mediaType` is accepted by each fulfilled item, `requestStatus[]` covers every request item exactly once, and FHIR/SMART Health Card checks are applied. |
| Trust interpretation | §7 and deployment policy are applied without treating transport success as clinical-source provenance or patient identity proof. |

#### 8.8.2 Wallet/Responder checklist

A Wallet/Responder implementing the same-device flow SHALL validate at least the following before disclosing content:

| Layer | Required validation |
| --- | --- |
| Request wrapper | Protocol is `org-iso-mdoc`; `data.deviceRequest` and `data.encryptionInfo` are present, base64url-decodable, and CBOR-decodable. |
| `DeviceRequest` | Version is `"1.0"`; a tag-24 `ItemsRequest` is present for `docType` `org.smarthealthit.checkin.1`; the exact tag-24 bytes are preserved for `readerAuth`. |
| `ItemsRequest` | Namespace `org.smarthealthit.checkin` requests element `smart_health_checkin_response`; `intentToRetain` is recovered for display or policy. |
| SMART request | `requestInfo["org.smarthealthit.checkin.request"]` is present as a string; parsed JSON validates under §5. |
| Session binding | `SessionTranscript` is recomputed from exact `encryptionInfoBase64Url` and authenticated origin or deployment-approved origin-equivalent context. |
| Reader authentication | Present `readerAuth` is verified or classified as syntactically invalid, cryptographically failed, valid but untrusted, or trusted; absent `readerAuth` remains distinct. |
| Holder control | Holder review or equivalent Wallet policy operates at request-item granularity and preserves item ids for response accounting. |
| Response construction | The SMART response conforms to §6, uses `requestId` equal to request `id`, and is placed as the `smart_health_checkin_response` issuer-signed element. |
| mdoc and encryption | IssuerSignedItem, MSO, `issuerAuth`, `DeviceAuthentication`, device signature, `DeviceResponse`, HPKE encryption, and outer DC API response follow §§8.5-8.6. |

#### 8.8.3 Deployment-profile items

A deployment profile that constrains this flow SHOULD define any additional requirements for authenticated origin, privileged-browser allow-lists, mandatory `readerAuth`, reader certificate path validation, revocation or status checking, issuer trust anchors, self-attested issuer labeling, nonce length, replay handling, fixture requirements, size limits, duplicate document/element handling, Holder display, logging, telemetry, and downstream clinical-source acceptance.

### 8.9 Annotated end-to-end byte capture

This section defines the construction. Appendix D is expected to provide the authoritative fixture index, and Appendix E is expected to provide the annotated byte ladder. They should derive from this section and should not introduce alternate field names, alternate request carriers, alternate response carriers, or alternate clinical semantics.

Confirmed active same-device fixture roots include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

Appendix E should annotate, where fixtures provide the bytes, the ladder from SMART request JSON to tag-24 `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `dcapiInfo`, `SessionTranscript`, optional `ReaderAuthentication`, SMART response JSON, tag-24 `IssuerSignedItem`, MSO digest, `issuerAuth`, `DeviceAuthentication`, device signature, `DeviceResponse`, HPKE `enc` and ciphertext, `dcapiResponse`, and extracted SMART response validation against the original SMART request. This section intentionally does not fabricate inline byte captures.
