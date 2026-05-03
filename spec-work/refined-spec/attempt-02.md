# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

Short title: SMART Health Check-in 1.0. Suggested citation label: SHC-Checkin-1.0. Suggested document identifier: `smart-health-checkin-1.0`. Status: editor's draft for implementer review.

**Editorial approach.** This candidate uses implementer-path condensation. It keeps the path a developer implements cover-to-cover: conformance targets, fixed identifiers, request JSON, response JSON, trust separation, same-device wire flow, validation, security/privacy, registries, schema, and FHIR mapping. Long narrative, diagrams, byte ladders, fixture catalogs, platform implementation notes, and extensive worked examples are summarized as companion material. This document remains self-contained for normative implementation.

## 1. Introduction

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receives a structured SMART response. The specification separates the transport-neutral clinical content model from presentation transport: the SMART request describes requested items, Holder-facing context, selectors, and accepted response media types, while the SMART response returns Artifacts, fulfillment links, and per-item status. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as its same-device presentation flow. In-person QR, NFC, deep-link, pointer, relay, submission, and completion mechanisms are deployment-defined ways to land a Holder on a same-device Verifier page, not a separate normative protocol layer.

SMART Health Check-in 1.0 standardizes two shared protocol surfaces: (1) the clinical content model in Sections 5-6; and (2) the same-device presentation flow in Sections 7-8. The same SMART request has the same clinical meaning whether carried by the same-device presentation flow or by a future binding. Presentation transports can add origin context, reader or Verifier information, encryption, freshness, device evidence, routing metadata, and validation rules; they do not change request item semantics, selector meaning, consent granularity, Artifact media types, or response status semantics.

Out of scope: issuance, credential refresh, issuer onboarding, longitudinal Wallet storage, EHR write-back, downstream workflow, identity proofing, patient matching, portal enrollment, guardian/proxy authority, payments, eligibility adjudication, claims submission, benefit determination, arbitrary FHIR query, SMART App Launch replacement, FHIR API replacement, QR/NFC/deep-link/pointer/relay/submission/completion-display wire formats, and a universal production trust framework.

Request items can use FHIR-native selectors: exact profile canonicals in `profiles[]`, profile-family canonicals in `profilesFrom[]`, official FHIR resource type names in `resourceTypes[]`, `form.fhir` Questionnaire references, inline Questionnaires, and registered extension selectors. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors, not narrowing selectors.

### 1.1 Conventions and terminology

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** are interpreted as BCP 14, RFC 2119, and RFC 8174 keywords only when all capitals. A requirement applies to the conformance target named by the sentence, paragraph, subsection, or checklist item. A requirement for an optional feature applies only to implementations claiming that feature unless Section 4 makes it mandatory.

JSON uses RFC 8259. CBOR uses RFC 8949. CDDL uses RFC 8610. COSE uses RFC 9052 terminology. JOSE/JWS uses RFC 7515. HPKE uses RFC 9180. Base64url means URL-safe base64 without `=` padding unless a field explicitly says otherwise. Operations over bytes use the underlying bytes, not Markdown, diagnostic notation, hex text, or base64url text, unless explicitly stated.

| Term | Meaning |
| --- | --- |
| Requester | Party that asks for check-in content and consumes the SMART response. |
| Verifier | Component that packages a SMART request, validates presentation artifacts, extracts the SMART response, and applies Section 6.6. |
| Holder | Person or actor controlling disclosure through a Wallet/Responder. |
| Wallet / Responder | Component that validates a SMART request, applies Holder control and Wallet policy, constructs a SMART response, and returns it. |
| Artifact | Response object with `id`, `mediaType`, `fulfills[]`, and media-type-specific payload. |
| Request item | Unit of requested clinical content or form completion, identified by `items[].id`; the Holder-review and response-accounting granularity. |
| SMART request | The transport-neutral JSON object in Section 5. |
| SMART response | The transport-neutral JSON object in Section 6. |

## 2. Purpose and architecture

The protocol supports same-device patient portal check-in, in-person initiation that lands on a same-device page, pre-visit intake from a patient phone, insurance-card sharing, and health-summary sharing. These are use cases, not separate protocol layers.

Version 1.0 goals are: transport-neutral clinical content; per-item Holder control; FHIR-native selectors; many-to-many fulfillment; interoperability across EHRs and Wallets; and layerable trust. The threat model assumes request display text can be misleading; launch surfaces can be spoofed or stale; Wallet data can be incomplete; raw FHIR JSON can be patient-mediated without source proof; and presentation success does not by itself imply patient match, clinical correctness, consent law compliance, or downstream acceptance.

The normative live flow is: Requester/Verifier constructs a Section 5 SMART request; Verifier packages it in Section 8 direct `org-iso-mdoc`; Wallet validates the wrapper and request, computes `SessionTranscript`, classifies optional `readerAuth`, and performs Holder review; Wallet constructs a Section 6 SMART response, places it in the stable mdoc element, and HPKE-encrypts it; Verifier decrypts, validates mdoc evidence, extracts the SMART response, applies Section 6.6, and applies trust/downstream policy.

Version 1.0 uses one mdoc `docType`, one namespace, and one stable response element. The SMART request body is not a requester identity credential. FHIR canonicals are used where they fit; local topic vocabularies are not substitutes for FHIR resource type names or canonical selectors. Response forms are media types. Raw FHIR JSON Artifacts declare an outer `fhirVersion`; SMART Health Card Artifacts do not. Cryptographic agility is by profile/registry, not in-band negotiation.

## 3. Reserved

Section 3 is reserved for future architectural diagrams and sequence examples. Informative diagrams and examples do not create protocol behavior beyond Sections 4-8.

## 4. Conformance

A conformance claim SHALL identify the implemented conformance target or targets, the claimed feature set or profile, the specification version, and any deployment profile that changes policy choices left open by this specification. One product MAY implement multiple targets, but it SHALL satisfy the requirements for each target and feature it claims.

SMART Health Check-in 1.0 has two normative layers: (1) the transport-neutral clinical request and response model in Sections 5-6; and (2) the direct same-device `org-iso-mdoc` presentation flow, including trust processing, in Sections 7-8. A deployment MAY use a QR code, NFC tap, deep link, desktop sign, kiosk screen, or other handoff to land the Holder on a page that runs Section 8. That handoff is implementation-defined deployment UX, not a SMART Health Check-in conformance feature or wire protocol.

### 4.1 Conformance targets

A Requester claiming core clinical conformance SHALL construct `SmartHealthCheckinRequest` objects according to Section 5 and SHALL request only Artifact media types it is prepared to process for the corresponding item. A Verifier claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Verifier-side requirements in Section 8 and SHALL apply Section 6.6 before Requester use. A Requester/Verifier SHALL keep clinical request fields distinct from trust evidence and SHALL NOT put requester identity, organization metadata, web origin, reader credentials, deployment handoff metadata, callback endpoints, trust assertions, or production trust-anchor claims in the SMART request body as substitutes for presentation-layer or deployment-policy trust.

A Holder Wallet/Responder claiming core clinical conformance SHALL validate SMART requests under Section 5 before using them for response construction, process request items as the Holder-review and response-accounting granularity, preserve request item ids for `fulfills[]` and `requestStatus[].item`, construct SMART responses under Section 6, and set `SmartHealthCheckinResponse.requestId` to the accepted SMART request `id`. A Holder Wallet/Responder claiming direct same-device `org-iso-mdoc` support SHALL satisfy Section 8, including request-carrier validation, `SessionTranscript` processing, optional `readerAuth` classification and verification when supported or relied upon, Holder review or equivalent Holder-control processing, mdoc response construction, and HPKE response encryption. A Holder Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown SMART request members, deployment handoff metadata, demo strings, or Artifact contents as authenticated requester identity unless the selected presentation flow, trust processing, or deployment policy establishes that fact outside the SMART request body.

A deployment/profile author SHALL state which conformance targets are constrained, which optional features are required, which trust layers are in scope, and which additional validation, security, privacy, or fixture expectations apply. A deployment or profile SHALL NOT redefine clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, status codes, same-device carriers, trust-layer separation, or implementation-defined handoff UX.

### 4.2 Mandatory and optional features

The mandatory core is the transport-neutral SMART request and SMART response model in Sections 5-6. Direct same-device presentation in Sections 7-8 is the normative live presentation layer for implementations that claim live SMART Health Check-in presentation support.

A Requester SHALL support construction of SMART requests using the Section 5 top-level request shape, fixed `type`, fixed `version`, request `id`, item shape, item ids, Holder-facing display fields, `content.kind` selectors, per-item `accept[]`, and applicable Section 5.5 canonical `|version` handling rules. A Wallet/Responder SHALL support parsing and validation of Section 5 SMART requests and construction of Section 6 SMART responses for claimed capabilities. A Verifier or receiver validation target SHALL validate SMART responses under Section 6 and apply Section 6.6 against the original SMART request; shape validation alone is not sufficient.

Core clinical support includes `selection.fhir` and `form.fhir` selector shapes where claimed; `form.fhir` with `questionnaireCanonical` and/or `questionnaire` directly on the selector; `profilesFrom[]` as an array of canonical profile-family URLs; additive `profiles[]` plus `profilesFrom[]`; canonical `|version` resolution and verification; request `accept[]` and Artifact `mediaType` rules; no generic catch-all Artifact carrier; `application/fhir+json` Artifacts with `fhirVersion`; `application/smart-health-card` Artifacts with `value.verifiableCredential[]` and no outer Artifact `fhirVersion`; `requestStatus[]` coverage exactly once for every item; and Section 6.6 cross-validation.

All conformance targets SHALL preserve Section 7 trust-layer separation. In particular, an implementation SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from successful transport presentation, mdoc issuer/device evidence, reader authentication, Holder action, SMART response shape validation, deployment handoff metadata, or demo fixture keys.

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as Section 8 defines. A Wallet/Responder that claims support for reader authentication or relies on it for policy SHALL verify and classify it under Sections 7-8 and deployment policy.

Extension selector kinds, extension Artifact media types, media-type compatibility rules, future status-code extensions, stricter deployment schemas, schemas, CDDL, fixtures, and conformance vectors are optional unless a deployment or certification profile requires them. An implementation that claims an extension SHALL implement the extension's defined shape, processing rules, validation rules, unsupported behavior, security considerations, privacy considerations, and interactions with Sections 5-8. The Section 10 OpenID4VP binding is reserved and informative; no implementation is required to support it, and an OID4VP experiment SHALL NOT claim Section 8 conformance unless a future version or explicit profile defines that mapping.

### 4.3 Identifiers and versions

