# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

Short title: **SMART Health Check-in 1.0**. Suggested citation label: **SHC-Checkin-1.0**. Suggested document identifier: `smart-health-checkin-1.0`.

**Editorial approach:** This candidate uses maximum safe compression. It consolidates duplicated informative prose into compact tables and checklists; removes lengthy examples, diagrams, fixture listings, byte ladders, and platform recipes to companion implementation/fixtures material; and retains normative requirements, conformance targets, constants, registries, validation rules, JSON Schema, CDDL, and same-device crypto/wire details.

Status: editor's draft for implementer review. Version: 1.0 draft. Publication date, editors, contributors, final IPR statement, copyright owner, and change log are to be supplied before publication. Example identifiers, URLs, names, organizations, and clinical data are illustrative unless stated as fixed protocol values.

---

## 1. Introduction

### 1.1 Scope and layers

SMART Health Check-in 1.0 defines patient-mediated check-in. A Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receives a structured SMART response. Version 1.0 has two normative layers:

1. the transport-neutral clinical request/response JSON model (§§5-6); and
2. same-device direct `org-iso-mdoc` over the W3C Digital Credentials API (§§7-8).

The clinical model defines request items, Holder-facing purpose and item text, accepted media types, selectors, returned Artifacts, fulfillment links, and per-item status. Presentation transports can add origin, reader/Verifier information, encryption, freshness, device evidence, routing metadata, and validation; they do not change request item semantics, selector meaning, consent granularity, Artifact media types, fulfillment semantics, or status semantics.

In-person QR, NFC, deep-link, pointer, relay, submission, and completion mechanisms are deployment-defined ways to land a Holder on a same-device Verifier page. They are not a separate v1.0 protocol layer.

### 1.2 Out of scope

This specification does not define issuance, credential refresh, issuer accreditation, Wallet enrollment, longitudinal Wallet storage, EHR write-back, downstream reconciliation or persistence, identity proofing, patient matching, guardianship/delegation/proxy authority, payments, eligibility, claims, benefit determination, prior authorization submission, arbitrary FHIR search, graph traversal, CDS logic, replacement FHIR APIs, QR/NFC/deep-link wire formats, relay/submission/completion protocols, kiosk-specific request languages, production trust frameworks, or a required OID4VP binding. Returned content can be valid under this protocol while still being incomplete, stale, untrusted, clinically unsuitable, or unacceptable to downstream workflow.

### 1.3 Conventions and references

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** are interpreted as described in BCP 14, RFC 2119 and RFC 8174, only when they appear in all capitals. Requirements for optional features apply only to implementations claiming the feature or deployment profiles requiring it.

JSON uses RFC 8259 and UTF-8 when serialized as text or bytes. CBOR uses RFC 8949; CDDL uses RFC 8610; COSE uses RFC 9052/9053; HPKE uses RFC 9180; JWS uses RFC 7515. Byte operations are over exact serialized bytes, not Markdown, diagnostic notation, wrapped text, hex display, or re-encoded base64url unless a section explicitly says textual representation is input. Base64url means unpadded unless stated otherwise. Literal JSON examples contain parseable JSON only.

Normative references: RFC 2119, RFC 8174, RFC 7515, RFC 8259, RFC 8610, RFC 8949, RFC 9052, RFC 9053, RFC 9180, ISO/IEC 18013-5, W3C Digital Credentials API, FHIR R4, and SMART Health Cards.

### 1.4 Terminology

| Term | Meaning |
| --- | --- |
| Artifact | Response object with `id`, `mediaType`, `fulfills[]`, and media-type-defined payload. |
| Clinical content model | Transport-neutral SMART request/response JSON in §§5-6. |
| Holder | Person whose information is requested and who controls disclosure. |
| Holder data source | Wallet-internal/deployment-specific clinical data source; issuance/sync/storage are out of scope. |
| Requester | Relying party constructing the SMART request and consuming the SMART response. |
| Verifier | Presentation role packaging the request, invoking same-device `org-iso-mdoc`, opening/validating the presentation, extracting the SMART response, and applying §6.6. |
| Wallet / Responder | Holder-controlled software that validates a request, applies Holder control and policy, gathers/constructs Artifacts, and returns a SMART response. |
| Item / request item | One `items[]` entry; unit of Holder review, selector, accepted media, fulfillment, and status. |
| FHIR canonical | FHIR canonical URL, optionally with `|version` where allowed. |
| Profile | Exact FHIR `StructureDefinition` canonical used in `profiles[]`. |
| Profile family | Canonical URL identifying an implementation guide/publication/collection used in `profilesFrom[]`. |
| Profile-selector additivity | `profiles[]` and `profilesFrom[]` broaden acceptable profile matches; neither narrows the other. |
| Same-device presentation flow | v1.0 W3C Digital Credentials API direct `org-iso-mdoc` flow on the Holder's device. |
| SMART request | `SmartHealthCheckinRequest` (§5); no requester identity metadata. |
| SMART response | `SmartHealthCheckinResponse` (§6); binds to request by `requestId`, reports item statuses, and carries Artifacts. |

---

## 2. Purpose, problem statement, and design goals

SMART Health Check-in supports same-device patient portal check-in, in-person handoffs that load a same-device Verifier page, pre-visit intake, insurance verification, and focused health-summary sharing. Generic credential presentation does not by itself define a FHIR-native request vocabulary, item-level Holder review, accepted clinical media types, fulfillment links, or per-item outcomes.

Goals are transport-neutral clinical content, per-item Holder control, FHIR-native selectors, many-to-many fulfillment, multi-EHR/multi-Wallet interoperability, and layerable trust. Non-goals are listed in §1.2 and do not alter conformance.

---

## 3. Architectural overview

The clinical content domain is the SMART request/response JSON. The presentation transport domain is the API envelope, cryptographic binding, origin/reader context, routing, and validation artifacts that carry or protect those JSON objects. These domains are related but not interchangeable.

High-level same-device flow: Requester constructs §5 request; Verifier packages it into §8 direct `org-iso-mdoc`; Browser/User Agent invokes Wallet; Wallet validates, performs Holder review/policy, and constructs §6 response; Wallet returns encrypted mdoc/DC API response; Verifier validates §8 and §6.6 before Requester use. QR/NFC/deep-link handoffs only load the page that runs this flow.

---

## 4. Conformance

A conformance claim SHALL identify target(s), claimed feature/profile, specification version, and deployment profile. One product MAY implement multiple targets and SHALL satisfy each claimed target and feature.

| Target | Core obligations |
| --- | --- |
| Requester | Construct §5 requests and request only Artifact media types it can process for the item. |
| Verifier | Package requests for a claimed flow, validate presentation artifacts, extract the SMART response, and apply §6.6 before Requester use. Direct same-device Verifiers SHALL satisfy §8. |
| Holder Wallet / Responder | Validate §5 requests before response construction, process items as Holder-review/accounting granularity, preserve item ids, construct §6 responses, and set `requestId` to request `id`. Direct same-device Wallets SHALL satisfy §8. |
| Deployment/profile author | State constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations without redefining core semantics. |
| Conformance/fixture author | Derive tests from normative sections and identify target, feature set, section, expected outcome, comparison mode, and demo/test trust status. |

A Requester/Verifier SHALL keep clinical fields distinct from trust evidence and SHALL NOT put requester identity, organization metadata, web origin, reader credentials, deployment handoff metadata, callbacks, trust assertions, or production trust-anchor claims in the SMART request body. A Wallet/Responder SHALL NOT treat `purpose`, item text, selector URLs, unknown request members, deployment metadata, demo strings, or Artifact contents as authenticated requester identity unless established outside the request body.

The mandatory core is the §5 request and §6 response model for claimed clinical roles. Direct same-device presentation in §§7-8 is the normative live presentation layer for implementations claiming live SMART Health Check-in 1.0 presentation support. Optional features apply only when claimed or required by a deployment profile and include `readerAuth`, stricter trust policy, extension selectors, extension Artifact media types, compatibility rules, future status-code extensions, stricter schemas, fixture profiles, and future bindings.

