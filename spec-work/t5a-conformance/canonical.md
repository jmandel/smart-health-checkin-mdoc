## 4. Conformance

This section defines how implementations claim conformance to SMART Health Check-in 1.0. It is a map over obligations defined in §§5-8 and the supporting appendices; it does not create alternate request, response, same-device, trust, schema, CDDL, fixture, security, privacy, or registry behavior.

A conformance claim SHALL identify the implemented conformance target or targets, the claimed feature set or profile, the specification version, and any deployment profile that changes policy choices left open by this specification. One product MAY implement multiple targets, but it SHALL satisfy the requirements for each target and feature it claims.

SMART Health Check-in 1.0 has two normative layers:

1. the transport-neutral clinical request and response model in §§5-6; and
2. the direct same-device `org-iso-mdoc` presentation flow, including trust processing, in §§7-8.

A deployment MAY use a QR code, NFC tap, deep link, desktop sign, kiosk screen, or other handoff to land the Holder on a page that runs the §8 same-device flow. That handoff is implementation-defined deployment UX, not a SMART Health Check-in conformance feature or wire protocol. Labels such as kiosk, phone presenter, kiosk creator, submission service, provider, or completion display are non-normative deployment or demo labels only.

### 4.1 Conformance targets

#### 4.1.1 Requester / Verifier

A **Requester** constructs a SMART request and consumes a SMART response under the clinical model in §§5-6. A Requester claiming core clinical conformance SHALL construct `SmartHealthCheckinRequest` objects according to §5 and SHALL request only Artifact media types it is prepared to process for the corresponding item.

A **Verifier** packages a SMART request for a claimed presentation flow, validates the returned presentation artifacts required by that flow, extracts a SMART response, and applies §6.6 cross-validation against the original SMART request before Requester use. A Verifier claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Verifier-side requirements in §8.

A Requester/Verifier SHALL keep clinical request fields distinct from trust evidence. It SHALL NOT put requester identity, organization metadata, web origin, reader credentials, deployment handoff metadata, callback endpoints, trust assertions, or production trust-anchor claims in the SMART request body as substitutes for presentation-layer or deployment-policy trust.

#### 4.1.2 Holder Wallet / Responder

A **Holder Wallet / Responder** receives a SMART request through a supported flow, applies Holder control and Wallet policy, constructs a SMART response, and returns that response through the selected flow.

A Holder Wallet/Responder claiming core clinical conformance SHALL validate SMART requests under §5 before using them for response construction, process request items as the Holder-review and response-accounting granularity, preserve request item ids for `fulfills[]` and `requestStatus[].item`, construct SMART responses under §6, and set `SmartHealthCheckinResponse.requestId` to the accepted SMART request `id`.

A Holder Wallet/Responder claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Wallet/Responder requirements in §8, including request-carrier validation, `SessionTranscript` processing, optional `readerAuth` classification and verification when supported or relied upon, Holder review or equivalent Holder-control processing, mdoc response construction, and HPKE response encryption.

A Holder Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown SMART request members, deployment handoff metadata, demo strings, or Artifact contents as authenticated requester identity unless the selected presentation flow, trust processing, or deployment policy establishes that fact outside the SMART request body.

#### 4.1.3 Deployment/profile authors and conformance/fixture authors

A **deployment-profile author** or **profile author** defines stricter or additional constraints for a deployment community, certification program, trust framework, extension, or fixture profile. Such an author SHALL state which conformance targets are constrained, which optional features are required, which trust layers are in scope, and which additional validation, security, privacy, or fixture expectations apply. A deployment or profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, status codes, same-device carriers, trust-layer separation, or implementation-defined handoff UX.

A **conformance-test author** or **fixture author** creates executable checks, schemas, CDDL material, byte ladders, or vectors for one or more conformance targets. Such material SHALL derive from normative requirements in the body of this specification and from appendices that explicitly restate those requirements. Test and fixture material SHALL identify the target, feature set, section reference, expected outcome, comparison mode, and trust status of any demo keys, self-signed material, synthetic data, or real-platform captures.

### 4.2 Mandatory features

The mandatory core of SMART Health Check-in 1.0 is the transport-neutral SMART request and SMART response model in §§5-6. Direct same-device presentation in §§7-8 is the normative live presentation layer for implementations that claim live SMART Health Check-in presentation support.

