## 4. Conformance

This section defines how implementations claim conformance to SMART Health Check-in 1.0. It is a map over obligations defined in §§5-9 and the supporting appendices; it does not create alternate request, response, same-device, kiosk, trust, schema, CDDL, fixture, security, privacy, or registry behavior.

A conformance claim SHALL identify the implemented conformance target or targets, the claimed feature set or profile, the specification version, and any deployment profile that changes policy choices left open by this specification. One product MAY implement multiple targets, but it SHALL satisfy the requirements for each target and feature it claims.

### 4.1 Conformance targets

#### 4.1.1 Requester / Verifier

A **Requester** constructs a SMART request and consumes a SMART response under the clinical model in §§5-6. A Requester claiming core clinical conformance SHALL construct `SmartHealthCheckinRequest` objects according to §5 and SHALL request only Artifact media types it is prepared to process for the corresponding item.

A **Verifier** packages a SMART request for a claimed presentation flow, validates the returned presentation artifacts required by that flow, extracts a SMART response, and applies §6.6 cross-validation against the original SMART request before Requester use. A Verifier claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Verifier-side requirements in §8.

A Requester/Verifier SHALL keep clinical request fields distinct from trust evidence. It SHALL NOT put requester identity, organization metadata, web origin, reader credentials, kiosk metadata, callback endpoints, trust assertions, or production trust-anchor claims in the SMART request body as substitutes for presentation-layer or deployment-policy trust.

#### 4.1.2 Holder Wallet / Responder

A **Holder Wallet / Responder** receives a SMART request through a supported flow, applies Holder control and Wallet policy, constructs a SMART response, and returns that response through the selected flow.

A Holder Wallet/Responder claiming core clinical conformance SHALL validate SMART requests under §5 before using them for response construction, process request items as the Holder-review and response-accounting granularity, preserve request item ids for `fulfills[]` and `requestStatus[].item`, construct SMART responses under §6, and set `SmartHealthCheckinResponse.requestId` to the accepted SMART request `id`.

A Holder Wallet/Responder claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Wallet/Responder requirements in §8, including request-carrier validation, `SessionTranscript` processing, optional `readerAuth` classification and verification when supported or relied upon, Holder review or equivalent Holder-control processing, mdoc response construction, and HPKE response encryption.

A Holder Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown SMART request members, wrapper metadata, relay metadata, provider ids, row ids, key ids, demo strings, or Artifact contents as authenticated requester identity unless the selected presentation flow, trust processing, or deployment policy establishes that fact outside the SMART request body.

#### 4.1.3 Phone presenter

A **Phone presenter** is the phone-side target in the optional kiosk flow. A Phone presenter claiming kiosk support SHALL satisfy the applicable §9.7 and §9.8 requirements. It SHALL parse the pointer-only URL, retrieve encrypted request state, bind the pointer, provider row when present, encrypted envelope, and signed payload wrapper `requestId` values, open and verify the kiosk request wrapper, evaluate creator and provider trust under deployment policy, validate the embedded `smartRequest` under §5, and then construct or participate in a fresh phone-local §8 same-device presentation using that `smartRequest`.

A Phone presenter SHALL keep the kiosk wrapper `requestId` distinct from `KioskRequestPayload.smartRequest.id`. It SHALL NOT reuse or infer a §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, Wallet response, SMART response, or response-submission ciphertext from the QR code, Pointer URL, provider row, encrypted envelope, or kiosk request JWS.

#### 4.1.4 Kiosk creator

A **Kiosk creator** creates the signed and encrypted kiosk request wrapper and Pointer URL defined in §§9.1-9.6. A Kiosk creator claiming kiosk support SHALL create or receive a conforming §5 SMART request, embed that request directly as `KioskRequestPayload.smartRequest`, sign the kiosk payload, encrypt the compact kiosk request JWS into an `EncryptedKioskRequest`, publish only encrypted request state through a Submission service or equivalent provider, and display or convey only a Pointer URL for the active profile.

A Kiosk creator SHALL NOT replace `smartRequest` with `requestProfile`, a preset or preset id, an IPS shortcut, an “all of the above” shortcut, a profile label, an SDK helper object, a legacy inline §8 fragment, or any other alternate clinical-request wrapper. A Kiosk creator SHALL keep wrapper routing, encryption, creator, provider, completion, requester-identity, and trust metadata outside the embedded SMART request.

#### 4.1.5 Completion display

