## 1.1 Abstract

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, for bounded clinical or administrative content needed for a specific workflow. The specification separates a transport-neutral clinical content model from the presentation transports that carry it: a SMART request describes requested content and accepted response forms, and a SMART response reports per-item status and returns Artifacts that can fulfill one or more request items. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as the base same-device presentation flow, and defines a cross-device kiosk flow that wraps that base flow by using a pointer, phone resolution, same-device re-entry on the phone, and encrypted submission back to a Completion display.

## 3. Architectural overview

SMART Health Check-in has a deliberately layered architecture. The clinical content model answers "what is being requested and returned?" The same-device presentation flow answers "how does a Verifier and Wallet exchange that model on one device with presentation proof and transport validation?" The cross-device kiosk flow answers "how can a desktop, kiosk, or shared device cause the Holder's phone to run that same presentation flow and return the result without trusting the relay with plaintext clinical content?"

This section is informative architecture text with normative pointers. Later sections define the exact conformance targets, field rules, cryptographic constructions, validation steps, and privacy requirements.

### 3.1 Two payload domains: clinical content vs. presentation transport

The most important architectural boundary is between the **clinical content domain** and the **presentation transport domain**. A SMART request and SMART response are clinical-content objects. mdoc envelopes, Digital Credentials API request structures, kiosk pointers, encrypted kiosk envelopes, submission ciphertexts, acknowledgments, and completion notifications are presentation-transport or wrapper objects.

A transport can protect, authenticate, route, encrypt, relay, or bind a SMART request or SMART response. It does not redefine the clinical meaning of request items, selectors, accepted media types, Artifacts, fulfillment links, or per-item status. This separation lets the same clinical content model be validated consistently whether it is carried by the same-device presentation flow, by the cross-device kiosk flow, or by a future binding.

#### 3.1.1 Clinical content domain

The clinical content domain consists of the transport-neutral SMART request and SMART response defined in §§5-6.

A SMART request expresses a bounded check-in need. It identifies the request, gives Holder-facing context, and contains request items. Each request item can describe requested content using selectors such as FHIR resource selectors, exact profile canonicals in `profiles[]`, profile-family canonicals in `profilesFrom[]`, resource types, Questionnaires, or registered extension selectors. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either source can identify acceptable profile matches, subject to the rest of the item definition. Their presence does not make one selector narrow the other; later §5 defines the precise selector processing rules, including interaction with `resourceTypes[]`.

A SMART response is the Wallet/Responder's clinical answer to a SMART request. It binds back to the request, reports status for request items, and returns zero or more Artifacts. Artifacts are response objects with declared media types and fulfillment links. One Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts. This many-to-many structure is central to check-in because clinical data is rarely packaged in the same units as a Requester's workflow questions.

The clinical content domain does not contain requester identity metadata. A SMART request can include display context and purpose text so the Holder can understand the request, but requester identity, origin, reader authentication, presentation-session freshness, and transport proof belong to presentation and trust layers. Later §§5-6 define the request and response model; §7 defines trust processing; §§8-9 define the version 1.0 flows that carry the model.

#### 3.1.2 Presentation transport domain

The presentation transport domain carries the clinical content model between components and supplies the evidence and protection needed by the selected flow.

For version 1.0, the base presentation transport is the same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API. In that flow, a Verifier invokes the Digital Credentials API from a page or application context on the same device as the Wallet. The SMART request is carried as presentation request data, and the SMART response is returned as presentation response data. The detailed binding in §8 defines the `org-iso-mdoc` identifiers, mdoc namespace and element choices, request carrier, response carrier, SessionTranscript construction, encryption, and Verifier validation steps.

