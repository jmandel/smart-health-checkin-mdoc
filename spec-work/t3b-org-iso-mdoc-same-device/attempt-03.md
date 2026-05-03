## 8. Direct same-device `org-iso-mdoc` presentation flow

This section defines the version 1.0 base same-device presentation flow. It carries the transport-neutral SMART request from §5 and returns the transport-neutral SMART response from §6 using direct `org-iso-mdoc` over the W3C Digital Credentials API. Kiosk sections later wrap and re-enter this same-device flow; this section does not define kiosk pointer, relay, submission, or completion behavior.

The flow has three payload layers:

1. the SMART clinical JSON objects from §§5-6;
2. the mdoc `DeviceRequest` and `DeviceResponse` structures that carry those objects; and
3. the W3C Digital Credentials API direct `org-iso-mdoc` request and response wrappers, including origin-bound `SessionTranscript` construction and HPKE encryption.

Successful completion of this flow establishes only the transport, mdoc, and trust properties that the Verifier validates. It does not make raw FHIR JSON clinically sourced or signed. Verifiers still apply §7 trust policy and §6.6 SMART response cross-validation before the Requester consumes returned content.

### 8.1 Identifiers

A Verifier and Wallet/Responder implementing the same-device flow SHALL use the identifiers in Table 8-1.

| Protocol field | Value |
| --- | --- |
| W3C Digital Credentials API protocol id | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Stable response element identifier | `smart_health_checkin_response` |
| SMART request carrier key | `org.smarthealthit.checkin.request` |
| HPKE KEM / KDF / AEAD | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256, COSE alg `-7` |

The SMART request carrier is `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. The SMART response carrier is the `IssuerSignedItem.elementValue` for element identifier `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`.

A Verifier SHALL request the stable element `smart_health_checkin_response` in namespace `org.smarthealthit.checkin` for `docType` `org.smarthealthit.checkin.1`. A Wallet/Responder SHALL NOT use dynamic element identifiers, archived request-in-element-name encodings, or alternative claim names as substitutes for this core version 1.0 carrier.

A Verifier SHALL use the HPKE suite DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM for this flow. A Verifier or Wallet/Responder that creates or verifies `readerAuth`, `issuerAuth`, or `deviceSignature` for this flow SHALL use COSE `COSE_Sign1` with protected header algorithm `-7` (ES256), unless a future version or deployment profile defines an explicitly negotiated alternative.

### 8.2 Verifier-side request construction

The Verifier constructs a direct `org-iso-mdoc` Digital Credentials API request from a SMART request that already conforms to §5.

#### 8.2.1 SMART request JSON in `requestInfo`

A Verifier SHALL serialize the `SmartHealthCheckinRequest` as UTF-8 JSON according to §5.1. This specification does not require a canonical JSON serialization for the clinical request object. The Verifier SHALL place the resulting JSON string as the value of:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

The value is a CBOR text string containing the JSON serialization, not a CBOR map representation of the SMART request and not a base64url-encoded JSON string.

A Wallet/Responder SHALL parse this value as the SMART request JSON. If the value is absent, not a string, not valid JSON, or not a valid `SmartHealthCheckinRequest` under §5, the Wallet/Responder SHALL reject the presentation request or fail the affected presentation according to the selected platform error path.

#### 8.2.2 `ItemsRequest` shape

For the core same-device flow, the Verifier SHALL construct one `ItemsRequest` with this logical shape:

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

The `true` value is the mdoc `intentToRetain` flag for the requested element. For SMART Health Check-in, a Verifier SHOULD set `intentToRetain` to `true` by default because clinical check-in workflows commonly ingest returned Artifacts into an EHR, payer, intake, or scheduling workflow. A Verifier MAY set `intentToRetain` to `false` only when the Verifier does not intend retention beyond ephemeral presentation processing. A Wallet/Responder MAY display or otherwise consider `intentToRetain` during Holder review, but it remains presentation metadata and does not change SMART request or SMART response semantics.

A Verifier SHALL CBOR-encode the `ItemsRequest` and wrap the encoded bytes in CBOR tag 24 before placing it in `DocRequest.itemsRequest`:

```text
itemsRequest = tag24(CBOR(ItemsRequest))
```

The exact tag-24-wrapped `itemsRequest` bytes are security-relevant when `readerAuth` is present and when byte-level fixtures are generated.

#### 8.2.3 `DeviceRequest` version 1.0

The Verifier SHALL construct a `DeviceRequest` with version `"1.0"` and one or more `docRequests`. The core SMART Health Check-in request is one `DocRequest` whose `itemsRequest` is the tag-24 value above:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": tag24(CBOR(ItemsRequest)),
      "readerAuth": COSE_Sign1 / optional
    }
  ]
}
```

