## 8. Direct `org-iso-mdoc` same-device presentation flow

This section defines the version 1.0 base presentation flow. A Verifier carries the transport-neutral SMART request from §5 in a direct `org-iso-mdoc` W3C Digital Credentials API request, and a Wallet/Responder returns the transport-neutral SMART response from §6 in an mdoc `DeviceResponse` encrypted for the Verifier. Kiosk sections later wrap and re-enter this same flow; they do not define different clinical request or response semantics.

The trust interpretation of origin, optional reader authentication, issuer/device evidence, and clinical-source provenance is defined in §7. This section defines the byte-level construction and validation mechanics that support those trust layers. Additional security considerations are expected in §11. Appendix C is expected to carry aligned CDDL, Appendix D an index of checked-in fixtures, and Appendix E the annotated byte ladder for `SessionTranscript` and related inputs.

### 8.1 Identifiers

The same-device flow uses the following fixed identifiers.

| Field | Value |
| --- | --- |
| Digital Credentials API protocol identifier | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Stable response element identifier | `smart_health_checkin_response` |
| SMART request carrier key | `org.smarthealthit.checkin.request` |
| HPKE KEM | DHKEM(P-256, HKDF-SHA256), HPKE KEM id `0x0010` |
| HPKE KDF | HKDF-SHA256, HPKE KDF id `0x0001` |
| HPKE AEAD | AES-128-GCM, HPKE AEAD id `0x0001` |
| COSE signature algorithm | ES256, COSE `alg` `-7` |

A Verifier SHALL use `org-iso-mdoc` as the Digital Credentials API protocol identifier for this flow.

A Verifier SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response` when requesting a SMART Health Check-in response.

A Wallet/Responder SHALL return the SMART response in the `IssuerSignedItem.elementValue` for namespace `org.smarthealthit.checkin` and element identifier `smart_health_checkin_response`.

A Verifier and Wallet/Responder SHALL use `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as the SMART request carrier. Earlier dynamic element-name encodings and archived OpenID4VP experiments are not part of this version 1.0 direct `org-iso-mdoc` flow.

### 8.2 Verifier-side request construction

Before invoking the presentation flow, the Requester constructs a SMART request according to §5. The Verifier then serializes that SMART request as UTF-8 JSON text. This section does not define a canonical JSON serialization for the clinical object; the exact JSON string carried in `requestInfo` is the string the Wallet/Responder parses.

A Verifier SHALL construct an `ItemsRequest` with this logical shape:

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": <intentToRetain>
    }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": <SMART request JSON string>
  }
}
```

For the stable response element, a Verifier SHOULD set `<intentToRetain>` to `true` unless the Verifier's workflow is genuinely ephemeral and the Verifier does not intend to retain the returned clinical content. A deployment profile MAY require a different value for particular workflows. A Wallet/Responder MAY display or consider the value during Holder review, but the value does not override Holder choice, Wallet policy, legal requirements, or §6 response semantics.

A Verifier SHALL CBOR-encode the `ItemsRequest` and wrap those bytes in CBOR tag 24. The resulting tag-24 item is the `DocRequest.itemsRequest` value. When computing reader authentication, the same tag-24 `ItemsRequest` bytes are the bytes bound into `ReaderAuthentication`.

A Verifier SHALL construct a `DeviceRequest` with version `"1.0"` and a `docRequests` array containing at least the SMART Health Check-in `DocRequest`:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": tag24(CBOR(ItemsRequest)),
      "readerAuth": <optional COSE_Sign1>
    }
  ]
}
```

This version 1.0 profile uses per-`DocRequest.readerAuth` when reader authentication is supplied. A Verifier SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as a substitute for this section unless a future version of this specification defines that mapping.

`readerAuth` is OPTIONAL in the core version 1.0 flow unless a deployment profile requires it. If a Verifier includes `readerAuth`, the Verifier SHALL construct it as a detached `COSE_Sign1` over `ReaderAuthentication` for this presentation session and this exact tag-24 `ItemsRequest`:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  tag24(CBOR(ItemsRequest))
]))

