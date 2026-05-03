## 13. Registry and IANA considerations

This section records the identifier spaces used by SMART Health Check-in 1.0 and the review process for future additions. It mirrors the identifiers defined normatively in §§4-9. It does not introduce alternate request fields, response fields, selector semantics, media-type compatibility rules, mdoc carriers, kiosk payload wrappers, or production trust anchors.

Registries in this section fall into four categories:

1. IANA media-type registrations or references for externally governed media types.
2. ISO/IEC 18013-5, Digital Credentials API, and related mdoc-ecosystem identifiers.
3. SMART Health Check-in-controlled registries for selector kinds, item status codes, profile identifiers, and deployment extensions.
4. JOSE `typ` usage for the kiosk request JWS.

Unless this section explicitly says that an identifier is already registered by another standards body, entries are requests, placeholders, or specification-controlled values for SMART Health Check-in 1.0. Implementers SHALL NOT represent placeholder text here as evidence that a permanent external registry assignment, production trust anchor, or certification program exists.

### 13.1 Media type registrations / references

SMART Health Check-in 1.0 uses media types in three different roles: clinical Artifact media types, kiosk wrapper metadata, and opaque storage blobs. Implementations SHALL interpret a media type according to the role in which it appears.

#### 13.1.1 Referenced clinical Artifact media types

The following media types are used in §5 `accept[]` and §6 Artifact `mediaType` values:

| Media type | Registry status in this specification | SMART Health Check-in use |
| --- | --- | --- |
| `application/fhir+json` | Externally defined by the FHIR ecosystem; referenced, not redefined. | Raw FHIR JSON Artifact. The Artifact SHALL carry `fhirVersion` and a FHIR Resource or Bundle as specified in §6.3.2. |
| `application/smart-health-card` | Externally defined by the SMART Health Cards ecosystem; referenced, not redefined. | SMART Health Card Artifact. The Artifact value is the file-style JSON object with `verifiableCredential[]`; the Artifact SHALL NOT carry an outer `fhirVersion`. |

SMART Health Check-in does not request new IANA registrations for these two externally defined clinical media types in this document. If the external specifications for FHIR or SMART Health Cards update their own registration status, SMART Health Check-in implementations should follow those source specifications without changing the SMART Health Check-in Artifact rules.

A future Artifact media type used for interoperable SMART Health Check-in responses SHALL have a stable media type string and SHALL define its payload shape, use of `value`, `url`, or `data`, FHIR-version semantics if any, dereferencing and integrity rules, security considerations, privacy considerations, and compatibility with core media types if any. A media type compatibility rule SHALL NOT be inferred from suffixes, display names, or local convention; it must be registered or explicitly profiled.

#### 13.1.2 Kiosk encrypted request content type

The kiosk request-envelope metadata uses:

```text
application/smart-health-checkin-kiosk-request+jws+aesgcm
```

as the exact value of `EncryptedKioskRequest.contentType` for the §9.5 version-1 encrypted request envelope. This value identifies a SMART Health Check-in kiosk request JWS encrypted with the §9 request-envelope suite labeled `ECDH-P256+HKDF-SHA256+AES-GCM` and `enc` `A256GCM`.

This specification treats `application/smart-health-checkin-kiosk-request+jws+aesgcm` as a SMART Health Check-in-controlled content-type value and a candidate media-type registration request. Until and unless an IANA registration is completed, deployments SHALL NOT claim that this value is permanently registered with IANA. The requested registration, if pursued, should include at least:

| Registration field | Requested value or note |
| --- | --- |
| Type name | `application` |
| Subtype name | `smart-health-checkin-kiosk-request+jws+aesgcm` |
| Required parameters | None. |
| Optional parameters | None defined by SMART Health Check-in 1.0. |
| Encoding considerations | 8bit when carried as JSON string metadata; the protected object is a JSON envelope whose `ciphertext` is base64url without padding. |
| Security considerations | See §§9 and 11. The value identifies encrypted wrapper state, not trust in the creator, requester, Holder, Wallet, or clinical content. Implementations must validate `v`, `alg`, `enc`, `contentType`, request-id binding, freshness, JWS signature, and deployment trust policy before using the embedded `smartRequest`. |
| Interoperability considerations | The value is specific to the version-1 kiosk request envelope. It is not a clinical Artifact media type and is not used in §5 `accept[]` or §6 Artifact `mediaType`. |
| Published specification | SMART Health Check-in 1.0, §§9.3-9.7 and Appendix C.K. |

#### 13.1.3 Opaque kiosk submission blobs

The active kiosk provider stores response-submission ciphertext bytes as an opaque blob with content type:

```text
application/octet-stream
```

