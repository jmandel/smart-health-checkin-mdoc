# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

Short title: **SMART Health Check-in 1.0**. Suggested citation label: **SHC-Checkin-1.0**. Suggested document identifier: `smart-health-checkin-1.0`.

## 0.1 Document status

Status: editor's draft for implementer review. Version: 1.0 draft. Publication date, editors, contributors, sponsoring organizations, IPR process, acknowledgments, and final publication owner are to be supplied by the publishing organization.

## 0.2 Editorial approach

This candidate is a reader-first implementer guide. It preserves normative requirements, exact constants, validation rules, crypto/wire details, registries, Appendix A, Appendix B, and Appendix C while compressing the assembled draft. Examples, fixtures, byte ladders, diagrams, FHIR mapping detail, implementation notes, and historical captures are treated as companion material; the main specification remains internally sufficient for normative implementation.

## 0.3 Copyright and license

Copyright (publication year) publication owner(s) and contributors. This specification text is intended for publication under CC BY 4.0 or a successor open documentation license. Code fragments, schemas, CDDL fragments, pseudocode, and test-vector scaffolding are intended to be usable for implementation and conformance testing under final publication terms.

## 1. Introduction

SMART Health Check-in 1.0 defines a patient-mediated check-in profile. A Requester asks a Holder, through a Wallet/Responder, for workflow-bounded clinical or administrative content and receives a structured response. Version 1.0 has two normative layers: (1) the transport-neutral clinical request/response JSON model in Sections 5 and 6, and (2) the same-device direct `org-iso-mdoc` presentation flow over the W3C Digital Credentials API in Sections 7 and 8. Future bindings can carry the same clinical model, but they need their own presentation, trust, replay/freshness, response-validation, registry, example, and fixture profiles.

### 1.1 Core Trust Rule

**Core Trust Rule.** A component SHALL keep clinical request/response semantics separate from trust evidence. It SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown request members, deployment handoff metadata, demo strings, Artifact contents, Holder action, HPKE success, mdoc issuer/device evidence, reader authentication, or request-id matching as a substitute for another trust layer. The SMART request body is not an authenticated requester identity container, and successful presentation transport does not by itself establish clinical-source provenance for unsigned raw FHIR JSON.

### 1.2 Scope map

| Layer | Normative in v1.0 | Implementer question | Where |
| --- | --- | --- | --- |
| Clinical request | Yes | What can a Requester ask for? | Section 5, Appendix B |
| Clinical response | Yes | What can a Wallet return, and how is it validated? | Section 6, Appendix B |
| Trust framework | Yes | Which facts are trusted at which layer? | Section 7 |
| Same-device presentation | Yes, for live presentation support | How are request/response bytes carried over `org-iso-mdoc`? | Section 8, Appendix C |
| Deployment handoff | No protocol layer | How do kiosk, QR, NFC, relay, deep link, or completion UX launch and finish? | Deployment policy/companion material |
| Examples and fixtures | Informative unless profiled | How do I test and debug? | Companion material |

This specification defines the SMART request and response JSON objects, selector and Artifact semantics, per-item Holder control and status, layered trust interpretation, the direct same-device `org-iso-mdoc` binding, extension/registry rules, and conformance artifacts. It does not define issuance, wallet storage, EHR write-back APIs, identity proofing, patient matching, payments, a universal production trust framework, full FHIR profile validation, platform-specific Android/iOS APIs, a QR/NFC/deep-link protocol, a relay/storage protocol, a completion callback protocol, or a v1.0 OID4VP runtime binding.

### 1.3 Deployment-defined handoff rule

A deployment MAY use QR, NFC, deep links, signs, kiosks, portal buttons, relays, or other handoffs to load a Holder-facing same-device Verifier page that invokes Section 8. That handoff is implementation-defined deployment UX, not a SMART Health Check-in conformance feature or wire protocol. Its URL formats, storage, routing, relay behavior, completion behavior, labels, and local controls SHALL NOT redefine SMART request fields, SMART response fields, selectors, Artifact media types, fulfillment/status accounting, Section 7 trust layers, or Section 8 validation.

### 1.4 Conventions, terms, and companion material

Uppercase requirement keywords are interpreted under RFC 2119 and RFC 8174. JSON examples are RFC 8259 JSON. CBOR, CDDL, COSE, and HPKE notation follows the referenced specifications. `bstr .cbor X`, `tag24(CBOR(X))`, and `#6.24(bstr .cbor X)` denote CBOR byte boundaries used by Section 8 and Appendix C. Base64url strings are unpadded unless stated. JSON fences are parseable JSON; fragments and pseudocode use text fences.

| Term | Meaning |
| --- | --- |
| Requester | Constructs a SMART request and consumes the clinical response. |
| Verifier | Packages a request in a presentation flow, validates presentation evidence, extracts a SMART response, and applies Section 6.6. |
| Holder | Person or party controlling disclosure. |
| Wallet / Responder | Receives a request, applies Holder control and policy, constructs a SMART response, and returns it. |
| Browser / User Agent | Digital Credentials API surface and origin/caller context provider. |
| Artifact | Response object with `id`, `mediaType`, `fulfills[]`, and media-type-defined payload. |
| Request item | Unit of Holder review, accepted media-type advertisement, fulfillment, and status. |
| Profile family | Published family of FHIR profiles identified by `profilesFrom[]` canonical URL. |
| Profile identifier | Conformance/deployment/fixture label; never an in-band selector shortcut. |

Companion material for examples, fixtures, byte ladders, diagrams, FHIR mapping detail, implementation notes, and historical captures is expected at <https://github.com/jmandel/smart-health-checkin-mdoc> or a successor companion repository. Companion artifacts are informative unless a named profile incorporates them.

## 4. Conformance

A conformance claim SHALL identify target(s), feature/profile, specification version, and deployment profile if any. A product MAY claim multiple targets and SHALL satisfy each claimed target and feature.

| Target | Conformance obligation |
| --- | --- |
| Requester | Constructs Section 5 requests and lists only Artifact media types it can process for each item. |
| Verifier | Packages requests for claimed flows, validates presentation evidence, extracts a response, and applies Section 6.6 before Requester use. Direct same-device claims SHALL satisfy Section 8. |
| Holder Wallet / Responder | Validates Section 5 requests, applies Holder control and Wallet policy, preserves ids, constructs Section 6 responses, and returns them through a supported flow. Direct same-device claims SHALL satisfy Section 8. |
| Deployment/profile author | States constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations without redefining core semantics. |
| Conformance/fixture author | Derives checks from normative requirements and identifies target, feature set, section, expected outcome, comparison mode, and demo trust status. |

The mandatory clinical core is Sections 5 and 6. Direct same-device presentation in Sections 7 and 8 is the normative live presentation layer for implementations that claim live SMART Health Check-in 1.0 presentation support. JSON-schema tools, fixtures, deployment profiles, and handoff UX do not by themselves claim live Section 8 support.

Core clinical support includes `selection.fhir`; `form.fhir` with `questionnaireCanonical` and/or `questionnaire` directly on the selector; `profilesFrom[]` as an array of canonical profile-family URLs; additive `profiles[]` plus `profilesFrom[]`; canonical `|version` handling; per-item `accept[]`; Artifact `mediaType`; no `GenericArtifact`; `application/fhir+json` with `fhirVersion`; `application/smart-health-card` with `value.verifiableCredential[]` and no outer `fhirVersion`; exact `requestStatus[]` coverage; and Section 6.6 cross-validation.

| Identifier kind | Value |
| --- | --- |
| Request `type` | `smart-health-checkin-request` |
| Response `type` | `smart-health-checkin-response` |
| Request/response `version` | `1` |
| Selector kinds | `selection.fhir`, `form.fhir` |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Stable element | `smart_health_checkin_response` |
| Request carrier key | `org.smarthealthit.checkin.request` |

