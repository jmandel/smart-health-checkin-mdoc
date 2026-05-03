## 12. Privacy considerations

This section describes privacy properties and residual privacy risks for SMART Health Check-in 1.0. It is a privacy overlay on the clinical request and response model in §§5-6, the layered trust model in §7, the same-device `org-iso-mdoc` flow in §8, the kiosk wrapper in §9, and the security considerations in §11. It does not create a second consent protocol, a production retention schedule, a general Wallet storage model, or platform-specific implementation guidance.

Clinical check-in content is sensitive, and so are request context, item choices, refusal decisions, timing, and routing metadata. Implementations should assume that SMART requests, SMART responses, Artifacts, request item ids, Artifact ids, wrapper request ids, provider row ids, storage paths, key ids, timestamps, IP addresses, user agents, crash reports, browser storage, logs, screenshots, QR images, and telemetry can reveal health-care activity or support cross-session correlation even when clinical payloads are encrypted.

### 12.1 Data minimization and per-item consent

SMART Health Check-in is designed around workflow-bounded requests and item-level Holder control. A Requester SHOULD ask only for request items, selectors, accepted media types, FHIR versions, and Questionnaire content needed for the active check-in workflow. Broad selectors, profile-family selectors, inline Questionnaires, and generic extension selectors can be appropriate, but a Requester SHOULD make them no broader than needed and SHOULD use `title` and `summary` to explain the request without adding requester identity metadata to the SMART request body.

A Wallet/Responder SHALL treat request items as the Holder-review and response-accounting granularity defined in §§5-6. It SHALL NOT treat `required: true`, `intentToRetain`, a successful same-device invocation, a scanned QR code, a resolved Pointer URL, a verified kiosk wrapper, provider row presence, or a clicked phone-page button as consent to disclose an item. Holder refusal, partial disclosure, unavailable data, unsupported selectors, and processing errors are valid per-item outcomes represented through `requestStatus[]` when the request is otherwise valid enough to answer.

A Wallet/Responder SHOULD minimize returned content within each approved item. It SHOULD avoid returning unrelated Holder data, unrelated FHIR resources, unrelated SMART Health Cards, unnecessary Questionnaire answers, hidden diagnostics, access tokens, internal identifiers, or nonresponsive records merely because they are available in a Holder data source. If one Artifact fulfills multiple items, the Wallet/Responder should ensure that the shared Artifact is responsive to every listed item and does not over-disclose relative to the Holder's item decisions.

A Verifier or Requester SHOULD treat a declined, unavailable, unsupported, partial, or error status as an expected privacy-preserving outcome, not as evidence of Holder misconduct or protocol failure. Downstream workflows can decide whether missing content blocks check-in, but they SHOULD avoid pressuring the Holder by presenting advisory `required` fields as mandatory disclosure unless applicable law and local policy support that workflow.

### 12.2 Selective disclosure responsibilities

The version 1.0 same-device `org-iso-mdoc` binding discloses one stable mdoc element, `smart_health_checkin_response`, whose value is the SMART response JSON. Selective disclosure for clinical content therefore occurs inside the Wallet/Responder's response construction and item-level status accounting, not by modeling each FHIR profile, Questionnaire, or Artifact as a separate mdoc element in the core flow.

A Wallet/Responder is responsible for selecting Artifacts from Holder data sources according to the validated SMART request, Holder decisions, Wallet policy, available media types, and privacy constraints. It SHOULD preserve FHIR `meta.profile` values and other payload evidence where useful, but SHOULD NOT add wrapper-level profile summaries or identifiers that increase correlation or overstate provenance. A Wallet/Responder SHOULD avoid duplicating the same clinical content across Artifacts unless needed to satisfy accepted media types or selector semantics.

A Verifier, Requester, or receiver is responsible for validating that each returned Artifact's `mediaType` is accepted by every fulfilled item, that `fulfills[]` references are valid, and that `requestStatus[]` covers every item exactly once before consuming returned content. It SHOULD reject, quarantine, or suppress content that is not responsive to the original request rather than retaining it by default.

