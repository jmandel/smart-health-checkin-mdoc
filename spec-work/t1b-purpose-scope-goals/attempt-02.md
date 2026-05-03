## 1.2 Scope

SMART Health Check-in 1.0 defines an interoperability profile for patient-mediated clinical check-in. Its purpose is to let multiple EHRs, patient portals, front-desk systems, and Wallet implementations ask for and receive the same categories of clinical content without each pair of systems inventing a private request vocabulary, consent model, or presentation envelope.

The profile covers three separable but coordinated layers:

1. A **clinical content model**: the transport-neutral `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse` JSON objects. This model describes what the Requester is asking the Holder to share, how the Wallet reports per-item status, and how returned Artifacts fulfill requested items.
2. A base **same-device presentation flow**: direct `org-iso-mdoc` presentation over the W3C Digital Credentials API, used when the Verifier page and Wallet are reachable on the same device.
3. An optional **cross-device kiosk flow**: a wrapper for in-person or desktop-initiated encounters. The Kiosk creator produces a pointer to an encrypted kiosk request; the Phone presenter resolves it, obtains the embedded SMART request, re-enters the same-device presentation flow locally on the phone, and returns an encrypted result for the Completion display.

The clinical request and response model is intentionally transport-neutral. The same SMART request has the same clinical meaning whether it is carried by the same-device presentation flow, by the kiosk wrapper, or by a future binding. Conversely, presentation transports do not change the meaning of request items, selectors, accepted media types, consent decisions, Artifacts, or per-item status.

Within the clinical content model, this profile defines how a Requester can identify desired FHIR content using FHIR-native selectors, including exact `profiles[]` canonicals and `profilesFrom[]` arrays of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive selectors: either form can make content responsive, subject to the rest of the item definition. The detailed selector rules are defined in §5; this section establishes the scope of the problem the selectors solve.

The profile also defines the response shape needed for interoperable ingestion and review. A Wallet returns a SMART response with Artifacts labeled by media type, per-item status for every request item, and fulfillment links that support many-to-many relationships between requested items and returned Artifacts. This lets a single Artifact satisfy multiple request items and lets a single request item be satisfied by multiple Artifacts when that is clinically or operationally appropriate.

This specification is in scope when a Requester needs a standard way to ask a Holder-controlled Wallet for check-in content; when a Wallet needs a standard way to render, approve, decline, and package responses; and when a Verifier or response consumer needs predictable validation rules for the returned SMART response.

## 1.3 Out of scope

SMART Health Check-in 1.0 does not define how clinical data or credentials are originally issued to the Holder or Wallet. Issuer onboarding, credential issuance APIs, issuer lifecycle management, and credential refresh protocols are outside this specification.

The profile does not define longitudinal Wallet storage. A Wallet may use local storage, SMART Health Cards, cached FHIR resources, connected services, or other Holder data sources, but those sources are abstract from the protocol's point of view. The specification does not require a Wallet to become a longitudinal personal health record.

The profile does not define EHR write-back. It standardizes patient-mediated disclosure to a Requester and validation of the returned SMART response. How an EHR, payer system, intake system, or staff workflow imports, reconciles, deduplicates, persists, or acts on returned content is a deployment decision, subject to applicable law and local policy.

The profile does not perform identity proofing. It can carry clinical content through presentation flows and can layer origin, reader, issuer, device, and content-source trust signals, but it does not decide whether the Holder is legally the patient, whether a guardian relationship is valid, or whether an account enrollment process is sufficient for a clinical or payment workflow.

The profile does not define payments, eligibility transactions, claims submission, benefit adjudication, coverage enrollment, or financial authorization. Insurance verification use cases are limited to patient-mediated sharing of coverage-related clinical or administrative artifacts, such as FHIR resources conforming to relevant profiles.

The profile does not define a general-purpose credential wallet, a universal verifiable-presentation protocol, or a replacement for SMART App Launch, payer APIs, FHIR bulk export, or other data-access frameworks. It defines a check-in request/response profile that can coexist with those frameworks.

