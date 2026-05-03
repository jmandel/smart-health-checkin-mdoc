# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

Short title: **SMART Health Check-in 1.0**. Suggested citation label: **SHC-Checkin-1.0**. Suggested document identifier: `smart-health-checkin-1.0`.

**Editorial approach:** This candidate treats the main specification as an implementable standard. Normative wire values, validation rules, conformance targets, trust boundaries, and cryptographic details remain in the main text and appendices. Worked examples, diagrams, byte ladders, fixture catalogs, FHIR mapping notes, implementation recipes, and historical material are treated as companion material. Appendix A, Appendix B, and Appendix C are retained substantially intact, with cross-references updated for the consolidated Section 9.

## 0. Front Matter

### 0.1 Status, version, and publication

Status: editor's draft for implementer review. Version: 1.0 draft. Publication date, editors, contributors, governance status, IPR statement, license details, and change history are to be supplied by the publishing organization before final publication. Example identifiers, URLs, names, organizations, and clinical data are illustrative only unless explicitly stated otherwise.

### 0.2 Copyright and license

Copyright (publication year) (publication owner(s) and contributors). This specification text is intended for publication under CC BY 4.0 or a successor open documentation license. Code fragments, schemas, CDDL fragments, pseudocode, and test-vector scaffolding are intended to be usable for implementation and conformance testing under terms identified by the final publication package.

## 1. Introduction

### 1.1 Abstract and scope

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share bounded clinical or administrative content and receives a structured SMART response. The specification has two normative layers: the transport-neutral clinical request/response JSON model in Sections 5 and 6, and the same-device direct `org-iso-mdoc` presentation flow over the W3C Digital Credentials API in Sections 7 and 8.

The profile does not define credential issuance, longitudinal Wallet storage, account recovery, patient matching, identity proofing, guardian or proxy verification, EHR write-back, clinical reconciliation, payments, eligibility adjudication, arbitrary FHIR search, CDS logic, payer transaction standards, a general wallet portability layer, or a required OID4VP binding.

### 1.2 Core Trust Rule

**Core Trust Rule:** A Wallet/Responder, Verifier, Requester, receiver, deployment profile, or trust-framework operator SHALL keep trust layers separate. Successful validation in one layer SHALL NOT be represented as proof for another layer unless this specification or an explicit deployment profile defines that relationship and its assurance level.

SMART request body fields, including `purpose`, item display text, selectors, unknown members, and extension members, are not authenticated requester identity. Origin evidence, privileged-caller evidence, and `readerAuth` are presentation or deployment trust signals; they do not prove clinical-source provenance, patient matching, EHR write-back authorization, or downstream clinical acceptance. mdoc issuer evidence, MSO digest validation, device-key proof, HPKE opening, and exact `requestId` matching prove only the properties validated for the selected presentation session and container. Raw `application/fhir+json` Artifacts are patient-mediated unless separate accepted source proof is present. SMART Health Card Artifacts carry clinical-source evidence inside `value.verifiableCredential[]`, but receivers still verify those JWSs and apply selector and local trust policy.

### 1.3 Deployment-defined handoff rule

A deployment MAY use a QR code, NFC tap, deep link, desktop sign, kiosk screen, portal message, or other handoff to land the Holder on a page that runs the Section 8 same-device flow. The URL format, pointer storage, relay service, response routing, completion display, and kiosk or staff workflow are deployment UX and policy. They SHALL NOT redefine SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, status codes, trust-layer separation, or Section 8 wire construction.

### 1.4 Architecture summary

| Layer | Artifact | Normative location | Notes |
| --- | --- | --- | --- |
| Clinical request | `SmartHealthCheckinRequest` JSON | Section 5; Appendix B | Transport-neutral; no authenticated requester identity. |
| Clinical response | `SmartHealthCheckinResponse` JSON | Section 6; Appendix B | Transport-neutral; bound by `requestId` and item accounting. |
| Trust framework | Origin, optional reader authentication, issuer/device evidence, clinical-source evidence, deployment policy | Section 7 | Trust layers are distinct. |
| Same-device presentation | Direct `org-iso-mdoc` over W3C Digital Credentials API | Section 8; Appendix C | Version 1.0 live presentation flow. |
| Companion material | Examples, fixtures, byte ladders, diagrams, implementation notes, FHIR mapping details | References and companion material | Informative unless separately profiled. |

Sections 2 and 3 are folded into this introduction; numbering resumes at Section 4 to preserve established normative cross-references.

### 1.5 Terminology and conventions

**Requester** constructs a SMART request and consumes a validated SMART response. **Verifier** packages a SMART request into a presentation flow, validates returned presentation artifacts, extracts a SMART response, and applies Section 6.6. **Holder** is the user asked to review and decide whether to share content. **Wallet / Responder** receives a SMART request, applies Holder control and Wallet policy, constructs a SMART response, and returns it. **Artifact** is one clinical object in `artifacts[]`. **Request item** is the unit in `items[]` for Holder review, media-type negotiation, fulfillment, and status. **Profile family** is a FHIR implementation guide, publication, profile collection, or other canonical family identified by `profilesFrom[]`.

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, NOT RECOMMENDED, MAY, and OPTIONAL are interpreted as described in BCP 14, RFC 2119, and RFC 8174 when capitalized. JSON uses RFC 8259 terminology. CBOR uses RFC 8949. CDDL uses RFC 8610. COSE uses RFC 9052. HPKE uses RFC 9180. Base64url values use base64url without padding unless stated otherwise. Operations over hashed, signed, encrypted, compared, or HPKE-input values are over the underlying bytes, not Markdown or diagnostic notation.


## 4. Conformance

A conformance claim SHALL identify target or targets, feature set or profile, specification version, and any deployment profile that changes policy choices left open by this specification. One product MAY implement multiple targets but SHALL satisfy requirements for each target and feature claimed.

A **Requester** constructs Section 5 requests and consumes Section 6 responses. A Requester claiming core clinical conformance SHALL request only Artifact media types it is prepared to process for the corresponding item. A **Verifier** packages a SMART request for a claimed presentation flow, validates returned presentation artifacts, extracts a SMART response, and applies Section 6.6 before Requester use. A Verifier claiming direct same-device `org-iso-mdoc` support SHALL satisfy Section 8. A **Wallet/Responder** validates SMART requests under Section 5, applies Holder control and Wallet policy, preserves item ids for `fulfills[]` and `requestStatus[].item`, constructs Section 6 responses, and sets `requestId` to the accepted request `id`. A Wallet/Responder claiming direct same-device support SHALL satisfy Section 8.

A **deployment-profile author** SHALL state constrained targets, required optional features, trust layers in scope, and additional validation, security, privacy, or fixture expectations. A deployment or profile SHALL NOT redefine clinical semantics, fulfillment/status accounting, same-device carriers, trust-layer separation, or deployment-defined handoff UX. A **conformance-test author** or **fixture author** SHALL derive checks from normative requirements and identify target, feature set, section reference, expected outcome, comparison mode, and trust status of demo keys, self-signed material, synthetic data, or real-platform captures.

The mandatory core is the Section 5 SMART request and Section 6 SMART response model. A clinical Requester target SHALL support the Section 5 request shape, fixed `type`, fixed `version`, request `id`, item shape, item ids, Holder-facing display fields, claimed `content.kind` selectors, per-item `accept[]`, and applicable canonical `|version` handling. A clinical Wallet/Responder target SHALL support parsing and validation of Section 5 requests and construction of Section 6 responses for claimed capabilities. A clinical Verifier or receiver-validation target SHALL validate responses under Section 6 and apply Section 6.6; shape validation alone is not sufficient.

Direct same-device `org-iso-mdoc` is the base version 1.0 live presentation flow. A Requester/Verifier or Wallet/Responder claiming live SMART Health Check-in 1.0 presentation support SHALL implement applicable Section 8 obligations. `readerAuth` is optional unless a deployment profile requires it; a Verifier that includes it SHALL construct it as Section 8 defines, and a Wallet/Responder that supports or relies on it SHALL verify and classify it under Sections 7 and 8.

Extension selectors, Artifact media types, media-type compatibility rules, status-code extensions, stricter schemas, CDDL/fixture profiles, and future presentation bindings are optional unless required by a deployment profile. Claimed extensions SHALL implement their defined shape, processing rules, validation rules, unsupported behavior, security considerations, privacy considerations, and interactions with Sections 5 through 8.

| Identifier kind | Value |
| --- | --- |
| SMART request discriminator | `smart-health-checkin-request` |
| SMART response discriminator | `smart-health-checkin-response` |
| SMART request/response model version | `1` |
| Core selector kinds | `selection.fhir`, `form.fhir` |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` |
| DC API protocol id | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| mdoc stable element | `smart_health_checkin_response` |
| SMART request carrier key | `org.smarthealthit.checkin.request` |

Provisional labels are `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and `smart-health-checkin-oid4vp-reserved`. Labels are documentation/test-report labels, not in-band SMART request fields. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, a topic label, or negotiation metadata.

Implementations SHALL compare and interpret the version marker for the layer they process and SHALL NOT substitute one layer's version for another. The SMART request and response use `version: "1"`; the same-device flow uses `DeviceRequest.version` and `DeviceResponse.version` `"1.0"` with `docType` `org.smarthealthit.checkin.1`; FHIR content uses `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes.

An extension SHALL NOT redefine core request fields, response fields, selector kinds, Artifact media-type rules, fulfillment links, status codes, same-device carriers, or Section 7 trust-layer separation. Content-selector extensions SHALL follow Section 5.4.3. Artifact media-type extensions SHALL be branded Artifact variants, not generic catch-alls. A status-code extension SHALL NOT be used in version 1.0 unless explicitly supported by the receiving Verifier. Appendix A indexes requirements and SHALL NOT create independent obligations.

## 5. Clinical Request Model

### 5.1 Encoding and top-level object

A SMART request is an RFC 8259 JSON object. Serialized JSON text SHALL be UTF-8. A Requester SHALL NOT include comments, trailing commas, duplicate member names, `NaN`, `Infinity`, `-Infinity`, or values outside the JSON data model. A Wallet/Responder or Verifier SHALL reject a non-object, unparsable, or duplicate-member request when detected. Object order has no clinical meaning. `fhirVersions[]`, `accept[]`, and `items[]` order have only the meanings defined below. Unknown members MAY be ignored when they do not change known required members; unknown `content.kind` is an extension selector, not an ignorable member.

A `SmartHealthCheckinRequest` has this shape:

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

A Requester SHALL include `type`, `version`, `id`, and `items`; MAY include `purpose` and `fhirVersions`; SHALL set `type` to `"smart-health-checkin-request"`; and SHALL set `version` to `"1"`. A Wallet/Responder SHALL reject absent or different `type` or `version` unless a future compatibility rule applies.

A Requester SHALL include `id` as a non-empty opaque identifier unique among requests created by that Requester for the same check-in session and SHOULD make it hard to guess or collide across unrelated sessions. A Wallet/Responder SHALL preserve it for response `requestId`. The request `id` is not a patient identifier, requester identifier, freshness proof, authorization proof, or clinical fact.

If present, `purpose` SHALL be a string used only as Holder-facing workflow context. It SHALL NOT carry requester identity, organization name, origin, logo URL, legal attestation, proof of authority, consent language, trust status, or persistent authorization semantics. A Wallet/Responder MAY display it but SHALL NOT treat it as authenticated requester identity or transport trust.

If present, `fhirVersions` SHALL be an array of strings ordered by Requester preference. A Requester that accepts `application/fhir+json` SHOULD include at least one FHIR release version unless it can safely process any conforming raw FHIR version. A Wallet/Responder SHOULD use `fhirVersions[]` when choosing raw FHIR Artifact versions, subject to Holder decision, data, capability, policy, and `accept[]`.