SMART Health Card Artifacts and raw FHIR JSON Artifacts have different privacy and provenance properties. SMART Health Cards can contain signed clinical-source evidence, but they may also contain broader bundled content than a narrow request item requires. Raw FHIR JSON is patient-mediated unless separately provenanced or signed. A receiver SHOULD not use the presence of mdoc issuer evidence, kiosk wrapper validation, transport encryption, Artifact ids, or `requestId` matching to justify retaining or redisclosing raw FHIR content beyond the purpose for which the Holder shared it.

### 12.3 Cross-verifier linkability

Identifiers in this specification are scoped correlation values, but they can still become tracking handles when reused, logged, indexed, or combined with timing and network metadata. Requesters, Kiosk creators, Wallets/Responders, Phone presenters, Submission services, Completion displays, and receivers SHOULD generate or preserve identifiers according to their protocol scope and SHOULD NOT embed patient identifiers, requester identifiers, clinical facts, account ids, visit numbers, or cross-session tracking values in `SmartHealthCheckinRequest.id`, request item ids, Artifact ids, kiosk wrapper `requestId`, submission ids, storage paths, key ids, or extension identifiers unless a deployment profile explicitly requires that identifier and defines its privacy controls.

A Requester SHOULD avoid reusing `SmartHealthCheckinRequest.id` across separate check-in sessions. A Kiosk creator SHOULD generate high-entropy wrapper `requestId` values and SHOULD NOT derive them from patient demographics, appointment identifiers, staff ids, kiosk ids, sequential counters, phone numbers, or the embedded `smartRequest.id`. A Wallet/Responder SHOULD keep Artifact ids unique within a SMART response and SHOULD NOT use stable document ids as Artifact ids unless that meaning is separately established by the Artifact payload and acceptable under local policy.

Cross-verifier linkability can also arise from stable public keys, reader certificates, creator key ids, issuer certificate subjects, provider app ids, URL paths, browser history, Wallet display caches, analytics identifiers, device fingerprints, IP addresses, user-agent strings, and repeated request shapes. Deployment profiles SHOULD define rotation, partitioning, pseudonymization, retention, and display expectations for these values. A component SHOULD NOT use transport-layer or wrapper identifiers as a substitute for the SMART request id, request item ids, Artifact ids, `fulfills[]`, or `requestStatus[]` accounting, and it SHOULD NOT expose them to third-party analytics or support systems unless strictly necessary.

The kiosk Pointer URL is intentionally pointer-only, but pointer-only is not anonymous. The fragment `#r=<requestId>` is a bearer locator for encrypted request state and can be copied, photographed, synced, or observed. Kiosk creators and Completion displays SHOULD limit display time, stop showing stale QR codes, avoid patient-specific details on public screens, and apply short lifetimes, single-use workflow state, cleanup, and anti-enumeration controls.

### 12.4 Wallet rendering of requester intent

Wallet and Phone presenter UX is central to privacy because the Holder decides whether to share. A Wallet/Responder SHOULD make the requested items, accepted media types, broad selectors, advisory `required` values, and expected response outcomes understandable to the Holder at item granularity, subject to accessibility, localization, safety, and local policy. It MAY group, summarize, reorder, or suppress details when necessary, but it SHOULD NOT hide broad selectors, multiple items, or optional alternatives in a way that defeats meaningful Holder control.

A Wallet/Responder and Phone presenter SHOULD distinguish requester intent from authenticated requester identity. The SMART request's `purpose`, `items[].title`, `items[].summary`, selectors, Questionnaire text, and `required` flags are Holder-facing request context. They are not authenticated organization identity, legal authority, origin trust, reader trust, clinical-source provenance, or consent text merely because the request is syntactically valid or because a kiosk wrapper signature verifies.

