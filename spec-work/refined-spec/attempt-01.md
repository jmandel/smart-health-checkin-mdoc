# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

Short title: **SMART Health Check-in 1.0**. Suggested citation label: **SHC-Checkin-1.0**. Suggested document identifier: `smart-health-checkin-1.0`.

**Editorial approach:** This candidate applies standards-editor condensation: it keeps normative clinical request/response rules, conformance targets, identifiers, validation rules, registries, and same-device cryptographic/wire details in the specification; consolidates repeated explanatory trust warnings; and treats extended examples, diagrams, fixture indexes, byte ladders, CBOR tutorials, platform implementation notes, and detailed FHIR mapping examples as companion repository material. The companion material does not change the requirements here.

## 0. Front matter

Status: editor's draft for implementer review. Version: 1.0 draft. Publication date, editors, contributors, sponsoring organizations, IPR statements, and final license metadata are to be supplied by the publishing organization. Example identifiers, URLs, names, organizations, keys, and clinical data are for interoperability illustration only unless explicitly stated otherwise.

## 1. Introduction

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receives a structured SMART response. The specification separates the transport-neutral clinical content model from presentation transport.

The profile has two normative layers:

1. the transport-neutral clinical request and response JSON model in Sections 5 and 6; and
2. the same-device direct `org-iso-mdoc` presentation flow over the W3C Digital Credentials API, including trust processing, in Sections 7 and 8.

In-person QR, NFC, deep-link, pointer, relay, submission, and completion mechanisms are deployment-defined ways to land a Holder on a same-device Verifier page. They are not a version 1.0 protocol layer and do not change the SMART request, SMART response, or same-device presentation semantics.

### 1.1 Scope and non-goals

The clinical content model defines request items, Holder-facing purpose and item text, accepted response media types, content selectors, returned Artifacts, fulfillment links, and per-item status. Presentation transports can add origin context, reader or Verifier information, encryption, freshness, device evidence, routing metadata, and validation rules; they do not change request item semantics, selector meaning, consent granularity, Artifact media types, or status semantics.

SMART Health Check-in 1.0 does not define credential issuance, credential refresh, issuer accreditation, Wallet enrollment, longitudinal Wallet storage, EHR write-back, downstream clinical workflow, identity proofing, patient matching, guardian or proxy authority, payments, eligibility adjudication, claims, benefit determination, arbitrary FHIR query, a replacement for SMART App Launch or FHIR APIs, or a cross-device kiosk wrapper or relay protocol.

### 1.2 Document conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14, RFC 2119 and RFC 8174, when, and only when, they appear in all capitals.

A conformance keyword binds the conformance target named by the sentence, paragraph, subsection, or checklist item in which it appears. If no target is named locally, the target is inherited from the nearest enclosing normative subsection heading or introductory sentence when unambiguous. A note, example, figure caption, or informative appendix does not create a conformance requirement unless it explicitly states that a named conformance target MUST, SHALL, SHOULD, or MAY do something.

The phrases **SMART request** and **SMART response** refer to the transport-neutral JSON objects defined in Sections 5 and 6. They do not refer to mdoc envelopes, QR codes, pointer URLs, demo presets, relays, encrypted submissions, presentation tokens, or transport acknowledgments.

JSON objects and members use RFC 8259 terminology. JSON object member order is not significant unless a later section defines byte-for-byte canonicalization. CBOR, CDDL, COSE, JOSE, and HPKE terms follow their referenced specifications. When JSON values are carried inside CBOR, COSE, HPKE, mdoc, or another specified structure, the carrying section states the exact representation. Implementations MUST NOT infer representation from an example alone.

A field defined as base64url uses base64url without padding unless the field definition explicitly permits or requires padding. When a value is hashed, signed, encrypted, compared, or used as HPKE input, the operation is over the underlying bytes, never over Markdown rendering, diagnostic notation, hex text, or base64url characters unless explicitly stated.

### 1.3 Terminology

**Artifact**: A response object containing or referencing clinical content returned by a Wallet. It has `id`, `mediaType`, and `fulfills[]`.

**Clinical content model**: The transport-neutral SMART request and response JSON model defined in Sections 5 and 6.

**Holder**: The person whose clinical information is requested and who controls whether information is shared.

**Holder data source**: A Wallet-internal or deployment-specific source of clinical data available for response construction.

**In-person handoff** or **Pointer URL**: A deployment-defined QR, NFC, deep-link, URL, or similar mechanism that lands the Holder on a same-device Verifier page. It is not a SMART request and has no version 1.0 protocol wire format.

**Item** or **request item**: One entry in `SmartHealthCheckinRequest.items[]`; the unit of requested content or action, Holder review, accepted media-type advertisement, fulfillment references, and status reporting.

**Profile**: An exact FHIR `StructureDefinition` canonical URL, optionally with `|version` where Section 5.5 permits.

**Profile family**: A canonical URL identifying a published implementation guide, publication, collection, or other family of FHIR profiles. Values in `profilesFrom[]` are canonical profile-family URLs.

**Profile-selector additivity**: `profiles[]` and `profilesFrom[]` broaden acceptable profile matches when both appear in `selection.fhir`; either can satisfy the profile-selector portion, subject to `resourceTypes[]` and the item definition.

**Requester**: The relying party that constructs the SMART request and consumes the SMART response.

**Responder**: The role that constructs and returns a SMART response. The Wallet normally acts as Responder.

**Same-device presentation flow**: The version 1.0 flow in which a Verifier page invokes the W3C Digital Credentials API on the same device where the Wallet is available, using direct `org-iso-mdoc`.

**Selector**: A structured expression in an item `content` field. Core selector kinds are `selection.fhir` and `form.fhir`.

**Verifier**: The presentation-transport role that constructs a presentation request, invokes the same-device flow, receives and opens the response, validates transport artifacts, and applies clinical response validation.

**Wallet**: Software controlled by or acting for the Holder that receives a request, supports Holder review and policy, gathers or constructs Artifacts, and returns a SMART response.

Normative references include RFC 2119, RFC 8174, RFC 7515, RFC 8259, RFC 8610, RFC 8949, RFC 9052, RFC 9053, RFC 9180, ISO/IEC 18013-5, W3C Digital Credentials API, FHIR R4, and SMART Health Cards.

## 2. Purpose and design goals

SMART Health Check-in supplies a check-in-specific clinical request/response layer that plain credential issuance and presentation do not provide: FHIR-native request vocabulary, item-level Holder review, accepted clinical media types, per-item status, and fulfillment links between requested items and returned Artifacts.

Goals are transport-neutral clinical content; per-item Holder control; FHIR-native selectors (`profiles[]`, `profilesFrom[]`, official FHIR `resourceType` names, `questionnaireCanonical`, and inline `questionnaire`); many-to-many fulfillment; many-to-many interoperability across Requesters and Wallets; and layerable trust. Non-goals include issuance, longitudinal Wallet storage, EHR write-back, identity proofing, payments, arbitrary FHIR search, and treating unsigned raw FHIR JSON as issuer-signed clinical credentials.

## 3. Architecture and roles

SMART Health Check-in separates two payload domains: the clinical content domain (SMART request and response JSON) and the presentation transport domain (envelopes, APIs, cryptographic bindings, origin or reader context, routing behavior, and validation artifacts). A transport can add origin context, signatures, encryption, freshness, device evidence, routing identifiers, and relay metadata. It does not change clinical semantics. Conversely, a syntactically valid SMART response is not sufficient by itself; Verifiers still apply transport, trust, and response-validation rules.

The SMART request body is not a requester identity credential, consent directive, persistent authorization grant, or transport transcript. Requester, Verifier, origin, reader authentication, session freshness, issuer evidence, device evidence, and deployment trust information belong to presentation transport, trust processing, or local policy.

Protocol roles are Requester, Verifier, Browser / User Agent, Wallet / Responder, Holder, and Holder data source. Product components can combine roles, but protocol responsibilities remain separate. Kiosks, staff desktops, relay services, phone landing pages, and completion displays can exist in deployments but are not protocol conformance roles in version 1.0.

Trust boundaries are Holder control, clinical content, origin and user-agent, reader / Verifier, issuer and device, Holder data source, in-person handoff, and downstream workflow. These boundaries are related but not interchangeable.
## 4. Conformance

This section defines how implementations claim conformance to SMART Health Check-in 1.0. It is a map over obligations defined in Sections 5-8 and the supporting appendices; it does not create alternate request, response, same-device, trust, schema, CDDL, fixture, security, privacy, or registry behavior.

A conformance claim SHALL identify the implemented conformance target or targets, the claimed feature set or profile, the specification version, and any deployment profile that changes policy choices left open by this specification. One product MAY implement multiple targets, but it SHALL satisfy the requirements for each target and feature it claims.

A deployment MAY use a QR code, NFC tap, deep link, desktop sign, kiosk screen, or other handoff to land the Holder on a page that runs the Section 8 same-device flow. That handoff is implementation-defined deployment UX, not a SMART Health Check-in conformance feature or wire protocol. Labels such as kiosk, phone presenter, kiosk creator, submission service, provider, or completion display are non-normative deployment or demo labels only.

### 4.1 Conformance targets

#### 4.1.1 Requester / Verifier

A **Requester** constructs a SMART request and consumes a SMART response under the clinical model in Sections 5-6. A Requester claiming core clinical conformance SHALL construct `SmartHealthCheckinRequest` objects according to Section 5 and SHALL request only Artifact media types it is prepared to process for the corresponding item.

A **Verifier** packages a SMART request for a claimed presentation flow, validates the returned presentation artifacts required by that flow, extracts a SMART response, and applies Section 6.6 cross-validation against the original SMART request before Requester use. A Verifier claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Verifier-side requirements in Section 8.

A Requester/Verifier SHALL keep clinical request fields distinct from trust evidence. It SHALL NOT put requester identity, organization metadata, web origin, reader credentials, deployment handoff metadata, callback endpoints, trust assertions, or production trust-anchor claims in the SMART request body as substitutes for presentation-layer or deployment-policy trust.

#### 4.1.2 Holder Wallet / Responder

A Holder Wallet/Responder claiming core clinical conformance SHALL validate SMART requests under Section 5 before using them for response construction, process request items as the Holder-review and response-accounting granularity, preserve request item ids for `fulfills[]` and `requestStatus[].item`, construct SMART responses under Section 6, and set `SmartHealthCheckinResponse.requestId` to the accepted SMART request `id`.

A Holder Wallet/Responder claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Wallet/Responder requirements in Section 8, including request-carrier validation, `SessionTranscript` processing, optional `readerAuth` classification and verification when supported or relied upon, Holder review or equivalent Holder-control processing, mdoc response construction, and HPKE response encryption.

A Holder Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown SMART request members, deployment handoff metadata, demo strings, or Artifact contents as authenticated requester identity unless the selected presentation flow, trust processing, or deployment policy establishes that fact outside the SMART request body.

#### 4.1.3 Deployment/profile authors and conformance/fixture authors

A **deployment-profile author** or **profile author** defines stricter or additional constraints for a deployment community, certification program, trust framework, extension, or fixture profile. Such an author SHALL state which conformance targets are constrained, which optional features are required, which trust layers are in scope, and which additional validation, security, privacy, or fixture expectations apply. A deployment or profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, status codes, same-device carriers, trust-layer separation, or implementation-defined handoff UX.

A **conformance-test author** or **fixture author** creates executable checks, schemas, CDDL material, byte ladders, or vectors for one or more conformance targets. Such material SHALL derive from normative requirements in the body of this specification and from appendices that explicitly restate those requirements. Test and fixture material SHALL identify the target, feature set, section reference, expected outcome, comparison mode, and trust status of any demo keys, self-signed material, synthetic data, or real-platform captures.

### 4.2 Mandatory features

An implementation claiming a clinical **Requester** target SHALL support construction of SMART requests using the Section 5 top-level request shape, fixed `type`, fixed `version`, request `id`, request item shape, item ids, Holder-facing display fields, `content.kind` selectors, per-item `accept[]`, and the Section 5.5 canonical `|version` handling rules that apply to the operations it performs.

An implementation claiming a clinical **Holder Wallet / Responder** target SHALL support parsing and validation of Section 5 SMART requests and construction of Section 6 SMART responses for the role and capabilities it claims. It SHALL preserve request/item identifiers, apply Holder-controlled item-level response accounting, use core status codes, use many-to-many Artifact fulfillment only as permitted by Section 6, and satisfy the core media-type rules for any Artifact media type it returns.

An implementation claiming a clinical **Verifier** or receiver validation target SHALL validate SMART responses under Section 6 and apply Section 6.6 against the original SMART request before treating a response as protocol-valid for Requester or workflow use. Shape validation alone is not sufficient.

All conformance targets SHALL preserve the trust-layer separation defined in Section 7 for the features they implement. In particular, an implementation SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from successful transport presentation, mdoc issuer/device evidence, reader authentication, Holder action, SMART response shape validation, deployment handoff metadata, or demo fixture keys.

The version 1.0 live presentation binding is the direct same-device `org-iso-mdoc` flow in Section 8. A Requester/Verifier or Holder Wallet/Responder that claims live SMART Health Check-in 1.0 presentation support SHALL implement the applicable Section 8 obligations. A narrower claim for transport-neutral request/response tooling, JSON Schema validation, fixture production, deployment-profile authoring, or implementation-defined handoff UX does not by itself claim live Section 8 presentation support.

### 4.3 Optional features

An optional feature is not required for every SMART Health Check-in component. An implementation that claims an optional feature, or operates under a deployment profile that requires it, SHALL satisfy the referenced requirements for each target it claims.

#### 4.3.1 Direct same-device `org-iso-mdoc` presentation

Direct same-device `org-iso-mdoc` is the base version 1.0 live presentation flow. A Verifier or Holder Wallet/Responder claiming this feature SHALL implement Section 8 for its role, including the fixed protocol id, mdoc identifiers, request carrier, stable response element, tag-24 boundaries, direct `dcapi` `SessionTranscript`, HPKE suite, mdoc validation, SMART response extraction, and Section 8 validation checklist.

#### 4.3.2 Reader authentication and deployment trust policy

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as Section 8 defines. A Holder Wallet/Responder that claims support for reader authentication or relies on it for policy SHALL verify and classify it under Sections 7-8 and applicable deployment policy.

A deployment profile MAY require authenticated origin, privileged-caller policy, `readerAuth`, reader certificate validation, issuer trust anchors, self-attested wallet labeling, clinical-source provenance, stricter validation, size limits, replay controls, retention policy, or other deployment-specific constraints. Such constraints SHALL identify the affected targets and SHALL NOT redefine the SMART request body as a requester identity container or redefine core response semantics.

Demo certificates, self-signed keys, checked-in private test keys, reflective allow-lists, demo issuer strings, demo audience strings, and fixture keys MAY be used in test or demonstration environments only when clearly labeled. They SHALL NOT be represented as production trust anchors or production key-management patterns unless an explicit deployment policy accepts them for that environment and states the resulting assurance level.

#### 4.3.3 Extension selectors, Artifact media types, and status codes

Registered or explicitly profiled extension selector kinds, extension Artifact media types, media-type compatibility rules, future status-code extensions, and stricter deployment schemas are optional unless a deployment profile requires them. An implementation that claims support for such an extension SHALL implement the extension's defined shape, processing rules, validation rules, unsupported behavior, security considerations, privacy considerations, and interactions with Sections 5-8.

Extension Artifact media types SHALL be defined as branded Artifact variants with a pinned `mediaType` literal or bounded media-type pattern and media-type-defined payload fields. They SHALL NOT rely on a protocol-level `GenericArtifact` catch-all or on freestanding `value`/`url`/`data` carrier choices whose semantics are not defined by the media type.

#### 4.3.4 Schema, CDDL, fixture, and conformance-vector material

Appendix B schema conformance, Appendix C CDDL or pseudo-CDDL conformance, companion fixture conformance, byte-ladder material, and future external conformance-test-suite conformance are optional unless a deployment or certification program requires them. A tool or test profile that claims one of these profiles SHALL state which schema, CDDL fragment, fixture class, vector class, or checklist row it implements and whether comparison is structural, semantic, byte-exact, diagnostic, historical, or illustrative.

Fixture and diagnostic material is not production trust material. A fixture containing demo certificates, demo issuer keys, intentionally public private keys, deterministic randomness, self-attested material, synthetic data, or historical captures SHALL be labeled accordingly and SHALL NOT be used to claim production issuer, reader, or clinical-source trust.

#### 4.3.5 Future OID4VP binding

The OpenID4VP binding in Section 10 is reserved and informative for SMART Health Check-in 1.0. No implementation is required to support OID4VP to claim conformance to the core request/response model or the direct same-device `org-iso-mdoc` feature. An implementation SHALL NOT claim that an OID4VP experiment satisfies Section 8 conformance unless a future version or explicit profile defines that mapping.

### 4.4 Profile identifiers

A profile identifier names a coherent set of conformance rules for a target and feature set. Profile identifiers are not SMART request fields, SMART response fields, clinical selectors, media types, status codes, deployment handoff labels, or substitutes for a conforming SMART request. A conformance claim SHOULD include the profile identifier or label, specification version, target role, optional features, and any deployment-profile or fixture-profile dependencies.

Version 1.0 uses the following stable wire identifiers in normative artifacts:

| Identifier kind | Value | Scope |
| --- | --- | --- |
| SMART request discriminator | `smart-health-checkin-request` | Section 5 `type` field. |
| SMART response discriminator | `smart-health-checkin-response` | Section 6 `type` field. |
| SMART request/response model version | `1` | Section 5 and Section 6 `version` fields. |
| Core selector kinds | `selection.fhir`, `form.fhir` | Section 5 `content.kind` values. |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` | Section 5 `accept[]` and Section 6 Artifact `mediaType`. |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` | Section 6 `requestStatus[].status`. |
| Direct DC API protocol id | `org-iso-mdoc` | Section 8 Digital Credentials API protocol. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | Section 8 same-device mdoc document type. |
| mdoc namespace | `org.smarthealthit.checkin` | Section 8 same-device namespace. |
| mdoc stable element | `smart_health_checkin_response` | Section 8 response element. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | Section 8 `ItemsRequest.requestInfo` key. |

A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, a profile label, a topic label, or negotiation metadata to bypass Section 5 selectors, Section 5 `accept[]`, Section 6 response validation, Section 7 trust processing, or Section 8 validation.

### 4.5 Versioning rules

SMART Health Check-in uses separate version markers at separate layers. Implementations SHALL compare and interpret the version marker for the layer they are processing and SHALL NOT substitute one layer's version for another.

