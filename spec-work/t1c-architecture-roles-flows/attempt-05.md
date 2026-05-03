## 1.1 Abstract

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share clinical content for a bounded administrative or clinical workflow and receives a structured SMART response. The specification separates a transport-neutral clinical content model from the presentation transports that carry it: version 1.0 defines a base same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API, and an optional cross-device kiosk flow in which a kiosk or desktop creates a pointer for the Holder's phone, the Phone presenter resolves a signed and encrypted kiosk request that embeds the SMART request directly, re-enters the same-device presentation flow on the phone, and submits an encrypted result for the Completion display. The profile standardizes request items, FHIR-native selectors, accepted response media types, returned Artifacts, many-to-many fulfillment links, per-item status, role boundaries, and trust seams so multiple Requesters, EHRs, kiosk systems, and Wallet platforms can interoperate without private clinical topic vocabularies or kiosk-specific clinical protocols.

## 3.1 Two payload domains: clinical content vs. presentation transport

SMART Health Check-in is deliberately split into two payload domains.

The **clinical content domain** contains the SMART request and SMART response. It expresses what the Requester is asking the Holder to consider sharing, what the Wallet/Responder returns after Holder review, how Artifacts relate to request items, and how unavailable, declined, partial, unsupported, fulfilled, and error outcomes are reported.

The **presentation transport domain** contains the envelopes, APIs, cryptographic bindings, origin or reader context, relay behavior, and validation rules used to carry the clinical content model. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as the base same-device presentation flow. It also defines a cross-device kiosk flow as a wrapper around that base flow.

These domains are not interchangeable. A transport envelope can authenticate a Verifier, bind a response to a presentation session, encrypt data in flight, or support replay protection, but it does not redefine the clinical meaning of a request item, selector, Artifact media type, fulfillment link, or per-item status. Conversely, the SMART request and SMART response define clinical semantics but are not by themselves proof of origin, issuer trust, device possession, freshness, or delivery through a particular flow.

### 3.1.1 Clinical content domain

The clinical content model is the transport-neutral JSON model defined by the SMART request and SMART response.

A SMART request describes a bounded check-in need. It identifies the request, provides Holder-facing purpose and item text, lists request items, declares accepted response media types, and uses content selectors to describe acceptable clinical content. Selectors can use FHIR-native constructs where they fit, including exact profile canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource type names, Questionnaire references, inline Questionnaires, and registered extension selectors.

`profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either field can identify acceptable profile matches, subject to the rest of the item definition. They are not narrowing selectors relative to each other. Later §5 defines the precise selector rules, including how `resourceTypes[]` interacts with profile selectors.

A SMART response binds back to the SMART request, carries zero or more Artifacts, and reports per-item status. Artifacts declare a `mediaType` and identify the request item or items they fulfill. The model supports many-to-many fulfillment: one Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts. Per-item status remains explicit even when no Artifact is returned for an item.

The clinical content model does not include requester identity metadata in the SMART request body. Requester, Verifier, origin, reader authentication, and deployment trust information belong to presentation transport, trust processing, or local policy. A Wallet can use transport context and Holder-facing request text together when deciding what to display, but the clinical request body is not a requester identity credential, consent directive, or persistent authorization grant.

### 3.1.2 Presentation transport domain

The presentation transport domain carries and protects the clinical content model. In version 1.0, the base presentation transport is the same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API. In that flow, a Verifier invokes the Digital Credentials API on the same device as the Wallet, carries the SMART request in the mdoc request construction, and receives a SMART response in the mdoc presentation response.

The presentation transport domain is responsible for protocol mechanics such as request carriage, mdoc identifiers, SessionTranscript construction, origin binding, optional reader or Verifier authentication, HPKE encryption, device or issuer evidence, response opening, and validation. Later §§7–8 define these details for the same-device flow.

The cross-device kiosk flow adds wrapper payloads and relay mechanics around the same-device presentation flow. A kiosk request payload embeds the SMART request directly as `smartRequest`; it does not substitute a demo preset, preset name, SDK helper object, or secondary request wrapper. The phone obtains the embedded SMART request and then re-enters the same-device presentation flow locally. Later §9 defines kiosk signing, encryption, pointer transport, phone resolution, encrypted submission, and completion processing.

A future binding can define a different presentation transport, but it cannot change the clinical semantics of the SMART request or SMART response without defining a new version or extension of the clinical content model.

## 3.2 Two end-to-end flows

Version 1.0 standardizes two end-to-end flows:

1. the base **same-device presentation flow**; and
2. the optional **cross-device kiosk flow** that wraps and re-enters the same-device presentation flow on the phone.

The same-device presentation flow is the architectural base. The kiosk flow is not a fork of the clinical protocol and not an alternate clinical request language. It is a bridge for shared-screen, desktop, or kiosk settings where the Holder's Wallet is available on the Holder's phone rather than on the kiosk device.

### 3.2.1 Same-device presentation flow

In the same-device presentation flow, the Requester and Verifier are commonly components of the same portal, EHR, intake application, payer-facing workflow, or check-in application. The Requester constructs the SMART request. The Verifier carries it through direct `org-iso-mdoc` over the W3C Digital Credentials API. The Browser / User Agent mediates access to the Wallet. The Wallet/Responder renders the request for Holder review as appropriate, gathers or constructs responsive Artifacts from Holder data sources, builds a SMART response, and returns it through the same presentation session.

This flow is optimized for patient portal, pre-visit intake, and mobile-web experiences where the Holder begins on a device that can invoke the Wallet directly. It avoids a relay service and provides the clearest binding among web origin, presentation request, Holder review, Wallet response, and Verifier-side validation.

The same-device flow is the normative base for version 1.0. Later §8 defines the concrete `org-iso-mdoc` identifiers, request carriage, response carriage, cryptographic details, and validation checklist.

### 3.2.2 Cross-device kiosk flow as wrapper/re-entry

The cross-device kiosk flow supports settings where the Holder begins on a kiosk, tablet, staff desktop, or other shared device, but the Wallet is available on the Holder's phone. The kiosk side creates a wrapper around a SMART request and displays or otherwise conveys a Pointer URL, commonly as a QR code. The phone resolves the pointer, obtains and validates a kiosk request payload, extracts the embedded `smartRequest`, and then re-enters the same-device presentation flow on the phone.

After the Wallet/Responder returns the SMART response to the phone-side same-device flow, the Phone presenter submits an encrypted result for the Completion display. The Submission service and pointer transport are untrusted for plaintext clinical content. They may store, forward, or notify about opaque request and response state, but they are not the clinical Requester merely because they relay data.

The kiosk flow has three architectural invariants:

1. the kiosk payload embeds the SMART request directly as `smartRequest`;
2. the phone re-enters the same-device presentation flow for that embedded SMART request; and
3. the kiosk wrapper does not change SMART request or SMART response semantics.

Later §9 defines the kiosk wrapper artifacts and processing rules. Later §§11–12 define the security and privacy treatment for QR substitution, relay observation, replay, pairing confusion, metadata leakage, and retention.

## 3.3 Roles and component contracts, protocol-level only

This section describes protocol roles. A single product can implement several roles, and a role can be split across web, native, server, and operational components. These role descriptions are protocol contracts, not product architecture mandates.

### 3.3.1 Requester / Verifier

The **Requester** is the relying party that asks the Holder, through a Wallet, to share clinical content. The Requester constructs the SMART request and consumes the SMART response for a bounded workflow.

The **Verifier** is the presentation-transport role. It constructs the presentation request, invokes the same-device presentation flow, receives the presentation response, validates transport artifacts, extracts the SMART response, and applies clinical response validation.

In many deployments, the same EHR, portal, intake, payer, or check-in application acts as both Requester and Verifier. The distinction matters because requester intent and clinical selectors belong to the SMART request, while origin context, reader authentication, mdoc processing, encryption, and presentation validation belong to the Verifier and transport flow.

### 3.3.2 Browser / User Agent

The **Browser / User Agent** exposes the W3C Digital Credentials API surface to the Verifier page and mediates invocation of a Wallet or credential provider. The same-device flow relies on user-agent behavior for presentation invocation and origin context as defined by W3C Digital Credentials API and by later protocol sections.

This specification does not turn the Browser / User Agent into a clinical Requester, clinical Responder, or issuer of clinical content. Browser behavior is relevant where it affects origin binding, routing to a Wallet, API inputs and outputs, and user-mediated invocation.

### 3.3.3 Wallet / Responder

The **Wallet** is software controlled by or acting for the Holder. The Wallet receives the request through the selected presentation flow, interprets the SMART request, renders requested items for Holder review when appropriate, applies Wallet policy and Holder decisions, gathers or constructs responsive Artifacts from Holder data sources, and returns a SMART response.

The Wallet normally acts as the **Responder** in the clinical content model. It is responsible for response construction, including request binding, Artifact media types, fulfillment links, and per-item status. The Wallet can use local credentials, SMART Health Cards, cached FHIR resources, connected services, issuer-provided credentials, or other Holder data sources. This protocol abstracts those sources and does not define issuance, synchronization, account recovery, background refresh, or longitudinal storage.

### 3.3.4 Holder data source

A **Holder data source** is a Wallet-internal or deployment-specific source of clinical data available to a Wallet for response construction. It may be a signed credential, a raw FHIR resource, a SMART Health Card, a cached data set, a connected service, or another source under the Wallet's control or reachable by it.

The protocol does not require a Requester or Verifier to know which Holder data source the Wallet used. Instead, the SMART response declares the returned Artifact media type and any Artifact-specific evidence. A raw FHIR JSON Artifact is patient-mediated clinical content unless it carries separate provenance or signature evidence; successful transport presentation does not by itself make unsigned clinical content equivalent to issuer-signed credentials.

### 3.3.5 Kiosk creator

The **Kiosk creator** is the kiosk-side, desktop, or server-side component that creates the SMART request, embeds it directly as `smartRequest` in the kiosk request payload, signs the payload, arranges request-envelope encryption, and produces a pointer for the phone.

The Kiosk creator is not defining a new clinical request language. It is packaging a SMART request for cross-device delivery and later completion. Demo presets, preset names, SDK helper objects, and request-wrapper shortcuts can exist in development tools or user interfaces, but they are not protocol payloads in place of the embedded SMART request.

### 3.3.6 Submission service

The **Submission service** is an untrusted relay or provider that stores, forwards, or makes available encrypted kiosk request and response blobs, rows, pointers, or notifications. It can help a phone locate a kiosk request and help a Completion display learn that an encrypted result is available.

The Submission service is not trusted with plaintext clinical content, not assumed to be the Requester, and not relied on for clinical semantics. Later §9 constrains the wrapper artifacts it relays, and later §§11–12 address replay, metadata, retention, abuse, and privacy considerations.

### 3.3.7 Phone presenter

The **Phone presenter** is the patient-phone component in the cross-device kiosk flow. It resolves the Pointer URL, obtains and validates the kiosk request, verifies that the pointer and decrypted payload identify the same request, extracts the embedded SMART request, and invokes or participates in the same-device presentation flow on the phone.

After the Wallet/Responder produces the SMART response through the phone-local same-device flow, the Phone presenter encrypts or submits the result according to the kiosk wrapper rules so the Completion display can finish the kiosk session. The Phone presenter is the point where the cross-device kiosk flow deliberately re-enters the base same-device presentation flow.

### 3.3.8 Completion display

The **Completion display** is the kiosk-side or desktop component that receives notification of an encrypted submission, decrypts and validates the returned SMART response as authorized for the kiosk session, and presents completion state to staff, to the Holder, or to another local workflow.

The Completion display's protocol responsibility is completion processing, not downstream EHR write-back or clinical reconciliation. Local systems can import, route, reconcile, persist, or act on the SMART response after successful protocol validation, but those downstream actions are outside this specification.

## 3.4 Sequence diagrams in Markdown/text form

The diagrams in this section are explanatory. Later normative sections define exact message formats, cryptographic constructions, validation rules, and conformance targets.

### 3.4.1 Same-device presentation flow

```text
Requester/Verifier        Browser / User Agent        Wallet/Responder        Holder
        |                           |                         |                  |
        | Construct SMART request   |                         |                  |
        |-------------------------->|                         |                  |
        | Invoke DC API with direct |                         |                  |
        | org-iso-mdoc request      |                         |                  |
        |-------------------------->| Route/mediate request   |                  |
        |                           |------------------------>| Display request  |
        |                           |                         |----------------->|
        |                           |                         | Holder reviews   |
        |                           |                         |<-----------------|
        |                           |                         | Build SMART      |
        |                           |                         | response         |
        |                           | Return mdoc/DC API      |                  |
        |<--------------------------| presentation response   |                  |
        | Open transport response,  |                         |                  |
        | validate, extract SMART   |                         |                  |
        | response, consume result  |                         |                  |