| Identifier kind | Value | Scope |
| --- | --- | --- |
| SMART request discriminator | `smart-health-checkin-request` | Section 5 `type`. |
| SMART response discriminator | `smart-health-checkin-response` | Section 6 `type`. |
| SMART model version | `1` | Section 5 and Section 6 `version`. |
| Core selector kinds | `selection.fhir`, `form.fhir` | Section 5 `content.kind`. |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` | Section 5 `accept[]`, Section 6 `mediaType`. |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` | Section 6 `requestStatus[].status`. |
| DC API protocol id | `org-iso-mdoc` | Section 8 Digital Credentials API protocol. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | Section 8 document type. |
| mdoc namespace | `org.smarthealthit.checkin` | Section 8 namespace. |
| mdoc stable element | `smart_health_checkin_response` | Section 8 response element. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | Section 8 `ItemsRequest.requestInfo` key. |

Provisional profile labels are `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and `smart-health-checkin-oid4vp-reserved`. These are documentation and test-report labels, not in-band clinical request fields. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, a profile label, a topic label, or negotiation metadata to bypass Section 5 selectors, Section 5 `accept[]`, Section 6 response validation, Section 7 trust processing, or Section 8 validation.

Implementations SHALL compare and interpret the version marker for the layer they are processing and SHALL NOT substitute one layer's version for another. SMART request/response `version: "1"`, `DeviceRequest.version`/`DeviceResponse.version` `"1.0"`, `docType` `org.smarthealthit.checkin.1`, FHIR `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes are distinct. Minor revisions, extensions, or deployment profiles MAY add optional members or stricter policy only when unknown recipients can ignore, reject, or report unsupported without changing known required field meaning or bypassing validation. Breaking changes require a new version, profile identifier, or future specification revision.

## 5. Clinical content - request

This section defines the SMART request. Presentation transports can add origin, Verifier or reader authentication, signatures, encryption, freshness, device evidence, routing identifiers, relay behavior, and validation artifacts. They do not change `purpose`, request items, selectors, `accept[]`, item ids, or advisory `required`.

### 5.1 Encoding rules

A SMART request is a JSON object. A Requester SHALL encode a SMART request as RFC 8259 JSON. When serialized as text or bytes by a transport binding, the serialized JSON text SHALL be UTF-8. A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or values outside the JSON data model. A Wallet/Responder or Verifier that parses a SMART request SHALL reject a request whose top-level value is not a JSON object or whose representation cannot be parsed according to selected transport encoding rules.

JSON object member names in a SMART request SHALL be unique within each object. A Wallet/Responder or Verifier SHALL reject a SMART request when duplicate member names are detected. Object member order has no clinical meaning. In this section, `fhirVersions[]` and `accept[]` are ordered by Requester preference; `items[]` order is preferred display/workflow order. This section defines no numeric fields. A Requester SHALL NOT encode identifiers, versions, booleans, arrays, media types, FHIR canonicals, or display strings as JSON numbers.

A Requester SHOULD keep request ids, item ids, titles, summaries, purpose text, canonicals, media type strings, and inline Questionnaire content no larger than needed. A Wallet/Responder MAY reject a request that exceeds implementation, transport, safety, display, or policy limits, provided rejection is reported according to selected flow and privacy requirements.

A Wallet/Responder MAY ignore unknown members at the top level, in request items, and inside known selector objects when those members do not change known required member meaning. Ignoring an unknown member does not make a malformed known member valid. A Requester SHALL NOT rely on an unknown member to carry requester identity, override Holder control, change `accept[]`, change selector semantics, change `required`, or impose transport, trust, or consent behavior. An unknown `content.kind` is an extension selector and is processed under Section 5.4.3 and Section 6.

### 5.2 `SmartHealthCheckinRequest`

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

A Requester SHALL include `type`, `version`, `id`, and `items`. A Requester MAY include `purpose` and `fhirVersions`. A Requester SHALL set `type` to exactly `"smart-health-checkin-request"`; a Wallet/Responder SHALL reject absent or different `type`. A Requester SHALL set `version` to exactly `"1"`; a Wallet/Responder SHALL reject absent or different `version` unless a future compatibility rule explicitly permits another value.

A Requester SHALL include `id` as a non-empty opaque Requester-generated identifier unique among SMART requests created by that Requester for the same check-in session. A Requester SHOULD generate `id` values with enough unpredictability or contextual uniqueness to avoid accidental collision and cross-session guessing. A Wallet/Responder SHALL preserve the request `id` for response `requestId`. A Wallet/Responder SHALL NOT infer requester identity, patient identity, authorization, or clinical meaning from `id`.

`purpose` is optional Holder-facing display and workflow context. If present, a Requester SHALL encode `purpose` as a string and SHALL use it only to describe workflow context for Holder review. A Requester SHALL NOT use `purpose` to carry requester identity, organization name, web origin, logo URL, contact URL, legal attestation, proof of authority, consent language, trust status, or persistent authorization semantics. A Wallet/Responder MAY display `purpose` and SHALL NOT treat it as authenticated requester identity or transport trust.

If a Requester includes `fhirVersions`, it SHALL encode it as an array of strings ordered most preferred to least preferred. A Requester that accepts `application/fhir+json` SHOULD include at least one FHIR release version unless it can safely process any conforming returned FHIR version. A Wallet/Responder SHOULD use `fhirVersions[]` when choosing a FHIR version for `application/fhir+json`, subject to Holder decision, data, capability, policy, and `accept[]`. `fhirVersions[]` does not override version semantics intrinsic to SMART Health Cards or registered extensions.

A Requester SHALL include `items` as an array and SHOULD include at least one request item. A Requester SHALL encode each `items[]` member as Section 5.3. A Wallet/Responder SHALL process `items[]` as Holder-review and response-accounting granularity. A Wallet/Responder MAY group, summarize, or reorder items for accessibility, safety, or policy, but SHALL preserve item `id` values for fulfillment and status reporting.

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body, including requester/clinic/payer/facility names, logos, brand fields, URLs, callback endpoints, origins, package names, application ids, certificates, signed-request metadata, reader/Verifier/trust/issuer/accreditation/legal-entity metadata, or pointer/relay/completion/encryption/nonce/handoff/wrapper metadata. The prohibition applies to the top-level object, items, selectors, and extension members. A Wallet/Responder SHALL NOT treat any SMART request body field, including unknown fields, `purpose`, item text, selectors, or extension members, as authenticated requester identity unless the same fact is established outside the SMART request body.

### 5.3 `SmartHealthCheckinRequestItem`

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

A Requester SHALL include `id` as a non-empty string on every item and SHALL NOT reuse an item `id` within one SMART request. A Wallet/Responder SHALL reject missing, non-string, empty, or duplicate item `id`. Item ids are scoped to one request; Wallet/Responder and Verifier SHALL compare them by exact string equality. Newly defined item ids SHOULD consist only of ASCII letters, digits, period, underscore, tilde, and hyphen; Wallets/Responders MAY accept other non-empty string ids when they can preserve them exactly. A Requester SHOULD NOT include patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in item ids.

A Requester SHALL include `title` as a non-empty Holder-facing string and SHALL NOT use it as requester identity. A Wallet/Responder SHOULD make `title` available in Holder review. A Requester MAY include `summary` as a string and SHOULD use it to clarify broad selectors, profile-family requests, or questionnaire purpose. A Requester SHALL NOT use `summary` as requester identity. A Wallet/Responder MAY display, summarize, or suppress `summary`, but SHALL preserve item ids.

A Requester MAY include `required` as a boolean. If omitted, a Wallet/Responder SHALL interpret it as `false` for display and decision support. A Requester SHALL treat `required` as advisory workflow context only. `required: true` is not Holder consent, legal authorization, a Wallet command, or a guarantee. A Wallet/Responder MAY display or consider `required`, but SHALL NOT use it to bypass Holder control, policy, law, or consent UX. A Wallet/Responder MAY return declined, unavailable, unsupported, partial, or error for required items.

A Requester SHALL include `accept` as a non-empty array of media type strings, ordered most preferred to least preferred. A Requester SHALL NOT include a media type unless prepared to process a conforming Artifact of that type for the item. A Wallet/Responder MAY choose any listed media type and SHOULD choose the earliest producible type when otherwise equivalent. A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact `mediaType` is listed in that item's `accept[]`, except where a registered compatibility rule explicitly permits substitution. If no listed media type can be produced, the Wallet/Responder SHALL report item outcome using Section 6 status rather than returning unaccepted media.

A Requester SHALL include `content` as a selector object and SHALL include string `content.kind`. Version 1.0 defines `selection.fhir` and `form.fhir`. A Wallet/Responder that does not understand `content.kind` SHALL NOT infer semantics from display text or unrelated fields; it SHALL treat the item as unsupported or reject according to selected flow and Section 6.

### 5.4 Content selectors

A Requester SHALL use a selector shape defined here or by a registered extension. Selectors are not FHIR query language, CDS expression, patient-matching rule, authorization policy, or requester identity channel. A Wallet/Responder SHALL evaluate selector semantics independently for each item while allowing Section 6 many-to-many fulfillment.

#### 5.4.1 `selection.fhir`

```json
{
  "kind": "selection.fhir",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

A `selection.fhir` selector requests existing patient-specific FHIR resources. A Requester SHALL set `kind` to `"selection.fhir"`. A Requester MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination, or none. If present, each SHALL be an array of strings. A `selection.fhir` selector SHALL NOT include `questionnaireCanonical` or `questionnaire`; workflows needing both resource selection and form completion SHALL use separate items.

`profiles[]` identifies exact FHIR `StructureDefinition` profile canonical URLs. A Requester MAY include `profiles` as an array of one or more FHIR canonical strings and SHOULD use canonical StructureDefinition URLs. Values MAY include `|version` under Section 5.5. A Wallet/Responder MAY match a resource when `meta.profile` declares a listed canonical or when equivalent local knowledge or trusted conformance evidence exists. Full FHIR profile validation is not required during request matching by this base specification.

`profilesFrom[]` identifies one or more profile families by canonical URL. A Requester MAY include `profilesFrom` as a non-empty array of canonical profile-family URL strings. A Requester SHALL encode `profilesFrom` as an array and SHALL NOT encode it as a string, object, package descriptor, implementation-guide object, package id, package version, npm package name, registry alias, local topic vocabulary, or URN unless a future version or registered extension explicitly defines such a value space. A Wallet/Responder SHALL reject a `selection.fhir` selector whose present `profilesFrom` member is not a non-empty array of strings. A Wallet/Responder MAY additionally reject values that are not canonical URLs. A Wallet/Responder MAY use local knowledge, package metadata, implementation-guide definitions, configured mappings, or deployment knowledge to determine family membership.

`resourceTypes[]` narrows by official FHIR `resourceType` names. A Requester MAY include `resourceTypes` as an array of one or more strings, SHALL use official FHIR resource type names appropriate to supported FHIR versions, and SHALL NOT use local topic labels, display strings, or implementation-specific category names unless they are official FHIR resource type names. When `resourceTypes[]` appears with `profiles[]` or `profilesFrom[]`, a Wallet/Responder SHALL treat it as an additional resource-type constraint: a resource is responsive only if it matches at least one applicable profile selector and its `resourceType` is listed. When `resourceTypes[]` appears alone, a Wallet/Responder SHALL treat the selector as requesting patient-specific FHIR resources of the listed types, subject to Holder decision, accepted media types, FHIR version compatibility, available data, and policy.

`profiles[]` and `profilesFrom[]` are additive. When both are present, a Wallet/Responder SHALL treat a resource as satisfying the profile-selector portion if it matches any exact profile in `profiles[]` or any profile in any family in `profilesFrom[]`, subject to `resourceTypes[]` and the rest of the item. A Requester SHALL NOT rely on `profiles[]` to narrow a broader `profilesFrom[]`; a Wallet/Responder SHALL NOT interpret `profiles[]` as limiting, filtering, enumerating, or narrowing `profilesFrom[]`. `resourceTypes[]` is the separate constraint defined above.

If `selection.fhir` omits `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, policy, and Holder decision. A Requester SHOULD avoid this no-selector default unless broad content is safe and clearly explained. A Wallet/Responder MAY satisfy a no-selector item with any compatible patient-specific FHIR resources, is not required to disclose all available resources, and MAY fulfill partially.