This is a reference to the generic octet-stream media type for storage and transfer of encrypted bytes. It is not a new SMART Health Check-in Artifact media type, not a clinical response form, and not a substitute for `payload.kind`, `payload.smartResponse`, or §6 response validation. A provider row or blob content type of `application/octet-stream` is routing and storage metadata only.

### 13.2 mdoc registry entries

SMART Health Check-in 1.0 uses the W3C Digital Credentials API direct mdoc path with the Digital Credentials protocol id:

```text
org-iso-mdoc
```

This specification references `org-iso-mdoc` as the active direct mdoc protocol id used by browsers and platform credential APIs. It does not claim to create or register that protocol id in an IANA registry.

The SMART Health Check-in mdoc profile uses the following fixed version-1 values:

| Identifier kind | Value | Defined use |
| --- | --- | --- |
| mdoc `docType` | `org.smarthealthit.checkin.1` | The document type requested and returned by the §8 same-device flow. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the disclosed SMART response element. |
| Requested and disclosed element | `smart_health_checkin_response` | The stable issuer-signed element whose `elementValue` is the SMART response JSON string. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | `ItemsRequest.requestInfo` key whose value is the SMART request JSON string. |

These values are SMART Health Check-in profile identifiers for the mdoc/ISO ecosystem. They are intended to be submitted to the appropriate mdoc namespace, document-type, or profile registry if such a registry is available and applicable. Until an external registry accepts them, this specification defines them as the version-1 SMART Health Check-in profile values and does not claim external permanent assignment.

A future incompatible mdoc profile change SHOULD use a new profile identifier and, when necessary, a new `docType` suffix rather than changing the meaning of `org.smarthealthit.checkin.1`. A future same-device extension SHALL NOT model FHIR profiles, request items, questionnaires, Artifact media types, or status codes as separate mdoc elements in the core flow unless a future version explicitly replaces the stable-element design.

### 13.3 Status code registry

SMART Health Check-in maintains a specification-controlled registry for `SmartHealthCheckinResponse.requestStatus[].status` values. Version 1.0 defines the following initial entries:

| Code | Status | Semantics | Change controller |
| --- | --- | --- | --- |
| `fulfilled` | Permanent for version 1 | The Wallet/Responder believes the item was fully satisfied by returned Artifact content. | SMART Health Check-in specification. |
| `partial` | Permanent for version 1 | Some relevant Artifact content was returned, but complete fulfillment is not claimed. | SMART Health Check-in specification. |
| `unavailable` | Permanent for version 1 | The item and requested forms were understood, but no matching content was available or shareable for reasons other than Holder refusal. | SMART Health Check-in specification. |
| `declined` | Permanent for version 1 | The Holder declined, or Wallet policy treated the Holder decision as a refusal for the item. | SMART Health Check-in specification. |
| `unsupported` | Permanent for version 1 | The Wallet/Responder could not understand or support the item, selector, media type, FHIR version, Questionnaire, or extension well enough to attempt fulfillment. | SMART Health Check-in specification. |
| `error` | Permanent for version 1 | An operational or processing error occurred after the item was understood and was not simply declined, unavailable, or unsupported. | SMART Health Check-in specification. |

A Wallet/Responder SHALL use only these status codes in a SMART Health Check-in 1.0 response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless it has opted into that extension.

A status-code extension registration SHALL define the exact string value, item outcome semantics, whether Artifacts are expected or forbidden for the status, interaction with `required`, `accept[]`, selector processing, `message`, §6.6 validation, security considerations, privacy considerations, and fallback behavior for Verifiers that do not support the code. New status codes SHALL NOT redefine any of the six version-1 codes.

### 13.4 Content-selector kind registry

SMART Health Check-in maintains a specification-controlled registry for `SmartHealthCheckinRequest.items[].content.kind` values. Version 1.0 defines the following initial entries:

| Selector kind | Status | Selector shape | Summary |
| --- | --- | --- | --- |
| `fhir.resources` | Permanent for version 1 | §5.4.1 | Requests patient-specific FHIR resources using optional `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` selectors. |
| `questionnaire` | Permanent for version 1 | §5.4.2 | Requests completion of a FHIR Questionnaire by canonical, inline Questionnaire, or combined canonical plus resource. |

A Requester SHALL use one of these selector kinds or a registered extension selector. A Wallet/Responder that does not understand a selector kind SHALL NOT infer its semantics from `title`, `summary`, profile labels, local topic names, kiosk metadata, provider metadata, or wrapper field names. It SHALL reject the request or report the affected item as `unsupported` according to the selected flow and §6.

