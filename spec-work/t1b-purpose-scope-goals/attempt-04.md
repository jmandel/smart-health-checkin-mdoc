## 1.2 Scope

SMART Health Check-in 1.0 defines an interoperability profile for patient-mediated check-in in which a Requester asks a Holder, through a Wallet, to disclose specific clinical content for a bounded administrative or clinical workflow. The profile fixes the parts of that exchange that must be common for multiple EHRs, portals, kiosk systems, and wallet platforms to interoperate without bilateral request formats or site-specific wallet logic.

The scope includes three coordinated layers:

1. A transport-neutral clinical content model consisting of a SMART request and SMART response. The clinical content model defines request items, user-facing purpose and item text, accepted response media types, content selectors, per-item status, and returned Artifacts without depending on any one presentation API, browser, relay, or credential format.
2. A base same-device presentation flow in which a Verifier carries the SMART request and SMART response through the W3C Digital Credentials API using direct `org-iso-mdoc` presentation. This is the base version 1.0 presentation flow.
3. A cross-device kiosk flow that wraps the same-device presentation flow for front-desk and shared-terminal deployments. A Kiosk creator prepares a pointer to a signed and encrypted kiosk request; the patient's phone resolves the pointer, obtains the embedded `smartRequest`, re-enters the same-device presentation flow locally on the phone, and submits an encrypted result for the Completion display.

The clinical request/response model is intentionally transport-neutral. A SMART request has the same clinical meaning whether it is carried by the same-device `org-iso-mdoc` binding, by the kiosk wrapper, or by a future binding. Transport bindings may add origin, reader, device, encryption, freshness, or relay properties, but they do not redefine request item semantics, consent granularity, selector meaning, Artifact media types, or response status reporting.

The profile standardizes enough clinical selection language for a Requester to say what it needs and for a Wallet to decide what it can offer. In particular, the profile uses FHIR-native selectors such as exact FHIR profile canonicals in `profiles[]`, profile-family canonical URLs in `profilesFrom[]`, FHIR resource types, and Questionnaire references. Values in `profilesFrom[]` are an array of canonical profile-family URLs. When both `profiles[]` and `profilesFrom[]` appear, they are additive profile selectors: either source may identify acceptable profile matches, subject to the rest of the item definition. This section describes the design intent; the precise selector rules are defined in §5.

The profile also standardizes the response shape needed by EHRs and wallets to align on fulfillment. A Wallet can return zero or more Artifacts, each with a media type and links to the request item or items it fulfills, and can report separate status for each request item. This supports one-to-one, one-to-many, many-to-one, and partial fulfillment patterns without forcing every requester item to map to a separate credential or FHIR Bundle.

## 1.3 Out of scope

SMART Health Check-in 1.0 does not define how clinical content is issued to a Wallet, how a Wallet discovers or synchronizes Holder data sources, or how a Holder maintains longitudinal health records over time. A Wallet may use locally stored credentials, SMART Health Cards, cached FHIR resources, connected services, issuer-mediated credentials, or other Holder data sources, but those mechanisms are outside this profile unless a later section states a requirement for the returned Artifact itself.

The profile does not define EHR write-back, order entry, clinical documentation creation, scheduling changes, benefits adjudication, payment initiation, or any other server-side workflow that may occur after a Requester consumes a SMART response. A receiving EHR or check-in application may import, reconcile, queue, discard, or display returned content according to local policy and applicable law. Those downstream actions are not part of the presentation protocol.

The profile does not perform identity proofing, establish patient matching policy, certify that a Holder is authorized to act for another person, or determine legal authority for disclosure. Presentation flows may provide origin, reader, issuer, device, or clinical-source trust signals, and wallets may render those signals to the Holder, but identity-proofing programs and patient-matching procedures are deployment responsibilities.

The profile does not define payer enrollment, eligibility transactions, claims submission, copay collection, credit-card processing, digital signatures for financial authorization, or other payment functions. Insurance verification use cases in this document are limited to patient-mediated sharing of coverage-related clinical or administrative content as Artifacts.

The profile does not define a general-purpose credential issuance framework, a universal verifiable presentation query language, a replacement for SMART App Launch, or a replacement for FHIR APIs. It defines a check-in-specific request/response protocol and its version 1.0 presentation flows.

## 2.1 Use cases

### 2.1.1 Same-device patient portal check-in

