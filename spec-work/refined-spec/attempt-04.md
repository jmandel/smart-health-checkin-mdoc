# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

**Editorial approach.** This candidate is organized for validators, certification programs, and conformance authors. It keeps the normative clinical model, same-device wire validation, trust boundaries, registries, schemas, CDDL, and checklist rows precise, while moving lengthy narrative, diagrams, worked examples, fixture indexes, byte ladders, and implementation recipes conceptually to companion implementation/conformance material. Companion material must derive from this specification and must not create alternate protocol layers, request fields, selector shapes, Artifact carriers, cryptographic boundaries, or trust semantics.

Short title: **SMART Health Check-in 1.0**. Suggested citation label: **SHC-Checkin-1.0**. Suggested document identifier: `smart-health-checkin-1.0`. Status: editor's draft for implementer review. Version: 1.0 draft. Publication date, editors, contributors, final IPR statement, and final license terms are to be supplied by the publishing organization.

## 1. Introduction, scope, and conventions

### 1.1 Abstract and scope

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receives a structured SMART response. The profile has two normative layers:

1. the transport-neutral clinical request and response JSON model in Sections 5 and 6; and
2. the same-device direct `org-iso-mdoc` presentation flow over the W3C Digital Credentials API in Sections 7 and 8.

The SMART request describes requested items, Holder-facing context, selectors, and accepted response media types. The SMART response returns Artifacts, fulfillment links, and per-item status. Presentation transports can add origin context, reader or Verifier information, encryption, freshness, device evidence, routing metadata, and validation rules; they do not change item semantics, selector meaning, consent granularity, Artifact media types, or response status semantics.

In-person QR, NFC, deep-link, pointer, relay, submission, and completion mechanisms are deployment-defined ways to land a Holder on a same-device Verifier page running Section 8. SMART Health Check-in 1.0 does not standardize those formats or treat them as a separate normative protocol layer.

### 1.2 Out of scope

SMART Health Check-in 1.0 does not define credential or data issuance, longitudinal Wallet storage, EHR write-back, downstream clinical workflow, identity proofing, patient matching, guardian/proxy authority, payments, eligibility adjudication, claims, payer-provider settlement, a general-purpose credential framework, a FHIR query language, SMART App Launch replacement behavior, or QR/NFC/deep-link/pointer/relay/submission/completion-display wire formats. Products may implement such behavior around this protocol, but it does not change SMART request, SMART response, or Section 8 same-device semantics.

### 1.3 Normative status

Sections 4 through 14 and Appendices A through C contain normative requirements or normative-equivalent validation artifacts when they use BCP 14 keywords. Sections 15 through 19 and Appendix D are informative unless they explicitly restate a requirement from Sections 4 through 14. Examples are illustrative. If an example conflicts with normative prose, the prose controls.

Appendix A indexes requirements and does not create independent obligations. Appendix B schemas are structural validation snippets; Sections 5 and 6 control if a schema appears to conflict. Appendix C pseudo-CDDL constrains SMART-specific byte boundaries; Section 8 controls if CDDL appears to conflict.

### 1.4 Requirement keywords and notation

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** are interpreted as described in BCP 14, RFC 2119 and RFC 8174, when, and only when, they appear in all capitals.

A conformance keyword binds the target named by the sentence, paragraph, subsection, or checklist item in which it appears. A requirement for an optional feature applies only to implementations claiming that feature or to deployment profiles that make it mandatory.

JSON uses RFC 8259. CBOR uses RFC 8949. CDDL uses RFC 8610 notation. COSE uses RFC 9052 terminology. JWS uses RFC 7515 terminology. HPKE uses RFC 9180 terminology. Base64url values in this specification use URL-safe base64 without `=` padding unless a field definition explicitly says otherwise. Hashes, signatures, encryption, HPKE inputs, COSE signing inputs, mdoc digest checks, and byte-exact fixture comparisons operate over underlying bytes, not Markdown rendering, diagnostic notation, hex text, or base64url text unless a section explicitly says the textual representation is input.

### 1.5 Terminology

- **Requester**: party that constructs a SMART request and consumes a SMART response.
- **Verifier**: presentation-flow party that packages a request, validates returned presentation artifacts, extracts a SMART response, and applies Section 6.6 cross-validation.
- **Holder**: person, patient, proxy, or other user reviewing the request and controlling disclosure through a Wallet.
- **Wallet / Responder**: component that receives a SMART request, applies Holder control and Wallet policy, constructs a SMART response, and returns it.
- **SMART request**: the `SmartHealthCheckinRequest` JSON object in Section 5.
- **SMART response**: the `SmartHealthCheckinResponse` JSON object in Section 6.
- **Request item**: one unit of requested content or action; the unit of Holder review, media-type advertisement, fulfillment references, and status.
- **Artifact**: returned clinical payload or reference in `artifacts[]`, declared by `mediaType` and linked with `fulfills[]`.
- **Profile family**: FHIR publication, implementation guide, profile collection, or other family of FHIR profiles identified by a canonical URL in `profilesFrom[]`.
- **Deployment profile**: additional requirements or policy constraints for a deployment, certification program, trust framework, fixture set, or extension. Deployment profiles can be stricter but SHALL NOT redefine core semantics.

## 2. Purpose and design goals

The protocol lets Requesters ask for FHIR-shaped clinical or administrative content without inventing local topic vocabularies, and lets Wallets answer with explicit Artifacts and item-level status. Design goals are transport-neutral clinical content, same-device direct `org-iso-mdoc` presentation for live version 1.0 use, per-item Holder review, FHIR-native selectors, many-to-many fulfillment, validator-oriented conformance artifacts, and layered trust.

The active selector model is `selection.fhir` for existing patient-specific FHIR resource selection and `form.fhir` for FHIR Questionnaire form completion with sibling `questionnaireCanonical` and/or `questionnaire`. Version 1.0 does not define `fhir.resources` or `content.kind: "questionnaire"` as core selector shapes. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive selectors, not narrowing selectors.

## 3. Architecture

The clinical content domain is the Section 5 request and Section 6 response. The same-device presentation domain carries those JSON objects through direct `org-iso-mdoc` and adds origin binding, optional reader authentication, mdoc issuer/device evidence, HPKE encryption, and byte-level validation. Presentation evidence does not redefine clinical semantics.

A typical flow is: Requester constructs a request; Verifier packages it for Section 8; Wallet validates, applies trust and Holder control, and constructs a response; Wallet returns the response through Section 8; Verifier validates transport evidence, extracts the response, and applies Section 6.6 before clinical use.

Implementations preserve one version 1.0 mdoc `docType`, one namespace, one stable response element, no requester identity metadata in the clinical request body, FHIR-native selectors, `mediaType` as the Artifact response-form discriminator, explicit `fhirVersion` on raw FHIR JSON, no outer `fhirVersion` on SMART Health Card Artifacts, required item-level status, and strict separation among origin, reader, issuer/device, clinical-source, and deployment-policy trust.

## 4. Conformance

A conformance claim SHALL identify target or targets, feature/profile, specification version, and any deployment profile. A product MAY implement multiple targets but SHALL satisfy every target and feature it claims.