| Identifier kind | Value |
| --- | --- |
| SMART request discriminator | `smart-health-checkin-request` |
| SMART response discriminator | `smart-health-checkin-response` |
| SMART model version | `1` |
| Core selector kinds | `selection.fhir`, `form.fhir` |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` |
| Direct DC API protocol id | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| mdoc stable element | `smart_health_checkin_response` |
| SMART request carrier key | `org.smarthealthit.checkin.request` |

Human-readable conformance labels are `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and reserved `smart-health-checkin-oid4vp-reserved`. Labels are not in-band request fields. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, preset, IPS shortcut, topic label, profile-family shortcut, or negotiation metadata to bypass §5 selectors, §5 `accept[]`, §6 validation, §7 trust, or §8 validation.

Implementations SHALL interpret each layer's version marker at that layer and SHALL NOT substitute one layer's version for another. Breaking changes require a new version/profile/specification revision when they alter existing request/response fields, selector semantics, Artifact media-type rules, fulfillment/status accounting, same-device carriers, trust-layer separation, or required validation outcomes.

Extensions are explicit and additive. Selector extensions SHALL define exact `content.kind`, JSON shape, clinical meaning, fulfillment, interactions with `accept[]`, `fhirVersions[]`, canonicals, status, validation, unsupported behavior, security, privacy, and examples. Artifact media-type extensions SHALL define pinned media type or bounded pattern, typed payload, dereferencing/integrity, FHIR-version semantics, validation, status behavior, security, privacy, and compatibility; they SHALL NOT rely on `GenericArtifact`. Status-code extensions SHALL NOT be used in v1.0 unless explicitly supported by the receiving Verifier.

---

## 5. Clinical content - request

The SMART request is the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, to share bounded content. The body is not requester identity, consent record, persistent authorization grant, or transport transcript.

### 5.1 Encoding rules

A SMART request SHALL be an RFC 8259 JSON object; serialized text/bytes SHALL be UTF-8. Requesters SHALL NOT include comments, trailing commas, duplicate object names, `NaN`, `Infinity`, `-Infinity`, non-JSON values, or JSON numbers for identifiers, versions, booleans, arrays, media types, canonicals, or display strings. Wallets/Responders or Verifiers SHALL reject non-object, unparsable, and detected-duplicate-member requests. Object order has no clinical meaning. `fhirVersions[]` and `accept[]` are preference-ordered; `items[]` is preferred display/workflow order. Unknown members MAY be ignored only when they do not change known required-member meaning; unknown `content.kind` is an extension selector, not ignorable.

### 5.2 `SmartHealthCheckinRequest`

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "request-id",
  "purpose": "holder-facing purpose",
  "fhirVersions": ["4.0.1"],
  "items": []
}
```

| Member | Requirement and semantics |
| --- | --- |
| `type` | Required; exactly `smart-health-checkin-request`. Wallet/Responder SHALL reject absent/non-exact. |
| `version` | Required; exactly `1` for v1.0. Not FHIR or transport version. Wallet/Responder SHALL reject absent/non-`1` unless future compatibility applies. |
| `id` | Required non-empty opaque Requester-generated id, unique among that Requester's requests for the same check-in session. Wallet/Responder SHALL preserve for `requestId`. It is not patient id, requester id, freshness proof, authorization, or clinical fact. |
| `purpose` | Optional string for Holder-facing workflow context only. Requester SHALL NOT use it for identity, origin, branding, contact URL, legal attestation, proof of authority, consent, trust, or persistent authorization. Wallet/Responder MAY display but SHALL NOT treat as authenticated identity/trust. |
| `fhirVersions[]` | Optional ordered array of FHIR release-version strings. If present, Requester SHALL encode strings most to least preferred. Requester accepting `application/fhir+json` SHOULD include at least one release unless it can safely process any conforming returned version. Wallet/Responder SHOULD use it for raw FHIR version choice, subject to Holder decision, data, capability, policy, and `accept[]`. |
| `items[]` | Required array; Requester SHOULD include at least one item. Wallet/Responder SHALL process items as Holder-review/accounting granularity and preserve item ids even when display is grouped/summarized/reordered. |

Requester SHALL NOT include self-asserted requester identity metadata anywhere in the SMART request body, including top level, items, selectors, and extension members. Prohibited metadata includes requester/clinic/payer/organization/staff/facility names; logos/brand fields; URLs/callbacks/domains/origins/package/application ids/certificates; signed-request/reader/Verifier/trust/issuer/accreditation/legal-entity metadata; and pointer/relay/completion/encryption/nonce/handoff/wrapper metadata. Wallet/Responder SHALL NOT treat any request body field as authenticated requester identity unless established by transport, trust processing, or policy outside the body.

### 5.3 `SmartHealthCheckinRequestItem`

```json
{
  "id": "item-id",
  "title": "holder-facing title",
  "summary": "holder-facing explanation",
  "required": false,
  "content": { "kind": "selection.fhir" },
  "accept": ["application/fhir+json"]
}
```

Requester SHALL include `id`, `title`, `content`, and non-empty `accept[]` for every item; MAY include `summary` and `required`.

| Member | Rules |
| --- | --- |
| `id` | Non-empty string unique within one request. Wallet/Responder SHALL reject missing, non-string, empty, or duplicate ids. Wallet/Responder and Verifier SHALL compare by exact string equality. New ids SHOULD use ASCII letters, digits, `.`, `_`, `~`, `-`; Wallets MAY accept other non-empty strings when preserved exactly. Requester SHOULD NOT embed patient/requester ids, secrets, tracking values, or clinical facts. |
| `title` | Non-empty Holder-facing string. SHALL NOT substitute for authenticated requester identity. Wallet/Responder SHOULD make it available in Holder review. |
| `summary` | Optional string. SHOULD clarify broad selectors/profile families/questionnaire purpose. SHALL NOT substitute for authenticated requester identity. Wallet/Responder MAY display/summarize/suppress but SHALL preserve ids. |
| `required` | Optional boolean; omitted means `false` for display/decision support. Requester SHALL treat as advisory only, not consent, authorization, command, or guarantee. Wallet/Responder SHALL NOT use `required: true` to bypass Holder control, policy, law, or consent UX and MAY return any non-fulfilled status. |
| `accept[]` | Non-empty media type strings ordered most to least preferred. Requester SHALL list only media types it can parse/validate/route and SHALL NOT rely on another preference field. Wallet/Responder MAY choose any listed media type and SHOULD choose earliest equivalent producible form. It SHALL NOT return an Artifact for an item unless the Artifact `mediaType` appears in the item's `accept[]`, except registered compatibility. |
| `content` | Selector object with string `content.kind`. Unknown kinds SHALL NOT be inferred from display text; unsupported selectors yield rejection or `unsupported`. |

### 5.4 Selectors

Selectors describe acceptable clinical content/action. They are not FHIR query language, CDS expression, patient matching, authorization policy, or requester identity. Requesters SHALL use core or registered selector shapes; Wallets/Responders SHALL evaluate per item while allowing §6 many-to-many fulfillment.

#### 5.4.1 `selection.fhir`

```json
{
  "kind": "selection.fhir",
  "profiles": ["http://example.org/fhir/StructureDefinition/example"],
  "profilesFrom": ["http://example.org/fhir/ImplementationGuide/example"],
  "resourceTypes": ["Patient"]
}
```

`selection.fhir` requests existing patient-specific FHIR resources. Requester SHALL set `kind` exactly. `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` MAY appear in any combination or all be omitted; if present each SHALL be an array of strings. It SHALL NOT include `questionnaireCanonical` or `questionnaire`.

| Field | Rules |
| --- | --- |
| `profiles[]` | Exact FHIR `StructureDefinition` canonicals; MAY include `|version`. Wallet/Responder MAY match by `meta.profile` or equivalent local/trusted conformance evidence; full profile validation is not core-required. |
| `profilesFrom[]` | Non-empty array of canonical profile-family URL strings. SHALL NOT be a string, object, package descriptor, IG object, package id/version, npm name, registry alias, local topic vocabulary, or URN unless future/extension defines it. Wallet/Responder SHALL reject present non-array/non-string/empty values and MAY reject non-canonical URLs. |
| `resourceTypes[]` | Official FHIR `resourceType` names only. With profile selectors, it is an additional constraint; without profile selectors, it requests patient-specific resources of the listed types. |
| Additivity | `profiles[]` and `profilesFrom[]` are additive. A resource satisfies the profile-selector portion if it matches any exact profile or any profile in any requested family, subject to `resourceTypes[]` and the item. Requester SHALL NOT rely on `profiles[]` to narrow `profilesFrom[]`; Wallet/Responder SHALL NOT interpret it as narrowing. |
| No-selector | If all selector fields are omitted, the item requests any patient-specific FHIR resources the Wallet can offer and Holder chooses to share, constrained by `accept[]`, `fhirVersions[]`, capability, data, policy, and Holder decision. Requester SHOULD avoid unless safe and clearly explained. Wallet MAY satisfy partially and need not disclose all resources. |

#### 5.4.2 `form.fhir`

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "https://example.org/fhir/Questionnaire/intake|1",
  "questionnaire": { "resourceType": "Questionnaire" }
}
```