A Verifier SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core v1.0 reader-authentication mechanism. A future version or deployment profile can define additional versions or aggregate reader authentication, but the interoperable core v1.0 flow uses per-`DocRequest.readerAuth` when reader authentication is present.

#### 8.2.4 Optional `readerAuth`

`readerAuth` is optional in the core version 1.0 same-device flow unless a deployment profile requires it. A Verifier MAY include per-`DocRequest.readerAuth`. When it includes `readerAuth`, the Verifier SHALL construct a detached `COSE_Sign1` over the ISO-style `ReaderAuthentication` bytes:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))

readerAuth = COSE_Sign1[
  protected:   bstr .cbor { 1: -7 },
  unprotected: reader key or certificate material as profiled,
  payload:     null,
  signature:   ES256 over Sig_structure("Signature1", protected, external_aad, ReaderAuthenticationBytes)
]
```

`ItemsRequestBytes` in this construction is the exact CBOR tag-24 value carried in `DocRequest.itemsRequest`. `SessionTranscript` is the same value defined in §8.3 for this presentation. The external AAD for this `COSE_Sign1` signature is the empty byte string unless a deployment profile explicitly defines otherwise.

A Verifier that includes `readerAuth` SHALL NOT reuse it across different presentation sessions, different `SessionTranscript` bytes, different `ItemsRequest` bytes, different requested elements, or different SMART request JSON serializations.

A deployment profile that requires `readerAuth` SHALL define reader certificate or public-key trust anchors, certificate-chain validation, accepted key usages or policy identifiers where applicable, revocation or status expectations where applicable, and failure handling. Absent `readerAuth` and present-but-failed `readerAuth` are distinct trust states under §7.2.

#### 8.2.5 HPKE recipient key pair and `encryptionInfo`

Before invoking the Digital Credentials API, the Verifier SHALL generate or otherwise provision an HPKE recipient key pair for the required suite. For the core suite, the recipient public key is a P-256 public key encoded as a COSE_Key with at least:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: <x bstr>,
  -3: <y bstr>
}
```

The Verifier SHALL retain the matching private key until response processing is complete or the presentation session is abandoned.

The Verifier SHALL construct `encryptionInfo` as CBOR for this logical value:

```text
encryptionInfo = [
  "dcapi",
  {
    "nonce": <fresh random bytes>,
    "recipientPublicKey": <P-256 COSE_Key>
  }
]
```

The Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy; the active implementation uses 32 bytes. Appendix C CDDL and Appendix E byte-ladder material are expected to close any exact encoded-size requirements used by conformance tests.

The Verifier SHALL base64url-encode the CBOR bytes of `DeviceRequest` and `encryptionInfo` without padding before passing them to the Digital Credentials API.

#### 8.2.6 Digital Credentials API invocation

The Verifier SHALL invoke the direct mdoc request using the `org-iso-mdoc` protocol id and the base64url fields described above. The platform-neutral logical argument is:

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

Both byte fields are base64url without padding. The Verifier SHALL preserve the exact `encryptionInfo` CBOR bytes and their base64url string because §8.3 binds that string into the `SessionTranscript`.

Appendix E will provide byte-ladder examples for deterministic inputs. Appendix D will index real fixture captures. This section intentionally does not invent additional byte examples.

### 8.3 `SessionTranscript` construction

The same-device flow uses a direct `dcapi` handover value in the mdoc `SessionTranscript`. The construction binds the presentation to the base64url `encryptionInfo` value supplied through the Digital Credentials API and to the authenticated caller origin or platform caller context supplied by the Browser / User Agent.

#### 8.3.1 Origin acquisition

When the Browser / User Agent or platform exposes an authenticated web origin to the Wallet/Responder, the Wallet/Responder SHALL use that platform-provided origin string for this construction. The Wallet/Responder SHALL NOT derive authenticated origin from the SMART request JSON, `purpose`, item display text, request ids, selector URLs, returned Artifacts, or any other clinical-content field.