readerAuth = COSE_Sign1[
  protected:   bstr .cbor { 1: -7 },
  unprotected: deployment-defined certificate or key material,
  payload:     null,
  signature:   ES256 over Sig_structure with ReaderAuthenticationBytes as detached payload
]
```

A Verifier SHALL NOT reuse `readerAuth` across different `SessionTranscript` values or different `ItemsRequest` bytes. A deployment profile that requires reader authentication SHALL define the reader certificate, key distribution, and trust-anchor policy as described in §7.2.

The Verifier SHALL generate an HPKE recipient key pair for this presentation or otherwise use a key pair whose reuse is permitted by deployment policy and privacy requirements. For the base profile, the recipient public key SHALL be a COSE_Key for P-256 EC2 with labels `1: 2`, `-1: 1`, `-2: <x>`, and `-3: <y>`.

The Verifier SHALL construct `encryptionInfo` as CBOR for the following value and base64url-encode the resulting bytes without padding:

```text
encryptionInfo = [
  "dcapi",
  {
    "nonce": <fresh nonce bytes>,
    "recipientPublicKey": {
       1: 2,
      -1: 1,
      -2: <P-256 x-coordinate bytes>,
      -3: <P-256 y-coordinate bytes>
    }
  }
]
```

A Verifier SHALL use a fresh, unpredictable nonce with at least 16 bytes of entropy; 32 bytes is the expected size used by the active fixtures. The nonce is part of the DC API encryption information and session binding. It is not a SMART request identifier and does not replace `SmartHealthCheckinRequest.id`.

The Verifier SHALL base64url-encode the CBOR `DeviceRequest` bytes without padding and pass both encoded values to `navigator.credentials.get` in this shape:

```js
await navigator.credentials.get({
  mediation: "required",
  digital: {
    requests: [{
      protocol: "org-iso-mdoc",
      data: {
        deviceRequest: "<base64url CBOR DeviceRequest>",
        encryptionInfo: "<base64url CBOR encryptionInfo>"
      }
    }]
  }
});
```

Appendix D and Appendix E should point to checked-in request fixtures and byte ladders rather than inventing inline byte strings in this section. Known active fixture roots include `fixtures/dcapi-requests/ts-smart-checkin-basic/`, `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`, and `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`.

### 8.3 `SessionTranscript` construction

For this direct `dcapi` flow, the `SessionTranscript` is derived from the exact `encryptionInfo` base64url string supplied to the Browser / User Agent and the authenticated origin supplied by the Browser / User Agent or platform.

A Verifier and Wallet/Responder SHALL compute:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the unpadded base64url text value from the Digital Credentials API request. It is not the raw CBOR bytes and not a re-encoded or padded variant.

`origin` is the authenticated caller origin supplied by the Browser / User Agent or platform for the current presentation invocation. A Wallet/Responder SHALL NOT derive `origin` from the SMART request JSON, `purpose`, request item display text, selector URLs, request ids, relay URLs, or Artifact payloads. A Verifier SHALL use the same origin value that the Browser / User Agent binds into the invocation when it independently verifies the response. Platform-specific APIs for obtaining the origin are outside this normative core; they are implementation guidance unless a deployment profile makes them part of its conformance claim.

A Wallet/Responder that cannot obtain an authenticated origin needed for this construction SHALL treat origin trust as absent under §7.1.3 and SHALL NOT substitute an unauthenticated request field. If a Wallet/Responder proceeds under a reduced-assurance policy, it still SHALL use the presentation flow's defined `SessionTranscript` construction for the origin value that the platform actually supplied or fail the flow if no conforming construction is possible.

The `SessionTranscript` bytes computed here SHALL be used as:

1. the `SessionTranscript` value in optional `ReaderAuthentication` verification;
2. the `SessionTranscript` value in `DeviceAuthentication`; and
3. the HPKE `info` byte string for response encryption and opening.

Appendix E should provide annotated byte ladders for `dcapiInfo`, `handover`, and `SessionTranscript`. Active evidence includes vectors for `https://example.com`, `https://clinic.example`, and a real Chrome/Android capture whose origin is recorded in `fixtures/dcapi-requests/real-chrome-android-smart-checkin/metadata.json`.

