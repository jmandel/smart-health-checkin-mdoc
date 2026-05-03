## 1.1 Abstract

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share bounded clinical content for an administrative or clinical workflow. The specification separates a transport-neutral clinical content model, expressed as a SMART request and SMART response, from presentation transport. Version 1.0 defines a base same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API and an optional cross-device kiosk flow in which a Kiosk creator displays a pointer, a Phone presenter resolves it, re-enters the same-device presentation flow on the phone, and returns an encrypted submission for a Completion display. The profile standardizes request items, FHIR-native selectors, accepted media types, Artifacts, fulfillment links, per-item status, role contracts, and trust boundaries so multiple Requesters, Verifiers, Wallets, and kiosk deployments can interoperate without a shared private vocabulary or a second kiosk-specific clinical protocol.

## 3. Architectural overview

SMART Health Check-in is layered so clinical meaning remains stable while presentation transports provide carriage, proof, encryption, freshness, and deployment-specific trust signals. This section is informative architecture with normative pointers. Requirements for conformance targets are stated in later normative sections, especially §§4–9, §11, §12, and Appendix A.

The architectural invariant is simple: the SMART request and SMART response are the clinical protocol. The same-device presentation flow carries them directly using `org-iso-mdoc` over the W3C Digital Credentials API. The cross-device kiosk flow wraps the same-device flow so a kiosk or desktop can start a check-in that is completed on the Holder's phone; it does not define a second clinical request language.

### 3.1 Two payload domains: clinical content vs. presentation transport

The specification uses two payload domains that are intentionally related but not interchangeable:

1. the **clinical content domain**, consisting of the SMART request and SMART response JSON objects; and
2. the **presentation transport domain**, consisting of the mdoc, Digital Credentials API, kiosk wrapper, cryptographic, relay, and completion artifacts that carry or protect those JSON objects.

A component that processes both domains should treat the boundary as a protocol seam. Clinical-content rules determine what was requested, what was returned, which request items were fulfilled, which media types were used, and what per-item outcomes were reported. Presentation-transport rules determine how the request and response are conveyed, bound to a session, encrypted, authenticated, or relayed.

Transport success is not the same as clinical success. A valid same-device presentation can return a SMART response in which some request items are declined, unavailable, unsupported, partial, or otherwise not fulfilled. Conversely, a syntactically plausible SMART response is not acceptable to a Verifier unless the presentation transport and relevant trust checks for the flow also validate.

#### 3.1.1 Clinical content domain

The clinical content domain is the transport-neutral SMART Health Check-in JSON model defined in §§5–6.

A **SMART request** describes a bounded check-in request. It identifies request items, user-facing context, accepted response media types, and content selectors. Selectors can use FHIR-native identifiers, including exact profile canonicals in `profiles[]`, profile-family canonicals in `profilesFrom[]`, resource type names, Questionnaire references, inline Questionnaires, or registered extension selector kinds. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either can identify acceptable profile matches, subject to the rest of the item definition and the detailed selector rules in §5.

A **SMART response** reports the Wallet/Responder's result for the request. It binds to the request, returns zero or more Artifacts, links Artifacts to request items they fulfill, and reports per-item status. Artifacts are centered on declared `mediaType` values rather than transport-specific object classes. One Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts.

The clinical content domain deliberately excludes requester identity metadata. The `purpose` and request item display fields give Holder-facing context, but the SMART request body is not a credential about the Requester, an authentication assertion, a persistent authorization grant, or a substitute for presentation-transport trust. Later sections define where origin, Verifier, reader, issuer, device, and clinical-source evidence appear.

The same SMART request has the same clinical meaning when carried by the same-device presentation flow, by the cross-device kiosk flow, or by a future binding. A transport binding can constrain size, encoding, proof, freshness, or validation behavior, but it does not redefine request item semantics, selector meaning, consent granularity, Artifact media types, or response status semantics.

#### 3.1.2 Presentation transport domain

The presentation transport domain carries and protects the clinical content model.