`items` SHALL be an array of request items. A Requester SHOULD include at least one item. A Wallet/Responder SHALL process `items[]` as Holder-review and response-accounting granularity, and SHALL preserve item ids even if display is grouped, summarized, or reordered.

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body, including requester/organization names, logos, URLs, origins, application identifiers, package names, certificates, signatures, trust-framework claims, callback endpoints, relay/completion fields, encryption, nonce, handoff, or wrapper metadata. A Wallet/Responder SHALL NOT treat any SMART request body field as authenticated requester identity unless established outside the request body by presentation transport, trust processing, or local policy.

### 5.2 Request items

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

A Requester SHALL include `id`, `title`, `content`, and `accept` on every item; MAY include `summary` and `required`; SHALL make each item `id` a non-empty string; and SHALL NOT duplicate item ids within a request. A Wallet/Responder SHALL reject missing, non-string, empty, or duplicate item ids. Item ids are compared by exact string equality. Newly defined item ids SHOULD use only ASCII letters, digits, period (`.`), underscore (`_`), tilde (`~`), and hyphen (`-`), and SHOULD NOT contain patient identifiers, requester identifiers, secrets, tracking values, or clinical facts.

`title` SHALL be a non-empty Holder-facing string and SHALL NOT substitute for requester identity. `summary` MAY explain requested content and SHOULD clarify broad selectors, profile-family requests, or questionnaire purpose. A Wallet/Responder SHOULD make `title` available in Holder review and MAY display, summarize, or suppress `summary`, but SHALL preserve ids for response accounting.

`required` MAY be a boolean. If omitted, a Wallet/Responder SHALL interpret it as `false`. `required: true` is advisory workflow context only; it is not Holder consent, legal authorization, a Wallet command, or a guarantee of disclosure. A Wallet/Responder SHALL NOT use it to bypass Holder control, policy, law, or consent UX, and MAY return any valid non-fulfillment status for required items.

`accept` SHALL be a non-empty array of media type strings ordered from most preferred to least preferred. A Requester SHALL list only media types it can process. A Wallet/Responder MAY choose any listed media type and SHOULD choose the earliest producible media type when choices are otherwise equivalent. A Wallet/Responder SHALL NOT claim an Artifact fulfills an item unless its `mediaType` appears in that item's `accept[]`, except under a registered compatibility rule.

`content` SHALL be a selector object with string `content.kind`. Version 1.0 defines `selection.fhir` and `form.fhir`. A Wallet/Responder that does not understand `content.kind` SHALL NOT infer semantics from display text or unrelated fields; it SHALL reject the request or report `unsupported`.

### 5.3 `selection.fhir`

A `selection.fhir` selector requests existing patient-specific FHIR resources:

```json
{
  "kind": "selection.fhir",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

A Requester SHALL set `kind` to `"selection.fhir"`. It MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination, or none. If present, each SHALL be an array of strings. A `selection.fhir` selector SHALL NOT include `questionnaireCanonical` or `questionnaire`; form completion uses `form.fhir` in a separate item.

`profiles[]` identifies exact FHIR `StructureDefinition` canonical URLs and MAY include `|version`. A Wallet/Responder MAY match by declared `meta.profile` or equivalent local/trusted conformance evidence; this specification does not require full FHIR profile validation during matching.

`profilesFrom[]` identifies profile families by canonical URL. It SHALL be a non-empty array of canonical profile-family URL strings, not a string, object, package descriptor, implementation-guide object, package id/version, registry alias, local topic vocabulary, or URN unless a future version or extension defines that value space. A Wallet/Responder SHALL reject a present `profilesFrom` that is not a non-empty array of strings, and MAY reject non-canonical-URL values. Family membership MAY be determined from local knowledge, FHIR package metadata, implementation-guide definitions, configured mappings, or deployment knowledge.

`resourceTypes[]` identifies official FHIR `resourceType` names. A Requester SHALL NOT use local topic labels or display strings unless they are official FHIR resource type names. With profile selectors, `resourceTypes[]` is an additional resource-type constraint. Without profile selectors, it requests patient-specific FHIR resources of the listed types, subject to Holder decision, accepted media types, FHIR version compatibility, data availability, and policy.

`profiles[]` and `profilesFrom[]` are additive profile selectors. When both are present, a resource satisfies the profile-selector portion if it matches any exact profile in `profiles[]` or any profile belonging to any family in `profilesFrom[]`, subject to `resourceTypes[]` and the rest of the item. A Requester SHALL NOT rely on `profiles[]` to narrow `profilesFrom[]`; a Wallet/Responder SHALL NOT interpret it as narrowing, filtering, enumerating, or limiting the family selector.

If all three selector arrays are omitted, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]`, capability, policy, and Holder decision. A Requester SHOULD avoid this no-selector default unless broad content is safe and clearly explained. A Wallet/Responder MAY fulfill partially and is not required to disclose all available resources.

### 5.4 `form.fhir`

A `form.fhir` selector requests completion of a FHIR Questionnaire and return of an appropriate Artifact, normally a FHIR `QuestionnaireResponse` for `application/fhir+json`:

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "<Questionnaire canonical>",
  "questionnaire": { "resourceType": "Questionnaire" }
}
```

A Requester SHALL set `content.kind` to `"form.fhir"` and include `questionnaireCanonical`, `questionnaire`, or both as direct selector members. `questionnaireCanonical`, if present, SHALL be a non-empty FHIR canonical string and MAY include `|version`. `questionnaire`, if present, SHALL be an inline FHIR `Questionnaire` resource object with `resourceType` `"Questionnaire"`. A `form.fhir` selector SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; existing-resource selection uses a separate `selection.fhir` item.

A Wallet/Responder SHALL reject or report unsupported for a `form.fhir` selector that has neither form field, a non-string/empty canonical, a non-Questionnaire object, or mixed `selection.fhir` fields. A Wallet/Responder MAY resolve `questionnaireCanonical` using a configured resolver, FHIR search, cached content, Holder data source, or other mechanism satisfying Section 5.5. Direct HTTP dereference is permitted only for unversioned canonicals. If the Wallet/Responder cannot resolve, render, or use the Questionnaire, it SHALL report an item outcome under Section 6 rather than fabricating a Questionnaire.

When both fields are supplied, a Requester SHOULD ensure `questionnaireCanonical`, `questionnaire.url`, and `questionnaire.version` are consistent. A Wallet/Responder SHALL NOT silently merge conflicting Questionnaire definitions or silently rewrite the Requester's canonical. Material disagreement SHOULD result in `unsupported` or `error`.

### 5.5 Extension selectors and media types

An extension selector registrant SHALL define exact `content.kind`; JSON shape; clinical meaning; satisfaction rules; interactions with `accept[]`, `fhirVersions[]`, canonicals, item status, and Artifact fulfillment; unsupported/unavailable/partial/declined/error behavior; unknown-member handling; privacy and security considerations; and examples. It SHALL NOT redefine core fields or permit requester identity metadata in the SMART request body unless a future version defines a trust model. A Requester SHALL NOT use unregistered/private extension selectors when interoperable processing by unrelated Wallets/Responders is expected. Unsupported selectors SHALL NOT be guessed from display text.

Version 1.0 core request media types are `application/fhir+json` and `application/smart-health-card`. Extension media types MAY be used only when defined by a registered extension or deployment agreement. An extension media-type registrant SHALL define the media type string, Artifact shape, processing rules, validation rules, security and privacy considerations, FHIR-version handling if any, and compatibility with core media types if any.

### 5.6 FHIR canonical `|version` handling

A Requester MAY include `|version` suffixes where FHIR canonicals are permitted. A processor SHALL parse a canonical into non-empty `url` and optional `version`: `url` is before the first `|`, or the whole string if absent; `version` is after the first `|`, with further `|` characters part of the opaque version string.

Implementations SHALL preserve the original wire canonical exactly for echoing, logging, response construction, test fixtures, returned `Resource.meta.profile`, and generated `QuestionnaireResponse.questionnaire` when that canonical is the Questionnaire identity. Parsing for resolution, routing, grouping, or comparison SHALL NOT by itself rewrite carried or emitted canonicals.

A Wallet/Responder or Verifier resolving a canonical SHALL use a configured resolver, package cache, terminology service, implementation-guide resolver, or FHIR search when available. FHIR endpoint resolution SHALL use `GET [base]/{ResourceType}?url={url}&version={version}` for versioned canonicals and `GET [base]/{ResourceType}?url={url}` for unversioned canonicals. It SHALL select a single resource matching `(url, version)` and SHALL fail resolution if none matches. Direct HTTP dereference of the parsed `url` is permitted only for unversioned canonicals, only when the recipient accepts the served version, and only after post-resolution verification. A processor SHALL NOT satisfy a versioned canonical by stripping `|version` and dereferencing the bare URL.

After resolution, the implementation SHALL verify expected `resourceType`, matching `url`, and matching `version` when requested. Failure is `unsupported` or `error` under Section 6. For versioned `profiles[]`, a Wallet/Responder SHALL NOT report `fulfilled` unless returned `meta.profile` includes the same versioned canonical or equivalent local conformance evidence exists for that exact version; a Verifier SHALL apply the same exact-version check. Local routing, profile-family lookup, de-duplication, and Holder-display grouping MAY ignore `|version` only for those local operations and SHALL NOT affect exact-version resolution, matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation.

## 6. Clinical Response Model

### 6.1 Top-level response and Artifacts

A `SmartHealthCheckinResponse` has this shape:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "<request-id>",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include all five members; SHALL set `type` to `"smart-health-checkin-response"`; SHALL set `version` to `"1"`; and SHALL set `requestId` to the exact `id` from the accepted request. A Verifier SHALL reject absent or different `type` or `version`, unless future compatibility applies, and SHALL reject a `requestId` mismatch by exact string equality. `requestId` is a clinical correlation value, not a freshness proof, identity proof, or clinical fact.

`artifacts` SHALL be an array and MAY be empty if `requestStatus[]` still accounts for every item. Every Artifact SHALL include `id`, `mediaType`, `fulfills`, and the payload fields defined for its media type:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"]
}
```

Artifact `id` SHALL be a non-empty string unique within the response. A Verifier SHALL reject missing, non-string, empty, or duplicate Artifact ids. Artifact ids are scoped to one response and SHALL NOT be treated as patient identifiers, requester identifiers, global document identifiers, or provenance identifiers unless separately established by payload or policy.

Artifact `mediaType` SHALL be a non-empty media type string. Version 1.0 core media types are `application/smart-health-card` and `application/fhir+json`. A Verifier SHALL NOT treat an unrecognized `mediaType` as a generic Artifact merely because it carries a plausible field such as `value`, `url`, or `data`. Extension Artifact types SHALL be branded variants with pinned literals or bounded patterns and typed fields.

`fulfills` SHALL be a non-empty array of request item ids. Each value SHALL exactly equal one original request item `id`. If an Artifact lists multiple items, its `mediaType` SHALL be acceptable for every listed item. A Verifier SHALL reject unresolved, absent, empty, or malformed `fulfills[]` references.

### 6.2 Concrete Artifact variants

