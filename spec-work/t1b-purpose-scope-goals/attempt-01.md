## 1.2 Scope

SMART Health Check-in 1.0 defines an interoperability profile for patient-mediated clinical check-in. Its purpose is to let a Requester, such as an EHR patient portal, registration workstation, payer-verification workflow, or referral intake application, ask a Holder's Wallet for specific clinical content and receive a structured SMART response that can be validated and consumed consistently across products.

This profile fixes the parts of check-in that otherwise vary across EHRs, portals, kiosks, and Wallet platforms:

- the transport-neutral clinical content model for a SMART request and SMART response;
- the shape of request items, including user-facing purpose and item descriptions;
- FHIR-native content selectors, including exact `profiles[]`, profile-family `profilesFrom[]`, FHIR resource types, and questionnaire selectors;
- the rule that `profiles[]` and `profilesFrom[]` are additive profile selectors rather than narrowing selectors;
- accepted response media types, Artifact metadata, per-item status reporting, and many-to-many fulfillment between request items and returned Artifacts;
- the base same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API;
- the optional cross-device kiosk flow that wraps the same-device flow, hands the phone a pointer to a signed and encrypted kiosk request, re-enters the same-device flow on the phone, and returns an encrypted result for desktop completion; and
- the trust, privacy, security, conformance, registry, schema, and test-vector material needed for independent implementers to converge.

The clinical content model is transport-neutral. A SMART request means the JSON request object defined by this specification, not a browser request, mdoc envelope, kiosk pointer, demo preset, or future OpenID4VP request object. A SMART response means the JSON response object defined by this specification, not a presentation token or transport acknowledgment. The same clinical semantics apply whether the JSON is carried by the version 1.0 same-device `org-iso-mdoc` binding, by the kiosk wrapper that re-enters that binding on the phone, or by a future binding reserved for later work.

The version 1.0 base presentation flow is same-device direct `org-iso-mdoc` over the W3C Digital Credentials API. In that flow, the Verifier invokes the presentation transport on the device where the Wallet is available, carries the SMART request in the presentation request, and receives the SMART response inside the mdoc/DC API binding. The cross-device kiosk flow is in scope only as a wrapper around this base flow. A Kiosk creator embeds the SMART request directly as `smartRequest` in the kiosk request payload; the kiosk payload does not contain a demo preset wrapper, request wrapper, or indirect preset name. The Phone presenter resolves and validates the pointer, obtains the embedded SMART request, and locally runs the same-device presentation flow with the Wallet.

The profile is intended for many-to-many interoperability: many Requesters and EHR systems can ask for content in a common form, many Wallets can interpret and present those requests to Holders, and response consumers can process a common Artifact-centered response. The profile does not assume a single national trust anchor, a single clinical data source, a single EHR vendor workflow, or a single Wallet storage model.

## 1.3 Out of scope

SMART Health Check-in 1.0 does not define how clinical data or credentials are issued to a Holder, synchronized into a Wallet, refreshed, revoked, or stored over time. A Wallet may obtain content from locally stored credentials, SMART Health Cards, cached FHIR resources, connected services, or other Holder data sources, but those mechanisms are outside this protocol.

The following topics are out of scope for this specification except where they are referenced as deployment considerations or future work:

- **Issuance and provisioning.** The profile does not define credential issuance ceremonies, issuer onboarding, wallet enrollment, SMART App Launch authorization, FHIR bulk export, payer member-card issuance, or distribution of longitudinal data into a Wallet.
- **Longitudinal Wallet storage.** The profile does not require a Wallet to retain clinical content, maintain a longitudinal health record, reconcile duplicate resources, perform clinical summarization, or synchronize across devices.
- **EHR write-back and order entry.** The profile defines patient-mediated disclosure to a Requester. It does not define how an EHR files returned data, updates charts, creates orders, changes coverage records, sends messages, or writes back to a source system.
- **Identity proofing and eligibility adjudication.** The profile can carry clinical or coverage content useful to a relying workflow, but it does not define identity proofing, account recovery, biometric enrollment, legal identity verification, insurance eligibility adjudication, or matching a Holder to a local patient record.
- **Payments.** The profile does not define payment authorization, card-present payment flows, claims submission, prior-authorization payment rules, or patient billing.
- **Clinical correctness and medical decision-making.** The profile can convey FHIR resources or SMART Health Cards, but it does not certify that content is complete, current, clinically appropriate, or sufficient for a care decision.
- **General-purpose verifiable credential exchange.** The profile is not a complete credential presentation framework. It uses presentation transports to solve a clinical check-in problem with a specific request/response model.

