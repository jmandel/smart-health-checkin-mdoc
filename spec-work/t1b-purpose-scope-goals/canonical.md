## 1.2 Scope

SMART Health Check-in 1.0 defines an interoperability profile for patient-mediated check-in. A Requester asks a Holder, through a Wallet, to share clinical content needed for a bounded administrative or clinical workflow, and receives a structured SMART response that can be validated and consumed by the Requester's systems.

The profile fixes the shared protocol surface that otherwise varies across EHRs, patient portals, kiosk systems, payer-facing workflows, and Wallet platforms:

1. the **clinical content model**, consisting of the transport-neutral SMART request and SMART response;
2. the base **same-device presentation flow**, using direct `org-iso-mdoc` over the W3C Digital Credentials API; and
3. the optional **cross-device kiosk flow**, which wraps the same-device presentation flow for front-desk and shared-device deployments.

The clinical content model defines request items, user-facing purpose and item text, accepted response media types, content selectors, returned Artifacts, fulfillment links, and per-item status reporting. The same SMART request has the same clinical meaning whether it is carried by the same-device presentation flow, by the cross-device kiosk flow, or by a future binding. Presentation transports can add origin context, reader or Verifier information, encryption, freshness, device evidence, relay behavior, and validation rules; they do not change request item semantics, selector meaning, consent granularity, Artifact media types, or response status semantics.

Version 1.0 defines the same-device presentation flow as the base presentation flow. In that flow, a Verifier carries the SMART request and receives the SMART response through direct `org-iso-mdoc` presentation over the W3C Digital Credentials API on the same device where the Wallet is available.

Version 1.0 also defines the cross-device kiosk flow. A Kiosk creator prepares a pointer to a signed and encrypted kiosk request. The Phone presenter resolves the pointer, obtains a kiosk request payload that embeds the SMART request directly as `smartRequest`, re-enters the same-device presentation flow locally on the phone, and submits an encrypted result for the Completion display. The kiosk flow is a wrapper around the same-device presentation flow; it is not a second clinical protocol. Demo presets, preset names, SDK helper objects, and request-wrapper shortcuts are not protocol payloads in place of the embedded SMART request.

The profile standardizes clinical content selection conventions so a Requester can ask for familiar FHIR-shaped data without inventing local topic vocabularies. Request items can use FHIR-native selectors, including exact profile canonicals in `profiles[]`, profile-family canonicals in `profilesFrom[]`, official FHIR resource-type names, Questionnaire references, inline Questionnaires, and registered extension selectors. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either can identify acceptable profile matches for an item, subject to the rest of the item definition. Later §5 defines the precise selector rules, including interaction with `resourceTypes[]`.

The profile also standardizes the response accounting needed for interoperability. A Wallet can return Artifacts with declared media types, can link each Artifact to one or more request items it fulfills, and can report status for each request item. This supports many-to-many fulfillment: one Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts.

The profile identifies trust seams needed for deployment-specific policy without hard-coding a single national, institutional, or vendor trust model. Later sections distinguish web origin trust, Verifier or reader trust, issuer and device-attestation trust, and trust in the provenance of clinical content.

## 1.3 Out of scope

SMART Health Check-in 1.0 does not define how clinical data, credentials, SMART Health Cards, FHIR resources, mdoc documents, questionnaires, or other Holder data are issued to a Wallet or made available through a Holder data source. Issuer onboarding, credential issuance APIs, credential refresh, issuer lifecycle management, and issuer accreditation are outside this specification.

The specification does not define longitudinal Wallet storage. A Wallet may use local credentials, cached FHIR resources, SMART Health Cards, connected services, issuer-provided credentials, or other Holder data sources, but synchronization, retention policy, account recovery, backup, indexing, background refresh, and permanent personal health record behavior are outside this protocol.

The specification does not define EHR write-back or downstream clinical workflow. It standardizes how a Requester asks for and receives a SMART response. How a receiving EHR, payer system, intake system, or staff workflow imports, reconciles, deduplicates, persists, routes, displays, amends, or acts on returned content is a deployment decision, subject to applicable law and local policy.

The specification does not perform identity proofing. It does not define patient matching, portal enrollment, account binding, legal identity verification, guardian verification, delegation, proxy authority, or authority to act for another person. Presentation flows and returned Artifacts can carry trust signals, but real-world identity and authorization policy remain deployment responsibilities.

The specification does not define payments, eligibility adjudication, claims submission, benefit determination, coverage enrollment, payer-provider contracting, financial authorization, collection, or settlement. Insurance verification use cases are limited to patient-mediated sharing of coverage-related clinical or administrative content as Artifacts.

The specification does not define a general-purpose credential issuance framework, universal wallet portability layer, arbitrary FHIR query language, replacement for SMART App Launch, replacement for FHIR APIs, or replacement for payer transaction standards. It profiles check-in-oriented clinical request and response semantics and the version 1.0 presentation flows that carry them.

Out-of-scope behavior can be implemented by products around this protocol. Such behavior does not change the semantics of a SMART request, a SMART response, the same-device presentation flow, or the cross-device kiosk flow.

