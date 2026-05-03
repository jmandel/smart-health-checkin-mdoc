# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

## 0. Front matter

Status: draft. Version: SMART Health Check-in 1.0. Suggested citation label: SHC-Checkin-1.0. Document id: `smart-health-checkin-1.0`.

**Editorial approach**: This candidate preserves testable protocol rules, wire constants, conformance targets, validation requirements, registries, Appendix A, Appendix B, and Appendix C while reducing tutorial material. Long worked examples, diagrams, fixture catalogs, byte ladders, implementation notes, FHIR mapping commentary, and historical material are treated as companion-repository material. Companion material can illustrate, test, or explain the specification, but it does not replace the normative rules here.

Companion: `https://github.com/jmandel/smart-health-checkin-mdoc`.

Publication metadata, contributors, governance, IPR, acknowledgments, and final license details will be supplied before publication. Sections 2 and 3 from longer explanatory drafts are folded into Section 1; normative Section numbers 4 through 9 remain stable for certification and implementation references.

## 1. Introduction

### 1.1 Scope and architecture

SMART Health Check-in 1.0 lets a Requester ask a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receive a structured SMART response. Version 1.0 has two normative layers: the transport-neutral clinical request/response JSON model in Sections 5 and 6, and the same-device direct `org-iso-mdoc` presentation flow over W3C Digital Credentials API in Sections 7 and 8.

The clinical layer defines request items, Holder-facing context, FHIR-native selectors, accepted response media types, returned Artifacts, fulfillment links, and per-item status. The presentation layer carries one SMART request to a same-device Wallet/Responder and returns one SMART response inside an encrypted mdoc `DeviceResponse`.

The authoritative handoff rule is: a deployment MAY use a QR code, NFC tap, deep link, desktop sign, kiosk screen, launch URL, pointer, relay, or other handoff to land the Holder on a same-device Verifier page that runs Section 8. The handoff URL format, pointer resolution, relay storage, response routing, submission service, completion display, and kiosk workflow are deployment-defined UX and are not SMART Health Check-in 1.0 conformance features or wire protocols.

Out of scope: credential issuance, Wallet synchronization, longitudinal storage, EHR write-back, patient matching, identity proofing, guardian policy, payments, eligibility adjudication, claims submission, payer contracting, general FHIR queries, SMART App Launch replacement, and universal production trust framework.

| Concern | Normative surface | Reader question |
| --- | --- | --- |
| Clinical request | Section 5 | What is requested; how are items, selectors, and media types represented? |
| Clinical response | Section 6 | What was returned; which items does it fulfill; what is each item outcome? |
| Trust framework | Section 7 | Which evidence proves origin, reader, issuer/device, or clinical-source properties? |
| Same-device presentation | Section 8, Appendix C | How are mdoc, CBOR, COSE, HPKE, and the stable response element encoded and validated? |
| Security/privacy/registries/i18n | Section 9 | What must not be logged, over-claimed, localized incorrectly, registered ambiguously, or downgraded? |
| Certification artifacts | Appendices A, B, C | Which rules, JSON shapes, and same-device byte boundaries should tests trace? |

### 1.2 Core Trust Rule

A component SHALL NOT treat a value, identifier, display string, handoff artifact, successful validation step, or credential from one layer as proof for another layer unless this specification or an explicit deployment profile defines that relationship and assurance level. In particular:

- SMART request fields, including `purpose`, item `title`, item `summary`, selectors, unknown members, and extension members, are not authenticated requester identity.
- QR codes, NFC tags, deep links, launch URLs, relays, kiosk screens, page buttons, and completion displays are deployment UX, not Holder consent and not version 1.0 wire protocols.
- Origin evidence, optional `readerAuth`, mdoc issuer signatures, MSO digest checks, device-key proof, HPKE opening, `requestId` matching, SMART response shape validation, SMART Health Card verification, and Holder action are distinct checks.
- Successful transport presentation does not by itself prove patient identity, downstream authorization, EHR write-back permission, clinical correctness, FHIR profile conformance, or clinical-source provenance for unsigned raw FHIR JSON.
- Raw `application/fhir+json` Artifacts are patient-mediated unless the payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof.

This Core Trust Rule controls all extensions and deployment profiles.

### 1.3 Conventions and terminology

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are interpreted as described in BCP 14, RFC 2119 and RFC 8174, when they appear in all capitals. A requirement for an optional feature applies only to implementations claiming that feature or deployment profiles making it mandatory.

JSON is RFC 8259 JSON; JSON examples in `json` fences are parseable JSON. CBOR uses RFC 8949 terms. CDDL uses RFC 8610 notation. COSE uses RFC 9052 and RFC 9053. HPKE uses RFC 9180. Base64url values are unpadded unless a field says otherwise. Hashing, signing, encryption, comparison, and HPKE inputs use the exact bytes identified by the relevant section.

Terms: **Requester** constructs requests and consumes responses. **Verifier** packages a request, invokes a presentation flow, validates presentation artifacts, extracts a SMART response, and applies Section 6.6. **Wallet/Responder** validates a request, applies Holder control and policy, constructs a response, and returns it. **Holder** controls disclosure. A **request item** is the unit of Holder review and status. An **Artifact** has `id`, `mediaType`, `fulfills[]`, and media-type-defined payload fields. A **FHIR canonical** can include `|version` where permitted. A **profile** is an exact FHIR `StructureDefinition` canonical in `profiles[]`; a **profile family** is a canonical in `profilesFrom[]`. **Profile-selector additivity** means `profiles[]` and `profilesFrom[]` broaden matches when both appear. **SMART request** and **SMART response** are the JSON objects in Sections 5 and 6. **Same-device presentation flow** is the Section 8 direct `org-iso-mdoc` flow. **In-person handoff** is deployment UX that lands the Holder on that flow.

## 4. Conformance

### 4.1 Targets and claims

A conformance claim SHALL identify implemented targets, claimed features or profiles, specification version, and any deployment profile. One product MAY implement multiple targets, but it SHALL satisfy each target and feature it claims.

- **Requester**: SHALL construct Section 5 requests and request only Artifact media types it can process for the item.
- **Verifier**: SHALL validate Section 6 responses against the original request using Section 6.6. If claiming direct same-device `org-iso-mdoc`, SHALL satisfy Section 8 Verifier requirements.
- **Wallet/Responder**: SHALL validate Section 5 requests before response construction, preserve request item ids for `fulfills[]` and `requestStatus[].item`, construct Section 6 responses, and set `requestId` to the accepted request `id`. If claiming direct same-device `org-iso-mdoc`, SHALL satisfy Section 8 Wallet/Responder requirements.
- **Deployment/profile author**: SHALL state constrained targets, required optional features, in-scope trust layers, and added validation, security, privacy, fixture, or policy expectations. It SHALL NOT redefine clinical semantics, selectors, Artifact media-type rules, fulfillment links, status codes, same-device carriers, trust-layer separation, or handoff UX.
- **Conformance-test or fixture author**: SHALL derive artifacts from normative requirements and identify target, feature, section, expected outcome, comparison mode, and demo trust status.

### 4.2 Core and optional features

The mandatory core is the transport-neutral request and response model in Sections 5 and 6. Direct same-device presentation in Sections 7 and 8 is the normative live presentation layer for implementations claiming live SMART Health Check-in 1.0 presentation. Request/response tooling, schema validation, fixture production, deployment-profile authoring, or handoff UX does not by itself claim live Section 8 support.

Core clinical support includes fixed request/response `type` values and `version: "1"`; request `id`; request items; Holder-facing display fields; `selection.fhir` and `form.fhir` shapes where requested or processed; flat `form.fhir` with `questionnaireCanonical` and/or `questionnaire`; `profilesFrom[]` as an array; additive `profiles[]` plus `profilesFrom[]`; canonical `|version` handling; per-item `accept[]`; Artifact `mediaType`; no `GenericArtifact`; `application/fhir+json` with `fhirVersion`; `application/smart-health-card` with `value.verifiableCredential[]` and no outer `fhirVersion`; exact `requestStatus[]` coverage; and Section 6.6 cross-validation.

Optional features include direct same-device `org-iso-mdoc`, optional `readerAuth`, deployment trust policies, registered extension selectors, extension Artifact media types, future status-code extensions, schema/CDDL/fixture profiles, and future presentation bindings. An implementation claiming an optional feature SHALL satisfy the referenced requirements. Demo or fixture keys, certificates, allow-lists, issuer strings, and audience strings MAY be used when clearly labeled; they SHALL NOT be represented as production trust unless deployment policy explicitly accepts them and states assurance.

### 4.3 Identifiers, versions, extensions, and checklist

| Identifier kind | Value |
| --- | --- |
| SMART request discriminator | `smart-health-checkin-request` |
| SMART response discriminator | `smart-health-checkin-response` |
| SMART request/response model version | `1` |
| Core selector kinds | `selection.fhir`, `form.fhir` |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` |
| Direct DC API protocol id | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| mdoc stable element | `smart_health_checkin_response` |
| SMART request carrier key | `org.smarthealthit.checkin.request` |

Provisional profile labels are `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and reserved `smart-health-checkin-oid4vp-reserved`. They are documentation/test-report labels, not in-band request fields. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, an "all of the above" shortcut, a topic label, or negotiation metadata to bypass selectors, `accept[]`, response validation, trust processing, or Section 8 validation.

Implementations SHALL compare version markers at the layer being processed: SMART request/response use `version: "1"`; same-device mdoc uses `DeviceRequest.version` and `DeviceResponse.version` `"1.0"` and `docType` `org.smarthealthit.checkin.1`; FHIR uses `fhirVersions[]`, Artifact `fhirVersion`, and canonical `|version`.

Extensions are explicit and additive. An extension SHALL NOT redefine core fields, selector kinds, Artifact media-type rules, fulfillment links, status codes, same-device carriers, or Section 7 trust separation. Selector, Artifact media-type, and status-code extensions SHALL define exact identifiers, shape, semantics, validation, unsupported behavior, security, privacy, and compatibility or examples as applicable. Status-code extensions SHALL NOT be used in version 1.0 responses unless explicitly supported by the receiving Verifier.

Appendix A is the certification checklist. Each row SHALL link to a stable requirement source and identify target, level, feature/profile, summary, and validation implication. Appendix A indexes requirements defined elsewhere; it SHALL NOT create independent obligations.

## 5. Clinical request model

### 5.1 Encoding and top-level object

A SMART request is an RFC 8259 JSON object. When serialized by a transport, the JSON text SHALL be UTF-8. A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or values outside the JSON model. A Wallet/Responder or Verifier SHALL reject a request whose top-level value is not a JSON object or whose representation cannot be parsed under the selected transport. Member names SHALL be unique; implementations SHOULD avoid parser configurations that silently apply first-wins or last-wins behavior.

Object member order has no clinical meaning. Array order matters only where defined: `fhirVersions[]` and `accept[]` are preference-ordered, and `items[]` is preferred display/workflow order. This model defines no numeric fields; identifiers, versions, booleans, arrays, media types, FHIR canonicals, and display strings SHALL NOT be encoded as JSON numbers.