A **Requester** constructs requests and consumes responses under Sections 5 and 6. It SHALL request only Artifact media types it is prepared to process. A **Verifier** packages requests, validates presentation artifacts, extracts responses, and applies Section 6.6 before Requester use. A Verifier claiming same-device `org-iso-mdoc` support SHALL satisfy Section 8.

A Requester/Verifier SHALL keep clinical request fields distinct from trust evidence. It SHALL NOT put requester identity, organization metadata, web origin, reader credentials, deployment handoff metadata, callback endpoints, trust assertions, or production trust-anchor claims in the SMART request body.

A **Holder Wallet / Responder** validates requests, applies Holder control and Wallet policy, constructs responses, and returns them. A Wallet/Responder claiming clinical conformance SHALL validate Section 5 requests before response construction, process request items as Holder-review and response-accounting granularity, preserve item ids for `fulfills[]` and `requestStatus[].item`, construct Section 6 responses, and set `requestId` to the accepted request `id`. A Wallet/Responder claiming same-device `org-iso-mdoc` support SHALL satisfy Section 8.

A Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown request members, deployment handoff metadata, demo strings, or Artifact contents as authenticated requester identity unless established outside the SMART request body by presentation trust processing or deployment policy.

A **deployment-profile author** SHALL state constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations, and SHALL NOT redefine core semantics. A **conformance-test or fixture author** SHALL derive material from normative requirements and identify target, feature set, section reference, expected outcome, comparison mode, and demo trust status.

The mandatory core is the transport-neutral request/response model in Sections 5 and 6. The version 1.0 live presentation binding is the direct same-device `org-iso-mdoc` flow in Sections 7 and 8. A narrower claim for request/response tooling, schema validation, fixture production, deployment-profile authoring, or implementation-defined handoff UX does not by itself claim live Section 8 support.

Clinical Requesters SHALL support fixed request `type`, `version`, request `id`, item shape, item ids, Holder-facing display fields, `content.kind`, per-item `accept[]`, and canonical `|version` rules for operations they perform. Clinical Wallets/Responders SHALL parse and validate requests, preserve identifiers, apply Holder-controlled item-level response accounting, use core status codes, obey media-type rules, and construct conformant responses. Clinical Verifiers or receivers SHALL validate responses and apply Section 6.6 against the original request; shape validation alone is insufficient.

All conformance targets SHALL preserve trust-layer separation. In particular, implementations SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from transport success, mdoc issuer/device evidence, reader authentication, Holder action, response shape validation, deployment metadata, or demo keys.

Optional features include `readerAuth`, extension selectors, extension Artifact media types, status-code extensions, stricter deployment schemas, schema/CDDL/fixture profiles, and future OID4VP work. An implementation claiming an optional feature SHALL satisfy its referenced requirements.

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

Human-readable conformance labels are `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and reserved `smart-health-checkin-oid4vp-reserved`. Profile identifiers are not SMART request fields, response fields, clinical selectors, media types, status codes, request presets, or substitutes for Section 5 selectors.

Implementations SHALL compare and interpret the version marker for the layer they process and SHALL NOT substitute one layer's version for another. Request/response `version: "1"`, same-device `DeviceRequest.version`/`DeviceResponse.version` `"1.0"`, and FHIR `fhirVersions[]`/`fhirVersion`/canonical `|version` are separate.

Extensions are additive. They SHALL NOT redefine core request fields, response fields, selector kinds, media-type rules, fulfillment links, status codes, same-device carriers, or trust-layer separation. Content-selector extensions SHALL define exact `content.kind`, JSON shape, clinical meaning, fulfillment, interaction with `accept[]`, `fhirVersions[]`, canonicals, status, validation, unsupported behavior, security, privacy, and examples. Artifact extensions SHALL define pinned media type or bounded pattern, typed payload fields, dereferencing/integrity rules if any, FHIR-version semantics if any, validation, status behavior, security, privacy, and compatibility. Status extensions SHALL NOT be used unless explicitly supported by the receiving Verifier.

## 5. Clinical content - request

### 5.1 Encoding rules

A SMART request is an RFC 8259 JSON object. When serialized by a transport, it SHALL be UTF-8. A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, non-JSON values, or numeric encodings for identifiers, versions, booleans, arrays, media types, FHIR canonicals, or display strings. A Wallet/Responder or Verifier SHALL reject non-object roots, unparsable requests, and duplicate object member names when detected.

Object member order has no clinical meaning. `fhirVersions[]` and `accept[]` are ordered by Requester preference, and `items[]` is preferred display/workflow order. Unknown members MAY be ignored only when they do not change known required members. A Requester SHALL NOT rely on unknown members to carry requester identity, override Holder control, change `accept[]`, change selector semantics, change `required`, or impose transport, trust, or consent behavior. Unknown `content.kind` is an extension selector, not an ignorable member.

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

A Requester SHALL include `type`, `version`, `id`, and `items`; MAY include `purpose` and `fhirVersions`; SHALL set `type` to `"smart-health-checkin-request"`; and SHALL set `version` to `"1"`. A Wallet/Responder SHALL reject absent or non-exact `type` or `version` unless a future compatibility rule applies.

A Requester SHALL include `id` as a non-empty opaque identifier unique among that Requester's requests for the same check-in session and SHOULD make it sufficiently unpredictable or contextually unique to avoid accidental collision or cross-session guessing. A Wallet/Responder SHALL preserve the request `id` for response `requestId`. The request `id` is not a patient identifier, requester identifier, freshness proof, or clinical fact; a Wallet/Responder SHALL NOT infer requester identity, patient identity, authorization, or clinical meaning from it.

`purpose` is optional display/workflow context. If present, it SHALL be a string and SHALL NOT carry requester identity, organization name, web origin, logo URL, contact URL, legal attestation, authority proof, consent language, trust status, or persistent authorization semantics. A Wallet/Responder MAY display it but SHALL NOT treat it as authenticated identity or trust.

`fhirVersions` is an optional ordered array of FHIR release-version strings the Requester can consume for raw FHIR JSON or other response forms with an outer FHIR version declaration. A Requester accepting `application/fhir+json` SHOULD include at least one FHIR release version unless it can process any conforming return. A Wallet/Responder SHOULD use `fhirVersions[]` when choosing raw FHIR JSON versions, subject to Holder decision, data, capability, policy, and item `accept[]`. It does not override SMART Health Card-intrinsic FHIR version information.

`items` SHALL be an array of request items and SHOULD contain at least one item. A Wallet/Responder SHALL process `items[]` as Holder-review and response-accounting granularity. It MAY group, summarize, translate, or reorder for accessibility, safety, localization, law, or policy, but SHALL preserve item ids for fulfillment and status.

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body, including organization, facility, staff, payer, logo, image, brand, URL, callback, domain, origin, package, application id, certificate, signed-request, reader, Verifier, trust-framework, issuer, accreditation, legal-entity, pointer, relay, completion, encryption, nonce, handoff, or wrapper metadata. This applies to top-level, item, selector, and extension members. Presentation transports may carry authenticated trust evidence in their own envelopes. A Wallet/Responder SHALL NOT treat any request-body field as authenticated requester identity unless established outside the request body.

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

A Requester SHALL include `id`, `title`, `content`, and `accept`; MAY include `summary` and `required`. `id` SHALL be a non-empty string and SHALL be unique within one request. A Wallet/Responder SHALL reject missing, non-string, empty, or duplicate item ids. Item ids are scoped to one request and compared by exact string equality. New ids SHOULD use ASCII letters, digits, `.`, `_`, `~`, and `-`; Wallets MAY accept other non-empty strings when preserving exactly. Requesters SHOULD NOT include patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in item ids.

`title` SHALL be a non-empty Holder-facing string and SHALL NOT substitute for requester identity. `summary` MAY explain requested content and SHALL NOT substitute for identity. `required`, if omitted, is interpreted as `false`. A Requester SHALL treat `required` as advisory workflow context only; `required: true` is not consent, authorization, a Wallet command, or a disclosure guarantee. A Wallet/Responder SHALL NOT treat it as authorization to bypass Holder control, Wallet policy, law, or consent UX.

`accept` SHALL be a non-empty ordered array of media type strings, most preferred first. There is no separate preference field. A Requester SHALL list only media types it can parse, validate, and route. A Wallet/Responder MAY choose any listed media type and SHOULD choose the earliest listed type it can produce when otherwise equivalent. A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact `mediaType` is in that item's `accept[]`, except under a registered compatibility rule.

`content` SHALL be a selector object with string `content.kind`. A Wallet/Responder that does not understand a selector SHALL NOT infer semantics from display text or unrelated fields; it SHALL reject or report `unsupported` according to flow timing and Section 6.

### 5.4 Selectors

A content selector describes what clinical content or action satisfies an item. Selectors are not a general FHIR query language, patient-matching rule, authorization policy, or requester identity channel. A Requester SHALL use a selector defined here or a registered extension. A Wallet/Responder SHALL evaluate selector semantics per item, while Section 6 may allow one Artifact to fulfill multiple items.

#### 5.4.1 `selection.fhir`

```json
{
  "kind": "selection.fhir",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

A Requester SHALL set `kind` to `"selection.fhir"`. It MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination, or none. If present, each SHALL be an array of strings. A `selection.fhir` selector SHALL NOT include `questionnaireCanonical` or `questionnaire`; use separate items when both existing-resource selection and form completion are needed.

`profiles[]` identifies exact FHIR `StructureDefinition` canonicals. Values MAY include `|version`. A Wallet/Responder MAY match by returned/source `meta.profile` or equivalent local/trusted conformance evidence; full profile validation is not core-required unless a deployment profile requires it.

`profilesFrom[]` identifies profile families by canonical URL. A Requester MAY include it only as a non-empty array of canonical profile-family URL strings. It SHALL NOT be a string, object, package descriptor, implementation-guide object, package id, package version, npm package name, registry alias, local topic vocabulary, or URN unless a future version or extension defines that value space. A Wallet/Responder SHALL reject a present `profilesFrom` that is not a non-empty array of strings and MAY reject non-canonical-URL values. Family membership may rely on implementation-guide/package/configured mapping/deployment knowledge outside the request.

`resourceTypes[]` narrows by official FHIR `resourceType` names. A Requester SHALL NOT use local topics such as `"care-plans"`, `"insurance"`, or `"clinical-history"` unless they are official FHIR resource type names. With profile selectors, `resourceTypes[]` is an additional constraint; without profile selectors, it requests patient-specific resources of the listed types.

`profiles[]` and `profilesFrom[]` are additive. If both are present, a resource satisfies the profile-selector portion if it matches any exact profile or any profile belonging to any requested family, subject to `resourceTypes[]` and the item. A Requester SHALL NOT rely on `profiles[]` to narrow `profilesFrom[]`. A Wallet/Responder SHALL NOT interpret `profiles[]` as limiting, filtering, enumerating, or narrowing `profilesFrom[]`.

If all three selector arrays are omitted, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]`, capability, policy, and Holder decision. A Requester SHOULD avoid this no-selector default unless broad content is safe and clearly explained. A Wallet/Responder is not required to disclose all available resources and MAY fulfill partially.

#### 5.4.2 `form.fhir`

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "<Questionnaire canonical>",
  "questionnaire": { "resourceType": "Questionnaire" }
}
```

