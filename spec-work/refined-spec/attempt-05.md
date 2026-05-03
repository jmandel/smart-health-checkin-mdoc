# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

Short title: **SMART Health Check-in 1.0**. Suggested citation label: **SHC-Checkin-1.0**. Suggested document identifier: `smart-health-checkin-1.0`.

Status: editor's draft for implementer review. Version: 1.0 draft. Publication date, editors, contributors, IPR, and final copyright/license details are publication placeholders.

**Editorial approach:** This candidate applies a trust-first consolidation. It keeps the two normative layers explicit: the transport-neutral clinical request/response JSON model in Sections 5 and 6, and the same-device direct `org-iso-mdoc` W3C Digital Credentials API presentation flow in Sections 7 and 8. Repeated warnings about requester identity, transport success, issuer/device evidence, and clinical-source provenance are consolidated into the Core Trust Rule and Section 7 references while retaining normative requirements. Lengthy narrative, worked examples, platform notes, fixture catalogs, byte captures, and FHIR mapping exposition are summarized as companion-material candidates; this file remains self-contained for normative implementation.

## 1. Introduction

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receives a structured SMART response. The SMART request describes requested items, Holder-facing context, selectors, and accepted response media types. The SMART response returns Artifacts, fulfillment links, and per-item status. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as its same-device presentation flow. In-person QR, NFC, deep-link, pointer, relay, submission, and completion mechanisms are deployment-defined ways to land a Holder on a same-device Verifier page; they are not separate normative protocol layers.

### 1.1 Core Trust Rule

Origin evidence, privileged-caller policy, optional reader authentication, mdoc issuer/device evidence, Holder action, SMART response validation, SMART Health Card signatures, raw-FHIR provenance, HPKE confidentiality, identifier binding, and downstream clinical policy are separate controls. A Wallet/Responder, Verifier, Requester, deployment profile, trust-framework operator, or receiver SHALL NOT treat one trust layer or successful control as proof that another trust layer or control succeeded unless this specification or an explicit deployment profile defines that relationship and its assurance level.

The SMART request body is not a requester identity credential, consent record, persistent authorization grant, transport transcript, production trust-anchor assertion, or handoff envelope. A Requester SHALL NOT place requester identity, organization metadata, web origin, reader credentials, certificates, callback endpoints, deployment handoff metadata, trust assertions, or production trust-anchor claims in the SMART request body as substitutes for presentation-layer or deployment-policy trust. A Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector values, unknown members, extension members, launch metadata, demo strings, or Artifact contents as authenticated requester identity unless the selected presentation flow, trust processing, or deployment policy establishes that fact outside the SMART request body.

Successful same-device presentation proves only the properties validated for that transport and session. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority to act, downstream clinical acceptance, or clinical-source provenance for unsigned content.

### 1.2 Scope, non-goals, and conventions

SMART Health Check-in 1.0 defines two protocol surfaces: the **clinical content model** in Sections 5 and 6, and the **same-device presentation flow** in Sections 7 and 8. The clinical content model defines request items, user-facing purpose and item text, accepted response media types, content selectors, returned Artifacts, fulfillment links, and per-item status reporting. Presentation transports can add origin context, reader or Verifier information, encryption, freshness, device evidence, routing metadata, and validation rules; they do not change request item semantics, selector meaning, consent granularity, Artifact media types, or response status semantics.

This specification does not define credential issuance, issuer onboarding, Wallet enrollment, credential refresh, longitudinal Wallet storage, EHR write-back, patient matching, identity proofing, guardian or proxy authority, payment or eligibility adjudication, arbitrary FHIR query, SMART App Launch replacement, universal wallet portability, or downstream clinical sufficiency. QR-code, NFC, deep-link, pointer, relay, submission, and completion-display mechanisms can be implemented around this protocol, but they do not change SMART request, SMART response, or same-device presentation semantics.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** are interpreted as described in BCP 14, RFC 2119 and RFC 8174 when they appear in all capitals.

JSON objects and members use RFC 8259 terminology. JSON strings are Unicode strings, arrays are ordered, and object member names are unique within an object unless a later section gives a more specific rule. CBOR values use RFC 8949 terminology. CDDL fragments are profile pseudo-CDDL unless stated otherwise. COSE structures use RFC 9052 terminology. HPKE structures and operations use RFC 9180 terminology. Byte operations are over the exact serialized bytes named by the relevant section, not over Markdown, diagnostic notation, line wrapping, or presentation text unless the section explicitly says the textual representation is the input. Base64url values are unpadded unless the field definition explicitly permits or requires padding. Literal JSON code fences are parseable JSON; non-JSON fragments use text fences.

Normative references include RFC 2119, RFC 8174, RFC 7515, RFC 8259, RFC 8610, RFC 8949, RFC 9052, RFC 9053, RFC 9180, ISO/IEC 18013-5, W3C Digital Credentials API, FHIR R4 (4.0.1), and SMART Health Cards. Informative references include OpenID4VP, DCQL, US Core, CARIN, ISO/IEC 18013-5 Annex C/mDL ecosystem guidance, and SMART App Launch background.

### 1.3 Terminology

- **Artifact:** A response object that contains clinical content or references clinical content. An Artifact has an `id`, declares a `mediaType`, and lists the request item or items it fulfills.
- **Clinical content model:** The transport-neutral SMART request and SMART response JSON model defined in Sections 5 and 6.
- **FHIR canonical:** A canonical URL as used by FHIR, optionally including a `|version` suffix where permitted.
- **Holder:** The person whose clinical information is requested and who controls whether information is shared.
- **Holder data source:** A Wallet-internal or deployment-specific source of clinical data used for response construction; issuance and synchronization are outside this protocol.
- **In-person handoff:** A deployment pattern in which a kiosk, staff desktop, QR code, NFC tag, deep link, or similar mechanism lands the Holder on a same-device Verifier page. It is not a version 1.0 wire format.
- **Item / request item:** One entry in `SmartHealthCheckinRequest.items[]`.
- **Profile:** An exact FHIR `StructureDefinition` canonical URL, optionally with `|version`.
- **Profile family:** A canonical URL identifying a published implementation guide, publication, collection, or other family of FHIR profiles. Values in `profilesFrom[]` are canonical profile-family URLs.
- **Profile-selector additivity:** `profiles[]` and `profilesFrom[]` broaden the set of acceptable profile matches when both appear in a `selection.fhir` selector. The presence of one field does not narrow the other.
- **Requester:** The relying party that constructs the SMART request and consumes the SMART response.
- **Responder:** The role that constructs and returns a SMART response after Holder review and Wallet policy. The Wallet normally acts as Responder.
- **Same-device presentation flow:** The base version 1.0 presentation flow in which a Verifier page invokes the W3C Digital Credentials API on the same device where the Wallet is available, using direct `org-iso-mdoc`.
- **SMART request:** A `SmartHealthCheckinRequest` JSON object as defined in Section 5.
- **SMART response:** A `SmartHealthCheckinResponse` JSON object as defined in Section 6.
- **Verifier:** The presentation-transport role that constructs a presentation request, invokes the same-device flow, receives and opens the presentation response, validates transport artifacts, extracts the SMART response, and applies clinical response validation.
- **Wallet:** Software controlled by or acting for the Holder that receives a request, performs Holder review when appropriate, applies policy, gathers or constructs responsive Artifacts, and returns a SMART response.

## 2. Purpose and problem statement

Plain credential issuance answers how data or credentials become available to a Holder or Wallet. Check-in asks what a specific Requester needs for a specific workflow now, how that request is displayed to the Holder, what subset the Holder permits, and how the response is correlated back to the request. Presentation protocols can prove possession, protect transport, and support Verifier trust, but they do not by themselves define a FHIR-native request vocabulary, item-level Holder review, accepted clinical media types, per-item status, or fulfillment links.

SMART Health Check-in supplies this clinical request/response layer. Requesters can express desired content using FHIR canonicals, profile families, resource types, questionnaires, and registered extension selectors. Wallets can satisfy the request from available Holder data sources and return Artifacts with media types the Requester advertised as acceptable. Verifiers and response consumers can validate a predictable response shape before local ingestion or workflow processing.

## 3. Architecture and design principles

The Requester constructs the SMART request and consumes the SMART response. The Verifier constructs and validates presentation transport. The Wallet/Responder processes the SMART request, obtains Holder control, and constructs the SMART response. The Browser/User Agent and Credential Manager mediate Digital Credentials API invocation. Kiosks, staff desktops, relay services, phone landing pages, and completion displays are deployment components rather than version 1.0 conformance roles.

At a high level: the Requester creates a SMART request; the Verifier packages it in the Section 8 direct `org-iso-mdoc` request; the Browser/User Agent mediates Wallet invocation; the Wallet/Responder validates the request, applies trust and Holder review, constructs a SMART response, and returns an encrypted mdoc `DeviceResponse`; the Verifier opens and validates the presentation response, extracts the SMART response, applies Section 6.6 cross-validation, and passes validated results to the Requester or downstream receiver.

Design principles: one docType, one namespace, one stable element; no requester identity in the clinical request body; FHIR canonicals where they fit; no local topic vocabularies when FHIR terms exist; response forms are media types; responses are Artifact-centered with explicit per-item status; raw FHIR JSON carries an explicit FHIR version; same-device `intentToRetain` defaults to true for ordinary clinical workflows; cryptographic agility is introduced through profiles and registries rather than unconstrained in-band negotiation.

## 4. Conformance

A conformance claim SHALL identify the implemented conformance target or targets, claimed feature set or profile, specification version, and any deployment profile that changes policy choices left open by this specification. One product MAY implement multiple targets, but it SHALL satisfy the requirements for each target and feature it claims.

SMART Health Check-in 1.0 has two normative layers: the transport-neutral clinical request and response model in Sections 5 and 6, and the direct same-device `org-iso-mdoc` presentation flow, including trust processing, in Sections 7 and 8. A deployment MAY use QR, NFC, deep link, desktop sign, kiosk screen, or another handoff to land the Holder on a page that runs Section 8. That handoff is implementation-defined deployment UX, not a conformance feature or wire protocol.

A **Requester** claiming core clinical conformance SHALL construct `SmartHealthCheckinRequest` objects according to Section 5 and SHALL request only Artifact media types it is prepared to process for the corresponding item. A **Verifier** claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Verifier-side requirements in Section 8, validate returned presentation artifacts, extract a SMART response, and apply Section 6.6 cross-validation before Requester use. A Requester/Verifier SHALL keep clinical request fields distinct from trust evidence and SHALL NOT put requester identity, organization metadata, web origin, reader credentials, deployment handoff metadata, callback endpoints, trust assertions, or production trust-anchor claims in the SMART request body.

A **Holder Wallet / Responder** claiming core clinical conformance SHALL validate SMART requests under Section 5 before using them for response construction, process request items as the Holder-review and response-accounting granularity, preserve request item ids for `fulfills[]` and `requestStatus[].item`, construct SMART responses under Section 6, and set `SmartHealthCheckinResponse.requestId` to the accepted SMART request `id`. A Holder Wallet/Responder claiming direct same-device `org-iso-mdoc` support SHALL satisfy Section 8 requirements, including request-carrier validation, `SessionTranscript` processing, optional `readerAuth` classification and verification when supported or relied upon, Holder review or equivalent Holder-control processing, mdoc response construction, and HPKE response encryption.

A **deployment-profile author** SHALL state which conformance targets are constrained, which optional features are required, which trust layers are in scope, and which additional validation, security, privacy, or fixture expectations apply. A deployment or profile SHALL NOT redefine clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, status codes, same-device carriers, trust-layer separation, or implementation-defined handoff UX. A **conformance-test author** or **fixture author** SHALL derive executable checks, schemas, CDDL material, byte ladders, or vectors from normative requirements and SHALL identify the target, feature set, section reference, expected outcome, comparison mode, and trust status of demo keys, self-signed material, synthetic data, or captures.

The mandatory clinical core is the transport-neutral SMART request and SMART response model in Sections 5 and 6. Direct same-device presentation in Sections 7 and 8 is the normative live presentation layer for implementations that claim live SMART Health Check-in presentation support. A narrower claim for JSON tooling, fixture production, deployment-profile authoring, or implementation-defined handoff UX does not by itself claim live Section 8 presentation support.

