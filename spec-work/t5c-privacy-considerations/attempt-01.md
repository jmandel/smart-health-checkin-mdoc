## 12. Privacy considerations

This section describes privacy considerations for SMART Health Check-in 1.0. It applies to the transport-neutral SMART request and SMART response defined in §§5-6, the same-device `org-iso-mdoc` presentation flow in §8, and the cross-device kiosk wrapper in §9. It does not create a new clinical payload model, a new proof of requester identity, a production key-custody profile, or platform-specific implementation guidance.

Clinical content, request context, Holder choices, and protocol metadata can all be sensitive. Privacy protections therefore need to cover both plaintext clinical payloads and metadata such as request ids, Artifact ids, kiosk wrapper ids, Pointer URLs, key ids, timestamps, provider rows, storage paths, logs, and telemetry. Cryptographic confidentiality is necessary but not sufficient: identifiers, display text, timing, row counts, browser history, analytics, and public kiosk screens can still reveal that a person is checking in or what kinds of data were requested.

### 12.1 Data minimization and per-item consent

A Requester should ask only for content needed for the bounded check-in workflow. Requesters SHOULD prefer narrowly described request items, selectors, accepted media types, and FHIR versions over broad “all available records” requests unless the workflow and Holder-facing explanation justify the broader request. Requesters SHOULD keep `purpose`, item `title`, item `summary`, selector lists, inline Questionnaire content, request ids, and transport metadata no larger or more specific than needed for Holder review, validation, and workflow correlation.

The protocol's disclosure granularity is the request item. A Wallet/Responder SHALL support Holder review or equivalent Holder-control processing at request-item granularity before disclosing content through the active §8 flow, except where an explicit deployment profile defines another Holder-control mechanism and assurance level. A Wallet/Responder MAY group, summarize, reorder, or suppress details for accessibility, localization, safety, or local policy, but it SHALL NOT hide multiple items, broad selectors, accepted media types, advisory `required` flags, or retention signals in a way that defeats meaningful Holder control.

The `required: true` flag is workflow advice, not consent. Scanning a QR code, opening a Pointer URL, resolving a provider row, verifying a kiosk wrapper, seeing `intentToRetain`, or clicking outside the Wallet is not by itself Holder authorization to disclose clinical content. Holder refusal, partial disclosure, unavailable data, unsupported selectors, and item-level errors are expected SMART response outcomes. Wallets/Responders should use `requestStatus[]` to report those outcomes without forcing an all-or-nothing exchange when the request was otherwise valid enough to answer.

Requesters and Wallets/Responders should also minimize what they return. A Wallet/Responder SHOULD include only Artifacts that satisfy approved request items and SHOULD avoid duplicating the same clinical content across Artifacts solely for convenience. If one Artifact fulfills multiple approved items, `fulfills[]` can express that many-to-many relationship without unnecessary duplication. Status `message` text, if present, should be concise and should avoid revealing sensitive diagnoses, source-system details, or Holder reasoning beyond what the Requester needs to interpret the item outcome.

### 12.2 Selective disclosure responsibilities

Selective disclosure in this specification is a shared responsibility. The Requester is responsible for constructing understandable, bounded request items. The Wallet/Responder is responsible for applying Holder choices, Wallet policy, available Holder data sources, and media-type rules when deciding what to return. The Verifier or receiver is responsible for validating `requestId`, `fulfills[]`, `requestStatus[]`, media types, FHIR-version context, and any clinical-source evidence before workflow use.

A Wallet/Responder SHALL NOT return an Artifact for an item unless the Holder-control process, Wallet policy, and available data support disclosure for that item. If an Artifact lists more than one item in `fulfills[]`, the Wallet/Responder needs to ensure that disclosure is appropriate for every listed item and that the Artifact `mediaType` is acceptable for each. When requested content is too broad, too sensitive, unsupported, unavailable, or not approved by the Holder, the Wallet/Responder should use the item-level status vocabulary rather than silently over-disclosing.

Selective disclosure does not turn the SMART response wrapper into a clinical provenance proof. SMART Health Card Artifacts carry signed clinical-source evidence inside `value.verifiableCredential[]`, and receivers need to verify those credentials according to SMART Health Cards and local policy. Raw `application/fhir+json` Artifacts remain patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof.

