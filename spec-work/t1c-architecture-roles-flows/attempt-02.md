## 1.1 Abstract

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, for workflow-bounded clinical content and receives a structured SMART response. The specification separates the transport-neutral clinical content model from presentation transport, defines the base same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API, and defines a cross-device kiosk flow that wraps and re-enters that same-device flow on the patient's phone. The result is an interoperable foundation for EHR, portal, payer, kiosk, and Wallet implementations to exchange check-in requests, Holder-reviewed responses, Artifacts, and per-item status without inventing local clinical vocabularies or kiosk-specific request languages.

## 3. Architectural overview

SMART Health Check-in is intentionally layered. The clinical content model says what clinical or administrative content is being requested and how a Holder-reviewed answer is represented. The same-device presentation flow says how the version 1.0 base presentation carries that request and response between a Verifier and a Wallet on one device. The cross-device kiosk flow says how a kiosk or desktop can get the same request to the patient's phone and receive an encrypted result, without defining a second clinical protocol.

This section is informative architecture text with pointers to later normative sections. Normative requirements for the SMART request and SMART response are defined in §§5-6. Trust processing is defined in §7. The same-device direct `org-iso-mdoc` flow is defined in §8. The cross-device kiosk wrapper is defined in §9.

### 3.1 Two payload domains: clinical content vs. presentation transport

Implementations need to keep two payload domains distinct:

1. the **clinical content domain**, consisting of the SMART request and SMART response; and
2. the **presentation transport domain**, consisting of the envelopes, proofs, encryption, origin context, relay state, and validation artifacts that carry or protect the clinical content.

A presentation transport can authenticate a Verifier, bind a response to a presentation session, encrypt bytes, assert a browser origin, carry mdoc device evidence, or relay opaque kiosk state. Those mechanisms do not change the meaning of a request item, a selector, an accepted media type, an Artifact, a fulfillment link, or a per-item status.

#### 3.1.1 Clinical content domain

The clinical content domain is the transport-neutral **clinical content model** defined by the SMART request and SMART response.

A SMART request expresses a bounded check-in need. It identifies request items, user-facing purpose and item text, accepted response media types, and selectors for requested content. Selectors can use FHIR-native constructs such as exact profile canonicals in `profiles[]`, profile-family canonicals in `profilesFrom[]`, official FHIR resource-type names, Questionnaire canonicals, inline Questionnaires, and registered extension selectors. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either can identify acceptable profile matches for an item, subject to the rest of the item definition. Later §5 defines the exact selector rules, including interaction with `resourceTypes[]`.

A SMART response reports what the Wallet/Responder returned after Holder review. It binds back to the SMART request, carries zero or more Artifacts, declares Artifact media types, links Artifacts to the request items they fulfill, and reports status for each request item. This supports many-to-many fulfillment: one Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts.

The same SMART request has the same clinical meaning whether it is carried by the same-device presentation flow, by the cross-device kiosk flow, or by a future binding. Likewise, the SMART response remains the same clinical response object even when carried inside different presentation or kiosk envelopes.

#### 3.1.2 Presentation transport domain

The presentation transport domain carries and protects the clinical content model.

In version 1.0, the base presentation transport is direct `org-iso-mdoc` over the W3C Digital Credentials API in the same-device presentation flow. The Verifier invokes the presentation flow, the Wallet/Responder evaluates the embedded SMART request with the Holder, and the Verifier receives and validates the returned presentation containing the SMART response.

The presentation transport domain includes details such as:

- W3C Digital Credentials API invocation and user-agent mediation;
- `org-iso-mdoc` profile identifiers, docType, namespace, and requested element choices;
- origin information and Verifier or reader authentication when available;
- mdoc issuer, device, and session binding evidence;
- HPKE, COSE, CBOR, and byte-level construction rules; and
- validation rules that bind the SMART response to the presentation request and session.