## 2.1 Use cases

### 2.1.1 Same-device patient portal check-in

A patient opens an EHR portal, scheduling page, or pre-registration page on a phone or other device that can invoke the patient's Wallet. The portal acts as Requester and Verifier, constructs a SMART request for content such as demographics, coverage, medications, allergies, or a visit-specific questionnaire, and invokes the same-device presentation flow.

The Wallet displays the requested items for Holder review, applies its local policies and Holder decisions, constructs a SMART response, and returns it through direct `org-iso-mdoc` over the W3C Digital Credentials API. This use case motivates a base flow with no cross-device relay and a clinical content model that is independent of any one portal vendor or Wallet implementation.

### 2.1.2 In-person front-desk kiosk check-in

A patient arrives at a clinic and begins check-in at a kiosk, tablet, or staff desktop. The Kiosk creator prepares a signed and encrypted kiosk request payload that embeds the SMART request directly as `smartRequest` and displays a Pointer URL, commonly encoded as a QR code.

The Phone presenter resolves the pointer, obtains and validates the kiosk request, and re-enters the same-device presentation flow on the phone for the embedded SMART request. After Holder review and Wallet response construction, the phone submits an encrypted result for the Completion display. The Submission service and pointer transport are not trusted with plaintext clinical content.

### 2.1.3 Pre-visit intake from a patient phone

Before an appointment, a practice sends the patient a link, portal prompt, message, or other entry point to complete intake on a phone. The SMART request can ask for visit-specific content such as updated medications, allergies, problem list entries, symptoms, insurance information, consents, or completion of an inline or canonical Questionnaire.

This use case motivates per-item consent and per-item status. A Holder may approve some request items and decline others; a Wallet may fulfill some items, report that others are unavailable, and return errors for still others without collapsing the whole interaction into an all-or-nothing result.

### 2.1.4 Insurance verification

A provider, pharmacy, laboratory, imaging center, or administrative workflow asks the Holder for coverage or payer-related information. The request can use exact FHIR profile canonicals in `profiles[]`, profile-family URLs in `profilesFrom[]`, official FHIR resource types, and accepted media types that the Requester can process.

This use case motivates FHIR-native selectors and profile-selector additivity. It does not make eligibility adjudication, claims processing, benefit determination, or payment collection part of this specification.

### 2.1.5 Health summary share for prior-auth or referrals

A care team, specialist, payer, referral destination, second-opinion service, or similar Requester asks the Holder for a focused health summary. The SMART request can identify content using profile families, exact profiles, resource types, questionnaires, or registered extension selectors, and can accept response media types such as raw FHIR JSON or SMART Health Cards where supported.

This use case motivates transport-neutral clinical semantics, many-to-many fulfillment, and layerable trust. A single summary Artifact may fulfill several request items, while one broad request item may be fulfilled by separate medication, problem, allergy, immunization, coverage, or result Artifacts.

## 2.2 Why a check-in protocol vs. plain credential issuance/presentation

Plain credential issuance answers how data or credentials become available to a Holder or Wallet for later use. Check-in asks a different question: what a specific Requester needs for a specific workflow now, how that request is displayed to the Holder, what subset the Holder permits, and how the response is correlated back to the request.

Plain credential presentation is also insufficient by itself. Presentation protocols can prove possession, protect transport, and support Verifier trust, but they do not inherently define a FHIR-native request vocabulary, item-level Holder review, accepted clinical media types, per-item status, or fulfillment links between requested items and returned Artifacts.

Without a check-in protocol, each EHR, portal, kiosk product, and Wallet would need private conventions for request topics, profile matching, consent granularity, response packaging, error reporting, and kiosk bridging. Those conventions are difficult to certify and brittle across many Requesters and many Wallet platforms.

SMART Health Check-in supplies the missing clinical request/response layer. The Requester can express desired content using FHIR canonicals, profile families, resource types, questionnaires, and registered extension selectors. The Wallet can decide how to satisfy the request from available Holder data sources and can return Artifacts with media types the Requester advertised as acceptable. The Verifier and response consumer can validate a predictable response shape before any local ingestion or workflow processing.

The result is intentionally layered. Version 1.0 specifies a base same-device direct `org-iso-mdoc` flow and a cross-device kiosk wrapper that reuses it on the phone. Those flows carry, protect, and validate the clinical content model; they do not replace it.

## 2.3 Goals

### 2.3.1 Transport-neutral clinical content

The SMART request and SMART response define clinical semantics independently of presentation transport. Request items, selectors, accepted media types, Artifacts, fulfillment links, and status semantics retain their meaning when carried by the same-device presentation flow, the cross-device kiosk flow, or a future binding.

### 2.3.2 Per-item user consent

The protocol is designed around Holder review at the granularity of request items. Each item can carry user-facing context, an advisory workflow indication, accepted response media types, and a selector describing the requested content. The SMART response can distinguish fulfilled, declined, partial, unavailable, unsupported, and error outcomes when those statuses are defined in §6. The model avoids forcing all-or-nothing disclosure merely because several check-in needs are bundled into one session.