Artifact ids and request item ids support selective-disclosure accounting, not global tracking. A Wallet/Responder SHALL keep Artifact ids unique within one SMART response, but Requesters, Wallets/Responders, Verifiers, receivers, and deployment profiles SHOULD NOT assign globally stable, patient-derived, source-document-derived, or cross-verifier-reusable Artifact ids unless the Artifact payload and deployment policy explicitly require that meaning and address the privacy impact.

### 12.3 Cross-verifier linkability

Identifiers in SMART Health Check-in are scoped correlation values. `SmartHealthCheckinRequest.id` is scoped to a Requester's check-in session. `SmartHealthCheckinResponse.requestId` echoes that value for clinical request/response binding. Request item ids and Artifact ids are scoped to one request or response. Kiosk wrapper `requestId` values, provider row ids, submission ids, storage paths, key ids, certificate fields, nonces, and SessionTranscript components belong to their presentation or wrapper layers. Implementations SHALL NOT substitute identifiers across layers or describe a layer-local identifier as a patient identifier, requester identifier, source-document identifier, or authorization proof unless that meaning is separately established by payload evidence or deployment policy.

Requesters, Kiosk creators, Phone presenters, Submission services, Completion displays, Wallets/Responders, and Verifiers SHOULD avoid stable identifier reuse that allows different verifiers, relay providers, analytics systems, or downstream receivers to correlate a Holder across sessions. In particular, they should avoid embedding patient account numbers, medical record numbers, insurance member ids, phone numbers, email addresses, clinic staff ids, source document ids, or predictable sequence numbers in SMART request ids, request item ids, Artifact ids, kiosk wrapper ids, submission ids, storage paths, telemetry event ids, or log correlation ids.

Kiosk deployments need special care because the wrapper `requestId` appears in the Pointer URL fragment, provider lookup, encrypted request envelope, response-submission AAD, `SubmissionPlaintext.requestId`, provider rows, storage paths, logs, and operational dashboards. Kiosk creators SHOULD generate high-entropy wrapper ids for each session and SHOULD stop displaying, accepting, or indexing them after expiration, abandonment, cancellation, or successful completion according to policy. Submission services and Completion displays SHOULD avoid indexes, dashboards, analytics joins, or support exports that make wrapper ids a durable cross-session tracking key.

URL fragments reduce routine server-log exposure of `#r=<requestId>` because fragments are not sent in ordinary HTTP requests, but they are still visible to the browser, phone-side JavaScript, browser history, copied URLs, screenshots, accessibility tooling, device sync, analytics scripts, camera observers, and shoulder surfers. A Pointer URL or QR code is therefore privacy-sensitive routing metadata even though it is pointer-only and does not contain plaintext clinical content.

### 12.4 Wallet rendering of requester intent

Wallet and Phone presenter displays should help the Holder understand what is being requested, why, by whom if authenticated, what trust evidence is available, whether retention is intended, and what choices are available. They should distinguish authenticated origin, privileged-caller evidence, accepted reader authentication, deployment-trusted kiosk-creator evidence, and local policy warnings from unauthenticated SMART request display text.

The SMART request body intentionally excludes self-asserted requester identity metadata. `purpose`, item `title`, item `summary`, selector URLs, profile URLs, Questionnaire text, unknown request members, provider application ids, relay URLs, Pointer URL paths, logos, common names, demo branding, and returned Artifact content can be useful Holder-facing context, but they SHALL NOT be labeled as verified requester identity unless the same fact is established by the selected presentation transport, reader authentication, deployment policy, or another accepted trust layer.

Wallets/Responders SHOULD render request item content in a way that supports meaningful decisions: requested category or Questionnaire, accepted media types such as `application/fhir+json` or `application/smart-health-card`, broad selectors, advisory `required` flags, likely sensitivity where known, and consequences of declining when those consequences are supplied by trusted policy or clearly marked as requester-provided text. If display space or safety constraints require summarization, the Wallet should preserve access to enough detail for an informed Holder decision.

The mdoc `intentToRetain` value for `smart_health_checkin_response` communicates the Verifier's intended retention behavior for the same-device presentation element. Version 1.0 defaults this value to `true` because ordinary clinical check-in workflows commonly ingest or route returned Artifacts. Wallets/Responders SHOULD expose this signal, or an equivalent retention explanation, when it is relevant to Holder choice. The signal does not override Holder choice, Wallet policy, legal requirements, downstream recordkeeping law, or this section's minimization guidance.