For version 1.0, the base presentation transport is the **same-device presentation flow** using direct `org-iso-mdoc` over the W3C Digital Credentials API. The Verifier constructs a presentation request that carries the SMART request in the mdoc binding. The Browser / User Agent mediates the Digital Credentials API surface. The Wallet/Responder processes the request, obtains Holder review according to its policies, constructs a SMART response, and returns it through the same presentation flow. Section 8 defines the byte-level and validation details, including the mdoc profile identifiers, request carrier, response carrier, encryption, and required Verifier checks.

The **cross-device kiosk flow** adds wrapper artifacts around the same clinical request and the same same-device presentation flow. A Kiosk creator signs and arranges encryption for a kiosk request payload that embeds the SMART request directly as `smartRequest`. A Pointer URL, commonly displayed as a QR code, lets a Phone presenter locate the encrypted request. After resolving and validating the pointer and kiosk payload, the phone re-enters the same-device presentation flow locally for the embedded SMART request. The resulting SMART response is submitted in an encrypted form for the Completion display. The Submission service and pointer transport are transport infrastructure, not clinical Requesters and not trusted recipients of plaintext clinical content.

The presentation transport domain can include identifiers, nonces, origin information, reader or Verifier authentication, issuer or device evidence, HPKE ciphertexts, JWS signatures, mdoc structures, relay records, and completion notifications. These artifacts exist to carry, protect, bind, or validate the clinical content; they are not themselves SMART requests or SMART responses unless a later section explicitly identifies an embedded JSON value as such.

### 3.2 Two end-to-end flows

Version 1.0 defines two end-to-end flows. The same-device presentation flow is the base flow. The cross-device kiosk flow is an optional wrapper that creates a cross-device initiation and completion path while preserving same-device presentation on the phone.

#### 3.2.1 Same-device presentation flow

In the same-device presentation flow, the Holder is using a device that can both access the Requester's page and invoke the Wallet. The Requester and Verifier are often components of the same portal, EHR, payer, intake, or scheduling application, but the roles remain distinct: the Requester creates and consumes the clinical content; the Verifier invokes and validates the presentation transport.

At a high level:

1. The Requester determines the bounded check-in need and constructs a SMART request.
2. The Verifier packages the SMART request into the direct `org-iso-mdoc` W3C Digital Credentials API request defined in §8.
3. The Browser / User Agent mediates the request to an available Wallet.
4. The Wallet/Responder displays or otherwise processes the request for Holder review according to Wallet policy and applicable law.
5. The Wallet/Responder gathers or constructs responsive Artifacts from Holder data sources and creates a SMART response.
6. The Wallet/Responder returns the response through the same-device presentation transport.
7. The Verifier validates transport artifacts and validates the SMART response before the Requester consumes it.

This flow has no kiosk pointer, no Submission service, and no cross-device relay. It is the normative base for version 1.0 presentation and the flow the kiosk path reuses on the phone.

#### 3.2.2 Cross-device kiosk flow as wrapper/re-entry

The cross-device kiosk flow supports cases where check-in begins on a kiosk, staff desktop, shared tablet, or other device that should not directly receive Wallet-mediated clinical content from the Holder's phone. The kiosk side creates a pointer; the phone resolves the pointer; the phone runs the same-device presentation flow; the phone submits an encrypted result for the kiosk-side Completion display.

At a high level:

1. The Kiosk creator constructs the SMART request for the check-in session.
2. The Kiosk creator embeds that SMART request directly as `smartRequest` in the signed kiosk request payload. It does not embed a demo preset, preset name, SDK helper object, or request wrapper in place of the SMART request.
3. The Kiosk creator arranges request-envelope encryption and publishes or stores only the protected kiosk request state through a Submission service or similar provider.
4. The kiosk displays a Pointer URL, commonly as a QR code.
5. The Phone presenter obtains the Pointer URL, resolves it, retrieves the encrypted kiosk request, and validates the wrapper according to §9.
6. The Phone presenter obtains the embedded SMART request and re-enters the same-device presentation flow locally on the phone.
7. The Wallet/Responder returns a SMART response through the same-device flow on the phone.
8. The Phone presenter encrypts and submits the result for the Completion display through the Submission service.
9. The Completion display obtains the encrypted submission, decrypts and validates it, and presents completion state to the local workflow.