These exclusions are intentional. A deployment may combine SMART Health Check-in with issuance, patient matching, EHR filing, payment, or identity-proofing products, but interoperability for those adjacent workflows is not established by this document.

## 2.1 Use cases

### 2.1.1 Same-device patient portal check-in

A patient opens an EHR portal, registration site, or payer-facing web page on the same phone or computer where a Wallet is available. The Requester asks for a focused set of content, such as demographics, insurance coverage, medications, allergies, or a QuestionnaireResponse. The Verifier invokes the same-device `org-iso-mdoc` flow through the W3C Digital Credentials API. The Wallet renders the requested items, the Holder approves, declines, or partially approves each item, and the Requester receives a SMART response with Artifacts and per-item status.

This use case is the baseline for the specification. It exercises the transport-neutral SMART request and response model and the base same-device presentation flow without requiring a kiosk relay.

### 2.1.2 In-person front-desk kiosk check-in

A clinic workstation or front-desk kiosk initiates check-in for a patient who is physically present. The Kiosk creator prepares a SMART request, embeds it directly in a signed kiosk payload, encrypts the request envelope, and displays or otherwise provides a Pointer URL, commonly as a QR code. The patient's phone resolves the pointer, validates that the pointer and decrypted payload identify the same request, and re-enters the same-device presentation flow locally on the phone for the embedded SMART request.

The Submission service is treated as an untrusted relay for encrypted blobs and notifications. It is not trusted with plaintext clinical content and is not the clinical Requester merely because it relays data. The Completion display receives the encrypted submission and presents completion state to staff, the patient, or a local workflow.

### 2.1.3 Pre-visit intake from a patient phone

Before a visit, a Requester sends the Holder to a mobile check-in page. The SMART request can include an inline or referenced Questionnaire, requests for existing FHIR content, and instructions describing why each item is being requested. The Wallet can satisfy one item with a new QuestionnaireResponse, another with existing FHIR resources, and another with a SMART Health Card or other accepted Artifact media type.

This use case motivates per-item consent, partial fulfillment, and status reporting. A Holder may answer the questionnaire while declining to share unrelated history, or may share coverage while marking medication history unavailable. The response model needs to represent these outcomes without forcing all-or-nothing disclosure.

### 2.1.4 Insurance verification (CARIN-style coverage)

A Requester asks for coverage and related payer data using FHIR-native selectors, such as exact CARIN-style coverage profiles, a profile-family URL in `profilesFrom[]`, or other selectors defined in §5. The Wallet may return a SMART Health Card, raw FHIR JSON, or another accepted Artifact form, depending on the item's `accept[]` list and Wallet capabilities.

This use case motivates profile-family selectors and additive profile matching. A Requester should be able to say that content matching any profile in a family is acceptable while also naming exact profiles it can consume. The presence of `profiles[]` does not narrow `profilesFrom[]`, and the presence of `profilesFrom[]` does not narrow `profiles[]`; either path can make a profile acceptable, subject to the rest of the item definition.

### 2.1.5 Health summary share for prior-auth or referrals

A care team, referral coordinator, or prior-authorization workflow asks the Holder to share a bounded health summary. The request may include multiple items, such as problems, medications, allergies, immunizations, recent labs, and coverage. The Wallet may return one Artifact that fulfills several items, several Artifacts that together fulfill one item, or a mix of fulfilled, partial, unavailable, declined, unsupported, and error statuses.

This use case motivates many-to-many fulfillment and media-type-based response processing. The protocol should support realistic clinical bundles and credentials without assuming that each requested item maps to exactly one returned object.

## 2.2 Why a check-in protocol vs. plain credential issuance/presentation

Plain credential issuance and presentation answer important questions: who issued a credential, what envelope carries it, how a Wallet proves possession, and how a Verifier evaluates a presentation. They do not, by themselves, define the clinical check-in conversation between a Requester and a Holder.