An implementation claiming a clinical **Requester** target SHALL support construction of SMART requests using the §5 top-level request shape, fixed `type`, fixed `version`, request `id`, request item shape, item ids, Holder-facing display fields, `content.kind` selectors, per-item `accept[]`, and the §5.5 canonical `|version` handling rules that apply to the operations it performs.

An implementation claiming a clinical **Holder Wallet / Responder** target SHALL support parsing and validation of §5 SMART requests and construction of §6 SMART responses for the role and capabilities it claims. It SHALL preserve request/item identifiers, apply Holder-controlled item-level response accounting, use core status codes, use many-to-many Artifact fulfillment only as permitted by §6, and satisfy the core media-type rules for any Artifact media type it returns.

An implementation claiming a clinical **Verifier** or receiver validation target SHALL validate SMART responses under §6 and apply §6.6 against the original SMART request before treating a response as protocol-valid for Requester or workflow use. Shape validation alone is not sufficient.

Core clinical support includes `selection.fhir` and `form.fhir` selector shapes where an implementation claims to request or process those selectors; `form.fhir` selectors with `questionnaireCanonical` and/or `questionnaire` directly on the selector; `profilesFrom[]` as an array of canonical profile-family URLs; additive `profiles[]` plus `profilesFrom[]` semantics; canonical `|version` resolution and verification as defined by §5.5; request `accept[]` and Artifact `mediaType` rules; the removal of a generic catch-all Artifact carrier in favor of core or registered branded Artifact variants; `application/fhir+json` Artifacts with `fhirVersion`; `application/smart-health-card` Artifacts with `value.verifiableCredential[]` and no outer Artifact-level `fhirVersion`; `requestStatus[]` coverage exactly once for every request item; and §6.6 cross-validation.

All conformance targets SHALL preserve the trust-layer separation defined in §7 for the features they implement. In particular, an implementation SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from successful transport presentation, mdoc issuer/device evidence, reader authentication, Holder action, SMART response shape validation, deployment handoff metadata, or demo fixture keys.

The version 1.0 live presentation binding is the direct same-device `org-iso-mdoc` flow in §8. A Requester/Verifier or Holder Wallet/Responder that claims live SMART Health Check-in 1.0 presentation support SHALL implement the applicable §8 obligations. A narrower claim for transport-neutral request/response tooling, JSON Schema validation, fixture production, deployment-profile authoring, or implementation-defined handoff UX does not by itself claim live §8 presentation support.

### 4.3 Optional features

An optional feature is not required for every SMART Health Check-in component. An implementation that claims an optional feature, or operates under a deployment profile that requires it, SHALL satisfy the referenced requirements for each target it claims.

#### 4.3.1 Direct same-device `org-iso-mdoc` presentation

Direct same-device `org-iso-mdoc` is the base version 1.0 live presentation flow. A Verifier or Holder Wallet/Responder claiming this feature SHALL implement §8 for its role, including the fixed protocol id, mdoc identifiers, request carrier, stable response element, tag-24 boundaries, direct `dcapi` `SessionTranscript`, HPKE suite, mdoc validation, SMART response extraction, and §8 validation checklist.

This feature does not imply support for any implementation-defined cross-device handoff, optional `readerAuth`, a particular production issuer trust anchor, full FHIR profile validation, SMART Health Card issuer trust, or clinical-source trust for unsigned raw FHIR JSON.

#### 4.3.2 Reader authentication and deployment trust policy

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as §8 defines. A Holder Wallet/Responder that claims support for reader authentication or relies on it for policy SHALL verify and classify it under §§7-8 and applicable deployment policy.

A deployment profile MAY require authenticated origin, privileged-caller policy, `readerAuth`, reader certificate validation, issuer trust anchors, self-attested wallet labeling, clinical-source provenance, stricter validation, size limits, replay controls, retention policy, or other deployment-specific constraints. Such constraints SHALL identify the affected targets and SHALL NOT redefine the SMART request body as a requester identity container or redefine core response semantics.

Demo certificates, self-signed keys, checked-in private test keys, reflective allow-lists, demo issuer strings, demo audience strings, and fixture keys MAY be used in test or demonstration environments only when clearly labeled. They SHALL NOT be represented as production trust anchors or production key-management patterns unless an explicit deployment policy accepts them for that environment and states the resulting assurance level.