A SMART Health Card Artifact SHALL set `mediaType` to `"application/smart-health-card"` and include `value.verifiableCredential` as a non-empty array of SMART Health Card Verifiable Credential JWS strings. A Verifier or receiver that consumes this Artifact SHALL verify and process each JWS according to SMART Health Cards and local trust policy. A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion`; a Verifier SHALL reject one if present.

A raw FHIR JSON Artifact SHALL set `mediaType` to `"application/fhir+json"`, include non-empty `fhirVersion`, and include `value` as a FHIR JSON object. `value` SHALL be either a single FHIR Resource with string `resourceType` or a FHIR Bundle with `resourceType` `"Bundle"` and `entry[]` resources when packaging multiple resources. A Wallet/Responder SHOULD use a Bundle for multiple resources. A Wallet/Responder SHALL interpret all FHIR resources in one raw FHIR Artifact under the Artifact `fhirVersion` and SHALL NOT mix FHIR releases within one Artifact. Different FHIR releases require separate Artifacts or a valid non-fulfillment status. A Verifier SHALL reject absent or non-string `fhirVersion` and SHOULD treat unacceptable FHIR versions as unsupported for ingestion.

Wallets/Responders SHALL preserve FHIR `meta.profile` strings where known, including `|version` suffixes. They SHALL NOT strip or normalize version suffixes from source `meta.profile` strings in raw FHIR Artifacts. Verifiers SHOULD inspect FHIR payload content, especially `meta.profile`, instead of relying on wrapper summaries.

An extension Artifact MAY be returned only when its `mediaType` is accepted by every item in `fulfills[]` and the Wallet/Responder can construct it according to a recognized extension definition. An extension registrant SHALL define exact media type or bounded pattern, branded variant name, fields, payload shape, encoding, dereferencing and integrity rules, FHIR-version handling, status behavior, validation, security, privacy, and compatibility. It SHALL NOT rely on a protocol-level generic carrier or redefine core response fields.

### 6.3 Status and many-to-many fulfillment

`requestStatus[]` SHALL be an array containing exactly one status object for every original request item and no unknown or duplicate item ids:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

A Wallet/Responder SHALL use only `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, or `error` unless a future status-code extension is explicitly supported by the receiving Verifier. `fulfilled` means the Wallet/Responder believes returned Artifact content fully satisfies the item. `partial` means some responsive content was returned without complete-fulfillment claim. `unavailable` means the item was understood and supported but no matching content was available or shareable. `declined` means Holder refusal or Wallet policy implementing Holder preference. `unsupported` means the item, selector, media type, FHIR version, Questionnaire definition, or extension semantics could not be understood or supported enough to attempt fulfillment. `error` means an operational or processing error after understanding the item.

A Wallet/Responder SHALL use these codes according to their definitions. A Verifier SHALL treat unknown status codes as invalid for version 1.0 unless a supported future registry entry applies. `message` MAY provide a concise explanation but SHALL NOT include secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data. Receivers SHALL NOT use `message` to determine normative status semantics.

One Artifact MAY fulfill multiple items, and one item MAY be fulfilled by multiple Artifacts. Every fulfillment edge SHALL satisfy media-type and selector rules. Many-to-many fulfillment does not relax FHIR-version, status, or validation rules. A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry per item. A Verifier SHALL evaluate all Artifacts that list an item in `fulfills[]`.

### 6.4 Verifier cross-validation

A Verifier SHALL validate a SMART response against the original SMART request before Requester or downstream receiver consumption. Shape validation alone is insufficient. The Verifier SHALL reject unless `requestId` matches the original request `id`; `fulfills[]` references resolve; each Artifact `mediaType` is recognized and accepted by every fulfilled item unless a supported compatibility rule applies; `requestStatus[]` covers every item exactly once; raw FHIR Artifacts have non-empty `fhirVersion` and a FHIR object with string `resourceType`; mixed-release raw FHIR Bundles are rejected or quarantined; and SMART Health Card Artifacts have no outer `fhirVersion`.

A Verifier SHOULD inspect returned FHIR `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related content when validating selector responsiveness. A Wallet/Responder SHALL NOT report `fulfilled` for a versioned profile request unless returned `meta.profile` includes that exact versioned canonical or equivalent local conformance evidence exists; a Verifier SHALL require the same evidence. A Verifier SHALL preserve returned `meta.profile` strings exactly and SHALL NOT strip `|version` suffixes to satisfy exact-version requests.

## 7. Trust Framework

### 7.1 Origin and reader trust

Origin trust concerns caller context supplied by the Browser / User Agent or platform. A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body as an origin substitute. A Wallet/Responder SHALL NOT treat `purpose`, item display text, selectors, unknown members, extension members, or Artifact content as authenticated requester identity or origin.

When a platform exposes authenticated web origin, a Wallet/Responder that uses origin trust SHALL use that platform-provided origin for origin display, origin policy, and Section 8 binding. It SHALL NOT derive authenticated origin from SMART request JSON, callback-looking strings, deployment-defined initiation metadata, or Artifact payloads. If origin or privileged-caller context cannot be authenticated, the Wallet/Responder SHALL treat origin trust as absent and SHALL NOT infer requester identity or origin from the SMART request body.

Where platforms expose origin through trusted browsers, privileged callers, app identities, verified links, allow-lists, package identifiers, signing certificates, entitlements, or enterprise configuration, a Wallet/Responder that relies on such evidence SHALL use authenticated platform evidence and Wallet/deployment policy. It SHALL NOT treat reflective allow-lists, demo certificates, arbitrary package labels, or unauthenticated caller strings as production privileged-caller trust unless explicitly accepted by deployment policy.

Reader / Verifier trust authenticates the presentation requester independently of web origin and clinical-source provenance. A Requester or Verifier SHALL NOT place reader identity, organization identity, certificates, trust-framework claims, or signatures inside the SMART request body as a `readerAuth` substitute.

A Verifier MAY include per-`DocRequest.readerAuth`. If present, it SHALL be constructed for the same session and exact requested items, binding the Section 8 `SessionTranscript` and exact `ItemsRequest` bytes, and SHALL NOT be reused. A Wallet/Responder that supports or relies on reader authentication SHALL verify COSE signature, signed context, detached-payload binding, relevant request bytes, protected algorithm and key type, and certificate/public-key evidence under Section 8 and trust policy. It SHALL treat invalid, malformed, mismatched, unsupported, or policy-unacceptable `readerAuth` as failed and SHALL NOT treat mere presence of `readerAuth`, certificate chain, common name, logo, or display string as success. Absent `readerAuth` SHALL remain absent reader authentication; invalid or untrusted `readerAuth` SHALL remain failed reader authentication.

### 7.2 Issuer/device and clinical-source trust

Issuer / device-attestation trust concerns the mdoc presentation container. A Verifier SHALL apply Section 8 issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence, and SHALL then apply Section 6.6.

A Verifier or deployment profile SHALL define trust-anchor policy for MSO issuer signatures when issuer trust is required. A Verifier relying on mdoc issuer evidence SHALL validate issuer signature, certificate path or key evidence, digest bindings, document type, namespace, disclosed element identifiers, validity constraints, and policy. It SHALL NOT treat a syntactically valid MSO, matching digest, valid signature against an included leaf certificate, or self-signed issuer certificate as production issuer trust unless accepted by policy. A Verifier SHALL verify device-key proof bound to the same `SessionTranscript` before treating the presentation as device-bound, and SHALL NOT accept transport validity if device proof fails or disclosed element digest binding fails.

A deployment profile MAY permit self-attested wallet evidence only with explicit assurance labeling. A Verifier, Requester, or Wallet/Responder SHALL NOT label self-attested evidence as externally issuer-accredited or production issuer-trusted unless policy supports that claim. Self-attestation does not relax request parsing, response validation, id matching, fulfillment/status coverage, media-type checks, FHIR-version checks, or same-device validation.

Clinical-source trust concerns evidence about where returned clinical content came from. A Verifier or receiver SHALL evaluate it according to Artifact media type, payload signatures or provenance, selectors, FHIR evidence, SMART Health Card rules, extension rules, and deployment policy. It SHALL NOT infer clinical-source provenance from successful transport alone. For SMART Health Card Artifacts, it SHALL verify every JWS and evaluate signed payload content against the original request and policy. For raw FHIR JSON, it SHALL treat `fhirVersion` as FHIR release context, not source proof, and SHALL treat content as patient-mediated unless separate accepted provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof exists.

### 7.3 Identifier scope and deployment policy

Identifiers are scoped correlation values unless their defining payload, binding, Artifact payload, or deployment policy gives broader meaning. A Requester, Wallet/Responder, Verifier, deployment profile, or trust-framework operator SHALL preserve identifier scopes and SHALL NOT treat an identifier from one layer as proof or authorization for another unless explicitly defined. Request ids, item ids, Artifact ids, presentation-session values, origins, certificate subjects, nonces, URL tokens, relay identifiers, and completion identifiers do not replace each other.

SMART Health Check-in defines hooks and validation responsibilities for layered trust, not a universal production trust framework. A deployment profile adding trust requirements SHALL document constrained roles and layers; accepted anchors, registries, allow-lists, certificate policies, source-provenance mechanisms, and assurance labels; freshness/replay/status expectations; missing or failed evidence handling; downstream behavior when clinical-source, patient-match, local-ingestion, or workflow policy is not satisfied; and Holder-facing display rules. It SHALL NOT redefine clinical request or response semantics.

## 8. Same-device Presentation Flow

### 8.1 Identifiers and request construction

Version 1.0 same-device presentation uses these fixed values:

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested and disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

A Verifier SHALL use these values exactly. It SHALL carry the SMART request only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic element names, deployment-defined initiation wrapper fields, archived claim-name experiments, or other locations as version 1.0 request carriers. A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`.

A Verifier SHALL serialize the Section 5 SMART request as UTF-8 JSON text and place it as a CBOR text string in `requestInfo`. It SHALL construct an `ItemsRequest` equivalent to:

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

The `true` value is mdoc `intentToRetain`. A Verifier SHALL default it to `true` because check-in commonly ingests or routes returned Artifacts. A Verifier MAY set it to `false` only when it truly intends ephemeral use and deployment policy permits that signal. The flag does not override Holder choice, Wallet policy, law, privacy requirements, or downstream retention policy. A Verifier SHALL NOT model FHIR profiles, request items, questionnaires, Artifact media types, status codes, or clinical resources as separate mdoc elements in the core flow.

A Verifier SHALL CBOR-encode `ItemsRequest` and wrap those bytes in CBOR tag 24 before placing it in `DocRequest.itemsRequest`. It SHALL construct a `DeviceRequest` with version exactly `"1.0"` and a `docRequests` array containing the SMART Health Check-in `DocRequest`. Version 1.0 uses per-`DocRequest.readerAuth` when reader authentication is present; a Verifier SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core mechanism unless a future version or deployment profile defines it.

