## 1.2 Scope

SMART Health Check-in 1.0 defines an interoperable profile for patient-mediated check-in in which a Requester asks a Holder, through a Wallet, for clinical content needed to complete an administrative or clinical workflow. The specification fixes the shared protocol surface that must be common across multiple EHRs, portals, check-in applications, kiosk deployments, and Wallet platforms.

The scope includes the transport-neutral clinical content model: the SMART request, the SMART response, request items, content selectors, accepted response media types, returned Artifacts, and per-item status reporting. A SMART request describes what clinical content is being requested and why it is being shown to the Holder; it does not identify the Requester by embedding requester identity metadata in the clinical request body. A SMART response reports what the Wallet returned, declined, could not satisfy, or could satisfy only partially.

The scope also includes presentation flows that carry this clinical content model. Version 1.0 defines the same-device presentation flow as the base flow: a Verifier uses the W3C Digital Credentials API with direct `org-iso-mdoc` presentation to carry the SMART request and receive the SMART response on the same device where the Wallet is available. Version 1.0 also defines a cross-device kiosk flow that wraps the same-device flow. In that flow, a Kiosk creator produces a pointer to a signed and encrypted kiosk request; the patient's phone resolves the pointer, obtains a kiosk request payload that embeds the SMART request directly, re-enters the same-device presentation flow on the phone, and returns an encrypted submission for the Completion display. The kiosk request payload does not carry a demo preset, preset name, or other request wrapper in place of the SMART request.

The scope includes clinical content selection conventions that allow Requesters to ask for familiar FHIR-shaped data without inventing local topic vocabularies. A request item can use FHIR-native selectors, including exact profile canonicals in `profiles[]`, profile-family canonicals in `profilesFrom[]`, resource-type selectors, questionnaire selectors, and registered extension selectors. `profilesFrom` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either can broaden the acceptable profile matches for an item, and the presence of one does not narrow the other.

The scope includes the interoperability rules needed for many-to-many fulfillment. One Artifact can fulfill multiple request items, multiple Artifacts can fulfill one request item, and a response can combine returned Artifacts with per-item status. This lets a Wallet satisfy check-in workflows using the data it actually holds while still giving the Requester enough structured information to validate and consume the response.

The scope includes the trust and validation hooks needed to layer deployment trust without hard-coding one national, institutional, or vendor-specific trust model. The specification distinguishes web origin trust, Verifier or reader trust, issuer and device-attestation trust, and trust in the provenance of clinical content. Later sections define which pieces are mandatory for the version 1.0 flows and where deployments can add policy-specific trust anchors.

## 1.3 Out of scope

SMART Health Check-in 1.0 does not define clinical data issuance. It does not specify how a payer, provider, public-health system, or other issuer creates credentials, SMART Health Cards, FHIR bundles, mdoc documents, or wallet data sources before check-in begins.

The specification does not define longitudinal Wallet storage, synchronization, backup, revocation checking for stored data, or background refresh of clinical content. A Wallet may use local credentials, cached FHIR resources, connected services, issuer-provided credentials, or other Holder data sources, but those mechanisms are outside this protocol.

The specification does not define EHR write-back or order-entry behavior. A Requester or EHR may use a SMART response to prefill a registration form, update a coverage record, attach a document, or route information to staff, but the API, workflow, audit policy, reconciliation logic, and persistence behavior inside the receiving system are deployment responsibilities.

The specification does not define identity proofing, account recovery, patient matching policy, or legal authority for a parent, guardian, proxy, caregiver, or other representative. The protocol can carry patient-mediated clinical content after a Holder consents, but it does not decide whether the person holding the phone is entitled to act for the patient in a given jurisdiction or workflow.

The specification does not define payments, billing transactions, eligibility adjudication, prior-authorization submission, claims exchange, or payer-provider contracting. Insurance verification use cases can request and return coverage-related clinical or administrative content, but payment networks and financial settlement are out of scope.

The specification does not define a general-purpose credential issuance, credential wallet, or verifier framework. It profiles specific clinical check-in request and response semantics and specific version 1.0 presentation flows. Future or external bindings, including any reserved OpenID4VP mapping, do not change the clinical content model defined here.