A **Completion display** is the kiosk-side or desktop component that completes the optional kiosk flow after the phone writes encrypted submission state. A Completion display claiming kiosk support SHALL satisfy the applicable §§9.8-9.11 requirements. It SHALL retain the verified kiosk request payload, original embedded `smartRequest`, and desktop private key corresponding to the signed response-encryption public key until completion, expiration, abandonment, or cleanup.

Before using a submitted SMART response in a workflow, a Completion display SHALL observe candidate submissions for the active wrapper `requestId`, download bounded ciphertext, decrypt locally, verify `SubmissionPlaintext.requestId` equals the wrapper `requestId`, require the active successful payload kind, validate the submitted SMART response under §6, apply §6.6 against the original embedded `smartRequest`, account for §8 validation as required by §9.9.3, and apply §7 trust interpretation.

A Completion display SHALL NOT treat provider row presence, upload success, storage path, row order, provider app id, timestamps, successful decryption, or wrapper `requestId` equality alone as Holder consent, patient identity, requester identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, response freshness, or downstream authorization.

#### 4.1.6 Submission service / provider

A **Submission service** or **provider** is the untrusted relay used by the optional kiosk flow. A Submission service/provider claiming kiosk-provider support SHALL provide capabilities equivalent to storing or serving encrypted request state, accepting encrypted submission state, returning exact ciphertext bytes or equivalent encrypted bytes, and enabling the Completion display to discover candidate submissions for a wrapper `requestId`, as described in §9.11.

A Submission service/provider SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Holder choices, §8 `DeviceResponse` plaintext, private keys, shared secrets, or provider-visible clinical trust decisions merely to route, store, notify, or make available kiosk state.

#### 4.1.7 Deployment/profile authors and conformance/fixture authors

A **deployment-profile author** or **profile author** defines stricter or additional constraints for a deployment community, certification program, trust framework, extension, provider profile, or fixture profile. Such an author SHALL state which conformance targets are constrained, which optional features are required, which trust layers are in scope, and which additional validation, security, privacy, or fixture expectations apply. A deployment or profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, status codes, same-device carriers, kiosk `smartRequest` embedding, wrapper/SMART id separation, pointer-only QR behavior, or the untrusted-relay model.

A **conformance-test author** or **fixture author** creates executable checks, schemas, CDDL material, byte ladders, or vectors for one or more conformance targets. Such material SHALL derive from normative requirements in the body of this specification and from appendices that explicitly restate those requirements. Test and fixture material SHALL identify the target, feature set, section reference, expected outcome, comparison mode, and trust status of any demo keys, self-signed material, synthetic data, or real-platform captures.

### 4.2 Mandatory features

The mandatory core of SMART Health Check-in 1.0 is the transport-neutral SMART request and SMART response model. Detailed obligations remain in §§5-6.

An implementation claiming a clinical **Requester** target SHALL support construction of SMART requests using the §5 top-level request shape, fixed `type`, fixed `version`, request `id`, request item shape, item ids, Holder-facing display fields, `content.kind` selectors, per-item `accept[]`, and the §5.5 canonical `|version` handling rules that apply to the operations it performs.

An implementation claiming a clinical **Holder Wallet / Responder** target SHALL support parsing and validation of §5 SMART requests and construction of §6 SMART responses for the role and capabilities it claims. It SHALL preserve request/item identifiers, apply Holder-controlled item-level response accounting, use core status codes, use many-to-many Artifact fulfillment only as permitted by §6, and satisfy the core media-type rules for any Artifact media type it returns.

An implementation claiming a clinical **Verifier**, receiver, or Completion display validation target SHALL validate SMART responses under §6 and apply §6.6 against the original SMART request before treating a response as protocol-valid for Requester or workflow use. Shape validation alone is not sufficient.

Core clinical support includes `fhir.resources` and `questionnaire` selector shapes where an implementation claims to request or process those selectors; `profilesFrom[]` as an array of canonical profile-family URLs; additive `profiles[]` plus `profilesFrom[]` semantics; request `accept[]` and Artifact `mediaType` rules; `application/fhir+json` Artifacts with `fhirVersion`; `application/smart-health-card` Artifacts with `value.verifiableCredential[]` and no outer Artifact-level `fhirVersion`; `requestStatus[]` coverage exactly once for every request item; and §6.6 cross-validation.

All conformance targets SHALL preserve the trust-layer separation defined in §7 for the features they implement. In particular, an implementation SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from successful transport presentation, mdoc issuer/device evidence, reader authentication, kiosk wrapper validation, Holder action, SMART response shape validation, provider metadata, or demo fixture keys.