The kiosk flow is therefore a wrapper and re-entry pattern. Its protocol value is pairing, protection, relay tolerance, and completion coordination. Its clinical content is still the embedded SMART request and the resulting SMART response.

### 3.3 Roles and component contracts, protocol-level only

This specification defines roles, not product architectures. One product can perform several roles, and one role can be split across several deployed components, provided the protocol obligations for each role are met. Product user interfaces, local databases, EHR ingestion pipelines, staff workflows, Wallet storage models, and platform-specific APIs are outside these role contracts unless a later normative section defines a protocol-visible effect.

#### 3.3.1 Requester / Verifier

The **Requester** asks for clinical content and consumes the resulting SMART response. Its protocol contract is to construct a SMART request that accurately represents the bounded workflow need, uses the clinical content model, advertises accepted media types, and avoids embedding requester identity metadata in the clinical request body.

The **Verifier** performs the presentation-transport role. Its protocol contract is to construct the presentation request, invoke the same-device presentation flow, receive the presentation response, validate transport artifacts, extract the SMART response, and apply clinical response validation before passing results to the Requester or downstream systems.

The same relying-party system often plays both roles. Keeping the names separate prevents confusion between clinical semantics and presentation proof. A Requester can know what clinical content it needs without defining the mdoc envelope; a Verifier can validate an envelope without making local clinical ingestion decisions.

#### 3.3.2 Browser / User Agent

The **Browser / User Agent** exposes the W3C Digital Credentials API surface and mediates invocation of a Wallet or credential provider. This specification relies on the Browser / User Agent to provide the API and origin context assumed by the same-device flow, but it does not define browser conformance beyond the assumptions and normative pointers in the relevant flow sections.

The Browser / User Agent is a trust boundary. It may influence wallet discovery, origin presentation, user mediation, and API availability, but the SMART request and SMART response semantics remain defined by §§5–6 rather than by browser UI or platform routing choices.

#### 3.3.3 Wallet / Responder

The **Wallet** is software controlled by or acting for the Holder. In this specification the Wallet is the usual **Responder**. Its protocol contract is to receive a SMART request through the selected flow, process request items for Holder review according to Wallet policy, gather or construct responsive Artifacts from Holder data sources, create a SMART response, and return it through the selected presentation transport.

The Wallet/Responder is not required by this architecture to be a longitudinal health-record store, a credential issuer, a FHIR server, or an EHR. It may use local credentials, SMART Health Cards, cached FHIR resources, connected services, issuer-provided credentials, or other Holder data sources. Issuance, synchronization, backup, account recovery, and completeness of those sources are outside this specification.

#### 3.3.4 Holder data source

A **Holder data source** is wallet-internal or deployment-specific source material used by the Wallet/Responder to construct Artifacts. It can include credentials, signed health cards, raw FHIR resources, cached data, connected-service data, or other patient-mediated information.

The Holder data source is abstracted out of the protocol. The clinical content model constrains the shape and accounting of the response; it does not dictate where the Wallet obtained the content or guarantee that the content is complete, current, clinically correct, or signed by a clinical source. Later trust sections distinguish transport proof from clinical-source provenance.

#### 3.3.5 Kiosk creator

The **Kiosk creator** starts a cross-device kiosk flow. Its protocol contract is to create the SMART request, embed it directly as `smartRequest` in the kiosk request payload, sign the payload, arrange encryption for the request envelope, and produce a Pointer URL for the Phone presenter.

The Kiosk creator may be part of the Requester, Verifier, kiosk desktop, staff workstation, or server-side check-in application. Regardless of deployment shape, it must preserve the architectural invariant that the kiosk payload contains the SMART request directly rather than a demo preset or alternate kiosk-specific clinical request.

#### 3.3.6 Submission service

The **Submission service** is an untrusted relay or provider for encrypted kiosk state. It can store, forward, or make available encrypted request and response blobs, rows, notifications, or completion records. It is not trusted with plaintext clinical content and is not the clinical Requester merely because it relays data.

The Submission service contract is intentionally narrow. It provides availability and routing for protected wrapper artifacts. Confidentiality, integrity, origin, freshness, pairing, and replay protections are supplied by the kiosk wrapper rules in §9 and the security considerations in §11, not by trusting the relay with clinical plaintext.