## 2.1 Use cases

### 2.1.1 Same-device patient portal check-in

A patient opens a health-system portal or pre-registration page on a phone that also has access to a Wallet. The portal acts as the Requester and Verifier, constructs a SMART request for content such as demographics, coverage, medications, allergies, or a pre-visit questionnaire, and invokes the same-device presentation flow. The Wallet displays the requested items, obtains Holder consent per item, and returns a SMART response through direct `org-iso-mdoc` over the W3C Digital Credentials API.

This use case exercises the base presentation flow. It requires the clinical content model to be independent of a particular portal vendor and requires the Wallet response to be understandable by the Requester's validation and intake workflow.

### 2.1.2 In-person front-desk kiosk check-in

A patient arrives at a clinic and starts check-in on a kiosk, tablet, or staff desktop. The Kiosk creator prepares a SMART request and embeds it directly as `smartRequest` in the signed kiosk request payload. The kiosk displays or prints a Pointer URL, commonly encoded as a QR code. The patient's phone resolves the pointer, validates and decrypts the kiosk request, and then re-enters the same-device presentation flow on the phone for the embedded SMART request. The resulting SMART response is encrypted back for the Completion display.

The kiosk flow is a wrapper around the same-device flow, not a second clinical protocol. The kiosk request payload carries the SMART request directly; it does not carry a demo preset, request wrapper, or indirect preset name as the protocol object.

### 2.1.3 Pre-visit intake from a patient phone

Before a visit, a practice sends the patient a link to complete intake on a phone. The request may include questionnaire content, requests for current medications or allergies, and optional requests for prior records. The Wallet can satisfy some items with existing Artifacts, can construct a QuestionnaireResponse for an inline or canonical Questionnaire, can mark unavailable items, and can allow the Holder to decline specific items.

This use case depends on per-item consent and per-item status. It should not force an all-or-nothing disclosure merely because several intake needs are bundled into one check-in session.

### 2.1.4 Insurance verification

A provider, pharmacy, or other relying party asks the Holder to share coverage information for check-in. The request can use FHIR-native selectors for coverage-related content, including exact profiles or profile families such as CARIN-style coverage profiles when appropriate. The Wallet may return a SMART Health Card Artifact, raw FHIR JSON, or another accepted media type supported by the item and by later registry rules.

This profile does not adjudicate eligibility or submit claims. It standardizes patient-mediated sharing of the coverage-related information the Requester asks the Holder to disclose.

### 2.1.5 Health summary share for prior authorization or referrals

A Requester may need a concise health summary to support a referral, prior authorization workflow, care transition, or second-opinion intake. The SMART request can ask for a set of FHIR resources selected by profile families, exact profiles, resource types, or other registered selectors. The response may contain one or more Artifacts that together satisfy the requested items.

This use case motivates many-to-many fulfillment. For example, a single summary Bundle may fulfill several request items, while one broad request item may be fulfilled by separate medication, problem, allergy, and immunization Artifacts.

## 2.2 Why a check-in protocol vs. plain credential issuance/presentation

Plain credential issuance and presentation protocols are necessary but not sufficient for interoperable check-in. Check-in is not only the act of presenting a credential; it is an interaction in which a Requester asks for a task-specific set of clinical content, the Wallet helps the Holder understand and decide item by item, and the response consumer needs to know which requested needs were fulfilled, declined, unsupported, unavailable, partial, or errored.

A generic presentation request can prove possession of a credential, but it usually does not define a FHIR-native request vocabulary for clinical selectors, a response model for multiple accepted media types, a per-item consent and status report, or many-to-many fulfillment between requested items and returned Artifacts. Without those conventions, each EHR and Wallet pair must agree out of band on what "insurance card," "visit summary," "US Core history," or "pre-visit intake" means.