If `readerAuth` is included, a Verifier SHALL construct a detached `COSE_Sign1` using ES256 (`alg` `-7`) over:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The protected header SHALL include `{1: -7}`. The serialized `COSE_Sign1` payload SHALL be `null`. The COSE signature input SHALL be the `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as detached payload. `readerAuth` SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate. A Verifier SHALL compute it for the exact `SessionTranscript` and exact `ItemsRequestBytes` used, and SHALL NOT reuse it across sessions, origins, encryption information, SMART request serializations, or requested element sets.

For each request, a Verifier SHALL generate or select an HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256), and SHOULD use a fresh key pair per session. The public key in `encryptionInfo` SHALL be a COSE_Key for EC2 P-256 with kty EC2 (`1: 2`), crv P-256 (`-1: 1`), and x/y coordinates (`-2`, `-3`).

`encryptionInfo` SHALL be CBOR for:

```text
encryptionInfo = [
  "dcapi",
  {
    "nonce": <fresh unpredictable bytes>,
    "recipientPublicKey": <P-256 COSE_Key>
  }
]
```

The nonce SHALL be fresh unpredictable bytes; implementations SHOULD use at least 16 bytes. A Verifier SHALL retain the matching private key and exact `encryptionInfo` CBOR bytes until response processing completes or the session is abandoned. It SHALL base64url-encode CBOR `DeviceRequest` and CBOR `encryptionInfo` without padding and preserve the exact `encryptionInfo` base64url string.

### 8.2 `SessionTranscript` and Wallet request handling

Both sides SHALL compute the same direct `dcapi` `SessionTranscript` bytes. Let `encryptionInfoBase64Url` be the exact unpadded base64url string from the request. Let `origin` be the authenticated origin value, or deployment-approved privileged-caller origin-equivalent, supplied by the Browser / User Agent or platform.

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

A Wallet/Responder SHALL obtain `origin` from an authenticated Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It SHALL NOT derive `origin` from SMART request JSON, display text, selector URLs, request ids, deployment-defined initiation metadata, callback-looking strings, or Artifact contents. The same transcript bytes SHALL be used for optional `readerAuth` verification, `DeviceAuthentication`, HPKE response encryption, HPKE opening, and device-signature verification. If origin or origin-equivalent is unavailable, the Wallet/Responder SHALL treat origin trust as absent. If it cannot construct the transcript required for this flow, it SHALL fail the presentation or proceed only under an explicit deployment profile defining the serialized origin-equivalent input and assurance level.

A Wallet/Responder receiving a candidate direct `org-iso-mdoc` request SHALL, before response construction: confirm protocol `org-iso-mdoc`; decode `data.deviceRequest` and parse CBOR `DeviceRequest`; require version `"1.0"`; locate tag-24 `DocRequest.itemsRequest`; preserve exact tag-24 bytes; decode `ItemsRequest`; require docType `org.smarthealthit.checkin.1`; require namespace `org.smarthealthit.checkin` requesting `smart_health_checkin_response`; recover `intentToRetain`; recover `requestInfo["org.smarthealthit.checkin.request"]` as a string; parse it as UTF-8 JSON and validate Section 5; decode and validate `data.encryptionInfo` as direct `"dcapi"` with P-256 recipient key; and recompute the transcript.

If SMART request JSON is absent, not a string, unparsable, non-object, or invalid under Section 5, the Wallet/Responder SHALL reject, report failure through the platform mechanism, or fail safely. It SHALL NOT infer clinical request semantics from mdoc element names, display strings, archived dynamic-element encodings, unknown request fields, or deployment-defined wrappers. If `readerAuth` is present and supported or relied on, the Wallet/Responder SHALL verify the detached `COSE_Sign1`, protected algorithm, `ReaderAuthenticationBytes`, transcript, exact tag-24 `ItemsRequestBytes`, signature, `x5chain`, and deployment trust policy; it SHALL distinguish absent, syntactically invalid, cryptographically failed, valid but untrusted, and trusted states.

After request and trust processing, the Wallet/Responder SHALL run Holder review or equivalent Holder-control processing at request-item granularity, preserve item ids, and SHALL NOT treat `required: true` as consent or SMART request display fields as authenticated requester identity.

### 8.3 Response construction and encryption

A Wallet/Responder that proceeds SHALL construct a Section 6 SMART response with `requestId` equal to the accepted request `id`, serialize it as UTF-8 JSON text, and create an `IssuerSignedItem` equivalent to:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": JSON.stringify(SmartHealthCheckinResponse)
}
```

It SHALL CBOR-encode the item, wrap it in CBOR tag 24, place it in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`, and compute the MSO value digest over the complete tag-24-wrapped bytes. `IssuerSignedItem.digestID` SHALL match the corresponding key in `MSO.valueDigests["org.smarthealthit.checkin"]`.

The Wallet/Responder SHALL construct an MSO whose `docType` is `org.smarthealthit.checkin.1`, `digestAlgorithm` is `SHA-256`, `valueDigests` cover the disclosed stable item, and `deviceKeyInfo.deviceKey` identifies the device public key used for device authentication. It SHALL sign the MSO as `issuerAuth` using `COSE_Sign1` with ES256 (`alg` `-7`).

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same session using the transcript, docType, and tag-24-wrapped `DeviceNameSpaces` bytes:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element is issuer-signed and SHALL NOT be moved into `DeviceNameSpaces` as a substitute carrier. The Wallet/Responder SHALL produce a device `COSE_Sign1` using ES256 (`alg` `-7`) and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`. It SHALL construct a `DeviceResponse` version `"1.0"` with successful status, the SMART document, issuer-signed namespace item, `issuerAuth`, device-signed namespaces, and device signature as constrained by Appendix C.

The Wallet/Responder SHALL encrypt CBOR `DeviceResponse` plaintext to the recipient public key from `encryptionInfo` using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, empty `aad`, and plaintext `CBOR(DeviceResponse)`. It SHALL wrap HPKE output as:

```text
dcapiResponse = [
  "dcapi",
  {
    "enc": <HPKE enc bstr>,
    "cipherText": <HPKE ciphertext bstr>
  }
]
```

It SHALL base64url-encode CBOR `dcapiResponse` bytes without padding and return a Digital Credentials API result with protocol `org-iso-mdoc` and `data.response`. It SHALL NOT return plaintext `DeviceResponse`, plaintext SMART response JSON, a different `dcapiResponse` carrier, non-empty HPKE AAD, or another HPKE suite.

### 8.4 Verifier response processing

A Verifier SHALL process the Digital Credentials API result before passing clinical content to the Requester or receiver. It SHALL require returned protocol `org-iso-mdoc`; require `data.response` as unpadded base64url; decode and parse CBOR `dcapiResponse`; require direct shape `["dcapi", {"enc": bstr, "cipherText": bstr}]`; reconstruct expected transcript; HPKE-open with retained private key, required suite, `info = SessionTranscript`, and empty AAD; reject if opening fails; parse CBOR `DeviceResponse`; require version `"1.0"` and successful status; locate document `docType` `org.smarthealthit.checkin.1`; verify `issuerAuth`, MSO, issuer evidence, validity, device key, and issuer policy; locate the stable issuer-signed item; recompute digest over exact tag-24 item bytes; verify device signature over expected `DeviceAuthentication`; require `elementValue` string; parse it as Section 6 SMART response JSON; and apply Section 6.6 against the original request.

A Verifier SHALL reject or quarantine the presentation response if HPKE opening, mdoc issuer/MSO validation, value-digest validation, device authentication, stable response element extraction, SMART response validation, or Section 6.6 cross-validation fails. HPKE success, origin binding, reader authentication, issuer/MSO validation, device-key proof, syntactic SMART response validity, and SMART Health Card verification are separate trust decisions.

## 9. Security, Privacy, Registries, and Internationalization

### 9.1 Security

A Verifier MUST NOT accept plaintext `DeviceResponse`, plaintext SMART response JSON, a substituted HPKE suite, or a response whose HPKE context is not bound to the expected Section 8 transcript. A Wallet/Responder or Verifier SHALL NOT downgrade version 1.0 ciphertexts to plaintext transport, substitute encryption context, or treat successful decryption as sufficient clinical validation. Section 8 cryptographic inputs and outputs SHALL remain separate from deployment-local transport, storage, diagnostic, or handoff mechanisms.

Freshness is supplied by same-device session mechanisms, not by request ids, item ids, Artifact ids, or deployment handoff ids. A Verifier SHOULD use fresh HPKE recipient key material and fresh nonce per session; profiles permitting reuse need replay, correlation, retention, and key-compromise handling.

Origin evidence comes from an authenticated platform channel, not SMART request JSON, launch URLs, `purpose`, item text, selector URLs, logos, common names, or Artifacts. Wallet UIs SHOULD distinguish authenticated trust signals from unauthenticated request text. Scanning a QR code, opening a link, or clicking a page button is not Holder consent.

A Wallet/Responder that supports or relies on reader authentication SHALL verify signature, detached-payload binding, protected algorithm, signing key, certificate/key evidence, transcript, exact request bytes, and deployment policy before treating the reader as authenticated. It SHALL NOT treat mere presence of `readerAuth`, `x5chain`, names, logos, `kid`, launch URLs, or demo certificates as authentication.

A Verifier SHALL complete Section 8 mdoc validation and apply Section 7 issuer/device policy before claiming production issuer trust. mdoc issuer/device evidence, HPKE opening, `readerAuth`, origin binding, and exact `requestId` matching do not prove production issuer accreditation, patient matching, clinical correctness, clinical-source provenance, downstream authorization, or EHR write-back permission. Implementations SHALL reject unsupported or unexpected algorithm labels rather than downgrade or substitute defaults.

Implementations SHOULD minimize plaintext requests, responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, Section 8 plaintext, HPKE values, private keys, Wallet secrets, bearer URLs, launch URLs, QR images, and validation clues except under controlled diagnostics. A fixture or support bundle containing live PHI, production private keys, bearer credentials, or unredacted clinical content is a security incident, not a conformance artifact. A Wallet/Responder SHALL validate the Section 8 request and perform Holder review or equivalent Holder-control at item granularity before disclosure unless an explicit deployment profile defines another mechanism and assurance level.

### 9.2 Privacy

A Requester SHOULD request the minimum content needed. Selectors, display text, profile URLs, resource types, Questionnaire text, media types, and FHIR version lists can disclose sensitive context. A Wallet/Responder SHALL preserve item ids and provide Holder review or equivalent Holder-control at request-item granularity before disclosure. It MAY group, summarize, reorder, translate, or suppress details for accessibility, safety, localization, or policy, but SHALL NOT hide multiple items, broad selectors, response forms, retention signals, or advisory `required` flags in a way that defeats meaningful Holder control.

Selective disclosure occurs through item boundaries, Wallet policy, Holder decisions, Artifact construction, `accept[]`, `fulfills[]`, and per-item status. The Section 8 binding carries one stable mdoc element, not one element per FHIR profile, Questionnaire, item, resource, or Artifact. A Wallet/Responder SHOULD construct the smallest set of Artifacts that accurately satisfies approved items and accepted response forms.

Parties SHOULD avoid reusing identifiers across unrelated sessions, Verifiers, or Holders, and SHOULD NOT embed patient account numbers, MRNs, insurance member ids, contact details, appointment ids, staff ids, clinic ids, source document ids, predictable sequences, secrets, or clinical facts in request ids, item ids, Artifact ids, telemetry ids, or logs unless explicitly required and protected by deployment policy.

A Wallet/Responder MAY display request fields as context but SHALL NOT label them as verified requester identity, authenticated origin, trusted reader identity, clinical-source provenance, legal authority, or consent text unless established by a selected trust layer. The Section 8 `intentToRetain` default is `true`; it is a retention signal, not consent or legal authorization. Sensitive categories and telemetry SHALL be handled with minimization, local policy, and applicable law; routine telemetry SHOULD NOT include plaintext protocol payloads, clinical content, private keys, bearer URLs, full ciphertext blobs, full launch URLs, full QR images, or unredacted sensitive stack traces except under controlled diagnostic, fixture, audit, or incident-response procedures.

### 9.3 Registries

SMART Health Check-in uses exact, case-sensitive media type strings in `items[].accept[]` and `artifacts[].mediaType` unless a future registered extension defines otherwise. Core media types are `application/fhir+json` and `application/smart-health-card`; the core Artifact union contains only these. Future Artifact media-type registrations SHALL define exact media type or bounded pattern, payload fields, encoding, dereferencing and integrity rules, FHIR-version semantics if any, validation, status interaction, security, privacy, and compatibility, and SHALL NOT introduce a generic catch-all branch.

The version 1 same-device binding uses `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request` exactly. Future incompatible carrier changes SHOULD use a new profile identifier and, when necessary, new `docType` suffix.

