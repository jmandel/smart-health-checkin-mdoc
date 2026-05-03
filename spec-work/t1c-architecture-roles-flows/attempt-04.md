## 1.1 Abstract

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share bounded clinical or administrative content for a check-in workflow. The specification separates a transport-neutral clinical content model from the presentation transports that carry it: a SMART request describes requested items, FHIR-native selectors, accepted response media types, and user-facing context, while a SMART response returns Artifacts, fulfillment links, and per-item status. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as the base same-device presentation flow, and defines a cross-device kiosk flow that wraps the same-device flow by having a Phone presenter resolve a kiosk pointer, obtain a payload that embeds the SMART request directly, re-enter same-device presentation on the phone, and submit an encrypted result for the Completion display.

## 3. Architectural overview

SMART Health Check-in is organized around one invariant: clinical check-in semantics are defined once, and presentation flows carry those semantics without redefining them. A kiosk deployment can change where a Holder starts, which device displays the first prompt, and how encrypted state is relayed, but it does not introduce a second clinical request language or a different response model.

The architecture has three coordinated layers:

1. the **clinical content model**, consisting of the transport-neutral SMART request and SMART response;
2. the base **same-device presentation flow**, using direct `org-iso-mdoc` over the W3C Digital Credentials API; and
3. the optional **cross-device kiosk flow**, which wraps the same-device presentation flow for front-desk and shared-device deployments.

Sections §5 and §6 define the clinical content model. Sections §7 and §8 define the trust processing and direct `org-iso-mdoc` same-device presentation flow. Section §9 defines the kiosk wrapper. This section explains how those later normative sections fit together.

### 3.1 Two payload domains: clinical content vs. presentation transport

The protocol distinguishes two payload domains that are often implemented by the same product but must not be conflated.

The **clinical content domain** asks: what information does the Requester need, what is shown to the Holder, what can the Wallet/Responder return, and how is the result accounted for item by item?

The **presentation transport domain** asks: how is the SMART request delivered to the Wallet, how is the SMART response protected and returned, what origin or Verifier context is available, what cryptographic proof is attached, and what validation is required before a response is trusted?

A conforming transport can add envelopes, signatures, encryption, reader information, origin assertions, session binding, freshness, and relay metadata. It does not change the meaning of request items, selectors, accepted media types, Artifact fulfillment, or per-item status.

#### 3.1.1 Clinical content domain

The clinical content domain consists of the SMART request and SMART response JSON objects defined in §§5–6.

A SMART request expresses the Requester's clinical or administrative need for a bounded workflow. It contains request items, user-facing display context, accepted response media types, and selectors. FHIR-native selectors can include exact profile canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource types, Questionnaire references, inline Questionnaires, and registered extension selectors. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either can identify acceptable profile matches for an item, subject to the rest of the item definition and the detailed selector rules in §5.

A SMART response binds back to the SMART request and reports what happened. It carries zero or more Artifacts, each declaring a `mediaType` and the request item or items it fulfills, and it reports per-item status. This Artifact-centered response model supports many-to-many fulfillment: one Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts.

The clinical content domain is transport-neutral. The same SMART request has the same clinical meaning whether it is carried directly by the same-device presentation flow, embedded as `smartRequest` in a kiosk request payload, or carried by a future binding. Likewise, a SMART response remains a clinical response object even when it is wrapped in mdoc, encrypted for kiosk submission, or processed by a local response consumer.

The SMART request body is not a requester identity credential, consent directive, trust anchor, authorization grant, or transport transcript. Requester, Verifier, origin, reader, and session evidence belong to the presentation transport and trust layers, not to the clinical request body.

#### 3.1.2 Presentation transport domain

The presentation transport domain carries and protects the clinical content model. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as the base same-device presentation flow. In that flow, the Verifier invokes the W3C Digital Credentials API, passes a presentation request carrying the SMART request, receives a presentation response, opens the `org-iso-mdoc` result, and validates the returned SMART response.

The transport domain is responsible for protocol identifiers, mdoc document type and namespace choices, the stable element that carries the SMART response, request and response encoding, session binding, HPKE encryption, reader or Verifier proof where used, and validation of transport artifacts. Later §8 defines those details.