SMART Health Check-in provides the missing clinical layer. It lets Requesters express desired content using FHIR canonicals, profile families, resource types, questionnaires, and registered extension selectors. It lets Wallets respond with raw FHIR JSON, SMART Health Cards, or other registered Artifact forms as permitted by each item. It lets Verifiers validate a predictable response shape before any local ingestion or workflow processing.

The presentation layer remains important. Version 1.0 specifies the same-device direct `org-iso-mdoc` flow over the W3C Digital Credentials API as the base presentation flow, and specifies the kiosk wrapper for cross-device initiation. These flows provide transport, encryption, presentation validation, and trust hooks. They do not replace the transport-neutral clinical content model.

## 2.3 Goals

### 2.3.1 Transport-neutral clinical content

The SMART request and SMART response are defined independently of the transport that carries them. A request item's clinical meaning, selectors, accepted media types, display purpose, and status semantics do not depend on whether the object travels through same-device direct `org-iso-mdoc`, through the kiosk wrapper, or through a future binding.

### 2.3.2 Per-item user consent

A Holder should be able to understand and decide about requested content at the level of meaningful request items. The protocol supports fulfillment, partial fulfillment, decline, unsupported, unavailable, and error states per item so a Wallet can avoid unnecessary all-or-nothing behavior. A request item's `required` indication is advisory for the check-in workflow; it does not remove Holder control.

### 2.3.3 FHIR-native selectors

Clinical content selection should use FHIR-native identifiers where they fit. Exact profiles are expressed with FHIR canonicals in `profiles[]`; profile families are expressed as arrays of canonical profile-family URLs in `profilesFrom[]`; other selector fields can use FHIR resource types, Questionnaire canonicals, inline Questionnaire resources, or registered extension kinds. The profile avoids local topic vocabularies when FHIR terminology can identify the desired content more precisely.

### 2.3.4 Many-to-many fulfillment

The response model supports realistic clinical packaging. One Artifact may fulfill multiple request items, and one request item may be fulfilled by multiple Artifacts. This permits Wallets to return content in clinically natural or credential-native units while still giving the Requester a clear account of how each item in the SMART request was handled.

### 2.3.5 Interop across multiple EHRs and multiple wallet platforms

The profile aims for many-to-many interoperability. An EHR, payer, pharmacy, kiosk vendor, or patient portal should not need a custom integration for every Wallet, and a Wallet should not need a private request grammar for every Requester. The common model includes request item structure, FHIR selectors, media type negotiation, response status, validation expectations, and the base presentation and kiosk flows.

### 2.3.6 Layerable trust

Trust in check-in is layered rather than monolithic. The Verifier, Wallet, and deployment can consider web origin assertions, optional reader or Verifier authentication, mdoc issuer and device proofs, SMART Health Card signatures, provenance in raw FHIR content, and out-of-band policy. This specification separates those layers so deployments can make explicit trust decisions without confusing transport authenticity with clinical-source provenance.

## 2.4 Non-goals

SMART Health Check-in 1.0 is not intended to solve every health-data exchange problem. In particular, it is not a goal to:

- define credential issuance, credential refresh, issuer accreditation, or Wallet enrollment;
- require or standardize longitudinal health-record storage inside Wallets;
- define EHR write-back, clinical reconciliation, deduplication, order entry, or staff workflow after a SMART response is received;
- prove real-world identity, guardianship, delegation, authorization to act for another person, or payer membership outside the evidence carried by returned content and deployment policy;
- define payments, claims, eligibility adjudication, prior-authorization submission, or benefit determination;
- prescribe Wallet user-interface layout, clinical summarization policy, or local data-source architecture;
- make raw FHIR JSON equivalent to issuer-signed clinical credentials when no separate provenance or signature is present;
- make the kiosk Submission service trusted with plaintext clinical content;
- define a second kiosk-specific clinical request language distinct from the SMART request; or
- make the reserved OpenID4VP binding in §10 a required version 1.0 presentation flow.