The status-code registry contains `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`. A Wallet/Responder SHALL use only these unless a future extension is explicitly supported by the receiving Verifier; a Verifier SHALL treat unknown codes as invalid unless supported. The selector-kind registry contains `selection.fhir` and `form.fhir`. A Requester SHALL use one of these or a registered extension selector for interoperable processing; a Wallet/Responder SHALL NOT infer unsupported selector semantics from display text, profile labels, local topics, deployment metadata, or requester identity metadata.

Profile identifiers name conformance, deployment, fixture, certification, or future-binding rule sets. They are not SMART request fields, selectors, media types, status codes, request presets, IPS shortcuts, or topic labels. A profile identifier SHALL NOT be placed inside a SMART request to bypass selectors, `accept[]`, response validation, trust processing, or same-device validation. Registry changes use designated expert review unless a future governance process or external registry defines stricter review. The expert SHOULD reject entries that redefine existing fields, introduce requester identity into the SMART request body, turn profile ids into selectors, rely on local topic shortcuts, require plaintext intermediaries, weaken Holder control or validation, conflate identifiers, treat demo keys as production trust anchors, or overclaim provenance for unsigned raw FHIR JSON from transport success.

### 9.4 Internationalization

Internationalization applies to human-readable display text such as `purpose`, item `title`, item `summary`, `requestStatus[].message`, Questionnaire text, FHIR display strings, prompts, warnings, recovery text, and extension display fields. Protocol identifiers and machine values are not localized, including request/response ids, item ids, Artifact ids, selector kinds, canonicals, resource types, media types, status codes, mdoc identifiers, algorithm labels, and deployment-local launch identifiers.

SMART Health Check-in 1.0 does not define `lang`, `locale`, `Accept-Language`, language maps, negotiated-locale members, or locale parameters in the request, response, or same-device binding. An implementation SHALL NOT rely on unknown members, browser language, launch URL parameters, or HTTP headers as interoperable locale-negotiation signals unless a future version, registered extension, or deployment profile defines that behavior. If a Wallet/Responder translates, summarizes, groups, reorders, or suppresses display text, it SHALL preserve protocol values used for construction and validation.

Producers of new human-readable display text SHOULD emit Unicode NFC. A Requester, Wallet/Responder, Verifier, or receiver SHALL NOT apply Unicode normalization, case folding, accent folding, width folding, confusable-character mapping, BIDI reordering, transliteration, translated aliases, or locale-sensitive collation to make distinct protocol identifiers or constants compare equal. Display normalization SHALL NOT change bytes or code points used for cryptographic inputs, canonical preservation, audit records, or byte-exact fixtures. UIs SHOULD isolate untrusted display text from adjacent labels, origins, identifiers, URLs, trust indicators, warnings, and action buttons.

## Appendix A. Conformance checklist

This checklist indexes testable obligations defined elsewhere in SMART Health Check-in 1.0. It does not create independent requirements. Rows for optional features, optional targets, or optional deployment constraints apply only to implementations claiming that feature, target, profile, or deployment constraint, even when the source section uses `SHALL` or `SHOULD` for that claimed feature.

