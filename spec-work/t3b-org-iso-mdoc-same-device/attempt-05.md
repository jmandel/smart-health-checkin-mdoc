## 8. Same-device presentation flow over `org-iso-mdoc`

This section defines the base SMART Health Check-in 1.0 presentation flow. It carries the transport-neutral SMART request defined in §5 and returns the transport-neutral SMART response defined in §6 by using direct `org-iso-mdoc` over the W3C Digital Credentials API on the same device as the Wallet. Kiosk flows in §9 re-enter this flow; they do not redefine the clinical request or response model.

The trust interpretation of origin evidence, optional reader authentication, mdoc issuer/device evidence, and clinical-source provenance is defined in §7. This section defines the wire construction and validation steps for the same-device binding. Security considerations in §11, CDDL in Appendix C, fixture indexing in Appendix D, and byte ladders in Appendix E provide additional detail without creating alternate behavior.

### 8.1 Identifiers

Version 1.0 of this flow uses the following fixed identifiers.

| Identifier | Value |
| --- | --- |
| Digital Credentials API protocol id | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Stable response element identifier | `smart_health_checkin_response` |
| SMART request carrier key | `org.smarthealthit.checkin.request` in `ItemsRequest.requestInfo` |
| HPKE KEM/KDF/AEAD | `DHKEM(P-256, HKDF-SHA256)`, `HKDF-SHA256`, `AES-128-GCM` |
| COSE signature algorithm | ES256, COSE `alg` `-7` |

A Verifier SHALL request `protocol` `org-iso-mdoc`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response` when invoking this flow. A Wallet/Responder SHALL NOT treat another `docType`, namespace, element identifier, or request carrier as equivalent to this profile unless a future version or explicit deployment profile defines a compatible profile identifier.

The SMART request is carried only as a JSON string value at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. The SMART response is carried as the string `elementValue` of the disclosed mdoc issuer-signed item whose `elementIdentifier` is `smart_health_checkin_response`. Dynamic element-name encodings and archived claim-name experiments are not part of the version 1.0 base flow.

### 8.2 Verifier-side request construction

A Verifier constructs a same-device request from an already valid SMART request. The Verifier SHALL NOT add requester identity, origin, reader identity, kiosk wrapper state, or trust-framework claims to the SMART request body; those facts belong to this presentation flow, §7 policy processing, or §9 kiosk wrappers.

#### 8.2.1 SMART JSON serialization for `requestInfo`

A Verifier SHALL serialize the SMART request as UTF-8 JSON conforming to §5. The serialized JSON text is the string value stored in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. This section does not require a canonical JSON serialization for the SMART request, but the Verifier SHALL preserve the exact serialized string for request inspection, `readerAuth` construction when used, and fixture or byte-ladder comparison.

A Wallet/Responder SHALL parse the recovered string as the SMART request JSON object and validate it under §5 before using it for Holder review or response construction.

#### 8.2.2 `ItemsRequest` shape

A Verifier SHALL construct one `ItemsRequest` for the SMART Health Check-in document with this logical shape:

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

The `nameSpaces` entry requests exactly the stable response element for the core profile. A Verifier MAY request additional elements only when a future registered extension or deployment profile defines their identifiers and validation semantics. A Wallet/Responder that implements only this core profile MAY reject, ignore, or report unsupported for unknown additional elements according to local policy, but it SHALL NOT reinterpret them as request items or SMART response Artifacts.

#### 8.2.3 `intentToRetain` default

For `smart_health_checkin_response`, the Verifier SHALL encode the `intentToRetain` value as `true` unless the Verifier has a concrete deployment reason to request ephemeral use. This default reflects ordinary check-in workflows in which returned Artifacts are ingested into a portal, EHR, payer, intake, or administrative workflow.

If a deployment profile permits `intentToRetain: false`, it SHALL define how that signal is displayed to the Holder and how it constrains retention by the Verifier or Requester. The mdoc `intentToRetain` flag does not override legal requirements, Holder consent requirements, §12 privacy requirements, or downstream retention policy.

#### 8.2.4 `DeviceRequest` version 1.0 shape

A Verifier SHALL encode a `DeviceRequest` with `version` equal to the exact string `"1.0"` and a `docRequests` array containing the `DocRequest` for this profile:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": Tag(24, CBOR(ItemsRequest)),
      "readerAuth": COSE_Sign1 / optional
    }
  ]
}
```

Version 1.0 of this profile uses per-`DocRequest.readerAuth` when reader authentication is included. A Verifier SHALL NOT use version `"1.1"` `readerAuthAll` as the core SMART Health Check-in 1.0 mechanism unless a future revision defines that mapping.