The cross-device kiosk flow is also presentation transport, but it is a wrapper rather than a separate clinical protocol. The Kiosk creator prepares a signed and encrypted kiosk request payload whose `smartRequest` member embeds the SMART request directly. The Phone presenter resolves a pointer, validates the kiosk request, and then re-enters the same-device presentation flow on the phone for that embedded SMART request. After Wallet/Responder processing, the phone submits an encrypted result for the Completion display. Demo presets, preset names, SDK helper objects, and request-wrapper shortcuts are not protocol payloads in place of the embedded SMART request.

Presentation-transport objects can introduce their own identifiers, expiration values, signatures, encryption keys, origin information, relay locations, and completion states. Those fields support routing and security for a flow; they are not substitutes for SMART request identifiers, request item identifiers, Artifact identifiers, fulfillment links, or per-item status.

### 3.2 Two end-to-end flows

Version 1.0 standardizes two end-to-end flows:

1. the **same-device presentation flow**, which is the base flow and is required as the foundation for version 1.0 presentation behavior; and
2. the **cross-device kiosk flow**, which is an optional wrapper for kiosk, desktop, and shared-device deployments and which reuses the same-device presentation flow on the Holder's phone.

The flows differ in routing and trust boundaries, not in clinical request/response semantics.

#### 3.2.1 Same-device presentation flow

In the same-device presentation flow, the Requester and Verifier are often the same relying-party application or cooperating components of the same system. The Requester constructs a SMART request for a bounded check-in workflow. The Verifier packages that SMART request into the direct `org-iso-mdoc` presentation request and invokes the W3C Digital Credentials API.

The Browser / User Agent mediates the request to a Wallet. The Wallet acts as the normal Responder: it renders the requested items for Holder review when appropriate, applies its local policies, obtains Holder consent decisions, gathers or constructs responsive Artifacts from Holder data sources, and returns a SMART response through the presentation flow. The Verifier opens and validates the presentation response, extracts the SMART response, and applies clinical response validation before the Requester or downstream workflow consumes it.

The same-device flow is the architectural anchor for version 1.0. Other flows can wrap or invoke it, but they do not bypass its clinical semantics or validation obligations when they claim to carry SMART Health Check-in content through the version 1.0 base presentation mechanism.

#### 3.2.2 Cross-device kiosk flow as wrapper/re-entry

The cross-device kiosk flow exists for cases where the first interaction happens on a device that is not the Holder's Wallet device: a front-desk kiosk, staff workstation, shared tablet, or desktop browser. The architecture keeps that device from becoming a second clinical protocol endpoint.

The Kiosk creator creates the SMART request, embeds it directly as `smartRequest` in a kiosk request payload, signs the payload, arranges encryption, and publishes or stores the encrypted request through a Submission service or similar relay. The Kiosk creator then presents a Pointer URL, commonly as a QR code.

The Phone presenter scans or opens the Pointer URL, resolves it through the Submission service, decrypts and validates the kiosk request according to §9, and verifies that the pointer and payload are bound to the same request. At that point the phone has the embedded SMART request. The phone then re-enters the same-device presentation flow locally: it invokes or participates in the W3C Digital Credentials API and Wallet interaction on the phone, using the same SMART request semantics defined in §5 and the same SMART response semantics defined in §6.

After the Wallet/Responder returns a SMART response on the phone, the Phone presenter encrypts the result for the kiosk session and submits it through the Submission service. The Completion display receives notification or retrieves the encrypted submission, decrypts it, validates that it belongs to the expected kiosk session, and displays completion state or hands the result to local workflow software.

The Submission service and pointer transport are untrusted for plaintext clinical content. Their purpose is relay, storage, notification, and abuse control for opaque encrypted state. They are not the clinical Requester merely because they carry bytes, and they do not receive authority to reinterpret the SMART request or SMART response.

### 3.3 Roles and component contracts, protocol-level only

Roles describe protocol responsibilities, not product boundaries. One deployed product can play several roles, and one role can be split across several components. Conformance sections later in the document define which role is responsible for each requirement.

#### 3.3.1 Requester / Verifier