The cross-device kiosk flow adds a wrapper transport domain around the base presentation transport. It uses a Pointer URL, signed and encrypted kiosk request material, and encrypted submission material. Its kiosk request payload embeds the SMART request directly as `smartRequest`; it does not replace the SMART request with a demo preset, preset name, SDK helper object, or kiosk-specific request wrapper.

### 3.2 Two end-to-end flows

SMART Health Check-in 1.0 defines two end-to-end flows: the base same-device presentation flow and the optional cross-device kiosk flow. They are not peers at the clinical layer. The kiosk flow wraps the same-device flow and re-enters it on the phone.

#### 3.2.1 Same-device presentation flow

The same-device presentation flow is the base version 1.0 presentation flow. It is used when the Verifier page and Wallet are available through the same device, commonly a patient phone or other device with a Wallet or credential provider.

At a high level:

1. The Requester determines the clinical content needed for a bounded check-in workflow.
2. The Requester, acting through the Verifier role, constructs a SMART request.
3. The Verifier invokes the W3C Digital Credentials API using direct `org-iso-mdoc` presentation and carries the SMART request in the presentation request as defined in §8.
4. The Wallet/Responder receives the request, renders appropriate information for Holder review, applies Wallet policy and Holder decisions, and constructs a SMART response.
5. The Wallet/Responder returns the SMART response through the same presentation flow.
6. The Verifier validates the presentation transport and the SMART response before the Requester consumes the content.

This flow has no kiosk relay and no cross-device pointer. It is the architectural baseline that all version 1.0 check-in interactions rely on.

#### 3.2.2 Cross-device kiosk flow as wrapper/re-entry

The cross-device kiosk flow supports deployments where check-in starts at a kiosk, tablet, staff desktop, or other shared device but Holder review and Wallet presentation occur on the patient's phone.

At a high level:

1. The Kiosk creator constructs the same SMART request that would be used in the same-device presentation flow.
2. The Kiosk creator embeds that SMART request directly as `smartRequest` in a signed kiosk request payload and arranges encryption and relay storage as defined in §9.
3. The Kiosk creator displays or otherwise provides a Pointer URL, commonly encoded as a QR code.
4. The Phone presenter resolves the pointer, obtains and validates the kiosk request, verifies pointer-to-payload binding, and extracts the embedded SMART request.
5. On the phone, the Phone presenter re-enters the same-device presentation flow for the embedded SMART request.
6. The Wallet/Responder performs Holder review and returns a SMART response through the phone-local same-device presentation flow.
7. The Phone presenter submits an encrypted result through the Submission service for the Completion display.
8. The Completion display obtains, decrypts, validates, and displays completion state or passes the validated response to the local workflow.

The Submission service and pointer transport are not trusted with plaintext clinical content. They relay opaque request and response material for the kiosk wrapper. They are not the clinical Requester merely because they store, forward, or notify about encrypted blobs.

### 3.3 Roles and component contracts, protocol-level only

The roles below describe protocol responsibilities. A single product can perform multiple roles, and a deployment can split one role across components. This specification defines interoperable protocol effects, not product architecture, user-interface layout, SDK boundaries, persistence strategy, or business workflow.

#### 3.3.1 Requester / Verifier

The **Requester** is the relying party that asks the Holder for clinical content and consumes the SMART response. The Requester decides the workflow-bounded purpose, request items, selectors, and accepted response media types.

The **Verifier** is the presentation-transport role that invokes and validates a presentation flow. In the same-device presentation flow, the Verifier constructs the direct `org-iso-mdoc` presentation request, carries the SMART request, receives the presentation response, validates transport artifacts, and applies clinical response validation. In many deployments, the same EHR, portal, payer, or check-in application acts as both Requester and Verifier.

The SMART request body is not the place to assert Requester identity. Requester or Verifier identity, origin, reader authentication, certificates, and trust policy belong to the presentation transport and trust layers.

#### 3.3.2 Browser / User Agent

The **Browser / User Agent** exposes the W3C Digital Credentials API surface and mediates invocation of a Wallet or credential provider. It can provide origin context and user-agent mediation relevant to §7 and §8. This specification does not define browser conformance beyond the assumptions and protocol effects needed for the same-device presentation flow.