| Layer | Version or discriminator | Rule |
| --- | --- | --- |
| SMART request | `type: "smart-health-checkin-request"`, `version: "1"` | Requesters produce these values for version 1.0; Holder Wallets/Responders reject incompatible values unless a future compatibility rule applies. |
| SMART response | `type: "smart-health-checkin-response"`, `version: "1"` | Holder Wallets/Responders produce these values for version 1.0; Verifiers reject incompatible values unless a future compatibility rule applies. |
| Same-device mdoc | `DeviceRequest.version` and `DeviceResponse.version` `"1.0"`; `docType` `org.smarthealthit.checkin.1` | Verifiers and Holder Wallets/Responders use the Section 8 version 1.0 shape. Future incompatible mdoc profile changes SHOULD use a new profile identifier and, where necessary, a new `docType` suffix. |
| FHIR content | request `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes | These are FHIR-layer signals, not SMART Health Check-in model versions. Sections 5-6 control their handling. |

A minor revision, extension, or deployment profile MAY add optional members, stricter policy, registered selector kinds, registered media types, registered status-code extensions, fixture profiles, or trust-profile requirements only when recipients that do not understand the addition can ignore it, reject it, or report it as unsupported without changing the meaning of known required fields or bypassing required validation.

### 4.6 Extension model

SMART Health Check-in extension points are explicit and additive. An extension SHALL NOT redefine the semantics of core request fields, response fields, selector kinds, Artifact media-type rules, fulfillment links, status codes, same-device request or response carriers, or Section 7 trust-layer separation.

A content-selector extension SHALL follow Section 5.4.3. Its definition SHALL specify the exact `content.kind` value, JSON shape, clinical meaning, fulfillment rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, validation rules, unsupported behavior, security considerations, privacy considerations, and examples. A Holder Wallet/Responder that does not support an extension selector SHALL NOT guess its semantics from display text, profile labels, local topic names, field names, deployment handoff metadata, or requester identity metadata.

An Artifact media-type extension SHALL follow Section 5.6 and 6.3.3. Its definition SHALL specify a pinned `mediaType` literal or bounded media-type pattern, payload fields, carrier shape, dereferencing and integrity rules when applicable, FHIR-version semantics if any, validation rules, status behavior, security considerations, privacy considerations, and compatibility with core media types if any. The extension SHALL be modeled as an additional branded Artifact variant, not as a `GenericArtifact` catch-all. A Holder Wallet/Responder SHALL NOT claim an extension Artifact fulfills an item unless the item accepted that media type or a supported compatibility rule applies. A Verifier SHALL enforce the same rule under Section 6.6.

A status-code extension SHALL NOT be used in a version 1.0 SMART response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat unknown status codes as invalid for version 1.0 response validation unless such support is present.

An extension or deployment profile MAY add stricter validation, narrower accepted media types, production trust anchors, provenance requirements, size limits, duplicate-handling rules, deterministic vector encodings, or registry-controlled identifiers. It SHALL state those constraints as additional profile requirements and SHALL NOT silently change the meaning of a base SMART Health Check-in 1.0 conformance claim. Registry syntax and change-control process are defined in Section 13.

### 4.7 Conformance checklist cross-link

Appendix A is the conformance checklist for certification and interoperability testing. Each checklist row SHALL link to a stable requirement source section and identify the conformance target, normative keyword, applicable feature or profile, requirement summary, and test or review implication. Appendix A is an inventory of requirements defined elsewhere; it SHALL NOT create independent obligations.

Conformance-test authors SHOULD organize Appendix A and test suites around at least these groups:

1. Core SMART request construction and processing (Section 5).
2. Core SMART response construction and cross-validation (Section 6).
3. Trust-layer separation and deployment-policy seams (Section 7).
4. Direct same-device `org-iso-mdoc` request, response, validation, and optional `readerAuth` (Section 8 and supporting appendices as applicable).
5. Extension, profile, registry, schema, CDDL, fixture, and future-binding material (Section 4, 10, 13 and Appendices A-D/H as applicable).
6. Security, privacy, and internationalization requirements from Sections 11-14 when those sections are complete.

A checklist row for an optional feature SHALL state that the row applies only to implementations claiming that feature or to deployment profiles that make the feature mandatory. A checklist row that references fixture material SHALL state whether the fixture is a conformance vector, diagnostic material, historical capture, implementation regression, or illustrative example.

---

## 5. Clinical content - request

This section defines the SMART request, the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content. The same SMART request semantics apply when the object is carried by a presentation flow or by a future binding.

### 5.1 Encoding rules

A SMART request is a JSON object. A Requester SHALL encode a SMART request as JSON conforming to RFC 8259. When a SMART request is serialized as text or bytes by a transport binding, the serialized JSON text SHALL be UTF-8.

#### 5.1.1 JSON UTF-8, RFC 8259, and no comments

A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or any other value outside the JSON data model in a SMART request. A Wallet/Responder or Verifier that parses a SMART request SHALL reject a request whose top-level value is not a JSON object or whose representation cannot be parsed according to the selected transport's encoding rules.

A transport binding that carries a SMART request SHALL define whether the request is carried as JSON text, a byte string containing UTF-8 JSON, a JSON-valued member of another object, a signed payload member, or another exact representation. This section does not define a byte-for-byte JSON canonicalization for the clinical request object.

#### 5.1.2 Object key uniqueness, ordering, and non-JSON numbers

JSON object member names in a SMART request SHALL be unique within each object. A Wallet/Responder or Verifier SHALL reject a SMART request when duplicate object member names are detected during parsing or validation. Implementations SHOULD avoid parser configurations that silently apply parser-specific "first member wins" or "last member wins" behavior to security-relevant protocol data.

This section defines no numeric fields. A Requester SHALL NOT encode identifiers, versions, booleans, arrays, media types, FHIR canonicals, or display strings as JSON numbers. Because RFC 8259 JSON has no `NaN`, `Infinity`, or `-Infinity` values, those values SHALL NOT appear in a SMART request.

#### 5.1.3 Numeric, string, and identifier limits

This section does not define global maximum lengths for strings, arrays, or serialized request bytes. A Requester SHOULD keep request ids, item ids, titles, summaries, purpose text, canonicals, media type strings, and inline Questionnaire content no larger than needed for the check-in workflow and Holder review. A Wallet/Responder MAY reject a request that exceeds implementation, transport, safety, display, or policy limits, provided the rejection is reported according to the selected flow and applicable privacy requirements.

#### 5.1.4 Forward-compatible unknown-member handling

A Wallet/Responder MAY ignore unknown members at the top level of the SMART request, in request items, and inside known selector objects when those members do not change the meaning of known required members. Ignoring an unknown member does not make a malformed known member valid.

A Requester SHALL NOT rely on an unknown member to carry requester identity, override Holder control, change `accept[]`, change selector semantics, change `required`, or impose transport, trust, or consent behavior.

### 5.2 `SmartHealthCheckinRequest`

A `SmartHealthCheckinRequest` has this top-level shape:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "<request-id>",
  "purpose": "<holder-facing purpose>",
  "fhirVersions": ["4.0.1"],
  "items": []
}
```

A Requester SHALL include `type`, `version`, `id`, and `items`. A Requester MAY include `purpose` and `fhirVersions`.

#### 5.2.1 `type`

A Requester SHALL set `type` to the exact string `"smart-health-checkin-request"`. A Wallet/Responder SHALL reject a SMART request whose `type` member is absent or is not exactly `"smart-health-checkin-request"`.

#### 5.2.2 `version`

A Requester SHALL set `version` to the exact string `"1"` for requests conforming to SMART Health Check-in 1.0. The `version` member is the SMART request-model version. It is not a FHIR version and not a presentation-transport version.

A Wallet/Responder SHALL reject a SMART request whose `version` member is absent or is not exactly `"1"`, unless a future version-negotiation rule explicitly defines compatible handling for another value.

#### 5.2.3 `id`

A Requester SHALL include `id` as a non-empty opaque Requester-generated request identifier. A Requester SHALL generate `id` values so they are unique among SMART requests created by that Requester for the same check-in session. A Requester SHOULD generate `id` values with enough unpredictability or contextual uniqueness to avoid accidental collision and cross-session guessing by parties that only observe unrelated sessions.

A Wallet/Responder SHALL preserve the request `id` value for response construction so Section 6 can bind the SMART response to the request using `requestId`.

The request `id` is not a patient identifier, requester identifier, proof of freshness, or clinical fact. A Wallet/Responder SHALL NOT infer requester identity, patient identity, authorization, or clinical meaning from the syntax of `id`.

#### 5.2.4 `purpose`

A Requester MAY include `purpose`. If present, a Requester SHALL encode `purpose` as a string and SHALL use it only to describe the workflow context for Holder review. A Requester SHALL NOT use `purpose` to carry requester identity, organization name, web origin, logo URL, contact URL, legal attestation, proof of authority, consent language, trust status, or persistent authorization semantics.

A Wallet/Responder MAY display `purpose` to the Holder as request context. A Wallet/Responder SHALL NOT treat `purpose` as authenticated requester identity or as a transport trust signal.

#### 5.2.5 `fhirVersions[]`

If a Requester includes `fhirVersions`, the Requester SHALL encode it as an array of strings ordered from most preferred to least preferred. A Requester that accepts `application/fhir+json` SHOULD include at least one FHIR release version unless the Requester can safely process any FHIR version that a conforming Wallet/Responder might return under Section 6.

A Wallet/Responder SHOULD use `fhirVersions[]` when choosing a FHIR version for `application/fhir+json` Artifacts, subject to Holder decision, available Holder data sources, Wallet capability, local policy, and the selected item `accept[]` media types. `fhirVersions[]` does not override FHIR version information that is intrinsic to a signed SMART Health Card or another response format defined by a registered extension.

#### 5.2.6 `items[]`

`items` is the ordered list of request items. A Requester SHALL include `items` as an array. A Requester SHOULD include at least one request item. A zero-item request has no clinical content to fulfill and is expected to be closed during Appendix B and conformance work; this section does not make non-empty `items[]` a hard requirement because current active validators accept an empty array once other required top-level fields are present.

A Requester SHALL encode each member of `items` as a `SmartHealthCheckinRequestItem` as defined in Section 5.3. A Wallet/Responder SHALL process `items[]` as the request's Holder-review and response-accounting granularity. The order of `items[]` is the Requester's preferred display and workflow order. A Wallet/Responder MAY group, summarize, or reorder items for accessibility, safety, or local policy, but SHALL preserve item `id` values for fulfillment and status reporting.

#### 5.2.7 Prohibited requester identity metadata

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited requester identity metadata includes, but is not limited to:

- requester, clinic, practice, payer, organization, staff, or facility name fields;
- logo, image, icon, brand-color, or display-brand fields;
- requester URL, website, callback URL, endpoint URL, domain, origin, package name, application id, or certificate fields;
- signed-request, reader, Verifier, trust-framework, issuer, accreditation, or legal-entity metadata; and
- pointer, relay, completion, encryption, nonce, hand-off, or wrapper metadata from any implementation-defined initiation flow.

A Wallet/Responder SHALL NOT treat any field in the SMART request body, including unknown fields, `purpose`, `items[].title`, `items[].summary`, selector values, or extension members, as authenticated requester identity unless the same fact is established by the selected presentation transport, trust processing, or local policy outside the SMART request body.

### 5.3 `SmartHealthCheckinRequestItem`

A `SmartHealthCheckinRequestItem` has this shape:

```json
{
  "id": "<item-id>",
  "title": "<holder-facing title>",
  "summary": "<holder-facing explanation>",
  "required": false,
  "content": { "kind": "selection.fhir" },
  "accept": ["application/fhir+json"]
}
```

A Requester SHALL include `id`, `title`, `content`, and `accept` for every item. A Requester MAY include `summary` and `required`.

#### 5.3.1 `id` uniqueness and character set

A Requester SHALL include `id` as a non-empty string on every request item. A Requester SHALL NOT use the same item `id` more than once within a single SMART request. A Wallet/Responder SHALL reject a SMART request with a missing, non-string, empty, or duplicate item `id`.

Item ids are scoped to one SMART request. They are not global identifiers and are not patient or requester identifiers. A Wallet/Responder and Verifier SHALL use exact string equality when comparing item ids.

A Requester SHOULD use item ids that are stable within the interaction, short enough for diagnostics, and safe for use as JSON string references in responses. Newly defined item ids SHOULD consist only of ASCII letters, digits, period (`.`), underscore (`_`), tilde (`~`), and hyphen (`-`). Until Appendix B and active validators define a stricter pattern, Wallets/Responders MAY accept other non-empty string ids when they can preserve them exactly.

A Requester SHOULD NOT include patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in item `id` values.

#### 5.3.2 `title`

A Requester SHALL include `title` as a non-empty Holder-facing string on every request item. `title` names the requested item, for example `"Patient demographics"`, `"Insurance card"`, or `"Intake form"`. A Requester SHALL NOT use `title` as a substitute for authenticated requester identity metadata.

A Wallet/Responder SHOULD make `title` available in Holder review when requesting consent for the item, subject to accessibility, localization, safety, and local policy.

#### 5.3.3 `summary`

A Requester MAY include `summary` as a string that gives a Holder-facing explanation of the requested content or action. A Requester SHOULD use `summary` to clarify broad selectors, profile-family requests, or questionnaire purpose when `title` alone would be ambiguous. A Requester SHALL NOT use `summary` as a substitute for authenticated requester identity metadata.

A Wallet/Responder MAY display, summarize, or suppress `summary` according to Wallet UX policy, but SHALL preserve item ids for response accounting regardless of display choices.

#### 5.3.4 `required` advisory semantics

A Requester MAY include `required` as a boolean. If `required` is omitted, a Wallet/Responder SHALL interpret it as `false` for display and decision-support purposes. When `required` is `true`, the Requester is indicating that the item is important for the Requester's downstream workflow.

A Requester SHALL treat `required` as advisory workflow context only. `required: true` is not Holder consent, not legal authorization, not a command to the Wallet, and not a guarantee that responsive content will be returned.

A Wallet/Responder MAY display or otherwise consider `required` during Holder review. A Wallet/Responder SHALL NOT treat `required: true` as authorization to bypass Holder control, Wallet policy, applicable law, or consent UX requirements.

A Wallet/Responder MAY return declined, unavailable, unsupported, partial, or error status for an item whose `required` value is `true`. The Requester decides outside this protocol how its downstream workflow proceeds when required content is missing.

#### 5.3.5 `accept[]` ordered preference

A Requester SHALL include `accept` as a non-empty array of media type strings on every request item. A Requester SHALL order `accept[]` from most preferred to least preferred for that item. There is no separate preference field. A Requester SHALL NOT include a media type in `accept[]` unless the Requester is prepared to process a conforming Artifact of that media type for the item.

A Wallet/Responder MAY choose any media type listed in `accept[]` for the item, considering Holder decision, available Holder data sources, Wallet capability, FHIR version support, local policy, and whether the resulting Artifact can accurately fulfill the item. A Wallet/Responder SHOULD choose the earliest acceptable media type it can produce when multiple choices are otherwise equivalent.

A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact's `mediaType` is listed in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. If no listed media type can be produced for an item, a Wallet/Responder SHALL report the item outcome using the response status mechanism defined in Section 6 rather than returning an Artifact with an unaccepted media type.

#### 5.3.6 `content` selector

A Requester SHALL include `content` as a selector object on every request item. A Requester SHALL include `content.kind` as a string identifying the selector kind. The `kind` value determines the remaining selector shape and semantics.

A Wallet/Responder that does not understand `content.kind` SHALL NOT infer the selector's semantics from display text or unrelated fields. It SHALL treat the item as unsupported or reject the request according to the selected flow and Section 6 status rules.

### 5.4 Content selectors

A Requester SHALL use a selector shape defined by this section or by a registered extension selector. A Wallet/Responder SHALL evaluate selector semantics independently for each request item, while allowing one response Artifact to fulfill multiple items where Section 6 permits.

#### 5.4.1 `selection.fhir`

A `selection.fhir` selector requests existing patient-specific FHIR resources. It has this shape:

```json
{
  "kind": "selection.fhir",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

A Requester SHALL set `kind` to `"selection.fhir"` for this selector. A Requester MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination of those fields, or none of them. If `profiles`, `profilesFrom`, or `resourceTypes` is present, a Requester SHALL encode that member as an array of strings.

A `selection.fhir` selector SHALL NOT include `questionnaireCanonical` or `questionnaire`. Questionnaire-driven form completion uses the `form.fhir` selector in Section 5.4.2. If a workflow needs both existing-resource selection and form completion, the Requester SHALL use separate request items.

##### 5.4.1.1 `profiles[]`

A Requester MAY include `profiles` as an array of one or more FHIR canonical strings. A Requester SHOULD use canonical `StructureDefinition` URLs in `profiles[]` values. A `profiles[]` value MAY include a `|version` suffix as defined in Section 5.5 when the Requester needs an exact profile version.

A Wallet/Responder MAY treat a resource as matching `profiles[]` when the resource declares one of the listed profile canonicals in `meta.profile` or when the Wallet/Responder has equivalent local knowledge or trusted conformance evidence that the resource conforms to the listed profile. This specification does not require a Wallet/Responder to perform full FHIR profile validation during request matching.

##### 5.4.1.2 `profilesFrom[]`

A Requester MAY include `profilesFrom` as a non-empty array of canonical profile-family URL strings. A Requester SHALL encode `profilesFrom` as an array. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, implementation-guide object, package id, package version, npm package name, registry alias, local topic vocabulary, or URN unless a future version or registered extension explicitly defines such a value space.

A Wallet/Responder SHALL reject a `selection.fhir` selector whose `profilesFrom` member is present but is not a non-empty array of strings. A Wallet/Responder MAY additionally reject `profilesFrom[]` values that are not canonical URLs under its validation policy.

A `profilesFrom[]` value identifies a family from which acceptable resource profiles can be drawn. It does not require the SMART request to enumerate every profile in that family. A Wallet/Responder MAY use local knowledge, FHIR package metadata available outside the request, implementation-guide definitions, configured profile-family mappings, or other deployment knowledge to determine which exact profiles are members of a `profilesFrom[]` family.

##### 5.4.1.3 `resourceTypes[]`

A Requester MAY include `resourceTypes` as an array of one or more strings. A Requester SHALL use official FHIR resource type names appropriate to the FHIR versions it can consume. A Requester SHALL NOT use local topic labels, display strings, or implementation-specific category names such as `"care-plans"`, `"insurance"`, or `"clinical-history"` in `resourceTypes[]` unless those strings are official FHIR resource type names.

When `resourceTypes[]` is present with `profiles[]` or `profilesFrom[]`, a Wallet/Responder SHALL treat `resourceTypes[]` as an additional resource-type constraint on the profile-selected set. A resource is responsive only if it matches at least one applicable profile selector under Section 5.4.1.4 and its FHIR `resourceType` is listed in `resourceTypes[]`.

When `resourceTypes[]` is present without `profiles[]` and without `profilesFrom[]`, a Wallet/Responder SHALL treat the selector as requesting patient-specific FHIR resources whose `resourceType` is listed in `resourceTypes[]`, subject to Holder decision, accepted media types, FHIR version compatibility, available data, and local policy.

##### 5.4.1.4 Additivity rule when both `profiles[]` and `profilesFrom[]` are present

`profiles[]` and `profilesFrom[]` are additive profile selectors. When both fields are present in the same `selection.fhir` selector, a Wallet/Responder SHALL treat a resource as satisfying the profile-selector portion of the item if the resource matches any exact profile in `profiles[]` or any profile belonging to any profile family identified by `profilesFrom[]`, subject to `resourceTypes[]` when present and the rest of the item definition.

A Requester SHALL NOT rely on `profiles[]` to narrow a broader `profilesFrom[]` request. A Wallet/Responder SHALL NOT interpret `profiles[]` as limiting, filtering, enumerating, or narrowing the profiles available through `profilesFrom[]`.

##### 5.4.1.5 No-selector default

A Requester SHOULD avoid the no-selector default unless the workflow can safely consume broad patient-specific FHIR content and the item display text clearly explains the breadth of the request. A Wallet/Responder MAY satisfy a no-selector item with any patient-specific FHIR resources compatible with the item's `accept[]` media types. A Wallet/Responder is not required to disclose all available resources and MAY fulfill a no-selector item partially according to Section 6.

#### 5.4.2 `form.fhir`

A `form.fhir` selector has this shape:

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "<Questionnaire canonical>",
  "questionnaire": { "resourceType": "Questionnaire" }
}
```

A Requester SHALL set `content.kind` to `"form.fhir"` for this selector. A Requester SHALL include `questionnaireCanonical`, `questionnaire`, or both as direct members of the selector.

If `questionnaireCanonical` is present, the Requester SHALL encode it as a non-empty FHIR canonical string. The canonical MAY include a `|version` suffix as defined in Section 5.5.

If `questionnaire` is present, the Requester SHALL encode it as an inline FHIR `Questionnaire` resource object whose `resourceType` is `"Questionnaire"`.

A `form.fhir` selector SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. Existing-resource selection uses the `selection.fhir` selector in Section 5.4.1. If a workflow needs both form completion and existing-resource selection, the Requester SHALL use separate request items.

A Wallet/Responder SHALL reject or report unsupported for a `form.fhir` selector that has neither `questionnaireCanonical` nor `questionnaire`, that has a `questionnaireCanonical` value that is not a non-empty string, that has a `questionnaire` value that is not a Questionnaire resource object, or that mixes `form.fhir` fields with `selection.fhir` fields.

##### 5.4.2.1 By canonical

A Requester MAY provide `questionnaireCanonical` as the Questionnaire identity to be resolved. The canonical MAY include a `|version` suffix as defined in Section 5.5.

A Wallet/Responder MAY resolve the canonical using a configured canonical resolver, FHIR search against a configured endpoint, cached content, Holder data source, or other local mechanism that satisfies Section 5.5. Direct HTTP dereference of a Questionnaire canonical is permitted only for unversioned canonicals under Section 5.5.

If the Wallet/Responder cannot resolve, render, or otherwise use the referenced Questionnaire, it SHALL report the item outcome using the response status mechanism in Section 6 rather than fabricating a Questionnaire.

##### 5.4.2.2 Inline `Questionnaire`

A Requester MAY provide `questionnaire` as an inline FHIR `Questionnaire` resource object. A Requester SHALL ensure that an inline resource used in this form has `resourceType` equal to `"Questionnaire"`.

A Wallet/Responder SHALL reject or report unsupported for an inline questionnaire resource whose `resourceType` is absent or is not `"Questionnaire"`. A Wallet/Responder MAY render or process an inline Questionnaire without fetching it from a remote endpoint, subject to Wallet policy, safety checks, language support, and Questionnaire feature support.

##### 5.4.2.3 Combined canonical and Questionnaire

A Requester MAY provide both `questionnaireCanonical` and `questionnaire` as direct members of the `form.fhir` selector. The combined form lets a Wallet/Responder render the inline resource without network retrieval while preserving a stable canonical identity for response construction and receiver interpretation.

##### 5.4.2.4 Wallet behavior when both form fields disagree

A Requester SHOULD ensure that `questionnaireCanonical`, `questionnaire.url`, and `questionnaire.version` are consistent when these fields are present. At minimum, when `questionnaire.url` is present, its canonical URL should match the `url` parsed from `questionnaireCanonical` under Section 5.5; when both a canonical `|version` suffix and `questionnaire.version` are present, those values should describe the same intended Questionnaire version.

