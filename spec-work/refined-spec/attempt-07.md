# SMART Health Check-in 1.0

**Editorial approach:** this candidate treats repeated prose like duplicated code. Normative requirements are kept in their canonical sections and indexed in Appendix A; repeated trust warnings collapse into the Core Trust Rule and Section 7. Examples, diagrams, fixture indexes, byte ladders, FHIR mapping notes, implementation guidance, and historical captures are referenced as companion material rather than repeated in the main specification. The main text remains sufficient to implement the transport-neutral clinical JSON model and the same-device direct `org-iso-mdoc` flow.

## 0. Front matter

### 0.1 Title

SMART Health Check-in 1.0.

### 0.2 Status

This is an editor's candidate refinement draft. It is not a final publication and does not change the external registration status of any referenced identifier.

### 0.3 Editors, contributors, IPR, copyright, and license

Editor and contributor metadata, IPR notices, copyright notices, and document license text are publication metadata. They do not alter the protocol requirements below.

### 0.4 Document conventions

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** are to be interpreted as described in BCP 14, RFC 2119, and RFC 8174 when, and only when, they appear in all capitals.

JSON uses RFC 8259 terms. CBOR uses RFC 8949 terms. CDDL fragments are profile pseudo-CDDL unless stated otherwise. COSE and JOSE terms follow RFC 9052 and RFC 7515. HPKE terms follow RFC 9180. Byte strings shown as base64url use base64url without padding unless a section explicitly states otherwise. When this document says a value is hashed, signed, encrypted, or compared, the operation is over the exact bytes named by the applicable section, not over the Markdown rendering or diagnostic notation.

A conformance keyword binds the named conformance target. Examples and companion material are informative unless the surrounding normative text explicitly incorporates them. If Appendix B or Appendix C conflicts with Sections 5-8, the body sections control.

## 1. Introduction

### 1.1 Abstract and scope

SMART Health Check-in 1.0 defines a patient-mediated check-in profile. A Requester asks a Holder, through a Wallet/Responder, for bounded clinical or administrative content and receives a structured SMART response. Version 1.0 has two normative layers: the transport-neutral clinical JSON request/response model in Sections 5-6, and the same-device direct `org-iso-mdoc` presentation flow over the W3C Digital Credentials API in Sections 7-8. QR, NFC, deep-link, kiosk, relay, submission, and completion behavior is deployment UX that may load a same-device Verifier page; it is not a separate protocol layer.

The profile standardizes request items, Holder-facing text, accepted response media types, FHIR selectors, returned Artifacts, fulfillment links, per-item status, layered trust interpretation, and one same-device wire flow. It does not define issuance, Wallet storage, EHR write-back, identity proofing, patient matching, proxy authority, payments, claims adjudication, production trust-anchor governance, a general FHIR query language, SMART App Launch replacement, FHIR API replacement, or platform SDK behavior.

### 1.2 Core Trust Rule

A Wallet/Responder, Requester, Verifier, receiver, deployment profile, or trust-framework operator SHALL keep trust layers separate. It SHALL NOT treat origin evidence, reader authentication, mdoc issuer/device evidence, HPKE success, Holder action, SMART response shape validity, request-id equality, deployment handoff metadata, or fixture/demo material as a substitute for another trust layer unless this specification or an explicit deployment profile defines the relationship and assurance level. The SMART request body is not a requester identity credential; Requesters SHALL NOT put self-asserted identity, organization metadata, origin, reader credentials, certificates, callback endpoints, handoff metadata, or trust assertions in it, and Wallets/Responders SHALL NOT treat request display text, selector URLs, unknown members, extension members, or Artifacts as authenticated identity without another trust layer.

### 1.3 Architecture summary and roles

| Layer | Sections | Wire artifacts | Purpose |
| --- | --- | --- | --- |
| Clinical request | 5 | `SmartHealthCheckinRequest` JSON | Requested content/action, per item. |
| Clinical response | 6 | `SmartHealthCheckinResponse` JSON | Artifacts, fulfillment, item outcomes. |
| Trust framework | 7 | Evidence and policy | Separate origin, reader, issuer/device, source, and deployment trust. |
| Same-device presentation | 8 | DC API direct `org-iso-mdoc`, mdoc, CBOR, COSE, HPKE | Session-bound encrypted presentation and mdoc evidence. |
| Cross-cutting | 9 | Registries and considerations | Security, privacy, identifiers, i18n. |

A deployment MAY use QR codes, NFC tags, deep links, kiosks, staff workflows, or relays to bring a Holder to a same-device Verifier page that runs Section 8. The URL format, pointer storage, relay behavior, routing, and completion display are implementation-defined and SHALL NOT redefine SMART request/response semantics or create an alternate presentation flow.

Roles: a **Requester** constructs requests and consumes responses; a **Verifier** packages a request, validates presentation evidence, extracts a response, and applies Section 6.6; a **Holder** controls disclosure through a **Wallet/Responder**; an **Artifact** is a response object with `id`, `mediaType`, `fulfills[]`, and media-type-specific payload; a **request item** is the Holder-review and accounting unit; a **profile family** is a published FHIR profile family identified by `profilesFrom[]`.

### 1.4 Companion material

Worked examples, diagrams, byte ladders, fixture indexes, FHIR mapping notes, implementation guidance, and historical captures belong in companion material unless explicitly incorporated by a publication or deployment profile. Companion location for this draft: <https://github.com/jmandel/smart-health-checkin-mdoc>. The body and Appendices A-C control normative implementation.

## 4. Conformance

A conformance claim SHALL identify implemented target(s), feature/profile, specification version, and deployment profile. A product MAY implement multiple targets but SHALL satisfy every target and claimed feature.

### 4.1 Targets

A Requester claiming core clinical conformance SHALL construct Section 5 requests and SHALL request only Artifact media types it can process. A Verifier claiming same-device `org-iso-mdoc` support SHALL package the request, validate Section 8 evidence, extract a Section 6 response, and apply Section 6.6 before Requester use. A Holder Wallet/Responder claiming core clinical conformance SHALL validate Section 5 requests, process request items as Holder-review and response-accounting units, preserve ids, construct Section 6 responses, and set `requestId` to the accepted request `id`. A Wallet/Responder claiming Section 8 support SHALL satisfy the Wallet-side Section 8 requirements.

A deployment-profile author SHALL state constrained targets, required optional features, in-scope trust layers, and added validation/security/privacy/fixture expectations, and SHALL NOT redefine core semantics. Test and fixture authors SHALL derive tests from normative requirements and identify target, feature set, section, expected outcome, comparison mode, and demo trust status.

### 4.2 Core and optional features

Core clinical support includes Section 5 top-level request shape, fixed `type` and `version`, request `id`, request items, `selection.fhir` and `form.fhir` when claimed, sibling `questionnaireCanonical` and/or `questionnaire`, `profilesFrom[]` as an array of canonical profile-family URLs, additive `profiles[]` plus `profilesFrom[]`, canonical `|version` handling, `accept[]`, Section 6 Artifact `mediaType`, no `GenericArtifact`, raw `application/fhir+json` with `fhirVersion`, `application/smart-health-card` with `value.verifiableCredential[]` and no outer `fhirVersion`, exact `requestStatus[]` coverage, permitted many-to-many fulfillment, and Section 6.6 cross-validation. Direct same-device presentation is mandatory only for implementations claiming live SMART Health Check-in 1.0 presentation support.

`readerAuth`, extension selectors, extension Artifact media types, compatibility rules, future status-code extensions, stricter deployment schemas, schemas, CDDL, fixture profiles, and vector profiles are optional unless required by a deployment or certification profile. An implementation claiming an optional feature SHALL implement that feature's shape, processing, validation, unsupported behavior, security, privacy, and interactions with Sections 5-8. OID4VP is reserved and informative in v1.0; an OID4VP experiment SHALL NOT be claimed as Section 8 conformance unless a future profile defines the mapping.