The **Requester** asks the Holder, through a Wallet, for clinical content and consumes the SMART response. The Requester is responsible for expressing a bounded workflow need as a SMART request, using content selectors and accepted media types that the Requester's systems can process.

The **Verifier** is the presentation-transport role. It constructs a presentation request, invokes the same-device `org-iso-mdoc` flow, receives and opens the presentation response, validates transport artifacts, extracts the SMART response, and applies clinical response validation. In many deployments the Requester and Verifier are parts of the same EHR, portal, payer, or check-in application. The architecture separates the names so clinical-request semantics do not get confused with presentation-session proof.

A Requester/Verifier contract is protocol-level only. This specification does not define staff workflow, patient matching, downstream reconciliation, EHR write-back, payment processing, eligibility adjudication, or clinical sufficiency policy after a SMART response is received.

#### 3.3.2 Browser / User Agent

The **Browser / User Agent** exposes the W3C Digital Credentials API surface and mediates between a Verifier page and available Wallet or credential-provider software. The same-device flow relies on user-agent origin context and API mediation where specified in §8, but this specification does not define a general browser conformance class beyond the assumptions and validation inputs named by the presentation flow.

Platform-specific routing, prompts, wallet discovery, permissions UI, and Credential Manager integration belong in implementation guidance unless a later normative section states an interoperable protocol effect.

#### 3.3.3 Wallet / Responder

The **Wallet** is software controlled by or acting for the Holder. In this specification, the Wallet normally acts as the **Responder**. Its protocol responsibilities are to receive a SMART request through a supported presentation flow, support Holder review and consent according to Wallet policy and applicable requirements, determine what responsive content is available from Holder data sources, construct a SMART response, and return it through the selected flow.

The Wallet/Responder is not required by this architecture to store a longitudinal personal health record. It can use local credentials, cached FHIR resources, SMART Health Cards, connected services, issuer-provided credentials, or other Holder data sources. Issuance, synchronization, refresh, backup, indexing, and permanent storage are outside the protocol unless a later section defines a narrow validation consequence for returned Artifacts.

#### 3.3.4 Holder data source

A **Holder data source** is wallet-internal or deployment-specific. It can be a credential store, a SMART Health Card, a FHIR cache, a connected service, an issuer-provided document, or another source available to the Wallet. The SMART Health Check-in protocol observes only the SMART response and the evidence carried by returned Artifacts or presentation containers.

A successful presentation transport does not by itself prove the clinical provenance of unsigned clinical content. Later §7 distinguishes issuer and device evidence from clinical-content source trust, and §6 defines how response validation accounts for Artifact media type, fulfillment, and status.

#### 3.3.5 Kiosk creator

The **Kiosk creator** creates a cross-device kiosk request for a desktop, kiosk, staff workstation, shared tablet, or server-side kiosk session. It creates the SMART request, embeds that object directly as `smartRequest` in the kiosk request payload, signs the payload, arranges request-envelope encryption, and produces a Pointer URL for the phone.

The Kiosk creator's contract is to prepare the wrapper without changing the clinical content model. It can choose the check-in workflow and display the QR code or link, but it does not define demo presets, preset names, or indirect request wrappers as protocol substitutes for the embedded SMART request.

#### 3.3.6 Submission service

The **Submission service** is an untrusted relay or provider that stores, forwards, or makes available encrypted kiosk request and response blobs, rows, or notifications. It can support pointer resolution, polling, notification, expiration, replay controls, and operational abuse limits.

The Submission service is not trusted with plaintext clinical content. It is not the clinical Requester merely because it relays the request or submission. It must be possible to reason about kiosk privacy and security under an honest-but-curious relay model; later §§9, 11, and 12 define the precise protections and residual metadata considerations.

#### 3.3.7 Phone presenter

The **Phone presenter** is the patient-phone component in the cross-device kiosk flow. It resolves the Pointer URL, obtains and validates the kiosk request, verifies pointer-to-payload binding, and invokes or participates in the same-device presentation flow on the phone for the embedded SMART request.