`form.fhir` requests completion of a FHIR Questionnaire and return of an appropriate Artifact, normally a FHIR `QuestionnaireResponse` for `application/fhir+json`. Requester SHALL set `kind` exactly and include `questionnaireCanonical`, `questionnaire`, or both directly on the selector. `questionnaireCanonical`, if present, SHALL be a non-empty FHIR canonical string and MAY include `|version`. `questionnaire`, if present, SHALL be a FHIR `Questionnaire` object with `resourceType` `Questionnaire`. `form.fhir` SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`.

Wallet/Responder SHALL reject or report `unsupported` for missing form identity, non-string/blank canonical, non-Questionnaire object, or mixed `selection.fhir` fields. It MAY resolve canonicals through configured resolver, FHIR canonical search, cache, Holder source, or local mechanism satisfying §5.5; direct HTTP dereference is permitted only for unversioned canonicals. If it cannot resolve/render/use the Questionnaire, it SHALL report status rather than fabricating one.

When both fields are present, canonical is the explicit identity and inline resource is the body to render/use. Requester SHOULD keep `questionnaireCanonical`, `questionnaire.url`, and `questionnaire.version` consistent. Wallet/Responder SHALL NOT silently merge conflicting definitions or rewrite the requested canonical. Material disagreement SHOULD be `unsupported` or `error`, not silent merge.

#### 5.4.3 Extension selectors

Extension selector registrants SHALL define exact kind string, JSON shape, clinical meaning, satisfaction rules, interactions with `accept[]`, `fhirVersions[]`, canonicals, status, fulfillment, unsupported/unavailable/partial/error behavior, unknown-member handling, privacy, security, and examples. They SHALL NOT redefine core fields or permit requester identity metadata unless a future version defines that trust model. Unsupported Wallets SHALL NOT guess semantics and SHALL reject or report `unsupported`.

### 5.5 Canonical `|version` handling

Implementations processing FHIR canonicals SHALL parse into non-empty `url` and optional opaque `version` split at the first `|`. They SHALL preserve the original wire string exactly for carrying, echoing, logging, response construction, fixtures, returned `Resource.meta.profile`, and generated `QuestionnaireResponse.questionnaire` when it is the answered identity. Internal parsing SHALL NOT rewrite carried or emitted strings.

Resolution SHALL use configured canonical resolver, package cache, terminology/IG resolver, or FHIR search when available. FHIR search uses `GET [base]/{ResourceType}?url={url}&version={version}` for versioned and `GET [base]/{ResourceType}?url={url}` for unversioned canonicals. Direct HTTP dereference is permitted only for unversioned canonicals, and only with post-resolution resourceType/url verification. A Wallet/Responder or Verifier SHALL NOT satisfy a versioned canonical by stripping `|version` and dereferencing the bare URL. Resolved resources SHALL have expected `resourceType`, matching `url`, and matching `version` when requested; failures are `unsupported` or `error`.

Versioned `profiles[]` requests require exact-version evidence: Wallet/Responder SHALL NOT report `fulfilled` unless returned `meta.profile` includes the same versioned canonical or equivalent local evidence exists. Verifier exact checks SHALL apply the same. Unversioned profiles MAY match supported versions of the same base canonical. Routing, `profilesFrom[]` family lookup, de-duplication, and display grouping MAY strip/ignore version locally but SHALL NOT affect resolution, exact matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation.

### 5.6 Accepted media types

Each item has its own ordered `accept[]`. Requester SHALL include non-empty media type strings ordered most to least preferred and list only processable forms. Wallet/Responder SHALL NOT return an Artifact for an item unless its `mediaType` appears in that item's `accept[]`, except registered compatibility. Verifier SHALL enforce the same for every `fulfills[]` edge.

| Media type | Meaning |
| --- | --- |
| `application/fhir+json` | Raw FHIR JSON Resource or Bundle; response Artifact declares `fhirVersion`. Questionnaire items normally return `QuestionnaireResponse`. |
| `application/smart-health-card` | SMART Health Card file JSON; response Artifact uses `value.verifiableCredential[]`; FHIR version semantics are inside signed credentials. |

---

## 6. Clinical content - response

The SMART response is the transport-neutral clinical JSON object by which Wallet/Responder answers after Holder review, Wallet policy, and data-source access.

### 6.1 `SmartHealthCheckinResponse`

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "request-id",
  "artifacts": [],
  "requestStatus": []
}
```

| Member | Requirement and semantics |
| --- | --- |
| `type` | Wallet/Responder SHALL set exactly `smart-health-checkin-response`; Verifier SHALL reject absent/non-exact. |
| `version` | Wallet/Responder SHALL set exactly `1`; Verifier SHALL reject absent/non-`1` unless future compatibility applies. |
| `requestId` | Wallet/Responder SHALL set exact accepted request `id`. Verifier SHALL reject mismatch by exact string equality. It is correlation only, not patient id, requester id, session id, freshness proof, or clinical fact. |
| `artifacts[]` | Required array, MAY be empty if statuses cover every item. Wallet/Responder SHALL encode each Artifact under §§6.2-6.3. Order has no clinical fulfillment meaning unless a media type defines it internally. |
| `requestStatus[]` | Required array of per-item outcomes, even when all items are fulfilled. |

### 6.2 Artifacts

Every Artifact SHALL include `id`, `mediaType`, non-empty `fulfills[]`, and media-type-defined payload fields.

| Field | Rules |
| --- | --- |
| `id` | Non-empty string scoped to one response. Wallet/Responder SHALL NOT reuse; Verifier SHALL reject missing, non-string, empty, or duplicate ids. Not patient/requester/global/provenance/source id unless separately established. |
| `mediaType` | Non-empty media type string; declares clinical response form. v1.0 core union is only `application/smart-health-card` and `application/fhir+json`; Verifier SHALL NOT treat unknown media types as generic Artifacts. Extensions are branded variants with typed fields. |
| `fulfills[]` | Non-empty exact original item ids. Wallet/Responder MAY list multiple items only if the Artifact satisfies each and media type is acceptable for every listed item. Verifier SHALL reject unresolved, absent, empty, or non-string references. |
| Payload | Core media types use `value`; extensions define their own fields. Verifier/receiver SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration from field names alone. |

For `application/smart-health-card`, Wallet/Responder SHALL include `value.verifiableCredential[]` as a non-empty array of SMART Health Card JWS strings and SHALL NOT include outer Artifact `fhirVersion`. Verifier SHALL reject outer `fhirVersion`, verify each JWS under SMART Health Cards and local trust policy, and evaluate signed payloads against selectors and policy.