#### 3.3.7 Phone presenter

The **Phone presenter** is the phone-side component in the cross-device kiosk flow. Its protocol contract is to obtain the Pointer URL, resolve the encrypted kiosk request, validate wrapper protections, verify pointer-to-payload binding as defined in §9, extract the embedded SMART request, and invoke or participate in the same-device presentation flow on the phone.

After the Wallet/Responder returns a SMART response through the same-device flow, the Phone presenter encrypts and submits the result for the Completion display. The Phone presenter is the re-entry point that makes kiosk a wrapper around same-device presentation rather than a parallel clinical protocol.

#### 3.3.8 Completion display

The **Completion display** is the kiosk-side or desktop component that receives notification of an encrypted submission, decrypts and validates the returned SMART response as authorized for the kiosk session, and presents completion state to staff, to the Holder, or to another local workflow.

Completion display behavior after validation is largely local workflow. This specification can define protocol-visible validation, decryption, pairing, replay, and error-handling requirements; it does not define EHR write-back, clinical reconciliation, persistence, staff task routing, or user-interface layout.

### 3.4 Sequence diagrams in Markdown/text form

The following diagrams are explanatory. Later sections define exact encodings, cryptographic inputs, validation steps, and conformance requirements.

#### 3.4.1 Same-device presentation flow

```text
Requester          Verifier page        Browser / UA          Wallet/Responder        Holder
    |                   |                    |                       |                   |
    | Create SMART      |                    |                       |                   |
    | request           |                    |                       |                   |
    |------------------>|                    |                       |                   |
    |                   | Build direct       |                       |                   |
    |                   | org-iso-mdoc DC    |                       |                   |
    |                   | API request        |                       |                   |
    |                   |------------------->|                       |                   |
    |                   |                    | Mediate credential    |                   |
    |                   |                    | request               |                   |
    |                   |                    |---------------------->|                   |
    |                   |                    |                       | Render/request     |
    |                   |                    |                       | Holder decision    |
    |                   |                    |                       |<----------------->|
    |                   |                    |                       | Build SMART        |
    |                   |                    |                       | response           |
    |                   |                    |<----------------------|                   |
    |                   | Validate transport |                       |                   |
    |                   | and SMART response |                       |                   |
    |<------------------|                    |                       |                   |
    | Consume response  |                    |                       |                   |
```

Key properties:

- The SMART request and SMART response are the only clinical content-domain protocol objects in the flow.
- The direct `org-iso-mdoc` W3C Digital Credentials API presentation is the version 1.0 base transport.
- Holder review and Wallet response construction occur before the Verifier consumes the response.
- Verifier validation covers both presentation transport and clinical response rules.

#### 3.4.2 Cross-device kiosk flow

```text
Kiosk creator     Submission service      Completion display      Phone presenter       Wallet/Responder      Holder
      |                    |                       |                     |                    |              |
      | Create SMART       |                       |                     |                    |              |
      | request            |                       |                     |                    |              |
      | Embed as           |                       |                     |                    |              |
      | smartRequest;      |                       |                     |                    |              |
      | sign/encrypt       |                       |                     |                    |              |
      |------------------->| Store encrypted       |                     |                    |              |
      |                    | kiosk request         |                     |                    |              |
      | Display Pointer URL / QR                  |                     |                    |              |
      |----------------------------------------------------------------->|                    |              |
      |                    |                       |                     | Resolve pointer    |              |
      |                    |<--------------------------------------------|                    |              |
      |                    | Return encrypted kiosk request              |                    |              |
      |                    |-------------------------------------------->|                    |              |
      |                    |                       |                     | Validate wrapper;  |              |
      |                    |                       |                     | extract SMART      |              |
      |                    |                       |                     | request            |              |
      |                    |                       |                     |                    |              |
      |                    |                       |                     | Re-enter same-device presentation flow       |
      |                    |                       |                     |----------------------------------->|          |
      |                    |                       |                     |                    | Holder review      |
      |                    |                       |                     |                    |<----------------->|
      |                    |                       |                     |<-----------------------------------|          |
      |                    |                       |                     | Encrypt submission |              |
      |                    |<--------------------------------------------|                    |              |
      |                    | Notify / make encrypted submission available|                    |              |
      |                    |---------------------->|                     |                    |              |
      |                    |                       | Decrypt, validate,  |                    |              |
      |                    |                       | show completion     |                    |              |
```