The Phone presenter is the re-entry point into the base presentation architecture. It does not create a new clinical request language. After the Wallet/Responder returns a SMART response, the Phone presenter encrypts and submits the result for the Completion display according to the kiosk rules in §9.

#### 3.3.8 Completion display

The **Completion display** is the kiosk-side or desktop component that receives notification of an encrypted submission, decrypts and validates the returned SMART response as belonging to the kiosk session, and presents completion state to staff, the patient, or another local workflow.

The Completion display can be part of the same application as the Kiosk creator, but the roles remain distinct. Creation of a kiosk request, relay of encrypted state, phone-side same-device re-entry, and completion processing have different trust boundaries and validation obligations.

### 3.4 Sequence diagrams in Markdown/text form

The following diagrams are explanatory. They show role boundaries and data-domain transitions; exact wire artifacts, cryptographic steps, and validation rules are defined in later sections.

#### 3.4.1 Same-device presentation flow

```text
Requester/Verifier       Browser / User Agent       Wallet/Responder          Holder
        |                         |                         |                    |
        | Create SMART request    |                         |                    |
        |------------------------>|                         |                    |
        | DC API request carrying SMART request              |                    |
        |------------------------>|                         |                    |
        |                         | Invoke Wallet            |                    |
        |                         |------------------------>|                    |
        |                         |                         | Render items,       |
        |                         |                         | request consent     |
        |                         |                         |------------------->|
        |                         |                         | Holder decisions    |
        |                         |                         |<-------------------|
        |                         |                         | Build SMART response|
        |                         | Presentation response carrying SMART response    |
        |                         |<------------------------|                    |
        | Receive presentation response                      |                    |
        |<------------------------|                         |                    |
        | Validate transport, extract and validate SMART response                  |
        | Consume SMART response for local workflow                              |
```

Clinical-content objects in this diagram are the SMART request and SMART response. Digital Credentials API calls, mdoc structures, encryption, and session-binding data are presentation-transport objects.

#### 3.4.2 Cross-device kiosk flow

```text
Kiosk creator     Submission service     Phone presenter     Browser/UA      Wallet/Responder     Holder     Completion display
      |                    |                    |                |                |              |                 |
      | Create SMART request and kiosk payload with smartRequest                 |              |                 |
      | Sign/encrypt request wrapper        |                |                |              |                 |
      | Store encrypted request             |                |                |              |                 |
      |------------------->|                    |                |                |              |                 |
      | Display Pointer URL / QR             |                |                |              |                 |
      |                    |<--- resolve pointer|                |                |              |                 |
      |                    |--- encrypted req -->|                |                |              |                 |
      |                    |                    | Validate wrapper; obtain embedded SMART request  |              |                 |
      |                    |                    | Re-enter same-device presentation flow on phone  |              |                 |
      |                    |                    |--------------->|                |              |                 |
      |                    |                    |                | Invoke Wallet  |              |                 |
      |                    |                    |                |--------------->|              |                 |
      |                    |                    |                |                | Holder review |                 |
      |                    |                    |                |                |------------->|                 |
      |                    |                    |                |                | Decisions    |                 |
      |                    |                    |                |                |<-------------|                 |
      |                    |                    |                | SMART response |              |                 |
      |                    |                    |<---------------|<---------------|              |                 |
      |                    |<-- encrypted submission ------------|                |              |                 |
      | Completion notification or retrieval |                    |                |              |                 |
      |-------------------------------------------------------------------------->|
      |                    |                    |                |                |              |   Decrypt, validate, display completion
```

The kiosk wrapper ends at the point where the Phone presenter has obtained the embedded SMART request and invokes the same-device presentation flow. The wrapper resumes only after the phone has a SMART response to encrypt and submit for the Completion display.

### 3.5 Trust boundaries