#### 5.4.2 `form.fhir`

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "<Questionnaire canonical>",
  "questionnaire": { "resourceType": "Questionnaire" }
}
```

A `form.fhir` selector requests completion of a FHIR Questionnaire form. For `application/fhir+json`, the expected response content is a FHIR `QuestionnaireResponse`. A Requester SHALL set `content.kind` to `"form.fhir"` and SHALL include `questionnaireCanonical`, `questionnaire`, or both as direct selector members. If present, `questionnaireCanonical` SHALL be a non-empty FHIR canonical string and MAY include `|version`. If present, `questionnaire` SHALL be an inline FHIR `Questionnaire` resource object with `resourceType` `"Questionnaire"`.

A `form.fhir` selector SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; workflows needing both form completion and existing-resource selection SHALL use separate items. A Wallet/Responder SHALL reject or report unsupported for a `form.fhir` selector with neither form field, a non-string or empty `questionnaireCanonical`, a non-Questionnaire `questionnaire`, or mixed form and selection fields.

A Wallet/Responder MAY resolve `questionnaireCanonical` using configured canonical resolver, FHIR search, cache, Holder data source, or another local mechanism satisfying Section 5.5. Direct HTTP dereference is permitted only for unversioned canonicals. If the Wallet/Responder cannot resolve, render, or use the Questionnaire, it SHALL report item outcome through Section 6 status rather than fabricating a Questionnaire.

When both `questionnaireCanonical` and `questionnaire` are supplied, the canonical is the Requester's explicit Questionnaire identity and the inline resource is the body to render or use. A Requester SHOULD keep `questionnaireCanonical`, `questionnaire.url`, and `questionnaire.version` consistent. A Wallet/Responder SHALL NOT silently merge conflicting Questionnaire definitions or rewrite the Requester's canonical to match an inline resource. If it detects material disagreement, it SHOULD treat the item as unsupported or error rather than collecting answers against an ambiguous Questionnaire.

#### 5.4.3 Extension selectors

An extension registrant SHALL define the exact `content.kind` string; JSON shape and required/optional members; clinical meaning; content-satisfaction rules; interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, and Artifact fulfillment; unsupported/unavailable/partial/error behavior; unknown-member handling; privacy and security considerations; and at least one example. An extension registrant SHALL NOT redefine core field or selector semantics and SHALL NOT permit requester identity metadata in the SMART request body unless a future version defines an explicit trust model. A Requester SHALL NOT use an unregistered or privately defined extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support an extension selector SHALL NOT guess its semantics; it SHALL reject or report `unsupported`.

### 5.5 Canonical `|version` handling

A Requester MAY include `|version` suffixes in fields where FHIR canonicals are permitted. A Requester SHOULD NOT include `|version` in `profilesFrom[]` unless it intends a versioned profile family and expects Wallet/Responder support.

A Requester, Wallet/Responder, or Verifier that processes a FHIR canonical SHALL parse it into a non-empty `url` and optional `version`. The `url` is the substring before the first `|`, or the whole string when no `|` is present. The `version` is the substring after the first `|`; further `|` characters are part of the opaque version string. Implementations SHALL preserve the original wire canonical exactly for echoing, logging, response construction, test fixtures, returned `Resource.meta.profile`, and generated `QuestionnaireResponse.questionnaire` when that canonical is the Questionnaire identity being answered. Internal parsing SHALL NOT by itself rewrite the canonical carried or emitted.

A Wallet/Responder or Verifier resolving a canonical SHALL use a configured canonical resolver, package cache, terminology service, implementation-guide resolver, or FHIR search when available. The resolver SHALL consume `(url, version)` or `url` alone when unversioned. FHIR search semantics are `GET [base]/{ResourceType}?url={url}&version={version}` for versioned canonicals and `GET [base]/{ResourceType}?url={url}` for unversioned canonicals. The implementation SHALL select a single resource whose `(url, version)` matches and SHALL fail resolution if none exists. Direct HTTP dereference of the parsed `url` is permitted only for unversioned canonicals, only when the recipient accepts the publisher-served version, and only if verification passes. A Wallet/Responder or Verifier SHALL NOT satisfy a versioned canonical by stripping `|version` and dereferencing the bare URL.

After resolving, the implementation SHALL verify expected `resourceType`, `url` equal to the parsed request `url`, and, when versioned, `version` equal to the parsed request `version`. If any check fails, the affected request item or validation step SHALL be unsupported or error under Section 6.

When a `profiles[]` request includes `|version`, a Wallet/Responder SHALL NOT report `fulfilled` unless the resource `meta.profile` includes the same versioned canonical or equivalent local conformance evidence exists for that exact profile version. A Verifier SHALL apply the same exact-version comparison. When `profiles[]` has no `|version`, a Wallet/Responder or Verifier MAY match any supported version of the requested base canonical, subject to evidence and validation rules.

Wallet routing, broad content-kind classification, profile-family membership for `profilesFrom[]`, de-duplication, and Holder-display grouping MAY strip or ignore `|version` only for those local operations. Such stripping SHALL NOT affect resolution, exact-version profile matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation where exact version semantics matter. A Wallet/Responder SHALL NOT rewrite a requested canonical in a way that changes the semantic Questionnaire or profile and SHALL NOT strip `|version` from returned clinical content fields where the suffix communicates the version used.

### 5.6 Accepted media types

A Requester SHALL include a non-empty ordered `accept[]` array of media type strings on every item, SHALL order it most preferred to least preferred, SHALL NOT rely on a separate preference field, and SHALL list only media types it can parse, validate, and route. A Wallet/Responder MAY return any Artifact media type listed in the fulfilled item's `accept[]` and SHOULD choose the earliest listed producible media type when otherwise equivalent. A Wallet/Responder SHALL NOT return a media type for a request item unless that media type appears in that item's `accept[]`, except where a registered compatibility rule says the returned media type satisfies an accepted type. A Verifier SHALL enforce the same rule under Section 6.6; if one Artifact fulfills multiple items, the media type SHALL be acceptable for every item.

Version 1.0 core media types are `application/fhir+json` for raw FHIR JSON Resource or Bundle (Questionnaire items normally return `QuestionnaireResponse`; Artifact declares `fhirVersion`) and `application/smart-health-card` for SMART Health Card file JSON (`value.verifiableCredential[]`; signed content carries FHIR-version semantics). Extension media types MAY be used when defined by registered extension or deployment agreement; a registrant SHALL define string, Artifact shape, processing, validation, security, privacy, FHIR-version handling if any, and compatibility.

## 6. Clinical content - response

This section defines the SMART response. Presentation transports can wrap, encrypt, authenticate, retain, or relay a SMART response, but do not change `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, or `requestStatus[]`.

### 6.1 `SmartHealthCheckinResponse`

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "<request-id>",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include `type`, `version`, `requestId`, `artifacts`, and `requestStatus`. It SHALL set `type` to exactly `"smart-health-checkin-response"`; a Verifier SHALL reject absent or different `type`. It SHALL set `version` to exactly `"1"`; a Verifier SHALL reject absent or different `version` unless a future compatibility rule explicitly permits another value. It SHALL set `requestId` to the exact request `id`; a Verifier SHALL compare by exact string equality and reject mismatch. `requestId` is not a patient identifier, requester identifier, presentation-session identifier, freshness proof, or clinical fact.

A Wallet/Responder SHALL encode `artifacts` as an array; it MAY be empty when no item produces an Artifact if `requestStatus[]` accounts for every item. A Wallet/Responder SHALL encode each Artifact under Sections 6.2-6.3. Artifact array order has no clinical fulfillment meaning unless a registered media type defines order-sensitive payload semantics. A Wallet/Responder SHALL encode `requestStatus` as an array of Section 6.4 status objects; it is required even when every item is fulfilled.

### 6.2 Artifacts

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, `fulfills`, and media-type-defined payload fields on every Artifact. `id` SHALL be a non-empty string unique within one SMART response. A Verifier SHALL reject missing, non-string, empty, or duplicate Artifact ids. A Requester or receiver SHALL NOT treat Artifact ids as patient, requester, global document, or provenance identifiers unless separately established.

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string. Artifacts use `mediaType`; they do not use a separate Artifact-level protocol `type`. Version 1.0 core Artifact media types are `application/smart-health-card` and `application/fhir+json`. The core Artifact union is closed over these two variants. A Verifier SHALL NOT treat an unrecognized `mediaType` as a generic Artifact merely because it carries `value`, `url`, `data`, or another plausible carrier. Extension Artifact types SHALL be branded variants with pinned media type literal or bounded media-type pattern and typed payload fields.

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids. Each value SHALL exactly equal an item `id` in the original request. A Wallet/Responder MAY list multiple ids when one Artifact satisfies multiple items. If one Artifact fulfills multiple items, its `mediaType` SHALL be acceptable for every item. A Verifier SHALL reject unresolved `fulfills[]` values.

For core media types, a Wallet/Responder SHALL use `value` as payload. Extension types MAY define `value`, a locator, encoded data, or other typed fields. A Verifier or receiver SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration rules from field names alone.

### 6.3 Core Artifact variants