A patient opens a provider portal or EHR-hosted check-in page on the same phone or computer where a Wallet is available. The portal acts as Requester and Verifier, constructs a SMART request for content needed before the visit, and invokes the same-device presentation flow. The Wallet shows the requested items and purpose to the Holder, obtains per-item disclosure decisions, constructs a SMART response, and returns it through the direct `org-iso-mdoc` flow.

This use case is the simplest deployment shape for the base presentation flow. It avoids QR codes and relay services while preserving the same clinical content model used elsewhere.

### 2.1.2 In-person front-desk kiosk check-in

A patient arrives at a clinic and uses a shared kiosk, tablet, or staff-facing desktop that should not directly handle wallet invocation or plaintext clinical content until the patient has approved disclosure on a personal phone. The Kiosk creator creates a signed and encrypted kiosk request payload that embeds the SMART request directly as `smartRequest`; it does not embed a demo preset, indirect preset name, or request wrapper. The kiosk displays a Pointer URL, commonly as a QR code.

The Phone presenter resolves the pointer, validates the kiosk request, confirms that the pointer and payload identify the same request, and then re-enters the same-device presentation flow on the phone using the embedded SMART request. After Holder review and Wallet response construction, the phone submits an encrypted result for the Completion display. The kiosk flow therefore changes the transport path and trust boundaries, but not the clinical request semantics.

### 2.1.3 Pre-visit intake from a patient phone

A care team sends a link before an appointment asking a patient to provide requested history, questionnaires, medications, immunizations, insurance information, or other pre-visit material. The patient opens the link on a phone, reviews the SMART request, and uses a Wallet to share selected content. The Requester can mark items as advisory-required for workflow purposes, but the Holder remains in control of disclosure.

This use case benefits from per-item consent and per-item status. A patient may approve questionnaire responses but decline a medication history item, or a Wallet may fulfill one item from raw FHIR JSON and another from a SMART Health Card.

### 2.1.4 Insurance verification

A provider, pharmacy, lab, or service desk asks the Holder to share coverage-related content such as CARIN-style Coverage resources, insurance card Artifacts, or other payer-provided material. The Requester can express exact profile requirements with `profiles[]` and broader implementation-guide or profile-family requirements with `profilesFrom[]`.

The protocol is limited to patient-mediated sharing of coverage information. It does not determine eligibility, adjudicate benefits, submit claims, collect payment, or replace payer-provider transaction standards.

### 2.1.5 Health summary share for prior authorization or referrals

A Requester asks the Holder to share a bounded health summary for a referral, prior-authorization packet, second opinion, school form, occupational health review, or similar workflow. The SMART request can ask for multiple categories of clinical content while accepting several response media types. The SMART response can return a compact set of Artifacts that fulfill several request items at once, such as a FHIR Bundle covering a condition list, medications, allergies, and recent results.

This use case motivates many-to-many fulfillment and transport-neutral content. The same clinical summary request should be understandable by wallets and EHRs even when different presentation flows or trust layers carry it.

## 2.2 Why a check-in protocol vs. plain credential issuance/presentation

Plain credential issuance answers a different question: how an issuer creates a credential for later use. Check-in asks what a specific Requester needs for a specific workflow now, how that request is displayed to the Holder, what subset the Holder permits, and how the response is correlated back to the request. A Wallet may rely on previously issued credentials, connected FHIR data, or other Holder data sources, but the check-in protocol is about the request and response at the moment of presentation.

Plain presentation protocols also tend to focus on credential format, proof mechanics, and verifier trust. Those properties are necessary but not sufficient for EHR and wallet interoperability in clinical check-in. The Requester needs a FHIR-native way to ask for content, the Wallet needs item-level display and consent context, and the response consumer needs to know which Artifacts fulfill which request items and which items were declined, unavailable, or errored.

SMART Health Check-in therefore defines a clinical content model above any particular presentation envelope. The same-device direct `org-iso-mdoc` flow provides the version 1.0 base presentation path, and the kiosk wrapper provides a deployment pattern for shared terminals, but both carry the same SMART request and SMART response. This separation allows the profile to be precise where interop requires precision while avoiding a new issuance regime or a monolithic credential taxonomy.