Core clinical support includes `selection.fhir` and `form.fhir` selector shapes where an implementation claims to request or process those selectors; `form.fhir` selectors with `questionnaireCanonical` and/or `questionnaire` directly on the selector; `profilesFrom[]` as an array of canonical profile-family URLs; additive `profiles[]` plus `profilesFrom[]` semantics; canonical `|version` resolution and verification; request `accept[]` and Artifact `mediaType` rules; no generic catch-all Artifact carrier; `application/fhir+json` Artifacts with `fhirVersion`; `application/smart-health-card` Artifacts with `value.verifiableCredential[]` and no outer Artifact-level `fhirVersion`; `requestStatus[]` coverage exactly once for every request item; and Section 6.6 cross-validation.

All conformance targets SHALL preserve the trust-layer separation defined in Section 7 for the features they implement. In particular, an implementation SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from successful transport presentation, mdoc issuer/device evidence, reader authentication, Holder action, SMART response shape validation, deployment handoff metadata, or demo fixture keys.

Optional features include reader authentication, deployment trust policy, registered extension selectors, registered extension Artifact media types, media-type compatibility rules, future status-code extensions, stricter deployment schemas, schema/CDDL/fixture/vector profiles, and future bindings. An implementation that claims an optional feature, or operates under a deployment profile that requires it, SHALL satisfy the referenced requirements for each target it claims.

### 4.1 Identifiers, profiles, and versioning

| Identifier kind | Value | Scope |
| --- | --- | --- |
| SMART request discriminator | `smart-health-checkin-request` | Section 5 `type`. |
| SMART response discriminator | `smart-health-checkin-response` | Section 6 `type`. |
| SMART request/response model version | `1` | Section 5 and 6 `version`. |
| Core selector kinds | `selection.fhir`, `form.fhir` | Section 5 `content.kind`. |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` | Section 5 `accept[]` and Section 6 Artifact `mediaType`. |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` | Section 6 `requestStatus[].status`. |
| Direct DC API protocol id | `org-iso-mdoc` | Section 8 protocol. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | Section 8 document type. |
| mdoc namespace | `org.smarthealthit.checkin` | Section 8 namespace. |
| mdoc stable element | `smart_health_checkin_response` | Section 8 response element. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | Section 8 `ItemsRequest.requestInfo` key. |

Human-readable conformance labels are documentation and test-report labels, not in-band request fields: `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and reserved `smart-health-checkin-oid4vp-reserved`. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, an `all of the above` shortcut, a profile label, a topic label, or negotiation metadata to bypass Section 5 selectors, Section 5 `accept[]`, Section 6 response validation, Section 7 trust processing, or Section 8 validation.

SMART Health Check-in uses separate version markers at separate layers. Implementations SHALL compare and interpret the version marker for the layer they are processing and SHALL NOT substitute one layer's version for another. SMART request and response use `type` and `version: "1"`; same-device mdoc uses `DeviceRequest.version` and `DeviceResponse.version` equal to `"1.0"` and `docType` `org.smarthealthit.checkin.1`; FHIR content uses `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes. A change is breaking when it changes the meaning of existing SMART request fields, SMART response fields, selector semantics, Artifact media-type rules, fulfillment/status accounting, same-device carriers, trust-layer separation, or required validation outcomes.

### 4.2 Extension model

Extension points are explicit and additive. An extension SHALL NOT redefine the semantics of core request fields, response fields, selector kinds, Artifact media-type rules, fulfillment links, status codes, same-device request or response carriers, or Section 7 trust-layer separation.

A content-selector extension SHALL specify the exact `content.kind` value, JSON shape, clinical meaning, fulfillment rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, validation rules, unsupported behavior, security considerations, privacy considerations, and examples. A Holder Wallet/Responder that does not support an extension selector SHALL NOT guess its semantics from display text, profile labels, local topic names, field names, deployment handoff metadata, or requester identity metadata.

An Artifact media-type extension SHALL specify a pinned `mediaType` literal or bounded media-type pattern, payload fields, carrier shape, dereferencing and integrity rules when applicable, FHIR-version semantics if any, validation rules, status behavior, security considerations, privacy considerations, and compatibility with core media types if any. The extension SHALL be modeled as an additional branded Artifact variant, not as a `GenericArtifact` catch-all. A Holder Wallet/Responder SHALL NOT claim an extension Artifact fulfills an item unless the item accepted that media type or a supported compatibility rule applies. A Verifier SHALL enforce the same rule under Section 6.6.

A status-code extension SHALL NOT be used in a version 1.0 SMART response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat unknown status codes as invalid for version 1.0 response validation unless such support is present.

## 5. Clinical content - request

This section defines the SMART request, the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded content. Presentation transports do not change `purpose`, request items, selectors, `accept[]`, item identifiers, or the advisory `required` flag.

### 5.1 Encoding rules

A SMART request is a JSON object. A Requester SHALL encode a SMART request as RFC 8259 JSON. When serialized as text or bytes by a transport binding, the serialized JSON text SHALL be UTF-8. A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or values outside the JSON data model. A Wallet/Responder or Verifier that parses a SMART request SHALL reject a request whose top-level value is not a JSON object or whose representation cannot be parsed according to the selected transport's encoding rules.

JSON object member names in a SMART request SHALL be unique within each object. A Wallet/Responder or Verifier SHALL reject a SMART request when duplicate object member names are detected. Implementations SHOULD avoid parser configurations that silently apply first-member-wins or last-member-wins behavior to security-relevant protocol data. Object member order has no clinical meaning. Array order has meaning only where a field definition states it has meaning: `fhirVersions[]` and `accept[]` are ordered by Requester preference, and `items[]` order is the Requester's preferred display or workflow order. This section defines no numeric fields. A Requester SHALL NOT encode identifiers, versions, booleans, arrays, media types, FHIR canonicals, or display strings as JSON numbers.

A Requester SHOULD keep request ids, item ids, titles, summaries, purpose text, canonicals, media type strings, and inline Questionnaire content no larger than needed. A Wallet/Responder MAY reject a request that exceeds implementation, transport, safety, display, or policy limits, provided the rejection is reported according to the selected flow and applicable privacy requirements. A Wallet/Responder MAY ignore unknown members at the top level, in request items, and inside known selector objects when those members do not change known required members. Ignoring an unknown member does not make a malformed known member valid. A Requester SHALL NOT rely on an unknown member to carry requester identity, override Holder control, change `accept[]`, change selector semantics, change `required`, or impose transport, trust, or consent behavior. An unknown `content.kind` value is not an ignorable member; it identifies an extension selector kind.

### 5.2 `SmartHealthCheckinRequest`

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

A Requester SHALL include `type`, `version`, `id`, and `items`. A Requester MAY include `purpose` and `fhirVersions`.

- `type`: A Requester SHALL set `type` to exactly `"smart-health-checkin-request"`. A Wallet/Responder SHALL reject a request whose `type` is absent or not exactly that string.
- `version`: A Requester SHALL set `version` to exactly `"1"` for SMART Health Check-in 1.0. A Wallet/Responder SHALL reject a request whose `version` is absent or not exactly `"1"`, unless a future compatibility rule explicitly defines compatible handling.
- `id`: A Requester SHALL include `id` as a non-empty opaque Requester-generated request identifier unique among SMART requests created by that Requester for the same check-in session. A Requester SHOULD generate enough unpredictability or contextual uniqueness to avoid accidental collision and cross-session guessing. A Wallet/Responder SHALL preserve the request `id` for `requestId`. A Wallet/Responder SHALL NOT infer requester identity, patient identity, authorization, or clinical meaning from the syntax of `id`.
- `purpose`: If present, a Requester SHALL encode `purpose` as a string and SHALL use it only to describe workflow context for Holder review. A Requester SHALL NOT use `purpose` to carry requester identity, organization name, web origin, logo URL, contact URL, legal attestation, proof of authority, consent language, trust status, or persistent authorization semantics. A Wallet/Responder MAY display `purpose`, but SHALL NOT treat it as authenticated requester identity or transport trust.
- `fhirVersions[]`: If present, a Requester SHALL encode `fhirVersions` as an array of strings ordered from most to least preferred. A Requester that accepts `application/fhir+json` SHOULD include at least one FHIR release version unless it can safely process any FHIR version a conforming Wallet/Responder might return. A Wallet/Responder SHOULD use `fhirVersions[]` when choosing a FHIR version for `application/fhir+json`, subject to Holder decision, data, capability, policy, and selected item `accept[]`. `fhirVersions[]` does not override FHIR version information intrinsic to SMART Health Cards or registered extensions.
- `items[]`: A Requester SHALL include `items` as an array and SHALL encode each member as a `SmartHealthCheckinRequestItem`. A Requester SHOULD include at least one item. A zero-item request has no clinical content to fulfill but is not made invalid by this core rule. A Wallet/Responder SHALL process `items[]` as the Holder-review and response-accounting granularity. It MAY group, summarize, or reorder items for accessibility, safety, or policy, but SHALL preserve item `id` values for fulfillment and status reporting.

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited metadata includes requester, clinic, practice, payer, organization, staff, or facility name fields; logo, image, icon, brand-color, or display-brand fields; requester URL, website, callback URL, endpoint URL, domain, origin, package name, application id, or certificate fields; signed-request, reader, Verifier, trust-framework, issuer, accreditation, or legal-entity metadata; and pointer, relay, completion, encryption, nonce, handoff, or wrapper metadata from implementation-defined initiation flows. This prohibition applies to the top-level object, request items, selectors, and extension members.

### 5.3 `SmartHealthCheckinRequestItem`

```json
{
  "id": "patient",
  "title": "Patient demographics",
  "summary": "Demographics for check-in.",
  "required": false,
  "content": { "kind": "selection.fhir" },
  "accept": ["application/fhir+json"]
}
```

A Requester SHALL include `id`, `title`, `content`, and `accept` for every item. A Requester MAY include `summary` and `required`.

A Requester SHALL include `id` as a non-empty string and SHALL NOT use the same item `id` more than once within a SMART request. A Wallet/Responder SHALL reject a request with a missing, non-string, empty, or duplicate item `id`. Wallets/Responders and Verifiers SHALL use exact string equality when comparing item ids. Newly defined ids SHOULD consist only of ASCII letters, digits, period (`.`), underscore (`_`), tilde (`~`), and hyphen (`-`); Wallets/Responders MAY accept other non-empty string ids when they can preserve them exactly. A Requester SHOULD NOT include patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in item ids.

A Requester SHALL include `title` as a non-empty Holder-facing string and SHALL NOT use it as requester identity metadata. A Wallet/Responder SHOULD make `title` available in Holder review. A Requester MAY include `summary` and SHOULD use it to clarify broad selectors, profile-family requests, or questionnaire purpose when `title` alone would be ambiguous. A Requester SHALL NOT use `summary` as requester identity metadata. A Wallet/Responder MAY display, summarize, or suppress `summary`, but SHALL preserve item ids.

A Requester MAY include `required` as a boolean. If omitted, a Wallet/Responder SHALL interpret it as `false` for display and decision-support. A Requester SHALL treat `required` as advisory workflow context only. `required: true` is not Holder consent, legal authorization, a command to the Wallet, or a guarantee responsive content will be returned. A Wallet/Responder SHALL NOT treat `required: true` as authorization to bypass Holder control, Wallet policy, law, or consent UX requirements. It MAY return declined, unavailable, unsupported, partial, or error status for a required item.

A Requester SHALL include `accept` as a non-empty array of media type strings on every item. It SHALL order `accept[]` from most preferred to least preferred and SHALL NOT use a separate preference field. A Requester SHALL NOT include a media type unless it is prepared to parse, validate, and route a conforming Artifact of that media type for the item. A Wallet/Responder MAY choose any listed media type, considering Holder decision, data, capability, FHIR version support, policy, and whether the Artifact accurately fulfills the item; it SHOULD choose the earliest acceptable media type it can produce when otherwise equivalent. A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact `mediaType` is listed in that item's `accept[]`, except where a registered compatibility rule explicitly defines compatible substitution semantics.

A Requester SHALL include `content` as a selector object and SHALL include string `content.kind`. Version 1.0 defines `selection.fhir` and `form.fhir`. A Wallet/Responder that does not understand `content.kind` SHALL NOT infer semantics from display text or unrelated fields; it SHALL treat the item as unsupported or reject the request according to the selected flow and Section 6 status rules.

### 5.4 Content selectors

A selector describes what clinical content or action would satisfy a request item. Selectors are not a general FHIR query language, clinical decision support expression, patient-matching rule, authorization policy, or requester identity channel. A Requester SHALL use a selector shape defined by this section or by a registered extension selector. A Wallet/Responder SHALL evaluate selector semantics independently for each request item, while allowing one Artifact to fulfill multiple items where Section 6 permits.

`selection.fhir` requests existing patient-specific FHIR resources:

```json
{
  "kind": "selection.fhir",
  "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "resourceTypes": ["Patient"]
}
```