For `application/fhir+json`, Wallet/Responder SHALL include non-empty `fhirVersion` and FHIR JSON `value` as either a single Resource with string `resourceType` or a Bundle with `resourceType` `Bundle` and `entry[]` resources. Wallet/Responder SHALL NOT mix resources requiring different FHIR releases in one raw FHIR Artifact; use separate Artifacts or report item status. Verifier SHALL reject absent/non-string `fhirVersion` and SHOULD treat unacceptable versions as unsupported for ingestion. Wallets SHALL preserve known `meta.profile` strings including `|version`.

Extension Artifact registrants SHALL define exact media type or bounded pattern, variant name, typed payload fields, shape, encoding, dereferencing/integrity, FHIR-version handling if any, status behavior, validation, security, privacy, and compatibility. They SHALL NOT define unbounded catch-alls, rely on generic `value`/`url`/`data`, or redefine core response fields.

### 6.3 Status and many-to-many fulfillment

Wallet/Responder SHALL include exactly one `requestStatus[]` entry for every original request item, no duplicates, no unknown ids. Verifier SHALL reject unless coverage is exact.

| Code | Semantics |
| --- | --- |
| `fulfilled` | Wallet believes the item was fully satisfied by returned Artifact content. |
| `partial` | Some relevant content returned; complete fulfillment not claimed. |
| `unavailable` | Item understood and supported, but no matching shareable content available under Wallet policy, without Holder refusal as relevant cause. |
| `declined` | Holder declined or Wallet policy treated Holder preference as refusal. |
| `unsupported` | Wallet could not understand/support selector, media type, Questionnaire feature, canonical/inline combination, FHIR version, or extension semantics. |
| `error` | Operational/processing failure after item understood and not simply declined/unavailable/unsupported. |

Wallet/Responder SHALL use only v1.0 status codes unless a future extension is explicitly supported. Unknown status is invalid for v1.0 Verifiers unless supported. Wallets SHALL use `unsupported` rather than `unavailable` for unsupported capability/semantics, `unavailable` for understood but lacking shareable content, `declined` for Holder refusal, `partial` for incomplete returned content, `fulfilled` only when full satisfaction is believed, and `error` for processing failure. `message` MAY explain but SHALL NOT include secrets, tokens, stack traces, unnecessary patient details, or unrelated Holder data. Receivers SHALL NOT rely on localized `message` for status semantics.

Wallet/Responder MAY return one Artifact for multiple items or multiple Artifacts for one item only when every fulfillment edge satisfies media-type, selector, FHIR-version, status, and validation rules. It SHALL still include exactly one status entry per item. Verifier SHALL evaluate all Artifacts listing an item; receivers MAY choose which valid Artifacts to ingest/display.

### 6.4 Verifier cross-validation

Before Requester/downstream use, Verifier SHALL validate against the original request; shape validation alone is insufficient. Verifier SHALL reject unless `requestId` matches exactly; all `fulfills[]` references resolve; every Artifact `mediaType` is recognized and accepted by every fulfilled item (unless supported compatibility applies); `requestStatus[]` covers every item exactly once; raw FHIR Artifacts have valid `fhirVersion`, FHIR object shape, Bundle interpretation, and no mixed release in one Artifact; SMART Health Card Artifacts have no outer `fhirVersion`; and FHIR selector responsiveness is assessed from `resourceType`, `meta.profile`, Bundle entries, `QuestionnaireResponse.questionnaire`, signed payloads, or equivalent evidence. Exact-version profile requests require exact-version evidence; Verifier SHALL NOT strip `|version` from returned `meta.profile` to satisfy such a request.

---

## 7. Trust framework

Trust layers are distinct: origin, reader/Verifier, mdoc issuer/device, clinical-source, and out-of-band deployment policy. Implementations SHALL NOT treat one layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and assurance. Successful transport presentation does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority, downstream acceptance, or source provenance for unsigned content.

### 7.1 Origin trust

Origin trust is platform-supplied caller context, not requester identity from the SMART request. Requesters SHALL NOT put self-asserted identity metadata in the request body to substitute for origin trust. Wallets/Responders SHALL NOT treat `purpose`, item text, selector values, unknown/extension members, or Artifacts as authenticated identity or origin.

When same-device presentation exposes authenticated origin, Wallet/Responder using origin trust SHALL use the platform-provided origin for display, policy, and §8 binding; it SHALL NOT derive origin from request JSON, display text, callbacks, logos, ids, selector URLs, handoff metadata, or Artifacts. Privileged-caller/browser trust SHALL use authenticated platform evidence and Wallet/deployment policy, not request-body claims. If origin/caller context cannot be authenticated, Wallet/Responder SHALL treat origin trust as absent and SHALL NOT substitute request fields. It MAY reject, proceed with reduced assurance, require confirmation, omit branding, require another trust layer, restrict content, or apply local controls. Verifiers requiring origin-authenticated presentation SHALL reject, quarantine, or avoid reliance when required evidence is absent or fails.

### 7.2 Reader / Verifier trust

Requester/Verifier SHALL NOT put reader identity, organization identity, certificates, trust-framework claims, or signatures inside the SMART request body as a substitute. Verifier MAY include per-`DocRequest.readerAuth` as detached `COSE_Sign1` over `ReaderAuthentication` for the same presentation session and exact requested items; it SHALL bind §8 `SessionTranscript` and exact `ItemsRequest` bytes and SHALL NOT be reused across sessions, transcripts, or `ItemsRequest` bytes.

Wallet/Responder supporting or relying on reader auth SHALL verify COSE signature, signed context, detached-payload binding, relevant bytes, protected algorithm/key, certificate/key evidence, and trust-anchor policy. It SHALL treat malformed, mismatched, unsupported, failed, or policy-unacceptable `readerAuth` as failed and SHALL NOT treat mere presence of `readerAuth`, `x5chain`, names, logos, display strings, or demo certificates as success. Certificate policies SHALL identify accepted anchors/registries when required and SHOULD define path validation, key usage/EKU, policy OIDs, identifiers, validity, revocation/status, algorithms, and display mapping. Absent readerAuth is absent, not trusted; invalid/untrusted readerAuth is failed and distinct from absent.

### 7.3 Issuer/device trust and self-attestation

Verifier SHALL apply §8 mdoc issuer, digest, device-key, encryption, transcript, and extraction checks before relying on mdoc-layer evidence, then apply §6.4. If issuer trust is required, Verifier/deployment profile SHALL define trust-anchor policy and Verifier SHALL validate MSO issuer signature, certificate path/key evidence, digest bindings, document type, namespace, element identifiers, validity, and policy. It SHALL NOT treat syntactically valid MSO, matching digest, valid signature against included leaf, or self-signed issuer as production trust unless accepted by policy.

Verifier SHALL verify device-key proof for the same presentation session using expected §8 transcript. It SHALL NOT treat the response as transport-valid if device proof fails, is not session-bound, or disclosed element digest does not match. Wallet/Responder constructing mdoc response SHALL produce required device proof.

Deployment MAY permit self-attested Wallet mdoc evidence only under explicit policy defining assurance. Accepting parties SHALL label such issuer/device evidence as self-attested or deployment-local, not externally issuer-accredited. Wallets SHALL NOT use self-attested wrappers or mdoc containers to claim raw FHIR JSON is issuer-signed clinical credential. Self-attestation does not relax parsing, validation, media-type, status, FHIR-version, or §8 checks.

### 7.4 Clinical-source trust and identifiers

Clinical-source trust is evaluated from Artifact media type, payload signatures/provenance, selectors, FHIR evidence, SMART Health Card rules, extension rules, and deployment policy. Verifiers/receivers SHALL NOT infer source provenance from successful transport alone. SMART Health Card JWSs SHALL be verified under SMART Health Cards and local policy before reliance. Raw `application/fhir+json` SHALL be treated as patient-mediated unless payload/profile/policy/other evidence supplies provenance, signature, source attestation, authenticated retrieval, or equivalent proof. Wallets SHALL NOT use transport encryption, mdoc issuer signatures, device proof, readerAuth, origin, request text, Artifact ids, `fulfills[]`, handoff fields, or response validation to claim unsigned raw FHIR is issuer-signed clinical credential.

