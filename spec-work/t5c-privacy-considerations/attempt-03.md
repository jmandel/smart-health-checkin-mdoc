## 12. Privacy considerations

SMART Health Check-in is a patient-mediated protocol for a bounded check-in workflow. Privacy protection therefore depends not only on cryptographic confidentiality, but also on limiting what is requested, what is displayed, what is returned, what identifiers are reused, and what operational metadata survives after the session. This section applies to the clinical content model in §§5-6, the trust layers in §7, the same-device presentation flow in §8, the kiosk wrapper in §9, and the security considerations in §11.

The SMART request and SMART response are transport-neutral clinical JSON objects. Presentation transports may add origin, reader, issuer/device, freshness, encryption, relay, and completion metadata, but those layers do not change the privacy meaning of request items, Holder choices, Artifacts, fulfillment links, or per-item status. A component that processes several layers of the protocol needs to minimize and protect both clinical content and metadata, including request ids, wrapper request ids, Artifact ids, QR observations, provider rows, logs, and telemetry.

### 12.1 Data minimization and per-item consent

A Requester SHOULD construct each SMART request for the minimum clinical or administrative content needed for the stated check-in workflow. Broad selectors, profile-family selectors, multiple accepted media types, inline Questionnaires, and `required: true` flags are useful protocol features, but they can also broaden the Holder's disclosure burden. A Requester SHOULD split materially different needs into separate request items when that split improves Holder understanding, selective disclosure, downstream validation, or per-item status reporting.

Request items are the protocol's consent and accounting granularity. A Wallet/Responder SHALL preserve request item `id` values and SHALL produce `requestStatus[]` entries covering every original item exactly once as required by §6. A Wallet/Responder SHOULD let the Holder decline or partially satisfy individual items when Wallet policy, applicable law, and the selected presentation flow permit. `required: true`, `intentToRetain`, a QR scan, a pointer lookup, kiosk wrapper verification, provider row access, or successful decryption is not Holder consent.

Requesters SHOULD avoid embedding patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in `SmartHealthCheckinRequest.id`, request item `id`, Artifact `id`, wrapper `requestId`, submission id, storage path, key id, or similar correlation fields. When identifiers must be logged or persisted, deployments SHOULD treat them as potentially sensitive metadata and should scope, rotate, truncate, hash, or otherwise protect them according to local policy. Identifier unpredictability helps resist guessing, but high-entropy identifiers can still be stable correlation handles while they are retained.

Wallets/Responders SHOULD minimize returned content to the Holder-approved subset that satisfies the accepted media type and selector for each item. For broad `fhir.resources` selectors, a `partial` status can be privacy-preserving when the Holder or Wallet policy shares only a subset of available resources. A Wallet/Responder SHOULD NOT return unrelated resources merely because they are present in a local Bundle, SMART Health Card, cached FHIR dataset, or connected Holder data source.

### 12.2 Selective disclosure responsibilities

Selective disclosure in this specification occurs at several layers, and implementers need to keep those layers distinct.

At the clinical layer, the Wallet/Responder chooses which Artifacts to return and which request items each Artifact fulfills. A Wallet/Responder SHALL NOT claim that an Artifact fulfills an item unless its `mediaType` is accepted for that item and its contents are responsive under §§5-6. If one Artifact fulfills multiple items, the Wallet/Responder should consider whether returning a combined Artifact discloses more than the Holder expected for any one item. If separating Artifacts would materially reduce disclosure and remains interoperable, the Wallet/Responder SHOULD prefer the less-disclosing packaging.

At the mdoc layer, version 1.0 uses one stable requested and disclosed element, `smart_health_checkin_response`, to carry the entire SMART response. It does not model each FHIR profile, request item, Questionnaire, status, or clinical resource as a separate mdoc element. Wallets/Responders and Verifiers SHALL NOT represent mdoc element-level disclosure as if it provided per-resource or per-item selective disclosure inside the SMART response. Per-item privacy control is expressed by Holder review, Wallet response construction, Artifact packaging, `fulfills[]`, and `requestStatus[]`, not by creating ad hoc mdoc element names.

At the clinical-source layer, SMART Health Card Artifacts and raw FHIR JSON Artifacts have different privacy and provenance properties. SMART Health Cards may bundle multiple signed resources into one credential, so sharing the credential can disclose all signed contents needed to verify or process it. Raw `application/fhir+json` remains patient-mediated unless separately provenanced or signed, and receivers should not demand broader raw FHIR payloads merely to compensate for missing source trust. A Requester that requires stronger provenance SHOULD request or define media types or deployment profiles that provide it, rather than over-collecting unrelated raw FHIR resources.