For `application/smart-health-card`, a Wallet/Responder SHALL set `mediaType` to `"application/smart-health-card"` and include `value` as a JSON object containing non-empty string array `verifiableCredential`. Each string SHALL be a SMART Health Card Verifiable Credential JWS. A Verifier or receiver SHALL verify and process each JWS according to SMART Health Cards and local trust policy. A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion`; a Verifier SHALL reject an `application/smart-health-card` Artifact that carries one. A SMART Health Card Artifact SHALL NOT use an Artifact-level profile summary field to claim conformance to request selectors.

For `application/fhir+json`, a Wallet/Responder SHALL set `mediaType` to `"application/fhir+json"`, include non-empty string `fhirVersion`, and include `value` as a FHIR JSON object. `value` SHALL be either a single FHIR Resource object with string `resourceType`, or a FHIR Bundle object with `resourceType` `"Bundle"` and `entry[]` resources when packaging multiple resources. A Wallet/Responder SHOULD use a Bundle for multiple FHIR resources and MAY return a single resource directly. A Wallet/Responder SHALL interpret all FHIR resources in one Artifact under that Artifact's `fhirVersion` and SHALL NOT mix resources requiring different FHIR releases within one `application/fhir+json` Artifact. When responsive content uses different FHIR releases, the Wallet/Responder SHALL return separate raw FHIR Artifacts or report partial, unavailable, unsupported, or error. A Verifier SHALL reject absent or non-string `fhirVersion` and SHOULD treat unacceptable FHIR versions as unsupported for ingestion. Wallets/Responders SHALL preserve FHIR `meta.profile` strings where known, including `|version` suffixes, and SHALL NOT strip or normalize version suffixes from source `meta.profile` strings. Raw FHIR JSON is patient-mediated unless separately signed/provenanced.

A Wallet/Responder MAY return an extension Artifact only when the `mediaType` is accepted by every item in `fulfills[]`, subject to compatibility rules, and when it can construct the Artifact according to a recognized extension definition. The extension Artifact SHALL include `id`, `mediaType`, `fulfills`, and typed payload fields required by that definition. Extension registrants SHALL define media type, branded variant name, fields, payload shape, encoding, dereferencing/integrity rules, FHIR-version handling if any, status behavior, validation, security, privacy, and compatibility. They SHALL NOT define only an unbounded `mediaType: string` catch-all or rely on protocol-level generic `value`, `url`, or `data` semantics.

### 6.4 Status reporting

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

A Wallet/Responder SHALL include exactly one status entry for every original request item, SHALL set `requestStatus[].item` to the exact item `id`, SHALL NOT include duplicate status entries for the same item, and SHALL NOT include unknown item ids. A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every item exactly once and contains no unknown item id. If the original request has zero items, a conforming Wallet/Responder still SHALL include `requestStatus` as an array.

A Wallet/Responder SHALL set `requestStatus[].status` to one of: `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, or `error`, unless a future registered status-code extension is explicitly supported by the receiving Verifier. `fulfilled` means the Wallet/Responder believes the item was fully satisfied by returned Artifact content. `partial` means some relevant Artifact content was returned but not complete fulfillment. `unavailable` means the item and requested selector/media type are understood and supported but no matching content is available or shareable, without Holder refusal being the relevant cause. `declined` means the Holder declined or Wallet policy treated Holder preference as refusal. `unsupported` means the Wallet/Responder could not understand or support the item, selector, shape, media type, Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. `error` means operational or processing failure after the item was understood and not simply declined, unavailable, or unsupported.

A Wallet/Responder SHALL use `unsupported`, not `unavailable`, for unsupported selector kind, selector shape, media type, FHIR version, or Questionnaire definition. It SHALL use `unavailable`, not `unsupported`, when it understands the item but lacks matching shareable content. It SHOULD use `unsupported` for material `questionnaireCanonical`/`questionnaire` disagreement before answers are collected and SHOULD use `error` for operational failures after a Questionnaire is otherwise understood. It SHALL use `declined` when non-fulfillment is due to Holder decision and MAY use `declined` for local policy implementing Holder preferences. It SHALL use `partial` when returning responsive content without claiming complete satisfaction. It SHALL use `fulfilled` only when it believes the item is fully satisfied. It SHALL use `error` when processing failure prevents normal outcome classification.

A `fulfilled` or `partial` status SHOULD have at least one Artifact whose `fulfills[]` includes the item id unless a registered extension defines a non-Artifact fulfillment pattern. A Verifier SHALL treat unknown status codes as invalid for v1.0 unless explicitly supported. A Wallet/Responder MAY include string `message`, but SHALL NOT include secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data. Receivers SHALL NOT rely on `message` to determine normative status semantics.

### 6.5 Many-to-many fulfillment

A Wallet/Responder MAY return one Artifact whose `fulfills[]` contains multiple item ids when the same content satisfies multiple items, and MAY return multiple Artifacts whose `fulfills[]` contain the same item id when several pieces together satisfy or partially satisfy one item. For every fulfillment edge, Artifact `mediaType` SHALL be accepted by that item. Many-to-many fulfillment does not relax media-type, FHIR-version, selector, status, or validation rules. A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry per item. A Verifier SHALL evaluate all Artifacts that list an item in `fulfills[]`. A receiver MAY choose which valid Artifacts to ingest or display, but SHALL NOT treat multiple Artifacts as a protocol error.

### 6.6 Cross-validation rules Verifier SHALL apply

A Verifier validates a SMART response against the original SMART request before Requester or downstream use. Shape validation alone is not sufficient. A Verifier SHALL reject unless:

1. `requestId` exactly equals original request `id`.
2. Each Artifact `fulfills[]` value resolves to exactly one original item id; arrays are present, non-empty, and arrays of strings.
3. Each Artifact `mediaType` is a core media type or explicitly supported registered/profiled extension media type.
4. Each Artifact `mediaType` appears in every fulfilled item's `accept[]`, unless a supported registered compatibility rule applies.
5. `requestStatus[]` contains exactly one status object per original item id, no unknown ids, and no duplicate `item`; no status entry may be inferred from an Artifact alone.
6. Each `application/fhir+json` Artifact has non-empty string `fhirVersion` and FHIR JSON object `value` with string `resourceType`; if the request included `fhirVersions[]`, the Verifier SHOULD verify the Artifact version is requested unless policy or future compatibility permits another version.
7. Non-Bundle raw FHIR resources, Bundles, and all `Bundle.entry[].resource` resources are interpreted under the Artifact `fhirVersion`; mixed-release Bundles are rejected or quarantined.
8. `application/smart-health-card` Artifacts have no outer Artifact-level `fhirVersion`; FHIR-version semantics come from signed credential payloads.
9. The Verifier SHOULD inspect returned FHIR `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related FHIR content for selector responsiveness. Absence of `meta.profile` is not automatically a protocol error, but versioned profile fulfillment requires exact-version evidence in `meta.profile` or equivalent local evidence. A Verifier SHALL preserve returned `meta.profile` strings exactly and SHALL NOT strip `|version` to satisfy exact-version requests.
10. For `profilesFrom[]`, the Verifier MAY need implementation-guide, family-map, package, or local policy knowledge outside the response. For questionnaire items returning raw FHIR JSON, a Verifier SHOULD validate returned content is a `QuestionnaireResponse` and that `QuestionnaireResponse.questionnaire`, when present, preserves the requested canonical and `|version` under Section 5.5.

## 7. Trust framework

Trust information is supplied by the selected presentation flow, returned Artifact payloads, deployment policy, or out-of-band trust-framework decisions; it is not supplied by self-asserted requester identity fields in the clinical request body. The trust layers are origin trust; reader/Verifier trust; issuer/device-attestation trust; clinical-source trust; and out-of-band deployment policy. A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator SHALL NOT treat one trust layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and assurance level. Successful transport presentation proves only properties validated for that transport and session. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority, downstream clinical acceptance, or clinical-source provenance for unsigned content.

### 7.1 Origin trust

Origin trust is presentation-transport evidence, not reader authentication, mdoc issuer assurance, clinical-source provenance, Holder consent, patient matching, or downstream authorization. A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body to substitute for origin trust. A Wallet/Responder SHALL NOT treat `purpose`, request item `title`, request item `summary`, selector values, unknown request members, extension members, or Artifact content as authenticated requester identity or authenticated origin. A Wallet/Responder MAY use authenticated origin for Holder display, local risk decisions, allow-lists, diagnostics, or policy, but SHALL keep origin decisions separate from clinical-content validation.

When DC API or platform exposes authenticated origin, a Wallet/Responder that uses origin trust SHALL use that platform-provided origin as the web-origin input for origin display, origin policy, and Section 8 binding. It SHALL NOT derive authenticated origin from SMART request JSON, `purpose`, item text, callbacks, logos, ids, selector URLs, handoff metadata, or Artifact payloads. If origin or privileged caller context cannot be authenticated, a Wallet/Responder SHALL treat origin trust as absent and SHALL NOT infer requester identity or origin from the SMART request body. If proceeding without authenticated origin, it SHALL NOT present unauthenticated origin or request context as verified identity. A Verifier or Requester requiring origin-authenticated presentation SHALL reject, quarantine, or avoid reliance when required origin evidence is absent or fails policy.

A Wallet/Responder that relies on privileged-caller or browser-trust evidence SHALL use authenticated platform evidence and apply Wallet or deployment policy before treating the caller as trusted. It SHALL NOT derive privileged-caller trust from the SMART request body. Development allow-lists or demo caller evidence MAY be used only when clearly non-production; they SHALL NOT be treated as production privileged-caller trust unless deployment policy explicitly accepts them.

### 7.2 Reader / Verifier trust

A Requester or Verifier SHALL NOT place reader identity, organization identity, legal-entity identifiers, certificates, trust-framework claims, or signatures inside the SMART request body as a substitute for reader authentication. A Verifier MAY include per-`DocRequest.readerAuth` as a detached `COSE_Sign1` over `ReaderAuthentication`. When included, it SHALL be for the same presentation session and exact requested items, using the Section 8 construction that binds `SessionTranscript` and exact `ItemsRequest` bytes; it SHALL NOT be reused across sessions, transcripts, or `ItemsRequest` bytes.

A Wallet/Responder that receives `readerAuth` and claims support SHALL verify COSE signature, signed context, detached-payload binding, request bytes, protected algorithm and key type, certificate or public-key material, and configured trust-anchor policy. It SHALL treat cryptographically invalid, malformed, mismatched, unsupported, or policy-unacceptable `readerAuth` as failed. It SHALL NOT treat mere presence of `readerAuth`, certificate chain, common name, logo, or display string as successful reader authentication.

When `readerAuth` includes certificate material, Wallet/Responder or deployment profile SHALL define evaluation policy and accepted trust anchors when reader trust is required. A Wallet/Responder relying on reader certificates SHALL validate the reader signing key against certificate material and evaluate certificate chain or key evidence against policy. It SHALL NOT treat a self-signed demo certificate, arbitrary leaf, expired certificate, revoked certificate, unsupported algorithm, or untrusted chain as production reader trust unless deployment policy explicitly authorizes it. A Verifier presenting certificate material SHALL provide it in the location and encoding required by Section 8 and ensure the signing key corresponds to authenticated evidence.

`readerAuth` is optional in core v1.0 unless a deployment profile makes it mandatory. When absent, Wallet/Responder SHALL treat reader authentication as absent and SHALL NOT display the Verifier as reader-authenticated. When present but invalid, untrusted, expired, unsupported, malformed, or otherwise unacceptable, Wallet/Responder SHALL treat reader authentication as failed and distinguish absent from failed for policy. If proceeding with unsigned or untrusted-reader requests, it SHALL NOT represent the reader or organization as authenticated by reader authentication. A Verifier SHALL NOT assume transport invocation alone causes Wallet acceptance of unsigned reader requests.

### 7.3 Issuer / device-attestation trust

A Verifier SHALL apply Section 8 mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and extraction checks before relying on mdoc-layer evidence, and SHALL then apply Section 6.6. A Verifier or deployment profile SHALL define trust-anchor policy for validating MSO issuer signatures when issuer trust is required. A Verifier relying on mdoc issuer evidence SHALL validate MSO issuer signature, issuer certificate path or equivalent key evidence, digest bindings, document type, namespace, disclosed element identifiers, and validity constraints required by Section 8 and policy. It SHALL NOT treat a syntactically valid MSO, matching digest, valid signature against an included leaf, or self-signed issuer certificate as production issuer trust unless evidence chains to or matches an accepted trust anchor. MSO issuer trust authenticates the mdoc issuer for the presentation container; it does not prove clinical provenance, correctness, completeness, or downstream acceptability.

A Verifier SHALL verify device-key proof of possession as required by Section 8 before treating the mdoc presentation as device-bound. Device authentication verification SHALL use the same presentation session and `SessionTranscript`. A Verifier SHALL NOT treat a SMART response as transport-valid if device-key proof fails, device authentication is not bound to the expected session, or the disclosed response element does not match issuer-signed digest. A Wallet/Responder constructing an mdoc response SHALL produce required device-key proof.

A deployment profile MAY permit a self-attested wallet model. A Verifier MAY accept self-attested Wallet presentations only under a policy explicitly permitting that model and defining assurance level. A Verifier or Requester accepting self-attested evidence SHALL treat issuer/device evidence as self-attested or deployment-local, not production third-party issuer assurance. A Verifier, Requester, or Wallet/Responder SHALL NOT label self-attested mdoc evidence as externally issuer-accredited or production issuer-trusted unless policy supports that claim. A Wallet/Responder using self-attestation SHALL NOT claim raw FHIR JSON Artifacts are issuer-signed clinical credentials. Self-attestation does not relax request parsing, response validation, `requestId`, `fulfills[]`, `requestStatus[]`, media-type, FHIR-version, or same-device validation.

### 7.4 Clinical-source trust and identifiers

Clinical-source trust is evaluated at Artifact payload layer and through deployment policy. A Verifier or receiver SHALL evaluate it according to Artifact `mediaType`, payload signatures or provenance, request selectors, FHIR evidence, SMART Health Card rules, extension rules, and deployment policy. It SHALL NOT infer clinical-source provenance from successful transport presentation alone. Origin evidence, `readerAuth`, mdoc issuer evidence, and device proof do not by themselves establish FHIR profile conformance or exact-version clinical-source trust.

For `application/smart-health-card`, a Verifier or receiver SHALL verify each `value.verifiableCredential[]` JWS according to SMART Health Cards and local trust policy before relying on signed content or issuer claims, and SHALL evaluate signed payload content against the original selectors and policy. For `application/fhir+json`, a Wallet/Responder SHALL include `fhirVersion`; a Verifier SHALL treat it as FHIR release context, not a signature or proof. Raw FHIR JSON SHALL be treated as patient-mediated unless accepted separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof is present. A Wallet/Responder SHALL NOT use transport encryption, mdoc issuer signatures, device proof, `readerAuth`, origin, `purpose`, item text, Artifact ids, `fulfills[]`, handoff fields, or successful validation to claim unsigned raw FHIR JSON is issuer-signed clinical credential.

Identifiers are scoped correlation values unless a payload, binding, Artifact, or policy gives broader meaning. A Requester, Wallet/Responder, Verifier, deployment profile, or trust-framework operator SHALL preserve identifier scopes and SHALL NOT treat an identifier from one layer as identifier, proof, or authorization for another layer unless specified. Request `id`, item ids, Artifact ids, origins, certificate subjects, key ids, nonces, URL tokens, relay ids, and completion ids have separate scopes. A deployment profile SHOULD define collision resistance, replay, retention, logging, telemetry, and privacy expectations for identifiers it introduces.

Deployment profiles that add trust requirements SHALL document constrained roles; trust layers; anchors, registries, allow-lists, certificate policies, issuer policies, source-provenance mechanisms, or assurance labels; freshness/revocation/expiration/replay/status expectations; Wallet failure behavior; Verifier/Requester/receiver behavior; and Holder display distinctions. A deployment profile SHALL state mandatory trust layers and resulting assurance if absent or failed layers are permitted. It SHALL NOT redefine clinical semantics. A Verifier or Requester SHALL apply required trust policy before downstream use; a Wallet/Responder SHALL apply local policy and applicable deployment profile before disclosure.

## 8. Same-device presentation flow over `org-iso-mdoc`

This is the only normative SMART Health Check-in 1.0 presentation flow. In-person initiation mechanisms such as QR, NFC, and deep links MAY load a same-device Verifier page that runs this section; their URL formats, relay behavior, storage, and completion handling are outside this specification.

### 8.1 Identifiers and constants

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested/disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

A Verifier SHALL use these identifiers exactly. It SHALL carry the SMART request only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`; Wallet/Responder SHALL NOT treat dynamic element names, handoff wrapper fields, archived claim-name experiments, or other locations as request carriers. Wallet/Responder SHALL carry the SMART response as `elementValue` of an issuer-signed item in namespace `org.smarthealthit.checkin` with `elementIdentifier` `smart_health_checkin_response`.