The transport domain can establish that a response was returned through a particular presentation channel, bound to a particular session, and protected according to the selected presentation profile. It does not, by itself, prove that every returned clinical datum is current, complete, clinically correct, or signed by a clinical source. Source trust on clinical content is a separate layer addressed by §7 and by Artifact-specific evidence.

### 3.2 Two end-to-end flows

Version 1.0 defines two end-to-end flows that share the same clinical content model.

The **same-device presentation flow** is the base flow. It is used when the Verifier page and the Wallet are available through the same device and user-agent environment.

The **cross-device kiosk flow** is an optional wrapper. It is used when a Holder starts at a kiosk, tablet, staff desktop, or other shared device but must complete presentation on a phone. The kiosk flow creates a pointer to encrypted request state, moves the Holder to the phone, and then re-enters the same-device presentation flow on the phone.

#### 3.2.1 Same-device presentation flow

In the same-device presentation flow, the Requester and Verifier are commonly components of the same relying-party application. The Requester decides what content is needed for the workflow and constructs the SMART request. The Verifier carries that request through direct `org-iso-mdoc` presentation over the W3C Digital Credentials API.

The Browser / User Agent mediates the Digital Credentials API call and Wallet invocation. The Wallet/Responder receives the request, presents request items for Holder review according to Wallet policy and applicable requirements, gathers or constructs responsive Artifacts from Holder data sources, constructs the SMART response, and returns it through the presentation transport. The Verifier opens the transport response, applies transport validation, and applies clinical response validation before the Requester consumes the result.

This flow is the architectural baseline. Other version 1.0 flows reuse it rather than defining parallel request and response semantics.

#### 3.2.2 Cross-device kiosk flow as wrapper/re-entry

In the cross-device kiosk flow, the kiosk side cannot itself invoke the Holder's Wallet. Instead, a Kiosk creator creates the SMART request, embeds it directly as `smartRequest` in a signed kiosk request payload, arranges encryption, and publishes or stores an encrypted request for retrieval through a Pointer URL, commonly displayed as a QR code.

The Phone presenter resolves the Pointer URL, retrieves the encrypted kiosk request through the Submission service or equivalent relay, decrypts and validates the kiosk request according to §9, obtains the embedded SMART request, and re-enters the same-device presentation flow locally on the phone. The Wallet/Responder then handles the SMART request as it would in the base flow. After the phone receives the SMART response, the Phone presenter submits an encrypted result for the Completion display.

The kiosk flow is therefore a wrapper and re-entry pattern. It is not a second clinical protocol. The kiosk request payload embeds the SMART request directly; demo presets, preset names, SDK helper objects, and request-wrapper shortcuts are not protocol payloads in place of `smartRequest`.

### 3.3 Roles and component contracts, protocol-level only

A deployment can combine roles in one process or split them across products. This specification defines protocol-level responsibilities, not product packaging, account models, user-interface layout, or internal storage architecture.

#### 3.3.1 Requester / Verifier

The **Requester** asks the Holder to share clinical content for a bounded workflow and consumes the SMART response. The Requester constructs the SMART request according to §5 and ensures that request items, display text, selectors, and accepted media types accurately reflect the workflow need.

The **Verifier** performs the presentation-transport role. It invokes the same-device presentation flow, receives the presentation response, validates transport artifacts, extracts the SMART response, and applies the clinical response validation rules defined in §6. In many deployments, the Requester and Verifier are parts of the same EHR portal, scheduling application, payer workflow, or check-in application.

The Requester / Verifier contract is to keep requester identity and transport trust evidence out of the SMART request body, to use the transport and trust mechanisms defined for the selected flow, and to treat Holder decisions and per-item status as first-class protocol outcomes rather than transport failures.

#### 3.3.2 Browser / User Agent

The **Browser / User Agent** exposes the W3C Digital Credentials API surface and mediates invocation of a Wallet or Credential Manager. This specification relies on the User Agent for the API surface and origin-related behavior assumed by the same-device flow, but it does not define a general browser conformance class beyond those assumptions.

The User Agent is part of the presentation transport domain. It does not interpret clinical selectors, decide which Artifacts fulfill request items, or rewrite the SMART request or SMART response.

#### 3.3.3 Wallet / Responder