Extension selectors and extension Artifact media types SHALL define their own privacy considerations, including minimization, dereferencing, retention, integrity, authorization, and whether URL or data locators can reveal sensitive facts. A receiver SHALL NOT infer safe dereferencing, long-term availability, or low privacy risk from an Artifact `url` or `data` field name alone.

### 12.3 Cross-verifier linkability and identifier reuse

The protocol defines several identifiers with deliberately narrow scopes. `SmartHealthCheckinRequest.id` is scoped to a Requester's check-in session; `SmartHealthCheckinResponse.requestId` echoes it for clinical correlation; request item ids are scoped to one SMART request; Artifact ids are scoped to one SMART response; the kiosk wrapper `requestId` is a pointer, relay, envelope, and submission-correlation value; provider row ids, submission ids, storage paths, key ids, origins, certificate subjects, nonces, and SessionTranscript inputs have their own presentation or deployment scopes. Implementations SHALL NOT treat an identifier from one layer as a patient identifier, requester identifier, global document identifier, clinical provenance identifier, freshness proof, or authorization value unless the relevant payload, transport binding, Artifact evidence, or deployment profile separately establishes that meaning.

Cross-verifier linkability can arise even when clinical payloads are encrypted. Stable request ids, reused Artifact ids, persistent key ids, repeated certificate subjects, common storage path patterns, provider app ids, IP addresses, user agents, QR display timing, scan timing, browser history, analytics events, and downstream logs can let observers correlate the same Holder, visit, site, or workflow across sessions. Requesters, Verifiers, Kiosk creators, Phone presenters, Submission services, Completion displays, and Wallets/Responders SHOULD avoid unnecessary reuse of correlation values across independent check-in sessions.

For same-device §8 presentations, Verifiers SHOULD use fresh HPKE recipient key material and fresh nonce values per presentation session as described in §8 and §11. Reuse of recipient keys, reader keys, origins, certificate subjects, or display labels may be required by a deployment profile, but deployments should document the resulting linkability and retention implications. For kiosk §9 sessions, Kiosk creators SHOULD generate high-entropy wrapper `requestId` values for each session, use short lifetimes, stop displaying stale Pointer URLs, and avoid including patient-identifying or clinic-internal workflow facts in the pointer string, row id, submission id, or storage path.

A Submission service or provider is expected to see operational metadata such as wrapper request ids, submission ids, storage paths, key ids, provider app ids, content types, ciphertext sizes, IVs, public ephemeral keys, timestamps, IP addresses, user agents, row counts, retry behavior, and access patterns. A provider SHALL NOT need plaintext clinical content for the active profile, but provider metadata can still be sensitive. Provider deployments SHOULD minimize indexes, dashboards, export fields, query surfaces, and retention windows that make cross-session correlation easier.

### 12.4 Wallet rendering of requester intent

Wallet rendering is a privacy control because the Holder's decision depends on understanding what is being requested and what trust evidence is available. A Wallet/Responder SHOULD present the request at request-item granularity using `purpose`, item `title`, item `summary`, advisory `required`, accepted media types, selector breadth, and requested content categories in a way that supports meaningful Holder choice. It MAY group, summarize, reorder, translate, or suppress details for accessibility, localization, safety, clinical sensitivity, or local policy, but it SHALL NOT hide multiple items, broad selectors, retention signals, or material trust warnings in a way that defeats meaningful Holder control.

The SMART request body is not authenticated requester identity. A Wallet/Responder or Phone presenter SHALL NOT label `purpose`, item text, selector URLs, profile URLs, Questionnaire text, unknown request members, provider app ids, relay URLs, QR page branding, kiosk wrapper `iss`, key ids, common names, logos, or Artifact contents as verified requester identity unless that identity is established through the selected presentation transport, reader authentication, kiosk creator trust policy, or another deployment-approved trust layer. If authenticated origin, reader, or creator information is displayed alongside unauthenticated request text, the UI SHOULD distinguish those categories.

Wallets/Responders SHOULD make privacy-relevant consequences visible when possible: whether the Verifier signaled `intentToRetain`, whether the request appears broad, whether the requester accepts raw FHIR JSON or signed SMART Health Cards, whether raw FHIR will be patient-mediated, whether reader authentication is absent or untrusted, and whether a kiosk flow is using an untrusted relay. These signals should be accurate and not alarmist; missing trust evidence can mean reduced assurance rather than a protocol attack, depending on deployment policy.

A Phone presenter in the kiosk flow may show the embedded SMART request before invoking the Wallet, but phone-page display is not a substitute for Wallet/Responder Holder review. Scanning a QR code or tapping a submit page button outside the Wallet does not authorize disclosure. The Wallet/Responder remains responsible for the Holder-control surface unless a deployment profile defines an equivalent Holder-control mechanism and assurance level.