The version 1.0 live presentation binding is the direct same-device `org-iso-mdoc` flow in §8. A Requester/Verifier, Holder Wallet/Responder, or Phone presenter that claims live SMART Health Check-in 1.0 presentation support SHALL implement the applicable §8 obligations. A narrower claim for transport-neutral request/response tooling, JSON Schema validation, fixture production, deployment-profile authoring, or untrusted kiosk-provider relay behavior does not by itself claim live §8 presentation support.

### 4.3 Optional features

An optional feature is not required for every SMART Health Check-in component. An implementation that claims an optional feature, or operates under a deployment profile that requires it, SHALL satisfy the referenced requirements for each target it claims.

#### 4.3.1 Direct same-device `org-iso-mdoc` presentation

Direct same-device `org-iso-mdoc` is the base version 1.0 live presentation flow. A Verifier or Holder Wallet/Responder claiming this feature SHALL implement §8 for its role, including the fixed protocol id, mdoc identifiers, request carrier, stable response element, tag-24 boundaries, direct `dcapi` `SessionTranscript`, HPKE suite, mdoc validation, SMART response extraction, and §8 validation checklist.

This feature does not imply support for kiosk wrapping, optional `readerAuth`, a particular production issuer trust anchor, full FHIR profile validation, SMART Health Card issuer trust, or clinical-source trust for unsigned raw FHIR JSON.

#### 4.3.2 Cross-device kiosk wrapper

The cross-device kiosk wrapper in §9 is optional. A Kiosk creator, Phone presenter, Submission service/provider, Completion display, Requester/Verifier, or Holder Wallet/Responder that claims kiosk support SHALL implement the applicable §9 responsibilities for its role.

Kiosk support is a wrapper around the same §5 SMART request, phone-local §8 presentation, and §6 SMART response. It SHALL NOT define or accept a second clinical request or response language. The wrapper `requestId` remains distinct from `smartRequest.id` and from `SmartHealthCheckinResponse.requestId`.

#### 4.3.3 Reader authentication and deployment trust policy

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as §8 defines. A Holder Wallet/Responder that claims support for reader authentication or relies on it for policy SHALL verify and classify it under §§7-8 and applicable deployment policy.

A deployment profile MAY require authenticated origin, privileged-caller policy, `readerAuth`, reader certificate validation, issuer trust anchors, self-attested wallet labeling, creator-key registries, provider profiles, clinical-source provenance, stricter validation, size limits, expiration windows, replay controls, retention policy, or other deployment-specific constraints. Such constraints SHALL identify the affected targets and SHALL NOT redefine the SMART request body as a requester identity container or redefine core response semantics.

Demo certificates, self-signed keys, checked-in private test keys, reflective allow-lists, demo issuer strings, demo audience strings, demo provider ids, and fixture keys MAY be used in test or demonstration environments only when clearly labeled. They SHALL NOT be represented as production trust anchors or production key-management patterns unless an explicit deployment policy accepts them for that environment and states the resulting assurance level.

#### 4.3.4 Extension selectors, media types, status codes, and payload kinds

Registered or explicitly profiled extension selector kinds, extension Artifact media types, media-type compatibility rules, future status-code extensions, kiosk completion payload kinds other than the active successful payload, provider profiles, and stricter deployment schemas are optional unless a deployment profile requires them. An implementation that claims support for such an extension SHALL implement the extension's defined shape, processing rules, validation rules, unsupported behavior, security considerations, privacy considerations, and interactions with §§5-9.

#### 4.3.5 Schema, CDDL, fixture, and conformance-vector material

Appendix B schema conformance, Appendix C CDDL or pseudo-CDDL conformance, Appendix D fixture conformance, byte-ladder material, and future external conformance-test-suite conformance are optional unless a deployment or certification program requires them. A tool or test profile that claims one of these profiles SHALL state which schema, CDDL fragment, fixture class, vector class, or checklist row it implements and whether comparison is structural, semantic, byte-exact, diagnostic, historical, or illustrative.

Fixture and diagnostic material is not production trust material. A fixture containing demo certificates, demo issuer keys, intentionally public private keys, static request-opening keys, deterministic randomness, self-attested material, synthetic data, or historical captures SHALL be labeled accordingly and SHALL NOT be used to claim production issuer, reader, creator, provider, or clinical-source trust.

#### 4.3.6 Future OID4VP binding