### 4.3 Identifiers, versioning, and extension model

| Identifier kind | Value |
| --- | --- |
| SMART request `type` | `smart-health-checkin-request` |
| SMART response `type` | `smart-health-checkin-response` |
| SMART model `version` | `1` |
| Selector kinds | `selection.fhir`, `form.fhir` |
| Artifact media types | `application/fhir+json`, `application/smart-health-card` |
| Status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` |
| DC API protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| mdoc element | `smart_health_checkin_response` |
| requestInfo key | `org.smarthealthit.checkin.request` |

Provisional labels are `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and `smart-health-checkin-oid4vp-reserved`. Profile identifiers SHALL NOT be placed inside SMART requests as `requestProfile`, presets, IPS shortcuts, profile labels, topic labels, or negotiation metadata to bypass selectors, `accept[]`, response validation, trust processing, or Section 8 validation.

Implementations SHALL interpret each version marker only at its layer: request/response `version: "1"`, mdoc `DeviceRequest.version`/`DeviceResponse.version` `"1.0"` with `docType` `org.smarthealthit.checkin.1`, and FHIR signals in `fhirVersions[]`, Artifact `fhirVersion`, and canonical `|version`. Extensions are additive and SHALL NOT redefine core request/response fields, selector kinds, Artifact rules, fulfillment links, status codes, Section 8 carriers, or Section 7 trust separation. Appendix A indexes requirements but does not create independent requirements.

## 5. Clinical request model

A SMART request is the transport-neutral clinical JSON object. Presentation transports may add origin, reader, encryption, freshness, device evidence, and routing metadata, but do not change `purpose`, items, selectors, `accept[]`, item ids, or `required`.

### 5.1 Encoding

A Requester SHALL encode a request as RFC 8259 JSON; serialized text/bytes SHALL be UTF-8. It SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or non-JSON values. A Wallet/Responder or Verifier SHALL reject unparsable requests, non-object roots, and duplicate object member names detected during parsing or validation. Object order has no clinical meaning; `fhirVersions[]` and `accept[]` are preference-ordered, and `items[]` is preferred display/workflow order. A Wallet/Responder MAY ignore unknown members that do not alter known required semantics, but unknown `content.kind` identifies an extension selector. A Requester SHALL NOT rely on unknown members for identity, Holder-control override, selector changes, media negotiation, consent, transport, or trust.

### 5.2 Top-level object

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

A Requester SHALL include `type`, `version`, `id`, and `items`, and MAY include `purpose` and `fhirVersions`. `type` SHALL be exactly `smart-health-checkin-request`; `version` SHALL be exactly `1`; Wallets/Responders SHALL reject absent or incompatible values unless a future rule applies. `id` SHALL be a non-empty opaque Requester-generated id unique among that Requester's requests for the same check-in session and SHOULD avoid guessability/collisions; it SHALL be copied exactly to response `requestId` and is not identity, freshness, authorization, or clinical fact. `purpose`, when present, SHALL be a string used only as Holder-facing workflow context and SHALL NOT carry identity, origin, logo, contact, legal attestation, proof of authority, consent, trust, or persistent authorization. `fhirVersions[]`, when present, SHALL be an ordered array of FHIR release strings; Requesters accepting raw FHIR SHOULD include it unless any conforming FHIR version is safe, and Wallets/Responders SHOULD use it when choosing raw FHIR versions subject to Holder decision, data, capability, policy, and `accept[]`. `items` SHALL be an array; a Requester SHOULD include at least one item.

A Requester SHALL NOT include self-asserted requester identity metadata anywhere in the SMART request body, including names, brands, URLs, domains, origins, package names, application ids, certificates, reader/verifier/trust/accreditation/legal metadata, callbacks, pointers, relays, completion state, encryption, nonces, or handoff/wrapper metadata. Wallets/Responders SHALL NOT treat any request field as authenticated requester identity unless established outside the request body.

### 5.3 Request items

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

Each item SHALL include non-empty `id`, non-empty `title`, `content`, and non-empty `accept[]`; `summary` and `required` are optional. Item ids SHALL be unique within one request and compared by exact string equality; Wallets/Responders SHALL reject missing, non-string, empty, or duplicate item ids. New ids SHOULD be short, stable within the interaction, preserveable exactly, and avoid patient/requester identifiers, secrets, tracking values, and clinical facts. `title` and `summary` are Holder-facing display text and SHALL NOT substitute for authenticated identity. `required` is advisory only; omitted means `false`; it is not consent, legal authorization, a disclosure command, or a fulfillment guarantee, and Wallets/Responders SHALL NOT use it to bypass Holder control, Wallet policy, law, or consent UX. `accept[]` SHALL be media type strings ordered by Requester preference; Requesters SHALL list only processable types; Wallets/Responders SHALL NOT return an Artifact for an item unless its `mediaType` is listed for that item or a supported registered compatibility rule applies.

### 5.4 Selectors

A selector describes what content or action satisfies an item. A Requester SHALL use a selector defined here or a registered extension. A Wallet/Responder SHALL evaluate selectors independently per item and SHALL NOT infer unsupported selector semantics from display text or unrelated fields.

#### 5.4.1 `selection.fhir`

```json
{
  "kind": "selection.fhir",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

`selection.fhir` requests existing patient-specific FHIR resources. A Requester SHALL set `kind` exactly and MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination, or none; present members SHALL be arrays of strings. It SHALL NOT include `questionnaireCanonical` or `questionnaire`; use a separate `form.fhir` item for form completion. `profiles[]` identifies exact `StructureDefinition` canonicals and MAY include `|version`. `profilesFrom[]` SHALL be a non-empty array of canonical profile-family URL strings, not a scalar, object, package descriptor, package id/version, registry alias, local topic, or URN unless a future extension defines that value space; Wallets/Responders SHALL reject invalid `profilesFrom` shape. `resourceTypes[]` SHALL use official FHIR resource type names, not local topics.

When `resourceTypes[]` appears with profile selectors, it is an additional resource-type constraint. When `profiles[]` and `profilesFrom[]` both appear, they are additive: a resource satisfies the profile portion if it matches any exact profile or any member of any requested profile family, subject to `resourceTypes[]` and other item rules. Requesters SHALL NOT rely on `profiles[]` to narrow `profilesFrom[]`; Wallets/Responders SHALL NOT interpret it as narrowing. If all three selector arrays are omitted, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share; Requesters SHOULD avoid this broad no-selector default unless safe and clearly explained, and Wallets/Responders MAY fulfill partially.

#### 5.4.2 `form.fhir`

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "<Questionnaire canonical>",
  "questionnaire": { "resourceType": "Questionnaire" }
}
```

`form.fhir` requests completion of a FHIR Questionnaire and return of an accepted Artifact, normally a FHIR `QuestionnaireResponse` for `application/fhir+json`. A Requester SHALL set `kind` to `form.fhir` and include `questionnaireCanonical`, `questionnaire`, or both as direct selector members. `questionnaireCanonical` SHALL be a non-empty FHIR canonical string and MAY include `|version`; `questionnaire` SHALL be an inline FHIR `Questionnaire` object with `resourceType` `Questionnaire`. The selector SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. A Wallet/Responder SHALL reject or report unsupported when neither form field is present, a canonical is invalid, an inline resource is not a Questionnaire, or form and selection fields are mixed. If both canonical and inline Questionnaire are supplied, the Requester SHOULD keep canonical, `questionnaire.url`, and `questionnaire.version` consistent; Wallets/Responders SHALL NOT silently merge conflicts or rewrite the canonical and SHOULD report material disagreement as `unsupported` or `error`.

#### 5.4.3 Extension selectors

