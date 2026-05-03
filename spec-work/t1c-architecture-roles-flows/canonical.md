## 1.1 Abstract

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receives a structured SMART response. The specification separates the transport-neutral clinical content model from presentation transport: the SMART request describes requested items, Holder-facing context, selectors, and accepted response media types, while the SMART response returns Artifacts, fulfillment links, and per-item status. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as the base same-device presentation flow, and defines an optional cross-device kiosk flow in which a Kiosk creator provides a pointer, the Phone presenter resolves a signed and encrypted kiosk request that embeds the SMART request directly as `smartRequest`, re-enters the same-device presentation flow on the phone, and submits an encrypted result for the Completion display.

## 3. Architectural overview

SMART Health Check-in is intentionally layered. The clinical content model defines what is requested and what is returned. The same-device presentation flow defines the base version 1.0 carriage and validation path between a Verifier and a Wallet on one device. The cross-device kiosk flow wraps that base flow for kiosk, desktop, and shared-device settings; it moves initiation and completion across devices without creating a second clinical request language.

This section is informative architecture text with normative pointers. Later sections define conformance targets, field rules, cryptographic constructions, validation steps, security requirements, privacy requirements, registries, and examples.

### 3.1 Two payload domains: clinical content vs. presentation transport

SMART Health Check-in distinguishes two payload domains:

1. the **clinical content domain**, consisting of the SMART request and SMART response JSON objects; and
2. the **presentation transport domain**, consisting of the envelopes, APIs, cryptographic bindings, origin or reader context, relay behavior, and validation artifacts that carry or protect those JSON objects.

These domains are related but not interchangeable. Clinical-content rules determine what was requested, what was returned, which request items were fulfilled, which media types were used, and what per-item outcomes were reported. Presentation-transport rules determine how the request and response are conveyed, bound to a session, encrypted, authenticated, or relayed.

A transport can add origin context, Verifier or reader information, signatures, encryption, freshness, device evidence, routing identifiers, and relay metadata. It does not change the clinical meaning of request items, selectors, accepted media types, Artifact fulfillment, or per-item status. Conversely, a syntactically valid SMART response is not sufficient by itself; the Verifier still applies the transport, trust, and response-validation rules for the selected flow.

#### 3.1.1 Clinical content domain

The clinical content domain is the transport-neutral clinical content model defined by the SMART request and SMART response in §§5–6.

A SMART request expresses a bounded check-in need. It identifies the request, provides Holder-facing purpose and item text, lists request items, declares accepted response media types, and uses content selectors to describe acceptable clinical content. Selectors can use FHIR-native constructs where they fit, including exact profile canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource type names, Questionnaire references, inline Questionnaires, and registered extension selectors.

`profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either field can identify acceptable profile matches, subject to the rest of the item definition. They are not narrowing selectors relative to each other. Later §5 defines the precise selector rules, including how `resourceTypes[]` interacts with profile selectors.

A SMART response is the Wallet/Responder's clinical answer to a SMART request. It binds back to the request, carries zero or more Artifacts, declares Artifact media types, links Artifacts to request items they fulfill, and reports status for each request item. The model supports many-to-many fulfillment: one Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts. Per-item status remains explicit even when no Artifact is returned for an item.

The clinical content model does not include requester identity metadata in the SMART request body. Requester, Verifier, origin, reader authentication, session freshness, issuer evidence, device evidence, and deployment trust information belong to presentation transport, trust processing, or local policy. Holder-facing purpose and item text help explain the request, but the SMART request body is not a requester identity credential, a consent directive, a persistent authorization grant, or a transport transcript.

The same SMART request has the same clinical meaning whether it is carried by the same-device presentation flow, embedded as `smartRequest` in the cross-device kiosk flow, or carried by a future binding. Likewise, the SMART response remains the same clinical response object even when wrapped in mdoc, encrypted for kiosk submission, or processed by a local response consumer.

#### 3.1.2 Presentation transport domain

The presentation transport domain carries and protects the clinical content model.

For version 1.0, the base presentation transport is the same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API. In that flow, the Verifier invokes the Digital Credentials API from a page or application context on the same device as the Wallet. The SMART request is carried by the mdoc request construction, and the SMART response is returned by the mdoc presentation response. Later §8 defines the exact `org-iso-mdoc` identifiers, mdoc document type, namespace, stable response element, request carrier, response carrier, SessionTranscript construction, encryption, and Verifier validation steps.

The cross-device kiosk flow adds wrapper payloads and relay mechanics around the same clinical request and the same same-device presentation flow. A Kiosk creator prepares a signed and encrypted kiosk request payload whose `smartRequest` member embeds the SMART request directly. A Pointer URL, commonly displayed as a QR code, lets a Phone presenter locate the encrypted kiosk request. After resolving and validating the pointer and kiosk payload, the phone re-enters the same-device presentation flow locally for the embedded SMART request. The resulting SMART response is submitted in encrypted form for the Completion display. Demo presets, preset names, SDK helper objects, and request-wrapper shortcuts are not protocol payloads in place of the embedded SMART request.

Presentation-transport objects can introduce their own identifiers, nonces, expiration values, signatures, encryption keys, origin information, relay locations, and completion states. Those fields support routing and security for a flow; they are not substitutes for SMART request identifiers, request item identifiers, Artifact identifiers, fulfillment links, or per-item status.

### 3.2 Two end-to-end flows

Version 1.0 standardizes two end-to-end flows:

1. the base **same-device presentation flow**; and
2. the optional **cross-device kiosk flow** that wraps and re-enters the same-device presentation flow on the phone.

The flows differ in routing and trust boundaries, not in clinical request or response semantics.

#### 3.2.1 Same-device presentation flow

In the same-device presentation flow, the Holder is using a device that can both access the Requester's page and invoke the Wallet. The Requester and Verifier are often components of the same portal, EHR, payer workflow, intake application, scheduling application, or check-in application, but the roles remain distinct: the Requester creates and consumes the clinical content, while the Verifier invokes and validates the presentation transport.

At a high level:

1. The Requester determines the bounded check-in need and constructs a SMART request.
2. The Verifier packages the SMART request into the direct `org-iso-mdoc` W3C Digital Credentials API request defined in §8.
3. The Browser / User Agent mediates the request to an available Wallet.
4. The Wallet/Responder displays or otherwise processes the request for Holder review according to Wallet policy and applicable requirements.
5. The Wallet/Responder gathers or constructs responsive Artifacts from Holder data sources and creates a SMART response.
6. The Wallet/Responder returns the response through the same-device presentation transport.
7. The Verifier validates transport artifacts and validates the SMART response before the Requester consumes it.

This flow has no kiosk pointer, no Submission service, and no cross-device relay. It is the architectural baseline and base version 1.0 presentation flow.

#### 3.2.2 Cross-device kiosk flow as wrapper/re-entry

The cross-device kiosk flow supports settings where the Holder begins on a kiosk, staff desktop, shared tablet, or other device, but Holder review and Wallet presentation occur on the Holder's phone. The kiosk side creates a wrapper around a SMART request and displays or otherwise conveys a Pointer URL. The phone resolves the pointer, obtains and validates the kiosk request payload, extracts the embedded `smartRequest`, and then re-enters the same-device presentation flow on the phone.

At a high level:

1. The Kiosk creator constructs the SMART request for the check-in session.
2. The Kiosk creator embeds that SMART request directly as `smartRequest` in the signed kiosk request payload. It does not embed a demo preset, preset name, SDK helper object, or request wrapper in place of the SMART request.
3. The Kiosk creator arranges request-envelope encryption and publishes or stores only protected kiosk request state through a Submission service or similar provider.
4. The kiosk displays or otherwise provides a Pointer URL, commonly as a QR code.
5. The Phone presenter obtains the Pointer URL, resolves it, retrieves the encrypted kiosk request, and validates the wrapper according to §9.
6. The Phone presenter obtains the embedded SMART request and re-enters the same-device presentation flow locally on the phone.
7. The Wallet/Responder returns a SMART response through the same-device flow on the phone.
8. The Phone presenter encrypts and submits the result for the Completion display through the Submission service.
9. The Completion display obtains the encrypted submission, decrypts and validates it, and presents completion state to the local workflow.

The kiosk flow is therefore a wrapper and re-entry pattern. Its protocol value is pairing, protection, relay tolerance, and completion coordination. Its clinical content is still the embedded SMART request and the resulting SMART response.

The Submission service and pointer transport are untrusted for plaintext clinical content. They can store, forward, or notify about opaque request and response state, but they are not the clinical Requester merely because they relay bytes.

### 3.3 Roles and component contracts, protocol-level only

This specification defines protocol roles, not product architectures. One product can perform several roles, and one role can be split across deployed components, provided the protocol responsibilities for each role are met. Product user interfaces, local databases, EHR ingestion pipelines, staff workflows, Wallet storage models, and platform-specific APIs are outside these role contracts unless a later normative section defines a protocol-visible effect.

#### 3.3.1 Requester / Verifier

The **Requester** asks the Holder, through a Wallet, to share clinical content for a bounded workflow and consumes the SMART response. The Requester constructs the SMART request according to §5, including request items, Holder-facing context, selectors, and accepted response media types that accurately reflect what the Requester's systems can process.

The **Verifier** is the presentation-transport role. It constructs a presentation request, invokes the same-device presentation flow, receives and opens the presentation response, validates transport artifacts, extracts the SMART response, and applies clinical response validation before passing results to the Requester or downstream systems.

In many deployments, the same EHR, portal, payer, intake, or check-in application acts as both Requester and Verifier. Keeping the names separate prevents confusion between clinical-request semantics and presentation-session proof. Requester or Verifier identity, origin, reader authentication, certificates, and trust policy belong to the presentation transport and trust layers, not to self-asserted fields in the SMART request body.

#### 3.3.2 Browser / User Agent

The **Browser / User Agent** exposes the W3C Digital Credentials API surface to the Verifier page and mediates invocation of a Wallet or credential provider. The same-device flow relies on user-agent behavior for presentation invocation and origin context as defined by W3C Digital Credentials API and by later protocol sections.

This specification does not define a general browser conformance class beyond those assumptions. The Browser / User Agent is part of the presentation transport domain; it does not interpret clinical selectors, decide which Artifacts fulfill request items, rewrite the SMART request or SMART response, or become a clinical Requester or Responder.

#### 3.3.3 Wallet / Responder

The **Wallet** is software controlled by or acting for the Holder. In this specification, the Wallet normally acts as the **Responder**. It receives a SMART request through the selected presentation flow, renders requested items for Holder review when appropriate, applies Wallet policy and Holder decisions, obtains or constructs responsive content from Holder data sources, creates a SMART response, and returns it through the selected presentation transport.

The Wallet/Responder is responsible for preserving the clinical semantics of the request and response. It is not required by this architecture to be a longitudinal health-record store, a credential issuer, a FHIR server, or an EHR. It can use local credentials, SMART Health Cards, cached FHIR resources, connected services, issuer-provided credentials, or other Holder data sources. Issuance, synchronization, refresh, backup, account recovery, indexing, and permanent storage are outside this protocol unless a later section defines a narrow validation consequence for returned Artifacts.

#### 3.3.4 Holder data source

A **Holder data source** is a Wallet-internal or deployment-specific source of clinical data available to a Wallet for response construction. It can be a locally stored credential, SMART Health Card, cached FHIR resource, connected service, issuer-provided document, or another source available to the Wallet.

The protocol abstracts over Holder data sources. The clinical content model constrains the shape and accounting of the response; it does not dictate where the Wallet obtained the content or guarantee that the content is complete, current, clinically correct, or signed by a clinical source. A raw FHIR JSON Artifact remains patient-mediated clinical content unless it carries separate provenance or signature evidence; successful transport presentation does not by itself make unsigned clinical content equivalent to issuer-signed credentials.

#### 3.3.5 Kiosk creator

The **Kiosk creator** starts a cross-device kiosk flow. Its protocol contract is to create the SMART request, embed it directly as `smartRequest` in the kiosk request payload, sign the payload, arrange request-envelope encryption, and produce a Pointer URL for the Phone presenter.

The Kiosk creator packages a SMART request for cross-device delivery and completion; it does not define a kiosk-specific clinical request language. Demo presets, preset names, SDK helper objects, and request-wrapper shortcuts can exist in development tools or user interfaces, but they are not protocol payloads in place of the embedded SMART request.

#### 3.3.6 Submission service

The **Submission service** is an untrusted relay or provider that stores, forwards, or makes available encrypted kiosk request and response blobs, rows, pointers, notifications, or completion records. It can help a phone locate a kiosk request and help a Completion display learn that an encrypted result is available.

The Submission service is not trusted with plaintext clinical content, not assumed to be the Requester, and not relied on for clinical semantics. Later §9 constrains the wrapper artifacts it relays, and later §§11–12 address replay, metadata, retention, abuse, and privacy considerations.

#### 3.3.7 Phone presenter

The **Phone presenter** is the patient-phone component in the cross-device kiosk flow. It resolves the Pointer URL, obtains and validates the kiosk request, verifies that the pointer and decrypted payload identify the same request as defined in §9, extracts the embedded SMART request, and invokes or participates in the same-device presentation flow on the phone.

After the Wallet/Responder produces the SMART response through the phone-local same-device flow, the Phone presenter encrypts or submits the result according to the kiosk wrapper rules so the Completion display can finish the kiosk session. The Phone presenter is the point where the cross-device kiosk flow deliberately re-enters the base same-device presentation flow; it is not a second Wallet and not a replacement for Holder review.

#### 3.3.8 Completion display

The **Completion display** is the kiosk-side or desktop component that receives notification of an encrypted submission, obtains and decrypts the result as authorized for the kiosk session, validates the returned SMART response and wrapper bindings, and presents completion state to staff, to the Holder, or to another local workflow.

The Completion display's protocol responsibility is completion processing, not downstream EHR write-back or clinical reconciliation. Local systems can import, route, reconcile, persist, or act on the SMART response after successful protocol validation, but those downstream actions are outside this specification.

### 3.4 Sequence diagrams in Markdown/text form

The diagrams in this section are explanatory. They show role relationships and payload-domain boundaries. Later normative sections define exact message formats, cryptographic constructions, validation rules, and conformance targets.

#### 3.4.1 Same-device presentation flow

```text
Requester/Verifier        Browser / User Agent        Wallet/Responder        Holder
        |                           |                         |                  |
        | Construct SMART request   |                         |                  |
        | Package as direct         |                         |                  |
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