### 8.2 Request construction

A Verifier starts with a Section 5 SMART request, serializes it as UTF-8 JSON text, and places the resulting CBOR text string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. It is not a CBOR map representation and not base64url JSON. The spec does not define canonical JSON serialization.

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": { "smart_health_checkin_response": true }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": JSON.stringify(SmartHealthCheckinRequest)
  }
}
```

The `true` value is mdoc `intentToRetain`. A Verifier SHALL default it to `true` for `smart_health_checkin_response`. A Verifier MAY set it to `false` only when it truly intends ephemeral use and deployment policy permits. The flag does not override Holder choice, Wallet policy, law, privacy, or downstream retention. A Verifier SHALL NOT model profiles, request items, questionnaires, media types, status codes, or resources as separate mdoc elements in the core flow.

A Verifier SHALL set `ItemsRequestBytes = tag24(CBOR(ItemsRequest))` and place it in `DocRequest.itemsRequest`. A Verifier SHALL construct `DeviceRequest` version exactly `"1.0"` with a `docRequests` array containing that `DocRequest`. Core v1 uses per-`DocRequest.readerAuth` when present and SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core mechanism unless future version/profile defines it.

If including `readerAuth`, the Verifier SHALL construct detached ES256 `COSE_Sign1` over:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The protected header SHALL include `{1: -7}`. Serialized `COSE_Sign1` payload SHALL be `null`. Signature input SHALL be `Signature1` with empty external AAD and `ReaderAuthenticationBytes` as detached payload. It SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. It SHALL be computed for exact `SessionTranscript` and exact `ItemsRequestBytes` and SHALL NOT be reused across sessions, origins, encryption information, SMART request serializations, or requested element sets.

For each presentation, a Verifier SHALL generate or select an HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256), SHOULD use a fresh pair, and SHALL use fresh unpredictable nonce bytes. Implementations SHOULD use at least 16 bytes of nonce entropy; active fixtures use 32 bytes. The public key in `encryptionInfo` SHALL be a COSE_Key EC2 P-256 with at least labels `1:2`, `-1:1`, `-2:<x>`, `-3:<y>`. The Verifier SHALL construct CBOR `encryptionInfo = ["dcapi", {"nonce": <fresh bytes>, "recipientPublicKey": <P-256 COSE_Key>}]`, retain the private key and exact `encryptionInfo` bytes until done, base64url-encode CBOR `DeviceRequest` and `encryptionInfo` without padding, and preserve the exact `encryptionInfo` base64url string.

### 8.3 `SessionTranscript`

Both sides SHALL compute identical direct `dcapi` `SessionTranscript` bytes. Let `encryptionInfoBase64Url` be the exact unpadded base64url string in the DC API request. Let `origin` be authenticated origin or deployment-defined privileged-caller origin-equivalent supplied by browser/platform.

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

SHA-256 input is exact CBOR serialization of `[encryptionInfoBase64Url, origin]`; `SessionTranscript` bytes are exact CBOR serialization of `[null, null, handover]`. Wallet/Responder SHALL obtain `origin` from authenticated platform channel and SHALL NOT derive it from SMART request JSON, display text, selector URLs, ids, handoff metadata, callback-looking strings, or Artifact contents. Verifier SHALL use the same origin value for `readerAuth`, HPKE `info`, and expected device authentication. Wallet/Responder SHALL use the same transcript for `readerAuth` verification, `DeviceAuthentication`, and HPKE encryption; Verifier SHALL use it for HPKE opening and device-signature verification. If origin-equivalent context is unavailable, Wallet/Responder SHALL fail or proceed only under explicit deployment profile; it SHALL NOT substitute a SMART request field.

### 8.4 Wallet request handling

Wallet/Responder SHALL validate before response construction: protocol `org-iso-mdoc`; base64url/no-padding CBOR `DeviceRequest`; `DeviceRequest.version` `"1.0"`; tag-24 `DocRequest.itemsRequest`; exact tag-24 bytes preserved; decoded `ItemsRequest`; `docType` `org.smarthealthit.checkin.1`; namespace `org.smarthealthit.checkin` requests `smart_health_checkin_response` and `intentToRetain` recovered; requestInfo key value recovered as string; string parsed as UTF-8 JSON and validated under Section 5; `data.encryptionInfo` decoded as CBOR direct `"dcapi"` envelope with P-256 recipient public key; and `SessionTranscript` recomputed from exact `encryptionInfo` base64url and authenticated origin or approved equivalent.

If SMART request JSON is absent, not string, unparsable, not object, or invalid under Section 5, Wallet/Responder SHALL reject or fail safely and SHALL NOT infer clinical semantics from mdoc element names, display strings, archived dynamic-element encodings, unknown fields, or handoff wrappers. If `readerAuth` is present and supported or relied on, Wallet/Responder SHALL verify detached `COSE_Sign1`, protected algorithm, `ReaderAuthenticationBytes`, `SessionTranscript`, exact tag-24 `ItemsRequestBytes`, signature, `x5chain`, and deployment trust policy, distinguishing absent, syntactically invalid, cryptographically failed, valid but untrusted/policy-unacceptable, and trusted states. After validation, Wallet/Responder SHALL run Holder review or equivalent Holder-control processing at request-item granularity, preserve ids, and SHALL NOT treat `required: true` or unauthenticated request fields as consent or verified requester identity.

### 8.5 Response construction and HPKE

Wallet/Responder that proceeds SHALL construct a Section 6 SMART response with `requestId` exactly equal to accepted request `id`. It SHALL serialize it as UTF-8 JSON text and create:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": JSON.stringify(SmartHealthCheckinResponse)
}
```