An extension selector registrant SHALL define exact `content.kind`, JSON shape, members, clinical meaning, satisfaction rules, interactions with `accept[]`, `fhirVersions[]`, FHIR canonicals, status, Artifact fulfillment, unsupported behavior, security, privacy, and examples, and SHALL NOT redefine core fields or permit requester identity metadata without a future trust model. Requesters SHALL NOT use unregistered private selectors when unrelated Wallets/Responders are expected to interoperate; unsupported Wallets/Responders SHALL reject or report `unsupported`, not guess semantics.

### 5.5 Canonical `|version`

Implementations processing FHIR canonicals SHALL parse each value into `(url, version?)`, splitting at the first `|`, while preserving the original wire string exactly where carried, echoed, logged, used in fixtures, returned in `meta.profile`, or generated as `QuestionnaireResponse.questionnaire`. Resolution SHALL use a configured resolver, package cache, IG resolver, terminology service, or FHIR canonical search; FHIR search uses `url` and `version` parameters for versioned canonicals. Direct HTTP dereference is permitted only for unversioned canonicals and only if the returned resource verifies. Implementations SHALL NOT strip `|version` and direct-fetch the bare URL for a versioned canonical. After resolution, expected `resourceType`, `url`, and requested `version` SHALL be verified; mismatch is `unsupported` or `error`.

For versioned `profiles[]`, Wallets/Responders SHALL NOT report `fulfilled` unless exact-version `meta.profile` or equivalent exact local evidence exists; Verifiers SHALL apply the same exact-version check. Unversioned profile requests MAY match any supported version of the base canonical. Routing, broad classification, family membership, de-duplication, and display grouping MAY ignore versions only locally and SHALL NOT affect resolution, exact matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation.

### 5.6 Accepted media types

Core `accept[]` values are `application/fhir+json` and `application/smart-health-card`. `application/fhir+json` means raw FHIR JSON Resource or Bundle with outer `fhirVersion`; for `form.fhir` it normally means `QuestionnaireResponse`. `application/smart-health-card` means SMART Health Card file-style JSON with `value.verifiableCredential[]`, with FHIR version semantics inside signed credentials. Extension media types MAY be used only when registered or profiled with media type string, Artifact shape, processing, validation, security, privacy, FHIR-version handling if any, and compatibility rules.

## 6. Clinical response model