Where authenticated origin, privileged-caller evidence, trusted reader authentication, deployment-trusted kiosk-creator information, or local policy warnings are available, a Wallet/Responder SHOULD render those signals separately from self-asserted request text. If a trust layer is absent, failed, untrusted, expired, revoked, unsupported, ambiguous, or inconsistent, the Wallet/Responder should avoid implying that the requester is verified and should apply local policy: reject, proceed with reduced assurance, ask for additional confirmation, restrict returned content, or otherwise fail safely.

Kiosk phone pages can show helpful context from the validated embedded SMART request before invoking the Wallet, but they should not become a substitute for Wallet review. Scanning the QR, resolving the provider row, decrypting the request JWS, or seeing a familiar clinic display on the phone page is not consent. Sharing still occurs through the Wallet/Responder or an equivalent Holder-control surface.

### 12.5 Storage retention defaults

SMART Health Check-in supports clinical workflows that commonly retain returned Artifacts. For that reason, the same-device profile defaults the mdoc `intentToRetain` flag for `smart_health_checkin_response` to `true`. This flag is a presentation signal about expected Verifier retention; it does not override Holder choice, Wallet policy, applicable law, privacy notices, legal holds, audit duties, downstream EHR policy, or a deployment's ability to define an explicitly ephemeral workflow.

A Verifier that truly intends ephemeral use MAY set `intentToRetain` to `false` where permitted by the selected flow and deployment policy. When it does so, the Verifier, Requester, Completion display, and downstream receiver SHOULD avoid retaining decrypted SMART responses, raw FHIR content, SMART Health Cards, §8 response plaintext, kiosk `SubmissionPlaintext`, screenshots, debug details, browser storage, and derived records beyond what is needed for the ephemeral interaction, security monitoring, and legally required audit or error handling.

Kiosk deployments have additional transient state. A Submission service SHOULD delete or make inaccessible expired request rows, encrypted request envelopes, submission rows, ciphertext blobs, orphaned blobs, duplicate rows, and related indexes after expiration, abandonment, cancellation, successful completion, or a deployment-defined retention period. A Completion display SHOULD release desktop private keys and remove decrypted submissions, transient SMART responses, QR state, opened JWS payloads, and debug artifacts when no longer needed for the active workflow, subject to legal, audit, recovery, or incident-response policy.

Retention policies SHOULD account for both plaintext and metadata. Provider rows, storage paths, storage file ids, wrapper request ids, submission ids, key ids, provider app ids, timestamps, IP addresses, user agents, row counts, retry behavior, and access patterns can reveal check-in activity even when ciphertext remains unreadable. Logs, database indexes, dashboards, analytics, support exports, and crash reports SHOULD use the shortest useful retention and least identifying form for these values.

### 12.6 Sensitive category handling

Clinical and administrative check-in data can include sensitive categories such as behavioral health, reproductive health, substance-use treatment, HIV/STI information, genetic information, minors' records, proxy or guardian relationships, payer or coverage details, immigration-sensitive information, domestic-violence safety concerns, and other data subject to special law, policy, or Holder expectations. This specification does not define a universal sensitive-category taxonomy or legal consent rule, but implementations SHOULD assume that both content and context can be sensitive.

Requesters SHOULD consider whether a request item or selector is likely to elicit specially protected data and SHOULD split broad requests into clearer items when separate Holder decisions would reduce over-disclosure. Wallets/Responders SHOULD apply local policy, Holder preferences, jurisdictional requirements, and available sensitivity labels or FHIR security labels when deciding what to show, suppress, redact, group, or return. Where an item is too broad or unsafe to fulfill as requested, `partial`, `declined`, `unavailable`, `unsupported`, or `error` can be the privacy-preserving response outcome.

Receivers SHOULD not infer that a valid SMART response authorizes unrestricted use, redisclosure, or EHR write-back of sensitive content. Response validation, transport validation, mdoc issuer/device evidence, kiosk wrapper validation, and `requestId` binding do not determine downstream segmentation, minimum-necessary processing, patient matching, consent-law compliance, or clinical appropriateness. Raw FHIR JSON remains patient-mediated unless separate provenance or signature evidence establishes more.