Unknown members MAY be ignored at the top level, in items, and in known selectors when they do not change required-member meaning. Ignoring unknown members does not make malformed known members valid. A Requester SHALL NOT rely on unknown members to carry requester identity, override Holder control, change `accept[]`, change selector semantics, change `required`, or impose transport, trust, or consent behavior. Unknown `content.kind` values are extension selector kinds.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "request-123",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": []
}
```

A Requester SHALL include `type`, `version`, `id`, and `items`; MAY include `purpose` and `fhirVersions`. `type` SHALL be exactly `smart-health-checkin-request`; `version` SHALL be exactly `1`; Wallet/Responder SHALL reject absent or non-exact values unless a future compatibility rule applies. `id` SHALL be a non-empty opaque Requester-generated id unique among that Requester's requests for the same check-in session and SHOULD resist accidental collision and cross-session guessing. Wallet/Responder SHALL preserve `id` for response `requestId` and SHALL NOT infer identity, authorization, freshness, or clinical meaning from its syntax.

`purpose`, if present, SHALL be a string used only as Holder-facing workflow context. It SHALL NOT carry requester identity, organization name, origin, logo, URL, legal attestation, consent language, trust status, or authorization semantics. Wallet/Responder MAY display it but SHALL NOT treat it as authenticated identity or trust. `fhirVersions[]`, if present, SHALL be an array of strings ordered most to least preferred; Requesters accepting `application/fhir+json` SHOULD include at least one release unless they can process any conforming version. Wallets/Responders SHOULD use it when choosing raw FHIR JSON versions, subject to Holder decision, data, capability, media type, and policy. `items[]` SHALL be an array of request items and SHOULD contain at least one item; Wallets/Responders SHALL process it as Holder-review and response-accounting granularity and preserve item ids.

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body, including requester, clinic, payer, organization, staff, facility, logo, icon, brand, URL, callback, endpoint, domain, origin, package name, app id, certificate, signed-request, reader, Verifier, trust-framework, issuer, accreditation, legal-entity, pointer, relay, completion, encryption, nonce, handoff, or wrapper metadata. This applies to top level, items, selectors, and extension members. Wallet/Responder SHALL NOT treat any request body field as authenticated requester identity unless established outside the request body.

### 5.2 Request items

A request item is one unit of requested content or action. A Requester SHALL include `id`, `title`, `content`, and `accept`; MAY include `summary` and `required`.

`id` SHALL be a non-empty string unique within one request; Wallet/Responder SHALL reject missing, non-string, empty, or duplicate item ids. Comparisons SHALL use exact string equality. New ids SHOULD use ASCII letters, digits, `.`, `_`, `~`, and `-`, and SHOULD NOT contain patient ids, requester ids, secrets, tracking values, or clinical facts. `title` SHALL be non-empty Holder-facing text and SHALL NOT substitute for authenticated requester identity. `summary` MAY explain the item and SHOULD clarify broad selectors, profile-family requests, or questionnaire purpose; it SHALL NOT substitute for authenticated requester identity.

`required` MAY be boolean. Omitted `required` SHALL be interpreted as `false`. `required: true` is advisory only: not consent, authorization, a Wallet command, or a guarantee. Wallet/Responder SHALL NOT use it to bypass Holder control, Wallet policy, law, or consent UX and MAY return any valid non-fulfillment or partial status.

`accept[]` SHALL be a non-empty array of media type strings ordered most to least preferred. Requester SHALL NOT list a media type it cannot parse, validate, and route. Wallet/Responder MAY choose any listed type, SHOULD choose the earliest equivalent type it can produce, and SHALL NOT return an Artifact for an item unless the Artifact `mediaType` is accepted by that item or a supported compatibility rule applies.

`content` SHALL be a selector object with string `content.kind`. Version 1.0 defines `selection.fhir` and `form.fhir`. Unsupported kinds SHALL NOT be guessed from display text or unrelated fields; they yield rejection or `unsupported`.

### 5.3 Selectors

Selectors are not a general FHIR query language, patient-matching rule, authorization policy, or requester identity channel. A Requester SHALL use a core or registered extension selector. A Wallet/Responder SHALL evaluate selector semantics independently per item while allowing Section 6 many-to-many fulfillment.

`selection.fhir` requests existing patient-specific FHIR resources. A Requester SHALL set `kind` exactly to `selection.fhir` and MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination, or none. If present, each member SHALL be an array of strings. A `selection.fhir` selector SHALL NOT include `questionnaireCanonical` or `questionnaire`; use separate items when resource selection and form completion are both needed. Historical resource-array selector fields from earlier drafts are not version 1.0 selector fields.

`profiles[]` identifies exact FHIR `StructureDefinition` canonical URLs and MAY include `|version`. Wallet/Responder MAY match by `meta.profile` or equivalent local/trusted conformance evidence. `profilesFrom[]` SHALL be a non-empty array of canonical profile-family URL strings when present and SHALL NOT be a string, object, package descriptor, IG object, package id, package version, npm package name, registry alias, local topic vocabulary, or URN unless a future version/extension defines that value space. Wallet/Responder SHALL reject present non-array or empty/non-string shapes and MAY reject non-canonical-URL values by policy.

`resourceTypes[]` SHALL use official FHIR resource type names, not local topics such as `insurance` or `clinical-history`. With profile selectors, it is an additional resource-type constraint; without profile selectors, it requests patient-specific FHIR resources of listed types. `profiles[]` and `profilesFrom[]` are additive: a resource satisfies the profile portion if it matches any exact profile or any profile in any listed family, subject to `resourceTypes[]` and the item definition. Requesters SHALL NOT rely on `profiles[]` to narrow `profilesFrom[]`; Wallets/Responders SHALL NOT interpret it as narrowing.

If `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and Holder chooses to share, constrained by `accept[]`, `fhirVersions[]`, capability, policy, and Holder decision. Requesters SHOULD avoid this no-selector default unless broad sharing is safe and clearly explained. Wallets/Responders MAY fulfill partially and are not required to disclose all resources.

`form.fhir` requests completion of, or response to, a FHIR Questionnaire. Requester SHALL set `content.kind` exactly to `form.fhir` and SHALL include `questionnaireCanonical`, `questionnaire`, or both as direct selector members. `questionnaireCanonical`, if present, SHALL be a non-empty FHIR canonical string and MAY include `|version`. `questionnaire`, if present, SHALL be an inline FHIR `Questionnaire` resource object with `resourceType` `Questionnaire`. A `form.fhir` selector SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. Historical questionnaire selector aliases from earlier drafts are not version 1.0 selector kinds.

Wallet/Responder SHALL reject or report `unsupported` for `form.fhir` selectors with neither form field, non-string or empty `questionnaireCanonical`, non-Questionnaire `questionnaire`, or mixed `selection.fhir` fields. It MAY resolve a canonical using configured resolver, FHIR search, cache, Holder data source, or another mechanism satisfying Section 5.4; direct HTTP dereference is permitted only for unversioned canonicals. If it cannot resolve, render, or use the Questionnaire, it SHALL report status rather than fabricate one. When both canonical and inline resource are supplied, Wallet/Responder SHALL NOT silently merge conflicting definitions or rewrite canonical identity. Material disagreement SHOULD yield `unsupported` or `error`.

Extension selector registrants SHALL define exact kind string, JSON shape, required/optional members, clinical meaning, satisfaction rules, interactions with `accept[]`, `fhirVersions[]`, canonicals, item status, fulfillment, unsupported/unavailable/partial/error behavior, unknown-member handling, privacy, security, and examples. They SHALL NOT redefine core fields, selectors, Holder control, requester-identity handling, canonical-version handling, or trust boundaries.

### 5.4 FHIR canonical `|version` handling and media types

Implementations processing FHIR canonicals SHALL parse them into non-empty `url` plus optional `version`: `url` is before the first `|`, or the whole string; `version`, when present, is after the first `|`, with later `|` characters part of the opaque version. Original wire strings SHALL be preserved exactly for echoing, logging, response construction, fixtures, returned `Resource.meta.profile`, and generated `QuestionnaireResponse.questionnaire` when that canonical is the Questionnaire identity. Internal parsing SHALL NOT rewrite carried or emitted canonicals.

Resolvers SHALL consume `(url, version)` or `url`. FHIR endpoint resolution SHALL use canonical search (`url` plus `version` when versioned), select one matching resource, and fail when none matches. Direct HTTP dereference of parsed `url` is permitted only for unversioned canonicals, only when the recipient accepts the served version, and only after returned-resource verification. A Wallet/Responder or Verifier SHALL NOT satisfy a versioned canonical by stripping `|version` and dereferencing the bare URL. After resolution, expected `resourceType`, `url`, and requested `version` SHALL be verified; mismatch yields `unsupported` or `error`.

For versioned `profiles[]`, Wallet/Responder SHALL NOT report `fulfilled` unless `meta.profile` includes the same versioned canonical or equivalent local evidence for that exact version exists. Verifier exact checks SHALL apply the same comparison. For unversioned `profiles[]`, resources known to conform to any supported version of the base canonical MAY match. Routing, broad classification, family lookup, de-duplication, and display grouping MAY strip or ignore `|version` only locally; this SHALL NOT affect resolution, exact-version matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation.

Each item SHALL include non-empty ordered `accept[]`. Version 1.0 core media types are `application/fhir+json` and `application/smart-health-card`. `application/fhir+json` means raw FHIR JSON and requires response `fhirVersion`; for form items it normally means `QuestionnaireResponse`. `application/smart-health-card` means SMART Health Card file JSON with `value.verifiableCredential[]`; signed payloads carry FHIR-version semantics. Extension media types require registered or deployment-profile definitions, including Artifact shape, validation, security, privacy, FHIR-version handling, and compatibility.

## 6. Clinical response model

### 6.1 Top-level response and Artifacts

A `SmartHealthCheckinResponse` has this shape:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "request-123",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include all five fields. `type` SHALL be exactly `smart-health-checkin-response`; `version` SHALL be exactly `1`; Verifier SHALL reject absent or non-exact values unless a future compatibility rule applies. `requestId` SHALL exactly equal the accepted request `id`; Verifier SHALL compare by exact string equality and reject mismatch. `requestId` is correlation, not identity, freshness, authorization, or clinical fact.

`artifacts[]` SHALL be an array and MAY be empty if status still accounts for every item. Each Artifact SHALL include non-empty `id`, non-empty `mediaType`, non-empty `fulfills[]`, and media-type-defined payload fields. Artifact ids SHALL be unique within one response; Verifier SHALL reject missing, non-string, empty, or duplicate ids. Artifact ids are not patient ids, requester ids, global document ids, or provenance ids unless payload or policy establishes that meaning.

`mediaType` declares clinical response form. Version 1.0 core Artifacts are `application/fhir+json` and `application/smart-health-card`; extension Artifacts require registered/profied branded variants. A Verifier SHALL NOT treat unknown `mediaType` values as generic Artifacts merely because fields such as `value`, `url`, or `data` are present.