A Requester SHALL set `kind` to `"selection.fhir"`. A Requester MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination of those fields, or none of them. If present, each SHALL be an array of strings. A `selection.fhir` selector SHALL NOT include `questionnaireCanonical` or `questionnaire`. If a workflow needs both existing-resource selection and form completion, the Requester SHALL use separate request items.

`profiles[]` identifies exact FHIR `StructureDefinition` profile canonical URLs. A Requester MAY include `profiles` as an array of one or more FHIR canonical strings and SHOULD use canonical `StructureDefinition` URLs. A value MAY include `|version` when exact profile version is needed. A Wallet/Responder MAY treat a resource as matching when `meta.profile` declares one listed canonical or when it has equivalent local knowledge or trusted conformance evidence. Full FHIR profile validation is not required by the core protocol.

`profilesFrom[]` identifies one or more profile families by canonical URL. A Requester MAY include `profilesFrom` as a non-empty array of canonical profile-family URL strings. A Requester SHALL encode `profilesFrom` as an array and SHALL NOT encode it as a string, object, package descriptor, implementation-guide object, package id, package version, npm package name, registry alias, local topic vocabulary, or URN unless a future version or registered extension defines such a value space. A Wallet/Responder SHALL reject a present `profilesFrom` member that is not a non-empty array of strings and MAY additionally reject values that are not canonical URLs under policy. A Wallet/Responder MAY use local knowledge, FHIR package metadata, implementation-guide definitions, configured family mappings, or deployment knowledge to determine profile-family membership.

`resourceTypes[]` narrows `selection.fhir` by official FHIR `resourceType` names. A Requester MAY include it as an array of one or more strings. A Requester SHALL use official FHIR resource type names appropriate to the FHIR versions it can consume and SHALL NOT use local topic labels, display strings, or implementation-specific category names unless they are official resource type names. When present with `profiles[]` or `profilesFrom[]`, `resourceTypes[]` is an additional resource-type constraint; when present alone, it requests patient-specific FHIR resources whose `resourceType` is listed, subject to Holder decision, accepted media types, FHIR version compatibility, available data, and policy.

`profiles[]` and `profilesFrom[]` are additive profile selectors. When both are present, a Wallet/Responder SHALL treat a resource as satisfying the profile-selector portion if it matches any exact profile in `profiles[]` or any profile belonging to any family identified by `profilesFrom[]`, subject to `resourceTypes[]` and the rest of the item definition. A Requester SHALL NOT rely on `profiles[]` to narrow a broader `profilesFrom[]` request. A Wallet/Responder SHALL NOT interpret `profiles[]` as limiting, filtering, enumerating, or narrowing profiles available through `profilesFrom[]`.

If `selection.fhir` omits `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision. A Requester SHOULD avoid this no-selector default unless broad content is safe and clearly explained. A Wallet/Responder MAY satisfy a no-selector item with compatible patient-specific FHIR resources, is not required to disclose all available resources, and MAY fulfill partially.

`form.fhir` requests completion of a FHIR Questionnaire form and return of an appropriate Artifact. For `application/fhir+json`, the expected content is a FHIR `QuestionnaireResponse`.

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "item": []
  }
}
```

A Requester SHALL set `content.kind` to `"form.fhir"`. A Requester SHALL include `questionnaireCanonical`, `questionnaire`, or both as direct members. If `questionnaireCanonical` is present, the Requester SHALL encode it as a non-empty FHIR canonical string; it MAY include `|version`. If `questionnaire` is present, the Requester SHALL encode it as an inline FHIR `Questionnaire` resource object whose `resourceType` is `"Questionnaire"`. A `form.fhir` selector SHALL NOT include `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; if a workflow needs both form completion and resource selection, the Requester SHALL use separate items. A Wallet/Responder SHALL reject or report unsupported for `form.fhir` with neither form field, non-string/blank `questionnaireCanonical`, non-Questionnaire `questionnaire`, or mixed `selection.fhir` fields.

A Wallet/Responder MAY resolve `questionnaireCanonical` using a configured canonical resolver, FHIR search, cached content, Holder data source, or other local mechanism satisfying Section 5.5. Direct HTTP dereference is permitted only for unversioned canonicals. If it cannot resolve, render, or use the Questionnaire, it SHALL report the item outcome using Section 6 status rules rather than fabricating a Questionnaire. A Wallet/Responder MAY render or process an inline Questionnaire without network retrieval, subject to policy, safety checks, language support, and Questionnaire feature support.

When both `questionnaireCanonical` and `questionnaire` are supplied, the canonical is the Requester's explicit identifier and the inline resource is the body to render or use. A Requester SHOULD ensure `questionnaireCanonical`, `questionnaire.url`, and `questionnaire.version` are consistent. A Wallet/Responder SHALL NOT silently merge conflicting Questionnaire definitions or silently rewrite the Requester's canonical to match a conflicting inline resource. If it detects material disagreement, including different base canonical URLs, different explicit versions, or conflicting item structure that would change Holder answers, it SHOULD treat the item as unsupported or error rather than collecting answers against an ambiguous Questionnaire.

An extension selector has `content.kind` other than the core values. An extension registrant SHALL define the exact `content.kind`, JSON shape, required and optional members, clinical meaning, content-satisfaction rules, interactions with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, Artifact fulfillment, unsupported/unavailable/partial/error behavior, unknown-member handling, security, privacy, and examples. It SHALL NOT redefine core fields or permit requester identity metadata in the SMART request body unless a future version defines an explicit trust model. A Requester SHALL NOT use an unregistered or private extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support an extension selector kind SHALL NOT guess semantics or satisfy it from display text alone; it SHALL reject as unsupported or report `unsupported` according to Section 6.

### 5.5 Canonical `|version` handling

FHIR canonicals can append a version suffix using `canonical|version`. A Requester MAY include `|version` suffixes in fields where this section permits FHIR canonicals. A Requester SHOULD NOT include a `|version` suffix in `profilesFrom[]` unless it intends to identify a versioned profile family and expects the Wallet/Responder to understand that convention.

A Requester, Wallet/Responder, or Verifier that processes a FHIR canonical SHALL parse the canonical structurally into a non-empty `url` and optional `version`: `url` is the substring before the first `|` or the whole string when no `|` is present; `version`, when present, is the substring after the first `|`, and any further `|` characters are part of the opaque version string. Implementations SHALL preserve the original wire canonical string exactly for carrying, echoing, logging, response construction, test fixtures, returned `Resource.meta.profile` values, and generated `QuestionnaireResponse.questionnaire` values when that canonical is the Questionnaire identity being answered. Internal parsing SHALL NOT by itself rewrite the canonical carried or emitted.

A Wallet/Responder or Verifier resolving a canonical reference to a FHIR resource SHALL use a configured canonical resolver, package cache, terminology service, implementation-guide resolver, or FHIR search against a configured FHIR endpoint when available. The resolver SHALL consume `(url, version)` or `url` alone when no version is present. FHIR search semantics are `GET [base]/{ResourceType}?url={url}&version={version}` for versioned canonicals and `GET [base]/{ResourceType}?url={url}` for unversioned canonicals. The implementation SHALL select a single resource whose `(url, version)` matches the request and SHALL fail resolution if no such resource is present. Direct HTTP dereference of the parsed `url` is permitted only for unversioned canonicals, only when the recipient accepts the publisher's served version, and only if the returned resource passes verification. A Wallet/Responder or Verifier SHALL NOT satisfy a versioned canonical by stripping `|version` and directly dereferencing the bare URL.

After resolving a canonical to a FHIR resource, the implementation SHALL verify that the resolved resource has the expected `resourceType`, has `url` equal to the parsed request `url`, and, when the request was versioned, has `version` equal to the parsed request `version`. If any check fails, the implementation SHALL treat the affected request item or validation step as unsupported or error under Section 6.

When a `profiles[]` request value includes `|version`, a Wallet/Responder SHALL NOT report `fulfilled` for a resource unless the resource's `meta.profile` includes the same versioned canonical or the Wallet/Responder has equivalent local conformance evidence for that exact profile version. A Verifier performing exact conformance checks SHALL apply the same comparison. When a `profiles[]` request has no `|version`, a Wallet/Responder or Verifier MAY match resources known to conform to any supported version of the requested base canonical, subject to evidence and validation rules.

Wallet-side routing, broad classification, profile-family membership for `profilesFrom[]`, de-duplication, and Holder-display grouping MAY strip or ignore `|version` only for those local classification or grouping operations. Such stripping SHALL NOT affect resolution, exact-version profile matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation where exact version semantics matter. A Wallet/Responder SHALL NOT rewrite a requested canonical in a way that changes the semantic Questionnaire or profile being requested. A Wallet/Responder SHALL NOT strip a `|version` suffix from returned clinical content fields where the suffix communicates the profile or Questionnaire version actually used.

| Operation | Target | Handling of `|version` |
| --- | --- | --- |
| Parse, carry, sign, encrypt, compare transport bytes, log, fixture, echo, or preserve in response fields | Requester, Wallet/Responder, Verifier | Preserve the canonical string exactly, subject to privacy minimization. |
| Resolve a canonical Questionnaire or conformance resource | Wallet/Responder, Verifier | Parse `(url, version)`, use resolver or FHIR search, permit direct HTTP dereference only for unversioned canonicals, and verify `resourceType`, `url`, and requested `version`. |
| Wallet-side routing or broad classification | Wallet/Responder | Strip or ignore `|version` only for routing decisions. |
| `profilesFrom[]` membership | Wallet/Responder | Strip or ignore `|version` before profile-family lookup unless a future family definition is version-sensitive. |
| Exact unversioned `profiles[]` matching | Wallet/Responder, Verifier | Match supported versions of the requested base canonical with appropriate evidence. |
| Exact versioned `profiles[]` matching | Wallet/Responder, Verifier | Require exact-version evidence. |
| De-duplication or Holder-display grouping | Wallet/Responder | MAY group canonicals that differ only by `|version`, but preserve exact requested strings where exact version matters. |
| `QuestionnaireResponse.questionnaire` | Wallet/Responder | Preserve the request canonical, including `|version`, when known and used as the Questionnaire identity. |
| Returned FHIR `Resource.meta.profile` | Wallet/Responder | SHALL NOT remove `|version` suffixes merely because routing, family lookup, or grouping stripped versions. |
| Verifier exact conformance checks | Verifier | Compare at the same normalization level on both sides. |

### 5.6 Accepted media types

A Requester SHALL include a non-empty `accept[]` array on every request item, SHALL encode each value as a media type string, SHALL order it from most preferred to least preferred, and SHALL list only media types it is prepared to parse, validate, and route. A Wallet/Responder MAY return any Artifact media type listed in the fulfilled item's `accept[]`, subject to Holder decision, available data, capability, FHIR version support, policy, and source constraints. A Wallet/Responder SHOULD choose the earliest listed media type it can produce when multiple response forms are otherwise equivalent. A Wallet/Responder SHALL NOT return a media type for a request item unless that media type appears in that item's `accept[]`, except where a registered compatibility rule says the returned media type satisfies an accepted type. A Verifier SHALL enforce the same rule, independently for each fulfilled item.

Version 1.0 defines these core media types:

| Media type | Meaning |
| --- | --- |
| `application/fhir+json` | Requester can consume raw FHIR JSON. For questionnaire items this normally means a FHIR `QuestionnaireResponse`; for FHIR resource items this means a FHIR Resource or Bundle. A response Artifact declares `fhirVersion`. |
| `application/smart-health-card` | Requester can consume SMART Health Card file JSON. A response Artifact uses `value.verifiableCredential[]`; signed content carries its own FHIR-version semantics. |

Extension media types MAY be used when defined by a registered extension or deployment agreement. An extension media-type registrant SHALL define the media type string, Artifact shape, processing rules, validation rules, security considerations, privacy considerations, FHIR-version handling if any, and compatibility with core media types if any.

## 6. Clinical content - response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder answers a SMART request after Holder review, Wallet policy, and available Holder data sources have been applied. Presentation transports can wrap, encrypt, authenticate, retain, or relay a SMART response, but they do not change `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, or `requestStatus[]`.

### 6.1 `SmartHealthCheckinResponse`

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "request-123",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include `type`, `version`, `requestId`, `artifacts`, and `requestStatus`. It SHALL set `type` to exactly `"smart-health-checkin-response"` and `version` to exactly `"1"`. A Verifier SHALL reject a SMART response whose `type` or `version` is absent or not exact, unless a future compatibility rule applies to another version.