A `form.fhir` selector requests completion of or response to a FHIR Questionnaire. A Requester SHALL set `content.kind` to `"form.fhir"` and SHALL include `questionnaireCanonical`, `questionnaire`, or both as direct selector members. `questionnaireCanonical`, if present, SHALL be a non-empty FHIR canonical string and MAY include `|version`. `questionnaire`, if present, SHALL be an inline FHIR `Questionnaire` resource object with `resourceType` `"Questionnaire"`.

A `form.fhir` selector SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; use separate `selection.fhir` items for existing resources. A Wallet/Responder SHALL reject or report `unsupported` for a selector with neither form field, invalid `questionnaireCanonical`, non-Questionnaire `questionnaire`, or mixed form/resource-selection fields.

A Wallet/Responder MAY resolve `questionnaireCanonical` by configured resolver, FHIR search, cache, Holder source, or another Section 5.5 mechanism. Direct HTTP dereference is permitted only for unversioned canonicals. If the Questionnaire cannot be resolved, rendered, or used, the Wallet/Responder SHALL report status rather than fabricating a Questionnaire.

When both canonical and inline Questionnaire are supplied, the canonical is the Requester's explicit identity and the inline resource is the body to render or use. A Requester SHOULD keep `questionnaireCanonical`, `questionnaire.url`, and `questionnaire.version` consistent. A Wallet/Responder SHALL NOT silently merge conflicts or rewrite the requested canonical. Material disagreement SHOULD produce `unsupported` or `error` rather than collecting answers against an ambiguous Questionnaire.

#### 5.4.3 Extension selectors

An extension selector registrant SHALL define exact `content.kind`, JSON shape, required and optional members, clinical meaning, fulfillment rules, interactions with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status and Artifact fulfillment, unsupported/unavailable/partial/error behavior, unknown-member handling, security, privacy, and examples. It SHALL NOT redefine core fields or permit requester identity metadata unless a future version defines an explicit trust model. A Wallet/Responder that does not support an extension SHALL NOT guess semantics; it SHALL reject or report `unsupported`.

### 5.5 Canonical `|version` handling

A processor SHALL parse FHIR canonicals into `(url, version?)` by splitting at the first `|`, preserving the original wire string separately. The `url` is non-empty; `version`, when present, is the substring after the first `|` and is opaque even if it contains more `|` characters. Original canonical strings SHALL be preserved exactly when carrying, signing, encrypting, comparing protocol bytes, including in fixtures, returning `QuestionnaireResponse.questionnaire`, and returning `Resource.meta.profile` values, subject to privacy minimization for retained records.

Canonical resolution SHALL use a configured resolver, package cache, terminology/IG resolver, or FHIR canonical search when available. FHIR search uses `GET [base]/{ResourceType}?url={url}&version={version}` when versioned or `GET [base]/{ResourceType}?url={url}` when unversioned. The resolved resource SHALL have expected `resourceType`, matching `url`, and, when versioned, matching `version`. Direct HTTP dereference of parsed `url` is permitted only for unversioned canonicals and only with post-resolution verification. A processor SHALL NOT satisfy a versioned canonical by stripping `|version` and dereferencing the bare URL.