## 2.1 Use cases

### 2.1.1 Same-device patient portal check-in

A patient opens an EHR portal, scheduling system, or check-in web page on a phone or other device that can also invoke the patient's Wallet. The Requester asks for a focused set of check-in content, such as demographics, coverage, medications, allergies, or a visit-specific questionnaire response. The Verifier invokes the same-device presentation flow, the Wallet renders the requested items for Holder review, and the Wallet returns a SMART response through direct `org-iso-mdoc` over the W3C Digital Credentials API.

This use case motivates a base flow with no cross-device relay. It also motivates clear separation between the clinical content model and the presentation transport, so a portal can request FHIR-shaped content while the transport layer handles presentation, encryption, and validation.

### 2.1.2 In-person front-desk kiosk check-in

A patient arrives at a clinic and interacts with a kiosk, tablet, or desktop station that should not receive the patient's Wallet credentials directly. The Kiosk creator prepares a signed and encrypted kiosk request and displays a QR code or similar pointer. The patient's phone resolves the pointer, validates the request, obtains the embedded SMART request, and re-enters the same-device presentation flow locally on the phone. After Holder review, the phone submits an encrypted result that the Completion display can use to show staff or the patient that check-in data was received.

This use case motivates the cross-device kiosk wrapper. The wrapper protects clinical request and response content from an untrusted Submission service while preserving the same clinical request and response semantics used by same-device portal check-in.

### 2.1.3 Pre-visit intake from a patient phone

Before an appointment, a patient receives a link, message, portal prompt, or other entry point on a phone. The Requester asks for visit-specific intake content, such as updated medications, allergies, problem list entries, symptoms, consents, or an inline or canonical Questionnaire. The Wallet can return existing Artifacts, a QuestionnaireResponse, or status entries showing that some requested items were declined or unavailable.

This use case motivates per-item consent and status. A patient may be willing to share some information before the visit but not other information; the Requester needs a structured response that distinguishes fulfilled, declined, unavailable, partial, and error conditions at item granularity.

### 2.1.4 Insurance verification

A provider, pharmacy, laboratory, imaging center, or other care site asks the Holder for coverage information. The request can use exact FHIR profile canonicals and profile-family selectors, such as CARIN-style coverage profiles, and can express accepted response media types that the Requester can ingest. The Wallet may satisfy the request from a SMART Health Card, payer-provided FHIR resources, cached coverage data, or another Holder data source.

This use case motivates FHIR-native selectors and many-to-many fulfillment. A single coverage Artifact might satisfy multiple request items, or separate Artifacts might satisfy member identity, coverage, and related payer information.

### 2.1.5 Health summary share for prior-auth or referrals

A care team, specialist, payer, or referral destination asks the Holder to share a focused health summary relevant to a referral, prior-authorization review, second opinion, or care transition. The request may identify profile families such as US Core, exact profiles for particular resources, resource types, or an accepted media type such as raw FHIR JSON or SMART Health Cards.

This use case motivates transport-neutral clinical semantics and layerable trust. The same clinical request should mean the same thing whether it is carried in the base same-device presentation flow, the kiosk wrapper, or a future binding. At the same time, the receiver may need to distinguish trust in the Verifier origin, trust in the Wallet or device presentation, trust in the issuer of a credential, and trust in the clinical source represented inside an Artifact.

## 2.2 Why a check-in protocol vs. plain credential issuance/presentation

Plain credential issuance and presentation answer a different question: whether a Holder can present one or more credentials that match a verifier's credential query. Check-in workflows need more than that. They need a Requester to describe discrete clinical or administrative needs in language a Wallet can render to a Holder, allow the Holder to consent item by item, and receive a response that is understandable even when some items are fulfilled, some are declined, and some are unavailable.

A check-in protocol provides a clinical request vocabulary above the credential transport. The Requester can ask for patient-specific FHIR resources, exact profiles, profile families, questionnaires, or registered selector kinds without knowing which credentials, bundles, cached resources, or connected services a Wallet might use. The Wallet can decide how to satisfy the request from available Holder data sources and can return Artifacts with media types the Requester advertised as acceptable.