`fulfills[]` SHALL contain request item ids exactly matching original `items[].id`. A Wallet/Responder MAY list multiple items when one Artifact satisfies them all, but the Artifact `mediaType` SHALL be acceptable for every listed item. Verifier SHALL reject unresolved, absent, empty, non-array, non-string, or unknown references. Field names alone do not define dereferencing, decoding, signature, freshness, integrity, retention, or expiration rules.

### 6.2 Core Artifact variants

`application/smart-health-card` Artifacts SHALL set that `mediaType` and include `value.verifiableCredential` as a non-empty array of SMART Health Card Verifiable Credential JWS strings. Verifiers or receivers SHALL verify and process each JWS according to SMART Health Cards and local trust policy. Wallets/Responders SHALL NOT include an outer Artifact-level `fhirVersion`; Verifiers SHALL reject one if present. FHIR version and issuer semantics are inside signed credential payloads.

`application/fhir+json` Artifacts SHALL set that `mediaType`, include non-empty `fhirVersion`, and include `value` as a FHIR JSON object. `value` SHALL be a single FHIR Resource object with string `resourceType` or a FHIR Bundle with `resourceType` `Bundle` and `entry[]` resources for multiple resources. Wallets/Responders SHOULD use a Bundle for multiple resources and MAY return a single resource directly. All resources in one raw FHIR Artifact SHALL be interpreted under the Artifact `fhirVersion`; resources requiring different FHIR releases SHALL NOT be mixed in one Artifact. Wallets/Responders SHOULD use requested `fhirVersions[]` when possible. Verifiers SHALL reject absent/non-string `fhirVersion`, SHOULD treat unacceptable FHIR releases as unsupported for ingestion, and SHALL reject or quarantine detected mixed-release Bundles.

Wallets/Responders SHALL preserve FHIR `meta.profile` strings, including `|version` suffixes, and SHALL NOT strip or normalize them. Raw FHIR JSON is patient-mediated unless separate accepted provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present.

Extension Artifact registrants SHALL define exact media type or bounded pattern, branded variant name, typed payload fields, payload shape, encoding, dereferencing and integrity rules, FHIR-version handling if any, status behavior, validation, security, privacy, and compatibility. They SHALL NOT define an unbounded catch-all or rely on generic `value`/`url`/`data` semantics.

### 6.3 Status and many-to-many fulfillment

`requestStatus[]` SHALL contain exactly one status entry for every original request item and no unknown or duplicate item ids. Verifier SHALL reject a response unless this exact coverage holds. Each status entry has `item`, `status`, and optional `message`. `item` SHALL exactly equal one request item id.

Version 1.0 status codes are `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`. Wallet/Responder SHALL use only these unless a future registered extension is supported by the receiver. Unknown status codes are invalid for version 1.0 Verifiers unless explicitly supported.

- Use `fulfilled` only when the Wallet/Responder believes the item is fully satisfied.
- Use `partial` when responsive content is returned but complete fulfillment is not claimed.
- Use `unavailable` when the item is understood and supported but no matching shareable content is available, without Holder refusal as the relevant cause.
- Use `declined` when non-fulfillment is the Holder's decision or Wallet policy implementing Holder preference.
- Use `unsupported` when selector kind, shape, media type, FHIR version, Questionnaire definition, or extension semantics cannot be processed.
- Use `error` when processing failure prevents normal classification.

`message` MAY provide concise explanation. Wallet/Responder SHALL NOT include secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data. Receivers SHALL NOT use `message` to determine machine status semantics.

One Artifact MAY fulfill many items, and one item MAY be fulfilled by many Artifacts. Every fulfillment edge SHALL satisfy media-type, selector, FHIR-version, status, and validation rules. The Wallet/Responder SHALL still include exactly one status entry per item. A Verifier SHALL evaluate all Artifacts listing an item and SHALL NOT treat multiple Artifacts as a protocol error.

### 6.4 Verifier cross-validation

Before Requester or downstream use, a Verifier SHALL validate the SMART response against the original SMART request. Shape validation alone is insufficient. The Verifier SHALL reject unless `requestId` exactly matches; every `fulfills[]` value resolves; every Artifact `mediaType` is recognized and accepted by every fulfilled item or a supported compatibility rule applies; `requestStatus[]` covers every item exactly once; raw FHIR `fhirVersion` and FHIR object shape are valid; SMART Health Card Artifacts lack outer `fhirVersion`; and Section 6.2 media-type-specific rules pass.

For raw FHIR selector responsiveness, Verifiers SHOULD inspect `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related FHIR content. Wallet/Responder SHALL NOT report `fulfilled` for a versioned profile request unless exact versioned `meta.profile` or equivalent exact-version evidence exists; Verifier SHALL require the same evidence. Verifier SHALL preserve returned `meta.profile` strings exactly and SHALL NOT strip `|version` to satisfy exact-version requests.

A response can be protocol-valid while still declined, partial, unsupported, unsuitable for local ingestion, or insufficient under clinical policy.

## 7. Trust framework

A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator SHALL NOT treat one trust layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and assurance level.

**Origin trust.** Origin trust is authenticated Browser/User Agent, Credential Manager, platform, or deployment-approved privileged-caller evidence. A Requester SHALL NOT put requester identity metadata in the SMART request body to substitute for origin. A Wallet/Responder SHALL NOT treat request text, selector values, unknown members, extension members, or Artifacts as authenticated origin or identity. When origin is exposed, a Wallet/Responder using origin trust SHALL use platform-provided origin for display, policy, and Section 8 binding; it SHALL NOT derive origin from the SMART request or handoff metadata. If origin cannot be authenticated, it SHALL treat origin trust as absent and SHALL NOT substitute request text. Development allow-lists and demo caller evidence SHALL NOT be production trust unless deployment policy explicitly accepts them.

**Reader / Verifier trust.** A Verifier MAY include per-`DocRequest.readerAuth` as a detached `COSE_Sign1` over `ReaderAuthentication`, bound to the same Section 8 `SessionTranscript` and exact `ItemsRequest` bytes. It SHALL NOT reuse `readerAuth` across sessions, transcripts, origins, encryption information, serializations, or requested element sets. A Wallet/Responder supporting or relying on reader authentication SHALL verify signature, signed context, detached-payload binding, exact bytes, protected algorithm and key type, certificate or public-key evidence, and trust policy. It SHALL treat invalid, malformed, mismatched, unsupported, or policy-unacceptable values as failed reader authentication and SHALL NOT treat mere presence of `readerAuth`, certificates, names, logos, `kid`, URLs, or demo certs as trust. Absent `readerAuth` is absent reader authentication; invalid/untrusted `readerAuth` is failed authentication, and those states SHALL be distinguished for policy.

**Issuer / device trust.** A Verifier SHALL apply Section 8 mdoc issuer, digest, device-key, encryption, transcript, and response-extraction checks before relying on mdoc evidence, and SHALL then apply Section 6.6. When issuer trust is required, a Verifier or deployment profile SHALL define trust-anchor policy. A Verifier relying on issuer evidence SHALL validate issuer signature, certificate path or equivalent key evidence, digest bindings, document type, namespace, disclosed element identifiers, and validity constraints. It SHALL NOT treat syntactic validity, matching digest, valid signature against an included leaf, or self-signed certificate as production issuer trust unless policy accepts the evidence. Device-key proof SHALL be verified against the same session transcript before the presentation is device-bound. A Verifier SHALL NOT accept an extracted SMART response as transport-valid if device proof fails, the proof is not session-bound, or the disclosed element fails digest validation. Self-attested Wallet evidence MAY be accepted only under deployment policy stating assurance; it does not relax any validation rule.

**Clinical-source trust.** A Verifier or receiver SHALL evaluate source trust from Artifact `mediaType`, payload signatures/provenance, selectors, FHIR evidence, SMART Health Card rules, extension rules, and deployment policy. SMART Health Card Artifacts require verification of each JWS before relying on signed content or issuer claims. Raw FHIR JSON SHALL be treated as patient-mediated unless separate accepted provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present. Wallets/Responders SHALL NOT use transport encryption, mdoc signatures, device proof, `readerAuth`, origin evidence, request text, Artifact ids, `fulfills[]`, initiation fields, or successful response validation to claim unsigned raw FHIR is an issuer-signed clinical credential.

**Identifier scope.** Request ids, item ids, Artifact ids, origins, certificate subjects, key ids, `docType`, namespaces, element identifiers, transcript components, nonces, URL tokens, relay ids, and completion ids have layer-specific scopes. Implementations SHALL preserve those scopes and SHALL NOT use an identifier from one layer as proof, authorization, or replacement for another layer's required id or accounting.

**Deployment policy.** A deployment profile that adds trust requirements SHALL document constrained roles; constrained layers; accepted anchors, registries, allow-lists, certificate policies, issuer policies, source-provenance mechanisms, and assurance labels; freshness, revocation, expiration, replay, and status expectations; Wallet behavior on missing or failed evidence; Verifier/Requester/receiver behavior when downstream policy is not met; and Holder display rules. It SHALL state mandatory trust layers and assurance for absent/failed layers. It SHALL NOT redefine SMART clinical semantics but MAY require stricter validation, narrower media types, stronger provenance, additional display, stronger anchors, or rejection of optional modes.

## 8. Same-device presentation flow over `org-iso-mdoc`

This is the only normative SMART Health Check-in 1.0 presentation flow. It carries a Section 5 SMART request through W3C Digital Credentials API direct `org-iso-mdoc` and returns a Section 6 SMART response in an HPKE-encrypted mdoc `DeviceResponse`. Appendix C restates the same byte-boundary constraints for conformance tooling.

### 8.1 Fixed identifiers

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested/disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

Verifier SHALL use these values exactly. The SMART request SHALL be carried only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`; it is not a CBOR map and not base64url-encoded JSON. Wallet/Responder SHALL NOT treat dynamic element names, archived experiments, initiation wrappers, or other locations as the request carrier. Wallet/Responder SHALL carry the SMART response only as `elementValue` of issuer-signed element `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`.

### 8.2 Request construction and transcript