- The SMART request is constructed once by the Requester and carried by the Verifier.
- The Browser / User Agent mediates the Digital Credentials API invocation.
- The Wallet/Responder constructs the SMART response after Holder review and Wallet policy.
- Verifier-side processing validates both transport artifacts and clinical response shape before local consumption.

#### 3.4.2 Cross-device kiosk flow

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
      |                     |<--------------------------------------------------------- retrieve ---|
      |                     | encrypted result    |                 |                | decrypt/validate/show   |
```

Key points:

- The Submission service sees opaque state and is not trusted with plaintext clinical content.
- The kiosk payload contains the SMART request directly as `smartRequest`.
- The Phone presenter validates the kiosk wrapper before using the embedded SMART request.
- The clinical presentation on the phone is the same-device presentation flow, not a kiosk-specific clinical exchange.

### 3.5 Trust boundaries

SMART Health Check-in separates trust boundaries so deployments can compose policy without confusing one kind of assurance for another.

The main trust boundaries are:

- **Holder boundary**: the Holder controls disclosure decisions. A request item marked important or required for a workflow does not remove Holder control.
- **Clinical content boundary**: the SMART request and SMART response carry clinical semantics, but their JSON fields are not proof of real-world identity, requester identity, issuer authority, delivery through a particular transport, or clinical correctness.
- **Origin and user-agent boundary**: the Browser / User Agent can provide origin context and mediate Wallet invocation, but browser-origin trust is not the same as clinical-source trust.
- **Reader / Verifier boundary**: reader or Verifier authentication, when present, can establish properties of the requesting application or organization, but it does not by itself prove the provenance of returned clinical content.
- **Issuer and device boundary**: mdoc issuer evidence and device-key proof can establish properties of the presentation container, issuer, or device-controlled key, but they do not automatically turn unsigned raw clinical content into issuer-signed clinical credentials.
- **Holder data source boundary**: Wallets can use multiple Holder data sources. Requesters validate returned Artifacts and their evidence rather than assuming a particular source architecture.
- **Kiosk relay boundary**: the Submission service and pointer transport are untrusted for plaintext clinical content. Kiosk wrapper signing, encryption, pointer binding, expiration, replay controls, and metadata minimization are topics for later §9, §11, and §12.
- **Completion and downstream workflow boundary**: successful receipt of a SMART response is not EHR write-back, patient matching, legal authorization, payment adjudication, or clinical acceptance. Those are deployment responsibilities outside this protocol unless a later section defines a narrow protocol effect.

These boundaries are related but not interchangeable. For example, a browser-origin signal does not prove clinical provenance; reader authentication does not prove that raw FHIR JSON is issuer-signed; an mdoc device proof does not by itself authorize EHR write-back; and successful kiosk relay does not make the Submission service a trusted clinical processor.

Later §7 defines the trust framework in more detail. Later §8 applies it to direct `org-iso-mdoc`; later §9 applies it to kiosk wrapper artifacts; later §§11–12 provide security and privacy considerations.

### 3.6 Design principles and normative pointers

This section records design principles that guide the normative sections. The principles are architectural pointers; the later sections named here contain the enforceable conformance rules.

#### 3.6.1 One docType, one namespace, one stable element

The base same-device presentation flow should expose a small, stable mdoc surface for SMART Health Check-in rather than a proliferation of transport-specific clinical elements. Later §8 defines the version 1.0 direct `org-iso-mdoc` identifiers, including the document type, namespace, request carrier, and stable response element. Later §13 registers or catalogs those identifiers as appropriate.

#### 3.6.2 No requester identity in clinical request body

The SMART request body describes requested clinical content and Holder-facing purpose; it is not a requester identity credential. Requester, Verifier, reader, origin, and organizational trust signals belong in presentation transport, trust framework, or deployment policy layers. Later §5 defines prohibited requester identity metadata in the clinical request body, and later §§7–8 define relevant trust and presentation validation.

#### 3.6.3 FHIR canonicals where they fit

Clinical content selection should use FHIR canonicals when the requested content maps to FHIR conformance resources. Exact profiles belong in `profiles[]`; profile families belong in `profilesFrom[]`; official resource type names belong in `resourceTypes[]`; Questionnaire canonicals and inline Questionnaires belong in questionnaire selectors. Later §5 defines canonical handling, including `|version` behavior, the array shape of `profilesFrom[]`, and the interaction between `resourceTypes[]` and profile selectors.

#### 3.6.4 No local topic vocabularies when FHIR terms exist

Requesters should not invent local topic names for content that can be expressed using FHIR resource types, profile canonicals, profile-family canonicals, or Questionnaire identifiers. Extension selector kinds are available for real gaps, but later §§4, 5, and 13 should keep those extensions explicit, registered or reviewable, and distinguishable from FHIR-native selectors.

#### 3.6.5 Response forms expressed as media types

A request item's acceptable response forms are expressed as media types. A response Artifact declares the media type actually returned. This keeps clinical packaging explicit and avoids making transport envelopes stand in for clinical content type. Later §§5, 6, and 13 define accepted media types, Artifact media-type rules, cross-validation, and registration expectations.

#### 3.6.6 Artifact-centered response with per-item status

The response model is Artifact-centered and status-explicit. Artifacts carry or reference clinical content and identify the request items they fulfill. Separately, `requestStatus[]` accounts for request items, including declined, unavailable, unsupported, partial, and error outcomes when defined in §6. This supports realistic many-to-many fulfillment without requiring Wallets to duplicate or reshape clinical payloads solely to mirror request-item boundaries.

#### 3.6.7 Explicit FHIR version on raw FHIR JSON

When an Artifact returns raw FHIR JSON, the response needs enough information for the Verifier to interpret it under the intended FHIR release. Later §6 defines the explicit FHIR-version requirement for raw FHIR JSON and distinguishes that requirement from response forms such as SMART Health Cards whose own format defines how FHIR content is represented.

#### 3.6.8 Default-to-retention for clinical workflows

Check-in content is often needed by downstream administrative or clinical workflows after the presentation session ends, and the same-device mdoc binding can signal the Verifier's intent to retain returned content where §8 defines that behavior. This principle does not define a Wallet-storage mandate, EHR write-back rule, retention duration, or clinical-sufficiency rule. Later §12 addresses data minimization, transparency, retention, and telemetry; local law and deployment policy control downstream recordkeeping.

#### 3.6.9 Crypto agility via profile registry, not in-band negotiation

Cryptographic suites, mdoc identifiers, wrapper algorithms, status codes, selector kinds, and media types should be governed by applicable profiles, versions, and registries rather than by unconstrained in-band negotiation inside clinical request bodies. Later §§4, 8, 9, 11, and 13 define versioning, conformance classes, identifiers, security requirements, and registry rules.