A check-in protocol also provides response accounting. Requesters need to know which request item each Artifact fulfills and whether any requested item was not satisfied. A plain presentation of credentials can prove possession of a credential, but it does not by itself define per-item status, many-to-many fulfillment, or clinical selector semantics.

Finally, a check-in protocol keeps presentation transport replaceable where appropriate. Version 1.0 defines a base same-device direct `org-iso-mdoc` flow and a kiosk wrapper that reuses it, but the SMART request and SMART response remain transport-neutral. That separation lets the same clinical model be validated, tested, mapped to FHIR, and potentially carried by future bindings without redefining the clinical semantics of check-in.

## 2.3 Goals

### 2.3.1 Transport-neutral clinical content

The SMART request and SMART response have the same clinical meaning regardless of the presentation flow that carries them. A Wallet, Verifier, or response consumer should be able to reason about request items, selectors, Artifacts, media types, and status without first depending on kiosk envelope details, browser routing behavior, or mdoc byte structure. Transport sections define how the clinical objects are carried and protected; they do not redefine what the clinical objects mean.

### 2.3.2 Per-item user consent

The protocol supports Holder review and consent decisions at the request-item level. A request item carries user-facing context, accepted media types, and a content selector. The SMART response reports status for each item and links returned Artifacts to the items they fulfill. This structure allows a Wallet to communicate partial sharing outcomes without forcing all-or-nothing disclosure.

### 2.3.3 FHIR-native selectors

The protocol uses FHIR-native identifiers where they fit. Exact `StructureDefinition` canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource types, FHIR Questionnaire canonicals, and inline FHIR Questionnaire resources let Requesters describe content using existing clinical interoperability vocabulary. `profiles[]` and `profilesFrom[]` are additive profile selectors; later §5 defines their exact matching rules and their interaction with `resourceTypes[]` and other selector fields.

### 2.3.4 Many-to-many fulfillment

The response model supports practical clinical data packaging. One Artifact can satisfy several request items, and several Artifacts can satisfy one request item. Per-item status remains explicit even when Artifacts are shared across items or when some items have no Artifact. This goal avoids requiring Wallets to split or duplicate clinical content solely to match request boundaries.

### 2.3.5 Interop across multiple EHRs and multiple wallet platforms

The specification aims for independent Requesters, Verifiers, Wallets, kiosk systems, and response consumers to interoperate without bilateral field mappings or proprietary topic lists. A Requester should be able to construct a SMART request that a conforming Wallet can understand. A Wallet should be able to return a SMART response that a conforming Verifier and EHR-side consumer can validate and route. Kiosk implementations should wrap, relay, and complete the same clinical exchange without creating a separate kiosk-only request language.

### 2.3.6 Layerable trust

The protocol separates trust questions so deployments can apply policy without confusing layers. Origin trust, Verifier or reader trust, issuer and device-attestation trust, and clinical-content source trust are related but distinct. A deployment may require additional trust anchors, signatures, provenance, or operational controls, but those controls should layer on top of the protocol artifacts rather than changing the SMART request and SMART response semantics.

## 2.4 Non-goals

SMART Health Check-in 1.0 is not intended to become a universal health wallet architecture. It does not standardize wallet storage, credential lifecycle management, synchronization, indexing, user-interface design, or background data retrieval.

The protocol is not intended to guarantee that returned clinical content is complete, current, clinically correct, or legally sufficient for every receiving workflow. It gives Requesters structured ways to ask for content and gives Wallets structured ways to respond. Clinical validation, reconciliation, provenance evaluation, and downstream use remain deployment responsibilities unless a later normative section states a specific protocol validation rule.

The protocol is not intended to replace existing FHIR APIs, SMART App Launch, payer-provider exchange, referral networks, eligibility transactions, or EHR integration APIs. It can complement those mechanisms by enabling patient-mediated check-in, but it does not define their server-side operations.