The OpenID4VP binding in §10 is reserved and informative for SMART Health Check-in 1.0. No implementation is required to support OID4VP to claim conformance to the core request/response model, the direct same-device `org-iso-mdoc` feature, or the cross-device kiosk feature. An implementation SHALL NOT claim that an OID4VP experiment satisfies §8 or §9 conformance unless a future version or explicit profile defines that mapping.

### 4.4 Profile identifiers

A profile identifier names a coherent set of conformance rules for a target and feature set. Profile identifiers are not SMART request fields, SMART response fields, clinical selectors, media types, status codes, kiosk payload shortcuts, or substitutes for `smartRequest`. A conformance claim SHOULD include the profile identifier or label, specification version, target role, optional features, and any deployment-profile or fixture-profile dependencies.

Version 1.0 uses the following stable wire identifiers in normative artifacts:

| Identifier kind | Value | Scope |
| --- | --- | --- |
| SMART request discriminator | `smart-health-checkin-request` | §5 `type` field. |
| SMART response discriminator | `smart-health-checkin-response` | §6 `type` field. |
| SMART request/response model version | `1` | §5 and §6 `version` fields. |
| Core selector kinds | `fhir.resources`, `questionnaire` | §5 `content.kind` values. |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` | §5 `accept[]` and §6 Artifact `mediaType`. |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` | §6 `requestStatus[].status`. |
| Direct DC API protocol id | `org-iso-mdoc` | §8 Digital Credentials API protocol. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | §8 same-device mdoc document type. |
| mdoc namespace | `org.smarthealthit.checkin` | §8 same-device namespace. |
| mdoc stable element | `smart_health_checkin_response` | §8 response element. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | §8 `ItemsRequest.requestInfo` key. |
| Kiosk request JWS `typ` | `smart-health-checkin+kiosk-request+jws` | §9 compact kiosk request JWS protected header. |
| Kiosk encrypted-request content type | `application/smart-health-checkin-kiosk-request+jws+aesgcm` | §9 `EncryptedKioskRequest.contentType`. |
| Kiosk request-envelope algorithm label | `ECDH-P256+HKDF-SHA256+AES-GCM` with `enc` `A256GCM` | §9 request-envelope encryption. |
| Kiosk request-envelope HKDF info | `smart-health-checkin-kiosk-request-v1` | §9 request-envelope crypto context. |
| Kiosk response-submission HKDF info | `smart-health-checkin-kiosk-response-v1` | §9 response-submission crypto context. |
| Pointer fragment parameter | `r` | §9 active Pointer URL wrapper request id. |
| Kiosk successful payload kind | `smart-health-checkin-response` | §9 `SubmissionPlaintext.payload.kind` for active successful submissions. |

Until §13 finalizes registry syntax, this specification uses the following human-readable conformance labels. These labels are documentation and test-report labels, not in-band clinical request fields:

| Label | Summary |
| --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-kiosk-1` | Cross-device §9 kiosk wrapper support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | Reserved placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, a profile label, a topic label, or negotiation metadata to bypass §5 selectors, §5 `accept[]`, §6 response validation, §7 trust processing, §8 validation, or §9 kiosk validation.

### 4.5 Versioning rules

SMART Health Check-in uses separate version markers at separate layers. Implementations SHALL compare and interpret the version marker for the layer they are processing and SHALL NOT substitute one layer's version for another.

| Layer | Version or discriminator | Rule |
| --- | --- | --- |
| SMART request | `type: "smart-health-checkin-request"`, `version: "1"` | Requesters produce these values for version 1.0; Holder Wallets/Responders reject incompatible values unless a future compatibility rule applies. |
| SMART response | `type: "smart-health-checkin-response"`, `version: "1"` | Holder Wallets/Responders produce these values for version 1.0; Verifiers reject incompatible values unless a future compatibility rule applies. |
| Same-device mdoc | `DeviceRequest.version` and `DeviceResponse.version` `"1.0"`; `docType` `org.smarthealthit.checkin.1` | Verifiers and Holder Wallets/Responders use the §8 version 1.0 shape. Future incompatible mdoc profile changes SHOULD use a new profile identifier and, where necessary, a new `docType` suffix. |
| Kiosk request payload | numeric `v: 1` | Kiosk processors use the §9 version-1 payload shape and reject unsupported versions. |
| Kiosk encrypted request | numeric `v: 1`, `alg`, `enc`, and `contentType` | Kiosk processors validate the profile labels before decryption and use §9 request-envelope rules. |
| Kiosk submission payload | `payload.kind: "smart-health-checkin-response"` for the active successful payload | Completion displays validate the active payload kind and nested SMART response. Other payload kinds require a future profile or extension. |
| FHIR content | request `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes | These are FHIR-layer signals, not SMART Health Check-in model versions. §§5-6 and Appendix H control their handling. |