A check-in protocol is also intentionally workflow-bounded. It can convey why information is being requested for display to the Holder, but it does not turn the clinical request body into a requester identity credential, a consent directive, or a persistent authorization grant. Requester identity, origin, reader authentication, issuer trust, device attestation, and clinical-source trust are layered around the clinical model by the relevant presentation and trust sections.

## 2.3 Goals

### 2.3.1 Transport-neutral clinical content

The SMART request and SMART response are defined so that their clinical semantics do not depend on W3C Digital Credentials API, `org-iso-mdoc`, kiosk relay mechanics, OpenID4VP, browser routing, or any other carrier. Transport bindings can constrain serialization, encryption, signatures, or validation, but they should carry the same clinical content model rather than inventing parallel request objects.

### 2.3.2 Per-item user consent

The protocol is designed for Holder review at the granularity of request items. Each item has display text, an advisory required flag, accepted response media types, and a selector describing the requested content. The response reports item-level status so the Requester can distinguish fulfilled, declined, unavailable, unsupported, and error outcomes when those statuses are defined in §6.

Per-item consent does not require every Artifact to correspond to exactly one item. A single Artifact may fulfill multiple approved items, and multiple Artifacts may fulfill one item. The consent and status model remains item-oriented even when clinical packaging is Artifact-oriented.

### 2.3.3 FHIR-native selectors

The protocol uses FHIR idioms for clinical selection where they fit: exact StructureDefinition canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource type names, supported FHIR versions, and Questionnaire canonicals or inline Questionnaire resources. This lets Requesters express clinical needs using implementation-guide and profile vocabulary already used by EHRs, payers, and health information networks.

Profile selectors are additive when both exact profiles and profile families are present. The intent is to broaden acceptable matches, not to require content to satisfy both selector lists simultaneously. Later §5 defines the exact interaction with `resourceTypes[]`, no-selector defaults, version suffixes, and extension selectors.

### 2.3.4 Many-to-many fulfillment

The response model supports practical clinical packaging. One request item may be fulfilled by several Artifacts, such as a SMART Health Card plus raw FHIR supporting data. One Artifact may fulfill several request items, such as a FHIR Bundle containing coverage, demographics, and medication data. Some items may be fulfilled while others are declined, unavailable, or unsupported.

This goal avoids artificial credential fragmentation and avoids forcing Requesters to reverse-engineer fulfillment solely from clinical payload contents.

### 2.3.5 Interop across multiple EHRs and multiple wallet platforms

The profile aims to let independently implemented EHRs, portals, kiosk systems, Wallets, and response-processing services interoperate using shared field names, selector semantics, Artifact shapes, status reporting, media types, and presentation-flow validation. A Requester should not need wallet-specific request templates, and a Wallet should not need EHR-specific interpretation rules for common check-in requests.

The base same-device presentation flow over W3C Digital Credentials API using direct `org-iso-mdoc` is the common version 1.0 path for live presentation. The cross-device kiosk flow is an optional wrapper for a different deployment topology, not a divergent clinical protocol.

### 2.3.6 Layerable trust

The profile separates trust questions so deployments can combine them without confusing their meanings. A web origin can establish where the Verifier page came from. Reader or Verifier authentication can establish properties of the requesting application or organization. mdoc issuer and device proofs can establish properties of the presentation container. Clinical-source evidence can establish where particular clinical content originated. Raw FHIR JSON can remain patient-mediated content unless separately signed or provenanced.

This layered design lets simple deployments start with origin-mediated same-device presentation while allowing stronger trust frameworks to be added where policy, regulation, or workflow requires them.

## 2.4 Non-goals

SMART Health Check-in 1.0 is not a complete patient identity, consent, or data-governance framework. It does not decide who a person is, whether they are legally authorized to share another person's data, how long a Requester may retain received content, or what downstream uses are permitted. It provides protocol fields and flows that can be used within such frameworks.

The profile is not a comprehensive clinical query language. It deliberately favors a small set of FHIR-native selectors and response media types suitable for check-in workflows. It does not attempt to express arbitrary FHIR search, graph traversal, CDS logic, cohort definitions, computable authorization criteria, or payer rule evaluation.

The profile is not a general credential wallet portability standard. It does not require a Wallet to store any particular credential type, synchronize with any particular issuer, expose a general credential inventory, or support longitudinal record management.

The profile is not a new browser or operating-system API. It uses the W3C Digital Credentials API and platform credential mediation where available, but it specifies interoperable protocol artifacts rather than platform-specific user-interface behavior or wallet discovery policy.