Identifiers are scoped. Implementations SHALL NOT use an identifier from one layer as proof or authorization for another unless specified by this specification or explicit profile. Request ids, item ids, Artifact ids, origins, certificate subjects/serials, key ids, docTypes, namespaces, elements, transcripts, nonces, URL tokens, relay ids, and completion ids do not replace each other. Deployment profiles SHOULD define collision resistance, replay, retention, logging, telemetry, and privacy for constrained identifiers.

### 7.5 Deployment policy

Deployment profiles adding trust requirements SHALL document constrained roles/layers, anchors/registries/allow-lists/policies, freshness/revocation/expiration/replay/status checks, Wallet behavior for missing/invalid evidence, Verifier/Requester/receiver behavior when local policy is unmet, and Holder display rules. They SHALL state mandatory trust layers and assurance/restrictions for absent/failed layers. They SHALL NOT redefine SMART field semantics, selectors, media types, fulfillment, or status codes, but MAY require stricter validation, narrower media, stronger provenance/display/trust anchors, or rejection of optional modes. Handoff components SHALL preserve trust boundaries and SHALL NOT redefine SMART clinical semantics.

---

## 8. Same-device presentation flow over `org-iso-mdoc`

This is the only normative v1.0 presentation flow. Verifier carries a §5 request to Wallet/Responder through W3C Digital Credentials API direct `org-iso-mdoc`; Wallet returns a §6 response inside an mdoc `DeviceResponse` encrypted for Verifier. QR/NFC/deep-link initiation MAY load the page; URL formats, relay, storage, routing, and completion are outside v1.0.

### 8.1 Constants

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested/disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

Verifier SHALL use these exactly. SMART request is carried only as JSON text in the request-info key. Wallet SHALL NOT treat dynamic element names, handoff wrappers, archived experiments, or other locations as request carriers. SMART response is carried only as `elementValue` of issuer-signed item `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`.

### 8.2 Verifier request construction

Verifier starts with a §5 request and serializes it as UTF-8 JSON text. No canonical JSON serialization is defined. Core logical request:

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": { "org.smarthealthit.checkin": { "smart_health_checkin_response": true } },
  "requestInfo": { "org.smarthealthit.checkin.request": JSON.stringify(SmartHealthCheckinRequest) }
}
ItemsRequestBytes = tag24(CBOR(ItemsRequest))
DeviceRequest = { "version": "1.0", "docRequests": [{ "itemsRequest": ItemsRequestBytes, "readerAuth": COSE_Sign1 / optional }] }
```

The boolean is mdoc `intentToRetain`; Verifier SHALL default it to `true` for ordinary clinical check-in workflows and MAY set `false` only for true ephemeral use permitted by policy. It is not Holder consent. Verifier SHALL NOT model FHIR profiles, items, Questionnaires, media types, statuses, or resources as separate mdoc elements. `DeviceRequest.version` SHALL be exactly `1.0`. Core v1 uses per-`DocRequest.readerAuth`; Verifier SHALL NOT use version `1.1` `readerAuthAll` unless a future version/profile defines it.

If present, `readerAuth` SHALL be detached ES256 `COSE_Sign1` with protected `{1: -7}`, payload `null`, empty external AAD, certificate evidence in label `33` (`x5chain`) with at least the leaf, and detached payload:

```text
ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))
```

It SHALL be computed for the exact `SessionTranscript` and `ItemsRequestBytes` and SHALL NOT be reused across sessions, origins, encryption information, request serializations, or requested element sets.

For each presentation request, Verifier SHALL generate/select HPKE DHKEM(P-256, HKDF-SHA256) recipient key material and SHOULD use a fresh key pair per session. Reuse profiles SHALL define replay, correlation, retention, and compromise handling. Public key SHALL be COSE_Key EC2 P-256 with labels `1: 2`, `-1: 1`, `-2: x`, `-3: y`. Verifier SHALL construct CBOR:

```text
encryptionInfo = ["dcapi", { "nonce": <fresh unpredictable bytes>, "recipientPublicKey": <P-256 COSE_Key> }]
```

Nonce SHALL be fresh unpredictable bytes; implementations SHOULD use at least 16 bytes entropy. Verifier SHALL retain matching private key and exact `encryptionInfo` CBOR bytes. It SHALL base64url-encode CBOR `DeviceRequest` and `encryptionInfo` without padding and invoke Digital Credentials API with JSON equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "base64url-without-padding CBOR DeviceRequest",
    "encryptionInfo": "base64url-without-padding CBOR encryptionInfo"
  }
}
```

Verifier SHALL preserve the exact `encryptionInfo` base64url string because transcript binding uses that string.

### 8.3 SessionTranscript

Both sides SHALL compute:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is exact unpadded request text. `origin` is authenticated Browser/User Agent/platform origin or deployment-approved privileged-caller origin-equivalent. Wallet SHALL NOT derive origin from request JSON, display text, selector URLs, ids, handoff metadata, callbacks, or Artifacts. Verifier and Wallet SHALL use the same transcript bytes for readerAuth, device authentication, HPKE sealing/opening, and validation. If origin/equivalent is unavailable, Wallet SHALL treat origin trust as absent and SHALL NOT substitute request fields.

### 8.4 Wallet request handling

Wallet receiving candidate direct `org-iso-mdoc` SHALL validate before response construction: protocol; unpadded base64url `deviceRequest` and `encryptionInfo`; CBOR `DeviceRequest`; version `1.0`; tag-24 `DocRequest.itemsRequest`; exact `ItemsRequestBytes`; `docType`; namespace and element; `intentToRetain`; request-info SMART request string; UTF-8 JSON and §5 validation; direct `dcapi` `encryptionInfo`; P-256 recipient public key; and recomputed transcript from exact `encryptionInfoBase64Url` and authenticated origin/equivalent. Invalid request JSON or carriers SHALL fail safely; Wallet SHALL NOT infer request semantics from mdoc element names, display strings, archived dynamic encodings, unknown fields, or handoff wrappers.

If `readerAuth` is present and relevant, Wallet SHALL verify detached COSE, algorithm, `ReaderAuthenticationBytes`, transcript, exact `ItemsRequestBytes`, signature, `x5chain`, and policy, distinguishing absent, syntactically invalid, cryptographically failed, valid but untrusted/policy-unacceptable, and trusted. Wallet SHALL run Holder review or equivalent Holder-control at item granularity, preserve item ids, not treat `required: true` as consent, and not present request text as authenticated identity.

### 8.5 Wallet response construction and encryption

Wallet that proceeds SHALL construct §6 response with `requestId` exactly equal to request `id` and serialize as UTF-8 JSON text. It SHALL create:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": JSON.stringify(SmartHealthCheckinResponse)
}
```

Wallet SHALL CBOR-encode and tag-24-wrap the item in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`. MSO value digest SHALL cover complete tag-24 `IssuerSignedItem` bytes, and `digestID` SHALL match `MSO.valueDigests["org.smarthealthit.checkin"][digestID]`. MSO SHALL use `docType` `org.smarthealthit.checkin.1`, `digestAlgorithm` `SHA-256`, covered value digests, and `deviceKeyInfo.deviceKey`. `issuerAuth` SHALL be ES256 `COSE_Sign1` (`alg` `-7`) over tag-24 MSO bytes unless Appendix C/ISO-compatible profile defines equivalent encoding.

Wallet SHALL construct and sign device authentication for the same session:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

Core `DeviceNameSpaces` is normally empty. SMART response remains issuer-signed and is not moved into device-signed namespaces. Device signature SHALL be ES256 using the private key corresponding to `MSO.deviceKeyInfo.deviceKey`. `DeviceResponse` SHALL use version `1.0`, status `0`, document `docType` `org.smarthealthit.checkin.1`, issuerSigned namespace item and `issuerAuth`, and deviceSigned namespaces/deviceSignature.