```

Key points:

- the SMART request is constructed once by the Requester and carried by the Verifier;
- the Browser / User Agent mediates the Digital Credentials API invocation;
- the Wallet/Responder constructs the SMART response after Holder review and Wallet policy; and
- Verifier-side processing validates both transport artifacts and clinical response shape before local consumption.

### 3.4.2 Cross-device kiosk flow

```text
Kiosk creator      Submission service      Phone presenter      Browser/UA      Wallet/Responder      Completion display
      |                     |                     |                 |                |                         |
      | Create SMART        |                     |                 |                |                         |
      | request             |                     |                 |                |                         |
      | Embed as            |                     |                 |                |                         |
      | smartRequest in     |                     |                 |                |                         |
      | signed/encrypted    |                     |                 |                |                         |
      | kiosk payload       |                     |                 |                |                         |
      |-------------------->| Store opaque        |                 |                |                         |
      | Pointer URL / QR    | request state       |                 |                |                         |
      |--------------------- visible to Holder ---|                 |                |                         |
      |                     |                     | Resolve pointer |                |                         |
      |                     |<--------------------|                 |                |                         |
      |                     | Return encrypted    |                 |                |                         |
      |                     | kiosk request       |                 |                |                         |
      |                     |-------------------->| Validate wrapper, extract smartRequest       |
      |                     |                     | Re-enter same-device presentation flow       |
      |                     |                     |---------------->| Route request   |                         |
      |                     |                     |                 |--------------->| Holder review / SMART   |
      |                     |                     |                 |<---------------| response construction   |
      |                     |                     |<----------------| Presentation response    |
      |                     |                     | Encrypt/submit  |                |                         |
      |                     |<--------------------| result          |                |                         |
      |                     | Notify / make       |                 |                |                         |
      |                     | encrypted result    |                 |                |                         |
      |                     | available           |                 |                |                         |
      |<--------------------------------------------------------------- retrieve/decrypt/validate --------|
      |                                                                                                  |
      |                                                                                  Show completion |