#### 8.2.5 Tag-24 wrapping invariant

The `itemsRequest` field SHALL be CBOR tag 24 wrapping the exact CBOR serialization of `ItemsRequest`. The wrapped bytes are used as the detached request bytes for optional `readerAuth`. A Verifier that signs `readerAuth` SHALL sign the same tag-24 `ItemsRequest` bytes that appear in the `DeviceRequest`. A Wallet/Responder that verifies `readerAuth` SHALL preserve or reconstruct those exact bytes for verification.

Appendix C will define CDDL labels for these structures. Appendix E will provide byte-ladder examples for the tag-24 boundary.

#### 8.2.6 Optional per-`DocRequest.readerAuth`

A Verifier MAY include `DocRequest.readerAuth` as a detached `COSE_Sign1` over `ReaderAuthentication`. If included, the Verifier SHALL construct the detached payload as:

```text
ReaderAuthenticationBytes = Tag(24, CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

where `SessionTranscript` is the CBOR data item defined in §8.3 and `ItemsRequestBytes` is the tag-24 `ItemsRequest` data item from §8.2.5.

The `COSE_Sign1` protected header SHALL include `{1: -7}` for ES256. The `payload` field SHALL be `null` because the payload is detached. When certificate material is supplied, it SHALL be carried in the COSE unprotected header location defined by the applicable COSE/X.509 conventions and deployment profile; active fixtures use header `33` (`x5chain`) containing reader certificate DER. A Verifier SHALL NOT reuse `readerAuth` across different `SessionTranscript` bytes or different `ItemsRequest` bytes.

`readerAuth` is optional in the core version 1.0 flow unless a deployment profile requires it. Absent `readerAuth` and failed `readerAuth` are distinct trust states under §7.2.3.

#### 8.2.7 HPKE recipient keypair

For each presentation request, the Verifier SHALL generate or select an HPKE recipient keypair for `DHKEM(P-256, HKDF-SHA256)` and retain the private key until the response is opened or the request expires. A Verifier SHOULD use a fresh recipient keypair for each presentation session. A deployment profile that reuses recipient keys SHALL define replay, correlation, retention, and key-compromise handling.

The public key placed in `encryptionInfo` SHALL be a COSE_Key for P-256 EC2 with at least these members:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: <x-coordinate bstr>,
  -3: <y-coordinate bstr>
}
```

#### 8.2.8 `encryptionInfo` CBOR construction

A Verifier SHALL construct `encryptionInfo` as the CBOR serialization of:

```text
[
  "dcapi",
  {
    "nonce": <32 random bytes>,
    "recipientPublicKey": <Verifier P-256 COSE_Key>
  }
]
```

The `nonce` value is part of the DC API encryption information and the `SessionTranscript` binding. It is not a substitute for the SMART request `id`, response `requestId`, reader authentication, or issuer/device validation. A Verifier SHALL base64url-encode the exact `encryptionInfo` CBOR bytes without padding when placing them in the Digital Credentials API request.

#### 8.2.9 `navigator.credentials.get(...)` argument

A Verifier invokes the Browser / User Agent with a Digital Credentials API request equivalent to:

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

A Verifier SHALL use base64url without padding for `data.deviceRequest` and `data.encryptionInfo`. A Browser / User Agent is assumed to mediate this request according to the W3C Digital Credentials API and platform policy, including origin or caller-context handling. This specification does not define a separate Browser / User Agent conformance class beyond the assumptions explicitly used by this flow.

#### 8.2.10 Examples and byte ladder pointers

Appendix D indexes checked-in same-device fixtures. Appendix E provides the byte ladder for `DeviceRequest`, tag-24 `ItemsRequest`, `encryptionInfo`, `dcapiInfo`, `SessionTranscript`, optional `readerAuth`, and response encryption. This section intentionally does not duplicate full byte strings.

### 8.3 `SessionTranscript` construction

Both the Verifier and Wallet/Responder SHALL compute the same direct `dcapi` `SessionTranscript` bytes for this flow. The `SessionTranscript` is the exact CBOR serialization of the following data item:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the unpadded base64url string placed in `navigator.credentials.get(...).digital.requests[0].data.encryptionInfo`, not a re-encoded diagnostic string and not raw hex. `origin` is the serialized origin string for the invoking Verifier context, obtained as described below. The SHA-256 input is the exact CBOR bytes of `[encryptionInfoBase64Url, origin]`. The `SessionTranscript` bytes are used as HPKE `info` in §8.6 and inside the mdoc `DeviceAuthentication` payload in §8.5.5.

