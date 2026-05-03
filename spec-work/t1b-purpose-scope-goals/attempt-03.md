## 1.2 Scope

SMART Health Check-in 1.0 defines an interoperable way for a Requester, such as an EHR, patient portal, clinic kiosk, payer-facing workflow, or referral workflow, to ask a Holder for clinical content through a Wallet and to receive a structured SMART response. The specification is scoped to patient-mediated check-in: the Holder remains in control of disclosure, the Wallet acts as the usual Responder, and the Verifier transports and validates the response for the Requester.

The profile fixes the parts of check-in that otherwise vary across EHRs, portals, kiosk products, and wallets:

- a transport-neutral clinical content model for the SMART request and SMART response;
- request items with user-facing purpose, title, summary, advisory required flags, accepted media types, and structured content selectors;
- FHIR-native selectors for exact profiles, profile families, resource types, and questionnaires;
- profile-selector additivity, in which `profiles[]` and `profilesFrom[]` broaden the acceptable profile set rather than narrowing one another;
- per-item consent and per-item status reporting, so a Holder can share, decline, partially fulfill, or fail individual request items;
- Artifact-centered response packaging, including many-to-many fulfillment between Artifacts and request items;
- a base same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API; and
- a cross-device kiosk flow that wraps the same-device presentation flow without creating a second clinical protocol.

The clinical content model is transport-neutral. A SMART request has the same clinical meaning whether it is carried by the same-device presentation flow, by the cross-device kiosk wrapper, or by a future binding. In version 1.0, the base presentation flow is the same-device direct `org-iso-mdoc` flow over the W3C Digital Credentials API. The kiosk flow is an optional wrapper: the kiosk request payload embeds the SMART request directly as `smartRequest`, the phone resolves the kiosk pointer, and the phone re-enters the same-device presentation flow locally for that embedded SMART request. Demo presets, preset names, and request-wrapper shortcuts are not protocol payloads.

This specification also scopes the trust model enough to make interoperation possible. It separates web origin trust, Verifier or reader trust, issuer or device-attestation trust, and clinical-content source trust. It does not require every deployment to use every trust layer. Instead, it defines protocol seams where those trust layers can be applied and validated consistently.

The specification source is pure Markdown. Protocol requirements, data models, examples, and cross-references are intended to remain visible in the Markdown source rather than depending on generated hidden content.

## 1.3 Out of scope

The following topics are intentionally out of scope for SMART Health Check-in 1.0:

- **Issuance.** The specification does not define how clinical credentials, SMART Health Cards, FHIR resources, insurance cards, questionnaires, or other Holder data are issued to a Wallet or made available to a Holder data source.
- **Longitudinal wallet storage.** The specification does not define wallet synchronization, retention policy, data refresh, background polling, backup, account recovery, or permanent personal health record behavior.
- **EHR write-back.** The specification defines how a Requester asks for and receives a SMART response. It does not define how an EHR stores, reconciles, files, imports, amends, or writes clinical data after receipt.
- **Identity proofing and account binding.** The specification does not define patient identity proofing, portal account creation, enterprise master-patient-index matching, guardian verification, or legal authority adjudication.
- **Payments.** The specification does not define payment authorization, collection, claims submission, eligibility transaction standards, or financial settlement.
- **Clinical policy.** The specification does not decide which data a provider, payer, or public-health program is legally entitled to request, which data the Holder should disclose, or which clinical workflows should treat a response as sufficient.
- **Platform wallet APIs beyond protocol effects.** Browser, operating-system, and Credential Manager implementation details are out of scope except where a detail is necessary to define interoperable wire artifacts.
- **A general-purpose credential exchange framework.** The specification profiles check-in-oriented clinical request and response behavior; it is not a replacement for general credential issuance, presentation, or federation specifications.

Out-of-scope topics may be implemented by products around this protocol. Such behavior must not change the semantics of a SMART request, a SMART response, the same-device presentation flow, or the kiosk wrapper defined by this specification.