A Wallet/Responder SHALL set `requestId` to the exact `id` value from the SMART request being answered. A Verifier SHALL compare `requestId` to the original request `id` using exact string equality and SHALL reject a SMART response when the values differ. `requestId` is a clinical correlation value, not a patient identifier, requester identifier, session identifier, freshness proof, or clinical fact.

A Wallet/Responder SHALL encode `artifacts` as an array. It MAY be empty when no item produces a returned Artifact, provided `requestStatus[]` still accounts for every item. A Wallet/Responder SHALL encode each member according to Sections 6.2 and 6.3. Artifact order has no clinical fulfillment meaning unless a registered media type defines order-sensitive semantics inside its payload. A Wallet/Responder SHALL encode `requestStatus` as an array of status objects following Section 6.4; it is required even when every item is fulfilled.

### 6.2 Artifact common shape

```json
{
  "id": "artifact-1",
  "mediaType": "application/fhir+json",
  "fulfills": ["patient"],
  "fhirVersion": "4.0.1",
  "value": { "resourceType": "Patient" }
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` on every Artifact and SHALL include payload fields defined for the Artifact's media type. A Wallet/Responder SHALL include `id` as a non-empty string, scoped to one SMART response, and SHALL NOT reuse an Artifact `id` within a response. A Verifier SHALL reject missing, non-string, empty, or duplicate Artifact ids. A Requester or receiver SHALL NOT treat Artifact ids as patient identifiers, requester identifiers, global document identifiers, or clinical provenance identifiers unless separately established by payload or policy.

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string. Artifacts use `mediaType`; they do not use a separate Artifact-level protocol `type` discriminator. The version 1.0 core Artifact union is closed over `application/smart-health-card` and `application/fhir+json`. A version 1.0 Verifier SHALL NOT treat an unrecognized `mediaType` as a generic Artifact merely because it carries `value`, `url`, `data`, or another plausible carrier. Extension Artifact types SHALL be branded variants with pinned `mediaType` literals or bounded patterns and typed payload fields; the base protocol defines no generic carrier semantics.

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids on every Artifact. Each value SHALL exactly equal one item `id` in the original SMART request. A Wallet/Responder MAY list more than one item id when one Artifact satisfies multiple items. If the same Artifact fulfills multiple items, its `mediaType` SHALL be acceptable for every item listed. A Verifier SHALL reject a response if any `fulfills[]` value does not resolve to exactly one original request item.

For the two core media types, a Wallet/Responder SHALL use `value` as the payload field. A SMART Health Card Artifact SHALL use `value.verifiableCredential[]`. A raw FHIR JSON Artifact SHALL use `value` as the FHIR Resource or Bundle. A Verifier or receiver SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration rules from a field name alone.

### 6.3 Concrete Artifact shapes

A SMART Health Card Artifact represents one or more SMART Health Card Verifiable Credential JWS strings in the same JSON shape used by SMART Health Card file download. A Wallet/Responder that returns this Artifact SHALL set `mediaType` to `"application/smart-health-card"` and SHALL include `value` as a JSON object containing `verifiableCredential`. It SHALL encode `value.verifiableCredential` as a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS. A Verifier or receiver that consumes this Artifact SHALL verify and process each JWS according to SMART Health Cards and local trust policy.

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact. A Verifier SHALL reject such an Artifact if it carries an outer `fhirVersion`. FHIR content and FHIR version semantics for this class are inside signed credential payloads. A SMART Health Card Artifact SHALL NOT use an Artifact-level profile summary field to claim conformance to request selectors; a Verifier validates clinical suitability by inspecting signed payload content and applying request selectors and policy.

A raw FHIR JSON Artifact represents patient-mediated FHIR JSON content. It is not independently issuer-signed unless the payload itself contains proof, signature, Provenance, or other evidence. Successful presentation transport proves the transaction and transport binding for the selected flow; it does not by itself prove clinical provenance of unsigned raw FHIR JSON.

A Wallet/Responder that returns a raw FHIR JSON Artifact SHALL set `mediaType` to `"application/fhir+json"`, SHALL include `fhirVersion` as a non-empty FHIR release-version string, and SHALL include `value` as a FHIR JSON object. The `value` SHALL be either a single FHIR Resource JSON object with string `resourceType`, or a FHIR Bundle JSON object with `resourceType` equal to `"Bundle"` and `entry[]` resources when packaging multiple resources. A Wallet/Responder SHOULD use a Bundle when returning multiple FHIR resources in one Artifact and MAY return a single resource directly when the Artifact contains only that resource.

A Wallet/Responder SHALL interpret all FHIR resources in one `application/fhir+json` Artifact under the Artifact's `fhirVersion`. A Wallet/Responder SHALL NOT mix resources requiring different FHIR releases within one such Artifact. When responsive content uses different releases, the Wallet/Responder SHALL return separate `application/fhir+json` Artifacts, each with its own `fhirVersion`, or report the affected item as partial, unavailable, unsupported, or error. A Wallet/Responder SHOULD choose a `fhirVersion` advertised in request `fhirVersions[]` when it can produce responsive raw FHIR JSON in an advertised version. A Verifier SHALL reject a raw FHIR Artifact whose `fhirVersion` is absent or not a non-empty string. A Verifier SHOULD treat a raw FHIR Artifact whose `fhirVersion` is not acceptable for the original request or receiver as unsupported for ingestion.

Wallets/Responders SHALL preserve FHIR `meta.profile` strings in returned resources or `Bundle.entry[].resource.meta.profile` where known, including `|version` suffixes. Wallets/Responders SHALL NOT strip or normalize version suffixes from source `meta.profile` strings when constructing raw FHIR JSON. Verifiers and receivers SHOULD inspect the FHIR payload itself, especially `meta.profile`, rather than relying on a wrapper-level profile summary.

A Wallet/Responder MAY return an extension Artifact only when the Artifact `mediaType` is accepted by every request item listed in `fulfills[]`, subject to any registered compatibility rule, and when the Wallet/Responder can construct the Artifact according to a recognized extension definition. The extension Artifact SHALL include `id`, `mediaType`, `fulfills`, and typed payload fields required by that definition. An extension registrant SHALL define exact media type string or bounded pattern, branded variant name, required/optional typed payload fields, shape, encoding, dereferencing and integrity rules, FHIR-version handling if any, status behavior, validation rules, security, privacy, and compatibility. It SHALL NOT define an unbounded catch-all or rely on generic `value`, `url`, or `data` semantics, and SHALL NOT redefine core response fields. If an extension Artifact contains raw FHIR content, its definition SHALL state whether an outer `fhirVersion` is required and how it is validated; absent such a rule, a Verifier SHALL NOT assume `application/fhir+json` semantics.

### 6.4 Status reporting

```json
{
  "item": "patient",
  "status": "fulfilled",
  "message": "Shared patient demographics."
}
```

A Wallet/Responder SHALL include exactly one status entry for every item in the original SMART request. It SHALL set each `requestStatus[].item` to the exact `id` of one request item. It SHALL NOT include duplicate status entries for the same request item and SHALL NOT include a status entry for an unknown item id. A Verifier SHALL reject a response unless `requestStatus[]` covers every request item exactly once and contains no unknown item id. If the original request contains zero items, a conforming Wallet/Responder still SHALL include `requestStatus` as an array.

A Wallet/Responder SHALL set `requestStatus[].status` to one of these version 1.0 status codes unless a future registered status-code extension is explicitly supported by the receiving Verifier:

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without Holder refusal being the relevant cause. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, `questionnaireCanonical`/`questionnaire` combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use `unsupported`, not `unavailable`, when it cannot process an item because the selector kind, selector shape, requested media type, FHIR version, or Questionnaire definition is not supported. It SHALL use `unavailable`, not `unsupported`, when it understands the item but lacks matching shareable content. It SHOULD use `unsupported` for material `questionnaireCanonical`/`questionnaire` disagreement detected before answers are collected or response construction begins, and SHOULD use `error` for operational failure while rendering, collecting, converting, or constructing a response for a Questionnaire it otherwise understood. It SHALL use `declined` when Holder refusal is the relevant reason and MAY use `declined` when local Wallet policy implements Holder preferences. It SHALL use `partial` when it returns responsive content but does not claim complete satisfaction. It SHALL use `fulfilled` only when it believes the item is fully satisfied. It SHALL use `error` when a processing failure prevents normal outcome classification. A `fulfilled` or `partial` status SHOULD have at least one Artifact whose `fulfills[]` includes the item id unless a registered extension defines a non-Artifact fulfillment pattern. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless it explicitly supports a future registry entry.

A Wallet/Responder MAY include `message` as a string. A Wallet/Responder SHALL NOT include secrets, access tokens, internal stack traces, unnecessary patient details, or unrelated Holder data in `message`. A receiver MAY display, log, route, suppress, or localize `message`, but SHALL NOT rely on it to determine normative status semantics.

### 6.5 Many-to-many fulfillment and cross-validation

A Wallet/Responder MAY return one Artifact whose `fulfills[]` contains multiple item ids when the same clinical content satisfies multiple items. A Wallet/Responder MAY return multiple Artifacts whose `fulfills[]` contain the same item id when several pieces of content together satisfy or partially satisfy one item. For every fulfillment edge between an Artifact and an item, the Artifact `mediaType` SHALL be accepted by that item under Sections 5.6 and 6.6. Many-to-many fulfillment does not relax media-type, FHIR-version, selector, status, or validation rules. A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry for each item. A Verifier SHALL evaluate all Artifacts that list an item in `fulfills[]`; a receiver MAY choose which valid Artifacts to ingest or display according to workflow and policy, but SHALL NOT treat multiple Artifacts as a protocol error merely because there are multiple Artifacts.

A Verifier validates a SMART response against the original SMART request before returned content is consumed. Shape validation alone is not sufficient. A Verifier SHALL reject a SMART response unless `requestId` exactly equals original request `id`; if any Artifact `fulfills[]` value does not exactly match one original `items[].id`; if `fulfills[]` is absent, empty, not an array of strings, or contains an unresolved id; if any Artifact `mediaType` is not a core media type or explicitly supported registered/profiled extension; if a fulfilled item's `accept[]` does not include the Artifact `mediaType` absent a supported compatibility rule; or if `requestStatus[]` does not contain exactly one status object for every original item with no unknown or duplicate item values. A Verifier SHALL NOT infer that an item with no status entry is fulfilled merely because an Artifact references it.

For every `application/fhir+json` Artifact, a Verifier SHALL confirm `fhirVersion` is present as a non-empty string and `value` is a FHIR JSON object with string `resourceType`. If the original request included `fhirVersions[]`, the Verifier SHOULD verify each raw FHIR Artifact's `fhirVersion` is one of the requested versions unless policy or future compatibility permits another version. It SHALL interpret non-Bundle resources and Bundle entry resources under the Artifact's `fhirVersion`. It SHALL reject or quarantine a Bundle when it detects mixed FHIR release versions inside one Bundle. It SHALL reject an `application/smart-health-card` Artifact that carries an outer Artifact-level `fhirVersion`.