Exact-version `profiles[]` matching requires versioned `meta.profile` evidence or equivalent local evidence for that exact profile version. Unversioned `profiles[]` can match supported versions of the base canonical subject to evidence and policy. Routing, broad classification, family lookup, de-duplication, and display grouping MAY strip or ignore `|version` only locally; such stripping SHALL NOT affect resolution, exact matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation. A Wallet/Responder SHALL NOT rewrite a requested canonical in a way that changes the semantic Questionnaire or profile.

### 5.6 Accepted media types

Core `accept[]` media types are `application/fhir+json` and `application/smart-health-card`. `application/fhir+json` means the Requester can consume raw FHIR JSON and the response Artifact declares `fhirVersion`. `application/smart-health-card` means the Requester can consume SMART Health Card file JSON and FHIR version semantics are inside signed payloads. Extension media types require registered definitions. A Verifier SHALL treat an Artifact as invalid for a fulfilled item if its `mediaType` is not present in that item's `accept[]`, except under a supported compatibility rule.

## 6. Clinical content - response

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

A Wallet/Responder SHALL include `type`, `version`, `requestId`, `artifacts`, and `requestStatus`; SHALL set `type` to `"smart-health-checkin-response"`; SHALL set `version` to `"1"`; and SHALL set `requestId` to the exact accepted request `id`. A Verifier SHALL reject absent or non-exact `type`/`version` and SHALL reject a `requestId` mismatch. `requestId` is correlation only, not patient identity, requester identity, freshness, or provenance.

`artifacts` SHALL be an array and MAY be empty if `requestStatus[]` still accounts for every item. `requestStatus` SHALL be an array and is required even when every item is fulfilled.

### 6.2 Artifact shape and media types

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

Every Artifact SHALL include non-empty string `id`, non-empty `mediaType`, non-empty `fulfills[]`, and media-type-defined payload fields. Artifact ids are scoped to one response. A Wallet/Responder SHALL NOT reuse an Artifact id; a Verifier SHALL reject missing, non-string, empty, or duplicate Artifact ids. Artifact ids SHALL NOT be treated as patient, requester, global document, or provenance identifiers unless separately established.

Artifacts use `mediaType`, not an Artifact-level protocol `type`. The version 1.0 core union contains only `application/smart-health-card` and `application/fhir+json`, plus explicitly supported registered/profied extension variants. A Verifier SHALL NOT treat unknown `mediaType` as generic because it carries `value`, `url`, `data`, or another plausible field.

`fulfills[]` values SHALL exactly equal original request item ids. A Verifier SHALL reject absent, empty, non-string, or unresolved `fulfills[]`. One Artifact MAY fulfill multiple items and one item MAY be fulfilled by multiple Artifacts, but every fulfillment edge SHALL satisfy media-type and selector rules. Multiple Artifacts for one item are not a protocol error.

For core media types, payload is `value`. Extension variants may define `value`, locators, encoded payloads, or other fields, but semantics come only from the recognized media type definition. A Verifier SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration rules from field names alone.

### 6.3 Core Artifact variants

An `application/smart-health-card` Artifact SHALL include `value.verifiableCredential[]` as a non-empty array of SMART Health Card Verifiable Credential JWS strings. A Verifier or receiver SHALL verify each JWS according to SMART Health Cards and local trust policy. A Wallet/Responder SHALL NOT include outer Artifact-level `fhirVersion`; a Verifier SHALL reject such an Artifact. Selector satisfaction is evaluated from signed payload content and local policy, not a wrapper-level profile summary.

An `application/fhir+json` Artifact SHALL include non-empty string `fhirVersion` and `value` as a FHIR JSON Resource or Bundle. A single Resource has string `resourceType`; a Bundle has `resourceType: "Bundle"` and `entry[]` resources when packaging multiple resources. A Wallet/Responder SHALL interpret all resources in one raw FHIR JSON Artifact under the Artifact `fhirVersion` and SHALL NOT mix resources requiring different FHIR releases. Mixed-release responsive content SHALL be split into separate Artifacts or status-reported. Wallets/Responders SHALL preserve known `meta.profile` strings, including `|version`, and SHALL NOT strip version suffixes from returned evidence.

Extension Artifacts SHALL be branded variants with pinned media type or bounded pattern, typed payload fields, validation, FHIR-version semantics if any, status behavior, security, privacy, and compatibility. They SHALL NOT use a generic `GenericArtifact` catch-all or redefine core response fields.

### 6.4 Status reporting

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

A Wallet/Responder SHALL include exactly one status entry for every original request item and no entries for unknown items. A Verifier SHALL reject a response unless `requestStatus[]` covers every item exactly once with no unknown or duplicate item ids.

Allowed version 1.0 status codes are:

| Code | Semantics |
| --- | --- |
| `fulfilled` | Wallet/Responder believes the item was fully satisfied by returned Artifact content. |
| `partial` | Some relevant content was returned, but complete fulfillment is not claimed. |
| `unavailable` | Item, selector, and media type were understood and supported, but no matching shareable content was available and Holder refusal was not the cause. |
| `declined` | Holder declined, or Wallet policy treated Holder preferences as refusal. |
| `unsupported` | Item, selector kind, selector shape, media type, Questionnaire feature, canonical/resource combination, FHIR version, or extension semantics were not supported enough to attempt fulfillment. |
| `error` | Operational or processing error occurred after the item was understood and not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use status codes according to those semantics. It SHALL use `unsupported`, not `unavailable`, when it cannot process the selector/media/FHIR/Questionnaire; SHALL use `unavailable`, not `unsupported`, when understood but lacking shareable content; SHALL use `declined` for Holder refusal; SHALL use `partial` for incomplete disclosure; SHALL use `fulfilled` only when it believes the item is fully satisfied; and SHALL use `error` when failure prevents normal classification. A Verifier SHALL treat unknown status codes as invalid unless an explicitly supported future registry entry applies.

`message` MAY provide concise explanation. It SHALL NOT include secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data. Receivers SHALL NOT rely on `message` text for normative status semantics.

### 6.5 Cross-validation

Before clinical use, a Verifier SHALL validate the SMART response against the original request. It SHALL reject unless `requestId` matches exactly, every `fulfills[]` reference resolves, every Artifact `mediaType` is recognized and accepted by each fulfilled item, `requestStatus[]` covers items uniquely, raw FHIR Artifacts have valid `fhirVersion` and FHIR object shape, raw FHIR Bundles are not mixed-release, and SMART Health Card Artifacts have no outer `fhirVersion`. Shape validation alone is insufficient.

A Verifier SHOULD inspect FHIR `resourceType`, `meta.profile`, Bundle entries, `QuestionnaireResponse.questionnaire`, and related content for selector responsiveness. Exact-version profile requests require exact-version evidence, either returned versioned `meta.profile` or equivalent local evidence. A Verifier SHALL preserve returned `meta.profile` strings exactly and SHALL NOT strip `|version` to satisfy an exact-version request. For `profilesFrom[]`, family knowledge may be outside the response. For questionnaire items, returned `QuestionnaireResponse.questionnaire`, when present, should preserve the requested canonical and `|version` when that canonical is the identity being answered.