Profile labels are documentation/certification/deployment/fixture labels, not SMART request fields or selector shortcuts. Provisional labels are `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and reserved `smart-health-checkin-oid4vp-reserved`. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, preset, IPS shortcut, profile label, topic label, or negotiation metadata.

Implementations SHALL compare and interpret the version marker for the layer being processed and SHALL NOT substitute one layer's version for another. Minor revisions and extensions MAY add optional members, stricter policies, registered selectors/media types/status codes, fixture profiles, or trust requirements only when unsupported recipients can ignore, reject, or report unsupported without changing known-field meaning or bypassing validation. Breaking changes require a new version, profile, or future specification revision.

Extensions are explicit and additive. Selector extensions SHALL define exact `content.kind`, JSON shape, clinical meaning, fulfillment, interactions, validation, unsupported behavior, security, privacy, and examples. Artifact extensions SHALL define pinned media type or bounded pattern, typed payload fields, carrier shape, integrity/dereference rules, FHIR-version semantics if any, validation, status behavior, security, privacy, and compatibility. Status-code extensions SHALL NOT be used in v1.0 unless explicitly supported by the receiving Verifier. No extension SHALL redefine core fields, core selectors, core Artifact rules, same-device carriers, or the Core Trust Rule.

Appendix A indexes conformance obligations and does not create independent requirements.

## 5. Clinical Request Model

A `SmartHealthCheckinRequest` is the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, for workflow-bounded clinical or administrative content. Transports can add origin, reader authentication, signatures, encryption, freshness, routing, and validation artifacts; they do not change request field semantics.

### 5.1 Encoding

A Requester SHALL encode a request as an RFC 8259 JSON object; serialized text/bytes SHALL be UTF-8. A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or non-JSON values. A Wallet/Responder or Verifier SHALL reject non-object roots, unparsable representations, and detected duplicate object member names. Object member order has no clinical meaning. Array order matters only where stated: `fhirVersions[]`, `accept[]`, and `items[]` display/workflow preference. This section defines no numeric fields; identifiers, versions, booleans, arrays, media types, canonicals, and display strings SHALL NOT be encoded as numbers.

A Wallet/Responder MAY ignore unknown members when known-member meaning is unchanged. Unknown members do not fix malformed known members. A Requester SHALL NOT rely on unknown members for identity, Holder-control override, `accept[]`, selector semantics, `required`, transport, trust, or consent. Unknown `content.kind` values are extension selectors, not ignorable members.

### 5.2 Top-level object

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

| Field | Rule |
| --- | --- |
| `type` | Required exact `smart-health-checkin-request`; absent/other values SHALL be rejected. |
| `version` | Required exact `1`; absent/other values SHALL be rejected unless future compatibility applies. Not a FHIR or transport version. |
| `id` | Required non-empty opaque Requester-generated id unique among that Requester's same-session requests. Wallets SHALL preserve for `requestId`. Not patient id, requester id, freshness proof, or clinical fact. |
| `purpose` | Optional string for Holder-facing workflow context only. SHALL NOT carry requester identity, organization, origin, logos, contacts, legal authority, consent, trust status, or authorization. |
| `fhirVersions` | Optional ordered array of FHIR release-version strings for raw FHIR JSON and similar formats. Requesters accepting `application/fhir+json` SHOULD include at least one version unless any conforming returned version is safe. Wallets SHOULD use it when choosing raw FHIR versions, subject to Holder choice, data, capability, policy, and `accept[]`. |
| `items` | Required array of request items. Requesters SHOULD include at least one item, but v1.0 does not hard-require non-empty arrays. Wallets SHALL process items as Holder-review and response-accounting granularity and preserve item ids. |

A Requester SHALL NOT include self-asserted requester identity metadata anywhere in the SMART request body, including extension members. Prohibited metadata includes organization/facility names, branding/logos, URLs/domains/origins/callbacks, package/app ids, certificates, signed-request or reader metadata, trust/accreditation/legal-entity claims, and deployment handoff/pointer/relay/completion/encryption/nonce/wrapper metadata. A Wallet/Responder SHALL NOT treat any SMART request field as authenticated requester identity unless established outside the request body.

### 5.3 Request item

| Field | Rule |
| --- | --- |
| `id` | Required non-empty string, unique within one request. Wallets SHALL reject missing, non-string, empty, or duplicate ids. Wallets/Verifiers SHALL compare exact strings. Newly defined ids SHOULD use ASCII letters, digits, `.`, `_`, `~`, `-`; Wallets MAY accept other strings if preserved exactly. Ids SHOULD NOT embed patient/requester ids, secrets, tracking values, or clinical facts. |
| `title` | Required non-empty Holder-facing string; SHALL NOT substitute for requester identity. Wallets SHOULD make it available in Holder review subject to policy. |
| `summary` | Optional explanatory string; SHOULD clarify broad selectors, profile-family requests, or questionnaire purpose when needed; SHALL NOT substitute for identity. |
| `required` | Optional boolean; omitted means `false`. Advisory workflow context only, not consent, authorization, Wallet command, or return guarantee. Wallets SHALL NOT bypass Holder control/policy and MAY return any valid non-fulfilled status. |
| `content` | Required selector object with string `content.kind`. Core kinds are `selection.fhir` and `form.fhir`; extensions follow Section 5.4.3. Wallets SHALL NOT infer unsupported semantics from display text. |
| `accept` | Required non-empty ordered array of media type strings, most preferred first. Requesters SHALL list only parseable/validatable/routable types. Wallets MAY choose any listed type, SHOULD choose the earliest equivalent producible type, and SHALL NOT return an Artifact for an item unless the Artifact `mediaType` is listed or a compatibility rule applies. |

### 5.4 Selectors

Selectors describe what satisfies an item; they are not FHIR query language, authorization policy, consent, patient matching, or requester identity. Requesters SHALL use a core or registered selector. Wallets SHALL evaluate selectors independently per item, while Section 6 allows many-to-many fulfillment.

#### 5.4.1 `selection.fhir`

`selection.fhir` requests existing patient-specific FHIR resources. A Requester SHALL set `kind` to `selection.fhir`. It MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination, or none. Present members SHALL be arrays of strings. It SHALL NOT include `questionnaireCanonical` or `questionnaire`; use separate items for resource selection and form completion.

| Member | Rule |
| --- | --- |
| `profiles[]` | Exact FHIR `StructureDefinition` profile canonicals; SHOULD be canonical URLs; MAY include `|version`. Wallets MAY match `meta.profile` or equivalent local/trusted conformance evidence; full profile validation is not required for request matching. |
| `profilesFrom[]` | Non-empty array of canonical profile-family URL strings. SHALL NOT be scalar/object/package descriptor/IG object/package id/version/npm name/alias/local topic/URN unless future work defines it. Wallets SHALL reject a present member that is not a non-empty array of strings and MAY reject non-canonical URLs by policy. |
| `resourceTypes[]` | Official FHIR `resourceType` names only. With `profiles[]`/`profilesFrom[]`, this is an additional resource-type constraint; without them, it requests patient-specific resources of listed types. |
| No selector fields | Requests any patient-specific FHIR resources the Wallet can offer and Holder chooses to share, constrained by `accept[]`, `fhirVersions[]`, capability, policy, and Holder decision. Requesters SHOULD avoid this unless breadth is safe and clear. Wallets MAY fulfill partially and are not required to disclose all resources. |

`profiles[]` and `profilesFrom[]` are additive. A resource satisfies the profile-selector portion if it matches any exact profile or any profile in any requested family, subject to `resourceTypes[]` and the item. Requesters SHALL NOT rely on `profiles[]` to narrow `profilesFrom[]`; Wallets SHALL NOT treat `profiles[]` as limiting or enumerating the family.

#### 5.4.2 `form.fhir`

`form.fhir` requests completion of a FHIR Questionnaire and return of an accepted Artifact, normally a `QuestionnaireResponse` in `application/fhir+json`.

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active"
  }
}
```

A Requester SHALL set `kind` to `form.fhir` and include `questionnaireCanonical`, `questionnaire`, or both as direct selector members. `questionnaireCanonical`, when present, SHALL be a non-empty canonical string and MAY include `|version`. `questionnaire`, when present, SHALL be a FHIR `Questionnaire` object with `resourceType` `Questionnaire`. `form.fhir` SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. Wallets SHALL reject or report unsupported for missing form fields, invalid canonical, non-Questionnaire inline resource, or mixed selection fields.

Wallets MAY resolve canonicals through a configured resolver, FHIR search, cache, Holder data source, or local mechanism satisfying Section 5.5. Direct HTTP dereference is permitted only for unversioned canonicals. If resolution/rendering/use fails, Wallets SHALL report a Section 6 outcome rather than fabricate a Questionnaire. When canonical and inline resource both appear, Wallets SHALL NOT silently merge conflicting definitions or rewrite the canonical. Material disagreement SHOULD produce `unsupported` or `error`.

#### 5.4.3 Extension selectors

An extension selector kind SHALL define exact kind string, JSON shape, members, clinical meaning, satisfaction rules, interactions with `accept[]`, `fhirVersions[]`, canonicals, status and fulfillment, unsupported/unavailable/partial/error behavior, unknown-member handling, privacy, security, and examples. It SHALL NOT redefine core fields or permit requester identity metadata unless future work defines that trust model. Unsupported selector kinds SHALL be rejected or reported `unsupported`; Wallets SHALL NOT guess from display text.

### 5.5 FHIR canonical `|version`

Processors SHALL parse canonicals into non-empty `url` and optional `version` at the first `|`; further `|` characters belong to the version string. They SHALL preserve the original wire string for carrying, signing, encrypting, fixtures, echoing, response construction, returned `Resource.meta.profile`, and generated `QuestionnaireResponse.questionnaire` when it is the answered Questionnaire identity. Internal parsing SHALL NOT rewrite emitted values.

Resolution SHALL use a configured resolver, package cache, terminology/IG resolver, or FHIR canonical search when available: `GET [base]/{ResourceType}?url={url}&version={version}` for versioned canonicals and `?url={url}` for unversioned. Direct HTTP dereference is permitted only for unversioned canonicals. Versioned canonicals SHALL NOT be satisfied by stripping `|version` and dereferencing the bare URL. Resolved resources SHALL match expected `resourceType`, `url`, and requested `version`; failures become `unsupported` or `error`.