A Verifier SHALL compute `origin` from its authenticated calling context, normally the page origin as serialized by the Browser / User Agent. A Wallet/Responder SHALL obtain origin or privileged-caller evidence from the Browser / User Agent or platform through an authenticated channel. A Wallet/Responder SHALL NOT derive `origin` from the SMART request JSON, `purpose`, item display text, selector URLs, request ids, callback-looking strings, kiosk pointer state, or Artifact content.

If the Wallet/Responder cannot obtain authenticated origin or deployment-approved privileged-caller context sufficient to compute the `SessionTranscript`, it SHALL fail this same-device flow or proceed only under an explicit deployment profile that defines the caller-context evidence, serialized origin-equivalent value, resulting assurance level, Holder display, and Verifier validation behavior. A deployment profile SHALL NOT use this exception to move requester identity metadata into the SMART request body.

### 8.4 Wallet-side request handling

A Wallet/Responder that receives a candidate direct `org-iso-mdoc` request SHALL recover the `DeviceRequest`, locate a `DocRequest` for `docType` `org.smarthealthit.checkin.1`, and decode its tag-24 `itemsRequest`. The Wallet/Responder SHALL validate that the `ItemsRequest` requests namespace `org.smarthealthit.checkin` and element `smart_health_checkin_response` and includes `requestInfo["org.smarthealthit.checkin.request"]` as a string.

The Wallet/Responder SHALL parse that string as UTF-8 JSON and validate the resulting SMART request under §5. It SHALL reject the presentation request, report an unsupported/error outcome where the selected platform permits, or otherwise fail safely if the SMART request is absent, not a string, not parseable JSON, not a JSON object, or invalid under §5. The Wallet/Responder SHALL NOT infer request semantics from mdoc element names, display text, archived dynamic-element encodings, or unknown request fields.

The Wallet/Responder SHALL reconstruct `SessionTranscript` exactly as defined in §8.3 using the `encryptionInfo` value supplied by the Digital Credentials API request and the authenticated origin or caller-context value supplied by the platform. If `readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, it SHALL verify the `COSE_Sign1` signature, detached `ReaderAuthentication` payload, signed `SessionTranscript`, signed tag-24 `ItemsRequest` bytes, protected algorithm, signing key, certificate or key evidence, and deployment trust policy. If `readerAuth` is absent, the Wallet/Responder SHALL treat reader authentication as absent. If `readerAuth` is present but malformed, cryptographically invalid, mismatched, expired, unsupported, or unacceptable under policy, the Wallet/Responder SHALL treat reader authentication as failed and keep that state distinct from absence.

After request and trust processing, the Wallet/Responder SHALL run Holder review at the granularity of request items, subject to Wallet policy, accessibility, safety, localization, and applicable law. Holder review SHALL use the SMART request item ids for accounting, but it SHALL NOT present unauthenticated SMART request text as authenticated requester identity. The Wallet/Responder MAY decline, partially fulfill, report unavailable, report unsupported, or report error for any item according to §6.4.

### 8.5 Wallet-side response construction

A Wallet/Responder that proceeds SHALL construct a SMART response under §6. The response `requestId` SHALL exactly equal the SMART request `id`; `artifacts[]`, `fulfills[]`, and `requestStatus[]` SHALL follow §§6.1-6.5. The SMART response JSON is then carried as the mdoc issuer-signed element value for `smart_health_checkin_response`.

The Wallet/Responder SHALL create an `IssuerSignedItem` for namespace `org.smarthealthit.checkin` with:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": JSON.stringify(SmartHealthCheckinResponse)
}
```

The Wallet/Responder SHALL wrap each `IssuerSignedItem` in CBOR tag 24 before digesting and disclosing it. The MSO `valueDigests["org.smarthealthit.checkin"][digestID]` value SHALL equal `SHA-256(Tag(24, CBOR(IssuerSignedItem)))` for the disclosed item. The MSO `docType` SHALL be `org.smarthealthit.checkin.1`, and the MSO `digestAlgorithm` SHALL be `SHA-256` for this profile. The MSO SHALL include `deviceKeyInfo.deviceKey` for the device key used to authenticate the response.

The Wallet/Responder SHALL sign the MSO as `issuerAuth` using `COSE_Sign1` with protected `alg` ES256 (`-7`) and a tag-24-wrapped MSO payload, following the ISO/IEC 18013-5 mdoc data model and applicable issuer trust policy. A self-attested or deployment-local Wallet model MAY be used only as permitted by §7.3.3 and deployment policy; it does not create clinical-source provenance for unsigned raw FHIR JSON.

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same presentation session as:

```text
DeviceAuthentication = Tag(24, CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  Tag(24, CBOR(DeviceNameSpaces))
]))
```