The **Wallet** is the usual **Responder**. It receives a SMART request through a selected presentation flow, renders requested items for Holder review when appropriate, applies Wallet policy and Holder decisions, obtains responsive content from Holder data sources, constructs the SMART response, and returns it through the presentation transport.

The Wallet/Responder contract is to preserve the clinical semantics of the SMART request, to respect per-item Holder control, to produce Artifacts and request-status entries according to §6, and to use the selected presentation flow without inventing transport-specific clinical meanings.

#### 3.3.4 Holder data source

A **Holder data source** is wallet-internal or deployment-specific. It can be a locally stored credential, SMART Health Card, cached FHIR resource, connected service, issuer-provided credential, or another source available to the Wallet.

The protocol abstracts over Holder data sources. It does not define issuance, synchronization, retention, account recovery, background refresh, clinical completeness, or source-selection policy. The Wallet may use one or more Holder data sources to construct a SMART response, but the response must still be expressed through Artifacts, media types, fulfillment links, and per-item status.

#### 3.3.5 Kiosk creator

The **Kiosk creator** creates the kiosk-side request state. It constructs the SMART request, embeds that object directly as `smartRequest` in the kiosk request payload, signs the payload, arranges encryption, and produces a Pointer URL for the Phone presenter.

The Kiosk creator contract is to preserve the embedded SMART request exactly as the clinical request object for the session and to rely on the kiosk wrapper only for cross-device transport, freshness, relay, and completion mechanics.

#### 3.3.6 Submission service

The **Submission service** is an untrusted relay or provider that stores, forwards, or makes available encrypted kiosk request and submission blobs, rows, or notifications. It may help the Phone presenter find the encrypted kiosk request and help the Completion display learn that an encrypted result is available.

The Submission service is not the clinical Requester merely because it relays data. It is not trusted with plaintext clinical content, Holder decisions, or decrypted SMART responses. Kiosk protocol design therefore treats the Submission service as a transport component that can observe metadata and availability but should see only encrypted payloads.

#### 3.3.7 Phone presenter

The **Phone presenter** resolves the Pointer URL, retrieves and validates the encrypted kiosk request, verifies the expected request binding, obtains the embedded SMART request, and re-enters the same-device presentation flow on the phone. After same-device presentation completes, it submits an encrypted result for the Completion display.

The Phone presenter contract is to bridge into the base flow, not to replace it. It must not translate the SMART request into a kiosk-specific clinical request vocabulary or alter profile-selector semantics, media-type semantics, fulfillment semantics, or per-item status semantics.

#### 3.3.8 Completion display

The **Completion display** is the kiosk-side or desktop component that receives notification of an encrypted submission, decrypts and validates the returned result as authorized for the kiosk session, and presents completion state to staff, to the Holder, or to another local workflow.

The Completion display is a response recipient in the kiosk wrapper, not a separate clinical protocol endpoint. After decryption and validation, downstream ingestion, display, reconciliation, and workflow processing remain deployment responsibilities outside the protocol core.

### 3.4 Sequence diagrams

The following diagrams are informative. They show role boundaries and payload domains; later sections define exact wire artifacts and validation rules.

#### 3.4.1 Same-device presentation flow

```text
Requester/Verifier        Browser / User Agent        Wallet/Responder        Holder
       |                          |                         |                   |
       | Construct SMART request  |                         |                   |
       |------------------------->|                         |                   |
       | Invoke DC API with       |                         |                   |
       | direct org-iso-mdoc req  |                         |                   |
       |------------------------->|  Mediate Wallet choice  |                   |
       |                          |------------------------>|                   |
       |                          |                         | Review items and  |
       |                          |                         | consent decisions |
       |                          |                         |<----------------->|
       |                          |                         | Build SMART       |
       |                          |                         | response          |
       |                          |  Presentation response  |                   |
       |<-------------------------|<-------------------------|                   |
       | Validate transport,      |                         |                   |
       | extract and validate     |                         |                   |
       | SMART response           |                         |                   |
```

The clinical content domain is the SMART request and SMART response. The presentation transport domain is the Digital Credentials API invocation, direct `org-iso-mdoc` request and response structure, session binding, encryption, and transport validation.

#### 3.4.2 Cross-device kiosk flow