| Operation | Required handling |
| --- | --- |
| Transport, logs, fixtures, echo, response fields | Preserve exact wire string, subject to privacy minimization. |
| Routing/grouping/family lookup | MAY ignore version only for local classification where exact version is not the validation question. |
| Exact `profiles[]` with `|version` | Require versioned `meta.profile` or equivalent exact-version local conformance evidence before Wallets report `fulfilled` or Verifiers accept exact fulfillment. |
| Exact `profiles[]` without `|version` | MAY match any supported version of the base canonical subject to evidence and policy. |
| Returned `meta.profile` / `QuestionnaireResponse.questionnaire` | Preserve known `|version`; SHALL NOT strip suffixes to satisfy exact-version requests. |

### 5.6 Accepted media types

`accept[]` is per item, non-empty, ordered by Requester preference, and contains media type strings the Requester can parse, validate, and route. Wallets MAY return any listed type and SHOULD choose the earliest equivalent type they can produce. Wallets and Verifiers SHALL enforce that every Artifact `mediaType` is accepted by every fulfilled item unless a supported compatibility rule applies.

| Media type | Meaning |
| --- | --- |
| `application/fhir+json` | Raw FHIR JSON Resource/Bundle; for forms, normally `QuestionnaireResponse`; response Artifact declares `fhirVersion`. |
| `application/smart-health-card` | SMART Health Card file JSON; response Artifact uses `value.verifiableCredential[]` and no outer `fhirVersion`. |

Extension media types require registered/profiled Artifact shape, processing, validation, security, privacy, FHIR-version handling if any, and compatibility.

## 6. Clinical Response Model

A `SmartHealthCheckinResponse` is the transport-neutral clinical JSON object returned by a Wallet/Responder after Holder review, policy, and data-source checks. Presentation transports do not change `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, or `requestStatus[]`.

### 6.1 Top-level object

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "request-123",
  "artifacts": [],
  "requestStatus": []
}
```

| Field | Rule |
| --- | --- |
| `type` | Required exact `smart-health-checkin-response`; Verifiers SHALL reject absent/other values. |
| `version` | Required exact `1`; Verifiers SHALL reject absent/other values unless future compatibility applies. |
| `requestId` | Required exact original request `id`; Verifiers SHALL reject mismatch. Correlation only, not freshness/identity/provenance. |
| `artifacts` | Required array; MAY be empty if statuses account for every item. Order has no fulfillment meaning unless a media type says otherwise. |
| `requestStatus` | Required per-item outcome array, even when every item is fulfilled. |

### 6.2 Artifact rules

Every Artifact SHALL include non-empty string `id`, non-empty `mediaType`, non-empty `fulfills[]`, and media-type-defined payload fields. Artifact ids are response-scoped and SHALL NOT duplicate; Verifiers SHALL reject missing, non-string, empty, or duplicate ids. Artifact ids are not patient, requester, global document, or provenance ids absent separate evidence.

`mediaType` declares clinical response form; no separate Artifact-level protocol `type` exists. Core v1.0 recognizes only `application/smart-health-card` and `application/fhir+json`. Verifiers SHALL reject unrecognized media types unless a registered/profiled extension is explicitly supported, even if plausible carrier fields exist. Extensions SHALL be branded variants with pinned or bounded media types and typed fields, not generic catch-alls.

`fulfills[]` SHALL contain original request item ids by exact string. One Artifact MAY fulfill many items and one item MAY be fulfilled by many Artifacts, but each edge SHALL independently satisfy media-type, selector, FHIR-version, status, and validation rules. Wallets SHALL still include exactly one `requestStatus[]` per item.

| Artifact media type | Required payload and rules |
| --- | --- |
| `application/smart-health-card` | `value.verifiableCredential[]` non-empty array of SMART Health Card VC JWS strings. Wallets SHALL NOT include outer Artifact `fhirVersion`; Verifiers SHALL reject it. Verifiers SHALL verify each JWS under SMART Health Cards and local trust policy and evaluate signed payload content against selectors. |
| `application/fhir+json` | Non-empty `fhirVersion`; `value` is FHIR Resource object or Bundle. Wallets SHALL interpret all resources under the Artifact `fhirVersion`, SHALL NOT mix releases in one Artifact, SHOULD use Bundle for multiple resources, SHOULD choose requested FHIR versions when possible, and SHALL preserve known `meta.profile` including `|version`. Verifiers SHALL validate FHIR object shape, `fhirVersion`, Bundle interpretation, and mixed-release detection/quarantine. |

Extension Artifacts SHALL define media type, fields, shape, encoding, integrity/dereference rules, FHIR-version handling if any, status behavior, validation, security, privacy, and compatibility. If an extension contains raw FHIR, it SHALL define any outer `fhirVersion` rule.

### 6.3 Status reporting

A Wallet/Responder SHALL include exactly one `requestStatus[]` entry for every original request item, with exact item id and no duplicates or unknown ids. A Verifier SHALL reject a response without exact coverage. If the request has zero items, `requestStatus` is still required as an array.

| Code | Semantics |
| --- | --- |
| `fulfilled` | Wallet believes item was fully satisfied by returned Artifacts. |
| `partial` | Some relevant content returned without claiming complete fulfillment. |
| `unavailable` | Item understood and supported, but no matching content available/shareable under policy, without Holder refusal as cause. |
| `declined` | Holder declined or Wallet policy treated Holder preference as refusal. |
| `unsupported` | Wallet could not understand/support selector, shape, media type, Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | Operational/processing failure after item was understood and not simply declined, unavailable, or unsupported. |

Wallets SHALL use status codes according to these semantics and only these codes unless a future extension is explicitly supported by the Verifier. Unknown v1.0 status codes are invalid. `fulfilled` or `partial` SHOULD have at least one fulfilling Artifact unless a registered extension defines non-Artifact fulfillment. `message` MAY be included but SHALL NOT contain secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data. Receivers SHALL use `status`, not `message`, for normative semantics.

### 6.4 Verifier cross-validation

Before clinical use, a Verifier SHALL validate the response against the original request. It SHALL reject or quarantine unless: `requestId` exactly matches; every `fulfills[]` reference resolves and is non-empty string; every `mediaType` is recognized and accepted by each fulfilled item or allowed by a supported compatibility rule; `requestStatus[]` covers every item exactly once; raw FHIR Artifacts have non-empty `fhirVersion`, FHIR object shape, and no detected mixed-release Bundle; SMART Health Card Artifacts have no outer `fhirVersion`; and each Artifact payload satisfies its own media-type validation and trust policy.

Verifiers SHOULD inspect returned FHIR `resourceType`, `meta.profile`, Bundle entries, and `QuestionnaireResponse.questionnaire` for selector responsiveness. For exact versioned profile requests, Wallets SHALL NOT claim `fulfilled`, and Verifiers SHALL NOT accept exact fulfillment, without exact-version `meta.profile` or equivalent conformance evidence. A syntactically valid response can still be declined, partial, unsupported, unsuitable for ingestion, or insufficient under local policy.

## 7. Trust Framework

Trust layers are distinct and SHALL NOT be substituted for each other except by explicit specification or deployment profile.

| Layer | Evidence | Not proof of |
| --- | --- | --- |
| Origin | Platform/browser authenticated origin or approved origin-equivalent. | Reader authentication, clinical provenance, Holder consent, patient match, downstream authorization. |
| Reader / Verifier | Optional `readerAuth` and trust policy. | Clinical authority, patient identity, source provenance, write-back authorization. |
| Issuer / device | mdoc issuer/MSO/digest/device-key/session evidence. | Production issuer accreditation unless policy accepts it; clinical-source provenance for all Artifacts. |
| Clinical source | Artifact signatures, provenance, FHIR evidence, SHC validation, extension evidence, policy. | Automatically produced by transport success. |
| Deployment policy | Trust anchors, allow-lists, registries, assurance labels, failure behavior. | A redefinition of core JSON or wire semantics. |

Origin trust SHALL come from authenticated platform/browser/privileged-caller evidence, not SMART request fields, launch URLs, logos, request ids, selector URLs, or Artifacts. Wallets using origin trust SHALL use platform-provided origin or approved origin-equivalent for Section 8 binding and display. If unavailable, origin trust is absent; Wallets SHALL NOT compensate with request-body identity. Deployment mappings from origin to organization/display are policy and SHALL NOT change request semantics.

Reader authentication is optional in core v1.0 unless policy requires it. If a Verifier includes `readerAuth`, it SHALL bind it to the exact session transcript and exact tag-24 `ItemsRequest` bytes and SHALL NOT reuse it. A Wallet that supports or relies on `readerAuth` SHALL verify COSE signature, detached payload, bytes, algorithm/key evidence, certificate/public-key material, and trust policy. It SHALL distinguish absent, malformed, cryptographically failed, valid-but-untrusted, and trusted states. Presence of `readerAuth`, `x5chain`, names, logos, `kid`, launch URLs, or demo certificates is not authentication.