A SMART response is the transport-neutral clinical JSON answer. Presentation transports may wrap, encrypt, authenticate, retain, or relay it, but do not change `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, or `requestStatus[]`.

### 6.1 Top-level response

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "<request-id>",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include all shown members, set `type` to exactly `smart-health-checkin-response`, set `version` to exactly `1`, and set `requestId` to the exact accepted request `id`. A Verifier SHALL reject absent/incompatible `type` or `version` unless a future rule applies, and SHALL reject any `requestId` mismatch. `artifacts[]` SHALL be an array and MAY be empty when no item yields an Artifact if `requestStatus[]` still accounts for every item. `requestStatus[]` SHALL be present even when all items are fulfilled.

### 6.2 Artifacts

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

Every Artifact SHALL include non-empty unique-within-response `id`, non-empty `mediaType`, non-empty `fulfills[]`, and media-type-defined payload fields. Verifiers SHALL reject missing, non-string, empty, or duplicate Artifact ids and unresolved or malformed `fulfills[]`. Artifact ids are response-local and SHALL NOT be treated as patient, requester, global document, or provenance ids without separate evidence. Artifacts use `mediaType`, not an Artifact-level protocol `type`. The v1.0 core Artifact union is closed over `application/smart-health-card` and `application/fhir+json`; unknown media types are not generic Artifacts merely because they contain plausible fields. Each `fulfills[]` value SHALL exactly equal one original item id, and the Artifact `mediaType` SHALL be accepted by every listed item unless a supported compatibility rule applies. Payload semantics come from the recognized media type; processors SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration from field names alone.

### 6.3 Core Artifact media types

For `application/smart-health-card`, a Wallet/Responder SHALL include `value.verifiableCredential[]` as a non-empty array of SMART Health Card JWS strings and SHALL NOT include an outer Artifact-level `fhirVersion`. Verifiers SHALL reject an outer `fhirVersion` and SHALL verify/process each JWS under SMART Health Cards and local trust policy. Selector suitability is determined from signed payload content and policy, not wrapper summaries.

For `application/fhir+json`, a Wallet/Responder SHALL include non-empty `fhirVersion` and `value` as a FHIR JSON object: either a single Resource with string `resourceType` or a Bundle with `resourceType` `Bundle` and `entry[]` resources when packaging multiple resources. A Wallet/Responder SHOULD use a Bundle for multiple resources. It SHALL interpret all resources in one Artifact under the Artifact `fhirVersion` and SHALL NOT mix FHIR releases in one Artifact; mixed releases require separate Artifacts or a valid non-fulfilled status. Wallets/Responders SHOULD choose a requested `fhirVersions[]` value when possible. Verifiers SHALL reject missing/non-string `fhirVersion` and SHOULD treat unacceptable versions as unsupported for ingestion. Returned FHIR `meta.profile` values, including `|version`, SHALL be preserved where known and SHALL NOT be stripped due to routing or grouping.

Extension Artifacts MAY be returned only when their `mediaType` is accepted by every fulfilled item and a recognized extension definition supplies pinned media type or bounded pattern, branded variant name, typed payload fields, shape, encoding, dereferencing/integrity rules, FHIR-version handling if any, status behavior, validation, security, privacy, and compatibility. Extensions SHALL NOT define an unbounded catch-all or redefine core fields.

### 6.4 Status reporting

Each status object has `item`, `status`, and optional `message`. A Wallet/Responder SHALL include exactly one status for every original request item, with exact item id, no duplicates, and no unknown ids. A Verifier SHALL reject responses that do not cover every item exactly once. Core status codes are `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`; Wallets/Responders SHALL use only these unless a future extension is explicitly supported by the receiving Verifier, and Verifiers SHALL reject unknown codes without such support. `unsupported` is for unsupported selector/shape/media/FHIR/Questionnaire/extension semantics; `unavailable` is for understood but absent/shareable content; `declined` is Holder refusal or equivalent policy; `partial` is responsive but incomplete disclosure; `fulfilled` is a complete-fulfillment claim; `error` is processing failure. `message` MAY explain but SHALL NOT include secrets, tokens, stack traces, unnecessary patient details, or unrelated Holder data, and receivers SHALL NOT use it for normative semantics.

### 6.5 Many-to-many fulfillment

One Artifact MAY fulfill many items, and one item MAY be fulfilled by many Artifacts, only when every fulfillment edge satisfies media-type, FHIR-version, selector, status, and validation rules. `requestStatus[]` still reports one overall outcome per item. A Verifier SHALL evaluate all Artifacts that list an item; receivers MAY choose among valid Artifacts under local policy.

### 6.6 Cross-validation

A Verifier SHALL validate a SMART response against the original request before use. It SHALL reject unless `requestId` matches exactly; every `fulfills[]` value resolves; every Artifact `mediaType` is recognized and accepted by every fulfilled item; `requestStatus[]` covers every original item exactly once; raw FHIR Artifacts have valid `fhirVersion` and FHIR object shape; mixed-release Bundles are rejected or quarantined; and SMART Health Card Artifacts lack outer `fhirVersion`. It SHOULD inspect returned FHIR `resourceType`, `meta.profile`, Bundle resources, and `QuestionnaireResponse.questionnaire` to assess selector responsiveness. Exact-version profile requests require exact-version evidence, and Verifiers SHALL preserve returned `meta.profile` strings exactly. Shape validation alone is insufficient, and protocol validity remains distinct from downstream clinical acceptance.

## 7. Trust framework

This section is the canonical trust framework for SMART Health Check-in 1.0. Trust information is supplied by the Section 8 presentation flow, returned Artifact payloads, deployment policy, or out-of-band trust decisions. It is not supplied by self-asserted SMART request fields.

### 7.1 Trust layers and Core Trust Rule

A Wallet/Responder, Requester, Verifier, receiver, deployment profile, or trust-framework operator SHALL keep these layers separate: origin or privileged-caller evidence; optional reader authentication; mdoc issuer/MSO/disclosed-element/device-key evidence; clinical-source evidence in the returned Artifact payload; and out-of-band deployment policy. It SHALL NOT treat success at one layer as proof of another unless this specification or an explicit deployment profile defines that relationship and assurance level. Successful transport presentation does not by itself prove clinical correctness, patient matching, EHR write-back authority, production issuer accreditation, or clinical-source provenance for unsigned content.

### 7.2 Origin trust

A Wallet/Responder that uses origin trust SHALL use authenticated platform-provided origin information, or a deployment-approved origin-equivalent, for Holder display, policy, and Section 8 binding. It SHALL NOT derive authenticated origin from the SMART request JSON, `purpose`, item text, selector URLs, request ids, callback-looking strings, handoff metadata, or returned Artifacts. If origin or privileged-caller context cannot be authenticated, the Wallet/Responder SHALL treat origin trust as absent and SHALL NOT substitute request display text or local launch metadata as verified origin. It MAY reject, continue with reduced assurance, require additional Holder confirmation, omit branding, require another trust layer, restrict returned content, or apply other policy controls. A deployment profile MAY map authenticated origin to display labels, but SHALL NOT change SMART request semantics.

### 7.3 Reader / Verifier trust

A Verifier MAY include per-`DocRequest.readerAuth` as a detached `COSE_Sign1` over `ReaderAuthentication`. If included, it SHALL be bound to the same presentation session, exact Section 8 `SessionTranscript`, and exact tag-24 `ItemsRequest` bytes, and SHALL NOT be reused across sessions, origins, encryption information, SMART request serializations, or requested element sets. A Wallet/Responder that supports or relies on reader authentication SHALL verify signature, signed context, detached-payload binding, request bytes, protected algorithm and key type, certificate or key evidence, and trust policy. It SHALL distinguish absent, malformed, cryptographically failed, cryptographically valid but untrusted or policy-unacceptable, and trusted reader-authentication states. It SHALL NOT treat mere presence of `readerAuth`, `x5chain`, a name, logo, `kid`, launch URL, display string, or demo certificate as successful reader authentication. A deployment profile that requires reader certificates SHALL define accepted anchors or registries and SHOULD define path validation, key usage, policy OIDs, validity-time handling, revocation/status checks, algorithm constraints, and Holder-facing display mapping.

### 7.4 Issuer / device-attestation trust

A Verifier SHALL complete Section 8 mdoc issuer, MSO, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence, and SHALL apply Section 6.6 before clinical use. When issuer trust is required, a Verifier or deployment profile SHALL define accepted issuer trust anchors or registry sources. A Verifier relying on issuer evidence SHALL validate issuer signature, issuer path or key evidence, digest bindings, document type, namespace, disclosed element identifiers, validity constraints, and deployment policy. It SHALL NOT treat syntactically valid MSO, matching digest, signature against an included leaf, or self-signed issuer certificate as production issuer trust unless accepted by policy. A Verifier SHALL verify device-key proof bound to the same presentation session and `SessionTranscript`; it SHALL NOT treat a response as transport-valid when device proof fails, when device authentication is not bound to the expected session, or when the disclosed item fails MSO digest validation. Self-attested Wallet evidence MAY be accepted only under an explicit deployment policy that states the assurance level and labeling.

### 7.5 Clinical-source trust

A Verifier or receiver SHALL evaluate clinical-source trust from Artifact `mediaType`, payload signatures or provenance, request selectors, FHIR evidence, SMART Health Card rules, extension rules, and deployment policy. It SHALL NOT infer clinical-source provenance from successful presentation, origin, reader authentication, mdoc issuer/device proof, Holder action, request-id equality, `fulfills[]`, Artifact ids, handoff metadata, or response shape validation. For `application/smart-health-card`, each JWS SHALL be verified under SMART Health Cards and local trust policy before relying on signed content or issuer claims. For raw `application/fhir+json`, the receiver SHALL treat content as patient-mediated unless accepted separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present.

### 7.6 Identifier scoping and deployment policy

A component SHALL preserve identifier scopes and SHALL NOT use an identifier from one layer as proof, authorization, or identifier for another layer unless this specification or explicit policy defines the binding. Request ids are session-local clinical correlation values; item ids are scoped to one request; Artifact ids are scoped to one response; presentation identifiers have their own scopes. A deployment profile adding trust requirements SHALL document constrained roles, constrained layers, accepted anchors/registries/allow-lists/source mechanisms, freshness and status expectations, failure handling, assurance levels, and Holder-facing display rules. It SHALL NOT redefine clinical request fields, response fields, selector semantics, Artifact media-type rules, fulfillment links, or status codes. Implementation-defined initiation, relay, or completion components SHALL preserve these boundaries and SHALL NOT redefine SMART request/response semantics.

## 8. Same-device presentation flow over `org-iso-mdoc`

This section defines the only normative SMART Health Check-in 1.0 presentation flow. The Verifier carries a Section 5 SMART request through W3C Digital Credentials API direct `org-iso-mdoc`; the Wallet/Responder returns a Section 6 SMART response inside an mdoc `DeviceResponse` encrypted for the Verifier. Implementation-defined QR, NFC, deep-link, relay, or completion behavior MAY load the Verifier page but is outside this wire profile.

### 8.1 Fixed identifiers and algorithms

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested and disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

A Verifier SHALL use these values exactly. It SHALL carry the SMART request only as UTF-8 JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, not as a CBOR map or base64url JSON. A Wallet/Responder SHALL carry the SMART response only as the `elementValue` of issuer-signed `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. Dynamic element names, implementation-defined wrappers, archived claim-name experiments, individual FHIR profiles, request items, Artifact media types, Questionnaires, or status codes are not version 1.0 carriers.

### 8.2 Verifier request construction

The Verifier SHALL start with a valid Section 5 SMART request and construct an `ItemsRequest` with `docType` `org.smarthealthit.checkin.1`, `nameSpaces["org.smarthealthit.checkin"]["smart_health_checkin_response"]`, and `requestInfo["org.smarthealthit.checkin.request"]`. The namespace boolean is mdoc `intentToRetain`; it SHALL default to `true` and MAY be `false` only for true ephemeral use permitted by policy. It is not Holder consent or retention authorization. The Verifier SHALL NOT model FHIR profiles, items, Questionnaires, media types, status codes, or resources as separate mdoc elements.

The Verifier SHALL CBOR-encode `ItemsRequest`, wrap those bytes in CBOR tag 24 as `ItemsRequestBytes`, place the tagged value in `DocRequest.itemsRequest`, and construct `DeviceRequest` version exactly `1.0` with a `docRequests` array containing that `DocRequest`. Version 1.0 uses optional per-`DocRequest.readerAuth`; `DeviceRequest` version `1.1` `readerAuthAll` SHALL NOT be used as the core mechanism unless a future version or deployment profile defines it.

If `readerAuth` is present, the Verifier SHALL construct detached ES256 `COSE_Sign1` over:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The protected header SHALL include `{1: -7}`, the serialized payload field SHALL be `null`, the COSE `Signature1` external AAD SHALL be empty, and the detached payload SHALL be `ReaderAuthenticationBytes`. Core `readerAuth` SHALL carry certificate evidence in header label `33` (`x5chain`) with at least the leaf certificate and SHALL be computed for the exact transcript and exact tag-24 `ItemsRequestBytes` used in the request.