A Wallet/Responder SHALL NOT silently merge conflicting Questionnaire definitions from the inline resource and a fetched canonical resource. A Wallet/Responder SHALL NOT silently rewrite the Requester's canonical to match a conflicting inline resource.

If a Wallet/Responder detects a material disagreement between the supplied canonical and inline resource, the Wallet/Responder SHOULD treat the item as unsupported or error according to Section 6 rather than collecting answers against an ambiguous Questionnaire. A material disagreement includes a different canonical URL after applying Section 5.5 parsing and comparison rules, a different explicit version, or conflicting item structure that would change Holder answers.

##### 5.4.2.5 Example

#### 5.4.3 Extension selectors and registration rules

An extension registrant SHALL define all of the following for each extension selector kind: the exact `content.kind` string; JSON shape and required and optional members; clinical meaning; content-satisfaction rules; interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, and Artifact fulfillment; unsupported, unavailable, partial, and error behavior under Section 6; unknown-member handling; privacy and security considerations; and at least one example request item.

An extension registrant SHALL NOT define an extension selector that redefines the semantics of `type`, `version`, `id`, `purpose`, `fhirVersions[]`, `items[]`, item `id`, item `required`, item `accept[]`, `selection.fhir`, `form.fhir`, or any other core field or selector kind.

An extension registrant SHALL NOT define an extension selector that permits requester identity metadata in the SMART request body unless a future version of this specification defines an explicit trust model for doing so.

An extension registrant SHOULD choose a collision-resistant selector kind name, such as a reverse-DNS name or URI-like name, until Section 13 defines the formal selector-kind registry syntax.

A Requester SHALL NOT use an unregistered or privately defined extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support an extension selector kind SHALL NOT guess its semantics or satisfy it from display text alone. It SHALL either reject the request as unsupported or report the affected item as unsupported according to Section 6, depending on where in the selected flow the unsupported selector is discovered.

### 5.5 Canonical `|version` handling

A Requester MAY include `|version` suffixes in fields where this section permits FHIR canonicals. A Requester SHOULD NOT include a `|version` suffix in `profilesFrom[]` unless the Requester intends to identify a versioned profile family and expects the Wallet/Responder to understand that convention.

#### 5.5.1 Parsing and preservation

A Requester, Wallet/Responder, or Verifier that processes a FHIR canonical SHALL parse the canonical structurally into a non-empty `url` and an optional `version`. The `url` is the substring before the first `|`, or the whole string when no `|` is present. The `version`, when present, is the substring after the first `|`; any further `|` characters are part of the opaque version string.

Implementations SHALL preserve the original wire canonical string exactly for echoing, logging, response construction, test fixtures, returned `Resource.meta.profile` values, and generated `QuestionnaireResponse.questionnaire` values when that canonical is the Questionnaire identity being answered. Internal parsing for resolution, routing, grouping, or comparison SHALL NOT by itself rewrite the canonical that is carried or emitted.

#### 5.5.2 Resolution

A Wallet/Responder or Verifier resolving a canonical reference to a FHIR resource SHALL use a configured canonical resolver, package cache, terminology service, implementation-guide resolver, or FHIR search against a configured FHIR endpoint when such a mechanism is available. The resolver SHALL consume the parsed `(url, version)` pair, or `url` alone when no version is present, and return a matching resource.

When resolving against a FHIR endpoint, the implementation SHALL use FHIR canonical search semantics for the expected resource type: `GET [base]/{ResourceType}?url={url}&version={version}` for a versioned canonical, or `GET [base]/{ResourceType}?url={url}` for an unversioned canonical. The implementation SHALL select a single resource from the search result whose `(url, version)` matches the request and SHALL fail resolution if no such resource is present.

Direct HTTP dereference of the parsed `url` is permitted only for an unversioned canonical, only when the recipient is willing to accept the version the publisher serves at that URL, and only if the returned resource passes the verification rules below. A Wallet/Responder or Verifier SHALL NOT satisfy a versioned canonical by stripping `|version` and directly dereferencing the bare URL.

#### 5.5.3 Post-resolution verification

After resolving a canonical to a FHIR resource, the implementation SHALL verify that the resolved resource has the expected `resourceType`, has `url` equal to the parsed request `url`, and, when the request canonical was versioned, has `version` equal to the parsed request `version`.

If any of these checks fail, the implementation SHALL treat the affected request item or validation step as unsupported or error under Section 6 rather than proceeding with a mismatched resource.

#### 5.5.4 Profile matching and local classification

When a `profiles[]` request value includes `|version`, a Wallet/Responder SHALL NOT report `fulfilled` for a resource unless the resource's `meta.profile` includes the same versioned canonical or the Wallet/Responder has equivalent local conformance evidence for that exact profile version. A Verifier performing exact conformance checks SHALL apply the same versioned-to-versioned comparison.

When a `profiles[]` request value has no `|version`, a Wallet/Responder or Verifier MAY match resources known to conform to any supported version of the requested base canonical, subject to the evidence and validation rules applicable to the Artifact.

Wallet-side routing, broad content-kind classification, profile-family membership for `profilesFrom[]`, de-duplication, and Holder-display grouping MAY strip or ignore `|version` only for those local classification or grouping operations. Such stripping SHALL NOT affect resolution, exact-version profile matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation where exact version semantics matter.

#### 5.5.5 Decision matrix

A Requester, Wallet/Responder, or Verifier performing an operation in the following table SHALL apply the handling rule for that operation.

| Operation | Conformance target | Handling of `|version` |
| --- | --- | --- |
| Parse, carry, sign, encrypt, compare transport bytes, log, include in test fixtures, echo, or preserve in response fields | Requester, Wallet/Responder, Verifier | Preserve the canonical string exactly as it appeared in the SMART request or response, subject to privacy minimization for retained records. |
| Resolve a canonical Questionnaire or other FHIR conformance resource | Wallet/Responder, Verifier | Parse to `(url, version)`, use a configured canonical resolver or FHIR canonical search when available, permit direct HTTP dereference only for unversioned canonicals, and verify the resolved resource's `(url, version)` and `resourceType`. |
| Wallet-side item routing or broad content-kind classification | Wallet/Responder | Strip or ignore `|version` only for routing decisions so local routing to questionnaire or other handlers does not depend on version suffix syntax. |
| Profile-family membership for `profilesFrom[]` | Wallet/Responder | Strip or ignore `|version` before profile-family lookup unless a future profile-family definition explicitly defines version-sensitive membership. |
| Exact `profiles[]` matching when the request value has no `|version` | Wallet/Responder, Verifier | Match resources known to conform to a supported version of the requested base canonical, subject to the evidence and validation rules applicable to the Artifact. |
| Exact `profiles[]` matching when the request value includes `|version` | Wallet/Responder, Verifier | Require exact-version evidence; compare the versioned request canonical to versioned `meta.profile` values or equivalent local conformance evidence. |
| De-duplication or grouping for Holder display | Wallet/Responder | MAY group canonicals that differ only by `|version`, but SHALL preserve exact requested strings where exact version matters to Holder review, response construction, diagnostics, or validation. |
| `QuestionnaireResponse.questionnaire` generated for a questionnaire item | Wallet/Responder | Preserve the request canonical, including `|version`, when that canonical is the Questionnaire identity being answered and the information is known. |
| Returned FHIR `Resource.meta.profile` | Wallet/Responder | SHALL NOT remove `|version` suffixes from returned `meta.profile` values merely because request matching stripped versions for routing, family lookup, or grouping. |
| Verifier-side exact conformance checks against returned resources | Verifier | Compare at the same normalization level on both sides: versioned-to-versioned when exact version was requested and evidence is present, or unversioned-to-base-canonical when the request was unversioned. |

A Wallet/Responder SHALL NOT rewrite a requested canonical in a way that changes the semantic Questionnaire or profile being requested. A Wallet/Responder SHALL NOT strip a `|version` suffix from returned clinical content fields where the suffix communicates the profile or Questionnaire version actually used.

### 5.6 Accepted media types and ordering semantics

A Requester SHALL include a non-empty `accept[]` array on every request item. A Requester SHALL encode each value as a media type string. A Requester SHALL order `accept[]` from most preferred to least preferred and SHALL NOT rely on any separate preference field.

A Requester SHALL list only media types it is prepared to parse, validate, and route for the corresponding item.

A Wallet/Responder MAY return any Artifact media type listed in the fulfilled item's `accept[]`, subject to Holder decision, available Holder data sources, Wallet capability, FHIR version support, local policy, and content-source constraints. A Wallet/Responder SHOULD choose the earliest listed media type it can produce when multiple response forms are otherwise equivalent for the item.

A Wallet/Responder SHALL NOT return a media type for a request item unless that media type appears in that item's `accept[]`, except where a registered compatibility rule says that the returned media type satisfies an accepted type.

A Verifier SHALL treat an Artifact as invalid for a fulfilled item if the Artifact `mediaType` is not present in that item's `accept[]`, except where a registered compatibility rule says that the returned media type satisfies an accepted type. If one Artifact fulfills multiple request items, its `mediaType` SHALL be acceptable for every item it claims to fulfill under the preceding rule.

Version 1.0 defines the following core media types for request `accept[]` values:

| Media type | Meaning in `accept[]` | Response-model dependency |
| --- | --- | --- |
| `application/fhir+json` | The Requester can consume raw FHIR JSON for this item. For questionnaire items, this means a FHIR `QuestionnaireResponse`; for FHIR resource items, this means a FHIR Resource or Bundle as defined in Section 6. | A corresponding response Artifact uses `mediaType: "application/fhir+json"` and declares `fhirVersion` under Section 6. |
| `application/smart-health-card` | The Requester can consume SMART Health Card file JSON for this item. | A corresponding response Artifact uses `mediaType: "application/smart-health-card"`; the signed health-card content carries its own FHIR-version semantics under Section 6. |

Extension media types MAY be used when defined by a registered extension or deployment agreement. An extension media-type registrant SHALL define the media type string, Artifact shape, processing rules, validation rules, security considerations, privacy considerations, FHIR-version handling if any, and any compatibility with core media types.

## 6. Clinical content - response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder answers a SMART request after Holder review, Wallet policy, and available Holder data sources have been applied. The same SMART response semantics apply when the object is returned by the same-device presentation flow or carried by a future binding.

### 6.1 `SmartHealthCheckinResponse`

A `SmartHealthCheckinResponse` has this top-level shape:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "<request-id>",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include `type`, `version`, `requestId`, `artifacts`, and `requestStatus`.

#### 6.1.1 `type`

A Wallet/Responder SHALL set `type` to the exact string `"smart-health-checkin-response"`. A Verifier SHALL reject a SMART response whose `type` member is absent or is not exactly `"smart-health-checkin-response"`.

#### 6.1.2 `version`

A Wallet/Responder SHALL set `version` to the exact string `"1"` for responses conforming to SMART Health Check-in 1.0. The `version` member is the SMART response-model version. It is not a FHIR version and not a presentation-transport version.

A Verifier SHALL reject a SMART response whose `version` member is absent or is not exactly `"1"`, unless a future version-compatibility rule explicitly defines compatible handling for another value.

#### 6.1.3 `requestId`

A Wallet/Responder SHALL set `requestId` to the exact `id` value from the SMART request being answered. A Verifier SHALL compare `requestId` to the original request `id` using exact string equality and SHALL reject a SMART response when the values differ.

#### 6.1.4 `artifacts[]`

`artifacts` is the list of clinical Artifacts returned by the Wallet/Responder. A Wallet/Responder SHALL encode `artifacts` as an array. The array MAY be empty when no request item produces a returned Artifact, provided `requestStatus[]` still accounts for every request item as defined in Section 6.4.

A Wallet/Responder SHALL encode each member of `artifacts[]` as an Artifact following Section 6.2 and the applicable concrete Artifact rules in Section 6.3.

#### 6.1.5 `requestStatus[]`

`requestStatus` is the per-request-item outcome list. A Wallet/Responder SHALL encode `requestStatus` as an array of status objects following Section 6.4. The `requestStatus[]` array is required even when every item is fulfilled, because it records item-level outcomes and preserves accounting for declined, unavailable, unsupported, partial, and error outcomes.

### 6.2 Artifact common shape

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` on every Artifact. A Wallet/Responder SHALL also include the payload fields defined for the Artifact's media type.

#### 6.2.1 `id` uniqueness within response

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to a single SMART response and are stable only within that response.

A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within a single SMART response. A Verifier SHALL reject a SMART response with a missing, non-string, empty, or duplicate Artifact `id`.

A Requester or receiver SHALL NOT treat Artifact ids as patient identifiers, requester identifiers, global document identifiers, or clinical provenance identifiers unless that meaning is separately established by the Artifact payload or deployment policy.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. `mediaType` declares the clinical response form of the Artifact. Artifacts use `mediaType`; they do not use a separate Artifact-level protocol `type` discriminator.

Version 1.0 defines these core Artifact media types:

| Media type | Artifact class | Summary |
| --- | --- | --- |
| `application/smart-health-card` | SMART Health Card Artifact | `value` is a SMART Health Card file-style JSON object with `verifiableCredential[]`. |
| `application/fhir+json` | Raw FHIR JSON Artifact | `value` is a raw FHIR Resource or Bundle, and the Artifact declares `fhirVersion`. |

The version 1.0 core Artifact union is closed over these two core variants. A version 1.0 Verifier SHALL NOT treat an unrecognized `mediaType` as a generic Artifact merely because it carries a field named `value`, `url`, `data`, or another plausible carrier.

The Artifact type list is extensible by future SMART Health Check-in versions and by registered or profiled extension Artifact media types. Each extension Artifact type SHALL be a branded variant that pins a specific `mediaType` literal or clearly bounded media-type pattern and defines its own typed payload fields. The base protocol does not define generic carrier semantics for unknown media types.

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. A Verifier SHALL enforce the same check under Section 6.6.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids on every Artifact. Each value in `fulfills[]` SHALL exactly equal the `id` of an item in the original SMART request.

A Wallet/Responder MAY list more than one request item id in `fulfills[]` when one Artifact satisfies multiple items. If the same Artifact fulfills multiple items, the Artifact's `mediaType` SHALL be acceptable for every item listed in `fulfills[]`.

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not resolve to exactly one request item in the original SMART request.

#### 6.2.4 Payload fields are media-type-specific

For the two core media types defined in this section, a Wallet/Responder SHALL use `value` as the payload field. A SMART Health Card Artifact SHALL use `value.verifiableCredential[]` as defined in Section 6.3.1. A raw FHIR JSON Artifact SHALL use `value` as the FHIR Resource or Bundle as defined in Section 6.3.2.

Registered or profiled extension Artifact types MAY define `value`, a structured locator, an encoded payload field, or any other typed fields appropriate for that media type. Such fields have only the semantics assigned by the registered or profiled extension Artifact definition. The protocol does not define a generic `value` / `url` / `data` catch-all, and it does not define a rule that allows multiple generic carrier keys to coexist with media-type-defined merge semantics.

A Verifier or receiver SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration rules from a field name alone. Those rules come from a recognized core Artifact definition, a supported registered or profiled extension Artifact definition, a transport binding, or local policy.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card artifact (`application/smart-health-card`)

A Wallet/Responder that returns a SMART Health Card Artifact SHALL set `mediaType` to `"application/smart-health-card"` and SHALL include `value` as a JSON object containing `verifiableCredential`.

A Wallet/Responder SHALL encode `value.verifiableCredential` as a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS. A Verifier or receiver that consumes this Artifact SHALL verify and process each JWS according to SMART Health Cards and local trust policy.

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer `fhirVersion`. FHIR content and FHIR version semantics for this Artifact class are inside the signed SMART Health Card credential payloads, not in the SMART Health Check-in Artifact wrapper.

A SMART Health Card Artifact SHALL NOT use an Artifact-level profile summary field to claim conformance to request selectors. A Verifier validates clinical suitability by inspecting signed payload content, including FHIR resources and their `meta.profile` values where present, and by applying the original request selectors and local policy.

#### 6.3.2 Raw FHIR JSON artifact (`application/fhir+json`)

A Wallet/Responder that returns a raw FHIR JSON Artifact SHALL set `mediaType` to `"application/fhir+json"`, SHALL include `fhirVersion` as a non-empty FHIR release-version string, and SHALL include `value` as a FHIR JSON object.

A raw FHIR JSON Artifact `value` SHALL be one of:

1. a single FHIR Resource JSON object with `resourceType` present as a string; or
2. a FHIR Bundle JSON object with `resourceType` equal to `"Bundle"` and `entry[]` resources when the Artifact packages multiple resources.

A Wallet/Responder SHOULD use a Bundle when returning multiple FHIR resources in a single `application/fhir+json` Artifact. A Wallet/Responder MAY return a single resource directly when the Artifact contains only that resource.

A Wallet/Responder SHALL interpret all FHIR resources in one `application/fhir+json` Artifact under the Artifact's `fhirVersion`. A Wallet/Responder SHALL NOT mix resources requiring different FHIR releases within the same `application/fhir+json` Artifact. When responsive content uses different FHIR releases, the Wallet/Responder SHALL return separate `application/fhir+json` Artifacts, each with its own `fhirVersion`, or report the affected item as partial, unavailable, unsupported, or error according to Section 6.4.

A Wallet/Responder SHOULD choose a `fhirVersion` advertised in the request's `fhirVersions[]` when the original request included that field and the Wallet/Responder can produce responsive raw FHIR JSON in an advertised version. A Verifier SHALL reject an `application/fhir+json` Artifact whose `fhirVersion` is absent or not a non-empty string. A Verifier SHOULD treat an `application/fhir+json` Artifact whose `fhirVersion` is not acceptable for the original request or receiver as unsupported for ingestion, even if the SMART response is otherwise syntactically valid.

A raw FHIR JSON Artifact SHOULD NOT include an Artifact-level profile summary field. Wallets/Responders SHALL preserve FHIR `meta.profile` strings in the returned resource or in `Bundle.entry[].resource.meta.profile` where known, including any `|version` suffixes preserved under Section 5.5. Wallets/Responders SHALL NOT strip or normalize version suffixes from source `meta.profile` strings when constructing a raw FHIR JSON Artifact. Verifiers and receivers SHOULD inspect the FHIR payload itself, especially `meta.profile`, rather than relying on a wrapper-level profile summary.

#### 6.3.3 Extensible Artifact variants

A Wallet/Responder MAY return an extension Artifact only when the Artifact `mediaType` is accepted by every request item listed in `fulfills[]`, subject to any registered compatibility rule, and when the Wallet/Responder can construct the Artifact according to a recognized extension Artifact definition. The extension Artifact SHALL include `id`, `mediaType`, `fulfills`, and the typed payload fields required by that definition.

An extension registrant SHALL define the exact media type string or bounded media-type pattern; the branded Artifact variant name; all required and optional typed payload fields; payload shape; encoding; dereferencing and integrity rules; FHIR-version handling if any; status behavior; validation rules; security considerations; privacy considerations; and compatibility, if any, with core media types.

An extension registrant SHALL NOT define only an unbounded `mediaType: string` catch-all and SHALL NOT rely on protocol-level generic `value`, `url`, or `data` carrier semantics for unknown media types. If an extension needs a URL pointer, inline JSON payload, encoded data blob, manifest, or combination of fields, those fields and their interaction rules SHALL be part of that extension Artifact's own typed definition.

An extension registrant SHALL NOT define an Artifact media type that redefines the semantics of `type`, `version`, `requestId`, `artifacts[]`, `requestStatus[]`, `id`, `mediaType`, or `fulfills[]`.

If an extension Artifact contains raw FHIR content, its media type or extension profile SHALL define whether an outer `fhirVersion` is required and how it is validated. If no such rule exists, a Verifier SHALL NOT assume the Artifact has the same FHIR-version semantics as `application/fhir+json`.

### 6.4 Status reporting

Each status entry has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

#### 6.4.1 `requestStatus[]` covers every request item exactly once

A Wallet/Responder SHALL include exactly one status entry for every item in the original SMART request. A Wallet/Responder SHALL set each `requestStatus[].item` to the exact `id` of one request item. A Wallet/Responder SHALL NOT include duplicate status entries for the same request item and SHALL NOT include a status entry for an item id that is not present in the original request.

A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every request item exactly once and contains no unknown item id.

If the original SMART request contains zero items, a conforming Wallet/Responder still SHALL include `requestStatus` as an array. Appendix B and conformance closure are expected to decide whether zero-item requests become prohibited; Section 5.2.6 currently makes non-empty `items[]` a SHOULD rather than a hard requirement.

#### 6.4.2 Status code registry

A Wallet/Responder SHALL set `requestStatus[].status` to one of the following version 1.0 status codes unless a future registered status-code extension is explicitly supported by the receiving Verifier.

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without a Holder refusal being the relevant cause. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, `questionnaireCanonical`/`questionnaire` combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use `unsupported`, not `unavailable`, when it cannot process the request item because the selector kind, selector shape, requested media type, FHIR version, or Questionnaire definition is not supported. A Wallet/Responder SHALL use `unavailable`, not `unsupported`, when it understands the item but lacks matching shareable content.

A Wallet/Responder SHOULD use `unsupported` for a material `questionnaireCanonical`/`questionnaire` disagreement detected before answers are collected or response construction begins. A Wallet/Responder SHOULD use `error` for an operational failure that occurs while rendering, collecting, converting, or constructing a response for a Questionnaire that the Wallet/Responder otherwise understood.

A Wallet/Responder SHALL use `declined` when the relevant reason for non-fulfillment is the Holder's decision not to share or complete the item. A Wallet/Responder MAY also use `declined` when local Wallet policy implements Holder preferences that prohibit disclosure for the item.

A Wallet/Responder SHALL use `partial` when it returns responsive content but does not claim complete satisfaction, including when only a subset of matching FHIR resources is shared for a broad selector or when Holder decisions or Wallet policy permit only a subset of available content.

A Wallet/Responder SHALL use `fulfilled` only when it believes the item is fully satisfied. `fulfilled` is the Wallet/Responder's response-construction claim; it does not prevent a Verifier from rejecting the response during validation or a Requester from applying stricter downstream clinical policy.

A Wallet/Responder SHALL use `error` when a processing failure prevents normal outcome classification. Error status is appropriate for transient data-source failures, internal exceptions, parsing failures in Holder data after item processing begins, failed conversion to an accepted Artifact media type, or response-construction failures. A Wallet/Responder SHOULD avoid placing sensitive diagnostics in `message`.

A `fulfilled` or `partial` status SHOULD have at least one Artifact whose `fulfills[]` includes the item id unless a registered extension explicitly defines a non-Artifact fulfillment pattern. An item with `declined`, `unavailable`, or `unsupported` status normally has no fulfilling Artifact. A Verifier SHOULD flag inconsistent status-to-Artifact combinations according to local policy or stricter deployment profiles.

A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless a future status-code registry entry is explicitly supported by that Verifier.

#### 6.4.3 Optional `message`

A Wallet/Responder MAY include `message` as a string on any status object to provide a concise explanation intended for the Requester or response consumer. A Wallet/Responder SHALL NOT include secrets, access tokens, internal stack traces, unnecessary patient details, or unrelated Holder data in `message`.

A receiver MAY display, log, route, suppress, or localize `message` according to local policy, workflow needs, and privacy requirements. The machine-processable status code is `status`; receivers SHALL NOT rely on `message` to determine the normative status semantics.

### 6.5 Many-to-many fulfillment

#### 6.5.1 One artifact may fulfill many items

A Wallet/Responder MAY return one Artifact whose `fulfills[]` contains multiple request item ids when the same clinical content satisfies multiple items. For example, a FHIR Bundle that includes patient demographics and coverage resources might fulfill both a patient-demographics item and an insurance item if `application/fhir+json` is accepted by both items and the Bundle content satisfies both selectors.

#### 6.5.2 One item may be fulfilled by many artifacts

A Wallet/Responder MAY return multiple Artifacts whose `fulfills[]` contain the same request item id when several pieces of content together satisfy or partially satisfy one item. For example, a broad clinical-history item might be fulfilled by one raw FHIR JSON Bundle and one SMART Health Card if both media types are accepted for that item.

For every claimed fulfillment edge between an Artifact and an item, the Artifact `mediaType` SHALL be accepted by that item under Section 5.6 and Section 6.6. Many-to-many fulfillment does not relax media-type, FHIR-version, selector, status, or validation rules.

A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry for the item, regardless of how many Artifacts fulfill it. `requestStatus[]` reports the overall item outcome; `fulfills[]` reports which Artifact payloads support that outcome.

A Verifier SHALL evaluate all Artifacts that list an item in `fulfills[]` when validating or consuming that item. A receiver MAY choose which valid Artifacts to ingest or display according to workflow and local policy, but it SHALL NOT treat the mere presence of multiple Artifacts as a protocol error.

### 6.6 Cross-validation rules Verifier SHALL apply

#### 6.6.1 `requestId` match

A Verifier SHALL reject a SMART response unless `SmartHealthCheckinResponse.requestId` exactly equals the original `SmartHealthCheckinRequest.id`.

#### 6.6.2 `fulfills[]` references resolve

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not exactly match one `items[].id` value in the original SMART request. A Verifier SHALL reject a SMART response if an Artifact `fulfills[]` array is absent, empty, not an array of strings, or contains an unresolved item id.

#### 6.6.3 Artifact `mediaType` is recognized and in each fulfilled item's `accept[]`

For every Artifact, a Verifier SHALL verify that the Artifact `mediaType` is one of the version 1.0 core media types or a registered or profiled extension Artifact media type that the Verifier explicitly supports. A Verifier SHALL reject an Artifact whose `mediaType` is unrecognized, even if the Artifact includes a field named `value`, `url`, `data`, or another plausible carrier.

For every Artifact and every item id in that Artifact's `fulfills[]`, a Verifier SHALL verify that the Artifact `mediaType` appears in the corresponding request item's `accept[]` list, unless a registered media-type compatibility rule supported by the Verifier defines compatible substitution semantics.

If one Artifact fulfills multiple request items, the Verifier SHALL apply this check independently to every fulfilled item.

#### 6.6.4 `requestStatus` covers items uniquely

A Verifier SHALL reject a SMART response unless `requestStatus[]` contains exactly one status object for every original request item id, contains no status object for an unknown item id, and contains no duplicate `item` value.

The Verifier SHALL NOT infer that an item with no status entry is fulfilled merely because an Artifact references it. The status entry is the required per-item accounting record.

#### 6.6.5 FHIR version consistency

For every `application/fhir+json` Artifact, a Verifier SHALL confirm that `fhirVersion` is present as a non-empty string and that `value` is a FHIR JSON object with a string `resourceType`. If the original SMART request included `fhirVersions[]`, the Verifier SHOULD verify that each raw FHIR JSON Artifact's `fhirVersion` is one of the requested FHIR versions, unless local policy or a future compatibility rule permits another version.

A Verifier SHALL interpret every non-Bundle `application/fhir+json` resource under the Artifact's `fhirVersion`. For a Bundle Artifact, a Verifier SHALL interpret the Bundle and all `Bundle.entry[].resource` resources under the Artifact's `fhirVersion`. A Verifier SHALL reject or quarantine an `application/fhir+json` Bundle when it detects mixed FHIR release versions inside one Bundle.

A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer Artifact-level `fhirVersion`. For SMART Health Card Artifacts, a Verifier determines FHIR-version semantics from each signed credential payload under SMART Health Cards rather than from an outer SMART Health Check-in wrapper field.

#### 6.6.6 Bundle and `meta.profile` guidance

A Verifier SHOULD inspect returned FHIR `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related FHIR content when validating that returned raw FHIR JSON is responsive to the original selector. Absence of `meta.profile` is not automatically a protocol error because Section 5 permits Wallet/Responder matching based on equivalent local knowledge or trusted conformance evidence, but a Wallet/Responder SHALL NOT report `fulfilled` for a request item that requested a versioned profile unless the returned resource's `meta.profile` includes that exact versioned canonical or the Wallet/Responder has equivalent local conformance evidence for that exact profile version. When validating a raw FHIR JSON Artifact's claimed fulfillment of a versioned profile request, a Verifier SHALL require the same exact-version evidence before accepting that fulfillment edge. Receivers that require profile evidence for ingestion MAY reject or quarantine content that lacks the evidence they need.