The core `ItemsRequest` logical shape is:

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": { "org.smarthealthit.checkin": { "smart_health_checkin_response": true } },
  "requestInfo": { "org.smarthealthit.checkin.request": JSON.stringify(SmartHealthCheckinRequest) }
}
```

The boolean is mdoc `intentToRetain`. Verifier SHALL default it to `true`; MAY set it `false` only for genuine ephemeral use permitted by policy. It does not override Holder choice, Wallet policy, law, privacy requirements, or downstream retention. Verifier SHALL NOT model FHIR profiles, request items, Questionnaires, media types, status codes, or resources as separate mdoc elements.

Verifier SHALL set `ItemsRequestBytes = tag24(CBOR(ItemsRequest))`, place it in `DocRequest.itemsRequest`, and construct `DeviceRequest.version` exactly `"1.0"` with a `docRequests` array. Version 1.0 uses optional per-`DocRequest.readerAuth`; Verifier SHALL NOT use `DeviceRequest` `"1.1"` `readerAuthAll` as the core v1.0 mechanism unless a future version/profile defines it.

If present, `readerAuth` SHALL be detached `COSE_Sign1` using ES256 (`alg` `-7`) over `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))`. Protected header SHALL include `{1: -7}`; serialized payload SHALL be `null`; external AAD SHALL be empty; detached payload SHALL be `ReaderAuthenticationBytes`; COSE header label `33` (`x5chain`) SHALL carry at least the leaf reader certificate. It SHALL bind exact `SessionTranscript` and exact `ItemsRequestBytes` and SHALL NOT be reused.

For each request, Verifier SHALL generate or select an HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256), SHOULD use a fresh pair, and SHALL include a P-256 EC2 COSE_Key with labels `1: 2`, `-1: 1`, `-2`, and `-3`. Verifier SHALL construct CBOR `encryptionInfo = ["dcapi", {"nonce": <fresh unpredictable bytes>, "recipientPublicKey": <P-256 COSE_Key>}]`; nonce entropy SHOULD be at least 16 bytes. Verifier SHALL base64url-encode CBOR `DeviceRequest` and `encryptionInfo` without padding, retain the private key and exact `encryptionInfo` bytes, and preserve the exact `encryptionInfo` base64url string.

Both sides SHALL compute identical direct `dcapi` transcript bytes:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact unpadded request string. `origin` is authenticated origin or deployment-approved origin-equivalent from Browser/User Agent or platform. Wallet/Responder SHALL NOT derive it from request JSON, display text, selector URLs, ids, initiation metadata, callback-looking strings, or Artifacts. Verifier SHALL use the same origin for `readerAuth`, HPKE `info`, and device authentication inputs. Wallet/Responder SHALL use the same transcript for `readerAuth`, `DeviceAuthentication`, and HPKE encryption; Verifier SHALL use it for HPKE opening and device-signature verification.

### 8.3 Wallet request handling and response construction

Wallet/Responder SHALL validate protocol `org-iso-mdoc`; unpadded base64url `data.deviceRequest`; CBOR `DeviceRequest.version` `"1.0"`; tag-24 `ItemsRequest` and exact bytes; `ItemsRequest.docType` `org.smarthealthit.checkin.1`; namespace request for `smart_health_checkin_response`; `intentToRetain`; requestInfo string at `org.smarthealthit.checkin.request`; parsed Section 5 SMART request; unpadded base64url `data.encryptionInfo`; direct `"dcapi"` envelope; P-256 recipient public key; and Section 8.2 transcript. If SMART request JSON is absent, not a string, unparsable, not an object, or invalid, Wallet/Responder SHALL reject, report platform failure, or fail safely and SHALL NOT infer clinical semantics from other fields.

If `readerAuth` is present and Wallet/Responder supports or relies on it, Wallet/Responder SHALL verify detached `COSE_Sign1`, protected algorithm, `ReaderAuthenticationBytes`, transcript, exact tag-24 `ItemsRequestBytes`, signature, `x5chain`, and trust policy, distinguishing absent, syntactically invalid, cryptographically failed, valid-untrusted, and trusted states.

After validation and trust processing, Wallet/Responder SHALL run Holder review or equivalent Holder-control processing at item granularity, preserve item ids, and not treat `required: true` or request display fields as consent or authenticated identity.

Wallet/Responder SHALL construct a Section 6 SMART response, serialize it as UTF-8 JSON text, and create a tag-24-wrapped `IssuerSignedItem` with `digestID`, `random`, `elementIdentifier: "smart_health_checkin_response"`, and `elementValue` equal to the JSON response string. It SHALL place the tagged item in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`, compute the MSO value digest over the complete tagged item, and ensure `digestID` matches the corresponding MSO `valueDigests` key.

Wallet/Responder SHALL construct an MSO with `docType` `org.smarthealthit.checkin.1`, `digestAlgorithm` `SHA-256`, value digest covering the stable item, and `deviceKeyInfo.deviceKey`; sign it as `issuerAuth` using `COSE_Sign1` ES256 (`alg` `-7`); construct `DeviceAuthenticationBytes = tag24(CBOR(["DeviceAuthentication", SessionTranscript, "org.smarthealthit.checkin.1", tag24(CBOR(DeviceNameSpaces))]))`; and produce device `COSE_Sign1` with ES256 and the matching device private key. Core `DeviceNameSpaces` is normally empty unless profile-defined; the SMART response remains issuer-signed and SHALL NOT be moved into `DeviceNameSpaces` as a substitute carrier.

Wallet/Responder SHALL construct `DeviceResponse.version` `"1.0"` with successful status `0`, the SMART document, `issuerSigned`, and `deviceSigned`. It SHALL encrypt CBOR `DeviceResponse` using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty `aad`. It SHALL wrap output as CBOR `["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`, base64url-encode without padding, and return `{"protocol":"org-iso-mdoc","data":{"response":"..."}}`. It SHALL NOT return plaintext `DeviceResponse`, plaintext SMART response JSON, another carrier, non-empty AAD, or another HPKE suite.

### 8.4 Verifier response processing

Verifier SHALL require returned protocol `org-iso-mdoc`; unpadded base64url `data.response`; CBOR `dcapiResponse` with direct shape `["dcapi", {"enc": bstr, "cipherText": bstr}]`; expected transcript; HPKE-open with retained private key, required suite, `info = SessionTranscript`, and empty `aad`; CBOR `DeviceResponse.version` `"1.0"` and success; document `docType` `org.smarthealthit.checkin.1`; valid `issuerAuth`, MSO, MSO `docType`, validity, device key, issuer signature, and policy; namespace `org.smarthealthit.checkin` item `smart_health_checkin_response`; digest over exact tag-24 item bytes matching MSO value digest; valid device signature over expected `DeviceAuthentication`; string `elementValue`; valid Section 6 SMART response; and Section 6.6 cross-validation against the original request.

Verifier SHALL reject or quarantine if HPKE opening, mdoc issuer/MSO validation, value digest, device authentication, stable-element extraction, SMART response validation, or Section 6.6 fails. Companion byte ladders must derive from this section and Appendix C and must not introduce alternate carriers or clinical semantics.

## 9. Security, privacy, registries, and internationalization

### 9.1 Security

Security checks are layered. A component SHALL NOT describe one successful control as proof that another succeeded unless this specification or deployment policy defines that assurance. Version 1.0 does not standardize pointer URLs, relays, response-submission protocols, or cross-device wrappers.

For Section 8, Wallet/Responder encrypts CBOR `DeviceResponse` with HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. Verifier MUST NOT accept plaintext `DeviceResponse`, plaintext SMART response JSON, substituted HPKE suite, or ciphertext not bound to the expected transcript. Implementations SHALL reject downgrades, substituted contexts, unsupported algorithm labels, and unexpected COSE/HPKE labels; decryption alone is not clinical validation.

Freshness comes from the Section 8 nonce, retained HPKE key material, exact `encryptionInfo` base64url string, authenticated origin or origin-equivalent, transcript, optional transcript-bound `readerAuth`, and transcript-bound device authentication. Request ids, `requestId`, item ids, Artifact ids, and handoff ids are correlation values, not freshness proofs. Verifiers SHOULD use fresh HPKE recipient keys and workflow state to reject stale, duplicate, mismatched, or superseded responses.

Origin evidence comes from authenticated platform channels, not request JSON, launch URLs, display text, selector URLs, package-looking strings, logos, names, unknown members, or Artifacts. Wallet/Responder using origin trust SHALL use platform-provided origin or approved origin-equivalent for transcript and display; absent origin evidence remains absent. Scanning a code, tapping NFC, opening a page, or clicking a page button is not Holder consent.

Wallets/Responders relying on reader authentication SHALL verify signature, detached payload, algorithm, key and certificate evidence, transcript, exact `ItemsRequest`, and policy; they SHALL distinguish absent, malformed, failed, valid-untrusted, and trusted states. Mere presence of `readerAuth`, `x5chain`, names, logos, `kid`, URLs, or demo certificates is not trust.

Verifiers SHALL complete Section 8 mdoc validation and Section 7 issuer/device policy before claiming production issuer trust. MSO syntax, digest, included-certificate signature, device proof, HPKE opening, origin binding, `readerAuth`, or `requestId` match does not by itself prove production accreditation, patient matching, clinical correctness, provenance, downstream authorization, or EHR write-back permission.

Implementations SHOULD minimize collection, display, and retention of plaintext requests, responses, raw FHIR, SMART Health Cards, Questionnaire answers, `DeviceResponse` plaintext, `dcapiResponse` internals, HPKE values, request-opening material, Wallet secrets, private keys, access tokens, bearer URLs, launch URLs, QR images, and validation clues except under controlled diagnostics or fixtures. Live PHI, production keys, bearer credentials, or unredacted clinical content in support bundles or telemetry are sensitive production data or a security incident.

Wallet/Responder SHALL validate incoming Section 8 requests, recover SMART requests only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, compute transcript from authenticated origin or approved origin-equivalent, classify reader authentication accurately, preserve item ids, construct exact `requestStatus[]` coverage, and perform Holder review or equivalent Holder-control at item granularity before disclosure unless a deployment profile defines another mechanism.

### 9.2 Privacy

Requesters SHOULD request the minimum content needed for the bounded workflow. Selectors, purpose, item text, profile URLs, resource types, Questionnaires, media types, and FHIR version lists can disclose sensitive context. Wallets/Responders SHALL preserve item ids and provide Holder review or equivalent Holder-control at item granularity before disclosure. They MAY group, summarize, reorder, translate, or suppress details for accessibility, safety, localization, or policy, but SHALL NOT hide multiple items, broad selectors, accepted response forms, retention signals, or advisory `required` flags in a way that defeats meaningful control. `required: true`, `intentToRetain`, launch URLs, QR scans, NFC taps, page loads, and page buttons are not consent.

Wallets/Responders SHOULD return only Artifacts satisfying approved items, Holder choices, Wallet policy, available data, and accepted media types. The same-device binding carries one stable mdoc element containing the whole SMART response; mdoc element selection alone does not minimize disclosure inside it. Receivers should not use mdoc evidence, HPKE opening, Artifact ids, `fulfills[]`, `requestId`, or Holder approval to imply clinical-source provenance for unsigned raw FHIR JSON.

Implementations SHOULD avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and SHOULD NOT embed patient identifiers, staff identifiers, source document ids, predictable sequences, secrets, or clinical facts in ids, telemetry ids, messages, URLs, or locators unless policy requires and protects them. Wallet displays MAY show request fields as context but SHALL NOT label them as verified identity, origin, reader trust, clinical provenance, legal authority, or consent unless established by a trust layer.

Section 8 `intentToRetain` defaults to `true`. Verifier MAY set it `false` only for genuine ephemeral use permitted by policy. Retention policy SHOULD cover metadata as well as plaintext. Sensitive categories require narrower requests where possible, Wallet policy, Holder preferences, legal restrictions, redaction, warnings, or valid item-level refusal/status. Telemetry SHOULD be minimized and SHOULD NOT include plaintext payloads, clinical content, private keys, bearer URLs, full ciphertext blobs, QR images, or unredacted sensitive stack traces except under controlled diagnostic, fixture, audit, or incident procedures.

### 9.3 Registries