```

Key points:

- the Submission service sees opaque state and is not trusted with plaintext clinical content;
- the kiosk payload contains the SMART request directly as `smartRequest`;
- the Phone presenter validates the kiosk wrapper before using the embedded SMART request; and
- the clinical presentation on the phone is the same-device presentation flow, not a kiosk-specific clinical exchange.

## 3.5 Trust boundaries

SMART Health Check-in separates trust boundaries so deployments can compose policy without confusing one kind of assurance for another.

The main trust boundaries are:

- **Holder boundary**: the Holder controls disclosure decisions. A request item marked important or required for a workflow does not remove Holder control.
- **Clinical content boundary**: the SMART request and SMART response carry clinical semantics, but their JSON fields are not proof of real-world identity, requester identity, issuer authority, or clinical correctness.
- **Origin and user-agent boundary**: the Browser / User Agent can provide origin context and mediate Wallet invocation, but browser-origin trust is not the same as clinical-source trust.
- **Reader / Verifier boundary**: optional reader or Verifier authentication can establish properties of the requesting application or organization, but it does not by itself prove the provenance of returned clinical content.
- **Issuer and device boundary**: mdoc issuer evidence and device key proof can establish properties of the presentation container, issuer, or device-controlled key, but they do not automatically turn unsigned raw clinical content into issuer-signed clinical credentials.
- **Holder data source boundary**: Wallets can use multiple Holder data sources. Requesters validate returned Artifacts and their evidence rather than assuming a particular source architecture.
- **Kiosk relay boundary**: the Submission service and pointer transport are untrusted for plaintext clinical content. Kiosk wrapper signing, encryption, pointer binding, expiration, replay controls, and metadata minimization are required topics for later §9 and §11.
- **Downstream workflow boundary**: successful receipt of a SMART response is not EHR write-back, patient matching, legal authorization, payment adjudication, or clinical acceptance. Those are deployment responsibilities outside this protocol.

Later §7 defines the trust framework in more detail. Later §8 applies it to direct `org-iso-mdoc`; later §9 applies it to kiosk wrapper artifacts; later §§11–12 provide security and privacy considerations.

## 3.6 Design principles and normative pointers

This section records design principles that guide the normative sections. The principles are architectural pointers; the later sections named here contain the enforceable conformance rules.

### 3.6.1 Keep the clinical content model transport-neutral

The SMART request and SMART response should retain the same clinical meaning wherever they are carried. Later §§5–6 define the clinical content model. Later §§8–9 define presentation and wrapper carriage without redefining request item semantics, selector semantics, Artifact media types, fulfillment, or status reporting.

### 3.6.2 Use the same-device flow as the base flow

Version 1.0 should treat direct `org-iso-mdoc` over the W3C Digital Credentials API as the base presentation flow. Later §8 should define one concrete, testable same-device binding with stable identifiers, byte-level constructions, and validation rules.

### 3.6.3 Treat kiosk as wrapper and re-entry, not a second clinical protocol

The cross-device kiosk flow should wrap the base flow for desktop and shared-device contexts. Later §9 should preserve three invariants: the kiosk payload embeds the SMART request directly as `smartRequest`; the phone re-enters the same-device presentation flow for that SMART request; and the kiosk wrapper does not change the clinical request or response model.

### 3.6.4 Use one docType, one namespace, and one stable element for the base mdoc binding

The same-device presentation flow should have a small, stable mdoc surface. Later §8.1 should define the protocol id `org-iso-mdoc`, the mdoc `docType`, namespace, stable response element, and request carrier. Later §13 should register or catalog those identifiers as appropriate.

### 3.6.5 Keep requester identity out of the SMART request body

The SMART request body should carry clinical request semantics and Holder-facing context, not requester identity metadata. Origin, reader authentication, Verifier trust, and deployment policy belong to the presentation and trust layers. Later §5 should prohibit requester identity metadata in the clinical request body, and later §7 should define how requester and Verifier trust are evaluated.

### 3.6.6 Use FHIR canonicals where they fit, without inventing local topic vocabularies

Requesters should use FHIR-native identifiers when asking for FHIR-shaped data. Later §5 should define exact profile canonicals in `profiles[]`, profile-family URLs in `profilesFrom[]`, official resource type names in `resourceTypes[]`, Questionnaire references, and extension selector registration. `profiles[]` and `profilesFrom[]` should remain additive profile selectors, and `profilesFrom[]` should remain an array of canonical profile-family URLs.

### 3.6.7 Express response forms as media types

Request items should declare response forms in `accept[]` using media types rather than protocol-specific artifact type names. Later §§5–6 should define accepted media type handling and require Artifacts to declare their `mediaType`. Later §13 should define extension and registry treatment for additional media types.

### 3.6.8 Make responses Artifact-centered with explicit per-item status

The SMART response should make returned content and item accounting independently checkable. Later §6 should define Artifact common shape, fulfillment links, per-item `requestStatus[]`, many-to-many fulfillment, and Verifier-side cross-validation. A Holder decline, unavailable item, unsupported selector, partial response, or error should be representable without treating the whole session as a protocol failure.

### 3.6.9 Require explicit FHIR version information for raw FHIR JSON

Raw FHIR JSON can be useful for check-in, but its version and provenance must not be guessed. Later §6 should require explicit `fhirVersion` handling for `application/fhir+json` Artifacts and should avoid treating unsigned raw FHIR JSON as equivalent to issuer-signed clinical credentials unless separate provenance or signature evidence is present.

### 3.6.10 Preserve Holder control and privacy by design

The protocol should support per-item Holder review, data minimization, clear request purpose, selective disclosure where available, explicit declined or unavailable outcomes, and privacy-aware logging and retention. Later §§5–6 define the clinical mechanisms; later §§11–12 define security and privacy requirements and guidance.

### 3.6.11 Use crypto agility through profiles and registries, not ad hoc in-band negotiation

Cryptographic suites, mdoc identifiers, wrapper algorithms, status codes, selector kinds, and media types should be defined by the applicable profile and registries rather than by unconstrained in-band negotiation. Later §§4, 8, 9, and 13 should define versioning, conformance classes, identifiers, and registry rules.

### 3.6.12 Keep implementation architecture out of protocol requirements

The protocol should define interoperable artifacts and role responsibilities, not prescribe product internals. Wallet storage, Holder data source architecture, EHR ingestion, staff workflow, SDK packaging, and platform-specific routing belong to implementation guidance or deployment policy unless a detail affects interoperable wire artifacts or validation.

## Organizer notes

### Strengths

- Centers the architecture on the three-layer framing accepted in T1.B: clinical content model, same-device presentation flow, and cross-device kiosk flow.
- Makes the kiosk invariant explicit: direct `smartRequest` embedding, no demo preset/request wrapper, and phone-side re-entry into the same-device flow.
- Separates Requester from Verifier and clinical semantics from transport trust, which should make §§5–9 easier to draft without cross-layer leakage.
- Provides text sequence diagrams that are readable in pure Markdown and highlight the re-entry point for the kiosk flow.
- Preserves `profilesFrom[]` array shape and limits additivity claims to `profiles[]` plus `profilesFrom[]`.

### Caveats

- This section intentionally avoids exact BCP 14 obligations except as pointers; later normative sections need to turn the principles into conformance rules.
- The same-device diagram is conceptual and does not show byte-level `org-iso-mdoc`, SessionTranscript, HPKE, or mdoc structures; §8 must provide those details.
- The kiosk diagram is conceptual and compresses signing, envelope encryption, pointer binding, submission encryption, and completion validation; §9 must define the exact artifacts and checks.
- “Default-to-retention” from the outline is not adopted as an architectural principle here because it can be misread as a privacy default; retention behavior should be reconciled in §§5, 8, and 12 when `intentToRetain` and operational retention are defined.

### Downstream dependencies

- §5 should define the SMART request, prohibited requester identity metadata, selector rules, `profilesFrom[]` arrays, profile-selector additivity, `resourceTypes[]` interaction, and accepted media type semantics.
- §6 should define SMART response binding, Artifact shape, media type rules, per-item status coverage, many-to-many fulfillment, raw FHIR JSON `fhirVersion`, and validation rules.
- §7 should separate origin trust, reader/Verifier trust, issuer/device trust, clinical-source provenance, and deployment policy.
- §8 should define the concrete direct `org-iso-mdoc` same-device flow and preserve it as the normative base flow.
- §9 should define the cross-device kiosk wrapper while preserving direct `smartRequest` embedding and phone-side re-entry into §8.
- §§11–12 should expand the trust-boundary summary into security and privacy requirements, especially for QR substitution, untrusted relay behavior, replay, metadata leakage, Holder consent, retention, and telemetry.