A Verifier SHALL preserve returned `meta.profile` strings exactly as asserted in the FHIR payload when evaluating, recording, or forwarding them. In particular, a Verifier SHALL NOT strip a `|version` suffix from a returned `meta.profile` string in order to satisfy an exact-version profile request.

For `profilesFrom[]`, a Verifier MAY need implementation-guide, profile-family, or local policy knowledge outside the SMART response to decide whether a returned profile belongs to the requested profile family. A Verifier SHOULD treat `meta.profile` as evidence to be evaluated in context, not as an Artifact-level shortcut. A Wallet/Responder SHOULD NOT include a separate profile-summary field outside the FHIR payload for core raw FHIR JSON Artifacts.

For questionnaire items returning `application/fhir+json`, a Verifier SHOULD validate that the returned resource is a `QuestionnaireResponse` and that `QuestionnaireResponse.questionnaire`, when present, preserves the requested Questionnaire canonical and `|version` according to Section 5.5. If the request supplied both a Questionnaire canonical and inline resource and the Wallet/Responder reported the item as `unsupported` because of material disagreement, the Verifier SHOULD treat that as a valid item outcome rather than a transport failure.

A Verifier SHOULD preserve the distinction between response validation and downstream clinical acceptance. A SMART response can be syntactically valid and correctly bound to the original SMART request while still being incomplete, declined, unsupported, unsuitable for local ingestion, or insufficient under local clinical policy.

---

## 7. Trust framework

This section defines the trust layers that apply to SMART Health Check-in 1.0 presentation and response processing. The SMART request and SMART response are transport-neutral clinical JSON objects defined in Sections 5-6. Trust information is supplied by the selected presentation flow, returned Artifact payloads, deployment policy, or out-of-band trust-framework decisions; it is not supplied by self-asserted requester identity fields in the clinical request body.

A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator SHALL NOT treat one trust layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and its assurance level. Successful transport presentation proves only the properties validated for that transport and session. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority to act, downstream clinical acceptance, or clinical-source provenance for unsigned content.

### 7.1 Origin trust

A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body to substitute for origin trust. Prohibited metadata is defined in Section 5.2.7 and includes requester names, origins, URLs, application identifiers, package names, certificates, logos, organization metadata, signed-request metadata, and trust-framework claims. A Wallet/Responder SHALL NOT treat `purpose`, request item `title`, request item `summary`, selector values, unknown request members, extension members, or Artifact content as authenticated requester identity or authenticated origin.

A Wallet/Responder MAY use authenticated origin information for Holder display, local risk decisions, allow-list decisions, diagnostic handling, or policy enforcement. A Wallet/Responder SHALL keep any such origin decision separate from clinical-content validation under Sections 5-6.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

When the same-device presentation flow is invoked through the W3C Digital Credentials API and the Browser / User Agent or platform exposes an authenticated web origin to the Wallet/Responder, a Wallet/Responder that uses origin trust SHALL use that platform-provided origin as the web-origin input for origin display, origin policy, and any same-device binding defined in Section 8. The Wallet/Responder SHALL NOT derive authenticated origin from the SMART request JSON, `purpose`, item display text, callback-looking strings, logos, request ids, selector URLs, implementation-defined initiation metadata, or Artifact payloads.

When Section 8 binds the platform-provided origin into the same-device presentation session, a Wallet/Responder or Verifier that claims origin-bound processing SHALL use the Section 8 construction and validation rules for that binding. This section does not redefine the `SessionTranscript` bytes, HPKE context, mdoc request construction, or validation checklist.

A Wallet/Responder SHOULD make authenticated origin information available to the Holder when that information is useful for request review and safe under Wallet policy. If a Wallet/Responder displays both authenticated origin context and unauthenticated SMART request display text, it SHOULD distinguish the two.

A deployment profile MAY define how an authenticated origin maps to an organization, service, workflow, or display label. That mapping is deployment policy and SHALL NOT change the semantics of SMART request fields.

#### 7.1.2 Wallet-side privileged-caller / browser-trust policy where applicable, deployment-defined

A Wallet/Responder that relies on privileged-caller or browser-trust evidence SHALL use evidence supplied by the platform through an authenticated channel and SHALL apply Wallet or deployment policy before treating the caller as trusted to assert an origin or invoke the presentation flow. The Wallet/Responder SHALL NOT derive privileged-caller trust from the SMART request body.

A deployment profile or trust-framework operator MAY define accepted browsers, user agents, package identifiers, signing certificates, app-link relationships, enterprise controls, update procedures, revocation expectations, and failure handling for privileged-caller trust. Those requirements are out-of-band trust-framework inputs and SHALL NOT require Requesters to add self-asserted identity metadata to the SMART request body.

Development builds MAY use reflective allow-lists or demo caller evidence only when they are clearly identified as non-production behavior. A Wallet/Responder SHALL NOT treat reflective allow-lists, demo certificates, arbitrary package labels, or unauthenticated caller strings as production privileged-caller trust unless a deployment policy explicitly accepts them for that environment.

#### 7.1.3 Behavior when origin cannot be authenticated

When a Wallet/Responder cannot authenticate a web origin or privileged-caller context, it SHALL treat origin trust as absent for trust-policy purposes. The Wallet/Responder SHALL NOT infer requester identity or origin from the SMART request body to compensate for missing origin evidence.

A Wallet/Responder MAY reject the request, continue only with reduced assurance, request additional Holder confirmation, omit organization branding, require another accepted trust layer, restrict returned content, or apply other local risk controls according to Wallet policy and deployment profile. If the selected presentation flow requires authenticated origin for cryptographic session binding, the Wallet/Responder SHALL follow the failure behavior defined by that flow rather than substituting an untrusted clinical request field.

If a Wallet/Responder proceeds without authenticated origin, it SHALL NOT present unauthenticated origin or SMART request display context as verified identity. A Verifier or Requester that requires origin-authenticated presentation for a deployment workflow SHALL reject, quarantine, or avoid downstream reliance on a response when required origin evidence is absent or fails policy, even if the SMART response is otherwise valid under Section 6.

### 7.2 Reader / Verifier trust

A Requester or Verifier SHALL NOT place reader identity, organization identity, legal-entity identifiers, certificates, trust-framework claims, or signatures inside the SMART request body as a substitute for reader authentication. Such information belongs in the presentation transport, deployment policy, or out-of-band trust framework.

#### 7.2.1 Optional `readerAuth` `COSE_Sign1` over `ReaderAuthentication`

A Verifier MAY include per-`DocRequest.readerAuth` as a detached `COSE_Sign1` signature over `ReaderAuthentication` for the same-device `org-iso-mdoc` request. When a Verifier includes `readerAuth`, it SHALL construct `readerAuth` for the same presentation session and the same requested items carried in the request, using the Section 8 construction that binds the `SessionTranscript` and the exact `ItemsRequest` bytes. A Verifier SHALL NOT reuse `readerAuth` across different presentation sessions, different session transcripts, or different `ItemsRequest` bytes.

A Wallet/Responder that receives `readerAuth` and claims support for reader authentication SHALL verify the COSE signature, the signed `ReaderAuthentication` context, the detached-payload binding, the relevant request bytes, the protected algorithm and key type, and associated certificate or public-key material according to Section 8 and its configured trust-anchor policy. A Wallet/Responder SHALL treat a cryptographically invalid, malformed, mismatched, unsupported, or policy-unacceptable `readerAuth` as failed reader authentication.

A Wallet/Responder SHALL NOT treat the mere presence of `readerAuth`, a certificate chain, a common name, a logo, or a display string as successful reader authentication without signature verification and trust-policy evaluation.

#### 7.2.2 Reader certificate chain and trust-anchor policy

When `readerAuth` includes certificate material, the Wallet/Responder or deployment profile SHALL define how the certificate or certificate chain is evaluated before treating the reader as trusted. The policy SHALL identify accepted trust anchors or registry sources when reader trust is required. The policy SHOULD define certificate path validation, key usage or extended key usage, policy OIDs, subject or organization identifiers, validity-time handling, revocation or status checking where available, algorithm constraints, and mapping from authenticated certificate evidence to Holder-facing display text.

A Wallet/Responder that relies on reader certificates for a policy decision SHALL validate the reader signing key against the certificate material and SHALL evaluate the certificate chain or key evidence against the applicable trust-anchor policy. A Wallet/Responder SHALL NOT treat a self-signed demo certificate, arbitrary leaf certificate, expired certificate, revoked certificate, unsupported algorithm, or untrusted chain as production reader trust unless the deployment profile explicitly authorizes that trust anchor for the relevant environment.

A Verifier that presents reader certificate material SHALL provide the material in the location and encoding required by Section 8 and SHALL ensure that the signing key used for `readerAuth` corresponds to the authenticated certificate or key evidence it expects the Wallet/Responder to evaluate.

This base specification does not mandate a single global reader certificate authority or reader registry. A deployment profile or trust-framework operator MAY define reader trust anchors, certificate profiles, naming constraints, organizational vetting requirements, revocation feeds, registry lookups, or federation metadata.

#### 7.2.3 Wallet handling of unsigned vs. signed reader requests

`readerAuth` is optional in the core version 1.0 trust framework unless a deployment profile makes it mandatory for a class of requests. A Wallet/Responder MAY process an unsigned reader request when local policy, origin evidence, privileged-caller evidence, Holder decision, mdoc issuer/device evidence, clinical-source evidence, and deployment requirements permit. A Wallet/Responder MAY require signed reader requests for particular origins, caller classes, workflows, requested content categories, Artifact media types, deployment profiles, or assurance levels.

When `readerAuth` is absent, a Wallet/Responder SHALL treat reader authentication as absent. It SHALL NOT report or display the Verifier as reader-authenticated.

When `readerAuth` is present but invalid, untrusted, expired, unsupported, malformed, or otherwise unacceptable under policy, a Wallet/Responder SHALL treat reader authentication as failed. The Wallet/Responder SHALL distinguish absent reader authentication from failed reader authentication for policy purposes. It MAY reject the presentation request, continue only under an explicit reduced-assurance policy, require additional Holder confirmation, or apply other restrictions, subject to deployment requirements and the selected flow.

If a Wallet/Responder proceeds with an unsigned or untrusted-reader request, it SHALL NOT represent the reader or organization as authenticated by reader authentication. A Verifier SHALL NOT assume that transport invocation alone causes a Wallet/Responder to accept unsigned reader requests or to accept any reader identity claim beyond what other trust layers established.

### 7.3 Issuer / device-attestation trust (mdoc binding)

A Verifier SHALL apply the mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks required by Section 8 before relying on mdoc-layer evidence. A Verifier SHALL then apply the SMART response validation rules in Section 6.6 before the Requester consumes the clinical response.

#### 7.3.1 MSO issuer trust anchors, IACA-style or registry-based

A Verifier or deployment profile SHALL define the trust-anchor policy used to validate MSO issuer signatures for SMART Health Check-in mdoc documents when issuer trust is required. The policy MAY use IACA-style issuer anchors, registry-based issuer metadata, pinned issuer certificates, enterprise anchors, ecosystem test anchors, federation metadata, local allow-lists, or another out-of-band trust source.

A Verifier that relies on mdoc issuer evidence SHALL validate the MSO issuer signature, issuer certificate path or equivalent issuer key evidence, digest bindings, document type, namespace, disclosed element identifiers, and validity constraints required by Section 8 and the applicable trust-anchor policy. A Verifier SHALL NOT treat a syntactically valid MSO, a matching digest, a cryptographically valid signature against an included leaf certificate, or a self-signed issuer certificate as production issuer trust unless the issuer evidence chains to or otherwise matches a trust anchor accepted by the applicable deployment policy.

A deployment profile or trust-framework operator SHOULD define production-vs-test separation, issuer certificate profiles, revocation or status expectations where available, registry lookup behavior, constraints on `docType`, namespace, and element identifiers, and operational procedures for adding and removing accepted issuer anchors.

#### 7.3.2 Device key proof of possession

A Verifier SHALL verify device-key proof of possession for the same-device mdoc response as required by Section 8 before treating the mdoc presentation as device-bound. The device-authentication verification SHALL use the same presentation session and `SessionTranscript` derived for the selected flow, including origin and encryption information where the selected flow requires them.

A Verifier SHALL NOT treat a SMART response extracted from an mdoc response as transport-valid if device-key proof fails, if device authentication is not bound to the expected presentation session, or if the disclosed response element does not match the issuer-signed digest under the selected mdoc validation rules.

A Wallet/Responder that constructs an mdoc response SHALL produce the device-key proof required by Section 8 for the selected presentation session when the flow requires device-bound mdoc evidence.

#### 7.3.3 Self-attested wallet model

A deployment profile MAY permit a self-attested wallet model in which the Wallet/Responder creates an mdoc presentation container without an externally accredited production issuer chain, or with test, local, self-signed, or deployment-specific issuer evidence. In this model, the mdoc layer can still support session binding, response integrity, transport protection, and Holder-mediated disclosure when Section 8 validation succeeds, but issuer assurance is limited to the trust anchors or local policy accepted by the Verifier for that deployment.

A Verifier MAY accept self-attested Wallet presentations only under a deployment policy that explicitly permits that model and defines the resulting assurance level. A Verifier or Requester that accepts self-attested Wallet evidence SHALL treat the issuer/device layer as self-attested or deployment-local, not as production third-party issuer assurance. A Verifier, Requester, or Wallet/Responder SHALL NOT label self-attested mdoc evidence as externally issuer-accredited or production issuer-trusted unless the applicable issuer and trust-anchor policy supports that claim.