```text
Kiosk creator       Submission service       Phone presenter       Browser/UA       Wallet/Responder       Completion display
      |                     |                       |                  |                |                         |
      | Construct SMART     |                       |                  |                |                         |
      | request             |                       |                  |                |                         |
      | Embed as            |                       |                  |                |                         |
      | smartRequest in     |                       |                  |                |                         |
      | signed/encrypted    |                       |                  |                |                         |
      | kiosk request       |                       |                  |                |                         |
      |-------------------->| Store encrypted blob  |                  |                |                         |
      | Display Pointer URL |                       |                  |                |                         |
      |----------------------------- Holder scans / opens pointer ------------------>|                         |
      |                     |<----------------------| Resolve pointer  |                |                         |
      |                     |---------------------->| Encrypted kiosk  |                |                         |
      |                     |                       | request          |                |                         |
      |                     |                       | Validate and     |                |                         |
      |                     |                       | obtain embedded  |                |                         |
      |                     |                       | SMART request    |                |                         |
      |                     |                       | Re-enter same-device presentation flow on phone                         |
      |                     |                       |----------------->|--------------->|                         |
      |                     |                       |<-----------------|<---------------|                         |
      |                     |<----------------------| Submit encrypted SMART response result                                  |
      |                     | Notify / make result  |                  |                |                         |
      |                     | available             |                  |                |                         |
      |                     |----------------------------------------------------->| Decrypt, validate, display completion
```

The kiosk wrapper adds pointer resolution, signed and encrypted kiosk request state, untrusted relay behavior, encrypted submission, and completion processing. The phone-side clinical presentation remains the same-device presentation flow.

### 3.5 Trust boundaries

SMART Health Check-in deliberately separates trust boundaries so deployments can compose policy without confusing one proof for another.

- **Holder boundary**: The Holder controls disclosure through the Wallet. A declined, partial, unavailable, unsupported, or error outcome can be a valid check-in result, not a failed transport session.
- **Clinical content boundary**: A SMART request and SMART response have clinical semantics defined by §§5–6. Transport wrapping does not make unsigned raw FHIR JSON equivalent to issuer-signed clinical credentials unless separate provenance or signature evidence is present.
- **Origin and User Agent boundary**: Browser / User Agent behavior can provide origin context and mediate Wallet invocation. Origin evidence is not the same as reader authentication, clinical-source trust, or Holder consent.
- **Verifier / reader boundary**: The Verifier can present transport-level identity or reader evidence where the selected flow supports it. A Wallet can use that evidence in policy and display, but it is separate from the SMART request body.
- **Issuer / device-attestation boundary**: mdoc issuer and device evidence can establish properties of the presentation container and keys. Those properties do not automatically establish the provenance of every clinical Artifact.
- **Holder data source boundary**: Holder data sources are abstracted by the protocol. Their freshness, completeness, and trust level are deployment and Artifact-specific concerns unless expressed through defined evidence.
- **Kiosk relay boundary**: The Submission service and pointer transport are untrusted for plaintext clinical content. They may observe metadata such as timing, pointer use, object size, and completion state unless later privacy and security rules minimize or protect those signals.
- **Completion boundary**: The Completion display can decrypt and validate kiosk results for its session, but downstream import, retention, reconciliation, and staff workflow remain outside the protocol.

Section §7 defines the trust framework. Sections §11 and §12 define security and privacy considerations for these boundaries.

### 3.6 Design principles and normative pointers

This section states architectural principles and points to the later sections that turn them into conformance requirements. The principles are not a substitute for the detailed normative text.

#### 3.6.1 One docType, one namespace, one stable element

The base same-device presentation flow uses one direct `org-iso-mdoc` profile for SMART Health Check-in 1.0, with stable identifiers for the document type, namespace, and response element. This keeps the transport binding testable and avoids negotiating clinical semantics through ad hoc mdoc element names. Normative details belong to §8 and registry details to §13.

#### 3.6.2 No requester identity in clinical request body

The SMART request describes requested clinical content and Holder-facing context; it does not carry requester identity metadata, reader credentials, origin claims, or authorization grants. Requester and Verifier trust evidence belongs to the presentation and trust layers. Normative request-body rules belong to §5; origin and reader trust rules belong to §7 and §8.

#### 3.6.3 FHIR canonicals where they fit