For each presentation request, the Verifier SHALL generate or select DHKEM(P-256, HKDF-SHA256) recipient key material, SHOULD use a fresh key pair, and SHALL construct CBOR `encryptionInfo = ["dcapi", {"nonce": <fresh unpredictable bytes>, "recipientPublicKey": <P-256 COSE_Key>}]`. The COSE_Key SHALL identify EC2 P-256 (`1: 2`, `-1: 1`, `-2` x-coordinate bstr, `-3` y-coordinate bstr). The nonce SHALL be fresh unpredictable bytes; implementations SHOULD use at least 16 bytes. The Verifier SHALL retain the matching private key and exact `encryptionInfo` bytes until completion or abandonment.

The Verifier SHALL base64url-encode CBOR `DeviceRequest` and CBOR `encryptionInfo` without padding and invoke Digital Credentials API data equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
    "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
  }
}
```

The exact `encryptionInfo` base64url string SHALL be preserved for `SessionTranscript` construction.

### 8.3 `SessionTranscript`

Both sides SHALL compute identical direct `dcapi` transcript bytes:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact unpadded wrapper string. `origin` is authenticated Browser/User Agent, Credential Manager, platform, or deployment-approved privileged-caller origin-equivalent context. A Wallet/Responder SHALL NOT derive it from SMART request fields, selector URLs, request ids, handoff metadata, callback-looking strings, or Artifacts. The Wallet/Responder SHALL use the same transcript for `readerAuth` verification, `DeviceAuthentication`, and HPKE encryption. The Verifier SHALL use the same bytes for `readerAuth` construction when present, HPKE opening, and device-signature verification. If the required origin input is unavailable, the Wallet/Responder SHALL treat origin trust as absent and SHALL NOT substitute self-asserted request data.

### 8.4 Wallet request handling

Before response construction, the Wallet/Responder SHALL confirm protocol `org-iso-mdoc`; decode and parse `data.deviceRequest`; require `DeviceRequest.version` `1.0`; locate tag-24 `DocRequest.itemsRequest`; preserve exact tag-24 bytes; decode `ItemsRequest`; require `docType`, namespace, and `smart_health_checkin_response`; recover `intentToRetain`; recover `requestInfo["org.smarthealthit.checkin.request"]` as a string; parse and validate the Section 5 SMART request; decode and validate direct `dcapi` `encryptionInfo` and P-256 recipient public key; and recompute Section 8.3 transcript from exact `encryptionInfoBase64Url` and authenticated origin or approved equivalent. Invalid request JSON or malformed required mdoc/DC API structures SHALL be rejected or fail safely. The Wallet/Responder SHALL NOT infer clinical semantics from element names, display strings, dynamic-element encodings, unknown request fields, or initiation wrappers.

If present and supported or relied upon, `readerAuth` SHALL be verified and classified under Sections 7.3 and 8.2. After validation, the Wallet/Responder SHALL perform Holder review or equivalent Holder-control processing at request-item granularity, preserve item ids, and avoid treating `required`, `purpose`, item text, or other request fields as authenticated identity or consent. Unsupported selectors, unavailable data, Holder refusal, partial sharing, and errors are Section 6 outcomes when the request is otherwise valid enough to answer.

### 8.5 Wallet response construction

The Wallet/Responder SHALL construct a Section 6 SMART response whose `requestId` exactly equals the accepted request `id`, serialize it as UTF-8 JSON text, and place it in an `IssuerSignedItem` with `elementIdentifier` `smart_health_checkin_response` and `elementValue` equal to that JSON text. It SHALL CBOR-encode the item, wrap it in CBOR tag 24, place it in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`, compute the MSO value digest over the complete tag-24-wrapped item bytes, and ensure `IssuerSignedItem.digestID` matches the corresponding `MSO.valueDigests["org.smarthealthit.checkin"]` key.