A Wallet/Responder using a self-attested model SHALL NOT claim, through the SMART response wrapper or mdoc container, that raw FHIR JSON Artifacts are issuer-signed clinical credentials. If clinical-source provenance is needed, the Wallet/Responder needs to return an Artifact that carries separate provenance or signature evidence, such as a SMART Health Card where appropriate, or the Requester needs to rely on deployment policy.

### 7.4 Source trust on clinical content

A Verifier or receiver SHALL evaluate clinical-source trust according to the Artifact `mediaType`, payload signatures or provenance, request selectors, FHIR evidence, SMART Health Card rules where applicable, extension-profile rules where applicable, and deployment policy. A Verifier or receiver SHALL NOT infer clinical-source provenance from successful transport presentation alone.

A Requester MAY apply stricter clinical-source, patient-match, freshness, completeness, terminology, FHIR-profile, provenance, or local-ingestion requirements before workflow use. Those downstream decisions do not change whether the SMART response is syntactically and procedurally valid under Sections 5-6.

#### 7.4.1 SMART Health Card chain of custody

An `application/smart-health-card` Artifact carries one or more SMART Health Card Verifiable Credential JWS strings in `value.verifiableCredential[]`. A Verifier or receiver that consumes a SMART Health Card Artifact SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on the signed clinical content or issuer claims.

For SMART Health Card Artifacts, FHIR content, FHIR version semantics, issuer identity, and signed clinical-source evidence are inside the signed credential payloads. A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact, and a Verifier SHALL reject such an outer `fhirVersion` under Section 6.3.1 and Section 6.6.5.

A Verifier or receiver SHALL evaluate signed SMART Health Card payload content against the original SMART request selectors and local policy before relying on the Artifact for a requested item. A valid SMART Health Card signature proves only the claims made by that credential under the accepted SMART Health Card trust policy. It does not by itself prove that the Artifact satisfies every request selector, that all requested content was returned, that the Holder is the intended patient, that the content is current enough for the workflow, or that downstream ingestion is authorized.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

An `application/fhir+json` Artifact is raw FHIR JSON mediated by the Holder and Wallet/Responder. A Wallet/Responder SHALL include `fhirVersion` on each raw FHIR JSON Artifact as defined in Section 6.3.2. A Verifier SHALL treat that `fhirVersion` as FHIR release context for interpreting the raw FHIR Artifact, not as a clinical-source signature, provenance record, issuer credential, or proof of clinical correctness.

A Verifier or receiver SHALL treat raw FHIR JSON as patient-mediated content unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof. Examples of separate evidence can include a FHIR `Provenance` resource, a FHIR digital signature, a signed Bundle, an extension Artifact media type with defined integrity rules, authenticated retrieval evidence, or another deployment-accepted attestation. These examples are illustrative and do not mandate a particular provenance technology.

A Wallet/Responder SHALL NOT use transport encryption, mdoc issuer signatures, device-key proof, `readerAuth`, origin evidence, `purpose`, item text, Artifact ids, `fulfills[]`, implementation-defined initiation fields, or successful SMART response validation to claim that unsigned raw FHIR JSON is an issuer-signed clinical credential. A Verifier or receiver MAY accept patient-mediated raw FHIR JSON for a workflow under local policy, but it SHALL NOT equate raw FHIR JSON with SMART Health Card or other signed clinical-source evidence unless separate proof is present and accepted.

A Requester that requires source-authenticated FHIR content SHOULD request media types or deployment profiles that carry suitable provenance or signature evidence and SHOULD apply local policy before downstream ingestion.

### 7.5 Identifier scoping and uniqueness

Identifiers in SMART Health Check-in are scoped protocol correlation values unless their defining payload, presentation binding, Artifact payload, or deployment policy gives them a broader meaning. A Requester, Wallet/Responder, Verifier, deployment profile, or trust-framework operator SHALL preserve identifier scopes and SHALL NOT treat an identifier from one layer as an identifier, proof, or authorization for another layer unless this specification or an explicit deployment profile defines that binding.

A Requester SHALL generate `SmartHealthCheckinRequest.id` values as defined in Section 5.2.3. The request `id` is scoped to SMART requests created by that Requester for the same check-in session; it is not a patient identifier, requester identifier, origin identifier, reader identifier, mdoc session identifier, issuer identifier, freshness proof, authorization proof, or clinical fact. A Wallet/Responder SHALL copy the request `id` exactly into `SmartHealthCheckinResponse.requestId` as required by Section 6.1.3. A Verifier SHALL validate the exact `requestId` match under Section 6.6.1 and SHALL NOT use that match as a substitute for transport freshness, origin trust, reader authentication, patient matching, or clinical provenance.

A Requester SHALL keep request item `id` values unique within one SMART request as required by Section 5.3.1. A Wallet/Responder SHALL preserve request item ids exactly when constructing `fulfills[]` and `requestStatus[].item`. A Verifier SHALL validate item references as defined in Section 6.6. Item ids are not global clinical identifiers or patient identifiers.

A Wallet/Responder SHALL keep Artifact `id` values unique within one SMART response as required by Section 6.2.1. A Requester, Verifier, receiver, Wallet/Responder, deployment profile, or trust-framework operator SHALL NOT treat Artifact ids as global document identifiers, patient identifiers, requester identifiers, clinical provenance identifiers, or source document identifiers unless that meaning is separately established by the Artifact payload, signature, provenance, or deployment policy.

Presentation-layer and implementation-defined initiation identifiers, including web origins, reader certificate subjects, issuer certificate subjects, certificate serial numbers, key ids, mdoc docTypes, namespaces, element identifiers, `SessionTranscript` components, nonces, URL tokens, relay identifiers, response-routing identifiers, and completion identifiers, have the scopes defined by their respective sections, implementation design, or deployment profiles. Identifier uniqueness at one layer does not imply uniqueness at another layer. A Wallet/Responder, Verifier, or Requester SHALL NOT use presentation or initiation identifiers to replace the SMART request `id`, request item ids, Artifact ids, `fulfills[]` links, or `requestStatus[]` accounting required by Sections 5-6.

A deployment profile SHOULD define collision resistance, replay handling, retention, logging, telemetry, and privacy expectations for identifiers it introduces or constrains, especially when identifiers can appear in browser history, QR codes, logs, telemetry, certificate fields, or downstream records.

### 7.6 Out-of-band trust establishment / deployment policy

A deployment profile or trust-framework operator that adds out-of-band trust requirements SHALL document:

1. which roles are constrained, such as Wallet/Responder, Verifier, Requester, or downstream receiver;
2. which trust layer is constrained: origin, privileged caller, reader authentication, mdoc issuer, device proof, self-attested wallet evidence, clinical-source provenance, or downstream receiver policy;
3. the accepted trust anchors, registries, allow-lists, certificate policies, issuer policies, source-provenance mechanisms, or assurance labels;
4. freshness, revocation, expiration, replay, or status-check expectations;
5. required Wallet/Responder behavior when evidence is missing, invalid, expired, revoked, unsupported, ambiguous, inconsistent, or outside policy;
6. required Verifier, Requester, or receiver behavior when a presentation succeeds but clinical-source, patient-match, local-ingestion, or downstream workflow policy is not satisfied; and
7. how Holder-facing display distinguishes authenticated identity, authenticated origin, authenticated reader information, unauthenticated request text, and local policy warnings.

A deployment profile SHALL state which trust layers are mandatory for each conformance or deployment context it defines. If a deployment profile permits operation when a trust layer is absent or fails, it SHALL state the resulting assurance level and any restrictions on use of returned content.

A deployment profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, Artifact media types, selector semantics, fulfillment links, or status codes. It MAY require stricter validation, narrower accepted media types, stronger provenance, additional display, stronger trust anchors, or rejection of otherwise optional trust modes.

A Verifier or Requester SHALL apply the trust policy required by its deployment before using a SMART response for downstream workflow. A Wallet/Responder SHALL apply its local policy and any applicable deployment profile before disclosing content. A Wallet/Responder MAY refuse a request when required trust evidence is missing, unacceptable, expired, revoked, inconsistent, or not understandable.

Implementation-defined in-person initiation, relay, or completion components SHALL preserve the trust boundaries defined here and SHALL NOT redefine SMART request or SMART response clinical semantics. If such components are used to load a same-device Verifier page, the normative presentation flow remains the Section 8 direct `org-iso-mdoc` flow.

---

## 8. Same-device presentation flow over `org-iso-mdoc`

This section defines the base SMART Health Check-in 1.0 same-device presentation flow. A Verifier carries the transport-neutral SMART request defined in Section 5 to a Wallet/Responder through the W3C Digital Credentials API direct `org-iso-mdoc` path, and the Wallet/Responder returns the transport-neutral SMART response defined in Section 6 inside an mdoc `DeviceResponse` encrypted for the Verifier.

This same-device direct `org-iso-mdoc` flow is the only normative SMART Health Check-in 1.0 presentation flow. In-person initiation mechanisms such as QR codes, NFC tags, or deep links MAY be used as implementation-defined ways to load a same-device Verifier page that runs this section; their URL formats, relay behavior, storage, and completion handling are outside this specification.

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

A Verifier SHALL carry the SMART request only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic element names, implementation-defined initiation wrapper fields, archived claim-name experiments, or other locations as the version 1.0 request carrier for this flow.

A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`.

### 8.2 Verifier-side request construction

A Verifier begins with a SMART request object that conforms to Section 5.

#### 8.2.1 SMART request JSON in `requestInfo`

A Verifier SHALL serialize the SMART request as UTF-8 JSON text and place the resulting string at:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

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

The `true` value is the mdoc `intentToRetain` value for the requested element. A Verifier SHALL default `intentToRetain` to `true` for `smart_health_checkin_response` because ordinary clinical check-in workflows commonly ingest or route returned Artifacts. A Verifier MAY set it to `false` only when the Verifier truly intends ephemeral use and applicable deployment policy permits that signal. The flag does not override Holder choice, Wallet policy, legal requirements, Section 12 privacy requirements, or downstream retention policy.

A Verifier SHALL NOT model FHIR profiles, request items, questionnaires, Artifact media types, status codes, or individual clinical resources as separate mdoc elements in the core flow. The stable mdoc element carries one SMART response whose internal clinical semantics are defined by Section 6.

#### 8.2.3 Tag-24 wrapping

A Verifier SHALL CBOR-encode the `ItemsRequest` and wrap those bytes in CBOR tag 24 before placing it in `DocRequest.itemsRequest`:

```text
ItemsRequestBytes = tag24(CBOR(ItemsRequest))
```

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

A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy; active version 1.0 fixtures use 32 bytes. Appendix C or a deployment profile can impose a tighter nonce-size rule for conformance vectors; companion byte-ladder material can illustrate it.

The Verifier SHALL retain the matching HPKE private key and the exact `encryptionInfo` CBOR bytes until response processing completes or the presentation session is abandoned.

#### 8.2.6 Digital Credentials API request shape

A Verifier SHALL base64url-encode the CBOR `DeviceRequest` bytes and CBOR `encryptionInfo` bytes without padding. It SHALL invoke the Digital Credentials API with a request equivalent to:

```text
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

A Verifier SHALL preserve the exact `encryptionInfo` base64url string because Section 8.3 binds that string, not a re-encoded equivalent, into the `SessionTranscript`.

### 8.3 `SessionTranscript` and origin binding

Both sides SHALL compute the same direct `dcapi` `SessionTranscript` bytes for a presentation session.

The construction is:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

A Wallet/Responder SHALL obtain `origin` from an authenticated Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. A Wallet/Responder SHALL NOT derive `origin` from the SMART request JSON, `purpose`, item `title`, item `summary`, selector URLs, request ids, implementation-defined initiation metadata, callback-looking strings, or Artifact contents.

A Verifier SHALL use the same origin value that the platform/requester context uses for this invocation when constructing `readerAuth`, HPKE `info`, and expected device authentication inputs. A Wallet/Responder SHALL use the same `SessionTranscript` bytes for optional `readerAuth` verification, for `DeviceAuthentication`, and for HPKE response encryption. A Verifier SHALL use the same bytes for HPKE opening and device-signature verification.

If authenticated origin or deployment-approved privileged-caller context is unavailable, the Wallet/Responder SHALL treat origin trust as absent under Section 7.1.3. If the Wallet/Responder cannot construct the `SessionTranscript` required for this flow, it SHALL fail the presentation or proceed only under an explicit deployment profile that defines the serialized origin-equivalent input, resulting assurance level, Holder display, and Verifier validation behavior. A Wallet/Responder SHALL NOT silently substitute a self-asserted SMART request field as the origin.

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
10. parse that string as UTF-8 JSON and validate it as a SMART request under Section 5;
11. base64url-decode `data.encryptionInfo`, parse it as CBOR, require the direct `"dcapi"` envelope, and validate the recipient public key as P-256 COSE_Key material; and
12. recompute the `SessionTranscript` under Section 8.3 using the exact request `encryptionInfo` base64url string and authenticated origin or approved origin-equivalent context.

If the SMART request JSON is absent, not a string, unparsable, not a JSON object, or invalid under Section 5, the Wallet/Responder SHALL reject the presentation request, report failure through the selected platform mechanism, or otherwise fail safely. The Wallet/Responder SHALL NOT infer clinical request semantics from mdoc element names, display strings, archived dynamic-element encodings, unknown request fields, or implementation-defined initiation wrappers.

