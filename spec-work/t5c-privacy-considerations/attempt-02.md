## 12. Privacy considerations

SMART Health Check-in is a Holder-mediated protocol for a bounded check-in workflow. Privacy protection depends on the clinical request model, the presentation flow, the kiosk wrapper where used, Wallet policy, and deployment operations all preserving the same boundaries: the SMART request and SMART response are transport-neutral clinical JSON objects; transport and wrapper fields are routing, security, or trust artifacts; and the Submission service is not trusted with plaintext clinical content.

This section is not a complete legal compliance framework and does not define product retention schedules, medical-record retention law, EHR reconciliation policy, Wallet backup behavior, or platform-specific user-interface requirements. It states protocol-level privacy expectations for the fields and flows defined in §§5-11.

### 12.1 Data minimization and per-item consent

Requesters should ask only for content needed for the immediate check-in workflow. The privacy unit for a SMART request is the request item: each item has an `id`, Holder-facing `title`, optional `summary`, advisory `required` value, selector, and `accept[]` list. A Requester SHOULD split materially different purposes or sensitivity levels into separate request items so the Holder can make meaningful item-level decisions and the Wallet/Responder can report item-level outcomes.

A Requester SHALL NOT use a broad selector, no-selector `fhir.resources` item, profile-family request, inline Questionnaire, or `required: true` flag to hide an all-purpose collection request behind vague display text. When a request item can disclose a broad set of resources, the item `title` and, where needed, `summary` SHOULD explain the breadth in terms understandable to the Holder. A Requester SHOULD avoid the no-selector default unless the workflow can safely consume broad patient-specific FHIR content and the Holder-facing text accurately reflects that breadth.

A Wallet/Responder SHALL preserve Holder control at request-item granularity when it returns a SMART response. It MAY group, summarize, reorder, or suppress display details for accessibility, safety, localization, applicable law, or local policy, but it SHALL NOT collapse several requested items into a single all-or-nothing decision in a way that defeats the per-item accounting model. The Wallet/Responder can return `fulfilled`, `partial`, `declined`, `unavailable`, `unsupported`, or `error` independently for each item; Holder refusal and partial disclosure are normal protocol outcomes, not privacy failures.

The following signals are not Holder consent by themselves: `required: true`, mdoc `intentToRetain`, scanning a QR code, opening a Pointer URL, resolving a provider row, decrypting or verifying a kiosk wrapper, observing a submission row, or receiving a provider notification. Disclosure still occurs through the Wallet/Responder or equivalent Holder-control surface for the validated SMART request.

Request item ids, SMART request ids, Artifact ids, status messages, and extension fields SHOULD avoid patient identifiers, secrets, clinical facts, reusable tracking values, or other data not needed for protocol correlation. Identifiers are useful for validation and accounting, but they can become privacy risks when logged, indexed, retained, or reused across sessions.

### 12.2 Selective disclosure responsibilities

SMART Health Check-in supports selective disclosure at request-item and Artifact boundaries; it does not guarantee cryptographic field-level minimization inside every returned Artifact. A Wallet/Responder is responsible for choosing Artifacts that are responsive to the accepted request items, accepted media types, Holder decisions, available Holder data sources, and Wallet policy.

A Wallet/Responder SHOULD disclose the minimum responsive content it can safely construct for the selected item outcomes. If one Artifact fulfills multiple items, the Wallet/Responder SHOULD ensure that sharing the combined Artifact does not disclose substantially more content than the Holder would expect for each item. If a broad FHIR Bundle, SMART Health Card, or QuestionnaireResponse contains content outside the relevant request items, the Wallet/Responder SHOULD either avoid returning that content, obtain appropriate Holder confirmation, or report `partial`, `unavailable`, `unsupported`, or `declined` as appropriate.

For `application/fhir+json`, the Wallet/Responder SHOULD consider FHIR resource references, contained resources, Bundle entries, narrative text, extensions, identifiers, provenance records, and Questionnaire answers as potentially sensitive. Returning a Bundle only because some entries match a selector can disclose unrelated diagnoses, medications, encounter history, payer details, or identifiers through references and included resources. For `application/smart-health-card`, the Wallet/Responder cannot change signed credential contents without invalidating the credential; it SHOULD make the scope of the signed credential understandable before disclosure and SHOULD decline or choose another accepted media type when the credential is too broad for the Holder's decision.

A Verifier or receiver SHALL NOT infer that an Artifact is privacy-minimized merely because it is syntactically valid, decrypts successfully, has an accepted `mediaType`, or lists a requested item in `fulfills[]`. Receivers SHOULD process only the content needed for the workflow and SHOULD apply local minimization, access-control, redaction, and routing policy before exposing returned Artifacts to staff, logs, analytics, or downstream systems.