SMART Health Check-in intentionally exposes trust boundaries rather than collapsing them into one credential success signal.

- **Clinical content boundary**: The SMART request and SMART response carry clinical semantics. Validation of request shape, selector meaning, Artifact media type, fulfillment links, and per-item status is separate from validation of the transport envelope.
- **Origin and user-agent boundary**: In the same-device flow, the Browser / User Agent supplies the API surface and origin context used by the Verifier and Wallet. Origin information can help the Wallet and Holder understand the requesting context, but it is not requester identity inside the SMART request body.
- **Verifier / reader boundary**: A Verifier can present transport-level evidence or reader authentication where supported. That evidence is evaluated separately from the Requester's clinical need and separately from issuer evidence in returned Artifacts.
- **Wallet / Holder boundary**: The Wallet mediates Holder review and consent. The Holder may approve, decline, partially satisfy, or be unable to satisfy request items. Those outcomes are first-class response states, not necessarily protocol failures.
- **Holder data source boundary**: The Wallet can draw from one or more Holder data sources. The protocol does not assume that all sources have equal provenance, freshness, or issuer trust. Raw FHIR JSON is not equivalent to issuer-signed clinical credentials unless separate provenance or signature evidence is present.
- **Kiosk relay boundary**: In the cross-device kiosk flow, the Submission service and pointer transport are not trusted with plaintext clinical content. They can observe and process relay metadata, so later privacy and security sections constrain encryption, replay, expiration, and metadata handling.
- **Completion boundary**: The Completion display learns only what it can decrypt and validate for the kiosk session. It must not treat an arbitrary relay notification as proof that a valid SMART response was submitted.

Later §7 defines the trust framework in more detail. Later §11 addresses security considerations such as replay, origin spoofing, reader impersonation, ciphertext swapping, and plaintext leakage. Later §12 addresses privacy considerations such as data minimization, linkability, Holder display, retention, and telemetry.

### 3.6 Design principles and normative pointers

The following principles guide the detailed requirements in later sections. They are stated here to keep the architecture coherent; the actual conformance language belongs in the referenced normative sections and Appendix A.

#### 3.6.1 One docType, one namespace, one stable element

The base same-device presentation flow should remain simple to invoke, implement, test, and certify. Version 1.0 uses a direct `org-iso-mdoc` binding with one versioned docType, one namespace, and one stable element carrying the SMART response. §8 defines the exact identifiers, request carrier, response element, SessionTranscript handling, encryption, and validation checklist. §13 records registry considerations.

#### 3.6.2 No requester identity in clinical request body

The SMART request is a clinical content request, not a requester identity credential, consent directive, authorization grant, or reader authentication object. Requester identity, origin context, reader or Verifier authentication, and session freshness belong to the presentation and trust layers. §5 defines the SMART request fields; §7 defines trust processing; §8 and §9 define how version 1.0 flows carry and bind the request.

#### 3.6.3 FHIR canonicals where they fit

FHIR-native identifiers should be used where they describe the requested content. Exact FHIR `StructureDefinition` canonicals belong in `profiles[]`; profile-family canonical URLs belong in `profilesFrom[]`; official FHIR resource-type names belong in resource-type selectors; Questionnaire canonicals and inline Questionnaires belong in the questionnaire selector model. §5 defines exact selector syntax and canonical `|version` handling, and Appendix H maps the model to FHIR R4 idioms.

#### 3.6.4 No local topic vocabularies when FHIR terms exist

The profile is designed for many-to-many interoperability across EHRs and Wallets. Private topic strings should not replace FHIR canonicals, profile families, resource types, or Questionnaire references when those existing terms fit the request. Extension selectors remain possible, but §4 and §13 should make them explicit, registered or reviewable, and forward-compatible rather than silent local vocabularies.

#### 3.6.5 Response forms expressed as media types