If `readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, the Wallet/Responder SHALL verify the detached `COSE_Sign1`, protected algorithm, `ReaderAuthenticationBytes`, `SessionTranscript`, exact tag-24 `ItemsRequestBytes`, signature, `x5chain` certificate evidence, and deployment trust policy. The Wallet/Responder SHALL distinguish at least these states for policy and display purposes: absent `readerAuth`; syntactically invalid `readerAuth`; cryptographically failed `readerAuth`; cryptographically valid but untrusted or policy-unacceptable `readerAuth`; and trusted `readerAuth` under the applicable deployment policy.

After request and trust processing, the Wallet/Responder SHALL run Holder review or equivalent Holder-control processing at request-item granularity. It SHALL preserve request item `id` values for response accounting. It MAY group, summarize, reorder, or suppress display details according to accessibility, safety, localization, local policy, and applicable law, but it SHALL NOT treat `required: true` as consent and SHALL NOT present `purpose`, item `title`, item `summary`, or other SMART request fields as authenticated requester identity.

### 8.5 Wallet-side response construction

A Wallet/Responder that proceeds after request validation and Holder review SHALL construct a SMART response according to Section 6. The response `requestId` SHALL exactly equal the accepted SMART request `id`; `artifacts[]`, `fulfills[]`, and `requestStatus[]` SHALL follow Section 6.1-6.5. This exact match is a clinical correlation check only; it is not a freshness proof, patient identity proof, requester identity proof, or clinical-source proof.

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

#### 8.5.3 `DeviceAuthentication`, device signature, and `DeviceResponse`

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same presentation session using the Section 8.3 `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

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
5. reconstruct the expected Section 8.3 `SessionTranscript` from the original `encryptionInfo` base64url string and origin used for the request;
6. HPKE-open `cipherText` using the retained recipient private key, the corresponding recipient public key from `encryptionInfo`, the received `enc`, the required HPKE suite, `info = SessionTranscript bytes`, and empty `aad`;
7. reject the response if HPKE opening fails;
8. parse the plaintext as CBOR `DeviceResponse`;
9. require `DeviceResponse.version` to be `"1.0"` and `DeviceResponse.status` to indicate success for the document being accepted;
10. locate a document whose `docType` is `org.smarthealthit.checkin.1`;
11. verify `issuerAuth` as an ES256 `COSE_Sign1`, decode and validate the MSO, verify the MSO `docType`, validity information, device key, and issuer signature, and evaluate issuer evidence under Section 7.3 and deployment policy before claiming production issuer trust;
12. locate the disclosed issuer-signed item in namespace `org.smarthealthit.checkin` whose `elementIdentifier` is `smart_health_checkin_response`;
13. recompute the value digest over the exact tag-24-wrapped `IssuerSignedItem` bytes and compare it to the MSO `valueDigests["org.smarthealthit.checkin"][digestID]` entry;
14. verify the device `COSE_Sign1` signature using `MSO.deviceKeyInfo.deviceKey` over `DeviceAuthentication` constructed with the expected `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes;
15. require the `smart_health_checkin_response` `elementValue` to be a string;
16. parse that string as JSON and validate it as a `SmartHealthCheckinResponse` under Section 6; and
17. apply all Section 6.6 cross-validation rules against the original SMART request before accepting the response as protocol-valid.

A Verifier SHALL reject or quarantine the presentation response if HPKE opening fails, mdoc issuer/MSO validation fails, value-digest validation fails, device authentication fails, the stable response element is absent or malformed, SMART response JSON validation fails, or Section 6.6 cross-validation fails.

A Verifier SHALL keep trust decisions distinct. HPKE success, origin binding, reader authentication, issuer/MSO validation, device-key proof, syntactic SMART response validity, and SMART Health Card verification are separate checks. None of those checks, by itself, proves patient identity, request freshness beyond the selected session controls, downstream authorization, or clinical-source provenance for unsigned raw FHIR JSON.

### 8.8 Required validation checklist

#### 8.8.1 Verifier checklist

A Verifier implementing the same-device `org-iso-mdoc` flow SHALL validate at least the following before accepting the returned SMART response for Requester use:

| Layer | Required validation |
| --- | --- |
| Original request | The original SMART request is valid under Section 5 and retained for Section 6.6 cross-validation. |
| Request construction | The Verifier used protocol `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, tag-24 `ItemsRequest`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, requested element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`. |
| Session setup | `encryptionInfo` has the direct `"dcapi"` shape with fresh nonce and P-256 recipient public key; the expected `SessionTranscript` is derived from the exact `encryptionInfoBase64Url` and origin. |
| Reader authentication | If deployment policy requires `readerAuth`, it is present, cryptographically valid, bound to the same `SessionTranscript` and exact tag-24 `ItemsRequest`, and trusted under policy. If `readerAuth` is absent or fails, that state is not conflated with trusted reader authentication. |
| Response wrapper | Returned protocol is `org-iso-mdoc`; `data.response` base64url-decodes to `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]`. |
| HPKE | HPKE opening succeeds with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty `aad`. |
| `DeviceResponse` | Plaintext parses as CBOR `DeviceResponse`; version is `"1.0"`; status is successful; a document has `docType` `org.smarthealthit.checkin.1`. |
| Issuer/MSO | `issuerAuth` verifies as ES256 `COSE_Sign1`; MSO `docType`, `digestAlgorithm`, validity information, value digests, device key, and issuer evidence satisfy Section 7.3 and deployment policy. |
| Digest binding | The disclosed tag-24 `IssuerSignedItem` for namespace `org.smarthealthit.checkin` hashes to the corresponding MSO value digest. |
| Stable element | The accepted disclosed element has `elementIdentifier` `smart_health_checkin_response` and a string `elementValue`. |
| Device proof | `deviceSignature` verifies with `MSO.deviceKeyInfo.deviceKey` over `DeviceAuthentication` bound to the expected `SessionTranscript`, `docType`, and `DeviceNameSpaces`. |
| SMART response | Extracted JSON validates as a SMART response under Section 6. |
| Request/response cross-validation | Section 6.6 checks pass: exact `requestId` match, `fulfills[]` references resolve, Artifact `mediaType` is accepted by each fulfilled item, `requestStatus[]` covers every request item exactly once, and FHIR/SMART Health Card checks are applied. |
| Trust interpretation | Section 7 and deployment policy are applied without treating transport success as clinical-source provenance or patient identity proof. |

#### 8.8.2 Wallet/Responder checklist

A Wallet/Responder implementing the same-device flow SHALL validate at least the following before disclosing content:

| Layer | Required validation |
| --- | --- |
| Request wrapper | Protocol is `org-iso-mdoc`; `data.deviceRequest` and `data.encryptionInfo` are present, base64url-decodable, and CBOR-decodable. |
| `DeviceRequest` | Version is `"1.0"`; a tag-24 `ItemsRequest` is present for `docType` `org.smarthealthit.checkin.1`; the exact tag-24 bytes are preserved for `readerAuth`. |
| `ItemsRequest` | Namespace `org.smarthealthit.checkin` requests element `smart_health_checkin_response`; `intentToRetain` is recovered for display or policy. |
| SMART request | `requestInfo["org.smarthealthit.checkin.request"]` is present as a string; parsed JSON validates under Section 5. |
| Session binding | `SessionTranscript` is recomputed from exact `encryptionInfoBase64Url` and authenticated origin or deployment-approved origin-equivalent context. |
| Reader authentication | Present `readerAuth` is verified or classified as syntactically invalid, cryptographically failed, valid but untrusted, or trusted; absent `readerAuth` remains distinct. |
| Holder control | Holder review or equivalent Wallet policy operates at request-item granularity and preserves item ids for response accounting. |
| Response construction | The SMART response conforms to Section 6, uses `requestId` equal to request `id`, and is placed as the `smart_health_checkin_response` issuer-signed element. |
| mdoc and encryption | IssuerSignedItem, MSO, `issuerAuth`, `DeviceAuthentication`, device signature, `DeviceResponse`, HPKE encryption, and outer DC API response follow Section 8.5-8.6. |

#### 8.8.3 Deployment-profile items

A deployment profile that constrains this flow SHOULD define any additional requirements for authenticated origin, privileged-browser allow-lists, mandatory `readerAuth`, reader certificate path validation, revocation or status checking, issuer trust anchors, self-attested issuer labeling, nonce length, replay handling, fixture requirements, size limits, duplicate document/element handling, Holder display, logging, telemetry, and downstream clinical-source acceptance.

## 9. Reserved

Section 9 is intentionally reserved. SMART Health Check-in 1.0 does not define a QR-code, NFC, deep-link, pointer, relay, submission, or completion-display protocol. In-person handoff mechanisms are deployment-defined UX that can land the Holder on a same-device Verifier page running the Section 8 flow.

---

## 10. Reserved future OID4VP binding

This section is reserved for a future OpenID4VP binding. SMART Health Check-in 1.0 does not define an OID4VP request object mapping, `vp_token` response mapping, DCQL profile, wallet invocation contract, verifier redirect pattern, or conformance target for OID4VP.

## 11. Security considerations

This section summarizes security properties and residual risks for SMART Health Check-in 1.0. It does not introduce a new presentation protocol, clinical provenance framework, production key-custody profile, or platform-specific Android/iOS implementation guide. Implementers should read each subsection as a threat check over the normative flows defined earlier: the transport-neutral SMART request and SMART response in Sections 5-6, the trust framework in Section 7, and the same-device direct `org-iso-mdoc` flow in Section 8.

Security claims are layered. Origin evidence, privileged-caller policy, optional reader authentication, mdoc issuer/device evidence, SMART response validation, SMART Health Card signatures, raw-FHIR provenance, Section 8 HPKE confidentiality, identifier binding, and downstream clinical policy are separate controls. A component SHALL NOT describe one successful control as proof that another control succeeded unless this specification or an explicit deployment profile defines that assurance relationship.

### 11.1 Same-device encryption requirements

A Verifier MUST NOT accept plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a substituted HPKE suite, or a response whose HPKE context is not bound to the expected transcript. A Wallet/Responder or Verifier SHALL NOT downgrade active version 1.0 ciphertexts to plaintext transport, substitute a different encryption context, or treat successful decryption as sufficient clinical validation. Encryption protects confidentiality and context binding for the encrypted bytes. It does not by itself prove Holder consent, patient identity, requester identity, reader trust, issuer trust, clinical-source provenance, response semantic validity, or downstream authorization.

Implementations SHALL keep Section 8 HPKE keys, recipients, transcript inputs, algorithm identifiers, ciphertext fields, plaintexts, and validation results separate from any deployment-local transport, storage, diagnostic, or cross-device initiation mechanism.

### 11.2 Replay and freshness

For Section 8, freshness comes from fresh unpredictable `encryptionInfo.nonce` bytes, the Verifier's retained HPKE recipient key material, the exact `encryptionInfo` base64url string, the authenticated origin or deployment-approved origin-equivalent, the resulting `SessionTranscript`, optional `readerAuth` bound to that transcript and exact tag-24 `ItemsRequest` bytes, and device authentication bound to the same transcript. A Verifier SHOULD use a fresh HPKE recipient key pair for each presentation session. A deployment profile that permits HPKE recipient-key reuse needs explicit replay, correlation, retention, and key-compromise handling.

### 11.3 Origin spoofing and UI redress

A Wallet/Responder that uses origin trust SHALL use authenticated platform-provided origin information, or an explicitly approved origin-equivalent defined by deployment policy, for Section 8 `SessionTranscript` construction and Holder display. If origin cannot be authenticated, the Wallet/Responder SHALL treat origin trust as absent and SHALL NOT silently substitute request display text, launch-page metadata, or deployment-local metadata as verified origin.

User interfaces SHOULD reduce origin spoofing and redress risk by distinguishing authenticated origin, privileged-caller evidence, trusted reader information, issuer/device evidence, and local-policy warnings from unauthenticated SMART request display text. A malicious Requester can choose misleading `purpose`, item titles, summaries, profile URLs, or Questionnaire text. A Wallet/Responder MAY display those fields as workflow context, but SHALL NOT label them as verified organization identity.

### 11.4 Reader impersonation

A Wallet/Responder that supports or relies on reader authentication SHALL verify the signature, detached-payload binding, protected algorithm, signing key, certificate or key evidence, `SessionTranscript`, exact `ItemsRequest` bytes, and deployment trust policy before treating the reader as authenticated. The Wallet/Responder SHALL distinguish absent `readerAuth`, malformed `readerAuth`, cryptographically failed `readerAuth`, cryptographically valid but untrusted or policy-unacceptable `readerAuth`, and trusted `readerAuth`. It SHALL NOT treat the mere presence of `readerAuth`, `x5chain`, a common name, a logo, a `kid`, a launch URL, or a demo certificate as successful reader authentication.

### 11.5 Issuer trust pivots

A Verifier SHALL complete the Section 8 mdoc validation checklist and apply Section 7 issuer/device trust policy before claiming production issuer trust. A syntactically valid MSO, matching digest, valid signature against an included certificate, valid device-key proof, successful HPKE opening, origin binding, readerAuth validation, or exact request-id match does not by itself prove production issuer accreditation, patient matching, clinical correctness, clinical-source provenance, downstream authorization, or EHR write-back permission.

Issuer/device trust also must not be pivoted into clinical-source trust. A Verifier or receiver SHALL treat raw `application/fhir+json` Artifacts as patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof. SMART Health Card Artifacts carry signed clinical-source evidence inside `value.verifiableCredential[]`, but receivers still need to verify those JWSs according to SMART Health Cards and local trust policy.

### 11.6 Cryptographic agility

Implementations SHALL reject unsupported or unexpected algorithm labels for the version 1.0 profile they implement rather than silently downgrading, ignoring algorithm labels, substituting library defaults, accepting deployment-supplied alternatives, or treating locally available WebCrypto, COSE, HPKE, or platform algorithms as implicitly valid. Implementations should fail closed on unknown versions, malformed base64url, unexpected mdoc structures, unexpected request carriers, dynamic element-name encodings, or inline same-device request encodings unless a future version or deployment profile explicitly defines compatible processing.

### 11.7 Plaintext leakage

Clinical content, secrets, and sensitive metadata can leak outside cryptography through logs, developer panels, crash reports, browser storage, analytics, screenshots, public displays, database indexes, debug bundles, support exports, console output, clipboard/share flows, and fixture captures. Implementations SHOULD minimize collection, display, and retention of plaintext SMART requests, SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, Section 8 `DeviceResponse` plaintext, `dcapiResponse` or `deviceResponse` internals, Section 8 HPKE `enc` or `cipherText`, Section 8 `deviceRequest`, Section 8 `encryptionInfo`, Wallet secrets, shared secrets, access tokens, bearer URLs, full launch URLs, full QR images, and valid-id enumeration clues except under controlled diagnostic or fixture procedures.

### 11.8 Wallet UX guarantees

Wallet UX is a security control because Holder-mediated disclosure is central to the protocol. A Wallet/Responder SHALL validate the incoming Section 8 request before disclosure, recover the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, compute the `SessionTranscript` from authenticated origin or approved origin-equivalent context, classify reader authentication accurately, and perform Holder review or equivalent Holder-control processing at request-item granularity before disclosing content through Section 8 unless an explicit deployment profile defines another Holder-control mechanism and assurance level.

A Wallet/Responder SHALL preserve request item `id` values for fulfillment and status accounting and SHALL construct `requestStatus[]` so every original request item is covered exactly once when it returns a SMART response. It SHOULD make requested content, accepted media types, broad selectors, and item outcomes understandable to the Holder, subject to accessibility, localization, safety, applicable law, and local policy. It MAY group, summarize, reorder, or suppress display details for those reasons, but it SHALL NOT hide multiple items or broad selectors in a way that defeats meaningful Holder control.

Wallets and same-device pages SHOULD distinguish authenticated trust signals from unauthenticated display context. They should avoid representing `purpose`, item text, selector URLs, profile URLs, link origins, demo keys, or demo branding as verified requester identity. They should also avoid overpromising clinical provenance for raw FHIR JSON or implying that successful transport encryption means a returned Artifact is clinically complete, current, source-provenanced, or suitable for downstream ingestion. If required evidence is absent, failed, untrusted, expired, revoked, unsupported, ambiguous, or inconsistent, the Wallet/Responder should follow local policy and any deployment profile: reject, proceed with reduced assurance, require additional Holder confirmation, restrict returned content, warn the Holder, or otherwise fail safely.

---

## 12. Privacy considerations

SMART Health Check-in is Holder-mediated, but Holder mediation alone is not sufficient privacy protection. Clinical payloads, request context, item choices, refusal decisions, timing, routing metadata, logs, and retained operational state can all reveal health-care activity. Privacy controls therefore need to apply to the transport-neutral SMART request and response, the same-device `org-iso-mdoc` presentation flow, and downstream workflow handling.

### 12.1 Data minimization and per-item consent

A Requester SHOULD construct each SMART request for the minimum clinical or administrative content needed for the bounded check-in workflow. Even request selectors, `purpose`, item `title`, item `summary`, profile URLs, resource types, Questionnaire references or text, accepted media types, and FHIR version lists can disclose sensitive context. Requesters should prefer narrow request items, selectors, accepted media types, and FHIR versions over broad collection requests unless the workflow and Holder-facing explanation justify the breadth.

The request item is the protocol's Holder-review and response-accounting granularity. Each item has its own `id`, Holder-facing text, selector, `accept[]`, advisory `required` flag, and per-item result in `requestStatus[]`. A Wallet/Responder SHALL preserve item `id` values for fulfillment and status accounting and SHALL provide Holder review, or an equivalent Holder-control mechanism defined by a deployment profile, at request-item granularity before disclosing content. A Wallet/Responder MAY group, summarize, reorder, translate, or suppress details for accessibility, safety, localization, or local policy, but it SHALL NOT hide multiple items, broad selectors, accepted response forms, retention signals, or advisory `required` flags in a way that defeats meaningful Holder control.

A Wallet/Responder SHOULD return only Artifacts that satisfy approved request items, Holder choices, Wallet policy, available data, and accepted media types. It should avoid returning unrelated FHIR resources, unrelated SMART Health Cards, unnecessary Questionnaire answers, hidden diagnostics, access tokens, internal identifiers, or nonresponsive records merely because they are available in a local Bundle, cached data source, or connected system. If only a subset of matching content is disclosed, `partial` is often more accurate and privacy-preserving than claiming complete fulfillment.

### 12.2 Selective disclosure responsibilities

A Wallet/Responder SHOULD construct the smallest set of Artifacts that accurately satisfies the approved items and accepted response forms. If one Artifact fulfills multiple items, each listed item needs to accept the Artifact `mediaType`, and the Artifact should be responsive to every listed item without over-disclosing relative to the Holder's decisions. Where separating Artifacts would materially reduce disclosure and remain interoperable, the Wallet/Responder should prefer the less-disclosing packaging.

Artifact ids and request item ids are accounting values, not global tracking identifiers. A Wallet/Responder SHOULD NOT place patient identifiers, requester identifiers, secrets, clinical facts, cross-session tracking values, or source-system document ids in `SmartHealthCheckinRequest.id`, item `id`, Artifact `id`, `requestStatus[].message`, extension member names, URL paths, or locators unless that meaning is separately required and protected by the Artifact payload or deployment policy. A receiver SHALL NOT treat Artifact ids as patient ids, global document ids, provenance ids, or source-system ids unless independent payload evidence or deployment policy establishes that meaning.

### 12.3 Cross-verifier linkability and identifier reuse

Requesters, Verifiers, Wallets/Responders, receivers, and deployment profiles SHOULD avoid reusing these identifiers across unrelated check-in sessions, unrelated Verifiers, or unrelated Holders. They should not embed patient account numbers, medical record numbers, insurance member ids, phone numbers, email addresses, appointment ids, staff ids, clinic ids, source document ids, or predictable sequence numbers in SMART request ids, item ids, Artifact ids, telemetry event ids, or log correlation ids unless a deployment profile explicitly requires that identifier and defines its privacy controls.

High-entropy identifiers resist guessing, but they remain correlation handles while visible or retained. A Verifier SHOULD use fresh Section 8 HPKE recipient key material and fresh nonce values for each presentation session. A deployment profile that permits recipient-key reuse needs explicit privacy handling for correlation, retention, key compromise, replay, and logs. Deployment-local launch URLs, QR codes, NFC tags, routing identifiers, or storage handles can also become correlation handles; because they are not standardized by SMART Health Check-in, their privacy controls are deployment responsibilities.

### 12.4 Wallet rendering of requester intent

A Wallet/Responder MAY display those fields as request context, but SHALL NOT label them as verified requester identity, authenticated origin, trusted reader identity, clinical-source provenance, legal authority, or consent text unless the same fact is established by the selected presentation transport, accepted reader authentication, issuer/device trust evidence, or another deployment-approved trust layer. If authenticated origin, privileged-caller evidence, trusted reader authentication, or local policy warnings are available, the display SHOULD distinguish those signals from unauthenticated SMART request text.

Wallets/Responders SHOULD make privacy-relevant consequences understandable at item granularity when possible: requested categories, accepted media types such as `application/fhir+json` and `application/smart-health-card`, broad or no-selector requests, advisory required items, retention signals, partial or declined outcomes, and available Holder choices. User interfaces may summarize for accessibility, localization, safety, or local policy, but summaries should not overstate requester authenticity, provenance, completeness, retention, or clinical authority.

### 12.5 Storage retention defaults

A Verifier MAY set `intentToRetain` to `false` only when it truly intends ephemeral use and applicable deployment policy permits that signal. A Requester, Verifier, or downstream receiver that will store, import, attach, audit, reconcile, route, or retain returned content should not represent the interaction as ephemeral merely because transport ciphertext, browser state, launch-page state, or local workflow state are short-lived.

Retention policies SHOULD account for metadata as well as plaintext. SMART request ids, request item ids, Artifact ids, origins, package names, certificate subjects, IP addresses, user agents, timestamps, launch timing, QR display or scan timing, payload sizes, error strings, validation outcomes, and access patterns can reveal check-in activity even when clinical payloads are encrypted. Logs, database indexes, dashboards, analytics stores, support exports, crash reports, screenshots, browser storage, and debug panels should use the shortest useful retention and least identifying form compatible with operational, security, legal, and clinical needs.

### 12.6 Sensitive category handling

Requesters SHOULD avoid broad or ambiguous items when a narrower selector, Questionnaire, accepted media type, or separate request item would satisfy the workflow with less sensitive disclosure. When a workflow specifically needs sensitive-category content, the item `title`, `summary`, selector, and accepted media types should make that need understandable to the Holder without embedding unnecessary sensitive facts in ids, URL paths, telemetry labels, or deployment metadata. Combining unrelated sensitive and non-sensitive content into one broad item can pressure the Holder into over-disclosure.

Wallets/Responders SHOULD apply local sensitive-data policy, Holder preferences, jurisdictional requirements, and available labels or provenance when deciding what to show, suppress, redact, group, return, or refuse. A Wallet/Responder MAY apply stricter review, additional warnings, separate confirmation, data-source selection, redaction, suppression, refusal, or item-level `declined`, `partial`, `unavailable`, `unsupported`, or `error` status for sensitive items, broad selectors, no-selector requests, inline Questionnaires, raw FHIR JSON, or unauthenticated or untrusted contexts.

### 12.7 Telemetry guidance

Telemetry, analytics, logs, metrics, crash reports, support bundles, observability traces, fixtures, database indexes, browser storage, screenshots, and debug panels can undermine privacy even when protocol encryption is correct. Implementations SHOULD collect the minimum telemetry needed for reliability, security monitoring, abuse prevention, conformance testing, and support, and should prefer aggregate counts, coarse categories, sampling, redaction, scoped identifiers, and short retention over raw protocol payloads or stable per-Holder traces.

Implementations SHOULD NOT send plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, item-level Holder decisions, Section 8 `DeviceResponse` plaintext, `dcapiResponse` or `deviceResponse` internals, Section 8 HPKE `enc` or `cipherText`, request-opening private keys, Wallet secrets, shared secrets, credentials, access tokens, bearer URLs, full launch URLs, full QR images, or unredacted stack traces containing those values to routine telemetry, analytics, crash reporting, or support systems except under controlled diagnostic, fixture, audit, or incident-response procedures with appropriate authorization and labeling.

User-facing and operator-facing errors SHOULD support safe recovery without revealing clinical content, secrets, stack traces, deployment internals, or valid-id enumeration clues beyond what the Holder or authorized staff need to proceed. A same-device page can guide the Holder to restart from a current launch surface or seek staff assistance without revealing whether a guessed identifier, stale URL, or malformed request was valid.

---

## 13. Registry and IANA considerations

### 13.1 Media type registrations / references

| Media type | SMART Health Check-in 1.0 use | Registry posture |
| --- | --- | --- |
| `application/fhir+json` | Core clinical Artifact media type for raw FHIR JSON Resources or Bundles. A conforming SMART Health Check-in Artifact using this media type carries `value` as FHIR JSON and carries an outer `fhirVersion`. | Externally defined by the FHIR ecosystem and referenced by this specification. SMART Health Check-in does not redefine it or request a new registration for it. |
| `application/smart-health-card` | Core clinical Artifact media type for SMART Health Card file-style JSON with `value.verifiableCredential[]`. A conforming SMART Health Check-in Artifact using this media type does not carry an outer Artifact-level `fhirVersion`. | Externally defined or governed by SMART Health Cards and referenced by this specification. SMART Health Check-in does not redefine it or claim ownership of it. |

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics and the receiving Verifier supports that rule. A Verifier SHALL apply the corresponding Section 6.6 validation.

The version 1.0 core Artifact union contains only the two core media types above. The Artifact type list is extensible by future revisions or registered extensions, but each extension Artifact type SHALL be a branded variant with a pinned `mediaType` literal or clearly bounded media-type pattern and its own typed fields. A future Artifact media-type registration for SMART Health Check-in use SHALL define the exact media type string; payload shape; which fields carry the payload; encoding; dereferencing and integrity rules if any; FHIR-version semantics if any; validation behavior; status-code interaction; security considerations; privacy considerations; and any compatibility with existing media types. A media-type extension SHALL NOT introduce a generic catch-all Artifact branch or redefine the semantics of SMART request or response core fields.

### 13.2 mdoc registry entries

| Identifier kind | Value | Defined use |
| --- | --- | --- |
| Digital Credentials API protocol id | `org-iso-mdoc` | Direct same-device mdoc presentation protocol used by Section 8. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | SMART Health Check-in 1.0 document type requested by Verifiers and returned by Wallets/Responders. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the stable SMART response element. |
| Requested and disclosed element | `smart_health_checkin_response` | Issuer-signed element whose `elementValue` is the JSON text serialization of a `SmartHealthCheckinResponse`. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | `ItemsRequest.requestInfo` key whose value is the JSON text serialization of a `SmartHealthCheckinRequest`. |

A Verifier claiming the version-1 direct mdoc profile SHALL use the values above exactly. It SHALL carry the SMART request only at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`.