A Verifier SHOULD inspect returned FHIR `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related FHIR content when validating responsiveness to the original selector. Absence of `meta.profile` is not automatically a protocol error because matching can rely on equivalent local knowledge or trusted conformance evidence. However, a Wallet/Responder SHALL NOT report `fulfilled` for a versioned profile request unless the returned resource's `meta.profile` includes that exact versioned canonical or it has equivalent local evidence; a Verifier SHALL require the same exact-version evidence before accepting that fulfillment edge. A Verifier SHALL preserve returned `meta.profile` strings exactly and SHALL NOT strip a `|version` suffix to satisfy an exact-version request. For questionnaire items returning `application/fhir+json`, a Verifier SHOULD validate that returned content is a `QuestionnaireResponse` and that `QuestionnaireResponse.questionnaire`, when present, preserves the requested Questionnaire canonical and `|version` according to Section 5.5.

## 7. Trust framework

Trust information is supplied by presentation flow, returned Artifact payloads, deployment policy, or out-of-band trust decisions; it is not supplied by self-asserted requester identity fields in the clinical request body. The trust layers are origin trust, Reader/Verifier trust, issuer/device-attestation trust, clinical-source trust, and out-of-band deployment policy. A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator SHALL NOT treat one trust layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and assurance level.

Origin trust concerns caller context supplied by the Browser/User Agent or platform. A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body to substitute for origin trust. A Wallet/Responder SHALL NOT treat `purpose`, item text, selector values, unknown request members, extension members, or Artifact content as authenticated requester identity or authenticated origin. When the W3C Digital Credentials API or platform exposes authenticated web origin, a Wallet/Responder that uses origin trust SHALL use that platform-provided origin for origin display, origin policy, and Section 8 binding. It SHALL NOT derive authenticated origin from SMART request JSON, display text, callback-looking strings, logos, request ids, selector URLs, implementation-defined initiation metadata, or Artifact payloads. A Wallet/Responder that relies on privileged-caller or browser-trust evidence SHALL use evidence supplied by the platform through an authenticated channel and SHALL apply Wallet or deployment policy; it SHALL NOT derive privileged-caller trust from the SMART request body. If origin or privileged-caller context cannot be authenticated, the Wallet/Responder SHALL treat origin trust as absent and SHALL NOT infer requester identity or origin from the SMART request body. If it proceeds without authenticated origin, it SHALL NOT present unauthenticated origin or SMART request display context as verified identity.

Reader / Verifier trust is independent of origin trust and clinical-source provenance. In the same-device flow, reader authentication can be optional per-`DocRequest.readerAuth` as a `COSE_Sign1` signature over `ReaderAuthentication`. A Requester or Verifier SHALL NOT place reader identity, organization identity, legal-entity identifiers, certificates, trust-framework claims, or signatures inside the SMART request body as a substitute. A Verifier MAY include per-`DocRequest.readerAuth`. When it does, it SHALL construct it for the same presentation session and requested items using the Section 8 construction that binds the `SessionTranscript` and exact `ItemsRequest` bytes, and SHALL NOT reuse it across sessions, transcripts, or `ItemsRequest` bytes.

A Wallet/Responder that receives `readerAuth` and claims support for reader authentication SHALL verify the COSE signature, signed context, detached-payload binding, relevant request bytes, protected algorithm and key type, and associated certificate or public-key material according to Section 8 and trust-anchor policy. It SHALL treat cryptographically invalid, malformed, mismatched, unsupported, or policy-unacceptable `readerAuth` as failed reader authentication. It SHALL NOT treat mere presence of `readerAuth`, a certificate chain, common name, logo, or display string as successful reader authentication without signature verification and trust-policy evaluation. When `readerAuth` includes certificate material, policy SHALL define how certificate or chain evidence is evaluated before treating the reader as trusted and SHALL identify accepted trust anchors or registry sources when reader trust is required. A Wallet/Responder relying on reader certificates SHALL validate the reader signing key against certificate material and evaluate evidence against policy. `readerAuth` is optional in core 1.0 unless a deployment profile makes it mandatory. When absent, a Wallet/Responder SHALL treat reader authentication as absent and SHALL NOT report or display the Verifier as reader-authenticated. When present but invalid or unacceptable, it SHALL treat reader authentication as failed and distinguish absent from failed for policy purposes.

Issuer / device-attestation trust concerns the mdoc presentation container and is separate from origin trust, reader authentication, clinical-source provenance, patient matching, and downstream authorization. A Verifier SHALL apply Section 8 issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence, and SHALL then apply Section 6.6. A Verifier or deployment profile SHALL define the trust-anchor policy used to validate MSO issuer signatures when issuer trust is required. A Verifier relying on mdoc issuer evidence SHALL validate the MSO issuer signature, issuer certificate path or equivalent key evidence, digest bindings, document type, namespace, disclosed element identifiers, and validity constraints required by Section 8 and policy. It SHALL NOT treat a syntactically valid MSO, matching digest, valid signature against an included leaf certificate, or self-signed issuer certificate as production issuer trust unless evidence chains to or matches an accepted trust anchor. A Verifier SHALL verify device-key proof of possession for the same-device mdoc response before treating the presentation as device-bound, using the same presentation session and `SessionTranscript`. It SHALL NOT treat an extracted SMART response as transport-valid if device-key proof fails, device authentication is not bound to the expected session, or the disclosed response element does not match the issuer-signed digest.

A deployment profile MAY permit self-attested Wallet presentations only when it explicitly permits that model and defines the assurance level. A Verifier, Requester, or Wallet/Responder SHALL NOT label self-attested mdoc evidence as externally issuer-accredited or production issuer-trusted unless applicable issuer and trust-anchor policy supports that claim. A Wallet/Responder using self-attestation SHALL NOT claim through the SMART response wrapper or mdoc container that raw FHIR JSON Artifacts are issuer-signed clinical credentials. Self-attestation does not relax SMART request parsing, response validation, `requestId` matching, `fulfills[]` validation, `requestStatus[]` coverage, media-type checks, FHIR-version checks, or same-device validation.

Clinical-source trust concerns whether returned clinical content carries evidence about source, signature, and acceptability. A Verifier or receiver SHALL evaluate clinical-source trust according to Artifact `mediaType`, payload signatures or provenance, request selectors, FHIR evidence, SMART Health Card rules, extension-profile rules, and deployment policy. It SHALL NOT infer clinical-source provenance from successful transport presentation alone. Origin evidence, `readerAuth`, mdoc issuer evidence, and device proof do not by themselves establish FHIR profile conformance or exact-version clinical-source trust. For `application/smart-health-card`, a Verifier or receiver SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on signed clinical content or issuer claims. For `application/fhir+json`, a Verifier SHALL treat `fhirVersion` as release context, not a clinical-source signature or proof of correctness, and SHALL treat raw FHIR JSON as patient-mediated content unless accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof.

Identifiers are scoped protocol correlation values unless their defining payload, presentation binding, Artifact payload, or deployment policy gives them broader meaning. A Requester, Wallet/Responder, Verifier, deployment profile, or trust-framework operator SHALL preserve identifier scopes and SHALL NOT treat an identifier from one layer as an identifier, proof, or authorization for another unless this specification or an explicit deployment profile defines that binding. Request `id`, item ids, Artifact ids, origins, reader certificate subjects, issuer certificate subjects, serial numbers, key ids, mdoc docTypes, namespaces, element identifiers, `SessionTranscript` components, nonces, URL tokens, relay identifiers, response-routing identifiers, and completion identifiers have their respective scopes. A Wallet/Responder, Verifier, or Requester SHALL NOT use presentation or initiation identifiers to replace SMART request `id`, request item ids, Artifact ids, `fulfills[]` links, or `requestStatus[]` accounting.

A deployment profile or trust-framework operator adding trust requirements SHALL document constrained roles and trust layers; accepted anchors, registries, allow-lists, certificate policies, issuer policies, source-provenance mechanisms, or assurance labels; freshness, revocation, expiration, replay, or status-check expectations; Wallet/Responder behavior when evidence is missing, invalid, expired, revoked, unsupported, ambiguous, inconsistent, or outside policy; Verifier/Requester/receiver behavior when presentation succeeds but downstream policy is not satisfied; and how Holder-facing display distinguishes authenticated identity, authenticated origin, authenticated reader information, unauthenticated request text, and local policy warnings. It SHALL state mandatory trust layers and assurance levels/restrictions when operation is permitted with absent or failed trust layers. It SHALL NOT redefine clinical semantics, but MAY require stricter validation, narrower media types, stronger provenance, stronger anchors, or rejection of otherwise optional modes. Implementation-defined in-person initiation, relay, or completion components SHALL preserve these trust boundaries and SHALL NOT redefine SMART request or response clinical semantics.

## 8. Same-device presentation flow over `org-iso-mdoc`

This section defines the base SMART Health Check-in 1.0 same-device presentation flow. A Verifier carries the Section 5 SMART request through W3C Digital Credentials API direct `org-iso-mdoc`, and the Wallet/Responder returns the Section 6 SMART response inside an mdoc `DeviceResponse` encrypted for the Verifier. This same-device direct `org-iso-mdoc` flow is the only normative SMART Health Check-in 1.0 presentation flow. In-person initiation mechanisms MAY be used as implementation-defined ways to load a same-device Verifier page that runs this section; their URL formats, relay behavior, storage, and completion handling are outside this specification.

### 8.1 Identifiers and constants

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested and disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

A Verifier SHALL use `org-iso-mdoc` as the Digital Credentials API protocol id, SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`, and SHALL carry the SMART request only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic element names, implementation-defined initiation wrapper fields, archived claim-name experiments, or other locations as version 1.0 request carriers. A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`.

### 8.2 Verifier-side request construction

A Verifier begins with a SMART request conforming to Section 5. It SHALL serialize the SMART request as UTF-8 JSON text and place the resulting string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. The value is a CBOR text string containing JSON serialization. It is not a CBOR map representation of the SMART request and not a base64url-encoded JSON string. This specification does not define canonical JSON serialization for clinical objects, although fixtures can preserve exact JSON text.

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

The boolean is the mdoc `intentToRetain` value. A Verifier SHALL default it to `true` for `smart_health_checkin_response` because ordinary clinical check-in workflows commonly ingest or route returned Artifacts. A Verifier MAY set it to `false` only when it truly intends ephemeral use and applicable deployment policy permits that signal. The flag does not override Holder choice, Wallet policy, law, privacy requirements, or downstream retention policy. A Verifier SHALL NOT model FHIR profiles, request items, questionnaires, Artifact media types, status codes, or individual clinical resources as separate mdoc elements in the core flow.

A Verifier SHALL CBOR-encode `ItemsRequest` and wrap those bytes in CBOR tag 24 before placing it in `DocRequest.itemsRequest`:

```text
ItemsRequestBytes = tag24(CBOR(ItemsRequest))
```

The exact tag-24 value is security-relevant when `readerAuth` is present and for byte-level fixtures.

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

Version 1.0 uses per-`DocRequest.readerAuth` when reader authentication is present. A Verifier SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core mechanism unless a future version or deployment profile explicitly defines that variant.

`readerAuth` is optional in core 1.0 unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as a detached `COSE_Sign1` using ES256 (`alg` `-7`) over:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The `readerAuth` protected header SHALL include `{1: -7}`. The serialized `COSE_Sign1` payload field SHALL be `null`. The COSE signature input SHALL be the `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as detached payload. For this core profile, `readerAuth` SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate. A Verifier that includes `readerAuth` SHALL compute it for the exact `SessionTranscript` and exact `ItemsRequestBytes` used in the presentation request and SHALL NOT reuse it across sessions, origins, encryption information, SMART request serializations, or requested element sets.

For each presentation request, a Verifier SHALL generate or select an HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256). A Verifier SHOULD use a fresh recipient key pair for each presentation session. A deployment profile permitting recipient-key reuse SHALL define replay, correlation, retention, and key-compromise handling. The public key in `encryptionInfo` SHALL be a COSE_Key for EC2 P-256 including at least:

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

A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy; active version 1.0 fixtures use 32 bytes. A conformance-vector or deployment profile can impose a tighter nonce-size rule. The Verifier SHALL retain the matching HPKE private key and exact `encryptionInfo` CBOR bytes until processing completes or the session is abandoned.

A Verifier SHALL base64url-encode CBOR `DeviceRequest` bytes and CBOR `encryptionInfo` bytes without padding and invoke the Digital Credentials API with a request equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "base64url-without-padding-CBOR-DeviceRequest",
    "encryptionInfo": "base64url-without-padding-CBOR-encryptionInfo"
  }
}
```

A Verifier SHALL preserve the exact `encryptionInfo` base64url string because Section 8.3 binds that string, not a re-encoded equivalent, into the `SessionTranscript`.

### 8.3 `SessionTranscript` and origin binding

Both sides SHALL compute the same direct `dcapi` `SessionTranscript` bytes. Let `encryptionInfoBase64Url` be the exact unpadded base64url string in the request's `data.encryptionInfo`. Let `origin` be the authenticated origin value, or deployment-defined privileged-caller origin-equivalent, supplied by the Browser/User Agent or platform. The construction is:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The SHA-256 input is the exact CBOR serialization of `[encryptionInfoBase64Url, origin]`. The `SessionTranscript` bytes are the exact CBOR serialization of `[null, null, handover]`. A Wallet/Responder SHALL obtain `origin` from an authenticated Browser/User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It SHALL NOT derive `origin` from SMART request JSON, `purpose`, item `title`, item `summary`, selector URLs, request ids, implementation-defined initiation metadata, callback-looking strings, or Artifact contents. A Verifier SHALL use the same origin value that the platform/requester context uses for invocation when constructing `readerAuth`, HPKE `info`, and expected device authentication inputs. A Wallet/Responder SHALL use the same `SessionTranscript` bytes for optional `readerAuth` verification, `DeviceAuthentication`, and HPKE response encryption. A Verifier SHALL use the same bytes for HPKE opening and device-signature verification.

If authenticated origin or deployment-approved privileged-caller context is unavailable, the Wallet/Responder SHALL treat origin trust as absent under Section 7. If it cannot construct the required `SessionTranscript`, it SHALL fail the presentation or proceed only under an explicit deployment profile defining serialized origin-equivalent input, assurance level, Holder display, and Verifier validation behavior. It SHALL NOT silently substitute a self-asserted SMART request field as origin.

### 8.4 Wallet-side request handling

A Wallet/Responder receiving a candidate direct `org-iso-mdoc` request SHALL validate the presentation request before constructing a SMART response. It SHALL confirm protocol `org-iso-mdoc`; base64url-decode `data.deviceRequest` without padding and parse CBOR `DeviceRequest`; confirm `DeviceRequest.version` is `"1.0"`; locate a `DocRequest.itemsRequest` that is CBOR tag 24 around CBOR `ItemsRequest` bytes; preserve exact tag-24 `ItemsRequestBytes` for `readerAuth`; decode `ItemsRequest`; confirm exact `docType`, namespace, and requested stable element; recover `intentToRetain`; recover `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a string; parse it as UTF-8 JSON and validate it under Section 5; base64url-decode and parse `data.encryptionInfo`, require the direct `"dcapi"` envelope, and validate P-256 COSE_Key material; and recompute the `SessionTranscript` using the exact `encryptionInfo` base64url string and authenticated origin or approved origin-equivalent context.