### 12.5 Storage retention defaults

SMART Health Check-in is commonly used for clinical check-in workflows where returned Artifacts are ingested, routed, or retained by the Requester. For this reason, the §8 direct mdoc carrier defaults `intentToRetain` to `true` for `smart_health_checkin_response`. That default is a retention signal for Holder review and Wallet policy; it is not a command to retain all data forever, not a waiver of data minimization, and not a substitute for applicable privacy law, organizational policy, or downstream consent requirements.

A Verifier MAY set `intentToRetain` to `false` only when it truly intends ephemeral use and applicable deployment policy permits that signal. A Requester or Verifier that signals ephemeral use SHOULD avoid downstream ingestion, durable clinical storage, durable analytics, and long-lived support exports of the returned Artifacts except where required for security, audit, legal, or recovery purposes. If a workflow will ingest or persist returned content, the Verifier should not signal ephemeral use merely to make the request appear less sensitive.

Storage retention should be considered separately for at least these classes of data:

1. **Clinical payloads:** SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, and decrypted `SubmissionPlaintext.payload.smartResponse`.
2. **Presentation plaintext and secrets:** §8 `DeviceResponse` plaintext, decrypted kiosk request JWS payloads, request-opening private keys, desktop private keys, Wallet secrets, shared secrets, access tokens, and provider credentials.
3. **Operational metadata:** SMART request ids, request item ids, Artifact ids, kiosk wrapper request ids, submission ids, storage paths, key ids, timestamps, origins, IP addresses, user agents, QR images, row counts, retry events, and validation outcomes.
4. **Diagnostic material:** fixtures, crash reports, debug panels, screenshots, browser storage, console logs, support bundles, analytics events, and developer exports.

Kiosk deployments SHOULD use short request lifetimes and SHOULD delete or make inaccessible expired request rows, encrypted request envelopes, submission rows, ciphertext blobs, orphaned blobs, duplicate rows, QR state, decrypted submissions, transient SMART responses, desktop private keys, and debug artifacts after expiration, abandonment, cancellation, successful completion, or a deployment-defined retention period. Submission service cleanup is defense in depth; Requesters and Completion displays remain responsible for their own decrypted content and downstream records.

Diagnostic fixtures may intentionally retain test keys, decrypted payloads, or non-PHI sample data when clearly labeled and separated from production. A live fixture, crash bundle, debug export, or support bundle containing PHI, production private keys, bearer credentials, unredacted clinical content, or reusable request-opening material should be treated as sensitive production data and handled under incident, audit, or retention policy rather than as an ordinary conformance artifact.

### 12.6 Sensitive category handling

Check-in requests can involve sensitive categories of clinical or administrative information, including mental health, reproductive health, sexual health, substance use, genetic information, infectious disease status, disability information, minors' records, proxy or guardian relationships, payer or coverage details, immigration or address information, and location- or visit-specific inferences. The protocol does not define a universal sensitive-category taxonomy, consent law, segmentation rule, or access-control policy. Deployments, Requesters, and Wallets/Responders remain responsible for applicable law and local policy.

A Requester SHOULD avoid broad selectors when a narrower selector, Questionnaire, or request item would satisfy the workflow with less sensitive disclosure. When a broad selector is necessary, the Requester SHOULD use item `title` and `summary` to explain the breadth in Holder-facing terms. A Wallet/Responder SHOULD apply local sensitive-data policy before disclosure and MAY decline, partially fulfill, redact, summarize, separate Artifacts, require additional Holder confirmation, or return `unsupported`, `unavailable`, `declined`, `partial`, or `error` status as appropriate.

Sensitive-category handling should not be implemented by misusing requester identity fields or transport metadata inside the SMART request body. Requesters SHALL NOT place legal authority claims, special-consent text, source-system assertions, or trust-framework claims into unknown SMART request members to force disclosure. If a deployment requires special consent, segmentation labels, purpose-of-use codes, provenance, break-glass handling, or restricted downstream processing, a deployment profile or registered extension should define the additional semantics, display expectations, and validation rules.

Receivers SHOULD avoid over-relying on raw FHIR JSON for sensitive content when source trust or segmentation matters. Raw FHIR JSON remains patient-mediated unless separately signed or provenanced. SMART Health Cards and other signed Artifacts can provide source evidence, but they can also disclose bundled content beyond the minimum needed for a particular item. Receivers and Wallets/Responders should evaluate both provenance and minimization before requesting or returning sensitive categories.

Public or shared-device contexts require additional care. Kiosk creators and Completion displays SHOULD avoid showing clinical details, sensitive item names, diagnostic details, decrypted payloads, or staff-only debug panels on public screens. Phone presenters SHOULD avoid putting sensitive request details into URL paths, document titles, push notifications, analytics labels, or browser history beyond what is needed for safe request review.