Kiosk user interfaces should avoid implying that the public screen or QR code is the consent surface. The phone-side flow should make clear that scanning or opening the Pointer URL loads a request for validation and Wallet review; sharing occurs only through the Wallet/Responder or equivalent Holder-control surface. Completion displays should avoid showing sensitive clinical details on public or shared screens unless the viewer is authorized and local policy permits it.

### 12.5 Storage retention defaults

SMART Health Check-in is designed for workflows that often need retained administrative or clinical records after check-in, but the protocol does not mandate any particular downstream retention duration, Wallet storage model, EHR write-back behavior, backup policy, or audit-record content. Retention is controlled by applicable law, local policy, deployment profile, and the systems that store the data.

Implementations SHOULD default transient protocol state to the shortest lifetime compatible with completion, recovery, auditing, and legal obligations. This includes §8 HPKE recipient private keys, `encryptionInfo`, SessionTranscript bytes, Digital Credentials API response objects, decrypted `DeviceResponse` CBOR, parsed SMART responses, kiosk request-opening private keys, desktop response private keys, decrypted kiosk request JWS payloads, decrypted `SubmissionPlaintext`, provider rows, ciphertext blobs, QR state, browser storage, debug panels, and local caches.

A Verifier or Completion display that intends only ephemeral use MAY signal or document that intent where the selected flow supports it, including by setting mdoc `intentToRetain` to `false` when it truly intends ephemeral use and policy permits. If a workflow will retain or ingest returned Artifacts, the Holder-facing experience should not imply ephemeral handling merely because transport state is short-lived or encrypted at the relay.

Submission services SHOULD delete or make inaccessible expired request rows, encrypted request envelopes, submission rows, ciphertext blobs, orphaned blobs, duplicate rows, and operational indexes after expiration, abandonment, successful completion, or a deployment-defined retention period. Completion displays SHOULD release desktop private keys and remove decrypted submissions, transient SMART responses, QR state, and debug artifacts when no longer needed. Provider cleanup is defense in depth; it does not replace end-to-end encryption, local validation, or downstream retention policy.

Logs, crash reports, analytics stores, support bundles, fixture captures, and browser storage often outlive protocol state. Implementations SHOULD apply the same retention limits and access controls to those secondary stores. Fixtures and demos may contain intentionally public test private keys, decrypted payloads, or non-PHI sample data only when clearly labeled as non-production material and separated from live traffic. Live PHI, production private keys, bearer credentials, or unredacted clinical payloads in a debug bundle or fixture should be treated as an incident, not as normal protocol evidence.

### 12.6 Sensitive category handling

Check-in requests can involve highly sensitive categories, including but not limited to mental health, substance-use treatment, reproductive or sexual health, HIV and sexually transmitted infections, genetic information, immunization status, minors' data, proxy or guardian-mediated data, disability information, financial or coverage information, and free-text Questionnaire answers. The protocol's FHIR-native selectors, Questionnaire support, and per-item statuses make these categories expressible; they do not by themselves decide whether requesting or disclosing them is appropriate.

Requesters SHOULD separate sensitive categories into distinct request items when that separation improves Holder understanding or enables partial disclosure. They SHOULD avoid combining unrelated sensitive and non-sensitive content into one broad item if doing so would pressure the Holder into over-disclosure. Wallets/Responders SHOULD apply local policy, applicable law, and Holder preferences to each item and SHOULD return `declined`, `partial`, `unavailable`, `unsupported`, or `error` outcomes when disclosure is not appropriate or not possible.

Wallets/Responders MAY apply stricter review, warnings, suppression, redaction, data-source selection, or refusal policies for sensitive categories, broad selectors, inline Questionnaires, or unsupported extension selectors. A deployment profile MAY require stronger origin, reader authentication, clinical-source evidence, consent language, age/proxy handling, or policy checks for particular categories. Such policies SHALL NOT redefine the base semantics of request items, `accept[]`, `fulfills[]`, `requestStatus[]`, Artifact media types, or the separation between transport trust and clinical-source trust.

Status and error messages can themselves disclose sensitive information. A Wallet/Responder SHOULD avoid messages such as detailed diagnoses, source-system names, or explicit Holder reasoning unless needed for the workflow and permitted by policy. A generic declined, partial, unavailable, unsupported, or error status is often more privacy-preserving than a detailed explanation.

Receivers should not assume that a missing Artifact means the Holder does not have the condition or data. It can mean refusal, policy restriction, lack of access, unsupported format, unavailable source, partial fulfillment, error, or a Wallet decision not to disclose. Downstream clinical or administrative workflows need local interpretation and should avoid adverse inferences beyond what the returned status and local policy support.