If SMART request JSON is absent, not a string, unparsable, not a JSON object, or invalid under Section 5, the Wallet/Responder SHALL reject the presentation request, report failure through the selected platform mechanism, or otherwise fail safely. It SHALL NOT infer clinical request semantics from mdoc element names, display strings, archived dynamic-element encodings, unknown request fields, or implementation-defined initiation wrappers.

If `readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, it SHALL verify the detached `COSE_Sign1`, protected algorithm, `ReaderAuthenticationBytes`, `SessionTranscript`, exact tag-24 `ItemsRequestBytes`, signature, `x5chain` evidence, and deployment policy. It SHALL distinguish at least absent `readerAuth`; syntactically invalid `readerAuth`; cryptographically failed `readerAuth`; cryptographically valid but untrusted or policy-unacceptable `readerAuth`; and trusted `readerAuth`.

After request and trust processing, the Wallet/Responder SHALL run Holder review or equivalent Holder-control processing at request-item granularity. It SHALL preserve item `id` values for response accounting. It MAY group, summarize, reorder, or suppress display details for accessibility, safety, localization, policy, and law, but SHALL NOT treat `required: true` as consent and SHALL NOT present SMART request display fields as authenticated requester identity. Unsupported selectors, unavailable data, Holder refusal, partial sharing, and processing errors are clinical response outcomes when the request was otherwise valid enough to answer and are reported through Section 6 status rules when a SMART response is constructed.

### 8.5 Wallet-side response construction

A Wallet/Responder that proceeds SHALL construct a SMART response according to Section 6. The response `requestId` SHALL exactly equal the accepted request `id`. It SHALL serialize the SMART response as UTF-8 JSON text; this specification does not define canonical JSON serialization for the response object.

The Wallet/Responder SHALL create an `IssuerSignedItem` for namespace `org.smarthealthit.checkin` with logical contents:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": JSON.stringify(SmartHealthCheckinResponse)
}
```

It SHALL CBOR-encode the `IssuerSignedItem`, wrap those bytes in CBOR tag 24, and place that tagged item in `issuerSigned.nameSpaces["org.smarthealthit.checkin"]`. It SHALL compute the MSO value digest over the complete tag-24-wrapped `IssuerSignedItem` bytes. `IssuerSignedItem.digestID` SHALL match the corresponding key in `MSO.valueDigests["org.smarthealthit.checkin"]`.

The Wallet/Responder SHALL construct a Mobile Security Object whose `docType` is `org.smarthealthit.checkin.1`, whose `digestAlgorithm` is `SHA-256`, whose `valueDigests` cover the disclosed stable item, and whose `deviceKeyInfo.deviceKey` identifies the device public key used for device authentication. It SHALL sign the MSO as `issuerAuth` using `COSE_Sign1` with ES256 (`alg` `-7`). The `issuerAuth.payload` SHALL be the tag-24-wrapped MSO bytes unless Appendix C or an ISO-compatible profile defines equivalent encoding. Deployment policy decides whether issuer evidence is production issuer-trusted, registry-trusted, pinned, self-attested, test-only, or otherwise acceptable; demo or self-attested evidence does not relax structural mdoc validation, digest validation, device authentication, SMART response validation, or Section 6.6.

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same presentation session using the Section 8.3 `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element is issuer-signed; it is not moved into `DeviceNameSpaces` as a substitute. The Wallet/Responder SHALL produce a device `COSE_Sign1` signature using ES256 (`alg` `-7`) and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`, with `DeviceAuthenticationBytes` as payload according to mdoc device-authentication rules.

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

Additional mdoc, certificate, validity, or device fields are presentation evidence; they do not change the SMART response model.

### 8.6 HPKE encryption and DC API response

The Wallet/Responder SHALL encrypt the CBOR `DeviceResponse` plaintext to the recipient public key from `encryptionInfo` using HPKE base mode with:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