| ID | Target | Level | Section | Checklist item | Evidence/validation |
| --- | --- | --- | --- | --- | --- |
| A-001 | Requester / Verifier | SHALL | §4.1.1 | Identify each claimed target, feature/profile, specification version, and deployment profile. | Claim lists target, optional features, version, and policy dependencies. |
| A-002 | Holder Wallet / Responder | SHALL | §4.1.2 | Validate SMART requests under §5 before response construction and preserve item ids for `fulfills[]` and `requestStatus[].item`. | Malformed requests fail safely; valid responses reference original item ids exactly. |
| A-003 | Deployment/profile author | SHALL | §4.1.3 | State constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations without redefining core semantics. | Profile maps added rules to targets and sections; no base semantic override. |
| A-004 | Conformance/fixture author | SHALL | §4.1.3 | Derive tests and fixtures from normative sections and identify target, feature set, section, expected outcome, comparison mode, and demo trust status. | Fixture/test manifest records pass/fail criteria, comparison mode, PHI/test-key status. |
| A-005 | Requester / Verifier | SHALL | §5.1 | Encode SMART requests as RFC 8259 JSON and UTF-8 when serialized by a transport. | Parser/serializer tests reject invalid UTF-8, comments, trailing commas, non-JSON values, and non-object roots. |
| A-006 | Holder Wallet / Responder | SHALL | §5.1.1 | Reject unparsable or non-object SMART requests under the selected transport encoding rules. | Negative corpus includes arrays, strings, null roots, malformed JSON, and encoding errors. |
| A-007 | Holder Wallet / Responder | SHALL | §5.1.2 | Reject duplicate object member names detected during SMART request parsing or validation. | Duplicate-key fixture is rejected rather than accepted by first/last-wins behavior. |
| A-008 | Requester / Verifier | SHALL | §5.2 | Include request `type`, `version`, `id`, and `items`; set `type` to `smart-health-checkin-request` and `version` to `1`. | Schema/procedural validation verifies required top-level members and constants. |
| A-009 | Holder Wallet / Responder | SHALL | §5.2.1 | Reject requests whose `type` is absent or not exactly `smart-health-checkin-request`. | Case-sensitive discriminator mutation tests fail. |
| A-010 | Holder Wallet / Responder | SHALL | §5.2.2 | Reject requests whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-011 | Requester / Verifier | SHALL | §5.2.3 | Generate a non-empty opaque request `id` unique among that Requester's requests for the same check-in session. | Construction tests check non-empty session-local ids and no patient/requester meaning. |
| A-012 | Holder Wallet / Responder | SHALL | §5.2.3 | Preserve request `id` for later `SmartHealthCheckinResponse.requestId` construction. | Response construction asserts exact string equality to original request id. |
| A-013 | Requester / Verifier | SHALL | §5.2.4 | Use `purpose`, when present, only as Holder-facing workflow context, not requester identity, trust, consent, or authorization. | Request and UI review separate `purpose` from authenticated trust display. |
| A-014 | Requester / Verifier | SHOULD | §5.2.5 | Include `fhirVersions[]` when accepting `application/fhir+json` unless any conforming FHIR version can be safely processed. | Raw-FHIR-capable requests declare supported FHIR releases or document broad capability. |
| A-015 | Holder Wallet / Responder | SHOULD | §5.2.5 | Use `fhirVersions[]` when choosing raw FHIR JSON versions, subject to Holder decision, capability, data, and policy. | Response selection evidence shows version preference handling or justified inability. |
| A-016 | Requester / Verifier | SHALL | §5.2.6 | Encode `items` as an array of request items. | Request schema/procedural validation covers item array shape. |
| A-017 | Holder Wallet / Responder | SHALL | §5.2.6 | Process `items[]` as Holder-review and response-accounting granularity while preserving item ids even if display is grouped or reordered. | UX/state tests show per-item outcomes and exact ids in response. |
| A-018 | Requester / Verifier | SHALL NOT | §5.2.7 | Do not include self-asserted requester identity, origin, reader, certificate, callback, logo, deployment handoff, or trust metadata in the SMART request body. | Generated requests and extension fields contain no prohibited identity/trust metadata. |
| A-019 | Holder Wallet / Responder | SHALL | §5.2.7 | Do not treat any SMART request body field as authenticated requester identity. | UI/trust tests distinguish request text from origin, reader, deployment, or presentation evidence. |
| A-020 | Requester / Verifier | SHALL | §5.3 | Include item `id`, `title`, `content`, and non-empty `accept[]` on every request item. | Request validation rejects missing required item fields and empty `accept[]`. |
| A-021 | Requester / Verifier | SHALL | §5.3.1 | Use non-empty item ids and avoid duplicates within one SMART request. | Request validation rejects empty, non-string, or duplicate item ids. |
| A-022 | Holder Wallet / Responder | SHALL | §5.3.1 | Reject requests with missing, non-string, empty, or duplicate item ids. | Negative item-id fixtures fail before response construction. |
| A-023 | Holder Wallet / Responder | SHALL | §5.3.1 | Compare item ids by exact string equality. | Cross-validation rejects normalized, case-folded, localized, or transformed id variants. |
| A-024 | Requester / Verifier | SHALL | §5.3.2 | Provide non-empty Holder-facing `title` on every item and do not use it as requester identity. | Request review flags missing/empty title and identity-like title misuse. |
| A-025 | Requester / Verifier | SHALL | §5.3.4 | Treat `required` only as advisory workflow context, not consent, authorization, or a disclosure command. | Required items can still produce declined, partial, unavailable, unsupported, or error outcomes. |
| A-026 | Holder Wallet / Responder | SHALL | §5.3.4 | Treat omitted `required` as `false` and never use `required: true` to bypass Holder control or Wallet policy. | Holder-review tests allow refusal or non-fulfillment for required items. |
| A-027 | Requester / Verifier | SHALL | §5.3.5 | Order `accept[]` from most preferred to least preferred and list only media types the Requester can parse, validate, and route. | Request catalog maps each accepted media type to receiver support. |
| A-028 | Holder Wallet / Responder | SHALL | §5.3.5 | Do not return an Artifact for an item unless its `mediaType` appears in that item's `accept[]` or a supported compatibility rule applies. | Response construction rejects or status-reports unaccepted media types. |
| A-029 | Requester / Verifier | SHALL | §5.3.6 | Include `content` as a selector object with string `content.kind` on every request item. | Validator rejects missing/malformed selectors. |
| A-030 | Holder Wallet / Responder | SHALL | §5.3.6 | Do not infer unsupported selector semantics from display text or unrelated fields. | Unknown `content.kind` yields rejection or `unsupported`, not guessed fulfillment. |
| A-031 | Requester / Verifier | SHALL | §5.4 | Use a selector shape defined by §5 or a registered extension selector for interoperable processing. | Generated requests use core or registered selector kinds only. |
| A-032 | Holder Wallet / Responder | SHALL | §5.4 | Evaluate selector semantics independently per request item while allowing §6 many-to-many Artifact fulfillment. | Tests show per-item status plus valid shared Artifacts where allowed. |
| A-033 | Requester / Verifier | SHALL | §5.4.1 | For `selection.fhir`, set `kind` exactly and encode `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, when present, as arrays of strings. Do not include `form.fhir` fields in the same selector. | Shape tests reject scalar/object selector fields and mixed form/resource-selection fields. |
| A-034 | Requester / Verifier | SHALL | §5.4.1.2 | Encode `profilesFrom` as a non-empty array of canonical profile-family URL strings, not a string, package descriptor, alias, local topic, or URN. | Negative tests include stale scalar/package/local-topic encodings. |
| A-035 | Holder Wallet / Responder | SHALL | §5.4.1.2 | Reject a present `profilesFrom` member that is not a non-empty array of strings. | Selector validation fails invalid `profilesFrom` shapes. |
| A-036 | Holder Wallet / Responder | SHALL | §5.4.1.3 | Treat `resourceTypes[]` as official FHIR resource-type constraints, not local topic labels. | Matching tests require listed FHIR `resourceType` values. |
| A-037 | Holder Wallet / Responder | SHALL | §5.4.1.4 | Treat `profiles[]` and `profilesFrom[]` as additive profile selectors, not narrowing selectors. | Matching accepts resources matching either exact profile or profile-family membership. |
| A-038 | Requester / Verifier | SHALL NOT | §5.4.1.4 | Do not rely on `profiles[]` to narrow a broader `profilesFrom[]` request. | Request review flags examples/tests assuming intersection semantics. |
| A-039 | Requester / Verifier | SHOULD | §5.4.1.5 | Avoid no-selector `selection.fhir` requests unless broad patient-specific FHIR content is safe and clearly explained. | Broad selector review checks workflow justification and Holder-facing text. |
| A-040 | Holder Wallet / Responder | MAY | §5.4.1.5 | Satisfy no-selector `selection.fhir` items with patient-specific FHIR resources compatible with `accept[]`, policy, and Holder choice. | Broad-selector tests show allowed partial fulfillment and no full-export requirement. |
| A-041 | Requester / Verifier | SHALL | §5.4.2 | For `form.fhir`, set `content.kind` to `form.fhir` and include at least one of `questionnaireCanonical` or `questionnaire` directly on the selector. Do not include `selection.fhir` fields in the same selector. | Validation accepts the form selector shape and rejects mixed form/resource-selection shapes. |
| A-042 | Holder Wallet / Responder | SHALL | §5.4.2 | Reject or report unsupported for `form.fhir` selectors with neither `questionnaireCanonical` nor `questionnaire`, non-string/blank `questionnaireCanonical`, non-Questionnaire `questionnaire`, or mixed `selection.fhir` fields. | Negative form fixtures produce rejection or `unsupported`. |
| A-043 | Holder Wallet / Responder | SHALL NOT | §5.4.2.4 | Do not silently merge conflicting Questionnaire `questionnaireCanonical` and inline `questionnaire` definitions or rewrite canonical identity. | Conflict tests yield `unsupported` or `error`, not silent merge. |
| A-044 | Deployment/profile author | SHALL | §5.4.3 | Define extension selector kind string, JSON shape, clinical meaning, fulfillment, validation, unsupported behavior, security, privacy, and examples. | Extension registration checklist covers all required fields. |
| A-045 | Requester / Verifier | SHALL | §5.5 | Apply canonical version-suffix handling rules for each operation it performs, preserving exact wire strings where required. | Tests preserve exact strings for transport/fixtures and compare at defined normalization levels. |
| A-046 | Holder Wallet / Responder | SHALL | §5.5 | Resolve canonicals with a configured resolver or FHIR canonical search when versioned, verify returned `(resourceType, url, version)`, and use direct HTTP dereference only for unversioned canonicals. | Resolver tests reject version-mismatched resources and do not direct-fetch versioned canonicals by stripping a version suffix. |
| A-047 | Holder Wallet / Responder | SHALL | §5.5 | Preserve requested Questionnaire canonical in generated `QuestionnaireResponse.questionnaire` when known. | Questionnaire response fixtures retain canonical version suffixes when provided. |
| A-048 | Holder Wallet / Responder | SHALL NOT | §5.5 | Do not remove canonical version suffixes from returned FHIR `meta.profile` values or exact-version profile evidence merely due to routing or grouping. | Raw FHIR fixtures preserve versioned `meta.profile` values. |
| A-049 | Requester / Verifier | SHALL | §5.6 | Encode each `accept[]` as a non-empty ordered array of media type strings and use order as preference. | Request validation preserves order and finds no separate preference field. |
| A-050 | Holder Wallet / Responder | SHOULD | §5.6 | Choose the earliest acceptable media type it can produce when response forms are otherwise equivalent. | Media negotiation tests or policy review show preference-order handling. |
| A-051 | Holder Wallet / Responder | SHALL | §6.1 | Include response `type`, `version`, `requestId`, `artifacts`, and `requestStatus`; set constants to `smart-health-checkin-response` and `1`. | Response schema/procedural validation covers top-level fields and constants. |
| A-052 | Requester / Verifier | SHALL | §6.1.1 | Reject responses whose `type` is absent or not exactly `smart-health-checkin-response`. | Negative discriminator tests fail. |
| A-053 | Requester / Verifier | SHALL | §6.1.2 | Reject responses whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-054 | Holder Wallet / Responder | SHALL | §6.1.3 | Set response `requestId` to the exact accepted SMART request `id`. | Response construction tests assert exact equality. |
| A-055 | Requester / Verifier | SHALL | §6.1.3 | Reject a SMART response whose `requestId` does not exactly equal the original SMART request `id`. | Cross-validation test mutates `requestId`. |
| A-056 | Holder Wallet / Responder | SHALL | §6.2 | Include Artifact `id`, `mediaType`, non-empty `fulfills[]`, and the payload fields defined by that Artifact media type on every Artifact. | Response validation rejects missing common fields and payload shapes not defined for the media type. |
| A-057 | Holder Wallet / Responder | SHALL NOT | §6.2.1 | Do not reuse the same Artifact `id` within one SMART response. | Duplicate Artifact-id validation fails. |
| A-058 | Requester / Verifier | SHALL | §6.2.1 | Reject duplicate, missing, non-string, or empty Artifact ids. | Negative Artifact-id fixtures fail. |
| A-059 | Holder Wallet / Responder | SHALL | §6.2.2 | Use `mediaType` as the Artifact clinical response form, not a separate Artifact-level protocol `type`. | Artifact fixtures use `mediaType` for clinical form. |
| A-060 | Holder Wallet / Responder | SHALL | §6.2.3 | Set every `fulfills[]` value to exactly one original request item id. | Response construction forbids unknown or empty fulfillment references. |
| A-061 | Requester / Verifier | SHALL | §6.2.3 | Reject unresolved, absent, empty, or non-string `fulfills[]` references. | Cross-validation rejects unknown or malformed fulfillment references. |
| A-062 | Requester / Verifier | SHALL | §6.2.4 | Do not infer dereferencing, decoding, signature, freshness, integrity, or generic carrier semantics from field names alone. | Extension Artifact tests require media-type-defined payload and processing rules. |
| A-063 | Holder Wallet / Responder | SHALL | §6.3.1 | For `application/smart-health-card`, include non-empty `value.verifiableCredential[]` and no outer Artifact `fhirVersion`. | Artifact validation rejects missing VC list or outer `fhirVersion`. |
| A-064 | Requester / Verifier | SHALL | §6.3.1 | Verify and process each SMART Health Card JWS according to SMART Health Cards and local trust policy. | SHC validation/trust tests run on each `verifiableCredential[]` JWS. |
| A-065 | Holder Wallet / Responder | SHALL | §6.3.2 | For `application/fhir+json`, include non-empty `fhirVersion` and FHIR JSON `value` as a Resource or Bundle. | Artifact validation rejects absent `fhirVersion` and non-FHIR object payloads. |
| A-066 | Holder Wallet / Responder | SHALL NOT | §6.3.2 | Do not mix resources requiring different FHIR releases within one `application/fhir+json` Artifact. | Mixed-release content is split or status-reported, not mixed in one Artifact. |
| A-067 | Requester / Verifier | SHOULD | §6.3.2 | Treat raw FHIR `fhirVersion` not acceptable for the original request or receiver as unsupported for ingestion. | Receiver policy checks requested FHIR versions before ingestion. |
| A-068 | Deployment/profile author | SHALL | §6.3.3 | Define extension Artifact media types as branded variants with pinned media type, typed payload fields, validation, FHIR-version handling, status behavior, security/privacy, and compatibility. | Extension registration includes all required processing and validation rules and does not rely on `GenericArtifact`. |
| A-069 | Holder Wallet / Responder | SHALL | §6.4.1 | Include exactly one `requestStatus[]` entry for every original request item and no unknown or duplicate item ids. | Response tests compare status item set exactly to request item id set. |
| A-070 | Requester / Verifier | SHALL | §6.4.1 | Reject a SMART response unless `requestStatus[]` covers every request item exactly once with no unknown item ids. | Cross-validation tests missing, duplicate, and unknown status items. |
| A-071 | Holder Wallet / Responder | SHALL | §6.4.2 | Use only v1.0 status codes unless a supported future status-code extension applies. | Status validation rejects codes outside `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`. |
| A-072 | Holder Wallet / Responder | SHALL | §6.4.2 | Use `unsupported`, `unavailable`, `declined`, `partial`, `fulfilled`, and `error` according to defined item-outcome semantics. | Outcome tests cover unsupported format, unavailable data, Holder refusal, partial sharing, full fulfillment, and processing errors. |
| A-073 | Holder Wallet / Responder | SHALL NOT | §6.4.3 | Do not put secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data in `requestStatus[].message`. | Message lint/review inspects status messages. |
| A-074 | Requester / Verifier | SHALL | §6.4.3 | Do not rely on localized `message` text to determine normative status semantics. | Receivers process `status` code, not message text. |
| A-075 | Holder Wallet / Responder | MAY | §6.5 | Return one Artifact for multiple items or multiple Artifacts for one item only when every fulfillment edge satisfies media-type and selector rules. | Many-to-many tests validate each `fulfills[]` edge independently. |
| A-076 | Requester / Verifier | SHALL | §6.6 | Apply full request/response cross-validation before treating a response as protocol-valid; shape validation alone is insufficient. | Harness validates against original request, not response schema alone. |
| A-077 | Requester / Verifier | SHALL | §6.6.3 | Enforce that each Artifact `mediaType` is accepted by every fulfilled item unless a supported registered compatibility rule applies. | §6.6 validation rejects unaccepted media types. |
| A-078 | Requester / Verifier | SHALL | §6.6.5 | For raw FHIR JSON, verify `fhirVersion`, FHIR object shape, Bundle interpretation, and no mixed FHIR releases in one Artifact. | Raw FHIR cross-validation/quarantine tests cover each condition. |
| A-079 | Requester / Verifier | SHOULD | §6.6.6 | Inspect returned FHIR `resourceType`, `meta.profile`, Bundle entries, and `QuestionnaireResponse.questionnaire` when assessing selector responsiveness. | FHIR-aware validation or quarantine policy evaluates payload evidence. |
| A-080 | Requester / Verifier | SHALL | §7 | Preserve trust-layer separation among origin, reader, issuer/device, clinical-source, and deployment policy. | Trust report records separate pass/fail/unknown state for each layer. |
| A-081 | Holder Wallet / Responder | SHALL | §7.1.1 | Use platform-provided authenticated origin or approved origin-equivalent for origin trust, not SMART request fields or deployment handoff metadata. | Origin-binding tests reject request-body origin substitutes. |
| A-082 | Holder Wallet / Responder | SHALL | §7.1.3 | Treat origin trust as absent when web origin or privileged-caller context cannot be authenticated. | Missing-origin tests produce absent-origin state or defined flow failure. |
| A-083 | Requester / Verifier | MAY | §7.2.1 | Include optional per-`DocRequest.readerAuth` for same-device requests. | If present, request bytes include detached `COSE_Sign1` bound to §8 inputs. |
| A-084 | Requester / Verifier | Conditional | §7.2.1 | If including `readerAuth`, construct it for the same presentation session and exact requested items; do not reuse across sessions, transcripts, or `ItemsRequest` bytes. | ReaderAuth vectors bind signature to exact `SessionTranscript` and tag-24 `ItemsRequest`. |
| A-085 | Holder Wallet / Responder | Conditional | §7.2.1 | If supporting or relying on `readerAuth`, verify COSE signature, signed context, detached payload binding, relevant bytes, algorithm/key evidence, and trust policy. | Validation distinguishes absent, malformed, failed, valid-untrusted, and trusted states. |
| A-086 | Holder Wallet / Responder | SHALL | §7.2.3 | Treat absent `readerAuth` as absent reader authentication and invalid/untrusted `readerAuth` as failed authentication. | Policy/UI tests do not display failed or absent readerAuth as trusted. |
| A-087 | Requester / Verifier | SHALL | §7.3 | Complete §8 mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence. | Verifier tests fail on invalid MSO, digest, device signature, transcript, or HPKE opening. |
| A-088 | Requester / Verifier | SHALL | §7.3.1 | Apply issuer trust-anchor policy before claiming production mdoc issuer trust. | Validation report shows issuer signature/path/key evidence and policy result. |
| A-089 | Requester / Verifier | SHALL | §7.3.2 | Verify device-key proof bound to the expected presentation session before treating mdoc presentation as device-bound. | DeviceAuthentication tests fail on wrong `SessionTranscript` or device key. |
| A-090 | Requester / Verifier | SHALL | §7.4 | Evaluate clinical-source trust from Artifact media type, signatures/provenance, selectors, FHIR evidence, and deployment policy; do not infer provenance from transport success. | Raw FHIR and SHC provenance are recorded separately from mdoc validation. |
| A-091 | Requester / Verifier | SHALL | §7.4.1 | For SMART Health Card Artifacts, verify every VC JWS and evaluate payload content against original selectors and local policy. | SHC verifier logs signature/trust plus selector evaluation. |
| A-092 | Requester / Verifier | SHALL | §7.4.2 | Treat raw `application/fhir+json` as patient-mediated unless accepted separate provenance, signature, source attestation, authenticated retrieval, or equivalent proof is present. | Workflow policy does not equate raw FHIR with SHC or signed source evidence. |
| A-093 | Requester / Verifier | SHALL | §7.5 | Preserve identifier scopes and do not use an identifier from one layer as proof or authorization for another. | Tests distinguish request id, item ids, Artifact ids, and presentation-session values. |
| A-094 | Deployment/profile author | SHALL | §7.6 | Document mandatory trust layers, accepted anchors/registries, freshness/replay expectations, failure handling, assurance levels, and Holder display rules. | Deployment profile includes trust policy matrix and failure behavior. |
| A-095 | Requester / Verifier | Optional-profile | §8.1 | For direct same-device support, use `org-iso-mdoc`, `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request` exactly. | Wire capture matches all fixed identifiers. |
| A-096 | Holder Wallet / Responder | Optional-profile | §8.1 | Carry the SMART response only as `smart_health_checkin_response` `elementValue` in namespace `org.smarthealthit.checkin`. | mdoc response inspection rejects dynamic elements and alternate carriers. |
| A-097 | Requester / Verifier | SHALL | §8.2 | Serialize the SMART request as UTF-8 JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. | DeviceRequest fixture shows CBOR text string, not CBOR map or base64 JSON. |
| A-098 | Requester / Verifier | SHALL | §8.2.2 | Construct `ItemsRequest` with version-1 docType, namespace, stable response element, requestInfo, and `intentToRetain` behavior. | Byte-ladder or decoded request verifies logical shape and retention flag. |
| A-099 | Requester / Verifier | SHALL | §8.2.3 | CBOR-encode `ItemsRequest` and wrap those bytes in CBOR tag 24 in `DocRequest.itemsRequest`. | Fixture comparison checks tag-24 boundary. |
| A-100 | Requester / Verifier | SHALL | §8.2.4 | Use `DeviceRequest.version` exactly `1.0`; do not use v1.1 `readerAuthAll` as core v1.0 reader authentication. | DeviceRequest tests reject `readerAuthAll` for core profile. |
| A-101 | Requester / Verifier | Conditional | §8.2.4 | If including `readerAuth`, construct detached ES256 `COSE_Sign1` over tag-24 `ReaderAuthentication` with payload `null`, empty external AAD, protected alg `-7`, exact transcript/request bytes, and label 33 `x5chain`. | ReaderAuth vector verifies payload null, alg `-7`, label 33 certificate evidence, and signature input. |
| A-102 | Requester / Verifier | SHOULD | §8.2.5 | Use a fresh HPKE recipient key pair and fresh unpredictable nonce for each presentation session. | Session tests show new nonce/key per request or documented profile for reuse. |
| A-103 | Requester / Verifier | SHALL | §8.2.5 | Generate/select HPKE P-256 recipient key material and construct `encryptionInfo = ["dcapi", {nonce, recipientPublicKey}]`. | Decoded `encryptionInfo` has direct dcapi shape and P-256 COSE_Key. |
| A-104 | Requester / Verifier | SHALL | §8.2.6 | Base64url-encode `DeviceRequest` and `encryptionInfo` CBOR bytes without padding and preserve exact `encryptionInfo` string. | DC API request fixture checks unpadded strings and exact transcript input. |
| A-105 | Requester / Verifier | SHALL | §8.3 | Compute `SessionTranscript` from exact `encryptionInfoBase64Url` and authenticated origin as the direct `dcapi` handover. | Byte-ladder recomputes `dcapiInfo`, SHA-256 handover, and transcript bytes. |
| A-106 | Holder Wallet / Responder | SHALL | §8.3 | Obtain origin from authenticated platform or approved origin-equivalent, never from SMART request fields or deployment handoff metadata. | Wallet trace records authenticated origin source and rejects fallback substitutions. |
| A-107 | Holder Wallet / Responder | SHALL | §8.4 | Validate the `org-iso-mdoc` request wrapper, `DeviceRequest`, tag-24 `ItemsRequest`, requestInfo SMART request, `encryptionInfo`, and transcript before response construction. | Wallet-side validation checklist passes; malformed wrappers fail safely. |
| A-108 | Holder Wallet / Responder | SHALL | §8.4 | Perform Holder review or equivalent Holder-control processing at request-item granularity and preserve item ids. | UX/policy evidence shows per-item accounting and no `required`-as-consent behavior. |
| A-109 | Holder Wallet / Responder | SHALL | §8.5 | Place SMART response JSON text as `elementValue` of issuer-signed `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. | DeviceResponse inspection locates the stable issuer-signed element. |
| A-110 | Holder Wallet / Responder | SHALL | §8.5.2 | Construct MSO with docType `org.smarthealthit.checkin.1`, SHA-256 digest algorithm, value digest covering the stable element, and deviceKeyInfo. | mdoc validation verifies MSO fields, digest binding, and issuerAuth. |
| A-111 | Holder Wallet / Responder | SHALL | §8.5.3 | Produce device authentication bound to the same `SessionTranscript`, docType, and tag-24 `DeviceNameSpaces`. | Device signature fixture validates payload and MSO device key. |
| A-112 | Holder Wallet / Responder | SHALL | §8.6 | Encrypt CBOR `DeviceResponse` with HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty AAD. | HPKE tests reject plaintext, wrong suite, wrong info, or non-empty AAD. |
| A-113 | Requester / Verifier | SHALL | §8.7 | Decode and HPKE-open `dcapiResponse`, validate DeviceResponse, issuer/MSO, digest, device proof, stable element, SMART response, and §6.6 before acceptance. | Verifier checklist covers all §8.7 steps and rejection on failure. |
| A-114 | Requester / Verifier | SHALL | §8.8 | Reject or quarantine if HPKE, mdoc issuer/MSO, digest, device-authentication, stable-element, SMART response, or §6.6 validation fails. | Negative vectors for each failure path do not reach workflow acceptance. |
| A-115 | Conformance/fixture author | SHOULD | Companion material | Classify same-device fixture roots and byte ladders without inventing alternate carriers or clinical semantics. | Fixture metadata marks conformance candidate, diagnostic, historical, regression, or illustrative status. |
| A-116 | Requester / Verifier | SHALL | §9.1 | Keep same-device HPKE and other presentation cryptographic contexts separate. | Tests fail when keys, recipients, info/transcripts, AAD, or ciphertext fields are substituted across contexts. |
| A-117 | Holder Wallet / Responder | SHALL | §9.1 | Do not downgrade active v1.0 same-device response encryption to plaintext or alternate HPKE context. | Transport tests reject plaintext `DeviceResponse` and substituted suite/info/AAD. |
| A-118 | Requester / Verifier | SHOULD | §9.1 | Use flow-specific freshness controls and do not treat request ids, item ids, Artifact ids, or deployment handoff ids as freshness proofs. | Replay tests distinguish correlation ids from freshness evidence. |
| A-119 | Holder Wallet / Responder | SHALL | §9.1 | Do not treat mere presence of `readerAuth`, `x5chain`, names, logos, or demo certificates as successful reader authentication. | ReaderAuth policy requires cryptographic verification and trust evaluation. |
| A-120 | Requester / Verifier | SHALL | §9.1 | Do not treat mdoc issuer/device evidence, HPKE opening, readerAuth, or request-id matching as production issuer accreditation or clinical-source provenance by themselves. | Trust report separates issuer/device evidence from production trust and clinical provenance. |
| A-121 | Requester / Verifier | SHALL | §9.1 | Reject unsupported or unexpected algorithm labels for the v1.0 profile instead of downgrading or substituting library defaults. | Algorithm mutation tests fail closed for wrong COSE/HPKE labels. |
| A-122 | Requester / Verifier | SHOULD | §9.1 | Minimize collection, display, and retention of plaintext requests, responses, FHIR, SHCs, private keys, secrets, and full ciphertext except controlled diagnostics. | Logging/debug review redacts or disables sensitive plaintext outside controlled fixtures. |
| A-123 | Requester / Verifier | SHOULD | §9.2 | Request the minimum clinical or administrative content needed for the bounded check-in workflow. | Request review favors narrow items, selectors, media types, and FHIR versions. |
| A-124 | Holder Wallet / Responder | SHALL | §9.2 | Provide Holder review or equivalent Holder-control at request-item granularity before disclosing content. | UX/policy evidence shows item-level control and meaningful disclosure choices. |
| A-125 | Holder Wallet / Responder | SHOULD | §9.2 | Construct the smallest set of Artifacts that accurately satisfies approved items and accepted response forms. | Response packaging review avoids unrelated over-disclosure. |
| A-126 | Requester / Verifier | SHALL | §9.2 | Do not imply clinical-source provenance for unsigned raw FHIR from mdoc, HPKE, Artifact ids, `fulfills[]`, `requestId`, or Holder approval. | Provenance assessment requires separate accepted evidence. |
| A-127 | Requester / Verifier | SHOULD | §9.2 | Avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and avoid embedding patient/requester/secrets/clinical facts in ids. | Identifier generation and logs show scoped, non-identifying values. |
| A-128 | Requester / Verifier | SHOULD | §9.2 | Do not send plaintext protocol payloads, clinical content, private keys, bearer URLs, full ciphertext blobs, or unredacted sensitive stack traces to routine telemetry. | Telemetry review confirms redaction, aggregation, sampling, or controlled diagnostic handling. |
| A-129 | Requester / Verifier | SHALL | §9.3 | Compare media/content-type strings by exact, case-sensitive equality unless a future registered extension defines otherwise. | Media type mutation tests fail by default. |
| A-130 | Holder Wallet / Responder | SHALL | §9.3 | Do not claim Artifact fulfillment unless `mediaType` appears in the fulfilled item's `accept[]`, except for supported registered compatibility rules. | Response construction enforces exact media-type acceptance. |
| A-131 | Requester / Verifier | SHALL | §9.3 | Use mdoc/DC API identifiers exactly and do not treat external registry registration as already complete unless it is. | Conformance report uses exact values and marks provisional/external status accurately. |
| A-132 | Holder Wallet / Responder | SHALL | §9.3 | Use only core status codes in v1.0 unless a future status-code extension is explicitly supported by the receiver. | Unknown status codes are absent or extension-scoped. |
| A-133 | Holder Wallet / Responder | SHALL | §9.3 | Do not infer unsupported selector semantics from display text, profile labels, local topics, deployment handoff metadata, or requester identity metadata. | Unsupported-kind tests yield rejection or `unsupported`. |
| A-134 | Deployment/profile author | SHALL | §9.3 | Do not use profile identifiers as SMART request fields, selectors, Artifact media types, status codes, request presets, or substitutes for §5 selectors and `accept[]`. | Profile review rejects `requestProfile`, preset, IPS, all-of-the-above, and topic-label shortcuts. |
| A-135 | Deployment/profile author | SHALL | §9.3 | Use designated expert review before treating new status codes, selector kinds, branded Artifact media types, profile ids, payload kinds, or mdoc changes as interoperable registrations. | Registry change record includes expert review and required metadata. |
| A-136 | Requester / Verifier | SHALL | §9.4 | Do not localize protocol identifiers or machine values, including request/response ids, item ids, media types, status codes, canonicals, and mdoc ids. | Localization tests preserve exact machine values. |
| A-137 | Requester / Verifier | SHALL | §9.4 | Do not rely on unknown members, deployment handoff parameters, browser language, or HTTP headers as interoperable locale-negotiation signals. | Locale tests find no core `lang`, `locale`, `Accept-Language`, or negotiated-locale behavior. |
| A-138 | Holder Wallet / Responder | SHOULD | §9.4 | Render or process FHIR language/localization according to FHIR version, implementation guide, and local clinical-display policy. | FHIR display tests follow applicable FHIR i18n behavior. |
| A-139 | Holder Wallet / Responder | SHALL | §9.4 | If display text is translated, summarized, grouped, reordered, or suppressed, preserve protocol values used for construction and validation. | UX tests show exact ids, selectors, media types, fulfillment links, and status codes preserved. |
| A-140 | Requester / Verifier | SHALL | §9.4 | Do not use Unicode normalization, case folding, accent folding, BIDI reordering, translation, or locale collation to make distinct protocol identifiers compare equal. | Identifier comparison tests remain exact across Unicode variants. |
| A-141 | Holder Wallet / Responder | SHOULD | §9.4 | Isolate untrusted display text from adjacent labels, identifiers, URLs, trust indicators, warnings, and action buttons for BIDI safety. | UI review covers `purpose`, item text, Questionnaire text, FHIR displays, and messages. |