The Verifier SHALL use its own origin string for local construction of the expected `SessionTranscript` and HPKE `info`. In web deployments this origin is the invoking page origin as represented by the user agent. A deployment profile MAY define exact origin serialization and privileged-caller mapping rules for a platform, but those rules SHALL preserve byte agreement between the Verifier and Wallet/Responder for the same presentation.

If authenticated origin or accepted privileged-caller context is unavailable and a Wallet/Responder policy requires it, the Wallet/Responder SHALL reject or fail the presentation rather than substituting a self-asserted requester identity field. If a deployment profile permits reduced-assurance operation without authenticated origin, it SHALL define how the Wallet/Responder labels that state and how the Verifier evaluates the resulting trust state under §7.

#### 8.3.2 Byte construction

Let `encryptionInfoBase64Url` be the exact base64url-without-padding string placed at `navigator.credentials.get(...).digital.requests[i].data.encryptionInfo`.

The `SessionTranscript` bytes for this flow are:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The `handover` value is a CBOR array when included in `SessionTranscript`; `SHA-256(dcapiInfo)` is a CBOR byte string containing the 32-byte digest. The first two `SessionTranscript` array entries are `null` because this direct DC API profile does not use device engagement or eReader key fields in those positions.

A Verifier and Wallet/Responder SHALL use these exact `SessionTranscript` bytes as:

- HPKE `info` for sealing and opening the encrypted `DeviceResponse`;
- the `SessionTranscript` member in `ReaderAuthentication` when `readerAuth` is present; and
- the `SessionTranscript` member in `DeviceAuthentication` for the returned mdoc response.

A Verifier SHALL reject or fail response processing when the response cannot be opened or device authentication cannot be verified using the expected `SessionTranscript` for the original request.

### 8.4 Wallet-side request handling

A Wallet/Responder that receives a direct `org-iso-mdoc` request for SMART Health Check-in SHALL recover and validate the mdoc request before asking the Holder to approve disclosure.

The Wallet/Responder SHALL:

1. identify the request as protocol `org-iso-mdoc`;
2. base64url-decode and CBOR-decode `data.deviceRequest`;
3. confirm `DeviceRequest.version` is `"1.0"` for this core flow;
4. locate a `DocRequest.itemsRequest` that is CBOR tag 24 around CBOR bytes;
5. decode the `ItemsRequest` bytes;
6. confirm `ItemsRequest.docType` is `org.smarthealthit.checkin.1`;
7. confirm `ItemsRequest.nameSpaces["org.smarthealthit.checkin"]` requests `smart_health_checkin_response`;
8. recover the requested `intentToRetain` value for Holder review and policy;
9. recover `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a JSON string;
10. parse and validate that JSON as a `SmartHealthCheckinRequest` under §5; and
11. base64url-decode and CBOR-decode `data.encryptionInfo`, including the HPKE recipient public key.

The Wallet/Responder SHALL recompute the §8.3 `SessionTranscript` from the exact `encryptionInfo` base64url string and the authenticated origin or accepted privileged-caller context supplied by the platform. The Wallet/Responder SHALL use that `SessionTranscript` for `readerAuth` verification when present, for `DeviceAuthentication`, and for HPKE response encryption.

If `readerAuth` is present and the Wallet/Responder claims support for reader authentication or relies on reader trust for policy, the Wallet/Responder SHALL verify the detached `COSE_Sign1` signature, protected algorithm, signed `ReaderAuthentication` context, exact `ItemsRequest` byte binding, `SessionTranscript` binding, and key or certificate trust policy as described in §§7.2 and 8.2.4. A Wallet/Responder SHALL distinguish absent `readerAuth` from failed `readerAuth`. Failed `readerAuth` includes malformed, cryptographically invalid, mismatched, unsupported, expired, untrusted, or policy-unacceptable reader authentication.

A Wallet/Responder SHALL run Holder review at the granularity of SMART request items, subject to Wallet UX, accessibility, safety, local policy, and applicable law. The Wallet/Responder SHOULD display or otherwise make available the authenticated origin and any successfully verified reader information when useful and safe. It SHALL NOT present `purpose`, item `title`, item `summary`, or other SMART request fields as authenticated requester identity.

### 8.5 Wallet-side response construction

After Holder review, Wallet policy, and Holder data-source processing, the Wallet/Responder constructs a SMART response according to §6. The response remains the transport-neutral clinical JSON object. The Wallet/Responder SHALL set `SmartHealthCheckinResponse.requestId` to the original SMART request `id`, SHALL account for every request item in `requestStatus[]`, and SHALL include Artifacts only as allowed by §6.

#### 8.5.1 Stable response element

The Wallet/Responder SHALL serialize the SMART response as UTF-8 JSON. This specification does not require a canonical JSON serialization for the SMART response object, but the exact string placed into the mdoc element is the value protected by mdoc digest and device-authentication processing.

The Wallet/Responder SHALL create an `IssuerSignedItem` for namespace `org.smarthealthit.checkin` with:

```text
elementIdentifier = "smart_health_checkin_response"
elementValue      = JSON.stringify(SmartHealthCheckinResponse)
```

The Wallet/Responder SHALL CBOR-encode each `IssuerSignedItem` and wrap the encoded bytes in CBOR tag 24 before including it in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`. The Wallet/Responder SHALL compute MSO value digests over the tag-24-wrapped `IssuerSignedItem` bytes, not over the decoded item alone and not over only the JSON string.