#### 4.3.3 Extension selectors, Artifact media types, and status codes

Registered or explicitly profiled extension selector kinds, extension Artifact media types, media-type compatibility rules, future status-code extensions, and stricter deployment schemas are optional unless a deployment profile requires them. An implementation that claims support for such an extension SHALL implement the extension's defined shape, processing rules, validation rules, unsupported behavior, security considerations, privacy considerations, and interactions with §§5-8.

Extension Artifact media types SHALL be defined as branded Artifact variants with a pinned `mediaType` literal or bounded media-type pattern and media-type-defined payload fields. They SHALL NOT rely on a protocol-level `GenericArtifact` catch-all or on freestanding `value`/`url`/`data` carrier choices whose semantics are not defined by the media type.

#### 4.3.4 Schema, CDDL, fixture, and conformance-vector material

Appendix B schema conformance, Appendix C CDDL or pseudo-CDDL conformance, Appendix D fixture conformance, byte-ladder material, and future external conformance-test-suite conformance are optional unless a deployment or certification program requires them. A tool or test profile that claims one of these profiles SHALL state which schema, CDDL fragment, fixture class, vector class, or checklist row it implements and whether comparison is structural, semantic, byte-exact, diagnostic, historical, or illustrative.

Fixture and diagnostic material is not production trust material. A fixture containing demo certificates, demo issuer keys, intentionally public private keys, deterministic randomness, self-attested material, synthetic data, or historical captures SHALL be labeled accordingly and SHALL NOT be used to claim production issuer, reader, or clinical-source trust.

#### 4.3.5 Future OID4VP binding

The OpenID4VP binding in §10 is reserved and informative for SMART Health Check-in 1.0. No implementation is required to support OID4VP to claim conformance to the core request/response model or the direct same-device `org-iso-mdoc` feature. An implementation SHALL NOT claim that an OID4VP experiment satisfies §8 conformance unless a future version or explicit profile defines that mapping.

### 4.4 Profile identifiers

A profile identifier names a coherent set of conformance rules for a target and feature set. Profile identifiers are not SMART request fields, SMART response fields, clinical selectors, media types, status codes, deployment handoff labels, or substitutes for a conforming SMART request. A conformance claim SHOULD include the profile identifier or label, specification version, target role, optional features, and any deployment-profile or fixture-profile dependencies.

Version 1.0 uses the following stable wire identifiers in normative artifacts:

| Identifier kind | Value | Scope |
| --- | --- | --- |
| SMART request discriminator | `smart-health-checkin-request` | §5 `type` field. |
| SMART response discriminator | `smart-health-checkin-response` | §6 `type` field. |
| SMART request/response model version | `1` | §5 and §6 `version` fields. |
| Core selector kinds | `selection.fhir`, `form.fhir` | §5 `content.kind` values. |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` | §5 `accept[]` and §6 Artifact `mediaType`. |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` | §6 `requestStatus[].status`. |
| Direct DC API protocol id | `org-iso-mdoc` | §8 Digital Credentials API protocol. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | §8 same-device mdoc document type. |
| mdoc namespace | `org.smarthealthit.checkin` | §8 same-device namespace. |
| mdoc stable element | `smart_health_checkin_response` | §8 response element. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | §8 `ItemsRequest.requestInfo` key. |

Until §13 finalizes registry syntax, this specification uses the following human-readable conformance labels. These labels are documentation and test-report labels, not in-band clinical request fields:

| Label | Summary |
| --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | Reserved placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, a profile label, a topic label, or negotiation metadata to bypass §5 selectors, §5 `accept[]`, §6 response validation, §7 trust processing, or §8 validation.

### 4.5 Versioning rules

SMART Health Check-in uses separate version markers at separate layers. Implementations SHALL compare and interpret the version marker for the layer they are processing and SHALL NOT substitute one layer's version for another.