Media types and protocol identifiers use exact, case-sensitive string comparison unless a future registered extension defines otherwise. `application/fhir+json` requires outer `fhirVersion`; `application/smart-health-card` uses `value.verifiableCredential[]` and no outer `fhirVersion`. Wallet/Responder SHALL NOT claim fulfillment unless Artifact `mediaType` appears in the fulfilled item's `accept[]`, except for a supported compatibility rule. Future media-type registrations SHALL define exact string, payload shape, carriers, encoding, integrity/dereferencing, FHIR-version semantics, validation, status interaction, security, privacy, and compatibility; they SHALL NOT create a generic catch-all branch or redefine core semantics.

The mdoc/DC API identifiers `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request` SHALL be used exactly by implementations claiming the profile. External registration may be needed, but this draft does not assert completion.

Version 1.0 status codes are `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`. Wallet/Responder SHALL use only these unless a future extension is explicitly supported by the receiver; Verifier SHALL treat unknown codes as invalid unless explicitly supported. Future status-code registrations SHALL NOT redefine core codes or exact status coverage.

Version 1.0 selector kinds are `selection.fhir` and `form.fhir`. Requester SHALL use a core or registered selector for interoperable processing. Wallet/Responder that does not support a kind SHALL NOT infer semantics from display text, profile labels, local topics, deployment metadata, or requester identity; it SHALL reject or report `unsupported`. Future selector registrations SHALL NOT redefine core fields or trust boundaries.

Profile identifiers are not request fields, response fields, selectors, media types, status codes, presets, IPS shortcuts, or substitutes for Section 5 selectors. Registrations SHOULD use designated expert review. The expert SHOULD approve only entries preserving Sections 5 and 6 semantics, validation behavior, core selectors, trust separation, version 1 same-device identifiers, HPKE transcript binding, unsupported-recipient safety, security/privacy proportionality, and fixture guidance; and SHOULD reject entries that introduce requester identity into requests, rely on presets/topics instead of selectors, require intermediaries to see plaintext clinical content, weaken Holder control, conflate identifiers, treat demo keys as production trust, or overclaim provenance for unsigned raw FHIR JSON.

### 9.4 Internationalization

Internationalization applies to human-readable text such as `purpose`, item `title`, item `summary`, status `message`, Questionnaire text, FHIR display strings, generated UI text, and extension display fields. Protocol identifiers and machine values are not localized. SMART Health Check-in 1.0 defines no core `lang`, `locale`, `Accept-Language`, language maps, negotiated-locale members, or locale parameters. Implementations SHALL NOT rely on unknown members, browser language, launch URL parameters, or HTTP headers as interoperable locale-negotiation signals unless a future version, extension, or profile defines that behavior.

Producers SHOULD use well-formed BCP 47 tags when language tags are associated by FHIR, extension, deployment profile, or UI. FHIR content follows FHIR internationalization rules. Wallets/Responders MAY translate, summarize, group, reorder, or suppress display, but SHALL preserve protocol values used for construction and validation. Receivers SHALL NOT rely on localized `message` text to determine status semantics.

Producers of new display text SHOULD emit Unicode NFC. Normalization is not an identifier-matching rule: implementations SHALL NOT apply Unicode normalization, case folding, accent folding, width folding, confusable mapping, BIDI reordering, transliteration, translation, or locale collation to make distinct protocol identifiers or constants compare equal. Display normalization SHALL NOT change bytes/code points used for signatures, hashes, encryption, HPKE/HKDF inputs, COSE signing inputs, mdoc digest checks, SMART Health Card verification, canonical preservation, audit records, or byte-exact fixtures. UIs SHOULD isolate untrusted display text for BIDI safety. Locale metadata can be sensitive and SHOULD be minimized.

## Appendix A. Conformance checklist

This checklist indexes testable obligations defined elsewhere in SMART Health Check-in 1.0. It does not create independent requirements. Rows for optional features, optional targets, or optional deployment constraints apply only to implementations claiming that feature, target, profile, or deployment constraint, even when the source section uses `SHALL` or `SHOULD` for that claimed feature.