The protocol is not intended to mandate one trust ecosystem. It identifies layers at which trust can be evaluated and defines the version 1.0 presentation flows, but it does not by itself certify issuers, accredit Verifiers, approve Wallets, or establish legal identity proofing rules.

The protocol is not intended to require all deployments to support the kiosk flow, future OID4VP mappings, every FHIR implementation guide, every response media type, or every extension selector. Conformance classes and feature support are defined separately so implementations can interoperate within the features they claim.

## 2.5 Threat model summary

SMART Health Check-in assumes an active network attacker, potentially malicious web content outside the Verifier origin, confused or misconfigured Verifier deployments, curious or compromised relay infrastructure in the kiosk flow, and attempts to replay, substitute, correlate, or over-collect clinical content. It also assumes that clinical data can be sensitive even when the data is administrative, such as coverage, demographics, appointment context, or provider names.

The primary assets are the Holder's clinical and administrative information, the Holder's consent decisions, the integrity of the SMART request, the integrity and confidentiality of the SMART response, the binding between a response and the request it fulfills, and the user's ability to understand which party is asking for which content. In kiosk deployments, the assets also include confidentiality of the embedded SMART request, confidentiality of the encrypted submission, and correct binding between the pointer, the signed kiosk payload, the phone-side same-device presentation, and the Completion display.

The base same-device flow relies on the W3C Digital Credentials API, direct `org-iso-mdoc` presentation, and the validation rules defined later in this specification to protect presentation transport. The cross-device kiosk flow treats the Submission service as an untrusted relay: it may store, forward, delay, drop, or observe metadata about opaque blobs, but it is not trusted with plaintext clinical content or with authority to modify the embedded SMART request or returned SMART response.

The threat model does not assume that every Artifact is cryptographically signed by its original clinical source. Some Artifacts may carry independent issuer, device, or source proofs; others may be patient-mediated content whose provenance must be evaluated by policy, workflow, or additional metadata. The trust framework in §7 and the security and privacy considerations in §§11–12 define the detailed obligations and mitigations. A reserved future binding discussion in §10, if present, is informative and does not weaken the version 1.0 same-device or kiosk requirements.

## Organizer notes

### Strengths

- Keeps the clinical content model transport-neutral while explicitly naming the version 1.0 base same-device direct `org-iso-mdoc` flow.
- Describes the kiosk flow as a wrapper that re-enters the same-device flow on the phone and states that the kiosk payload embeds the SMART request directly.
- Uses T1.A terminology consistently: Requester, Verifier, Wallet, Responder, Holder, Kiosk creator, Submission service, Phone presenter, Completion display, Artifact, SMART request, and SMART response.
- Preserves `profilesFrom[]` as an array of canonical profile-family URLs and limits additive-selector language to `profiles[]` plus `profilesFrom[]`.
- Frames purpose and goals as informative foundation text without introducing detailed conformance requirements that belong in §§4–9.

### Caveats

- Section 2.5 references §7 and §§11–12 even though the outline line for §2.5 mentions §10; this draft treats §10 as a reserved future-binding placeholder and sends threat-model detail to the later trust, security, and privacy sections.
- The exact status-code vocabulary, media-type registry, selector matching rules, and conformance classes are intentionally deferred to later normative sections.
- Identity proofing and representative authority are declared out of scope, but downstream text should still explain how deployments can display requester intent and handle proxy scenarios safely.

### Downstream dependencies

- T1.C should reuse the same scope boundaries when describing payload domains, roles, sequence diagrams, and trust boundaries.
- §5 must define the exact request-item selector semantics, especially `profilesFrom[]` array shape, profile-selector additivity, and interaction with `resourceTypes[]`.
- §6 must define status coverage, Artifact media types, request/response binding, and many-to-many fulfillment rules.
- §§7–9 must specify the concrete trust processing, direct `org-iso-mdoc` same-device flow, and kiosk wrapper mechanics without changing the clinical content model.
- §§11–12 should expand the threat-model summary into detailed security and privacy requirements, including kiosk relay confidentiality, replay, metadata leakage, and Wallet UX expectations.