---

## Appendix B. JSON Schema for `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`

This appendix provides JSON Schema snippets for the transport-neutral SMART request and SMART response objects defined in §§5-6. The snippets are intended for structural validation, fixture review, and conformance-test scaffolding. They do not define mdoc carriage, registry behavior, full FHIR validation, SMART Health Card validation, or downstream clinical ingestion policy.

If a schema rule in this appendix appears to conflict with §§5-6, §§5-6 control. Normative language in this appendix either restates §§5-6 or is scoped to conformance with these Appendix B schema snippets.

### B.1 Dialect and validation model

The schema snippets use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A validator that claims conformance to Appendix B SHALL evaluate these snippets using JSON Schema 2020-12 semantics, or a later dialect only when that dialect is known to preserve the semantics of the keywords used here.

The snippets intentionally keep core extension points open. Unknown members are not made schema errors solely by Appendix B, because §§5-6 allow forward-compatible unknown members and registered extension selectors. Registered extension Artifact media types are represented by additional or profiled schemas rather than by a generic core catch-all. Deployment profiles MAY publish stricter schemas, but those schemas must identify their additional constraints rather than silently changing the core protocol.

JSON Schema validation is not complete SMART Health Check-in validation. A Verifier still applies the request/response, FHIR, SMART Health Card, transport, trust, and deployment-policy checks required elsewhere in the specification. Section B.4 summarizes important checks that are not fully expressible in these standalone schemas.