Wallet/Responder SHALL CBOR-encode `IssuerSignedItem`, wrap in CBOR tag 24, place it in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`, compute MSO value digest over the complete tag-24 bytes, and ensure `digestID` matches `MSO.valueDigests["org.smarthealthit.checkin"]`. It SHALL construct an MSO with `docType` `org.smarthealthit.checkin.1`, `digestAlgorithm` `SHA-256`, `valueDigests` covering the disclosed item, and `deviceKeyInfo.deviceKey` for device authentication. It SHALL sign MSO as `issuerAuth` using `COSE_Sign1` ES256 (`alg` `-7`), with payload as tag-24 MSO bytes unless an ISO-compatible profile defines equivalent encoding.

Wallet/Responder SHALL construct:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

For core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines extra device-signed elements; the SMART response remains issuer-signed and is not moved into `DeviceNameSpaces`. Wallet/Responder SHALL produce device `COSE_Sign1` ES256 (`alg` `-7`) with the private key corresponding to `MSO.deviceKeyInfo.deviceKey`. It SHALL construct `DeviceResponse` version `"1.0"`, successful `status: 0`, document `docType` `org.smarthealthit.checkin.1`, issuer-signed namespace item, `issuerAuth`, device-signed namespaces, and device signature.

Wallet/Responder SHALL encrypt CBOR `DeviceResponse` using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, `aad = empty byte string`, and plaintext `CBOR(DeviceResponse)`. `enc` is the HPKE encapsulated ephemeral P-256 public key; `cipherText` includes AEAD tag. Wallet/Responder SHALL wrap output as CBOR `dcapiResponse = ["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`, base64url-encode without padding, and return:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

Wallet/Responder SHALL NOT return plaintext `DeviceResponse`, plaintext SMART response JSON, a different `dcapiResponse` carrier, non-empty HPKE AAD, or another HPKE suite for core v1.

### 8.6 Verifier processing

Verifier SHALL require returned `protocol` `org-iso-mdoc`; require `data.response` unpadded base64url string; decode and parse CBOR `dcapiResponse`; require direct shape `["dcapi", {"enc": bstr, "cipherText": bstr}]`; reconstruct expected `SessionTranscript`; HPKE-open with retained recipient private key, corresponding public key from `encryptionInfo`, received `enc`, required suite, `info = SessionTranscript bytes`, and empty `aad`; reject on HPKE failure; parse plaintext as CBOR `DeviceResponse`; require version `"1.0"` and success status for accepted document; locate document `docType` `org.smarthealthit.checkin.1`; verify `issuerAuth` ES256 `COSE_Sign1`, MSO docType, validity, device key, issuer signature, and issuer evidence under Section 7.3/policy; locate issuer-signed item in namespace `org.smarthealthit.checkin` with `elementIdentifier` `smart_health_checkin_response`; recompute digest over exact tag-24 item bytes and compare to MSO digest; verify device `COSE_Sign1` using `MSO.deviceKeyInfo.deviceKey` over expected `DeviceAuthentication`; require `elementValue` string; parse as JSON and validate under Section 6; and apply all Section 6.6 rules before accepting.

Verifier SHALL reject or quarantine if HPKE opening, issuer/MSO validation, digest validation, device authentication, stable element, SMART response JSON validation, or Section 6.6 cross-validation fails. Verifier SHALL keep HPKE success, origin binding, reader auth, issuer/MSO validation, device proof, SMART response validity, and SMART Health Card verification separate; none alone proves patient identity, downstream authorization, or clinical-source provenance for unsigned raw FHIR JSON.

## 9. Reserved

Section 9 is reserved to avoid renumbering historical draft references. It defines no runtime behavior.

## 10. Reserved future OpenID4VP binding

The OpenID4VP binding is informative and reserved for a future version or explicit profile. A future binding would need request-object mapping, `vp_token` mapping, DCQL alignment, signing keys, response encryption, and validation mapping to Sections 5-7. It does not weaken Section 8.

## 11. Security considerations

Security claims are layered. A component SHALL NOT describe one successful control as proof that another succeeded unless this specification or deployment profile defines that relationship. SMART Health Check-in 1.0 does not standardize cross-device cryptographic wrappers, pointer URL formats, relay/storage protocols, or response-submission protocols.

A Verifier MUST NOT accept plaintext `DeviceResponse`, plaintext SMART response JSON, a substituted HPKE suite, or a response whose HPKE context is not bound to expected transcript. Wallet/Responder or Verifier SHALL NOT downgrade v1 ciphertext to plaintext, substitute encryption context, or treat decryption as sufficient clinical validation. Implementations SHALL keep HPKE keys, recipients, transcript inputs, algorithm identifiers, ciphertexts, plaintexts, and validation results separate from deployment-local transport, storage, diagnostic, or cross-device mechanisms.

Freshness comes from fresh unpredictable `encryptionInfo.nonce`, retained HPKE recipient key material, exact `encryptionInfo` base64url, authenticated origin or approved equivalent, `SessionTranscript`, optional `readerAuth` bound to transcript and exact tag-24 `ItemsRequest`, and device authentication bound to transcript. Request ids, item ids, Artifact ids, and handoff identifiers are not freshness proofs. A Verifier SHOULD use fresh HPKE recipient key pair per session and maintain workflow state to reject stale, duplicate, mismatched, or superseded responses.

Origin evidence comes from browser/user agent, Credential Manager, platform, or approved privileged caller, not SMART request JSON, launch URL, `purpose`, item text, selector URLs, callbacks, package-looking strings, logos, common names, unknown extensions, or returned content. A Wallet/Responder using origin trust SHALL use authenticated platform origin or approved equivalent for Section 8 transcript and Holder display, and SHALL NOT silently substitute request or launch metadata.

A Wallet/Responder supporting or relying on reader authentication SHALL verify signature, detached-payload binding, protected algorithm, signing key, certificate/key evidence, transcript, exact ItemsRequest bytes, and trust policy before treating the reader as authenticated. It SHALL distinguish absent, malformed, failed, valid-untrusted, and trusted `readerAuth`, and SHALL NOT treat mere presence of `readerAuth`, `x5chain`, names, logos, `kid`, launch URL, or demo certificate as successful authentication.

A Verifier SHALL complete Section 8 mdoc validation and apply Section 7 issuer/device policy before claiming production issuer trust. Mdoc evidence, HPKE opening, readerAuth, request-id match, origin binding, or device proof does not by itself prove production issuer accreditation, patient match, clinical correctness, clinical-source provenance, downstream authorization, or EHR write-back permission. Raw FHIR JSON SHALL be treated as patient-mediated unless separate accepted source proof exists.

Version 1.0 fixes algorithms by profile. Implementations SHALL reject unsupported or unexpected algorithm labels rather than downgrading, ignoring labels, substituting library defaults, accepting deployment-supplied alternatives, or treating available platform algorithms as implicitly valid. Future cryptographic agility belongs in explicit versioned profiles, registries, deployment profiles, and conformance vectors.

Implementations SHOULD minimize plaintext requests, responses, FHIR resources, SMART Health Cards, Questionnaire answers, `DeviceResponse` plaintext, `dcapiResponse` internals, HPKE `enc`/`cipherText`, `deviceRequest`, `encryptionInfo`, Wallet secrets, access tokens, bearer URLs, full launch URLs, full QR images, and valid-id enumeration clues except controlled diagnostics. Fixture, crash, debug, or support bundles containing live PHI, production private keys, bearer credentials, or unredacted clinical content are security incidents, not conformance artifacts.

Wallet UX is a security control. A Wallet/Responder SHALL validate incoming Section 8 request before disclosure, recover the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, compute transcript from authenticated origin or approved equivalent, classify reader auth accurately, and perform Holder review or equivalent Holder-control at request-item granularity before disclosing through Section 8 unless an explicit profile defines another mechanism and assurance. It SHALL preserve item ids and construct `requestStatus[]` covering every item once. It SHOULD make requested content, accepted media types, broad selectors, and outcomes understandable, and SHALL NOT hide multiple items or broad selectors in a way that defeats meaningful Holder control. `required: true`, `intentToRetain`, QR/NFC/deep-link launch, DC API invocation, or clicking outside Wallet is not Holder consent.

## 12. Privacy considerations

A Requester SHOULD request the minimum clinical or administrative content needed. Selectors, `purpose`, titles, summaries, profile URLs, resource types, Questionnaire references/text, media types, and FHIR version lists can disclose context. The request item is the Holder-review and response-accounting granularity. A Wallet/Responder SHALL preserve item ids and provide Holder review or equivalent Holder-control at item granularity before disclosure. It MAY group, summarize, reorder, translate, or suppress details for accessibility, safety, localization, or policy, but SHALL NOT hide multiple items, broad selectors, accepted response forms, retention signals, or advisory `required` flags in a way that defeats meaningful Holder control. `required: true`, `intentToRetain`, opening a URL, scanning QR, tapping NFC, loading a same-device page, or clicking a page button is not consent.

A Wallet/Responder SHOULD return only Artifacts satisfying approved items, Holder choices, policy, available data, and accepted media types. It should avoid unrelated resources, unrelated SHCs, unnecessary answers, diagnostics, tokens, internal identifiers, or nonresponsive records. If only subset content is disclosed, `partial` is often more accurate than `fulfilled`.

Selective disclosure occurs through request-item boundaries, Wallet policy, Holder decisions, Artifact construction, accepted media types, `fulfills[]`, and per-item status. The mdoc binding carries one stable element, `smart_health_checkin_response`; it does not model each profile, Questionnaire, item, resource, or Artifact as separate mdoc elements. Implementations cannot rely on mdoc element selection alone to minimize clinical disclosure inside SMART response.

A Wallet/Responder SHOULD construct the smallest set of Artifacts accurately satisfying approved items and accepted forms. If one Artifact fulfills multiple items, each item needs to accept its `mediaType`, and the Artifact should be responsive to every listed item without over-disclosing. Verifier/Requester/receiver is responsible for validating `requestId`, `fulfills[]`, `requestStatus[]`, Artifact ids, media types, FHIR-version context, and source evidence before workflow use and should reject, quarantine, suppress, or minimize nonresponsive content.

Implementations SHOULD avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and avoid embedding patient account numbers, MRNs, member ids, phone numbers, emails, appointment ids, staff ids, clinic ids, source document ids, or predictable sequences in request ids, item ids, Artifact ids, telemetry event ids, or log correlation ids unless required and protected by deployment profile. Verifiers SHOULD use fresh HPKE recipient key material and nonces per session.

Wallets MAY display request fields as context but SHALL NOT label them as verified identity, authenticated origin, trusted reader identity, source provenance, legal authority, or consent text unless established by a trust layer. For common workflows, `intentToRetain` defaults to `true`; it is a retention signal, not override of Holder choice, law, or minimization. A Verifier MAY set it `false` only when truly ephemeral and permitted.

Requesters SHOULD avoid broad or ambiguous sensitive-category requests when narrower selector, Questionnaire, media type, or separate item suffices. Wallets SHOULD apply local sensitive-data policy, Holder preferences, law, and labels/provenance to show, suppress, redact, group, return, or refuse. Receivers should not infer clinical facts from missing Artifacts or non-fulfilled statuses.

Implementations SHOULD collect minimum telemetry and SHOULD NOT send plaintext protocol payloads, clinical content, private keys, bearer URLs, full ciphertext blobs, full QR images, or unredacted sensitive stack traces to routine telemetry, analytics, crash reporting, or support except under controlled diagnostic, fixture, audit, or incident-response procedures.

## 13. Registry and IANA considerations

SMART Health Check-in compares media type strings by exact, case-sensitive equality unless a future registered extension defines otherwise. Core media types are `application/fhir+json` and `application/smart-health-card`, externally defined/referenced. A Wallet/Responder SHALL NOT claim Artifact fulfillment unless `mediaType` appears in each fulfilled item's `accept[]`, except for supported registered compatibility rules. The v1 core Artifact union contains only the two core media types. Future Artifact media-type registrations SHALL define exact string, payload shape, fields, encoding, dereferencing/integrity, FHIR-version semantics, validation, status interaction, security, privacy, and compatibility, and SHALL NOT introduce a generic catch-all or redefine core fields.

The mdoc profile uses `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`. A Verifier claiming direct mdoc profile SHALL use them exactly. A Wallet/Responder SHALL disclose the response as `smart_health_checkin_response` `elementValue` in namespace `org.smarthealthit.checkin` and SHALL NOT treat dynamic element names, archived experiments, FHIR profiles, request items, media types, Questionnaires, status codes, or local namespaces as alternate core carriers. Future incompatible mdoc changes SHOULD use new profile identifier and, when necessary, new `docType` suffix.

The status-code registry initial entries are `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`. A Wallet/Responder SHALL use only these in v1 unless a future registered extension is explicitly supported by receiver. A Verifier SHALL treat unknown status invalid unless it explicitly supports the future entry. Future status codes SHALL define exact string, lifecycle, semantics, distinction from core codes, Artifact relationship, interaction with `required`, selectors, media types, Holder choice, `message`, Section 6.6, construction, validation, display, unsupported behavior, security, privacy, and tests, and SHALL NOT redefine core codes or remove exact status coverage.

The selector-kind registry initial entries are `selection.fhir` and `form.fhir`. A Requester SHALL use these or a registered extension for interoperable processing. A Wallet/Responder that does not support a selector kind SHALL NOT infer semantics from display text, profile labels, local topics, deployment metadata, or requester identity; it SHALL reject or report `unsupported`. Future selector registrations SHALL define exact kind string, JSON shape, members, unknown-member handling, meaning, satisfaction, interactions with `accept[]`, `fhirVersions[]`, canonicals, `|version`, status, Artifact fulfillment, Section 6.6, status behavior, examples, security, and privacy. They SHALL NOT redefine core fields or trust boundaries.

Profile identifiers are not request fields, response fields, selectors, media types, status codes, presets, IPS shortcuts, all-of-the-above shortcuts, topic labels, or substitutes for Section 5 selectors. A profile identifier SHALL NOT be placed inside a SMART request to bypass selectors, `accept[]`, response validation, trust, or Section 8. Deployment or extension profiles MAY impose stricter requirements but SHALL NOT redefine core semantics or Section 7 trust model.

Designated expert review applies before interoperable registration of new/changed status codes, selector kinds, extension Artifact media types/variants/compatibility rules, profile identifiers beyond provisional labels, and future mdoc `docType`/namespace/element/carrier changes. The expert SHOULD approve only registrations preserving Section 5/Section 6 semantics, validation, core selectors, trust-layer separation, v1 same-device identifiers, and Section 8 transcript binding; defining safe unsupported-recipient behavior; including security/privacy considerations; avoiding unnecessary plaintext intermediaries; and giving enough conformance guidance.

## 14. Internationalization

Internationalization requirements apply only to human-readable display text: `purpose`, item `title`, item `summary`, `requestStatus[].message`, FHIR Questionnaire text, FHIR display strings, UI prompts, warnings, errors, and extension fields identified as display text. Protocol identifiers and machine values are not localized, including request/response ids, item ids, Artifact ids, status item/status, selector kinds, canonicals, resource types, media types, status codes, mdoc ids, algorithm labels, and URLs.

SMART Health Check-in 1.0 does not define `lang`, `locale`, `Accept-Language`, language maps, negotiated-locale members, or locale parameters. An implementation SHALL NOT rely on unknown members, browser language, launch URL parameter, or HTTP header as interoperable locale-negotiation signal unless future version, registered extension, or deployment profile defines it. Producers SHOULD use well-formed BCP 47 tags when a FHIR resource, extension, profile, or UI associates language tags with display text. Missing language tag does not imply English. FHIR content follows FHIR i18n behavior.

A Requester SHOULD author display text suitable for expected Holder review. A Wallet/Responder MAY translate, summarize, group, reorder, or suppress display text for accessibility, localization, safety, or policy; if it does, it SHALL preserve underlying protocol values for construction and validation. A Wallet/Responder MAY include localized `message`, but receiver SHALL NOT rely on `message` to determine status semantics.

Producers of new display text SHOULD emit NFC. Consumers SHOULD accept valid Unicode display strings not NFC. A Requester, Wallet/Responder, Verifier, or receiver SHALL NOT apply normalization, case folding, accent folding, width folding, confusable mapping, BIDI reordering, transliteration, translated aliases, or locale collation to make distinct protocol identifiers or constants compare equal. Display normalization SHALL NOT change bytes or code points used for signatures, hashing, encryption, HPKE/HKDF inputs, COSE signing, mdoc digests, SHC verification, FHIR canonical preservation, audit records, or byte-exact fixtures. UIs SHOULD isolate untrusted text; Unicode/BIDI rendering SHALL NOT allow display text to spoof or obscure identifiers, origins, requester/reader identity, profile URLs, mdoc ids, provenance, source trust, status codes, validation, Holder decisions, or consent controls.

## 15. Implementation notes (informative)

Companion implementation material should cover verifier assembly, HPKE private-material handling, wallet origin policy, consent design, holder-store APIs, profile-family matching, QuestionnaireResponse construction, Android Credential Manager, iOS/Safari feasibility, EHR ingestion, SDKs, diagnostics, fixtures, byte ladders, CBOR notation, ISO compatibility, and worked examples. It must not redefine Sections 5-8.

## 16. Worked examples (informative)

Companion examples should cover insurance-card-only check-in, US Core summary check-in, inline questionnaire intake, mixed bundles, declined/partial/error outcomes, and no-selector sharing. Examples must use `selection.fhir`, `form.fhir`, `profilesFrom[]` arrays, additive selectors, core Artifact media types, valid statuses, and the Section 8 stable element. Examples are illustrative and do not define required clinical content, mandatory IGs, Holder decisions, trust anchors, or fixed identifiers.

## 17. Open issues and future work

Future work includes production issuer trust anchors and registries, privileged-browser allow-list policy, empirical `requestInfo` size limits, iOS/Safari feasibility, OID4VP binding alignment, and an external verifier conformance suite. These do not create current runtime requirements.

## 18. Acknowledgments and contributors

Editors, contributors, sponsoring organizations, affiliations, and contact information will be supplied before publication.

## 19. Change log

This candidate is an implementer-path condensation of the assembled current draft.

## Appendix A. Conformance checklist

This checklist indexes obligations elsewhere and creates no independent requirements. Optional rows apply only when claiming that target, feature, profile, or deployment constraint.

| ID | Target | Level | Requirement |
| --- | --- | --- | --- |
| A-001 | Claims | SHALL | Identify target, feature/profile, version, and deployment profile. |
| A-002 | Requester | SHALL | Construct Section 5 requests and list only processable media types. |
| A-003 | Verifier | SHALL | Validate presentation artifacts, extract response, and apply Section 6.6 before use. |
| A-004 | Wallet | SHALL | Validate Section 5 requests, preserve item ids, construct Section 6 responses, set exact `requestId`. |
| A-005 | All | SHALL NOT | Put or treat requester identity/trust metadata as SMART request body fields. |
| A-006 | Requester | SHALL | Encode JSON request as RFC 8259 UTF-8 object with no duplicate keys or non-JSON values. |
| A-007 | Wallet | SHALL | Reject malformed, non-object, duplicate-key, wrong `type`, or wrong `version` requests. |
| A-008 | Requester | SHALL | Include non-empty request `id`, `items` array, and required item fields. |
| A-009 | Requester | SHOULD | Include `fhirVersions[]` when accepting raw FHIR unless any version is safe. |
| A-010 | Wallet | SHALL | Process `items[]` at Holder-review/status granularity and preserve exact ids. |
| A-011 | Requester | SHALL | Include item `id`, non-empty `title`, `content`, and non-empty ordered `accept[]`. |
| A-012 | Wallet | SHALL | Reject duplicate/missing/empty item ids and compare ids exactly. |
| A-013 | Requester/Wallet | SHALL | Treat `required` as advisory only, not consent or authorization. |
| A-014 | Wallet | SHALL | Return only media types accepted by every fulfilled item unless a supported compatibility rule applies. |
| A-015 | Requester/Wallet | SHALL | Use `selection.fhir` and `form.fhir` shapes exactly; do not mix their fields. |
| A-016 | Requester | SHALL | Encode `profilesFrom` as non-empty array of canonical profile-family URLs. |
| A-017 | Wallet | SHALL | Treat `profiles[]` and `profilesFrom[]` additively and `resourceTypes[]` as official FHIR types. |
| A-018 | Wallet | SHALL | Reject unsupported selector shapes or report affected item `unsupported`; do not guess. |
| A-019 | All | SHALL | Parse and preserve canonical `|version`; do not direct-fetch versioned canonicals by stripping suffix. |
| A-020 | Wallet/Verifier | SHALL | Require exact-version evidence for versioned profile fulfillment. |
| A-021 | Wallet | SHALL | Preserve `QuestionnaireResponse.questionnaire` and `meta.profile` canonicals including `|version` where required. |
| A-022 | Wallet | SHALL | Construct response with fixed `type`, `version`, exact `requestId`, `artifacts[]`, and `requestStatus[]`. |
| A-023 | Verifier | SHALL | Reject wrong response `type`, `version`, `requestId`, duplicate Artifact ids, unresolved fulfills, unknown statuses, invalid media types, and failed Section 6.6 checks. |
| A-024 | Wallet | SHALL | For SHC Artifacts, use `application/smart-health-card`, non-empty `value.verifiableCredential[]`, and no outer `fhirVersion`. |
| A-025 | Verifier | SHALL | Verify each SHC JWS according to SMART Health Cards and local trust policy before reliance. |
| A-026 | Wallet | SHALL | For raw FHIR Artifacts, use `application/fhir+json`, non-empty `fhirVersion`, FHIR Resource or Bundle, and no mixed releases. |
| A-027 | Wallet | SHALL | Include exactly one status per request item and use only v1 status codes unless supported extension applies. |
| A-028 | Wallet | SHALL NOT | Put secrets, stack traces, tokens, unnecessary patient data, or unrelated data in `message`. |
| A-029 | Verifier | SHOULD | Inspect FHIR resourceType, meta.profile, Bundle entries, and QuestionnaireResponse.questionnaire. |
| A-030 | All | SHALL | Preserve trust-layer separation. |
| A-031 | Wallet | SHALL | Use authenticated origin/approved equivalent for origin trust and treat missing origin as absent. |
| A-032 | Verifier | MAY | Include per-DocRequest `readerAuth`; if included, bind it to exact transcript and ItemsRequest. |
| A-033 | Wallet | SHALL | Verify or classify present `readerAuth`; distinguish absent, failed, untrusted, and trusted states. |
| A-034 | Verifier | SHALL | Complete Section 8 mdoc issuer, digest, device-key, encryption, transcript, and extraction checks before relying on mdoc evidence. |
| A-035 | Verifier | SHALL | Apply issuer trust policy before production issuer trust and verify device proof before device-bound trust. |
| A-036 | Verifier/Receiver | SHALL | Treat raw FHIR as patient-mediated unless separate accepted source proof is present. |
| A-037 | All | SHALL | Preserve identifier scopes across request ids, item ids, Artifact ids, and presentation identifiers. |
| A-038 | Verifier | SHALL | Use Section 8 fixed protocol, docType, namespace, element, requestInfo key, version, tag-24, transcript, HPKE, and validation steps. |
| A-039 | Wallet | SHALL | Carry SMART response only as issuer-signed `smart_health_checkin_response` element in the fixed namespace. |
| A-040 | Wallet | SHALL | Encrypt CBOR DeviceResponse with required HPKE suite, `info = SessionTranscript`, and empty AAD; never plaintext. |
| A-041 | Verifier | SHALL | Decode `dcapiResponse`, HPKE-open, validate DeviceResponse/MSO/digest/device proof/stable element/SMART response/Section 6.6 before acceptance. |
| A-042 | All | SHALL | Reject unsupported algorithms/versions/carriers for v1 rather than downgrade or substitute. |
| A-043 | Requester | SHOULD | Minimize request content; Wallet SHALL provide item-level Holder control before disclosure. |
| A-044 | Wallet | SHOULD | Minimize returned Artifacts and avoid unrelated over-disclosure. |
| A-045 | All | SHOULD | Minimize identifiers, plaintext logs, telemetry, diagnostics, and retention. |
| A-046 | Registrants | SHALL | Define extension selectors, media types, status codes, and profile ids without redefining core semantics. |
| A-047 | All | SHALL | Compare media types, status codes, identifiers, canonicals, mdoc ids, and algorithm labels exactly unless future rule says otherwise. |
| A-048 | I18N | SHALL | Do not localize machine values or use locale/normalization/BIDI behavior to make distinct identifiers compare equal. |

## Appendix B. JSON Schema

JSON Schema validation is not complete protocol validation. Procedural checks include `requestId` equality, `fulfills[]` references, status coverage, duplicate member names/ids, media-type acceptance, requester identity prohibition, Bundle traversal, selector responsiveness, `profilesFrom[]` family membership, additive selector semantics, QuestionnaireResponse comparison, FHIR release consistency, SHC JWS validation, full FHIR profile validation, and limits not fixed by this specification.

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
    "id": { "type": "string", "minLength": 1 },
    "purpose": { "type": "string" },
    "fhirVersions": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "content", "accept"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "title": { "type": "string", "minLength": 1 },
          "summary": { "type": "string" },
          "required": { "type": "boolean" },
          "content": {
            "oneOf": [
              {
                "type": "object",
                "required": ["kind"],
                "properties": {
                  "kind": { "const": "selection.fhir" },
                  "profiles": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
                  "profilesFrom": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1, "pattern": "^https?://\\S+$" } },
                  "resourceTypes": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }
                },
                "not": { "anyOf": [{ "required": ["questionnaireCanonical"] }, { "required": ["questionnaire"] }] },
                "additionalProperties": true
              },
              {
                "type": "object",
                "required": ["kind"],
                "anyOf": [{ "required": ["questionnaireCanonical"] }, { "required": ["questionnaire"] }],
                "not": { "anyOf": [{ "required": ["profiles"] }, { "required": ["profilesFrom"] }, { "required": ["resourceTypes"] }] },
                "properties": {
                  "kind": { "const": "form.fhir" },
                  "questionnaireCanonical": { "type": "string", "minLength": 1 },
                  "questionnaire": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "const": "Questionnaire" } }, "additionalProperties": true }
                },
                "additionalProperties": true
              },
              {
                "type": "object",
                "required": ["kind"],
                "properties": { "kind": { "type": "string", "minLength": 1, "not": { "enum": ["selection.fhir", "form.fhir"] } } },
                "additionalProperties": true
              }
            ]
          },
          "accept": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }
        },
        "additionalProperties": true
      }
    }
  },
  "additionalProperties": true
}
```

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
    "requestId": { "type": "string", "minLength": 1 },
    "artifacts": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "required": ["id", "mediaType", "fulfills", "value"],
            "properties": {
              "id": { "type": "string", "minLength": 1 },
              "mediaType": { "const": "application/smart-health-card" },
              "fulfills": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
              "value": {
                "type": "object",
                "required": ["verifiableCredential"],
                "properties": { "verifiableCredential": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } } },
                "additionalProperties": true
              }
            },
            "not": { "required": ["fhirVersion"] },
            "additionalProperties": true
          },
          {
            "type": "object",
            "required": ["id", "mediaType", "fulfills", "fhirVersion", "value"],
            "properties": {
              "id": { "type": "string", "minLength": 1 },
              "mediaType": { "const": "application/fhir+json" },
              "fulfills": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
              "fhirVersion": { "type": "string", "minLength": 1 },
              "value": { "type": "object", "required": ["resourceType"], "properties": { "resourceType": { "type": "string", "minLength": 1 } }, "additionalProperties": true }
            },
            "additionalProperties": true
          }
        ]
      }
    },
    "requestStatus": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["item", "status"],
        "properties": {
          "item": { "type": "string", "minLength": 1 },
          "status": { "enum": ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"] },
          "message": { "type": "string" }
        },
        "additionalProperties": true
      }
    }
  },
  "additionalProperties": true
}
```