Verifier issuer/device trust SHALL be based on Section 8 validation plus deployment trust anchors or registries. Verifiers relying on mdoc issuer evidence SHALL validate MSO issuer signature, key/certificate path or equivalent evidence, digest bindings, docType, namespace, element ids, validity, device proof, and policy. Self-attested wallets MAY be accepted only under explicit deployment policy and SHALL be labeled with that assurance. Self-attestation does not relax JSON validation or same-device validation.

Clinical-source trust SHALL be evaluated from Artifact media type, signatures/provenance, selectors, FHIR evidence, SMART Health Card rules, extension rules, and policy. For `application/smart-health-card`, Verifiers SHALL verify every JWS before relying on signed content. For `application/fhir+json`, Verifiers SHALL treat content as patient-mediated unless separate accepted provenance/signature/source-attestation/authenticated-retrieval evidence exists. Wallets SHALL NOT claim unsigned raw FHIR is an issuer-signed credential because of transport encryption, mdoc signatures, device proof, origin, readerAuth, Holder action, or response validation.

Identifiers are scoped correlation values. Request `id`, `requestId`, item ids, Artifact ids, origins, reader/issuer certificate subjects, nonces, transcripts, URL tokens, relay ids, and completion ids SHALL NOT be used as proof or authorization for another layer unless a specification or deployment profile defines that binding. Deployment profiles adding trust requirements SHALL document constrained roles, trust layers, anchors/registries/allow-lists, freshness/revocation/replay expectations, Wallet and Verifier failure behavior, assurance levels, and Holder display rules, and SHALL NOT redefine core clinical semantics.

## 8. Same-device Presentation Flow

Version 1.0 live presentation uses W3C Digital Credentials API direct `org-iso-mdoc`: the Verifier carries the Section 5 request and the Wallet returns the Section 6 response inside an HPKE-encrypted mdoc `DeviceResponse`. Clinical semantics remain in Sections 5 and 6; trust interpretation remains Section 7.

### 8.1 Fixed values

| Purpose | Value |
| --- | --- |
| DC API protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| namespace | `org.smarthealthit.checkin` |
| response element | `smart_health_checkin_response` |
| request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE alg | ES256 / `-7` |