Extension selector and Artifact definitions need their own privacy considerations. An extension that introduces `url`, `data`, dereferencing, external documents, new media types, or new selector kinds SHOULD specify minimization expectations, retention expectations, dereferencing authorization, integrity checks, and whether the extension can reveal third-party service use or Holder identifiers outside the active check-in interaction.

### 12.3 Cross-verifier linkability

Protocol identifiers are scoped correlation values, not global identities. Reusing them outside their scopes can make Holder activity linkable across Requesters, Verifiers, kiosks, providers, or time.

A Requester SHOULD generate `SmartHealthCheckinRequest.id` values that are unique for the check-in session and SHOULD NOT reuse stable patient, account, appointment, device, or organization identifiers as the request `id`. A Wallet/Responder SHALL echo that value as `SmartHealthCheckinResponse.requestId` for response binding, but the echo is a clinical exchange correlation check only. It is not a patient identifier, freshness proof, consent record, or requester identifier.

Request item ids and Artifact ids are scoped to one SMART request or SMART response. A Requester SHOULD NOT encode reusable patient, member, appointment, facility, campaign, or analytics identifiers in item ids. A Wallet/Responder SHOULD generate Artifact ids that are unique within the response and not reusable across unrelated responses. A receiver SHALL NOT treat Artifact ids as global document identifiers or clinical provenance identifiers unless that meaning is separately established by the Artifact payload, signature, provenance, or deployment policy.

The kiosk wrapper has a separate `KioskRequestPayload.requestId`. It routes and binds the Pointer URL, provider row, encrypted request envelope, signed payload, response-submission AAD, decrypted `SubmissionPlaintext.requestId`, and kiosk workflow state. It is distinct from `smartRequest.id`. A Kiosk creator SHOULD generate wrapper `requestId` values with high entropy and short lifetime and SHOULD NOT encode patient, appointment, room, staff, facility, or workflow semantics in them. A Phone presenter, Completion display, Submission service, or Requester SHALL NOT substitute the wrapper `requestId` for the SMART request `id`, and SHALL NOT use either identifier as a cross-verifier tracking key.

The same-device flow can also expose linkable metadata, including origin, reader certificate subjects, key ids, `encryptionInfo` values, nonces, `SessionTranscript`-related diagnostics, and mdoc issuer/device evidence. A Verifier SHOULD use fresh §8 HPKE recipient key material and nonces for each presentation session unless a deployment profile explicitly addresses replay, correlation, retention, and key-compromise privacy risks. Wallets and Verifiers SHOULD avoid retaining presentation-session identifiers longer than needed for validation, audit, troubleshooting, or applicable law.

The kiosk relay is expected to see operational metadata such as wrapper request ids, submission ids, storage paths, storage file ids, key ids, provider app ids, content types, ciphertext sizes, IVs, public ephemeral keys, timestamps, IP addresses, user agents, row counts, retry behavior, and access patterns. Even without plaintext clinical content, this metadata can reveal that a Holder is checking in, when the Holder scanned a QR code, which provider namespace was used, and whether a submission occurred. Submission services and deployments SHOULD minimize indexes, dashboards, analytics, logs, and retained metadata that allow cross-session or cross-verifier correlation.

### 12.4 Wallet rendering of requester intent

Holder-facing request review depends on accurate separation between authenticated trust signals and unauthenticated request text. The SMART request body can carry `purpose`, item `title`, item `summary`, selectors, `accept[]`, and `required`; it cannot authenticate the Requester, Verifier, organization, origin, reader, kiosk creator, or legal authority to receive content.

A Wallet/Responder SHALL NOT display `purpose`, item `title`, item `summary`, selector URLs, profile-family URLs, Questionnaire text, unknown request members, extension members, provider app ids, relay URLs, key ids, or kiosk pointer metadata as verified requester identity unless the same fact is established by the selected presentation transport, trust processing, deployment profile, or local policy outside the SMART request body. If the Wallet displays both authenticated origin or reader information and unauthenticated SMART request text, it SHOULD visually or textually distinguish them.

A Requester SHOULD use `purpose`, item titles, and summaries to explain what is being requested and why it is relevant to the workflow, not to assert identity, branding, legal authority, or consent terms. Misleading labels can cause over-disclosure even when cryptography succeeds. Wallets SHOULD treat overly broad, contradictory, confusing, or suspicious display text as a risk signal under local policy and MAY warn the Holder, restrict disclosure, or decline.

A Phone presenter in the kiosk flow MAY display context from the validated embedded `smartRequest` and from verified kiosk-wrapper metadata, but it SHOULD make clear that scanning the QR and opening the phone page are request retrieval steps, not consent. Successful kiosk wrapper verification proves wrapper integrity and creator-key policy results; it does not make SMART request display fields authenticated requester identity and does not replace Wallet review.