### 12.7 Telemetry guidance

Telemetry, analytics, logs, metrics, and crash reporting can create privacy risk even when protocol payloads are encrypted. Implementations SHOULD default to telemetry that is off, local, aggregated, sampled, redacted, or otherwise minimized for clinical payloads and protocol metadata. When telemetry is enabled, deployments should document what is collected, why it is needed, how long it is retained, who can access it, and how it is separated between development, test, and production environments.

Implementations SHOULD NOT log or send to analytics plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, decrypted kiosk request JWS payloads, decrypted `SubmissionPlaintext`, §8 `DeviceResponse` plaintext, `dcapiResponse` internals, request-opening private keys, desktop private keys, Wallet secrets, shared secrets, provider credentials, access tokens, bearer URLs, full QR images, full Pointer URLs, full ciphertext blobs, or unredacted support bundles except under controlled diagnostic, fixture, audit, or incident procedures.

Metadata telemetry should also be minimized. Full request ids, wrapper request ids, Artifact ids, submission ids, storage paths, key ids, certificate subjects, exact origins, IP addresses, user agents, timestamps, QR scan events, retry sequences, and error strings can support correlation or valid-id enumeration. Implementations SHOULD prefer coarse counters, bounded error categories, truncated or keyed-hashed identifiers, short retention windows, and separation of operational security logs from product analytics when that satisfies operational needs.

Errors and diagnostics SHOULD be designed so that a Holder, staff member, or support operator can recover without exposing clinical content, secrets, stack traces, provider internals, or whether a guessed request id was valid, expired, completed, or absent. Failed decryptions, malformed requests, invalid JWS payloads, unsupported selectors, and malicious display strings may themselves contain sensitive or harmful text; implementations should bound parsing and sanitize displayed or logged diagnostics.

Conformance fixtures and demo logs are not production telemetry. Demo keys and intentionally public fixture private keys are useful for interoperability review only when clearly labeled and isolated. Production telemetry systems SHALL NOT rely on checked-in demo keys, browser-displayed private JWKs, test fixture identifiers, local demo issuer strings, or stale kiosk-session fragment formats as evidence that live collection is safe.

## Organizer notes

### Strengths

- Keeps privacy anchored in the accepted protocol layers: transport-neutral SMART request/response, §8 direct `org-iso-mdoc`, §9 pointer-only kiosk wrapper, and §11 security boundaries.
- Calls out actual correlation surfaces: SMART request ids, item ids, Artifact ids, kiosk wrapper `requestId`, submission ids, storage paths, QR metadata, provider rows, key ids, logs, analytics, and fixtures.
- Preserves the key semantic distinctions: raw FHIR remains patient-mediated unless separately provenanced; requester identity is not in the SMART request body; wrapper `requestId` is distinct from `smartRequest.id`; active kiosk submission carries only `payload.smartResponse`, not raw `dcapiResponse` or `deviceResponse`.
- Uses RFC 2119/8174 language mainly where the privacy text is restating or cross-cutting accepted obligations with clear targets.

### Caveats

- Some retention and telemetry language necessarily remains policy guidance because the base specification does not define a universal legal retention schedule, clinical ingestion policy, audit regime, or telemetry product architecture.
- Sensitive-category handling may need jurisdiction-specific deployment profiles; this draft intentionally avoids inventing a universal category registry or consent taxonomy.
- The mdoc `intentToRetain` discussion may need final alignment with the conformance checklist so that `true` remains the default but `false` is not over-promised as a hard deletion guarantee.

### Open questions

- Should §12 or §15 define recommended maximum retention windows for kiosk relay rows, or should those stay entirely deployment-defined?
- Should a future deployment profile define a standard way for Phone presenters to transmit protected §8 validation evidence to Completion displays without including raw `dcapiResponse` or `deviceResponse` in the active submission payload?
- Should extension registries require a specific privacy-considerations template for selector kinds, Artifact media types, and provider profiles?

### Downstream dependencies

- T5.D registries should require privacy considerations for extension selector kinds, Artifact media types, status-code extensions, kiosk provider profiles, and any future algorithm/profile entries that add identifiers or telemetry surfaces.
- T5.E internationalization should ensure that Holder-facing privacy and trust distinctions survive localization without turning unauthenticated request text into verified identity.
- T5.F should inventory only the normative requirements retained by the organizer, with clear targets for Requester, Wallet/Responder, Verifier, Kiosk creator, Phone presenter, Submission service, Completion display, receiver, and deployment profile.
- T6.A implementation guidance should handle platform-specific logging, browser storage, mobile OS integration, production key custody, analytics configuration, and operational cleanup details.