Wallet SHALL HPKE-encrypt CBOR `DeviceResponse` to `encryptionInfo.recipientPublicKey` using base mode:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

Wallet SHALL wrap output as CBOR `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]`, base64url-encode without padding, and return:

```json
{
  "protocol": "org-iso-mdoc",
  "data": { "response": "base64url-without-padding CBOR dcapiResponse" }
}
```

Wallet SHALL NOT return plaintext `DeviceResponse`, plaintext SMART response JSON, another response carrier, another HPKE suite, or non-empty AAD for core v1.

### 8.6 Verifier processing

Verifier SHALL require returned protocol `org-iso-mdoc`; unpadded base64url `data.response`; direct CBOR `dcapiResponse`; expected transcript from original exact `encryptionInfo` text and origin; HPKE open with retained private key, required suite, `info = SessionTranscript`, empty AAD; CBOR `DeviceResponse`; version `1.0`; successful status; matching `docType`; ES256 `issuerAuth`; valid MSO, validity, device key, issuer signature, and policy; disclosed issuer-signed item in namespace `org.smarthealthit.checkin` with element `smart_health_checkin_response`; MSO value digest over exact tag-24 item bytes; device signature over expected `DeviceAuthentication`; string `elementValue`; §6 response JSON validation; and §6.4 cross-validation. Failure in HPKE, mdoc/MSO, digest, device proof, stable element, SMART response JSON, or cross-validation SHALL cause rejection or quarantine. Verifier SHALL keep HPKE success, origin binding, reader auth, issuer/MSO, device proof, SMART response validity, and SMART Health Card verification separate.

---

## 9. Reserved

Reserved for future editorial use; no v1.0 runtime behavior.

---

## 10. Reserved future OID4VP binding

OID4VP alignment is reserved and informative. v1.0 conformance does not require OID4VP. Experiments SHALL NOT claim §8 conformance unless a future version/profile defines request carriage, response extraction, encryption/signature/session binding, trust, and validation mapping.

---

## 11. Security considerations

Security is layered. Implementations SHALL NOT describe one successful control as proof another succeeded unless this specification or explicit profile defines the relationship. §8 Verifier MUST NOT accept plaintext `DeviceResponse`, plaintext SMART response JSON, substituted HPKE suite, or response not bound to expected transcript. Wallet/Responder or Verifier SHALL NOT downgrade v1.0 ciphertexts to plaintext, substitute encryption context, or treat decryption as clinical validation. Keep §8 keys, recipients, transcript inputs, algorithms, ciphertext fields, plaintexts, and validation results separate from deployment-local transport/storage/diagnostics.

Freshness comes from session mechanisms, not request ids, item ids, Artifact ids, or `requestId`. Verifier SHOULD use fresh HPKE recipient key per session; reuse profiles need replay, correlation, retention, and compromise handling. Origin evidence comes only from authenticated platform/equivalent, not request body or launch metadata. Scanning/tapping/opening/clicking outside Wallet is not Holder consent. Reader auth presence, `x5chain`, names, logos, `kid`, launch URL, or demo certificate is not successful authentication without cryptographic and policy verification.

Verifier SHALL complete §8 mdoc validation and §7 issuer/device policy before production issuer trust. Valid MSO/digest/signature/device proof/HPKE/origin/readerAuth/requestId does not prove production accreditation, patient matching, clinical correctness, source provenance, downstream authorization, or EHR write-back. Raw FHIR remains patient-mediated absent accepted proof. Implementations SHALL reject unsupported/unexpected algorithm labels rather than downgrade, ignore, or substitute defaults. Implementations SHOULD minimize plaintext requests/responses, FHIR, SMART Health Cards, Questionnaire answers, DeviceResponse plaintexts, DC API internals, keys, secrets, tokens, bearer URLs, launch URLs, QR images, and diagnostics except controlled procedures. Live PHI or production secrets in diagnostics/fixtures are incidents, not conformance artifacts.

Wallet/Responder SHALL validate §8 request before disclosure, recover SMART request only from the defined request-info key, compute transcript from authenticated origin/equivalent, classify readerAuth accurately, and perform Holder review/equivalent control at item granularity unless explicit profile defines otherwise. It SHALL preserve item ids and exact status coverage. `required: true`, `intentToRetain`, launch UX, DC API invocation, or page button is not consent.

---

## 12. Privacy considerations

Requester SHOULD request minimum content needed for the bounded workflow. Selectors, purpose, titles, summaries, profile URLs, resource types, Questionnaires, media, and FHIR versions can disclose sensitive context. Wallet/Responder SHALL preserve item ids and provide Holder review/equivalent control at item granularity before disclosure; it SHALL NOT hide multiple items, broad selectors, accepted forms, retention signals, or advisory required flags in a way that defeats meaningful control. Non-fulfilled statuses are normal and should not be used to infer undisclosed facts.

Wallet/Responder SHOULD return only Artifacts satisfying approved items, choices, policy, data, and accepted media, avoiding unrelated resources, unrelated SMART Health Cards, unnecessary answers, diagnostics, tokens, internal ids, and nonresponsive records. Because §8 carries one stable mdoc element, mdoc element selection alone does not minimize clinical disclosure inside the SMART response. Receivers should reject/quarantine/suppress/minimize nonresponsive content.

Do not use mdoc issuer/device evidence, HPKE opening, Artifact ids, `fulfills[]`, `requestId`, or Holder approval to imply source provenance for unsigned raw FHIR. Wallet/Responder SHOULD NOT place patient/requester ids, secrets, clinical facts, tracking values, or source ids in request ids, item ids, Artifact ids, messages, extension names, URL paths, or locators unless required and protected. Receiver SHALL NOT treat Artifact ids as patient/global/provenance/source ids absent independent evidence.

Identifiers and metadata should not be reused across unrelated sessions, Verifiers, or Holders. Displays SHALL NOT label unauthenticated request text or launch-page branding as verified identity/trust. `intentToRetain` defaults to `true` for clinical check-in but does not override Holder choice, policy, law, or minimization. Sensitive categories need narrow requests, clear explanations, Wallet policy, possible stricter review/redaction/refusal, and safe messages. Telemetry SHOULD be minimized and SHOULD NOT include plaintext protocol payloads, clinical content, item decisions, §8 plaintext/internals, keys, credentials, bearer/full launch URLs, QR images, or sensitive stacks except controlled diagnostic/audit/incident procedures.

---

## 13. Registry and IANA considerations

SMART request/response `type` and `version` constants are not media types, mdoc identifiers, JOSE `typ`, or profile ids. Media strings in `accept[]` and Artifact `mediaType` compare by exact case-sensitive equality unless future extension says otherwise.

| Registry/category | v1.0 entries and rules |
| --- | --- |
| Artifact media types | `application/fhir+json` and `application/smart-health-card`. Future Artifact media registrations SHALL define exact media type, payload shape/fields, encoding, dereferencing/integrity, FHIR-version semantics, validation, status interaction, security, privacy, and compatibility, and SHALL NOT add generic catch-all branches. |
| mdoc/DC API identifiers | `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, `org.smarthealthit.checkin.request`; use exactly. External registration/reservation may be needed. Future incompatible carrier changes SHOULD use new identifiers/docType suffixes. |
| Status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`; future entries require exact code, lifecycle, semantics, relationship to Artifacts, interactions, construction/validation/display, unsupported-recipient behavior, security, privacy, and tests, and SHALL NOT redefine core codes or exact status coverage. |
| Selector kinds | `selection.fhir`, `form.fhir`; future entries SHALL define exact kind, shape, unknown-member handling, clinical meaning, satisfaction, interactions, statuses, examples, security, privacy, and SHALL NOT redefine core fields or trust boundaries. |
| Profile identifiers | Provisional labels in §4; identifiers are not request fields, selectors, media types, status codes, presets, IPS shortcuts, topics, or substitutes for §5 selectors. |