Key properties:

- The Pointer URL is transport metadata, not the SMART request.
- The kiosk request payload embeds the SMART request directly as `smartRequest`.
- The Submission service sees protected wrapper artifacts, not plaintext clinical content.
- The Phone presenter calls back into the same-device presentation flow on the phone.
- The Completion display receives an encrypted submission and validates it for the kiosk session before showing completion state.

### 3.5 Trust boundaries

SMART Health Check-in separates trust boundaries so deployments can compose policy without confusing one kind of evidence for another.

**Clinical-content boundary.** The SMART request and SMART response define clinical meaning and response accounting. They do not, by themselves, prove the real-world identity of the Requester, the authority of a Holder, the provenance of every Artifact, or the clinical sufficiency of returned data.

**Origin and user-agent boundary.** In the same-device flow, the Browser / User Agent provides the API surface and origin context for the Verifier page. Origin trust can help a Holder and Wallet understand where the request came from, but origin alone is not equivalent to clinical trust, reader authorization, issuer trust, or artifact provenance.

**Verifier / reader boundary.** The Verifier constructs and validates presentation transport. Reader or Verifier authentication, when present, establishes properties of the requesting application or organization according to the trust framework in §7 and the binding rules in §8. It is distinct from the `purpose` field and other user-facing text in the SMART request.

**Wallet and Holder boundary.** The Wallet mediates Holder review and response construction. The Holder may decline any request item, approve only some items, or have no available responsive content. Such outcomes are first-class check-in results, not necessarily transport failures.

**Holder data source boundary.** The Wallet may rely on various Holder data sources. A returned Artifact's declared media type and any signatures, provenance, issuer evidence, or source metadata associated with that Artifact determine what a Verifier can infer about clinical-source trust. Raw FHIR JSON without separate provenance is not made equivalent to issuer-signed clinical credentials by being carried in a valid presentation.

**Kiosk relay boundary.** In the cross-device kiosk flow, the Submission service and pointer transport are untrusted for plaintext clinical content. The kiosk wrapper must protect request confidentiality and integrity, bind pointer and payload, prevent or detect replay and substitution as required by §9, and encrypt the phone's submission for the Completion display.

**Completion boundary.** The Completion display is trusted only after it decrypts and validates a submission for the intended kiosk session. What it does after completion—such as staff display, EHR ingestion, reconciliation, retention, or audit—is outside the protocol except where later sections define security or privacy requirements for retained protocol artifacts.

### 3.6 Design principles and normative pointers

The following principles guide the normative sections. They are not a substitute for the detailed requirements in those sections, but later sections should preserve them and Appendix A should index the corresponding one-row-per-rule requirements.

#### 3.6.1 One docType, one namespace, one stable element

The same-device presentation flow should expose a small, stable mdoc surface for SMART Health Check-in rather than a proliferation of transport-specific clinical elements. Section 8 defines the version 1.0 direct `org-iso-mdoc` identifiers, including the document type, namespace, request carrier, and response element. Future changes should use versioning and registry rules in §§4 and 13 rather than ad hoc alternate element names for the same semantics.

#### 3.6.2 No requester identity in clinical request body

The SMART request body describes requested clinical content and Holder-facing purpose; it is not a requester identity credential. Requester, Verifier, reader, origin, and organizational trust signals belong in presentation transport, trust framework, or deployment policy layers. Section 5 defines prohibited requester-identity metadata in the clinical request body, and §§7–8 define relevant trust and presentation validation.

#### 3.6.3 FHIR canonicals where they fit

Clinical content selection should use FHIR canonicals when the requested content maps to FHIR conformance resources. Exact profiles belong in `profiles[]`; profile families belong in `profilesFrom[]`; Questionnaire canonicals identify questionnaire content where applicable. Section 5 defines canonical handling, including `|version` behavior and the array shape of `profilesFrom[]`.

#### 3.6.4 No local topic vocabularies when FHIR terms exist