## 2.1 Use cases

### 2.1.1 Same-device patient portal check-in

A patient opens a patient portal or scheduling site on a phone that has access to a Wallet. The portal acts as Requester and Verifier, constructs a SMART request, and invokes the same-device presentation flow through the W3C Digital Credentials API using direct `org-iso-mdoc`. The Wallet renders the requested items, obtains Holder consent according to its policies, and returns a SMART response containing Artifacts and per-item statuses.

This use case motivates the base flow: the Requester and Wallet are on the same device, the clinical request/response model is independent of the presentation envelope, and the Verifier can process a predictable response shape regardless of which wallet fulfilled the request.

### 2.1.2 In-person front-desk kiosk check-in

A patient arrives at a clinic front desk and sees a kiosk, tablet, or desktop check-in display. The Kiosk creator creates a kiosk request payload that embeds the SMART request directly, encrypts and signs the wrapper as specified for the kiosk flow, and displays a Pointer URL, commonly as a QR code. The patient's phone resolves the pointer, obtains the embedded SMART request, re-enters the same-device presentation flow on the phone, and submits an encrypted result for the Completion display.

This use case motivates the wrapper design. The kiosk flow exists to bridge devices, not to define a different clinical protocol. The Submission service relays encrypted state and is not trusted with plaintext clinical content.

### 2.1.3 Pre-visit intake from a patient phone

Before an appointment, a Requester asks a Holder to complete or share intake material from a phone. Request items can ask for FHIR resources, an existing questionnaire response, or completion of an inline or referenced Questionnaire. The Wallet can show each item separately and return a SMART response that includes fulfilled items, declined items, and errors without collapsing the entire interaction into one all-or-nothing result.

This use case motivates per-item consent, item-level status, and acceptance of multiple response media types.

### 2.1.4 Insurance verification

A clinic, pharmacy, payer-facing service, or administrative workflow asks the Holder for coverage or related payer information, such as CARIN-style coverage resources or a SMART Health Card containing coverage data. The request can use exact FHIR profile canonicals in `profiles[]`, profile-family URLs in `profilesFrom[]`, resource-type selectors where appropriate, and accepted media types reflecting what the Requester can process.

This use case motivates FHIR-native selection instead of local topic vocabularies. It also illustrates why `profiles[]` and `profilesFrom[]` are additive: a Requester may accept either an exact known profile or a member of a recognized profile family.

### 2.1.5 Health summary share for prior-auth or referrals

A Requester involved in prior authorization, referral coordination, or intake for a new care relationship asks the Holder for a focused health summary. A single Artifact, such as a FHIR Bundle or SMART Health Card, may fulfill multiple request items; conversely, one request item may be fulfilled by multiple Artifacts. The response identifies these relationships explicitly rather than relying on positional matching or transport-specific credential descriptors.

This use case motivates many-to-many fulfillment, Artifact identifiers, and validation rules that let EHRs and wallets interoperate across heterogeneous clinical payloads.

## 2.2 Why a check-in protocol vs. plain credential issuance/presentation

Plain credential issuance and presentation protocols answer an important but different question: how a credential is issued, discovered, selected, presented, and cryptographically verified. Check-in requires additional clinical semantics that are not supplied by presentation alone.

A check-in Requester needs to say why it is asking, which clinical or administrative items it can use, which media types it can process, which FHIR versions are acceptable, and how the Holder should see each requested item. A Wallet needs to present those items in a way that supports meaningful consent, construct or gather responsive Artifacts from Holder data sources, and report item-level outcomes. A response consumer needs to know which Artifacts fulfill which request items and which items were declined, partially fulfilled, unavailable, or failed.

Without a check-in protocol, each EHR and wallet would have to invent local conventions for request topics, profile matching, consent granularity, response packaging, error handling, and kiosk bridging. Those conventions would be difficult to certify and brittle across multiple EHRs and multiple wallet platforms. SMART Health Check-in standardizes these clinical request and response semantics while reusing presentation technologies for transport and proof.