The Wallet/Responder SHALL construct an MSO with `docType` `org.smarthealthit.checkin.1`, `digestAlgorithm` `SHA-256`, value digests covering the disclosed item, and `deviceKeyInfo.deviceKey` for the device-authentication public key. It SHALL sign the MSO as `issuerAuth` using ES256 (`alg` `-7`), with tag-24-wrapped MSO payload unless Appendix C or an ISO-compatible profile defines an equivalent encoding.

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same session using `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces`; produce device `COSE_Sign1` with ES256 (`alg` `-7`) and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`; and construct `DeviceResponse` version `1.0` with successful status and the SMART document. The SMART response remains issuer-signed; moving it into `DeviceNameSpaces` is not equivalent.

### 8.6 HPKE encryption

The Wallet/Responder SHALL encrypt CBOR `DeviceResponse` using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. It SHALL wrap HPKE output as CBOR `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]`, where `enc` is the KEM encapsulated key and `cipherText` includes the AEAD tag. It SHALL return JSON equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

It SHALL NOT return plaintext `DeviceResponse`, plaintext SMART response JSON, a different carrier, non-empty AAD, or another HPKE suite for core v1.0.

### 8.7 Verifier response processing

A Verifier SHALL require returned protocol `org-iso-mdoc`; require `data.response` as unpadded base64url; decode CBOR `dcapiResponse`; require direct shape `["dcapi", {"enc": bstr, "cipherText": bstr}]`; reconstruct expected transcript from original exact `encryptionInfoBase64Url` and origin; HPKE-open with retained recipient key, received `enc`, required suite, `info = SessionTranscript`, and empty AAD; reject on HPKE failure; parse CBOR `DeviceResponse`; require version `1.0` and success; locate `docType` `org.smarthealthit.checkin.1`; verify `issuerAuth`, MSO, validity, device key, digest algorithm, issuer signature, and policy; locate namespace `org.smarthealthit.checkin` item `smart_health_checkin_response`; recompute digest over exact tag-24 item bytes and compare with MSO digest; verify device signature with `MSO.deviceKeyInfo.deviceKey` over expected `DeviceAuthentication`; require `elementValue` string; parse Section 6 SMART response JSON; and apply Section 6.6 against the original request.

The Verifier SHALL reject or quarantine when HPKE opening, mdoc issuer/MSO validation, digest validation, device authentication, stable-element extraction, SMART response validation, or Section 6.6 fails. HPKE success, origin binding, reader authentication, issuer/MSO validation, device proof, SMART response validity, and SMART Health Card verification remain separate trust decisions.

### 8.8 Validation checklist

A Section 8 Verifier SHALL validate original request retention, fixed identifiers, tag-24 `ItemsRequest`, direct `dcapi` `encryptionInfo`, fresh nonce and P-256 key, exact transcript, required reader authentication when policy requires it, response wrapper, HPKE suite and empty AAD, `DeviceResponse`, issuer/MSO, digest binding, stable element, device proof, extracted SMART response, Section 6.6, and Section 7 trust interpretation. A Section 8 Wallet/Responder SHALL validate request wrapper, `DeviceRequest`, `ItemsRequest`, request carrier string, Section 5 request, transcript, readerAuth classification, Holder control, Section 6 response construction, stable issuer-signed element, MSO, `issuerAuth`, device authentication, HPKE encryption, and outer result. A deployment profile SHOULD define additional requirements for origin policy, allow-lists, mandatory `readerAuth`, certificates, revocation, issuer anchors, self-attestation labeling, nonce length, replay, fixtures, size limits, duplicates, display, logging, telemetry, and downstream clinical-source acceptance.

## 9. Security, privacy, registries, and internationalization

### 9.1 Security

A Verifier MUST NOT accept plaintext `DeviceResponse`, plaintext SMART response JSON, a substituted HPKE suite, or a response whose HPKE context is not bound to the expected transcript. Wallets/Responders and Verifiers SHALL NOT downgrade v1.0 ciphertexts, substitute encryption contexts, or treat decryption as clinical validation. They SHALL keep Section 8 keys, recipients, transcript inputs, algorithm labels, ciphertext fields, plaintexts, and validation results separate from deployment-local handoff, storage, diagnostic, or relay mechanisms.

Freshness is provided by presentation-session controls, not `id`, `requestId`, item ids, or Artifact ids. For Section 8 this includes fresh unpredictable nonce, retained HPKE recipient key material, exact `encryptionInfo` base64url, authenticated origin or approved equivalent, transcript, optional bound `readerAuth`, and bound device authentication. Verifiers SHOULD use fresh HPKE recipient key pairs per session; any reuse profile needs replay, correlation, retention, and compromise rules.

Origin evidence SHALL come from authenticated platform or approved origin-equivalent evidence, not request JSON, launch URLs, display text, selector URLs, callback-looking strings, package-looking strings, logos, common names, unknown members, or Artifacts. If origin cannot be authenticated, the Wallet/Responder SHALL treat origin trust as absent. User interfaces SHOULD distinguish authenticated trust signals from unauthenticated request display text. Scanning QR, tapping NFC, loading a page, invoking DC API, or clicking outside the Wallet is not Holder consent.

When present, reader authentication is per-`DocRequest.readerAuth`, detached ES256 / COSE `alg` `-7`, over tag-24 `ReaderAuthentication`; payload `null`; empty external AAD; header label `33` (`x5chain`) with at least the leaf certificate. Wallets/Responders SHALL verify all cryptographic and policy inputs before treating the reader as authenticated and SHALL NOT treat presence of `readerAuth`, `x5chain`, names, logos, `kid`, URLs, or demo certificates as authentication.

Verifiers SHALL complete Section 8 mdoc validation and Section 7 policy before claiming production issuer trust. Valid MSO syntax, matching digest, included-certificate signature, device proof, HPKE opening, origin binding, readerAuth validation, or request-id match does not by itself prove production issuer accreditation, patient matching, clinical correctness, source provenance, downstream authorization, or write-back permission. Implementations SHALL reject unsupported or unexpected algorithm labels rather than downgrading or substituting defaults. Routine logs and telemetry SHOULD minimize plaintext requests, responses, FHIR, SMART Health Cards, Questionnaire answers, `DeviceResponse`, `dcapiResponse`, keys, secrets, access tokens, bearer URLs, launch URLs, QR images, ciphertext blobs, and sensitive stack traces; controlled fixtures containing demo material must be labeled and separated from production.

A Wallet/Responder SHALL validate the request before disclosure, recover the request only from the Section 8 carrier, compute the transcript from authenticated origin or approved equivalent, classify reader authentication accurately, perform Holder review or equivalent item-granular control, preserve item ids, and cover every item in `requestStatus[]`. It SHALL NOT hide multiple items or broad selectors in a way that defeats meaningful Holder control.

### 9.2 Privacy

A Requester SHOULD ask for the minimum bounded content needed. A Wallet/Responder SHALL provide item-granular Holder control before disclosure and SHALL NOT hide broad selectors, multiple items, accepted response forms, retention signals, or advisory `required` in a way that defeats meaningful control. Non-fulfilled statuses are normal outcomes and should not be treated as hidden clinical facts.

Selective disclosure occurs through item boundaries, Holder decisions, Wallet policy, Artifact construction, `accept[]`, `fulfills[]`, and status; Section 8 has one stable mdoc element and does not provide per-resource mdoc selective disclosure. A Wallet/Responder SHOULD construct the smallest Artifact set accurately satisfying approved items and accepted forms. Receivers should reject, quarantine, suppress, or minimize nonresponsive content and SHALL NOT treat Artifact ids as patient, global document, provenance, or source-system ids without independent evidence or policy.

Implementations SHOULD avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and SHOULD NOT embed patient accounts, MRNs, coverage ids, phone numbers, emails, appointments, staff ids, clinic ids, source ids, or predictable sequences in request ids, item ids, Artifact ids, telemetry ids, or log ids unless policy requires and protects them. Retention policies SHOULD cover plaintext and metadata, including ids, origins, package names, certificate subjects, IPs, user agents, timestamps, launch timing, payload sizes, error strings, validation outcomes, locale metadata, and access patterns.

A Wallet/Responder MAY display request text, selector URLs, Questionnaire text, logos, demo branding, or callback-looking strings as context but SHALL NOT label them as verified identity, trusted reader identity, source provenance, legal authority, or consent unless another accepted trust layer establishes that fact. It SHOULD distinguish authenticated trust evidence from unauthenticated text.

Implementations should treat both content and context as potentially sensitive. Requesters SHOULD prefer narrower selectors and separate items when possible. Wallets/Responders SHOULD apply local sensitive-data policy and MAY warn, redact, suppress, refuse, or return valid Section 6 statuses. Implementations SHOULD NOT send plaintext protocol payloads, clinical content, Holder decisions, Section 8 plaintexts, ciphertext blobs, private keys, secrets, credentials, access tokens, bearer URLs, launch URLs, QR images, or sensitive stack traces to routine telemetry except under controlled diagnostic, fixture, audit, or incident-response procedures.

### 9.3 Registries and IANA considerations

SMART request/response `type` values are protocol constants, not media types, mdoc identifiers, JOSE `typ` values, or profile identifiers. Media type strings in `accept[]` and `mediaType` SHALL be compared by exact, case-sensitive equality unless a future registered extension defines otherwise. Core media types are `application/fhir+json` and `application/smart-health-card`; the former carries raw FHIR JSON and outer `fhirVersion`, and the latter carries `value.verifiableCredential[]` with no outer `fhirVersion`. Extension Artifact registrations SHALL define exact media type or bounded pattern, payload fields, encoding, dereferencing/integrity rules, FHIR-version semantics, validation, status behavior, security, privacy, and compatibility; they SHALL NOT introduce a generic catch-all or redefine core fields.

The mdoc/DC API profile identifiers are `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`. Implementations claiming Section 8 SHALL use them exactly. External registration may be needed for some deployments; this draft does not assert that external registration is complete. Future incompatible mdoc-carrier changes SHOULD use a new profile identifier and, when necessary, a new `docType` suffix.

The status-code registry initially contains `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`. The selector-kind registry initially contains `selection.fhir` and `form.fhir`. The profile-id registry initially uses provisional labels from Section 4.3. Future status, selector, Artifact, compatibility, profile, or mdoc registrations SHALL define exact identifiers, semantics, processing, validation, unsupported behavior, security, privacy, and examples/tests, and SHALL NOT redefine core semantics. Profile identifiers SHALL NOT be used in SMART requests as `requestProfile`, presets, IPS shortcuts, all-of-the-above shortcuts, topic labels, or substitutes for selectors and `accept[]`.

Designated expert review applies before new or changed status codes, selector kinds, extension Artifact media types, compatibility rules, profile identifiers, or future mdoc identifiers are treated as interoperable registrations. The expert SHOULD approve only entries that preserve Sections 5/6 semantics, Section 6.6 validation, core selectors including additive `profiles[]` plus `profilesFrom[]`, Section 7 trust separation, Section 8 identifiers and transcript binding, safe unsupported-recipient behavior, and proportionate security/privacy handling. Private local identifiers MAY be used in controlled deployments, but must not be represented as SMART Health Check-in-wide registrations.

### 9.4 Internationalization

Internationalization applies to human-readable display text (`purpose`, item `title`, `summary`, `requestStatus[].message`, FHIR Questionnaire text, FHIR displays, UI prompts, warnings, errors, and extension fields defined as display). Protocol identifiers and machine values SHALL NOT be localized, including request/response ids, item ids, Artifact ids, status codes, selector kinds, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, FHIR canonicals, FHIR `resourceType` values used for validation, mdoc identifiers, algorithm labels, and launch identifiers.

SMART Health Check-in 1.0 defines no `lang`, `locale`, `Accept-Language`, language map, negotiated-locale member, or locale parameter in the core request, response, or Section 8 binding. Implementations SHALL NOT rely on unknown members, browser language, launch URL parameters, or HTTP headers as interoperable locale-negotiation signals unless a future version, registered extension, or deployment profile defines that behavior. Producers SHOULD use well-formed BCP 47 tags when a FHIR resource, extension, profile, or UI associates tags with display text; FHIR content follows FHIR i18n behavior.

Producers of new display text SHOULD emit NFC; consumers SHOULD accept valid Unicode display strings that are not NFC. Implementations SHALL NOT apply normalization, case folding, accent folding, width folding, confusable mapping, BIDI reordering, transliteration, aliases, or locale collation to make distinct protocol identifiers or constants compare equal. Display normalization MAY be used locally but SHALL NOT change bytes or code points used for signatures, hashes, encryption, HPKE/HKDF inputs, COSE inputs, mdoc digests, SMART Health Card verification, canonical preservation, audit, or byte-exact fixtures. UIs SHOULD isolate untrusted text from adjacent origins, identifiers, URLs, trust indicators, warnings, and controls, and Unicode/BIDI rendering SHALL NOT allow display text to spoof or obscure protocol or trust values.

## Appendix A. Conformance checklist

This checklist indexes testable obligations defined elsewhere in SMART Health Check-in 1.0. It does not create independent requirements. Rows for optional features, optional targets, or optional deployment constraints apply only to implementations claiming that feature, target, profile, or deployment constraint, even when the source section uses `SHALL` or `SHOULD` for that claimed feature.

| ID | Target | Level | Section | Checklist item | Evidence/validation |
| --- | --- | --- | --- | --- | --- |
| A-001 | Requester / Verifier | SHALL | §4.1 | Identify each claimed target, feature/profile, specification version, and deployment profile. | Claim lists target, optional features, version, and policy dependencies. |
| A-002 | Holder Wallet / Responder | SHALL | §4.1 | Validate SMART requests under §5 before response construction and preserve item ids for `fulfills[]` and `requestStatus[].item`. | Malformed requests fail safely; valid responses reference original item ids exactly. |
| A-003 | Deployment/profile author | SHALL | §4.1 | State constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations without redefining core semantics. | Profile maps added rules to targets and sections; no base semantic override. |
| A-004 | Conformance/fixture author | SHALL | §4.1 | Derive tests and fixtures from normative sections and identify target, feature set, section, expected outcome, comparison mode, and demo trust status. | Fixture/test manifest records pass/fail criteria, comparison mode, PHI/test-key status. |
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
| A-063 | Holder Wallet / Responder | SHALL | §6.3 | For `application/smart-health-card`, include non-empty `value.verifiableCredential[]` and no outer Artifact `fhirVersion`. | Artifact validation rejects missing VC list or outer `fhirVersion`. |
| A-064 | Requester / Verifier | SHALL | §6.3 | Verify and process each SMART Health Card JWS according to SMART Health Cards and local trust policy. | SHC validation/trust tests run on each `verifiableCredential[]` JWS. |
| A-065 | Holder Wallet / Responder | SHALL | §6.3 | For `application/fhir+json`, include non-empty `fhirVersion` and FHIR JSON `value` as a Resource or Bundle. | Artifact validation rejects absent `fhirVersion` and non-FHIR object payloads. |
| A-066 | Holder Wallet / Responder | SHALL NOT | §6.3 | Do not mix resources requiring different FHIR releases within one `application/fhir+json` Artifact. | Mixed-release content is split or status-reported, not mixed in one Artifact. |
| A-067 | Requester / Verifier | SHOULD | §6.3 | Treat raw FHIR `fhirVersion` not acceptable for the original request or receiver as unsupported for ingestion. | Receiver policy checks requested FHIR versions before ingestion. |
| A-068 | Deployment/profile author | SHALL | §6.3 | Define extension Artifact media types as branded variants with pinned media type, typed payload fields, validation, FHIR-version handling, status behavior, security/privacy, and compatibility. | Extension registration includes all required processing and validation rules and does not rely on `GenericArtifact`. |
| A-069 | Holder Wallet / Responder | SHALL | §6.4 | Include exactly one `requestStatus[]` entry for every original request item and no unknown or duplicate item ids. | Response tests compare status item set exactly to request item id set. |
| A-070 | Requester / Verifier | SHALL | §6.4 | Reject a SMART response unless `requestStatus[]` covers every request item exactly once with no unknown item ids. | Cross-validation tests missing, duplicate, and unknown status items. |
| A-071 | Holder Wallet / Responder | SHALL | §6.4 | Use only v1.0 status codes unless a supported future status-code extension applies. | Status validation rejects codes outside `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`. |
| A-072 | Holder Wallet / Responder | SHALL | §6.4 | Use `unsupported`, `unavailable`, `declined`, `partial`, `fulfilled`, and `error` according to defined item-outcome semantics. | Outcome tests cover unsupported format, unavailable data, Holder refusal, partial sharing, full fulfillment, and processing errors. |
| A-073 | Holder Wallet / Responder | SHALL NOT | §6.4 | Do not put secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data in `requestStatus[].message`. | Message lint/review inspects status messages. |
| A-074 | Requester / Verifier | SHALL | §6.4 | Do not rely on localized `message` text to determine normative status semantics. | Receivers process `status` code, not message text. |
| A-075 | Holder Wallet / Responder | MAY | §6.5 | Return one Artifact for multiple items or multiple Artifacts for one item only when every fulfillment edge satisfies media-type and selector rules. | Many-to-many tests validate each `fulfills[]` edge independently. |
| A-076 | Requester / Verifier | SHALL | §6.6 | Apply full request/response cross-validation before treating a response as protocol-valid; shape validation alone is insufficient. | Harness validates against original request, not response schema alone. |
| A-077 | Requester / Verifier | SHALL | §6.6 | Enforce that each Artifact `mediaType` is accepted by every fulfilled item unless a supported registered compatibility rule applies. | §6.6 validation rejects unaccepted media types. |
| A-078 | Requester / Verifier | SHALL | §6.6 | For raw FHIR JSON, verify `fhirVersion`, FHIR object shape, Bundle interpretation, and no mixed FHIR releases in one Artifact. | Raw FHIR cross-validation/quarantine tests cover each condition. |
| A-079 | Requester / Verifier | SHOULD | §6.6 | Inspect returned FHIR `resourceType`, `meta.profile`, Bundle entries, and `QuestionnaireResponse.questionnaire` when assessing selector responsiveness. | FHIR-aware validation or quarantine policy evaluates payload evidence. |
| A-080 | Requester / Verifier | SHALL | §7 | Preserve trust-layer separation among origin, reader, issuer/device, clinical-source, and deployment policy. | Trust report records separate pass/fail/unknown state for each layer. |
| A-081 | Holder Wallet / Responder | SHALL | §7.1 | Use platform-provided authenticated origin or approved origin-equivalent for origin trust, not SMART request fields or deployment handoff metadata. | Origin-binding tests reject request-body origin substitutes. |
| A-082 | Holder Wallet / Responder | SHALL | §7.1 | Treat origin trust as absent when web origin or privileged-caller context cannot be authenticated. | Missing-origin tests produce absent-origin state or defined flow failure. |
| A-083 | Requester / Verifier | MAY | §7.2 | Include optional per-`DocRequest.readerAuth` for same-device requests. | If present, request bytes include detached `COSE_Sign1` bound to §8 inputs. |
| A-084 | Requester / Verifier | Conditional | §7.2 | If including `readerAuth`, construct it for the same presentation session and exact requested items; do not reuse across sessions, transcripts, or `ItemsRequest` bytes. | ReaderAuth vectors bind signature to exact `SessionTranscript` and tag-24 `ItemsRequest`. |
| A-085 | Holder Wallet / Responder | Conditional | §7.2 | If supporting or relying on `readerAuth`, verify COSE signature, signed context, detached payload binding, relevant bytes, algorithm/key evidence, and trust policy. | Validation distinguishes absent, malformed, failed, valid-untrusted, and trusted states. |
| A-086 | Holder Wallet / Responder | SHALL | §7.2 | Treat absent `readerAuth` as absent reader authentication and invalid/untrusted `readerAuth` as failed authentication. | Policy/UI tests do not display failed or absent readerAuth as trusted. |
| A-087 | Requester / Verifier | SHALL | §7.3 | Complete §8 mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence. | Verifier tests fail on invalid MSO, digest, device signature, transcript, or HPKE opening. |
| A-088 | Requester / Verifier | SHALL | §7.3 | Apply issuer trust-anchor policy before claiming production mdoc issuer trust. | Validation report shows issuer signature/path/key evidence and policy result. |
| A-089 | Requester / Verifier | SHALL | §7.3 | Verify device-key proof bound to the expected presentation session before treating mdoc presentation as device-bound. | DeviceAuthentication tests fail on wrong `SessionTranscript` or device key. |
| A-090 | Requester / Verifier | SHALL | §7.4 | Evaluate clinical-source trust from Artifact media type, signatures/provenance, selectors, FHIR evidence, and deployment policy; do not infer provenance from transport success. | Raw FHIR and SHC provenance are recorded separately from mdoc validation. |
| A-091 | Requester / Verifier | SHALL | §7.4 | For SMART Health Card Artifacts, verify every VC JWS and evaluate payload content against original selectors and local policy. | SHC verifier logs signature/trust plus selector evaluation. |
| A-092 | Requester / Verifier | SHALL | §7.4 | Treat raw `application/fhir+json` as patient-mediated unless accepted separate provenance, signature, source attestation, authenticated retrieval, or equivalent proof is present. | Workflow policy does not equate raw FHIR with SHC or signed source evidence. |
| A-093 | Requester / Verifier | SHALL | §7.5 | Preserve identifier scopes and do not use an identifier from one layer as proof or authorization for another. | Tests distinguish request id, item ids, Artifact ids, and presentation-session values. |
| A-094 | Deployment/profile author | SHALL | §7.6 | Document mandatory trust layers, accepted anchors/registries, freshness/replay expectations, failure handling, assurance levels, and Holder display rules. | Deployment profile includes trust policy matrix and failure behavior. |
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


## Appendix B. JSON Schema for `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`

This appendix provides JSON Schema snippets for the transport-neutral SMART request and SMART response objects defined in Sections 5-6. The snippets are intended for structural validation, fixture review, and conformance-test scaffolding. They do not define mdoc carriage, registry behavior, full FHIR validation, SMART Health Card validation, or downstream clinical ingestion policy.

If a schema rule in this appendix appears to conflict with Sections 5-6, Sections 5-6 control. Normative language in this appendix either restates Sections 5-6 or is scoped to conformance with these Appendix B schema snippets.

### B.1 Dialect and validation model

The schema snippets use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A validator that claims conformance to Appendix B SHALL evaluate these snippets using JSON Schema 2020-12 semantics, or a later dialect only when that dialect is known to preserve the semantics of the keywords used here.

The snippets intentionally keep core extension points open. Unknown members are not made schema errors solely by Appendix B, because Sections 5-6 allow forward-compatible unknown members and registered extension selectors. Registered extension Artifact media types are represented by additional or profiled schemas rather than by a generic core catch-all. Deployment profiles MAY publish stricter schemas, but those schemas must identify their additional constraints rather than silently changing the core protocol.

JSON Schema validation is not complete SMART Health Check-in validation. A Verifier still applies the request/response, FHIR, SMART Health Card, transport, trust, and deployment-policy checks required elsewhere in the specification. Section B.4 summarizes important checks that are not fully expressible in these standalone schemas.

The request schema requires `items[]` but does not set `minItems: 1`, because §5.2 currently says a Requester SHOULD include at least one request item and leaves any hard prohibition on zero-item requests to later schema/conformance closure.

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
- `profiles[]` and `profilesFrom[]` are independently allowed in the same `selection.fhir` selector. Their combined presence is additive under §5.4.1; the schema does not make either array narrow the other.
- `profiles[]` and `resourceTypes[]`, when present, are arrays with at least one string. Whether a `resourceTypes[]` value is an official FHIR `resourceType` for a particular FHIR release is a FHIR-aware procedural check.
- A `selection.fhir` selector may omit all of `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to express the no-selector default from §5.4.1.
- A `form.fhir` selector is a single object shape with one or both of the sibling members `questionnaireCanonical` and `questionnaire`. It does not allow `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; use a separate `selection.fhir` request item when existing FHIR resource selection is also needed.
- Canonical strings MAY include a `|version` suffix. Consumers parse the suffix as structured FHIR canonical-reference version metadata and do not treat it as part of a direct HTTP URL.
- The extension-selector branch permits syntactic validation of registered extension selector kinds without embedding a future registry in Appendix B. A core-only deployment profile can replace this branch when it intentionally rejects all extension selectors.
- The SMART request body SHALL NOT carry requester identity metadata under §5.2. This schema cannot reliably reject arbitrary identity-like unknown or extension members while keeping extension points open, so processors must enforce that prohibition procedurally and through extension review.

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
| Limits not fixed by Sections 5-6 | Maximum string lengths, array sizes, byte sizes, URL dereferencing behavior, and extension payload limits belong to transport profiles, extension registrations, conformance tooling, or deployment policy unless later normative text fixes them. |

### B.5 Illustrative validation flow

The following sequence is illustrative. It shows where Appendix B schema validation fits relative to other validation; it is not a new transport binding or implementation API.

1. Parse JSON using RFC 8259 rules and reject duplicate object member names when detected.
2. Validate the SMART request against the B.2 request schema.
3. Apply §5 procedural checks, including duplicate request-item id detection, registered extension-selector handling, and requester-identity metadata review.
4. Validate the SMART response against the B.3 response schema.
5. Apply §6.6 cross-validation against the original request: exact `requestId` match, `fulfills[]` reference resolution, per-item `accept[]` compatibility, exact `requestStatus[]` coverage, and FHIR-version checks.
6. Apply FHIR, SMART Health Card, QuestionnaireResponse, transport, trust, security, privacy, and deployment-policy checks as applicable.


## Appendix C. Same-device CDDL and profile constraints

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


## References

### Normative references

- RFC 2119, RFC 8174: BCP 14 requirement keywords.
- RFC 7515: JSON Web Signature (JWS).
- RFC 8259: JSON.
- RFC 8610: CDDL.
- RFC 8949: CBOR.
- RFC 9052 and related COSE specifications: COSE structures and algorithms.
- RFC 9180: Hybrid Public Key Encryption (HPKE).
- ISO/IEC 18013-5: mdoc structures reused by the same-device profile.
- W3C Digital Credentials API: browser/user-agent presentation surface.
- HL7 FHIR R4 4.0.1 and relevant FHIR canonical/version rules.
- SMART Health Cards specification.

### Informative references and companion material

- OpenID for Verifiable Presentations (OpenID4VP), reserved for future binding work.
- IETF Digital Credentials Query Language (DCQL), for future alignment.
- US Core Implementation Guide and CARIN/HL7 insurance-card profiles, as examples of FHIR profile families.
- Companion examples, fixtures, byte ladders, diagrams, FHIR mapping notes, and implementation guidance: <https://github.com/jmandel/smart-health-checkin-mdoc>.