### 8.4 Wallet-side request handling

A Wallet/Responder that handles this flow SHALL process the `org-iso-mdoc` request as follows before constructing a response.

1. Decode the `deviceRequest` base64url value and parse the CBOR `DeviceRequest`.
2. Locate a `DocRequest` whose tag-24 `itemsRequest` decodes to an `ItemsRequest` with `docType` `org.smarthealthit.checkin.1`.
3. Validate that the requested namespace contains `org.smarthealthit.checkin` and requests element `smart_health_checkin_response`.
4. Preserve the exact tag-24 `ItemsRequest` bytes for `readerAuth` verification when `readerAuth` is present.
5. Read `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and require it to be a string.
6. Parse that string as JSON and validate it as a SMART request under §5.
7. Decode and validate `encryptionInfo` and derive the `SessionTranscript` according to §8.3.
8. If `readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, verify it according to §7.2 and this section.
9. Conduct Holder review and per-item consent processing using the SMART request items as the response-accounting granularity.

A Wallet/Responder SHALL reject or fail the presentation request if the `DeviceRequest`, tag-24 wrapping, `ItemsRequest`, `requestInfo` carrier, SMART request JSON, `encryptionInfo`, or required session binding cannot be parsed or validated well enough to apply this section. If the SMART request is valid but particular request items cannot be fulfilled, the Wallet/Responder SHALL report per-item outcomes in the SMART response using §6.4 rather than treating ordinary declined, unavailable, unsupported, partial, or error outcomes as transport failures.

When `readerAuth` is absent, a Wallet/Responder SHALL treat reader authentication as absent. When `readerAuth` is present but malformed, cryptographically invalid, bound to different `ItemsRequest` bytes, bound to a different `SessionTranscript`, signed with an unsupported algorithm, or unacceptable under deployment policy, a Wallet/Responder SHALL treat reader authentication as failed. Absent and failed reader authentication are distinct trust states under §7.2.3.

A Wallet/Responder SHOULD make authenticated origin and, when successful, reader-authentication information available during Holder review when useful and safe under Wallet policy. A Wallet/Responder SHALL NOT present unauthenticated SMART request fields as verified requester identity.

### 8.5 Wallet-side response construction

After Holder review, the Wallet/Responder constructs a SMART response according to §6. The SMART response remains the clinical JSON object; the mdoc structures in this subsection are the presentation container.

A Wallet/Responder SHALL serialize the SMART response as JSON text and place that string in an `IssuerSignedItem` for namespace `org.smarthealthit.checkin`:

```text
IssuerSignedItem = {
  "digestID": <digest identifier>,
  "random": <issuer-signed-item random bytes>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": <SMART response JSON string>
}
```

A Wallet/Responder SHALL wrap each `IssuerSignedItem` in CBOR tag 24 before it is placed in `issuerSigned.nameSpaces`. A Wallet/Responder SHALL compute MSO value digests over the tag-24 `IssuerSignedItem` bytes and include the digest for namespace `org.smarthealthit.checkin` and the corresponding `digestID` in `MSO.valueDigests`. For this profile, the digest algorithm SHALL be SHA-256.

A Wallet/Responder SHALL construct an MSO whose signed document type is `org.smarthealthit.checkin.1`, whose value digests cover the disclosed `smart_health_checkin_response` element, and whose `deviceKeyInfo.deviceKey` is the device public key used for the device signature. A Wallet/Responder SHALL sign the MSO as `issuerAuth` using `COSE_Sign1` with protected `alg` `-7`; the `issuerAuth.payload` SHALL be the tag-24-wrapped MSO bytes. A deployment profile MAY define issuer certificate and trust-anchor requirements; §7.3 defines how Verifiers interpret issuer evidence.

A Wallet/Responder SHALL construct `DeviceNameSpaces` according to the ISO/IEC 18013-5 device-signed namespace model. Because the SMART Health Check-in response element in this profile is issuer-signed, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. A Wallet/Responder SHALL construct the `DeviceAuthentication` payload as:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