Wallet rendering SHOULD also avoid overstating clinical-source trust. Raw `application/fhir+json` is patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof. A Wallet or receiver SHOULD NOT imply that mdoc transport, HPKE opening, kiosk encryption, request-id matching, or Holder approval by itself makes unsigned raw FHIR a source-signed clinical credential.

### 12.5 Storage retention defaults

SMART Health Check-in is designed for bounded check-in interactions, but many clinical workflows legitimately retain returned Artifacts. The mdoc `intentToRetain` value for `smart_health_checkin_response` defaults to `true` in the direct §8 flow because ordinary check-in workflows commonly ingest or route returned Artifacts. That flag is a presentation signal about Verifier intent; it is not Holder consent by itself, not a legal retention notice by itself, and not a command to the Wallet or receiver.

A Verifier MAY set `intentToRetain` to `false` only when it truly intends ephemeral use and applicable deployment policy permits that signal. A Requester or receiver that retains SMART responses, Artifacts, derived records, audit records, or downstream EHR entries SHOULD define retention, access, amendment, deletion, and audit behavior outside this protocol. A Wallet/Responder SHOULD consider the `intentToRetain` signal, authenticated requester context, item sensitivity, local policy, and Holder decision when presenting or constraining disclosure.

Kiosk request and submission state SHOULD be short-lived by default. Kiosk creators SHOULD use short `expiresAt` values appropriate for in-person sessions, stop displaying the Pointer URL after expiration, abandonment, cancellation, or successful completion, and avoid reusing wrapper ids. Submission services SHOULD delete or make inaccessible expired request rows, encrypted request envelopes, submission rows, ciphertext blobs, orphaned blobs, duplicate rows, and observation state after expiration, abandonment, successful completion, or a deployment-defined short retention period, unless a documented legal, audit, or recovery purpose requires longer retention.

Completion displays SHOULD release desktop private keys and remove decrypted submissions, transient SMART responses, QR state, debug artifacts, and browser-held private-key material when no longer needed for the active workflow, subject to deployment policy. Phone presenters SHOULD avoid retaining decrypted kiosk request payloads, Wallet response details, `SubmissionPlaintext`, provider credentials, or detailed diagnostics after submission completes or fails, except under controlled diagnostic procedures.

The Submission service SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext `payload.smartResponse`, raw FHIR content, SMART Health Cards, Holder choices, §8 response plaintext, private keys, Wallet secrets, or shared secrets merely to route, store, notify, or make available kiosk state. Retention of ciphertext and metadata still has privacy impact and SHOULD be minimized.

Diagnostic fixtures, debug exports, support bundles, crash reports, screenshots, and browser storage can become unintended health records. Deployments SHOULD clearly separate synthetic fixtures and demo keys from production data. Live PHI, production private keys, bearer credentials, access tokens, unredacted SMART responses, or full clinical ciphertext blobs SHOULD NOT be retained in diagnostics except under an explicitly authorized and protected incident, audit, or support process.

### 12.6 Sensitive category handling

SMART requests can ask for clinical and administrative content that falls into sensitive categories, including mental health, substance use, reproductive health, genetic information, HIV or sexually transmitted infection information, minors' records, payer or coverage details, immigration- or employment-sensitive information, and safety-related address or contact information. The protocol does not attempt to classify every sensitive resource or replace applicable law and policy.

Requesters SHOULD avoid broad or ambiguous items when sensitive categories may be included. If a workflow specifically needs sensitive-category content, the request item title, summary, selector, and accepted media types SHOULD make that need understandable to the Holder without embedding unnecessary sensitive facts in ids or metadata. If sensitive content is not necessary, Requesters SHOULD choose narrower selectors, separate request items, or downstream filtering so that the Wallet and Holder can avoid unrelated disclosure.

Wallets/Responders SHOULD apply heightened review, filtering, warning, or refusal policies for sensitive categories, especially when selectors are broad, no-selector defaults are used, raw FHIR Bundles contain mixed content, or SMART Health Cards include more signed content than the active workflow needs. A Wallet/Responder MAY report `partial`, `declined`, or `unavailable` when Holder decision, Wallet policy, applicable law, data segmentation, or data-source constraints prevent full disclosure.

Receivers SHOULD treat status messages, Questionnaire answers, FHIR narratives, identifiers, Provenance resources, extension fields, and Artifact locators as potentially sensitive even when the primary requested item appears administrative. They SHOULD avoid displaying sensitive clinical details on public kiosk screens, shared tablets, staff-facing queue monitors, debug panels, or analytics dashboards unless the user is authorized and local policy permits it.

Sensitive category handling also applies to metadata. A QR scan at a specialty clinic, a provider app id, a timing pattern, a storage path, a certificate subject, a profile URL, or an item title can reveal sensitive context even when the clinical payload is encrypted. Kiosk deployments SHOULD account for shoulder-surfing, camera observation, browser history, copied URLs, device-sync features, analytics scripts, and public-screen exposure when designing the Holder experience.