The request schema requires `items[]` but does not set `minItems: 1`, because §5.2.6 currently says a Requester SHOULD include at least one request item and leaves any hard prohibition on zero-item requests to later schema/conformance closure.

### B.2 `SmartHealthCheckinRequest` schema

The request schema fixes the top-level `type` and `version`, requires the top-level fields from §5.2, validates the item shape from §5.3, and validates the two core selector shapes from §5.4 while leaving room for registered extension selector kinds.

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
- `profiles[]` and `profilesFrom[]` are independently allowed in the same `selection.fhir` selector. Their combined presence is additive under §5.4.1.4; the schema does not make either array narrow the other.
- `profiles[]` and `resourceTypes[]`, when present, are arrays with at least one string. Whether a `resourceTypes[]` value is an official FHIR `resourceType` for a particular FHIR release is a FHIR-aware procedural check.
- A `selection.fhir` selector may omit all of `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to express the no-selector default from §5.4.1.5.
- A `form.fhir` selector is a single object shape with one or both of the sibling members `questionnaireCanonical` and `questionnaire`. It does not allow `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; use a separate `selection.fhir` request item when existing FHIR resource selection is also needed.
- Canonical strings MAY include a `|version` suffix. Consumers parse the suffix as structured FHIR canonical-reference version metadata and do not treat it as part of a direct HTTP URL.
- The extension-selector branch permits syntactic validation of registered extension selector kinds without embedding a future registry in Appendix B. A core-only deployment profile can replace this branch when it intentionally rejects all extension selectors.
- The SMART request body SHALL NOT carry requester identity metadata under §5.2.7. This schema cannot reliably reject arbitrary identity-like unknown or extension members while keeping extension points open, so processors must enforce that prohibition procedurally and through extension review.

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
| QuestionnaireResponse comparison | A Verifier may need to compare `QuestionnaireResponse.questionnaire` with a requested `form.fhir` selector's `questionnaireCanonical`, inline `questionnaire.url`/`questionnaire.version`, and §5.5 structured `|version` handling. |
| Raw FHIR release consistency | The schema can require an outer `fhirVersion`, but detecting mixed-release Bundles and deciding whether a raw FHIR Artifact's release is acceptable requires FHIR-aware and request-aware checks. |
| SMART Health Card payload validation | The schema can check the wrapper's `verifiableCredential[]` shape, but JWS verification, payload inspection, issuer trust, FHIR version, and selector responsiveness are SMART Health Cards and policy checks. |
| Full FHIR profile validation | FHIR profile, terminology, invariant, Questionnaire, and implementation-guide validation require FHIR validators and deployment policy outside the core JSON Schema. |
| Limits not fixed by §§5-6 | Maximum string lengths, array sizes, byte sizes, URL dereferencing behavior, and extension payload limits belong to transport profiles, extension registrations, conformance tooling, or deployment policy unless later normative text fixes them. |

### B.5 Illustrative validation flow

The following sequence is illustrative. It shows where Appendix B schema validation fits relative to other validation; it is not a new transport binding or implementation API.

1. Parse JSON using RFC 8259 rules and reject duplicate object member names when detected.
2. Validate the SMART request against the B.2 request schema.
3. Apply §5 procedural checks, including duplicate request-item id detection, registered extension-selector handling, and requester-identity metadata review.
4. Validate the SMART response against the B.3 response schema.
5. Apply §6.6 cross-validation against the original request: exact `requestId` match, `fulfills[]` reference resolution, per-item `accept[]` compatibility, exact `requestStatus[]` coverage, and FHIR-version checks.
6. Apply FHIR, SMART Health Card, QuestionnaireResponse, transport, trust, security, privacy, and deployment-policy checks as applicable.

---

## Appendix C. Same-device CDDL and profile constraints

This appendix gives profile constraints and diagnostic pseudo-CDDL for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended to make SMART Health Check-in byte boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The profile reuses ISO/IEC 18013-5 mdoc, COSE, COSE_Key, CBOR, and HPKE structures. ISO/IEC 18013-5 and the referenced COSE/HPKE specifications own the base structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key`. This appendix constrains only SMART Health Check-in profile portions: fixed identifiers, carriers, tag-24 boundaries, direct `dcapi` wrappers, HPKE context, and the stable SMART response element.

The snippets below are profile pseudo-CDDL. They use field names and byte-boundary names from §8 and the companion byte-ladder material. They are not a complete replacement for ISO/IEC 18013-5 CDDL, and they do not claim exactness for ISO map labels or optional fields not confirmed by the active profile. If this appendix conflicts with §8, §8 controls.

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

A Verifier, Wallet/Responder, or Verifier-side processor that implements the same-device profile SHALL apply the §8 constraints restated in this appendix when producing or consuming the corresponding structures.

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

A Verifier that includes `readerAuth` SHALL construct a detached `COSE_Sign1` with protected header `{1: -7}` for ES256, serialized payload `null`, empty external AAD in the COSE `Signature1` structure, and `reader-authentication-bytes` as the detached payload. It SHALL include reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Wallet/Responder acceptance of a certificate chain, trust anchor, revocation status, key usage, display name, or organizational assurance label is deployment-policy work under §7.

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

The `elementValue` text string contains a SMART response conforming to §6. Its `requestId`, `artifacts[]`, `fulfills[]`, media types, FHIR version fields, SMART Health Card payloads, and `requestStatus[]` are validated under §6 and §6.6, not by mdoc CDDL alone.

### C.8 MSO value digest, `issuerAuth`, and device authentication

The Mobile Security Object and `issuerAuth` are ISO/IEC 18013-5 and COSE structures. This profile constrains these relationships:

- `MSO.docType` is `org.smarthealthit.checkin.1`.
- `MSO.digestAlgorithm` is `SHA-256` for the core profile.
- `MSO.valueDigests["org.smarthealthit.checkin"][digestID]` corresponds to the disclosed `IssuerSignedItem.digestID`.
- The value-digest input is the complete tag-24-wrapped `IssuerSignedItem` bytes, not only the inner map, not only `elementValue`, and not diagnostic notation.
- `MSO.deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.
- `issuerAuth` is a `COSE_Sign1` using ES256 (`alg` `-7`) over the MSO payload form required by §8 and the selected ISO-compatible encoding.

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

Appendix C identifies expected carriers and byte boundaries, but it cannot by itself establish trust or clinical validity. A Verifier accepting a same-device response SHALL perform the §8.7 and §8.8 checks: decode the JSON wrapper, HPKE-open using the expected transcript, parse `DeviceResponse`, validate `issuerAuth`, validate the MSO and digest binding, validate device authentication, extract the SMART response JSON string from the stable issuer-signed item, validate it under §6, and apply §6.6 cross-validation against the original SMART request.

Successful mdoc parsing, HPKE opening, digest validation, issuer evidence, device signature validation, optional reader authentication, or `requestId` matching does not create clinical-source provenance for unsigned raw FHIR JSON. Source trust for raw FHIR JSON, SMART Health Cards, provenance-bearing FHIR, or other Artifact forms remains governed by §7.4 and the Artifact evidence itself.

The following exactness issues are intentionally unresolved here and should be closed by §9.1, §9.3, Appendix A, a deployment profile, or a future fixture-vector profile before being treated as pass/fail conformance requirements:

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

- BCP 14, RFC 2119, and RFC 8174: requirement keywords.
- RFC 8259: JSON.
- RFC 8949: CBOR.
- RFC 8610: CDDL.
- RFC 9052 and related COSE specifications.
- RFC 9180: HPKE.
- RFC 7515: JWS, as used by SMART Health Cards.
- ISO/IEC 18013-5 mdoc structures.
- W3C Digital Credentials API, including direct `org-iso-mdoc` presentation behavior.
- HL7 FHIR R4 (4.0.1) and applicable FHIR canonical, `Questionnaire`, `QuestionnaireResponse`, Resource, Bundle, and `meta.profile` semantics.
- SMART Health Cards, including Verifiable Credential JWS processing and trust policy.

### Informative references

- OpenID for Verifiable Presentations (OpenID4VP), reserved for future SMART Health Check-in binding work.
- IETF Digital Credentials Query Language (DCQL), for future alignment discussion.
- US Core and CARIN implementation guides, as examples of FHIR profile families and exact profile canonicals.
- ISO/IEC 18013-5 mDL annex and implementation material, for mdoc compatibility background.

### Companion material

Companion material for this draft is expected to live with the specification project at `https://github.com/smart-health-cards/smart-health-checkin-mdoc` or a successor publication repository. Companion material can include worked examples, fixtures, real-platform captures, byte ladders, diagrams, FHIR mapping notes, implementation guidance, historical experiments, and SDK scaffolding. Companion material is useful for implementation and testing, but it does not override this Markdown specification.