### 2.3.3 FHIR-native selectors

Requesters should be able to describe clinical content using FHIR-native identifiers where they fit. Exact `StructureDefinition` canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource-type names, supported FHIR versions, Questionnaire canonicals, and inline Questionnaire resources let EHRs and Wallets reason over existing implementation guides and conformance resources rather than private topic names.

### 2.3.4 Many-to-many fulfillment

The response model supports realistic clinical packaging. One Artifact can satisfy several request items, and several Artifacts can satisfy one request item. Per-item status remains explicit even when Artifacts are shared across items or when some items have no Artifact. This avoids requiring Wallets to split, duplicate, or reshape clinical content solely to match request-item boundaries.

### 2.3.5 Interop across multiple EHRs and multiple wallet platforms

The profile aims for many-to-many interoperability. A Requester from one EHR ecosystem should be able to create a SMART request that a Wallet from another ecosystem can understand. A Wallet should be able to construct a SMART response that multiple Requesters can validate without private agreements about field names, local topic vocabularies, kiosk wrappers, or response packaging.

### 2.3.6 Layerable trust

The profile separates trust questions so deployments can compose them. A web origin can establish where a Verifier page came from. Reader or Verifier authentication can establish properties of the requesting application or organization. mdoc issuer and device evidence can establish properties of the presentation container. Artifact signatures, provenance, or other evidence can establish properties of the clinical source. These layers are related but not interchangeable; successful transport presentation does not by itself prove that unsigned clinical content originated from a particular clinical system.

## 2.4 Non-goals

SMART Health Check-in 1.0 is not intended to solve every health-data exchange problem. In particular, it is not a goal to:

- define credential issuance, credential refresh, issuer accreditation, or Wallet enrollment;
- require or standardize longitudinal health-record storage inside Wallets;
- define EHR write-back, clinical reconciliation, deduplication, order entry, staff workflow, or persistence behavior after a SMART response is received;
- prove real-world identity, guardianship, delegation, payer membership, or authority to act for another person;
- define payments, claims, eligibility adjudication, benefit determination, coverage enrollment, financial settlement, or prior-authorization submission;
- prescribe Wallet user-interface layout, clinical wording, clinical summarization policy, or local Holder data source architecture;
- define arbitrary FHIR search, graph traversal, cohort definition, CDS logic, or computable payer-rule evaluation;
- guarantee that returned content is complete, current, clinically correct, or legally sufficient for a downstream workflow;
- make raw FHIR JSON equivalent to issuer-signed clinical credentials when no separate provenance or signature is present;
- make the Submission service trusted with plaintext clinical content;
- define a second kiosk-specific clinical request language distinct from the SMART request; or
- make a reserved future binding, including any OpenID4VP mapping, a required version 1.0 presentation flow.

These non-goals are design constraints. Implementations can build product features around the protocol, but conformance to this specification is about interoperable request construction, Holder-mediated response construction, transport binding behavior, and validation of the resulting protocol artifacts.

## 2.5 Threat model summary

SMART Health Check-in assumes that clinical and administrative check-in information is sensitive, and that request context, metadata, and Holder consent decisions can also be sensitive. Attackers may attempt to observe, replay, delay, substitute, correlate, or modify protocol messages unless protected by the relevant transport, signature, encryption, freshness, and validation rules. Later security and privacy sections provide the detailed treatment; this subsection summarizes the main threats that motivate the design. See §11 for security considerations and §12 for privacy considerations.

For the same-device presentation flow, the main threats include origin spoofing, UI redress, malicious or confused Verifier pages, reader or Verifier impersonation, malformed or replayed presentation requests, profile-confusion attacks, and failure to bind the returned SMART response to the original SMART request and presentation session. The base flow uses W3C Digital Credentials API mediation and direct `org-iso-mdoc` presentation, but those mechanisms must be paired with the validation and trust-processing rules defined later in this specification.

For the cross-device kiosk flow, the main additional threats include QR-code substitution, pointer tampering, relay observation, replay of kiosk requests, ciphertext swapping, confused pairing between a kiosk desktop and a phone, completion spoofing, and leakage through metadata visible to the Submission service. The kiosk wrapper treats the Submission service and pointer transport as untrusted for plaintext clinical content and relies on signed and encrypted wrapper artifacts, pointer-to-payload binding, phone-side validation, same-device re-entry, encrypted submission, expiration, replay controls, and metadata minimization developed in later sections.

For the clinical content model, the main threats include overbroad requests, misleading item descriptions, accidental disclosure, stale or untrusted Holder data sources, response tampering, mismatched request and response identifiers, incorrect fulfillment links, unsupported media types, and overstating the assurance of unsigned clinical content. The model addresses these risks by making request items explicit, supporting per-item Holder decisions and status, declaring Artifact media types, preserving fulfillment links, and keeping transport trust distinct from clinical-source provenance.

The Holder may decline any item, provide partial information, or lack responsive content. Those outcomes are not protocol failures by themselves. They are first-class check-in outcomes that later request, response, security, and privacy sections refine into precise processing and validation rules.