where `DeviceNameSpaces` is the device-signed namespaces data item used by the mdoc response. The Wallet/Responder SHALL sign the corresponding `COSE_Sign1` `deviceSignature` with the private key corresponding to `MSO.deviceKeyInfo.deviceKey`, using ES256 (`-7`) unless a future algorithm profile is defined.

The Wallet/Responder SHALL return a `DeviceResponse` CBOR plaintext with logical shape:

```text
DeviceResponse = {
  "version": "1.0",
  "documents": [Document],
  "status": 0
}
```

The `Document.docType` SHALL be `org.smarthealthit.checkin.1`. The document SHALL disclose the issuer-signed namespace item carrying `smart_health_checkin_response` and SHALL include the device signature required to bind the response to the `SessionTranscript`.

### 8.6 HPKE encryption

The Wallet/Responder SHALL encrypt the CBOR `DeviceResponse` plaintext to the Verifier public key from `encryptionInfo` using HPKE with `DHKEM(P-256, HKDF-SHA256)`, `HKDF-SHA256`, and `AES-128-GCM`. The HPKE `info` parameter SHALL be the exact `SessionTranscript` bytes from §8.3. The HPKE `aad` SHALL be the empty byte string.

The HPKE `enc` value SHALL be the serialized ephemeral P-256 public key for the KEM; active fixtures encode it as the 65-byte uncompressed P-256 public point. The `cipherText` value SHALL be the AES-128-GCM ciphertext with authentication tag as produced by HPKE sealing.

The Wallet/Responder SHALL wrap the HPKE output as CBOR:

```text
dcapiResponse = [
  "dcapi",
  {
    "enc": <HPKE enc bstr>,
    "cipherText": <HPKE ciphertext bstr>
  }
]
```

The Wallet/Responder SHALL then return the Digital Credentials API response object:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

### 8.7 Verifier-side processing

A Verifier receiving a Digital Credentials API result SHALL first require `protocol` to equal `org-iso-mdoc` and `data.response` to be an unpadded base64url string. It SHALL decode `data.response` as the CBOR `dcapiResponse` from §8.6 and require the `"dcapi"` label, `enc`, and `cipherText` members.

The Verifier SHALL reconstruct the same `SessionTranscript` bytes from the original `encryptionInfo` base64url string and origin used for the request. It SHALL HPKE-open `cipherText` using its recipient private key, the received `enc`, the same HPKE suite, `info = SessionTranscript`, and empty `aad`. If HPKE opening fails, the Verifier SHALL reject the response.

After HPKE opening, the Verifier SHALL parse the plaintext as CBOR `DeviceResponse`. It SHALL require `version` `"1.0"`, successful response `status`, at least one document, and a document with `docType` `org.smarthealthit.checkin.1`. For the selected document, the Verifier SHALL validate `issuerAuth` according to ISO/IEC 18013-5, COSE, and §7.3 trust policy, including certificate or key evidence when issuer trust is required.

The Verifier SHALL locate the disclosed issuer-signed item in namespace `org.smarthealthit.checkin` with `elementIdentifier` `smart_health_checkin_response`. It SHALL recompute `SHA-256(Tag(24, CBOR(IssuerSignedItem)))` over the exact tag-24 disclosed item and compare it with `MSO.valueDigests["org.smarthealthit.checkin"][digestID]`. If the digest is absent, mismatched, or bound to a different namespace, element identifier, or document type, the Verifier SHALL reject the response.

The Verifier SHALL verify the mdoc `deviceSignature` using `MSO.deviceKeyInfo.deviceKey` and the `DeviceAuthentication` payload that contains the same `SessionTranscript`, `docType`, and tag-24 `DeviceNameSpaces` bytes for this response. If device-key proof fails or is not bound to the expected session, the Verifier SHALL reject the response.

The Verifier SHALL parse the disclosed `elementValue` as the SMART response JSON string and validate it under §6. It SHALL then apply the §6.6 cross-validation rules against the original SMART request before passing content to the Requester or downstream receiver. Transport success, issuerAuth success, digest success, and deviceSignature success do not replace §6.6 validation and do not create clinical-source trust for unsigned raw FHIR JSON under §7.4.

### 8.8 Required validation checklist

A Verifier SHALL perform all of the following checks before accepting a same-device SMART Health Check-in response for use:

1. Confirm the Digital Credentials API result uses `protocol` `org-iso-mdoc` and has `data.response` as base64url without padding.
2. Decode `dcapiResponse` and require label `"dcapi"`, `enc`, and `cipherText`.
3. Recompute `SessionTranscript` from the original `encryptionInfo` base64url string and origin.
4. HPKE-open using `DHKEM(P-256, HKDF-SHA256)`, `HKDF-SHA256`, `AES-128-GCM`, `info = SessionTranscript`, and empty `aad`.
5. Parse the plaintext `DeviceResponse` and require `version` `"1.0"`, successful `status`, and `docType` `org.smarthealthit.checkin.1`.
6. Validate `issuerAuth`, including COSE ES256 signature, MSO payload, document type, validity information, and issuer trust-anchor policy when issuer trust is required.
7. Locate namespace `org.smarthealthit.checkin` and element `smart_health_checkin_response`.
8. Recompute and compare the SHA-256 digest of the tag-24 `IssuerSignedItem` against the MSO `valueDigests` entry.
9. Verify `deviceSignature` against `MSO.deviceKeyInfo.deviceKey` using the expected `DeviceAuthentication` payload and `SessionTranscript`.
10. Parse the element value as SMART response JSON and validate `type`, `version`, `requestId`, Artifacts, media types, fulfillment links, and status entries under §6.
11. Apply all §6.6 cross-validation checks against the original SMART request.
12. Apply §7 trust policy and deployment policy for origin, reader authentication state, issuer/device assurance, clinical-source provenance, raw FHIR handling, SMART Health Card validation, patient matching, and downstream workflow acceptance.

A Wallet/Responder SHALL perform the corresponding request-side checks needed to avoid presenting malformed, unbound, or policy-unacceptable requests to the Holder, including SMART request validation, `ItemsRequest` validation, `SessionTranscript` construction, and optional `readerAuth` handling as described in §8.4.

### 8.9 Annotated end-to-end byte capture

Appendix D should point to the checked-in same-device fixture sets rather than inventing new paths in this section. Current active evidence includes fixture directories named:

```text
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/real-chrome-android-smart-checkin/
```

The annotated capture should preserve byte boundaries for at least the navigator argument, `device-request.cbor`, tag-24 `items-request.cbor`, `request-info.json`, `encryption-info.cbor`, `session-transcript.cbor`, wallet Digital Credential response, `dcapi-response.cbor`, decrypted `device-response.cbor`, extracted `smart-request.json`, extracted `smart-response.json`, and independent verification reports where available. Appendix E should show how each byte string is derived; Appendix C should supply the matching CDDL.

## Organizer notes

### Strengths

- Preserves the accepted architectural split: §§5-6 define transport-neutral SMART clinical objects; §8 only carries and validates them.
- Keeps the exact active identifiers: `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`.
- Makes same-device direct mdoc the normative base flow and leaves kiosk wrapper behavior to §9.
- Distinguishes absent `readerAuth` from failed `readerAuth` and ties trust interpretation back to §7.
- Includes both mdoc/transport checks and mandatory §6.6 SMART response cross-validation.

### Caveats

- The MSO, `DeviceNameSpaces`, and COSE details are expressed at a profile level and should be reconciled against final Appendix C CDDL and ISO/IEC 18013-5 terminology.
- The text normatively says the `encryptionInfo` nonce is 32 random bytes, matching active docs and fixtures; if conformance closure wants “at least 16 bytes” to match helper code, §8.2.8 should be adjusted deliberately.
- The exact COSE header location for reader certificate chains is left to COSE/X.509 conventions and deployment profile, while noting the active `x5chain` header evidence.

### Open issues

- Decide whether core conformance requires authenticated origin for every same-device flow or allows a deployment-defined privileged-caller origin-equivalent value.
- Decide how much of ISO/IEC 18013-5 issuer certificate validation, validityInfo processing, and status-code handling belongs in §8 versus §11, Appendix C, or deployment profiles.
- Decide whether additional response elements can ever coexist with the stable core element in version 1.0, or whether they should be prohibited until an extension registry is complete.

### Downstream dependencies

- Appendix A needs one row per SHALL/SHOULD from this section, separated by Verifier, Wallet/Responder, and deployment-profile targets.
- Appendix C needs CDDL for `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `dcapiResponse`, SMART Check-in `IssuerSignedItem`, and the relevant `DeviceAuthentication` structures.
- Appendix D should index the real Chrome/Android same-device fixtures and any generated deterministic vectors without changing the normative field names.
- Appendix E should provide the byte ladder for tag-24 wrapping, `dcapiInfo`, `SessionTranscript`, HPKE `info`, `readerAuth`, issuer digest, and device authentication.
- §11 should revisit replay/freshness, origin spoofing, reader impersonation, cryptographic agility, plaintext logging, and raw FHIR overclaiming using these exact §8 mechanics.