#### 8.5.2 MSO and issuerAuth

The Wallet/Responder SHALL construct an MSO whose `docType` is `org.smarthealthit.checkin.1`, whose value digests cover the disclosed `org.smarthealthit.checkin` namespace item or items, whose `digestAlgorithm` is compatible with the value-digest computation required by the mdoc profile, and whose `deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.

The Wallet/Responder SHALL sign the MSO in `issuerAuth` as a `COSE_Sign1` using protected header `{1: -7}` for ES256. The `issuerAuth.payload` SHALL be the tag-24-wrapped MSO bytes. A deployment profile or trust framework decides whether the issuer evidence is production issuer-trusted, self-attested, test-only, or otherwise acceptable under §7.3. Self-attestation does not relax the structural, digest, device, or SMART response validation rules.

#### 8.5.3 DeviceAuthentication and device signature

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same presentation using the §8.3 `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and the tag-24-wrapped `DeviceNameSpaces` bytes:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

The Wallet/Responder SHALL sign the corresponding COSE `Sig_structure` with the device private key bound by `MSO.deviceKeyInfo.deviceKey` and place the result as the document `deviceSignature` using `COSE_Sign1` with protected header `{1: -7}`. The payload is detached unless the referenced mdoc structure or deployment profile explicitly requires another equivalent ISO-compatible encoding.

#### 8.5.4 `DeviceResponse` envelope

The Wallet/Responder SHALL place the document in a `DeviceResponse` with logical shape:

```text
DeviceResponse = {
  "version": "1.0",
  "documents": [Document],
  "status": 0
}

Document.docType = "org.smarthealthit.checkin.1"
```

A Wallet/Responder MAY include other mdoc fields required by ISO-compatible libraries, but the Verifier SHALL be able to locate exactly the document and stable response element needed by this section. Appendix C will provide CDDL aligned with the exact field names and envelopes used here.

### 8.6 HPKE encryption and DC API response envelope

The Wallet/Responder SHALL encrypt the CBOR bytes of the `DeviceResponse` to the Verifier's recipient public key from `encryptionInfo` using the suite in §8.1.

For this flow:

```text
HPKE suite = DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM
info       = SessionTranscript bytes
aad        = empty byte string
plaintext  = CBOR(DeviceResponse)
```

The HPKE encapsulated key `enc` SHALL be the uncompressed ephemeral P-256 public key bytes produced for the HPKE seal operation. The `cipherText` value SHALL be the AES-128-GCM ciphertext followed by the authentication tag as produced by the HPKE AEAD.

The Wallet/Responder SHALL construct the direct `dcapi` response CBOR value:

```text
dcapiResponse = [
  "dcapi",
  {
    "enc": <HPKE enc bytes>,
    "cipherText": <HPKE ciphertext bytes>
  }
]
```