Verifiers SHALL use the fixed values exactly. Wallets SHALL carry the SMART response only as issuer-signed `elementValue` for `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. Dynamic element names, individual FHIR profiles/items/resources, alternate namespaces, archived experiments, and wrapper fields are not v1.0 carriers.

### 8.2 Verifier request construction

A Verifier SHALL serialize a valid SMART request as UTF-8 JSON text and place that CBOR text string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`; it is not CBOR map form or base64url JSON. The logical `ItemsRequest` requests `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo carrier `org.smarthealthit.checkin.request`. The element boolean is mdoc `intentToRetain`; Verifiers SHALL default it to `true` and MAY set `false` only for true ephemeral use allowed by policy. It is not consent, identity, retention authorization, or selector.

The Verifier SHALL CBOR-encode `ItemsRequest`, wrap it in tag 24, and place it in `DocRequest.itemsRequest`. It SHALL construct `DeviceRequest.version` exactly `"1.0"` and SHALL NOT use v1.1 `readerAuthAll` as core v1.0 reader authentication. Optional per-`DocRequest.readerAuth` SHALL be detached ES256 `COSE_Sign1` over tag-24 `ReaderAuthentication` containing `"ReaderAuthentication"`, `SessionTranscript`, and exact `ItemsRequestBytes`; protected header `{1:-7}`; payload `null`; empty external AAD; and header label `33` (`x5chain`) with at least the leaf certificate. It SHALL be computed for exact bytes and not reused.

For each request the Verifier SHALL generate or select DHKEM(P-256, HKDF-SHA256) recipient key material, SHOULD use a fresh key pair, and SHALL construct CBOR `encryptionInfo = ["dcapi", {"nonce": fresh unpredictable bytes, "recipientPublicKey": P-256 COSE_Key}]`. Nonce entropy SHOULD be at least 16 bytes. It SHALL preserve the exact `encryptionInfo` bytes and exact unpadded base64url string. The DC API request data contains unpadded base64url CBOR `deviceRequest` and `encryptionInfo` strings under protocol `org-iso-mdoc`.

### 8.3 Transcript

Both sides SHALL compute:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact request-wrapper string. `origin` is authenticated browser/platform origin or deployment-approved origin-equivalent, never SMART request fields or handoff metadata. The same bytes SHALL be used for readerAuth, HPKE `info`, device authentication, HPKE opening, and device-signature verification. If origin/origin-equivalent is unavailable, origin trust is absent; no request field may be substituted.

### 8.4 Wallet request handling

Before response construction, the Wallet SHALL validate protocol `org-iso-mdoc`; decode and parse `data.deviceRequest`; require `DeviceRequest.version` `"1.0"`; locate tag-24 `ItemsRequest` and preserve exact tag-24 bytes; require docType, namespace, stable element, and requestInfo carrier; recover `intentToRetain`; parse requestInfo string as UTF-8 JSON and validate Section 5; decode/parse `data.encryptionInfo`; require direct `"dcapi"` envelope and P-256 recipient public key; and recompute the transcript from exact `encryptionInfoBase64Url` and authenticated origin/origin-equivalent. Failure SHALL reject, report platform failure, or fail safely; Wallets SHALL NOT infer request semantics from alternate carriers.

If `readerAuth` is present and supported/relied on, the Wallet SHALL verify detached COSE, protected algorithm, reader-authentication payload, transcript, exact tag-24 `ItemsRequest`, signature, `x5chain`, and trust policy, and classify absent, syntactically invalid, cryptographically failed, valid-untrusted, and trusted states. The Wallet SHALL then perform Holder review or equivalent Holder-control at request-item granularity, preserve item ids, and SHALL NOT treat `required: true` or request display text as consent or authenticated identity.

### 8.5 Wallet response construction and encryption

A Wallet that proceeds SHALL construct a Section 6 response with exact `requestId`; serialize it as UTF-8 JSON; create an issuer-signed item in namespace `org.smarthealthit.checkin` with `elementIdentifier` `smart_health_checkin_response` and `elementValue` equal to response JSON; tag-24 wrap the CBOR `IssuerSignedItem`; place it under `issuerSigned.nameSpaces`; and compute the MSO digest over the complete tag-24 bytes. `digestID` SHALL match the MSO `valueDigests` key.

The Wallet SHALL construct an MSO with `docType` `org.smarthealthit.checkin.1`, `digestAlgorithm` `SHA-256`, value digest for the stable element, and `deviceKeyInfo.deviceKey`; sign it as ES256 `issuerAuth` with tag-24 MSO payload unless Appendix C/profile defines equivalent encoding; construct `DeviceAuthentication` over `"DeviceAuthentication"`, the transcript, `docType`, and tag-24 `DeviceNameSpaces`; sign with the device key corresponding to the MSO; and build successful `DeviceResponse.version` `"1.0"`. The SMART response remains issuer-signed and SHALL NOT be moved into device-signed namespaces.

The Wallet SHALL HPKE-encrypt CBOR `DeviceResponse` to the recipient public key with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. It SHALL wrap output as CBOR `["dcapi", {"enc": bstr, "cipherText": bstr}]`, base64url-encode without padding, and return DC API result protocol `org-iso-mdoc` with `data.response`. It SHALL NOT return plaintext `DeviceResponse`, plaintext SMART response JSON, non-empty AAD, another HPKE suite, or alternate carrier.

### 8.6 Verifier processing

A Verifier SHALL require returned protocol `org-iso-mdoc`; decode/parse `data.response`; require direct `dcapiResponse` with `enc` and `cipherText`; reconstruct expected transcript from original exact `encryptionInfoBase64Url` and origin; HPKE-open using retained key, required suite, transcript `info`, and empty AAD; reject on failure; parse `DeviceResponse`; require version `"1.0"`, successful status, and document `docType`; verify ES256 `issuerAuth`, MSO, issuer evidence, docType, validity, device key, and policy; locate the issuer-signed stable item; recompute digest over exact tag-24 item bytes and compare with MSO; verify device signature over expected `DeviceAuthentication`; require string `elementValue`; parse and validate Section 6 response; and apply Section 6.6.

A Verifier SHALL reject or quarantine if HPKE, mdoc issuer/MSO, digest, device authentication, stable-element extraction, SMART response validation, or Section 6.6 fails. Trust decisions SHALL remain separate. Required validation details are summarized in Appendix A and Appendix C.

## 9. Security, Privacy, Registries, and Internationalization

### 9.1 Security

Security is layered: origin, privileged-caller policy, optional reader authentication, issuer/device evidence, SMART response validation, SMART Health Card signatures, raw-FHIR provenance, HPKE confidentiality, identifier binding, and downstream policy are separate controls. A component SHALL NOT describe one successful control as proof that another succeeded unless specified or profiled.

For Section 8, Verifiers MUST NOT accept plaintext `DeviceResponse`, plaintext SMART response JSON, substituted HPKE suite, or wrong transcript context. Wallets/Verifiers SHALL NOT downgrade ciphertext to plaintext or treat decryption as clinical validation. Freshness comes from fresh nonce, retained HPKE key material, exact `encryptionInfo` string, authenticated origin/origin-equivalent, transcript, optional readerAuth, and device authentication; request/response ids are correlation, not freshness.

Wallets SHALL use authenticated origin/caller evidence, not launch metadata or request JSON. Wallets relying on reader authentication SHALL verify signature, bytes, algorithm, key/certificate evidence, transcript, and policy and SHALL distinguish absent/malformed/failed/valid-untrusted/trusted states. Verifiers SHALL complete Section 8 validation and Section 7 policy before claiming issuer/device trust. Raw FHIR remains patient-mediated absent separate source proof.

Implementations SHALL reject unsupported/unexpected v1.0 algorithm labels instead of downgrading or substituting defaults. Version 1.0 uses ES256 / COSE `-7` and HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM. Future cryptographic agility should use explicit versioned profiles and conformance vectors.

Implementations SHOULD minimize plaintext requests, responses, FHIR, SHCs, Questionnaire answers, `DeviceResponse`, `dcapiResponse`, HPKE fields, `deviceRequest`, `encryptionInfo`, secrets, access tokens, bearer URLs, full launch URLs, QR images, and enumeration clues outside controlled diagnostics or fixtures. Wallet UX is a security control: before disclosure, Wallets SHALL validate the request, compute transcript, classify readerAuth, perform Holder-control at item granularity, preserve ids, support refusal/partial sharing, and avoid hiding broad or multiple items.

### 9.2 Privacy

Requesters SHOULD ask for the minimum content needed. Selectors, `purpose`, titles, summaries, profile URLs, resource types, Questionnaire text, media types, and FHIR versions can disclose sensitive context. Wallets SHALL preserve item ids and provide Holder review or equivalent control at item granularity; they MAY group/summarize/reorder/translate/suppress for accessibility, safety, localization, law, or policy but SHALL NOT defeat meaningful Holder control. `required: true`, `intentToRetain`, QR/NFC/deep-link actions, loading a page, or clicking a button is not consent.

Wallets SHOULD return only Artifacts satisfying approved items, choices, policy, data, and accepted media types. Selective disclosure occurs through items, policy, Holder decisions, Artifact construction, `accept[]`, `fulfills[]`, and status; the mdoc binding carries one stable response element and does not disclose each clinical resource separately. Receivers SHALL NOT use mdoc evidence, HPKE, Artifact ids, `fulfills[]`, request-id matching, or Holder approval to imply raw-FHIR provenance.

Implementations SHOULD avoid identifier reuse across unrelated sessions/Verifiers/Holders and avoid embedding patient, requester, appointment, staff, clinic, source-document, clinical, secret, or predictable values in ids, URLs, telemetry, or logs unless protected by policy. Wallets SHOULD distinguish unauthenticated request text from authenticated trust signals and make privacy-relevant consequences understandable. The default `intentToRetain` is `true`; it is a signal, not a retention authorization or legal override.

Sensitive categories can include mental health, substance use, reproductive/sexual health, infectious disease, genetics, disability, medications, minors, proxies, coverage, contact safety, immigration/employment-sensitive information, and free text. Wallets MAY apply stricter review, warnings, redaction, refusal, or valid item statuses. Telemetry/logs SHOULD collect the minimum needed, prefer aggregate/redacted/scoped/short-retention data, and SHOULD NOT send plaintext payloads, clinical content, Holder decisions, keys, secrets, credentials, full ciphertext blobs, launch URLs, QR images, or sensitive stack traces to routine systems except under controlled procedures.

### 9.3 Registries

Values are compared by exact, case-sensitive equality unless a future registered extension defines otherwise.

| Registry | v1.0 entries and rule |
| --- | --- |
| Media types | `application/fhir+json` and `application/smart-health-card`. Extensions SHALL be branded variants with pinned/bounded media types and typed fields, not generic catch-alls. |
| mdoc identifiers | `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, `org.smarthealthit.checkin.request`. External registration may still be needed. Future incompatible mdoc changes SHOULD use new profile/docType suffix. |
| Status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`. Unknown v1.0 codes are invalid unless explicitly supported. New codes SHALL NOT redefine core codes or exact status coverage. |
| Selector kinds | `selection.fhir`, `form.fhir`. Future selectors SHALL define kind, shape, semantics, interactions, statuses, examples, security, and privacy and SHALL NOT redefine core fields, Holder control, canonical handling, identity handling, or trust boundaries. |
| Profile identifiers | Labels for conformance/deployment/fixture/future-binding rules. They SHALL NOT be in-band request selectors, presets, IPS shortcuts, topic labels, or negotiation metadata. |

Registry changes use designated expert review unless future governance is stricter. Requests SHOULD include identifier, category, lifecycle, change controller, stable specification, targets/features/versions, syntax, processing, validation, unsupported behavior, compatibility/deprecation, examples/tests, security, privacy, logging/retention, fixture/diagnostic status, and dependencies. Review should preserve Sections 5-8 semantics, validation, trust separation, v1 identifiers unless future-profile scoped, HPKE transcript binding, and privacy/security; it should reject changes that move identity/trust metadata into the SMART request body, create topic shortcuts, require plaintext intermediaries, weaken Holder control, conflate identifiers, treat demo material as production trust, or overclaim raw-FHIR provenance.

### 9.4 Internationalization

Human-readable text includes `purpose`, item `title`, item `summary`, `requestStatus[].message`, FHIR Questionnaire/display text, UI text, and extension display fields. Protocol identifiers and machine values SHALL NOT be localized. SMART Health Check-in 1.0 defines no `lang`, `locale`, `Accept-Language`, language maps, negotiated-locale fields, or locale parameters in the core request, response, or same-device binding; implementations SHALL NOT rely on unknown members, browser language, URLs, or headers as interoperable locale negotiation unless profiled.

Language tags introduced by FHIR, extensions, or deployment profiles SHOULD be BCP 47. Missing tags do not imply English. FHIR content follows FHIR i18n/localization. Requesters SHOULD author display text suitable for Holder review. Wallets MAY translate/summarize/group/reorder/suppress for accessibility, localization, safety, or policy but SHALL preserve protocol values. Receivers SHALL NOT use localized `message` for status semantics.

Producers of new display text SHOULD emit Unicode NFC; consumers SHOULD handle valid non-NFC. Components SHALL NOT use normalization, case folding, accent/width folding, confusable mapping, BIDI reordering, transliteration, aliases, or locale collation to make distinct identifiers/constants compare equal. Display normalization SHALL NOT change bytes/code points used for signatures, hashes, encryption, HPKE/HKDF inputs, COSE inputs, mdoc digests, SMART Health Card verification, FHIR canonical preservation, audit records, or byte-exact fixtures. UIs SHOULD isolate untrusted/BIDI text from trust signals and controls and SHALL NOT let rendering spoof identifiers, origins, provenance, statuses, validation outcomes, Holder decisions, or consent controls.

## Appendix A. Conformance checklist

This checklist indexes testable obligations defined elsewhere in SMART Health Check-in 1.0. It does not create independent requirements. Rows for optional features, optional targets, or optional deployment constraints apply only to implementations claiming that feature, target, profile, or deployment constraint, even when the source section uses `SHALL` or `SHOULD` for that claimed feature.

| ID | Target | Level | Section | Checklist item | Evidence/validation |
| --- | --- | --- | --- | --- | --- |
| A-001 | Requester / Verifier | SHALL | §4 | Identify each claimed target, feature/profile, specification version, and deployment profile. | Claim lists target, optional features, version, and policy dependencies. |
| A-002 | Holder Wallet / Responder | SHALL | §4 | Validate SMART requests under §5 before response construction and preserve item ids for `fulfills[]` and `requestStatus[].item`. | Malformed requests fail safely; valid responses reference original item ids exactly. |
| A-003 | Deployment/profile author | SHALL | §4 | State constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations without redefining core semantics. | Profile maps added rules to targets and sections; no base semantic override. |
| A-004 | Conformance/fixture author | SHALL | §4 | Derive tests and fixtures from normative sections and identify target, feature set, section, expected outcome, comparison mode, and demo trust status. | Fixture/test manifest records pass/fail criteria, comparison mode, PHI/test-key status. |
| A-005 | Requester / Verifier | SHALL | §5.1 | Encode SMART requests as RFC 8259 JSON and UTF-8 when serialized by a transport. | Parser/serializer tests reject invalid UTF-8, comments, trailing commas, non-JSON values, and non-object roots. |
| A-006 | Holder Wallet / Responder | SHALL | §5.1 | Reject unparsable or non-object SMART requests under the selected transport encoding rules. | Negative corpus includes arrays, strings, null roots, malformed JSON, and encoding errors. |
| A-007 | Holder Wallet / Responder | SHALL | §5.1 | Reject duplicate object member names detected during SMART request parsing or validation. | Duplicate-key fixture is rejected rather than accepted by first/last-wins behavior. |
| A-008 | Requester / Verifier | SHALL | §5.2 | Include request `type`, `version`, `id`, and `items`; set `type` to `smart-health-checkin-request` and `version` to `1`. | Schema/procedural validation verifies required top-level members and constants. |
| A-009 | Holder Wallet / Responder | SHALL | §5.2 | Reject requests whose `type` is absent or not exactly `smart-health-checkin-request`. | Case-sensitive discriminator mutation tests fail. |
| A-010 | Holder Wallet / Responder | SHALL | §5.2 | Reject requests whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-011 | Requester / Verifier | SHALL | §5.2 | Generate a non-empty opaque request `id` unique among that Requester's requests for the same check-in session. | Construction tests check non-empty session-local ids and no patient/requester meaning. |
| A-012 | Holder Wallet / Responder | SHALL | §5.2 | Preserve request `id` for later `SmartHealthCheckinResponse.requestId` construction. | Response construction asserts exact string equality to original request id. |
| A-013 | Requester / Verifier | SHALL | §5.2 | Use `purpose`, when present, only as Holder-facing workflow context, not requester identity, trust, consent, or authorization. | Request and UI review separate `purpose` from authenticated trust display. |
| A-014 | Requester / Verifier | SHOULD | §5.2 | Include `fhirVersions[]` when accepting `application/fhir+json` unless any conforming FHIR version can be safely processed. | Raw-FHIR-capable requests declare supported FHIR releases or document broad capability. |
| A-015 | Holder Wallet / Responder | SHOULD | §5.2 | Use `fhirVersions[]` when choosing raw FHIR JSON versions, subject to Holder decision, capability, data, and policy. | Response selection evidence shows version preference handling or justified inability. |
| A-016 | Requester / Verifier | SHALL | §5.2 | Encode `items` as an array of request items. | Request schema/procedural validation covers item array shape. |
| A-017 | Holder Wallet / Responder | SHALL | §5.2 | Process `items[]` as Holder-review and response-accounting granularity while preserving item ids even if display is grouped or reordered. | UX/state tests show per-item outcomes and exact ids in response. |
| A-018 | Requester / Verifier | SHALL NOT | §5.2 | Do not include self-asserted requester identity, origin, reader, certificate, callback, logo, deployment handoff, or trust metadata in the SMART request body. | Generated requests and extension fields contain no prohibited identity/trust metadata. |
| A-019 | Holder Wallet / Responder | SHALL | §5.2 | Do not treat any SMART request body field as authenticated requester identity. | UI/trust tests distinguish request text from origin, reader, deployment, or presentation evidence. |
| A-020 | Requester / Verifier | SHALL | §5.3 | Include item `id`, `title`, `content`, and non-empty `accept[]` on every request item. | Request validation rejects missing required item fields and empty `accept[]`. |
| A-021 | Requester / Verifier | SHALL | §5.3 | Use non-empty item ids and avoid duplicates within one SMART request. | Request validation rejects empty, non-string, or duplicate item ids. |
| A-022 | Holder Wallet / Responder | SHALL | §5.3 | Reject requests with missing, non-string, empty, or duplicate item ids. | Negative item-id fixtures fail before response construction. |
| A-023 | Holder Wallet / Responder | SHALL | §5.3 | Compare item ids by exact string equality. | Cross-validation rejects normalized, case-folded, localized, or transformed id variants. |
| A-024 | Requester / Verifier | SHALL | §5.3 | Provide non-empty Holder-facing `title` on every item and do not use it as requester identity. | Request review flags missing/empty title and identity-like title misuse. |
| A-025 | Requester / Verifier | SHALL | §5.3 | Treat `required` only as advisory workflow context, not consent, authorization, or a disclosure command. | Required items can still produce declined, partial, unavailable, unsupported, or error outcomes. |
| A-026 | Holder Wallet / Responder | SHALL | §5.3 | Treat omitted `required` as `false` and never use `required: true` to bypass Holder control or Wallet policy. | Holder-review tests allow refusal or non-fulfillment for required items. |
| A-027 | Requester / Verifier | SHALL | §5.3 | Order `accept[]` from most preferred to least preferred and list only media types the Requester can parse, validate, and route. | Request catalog maps each accepted media type to receiver support. |
| A-028 | Holder Wallet / Responder | SHALL | §5.3 | Do not return an Artifact for an item unless its `mediaType` appears in that item's `accept[]` or a supported compatibility rule applies. | Response construction rejects or status-reports unaccepted media types. |
| A-029 | Requester / Verifier | SHALL | §5.3 | Include `content` as a selector object with string `content.kind` on every request item. | Validator rejects missing/malformed selectors. |
| A-030 | Holder Wallet / Responder | SHALL | §5.3 | Do not infer unsupported selector semantics from display text or unrelated fields. | Unknown `content.kind` yields rejection or `unsupported`, not guessed fulfillment. |
| A-031 | Requester / Verifier | SHALL | §5.4 | Use a selector shape defined by §5 or a registered extension selector for interoperable processing. | Generated requests use core or registered selector kinds only. |
| A-032 | Holder Wallet / Responder | SHALL | §5.4 | Evaluate selector semantics independently per request item while allowing §6 many-to-many Artifact fulfillment. | Tests show per-item status plus valid shared Artifacts where allowed. |
| A-033 | Requester / Verifier | SHALL | §5.4.1 | For `selection.fhir`, set `kind` exactly and encode `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, when present, as arrays of strings. Do not include `form.fhir` fields in the same selector. | Shape tests reject scalar/object selector fields and mixed form/resource-selection fields. |
| A-034 | Requester / Verifier | SHALL | §5.4.1 | Encode `profilesFrom` as a non-empty array of canonical profile-family URL strings, not a string, package descriptor, alias, local topic, or URN. | Negative tests include stale scalar/package/local-topic encodings. |
| A-035 | Holder Wallet / Responder | SHALL | §5.4.1 | Reject a present `profilesFrom` member that is not a non-empty array of strings. | Selector validation fails invalid `profilesFrom` shapes. |
| A-036 | Holder Wallet / Responder | SHALL | §5.4.1 | Treat `resourceTypes[]` as official FHIR resource-type constraints, not local topic labels. | Matching tests require listed FHIR `resourceType` values. |
| A-037 | Holder Wallet / Responder | SHALL | §5.4.1 | Treat `profiles[]` and `profilesFrom[]` as additive profile selectors, not narrowing selectors. | Matching accepts resources matching either exact profile or profile-family membership. |
| A-038 | Requester / Verifier | SHALL NOT | §5.4.1 | Do not rely on `profiles[]` to narrow a broader `profilesFrom[]` request. | Request review flags examples/tests assuming intersection semantics. |
| A-039 | Requester / Verifier | SHOULD | §5.4.1 | Avoid no-selector `selection.fhir` requests unless broad patient-specific FHIR content is safe and clearly explained. | Broad selector review checks workflow justification and Holder-facing text. |
| A-040 | Holder Wallet / Responder | MAY | §5.4.1 | Satisfy no-selector `selection.fhir` items with patient-specific FHIR resources compatible with `accept[]`, policy, and Holder choice. | Broad-selector tests show allowed partial fulfillment and no full-export requirement. |
| A-041 | Requester / Verifier | SHALL | §5.4.2 | For `form.fhir`, set `content.kind` to `form.fhir` and include at least one of `questionnaireCanonical` or `questionnaire` directly on the selector. Do not include `selection.fhir` fields in the same selector. | Validation accepts the form selector shape and rejects mixed form/resource-selection shapes. |
| A-042 | Holder Wallet / Responder | SHALL | §5.4.2 | Reject or report unsupported for `form.fhir` selectors with neither `questionnaireCanonical` nor `questionnaire`, non-string/blank `questionnaireCanonical`, non-Questionnaire `questionnaire`, or mixed `selection.fhir` fields. | Negative form fixtures produce rejection or `unsupported`. |
| A-043 | Holder Wallet / Responder | SHALL NOT | §5.4.2 | Do not silently merge conflicting Questionnaire `questionnaireCanonical` and inline `questionnaire` definitions or rewrite canonical identity. | Conflict tests yield `unsupported` or `error`, not silent merge. |
| A-044 | Deployment/profile author | SHALL | §5.4.3 | Define extension selector kind string, JSON shape, clinical meaning, fulfillment, validation, unsupported behavior, security, privacy, and examples. | Extension registration checklist covers all required fields. |
| A-045 | Requester / Verifier | SHALL | §5.5 | Apply canonical version-suffix handling rules for each operation it performs, preserving exact wire strings where required. | Tests preserve exact strings for transport/fixtures and compare at defined normalization levels. |
| A-046 | Holder Wallet / Responder | SHALL | §5.5 | Resolve canonicals with a configured resolver or FHIR canonical search when versioned, verify returned `(resourceType, url, version)`, and use direct HTTP dereference only for unversioned canonicals. | Resolver tests reject version-mismatched resources and do not direct-fetch versioned canonicals by stripping a version suffix. |
| A-047 | Holder Wallet / Responder | SHALL | §5.5 | Preserve requested Questionnaire canonical in generated `QuestionnaireResponse.questionnaire` when known. | Questionnaire response fixtures retain canonical version suffixes when provided. |
| A-048 | Holder Wallet / Responder | SHALL NOT | §5.5 | Do not remove canonical version suffixes from returned FHIR `meta.profile` values or exact-version profile evidence merely due to routing or grouping. | Raw FHIR fixtures preserve versioned `meta.profile` values. |
| A-049 | Requester / Verifier | SHALL | §5.6 | Encode each `accept[]` as a non-empty ordered array of media type strings and use order as preference. | Request validation preserves order and finds no separate preference field. |
| A-050 | Holder Wallet / Responder | SHOULD | §5.6 | Choose the earliest acceptable media type it can produce when response forms are otherwise equivalent. | Media negotiation tests or policy review show preference-order handling. |
| A-051 | Holder Wallet / Responder | SHALL | §6.1 | Include response `type`, `version`, `requestId`, `artifacts`, and `requestStatus`; set constants to `smart-health-checkin-response` and `1`. | Response schema/procedural validation covers top-level fields and constants. |
| A-052 | Requester / Verifier | SHALL | §6.1 | Reject responses whose `type` is absent or not exactly `smart-health-checkin-response`. | Negative discriminator tests fail. |
| A-053 | Requester / Verifier | SHALL | §6.1 | Reject responses whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-054 | Holder Wallet / Responder | SHALL | §6.1 | Set response `requestId` to the exact accepted SMART request `id`. | Response construction tests assert exact equality. |
| A-055 | Requester / Verifier | SHALL | §6.1 | Reject a SMART response whose `requestId` does not exactly equal the original SMART request `id`. | Cross-validation test mutates `requestId`. |
| A-056 | Holder Wallet / Responder | SHALL | §6.2 | Include Artifact `id`, `mediaType`, non-empty `fulfills[]`, and the payload fields defined by that Artifact media type on every Artifact. | Response validation rejects missing common fields and payload shapes not defined for the media type. |
| A-057 | Holder Wallet / Responder | SHALL NOT | §6.2 | Do not reuse the same Artifact `id` within one SMART response. | Duplicate Artifact-id validation fails. |
| A-058 | Requester / Verifier | SHALL | §6.2 | Reject duplicate, missing, non-string, or empty Artifact ids. | Negative Artifact-id fixtures fail. |
| A-059 | Holder Wallet / Responder | SHALL | §6.2 | Use `mediaType` as the Artifact clinical response form, not a separate Artifact-level protocol `type`. | Artifact fixtures use `mediaType` for clinical form. |
| A-060 | Holder Wallet / Responder | SHALL | §6.2 | Set every `fulfills[]` value to exactly one original request item id. | Response construction forbids unknown or empty fulfillment references. |
| A-061 | Requester / Verifier | SHALL | §6.2 | Reject unresolved, absent, empty, or non-string `fulfills[]` references. | Cross-validation rejects unknown or malformed fulfillment references. |
| A-062 | Requester / Verifier | SHALL | §6.2 | Do not infer dereferencing, decoding, signature, freshness, integrity, or generic carrier semantics from field names alone. | Extension Artifact tests require media-type-defined payload and processing rules. |
| A-063 | Holder Wallet / Responder | SHALL | §6.2 | For `application/smart-health-card`, include non-empty `value.verifiableCredential[]` and no outer Artifact `fhirVersion`. | Artifact validation rejects missing VC list or outer `fhirVersion`. |
| A-064 | Requester / Verifier | SHALL | §6.2 | Verify and process each SMART Health Card JWS according to SMART Health Cards and local trust policy. | SHC validation/trust tests run on each `verifiableCredential[]` JWS. |
| A-065 | Holder Wallet / Responder | SHALL | §6.2 | For `application/fhir+json`, include non-empty `fhirVersion` and FHIR JSON `value` as a Resource or Bundle. | Artifact validation rejects absent `fhirVersion` and non-FHIR object payloads. |
| A-066 | Holder Wallet / Responder | SHALL NOT | §6.2 | Do not mix resources requiring different FHIR releases within one `application/fhir+json` Artifact. | Mixed-release content is split or status-reported, not mixed in one Artifact. |
| A-067 | Requester / Verifier | SHOULD | §6.2 | Treat raw FHIR `fhirVersion` not acceptable for the original request or receiver as unsupported for ingestion. | Receiver policy checks requested FHIR versions before ingestion. |
| A-068 | Deployment/profile author | SHALL | §6.2 | Define extension Artifact media types as branded variants with pinned media type, typed payload fields, validation, FHIR-version handling, status behavior, security/privacy, and compatibility. | Extension registration includes all required processing and validation rules and does not rely on `GenericArtifact`. |
| A-069 | Holder Wallet / Responder | SHALL | §6.3 | Include exactly one `requestStatus[]` entry for every original request item and no unknown or duplicate item ids. | Response tests compare status item set exactly to request item id set. |
| A-070 | Requester / Verifier | SHALL | §6.3 | Reject a SMART response unless `requestStatus[]` covers every request item exactly once with no unknown item ids. | Cross-validation tests missing, duplicate, and unknown status items. |
| A-071 | Holder Wallet / Responder | SHALL | §6.3 | Use only v1.0 status codes unless a supported future status-code extension applies. | Status validation rejects codes outside `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`. |
| A-072 | Holder Wallet / Responder | SHALL | §6.3 | Use `unsupported`, `unavailable`, `declined`, `partial`, `fulfilled`, and `error` according to defined item-outcome semantics. | Outcome tests cover unsupported format, unavailable data, Holder refusal, partial sharing, full fulfillment, and processing errors. |
| A-073 | Holder Wallet / Responder | SHALL NOT | §6.3 | Do not put secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data in `requestStatus[].message`. | Message lint/review inspects status messages. |
| A-074 | Requester / Verifier | SHALL | §6.3 | Do not rely on localized `message` text to determine normative status semantics. | Receivers process `status` code, not message text. |
| A-075 | Holder Wallet / Responder | MAY | §6.2 | Return one Artifact for multiple items or multiple Artifacts for one item only when every fulfillment edge satisfies media-type and selector rules. | Many-to-many tests validate each `fulfills[]` edge independently. |
| A-076 | Requester / Verifier | SHALL | §6.4 | Apply full request/response cross-validation before treating a response as protocol-valid; shape validation alone is insufficient. | Harness validates against original request, not response schema alone. |
| A-077 | Requester / Verifier | SHALL | §6.4 | Enforce that each Artifact `mediaType` is accepted by every fulfilled item unless a supported registered compatibility rule applies. | §6.6 validation rejects unaccepted media types. |
| A-078 | Requester / Verifier | SHALL | §6.4 | For raw FHIR JSON, verify `fhirVersion`, FHIR object shape, Bundle interpretation, and no mixed FHIR releases in one Artifact. | Raw FHIR cross-validation/quarantine tests cover each condition. |
| A-079 | Requester / Verifier | SHOULD | §6.4 | Inspect returned FHIR `resourceType`, `meta.profile`, Bundle entries, and `QuestionnaireResponse.questionnaire` when assessing selector responsiveness. | FHIR-aware validation or quarantine policy evaluates payload evidence. |
| A-080 | Requester / Verifier | SHALL | §7 | Preserve trust-layer separation among origin, reader, issuer/device, clinical-source, and deployment policy. | Trust report records separate pass/fail/unknown state for each layer. |
| A-081 | Holder Wallet / Responder | SHALL | §7 | Use platform-provided authenticated origin or approved origin-equivalent for origin trust, not SMART request fields or deployment handoff metadata. | Origin-binding tests reject request-body origin substitutes. |
| A-082 | Holder Wallet / Responder | SHALL | §7 | Treat origin trust as absent when web origin or privileged-caller context cannot be authenticated. | Missing-origin tests produce absent-origin state or defined flow failure. |
| A-083 | Requester / Verifier | MAY | §7 | Include optional per-`DocRequest.readerAuth` for same-device requests. | If present, request bytes include detached `COSE_Sign1` bound to §8 inputs. |
| A-084 | Requester / Verifier | Conditional | §7 | If including `readerAuth`, construct it for the same presentation session and exact requested items; do not reuse across sessions, transcripts, or `ItemsRequest` bytes. | ReaderAuth vectors bind signature to exact `SessionTranscript` and tag-24 `ItemsRequest`. |
| A-085 | Holder Wallet / Responder | Conditional | §7 | If supporting or relying on `readerAuth`, verify COSE signature, signed context, detached payload binding, relevant bytes, algorithm/key evidence, and trust policy. | Validation distinguishes absent, malformed, failed, valid-untrusted, and trusted states. |
| A-086 | Holder Wallet / Responder | SHALL | §7 | Treat absent `readerAuth` as absent reader authentication and invalid/untrusted `readerAuth` as failed authentication. | Policy/UI tests do not display failed or absent readerAuth as trusted. |
| A-087 | Requester / Verifier | SHALL | §7 | Complete §8 mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence. | Verifier tests fail on invalid MSO, digest, device signature, transcript, or HPKE opening. |
| A-088 | Requester / Verifier | SHALL | §7 | Apply issuer trust-anchor policy before claiming production mdoc issuer trust. | Validation report shows issuer signature/path/key evidence and policy result. |
| A-089 | Requester / Verifier | SHALL | §7 | Verify device-key proof bound to the expected presentation session before treating mdoc presentation as device-bound. | DeviceAuthentication tests fail on wrong `SessionTranscript` or device key. |
| A-090 | Requester / Verifier | SHALL | §7 | Evaluate clinical-source trust from Artifact media type, signatures/provenance, selectors, FHIR evidence, and deployment policy; do not infer provenance from transport success. | Raw FHIR and SHC provenance are recorded separately from mdoc validation. |
| A-091 | Requester / Verifier | SHALL | §7 | For SMART Health Card Artifacts, verify every VC JWS and evaluate payload content against original selectors and local policy. | SHC verifier logs signature/trust plus selector evaluation. |
| A-092 | Requester / Verifier | SHALL | §7 | Treat raw `application/fhir+json` as patient-mediated unless accepted separate provenance, signature, source attestation, authenticated retrieval, or equivalent proof is present. | Workflow policy does not equate raw FHIR with SHC or signed source evidence. |
| A-093 | Requester / Verifier | SHALL | §7 | Preserve identifier scopes and do not use an identifier from one layer as proof or authorization for another. | Tests distinguish request id, item ids, Artifact ids, and presentation-session values. |
| A-094 | Deployment/profile author | SHALL | §7 | Document mandatory trust layers, accepted anchors/registries, freshness/replay expectations, failure handling, assurance levels, and Holder display rules. | Deployment profile includes trust policy matrix and failure behavior. |
| A-095 | Requester / Verifier | Optional-profile | §8.1 | For direct same-device support, use `org-iso-mdoc`, `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request` exactly. | Wire capture matches all fixed identifiers. |
| A-096 | Holder Wallet / Responder | Optional-profile | §8.1 | Carry the SMART response only as `smart_health_checkin_response` `elementValue` in namespace `org.smarthealthit.checkin`. | mdoc response inspection rejects dynamic elements and alternate carriers. |
| A-097 | Requester / Verifier | SHALL | §8.2 | Serialize the SMART request as UTF-8 JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. | DeviceRequest fixture shows CBOR text string, not CBOR map or base64 JSON. |
| A-098 | Requester / Verifier | SHALL | §8.2 | Construct `ItemsRequest` with version-1 docType, namespace, stable response element, requestInfo, and `intentToRetain` behavior. | Byte-ladder or decoded request verifies logical shape and retention flag. |
| A-099 | Requester / Verifier | SHALL | §8.2 | CBOR-encode `ItemsRequest` and wrap those bytes in CBOR tag 24 in `DocRequest.itemsRequest`. | Fixture comparison checks tag-24 boundary. |
| A-100 | Requester / Verifier | SHALL | §8.2 | Use `DeviceRequest.version` exactly `1.0`; do not use v1.1 `readerAuthAll` as core v1.0 reader authentication. | DeviceRequest tests reject `readerAuthAll` for core profile. |
| A-101 | Requester / Verifier | Conditional | §8.2 | If including `readerAuth`, construct detached ES256 `COSE_Sign1` over tag-24 `ReaderAuthentication` with payload `null`, empty external AAD, protected alg `-7`, exact transcript/request bytes, and label 33 `x5chain`. | ReaderAuth vector verifies payload null, alg `-7`, label 33 certificate evidence, and signature input. |
| A-102 | Requester / Verifier | SHOULD | §8.2 | Use a fresh HPKE recipient key pair and fresh unpredictable nonce for each presentation session. | Session tests show new nonce/key per request or documented profile for reuse. |
| A-103 | Requester / Verifier | SHALL | §8.2 | Generate/select HPKE P-256 recipient key material and construct `encryptionInfo = ["dcapi", {nonce, recipientPublicKey}]`. | Decoded `encryptionInfo` has direct dcapi shape and P-256 COSE_Key. |
| A-104 | Requester / Verifier | SHALL | §8.2 | Base64url-encode `DeviceRequest` and `encryptionInfo` CBOR bytes without padding and preserve exact `encryptionInfo` string. | DC API request fixture checks unpadded strings and exact transcript input. |
| A-105 | Requester / Verifier | SHALL | §8.3 | Compute `SessionTranscript` from exact `encryptionInfoBase64Url` and authenticated origin as the direct `dcapi` handover. | Byte-ladder recomputes `dcapiInfo`, SHA-256 handover, and transcript bytes. |
| A-106 | Holder Wallet / Responder | SHALL | §8.3 | Obtain origin from authenticated platform or approved origin-equivalent, never from SMART request fields or deployment handoff metadata. | Wallet trace records authenticated origin source and rejects fallback substitutions. |
| A-107 | Holder Wallet / Responder | SHALL | §8.4 | Validate the `org-iso-mdoc` request wrapper, `DeviceRequest`, tag-24 `ItemsRequest`, requestInfo SMART request, `encryptionInfo`, and transcript before response construction. | Wallet-side validation checklist passes; malformed wrappers fail safely. |
| A-108 | Holder Wallet / Responder | SHALL | §8.4 | Perform Holder review or equivalent Holder-control processing at request-item granularity and preserve item ids. | UX/policy evidence shows per-item accounting and no `required`-as-consent behavior. |
| A-109 | Holder Wallet / Responder | SHALL | §8.5 | Place SMART response JSON text as `elementValue` of issuer-signed `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. | DeviceResponse inspection locates the stable issuer-signed element. |
| A-110 | Holder Wallet / Responder | SHALL | §8.5 | Construct MSO with docType `org.smarthealthit.checkin.1`, SHA-256 digest algorithm, value digest covering the stable element, and deviceKeyInfo. | mdoc validation verifies MSO fields, digest binding, and issuerAuth. |
| A-111 | Holder Wallet / Responder | SHALL | §8.5 | Produce device authentication bound to the same `SessionTranscript`, docType, and tag-24 `DeviceNameSpaces`. | Device signature fixture validates payload and MSO device key. |
| A-112 | Holder Wallet / Responder | SHALL | §8.6 | Encrypt CBOR `DeviceResponse` with HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty AAD. | HPKE tests reject plaintext, wrong suite, wrong info, or non-empty AAD. |
| A-113 | Requester / Verifier | SHALL | §8.6 | Decode and HPKE-open `dcapiResponse`, validate DeviceResponse, issuer/MSO, digest, device proof, stable element, SMART response, and §6.6 before acceptance. | Verifier checklist covers all §8.7 steps and rejection on failure. |
| A-114 | Requester / Verifier | SHALL | §8.6 | Reject or quarantine if HPKE, mdoc issuer/MSO, digest, device-authentication, stable-element, SMART response, or §6.6 validation fails. | Negative vectors for each failure path do not reach workflow acceptance. |
| A-115 | Conformance/fixture author | SHOULD | companion fixture material | Classify same-device fixture roots and byte ladders without inventing alternate carriers or clinical semantics. | Fixture metadata marks conformance candidate, diagnostic, historical, regression, or illustrative status. |
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

## Appendix C: Same-device CDDL and profile constraints

This appendix gives profile constraints and diagnostic pseudo-CDDL for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended to make SMART Health Check-in byte boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The profile reuses ISO/IEC 18013-5 mdoc, COSE, COSE_Key, CBOR, and HPKE structures. ISO/IEC 18013-5 and the referenced COSE/HPKE specifications own the base structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key`. This appendix constrains only SMART Health Check-in profile portions: fixed identifiers, carriers, tag-24 boundaries, direct `dcapi` wrappers, HPKE context, and the stable SMART response element.