Designated expert review applies before treating new/changed status codes, selector kinds, extension media types/variants/compatibility, profile identifiers, or future mdoc identifiers/carriers as interoperable registrations. Experts SHOULD require preservation of §§5-6 semantics, §6.4 validation, selector additivity, `form.fhir` fields, canonical-version handling, §7 trust separation, v1 same-device identifiers, §8 HPKE transcript binding, safe unsupported-recipient behavior, security/privacy review, no required plaintext intermediaries, and implementable examples/tests. Experts SHOULD reject changes that redefine existing fields, introduce requester identity/trust/routing metadata into SMART request body, turn profiles into selectors, rely on presets/topic labels, require plaintext intermediaries, weaken Holder control/validation, conflate identifiers, treat demo material as production trust, or overclaim raw FHIR provenance.

---

## 14. Internationalization

Human-readable display text may be localized; protocol identifiers and machine values are not. SMART Health Check-in 1.0 defines no `lang`, `locale`, `Accept-Language`, language maps, negotiated locale, or locale parameters. Implementations SHALL NOT rely on unknown members, browser language, launch URL parameters, or HTTP headers as interoperable locale negotiation unless future version/extension/profile defines it. FHIR localization follows FHIR.

Wallet/Responder MAY translate/summarize/group/reorder/suppress display text but SHALL preserve underlying protocol values for construction and validation. Receiver SHALL NOT use localized `message` for status semantics. Producers of new display text SHOULD emit NFC; consumers SHOULD accept valid Unicode not NFC. Implementations SHALL NOT use normalization, folding, confusable mapping, BIDI reordering, translation, aliases, or locale collation to make distinct protocol identifiers/constants compare equal. Display normalization SHALL NOT change bytes/code points used for signatures, hashes, encryption, HPKE/HKDF inputs, COSE, mdoc digests, SMART Health Card verification, canonical preservation, audits, or byte-exact fixtures. UIs SHOULD isolate untrusted BIDI text and SHALL NOT let Unicode/BIDI spoof protocol identifiers, origins, identities, canonicals, status, trust, validation, Holder decisions, or consent controls.

Locale metadata can be sensitive and SHOULD be minimized. If safe understandable rendering is unavailable, Wallet MAY show original text with trust labeling, ask confirmation/assistance, decline, report `unsupported`, `unavailable`, `error`, or another valid §6 outcome.

---

## 15. Implementation notes and worked examples

Implementation guidance, worked examples, fixture details, byte ladders, CBOR diagnostic tutorials, ISO compatibility commentary, Android/iOS notes, SDK packaging, and EHR ingestion advice are informative companion material. They SHALL NOT introduce alternate request fields, selector kinds, Artifact carriers, status codes, mdoc carriers, trust semantics, HPKE contexts, or validation outcomes.

## 16. Open issues and future work

Future work includes production issuer trust anchors and registries, privileged-browser allow-lists, size limits, iOS/Safari feasibility, OID4VP alignment, conformance suites, fixture promotion, stricter duplicate/CBOR exactness, and richer registries. Future work changes v1.0 only through explicit version, profile, or registry process.

## 17. Acknowledgments and change log

Acknowledgments, contributors, IPR statement, copyright/license details, and publication change log remain pending final governance. This candidate is an editorial compression pass over the assembled draft.


---

## Appendix A. Conformance checklist

This checklist indexes testable obligations defined elsewhere in SMART Health Check-in 1.0. It does not create independent requirements. Rows for optional features, optional targets, or optional deployment constraints apply only to implementations claiming that feature, target, profile, or deployment constraint, even when the source section uses `SHALL` or `SHOULD` for that claimed feature.

In this compressed candidate, some detailed source subsections have been consolidated into their major normative sections; the checklist ID and requirement text remain the stable conformance inventory for those consolidated obligations.

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
| A-115 | Conformance/fixture author | SHOULD | Appendix D | Classify same-device fixture roots and byte ladders without inventing alternate carriers or clinical semantics. | Fixture metadata marks conformance candidate, diagnostic, historical, regression, or illustrative status. |
| A-116 | Requester / Verifier | SHALL | §11.1 | Keep same-device HPKE and other presentation cryptographic contexts separate. | Tests fail when keys, recipients, info/transcripts, AAD, or ciphertext fields are substituted across contexts. |
| A-117 | Holder Wallet / Responder | SHALL | §11.1 | Do not downgrade active v1.0 same-device response encryption to plaintext or alternate HPKE context. | Transport tests reject plaintext `DeviceResponse` and substituted suite/info/AAD. |
| A-118 | Requester / Verifier | SHOULD | §11.2 | Use flow-specific freshness controls and do not treat request ids, item ids, Artifact ids, or deployment handoff ids as freshness proofs. | Replay tests distinguish correlation ids from freshness evidence. |
| A-119 | Holder Wallet / Responder | SHALL | §11.4 | Do not treat mere presence of `readerAuth`, `x5chain`, names, logos, or demo certificates as successful reader authentication. | ReaderAuth policy requires cryptographic verification and trust evaluation. |
| A-120 | Requester / Verifier | SHALL | §11.5 | Do not treat mdoc issuer/device evidence, HPKE opening, readerAuth, or request-id matching as production issuer accreditation or clinical-source provenance by themselves. | Trust report separates issuer/device evidence from production trust and clinical provenance. |
| A-121 | Requester / Verifier | SHALL | §11.6 | Reject unsupported or unexpected algorithm labels for the v1.0 profile instead of downgrading or substituting library defaults. | Algorithm mutation tests fail closed for wrong COSE/HPKE labels. |
| A-122 | Requester / Verifier | SHOULD | §11.7 | Minimize collection, display, and retention of plaintext requests, responses, FHIR, SHCs, private keys, secrets, and full ciphertext except controlled diagnostics. | Logging/debug review redacts or disables sensitive plaintext outside controlled fixtures. |
| A-123 | Requester / Verifier | SHOULD | §12.1 | Request the minimum clinical or administrative content needed for the bounded check-in workflow. | Request review favors narrow items, selectors, media types, and FHIR versions. |
| A-124 | Holder Wallet / Responder | SHALL | §12.1 | Provide Holder review or equivalent Holder-control at request-item granularity before disclosing content. | UX/policy evidence shows item-level control and meaningful disclosure choices. |
| A-125 | Holder Wallet / Responder | SHOULD | §12.2 | Construct the smallest set of Artifacts that accurately satisfies approved items and accepted response forms. | Response packaging review avoids unrelated over-disclosure. |
| A-126 | Requester / Verifier | SHALL | §12.2 | Do not imply clinical-source provenance for unsigned raw FHIR from mdoc, HPKE, Artifact ids, `fulfills[]`, `requestId`, or Holder approval. | Provenance assessment requires separate accepted evidence. |
| A-127 | Requester / Verifier | SHOULD | §12.3 | Avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and avoid embedding patient/requester/secrets/clinical facts in ids. | Identifier generation and logs show scoped, non-identifying values. |
| A-128 | Requester / Verifier | SHOULD | §12.7 | Do not send plaintext protocol payloads, clinical content, private keys, bearer URLs, full ciphertext blobs, or unredacted sensitive stack traces to routine telemetry. | Telemetry review confirms redaction, aggregation, sampling, or controlled diagnostic handling. |
| A-129 | Requester / Verifier | SHALL | §13.1 | Compare media/content-type strings by exact, case-sensitive equality unless a future registered extension defines otherwise. | Media type mutation tests fail by default. |
| A-130 | Holder Wallet / Responder | SHALL | §13.1 | Do not claim Artifact fulfillment unless `mediaType` appears in the fulfilled item's `accept[]`, except for supported registered compatibility rules. | Response construction enforces exact media-type acceptance. |
| A-131 | Requester / Verifier | SHALL | §13.2 | Use mdoc/DC API identifiers exactly and do not treat external registry registration as already complete unless it is. | Conformance report uses exact values and marks provisional/external status accurately. |
| A-132 | Holder Wallet / Responder | SHALL | §13.3 | Use only core status codes in v1.0 unless a future status-code extension is explicitly supported by the receiver. | Unknown status codes are absent or extension-scoped. |
| A-133 | Holder Wallet / Responder | SHALL | §13.4 | Do not infer unsupported selector semantics from display text, profile labels, local topics, deployment handoff metadata, or requester identity metadata. | Unsupported-kind tests yield rejection or `unsupported`. |
| A-134 | Deployment/profile author | SHALL | §13.5 | Do not use profile identifiers as SMART request fields, selectors, Artifact media types, status codes, request presets, or substitutes for §5 selectors and `accept[]`. | Profile review rejects `requestProfile`, preset, IPS, all-of-the-above, and topic-label shortcuts. |
| A-135 | Deployment/profile author | SHALL | §13.7 | Use designated expert review before treating new status codes, selector kinds, branded Artifact media types, profile ids, payload kinds, or mdoc changes as interoperable registrations. | Registry change record includes expert review and required metadata. |
| A-136 | Requester / Verifier | SHALL | §14.1 | Do not localize protocol identifiers or machine values, including request/response ids, item ids, media types, status codes, canonicals, and mdoc ids. | Localization tests preserve exact machine values. |
| A-137 | Requester / Verifier | SHALL | §14.1 | Do not rely on unknown members, deployment handoff parameters, browser language, or HTTP headers as interoperable locale-negotiation signals. | Locale tests find no core `lang`, `locale`, `Accept-Language`, or negotiated-locale behavior. |
| A-138 | Holder Wallet / Responder | SHOULD | §14.1 | Render or process FHIR language/localization according to FHIR version, implementation guide, and local clinical-display policy. | FHIR display tests follow applicable FHIR i18n behavior. |
| A-139 | Holder Wallet / Responder | SHALL | §14.1 | If display text is translated, summarized, grouped, reordered, or suppressed, preserve protocol values used for construction and validation. | UX tests show exact ids, selectors, media types, fulfillment links, and status codes preserved. |
| A-140 | Requester / Verifier | SHALL | §14.2 | Do not use Unicode normalization, case folding, accent folding, BIDI reordering, translation, or locale collation to make distinct protocol identifiers compare equal. | Identifier comparison tests remain exact across Unicode variants. |
| A-141 | Holder Wallet / Responder | SHOULD | §14.2 | Isolate untrusted display text from adjacent labels, identifiers, URLs, trust indicators, warnings, and action buttons for BIDI safety. | UI review covers `purpose`, item text, Questionnaire text, FHIR displays, and messages. |

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