The Wallet/Responder SHALL return the outer Digital Credentials API response in this logical JSON shape:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url CBOR dcapiResponse>"
  }
}
```

The `data.response` value SHALL be base64url without padding. A Browser / User Agent is assumed to return this value to the invoking Verifier without rewriting the protected bytes.

### 8.7 Verifier-side processing

The Verifier SHALL process the returned presentation before passing any SMART response to the Requester or downstream receiver.

The Verifier SHALL:

1. confirm the Digital Credentials API response uses protocol `org-iso-mdoc`;
2. base64url-decode and CBOR-decode `data.response` as a direct `dcapiResponse`;
3. confirm the decoded value has label `"dcapi"` and contains byte-string `enc` and `cipherText` values;
4. reconstruct the expected §8.3 `SessionTranscript` from the original `encryptionInfo` base64url string and origin;
5. HPKE-open `cipherText` using the retained recipient private key, the original recipient public key, `enc`, `info = SessionTranscript bytes`, and empty AAD;
6. CBOR-decode the plaintext as `DeviceResponse`;
7. confirm `DeviceResponse.version` is `"1.0"` and `status` indicates success;
8. locate a document whose `docType` is `org.smarthealthit.checkin.1`;
9. verify `issuerAuth` signature, MSO structure, issuer key evidence, document type, validity constraints, and issuer trust according to §7.3 and applicable deployment policy;
10. recompute each disclosed `IssuerSignedItem` digest over the tag-24-wrapped item bytes and compare it to the MSO `valueDigests` entry for namespace `org.smarthealthit.checkin`;
11. locate exactly one disclosed element with `elementIdentifier` `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`, unless a deployment profile explicitly defines handling for multiple documents or duplicate elements;
12. verify `deviceSignature` using `MSO.deviceKeyInfo.deviceKey` and `DeviceAuthentication` constructed with the expected `SessionTranscript`, `docType`, and tag-24-wrapped `DeviceNameSpaces` bytes;
13. extract `elementValue` and confirm it is a JSON string;
14. parse the JSON string as `SmartHealthCheckinResponse` under §6; and
15. apply all §6.6 cross-validation rules against the original SMART request.

The Verifier SHALL reject or quarantine the presentation response if HPKE opening fails, if mdoc issuer or digest validation fails, if device-signature verification fails, if the stable response element is missing or malformed, if the SMART response JSON fails §6 validation, or if §6.6 cross-validation fails.

The Verifier SHALL keep trust decisions distinct. Origin binding, reader authentication, issuer/MSO trust, device-key proof, SMART Health Card verification, and raw FHIR provenance are separate layers under §7. A Verifier SHALL NOT treat successful HPKE opening, successful mdoc digest validation, or successful device-signature verification as proof that unsigned raw FHIR JSON came from a clinical source.

### 8.8 Required validation checklist

Implementations and conformance tests SHOULD use this checklist as the minimum same-device flow validation inventory. Appendix A will convert normative requirements into conformance rows, and Appendix C / Appendix E will provide lower-level CDDL and byte-ladder details.

A Verifier SHALL verify all of the following before accepting a same-device response:

- original SMART request was valid under §5;
- request used protocol id `org-iso-mdoc`;
- `DeviceRequest.version` was `"1.0"` for the core flow;
- `ItemsRequest` was tag-24 wrapped and decoded successfully;
- `ItemsRequest.docType` was `org.smarthealthit.checkin.1`;
- requested namespace was `org.smarthealthit.checkin`;
- requested stable element was `smart_health_checkin_response`;
- SMART request JSON was present at `requestInfo["org.smarthealthit.checkin.request"]`;
- `encryptionInfo` was valid direct `dcapi` CBOR containing nonce and P-256 recipient public key;
- expected `SessionTranscript` was constructed from the exact `encryptionInfo` base64url value and the expected origin;
- if policy requires `readerAuth`, required reader authentication was present and valid;
- if `readerAuth` was present, absent and failed reader-authentication states were not conflated;
- returned protocol was `org-iso-mdoc`;
- returned `data.response` decoded to direct `dcapiResponse` with `enc` and `cipherText`;
- HPKE opened with suite DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty AAD;
- plaintext decoded as `DeviceResponse` version `"1.0"` with success status;
- document `docType` was `org.smarthealthit.checkin.1`;
- `issuerAuth` COSE algorithm and signature were valid and evaluated under applicable issuer trust policy;
- disclosed `IssuerSignedItem` digests matched the MSO value digests for the SMART namespace;
- stable response element was present once and had string `elementValue`;
- `deviceSignature` verified against `MSO.deviceKeyInfo.deviceKey` and the expected `DeviceAuthentication` payload;
- SMART response JSON parsed and validated under §6;
- SMART response `requestId` exactly matched the original request `id`;
- every Artifact `fulfills[]` reference resolved to an original item id;
- every Artifact `mediaType` was accepted by every fulfilled request item, absent an applicable registered compatibility rule;
- `requestStatus[]` covered every request item exactly once and no unknown item;
- FHIR-version and SMART Health Card Artifact rules from §6.6 were applied;
- returned FHIR selector evidence was evaluated as needed for the deployment; and
- local §7 trust policy, §11 security requirements, and deployment-profile requirements were applied before downstream use.

A Wallet/Responder SHALL verify all of the following before constructing a response:

- request protocol and mdoc identifiers match §8.1;
- SMART request JSON is recovered from `requestInfo` and validates under §5;
- `SessionTranscript` is recomputed from platform-origin context and `encryptionInfo`;
- optional `readerAuth` is verified or marked absent/failed according to §7.2 and local policy;
- Holder review occurs at request-item granularity subject to Wallet policy; and
- the constructed SMART response conforms to §6 before being placed in `smart_health_checkin_response`.

### 8.9 Annotated end-to-end byte capture pointers

Appendix D will provide the authoritative fixture index, and Appendix E will provide annotated byte ladders. Current checked-in evidence for this flow includes:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
```