## 7. Trust framework

### 7.1 Trust layers

Trust layers are distinct: origin trust, reader/Verifier trust, issuer/device-attestation trust, clinical-source trust, and out-of-band deployment policy. A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator SHALL NOT treat one layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and assurance level. Successful transport presentation does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority, downstream acceptance, or clinical-source provenance for unsigned content.

### 7.2 Origin trust

Origin trust comes from a Browser/User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It is not reader authentication, issuer assurance, clinical-source provenance, Holder consent, patient matching, or downstream authorization. A Requester SHALL NOT place identity metadata in the SMART request to substitute for origin trust. A Wallet/Responder SHALL NOT derive authenticated origin from request JSON, `purpose`, item display text, callbacks, logos, ids, selector URLs, initiation metadata, or Artifacts.

A Wallet/Responder relying on privileged-caller evidence SHALL use authenticated platform evidence and policy; it SHALL NOT derive trust from the SMART request body. If origin cannot be authenticated, it SHALL treat origin trust as absent and SHALL NOT infer requester identity or origin from request fields. If the flow requires origin for cryptographic binding and the Wallet cannot construct the transcript, it SHALL fail or proceed only under an explicit profile defining origin-equivalent bytes, assurance, display, and Verifier behavior.

### 7.3 Reader / Verifier trust

Reader authentication is optional in core v1 unless a deployment profile requires it. A Verifier MAY include per-`DocRequest.readerAuth`; if included, it SHALL bind the same presentation session and exact `ItemsRequest` bytes and SHALL NOT be reused. A Wallet/Responder supporting or relying on `readerAuth` SHALL verify signature, signed context, detached payload, exact request bytes, protected algorithm/key evidence, certificate/public-key evidence, and policy. It SHALL distinguish absent, malformed, cryptographically failed, valid but untrusted/policy-unacceptable, and trusted states. It SHALL NOT treat mere presence of `readerAuth`, `x5chain`, a common name, logo, `kid`, launch URL, or demo certificate as successful reader authentication.

When reader certificates are used for policy, the Wallet/Responder or deployment profile SHALL define trust anchors or registry sources and SHOULD define path validation, key usage, policy OIDs, subject/organization identifiers, validity, revocation/status checks, algorithm constraints, and display mapping.

### 7.4 Issuer/device trust

A Verifier SHALL complete Section 8 mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence, then SHALL apply Section 6.6. When issuer trust is required, a Verifier or deployment profile SHALL define trust-anchor policy. A Verifier relying on mdoc issuer evidence SHALL validate MSO issuer signature, certificate path or key evidence, digest bindings, document type, namespace, element identifiers, validity, and policy. It SHALL NOT treat syntactic validity, a matching digest, a valid signature against an included leaf, or a self-signed issuer as production trust unless policy accepts it.

A Verifier SHALL verify device-key proof bound to the expected session before treating presentation as device-bound. It SHALL NOT accept extracted SMART response as transport-valid if device proof fails, device authentication is not bound to the session, or the disclosed element does not match issuer-signed digest. Self-attested Wallet presentations MAY be accepted only under explicit policy and SHALL be labeled according to resulting assurance; self-attestation does not relax request parsing, response validation, id matching, fulfillment/status accounting, media-type checks, FHIR-version checks, or Section 8 validation.

### 7.5 Clinical-source trust

Clinical-source trust is evaluated at Artifact payload layer and through policy. A Verifier or receiver SHALL evaluate clinical-source trust according to Artifact `mediaType`, payload signatures/provenance, selectors, FHIR evidence, SMART Health Card rules, extension rules, and policy. It SHALL NOT infer clinical-source provenance from transport success alone.

For SMART Health Card Artifacts, Verifiers SHALL verify every JWS and evaluate signed payload content against original selectors and policy. For raw `application/fhir+json`, Verifiers SHALL treat content as patient-mediated unless payload, extension profile, deployment profile, or other accepted evidence supplies provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof. A Wallet/Responder SHALL NOT use transport encryption, mdoc issuer signatures, device proof, `readerAuth`, origin evidence, `purpose`, item text, ids, fulfillment links, initiation fields, or successful response validation to claim unsigned raw FHIR JSON is an issuer-signed clinical credential.

### 7.6 Identifier scopes and deployment policy

Request ids, item ids, Artifact ids, origins, certificate subjects, key ids, mdoc identifiers, transcript components, nonces, URL tokens, relay ids, routing ids, and completion ids have separate scopes. Implementations SHALL NOT treat an identifier from one layer as proof, authorization, or an identifier for another layer unless this specification or a deployment profile defines that binding.

A deployment profile adding trust requirements SHALL document constrained roles and layers, accepted anchors/registries/allow-lists/certificate policies/provenance mechanisms/assurance labels, freshness/revocation/expiration/replay/status expectations, Wallet failure behavior, Verifier/Requester/receiver behavior when presentation succeeds but downstream policy fails, and Holder-facing display distinctions. It SHALL state mandatory trust layers, assurance when layers are absent or fail, and restrictions on returned content. It SHALL NOT redefine clinical request/response semantics.

## 8. Same-device presentation flow over `org-iso-mdoc`

### 8.1 Constants

Version 1.0 uses: protocol `org-iso-mdoc`; `docType` `org.smarthealthit.checkin.1`; namespace `org.smarthealthit.checkin`; stable element `smart_health_checkin_response`; request carrier `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`; HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM; and COSE ES256 / `-7`.

A Verifier SHALL use the exact protocol id, docType, namespace, and element. It SHALL carry the SMART request only as a JSON string in the requestInfo key above. A Wallet/Responder SHALL carry the SMART response only as `elementValue` of an issuer-signed item in namespace `org.smarthealthit.checkin` with `elementIdentifier` `smart_health_checkin_response`.

### 8.2 Verifier request construction