## Appendix C: Same-device CDDL and profile constraints

This appendix gives profile constraints and diagnostic pseudo-CDDL for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended to make SMART Health Check-in byte boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The profile reuses ISO/IEC 18013-5 mdoc, COSE, COSE_Key, CBOR, and HPKE structures. ISO/IEC 18013-5 and the referenced COSE/HPKE specifications own the base structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key`. This appendix constrains only SMART Health Check-in profile portions: fixed identifiers, carriers, tag-24 boundaries, direct `dcapi` wrappers, HPKE context, and the stable SMART response element.

The snippets below are profile pseudo-CDDL. They use field names and byte-boundary names from §8 and Appendix E. They are not a complete replacement for ISO/IEC 18013-5 CDDL, and they do not claim exactness for ISO map labels or optional fields not confirmed by the active profile. If this appendix conflicts with §8, §8 controls.

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

The following exactness issues are intentionally unresolved here and should be closed by §11, §13, Appendix A, a deployment profile, or a future fixture-vector profile before being treated as pass/fail conformance requirements:

- duplicate CBOR or JSON map key handling;
- multiple matching `docRequests` or multiple matching `DeviceResponse.documents`;
- duplicate `smart_health_checkin_response` issuer-signed items or duplicate stable elements;
- deterministic CBOR map ordering or canonical encoding for vector generation;
- digestID conventions such as always using `0` for single-item vectors;
- fixed nonce-size constraints beyond fresh unpredictable bytes and the 16-byte recommendation; and
- complete imported ISO/IEC 18013-5 CDDL and exact base-structure map labels.

---



## Appendix D. Consolidated FHIR and byte-boundary notes

This appendix summarizes companion material retained for internal sufficiency. Section 8 and Appendix C control if there is any conflict.

### D.1 Same-device byte boundaries

Conformance fixture roots should be classified as conformance candidates, diagnostics, historical captures, implementation regressions, or illustrative examples. Demo certificates, public private keys, deterministic randomness, synthetic data, and self-attested material SHALL be labeled and SHALL NOT be used to claim production issuer, reader, or clinical-source trust.

The byte-sensitive flow is: serialize SMART request as UTF-8 JSON text; place it in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`; compute `ItemsRequestBytes = tag24(CBOR(ItemsRequest))`; place those bytes in `DocRequest.itemsRequest`; encode `DeviceRequest.version` `"1.0"`; encode `encryptionInfo = ["dcapi", {"nonce": fresh unpredictable bytes, "recipientPublicKey": P-256 COSE_Key}]`; bind exact unpadded `encryptionInfo` base64url text and authenticated origin with `SessionTranscript = CBOR([null, null, ["dcapi", SHA-256(CBOR([encryptionInfoBase64Url, origin]))]])`; if present, sign detached `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))`; place SMART response JSON text as `IssuerSignedItem.elementValue`; compute MSO value digest over complete tag-24 `IssuerSignedItem` bytes; sign `DeviceAuthenticationBytes = tag24(CBOR(["DeviceAuthentication", SessionTranscript, "org.smarthealthit.checkin.1", tag24(CBOR(DeviceNameSpaces))]))`; HPKE-seal CBOR `DeviceResponse` with required suite, `info = SessionTranscript bytes`, and empty AAD; return CBOR `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]` as unpadded base64url `data.response`; validate and cross-check before clinical use.

CBOR diagnostic notation is explanatory only. `tag24(CBOR(X))` means CBOR tag 24 around a byte string containing a complete CBOR serialization of `X`. Text strings and byte strings are distinct. COSE header label `33` is `x5chain`. EC2 P-256 COSE_Key uses labels `1: 2`, `-1: 1`, `-2: x`, `-3: y`.

### D.2 FHIR mapping summary

FHIR-facing rules are controlled by §§5-6. FHIR canonicals appear in `profiles[]`, `profilesFrom[]`, `form.fhir`, returned `QuestionnaireResponse.questionnaire`, and returned `Resource.meta.profile`. Preserve exact wire strings where carried or emitted; parse `(url, version?)` for resolution; do not dereference versioned canonicals by stripping `|version`.

`profiles[]` contains exact `StructureDefinition` canonicals. Returned resources can support matches through `meta.profile`, signed payload evidence, or trusted local evidence. `profilesFrom[]` is an array of canonical profile-family URLs; family membership usually needs package/IG/family-map/local-policy knowledge outside the response. `profiles[]` and `profilesFrom[]` are additive, and `resourceTypes[]` is a separate official FHIR resource-type constraint. No-selector `selection.fhir` is broad, not a command to export a full record or a guarantee of comprehensiveness.

Raw FHIR JSON Artifacts carry one Resource or a Bundle in `value`; Bundle matching inspects `Bundle.entry[].resource`. Raw FHIR `fhirVersion` applies to the Artifact's single Resource or Bundle and entries; mixed FHIR releases in one raw FHIR Artifact are rejected or quarantined when detected. SMART Health Card Artifacts have no outer `fhirVersion`; verify each JWS and inspect signed FHIR payloads for selector responsiveness.

`form.fhir` is a flat selector with sibling `questionnaireCanonical` and/or `questionnaire`; returned `application/fhir+json` normally contains `QuestionnaireResponse`. When known, generated `QuestionnaireResponse.questionnaire` should preserve the requested canonical including `|version`. Material canonical/inline disagreement can be a valid `unsupported` item outcome. US Core, CARIN, and other implementation guides are illustrative sources of FHIR canonicals and families, not mandatory clinical content or Wallet storage requirements.