The active fixture convention preserves byte boundaries such as:

```text
navigator-credentials-get.arg.json
inspection.json
device-request.cbor
device-request.diag
items-request.cbor
items-request.decoded.json
request-info.json
requested-element.txt
encryption-info.cbor
session-transcript.cbor
wallet-response.digital-credential.json
dcapi-response.cbor
device-response.cbor
smart-request.json
smart-response.json
pymdoc-byte-check.json
verification-report.json
```

The current real Chrome/Android capture demonstrates the direct `org-iso-mdoc` request, stable response element, `requestInfo` SMART request carrier, origin-bound `SessionTranscript`, HPKE opening with a captured test recipient key, MSO digest validation, `issuerAuth`, `deviceSignature`, and SMART response cross-validation. The paired request fixture records origin `http://127.0.0.1:3010` for the real capture. These fixture names are pointers to existing evidence, not new normative paths.

## Organizer notes

### Strengths

- Preserves the accepted architectural split: SMART request/response are transport-neutral clinical JSON objects, while §8 defines same-device mdoc carriage and validation.
- Uses exact active identifiers from docs and code: `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`.
- Separates trust layers from §7 and explicitly keeps absent `readerAuth` distinct from failed `readerAuth`.
- Defines request, `SessionTranscript`, HPKE, mdoc response, and verifier validation precisely enough for Appendix C/E byte tests without inventing new hex examples.

### Caveats

- Some ISO/IEC 18013-5 details are intentionally described at a profile level rather than as exhaustive generic mdoc validation. Appendix C, Appendix E, and Appendix G should align exact CDDL and ISO compatibility notes.
- The text assumes DC API direct mdoc returns the observed `{"protocol":"org-iso-mdoc","data":{"response":"..."}}` shape. If browser API shape changes before finalization, §8.6 and §8.7 need a narrow update.
- Exact nonce length is left as SHOULD at 16+ bytes with active 32-byte evidence; conformance closure may choose a fixed minimum.

### Open issues

- Whether core conformance requires authenticated origin for every same-device presentation, or permits reduced-assurance no-origin operation, should be closed in §4, §7, §11, and Appendix A.
- Production reader certificate profile, issuer trust anchors, revocation/status handling, and self-attested wallet labeling remain deployment-profile and trust-framework work.
- Duplicate document or duplicate stable-element handling may need tighter language once Appendix C fixture and conformance tests decide whether to reject all duplicates or select one by policy.

### Downstream dependencies

- Appendix A should turn each Verifier and Wallet/Responder SHALL/SHOULD into checklist rows with clear targets.
- Appendix C should provide CDDL for `DeviceRequest`, `ItemsRequest`, `encryptionInfo`, `dcapiResponse`, `DeviceResponse`, `IssuerSignedItem`, and the same-device response document.
- Appendix D should index the real Chrome/Android request and response fixture paths listed above and any generated deterministic vectors.
- Appendix E should provide the byte ladder for `encryptionInfo`, `dcapiInfo`, `SessionTranscript`, `ReaderAuthentication`, `DeviceAuthentication`, HPKE, and mdoc digest computations.
- Appendix G should explain ISO/IEC 18013-5 compatibility boundaries without changing §8 behavior.
- §9 should re-enter this same-device flow for kiosk rather than redefining SMART clinical semantics.
- §11 should revisit origin spoofing, UI redress, reader impersonation, replay/freshness, cryptographic agility, plaintext leakage, and HPKE/key handling.