A Wallet/Responder SHALL produce a device `COSE_Sign1` signature using ES256 over the standard COSE `Signature1` structure with `DeviceAuthenticationBytes` as the detached payload, using the private key corresponding to `MSO.deviceKeyInfo.deviceKey`.

A Wallet/Responder SHALL build a `DeviceResponse` with version `"1.0"`, status `0` for successful presentation response construction, and a `documents` array containing a document with `docType` `org.smarthealthit.checkin.1`, the `issuerSigned` data described above, and device authentication containing the device signature.

Illustrative logical shape:

```text
DeviceResponse = {
  "version": "1.0",
  "documents": [{
    "docType": "org.smarthealthit.checkin.1",
    "issuerSigned": {
      "nameSpaces": {
        "org.smarthealthit.checkin": [tag24(CBOR(IssuerSignedItem))]
      },
      "issuerAuth": COSE_Sign1
    },
    "deviceSigned": {
      "nameSpaces": DeviceNameSpaces,
      "deviceAuth": { "deviceSignature": COSE_Sign1 }
    }
  }],
  "status": 0
}
```

Appendix C should provide exact CDDL aligned with the ISO/IEC 18013-5 data model. Appendix D should point to checked-in response fixtures, including `fixtures/responses/pymdoc-minimal/` and `fixtures/responses/real-chrome-android-smart-checkin/`.

### 8.6 HPKE encryption and DC API response envelope

A Wallet/Responder SHALL encrypt the CBOR `DeviceResponse` bytes to the Verifier's recipient public key from `encryptionInfo` using HPKE base mode with:

- KEM: DHKEM(P-256, HKDF-SHA256), id `0x0010`;
- KDF: HKDF-SHA256, id `0x0001`;
- AEAD: AES-128-GCM, id `0x0001`;
- `info`: the exact `SessionTranscript` bytes from §8.3;
- `aad`: the empty byte string.

The HPKE `enc` value in this profile is the ephemeral P-256 public key encoded as an uncompressed 65-byte point. The ciphertext is the AES-128-GCM ciphertext with authentication tag as produced by HPKE.

A Wallet/Responder SHALL wrap the HPKE output in CBOR as:

```text
dcapiResponse = [
  "dcapi",
  {
    "enc": <HPKE enc bytes>,
    "cipherText": <HPKE ciphertext bytes>
  }
]
```