When a request can be expressed using FHIR canonicals, official resource types, profile families, or Questionnaires, those identifiers should be used instead of private topic names. This improves interoperability across multiple EHRs and multiple Wallet platforms. Precise selector rules, including `profilesFrom[]` array shape and profile-selector additivity, belong to §5.

#### 3.6.4 No local topic vocabularies when FHIR terms exist

The protocol favors existing FHIR terms and registered extensions over deployment-specific labels for common clinical requests. Local topic vocabularies make certification and many-to-many interoperability brittle. Extension selector registration and forward-compatibility rules belong to §§4, §5, and §13.

#### 3.6.5 Response forms expressed as media types

A Requester advertises response forms using media types, and each returned Artifact declares its `mediaType`. This lets Wallets choose among supported forms while letting Verifiers validate whether returned Artifacts match what was requested. Normative media-type rules belong to §§5–6 and registry rules to §13.

#### 3.6.6 Artifact-centered response with per-item status

The response model centers on Artifacts plus explicit per-item status. This supports Holder choice, partial fulfillment, unsupported content, and many-to-many relationships between requested items and returned content. Normative Artifact, fulfillment, status, and validation rules belong to §6.

#### 3.6.7 Explicit FHIR version on raw FHIR JSON

Raw FHIR JSON Artifacts need explicit FHIR version information so response consumers can validate profiles, resource shapes, and Bundle content consistently. Normative rules for raw FHIR JSON Artifacts belong to §6 and FHIR mapping guidance belongs to Appendix H.

#### 3.6.8 Retention is deployment policy, not a transport side effect

Clinical workflows often require local retention, audit, reconciliation, or staff review after check-in, while privacy requirements may limit unnecessary storage and telemetry. The protocol therefore identifies the response object and trust boundaries but does not make transport success a retention directive. Downstream retention, EHR write-back, and workflow processing remain deployment responsibilities; privacy guidance belongs to §12 and implementation notes to §15.

#### 3.6.9 Crypto agility via profile registry, not in-band negotiation

Cryptographic choices should be tied to named protocol profiles, registries, and versioned conformance requirements rather than unbounded in-band negotiation inside the SMART request. This keeps clinical semantics stable and makes security review tractable. Normative cryptographic details belong to §§8–9, security considerations to §11, and registry entries to §13.

## Organizer notes

### Strengths

- Establishes a strict separation between the clinical content model and presentation transport, with clear downstream pointers.
- Treats direct `org-iso-mdoc` over the W3C Digital Credentials API as the base same-device presentation flow.
- Defines the cross-device kiosk flow as a wrapper and re-entry pattern, not as a second clinical protocol.
- Preserves accepted terminology for Requester, Verifier, Wallet/Responder, Holder, Kiosk creator, Submission service, Phone presenter, and Completion display.
- Makes trust boundaries explicit without trying to define the detailed §7, §8, §9, §11, or §12 rules prematurely.

### Caveats

- §3 is informative in the outline, so this draft avoids BCP 14 keywords except when describing later normative destinations. An organizer may choose to move any requirement-like design principle into the later normative sections instead of keeping it here.
- The sequence diagrams intentionally omit byte-level details, exact mdoc field names, JWS/HPKE envelopes, and validation checklists; those belong to later tranches.
- The retention principle is phrased to avoid implying a default storage mandate. If the final spec wants a stronger “default-to-retention for clinical workflows” statement, it should be reconciled with §12 privacy requirements.

### Downstream dependencies

- §5 must define exact SMART request encoding, prohibited requester identity fields, selector semantics, `profilesFrom[]` array shape, profile-selector additivity, and `resourceTypes[]` interaction.
- §6 must define SMART response binding, Artifact media-type rules, fulfillment links, per-item status coverage, many-to-many fulfillment, and Verifier validation.
- §7 must separate origin trust, reader/Verifier trust, issuer/device evidence, and source trust on clinical content.
- §8 must define the direct `org-iso-mdoc` same-device binding, including protocol identifiers, docType, namespace, stable response element, encryption, and validation.
- §9 must define kiosk signing, encryption, Pointer URL, phone resolution, same-device re-entry, encrypted submission, replay controls, and Completion display processing without weakening the untrusted-relay model.
- §§11–12 must revisit metadata leakage, replay, spoofing, Holder UX, retention, and telemetry for both flows.