A minor revision, extension, or deployment profile MAY add optional members, stricter policy, registered selector kinds, registered media types, registered status-code extensions, fixture profiles, provider profiles, or trust-profile requirements only when recipients that do not understand the addition can ignore it, reject it, or report it as unsupported without changing the meaning of known required fields or bypassing required validation.

A change is breaking and requires a new version, profile identifier, or future specification revision when it changes the meaning of existing SMART request fields, SMART response fields, selector semantics, Artifact media-type rules, fulfillment/status accounting, same-device carriers, kiosk wrapper id binding, cryptographic context separation, pointer behavior, trust-layer separation, or required validation outcomes.

### 4.6 Extension model

SMART Health Check-in extension points are explicit and additive. An extension SHALL NOT redefine the semantics of core request fields, response fields, selector kinds, Artifact media-type rules, fulfillment links, status codes, same-device request or response carriers, kiosk direct `smartRequest` embedding, wrapper `requestId`, pointer-only QR behavior for the active profile, cryptographic context separation, or §7 trust-layer separation.

A content-selector extension SHALL follow §5.4.3. Its definition SHALL specify the exact `content.kind` value, JSON shape, clinical meaning, fulfillment rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, validation rules, unsupported behavior, security considerations, privacy considerations, and examples. A Holder Wallet/Responder that does not support an extension selector SHALL NOT guess its semantics from display text, profile labels, local topic names, wrapper field names, or provider metadata.

An Artifact media-type extension SHALL follow §§5.6 and 6.3.3. Its definition SHALL specify the media type, payload fields, use of `value`, `url`, or `data`, dereferencing and integrity rules, FHIR-version semantics if any, validation rules, status behavior, security considerations, privacy considerations, and compatibility with core media types if any. A Holder Wallet/Responder SHALL NOT claim an extension Artifact fulfills an item unless the item accepted that media type or a supported compatibility rule applies. A Verifier SHALL enforce the same rule under §6.6.

A status-code extension SHALL NOT be used in a version 1.0 SMART response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat unknown status codes as invalid for version 1.0 response validation unless such support is present.

A kiosk or presentation extension SHALL preserve the direct `smartRequest` decision, the wrapper `requestId` versus `smartRequest.id` distinction, the untrusted relay boundary, and the separation among §9 request-envelope encryption, §9 response-submission encryption, and §8 HPKE. It SHALL NOT require untrusted relays to see plaintext clinical content, SMART responses, raw FHIR resources, SMART Health Cards, private keys, or shared secrets merely to route state.

An extension or deployment profile MAY add stricter validation, narrower accepted media types, production trust anchors, provenance requirements, size limits, duplicate-handling rules, deterministic vector encodings, or registry-controlled identifiers. It SHALL state those constraints as additional profile requirements and SHALL NOT silently change the meaning of a base SMART Health Check-in 1.0 conformance claim. Registry syntax and change-control process are defined in §13.

### 4.7 Conformance checklist cross-link

Appendix A is the conformance checklist for certification and interoperability testing. Each checklist row SHALL link to a stable requirement source section and identify the conformance target, normative keyword, applicable feature or profile, requirement summary, and test or review implication. Appendix A is an index of requirements defined elsewhere; it SHALL NOT create independent obligations.

Conformance-test authors SHOULD organize Appendix A and test suites around at least these groups:

1. Core SMART request construction and processing (§5).
2. Core SMART response construction and cross-validation (§6).
3. Trust-layer separation and deployment-policy seams (§7).
4. Direct same-device `org-iso-mdoc` request, response, validation, and optional `readerAuth` (§8 and supporting appendices as applicable).
5. Kiosk request creation, pointer transport, phone resolution, response submission, completion processing, provider abstraction, replay, and expiration (§9 and kiosk appendix material as applicable).
6. Extension, profile, registry, schema, CDDL, fixture, and future-binding material (§§4, 10, 13 and Appendices A-D/H as applicable).
7. Security, privacy, and internationalization requirements from §§11-14 when those sections are complete.

A checklist row for an optional feature SHALL state that the row applies only to implementations claiming that feature or to deployment profiles that make the feature mandatory. A checklist row that references fixture material SHALL state whether the fixture is a conformance vector, diagnostic material, historical capture, implementation regression, or illustrative example.