A Verifier SHALL serialize the Section 5 request as UTF-8 JSON text and place it at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a CBOR text string. It is not a CBOR map and not base64url JSON. The core `ItemsRequest` requests `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and includes the requestInfo key. The `nameSpaces` boolean is `intentToRetain`, defaults to `true`, and MAY be `false` only for truly ephemeral use permitted by policy. It is not Holder consent.

A Verifier SHALL NOT model FHIR profiles, items, Questionnaires, media types, status codes, or resources as separate mdoc elements. It SHALL CBOR-encode `ItemsRequest` and wrap it in tag 24 as `DocRequest.itemsRequest`. It SHALL construct `DeviceRequest.version` exactly `"1.0"` and SHALL NOT use version `"1.1"` `readerAuthAll` as core v1 reader authentication.

If `readerAuth` is included, it SHALL be detached `COSE_Sign1` with ES256 (`alg` `-7`), protected header `{1: -7}`, serialized payload `null`, empty external AAD, `ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))`, and COSE header label `33` (`x5chain`) with at least the leaf certificate. It SHALL bind exact transcript and exact tag-24 `ItemsRequestBytes` and SHALL NOT be reused.

For each presentation request, a Verifier SHALL generate or select an HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256) and SHOULD use a fresh pair. `encryptionInfo` SHALL be CBOR `["dcapi", {"nonce": <fresh unpredictable bytes>, "recipientPublicKey": <EC2 P-256 COSE_Key>}]`, with COSE_Key labels `1:2`, `-1:1`, `-2:<x bstr>`, `-3:<y bstr>`. Nonce entropy SHOULD be at least 16 bytes. The Verifier SHALL retain the private key and exact `encryptionInfo` CBOR bytes until processing completes or session is abandoned.

The Verifier SHALL base64url-encode CBOR `DeviceRequest` and `encryptionInfo` without padding in the Digital Credentials API request and SHALL preserve the exact `encryptionInfo` base64url string.

### 8.3 SessionTranscript

Both sides SHALL compute:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact unpadded request string. `origin` is authenticated origin or deployment-approved privileged-caller origin-equivalent from platform context. A Wallet/Responder SHALL NOT derive origin from SMART request JSON, `purpose`, item text, selector URLs, ids, initiation metadata, callback-looking strings, or Artifacts. The same `SessionTranscript` bytes are used for optional readerAuth, device authentication, HPKE seal/open, and Verifier checks.

### 8.4 Wallet request handling

A Wallet/Responder SHALL validate before response construction: protocol `org-iso-mdoc`; base64url and CBOR of `data.deviceRequest` and `data.encryptionInfo`; `DeviceRequest.version` `"1.0"`; tag-24 `ItemsRequest` and exact `ItemsRequestBytes`; `docType`; namespace and requested element; requestInfo key as a string; Section 5 SMART request JSON; direct `"dcapi"` `encryptionInfo` with P-256 COSE_Key; and recomputed transcript from exact `encryptionInfoBase64Url` and authenticated origin/equivalent. It SHALL reject or fail safely if the SMART request is absent, not a string, unparsable, non-object, or invalid, and SHALL NOT infer clinical semantics from alternate mdoc elements, display strings, archived encodings, unknown fields, or initiation wrappers.

If present and supported or relied upon, `readerAuth` SHALL be verified and classified as absent, syntactically invalid, cryptographically failed, valid but untrusted/policy-unacceptable, or trusted. After validation, the Wallet SHALL run Holder review or equivalent Holder-control at item granularity, preserve item ids, and SHALL NOT treat `required: true` or request display text as consent or authenticated identity.

### 8.5 Wallet response construction

A Wallet/Responder that proceeds SHALL construct a Section 6 response with `requestId` exactly equal to request `id`. It SHALL serialize it as UTF-8 JSON text and create an `IssuerSignedItem` with `digestID`, `random`, `elementIdentifier` `smart_health_checkin_response`, and `elementValue` equal to the response JSON text. It SHALL CBOR-encode and tag-24-wrap this item in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`, and SHALL compute MSO value digest over the complete tag-24 bytes. `digestID` SHALL match the corresponding key in `MSO.valueDigests["org.smarthealthit.checkin"]`.