Requesters should not invent local topic names for content that can be expressed using FHIR resource types, profile canonicals, profile-family canonicals, or Questionnaire identifiers. Extension selector kinds are available for real gaps, but §5 and §13 should keep those extensions registered and distinguishable from FHIR-native selectors.

#### 3.6.5 Response forms expressed as media types

A request item's acceptable response forms are expressed as media types. A response Artifact declares the media type actually returned. This keeps clinical packaging explicit and avoids making transport envelopes stand in for clinical content type. Sections 5, 6, and 13 define accepted media types, Artifact media-type rules, and registration expectations.

#### 3.6.6 Artifact-centered response with per-item status

The response model is Artifact-centered and status-explicit. Artifacts carry or reference clinical content and identify the request items they fulfill. Separately, `requestStatus[]` accounts for every request item, including declined, unavailable, unsupported, partial, and error outcomes when defined in §6. This supports realistic many-to-many fulfillment without requiring Wallets to duplicate or reshape clinical payloads solely to mirror request-item boundaries.

#### 3.6.7 Explicit FHIR version on raw FHIR JSON

When an Artifact returns raw FHIR JSON, the response needs enough information for the Verifier to interpret it under the intended FHIR release. Section 6 defines the explicit FHIR-version requirement for raw FHIR JSON and distinguishes that requirement from response forms such as SMART Health Cards whose own format defines how FHIR content is represented.

#### 3.6.8 Default-to-retention for clinical workflows

Check-in content is often needed by downstream administrative or clinical workflows after the presentation session ends. The protocol should therefore assume that a Requester may retain received SMART responses and Artifacts according to applicable law, policy, and the workflow's stated purpose unless a later profile narrows that behavior. Privacy requirements in §12 should focus on minimization, transparency, appropriate retention controls, and avoidance of unnecessary telemetry rather than pretending every check-in is ephemeral.

#### 3.6.9 Crypto agility via profile registry, not in-band negotiation

Cryptographic agility should be achieved through named profiles, versioning, and registries rather than unbounded in-band negotiation inside clinical request bodies. Sections 4, 8, 9, 11, and 13 define which algorithms and profiles are used by a conforming version 1.0 implementation, how optional or future profiles are identified, and how deployments avoid downgrade or confusion attacks.

## Organizer notes

### Strengths

- Keeps the three-layer framing visible and makes kiosk explicitly a wrapper/re-entry flow, not a second clinical protocol.
- Uses accepted T1.A terminology consistently: clinical content model, SMART request, SMART response, Requester, Verifier, Wallet/Responder, Holder, Kiosk creator, Submission service, Phone presenter, and Completion display.
- Places `profilesFrom[]`, profile-selector additivity, direct `org-iso-mdoc`, and direct `smartRequest` embedding in the architecture foundation without over-specifying §5, §8, or §9 details.
- Provides sequence diagrams that can be copied into the final Markdown source without generated assets.

### Caveats

- §3 is marked informative with normative pointers, so the organizer should avoid turning these principles into duplicate SHALL statements unless the corresponding normative sections own the exact rule.
- The “default-to-retention” principle is intentionally opinionated; §12 should balance it with data minimization, transparency, and deployment policy.
- Browser / User Agent language is deliberately limited to protocol assumptions to avoid defining W3C Digital Credentials API conformance in this specification.

### Downstream dependencies

- §4 should map conformance classes to the role contracts in §3.3 without inventing browser conformance beyond stated assumptions.
- §5 should make `profilesFrom[]` an array of canonical profile-family URLs and preserve additive semantics for `profiles[]` plus `profilesFrom[]`.
- §6 should define Artifact media-type rules, `requestId` binding, many-to-many fulfillment, per-item status coverage, and raw FHIR JSON version requirements.
- §7 should preserve the separate trust boundaries for origin, Verifier/reader, issuer/device evidence, and clinical-source provenance.
- §8 should define the direct `org-iso-mdoc` same-device flow as the base presentation flow.
- §9 should embed the SMART request directly as `smartRequest`, treat the Submission service as untrusted for plaintext, and route phone resolution back into the same-device flow.
- §§11–12 should elaborate security and privacy controls for the trust boundaries summarized here.