| Layer | Version or discriminator | Rule |
| --- | --- | --- |
| SMART request | `type: "smart-health-checkin-request"`, `version: "1"` | Requesters produce these values for version 1.0; Holder Wallets/Responders reject incompatible values unless a future compatibility rule applies. |
| SMART response | `type: "smart-health-checkin-response"`, `version: "1"` | Holder Wallets/Responders produce these values for version 1.0; Verifiers reject incompatible values unless a future compatibility rule applies. |
| Same-device mdoc | `DeviceRequest.version` and `DeviceResponse.version` `"1.0"`; `docType` `org.smarthealthit.checkin.1` | Verifiers and Holder Wallets/Responders use the §8 version 1.0 shape. Future incompatible mdoc profile changes SHOULD use a new profile identifier and, where necessary, a new `docType` suffix. |
| FHIR content | request `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes | These are FHIR-layer signals, not SMART Health Check-in model versions. §§5-6 and Appendix H control their handling. |

A minor revision, extension, or deployment profile MAY add optional members, stricter policy, registered selector kinds, registered media types, registered status-code extensions, fixture profiles, or trust-profile requirements only when recipients that do not understand the addition can ignore it, reject it, or report it as unsupported without changing the meaning of known required fields or bypassing required validation.

A change is breaking and requires a new version, profile identifier, or future specification revision when it changes the meaning of existing SMART request fields, SMART response fields, selector semantics, Artifact media-type rules, fulfillment/status accounting, same-device carriers, trust-layer separation, or required validation outcomes.

### 4.6 Extension model

SMART Health Check-in extension points are explicit and additive. An extension SHALL NOT redefine the semantics of core request fields, response fields, selector kinds, Artifact media-type rules, fulfillment links, status codes, same-device request or response carriers, or §7 trust-layer separation.

A content-selector extension SHALL follow §5.4.3. Its definition SHALL specify the exact `content.kind` value, JSON shape, clinical meaning, fulfillment rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, validation rules, unsupported behavior, security considerations, privacy considerations, and examples. A Holder Wallet/Responder that does not support an extension selector SHALL NOT guess its semantics from display text, profile labels, local topic names, field names, deployment handoff metadata, or requester identity metadata.

An Artifact media-type extension SHALL follow §§5.6 and 6.3.3. Its definition SHALL specify a pinned `mediaType` literal or bounded media-type pattern, payload fields, carrier shape, dereferencing and integrity rules when applicable, FHIR-version semantics if any, validation rules, status behavior, security considerations, privacy considerations, and compatibility with core media types if any. The extension SHALL be modeled as an additional branded Artifact variant, not as a `GenericArtifact` catch-all. A Holder Wallet/Responder SHALL NOT claim an extension Artifact fulfills an item unless the item accepted that media type or a supported compatibility rule applies. A Verifier SHALL enforce the same rule under §6.6.

A status-code extension SHALL NOT be used in a version 1.0 SMART response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat unknown status codes as invalid for version 1.0 response validation unless such support is present.

An extension or deployment profile MAY add stricter validation, narrower accepted media types, production trust anchors, provenance requirements, size limits, duplicate-handling rules, deterministic vector encodings, or registry-controlled identifiers. It SHALL state those constraints as additional profile requirements and SHALL NOT silently change the meaning of a base SMART Health Check-in 1.0 conformance claim. Registry syntax and change-control process are defined in §13.

### 4.7 Conformance checklist cross-link

Appendix A is the conformance checklist for certification and interoperability testing. Each checklist row SHALL link to a stable requirement source section and identify the conformance target, normative keyword, applicable feature or profile, requirement summary, and test or review implication. Appendix A is an inventory of requirements defined elsewhere; it SHALL NOT create independent obligations.

Conformance-test authors SHOULD organize Appendix A and test suites around at least these groups:

1. Core SMART request construction and processing (§5).
2. Core SMART response construction and cross-validation (§6).
3. Trust-layer separation and deployment-policy seams (§7).
4. Direct same-device `org-iso-mdoc` request, response, validation, and optional `readerAuth` (§8 and supporting appendices as applicable).
5. Extension, profile, registry, schema, CDDL, fixture, and future-binding material (§§4, 10, 13 and Appendices A-D/H as applicable).
6. Security, privacy, and internationalization requirements from §§11-14 when those sections are complete.

A checklist row for an optional feature SHALL state that the row applies only to implementations claiming that feature or to deployment profiles that make the feature mandatory. A checklist row that references fixture material SHALL state whether the fixture is a conformance vector, diagnostic material, historical capture, implementation regression, or illustrative example.