Clinical check-in requires a request model, not just a credential type. The Requester needs to describe what information is needed, why it is being requested, which FHIR profiles or profile families are acceptable, which media types can be consumed, and which requested items are advisory-required for the workflow. The Holder needs to understand and control disclosure at item granularity. The Wallet needs a consistent way to map a request to available Holder data sources and to report declined, unavailable, unsupported, partial, and error outcomes. The response consumer needs to know which Artifacts fulfill which request items and how to validate that the response matches the request.

A check-in protocol also separates clinical semantics from presentation transport. The same SMART request can be carried in the base same-device `org-iso-mdoc` flow, in the kiosk wrapper after phone resolution, or in a future reserved binding without changing the clinical meaning of requested items. Conversely, mdoc, Digital Credentials API, kiosk encryption, and future OpenID4VP mapping details should not leak requester identity metadata or transport-specific assumptions into the SMART request body.

Finally, check-in is a workflow boundary. It is patient-mediated, consent-oriented, and often partial. A plain presentation flow optimized for disclosing one credential may not naturally express multi-item intake, alternative acceptable media types, Artifact reuse across items, or a user-visible distinction between “not available,” “not supported,” and “declined.” SMART Health Check-in defines those semantics while relying on established presentation transports for invocation, cryptographic carriage, and validation.

## 2.3 Goals

### 2.3.1 Transport-neutral clinical content

The SMART request and SMART response are JSON clinical content objects with semantics independent of a particular transport envelope. Presentation bindings carry these objects; they do not redefine the requested clinical content, Artifact semantics, per-item status model, or consent granularity.

### 2.3.2 Per-item user consent

The protocol supports Holder review and decision-making at the request-item level. A Wallet can return fulfilled content for some items while reporting declined, unavailable, unsupported, partial, or error status for others. The `required` flag on a request item is an advisory workflow signal for the Holder and Wallet, not a mechanism that removes user control.

### 2.3.3 FHIR-native selectors (canonicals, profile families)

The request model uses FHIR-native concepts where they fit. Exact profile selectors use FHIR `StructureDefinition` canonical URLs in `profiles[]`. Profile-family selectors use canonical profile-family URLs in `profilesFrom[]`, represented as an array. These selectors let Requesters express familiar FHIR conformance expectations without inventing local topic vocabularies for common clinical content.

### 2.3.4 Many-to-many fulfillment

The response model is Artifact-centered. One Artifact can fulfill many request items, and one request item can be fulfilled by many Artifacts. This supports realistic FHIR Bundles, SMART Health Cards, questionnaire responses, and mixed submissions without forcing artificial one-item/one-payload mapping.

### 2.3.5 Interop across multiple EHRs and multiple Wallet platforms

The profile aims to let independently implemented Requesters, Verifiers, Wallets, kiosk components, and response consumers interoperate. A Requester should be able to construct one standards-based SMART request instead of custom logic for each Wallet. A Wallet should be able to interpret requests from multiple EHRs and payer workflows using shared selector, consent, media-type, and status semantics. A response consumer should be able to validate common cross-checks regardless of which Wallet returned the response.

### 2.3.6 Layerable trust (origin → reader → issuer → clinical content)

The profile separates trust layers so deployments can adopt stronger trust without changing the clinical model. The Wallet may consider web origin and user-agent context, optional reader or Verifier authentication, mdoc issuer and device proofs, and source trust for returned clinical content. These layers are related but distinct: a trusted origin does not prove clinical provenance; an issuer-signed presentation envelope does not by itself prove that raw FHIR JSON came from an authoritative clinical source; and a SMART Health Card may carry its own source signature independent of the transport.

## 2.4 Non-goals

SMART Health Check-in 1.0 is not intended to be:

- a universal patient identity protocol;
- a replacement for FHIR APIs, SMART App Launch, payer APIs, or clinical document exchange;
- a credential issuance, revocation, or wallet-provisioning framework;
- a longitudinal personal health record specification;
- an EHR chart-ingestion, reconciliation, write-back, or order-entry standard;
- a payment, claims, or benefits-adjudication protocol;
- a guarantee that returned data is clinically complete, current, or appropriate;
- a mandate for a particular Wallet user interface, storage architecture, operating-system credential broker, or EHR filing workflow;
- a requirement that all responses be cryptographically sourced from clinical issuers; or
- a general-purpose verifiable presentation query language.

