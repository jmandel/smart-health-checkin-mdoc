## 12. Privacy considerations

SMART Health Check-in is patient-mediated, but mediation alone is not sufficient privacy protection. The protocol exposes clinical requests, clinical responses, identifiers, routing metadata, and user-interface context across several roles. Privacy controls therefore need to apply at the clinical-content layer, the same-device presentation layer, the kiosk wrapper layer, and downstream workflow handling.

This section is not a new consent law, data-use agreement, audit-retention profile, or platform-specific implementation guide. It identifies privacy responsibilities that follow from the version 1.0 request and response fields and from the §8 and §9 flows. Implementations and deployment profiles remain responsible for applicable law, organizational policy, patient matching, record-retention obligations, and user-interface localization and accessibility.

### 12.1 Data minimization and per-item consent

A Requester should construct each SMART request around a bounded check-in workflow and should ask only for content it is prepared to process for that workflow. Request items are the privacy and consent granularity of the clinical model: each item has its own `id`, Holder-facing `title` and optional `summary`, selector, accepted media types, and per-item outcome in `requestStatus[]`.

A Requester SHOULD avoid broad selectors when a narrower item would satisfy the workflow. In particular, a no-selector `fhir.resources` item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share; it is appropriate only when the workflow can safely consume broad content and the item text clearly explains the breadth of the request. When a broad item is unavoidable, the Requester should use `title`, `summary`, `accept[]`, `fhirVersions[]`, `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to make the request understandable and machine-checkable without embedding requester identity or transport metadata in the SMART request body.

A Wallet/Responder SHALL preserve request item `id` values for fulfillment and status accounting and SHALL provide Holder review, or an equivalent Holder-control mechanism defined by a deployment profile, at request-item granularity before disclosing content. A Wallet/Responder MAY group, summarize, reorder, or suppress details for accessibility, safety, localization, or local policy, but it must not hide multiple items, broad selectors, advisory `required: true` flags, or accepted response forms in a way that defeats meaningful Holder control.

The `required` flag is workflow context only. It is not Holder consent, legal authorization, or a command to disclose. Holder refusal, local Wallet policy, unavailable data, unsupported selectors, partial disclosure, and processing errors are normal response outcomes reported through `requestStatus[]`. Requesters and downstream receivers should treat `declined`, `partial`, `unavailable`, `unsupported`, and `error` as privacy-preserving outcomes, not as reasons to infer additional undisclosed facts about the Holder.

### 12.2 Selective disclosure responsibilities

Selective disclosure in this profile occurs primarily through request-item boundaries, Wallet policy, Holder decisions, Artifact construction, and per-item status reporting. The mdoc presentation carries one stable element, `smart_health_checkin_response`; it does not model each FHIR profile, questionnaire, clinical resource, or Artifact as a separate mdoc element. Therefore, implementations cannot rely on mdoc element selection alone to minimize clinical disclosure.

A Wallet/Responder SHOULD construct the smallest set of Artifacts that accurately satisfies the accepted request items, Holder choices, available data, and accepted media types. When a single Artifact fulfills multiple items, its `fulfills[]` edges should be justified by the Artifact content and every listed item's `accept[]` rules. When only a subset of matching content is disclosed, the Wallet/Responder should use `partial` rather than claiming complete fulfillment.

Artifact ids and request item ids are response-local and request-local correlation values. A Wallet/Responder SHOULD NOT place patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in `SmartHealthCheckinRequest.id`, item `id`, Artifact `id`, `requestStatus[].message`, extension member names, or URL paths unless that meaning is separately required and protected by the Artifact payload or deployment policy. A Requester or receiver SHALL NOT treat Artifact ids as global document ids, patient ids, provenance ids, or source-system ids unless the Artifact payload, signature, provenance, or local policy independently establishes that meaning.

Raw `application/fhir+json` Artifacts remain patient-mediated unless separately signed or provenanced. A receiver should not use mdoc issuer/device evidence, successful HPKE opening, kiosk wrapper validation, Artifact ids, `fulfills[]`, `requestId` matching, or Holder approval to imply clinical-source provenance for unsigned raw FHIR JSON. SMART Health Card Artifacts carry signed clinical-source evidence inside `value.verifiableCredential[]`, but receivers still need to verify the contained JWSs and apply local trust policy.

### 12.3 Cross-verifier linkability and identifier reuse

Identifiers and metadata in this profile are scoped by layer. The SMART request `id` is echoed as `SmartHealthCheckinResponse.requestId`; request item ids are referenced by `fulfills[]` and `requestStatus[].item`; Artifact ids are unique only within one SMART response; §8 uses presentation-session values such as `encryptionInfo`, nonces, `SessionTranscript`, reader-authentication material, and mdoc issuer/device evidence; §9 adds a distinct kiosk wrapper `requestId`, provider row ids, submission ids, storage paths, key ids, timestamps, and access patterns.

Requesters, Kiosk creators, Wallets/Responders, Phone presenters, Submission services, Completion displays, and deployment profiles SHOULD avoid reusing any of these identifiers across unrelated check-in sessions, unrelated Verifiers, or unrelated Holders. Reuse can permit cross-verifier correlation even when clinical content is encrypted. High-entropy per-session values are especially important for §9 wrapper `requestId` values because Pointer URLs and provider lookups are bearer locators.

A Verifier SHOULD use fresh §8 HPKE recipient key material and fresh nonce values for each presentation session. A deployment profile that permits HPKE recipient-key reuse needs explicit privacy handling for correlation, retention, key compromise, replay, and logs. Similarly, kiosk deployments should generate a fresh wrapper `requestId`, fresh request-envelope IV and ephemeral key, and fresh response-submission IV and phone ephemeral key for each active session.

The kiosk wrapper `requestId` is distinct from `smartRequest.id`; substituting one for the other is both a correctness error and a privacy risk. Wrapper ids can appear in Pointer URLs, provider rows, storage paths, logs, browser history, screenshots, analytics, and support tools. SMART request ids can appear in Wallet displays, SMART responses, downstream validation logs, and clinical workflow records. Deployment profiles should document where each identifier may be stored, how long it is retained, and whether it is visible to staff, providers, analytics systems, or downstream EHR workflows.

### 12.4 Wallet rendering of requester intent

The SMART request body intentionally carries Holder-facing workflow context, not authenticated requester identity. `purpose`, item `title`, item `summary`, selector URLs, profile-family URLs, Questionnaire text, advisory `required`, unknown members, provider app ids, pointer metadata, logos, and callback-looking strings can be chosen by a malicious or mistaken Requester. A Wallet/Responder or Phone presenter MAY display these fields as request context, but SHALL NOT label them as verified requester identity, authenticated origin, trusted reader identity, clinical-source provenance, or legal authority.

Wallet and phone-side displays SHOULD distinguish at least these categories when they are available: authenticated origin or approved origin-equivalent; reader authentication status; deployment-trusted kiosk-creator information; unauthenticated SMART request display text; requested content categories and accepted media types; broad selectors or no-selector items; advisory required items; and the Holder's available choices to share, partially share, or decline.

In kiosk flows, scanning a QR code, opening a Pointer URL, loading a familiar clinic page, resolving a provider row, successfully decrypting an `EncryptedKioskRequest`, or verifying the kiosk creator JWS is not consent. The phone-side flow still needs wrapper validation, embedded SMART request validation, §8 Wallet invocation, and Holder review before disclosure. The Wallet/Responder remains responsible for avoiding misleading displays that imply a public kiosk screen, relay URL, provider application id, or demo branding is verified requester identity.

The Wallet/Responder should present privacy-relevant distinctions in understandable language. For example, a request for an exact insurance-card profile is different from a no-selector request for broad patient-specific FHIR resources; a SMART Health Card response is different from unsigned raw FHIR JSON; and a `partial` or `declined` outcome is a valid item-level result. User interfaces may summarize these distinctions, but summaries should not overstate provenance, completeness, retention, or requester authenticity.

### 12.5 Storage retention defaults

SMART Health Check-in commonly supports workflows that ingest or route returned Artifacts. For that reason, the §8 `intentToRetain` value for `smart_health_checkin_response` defaults to `true`. That default is a retention signal for Holder review and policy; it does not override Holder choice, Wallet policy, applicable law, local retention schedules, or downstream EHR record-management requirements.

A Verifier MAY set `intentToRetain` to `false` only when it truly intends ephemeral use and its deployment policy permits that signal. A Requester or Completion display that intends to store, import, attach, audit, reconcile, or route returned Artifacts should not represent the interaction as ephemeral merely because transport ciphertext, provider rows, or browser state are short-lived.

For the kiosk flow, retention defaults are split across layers:

- the Submission service/provider should retain only the encrypted request row, encrypted envelope, encrypted submission row, ciphertext blob, and operational metadata needed to complete the active session;
- the Phone presenter should avoid retaining decrypted kiosk request JWS payloads, SMART responses, §8 `DeviceResponse` plaintext, Wallet secrets, or unrelated diagnostics after submission succeeds or fails;
- the Completion display should release desktop private keys, decrypted submissions, transient SMART responses, QR state, and debug artifacts when no longer needed for the active workflow, subject to legal, audit, recovery, and clinical-record policy; and
- the Requester or downstream receiver should apply its ordinary record-retention policy only after validation and local workflow acceptance.

Submission services SHOULD delete or make inaccessible expired request rows, encrypted request envelopes, submission rows, ciphertext blobs, orphaned blobs, and duplicate rows after expiration, abandonment, cancellation, successful completion, or a documented retention period. Provider cleanup is not a substitute for cryptographic validation or local workflow state, but excessive provider retention increases linkability and breach impact.

### 12.6 Sensitive category handling

Clinical check-in requests can implicate sensitive categories such as mental health, reproductive health, substance-use treatment, sexual health, genetic information, infectious-disease status, medications, coverage, demographics, proxy or guardianship information, and visit-specific questionnaire answers. This specification does not define a universal sensitivity taxonomy or legal rule set, but implementations should assume that both clinical payloads and metadata can be sensitive.

Requesters SHOULD separate sensitive categories into clear request items when doing so improves Holder understanding and permits meaningful partial sharing. A Wallet/Responder MAY apply stricter local policy, additional warnings, separate confirmation, redaction, suppression, or refusal for sensitive items, broad selectors, no-selector requests, raw FHIR JSON, Questionnaire answers, or requests from unauthenticated or untrusted contexts.

Wallets/Responders and Requesters should avoid inferring or exposing sensitive facts from non-disclosure outcomes. For example, a `declined`, `unavailable`, `unsupported`, `partial`, or `error` status for an item does not necessarily mean the Holder has, lacks, or refused a particular diagnosis, medication, coverage status, or questionnaire answer. `requestStatus[].message` should be concise and should not include unnecessary patient details, secrets, stack traces, or sensitive diagnostic explanations.

Public and shared-device contexts need additional care. QR codes, kiosk screens, staff desktops, provider dashboards, browser histories, debug panels, and printed or photographed materials should not display patient-specific clinical details or sensitive category labels beyond what is necessary for safe workflow recovery and authorized staff review. A Completion display should distinguish validation and workflow states without exposing returned Artifacts on public screens.

### 12.7 Telemetry guidance

Telemetry, analytics, logs, crash reports, support bundles, fixtures, database indexes, browser storage, screenshots, and debug panels can reveal sensitive content even when protocol ciphertext is sound. Implementations SHOULD collect the minimum telemetry needed for reliability, security monitoring, abuse prevention, and conformance testing, and should prefer aggregate or redacted measurements over per-Holder event traces.

Telemetry and logs SHOULD NOT include plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, decrypted kiosk request JWS payloads, `SubmissionPlaintext`, §8 `DeviceResponse` plaintext, `dcapiResponse` or `deviceResponse` internals, request-opening private keys, desktop private keys, Wallet secrets, shared secrets, provider credentials, access tokens, full ciphertext blobs, or reusable identifiers except under controlled diagnostic or fixture procedures.

When operational telemetry is necessary, implementations should minimize or hash values such as SMART request ids, kiosk wrapper request ids, submission ids, storage paths, key ids, provider app ids, origins, IP addresses, user agents, timestamps, row counts, retry behavior, and error text. Hashing or truncation is not sufficient if the input space is guessable or if the same salt permits cross-deployment correlation; deployments should prefer scoped, rotating, purpose-specific telemetry identifiers.

User-facing and operator-facing errors SHOULD support safe recovery without revealing whether a guessed Pointer URL was valid, expired, already completed, or merely unavailable beyond what is necessary for the Holder or staff to proceed. Developer fixtures may contain intentionally public test keys, decrypted payloads, or non-PHI sample data only when clearly labeled and separated from production traffic. A fixture, support bundle, or crash report containing live PHI, production private keys, bearer credentials, or unredacted clinical content should be treated as an incident rather than as routine telemetry.

## Organizer notes

### Strengths

- Aligns privacy guidance with accepted §§5-9 and §11 rather than introducing a new protocol, consent framework, or platform-specific implementation section.
- Preserves the critical identifier distinctions: SMART request `id` / response `requestId`, request item ids, Artifact ids, kiosk wrapper `requestId`, provider row/submission ids, and storage paths.
- Calls out actual kiosk privacy surfaces: pointer-only QR, provider-visible ciphertext metadata, browser history, debug panels, logs, retention, and untrusted relay behavior.
- Keeps raw FHIR provenance language aligned with §7 and §11: raw FHIR remains patient-mediated unless separately provenanced, while SMART Health Cards carry their own signed evidence.

### Caveats

- Some normative statements duplicate obligations already present in §§5-9 and §11 for readability; the organizer may want to de-duplicate during canonical synthesis.
- The text intentionally avoids detailed Android/iOS/browser storage APIs and production key-custody recipes; those belong in §15 or deployment profiles.
- Retention language is necessarily policy-sensitive because clinical record retention, audit logs, legal holds, and EHR ingestion are outside the base protocol.

### Open questions

- Should §12 define a small conformance inventory for privacy-specific SHALL/SHOULD statements, or should Appendix A reference the underlying §§5-9 obligations and keep §12 mostly advisory?
- Should a future deployment profile define a standard sensitivity taxonomy or item-label vocabulary, or should this remain entirely local policy for 1.0?
- Should fixture guidance require explicit `containsPhi: false` / `test-only-key` metadata for all future kiosk vectors, mirroring existing same-device fixture metadata?

### Downstream dependencies

- T5.E internationalization should apply only to actual Holder-facing display fields (`purpose`, `title`, `summary`, `message`, and questionnaire text) and should preserve the distinction between display context and authenticated identity.
- T5.F conformance checklist should include privacy requirements that are directly testable, especially per-item Holder control, identifier scoping, pointer-only QR content, no plaintext relay requirement, and telemetry/log minimization.
- T6.A implementation notes should cover platform-specific browser storage, analytics SDKs, crash reporting, screenshots, production key custody, public kiosk UI patterns, and retention configuration.
- T6.C fixture work should include no-plaintext-leakage checks for kiosk request rows, submission rows, blobs, logs, and fixture metadata.