A Requester expresses what response forms it can process through accepted media types, and a Wallet declares each Artifact's `mediaType`. This keeps response packaging explicit and avoids inferring clinical meaning from transport envelopes. §5 defines accepted media type expression, §6 defines Artifact media-type rules, and §13 covers media-type registry or reference considerations.

#### 3.6.6 Artifact-centered response with per-item status

The response model centers on Artifacts and status accounting. Artifacts contain or reference returned clinical content; fulfillment links identify which request items they satisfy; per-item status explains fulfilled, declined, partial, unavailable, unsupported, or error outcomes as defined by §6. This supports Holder choice, partial responses, and realistic many-to-many clinical packaging.

#### 3.6.7 Explicit FHIR version on raw FHIR JSON

When an Artifact carries raw FHIR JSON, the response needs an explicit way to identify the FHIR version so Verifiers and downstream systems can validate and process the content correctly. §6 defines the Artifact rules for raw FHIR JSON and distinguishes them from SMART Health Cards and other signed or packaged formats.

#### 3.6.8 Retention is a clinical-workflow decision, not a transport default

Check-in often feeds regulated clinical or administrative workflows that may require retention, audit, reconciliation, or staff review outside this protocol. The transport should not silently impose a universal delete-immediately rule, and the protocol should not define longitudinal Wallet storage or EHR write-back. §12 addresses data minimization, retention defaults, Holder expectations, and telemetry; local law and deployment policy control downstream recordkeeping.

#### 3.6.9 Crypto agility via profile registry, not in-band negotiation

Cryptographic and transport agility should be achieved through named profiles, versioning, registries, and future bindings rather than ad hoc in-band negotiation inside a SMART request. A SMART request should not become a menu of cryptographic preferences. §4 defines conformance and versioning, §§8-9 define the version 1.0 cryptographic constructions for the same-device and kiosk flows, §10 reserves future OID4VP mapping work, and §13 records registry considerations.

## Organizer notes

### Strengths

- Establishes the key invariant that the clinical content model is transport-neutral and that kiosk is a wrapper/re-entry pattern, not a separate clinical protocol.
- Uses accepted T1.A terminology consistently, including Requester, Verifier, Wallet/Responder, Holder, Kiosk creator, Submission service, Phone presenter, and Completion display.
- Preserves the T1.B three-layer framing and explicitly names direct `org-iso-mdoc` over W3C Digital Credentials API as the base same-device presentation flow.
- Gives downstream sections clear responsibility boundaries: §§5-6 for clinical objects, §7 for trust, §8 for same-device binding, §9 for kiosk, §§11-12 for security and privacy, and §13 for registries.

### Caveats

- This attempt keeps §3 informative and uses normative pointers instead of BCP 14 keywords, even though the outline says some design principles may later be restated as SHALL/SHOULD rules.
- The sequence diagrams intentionally omit byte-level mdoc, HPKE, JWS, and SessionTranscript details; those belong in §§8-9 and appendices.
- The retention principle may need final privacy review so it does not read as a requirement to retain clinical content.

### Downstream dependencies

- §5 must define SMART request fields, selector rules, `profilesFrom[]` array shape, profile-selector additivity, `resourceTypes[]` interaction, and the prohibition on requester identity metadata in the clinical request body.
- §6 must define SMART response binding, Artifact shape, media-type handling, per-item status coverage, many-to-many fulfillment, and raw FHIR JSON version rules.
- §7 must separate origin trust, Verifier/reader trust, issuer/device evidence, and clinical-content provenance.
- §8 must define the direct `org-iso-mdoc` same-device binding precisely enough for validation and byte-level tests.
- §9 must preserve kiosk direct `smartRequest` embedding, pointer-to-payload binding, phone same-device re-entry, untrusted Submission service treatment, encrypted submission, replay controls, and Completion display validation.
- §§11-12 must expand the trust-boundary bullets into security and privacy requirements without changing the clinical semantics defined in §§5-6.