The profile is not a mandate for one trust model. It defines separable trust layers and the base presentation flow, but it does not require every deployment to use the same issuer registries, organizational trust anchors, patient-matching procedures, or clinical-source validation policies.

The profile is not an OID4VP binding in version 1.0. A future or reserved binding may map the same clinical content model into OpenID4VP concepts, but that work must not change the semantics of the SMART request and SMART response defined for this version.

## 2.5 Threat model summary

SMART Health Check-in assumes that the Holder's clinical content is sensitive and that request context can also be sensitive. The profile therefore treats unauthorized disclosure, overbroad requests, misleading requester presentation, replay, substitution, correlation, and plaintext relay exposure as primary risks. Detailed security requirements are developed in §11, privacy requirements in §12, and any reserved future OID4VP mapping considerations in §10.

For the same-device presentation flow, the main threats include origin spoofing, UI redress, reader or Verifier impersonation, malformed or replayed presentation requests, confused-deputy behavior between browser, Credential Manager, Wallet, and Verifier, and failure to bind the returned SMART response to the original SMART request and presentation session. The base flow addresses these threats through the W3C Digital Credentials API invocation context, direct `org-iso-mdoc` presentation, transport validation, and clinical response validation.

For the cross-device kiosk flow, the Submission service and any QR or pointer transport are not trusted with plaintext clinical content. The main threats include QR substitution, pointer/request mismatch, replay of stale kiosk requests, relay observation of metadata, ciphertext swapping, completion spoofing, and accidental disclosure on a shared kiosk display. The kiosk flow mitigates these risks by embedding the SMART request directly in a signed kiosk request payload, encrypting request and response material, binding pointer metadata to the decrypted payload, re-entering the same-device flow on the phone, and returning only an encrypted result for desktop completion.

For the clinical content model, the main threats include requesting more data than a workflow needs, hiding the purpose of a request, collapsing consent into all-or-nothing choices, mislabeling Artifact media types, losing per-item status, and treating patient-mediated raw clinical content as if it carried stronger provenance than it actually does. The model addresses these risks by separating display purpose from requester identity, using request items for Holder review, reporting per-item status, declaring Artifact media types, and preserving the distinction between clinical content and transport trust.

This summary is informative. Later normative sections define the required validation, encryption, freshness, consent-display, minimization, and error-handling behavior for each conformance target.

## Organizer notes

### Strengths

- Keeps the clinical content model, same-device direct `org-iso-mdoc` flow, and cross-device kiosk wrapper visibly distinct.
- States that the kiosk payload embeds `smartRequest` directly and rejects demo preset or wrapper semantics.
- Preserves the array shape of `profilesFrom[]` and the additive semantics of `profiles[]` plus `profilesFrom[]` without over-defining §5 details.
- Frames check-in as request/response plus per-item consent and fulfillment, not credential issuance or a general presentation query language.
- Separates origin, reader, issuer/device, and clinical-source trust so later sections can layer stronger policies.

### Caveats

- This draft is intentionally informative and avoids BCP 14 requirements. Normative terms, conformance targets, and exact validation rules should be introduced in §§4–9 and §§11–12.
- Threat-model text references §11 and §12 for security and privacy even though the outline placeholder says §10; §10 is better reserved for the future OID4VP binding unless the final outline changes.
- The list of status outcomes in §2.3.2 is illustrative; §6 should define the exact status code registry and semantics.
- The exact interaction between `resourceTypes[]` and profile selectors is left to §5, consistent with T1.A terminology.

### Downstream dependencies

- §3 should reuse this draft's separation of clinical content domain, same-device presentation flow, and cross-device kiosk flow.
- §5 must define `profilesFrom[]` as an array of canonical profile-family URLs and specify additive profile-selector semantics precisely.
- §6 must define Artifact media-type rules, `requestId` binding, per-item status coverage, and many-to-many fulfillment validation.
- §7 should refine the layered trust model without implying that raw FHIR JSON automatically has issuer-level provenance.
- §8 should define the direct `org-iso-mdoc` same-device binding as the base presentation flow.
- §9 should ensure kiosk text remains a wrapper that re-enters §8 on the phone and embeds the SMART request directly.
- §§11–12 should expand the threat and privacy summaries into concrete validation, encryption, minimization, retention, and logging requirements.