The HPKE `enc` value is the encapsulated ephemeral P-256 public key for the KEM. Active fixtures encode it as the 65-byte uncompressed P-256 point. The `cipherText` value is the HPKE AEAD ciphertext including its authentication tag. The Wallet/Responder SHALL wrap HPKE output in the direct DC API response CBOR value:

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
    "response": "base64url-without-padding-CBOR-dcapiResponse"
  }
}
```

The Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, or a response encrypted with another HPKE suite for this core version 1.0 flow.

### 8.7 Verifier-side processing

A Verifier receiving a Digital Credentials API result SHALL process it before passing clinical content to the Requester or downstream receiver. It SHALL require returned `protocol` equal `org-iso-mdoc`; require `data.response` be an unpadded base64url string; base64url-decode and parse CBOR `dcapiResponse`; require direct shape `["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`; reconstruct the expected `SessionTranscript` from original `encryptionInfo` base64url string and request origin; HPKE-open using retained recipient private key, corresponding recipient public key, received `enc`, required HPKE suite, `info = SessionTranscript bytes`, and empty `aad`; reject if HPKE opening fails; parse plaintext CBOR `DeviceResponse`; require version `"1.0"` and success status for the accepted document; locate document `docType` `org.smarthealthit.checkin.1`; verify `issuerAuth` as ES256 `COSE_Sign1`, decode and validate MSO, verify MSO `docType`, validity information, device key, issuer signature, and issuer evidence under Section 7 and policy; locate the disclosed issuer-signed stable element; recompute value digest over exact tag-24 `IssuerSignedItem` bytes and compare to `MSO.valueDigests["org.smarthealthit.checkin"][digestID]`; verify device `COSE_Sign1` using `MSO.deviceKeyInfo.deviceKey` over `DeviceAuthentication` constructed with expected transcript, docType, and tag-24 `DeviceNameSpaces`; require stable element `elementValue` be a string; parse it as JSON and validate as a `SmartHealthCheckinResponse`; and apply all Section 6.6 cross-validation rules against the original SMART request.

A Verifier SHALL reject or quarantine the presentation response if HPKE opening fails, mdoc issuer/MSO validation fails, value-digest validation fails, device authentication fails, the stable response element is absent or malformed, SMART response JSON validation fails, or Section 6.6 cross-validation fails. It SHALL keep trust decisions distinct: HPKE success, origin binding, reader authentication, issuer/MSO validation, device-key proof, syntactic SMART response validity, and SMART Health Card verification are separate checks.

### 8.8 Required validation summary

A Verifier implementing same-device `org-iso-mdoc` SHALL validate at least: original SMART request valid under Section 5 and retained; request construction used protocol `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, tag-24 `ItemsRequest`, exact docType, namespace, element, and requestInfo key; `encryptionInfo` has direct `"dcapi"` shape with fresh nonce and P-256 recipient public key; expected `SessionTranscript` derives from exact `encryptionInfoBase64Url` and origin; required `readerAuth`, if any, is present, valid, bound to the same transcript and exact tag-24 `ItemsRequest`, and trusted under policy; response wrapper is direct `dcapiResponse`; HPKE opening succeeds with the required suite, `info`, and empty `aad`; `DeviceResponse` version/status/document are correct; `issuerAuth`, MSO, digest, device proof, stable element, SMART response, Section 6.6 checks, and Section 7 trust interpretation all pass.

A Wallet/Responder implementing same-device flow SHALL validate request wrapper, `DeviceRequest`, tag-24 `ItemsRequest`, requestInfo SMART request, `encryptionInfo`, and transcript; classify or verify `readerAuth`; perform Holder review or equivalent Wallet policy at item granularity; construct a Section 6 SMART response with `requestId` equal to request `id`; place that response as the issuer-signed stable element; construct MSO, `issuerAuth`, `DeviceAuthentication`, device signature, `DeviceResponse`, HPKE encryption, and outer DC API response according to Sections 8.5 and 8.6.

A deployment profile that constrains this flow SHOULD define additional requirements for authenticated origin, privileged-browser allow-lists, mandatory `readerAuth`, reader certificate path validation, revocation or status checking, issuer trust anchors, self-attested issuer labeling, nonce length, replay handling, fixture requirements, size limits, duplicate document/element handling, Holder display, logging, telemetry, and downstream clinical-source acceptance.

## 9. Cross-cutting requirements

### 9.1 Security and privacy

Security claims are layered and follow the Core Trust Rule. SMART Health Check-in 1.0 does not standardize pointer URL formats, request-envelope protocols, relay/storage protocols, response-submission protocols, or cross-device cryptographic wrappers.

In the Section 8 presentation flow, a Verifier MUST NOT accept plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a substituted HPKE suite, or a response whose HPKE context is not bound to the expected transcript. A Wallet/Responder or Verifier SHALL NOT downgrade active version 1.0 ciphertexts to plaintext transport, substitute a different encryption context, or treat successful decryption as sufficient clinical validation. Implementations SHALL keep Section 8 HPKE keys, recipients, transcript inputs, algorithm identifiers, ciphertext fields, plaintexts, and validation results separate from deployment-local transport, storage, diagnostic, or handoff mechanisms.

Freshness is supplied by presentation-session mechanisms rather than SMART request or response identifiers. For Section 8, freshness comes from fresh unpredictable `encryptionInfo.nonce` bytes, retained HPKE recipient key material, exact `encryptionInfo` base64url string, authenticated origin or approved origin-equivalent, resulting `SessionTranscript`, optional `readerAuth` bound to transcript and exact tag-24 `ItemsRequest`, and device authentication bound to the same transcript. A Verifier SHOULD use a fresh HPKE recipient key pair for each session. Requesters and Verifiers should maintain state sufficient to reject stale, duplicate, mismatched, or superseded SMART responses.

Origin evidence comes from authenticated platform channels, not SMART request JSON, launch URLs, display text, selector URLs, logos, common names, unknown members, or Artifact contents. Wallet/Responder UIs SHOULD distinguish authenticated origin, privileged-caller evidence, trusted reader information, issuer/device evidence, and policy warnings from unauthenticated SMART request display text. Scanning a QR code, tapping NFC, opening a familiar page, or clicking a page button is not Holder consent.

Reader authentication is optional in core 1.0 unless required by deployment profile. When present, it is per-`DocRequest.readerAuth`, not `DeviceRequest` version `"1.1"` `readerAuthAll`, and is a detached `COSE_Sign1` using ES256 / `-7` over tag-24 `ReaderAuthentication`, with payload `null`, empty external AAD, exact `SessionTranscript`, exact tag-24 `ItemsRequest`, and COSE label `33` (`x5chain`) containing at least the leaf certificate. A Wallet/Responder SHALL verify all required bytes, algorithms, key/certificate evidence, and policy before treating the reader as authenticated and SHALL distinguish absent, malformed, failed, valid-untrusted, and trusted states.

A Verifier SHALL complete Section 8 mdoc validation and Section 7 issuer/device trust policy before claiming production issuer trust. Mdoc evidence, HPKE opening, origin binding, `readerAuth`, exact request-id match, or Holder approval does not by itself prove production issuer accreditation, patient matching, clinical correctness, clinical-source provenance, downstream authorization, or EHR write-back permission. Raw `application/fhir+json` Artifacts are patient-mediated unless separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present and accepted.

Version 1.0 fixes active algorithms in profile rules. Implementations SHALL reject unsupported or unexpected algorithm labels rather than downgrading, ignoring labels, substituting library defaults, accepting deployment-supplied alternatives, or treating locally available algorithms as implicitly valid. Implementations should fail closed on unknown versions, malformed base64url, unexpected mdoc structures, unexpected carriers, dynamic element names, or inline same-device request encodings unless a future version or deployment profile defines compatible processing.

Implementations SHOULD minimize collection, display, and retention of plaintext SMART requests, SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, Section 8 `DeviceResponse` plaintext, `dcapiResponse` internals, HPKE `enc` or `cipherText`, `deviceRequest`, `encryptionInfo`, Wallet secrets, private keys, shared secrets, access tokens, bearer URLs, full launch URLs, full QR images, and valid-id enumeration clues except under controlled diagnostic or fixture procedures. Fixture, crash, debug, or support material containing live PHI, production private keys, bearer credentials, or unredacted clinical content is a security incident, not ordinary conformance material.

Wallet UX is a security and privacy control. A Wallet/Responder SHALL validate the incoming Section 8 request before disclosure, recover the SMART request only from the requestInfo key, compute the transcript from authenticated origin or approved origin-equivalent, classify reader authentication accurately, and perform Holder review or equivalent Holder-control processing at item granularity before disclosure unless an explicit deployment profile defines another mechanism and assurance level. It SHALL preserve item ids and construct `requestStatus[]` covering every original item exactly once. It SHOULD make requested content, accepted media types, broad selectors, and outcomes understandable to the Holder. It MAY group, summarize, reorder, or suppress details for accessibility, localization, safety, law, or policy, but SHALL NOT hide multiple items or broad selectors in a way that defeats meaningful Holder control. It needs to support meaningful refusal and partial sharing.

A Requester SHOULD construct each SMART request for the minimum content needed for the bounded check-in workflow. A Wallet/Responder SHOULD return only Artifacts satisfying approved items, Holder choices, Wallet policy, available data, and accepted media types. It should avoid unrelated resources, unrelated SMART Health Cards, unnecessary Questionnaire answers, diagnostics, access tokens, internal identifiers, or nonresponsive records. Selective disclosure in v1.0 occurs through item boundaries, Wallet policy, Holder decisions, Artifact construction, accepted media types, `fulfills[]`, and per-item status. The same-device binding carries one stable mdoc element whose value is the SMART response JSON; it does not model each profile, Questionnaire, item, resource, or Artifact as a separate mdoc element.

Identifiers and metadata are scoped by layer. Requesters, Verifiers, Wallets/Responders, receivers, and deployment profiles SHOULD avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and should not embed patient account numbers, MRNs, insurance member ids, phone numbers, email addresses, appointment ids, staff ids, clinic ids, source document ids, or predictable sequence numbers in SMART request ids, item ids, Artifact ids, telemetry ids, or log ids unless a deployment profile requires and protects them. A Verifier SHOULD use fresh Section 8 HPKE recipient key material and fresh nonce values for each session.

The Section 8 `intentToRetain` value for `smart_health_checkin_response` defaults to `true`. It is a retention signal for Holder review and policy; it does not override Holder choice, Wallet policy, law, notices, legal holds, audit duties, EHR record management, or minimization. A Verifier MAY set it to `false` only for true ephemeral use when policy permits. Retention policies SHOULD account for metadata as well as plaintext. Implementations should assume both content and context can be sensitive and MAY apply stricter review, warnings, confirmation, redaction, suppression, refusal, or item-level non-fulfillment statuses for sensitive categories or broad requests. Receivers should not infer a missing Artifact or non-fulfilled status means the Holder has, lacks, refused, or concealed a particular condition, medication, coverage status, relationship, or answer.

Implementations SHOULD collect the minimum telemetry needed for reliability, security monitoring, abuse prevention, conformance testing, and support, and should prefer aggregate counts, coarse categories, sampling, redaction, scoped identifiers, and short retention. They SHOULD NOT send plaintext protocol payloads, clinical content, item-level Holder decisions, Section 8 plaintext or internals, keys, secrets, credentials, bearer URLs, full launch URLs, full QR images, or unredacted sensitive stack traces to routine telemetry except under controlled diagnostic, fixture, audit, or incident-response procedures with authorization and labeling.

### 9.2 Registries, IANA, and internationalization

The transport-neutral discriminators are `type: "smart-health-checkin-request"` and `type: "smart-health-checkin-response"` with `version: "1"`. They are protocol constants, not media types, mdoc identifiers, JOSE `typ` values, or profile identifiers. SMART Health Check-in compares clinical media type strings in `items[].accept[]` and `artifacts[].mediaType` by exact, case-sensitive string equality unless a future registered extension defines other processing.

| Media type | SMART Health Check-in 1.0 use | Registry posture |
| --- | --- | --- |
| `application/fhir+json` | Core Artifact media type for raw FHIR JSON Resources or Bundles, with `value` and outer `fhirVersion`. | Externally defined by FHIR; referenced, not redefined. |
| `application/smart-health-card` | Core Artifact media type for SMART Health Card file-style JSON with `value.verifiableCredential[]` and no outer `fhirVersion`. | Externally defined or governed by SMART Health Cards; referenced, not redefined. |

A future Artifact media-type registration SHALL define exact media type string, payload shape, payload fields, encoding, dereferencing and integrity rules if any, FHIR-version semantics if any, validation behavior, status-code interaction, security considerations, privacy considerations, and compatibility with existing media types. It SHALL NOT introduce a generic catch-all Artifact branch or redefine core request or response fields.

The version-1 same-device binding uses protocol id `org-iso-mdoc`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`. A Verifier claiming the version-1 direct mdoc profile SHALL use these values exactly. A Wallet/Responder claiming the profile SHALL disclose the SMART response as the `elementValue` of `smart_health_checkin_response` in namespace `org.smarthealthit.checkin` and SHALL NOT treat dynamic element names, archived claim-name experiments, individual FHIR profiles, request items, Artifact media types, Questionnaires, status codes, or local namespaces as alternate version-1 core carriers. External registration or publication may be needed for some deployments; this specification does not assert such registration is complete. Future incompatible mdoc-carrier changes SHOULD use a new profile identifier and, when necessary, a new `docType` suffix.

SMART Health Check-in maintains specification-controlled registries for `requestStatus[].status`, `items[].content.kind`, and profile identifiers. Version 1.0 status entries are `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`. Version 1.0 selector kinds are `selection.fhir` and `form.fhir`. Future registrations SHALL define exact syntax, lifecycle, semantics, processing rules, validation rules, unsupported-recipient behavior, security, privacy, and tests or examples, and SHALL NOT redefine core semantics, Holder control, canonical-version handling, trust boundaries, or required validation. Profile identifiers are not SMART request fields, SMART response fields, selectors, Artifact media types, status codes, request presets, IPS shortcuts, all-of-the-above shortcuts, topic labels, or substitutes for Section 5 selectors.

Registry changes use designated expert review unless governance or an external registry operator defines a stricter process. Designated expert review applies before treating new or changed status codes, selector kinds, extension Artifact media types, branded Artifact variants, media-type compatibility rules, profile identifiers, or future mdoc `docType`, namespace, element, or request-carrier changes as interoperable registrations. The expert SHOULD approve only registrations that preserve Sections 5-8 semantics, validation behavior, selector semantics, trust-layer separation, version-1 same-device identifiers unless explicitly future-profiled, HPKE transcript binding, unsupported-recipient safety, security/privacy treatment, no required plaintext intermediaries, and enough examples or conformance guidance. The expert SHOULD reject registrations that redefine fields or identifiers, create ambiguous synonyms, introduce requester identity or trust assertions into the SMART request body, turn profile identifiers into in-band selectors, rely on presets/local topics instead of selectors, require intermediaries to see plaintext clinical content, weaken Holder control or validation, conflate identifiers, treat demo material as production trust, or overclaim provenance for unsigned raw FHIR JSON.

Internationalization applies only to fields or UI strings intended for human display: request `purpose`, item `title`, item `summary`, `requestStatus[].message`, FHIR `Questionnaire` text, human-readable or display strings inside returned FHIR resources, implementation-generated prompts/warnings/errors, and extension fields identified as display text. Protocol identifiers and machine-processable values are not localized: request/response `type`, `version`, ids, status `item` and `status`, `content.kind`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, status codes, FHIR canonicals and resourceType values used for validation, mdoc identifiers, algorithm labels, HPKE/HKDF/COSE labels, and deployment-local launch identifiers or URLs.

SMART Health Check-in 1.0 does not define `lang`, `locale`, `Accept-Language`, per-string language maps, negotiated-locale members, or locale parameters in the SMART request, SMART response, or same-device binding. An implementation SHALL NOT rely on an unknown member, browser language value, launch URL parameter, or HTTP header as interoperable locale negotiation unless a future version, registered extension, or deployment profile defines that behavior. A Wallet/Responder MAY translate, summarize, group, reorder, or suppress display text for accessibility, localization, safety, or policy. If it does so, it SHALL preserve underlying protocol values used for construction and validation. A receiver SHALL NOT rely on localized message text to determine status semantics.

Producers of new display text SHOULD emit Unicode Normalization Form C (NFC). Consumers SHOULD be prepared for valid Unicode display strings that are not NFC. Normalization is not an identifier-matching rule. A Requester, Wallet/Responder, Verifier, or receiver SHALL NOT apply Unicode normalization, case folding, accent folding, width folding, confusable mapping, BIDI reordering, transliteration, translated aliases, or locale-sensitive collation to make distinct protocol identifiers or constants compare equal. Implementations MAY normalize copies of display text for local rendering/search/indexing/accessibility, but that SHALL NOT change bytes or code points used for signature verification, hashing, encryption, HPKE/HKDF inputs, COSE signing inputs, mdoc digest checks, SMART Health Card verification, FHIR canonical preservation, audit records, or byte-exact fixture comparisons. UIs rendering untrusted or externally supplied text SHOULD apply BIDI isolation so display text cannot spoof or obscure identifiers, origins, requester identity, reader identity, profile URLs, FHIR canonicals, mdoc identifiers, Artifact provenance, clinical-source trust, status codes, validation outcomes, Holder decisions, or consent controls. Locale metadata can be sensitive and SHOULD be minimized under privacy rules.

### 9.3 Reserved future binding and future work

OpenID4VP mapping is reserved and informative for SMART Health Check-in 1.0. No implementation is required to support OID4VP to claim conformance to the core request/response model or direct same-device `org-iso-mdoc` feature. An implementation SHALL NOT claim that an OID4VP experiment satisfies Section 8 conformance unless a future version or explicit profile defines that mapping. Future-work text does not add runtime requirements.

## Appendix A. Conformance checklist summary

This checklist is an index, not an independent source of requirements. Implementations and certification programs should map each row to the controlling body text.

| Area | Required validation focus |
| --- | --- |
| Conformance claims | Identify target roles, version, feature/profile, deployment profile, optional features, comparison mode, and fixture/demo trust status. |
| Request JSON | RFC 8259 object, UTF-8 when serialized, no comments/trailing commas/duplicate names/non-JSON numbers, required top-level constants and fields, no requester identity metadata. |
| Request items | Non-empty unique item ids, exact equality, Holder-facing title, advisory `required`, non-empty ordered `accept[]`, selector object with supported or registered `content.kind`. |
| `selection.fhir` | Exact `kind`, arrays for `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`; `profilesFrom[]` array of canonical profile-family URLs; additive profile semantics; official resource types; no form fields; no-selector default handled safely. |
| `form.fhir` | Exact `kind`; direct `questionnaireCanonical` and/or `questionnaire`; inline resource is FHIR `Questionnaire`; no selection fields; no silent merge or canonical rewrite on conflict. |
| Canonicals | Structured parse, exact preservation where required, resolver/search handling, no strip-and-direct-fetch for versioned canonicals, exact-version evidence for versioned profiles, returned `meta.profile` and `QuestionnaireResponse.questionnaire` preservation. |
| Response JSON | Required constants and fields, exact `requestId`, Artifact ids unique, `mediaType` not Artifact `type`, non-empty `fulfills[]`, no generic Artifact carrier. |
| Artifact media types | SMART Health Card has non-empty `value.verifiableCredential[]` and no outer `fhirVersion`; raw FHIR JSON has `fhirVersion`, Resource/Bundle `value`, no mixed FHIR releases; extensions are registered branded variants. |
| Status and fulfillment | `requestStatus[]` covers every item exactly once; only v1.0 status codes absent supported extension; status semantics applied; many-to-many fulfillment validates every edge. |
| Verifier response validation | Apply Section 6.6 against original request: requestId, fulfills, media-type acceptance, status coverage, FHIR/SHC checks, selector evidence. |
| Trust | Preserve layer separation; use authenticated origin/caller evidence; classify/verify optional readerAuth; verify mdoc issuer/digest/device proof; evaluate clinical-source provenance from Artifact evidence; preserve identifier scopes. |
| Same-device wire | Exact identifiers, requestInfo carrier, tag-24 `ItemsRequest`, `DeviceRequest.version` `"1.0"`, optional per-DocRequest readerAuth, direct `encryptionInfo`, exact transcript, stable issuer-signed element, MSO digest, device authentication, required HPKE suite, direct `dcapiResponse`. |
| Security/privacy | No plaintext or alternate HPKE acceptance, no trust pivots, no algorithm downgrade, item-level Holder control, minimal content and telemetry, retention signal handled as a signal only. |
| Registries/i18n | Exact identifiers and media/status/selector registries; no profile ids as request shortcuts; exact machine-value comparisons; no protocol-level locale negotiation; preserve values through translation. |

## Appendix B. JSON schemas

These JSON Schema snippets use JSON Schema 2020-12. If a schema rule appears to conflict with Sections 5 or 6, Sections 5 and 6 control. Successful schema validation is not complete protocol validation; Section B.3 lists required procedural checks.

### B.1 `SmartHealthCheckinRequest` schema

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

The request schema requires `items[]` but does not set `minItems: 1`, because Section 5.2 makes non-empty `items[]` a SHOULD. It cannot enforce duplicate object-member rejection, duplicate item ids, requester-identity metadata prohibition, official FHIR resource types, profile-family membership, additive semantics, or full FHIR/Questionnaire validation.

### B.2 `SmartHealthCheckinResponse` schema

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

The response schema cannot enforce `requestId` equality, `fulfills[]` reference resolution, exact `requestStatus[]` coverage, duplicate ids, duplicate object members, media-type acceptance by each fulfilled item, requester-identity prohibition, Bundle traversal, profile-family membership, additive selector semantics, QuestionnaireResponse comparison, mixed FHIR releases, SMART Health Card JWS validation, full FHIR profile validation, or transport/trust policy. A conforming implementation MUST NOT treat successful validation against Appendix B snippets as complete protocol validation.

## Appendix C. Same-device CDDL profile constraints and byte ladder

Appendix C provides profile constraints and pseudo-CDDL for the Section 8 same-device direct `org-iso-mdoc` flow. ISO/IEC 18013-5 and referenced COSE/HPKE specifications own base structures. If this appendix conflicts with Section 8, Section 8 controls.

```text
smart-protocol-id        = "org-iso-mdoc"
smart-doc-type           = "org.smarthealthit.checkin.1"
smart-namespace          = "org.smarthealthit.checkin"
smart-response-element   = "smart_health_checkin_response"
smart-request-info-key   = "org.smarthealthit.checkin.request"
dcapi-label              = "dcapi"
```

The W3C Digital Credentials API wrappers are JSON, not CBOR:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "base64url-without-padding-CBOR-DeviceRequest",
    "encryptionInfo": "base64url-without-padding-CBOR-encryptionInfo"
  }
}
```

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "base64url-without-padding-CBOR-dcapiResponse"
  }
}
```