A Wallet/Responder claiming the version-1 direct mdoc profile SHALL disclose the SMART response as the `elementValue` of `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. It SHALL NOT treat dynamic element names, archived claim-name experiments, individual FHIR profiles, request items, Artifact media types, Questionnaires, status codes, or locally chosen namespaces as alternate version-1 core carriers.

These values are SMART Health Check-in profile identifiers for use in the mdoc / ISO / Digital Credentials ecosystem. Registration, reservation, or publication in an applicable external registry may be needed for some deployments, but this specification does not assert that such external registration is complete. Future incompatible mdoc-carrier changes SHOULD use a new profile identifier and, when necessary, a new `docType` suffix rather than changing the meaning of `org.smarthealthit.checkin.1` in place.

### 13.3 Status code registry

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without Holder refusal being the relevant cause. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and was not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use only these status codes in a SMART Health Check-in 1.0 response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless it explicitly supports the corresponding future registry entry.

A future status-code registration SHALL define the exact code string; lifecycle status; semantics; how the code differs from the six core codes; allowed or expected relationship to returned Artifacts; interaction with `required`, selector kinds, media types, Holder choice, `message`, and Section 6.6 validation; Wallet/Responder construction rules; Verifier validation and display behavior; unsupported-recipient behavior; security considerations; privacy considerations; and at least one example or conformance test. New status codes SHALL NOT redefine any of the six version-1 codes or remove the requirement that `requestStatus[]` account for every request item exactly once.

### 13.4 Content-selector kind registry

| Selector kind | Selector shape summary | Semantics |
| --- | --- | --- |
| `selection.fhir` | `content` may include `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` as arrays of strings. It does not include `questionnaireCanonical` or `questionnaire`. | Requests existing patient-specific FHIR resources. `profiles[]` and `profilesFrom[]` are additive profile selectors; `resourceTypes[]` is an additional official FHIR resource-type constraint when present. |
| `form.fhir` | `content` may include `questionnaireCanonical` as a FHIR canonical string, `questionnaire` as an inline FHIR `Questionnaire`, or both. It does not include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. | Requests completion of, or response to, a FHIR Questionnaire, with returned content represented by an accepted Artifact media type, normally a FHIR `QuestionnaireResponse` for `application/fhir+json`. |

A Requester SHALL use one of these selector kinds or a registered extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support a selector kind SHALL NOT infer its semantics from display text, profile labels, local topic names, deployment metadata, or requester identity metadata. It SHALL reject the request or report the affected item as `unsupported` according to the selected flow and Section 6.

A future selector-kind registration SHALL define the exact `content.kind` string; JSON shape; required and optional members; unknown-member handling; clinical meaning; content-satisfaction rules; interactions with `accept[]`, `fhirVersions[]`, FHIR canonicals and `|version`, item status, Artifact fulfillment, and Section 6.6 validation; unsupported, unavailable, partial, declined, and error behavior; examples; security considerations; and privacy considerations. Registrants SHOULD choose collision-resistant names, such as reverse-DNS or URI-like names, unless the registry later defines a stricter syntax.

A selector-kind registration SHALL NOT redefine SMART request top-level fields, SMART response fields, `selection.fhir`, `form.fhir`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `questionnaireCanonical`, `questionnaire`, `accept[]`, Holder control, requester identity handling, canonical-version handling, or trust-layer boundaries.

### 13.5 Profile-id registry

Profile identifiers are not SMART request fields, SMART response fields, clinical selectors, Artifact media types, status codes, request presets, IPS shortcuts, "all of the above" shortcuts, topic labels, or substitutes for Section 5 selectors. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, an "all of the above" shortcut, a profile-family shortcut, a topic label, or negotiation metadata to bypass Section 5 selectors, Section 5 `accept[]`, Section 6 response validation, Section 7 trust processing, or Section 8 validation.

| Profile label | Status | Summary |
| --- | --- | --- |
| `smart-health-checkin-core-1` | Provisional label | Transport-neutral Section 5 SMART request and Section 6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Provisional label | Direct same-device Section 8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Provisional label | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Provisional label | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | Reserved label | Placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

A future profile-id registration SHALL define the identifier; versioning policy; lifecycle status; target roles; required and optional features; prerequisite profiles; affected specification sections; allowed extension identifiers; validation obligations; trust-policy assumptions; fixture or conformance expectations when applicable; security considerations; privacy considerations; compatibility behavior; and whether the profile is for runtime interoperability, deployment policy, certification, fixtures, diagnostics, historical captures, or illustrative examples.

A deployment or extension profile MAY impose stricter trust, validation, media-type, selector, size, expiration, replay, duplicate-handling, retention, provenance, or fixture requirements. It SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, core selector kinds, Artifact media-type rules, fulfillment/status accounting, same-device carriers, request/response id separation, Section 8 cryptographic context, or the Section 7 trust-layer model.

### 13.6 Designated expert review process

A registration request SHOULD include the requested identifier; registry category; lifecycle status; change controller; stable public specification or deployment profile; affected conformance targets, features, and versions; exact syntax; processing rules; validation rules; unsupported-recipient behavior; compatibility or deprecation behavior; examples or conformance tests; security considerations; privacy considerations; logging and retention considerations when applicable; fixture or diagnostic status when applicable; and dependencies on external standards or deployment policy.

The designated expert SHOULD approve a registration only when the request:

1. uses a syntactically clear, stable, and collision-resistant identifier for its registry;
2. identifies the exact target, feature, version, and protocol section affected;
3. preserves the transport-neutral Section 5/Section 6 SMART request and SMART response semantics unless the entry is explicitly for a future incompatible version;
4. preserves request/response validation behavior, including `requestId`, `fulfills[]`, `requestStatus[]`, media-type checks, status-code handling, and Section 6.6 cross-validation;
5. preserves core selector semantics, including `selection.fhir`, `form.fhir`, additive `profiles[]` plus `profilesFrom[]`, `resourceTypes[]`, questionnaire-form fields, per-item `accept[]` rules, and canonical `|version` handling;
6. preserves the Section 7 trust-layer separation among origin evidence, optional reader authentication, mdoc issuer/device evidence, Holder action, and clinical-source provenance;
7. preserves the version-1 same-device identifiers `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request` unless the registration is explicitly for a future mdoc profile;
8. preserves Section 8 HPKE transcript binding and same-device validation boundaries;
9. defines unsupported-recipient behavior that lets older implementations reject, ignore, quarantine, or report unsupported without unsafe reinterpretation;
10. includes security and privacy considerations proportionate to the clinical content and metadata involved, including URLs, key identifiers, logs, telemetry, and diagnostic artifacts;
11. avoids requiring intermediaries or deployment-local services to see plaintext SMART requests, SMART responses, raw FHIR content, SMART Health Cards, private keys, shared secrets, or clinical trust decisions merely to route state; and
12. includes enough examples, fixture expectations, or conformance guidance for independent implementation.

The designated expert SHOULD reject or request revision of a registration that redefines existing fields or identifiers; creates ambiguous synonyms for existing status codes or selector kinds; introduces requester identity, organization metadata, trust assertions, callback endpoints, production trust-anchor claims, or deployment-local routing metadata into the SMART request body; turns profile identifiers into in-band request selectors; relies on `requestProfile`, presets, IPS shortcuts, "all of the above" shortcuts, or local topic labels instead of Section 5 selectors; requires intermediaries to see plaintext clinical content; weakens Holder control or required validation; conflates transport, request, and clinical identifiers; treats demo keys, self-signed fixture material, example issuer/audience strings, or checked-in private keys as production trust anchors; or overclaims clinical-source provenance for unsigned raw FHIR JSON from transport success alone.

Private or deployment-local identifiers MAY be used within a controlled deployment when all participants are configured for them and the deployment accepts the interoperability risk. Such identifiers should be documented as local and must not be represented as SMART Health Check-in-wide registrations when interoperable processing by unrelated implementations is expected.

A provisional or experimental registration SHOULD state its expiration, review checkpoint, or promotion criteria. A deprecated registration remains listed with its prior semantics, replacement guidance if any, and receiver handling expectations; deprecation does not silently change the meaning of already-published SMART Health Check-in 1.0 messages.

---

## 14. Internationalization

### 14.1 Language tags

SMART Health Check-in 1.0 does not define `lang`, `locale`, `Accept-Language`, per-string language maps, negotiated-locale members, or locale parameters in the transport-neutral SMART request, SMART response, or same-device `org-iso-mdoc` binding. An implementation SHALL NOT rely on an unknown SMART request member, unknown SMART response member, browser language value, launch URL parameter, or HTTP header as an interoperable SMART Health Check-in locale-negotiation signal unless a future version, registered extension, or deployment profile explicitly defines that behavior.

When a FHIR resource, registered extension, deployment profile, or implementation-generated UI associates a language tag with human-readable SMART Health Check-in display text, the producer SHOULD use a well-formed BCP 47 language tag. The tag's scope, fallback behavior, and matching behavior are defined by FHIR, by the registered extension, or by the deployment profile that introduced the tag. A missing language tag does not imply English or any other particular language.

FHIR content follows FHIR internationalization and localization behavior. SMART Health Check-in does not redefine `Resource.language`, terminology displays, designations, translation extensions, Questionnaire text and rendering, QuestionnaireResponse construction, narratives, or implementation-guide-specific display rules. A Wallet/Responder, Verifier, or receiver that renders or processes FHIR content SHOULD follow the applicable FHIR version, implementation guide, and local clinical-display policy.

A Requester SHOULD author `purpose`, item `title`, item `summary`, and inline Questionnaire display text in language suitable for the expected Holder review context. A Wallet/Responder MAY translate, summarize, group, reorder, or suppress display text for accessibility, localization, safety, or local policy. If it does so, it SHALL preserve the underlying protocol values used for response construction and validation, including request ids, item ids, selector values, accepted media types, Artifact ids, `fulfills[]`, `requestStatus[].item`, and status codes.

A Wallet/Responder MAY include localized `requestStatus[].message` text, but the machine-processable status semantics remain in `requestStatus[].status`. A receiver SHALL NOT rely on localized `message` text to determine whether an item was fulfilled, partial, declined, unavailable, unsupported, or errored.

### 14.2 Unicode normalization and BIDI handling

SMART request and SMART response JSON strings are Unicode strings encoded as UTF-8 when serialized as JSON text or bytes. Producers of new human-readable display text SHOULD emit Unicode Normalization Form C (NFC). Consumers SHOULD be prepared to receive valid Unicode display strings that are not NFC, especially from FHIR resources, user-entered Questionnaire answers, copied text, or extension payloads.

Normalization is a presentation and text-processing concern, not an identifier-matching rule. A Requester, Wallet/Responder, Verifier, or receiver SHALL NOT apply Unicode normalization, case folding, accent folding, width folding, confusable-character mapping, BIDI reordering, transliteration, translated aliases, or locale-sensitive collation to make distinct protocol identifiers or constants compare equal. Exact validation remains exact validation for request and response ids, item ids, Artifact ids, selector kinds and values, FHIR canonicals used as machine values, media types, status codes, mdoc identifiers, algorithm labels, HPKE/HKDF info strings, and deployment-local launch identifiers or URLs.

Implementations MAY normalize copies of human-readable display text for local rendering, search, indexing, duplicate detection, accessibility, or typography. Such display normalization SHALL NOT change the bytes or code points used for signature verification, hashing, encryption, HPKE or HKDF inputs, COSE signing inputs, mdoc digest checks, SMART Health Card verification, FHIR canonical preservation, audit records, or byte-exact fixture comparisons.

Human-readable text can legitimately use non-Latin scripts, combining marks, emoji, right-to-left text, and bidirectional formatting. User interfaces that render untrusted or externally supplied text SHOULD apply the Unicode Bidirectional Algorithm with isolation appropriate to the UI platform. In particular, UIs SHOULD isolate `purpose`, item `title`, item `summary`, Questionnaire text, FHIR display strings, `requestStatus[].message`, demo branding, and diagnostic snippets from adjacent labels, origins, identifiers, URLs, profile canonicals, media types, status badges, trust indicators, warnings, and action buttons.

Unicode and BIDI rendering SHALL NOT allow display text to spoof or obscure protocol identifiers, web origins, requester identity, reader identity, profile URLs, FHIR canonicals, mdoc identifiers, Artifact provenance, clinical-source trust, status codes, validation outcomes, Holder decisions, or consent controls. Wallets/Responders, Verifiers, and receivers SHOULD visually distinguish unauthenticated display text from authenticated origin, reader-authentication, issuer, device, and local-policy trust signals.

When a UI cannot safely render a security- or trust-adjacent value, it SHOULD use a conservative representation such as escaped text, code-point-revealing diagnostics, clear truncation with expansion, code-style rendering for machine values, a warning, or deliberate access to the exact value. For human-readable clinical or Questionnaire text, implementations SHOULD prefer safe rendering and clear boundaries over blanket deletion of characters that may be meaningful in the Holder's language.

### 14.3 Locale negotiation guidance

Language preferences, locale, script, region, input method, timezone, translation requests, and fallback behavior can reveal sensitive information, including nationality, ethnicity, household context, disability accommodations, immigration context, preferred language in a clinical setting, or the nature of a visit. Implementations SHOULD minimize collection, disclosure, logging, telemetry, indexing, display, and retention of locale metadata in the same way they minimize other request context and operational metadata under Section 12.

A Requester MAY use information it already has through a trusted application session, patient preference, local workflow, browser or app UI, or deployment policy to select display text before creating the SMART request. If cross-device or in-person initiation is used, the launch UX is implementation-defined and should not add patient-specific clinical text, stable locale identifiers, or fine-grained language preferences to public surfaces, launch URLs, logs, dashboards, analytics, screenshots, or support bundles unless a deployment profile explicitly requires and protects that disclosure.

A Wallet/Responder MAY use Holder device preferences, Wallet locale settings, accessibility settings, local translation resources, or FHIR-supported translation mechanisms to render Holder-review text. If request display text, Questionnaire text, FHIR display strings, or extension-defined display fields cannot be rendered or processed safely in a language the Holder can understand, the Wallet/Responder MAY show the original text with clear trust labeling, ask for confirmation or assistance, decline the item, report `unsupported`, report `unavailable`, report `error`, or use another valid Section 6 outcome according to the facts and local policy.

Receivers MAY localize implementation-generated UI labels, validation errors, workflow prompts, and operator-facing summaries. Localization of UI text does not alter response validation, clinical-source verification, provenance assessment, retention signaling, status-code semantics, Artifact routing, or downstream clinical acceptance.

---

## 15. Companion material and future work

Implementation notes, worked examples, fixture indexes, byte ladders, CBOR diagnostic tutorials, ISO/IEC 18013-5 compatibility notes, and extended FHIR mapping examples are companion material. They SHOULD derive from this specification and MUST NOT introduce alternate field names, alternate request carriers, alternate response carriers, alternate selector semantics, alternate Artifact carriers, alternate status semantics, or weaker validation/trust behavior.

Future work includes production issuer trust-anchor registries, privileged-browser allow-list policy, request-size guidance, iOS/Safari feasibility, external conformance suites, and a possible OID4VP binding. Future work MUST NOT weaken the direct same-device `org-iso-mdoc` requirements, reintroduce requester identity metadata into the SMART request body, or revive superseded selector models.

## Appendix A. Conformance checklist summary

This checklist summarizes the principal conformance groups for certification and interoperability testing. It does not create independent requirements; each row points to normative body sections. A generated companion checklist MAY expand these groups into one row per requirement and SHALL identify target, keyword, feature/profile, source section, expected outcome, and evidence.

| Group | Primary target(s) | Source | Validation focus |
| --- | --- | --- | --- |
| Core request | Requester; Wallet/Responder | Section 5 | RFC 8259 JSON, fixed `type` and `version`, request `id`, item ids, Holder-facing fields, selectors, `accept[]`, no requester identity metadata, canonical `|version` handling. |
| Core response | Wallet/Responder; Verifier | Section 6 | Fixed response constants, `requestId`, Artifact common shape, core media types, status coverage, many-to-many fulfillment, and Section 6.6 cross-validation. |
| Trust separation | Wallet/Responder; Verifier; Requester | Section 7 | Origin, reader, issuer/device, clinical-source, and deployment-policy evidence remain distinct. |
| Same-device mdoc | Verifier; Wallet/Responder | Section 8 and Appendix C | `org-iso-mdoc`, fixed mdoc identifiers, request carrier, stable response element, tag-24 boundaries, transcript, readerAuth, MSO, device proof, HPKE, and extraction. |
| Security/privacy/i18n | All applicable targets | Sections 11-14 | Encryption, replay, UI spoofing, cryptographic agility, minimization, telemetry, language, Unicode, and exact identifier comparison. |
| Extensions and profiles | Profile/extension authors; implementers | Sections 4 and 13 | Registered selector kinds, Artifact variants, status extensions, profile identifiers, and expert review preserve core semantics. |

## Appendix B. JSON Schema for `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`

This appendix provides JSON Schema snippets for the transport-neutral SMART request and SMART response objects defined in Sections 5-6. The snippets are intended for structural validation, fixture review, and conformance-test scaffolding. They do not define mdoc carriage, registry behavior, full FHIR validation, SMART Health Card validation, or downstream clinical ingestion policy.

If a schema rule in this appendix appears to conflict with Sections 5-6, Sections 5-6 control. Normative language in this appendix either restates Sections 5-6 or is scoped to conformance with these Appendix B schema snippets.

### B.1 Dialect and validation model

The schema snippets use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A validator that claims conformance to Appendix A SHALL evaluate these snippets using JSON Schema 2020-12 semantics, or a later dialect only when that dialect is known to preserve the semantics of the keywords used here.

The snippets intentionally keep core extension points open. Unknown members are not made schema errors solely by Appendix B, because Sections 5-6 allow forward-compatible unknown members and registered extension selectors. Registered extension Artifact media types are represented by additional or profiled schemas rather than by a generic core catch-all. Deployment profiles MAY publish stricter schemas, but those schemas must identify their additional constraints rather than silently changing the core protocol.

JSON Schema validation is not complete SMART Health Check-in validation. A Verifier still applies the request/response, FHIR, SMART Health Card, transport, trust, and deployment-policy checks required elsewhere in the specification. Section B.4 summarizes important checks that are not fully expressible in these standalone schemas.

The request schema requires `items[]` but does not set `minItems: 1`, because Section 5.2.6 currently says a Requester SHOULD include at least one request item and leaves any hard prohibition on zero-item requests to later schema/conformance closure.

### B.2 `SmartHealthCheckinRequest` schema

The request schema fixes the top-level `type` and `version`, requires the top-level fields from Section 5.2, validates the item shape from Section 5.3, and validates the two core selector shapes from Section 5.4 while leaving room for registered extension selector kinds.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/SmartHealthCheckinRequest.schema.json",
  "title": "SmartHealthCheckinRequest",
  "type": "object",
  "required": ["type", "version", "id", "items"],
  "properties": {
    "type": { "const": "smart-health-checkin-request" },
    "version": { "const": "1" },
    "id": { "$ref": "#/$defs/nonEmptyString" },
    "purpose": { "type": "string" },
    "fhirVersions": {
      "type": "array",
      "items": { "$ref": "#/$defs/nonEmptyString" }
    },
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/requestItem" }
    }
  },
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "canonicalString": {
      "type": "string",
      "minLength": 1,
      "description": "FHIR canonical reference string; a |version suffix, when present, is parsed as structured canonical-reference version metadata rather than as part of a direct HTTP URL."
    },
    "canonicalUrlString": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://\\S+$"
    },
    "mediaTypeString": { "type": "string", "minLength": 1 },
    "requestItem": {
      "type": "object",
      "required": ["id", "title", "content", "accept"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "title": { "$ref": "#/$defs/nonEmptyString" },
        "summary": { "type": "string" },
        "required": { "type": "boolean" },
        "content": { "$ref": "#/$defs/contentSelector" },
        "accept": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/mediaTypeString" }
        }
      },
      "additionalProperties": true
    },
    "contentSelector": {
      "oneOf": [
        { "$ref": "#/$defs/selectionFhirSelector" },
        { "$ref": "#/$defs/formFhirSelector" },
        { "$ref": "#/$defs/extensionSelector" }
      ]
    },
    "selectionFhirSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": { "const": "selection.fhir" },
        "profiles": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalString" }
        },
        "profilesFrom": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalUrlString" }
        },
        "resourceTypes": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      },
      "not": {
        "anyOf": [
          { "required": ["questionnaireCanonical"] },
          { "required": ["questionnaire"] }
        ]
      },
      "additionalProperties": true
    },
    "formFhirSelector": {
      "type": "object",
      "required": ["kind"],
      "anyOf": [
        { "required": ["questionnaireCanonical"] },
        { "required": ["questionnaire"] }
      ],
      "not": {
        "anyOf": [
          { "required": ["profiles"] },
          { "required": ["profilesFrom"] },
          { "required": ["resourceTypes"] }
        ]
      },
      "properties": {
        "kind": { "const": "form.fhir" },
        "questionnaireCanonical": { "$ref": "#/$defs/canonicalString" },
        "questionnaire": { "$ref": "#/$defs/inlineQuestionnaire" }
      },
      "additionalProperties": true
    },
    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
      },
      "additionalProperties": true
    },
    "extensionSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": {
          "type": "string",
          "minLength": 1,
          "not": { "enum": ["selection.fhir", "form.fhir"] }
        }
      },
      "additionalProperties": true
    }
  }
}
```

Notes on this request schema:

- `profilesFrom[]` is a non-empty array of canonical URL strings. It is not a singleton string, object, package descriptor, implementation-guide object, package id, package version, registry alias, local topic label, or URN form in version 1.0.
- `profiles[]` and `profilesFrom[]` are independently allowed in the same `selection.fhir` selector. Their combined presence is additive under Section 5.4.1.4; the schema does not make either array narrow the other.
- `profiles[]` and `resourceTypes[]`, when present, are arrays with at least one string. Whether a `resourceTypes[]` value is an official FHIR `resourceType` for a particular FHIR release is a FHIR-aware procedural check.
- A `selection.fhir` selector may omit all of `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to express the no-selector default from Section 5.4.1.5.
- A `form.fhir` selector is a single object shape with one or both of the sibling members `questionnaireCanonical` and `questionnaire`. It does not allow `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; use a separate `selection.fhir` request item when existing FHIR resource selection is also needed.
- Canonical strings MAY include a `|version` suffix. Consumers parse the suffix as structured FHIR canonical-reference version metadata and do not treat it as part of a direct HTTP URL.
- The extension-selector branch permits syntactic validation of registered extension selector kinds without embedding a future registry in Appendix A. A core-only deployment profile can replace this branch when it intentionally rejects all extension selectors.
- The SMART request body SHALL NOT carry requester identity metadata under Section 5.2.7. This schema cannot reliably reject arbitrary identity-like unknown or extension members while keeping extension points open, so processors must enforce that prohibition procedurally and through extension review.