The Wallet SHALL construct an MSO with `docType` `org.smarthealthit.checkin.1`, `digestAlgorithm` `SHA-256`, value digests covering the stable item, and `deviceKeyInfo.deviceKey` identifying the device key. It SHALL sign MSO as `issuerAuth` with ES256 (`alg` `-7`). It SHALL construct `DeviceAuthenticationBytes = tag24(CBOR(["DeviceAuthentication", SessionTranscript, "org.smarthealthit.checkin.1", tag24(CBOR(DeviceNameSpaces))]))`, normally with empty `DeviceNameSpaces` unless profiled. It SHALL produce device `COSE_Sign1` using ES256 and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`. The SMART response remains issuer-signed and is not moved into `DeviceNameSpaces`.

### 8.6 HPKE and result wrapper

The Wallet SHALL encrypt CBOR `DeviceResponse` using HPKE base mode with KEM DHKEM(P-256, HKDF-SHA256), KDF HKDF-SHA256, AEAD AES-128-GCM, `info = SessionTranscript bytes`, `aad = empty byte string`, and plaintext `CBOR(DeviceResponse)`. `enc` is the encapsulated P-256 KEM key; `cipherText` includes the authentication tag. It SHALL wrap output as CBOR `["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`, base64url-encode without padding, and return `protocol: "org-iso-mdoc"` with `data.response`. It SHALL NOT return plaintext `DeviceResponse`, plaintext SMART response JSON, another carrier, non-empty AAD, or another HPKE suite.

### 8.7 Verifier processing and checklist

A Verifier SHALL require returned protocol `org-iso-mdoc`, decode unpadded `data.response`, parse `dcapiResponse`, require direct `"dcapi"` shape, reconstruct transcript from original exact `encryptionInfoBase64Url` and origin, HPKE-open with retained private key and required suite, reject on HPKE failure, parse `DeviceResponse`, require version `"1.0"` and successful status, locate document with docType, verify `issuerAuth` and MSO including validity, device key, issuer signature, and policy, locate stable issuer-signed item, recompute digest over exact tag-24 item, verify device signature over expected `DeviceAuthentication`, require string `elementValue`, parse and validate Section 6 SMART response, and apply Section 6.6.

A Verifier SHALL reject or quarantine if HPKE opening, mdoc issuer/MSO validation, digest validation, device authentication, stable-element extraction, SMART response JSON validation, or Section 6.6 fails. It SHALL keep HPKE success, origin binding, reader authentication, issuer/MSO validation, device-key proof, SMART response validity, and SMART Health Card verification as separate checks.

A deployment profile SHOULD define additional requirements for authenticated origin, privileged-browser allow-lists, mandatory `readerAuth`, reader certificates, revocation/status, issuer anchors, self-attested labeling, nonce length, replay, fixtures, size limits, duplicate documents/elements, Holder display, logging, telemetry, and source acceptance.

## 9. Reserved

SMART Health Check-in 1.0 does not define a QR-code, NFC, deep-link, pointer, relay, submission, or completion-display protocol. Such mechanisms are deployment-defined UX that can load a same-device Verifier page running Section 8.

## 10. Reserved future OID4VP binding

SMART Health Check-in 1.0 does not define an OID4VP request object mapping, `vp_token` response mapping, DCQL profile, wallet invocation contract, verifier redirect pattern, or OID4VP conformance target. Future bindings can carry the Section 5/6 model but MUST NOT weaken Section 8 or introduce requester identity metadata into the SMART request body.

## 11. Security considerations

Security controls are layered. Origin evidence, privileged-caller policy, optional reader authentication, mdoc issuer/device evidence, SMART response validation, SMART Health Card signatures, raw-FHIR provenance, HPKE confidentiality, identifier binding, and downstream policy are separate. A component SHALL NOT describe one successful control as proof that another succeeded unless this specification or an explicit deployment profile defines that assurance.

For Section 8, a Verifier MUST NOT accept plaintext `DeviceResponse`, plaintext SMART response JSON, substituted HPKE suite, or HPKE context not bound to the expected transcript. A Wallet/Responder or Verifier SHALL NOT downgrade active v1 ciphertexts to plaintext, substitute a different context, or treat decryption as sufficient clinical validation. Implementations SHALL keep HPKE keys, recipients, transcript inputs, algorithm identifiers, ciphertext fields, plaintexts, and validation results separate from deployment-local transport, storage, diagnostics, or initiation mechanisms.

Freshness is supplied by presentation session controls, not ids alone. Request ids, item ids, Artifact ids, and deployment handoff ids are correlation/accounting values, not freshness proofs. A Verifier SHOULD use fresh HPKE recipient key material and fresh nonce values for each session; profiles permitting reuse need replay, correlation, retention, and compromise handling.

Origin evidence comes from platform channels, not request JSON, launch URLs, display strings, selector URLs, common names, unknown members, or Artifacts. Reader authentication, when present, SHALL be cryptographically verified and policy-evaluated before being trusted. Verifiers SHALL complete Section 8 mdoc validation and apply issuer/device trust policy before claiming production issuer trust. Raw FHIR JSON remains patient-mediated unless separate accepted provenance exists; SMART Health Cards still require JWS verification and policy evaluation.

Implementations SHALL reject unsupported or unexpected algorithm labels for the v1 profile rather than downgrading, ignoring labels, or substituting library defaults. Future agility should use explicit versioned profiles, registries, deployment profiles, and vectors.

Implementations SHOULD minimize collection, display, and retention of plaintext requests, responses, FHIR resources, SMART Health Cards, Questionnaire answers, Section 8 plaintexts/internals, HPKE fields, Wallet secrets, credentials, bearer URLs, launch URLs, QR images, and diagnostic clues except under controlled diagnostics or fixtures. Live PHI, production private keys, bearer credentials, or unredacted clinical content in a fixture/support bundle is a security incident.

Wallet UX is a security control. A Wallet/Responder SHALL validate the Section 8 request, recover the SMART request only from the requestInfo key, compute transcript from authenticated origin/equivalent, classify reader authentication accurately, and perform Holder review or equivalent item-level Holder control before disclosure unless a profile defines another mechanism and assurance level. `required: true`, `intentToRetain`, launch UX, DC API invocation, or page buttons are not Holder consent.

## 12. Privacy considerations

A Requester SHOULD construct requests for the minimum content needed. Selectors, `purpose`, titles, summaries, profile URLs, resource types, Questionnaire text, media types, and FHIR versions can disclose sensitive context. The request item is the Holder-review and response-accounting granularity. A Wallet/Responder SHALL preserve item ids and SHALL provide Holder review or equivalent item-level control before disclosure. It MAY group, summarize, translate, reorder, or suppress details for accessibility, safety, localization, or policy, but SHALL NOT hide multiple items, broad selectors, accepted response forms, retention signals, or advisory `required` flags in a way that defeats meaningful control.

Holder refusal, partial disclosure, unavailable data, unsupported selectors, and errors are normal privacy-preserving outcomes. Requesters and receivers should not infer undisclosed clinical facts from non-fulfilled status.

Selective disclosure occurs through item boundaries, Wallet policy, Holder decisions, Artifact construction, accepted media types, `fulfills[]`, and status. Section 8 carries one stable mdoc element and does not use mdoc element selection for individual resources. Wallets SHOULD construct the smallest set of Artifacts that accurately satisfies approved items and accepted response forms. Receivers should reject, quarantine, suppress, or minimize nonresponsive content rather than retaining or redisclosing by default.

Identifiers are scoped by layer. Implementations SHOULD avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and should not embed patient account numbers, MRNs, member ids, emails, appointment ids, source document ids, or predictable sequences in request ids, item ids, Artifact ids, telemetry ids, or log ids unless explicitly required and protected.

`intentToRetain` defaults to `true` for `smart_health_checkin_response` because check-in workflows commonly retain returned Artifacts. It does not override Holder choice, policy, law, notices, legal holds, audits, downstream record requirements, or minimization. A Verifier MAY set it to `false` only for truly ephemeral use permitted by policy.

Implementations should assume both content and context can be sensitive, including mental health, substance-use, reproductive/sexual health, infectious disease, genetics, disability, medications, immunizations, minors, proxies, payer details, contact safety, immigration/employment sensitivity, and free-text answers. Telemetry/logging SHOULD collect the minimum needed and SHOULD NOT send plaintext payloads, clinical content, Holder decisions, Section 8 plaintexts, private keys, credentials, full ciphertexts, bearer URLs, launch URLs, QR images, or sensitive stack traces to routine telemetry except under controlled diagnostic, fixture, audit, or incident procedures.

## 13. Registry and IANA considerations

Media/content-type strings are compared by exact, case-sensitive equality unless a future extension defines otherwise. Core Artifact media types are `application/fhir+json` (raw FHIR JSON with outer `fhirVersion`) and `application/smart-health-card` (SMART Health Card file-style JSON with `value.verifiableCredential[]` and no outer `fhirVersion`). A Wallet/Responder SHALL NOT claim fulfillment unless `mediaType` appears in the item's `accept[]`, except under a supported compatibility rule. Extension Artifacts SHALL be branded variants with pinned media type or bounded pattern and typed fields; no generic catch-all.

The same-device mdoc identifiers are `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`. Verifiers and Wallets SHALL use them exactly and SHALL NOT treat dynamic element names, archived experiments, individual FHIR profiles, items, media types, Questionnaires, status codes, or local namespaces as alternate core carriers. External registry status may be needed for deployments; this specification does not assert such external registration is complete.

The status registry initial entries are `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`. The selector-kind registry initial entries are `selection.fhir` and `form.fhir`. Profile-id provisional labels are listed in Section 4.3. A profile identifier SHALL NOT be placed in a SMART request as `requestProfile`, preset, IPS shortcut, all-of-the-above shortcut, profile-family shortcut, topic label, or negotiation metadata.

Designated expert review applies before new or changed status codes, selector kinds, extension Artifact media types, branded variants, compatibility rules, profile identifiers, or future mdoc carrier changes are treated as interoperable registrations. A registration should preserve Sections 5/6 semantics, Section 6.6 validation, core selectors, additive `profiles[]` plus `profilesFrom[]`, per-item `accept[]`, canonical `|version` handling, Section 7 trust separation, Section 8 identifiers and HPKE transcript binding, safe unsupported-recipient behavior, and proportionate security/privacy. It should not add requester identity/trust/routing metadata to the SMART request body, turn profiles into in-band selectors, require intermediaries to see plaintext clinical content, weaken Holder control, conflate identifiers, treat demo keys as production trust, or overclaim provenance for unsigned raw FHIR JSON.

## 14. Internationalization

Internationalization applies to human-readable display text such as `purpose`, item `title`, item `summary`, `requestStatus[].message`, FHIR Questionnaire text, FHIR display strings, UI prompts/warnings/errors, and extension fields registered as display text. Protocol identifiers and machine values are not localized, including request/response ids, item ids, Artifact ids, status codes, selector kinds, profiles, media types, FHIR canonicals/resourceTypes used for validation, mdoc ids, algorithm labels, and launch identifiers/URLs.

SMART Health Check-in 1.0 does not define `lang`, `locale`, `Accept-Language`, language maps, negotiated-locale members, or locale parameters in the core request, response, or same-device binding. An implementation SHALL NOT rely on unknown members, browser language, launch URL parameters, or HTTP headers as interoperable locale-negotiation signals unless a future version, extension, or deployment profile defines them.

When language tags are associated with display text, producers SHOULD use well-formed BCP 47 tags. FHIR content follows FHIR localization behavior; SMART Health Check-in does not redefine `Resource.language`, terminology displays, designations, translation extensions, Questionnaire rendering, QuestionnaireResponse construction, narratives, or IG display rules. If a Wallet translates, summarizes, groups, reorders, or suppresses display text, it SHALL preserve protocol values used for construction and validation. Receivers SHALL NOT rely on localized `message` to determine status semantics.

Producers of new display text SHOULD emit Unicode NFC; consumers SHOULD accept valid Unicode display strings that are not NFC. Implementations SHALL NOT use Unicode normalization, case folding, accent folding, width folding, confusable mapping, BIDI reordering, transliteration, translated aliases, or locale-sensitive collation to make distinct protocol identifiers or constants compare equal. Display normalization SHALL NOT change bytes or code points used for signatures, hashes, encryption, HPKE/HKDF, COSE, mdoc digests, SMART Health Card verification, FHIR canonical preservation, audits, or byte-exact fixtures. UIs SHOULD isolate untrusted display text from adjacent labels, origins, identifiers, URLs, trust indicators, warnings, and action buttons for BIDI safety.

## 15. Implementation notes (informative)

Platform-specific verifier apps, Wallet APIs, Android Credential Manager matchers/handlers, iOS/Safari feasibility, SDK packaging, EHR ingestion, diagnostics, support tooling, fixture indexes, byte captures, and long worked examples are companion guidance. They must derive from this specification and must not introduce alternate request fields, selectors, Artifacts, transport carriers, cryptographic boundaries, or trust semantics.

## 16. Worked examples (informative)

Companion examples should cover insurance-card-only check-in, US Core summary, inline Questionnaire intake, mixed insurance/history/intake, partial/declined/error, and no-selector broad share. Example identifiers, URLs, names, keys, dates, clinical data, and display strings are not fixed protocol values unless listed as constants in Sections 4, 8, or 13.

## 17. Open issues and future work (informative)

Future work includes production issuer trust anchors and registries, privileged-browser allow-list policy, empirical `requestInfo` size limits, iOS/Safari feasibility, OID4VP alignment, and external verifier conformance suites. Future work is not an active version 1.0 runtime requirement.

## 18. Acknowledgments and contributors

To be supplied before publication.

## 19. Change log

To be supplied before publication.

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
| A-135 | Deployment/profile author | SHALL | §13.6 | Use designated expert review before treating new status codes, selector kinds, branded Artifact media types, profile ids, payload kinds, or mdoc changes as interoperable registrations. | Registry change record includes expert review and required metadata. |
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

## Appendix D. Companion fixture, byte-ladder, ISO compatibility, and FHIR mapping notes (informative)

The same-device byte ladder proceeds: SMART request JSON; `ItemsRequest`; tag-24 `ItemsRequestBytes`; `DeviceRequest`; `encryptionInfo`; exact `encryptionInfo` base64url string; DC API request wrapper; `dcapiInfo`, handover, and `SessionTranscript`; optional `ReaderAuthentication`; Wallet request extraction; Wallet transcript and readerAuth checks; SMART response JSON; `IssuerSignedItem`; tag-24 item and MSO value digest; MSO and `issuerAuth`; `DeviceAuthentication` and device signature; `DeviceResponse`; HPKE seal; `dcapiResponse`; Verifier opening and extraction. Companion byte ladders and fixture indexes should show bytes where available, but SHALL NOT introduce alternate request carriers, response carriers, field names, HPKE parameters, trust semantics, clinical semantics, CDDL, or fixture classifications.

CBOR diagnostic notation is not wire encoding. Tag 24 denotes an encoded CBOR data item; byte operations use exact tag-24 bytes where Section 8 specifies them. `COSE_Sign1` labels in diagnostic examples are explanatory, not CBOR map keys. COSE_Key EC2 P-256 labels are integer labels. COSE header label `33` is `x5chain`; its presence is evidence for policy evaluation, not trusted reader authentication by itself.

SMART Health Check-in 1.0 reuses mdoc and DC API structures rather than defining a new presentation token format. It constrains mdoc content to one document type, one namespace, one stable response element, and one request-info key. It does not define generic mDL data elements, generic clinical mdoc elements, a universal issuer registry, a universal reader PKI, or a universal browser allow-list policy. In-person initiation mechanisms are implementation-defined ways to load a same-device Verifier page running Section 8; they do not create an alternate presentation carrier, cryptographic boundary, or trust layer.

FHIR mapping guidance:

- FHIR canonicals appear in `profiles[]`, `profilesFrom[]`, `form.fhir` selectors, returned `QuestionnaireResponse.questionnaire`, and returned `Resource.meta.profile`. Section 5.5 controls parsing, preservation, resolution, and exact-version comparison.
- `profiles[]` contains exact `StructureDefinition` canonicals. A returned resource can support a match through `meta.profile[]`, signed payload evidence, or trusted local evidence. Full FHIR profile validation is not core-required unless a deployment profile adds it.
- `profilesFrom[]` is an array of profile-family canonical URLs. Family membership usually requires implementation-guide/package/configured mapping/local policy knowledge outside the response. It is not a singleton string, object, package descriptor, package id, package version, npm package name, registry alias, or local topic field.
- `profiles[]` and `profilesFrom[]` are additive. `resourceTypes[]` is a separate official FHIR resource-type constraint.
- A raw FHIR JSON Artifact `value` is a single Resource or Bundle. A Bundle is evaluated by inspecting `Bundle.entry[].resource`; the outer Bundle `resourceType` does not itself satisfy non-Bundle resource requests. Bundle-level `meta.profile` does not substitute for entry-resource profile evidence.
- An `application/fhir+json` Artifact's outer `fhirVersion` applies to the Resource or Bundle and all `Bundle.entry[].resource` resources. Mixed-release content is split into separate Artifacts or reported by status.
- SMART Health Card Artifact FHIR-version semantics are inside each signed payload. Verifiers validate each JWS, inspect signed FHIR payloads, and evaluate selectors from signed content.
- `form.fhir` is a flat object with `questionnaireCanonical` and/or inline `questionnaire`. For `application/fhir+json`, expected returned content is `QuestionnaireResponse`, either single resource or inside a Bundle. A generated `QuestionnaireResponse.questionnaire` should preserve the requested canonical including `|version` when that canonical is the identity being answered.
- Material disagreement between `questionnaireCanonical` and inline `questionnaire` includes different base canonical URLs, different explicit versions, or conflicting item structure that would change Holder answers. `unsupported` is appropriate before answers are collected; `error` is appropriate for operational failure after the Questionnaire is otherwise understood.
- US Core, CARIN, and similar guides are illustrative profile sources, not mandatory Wallet storage, mandatory clinical content, or mandatory Verifier ingestion policy.

A response can be protocol-valid and still be unsuitable for a local workflow because it lacks required profile evidence, issuer trust, provenance, patient-match confidence, terminology validation, or business requirements. Conversely, a core implementation is not non-conformant merely because it does not perform full FHIR profile validation unless a deployment profile or certification program adds that requirement.