#### 3.3.3 Wallet / Responder

The **Wallet** is software controlled by or acting for the Holder. It receives the SMART request through the selected presentation flow, renders requested items for Holder review when appropriate, applies Wallet policy and Holder decisions, obtains or constructs responsive content from Holder data sources, and returns a SMART response. In this specification, the Wallet normally acts as the **Responder**.

The Wallet/Responder is responsible for preserving the clinical semantics of the request and response. It does not need to expose its internal data model, storage layout, issuer synchronization, or clinical summarization policy as protocol elements unless later normative sections define a specific field or validation effect.

#### 3.3.4 Holder data source

A **Holder data source** is wallet-internal or deployment-specific. It may include local credentials, cached FHIR resources, SMART Health Cards, issuer-provided credentials, connected services, or other sources available to the Wallet. The protocol abstracts over those sources. It does not define issuance, refresh, synchronization, backup, indexing, or longitudinal personal health record behavior.

#### 3.3.5 Kiosk creator

The **Kiosk creator** prepares the kiosk wrapper. It constructs the SMART request, embeds it directly as `smartRequest`, signs the kiosk request payload, arranges encryption, and produces a Pointer URL for the Phone presenter. It does not create a separate kiosk clinical request language.

#### 3.3.6 Submission service

The **Submission service** stores, forwards, or makes available encrypted kiosk request and response material. It is an untrusted relay for plaintext clinical content. Protocol rules in §9 and security considerations in §11 define how signed and encrypted wrapper artifacts, expiration, replay controls, metadata minimization, and validation preserve this boundary.

#### 3.3.7 Phone presenter

The **Phone presenter** is the patient-phone component that resolves the Pointer URL, obtains and validates the kiosk request, extracts the embedded SMART request, and re-enters the same-device presentation flow on the phone. It then submits an encrypted result for the Completion display. The Phone presenter bridges kiosk wrapper state to the base same-device presentation flow; it is not a second Wallet and not a replacement for Holder review.

#### 3.3.8 Completion display

The **Completion display** is the kiosk-side or desktop component that receives notification of an encrypted submission, obtains and decrypts the result as authorized for the kiosk session, validates the returned SMART response and wrapper bindings, and presents completion state to staff, the patient, or another local workflow. Displaying completion is not the same as defining EHR write-back, reconciliation, or downstream clinical processing.

### 3.4 Sequence diagrams in Markdown/text form

The diagrams below show role relationships and payload-domain boundaries. They are illustrative; later sections define the normative message shapes and validation rules.

#### 3.4.1 Same-device presentation flow

```text
Requester/Verifier        Browser / User Agent        Wallet/Responder        Holder
       |                           |                         |                  |
       | create SMART request      |                         |                  |
       |-------------------------->|                         |                  |
       | invoke DC API             |                         |                  |
       | with org-iso-mdoc request |                         |                  |
       |-------------------------->| mediate presentation    |                  |
       |                           |------------------------>| review request   |
       |                           |                         |----------------->|
       |                           |                         | Holder decision  |
       |                           |                         |<-----------------|
       |                           |     SMART response in   |                  |
       |                           |<------------------------| org-iso-mdoc     |
       | receive presentation      |                         |                  |
       |<--------------------------|                         |                  |
       | validate transport        |                         |                  |
       | validate SMART response   |                         |                  |
       | consume Artifacts/status  |                         |                  |
```

Clinical content domain: the SMART request and SMART response.

Presentation transport domain: W3C Digital Credentials API mediation, direct `org-iso-mdoc` request and response envelopes, origin and reader context, mdoc evidence, encryption, session binding, and validation.

#### 3.4.2 Cross-device kiosk flow