### 12.7 Telemetry guidance

Telemetry, analytics, logs, crash reports, performance traces, support bundles, and observability systems SHOULD be designed so the protocol can operate without collecting plaintext clinical content or unnecessary linkable metadata.

Implementations SHOULD NOT log or send telemetry containing plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, decrypted kiosk request JWS payloads, `SubmissionPlaintext`, §8 `DeviceResponse` plaintext, Digital Credentials API `dcapiResponse` internals, request-opening private keys, desktop private keys, Wallet secrets, shared secrets, provider credentials, access tokens, bearer URLs, full Pointer URLs with live `#r` values, full ciphertext blobs, or unredacted stack traces containing those values, except under controlled diagnostic or fixture procedures with appropriate authorization and separation from production telemetry.

Operational telemetry SHOULD prefer coarse, non-identifying counters and bounded error categories, such as validation stage, unsupported media type, expired pointer, malformed row, decryption failed, Holder cancelled, item declined, or size limit exceeded. Where a deployment needs audit correlation, it SHOULD use deployment-defined audit identifiers with access controls and retention limits rather than reusing SMART request ids, wrapper request ids, Artifact ids, provider storage paths, IP addresses, user agents, or certificate subjects as general analytics keys.

Error messages and logs SHOULD avoid valid-id enumeration clues. For example, a phone page can guide the Holder to rescan a current QR code or seek staff assistance without revealing whether a guessed wrapper `requestId` was valid, expired, completed, malformed, or absent beyond what is necessary for safe recovery. Completion displays can distinguish workflow states for authorized staff while keeping public screens free of clinical details and internal provider diagnostics.

Telemetry systems SHOULD treat ciphertext sizes, timing, retry counts, row counts, submission ids, storage paths, provider app ids, key ids, origins, reader identifiers, and QR display or scan events as sensitive metadata. Aggregation, sampling, truncation, hashing, or pseudonymization can reduce risk, but stable hashes of low-entropy or reused identifiers can still enable correlation. Deployments SHOULD define telemetry retention, access controls, incident handling, and deletion procedures consistent with the sensitivity of both payloads and metadata.

Demo builds and fixtures MAY expose private JWKs, decrypted payloads, provider rows, and technical details when clearly labeled as non-production and when using synthetic data. Production builds SHOULD disable or protect those panels, exclude demo key material, and ensure that support and crash tooling cannot silently upload live PHI, secrets, or reusable protocol identifiers.

## Organizer notes

### Strengths

- Aligns privacy guidance with the accepted layered model: SMART request/response clinical JSON is separate from §8 presentation transport and §9 kiosk wrapper state.
- Explicitly covers request ids, wrapper request ids, item ids, Artifact ids, provider row ids, storage paths, key ids, QR metadata, browser history, logs, and telemetry as privacy-relevant metadata.
- Preserves accepted kiosk semantics: pointer-only QR, direct `smartRequest`, untrusted relay, distinct wrapper `requestId` vs. `smartRequest.id`, and active submission carrying only `payload.smartResponse` for the successful profile.
- Uses per-item consent and status as the central privacy mechanism without inventing new field-level cryptographic selective-disclosure requirements.

### Caveats

- This draft intentionally avoids platform-specific Android, iOS, browser, InstantDB, and production key-custody implementation advice; that belongs in §15 or deployment profiles.
- The text gives high-level retention defaults but does not define legally sufficient medical-record, audit, deletion, or EHR write-back policy.
- Sensitive-category handling is principle-based because the base specification does not define a computable sensitivity taxonomy for all FHIR resources, profiles, extensions, or jurisdictions.

### Open questions

- Should §12 define any hard maximum retention period for kiosk relay state, or leave all concrete durations to deployment profiles and §15 guidance?
- Should Appendix A include privacy SHOULD statements, or only the few SHALL statements that directly preserve already-canonical §§5-9 semantics?
- Should a future extension define optional validation-evidence payloads for kiosk completion so Completion displays can independently record phone-local §8 validation without submitting raw `dcapiResponse` or `DeviceResponse`?

### Downstream dependencies

- T5.F should decide which privacy requirements become conformance-checklist rows and ensure each row names a clear target role.
- T5.E should localize only human-readable fields that actually exist (`purpose`, item `title`, item `summary`, status `message`, Questionnaire text, and UI/error text), while preserving privacy warnings around spoofable request text.
- T6.A should cover production UI, telemetry configuration, browser storage, key custody, cleanup jobs, support bundles, and platform-specific privacy controls.
- T6.C fixture work should add no-plaintext-leakage and metadata-minimization checks for kiosk vectors once deterministic kiosk fixtures exist.