User-facing surfaces in shared environments SHOULD avoid exposing sensitive category information unnecessarily. Public kiosk screens, QR displays, staff-facing waiting states, phone error pages, and debug panels should avoid displaying clinical details, item-level refusals, sensitive Questionnaire answers, or source-provenance details unless the viewer is authorized and local policy permits it.

### 12.7 Telemetry guidance

Telemetry, analytics, logs, crash reports, support bundles, and fixture captures can undermine privacy even when protocol encryption is correct. Implementations SHOULD collect the minimum telemetry needed to operate, debug, secure, and improve the deployment, and SHOULD prefer aggregate counts, coarse categories, sampled metrics, redacted identifiers, and short retention over raw protocol payloads or stable per-Holder traces.

Implementations SHOULD NOT send plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, item-level Holder decisions, decrypted kiosk request JWS payloads, `SubmissionPlaintext`, §8 `DeviceResponse` plaintext, `dcapiResponse` internals, §8 HPKE `enc` or `cipherText`, request-opening private keys, desktop private keys, Wallet secrets, shared secrets, provider credentials, access tokens, full ciphertext blobs, or valid-id enumeration clues to telemetry, analytics, crash reporting, or support systems except under controlled diagnostic, test-fixture, or incident-response procedures with appropriate authorization and labeling.

If diagnostics need identifiers, implementations SHOULD hash, truncate, rotate, salt, or otherwise scope values so they cannot be used for cross-verifier or cross-session tracking beyond the diagnostic purpose. This guidance applies to SMART request ids, request item ids, Artifact ids, wrapper request ids, provider row ids, submission ids, storage paths, key ids, origin strings, package names, certificate subjects, IP addresses, user agents, and timing information.

Diagnostic fixtures can intentionally include public test keys, demo certificates, decrypted payloads, and non-PHI sample content only when clearly labeled as fixture material and isolated from production systems. A crash bundle, telemetry event, support export, or fixture containing live PHI, production private keys, bearer credentials, or unredacted clinical content should be treated as a privacy and security incident, not as a normal conformance artifact.

## Organizer notes

### Strengths

- Preserves the accepted T2/T3/T4/T5.B model: SMART requests and responses remain transport-neutral clinical JSON; kiosk is a pointer-only wrapper and phone re-entry into §8; trust layers remain separate.
- Gives privacy-specific treatment of actual fields: SMART request ids, item ids, Artifact ids, wrapper `requestId`, submission ids, storage paths, key ids, QR metadata, provider rows, browser history, logs, and telemetry.
- Treats per-item Holder control, selective disclosure, and `requestStatus[]` outcomes as privacy mechanisms without inventing a new consent protocol.
- Explains the retention default for `intentToRetain = true` while allowing explicit ephemeral deployments and emphasizing metadata retention.

### Caveats

- Some SHOULD-level operational guidance overlaps §11.7, §11.9, and §9.10; the organizer may want to deduplicate while keeping privacy framing here.
- The text intentionally avoids platform-specific advice, but §15 should later give concrete browser, mobile, logging, analytics, and production key-custody guidance.
- Sensitive-category handling remains policy-oriented because the repository does not define a sensitivity-label taxonomy or legal consent model.

### Open questions

- Should version 1.0 define a named “ephemeral mode” beyond allowing `intentToRetain = false`, or leave that to deployment profiles?
- Should Appendix B or conformance checklists add machine-testable no-plaintext/no-telemetry requirements, or keep telemetry as deployment guidance?
- Should provider profiles require specific cleanup deadlines for encrypted kiosk rows/blobs, or only require that deployments document their retention period?

### Downstream dependencies

- T5.D registries should register privacy-relevant extension obligations for new Artifact media types, selector kinds, status codes, and provider profiles.
- T6 fixture work should include no-plaintext kiosk vectors and clearly labeled fixture metadata for public test keys and non-PHI captures.
- §15 implementation guidance should cover production logging, analytics, browser storage, crash reporting, private-key custody, public-screen UX, and operational cleanup in more concrete terms.