The result is intentionally layered. The same-device direct `org-iso-mdoc` flow provides the base version 1.0 presentation path. The cross-device kiosk flow wraps that same path and re-enters it on the phone. Future bindings may carry the same clinical content model, but they do not change what a SMART request asks or what a SMART response means.

## 2.3 Goals

### 2.3.1 Transport-neutral clinical content

The SMART request and SMART response define clinical semantics independently of presentation transport. The same request items, selectors, Artifacts, and statuses retain their meaning when carried in the base same-device flow, the kiosk wrapper, or a future transport binding. Transport envelopes can add proof, encryption, origin context, relay behavior, and delivery constraints; they do not change the clinical meaning of the embedded SMART request or SMART response.

### 2.3.2 Per-item user consent

The protocol is designed around item-level Holder review. A Requester can split a check-in interaction into request items that correspond to meaningful clinical or administrative choices. A Wallet can render those items to the Holder, apply local policy, and return a response that distinguishes fulfilled, declined, partial, unavailable, and error outcomes. The protocol does not require a Wallet to disclose all requested data merely because one item is approved.

### 2.3.3 FHIR-native selectors

Requesters should be able to describe clinical content using FHIR-native identifiers rather than local topic names. Exact FHIR profile canonicals, profile-family canonical URLs in `profilesFrom[]`, official FHIR resource type names, FHIR version constraints, and Questionnaire references allow wallets and EHRs to reason over existing implementation guides and conformance resources. The profile-family mechanism is explicitly an array of canonical profile-family URLs.

### 2.3.4 Many-to-many fulfillment

The response model supports realistic clinical packaging. One Artifact can satisfy multiple request items, and one request item can be satisfied by multiple Artifacts. Fulfillment links are explicit and based on request item ids. This avoids forcing wallets to duplicate content, split natural FHIR Bundles, or encode fulfillment semantics in transport-specific credential metadata.

### 2.3.5 Interop across multiple EHRs and multiple wallet platforms

The profile aims to make independent implementations predictable. A Requester from one EHR ecosystem should be able to create a SMART request that a Wallet from another ecosystem can understand. A Wallet should be able to construct a SMART response that multiple Requesters can validate without private agreements about field names, topic codes, kiosk wrappers, or response packaging. The profile therefore standardizes the clinical JSON model, the base same-device direct `org-iso-mdoc` binding, and the kiosk wrapper's relationship to that base flow.

### 2.3.6 Layerable trust

The protocol separates trust questions so deployments can compose them. A Verifier may rely on web origin and user-agent mediation for the same-device invocation, reader or Verifier authentication where profiled, issuer and device-attestation evidence from mdoc or credential ecosystems, and clinical-content provenance where an Artifact itself carries source evidence. These layers are related but not interchangeable. In particular, successful transport presentation does not by itself prove that unsigned clinical content originated from a particular clinical system.

## 2.4 Non-goals

SMART Health Check-in 1.0 does not aim to:

- create a universal patient identity, insurance identity, or provider identity system;
- mandate a particular Wallet storage architecture, credential format inventory, issuer network, or synchronization mechanism;
- define a complete EHR ingestion, reconciliation, deduplication, or write-back workflow;
- replace FHIR, SMART Health Cards, W3C Digital Credentials API, ISO/IEC 18013-5 mdoc, OpenID4VP, or payer transaction standards;
- guarantee that requested content exists, is clinically complete, is current, or is legally sufficient for a downstream workflow;
- require wallets to disclose data without Holder control or local policy enforcement;
- standardize user-interface layouts, clinical wording, staff workflows, or appointment operations beyond the protocol fields needed for interoperation;
- make the kiosk Submission service trusted with plaintext request or response content;
- define production trust-anchor governance, certification policy, or liability allocation; or
- treat demo presets, example requests, SDK helper objects, or implementation convenience wrappers as protocol objects.