The Wallet/Responder SHALL base64url-encode the CBOR `dcapiResponse` bytes without padding and return the Digital Credentials API response object with protocol `org-iso-mdoc`:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url CBOR dcapiResponse>"
  }
}
```

A Verifier SHALL use the same HPKE suite, the private key corresponding to `encryptionInfo.recipientPublicKey`, the exact `SessionTranscript` bytes from §8.3 as `info`, and empty `aad` to open the response. HPKE open failure is a transport failure; a Verifier SHALL NOT attempt to process unauthenticated plaintext after HPKE open fails.

### 8.7 Verifier-side processing

After `navigator.credentials.get` returns, a Verifier SHALL perform the following processing before the Requester consumes clinical content.

1. Confirm that the returned object identifies protocol `org-iso-mdoc` and contains `data.response` as a base64url string.
2. Base64url-decode and parse the CBOR `dcapiResponse` envelope.
3. Require the envelope to identify `"dcapi"` and contain `enc` and `cipherText` byte strings.
4. Recompute the `SessionTranscript` from the request `encryptionInfoBase64Url` and authenticated origin according to §8.3.
5. HPKE-open `cipherText` using `enc`, the Verifier recipient private key, the expected recipient public key, `info = SessionTranscript`, and empty `aad`.
6. Parse the plaintext as CBOR `DeviceResponse`.
7. Require `DeviceResponse.version` `"1.0"` and successful response status for the document being processed.
8. Locate exactly the SMART Health Check-in document and element expected by this flow, or fail if policy cannot unambiguously select one.
9. Verify `Document.docType` equals `org.smarthealthit.checkin.1`.
10. Verify `issuerAuth` as a `COSE_Sign1` using ES256 and validate the MSO according to ISO/IEC 18013-5-compatible processing and the applicable §7.3 trust-anchor policy.
11. Verify that the disclosed namespace is `org.smarthealthit.checkin`, the disclosed element identifier is `smart_health_checkin_response`, and the MSO digest for that namespace and `digestID` equals `SHA-256(tag24(IssuerSignedItem))`.
12. Verify device key proof by checking the device `COSE_Sign1` over `DeviceAuthentication` constructed with the same `SessionTranscript`, docType `org.smarthealthit.checkin.1`, and tag-24 `DeviceNameSpaces` bytes, using `MSO.deviceKeyInfo.deviceKey`.
13. Require the `smart_health_checkin_response` `elementValue` to be a string, parse it as JSON, and validate it as a SMART response under §6.
14. Apply the §6.6 cross-validation rules against the original SMART request, including `requestId` matching, `fulfills[]` resolution, media-type acceptance, `requestStatus[]` coverage, and FHIR/SMART Health Card checks.

A Verifier SHALL NOT treat HPKE success alone, `issuerAuth` success alone, device-signature success alone, or syntactic SMART response validity alone as sufficient validation. The Verifier must complete both mdoc/transport checks and §6.6 SMART response cross-validation before passing the response to the Requester or downstream receiver as protocol-valid.

A Verifier SHALL keep trust-layer results distinct when reporting or applying policy. For example, an accepted origin does not mean reader authentication succeeded; successful mdoc issuer/device validation does not prove raw FHIR JSON clinical-source provenance; and a valid SMART response can still be declined, partial, unavailable, unsupported, or insufficient for local ingestion.

### 8.8 Required validation checklist

A Verifier that claims support for the same-device `org-iso-mdoc` flow SHALL validate at least the following before accepting a response as protocol-valid:

- the original SMART request was valid under §5;
- `navigator.credentials.get` was invoked with protocol `org-iso-mdoc` and the fixed identifiers in §8.1;
- `DeviceRequest` used version `"1.0"`, a tag-24 `ItemsRequest`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and request carrier `org.smarthealthit.checkin.request`;
- `encryptionInfo` had the direct `dcapi` shape, a nonce meeting the profile's freshness requirements, and a P-256 recipient public key;
- `SessionTranscript` was recomputed from the request's `encryptionInfoBase64Url` and authenticated origin according to §8.3;
- if reader authentication is required by deployment policy, `readerAuth` was present, cryptographically valid, bound to the same `SessionTranscript` and exact tag-24 `ItemsRequest`, and accepted under the policy's trust anchors;
- the response `dcapi` envelope contained byte-string `enc` and `cipherText` values;
- HPKE open succeeded with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty `aad`;
- `DeviceResponse` parsed as CBOR and used version `"1.0"` with successful status for the document being accepted;
- the returned document `docType`, namespace, and element identifier matched the fixed SMART Health Check-in identifiers;
- `issuerAuth` verified as ES256 `COSE_Sign1`, and MSO issuer evidence met the applicable §7.3 deployment policy before production issuer trust was claimed;
- each disclosed `IssuerSignedItem` was tag-24 wrapped and its digest matched the corresponding MSO `valueDigests` entry using SHA-256;
- device authentication verified with the same `SessionTranscript`, docType, and tag-24 `DeviceNameSpaces`, using the MSO device key;
- `elementValue` for `smart_health_checkin_response` was a JSON string that parsed as a valid SMART response under §6; and
- §6.6 cross-validation succeeded against the original SMART request.

A Wallet/Responder that claims support for this flow SHALL validate at least the following before returning a response:

- the incoming request used protocol `org-iso-mdoc` and the fixed `docType`, namespace, request carrier, and response element identifiers;
- the tag-24 `ItemsRequest` bytes were preserved for any `readerAuth` verification;
- the SMART request JSON from `requestInfo` parsed and validated under §5;
- the `SessionTranscript` was derived according to §8.3 from platform-supplied origin information and the request `encryptionInfo`;
- absent and failed `readerAuth` states were distinguished under §7.2.3;
- Holder review and per-item response accounting used the SMART request items; and
- the returned `DeviceResponse`, issuer-signed item digests, device authentication, HPKE encryption, and outer DC API wrapper followed §§8.5-8.6.

### 8.9 Annotated end-to-end byte capture pointers

This section intentionally does not invent byte examples. The following checked-in fixture roots are the current evidence to be indexed by Appendix D and referenced by Appendix E byte ladders:

- `fixtures/dcapi-requests/ts-smart-checkin-basic/`: deterministic positive direct `org-iso-mdoc` request fixture with SMART payload, `EncryptionInfo`, and test-only HPKE recipient keypair.
- `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`: deterministic positive request fixture with per-`DocRequest.readerAuth`, exact tag-24 `ItemsRequest`, direct `dcapi` `SessionTranscript`, detached `COSE_Sign1`, and test-only reader certificate artifacts.
- `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`: real Chrome/Android Credential Manager request with decoded `DeviceRequest`, `ItemsRequest`, `EncryptionInfo`, exact `SessionTranscript`, and an intentionally public test-only RP HPKE private JWK for reopening the matching response fixture.
- `fixtures/responses/pymdoc-minimal/`: byte oracle for `IssuerSignedItem`, MSO `valueDigests`, `issuerAuth`, and a minimal SMART response document.
- `fixtures/responses/real-chrome-android-smart-checkin/`: matching real Android wallet response debug artifacts, encrypted `dcapi` wrapper, plaintext `DeviceResponse`, COSE/MSO sidecars, Python mdoc/COSE verification output, and saved HPKE-open inspection.

Appendix E should annotate the ladder from SMART request JSON to `ItemsRequest`, tag-24 `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `dcapiInfo`, `SessionTranscript`, optional `ReaderAuthentication`, `DeviceAuthentication`, HPKE `info`, `dcapiResponse`, plaintext `DeviceResponse`, and extracted SMART response. Appendix D should identify which fixture files carry each byte artifact and should flag intentionally public test-only private keys where present.