A selector-kind extension registration SHALL define the exact `content.kind` string, JSON shape, clinical meaning, content-satisfaction rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, Artifact fulfillment, unsupported behavior, validation rules, examples, security considerations, and privacy considerations. Registrants SHOULD choose collision-resistant names, such as reverse-DNS or URI-like names, unless the registry later defines a stricter syntax.

A selector-kind registration SHALL NOT redefine `fhir.resources`, `questionnaire`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, request `type`, request `version`, request `id`, `purpose`, requester identity handling, Holder control, or response validation.

### 13.5 Profile-id registry

SMART Health Check-in maintains a registry of profile identifiers for conformance claims, deployment profiles, fixture profiles, provider profiles, and future extension profiles. A profile identifier names a coherent set of rules outside the clinical request body. A profile identifier SHALL NOT be placed in a SMART request as `requestProfile`, preset id, IPS shortcut, profile-family shortcut, “all of the above” label, topic label, or negotiation field.

Until the profile-id registry syntax is finalized, §4 defines these provisional documentation and test-report labels:

| Provisional label | Scope |
| --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-kiosk-1` | Cross-device §9 kiosk wrapper support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | Reserved placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

These labels are not wire fields, clinical selectors, Artifact media types, status codes, request presets, or production trust anchors. They are provisional labels for conformance statements until a final registry syntax is adopted.

A future profile-id registration SHALL state the identifier, version or versioning rule, conformance targets, required and optional features, affected sections, validation requirements, trust layers in scope, security considerations, privacy considerations, and whether the profile is a deployment profile, extension profile, provider profile, fixture profile, or reserved future-binding profile. A deployment profile MAY impose stricter trust, validation, media-type, selector, size, expiration, replay, retention, or fixture requirements, but SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, core selector kinds, Artifact media types, fulfillment links, status codes, same-device carriers, kiosk `smartRequest` embedding, pointer-only QR behavior, or the untrusted-relay model.

### 13.6 JWS `typ` registry entry

The cross-device kiosk request wrapper uses a compact JWS whose protected header contains:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

The `typ` value:

```text
smart-health-checkin+kiosk-request+jws
```

identifies a SMART Health Check-in kiosk request JWS carrying the §9.4 `KioskRequestPayload`. It is not the SMART request `type`, not the SMART response `type`, not an Artifact media type, not a profile id, and not a trust anchor.

This specification defines `smart-health-checkin+kiosk-request+jws` as the version-1 kiosk JWS type value and as a candidate entry for the appropriate JOSE or application registry if such registration is pursued. Until registration is completed, deployments SHALL NOT claim that it is a permanent external JOSE registry entry. A Phone presenter supporting the kiosk profile SHALL require this exact `typ` value and reject another value unless a future profile explicitly defines compatible handling.

A future JWS-type registration for SMART Health Check-in SHALL define the protected-header `typ`, allowed `alg` values, payload type, signing-input serialization rules, key-identification rules, verification and trust-policy requirements, relationship to media types and profile ids, security considerations, privacy considerations, and fallback behavior. New JWS `typ` values SHALL NOT change the meaning of the version-1 kiosk `KioskRequestPayload` under the existing `smart-health-checkin+kiosk-request+jws` value.

### 13.7 Designated expert review process

SMART Health Check-in registries use designated expert review for additions that affect interoperability. The designated expert's task is to protect the semantics and trust boundaries already defined in the specification, not to approve private business arrangements or production trust anchors.

#### 13.7.1 Registrations requiring review

The following additions require designated expert review before they are treated as interoperable SMART Health Check-in registrations:

- new content-selector kinds;
- new status codes;
- new Artifact media types or media-type compatibility rules for SMART Health Check-in use;
- profile identifiers other than provisional labels in §13.5;
- kiosk completion payload kinds other than `smart-health-checkin-response`;
- provider profiles that claim interoperability beyond local deployment configuration;
- new kiosk wrapper content types, cryptographic suite labels, or JWS `typ` values;
- mdoc `docType`, namespace, element, or request-carrier changes for future SMART Health Check-in mdoc profiles.

External registries such as IANA media types, FHIR canonical URLs, SMART Health Cards issuer metadata, JOSE algorithms, COSE algorithms, ISO/IEC mdoc structures, and Digital Credentials API protocol identifiers remain governed by their own processes. SMART Health Check-in review can reference those identifiers, but it does not replace external registration or trust-policy review.

#### 13.7.2 Review criteria

The designated expert SHOULD approve a registration only when the registration:

1. defines a stable, collision-resistant identifier and change controller;
2. states whether the entry is permanent, provisional, experimental, deployment-specific, fixture-only, or reserved;
3. defines the exact JSON, CBOR, JOSE, media-type, or mdoc shape affected by the entry;
4. states processing rules for Requesters, Wallets/Responders, Verifiers, Phone presenters, Kiosk creators, Completion displays, Submission services, or profile authors as applicable;
5. defines validation rules and unsupported behavior;
6. preserves `SmartHealthCheckinRequest.type` `smart-health-checkin-request`, `SmartHealthCheckinResponse.type` `smart-health-checkin-response`, and version-1 request/response semantics unless the entry is explicitly for a future incompatible version;
7. preserves core selector semantics, including `fhir.resources`, `questionnaire`, additive `profiles[]` plus `profilesFrom[]`, and per-item `accept[]` rules;
8. preserves core response semantics, including `mediaType`, `fulfills[]`, `requestStatus[]`, and §6.6 cross-validation;
9. preserves the §8 `org-iso-mdoc` carrier values unless the entry is explicitly a future mdoc profile;
10. preserves the §9 direct `smartRequest` embedding, wrapper `requestId` versus `smartRequest.id` distinction, pointer-only `r` behavior for the active profile, untrusted-relay model, and crypto-boundary separation;
11. includes security and privacy considerations proportionate to the entry; and
12. identifies any dependencies on external standards, external registries, deployment trust policy, or future specification work.

The designated expert SHOULD reject or request revision of a registration that introduces requester identity fields into the SMART request body, converts profile ids into in-band request selectors, relies on presets or broad shortcuts instead of §5 selectors, weakens Holder control, requires untrusted relays to see plaintext clinical content, conflates wrapper and clinical request ids, treats demo keys as production trust anchors, bypasses §6.6 cross-validation, or claims clinical-source provenance for unsigned raw FHIR JSON from transport success alone.

#### 13.7.3 Provisional, private, and deployment entries

Private or deployment-local identifiers MAY be used within a controlled deployment when all participants are configured for them and the deployment accepts the interoperability risk. Such identifiers SHALL be documented as local, SHALL NOT be represented as SMART Health Check-in-wide registrations, and SHALL NOT be used when interoperable processing by unrelated implementations is expected.

A provisional entry MAY be allocated to support testing, fixture development, or implementation experience. A provisional entry SHALL state its expiration, review checkpoint, or promotion criteria. Provisional entries SHALL NOT be used to claim permanent conformance unless and until they are promoted by the registry process.

Fixture and diagnostic profiles SHALL label demo certificates, self-signed keys, intentionally public private keys, deterministic randomness, synthetic data, real-platform captures, and historical captures clearly. Registry review of a fixture profile does not make fixture keys or captures production trust material.

## Organizer notes

### Strengths

- Mirrors the canonical identifiers from T2, T3, T4, and T5.A without inventing new request fields or alternate carriers.
- Separates IANA media-type considerations, mdoc/ISO ecosystem identifiers, SMART Health Check-in-controlled registries, JOSE `typ` usage, provisional conformance labels, and deployment/future profiles.
- Preserves the active kiosk constants: `application/smart-health-checkin-kiosk-request+jws+aesgcm`, `smart-health-checkin+kiosk-request+jws`, `ECDH-P256+HKDF-SHA256+AES-GCM`, `A256GCM`, the two HKDF info strings, `application/octet-stream`, pointer parameter `r`, and payload kind `smart-health-checkin-response`.

### Caveats

- The draft intentionally avoids claiming completed IANA, JOSE, ISO, or Digital Credentials API registrations. It phrases those as references, specification-controlled values, or candidate registration requests.
- The media-type registration sketch for the kiosk encrypted request is suitable as a placeholder, but a real IANA template would need final author/change-controller/contact text.
- The mdoc registration language depends on which ISO/IEC or ecosystem registry is available for `docType`, namespace, and element naming.

### Open questions

- Should the final spec create formal registry tables with columns such as reference, change controller, status, and date for every SMART Health Check-in-controlled registry?
- Should `application/smart-health-checkin-kiosk-request+jws+aesgcm` be pursued as a true IANA media type, or remain an internal `contentType` discriminator in version 1.0?
- What final syntax should replace the provisional §4 profile labels, if any? URI, URL, reverse-DNS, or short token syntax all remain possible.
- Should future kiosk completion payload kinds have their own registry table separate from profile ids and selector/status registries?

### Downstream dependencies

- T5.F should add checklist rows for registry-controlled identifiers, unknown status-code rejection, unknown selector behavior, no in-band `requestProfile`, and designated expert review requirements.
- T6 examples and fixture indexes should cite provisional labels only as documentation/test-report labels unless §13 finalizes a stable profile-id syntax.
- T7 future-work text should keep production issuer, reader, creator-key, provider, and external registry work clearly separated from the version-1 protocol identifiers recorded here.