These non-goals are design constraints. Implementations can build product features around the protocol, but conformance to this specification is about interoperable request construction, Holder-mediated response construction, transport binding behavior, and validation of the resulting protocol artifacts.

## 2.5 Threat model summary

SMART Health Check-in assumes an active network attacker and potentially curious intermediaries. Attackers may observe, replay, delay, substitute, or modify messages unless protected by the relevant transport, signature, encryption, freshness, and validation rules. Attackers may also attempt to spoof origins, impersonate Requesters or Verifiers, trick a Holder into approving unintended disclosure, correlate requests across sessions, or cause a Wallet to send clinical content to the wrong destination.

For the same-device presentation flow, the main threats include origin spoofing, UI redress, malicious or confused Verifier pages, malformed request envelopes, downgrade or profile-confusion attacks, replay of stale requests, and misbinding between the transport presentation and the embedded SMART request. The base flow uses W3C Digital Credentials API mediation and direct `org-iso-mdoc` presentation, but those mechanisms must be paired with the validation requirements and trust processing defined later in this specification.

For the cross-device kiosk flow, the main additional threats include QR-code substitution, pointer tampering, relay observation, replay of kiosk requests, confused pairing between a kiosk desktop and a phone, and leakage through metadata visible to the Submission service. The kiosk wrapper therefore treats the Submission service as untrusted for plaintext clinical content and relies on signed and encrypted wrapper artifacts, pointer-to-payload binding, phone-side validation, same-device re-entry, encrypted submission, expiration, and single-use handling.

For clinical content, the main threats include overbroad requests, accidental disclosure, untrusted or stale Holder data sources, misleading item descriptions, response tampering, mismatched `requestId` values, incorrect fulfillment links, and unsupported media types. The protocol mitigates these risks by making request items explicit, supporting per-item consent and status, requiring response validation, and preserving separate trust layers for transport, issuer evidence, and clinical-content provenance.

Detailed security requirements are defined in §11. Privacy requirements and guidance, including data minimization, selective disclosure, linkability, retention, and telemetry, are defined in §12. Reserved or future presentation bindings, including the placeholder OID4VP material in §10, must preserve the same clinical request/response semantics and must not weaken the threat mitigations required for the active version 1.0 flows.

## Organizer notes

### Strengths

- Establishes a sharp boundary between the transport-neutral clinical content model, the base same-device direct `org-iso-mdoc` flow, and the kiosk wrapper.
- Explicitly preserves active protocol facts: kiosk payloads embed `smartRequest` directly, kiosk re-enters same-device presentation on the phone, and demo presets are non-protocol conveniences.
- Frames check-in as more than credential presentation by emphasizing request items, per-item consent, FHIR selectors, Artifact fulfillment, and item-level statuses.
- Separates trust layers without turning this informative section into detailed normative protocol text.

### Caveats

- This draft intentionally avoids exact SHALL-level language for field shapes, validation algorithms, cryptographic processing, and conformance classes; later normative sections should supply those requirements.
- The threat model is a summary. Final text should be reconciled with the completed §7 trust framework, §8 same-device flow, §9 kiosk flow, §11 security considerations, and §12 privacy considerations.
- The use-case prose names representative standards such as CARIN and SMART Health Cards, but final examples should align with the canonical media types, profile-family registry, and fixture set.

### Downstream dependencies

- §3 should reuse this draft's statement that kiosk is a wrapper and not a second clinical protocol.
- §5 should define the exact request model, including `profilesFrom[]` as an array of canonical profile-family URLs and additive semantics for `profiles[]` plus `profilesFrom[]`.
- §6 should define the Artifact model, per-item status coverage, and many-to-many fulfillment validation.
- §§7–9 should turn the layerable-trust and flow summaries into precise trust, transport, and kiosk requirements.
- §§11–12 should expand the threat model summary into concrete security and privacy requirements without changing the T1.B scope boundaries.