### Organizer notes

Strengths:

- Preserves the accepted layering: §8 carries the SMART request and SMART response but does not redefine §§5-6 clinical semantics.
- Makes the same-device direct `org-iso-mdoc` flow the normative base presentation flow and leaves kiosk wrapper behavior to later §9.
- Keeps origin, reader, issuer/device, and clinical-source trust states distinct, including absent vs. failed `readerAuth`.
- Defines the `SessionTranscript`, HPKE `info`, response envelope, stable element, and §6.6 validation dependencies precisely enough for byte-level tests.

Caveats:

- Exact ISO/IEC 18013-5 map labels and CDDL should be normalized in Appendix C against the fixture parser/generator before final publication.
- The issuerAuth/MSO and deviceSignature prose intentionally states required invariants without attempting to reproduce the full ISO text.
- Browser/User Agent behavior is treated as an assumption and origin source, not as a new browser conformance class.

Open issues:

- Whether core conformance should require authenticated origin for every same-device presentation remains a §4 / §8 / Appendix A closure question.
- Production reader certificate profiles, revocation, and trust-anchor distribution remain deployment-profile work.
- Production mdoc issuer trust-anchor or registry mechanics remain deployment-profile, §13, or future trust-framework work.
- Final fixture indexing should confirm whether current real Chrome/Android captures remain authoritative or are replaced after §8 and §9 stabilize.

Downstream dependencies:

- Appendix A needs one-row-per-rule entries for each Verifier and Wallet/Responder SHALL/SHOULD above.
- Appendix C needs CDDL for `DeviceRequest`, `ItemsRequest`, `ReaderAuthentication`, `DeviceResponse`, `DeviceAuthentication`, `dcapiResponse`, and related tag-24 bytes.
- Appendix D should index the named fixture roots and avoid adding nonexistent paths.
- Appendix E should derive byte ladders from this section and the checked-in fixtures.
- §11 should revisit replay/freshness, origin spoofing, reader impersonation, HPKE key reuse, UI redress, plaintext leakage, and raw-FHIR provenance overclaiming.