```text
Kiosk creator     Submission service     Phone presenter     Browser/UA     Wallet/Responder     Holder     Completion display
      |                    |                    |                |              |              |              |
      | create SMART       |                    |                |              |              |              |
      | request            |                    |                |              |              |              |
      | embed as           |                    |                |              |              |              |
      | smartRequest       |                    |                |              |              |              |
      | sign/encrypt       |                    |                |              |              |              |
      |------------------->| store opaque       |                |              |              |              |
      | display Pointer URL / QR             scan/launch       |              |              |              |
      |------------------------------------->|                |              |              |              |
      |                    |<-------------------| resolve pointer |              |              |              |
      |                    | encrypted request  |--------------->|              |              |              |
      |                    |------------------->| validate kiosk  |              |              |              |
      |                    |                    | extract SMART   |              |              |              |
      |                    |                    | request         |              |              |              |
      |                    |                    | re-enter same-device presentation flow on phone             |
      |                    |                    |--------------->|------------->| review       |              |
      |                    |                    |                |              |------------->|              |
      |                    |                    |                |              | decision     |              |
      |                    |                    |                |              |<-------------|              |
      |                    |                    |<---------------|<-------------| SMART response              |
      |                    |<-------------------| encrypted submission        |              |              |
      |                    | notify/relay opaque submission                         |              |
      |                    |------------------------------------------------------->|              |
      |                    |                    |                |              |              | decrypt, validate, display
```

The kiosk wrapper carries opaque signed and encrypted kiosk artifacts through the Submission service. The embedded clinical object is still the SMART request. Holder review and SMART response construction still occur in the same-device presentation flow on the phone.

### 3.5 Trust boundaries

SMART Health Check-in separates trust boundaries so deployments can make explicit policy decisions instead of treating one successful presentation as proof of everything.

- **Web origin trust** concerns where a Verifier page came from and what origin context the Browser / User Agent provides.
- **Reader or Verifier trust** concerns whether the requesting application or organization is authenticated, authorized, or otherwise trusted by Wallet policy.
- **Issuer and device-attestation trust** concerns mdoc issuer evidence, device key proof, and presentation-container assurance.
- **Clinical-content source trust** concerns whether returned Artifacts carry signatures, provenance, issuer evidence, or other indications about the source and freshness of clinical data.
- **Relay trust** concerns kiosk pointer and Submission service behavior. The Submission service is not trusted with plaintext clinical content and should be treated as able to observe metadata, delay messages, replay stale material, or swap ciphertext unless §9 and §11 controls prevent it.
- **Holder decision trust** concerns the fact that the Wallet/Responder mediates disclosure through Holder review and Wallet policy. A declined, partial, unavailable, unsupported, or error status is a protocol outcome, not necessarily a transport failure.

These boundaries are related but not interchangeable. For example, a browser-origin signal does not prove clinical provenance; reader authentication does not prove that raw FHIR JSON is issuer-signed; an mdoc device proof does not by itself authorize EHR write-back; and successful kiosk relay does not make the Submission service a trusted clinical processor.

### 3.6 Design principles and normative pointers

The following principles guide the normative sections. They are stated here to preserve architectural intent; precise conformance language belongs in the referenced sections.

#### 3.6.1 One docType, one namespace, one stable element

The base same-device presentation flow should have a narrow and testable mdoc surface: one versioned docType, one namespace, and one stable requested element carrying the SMART response. §8 defines the exact identifiers and byte-level behavior. This avoids local element vocabularies and makes conformance fixtures practical.

#### 3.6.2 No requester identity in clinical request body

The SMART request describes the clinical content being requested and the user-facing purpose for Holder review. It is not a Requester identity credential, reader certificate, origin assertion, or persistent authorization grant. Requester and Verifier identity signals belong in §7 and the presentation transport rules in §§8-9. §5 defines prohibited requester identity metadata in the SMART request body.

#### 3.6.3 FHIR canonicals where they fit

When the requested content is FHIR-shaped, request items should use FHIR-native identifiers rather than local topic names. Exact profile canonicals belong in `profiles[]`; canonical profile-family URLs belong in `profilesFrom[]`; official resource-type names belong in `resourceTypes[]`; Questionnaire canonicals and inline Questionnaires belong in questionnaire selectors. §5 defines the exact matching and version-handling rules.