The snippets below are profile pseudo-CDDL. They use field names and byte-boundary names from §8 and companion byte-ladder material. They are not a complete replacement for ISO/IEC 18013-5 CDDL, and they do not claim exactness for ISO map labels or optional fields not confirmed by the active profile. If this appendix conflicts with §8, §8 controls.

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

- RFC 2119 and RFC 8174, requirement keywords.
- RFC 8259, JSON.
- RFC 8949, CBOR.
- RFC 9052/RFC 9053 and related COSE specifications.
- RFC 9180, HPKE.
- ISO/IEC 18013-5 mdoc structures used by `org-iso-mdoc`.
- W3C Digital Credentials API, direct `org-iso-mdoc` invocation model.
- HL7 FHIR R4/R4B/R5 canonical, Resource, Bundle, Questionnaire, and QuestionnaireResponse behavior as applicable.
- SMART Health Cards for `application/smart-health-card` payloads.

### Informative references and companion link

- OpenID4VP and DCQL are informative future-binding inputs only.
- US Core, CARIN, and other FHIR implementation guides can supply profile canonicals and profile-family knowledge.
- Companion examples, fixtures, byte ladders, diagrams, FHIR mapping detail, implementation notes, and historical captures: <https://github.com/jmandel/smart-health-checkin-mdoc> or successor companion repository. Companion material is informative unless a named profile incorporates it.