## 2.5 Threat model summary

SMART Health Check-in assumes that clinical check-in can expose sensitive health and coverage information and that both protocol messages and metadata can be abused. Later security and privacy sections provide the normative treatment; this subsection summarizes the main threats that motivate the design. See §11 for security considerations and §12 for privacy considerations. §10 is reserved for a future OpenID4VP binding and does not weaken the version 1.0 same-device and kiosk requirements.

The Requester and Verifier may be honest, mistaken, misconfigured, or malicious. A Wallet needs enough context to help the Holder decide whether the request is appropriate, and a Verifier needs validation rules to reject malformed, replayed, mismatched, or cryptographically invalid responses. The clinical request body itself is not the place for requester identity metadata; identity and trust signals belong to presentation, reader, origin, issuer, content-source, and deployment-policy layers.

The Browser / User Agent and Credential Manager are part of the presentation environment. The profile relies on them for the same-device Digital Credentials API invocation and for origin-related behavior as defined in later sections, while recognizing that platform behavior can vary. Wallets and Verifiers therefore need explicit processing rules for origin trust, SessionTranscript construction, encryption, and validation in §§7–8 and §11.

The Wallet is trusted by the Holder to mediate disclosure but may rely on heterogeneous Holder data sources. Returned content may range from issuer-signed SMART Health Cards to patient-mediated raw FHIR JSON. The protocol distinguishes transport binding and mdoc proofs from clinical-source provenance so a response consumer does not overstate the assurance of unsigned clinical content.

The cross-device kiosk flow treats the Submission service and pointer transport as untrusted. The relay may store, forward, delay, replay, correlate, or drop opaque blobs, but it must not be trusted with plaintext clinical content. The kiosk design therefore uses pointer-only QR content, encrypted request envelopes, direct embedding of the SMART request inside the signed kiosk payload, phone-side re-entry into the same-device flow, encrypted submission back to the Completion display, expiration, replay controls, and metadata-minimization guidance developed in §9, §11, and §12.

The Holder may decline any item, provide partial information, or lack responsive content. These are not protocol failures by themselves. The threat model includes over-collection and consent confusion as first-class risks, which is why the response model preserves per-item status and why privacy considerations in §12 address minimization, linkability, retention, requester-intent display, and telemetry.

## Organizer notes

### Strengths

- Keeps the clinical content model explicitly transport-neutral while still naming direct `org-iso-mdoc` over the W3C Digital Credentials API as the version 1.0 base presentation flow.
- Frames kiosk as a wrapper that re-enters the same-device flow on the phone, and states that `smartRequest` is embedded directly with no demo preset or protocol wrapper.
- Connects the use cases to concrete design features: per-item consent, FHIR-native selectors, many-to-many fulfillment, and layered trust.
- Avoids normative wire-format detail while preserving active protocol facts that later normative sections need.

### Caveats

- §2.5 references §11 and §12 for normative security and privacy treatment; the outline line for §2.5 mentions §10, but §10 is reserved for OpenID4VP. This draft explicitly calls out §10 as reserved to prevent accidental dependence on it.
- This text says `profiles[]` and `profilesFrom[]` are additive but leaves `resourceTypes[]` interaction to §5, consistent with T1.A.
- The insurance and prior-authorization wording avoids implying claims, eligibility adjudication, or EHR write-back are in scope.

### Downstream dependencies

- §3 should align its architecture and role diagrams with the three-layer scope described here.
- §5 must define exact selector semantics, including `profilesFrom[]` as an array of canonical profile-family URLs and additive `profiles[]`/`profilesFrom[]` behavior.
- §6 must preserve per-item status coverage and many-to-many fulfillment validation.
- §§7–9 and §11 must turn the layered-trust and kiosk threat-model summary into precise origin, reader, issuer/device, HPKE, replay, and relay-processing requirements.
- §12 should expand the per-item consent, minimization, linkability, retention, and telemetry concerns introduced here.