### 12.7 Telemetry guidance

Telemetry, analytics, observability, abuse monitoring, and support diagnostics are useful for safe deployments, but they can create durable records of check-in activity and Holder choices. Implementations SHOULD design telemetry so routine events do not contain plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, decrypted kiosk request payloads, decrypted submissions, §8 `DeviceResponse` plaintext, `dcapiResponse` internals, private keys, shared secrets, bearer credentials, full ciphertext blobs, or stable patient-derived identifiers.

Telemetry SHOULD minimize and bound metadata as well as content. Potentially sensitive metadata includes SMART request ids, request item ids, Artifact ids, wrapper request ids, submission ids, storage paths, provider app ids, key ids, certificate subjects, origins, IP addresses, user agents, timestamps, scan timing, row counts, retry behavior, payload sizes, error categories, and validation outcomes. When operationally feasible, deployments should aggregate, sample, truncate, hash with deployment-scoped rotating keys, or otherwise de-identify telemetry rather than storing raw identifiers.

Error reporting should support recovery and abuse detection without enabling enumeration. Phone presenters, Submission services, Completion displays, Wallets/Responders, and Verifiers SHOULD avoid telemetry and user-facing errors that reveal whether a guessed wrapper id, provider row, storage path, key id, patient record, or request id was valid, expired, completed, declined, or merely unavailable beyond what is needed for safe user recovery and support.

Telemetry from the untrusted kiosk relay is relay metadata, not clinical or consent evidence. Provider access logs, upload status, download status, row presence, blob existence, notification order, IP addresses, user agents, or analytics events SHALL NOT be used as proof of Holder consent, patient identity, SMART response validity, §8 validation, clinical-source provenance, or downstream authorization.

Production deployments SHOULD document who can access telemetry, how long it is retained, which identifiers are collected, whether third-party analytics or crash services are used, how support exports are redacted, and how live PHI or secrets discovered in telemetry are handled. Platform-specific logging controls, browser storage APIs, mobile crash-reporting SDK choices, and operational monitoring architecture belong in implementation guidance or deployment profiles, not in the base privacy semantics.

## Organizer notes

### Strengths

- Preserves the accepted layering: SMART request/response are transport-neutral clinical JSON; origin, reader, issuer/device, clinical-source, kiosk wrapper, provider, and downstream policy remain separate.
- Reflects the actual §9 kiosk flow: pointer-only `#r=<requestId>`, direct `smartRequest`, wrapper `requestId` distinct from `smartRequest.id`, untrusted relay, ciphertext plus metadata at the provider, and active submission carrying only `payload.smartResponse` rather than raw `dcapiResponse` or `deviceResponse`.
- Covers the organizer focus areas explicitly: per-item consent, selective disclosure, linkability, requester-intent rendering, retention, sensitive categories, logs, and telemetry.

### Caveats

- Some recommendations intentionally use SHOULD rather than SHALL because concrete retention periods, telemetry schemas, sensitive-category policy, and production trust requirements depend on law and deployment profiles.
- The text treats active demo/debug behavior as negative production guidance without making the prototype's developer UI a protocol violation.
- The `intentToRetain` discussion should be reconciled with final §8 wording and any future conformance inventory so it remains a transparency signal, not an EHR retention mandate.

### Open questions

- Should §12 define any hard minimum lexical or entropy requirements for privacy-sensitive identifiers, or leave those to §9, Appendix C, conformance vectors, and deployment profiles?
- Should status `message` privacy receive a specific Appendix A conformance row, or remain guidance under §12.1/§12.6?
- Should a future profile define a standardized ephemeral-use signal beyond mdoc `intentToRetain=false` for kiosk completion and non-mdoc bindings?

### Downstream dependencies

- T5.F / Appendix A should inventory only the explicit SHALL statements here and distinguish deployment-policy SHOULDs from core conformance.
- T5.E should apply internationalization only to actual human-facing fields such as `purpose`, item titles/summaries, Questionnaire text, and status messages.
- T6.A should place platform-specific logging, browser storage, mobile crash-reporting, production key custody, and operations guidance outside §12.
- T6.C should include fixture and test-vector checks for no plaintext in pointer URLs, provider rows, active submissions, logs/debug exports where feasible, and cross-boundary identifier separation.