`data.deviceRequest`, `data.encryptionInfo`, and `data.response` are strings carrying encoded CBOR bytes. Processors SHALL NOT interpret them as plaintext SMART request or response JSON. The exact unpadded `data.encryptionInfo` base64url string is a `SessionTranscript` input and SHALL NOT be replaced with a decoded-and-re-encoded spelling.

```text
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

reader-authentication-bytes = #6.24(bstr .cbor [
  "ReaderAuthentication",
  session-transcript-bytes,
  smart-items-request-bytes
])

cose-sign1-reader-auth = COSE_Sign1
```

A Verifier that includes `readerAuth` SHALL construct a detached `COSE_Sign1` with protected header `{1: -7}`, serialized payload `null`, empty external AAD, and `reader-authentication-bytes` as detached payload. It SHALL include reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate.

```text
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

dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])

KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)

smart-dcapi-response = [
  "dcapi",
  {
    "enc" => bstr,
    "cipherText" => bstr,
    * tstr => any
  }
]
```

`enc` is the DHKEM(P-256, HKDF-SHA256) encapsulated key. `cipherText` is the AEAD ciphertext including authentication tag. A Wallet/Responder SHALL NOT return plaintext, another carrier, non-empty HPKE AAD, or another HPKE suite for core v1.0.

```text
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

A Wallet/Responder SHALL carry the SMART response only as the `elementValue` of the issuer-signed `smart_health_checkin_response` item. It SHALL NOT carry it as requestInfo, plaintext DC API JSON, plaintext `dcapiResponse` content, or a device-signed namespace element in place of the issuer-signed item. The value-digest input is the complete tag-24-wrapped `IssuerSignedItem` bytes, not only the inner map, not only `elementValue`, and not diagnostic notation. Active Android fixtures use digestID `0` for the single stable element, but the core protocol requirement is consistency between disclosed item `digestID` and corresponding MSO `valueDigests` entry.

```text
MSO.docType = "org.smarthealthit.checkin.1"
MSO.digestAlgorithm = "SHA-256"
MSO.valueDigests["org.smarthealthit.checkin"][digestID] = SHA-256(tag24(CBOR(IssuerSignedItem)))
issuerAuth = COSE_Sign1 using ES256 (alg -7) over the MSO payload form required by Section 8

device-authentication-bytes = #6.24(bstr .cbor [
  "DeviceAuthentication",
  session-transcript-bytes,
  "org.smarthealthit.checkin.1",
  device-name-spaces-bytes
])
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The device `COSE_Sign1` SHALL use ES256 (`alg` `-7`) and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`; moving the SMART response into `DeviceNameSpaces` is not an equivalent response carrier. The empty HPKE AAD is the zero-length byte string, not CBOR `null`, an empty text string, or an implementation-defined omitted value.

The base byte ladder is: SMART request JSON; `ItemsRequest`; tag-24 `ItemsRequestBytes`; `DeviceRequest`; `encryptionInfo`; exact `encryptionInfoBase64Url`; DC API request; `dcapiInfo`, handover, and `SessionTranscript`; optional `ReaderAuthentication`; Wallet extraction and checks; SMART response JSON; `IssuerSignedItem`; tag-24 `IssuerSignedItem` and MSO value digest; MSO and `issuerAuth`; `DeviceAuthentication` and device signature; `DeviceResponse`; HPKE seal; `dcapiResponse`; Verifier opening, mdoc validation, stable-element extraction, Section 6 validation, and Section 6.6 cross-validation. Fixture roots and exact byte captures are companion material and must derive from Section 8 without introducing alternate carriers or clinical semantics.

## Appendix D. FHIR mapping guidance

This appendix summarizes how Sections 5 and 6 map to FHIR R4 idioms. It does not define a FHIR API, FHIR search language, mdoc behavior, initiation behavior, registry, schema rule, or downstream ingestion policy. If this appendix conflicts with Sections 5 or 6, Sections 5 and 6 control.

Version 1.0 uses FHIR R4 idioms for examples and base interpretation of FHIR canonicals, `StructureDefinition` profiles, `Questionnaire`, `QuestionnaireResponse`, `Bundle.entry[].resource`, and `Resource.meta.profile`. US Core, CARIN Digital Insurance Card, and similar guides are examples of profile sources, not mandatory implementation guides. SMART request/response `version` values are SMART model versions, not FHIR versions. Raw FHIR JSON Artifacts carry FHIR release information in Artifact-level `fhirVersion`; SMART Health Card Artifacts carry it inside each signed credential payload.

FHIR canonicals appear in `profiles[]`, `profilesFrom[]`, `form.fhir` selectors, returned `QuestionnaireResponse.questionnaire`, and returned `Resource.meta.profile`. Implementations preserve exact wire strings where Section 5.5 requires; parse canonicals into `(url, version?)` before resolution; resolve with configured canonical resolvers, package caches, or FHIR search; verify resolved `resourceType`, `url`, and requested `version`; use direct bare HTTP dereference only for unversioned canonicals; and compare at the same normalization level on both sides. A Wallet/Responder that cannot evaluate an exact-version claim can report the item using Section 6.4 rather than guessing. Resolution failure, post-resolution mismatch, or absence of exact-version evidence for a versioned request is not a license to substitute a different FHIR artifact.

`selection.fhir` requests existing patient-specific FHIR resources. It is not a FHIR search expression, FHIRPath expression, GraphDefinition, `$everything` operation, SMART App Launch scope, authorization policy, form-completion instruction, or instruction to contact a FHIR server. `profiles[]` contains exact `StructureDefinition` canonicals; returned resources can support a match through `meta.profile[]`, signed payload evidence, or trusted local evidence. `profilesFrom[]` is an array of profile-family canonicals; evaluation generally needs package metadata, ImplementationGuide content, configured family maps, or policy. `profiles[]` and `profilesFrom[]` are additive; `resourceTypes[]` is a separate official FHIR resource-type constraint. No-selector `selection.fhir` is intentionally broad and is not a command to export a complete patient record or a guarantee of comprehensiveness.

A raw FHIR JSON Artifact `value` is a single FHIR Resource or a FHIR Bundle with resources in `Bundle.entry[].resource`. For selector validation, a non-Bundle is evaluated as the single resource; a Bundle is evaluated by inspecting entry resources; an entry without `resource` does not provide resource content; and the outer Bundle's `resourceType: "Bundle"` does not by itself satisfy a request for Patient, Coverage, Observation, or another non-Bundle type. Bundle-level `meta.profile`, if present, may describe the Bundle profile and does not substitute for profile evidence on entry resources when non-Bundle resources were requested.

An `application/fhir+json` Artifact's outer `fhirVersion` applies to a single Resource Artifact or to the Bundle and all `Bundle.entry[].resource` resources in that Artifact. Wallets/Responders do not mix resources requiring different FHIR releases in one raw FHIR Artifact. When responsive content exists in multiple releases, they should use separate Artifacts or status-report the affected item. A Verifier detecting mixed-release requirements rejects or quarantines the Artifact. Request-level `fhirVersions[]` is a preference and capability signal for raw FHIR JSON and other formats with outer FHIR version declarations; it does not override version information inside SMART Health Cards. Extension media types carrying FHIR-derived content are not automatically `application/fhir+json`; their definitions must state typed fields, version declarations, resource locations, and selector matching.

Returned FHIR resources should preserve `meta.profile[]` values where known, including `|version` suffixes. Verifiers and receivers should inspect profile evidence in the FHIR payload itself. Absence of `meta.profile` is not automatically a protocol error because matching can rely on equivalent evidence. Contradictory profile evidence, missing evidence needed by local workflow, or full FHIR validation failure can lead a receiver to reject or quarantine content under policy without changing the SMART model.

For SMART Health Cards, `value.verifiableCredential[]` contains one or more JWS strings. The wrapper has no outer `fhirVersion`. A Verifier validates each JWS under SMART Health Cards and policy, then evaluates signed FHIR payload content against request selectors. `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, and no-selector concepts apply to signed payload resources and evidence. A SMART Health Card can be validly signed yet fail to satisfy a requested profile, resource type, Questionnaire, or local ingestion policy.

`form.fhir` asks the Wallet/Responder to collect or provide answers to a FHIR Questionnaire. The selector is flat with `kind: "form.fhir"` and sibling `questionnaireCanonical` and/or `questionnaire`; it does not use `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. For `application/fhir+json`, the expected returned FHIR resource is a `QuestionnaireResponse`, either directly or inside a Bundle. When `questionnaireCanonical` is supplied and is the identity being answered, a generated `QuestionnaireResponse.questionnaire` should preserve that canonical exactly, including `|version`. When only an inline Questionnaire is supplied, the Wallet/Responder should populate `QuestionnaireResponse.questionnaire` from the inline resource's canonical identity when known, usually `Questionnaire.url` plus `|Questionnaire.version` when both are present and intended as the canonical version. It should not invent a misleading canonical when none is known.

When both `questionnaireCanonical` and `questionnaire` are supplied, the canonical is the Requester's explicit identity and the inline resource is the body to render or use. The Wallet/Responder should check consistency between `questionnaireCanonical`, `questionnaire.url`, `questionnaire.version`, and material item structure; it should not silently merge conflicting definitions or rewrite the requested canonical. Material disagreement includes different base canonical URLs, different explicit versions, or conflicting item structure that would change Holder answers. A Verifier evaluating a questionnaire item returned as `application/fhir+json` should check that the Artifact media type is accepted; raw FHIR Artifact includes `fhirVersion`; returned content is a `QuestionnaireResponse` or Bundle containing it; `QuestionnaireResponse.questionnaire`, when present, preserves the requested canonical and `|version`; response links to the correct item through `fulfills[]` and status; and status is consistent with Section 6.4. This specification does not define universal Questionnaire rendering, answer validation, terminology validation, launch-context rules, Structured Data Capture behavior, or expression evaluation.