### B.3 `SmartHealthCheckinResponse` schema

The response schema fixes `type` and `version`, requires `requestId`, `artifacts[]`, and `requestStatus[]`, validates the common Artifact shape, branches on `mediaType` for the two core Artifact classes, and validates the version 1.0 status-code set. Registered extensions can publish additional profiled schemas for additional Artifact media types; the core schema does not include a generic unknown-media-type catch-all.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/SmartHealthCheckinResponse.schema.json",
  "title": "SmartHealthCheckinResponse",
  "type": "object",
  "required": ["type", "version", "requestId", "artifacts", "requestStatus"],
  "properties": {
    "type": { "const": "smart-health-checkin-response" },
    "version": { "const": "1" },
    "requestId": { "$ref": "#/$defs/nonEmptyString" },
    "artifacts": {
      "type": "array",
      "items": { "$ref": "#/$defs/artifact" }
    },
    "requestStatus": {
      "type": "array",
      "items": { "$ref": "#/$defs/itemStatus" }
    }
  },
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "mediaTypeString": { "type": "string", "minLength": 1 },
    "artifactBase": {
      "type": "object",
      "required": ["id", "mediaType", "fulfills"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "mediaType": { "$ref": "#/$defs/mediaTypeString" },
        "fulfills": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      },
      "additionalProperties": true
    },
    "artifact": {
      "oneOf": [
        { "$ref": "#/$defs/smartHealthCardArtifact" },
        { "$ref": "#/$defs/rawFhirJsonArtifact" }
      ]
    },
    "smartHealthCardArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "required": ["value"],
          "properties": {
            "mediaType": { "const": "application/smart-health-card" },
            "value": {
              "type": "object",
              "required": ["verifiableCredential"],
              "properties": {
                "verifiableCredential": {
                  "type": "array",
                  "minItems": 1,
                  "items": { "$ref": "#/$defs/nonEmptyString" }
                }
              },
              "additionalProperties": true
            }
          },
          "not": { "required": ["fhirVersion"] },
          "additionalProperties": true
        }
      ]
    },
    "rawFhirJsonArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "required": ["fhirVersion", "value"],
          "properties": {
            "mediaType": { "const": "application/fhir+json" },
            "fhirVersion": { "$ref": "#/$defs/nonEmptyString" },
            "value": {
              "type": "object",
              "required": ["resourceType"],
              "properties": {
                "resourceType": { "$ref": "#/$defs/nonEmptyString" }
              },
              "additionalProperties": true
            }
          },
          "additionalProperties": true
        }
      ]
    },
    "itemStatus": {
      "type": "object",
      "required": ["item", "status"],
      "properties": {
        "item": { "$ref": "#/$defs/nonEmptyString" },
        "status": {
          "enum": ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"]
        },
        "message": { "type": "string" }
      },
      "additionalProperties": true
    }
  }
}
```

Notes on this response schema:

- `artifacts[]` MAY be empty. Per-item outcomes are still reported through `requestStatus[]`.
- Every Artifact has `id`, `mediaType`, and non-empty `fulfills[]` at the common level. Uniqueness of Artifact ids and validity of fulfillment references require procedural validation.
- `application/smart-health-card` Artifacts use `value.verifiableCredential[]` as a non-empty array of strings and SHALL NOT carry an outer Artifact-level `fhirVersion`. FHIR-version semantics for this branch are inside each signed SMART Health Card credential payload.
- `application/fhir+json` Artifacts require `fhirVersion` and `value`. The schema checks only that `value` is a JSON object with a string `resourceType`; it does not validate the full FHIR Resource, Bundle entries, terminology, profiles, or release-specific FHIR grammar.
- The core Artifact schema accepts only the two core `mediaType` discriminator values above. Registered extension Artifacts are represented by additional schemas or deployment profiles that pin their own `mediaType` value or bounded media-type pattern and define their own payload-bearing fields.
- `requestStatus[].status` is limited to the version 1.0 status code set unless a future registered extension is explicitly supported by the receiving Verifier and by a corresponding schema/profile.

### B.4 Validation not fully expressible in JSON Schema

A conforming implementation MUST NOT treat successful validation against the snippets above as complete protocol validation. At minimum, the following constraints require procedural validation against the original request, returned payloads, FHIR knowledge, registries, presentation transport, trust policy, or deployment policy.

| Constraint | Why the standalone schema is insufficient |
| --- | --- |
| `SmartHealthCheckinResponse.requestId` equals `SmartHealthCheckinRequest.id` | The response schema has no access to the original request value. |
| Every `artifacts[].fulfills[]` value resolves to a request item id | The response schema cannot inspect the original request's `items[].id` set. |
| `requestStatus[]` covers every request item exactly once | JSON Schema cannot, in a standalone response schema, compare status `item` values to the original request's item-id set. |
| Duplicate request item ids, duplicate Artifact ids, and duplicate status items | JSON Schema 2020-12 `uniqueItems` compares whole array entries; it does not portably enforce uniqueness of a selected object member such as `id` or `item`. |
| Duplicate JSON object member names | Many validators receive an already-parsed JSON data model after duplicate-member handling has occurred. |
| Artifact `mediaType` is accepted by each fulfilled item | This requires joining each Artifact's `fulfills[]` values to request items and checking each item's `accept[]`, including any registered compatibility rule. |
| Requester identity metadata prohibition | The base schema keeps unknown members and extension points open. Detecting arbitrary self-asserted requester identity fields requires procedural policy, allow-lists, extension review, or a stricter deployment profile. |
| Bundle traversal and selector responsiveness | Raw FHIR Bundle validation requires inspecting `Bundle.entry[].resource`, resource types, profiles, and sometimes supporting resources; the outer Bundle alone is not enough. |
| Profile-family membership for `profilesFrom[]` | Membership depends on implementation-guide knowledge, package metadata, configured family mappings, registry information, or local policy outside the JSON instance. |
| Additive profile-selector semantics | The schema can allow `profiles[]` and `profilesFrom[]` together, but it cannot determine whether returned content satisfies either additive profile selector subject to `resourceTypes[]`. |
| QuestionnaireResponse comparison | A Verifier may need to compare `QuestionnaireResponse.questionnaire` with a requested `form.fhir` selector's `questionnaireCanonical`, inline `questionnaire.url`/`questionnaire.version`, and Section 5.5 structured `|version` handling. |
| Raw FHIR release consistency | The schema can require an outer `fhirVersion`, but detecting mixed-release Bundles and deciding whether a raw FHIR Artifact's release is acceptable requires FHIR-aware and request-aware checks. |
| SMART Health Card payload validation | The schema can check the wrapper's `verifiableCredential[]` shape, but JWS verification, payload inspection, issuer trust, FHIR version, and selector responsiveness are SMART Health Cards and policy checks. |
| Full FHIR profile validation | FHIR profile, terminology, invariant, Questionnaire, and implementation-guide validation require FHIR validators and deployment policy outside the core JSON Schema. |
| Limits not fixed by Sections 5-6 | Maximum string lengths, array sizes, byte sizes, URL dereferencing behavior, and extension payload limits belong to transport profiles, extension registrations, conformance tooling, or deployment policy unless later normative text fixes them. |

### B.5 Illustrative validation flow

The following sequence is illustrative. It shows where Appendix B schema validation fits relative to other validation; it is not a new transport binding or implementation API.

1. Parse JSON using RFC 8259 rules and reject duplicate object member names when detected.
2. Validate the SMART request against the B.2 request schema.
3. Apply Section 5 procedural checks, including duplicate request-item id detection, registered extension-selector handling, and requester-identity metadata review.
4. Validate the SMART response against the B.3 response schema.
5. Apply Section 6.6 cross-validation against the original request: exact `requestId` match, `fulfills[]` reference resolution, per-item `accept[]` compatibility, exact `requestStatus[]` coverage, and FHIR-version checks.
6. Apply FHIR, SMART Health Card, QuestionnaireResponse, transport, trust, security, privacy, and deployment-policy checks as applicable.

---

## Appendix C: Same-device CDDL and profile constraints

This appendix gives profile constraints and diagnostic pseudo-CDDL for the same-device direct `org-iso-mdoc` flow defined in Section 8. It is intended to make SMART Health Check-in byte boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The profile reuses ISO/IEC 18013-5 mdoc, COSE, COSE_Key, CBOR, and HPKE structures. ISO/IEC 18013-5 and the referenced COSE/HPKE specifications own the base structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key`. This appendix constrains only SMART Health Check-in profile portions: fixed identifiers, carriers, tag-24 boundaries, direct `dcapi` wrappers, HPKE context, and the stable SMART response element.

The snippets below are profile pseudo-CDDL. They use field names and byte-boundary names from Section 8 and companion byte-ladder material. They are not a complete replacement for ISO/IEC 18013-5 CDDL, and they do not claim exactness for ISO map labels or optional fields not confirmed by the active profile. If this appendix conflicts with Section 8, Section 8 controls.

### C.1 Notation and constants

`bstr .cbor X` means a CBOR byte string containing a complete CBOR serialization of `X`. `#6.24(bstr .cbor X)` means CBOR tag 24 around that byte string. `COSE_Sign1` and `COSE_Key` are references to COSE structures.

The same-device profile uses these fixed values:

```text
smart-protocol-id        = "org-iso-mdoc"
smart-doc-type           = "org.smarthealthit.checkin.1"
smart-namespace          = "org.smarthealthit.checkin"
smart-response-element   = "smart_health_checkin_response"
smart-request-info-key   = "org.smarthealthit.checkin.request"
dcapi-label              = "dcapi"
```

A Verifier, Wallet/Responder, or Verifier-side processor that implements the same-device profile SHALL apply the Section 8 constraints restated in this appendix when producing or consuming the corresponding structures.

### C.2 Digital Credentials API request and result wrappers

The W3C Digital Credentials API wrappers are JSON, not CBOR. The Verifier invokes direct `org-iso-mdoc` with request data equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
    "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
  }
}
```

The Wallet/Responder returns a result equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

`data.deviceRequest`, `data.encryptionInfo`, and `data.response` are JSON strings carrying encoded CBOR bytes. Processors SHALL NOT interpret these wrapper strings as plaintext SMART request or SMART response JSON. The exact unpadded `data.encryptionInfo` base64url string is a `SessionTranscript` input; processors SHALL NOT substitute a decoded-and-re-encoded spelling when constructing or verifying the transcript.

### C.3 `DeviceRequest`, `DocRequest`, and tag-24 `ItemsRequest`

The core same-device request uses ISO/IEC 18013-5 `DeviceRequest` version `"1.0"` and `DocRequest.itemsRequest` as a tag-24-wrapped `ItemsRequest`.

```cddl
; Pseudo-CDDL profile constraints, not full ISO replacement CDDL.
smart-device-request = {
  "version" => "1.0",
  "docRequests" => [ + smart-doc-request ],
  * tstr => any
}

smart-doc-request = {
  "itemsRequest" => smart-items-request-bytes,
  ? "readerAuth" => cose-sign1-reader-auth,
  * tstr => any
}

smart-items-request-bytes = #6.24(bstr .cbor smart-items-request)

smart-items-request = {
  "docType" => "org.smarthealthit.checkin.1",
  "nameSpaces" => {
    "org.smarthealthit.checkin" => {
      "smart_health_checkin_response" => bool
    }
  },
  "requestInfo" => {
    "org.smarthealthit.checkin.request" => smart-request-json-text,
    * tstr => any
  },
  * tstr => any
}

smart-request-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinRequest
```

A Verifier SHALL set `DeviceRequest.version` to exactly `"1.0"` for the core version 1.0 flow. A Verifier SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`.

A Verifier SHALL carry the SMART request only as a CBOR text string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic mdoc element names, archived compressed-element experiments, implementation-defined initiation wrapper fields, other `requestInfo` keys, `readerAuth`, `encryptionInfo`, or Digital Credentials API wrapper fields as version 1.0 SMART request carriers.

The boolean at `nameSpaces["org.smarthealthit.checkin"]["smart_health_checkin_response"]` is the mdoc `intentToRetain` flag for the requested stable response element. It is not Holder consent, not authenticated requester identity, not a retention authorization, and not a clinical selector.

### C.4 Optional per-`DocRequest.readerAuth`

Core SMART Health Check-in 1.0 uses optional per-`DocRequest.readerAuth`. It does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core reader-authentication mechanism.

When present, `readerAuth` is a detached `COSE_Sign1` bound to the exact direct `dcapi` `SessionTranscript` bytes and the exact tag-24 `ItemsRequest` bytes:

```cddl
reader-authentication-bytes = #6.24(bstr .cbor [
  "ReaderAuthentication",
  session-transcript-bytes,
  smart-items-request-bytes
])

cose-sign1-reader-auth = COSE_Sign1
```

A Verifier that includes `readerAuth` SHALL construct a detached `COSE_Sign1` with protected header `{1: -7}` for ES256, serialized payload `null`, empty external AAD in the COSE `Signature1` structure, and `reader-authentication-bytes` as the detached payload. It SHALL include reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Wallet/Responder acceptance of a certificate chain, trust anchor, revocation status, key usage, display name, or organizational assurance label is deployment-policy work under Section 7.

A Wallet/Responder that supports or relies on reader authentication SHALL verify the signature over the exact `reader-authentication-bytes`, including the same `SessionTranscript` and tag-24 `ItemsRequest` bytes. It SHALL distinguish absent, syntactically invalid, cryptographically failed, cryptographically valid but untrusted, and trusted reader-authentication states for policy and display.

### C.5 `encryptionInfo`, `SessionTranscript`, and HPKE context

The direct Digital Credentials API `encryptionInfo` value is CBOR carried as unpadded base64url text in the JSON wrapper:

```cddl
smart-encryption-info = [
  "dcapi",
  {
    "nonce" => bstr,
    "recipientPublicKey" => p256-recipient-public-key,
    * tstr => any
  }
]

p256-recipient-public-key = {
   1  => 2,       ; kty = EC2
  -1  => 1,       ; crv = P-256
  -2  => bstr,    ; x-coordinate
  -3  => bstr,    ; y-coordinate
  * int => any
}
```

The `recipientPublicKey` is a COSE_Key for an EC2 P-256 public key. A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy. Active request builders and fixtures commonly use 32 bytes, but 32 bytes is not a universal core requirement unless a later conformance-vector profile or deployment profile explicitly makes it one.

The direct `dcapi` transcript is byte-sensitive:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact unpadded base64url text from the request wrapper. `origin` is supplied by the Browser / User Agent, platform, or deployment-approved privileged-caller mechanism. It is not derived from the SMART request, `purpose`, item display text, selector URLs, request ids, implementation-defined initiation metadata, callback-looking strings, or returned Artifacts.

The Wallet/Responder encrypts CBOR `DeviceResponse` bytes using HPKE base mode with:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

### C.6 Direct `dcapiResponse`

The HPKE output is wrapped as CBOR before being base64url-encoded in the JSON result:

```cddl
smart-dcapi-response = [
  "dcapi",
  {
    "enc" => bstr,
    "cipherText" => bstr,
    * tstr => any
  }
]
```

`enc` is the HPKE KEM encapsulated key for DHKEM(P-256, HKDF-SHA256). `cipherText` is the AEAD ciphertext, including its authentication tag, over `CBOR(DeviceResponse)`. A Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a different `dcapiResponse` carrier, non-empty HPKE AAD, or another HPKE suite for the core version 1.0 flow.

### C.7 `DeviceResponse` subset and issuer-signed SMART response item

After HPKE opening, the plaintext is a CBOR `DeviceResponse` using ISO/IEC 18013-5 structures. The SMART profile constrains the accepted subset to include a successful response containing a document for `docType` `org.smarthealthit.checkin.1` with the SMART response in an issuer-signed namespace item.

```cddl
; Pseudo-CDDL profile constraints. Base structures and map labels are ISO-owned.
smart-device-response = {
  "version" => "1.0",
  "documents" => [ + smart-document ],
  "status" => 0,
  * tstr => any
}

smart-document = {
  "docType" => "org.smarthealthit.checkin.1",
  "issuerSigned" => smart-issuer-signed,
  "deviceSigned" => smart-device-signed,
  * tstr => any
}

smart-issuer-signed = {
  "nameSpaces" => {
    "org.smarthealthit.checkin" => [ + smart-issuer-signed-item-bytes ]
  },
  "issuerAuth" => COSE_Sign1,
  * tstr => any
}

smart-issuer-signed-item-bytes = #6.24(bstr .cbor smart-issuer-signed-item)

smart-issuer-signed-item = {
  "digestID" => uint,
  "random" => bstr,
  "elementIdentifier" => "smart_health_checkin_response",
  "elementValue" => smart-response-json-text,
  * tstr => any
}

smart-response-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinResponse
```

A Wallet/Responder SHALL carry the SMART response only as the `elementValue` of the issuer-signed `smart_health_checkin_response` item in namespace `org.smarthealthit.checkin`. It SHALL NOT carry the SMART response as `requestInfo`, as plaintext Digital Credentials API JSON, as plaintext `dcapiResponse` content, or as a device-signed namespace element in place of the issuer-signed item.

The `elementValue` text string contains a SMART response conforming to Section 6. Its `requestId`, `artifacts[]`, `fulfills[]`, media types, FHIR version fields, SMART Health Card payloads, and `requestStatus[]` are validated under Section 6 and Section 6.6, not by mdoc CDDL alone.

### C.8 MSO value digest, `issuerAuth`, and device authentication

The Mobile Security Object and `issuerAuth` are ISO/IEC 18013-5 and COSE structures. This profile constrains these relationships:

- `MSO.docType` is `org.smarthealthit.checkin.1`.
- `MSO.digestAlgorithm` is `SHA-256` for the core profile.
- `MSO.valueDigests["org.smarthealthit.checkin"][digestID]` corresponds to the disclosed `IssuerSignedItem.digestID`.
- The value-digest input is the complete tag-24-wrapped `IssuerSignedItem` bytes, not only the inner map, not only `elementValue`, and not diagnostic notation.
- `MSO.deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.
- `issuerAuth` is a `COSE_Sign1` using ES256 (`alg` `-7`) over the MSO payload form required by Section 8 and the selected ISO-compatible encoding.

Active Android fixtures use digestID `0` for the single stable element, but the core protocol requirement is consistency between the disclosed item `digestID` and the corresponding MSO `valueDigests` entry. A fixture profile MAY freeze digestID `0` for a named vector class, but this appendix does not make that value a general protocol constant.

The device-authentication payload binds the document to the same presentation session:

```cddl
smart-device-signed = {
  "nameSpaces" => device-name-spaces-bytes,
  "deviceAuth" => {
    "deviceSignature" => COSE_Sign1,
    * tstr => any
  },
  * tstr => any
}

device-name-spaces-bytes = #6.24(bstr .cbor device-name-spaces)
device-name-spaces = { * tstr => any }

device-authentication-bytes = #6.24(bstr .cbor [
  "DeviceAuthentication",
  session-transcript-bytes,
  "org.smarthealthit.checkin.1",
  device-name-spaces-bytes
])
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The device `COSE_Sign1` SHALL use ES256 (`alg` `-7`) and the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`. The SMART response item remains issuer-signed; moving it into `DeviceNameSpaces` is not an equivalent SMART Health Check-in response carrier.

### C.9 Extraction, validation, and deferred exactness

Appendix B identifies expected carriers and byte boundaries, but it cannot by itself establish trust or clinical validity. A Verifier accepting a same-device response SHALL perform the Section 8.7 and Section 8.8 checks: decode the JSON wrapper, HPKE-open using the expected transcript, parse `DeviceResponse`, validate `issuerAuth`, validate the MSO and digest binding, validate device authentication, extract the SMART response JSON string from the stable issuer-signed item, validate it under Section 6, and apply Section 6.6 cross-validation against the original SMART request.

Successful mdoc parsing, HPKE opening, digest validation, issuer evidence, device signature validation, optional reader authentication, or `requestId` matching does not create clinical-source provenance for unsigned raw FHIR JSON. Source trust for raw FHIR JSON, SMART Health Cards, provenance-bearing FHIR, or other Artifact forms remains governed by Section 7.4 and the Artifact evidence itself.

The following exactness issues are intentionally unresolved here and should be closed by Section 11, Section 13, Appendix A, a deployment profile, or a future fixture-vector profile before being treated as pass/fail conformance requirements:

- duplicate CBOR or JSON map key handling;
- multiple matching `docRequests` or multiple matching `DeviceResponse.documents`;
- duplicate `smart_health_checkin_response` issuer-signed items or duplicate stable elements;
- deterministic CBOR map ordering or canonical encoding for vector generation;
- digestID conventions such as always using `0` for single-item vectors;
- fixed nonce-size constraints beyond fresh unpredictable bytes and the 16-byte recommendation; and
- complete imported ISO/IEC 18013-5 CDDL and exact base-structure map labels.

---