## Appendix C. Same-device profile constraints

```text
smart-protocol-id        = "org-iso-mdoc"
smart-doc-type           = "org.smarthealthit.checkin.1"
smart-namespace          = "org.smarthealthit.checkin"
smart-response-element   = "smart_health_checkin_response"
smart-request-info-key   = "org.smarthealthit.checkin.request"
dcapi-label              = "dcapi"
```

```text
smart-items-request-bytes = #6.24(bstr .cbor smart-items-request)
smart-items-request = {
  "docType" => "org.smarthealthit.checkin.1",
  "nameSpaces" => { "org.smarthealthit.checkin" => { "smart_health_checkin_response" => bool } },
  "requestInfo" => { "org.smarthealthit.checkin.request" => smart-request-json-text, * tstr => any },
  * tstr => any
}
smart-request-json-text = tstr
reader-authentication-bytes = #6.24(bstr .cbor ["ReaderAuthentication", session-transcript-bytes, smart-items-request-bytes])
smart-encryption-info = ["dcapi", { "nonce" => bstr, "recipientPublicKey" => p256-recipient-public-key, * tstr => any }]
p256-recipient-public-key = { 1 => 2, -1 => 1, -2 => bstr, -3 => bstr, * int => any }
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
smart-dcapi-response = ["dcapi", { "enc" => bstr, "cipherText" => bstr, * tstr => any }]
smart-issuer-signed-item = { "digestID" => uint, "random" => bstr, "elementIdentifier" => "smart_health_checkin_response", "elementValue" => smart-response-json-text, * tstr => any }
smart-response-json-text = tstr
device-authentication-bytes = #6.24(bstr .cbor ["DeviceAuthentication", session-transcript-bytes, "org.smarthealthit.checkin.1", device-name-spaces-bytes])
```