#### 3.6.4 No local topic vocabularies when FHIR terms exist

The profile should not require Wallets and Requesters to coordinate private labels such as `insurance-card`, `med-list`, or `intake-summary` when FHIR profiles, profile families, resource types, Questionnaires, or registered selector kinds can express the request. Extension selectors remain possible, but §5 and §13 should keep them explicit, registered, and interoperable.

#### 3.6.5 Response forms expressed as media types

A Requester advertises acceptable response forms through media types, and each Artifact declares the media type it returns. Media types, not transport names or artifact subclass names, are the primary interoperability contract for interpreting returned clinical content. §§5-6 define accepted media types, Artifact media-type rules, and cross-validation.

#### 3.6.6 Artifact-centered response with per-item status

The SMART response should support realistic clinical packaging. Artifacts carry or reference content, `fulfills[]` links Artifacts back to request items, and `requestStatus[]` accounts for each item exactly once. §6 defines many-to-many fulfillment, status reporting, and Verifier validation.

#### 3.6.7 Explicit FHIR version on raw FHIR JSON

Raw FHIR JSON returned as an Artifact needs explicit FHIR version context so a Verifier can validate and consume it safely. §6 defines the `fhirVersion` requirement for `application/fhir+json` Artifacts and distinguishes that rule from SMART Health Card Artifacts.

#### 3.6.8 Default-to-retention for clinical workflows

Check-in responses are often intended for downstream administrative or clinical workflows rather than ephemeral proof display. The protocol therefore treats successful receipt of a SMART response as producing content that the Requester may need to retain according to law, policy, and workflow requirements. This principle does not define EHR write-back, reconciliation, retention duration, or clinical sufficiency; those remain deployment responsibilities and privacy considerations addressed later.

#### 3.6.9 Crypto agility via profile registry, not in-band negotiation

Cryptographic suites, presentation bindings, and wrapper algorithms should be selected by named profiles and registries rather than ad hoc in-band negotiation inside the clinical content model. The SMART request should not carry knobs that silently change transport security. §§4, 8, 9, 11, and 13 define conformance classes, binding identifiers, security requirements, and registry treatment.

## Organizer notes

### Strengths

- Keeps the three-layer framing visible: clinical content model, same-device presentation flow, and cross-device kiosk flow.
- States the core invariant that the kiosk flow wraps and re-enters the same-device flow rather than defining a second clinical protocol.
- Uses accepted T1.A role names and preserves the T1.B scope boundaries.
- Gives downstream sections clear normative pointers without over-specifying byte-level protocol details in §3.
- Includes text diagrams that show where the SMART request/response sit relative to transport envelopes and kiosk relay state.

### Caveats

- The phrase “Default-to-retention” is architecturally useful but may need careful privacy review so it is not read as mandating retention or overriding local law and policy.
- The same-device diagram intentionally abstracts away exact mdoc fields, HPKE inputs, SessionTranscript construction, and validation order; §8 must supply those details.
- The kiosk diagram is role-oriented rather than message-type complete; §9 must define exact JWS, encrypted request, pointer, and submission structures.

### Downstream dependencies

- §5 must define SMART request fields, selector matching, `profilesFrom[]` array shape, `profiles[]` plus `profilesFrom[]` additivity, and the prohibition on requester identity metadata.
- §6 must define SMART response binding, Artifact media-type rules, many-to-many fulfillment, per-item status coverage, and raw FHIR JSON version handling.
- §7 must separate origin trust, Verifier or reader trust, issuer/device trust, and clinical-content source trust.
- §8 must define the direct `org-iso-mdoc` same-device flow, including identifiers, request carriage, response carriage, encryption, session binding, and validation checklist.
- §9 must preserve the kiosk wrapper invariant: signed kiosk payload embeds `smartRequest` directly, the Phone presenter re-enters §8, and the Submission service remains untrusted for plaintext clinical content.
- §§11-12 must refine the security and privacy consequences of relay metadata, Holder decisions, response retention, and trust-boundary separation.