The specification intentionally avoids standardizing local policy decisions such as which profile families a Requester accepts, which issuers a Verifier trusts, how a Wallet ranks Holder data sources, when a clinic treats a partial response as sufficient, or how a returned Artifact is filed in an operational system.

## 2.5 Threat model summary

SMART Health Check-in assumes a patient-mediated disclosure workflow involving a Requester, Verifier, Wallet, Holder, and, for kiosk deployments, Kiosk creator, Submission service, Phone presenter, and Completion display. The high-level threat model is that attackers may try to mislead the Holder about who is asking, alter or replay requests, obtain plaintext clinical content from transport infrastructure, substitute responses, link sessions across verifiers, or abuse check-in metadata for tracking.

The base same-device flow relies on the W3C Digital Credentials API and direct `org-iso-mdoc` presentation to bind a Verifier invocation to a browser/user-agent context and to carry encrypted presentation results. Later trust and security sections define the exact processing requirements. At this foundation level, the important design points are:

- the clinical SMART request does not carry requester identity metadata; requester and Verifier identity belong to presentation and trust layers;
- the SMART response binds back to the SMART request and reports per-item outcomes so a Verifier can detect mismatched, incomplete, or unsupported responses;
- Wallet consent UI is expected to present meaningful request purpose and item information to the Holder;
- the kiosk flow treats the Submission service as untrusted and exposes it only to encrypted request and response blobs plus limited routing metadata;
- the kiosk pointer is pointer-only and the kiosk request payload embeds the SMART request directly after resolution and decryption;
- cross-device kiosk processing must bind the pointer request identifier to the decrypted payload before re-entering the same-device flow on the phone;
- presentation-envelope trust, issuer trust, device proof, clinical-source trust, and response-content validation are separate checks; and
- logs, crash reports, QR metadata, relay state, and completion displays can leak sensitive information if deployments treat transport metadata as harmless.

Detailed security requirements belong in §11. Privacy requirements, including data minimization, selective disclosure responsibilities, cross-verifier linkability, Wallet rendering of requester intent, retention, sensitive-category handling, and telemetry guidance, belong in §12. The reserved OpenID4VP mapping in §10 is informative future work and does not replace the version 1.0 same-device `org-iso-mdoc` base flow or the §11 security analysis.

## Organizer notes

### Strengths

- Keeps clinical semantics separate from presentation transport while explicitly naming the version 1.0 same-device direct `org-iso-mdoc` base flow.
- Frames kiosk as a wrapper that resolves a pointer, obtains an embedded `smartRequest`, and re-enters the same-device flow on the phone.
- States that `profilesFrom` is an array of canonical profile-family URLs and that `profiles[]` plus `profilesFrom[]` are additive selectors.
- Gives concrete use-case prose that can later feed examples without introducing wire-level requirements prematurely.
- Separates adjacent workflows, such as issuance, storage, EHR filing, identity proofing, and payments, from the protocol scope.

### Caveats

- This draft intentionally avoids exact conformance keywords for §§5–9 details; later normative sections should convert only the durable requirements into SHALL/SHOULD language.
- The threat model is a summary. §11 and §12 will need to turn these bullets into precise requirements aligned with actual cryptographic flows and fields.
- The use-case list emphasizes common US FHIR examples such as CARIN-style coverage; organizers may want to rebalance wording for non-US deployments.
- The text references future bindings only as reserved or later work; §10 should not be allowed to weaken the direct `org-iso-mdoc` base flow.

### Downstream dependencies

- §3 should reuse the same distinction among clinical content model, same-device presentation flow, and cross-device kiosk flow.
- §5 should define selector semantics precisely, especially `profilesFrom[]` array shape, profile-selector additivity, and the separate interaction of `resourceTypes[]` with profile selectors.
- §6 should define Artifact media-type rules, per-item status coverage, request/response binding, and many-to-many fulfillment.
- §7 should preserve the layered trust model: origin, reader/Verifier, issuer/device, and clinical-content source trust.
- §8 should remain the normative base presentation flow for version 1.0.
- §9 should ensure kiosk payloads embed `smartRequest` directly and never introduce demo preset or request-wrapper semantics.
- §§11–12 should expand the threat-model summary into security and privacy requirements without moving platform-specific implementation advice into the normative core.