| ID | Target | Level | Section | Checklist item | Evidence/validation |
| --- | --- | --- | --- | --- | --- |
| A-001 | Requester / Verifier | SHALL | Section 4.1.1 | Identify each claimed target, feature/profile, specification version, and deployment profile. | Claim lists target, optional features, version, and policy dependencies. |
| A-002 | Holder Wallet / Responder | SHALL | Section 4.1.2 | Validate SMART requests under Section 5 before response construction and preserve item ids for `fulfills[]` and `requestStatus[].item`. | Malformed requests fail safely; valid responses reference original item ids exactly. |
| A-003 | Deployment/profile author | SHALL | Section 4.1.3 | State constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations without redefining core semantics. | Profile maps added rules to targets and sections; no base semantic override. |
| A-004 | Conformance/fixture author | SHALL | Section 4.1.3 | Derive tests and fixtures from normative sections and identify target, feature set, section, expected outcome, comparison mode, and demo trust status. | Fixture/test manifest records pass/fail criteria, comparison mode, PHI/test-key status. |
| A-005 | Requester / Verifier | SHALL | Section 5.1 | Encode SMART requests as RFC 8259 JSON and UTF-8 when serialized by a transport. | Parser/serializer tests reject invalid UTF-8, comments, trailing commas, non-JSON values, and non-object roots. |
| A-006 | Holder Wallet / Responder | SHALL | Section 5.1.1 | Reject unparsable or non-object SMART requests under the selected transport encoding rules. | Negative corpus includes arrays, strings, null roots, malformed JSON, and encoding errors. |
| A-007 | Holder Wallet / Responder | SHALL | Section 5.1.2 | Reject duplicate object member names detected during SMART request parsing or validation. | Duplicate-key fixture is rejected rather than accepted by first/last-wins behavior. |
| A-008 | Requester / Verifier | SHALL | Section 5.2 | Include request `type`, `version`, `id`, and `items`; set `type` to `smart-health-checkin-request` and `version` to `1`. | Schema/procedural validation verifies required top-level members and constants. |
| A-009 | Holder Wallet / Responder | SHALL | Section 5.2.1 | Reject requests whose `type` is absent or not exactly `smart-health-checkin-request`. | Case-sensitive discriminator mutation tests fail. |
| A-010 | Holder Wallet / Responder | SHALL | Section 5.2.2 | Reject requests whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-011 | Requester / Verifier | SHALL | Section 5.2.3 | Generate a non-empty opaque request `id` unique among that Requester's requests for the same check-in session. | Construction tests check non-empty session-local ids and no patient/requester meaning. |
| A-012 | Holder Wallet / Responder | SHALL | Section 5.2.3 | Preserve request `id` for later `SmartHealthCheckinResponse.requestId` construction. | Response construction asserts exact string equality to original request id. |
| A-013 | Requester / Verifier | SHALL | Section 5.2.4 | Use `purpose`, when present, only as Holder-facing workflow context, not requester identity, trust, consent, or authorization. | Request and UI review separate `purpose` from authenticated trust display. |
| A-014 | Requester / Verifier | SHOULD | Section 5.2.5 | Include `fhirVersions[]` when accepting `application/fhir+json` unless any conforming FHIR version can be safely processed. | Raw-FHIR-capable requests declare supported FHIR releases or document broad capability. |
| A-015 | Holder Wallet / Responder | SHOULD | Section 5.2.5 | Use `fhirVersions[]` when choosing raw FHIR JSON versions, subject to Holder decision, capability, data, and policy. | Response selection evidence shows version preference handling or justified inability. |
| A-016 | Requester / Verifier | SHALL | Section 5.2.6 | Encode `items` as an array of request items. | Request schema/procedural validation covers item array shape. |
| A-017 | Holder Wallet / Responder | SHALL | Section 5.2.6 | Process `items[]` as Holder-review and response-accounting granularity while preserving item ids even if display is grouped or reordered. | UX/state tests show per-item outcomes and exact ids in response. |
| A-018 | Requester / Verifier | SHALL NOT | Section 5.2.7 | Do not include self-asserted requester identity, origin, reader, certificate, callback, logo, deployment handoff, or trust metadata in the SMART request body. | Generated requests and extension fields contain no prohibited identity/trust metadata. |
| A-019 | Holder Wallet / Responder | SHALL | Section 5.2.7 | Do not treat any SMART request body field as authenticated requester identity. | UI/trust tests distinguish request text from origin, reader, deployment, or presentation evidence. |
| A-020 | Requester / Verifier | SHALL | Section 5.3 | Include item `id`, `title`, `content`, and non-empty `accept[]` on every request item. | Request validation rejects missing required item fields and empty `accept[]`. |
| A-021 | Requester / Verifier | SHALL | Section 5.3.1 | Use non-empty item ids and avoid duplicates within one SMART request. | Request validation rejects empty, non-string, or duplicate item ids. |
| A-022 | Holder Wallet / Responder | SHALL | Section 5.3.1 | Reject requests with missing, non-string, empty, or duplicate item ids. | Negative item-id fixtures fail before response construction. |
| A-023 | Holder Wallet / Responder | SHALL | Section 5.3.1 | Compare item ids by exact string equality. | Cross-validation rejects normalized, case-folded, localized, or transformed id variants. |
| A-024 | Requester / Verifier | SHALL | Section 5.3.2 | Provide non-empty Holder-facing `title` on every item and do not use it as requester identity. | Request review flags missing/empty title and identity-like title misuse. |
| A-025 | Requester / Verifier | SHALL | Section 5.3.4 | Treat `required` only as advisory workflow context, not consent, authorization, or a disclosure command. | Required items can still produce declined, partial, unavailable, unsupported, or error outcomes. |
| A-026 | Holder Wallet / Responder | SHALL | Section 5.3.4 | Treat omitted `required` as `false` and never use `required: true` to bypass Holder control or Wallet policy. | Holder-review tests allow refusal or non-fulfillment for required items. |
| A-027 | Requester / Verifier | SHALL | Section 5.3.5 | Order `accept[]` from most preferred to least preferred and list only media types the Requester can parse, validate, and route. | Request catalog maps each accepted media type to receiver support. |
| A-028 | Holder Wallet / Responder | SHALL | Section 5.3.5 | Do not return an Artifact for an item unless its `mediaType` appears in that item's `accept[]` or a supported compatibility rule applies. | Response construction rejects or status-reports unaccepted media types. |
| A-029 | Requester / Verifier | SHALL | Section 5.3.6 | Include `content` as a selector object with string `content.kind` on every request item. | Validator rejects missing/malformed selectors. |
| A-030 | Holder Wallet / Responder | SHALL | Section 5.3.6 | Do not infer unsupported selector semantics from display text or unrelated fields. | Unknown `content.kind` yields rejection or `unsupported`, not guessed fulfillment. |
| A-031 | Requester / Verifier | SHALL | Section 5.4 | Use a selector shape defined by Section 5 or a registered extension selector for interoperable processing. | Generated requests use core or registered selector kinds only. |
| A-032 | Holder Wallet / Responder | SHALL | Section 5.4 | Evaluate selector semantics independently per request item while allowing Section 6 many-to-many Artifact fulfillment. | Tests show per-item status plus valid shared Artifacts where allowed. |
| A-033 | Requester / Verifier | SHALL | Section 5.4.1 | For `selection.fhir`, set `kind` exactly and encode `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, when present, as arrays of strings. Do not include `form.fhir` fields in the same selector. | Shape tests reject scalar/object selector fields and mixed form/resource-selection fields. |
| A-034 | Requester / Verifier | SHALL | Section 5.4.1.2 | Encode `profilesFrom` as a non-empty array of canonical profile-family URL strings, not a string, package descriptor, alias, local topic, or URN. | Negative tests include stale scalar/package/local-topic encodings. |
| A-035 | Holder Wallet / Responder | SHALL | Section 5.4.1.2 | Reject a present `profilesFrom` member that is not a non-empty array of strings. | Selector validation fails invalid `profilesFrom` shapes. |
| A-036 | Holder Wallet / Responder | SHALL | Section 5.4.1.3 | Treat `resourceTypes[]` as official FHIR resource-type constraints, not local topic labels. | Matching tests require listed FHIR `resourceType` values. |
| A-037 | Holder Wallet / Responder | SHALL | Section 5.4.1.4 | Treat `profiles[]` and `profilesFrom[]` as additive profile selectors, not narrowing selectors. | Matching accepts resources matching either exact profile or profile-family membership. |
| A-038 | Requester / Verifier | SHALL NOT | Section 5.4.1.4 | Do not rely on `profiles[]` to narrow a broader `profilesFrom[]` request. | Request review flags examples/tests assuming intersection semantics. |
| A-039 | Requester / Verifier | SHOULD | Section 5.4.1.5 | Avoid no-selector `selection.fhir` requests unless broad patient-specific FHIR content is safe and clearly explained. | Broad selector review checks workflow justification and Holder-facing text. |
| A-040 | Holder Wallet / Responder | MAY | Section 5.4.1.5 | Satisfy no-selector `selection.fhir` items with patient-specific FHIR resources compatible with `accept[]`, policy, and Holder choice. | Broad-selector tests show allowed partial fulfillment and no full-export requirement. |
| A-041 | Requester / Verifier | SHALL | Section 5.4.2 | For `form.fhir`, set `content.kind` to `form.fhir` and include at least one of `questionnaireCanonical` or `questionnaire` directly on the selector. Do not include `selection.fhir` fields in the same selector. | Validation accepts the form selector shape and rejects mixed form/resource-selection shapes. |
| A-042 | Holder Wallet / Responder | SHALL | Section 5.4.2 | Reject or report unsupported for `form.fhir` selectors with neither `questionnaireCanonical` nor `questionnaire`, non-string/blank `questionnaireCanonical`, non-Questionnaire `questionnaire`, or mixed `selection.fhir` fields. | Negative form fixtures produce rejection or `unsupported`. |
| A-043 | Holder Wallet / Responder | SHALL NOT | Section 5.4.2.4 | Do not silently merge conflicting Questionnaire `questionnaireCanonical` and inline `questionnaire` definitions or rewrite canonical identity. | Conflict tests yield `unsupported` or `error`, not silent merge. |
| A-044 | Deployment/profile author | SHALL | Section 5.4.3 | Define extension selector kind string, JSON shape, clinical meaning, fulfillment, validation, unsupported behavior, security, privacy, and examples. | Extension registration checklist covers all required fields. |
| A-045 | Requester / Verifier | SHALL | Section 5.5 | Apply canonical version-suffix handling rules for each operation it performs, preserving exact wire strings where required. | Tests preserve exact strings for transport/fixtures and compare at defined normalization levels. |
| A-046 | Holder Wallet / Responder | SHALL | Section 5.5 | Resolve canonicals with a configured resolver or FHIR canonical search when versioned, verify returned `(resourceType, url, version)`, and use direct HTTP dereference only for unversioned canonicals. | Resolver tests reject version-mismatched resources and do not direct-fetch versioned canonicals by stripping a version suffix. |
| A-047 | Holder Wallet / Responder | SHALL | Section 5.5 | Preserve requested Questionnaire canonical in generated `QuestionnaireResponse.questionnaire` when known. | Questionnaire response fixtures retain canonical version suffixes when provided. |
| A-048 | Holder Wallet / Responder | SHALL NOT | Section 5.5 | Do not remove canonical version suffixes from returned FHIR `meta.profile` values or exact-version profile evidence merely due to routing or grouping. | Raw FHIR fixtures preserve versioned `meta.profile` values. |
| A-049 | Requester / Verifier | SHALL | Section 5.6 | Encode each `accept[]` as a non-empty ordered array of media type strings and use order as preference. | Request validation preserves order and finds no separate preference field. |
| A-050 | Holder Wallet / Responder | SHOULD | Section 5.6 | Choose the earliest acceptable media type it can produce when response forms are otherwise equivalent. | Media negotiation tests or policy review show preference-order handling. |
| A-051 | Holder Wallet / Responder | SHALL | Section 6.1 | Include response `type`, `version`, `requestId`, `artifacts`, and `requestStatus`; set constants to `smart-health-checkin-response` and `1`. | Response schema/procedural validation covers top-level fields and constants. |
| A-052 | Requester / Verifier | SHALL | Section 6.1.1 | Reject responses whose `type` is absent or not exactly `smart-health-checkin-response`. | Negative discriminator tests fail. |
| A-053 | Requester / Verifier | SHALL | Section 6.1.2 | Reject responses whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-054 | Holder Wallet / Responder | SHALL | Section 6.1.3 | Set response `requestId` to the exact accepted SMART request `id`. | Response construction tests assert exact equality. |
| A-055 | Requester / Verifier | SHALL | Section 6.1.3 | Reject a SMART response whose `requestId` does not exactly equal the original SMART request `id`. | Cross-validation test mutates `requestId`. |
| A-056 | Holder Wallet / Responder | SHALL | Section 6.2 | Include Artifact `id`, `mediaType`, non-empty `fulfills[]`, and the payload fields defined by that Artifact media type on every Artifact. | Response validation rejects missing common fields and payload shapes not defined for the media type. |
| A-057 | Holder Wallet / Responder | SHALL NOT | Section 6.2.1 | Do not reuse the same Artifact `id` within one SMART response. | Duplicate Artifact-id validation fails. |
| A-058 | Requester / Verifier | SHALL | Section 6.2.1 | Reject duplicate, missing, non-string, or empty Artifact ids. | Negative Artifact-id fixtures fail. |
| A-059 | Holder Wallet / Responder | SHALL | Section 6.2.2 | Use `mediaType` as the Artifact clinical response form, not a separate Artifact-level protocol `type`. | Artifact fixtures use `mediaType` for clinical form. |
| A-060 | Holder Wallet / Responder | SHALL | Section 6.2.3 | Set every `fulfills[]` value to exactly one original request item id. | Response construction forbids unknown or empty fulfillment references. |
| A-061 | Requester / Verifier | SHALL | Section 6.2.3 | Reject unresolved, absent, empty, or non-string `fulfills[]` references. | Cross-validation rejects unknown or malformed fulfillment references. |
| A-062 | Requester / Verifier | SHALL | Section 6.2.4 | Do not infer dereferencing, decoding, signature, freshness, integrity, or generic carrier semantics from field names alone. | Extension Artifact tests require media-type-defined payload and processing rules. |
| A-063 | Holder Wallet / Responder | SHALL | Section 6.3.1 | For `application/smart-health-card`, include non-empty `value.verifiableCredential[]` and no outer Artifact `fhirVersion`. | Artifact validation rejects missing VC list or outer `fhirVersion`. |
| A-064 | Requester / Verifier | SHALL | Section 6.3.1 | Verify and process each SMART Health Card JWS according to SMART Health Cards and local trust policy. | SHC validation/trust tests run on each `verifiableCredential[]` JWS. |
| A-065 | Holder Wallet / Responder | SHALL | Section 6.3.2 | For `application/fhir+json`, include non-empty `fhirVersion` and FHIR JSON `value` as a Resource or Bundle. | Artifact validation rejects absent `fhirVersion` and non-FHIR object payloads. |
| A-066 | Holder Wallet / Responder | SHALL NOT | Section 6.3.2 | Do not mix resources requiring different FHIR releases within one `application/fhir+json` Artifact. | Mixed-release content is split or status-reported, not mixed in one Artifact. |
| A-067 | Requester / Verifier | SHOULD | Section 6.3.2 | Treat raw FHIR `fhirVersion` not acceptable for the original request or receiver as unsupported for ingestion. | Receiver policy checks requested FHIR versions before ingestion. |
| A-068 | Deployment/profile author | SHALL | Section 6.3.3 | Define extension Artifact media types as branded variants with pinned media type, typed payload fields, validation, FHIR-version handling, status behavior, security/privacy, and compatibility. | Extension registration includes all required processing and validation rules and does not rely on `GenericArtifact`. |
| A-069 | Holder Wallet / Responder | SHALL | Section 6.4.1 | Include exactly one `requestStatus[]` entry for every original request item and no unknown or duplicate item ids. | Response tests compare status item set exactly to request item id set. |
| A-070 | Requester / Verifier | SHALL | Section 6.4.1 | Reject a SMART response unless `requestStatus[]` covers every request item exactly once with no unknown item ids. | Cross-validation tests missing, duplicate, and unknown status items. |
| A-071 | Holder Wallet / Responder | SHALL | Section 6.4.2 | Use only v1.0 status codes unless a supported future status-code extension applies. | Status validation rejects codes outside `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`. |
| A-072 | Holder Wallet / Responder | SHALL | Section 6.4.2 | Use `unsupported`, `unavailable`, `declined`, `partial`, `fulfilled`, and `error` according to defined item-outcome semantics. | Outcome tests cover unsupported format, unavailable data, Holder refusal, partial sharing, full fulfillment, and processing errors. |
| A-073 | Holder Wallet / Responder | SHALL NOT | Section 6.4.3 | Do not put secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data in `requestStatus[].message`. | Message lint/review inspects status messages. |
| A-074 | Requester / Verifier | SHALL | Section 6.4.3 | Do not rely on localized `message` text to determine normative status semantics. | Receivers process `status` code, not message text. |
| A-075 | Holder Wallet / Responder | MAY | Section 6.5 | Return one Artifact for multiple items or multiple Artifacts for one item only when every fulfillment edge satisfies media-type and selector rules. | Many-to-many tests validate each `fulfills[]` edge independently. |
| A-076 | Requester / Verifier | SHALL | Section 6.6 | Apply full request/response cross-validation before treating a response as protocol-valid; shape validation alone is insufficient. | Harness validates against original request, not response schema alone. |
| A-077 | Requester / Verifier | SHALL | Section 6.6.3 | Enforce that each Artifact `mediaType` is accepted by every fulfilled item unless a supported registered compatibility rule applies. | Section 6.6 validation rejects unaccepted media types. |
| A-078 | Requester / Verifier | SHALL | Section 6.6.5 | For raw FHIR JSON, verify `fhirVersion`, FHIR object shape, Bundle interpretation, and no mixed FHIR releases in one Artifact. | Raw FHIR cross-validation/quarantine tests cover each condition. |
| A-079 | Requester / Verifier | SHOULD | Section 6.6.6 | Inspect returned FHIR `resourceType`, `meta.profile`, Bundle entries, and `QuestionnaireResponse.questionnaire` when assessing selector responsiveness. | FHIR-aware validation or quarantine policy evaluates payload evidence. |
| A-080 | Requester / Verifier | SHALL | Section 7 | Preserve trust-layer separation among origin, reader, issuer/device, clinical-source, and deployment policy. | Trust report records separate pass/fail/unknown state for each layer. |
| A-081 | Holder Wallet / Responder | SHALL | Section 7.1.1 | Use platform-provided authenticated origin or approved origin-equivalent for origin trust, not SMART request fields or deployment handoff metadata. | Origin-binding tests reject request-body origin substitutes. |
| A-082 | Holder Wallet / Responder | SHALL | Section 7.1.3 | Treat origin trust as absent when web origin or privileged-caller context cannot be authenticated. | Missing-origin tests produce absent-origin state or defined flow failure. |
| A-083 | Requester / Verifier | MAY | Section 7.2.1 | Include optional per-`DocRequest.readerAuth` for same-device requests. | If present, request bytes include detached `COSE_Sign1` bound to Section 8 inputs. |
| A-084 | Requester / Verifier | Conditional | Section 7.2.1 | If including `readerAuth`, construct it for the same presentation session and exact requested items; do not reuse across sessions, transcripts, or `ItemsRequest` bytes. | ReaderAuth vectors bind signature to exact `SessionTranscript` and tag-24 `ItemsRequest`. |
| A-085 | Holder Wallet / Responder | Conditional | Section 7.2.1 | If supporting or relying on `readerAuth`, verify COSE signature, signed context, detached payload binding, relevant bytes, algorithm/key evidence, and trust policy. | Validation distinguishes absent, malformed, failed, valid-untrusted, and trusted states. |
| A-086 | Holder Wallet / Responder | SHALL | Section 7.2.3 | Treat absent `readerAuth` as absent reader authentication and invalid/untrusted `readerAuth` as failed authentication. | Policy/UI tests do not display failed or absent readerAuth as trusted. |
| A-087 | Requester / Verifier | SHALL | Section 7.3 | Complete Section 8 mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence. | Verifier tests fail on invalid MSO, digest, device signature, transcript, or HPKE opening. |
| A-088 | Requester / Verifier | SHALL | Section 7.3.1 | Apply issuer trust-anchor policy before claiming production mdoc issuer trust. | Validation report shows issuer signature/path/key evidence and policy result. |
| A-089 | Requester / Verifier | SHALL | Section 7.3.2 | Verify device-key proof bound to the expected presentation session before treating mdoc presentation as device-bound. | DeviceAuthentication tests fail on wrong `SessionTranscript` or device key. |
| A-090 | Requester / Verifier | SHALL | Section 7.4 | Evaluate clinical-source trust from Artifact media type, signatures/provenance, selectors, FHIR evidence, and deployment policy; do not infer provenance from transport success. | Raw FHIR and SHC provenance are recorded separately from mdoc validation. |
| A-091 | Requester / Verifier | SHALL | Section 7.4.1 | For SMART Health Card Artifacts, verify every VC JWS and evaluate payload content against original selectors and local policy. | SHC verifier logs signature/trust plus selector evaluation. |
| A-092 | Requester / Verifier | SHALL | Section 7.4.2 | Treat raw `application/fhir+json` as patient-mediated unless accepted separate provenance, signature, source attestation, authenticated retrieval, or equivalent proof is present. | Workflow policy does not equate raw FHIR with SHC or signed source evidence. |
| A-093 | Requester / Verifier | SHALL | Section 7.5 | Preserve identifier scopes and do not use an identifier from one layer as proof or authorization for another. | Tests distinguish request id, item ids, Artifact ids, and presentation-session values. |
| A-094 | Deployment/profile author | SHALL | Section 7.6 | Document mandatory trust layers, accepted anchors/registries, freshness/replay expectations, failure handling, assurance levels, and Holder display rules. | Deployment profile includes trust policy matrix and failure behavior. |
| A-095 | Requester / Verifier | Optional-profile | Section 8.1 | For direct same-device support, use `org-iso-mdoc`, `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request` exactly. | Wire capture matches all fixed identifiers. |
| A-096 | Holder Wallet / Responder | Optional-profile | Section 8.1 | Carry the SMART response only as `smart_health_checkin_response` `elementValue` in namespace `org.smarthealthit.checkin`. | mdoc response inspection rejects dynamic elements and alternate carriers. |
| A-097 | Requester / Verifier | SHALL | Section 8.2 | Serialize the SMART request as UTF-8 JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. | DeviceRequest fixture shows CBOR text string, not CBOR map or base64 JSON. |
| A-098 | Requester / Verifier | SHALL | Section 8.2.2 | Construct `ItemsRequest` with version-1 docType, namespace, stable response element, requestInfo, and `intentToRetain` behavior. | Byte-ladder or decoded request verifies logical shape and retention flag. |
| A-099 | Requester / Verifier | SHALL | Section 8.2.3 | CBOR-encode `ItemsRequest` and wrap those bytes in CBOR tag 24 in `DocRequest.itemsRequest`. | Fixture comparison checks tag-24 boundary. |
| A-100 | Requester / Verifier | SHALL | Section 8.2.4 | Use `DeviceRequest.version` exactly `1.0`; do not use v1.1 `readerAuthAll` as core v1.0 reader authentication. | DeviceRequest tests reject `readerAuthAll` for core profile. |
| A-101 | Requester / Verifier | Conditional | Section 8.2.4 | If including `readerAuth`, construct detached ES256 `COSE_Sign1` over tag-24 `ReaderAuthentication` with payload `null`, empty external AAD, protected alg `-7`, exact transcript/request bytes, and label 33 `x5chain`. | ReaderAuth vector verifies payload null, alg `-7`, label 33 certificate evidence, and signature input. |
| A-102 | Requester / Verifier | SHOULD | Section 8.2.5 | Use a fresh HPKE recipient key pair and fresh unpredictable nonce for each presentation session. | Session tests show new nonce/key per request or documented profile for reuse. |
| A-103 | Requester / Verifier | SHALL | Section 8.2.5 | Generate/select HPKE P-256 recipient key material and construct `encryptionInfo = ["dcapi", {nonce, recipientPublicKey}]`. | Decoded `encryptionInfo` has direct dcapi shape and P-256 COSE_Key. |
| A-104 | Requester / Verifier | SHALL | Section 8.2.6 | Base64url-encode `DeviceRequest` and `encryptionInfo` CBOR bytes without padding and preserve exact `encryptionInfo` string. | DC API request fixture checks unpadded strings and exact transcript input. |
| A-105 | Requester / Verifier | SHALL | Section 8.3 | Compute `SessionTranscript` from exact `encryptionInfoBase64Url` and authenticated origin as the direct `dcapi` handover. | Byte-ladder recomputes `dcapiInfo`, SHA-256 handover, and transcript bytes. |
| A-106 | Holder Wallet / Responder | SHALL | Section 8.3 | Obtain origin from authenticated platform or approved origin-equivalent, never from SMART request fields or deployment handoff metadata. | Wallet trace records authenticated origin source and rejects fallback substitutions. |
| A-107 | Holder Wallet / Responder | SHALL | Section 8.4 | Validate the `org-iso-mdoc` request wrapper, `DeviceRequest`, tag-24 `ItemsRequest`, requestInfo SMART request, `encryptionInfo`, and transcript before response construction. | Wallet-side validation checklist passes; malformed wrappers fail safely. |
| A-108 | Holder Wallet / Responder | SHALL | Section 8.4 | Perform Holder review or equivalent Holder-control processing at request-item granularity and preserve item ids. | UX/policy evidence shows per-item accounting and no `required`-as-consent behavior. |
| A-109 | Holder Wallet / Responder | SHALL | Section 8.5 | Place SMART response JSON text as `elementValue` of issuer-signed `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. | DeviceResponse inspection locates the stable issuer-signed element. |
| A-110 | Holder Wallet / Responder | SHALL | Section 8.5.2 | Construct MSO with docType `org.smarthealthit.checkin.1`, SHA-256 digest algorithm, value digest covering the stable element, and deviceKeyInfo. | mdoc validation verifies MSO fields, digest binding, and issuerAuth. |
| A-111 | Holder Wallet / Responder | SHALL | Section 8.5.3 | Produce device authentication bound to the same `SessionTranscript`, docType, and tag-24 `DeviceNameSpaces`. | Device signature fixture validates payload and MSO device key. |
| A-112 | Holder Wallet / Responder | SHALL | Section 8.6 | Encrypt CBOR `DeviceResponse` with HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty AAD. | HPKE tests reject plaintext, wrong suite, wrong info, or non-empty AAD. |
| A-113 | Requester / Verifier | SHALL | Section 8.7 | Decode and HPKE-open `dcapiResponse`, validate DeviceResponse, issuer/MSO, digest, device proof, stable element, SMART response, and Section 6.6 before acceptance. | Verifier checklist covers all Section 8.7 steps and rejection on failure. |
| A-114 | Requester / Verifier | SHALL | Section 8.8 | Reject or quarantine if HPKE, mdoc issuer/MSO, digest, device-authentication, stable-element, SMART response, or Section 6.6 validation fails. | Negative vectors for each failure path do not reach workflow acceptance. |
| A-115 | Conformance/fixture author | SHOULD | Section 4.3.4 | Classify same-device companion fixtures and byte ladders without inventing alternate carriers or clinical semantics. | Fixture metadata marks conformance candidate, diagnostic, historical, regression, or illustrative status. |
| A-116 | Requester / Verifier | SHALL | Section 9.1.1 | Keep same-device HPKE and other presentation cryptographic contexts separate. | Tests fail when keys, recipients, info/transcripts, AAD, or ciphertext fields are substituted across contexts. |
| A-117 | Holder Wallet / Responder | SHALL | Section 9.1.1 | Do not downgrade active v1.0 same-device response encryption to plaintext or alternate HPKE context. | Transport tests reject plaintext `DeviceResponse` and substituted suite/info/AAD. |
| A-118 | Requester / Verifier | SHOULD | Section 9.1.2 | Use flow-specific freshness controls and do not treat request ids, item ids, Artifact ids, or deployment handoff ids as freshness proofs. | Replay tests distinguish correlation ids from freshness evidence. |
| A-119 | Holder Wallet / Responder | SHALL | Section 9.1.4 | Do not treat mere presence of `readerAuth`, `x5chain`, names, logos, or demo certificates as successful reader authentication. | ReaderAuth policy requires cryptographic verification and trust evaluation. |
| A-120 | Requester / Verifier | SHALL | Section 9.1.5 | Do not treat mdoc issuer/device evidence, HPKE opening, readerAuth, or request-id matching as production issuer accreditation or clinical-source provenance by themselves. | Trust report separates issuer/device evidence from production trust and clinical provenance. |
| A-121 | Requester / Verifier | SHALL | Section 9.1.6 | Reject unsupported or unexpected algorithm labels for the v1.0 profile instead of downgrading or substituting library defaults. | Algorithm mutation tests fail closed for wrong COSE/HPKE labels. |
| A-122 | Requester / Verifier | SHOULD | Section 9.1.7 | Minimize collection, display, and retention of plaintext requests, responses, FHIR, SHCs, private keys, secrets, and full ciphertext except controlled diagnostics. | Logging/debug review redacts or disables sensitive plaintext outside controlled fixtures. |
| A-123 | Requester / Verifier | SHOULD | Section 9.2.1 | Request the minimum clinical or administrative content needed for the bounded check-in workflow. | Request review favors narrow items, selectors, media types, and FHIR versions. |
| A-124 | Holder Wallet / Responder | SHALL | Section 9.2.1 | Provide Holder review or equivalent Holder-control at request-item granularity before disclosing content. | UX/policy evidence shows item-level control and meaningful disclosure choices. |
| A-125 | Holder Wallet / Responder | SHOULD | Section 9.2.2 | Construct the smallest set of Artifacts that accurately satisfies approved items and accepted response forms. | Response packaging review avoids unrelated over-disclosure. |
| A-126 | Requester / Verifier | SHALL | Section 9.2.2 | Do not imply clinical-source provenance for unsigned raw FHIR from mdoc, HPKE, Artifact ids, `fulfills[]`, `requestId`, or Holder approval. | Provenance assessment requires separate accepted evidence. |
| A-127 | Requester / Verifier | SHOULD | Section 9.2.3 | Avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and avoid embedding patient/requester/secrets/clinical facts in ids. | Identifier generation and logs show scoped, non-identifying values. |
| A-128 | Requester / Verifier | SHOULD | Section 9.2.7 | Do not send plaintext protocol payloads, clinical content, private keys, bearer URLs, full ciphertext blobs, or unredacted sensitive stack traces to routine telemetry. | Telemetry review confirms redaction, aggregation, sampling, or controlled diagnostic handling. |
| A-129 | Requester / Verifier | SHALL | Section 9.3.1 | Compare media/content-type strings by exact, case-sensitive equality unless a future registered extension defines otherwise. | Media type mutation tests fail by default. |
| A-130 | Holder Wallet / Responder | SHALL | Section 9.3.1 | Do not claim Artifact fulfillment unless `mediaType` appears in the fulfilled item's `accept[]`, except for supported registered compatibility rules. | Response construction enforces exact media-type acceptance. |
| A-131 | Requester / Verifier | SHALL | Section 9.3.2 | Use mdoc/DC API identifiers exactly and do not treat external registry registration as already complete unless it is. | Conformance report uses exact values and marks provisional/external status accurately. |
| A-132 | Holder Wallet / Responder | SHALL | Section 9.3.3 | Use only core status codes in v1.0 unless a future status-code extension is explicitly supported by the receiver. | Unknown status codes are absent or extension-scoped. |
| A-133 | Holder Wallet / Responder | SHALL | Section 9.3.4 | Do not infer unsupported selector semantics from display text, profile labels, local topics, deployment handoff metadata, or requester identity metadata. | Unsupported-kind tests yield rejection or `unsupported`. |
| A-134 | Deployment/profile author | SHALL | Section 9.3.5 | Do not use profile identifiers as SMART request fields, selectors, Artifact media types, status codes, request presets, or substitutes for Section 5 selectors and `accept[]`. | Profile review rejects `requestProfile`, preset, IPS, all-of-the-above, and topic-label shortcuts. |
| A-135 | Deployment/profile author | SHALL | Section 9.3.6 | Use designated expert review before treating new status codes, selector kinds, branded Artifact media types, profile ids, payload kinds, or mdoc changes as interoperable registrations. | Registry change record includes expert review and required metadata. |
| A-136 | Requester / Verifier | SHALL | Section 9.4.1 | Do not localize protocol identifiers or machine values, including request/response ids, item ids, media types, status codes, canonicals, and mdoc ids. | Localization tests preserve exact machine values. |
| A-137 | Requester / Verifier | SHALL | Section 9.4.1 | Do not rely on unknown members, deployment handoff parameters, browser language, or HTTP headers as interoperable locale-negotiation signals. | Locale tests find no core `lang`, `locale`, `Accept-Language`, or negotiated-locale behavior. |
| A-138 | Holder Wallet / Responder | SHOULD | Section 9.4.1 | Render or process FHIR language/localization according to FHIR version, implementation guide, and local clinical-display policy. | FHIR display tests follow applicable FHIR i18n behavior. |
| A-139 | Holder Wallet / Responder | SHALL | Section 9.4.1 | If display text is translated, summarized, grouped, reordered, or suppressed, preserve protocol values used for construction and validation. | UX tests show exact ids, selectors, media types, fulfillment links, and status codes preserved. |
| A-140 | Requester / Verifier | SHALL | Section 9.4.2 | Do not use Unicode normalization, case folding, accent folding, BIDI reordering, translation, or locale collation to make distinct protocol identifiers compare equal. | Identifier comparison tests remain exact across Unicode variants. |
| A-141 | Holder Wallet / Responder | SHOULD | Section 9.4.2 | Isolate untrusted display text from adjacent labels, identifiers, URLs, trust indicators, warnings, and action buttons for BIDI safety. | UI review covers `purpose`, item text, Questionnaire text, FHIR displays, and messages. |