These are profile constraints, not a full replacement for ISO/IEC 18013-5 CDDL. Section 8 controls on conflict. Exactness issues such as duplicate CBOR/JSON map keys, multiple matching documents/elements, deterministic CBOR map ordering, fixed digestID conventions, nonce-size constraints beyond fresh unpredictable bytes and the 16-byte recommendation, and full imported ISO CDDL belong to conformance-vector profiles unless made normative elsewhere.

## Appendix D. FHIR mapping summary

FHIR canonicals appear in `profiles[]`, `profilesFrom[]`, `form.fhir`, returned `QuestionnaireResponse.questionnaire`, and returned `Resource.meta.profile`. Section 5.5 controls: preserve exact wire strings when carrying, signing, encrypting, comparing bytes, logging, fixtures, returning QuestionnaireResponse.questionnaire, or returning meta.profile; parse into `(url, version?)` before resolution; resolve with resolver/package cache/FHIR search; verify `resourceType`, `url`, and version; direct HTTP dereference only unversioned canonicals; compare at same normalization level.

`profiles[]` maps to exact StructureDefinition canonical evidence in `meta.profile`, signed payload content, or trusted local evidence. `profilesFrom[]` maps to profile-family membership from implementation-guide/package/configured family knowledge or policy; resources do not usually declare family membership directly. `resourceTypes[]` filters by official FHIR `resourceType`. No-selector default requests any patient-specific FHIR resources the Wallet can offer and Holder chooses, not a full-record export command.

Raw FHIR Artifact `value` is either a single Resource or a Bundle. For selector validation, non-Bundle value is the single resource; Bundle value is evaluated through `Bundle.entry[].resource`; Bundle entries without `resource` provide no content; outer `Bundle` does not satisfy non-Bundle resource type requests; Bundle-level `meta.profile` does not substitute for entry profile evidence. `fhirVersion` applies to the whole Artifact and all Bundle entries; mixed release Bundles are rejected or quarantined.

For `form.fhir`, returned raw FHIR should be a `QuestionnaireResponse` or Bundle containing one. When `questionnaireCanonical` is supplied and is the identity answered, generated `QuestionnaireResponse.questionnaire` should preserve it exactly, including `|version`. If only inline Questionnaire is supplied, use inline `Questionnaire.url` plus `|Questionnaire.version` when known and intended; do not invent misleading canonicals. If canonical and inline disagree materially, use `unsupported` or `error` rather than silent merge.