---

## Appendix B. JSON Schema for `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`

This appendix provides JSON Schema snippets for the transport-neutral SMART request and SMART response objects defined in Sections 5-6. The snippets are intended for structural validation, fixture review, and conformance-test scaffolding. They do not define mdoc carriage, registry behavior, full FHIR validation, SMART Health Card validation, or downstream clinical ingestion policy.

If a schema rule in this appendix appears to conflict with Sections 5-6, Sections 5-6 control. Normative language in this appendix either restates Sections 5-6 or is scoped to conformance with these Appendix B schema snippets.

### B.1 Dialect and validation model

The schema snippets use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A validator that claims conformance to Appendix B SHALL evaluate these snippets using JSON Schema 2020-12 semantics, or a later dialect only when that dialect is known to preserve the semantics of the keywords used here.

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
- The extension-selector branch permits syntactic validation of registered extension selector kinds without embedding a future registry in Appendix B. A core-only deployment profile can replace this branch when it intentionally rejects all extension selectors.
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

## Appendix C. Same-device CDDL and profile constraints

This appendix gives profile constraints and diagnostic pseudo-CDDL for the same-device direct `org-iso-mdoc` flow defined in Section 8. It is intended to make SMART Health Check-in byte boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The profile reuses ISO/IEC 18013-5 mdoc, COSE, COSE_Key, CBOR, and HPKE structures. ISO/IEC 18013-5 and the referenced COSE/HPKE specifications own the base structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key`. This appendix constrains only SMART Health Check-in profile portions: fixed identifiers, carriers, tag-24 boundaries, direct `dcapi` wrappers, HPKE context, and the stable SMART response element.

The snippets below are profile pseudo-CDDL. They use field names and byte-boundary names from Section 8 and the companion byte-ladder material. They are not a complete replacement for ISO/IEC 18013-5 CDDL, and they do not claim exactness for ISO map labels or optional fields not confirmed by the active profile. If this appendix conflicts with Section 8, Section 8 controls.

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

Appendix C identifies expected carriers and byte boundaries, but it cannot by itself establish trust or clinical validity. A Verifier accepting a same-device response SHALL perform the Section 8.7 and Section 8.8 checks: decode the JSON wrapper, HPKE-open using the expected transcript, parse `DeviceResponse`, validate `issuerAuth`, validate the MSO and digest binding, validate device authentication, extract the SMART response JSON string from the stable issuer-signed item, validate it under Section 6, and apply Section 6.6 cross-validation against the original SMART request.

Successful mdoc parsing, HPKE opening, digest validation, issuer evidence, device signature validation, optional reader authentication, or `requestId` matching does not create clinical-source provenance for unsigned raw FHIR JSON. Source trust for raw FHIR JSON, SMART Health Cards, provenance-bearing FHIR, or other Artifact forms remains governed by Section 7.4 and the Artifact evidence itself.

The following exactness issues are intentionally unresolved here and should be closed by Section 9.1, Section 9.3, Appendix A, a deployment profile, or a future fixture-vector profile before being treated as pass/fail conformance requirements:

- duplicate CBOR or JSON map key handling;
- multiple matching `docRequests` or multiple matching `DeviceResponse.documents`;
- duplicate `smart_health_checkin_response` issuer-signed items or duplicate stable elements;
- deterministic CBOR map ordering or canonical encoding for vector generation;
- digestID conventions such as always using `0` for single-item vectors;
- fixed nonce-size constraints beyond fresh unpredictable bytes and the 16-byte recommendation; and
- complete imported ISO/IEC 18013-5 CDDL and exact base-structure map labels.

---


## References and companion material

### Normative references

- [RFC2119] Bradner, S. *Key words for use in RFCs to Indicate Requirement Levels*. BCP 14, RFC 2119.
- [RFC8174] Leiba, B. *Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words*. BCP 14, RFC 8174.
- [RFC7515] Jones, M., Bradley, J., and N. Sakimura. *JSON Web Signature (JWS)*. RFC 7515.
- [RFC8259] Bray, T. *The JavaScript Object Notation (JSON) Data Interchange Format*. RFC 8259.
- [RFC8610] Birkholz, H., Vigano, C., and C. Bormann. *Concise Data Definition Language (CDDL)*. RFC 8610.
- [RFC8949] Bormann, C. and P. Hoffman. *Concise Binary Object Representation (CBOR)*. RFC 8949.
- [RFC9052] Schaad, J. *CBOR Object Signing and Encryption (COSE): Structures and Process*. RFC 9052.
- [RFC9053] Schaad, J. *CBOR Object Signing and Encryption (COSE): Initial Algorithms*. RFC 9053.
- [RFC9180] Barnes, R., Bhargavan, K., Lipp, B., and C. Wood. *Hybrid Public Key Encryption*. RFC 9180.
- [ISO18013-5] ISO/IEC 18013-5. *Personal identification - ISO-compliant driving licence - Part 5: Mobile driving licence application*.
- [W3C-DC-API] W3C. *Digital Credentials API*.
- [FHIR-R4] HL7. *FHIR Release 4, Version 4.0.1*.
- [SMART-HEALTH-CARDS] SMART Health IT. *SMART Health Cards Framework*.

### Informative references

- [OpenID4VP] OpenID Foundation. *OpenID for Verifiable Presentations*.
- [DCQL] IETF. *Digital Credentials Query Language*.
- [US-CORE] HL7. *US Core Implementation Guide*.
- [CARIN-BB] HL7. *CARIN Consumer Directed Payer Data Exchange Implementation Guide*.
- [MDL-ANNEX-C] ISO/IEC 18013-5 Annex C and related mDL ecosystem implementation guidance.
- [SMART-APP-LAUNCH] SMART Health IT. *SMART App Launch Framework*.

Companion: `https://github.com/jmandel/smart-health-checkin-mdoc`. Companion examples, byte ladders, fixtures, diagrams, implementation notes, FHIR mapping commentary, and historical notes are informative unless a named profile makes them conformance evidence.
