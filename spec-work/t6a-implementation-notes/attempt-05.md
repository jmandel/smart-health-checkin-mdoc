## 15. Implementation notes

This section is informative. It collects practical implementation patterns and gaps observed in prototype code, fixtures, and deployment discussions. Protocol conformance remains defined by the normative sections and Appendix A; the guidance below is not intended to add new mandatory behavior.

### 15.1 Verifier app

A Verifier app can be structured as a pipeline with separate stages for clinical request construction, same-device transport preparation, Wallet invocation, transport opening, SMART response validation, trust interpretation, and downstream workflow routing. Keeping those stages explicit helps avoid treating a successful transport event as a clinically usable response.

A practical browser integration uses a thin Digital Credentials API layer over the core model:

1. build a `SmartHealthCheckinRequest` under §5;
2. validate it before building transport bytes;
3. build a direct `org-iso-mdoc` request with the SMART request JSON in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
4. call `navigator.credentials.get(...)` only after the page has an authenticated origin and user-visible action context;
5. open the returned direct mdoc response with the retained verifier HPKE private key and the exact §8 `SessionTranscript`; and
6. validate the extracted `SmartHealthCheckinResponse` under §6, including §6.6 cross-validation against the retained original request.

The TypeScript SDK already reflects this split: `core.ts` owns transport-neutral request/response types and validation, `protocol/index.ts` owns byte-level `org-iso-mdoc` helpers, and `dcapi-verifier.ts` owns browser verifier orchestration. The `VerifierAuthority` seam is a useful packaging boundary: a browser-local authority can support demos and static pages, while production-like deployments often put the HPKE private key, request handle, audit state, and completion processing behind a server-owned authority. UI code can depend on the same prepare/request/complete lifecycle either way.

Verifier validation is easiest to maintain as an ordered checklist rather than as one large parser. Useful checkpoints are: request model validation; direct mdoc request construction; origin and `SessionTranscript` binding; optional per-`DocRequest.readerAuth` verification when present; HPKE opening with empty §8 AAD; `DeviceResponse`, issuer/MSO, value-digest, and device-auth checks; extraction of the stable `smart_health_checkin_response` element; SMART response validation; §6.6 request/response cross-validation; and §7 trust interpretation. The active web demo performs useful opening and display work and the phone submit page uses `smartResponseValidation` from the local DC API verifier, but the kiosk completion UI should still be treated as a development display unless it separately completes all required completion-side validation and trust accounting from §§8-9.

Browser/DC API deployments benefit from explicit support detection and fallback messaging. The active React binding exposes `useDcApiSupport()` and a phase model (`idle`, `preparing`, `requesting`, `completing`, `complete`, `error`). Production UIs can use the same phases while avoiding developer-only panels that expose private JWKs, raw ciphertext, decrypted payloads, or complete protocol dumps.

For logging and telemetry, prefer coarse phase transitions, bounded error classes, payload sizes, and redacted correlation handles. Avoid routine logging of SMART requests, SMART responses, raw FHIR, SMART Health Cards, `DeviceResponse` plaintext, `dcapiResponse` internals, private keys, full live Pointer URLs, or provider credentials. Debug bundles and fixtures are valuable, but they need clear test-only labeling and separation from live PHI.

### 15.2 Wallet implementation guidance

A Wallet can treat the SMART Health Check-in request as a clinical worklist embedded in a presentation request. The direct `org-iso-mdoc` parser first proves that the request is for this profile, preserves tag-24 `ItemsRequest` bytes, extracts the SMART request JSON from `requestInfo`, validates it under §5, computes the same `SessionTranscript` from authenticated platform origin evidence, and classifies any `readerAuth` result before rendering Holder review.

Holder review works best at request-item granularity because item ids drive both `artifacts[].fulfills[]` and `requestStatus[]`. A Wallet can group or summarize items for usability, accessibility, and localization, but the underlying ids and selector semantics remain exact. Broad `profilesFrom[]` and exact `profiles[]` are additive selectors; wallet matching logic should not reinterpret exact profiles as a narrowing filter over the profile-family request. No-selector `fhir.resources` requests deserve especially clear Holder-facing explanation.

Mobile UX should separate unauthenticated request text from trust evidence. `purpose`, item `title`, item `summary`, profile URLs, Questionnaire text, provider app ids, QR page branding, and common names are useful context, but they are not authenticated requester identity by themselves. If origin evidence, privileged-caller evidence, trusted reader-authentication policy, or deployment-trusted kiosk-creator information is available, display it in a visually distinct trust area. If reader authentication is absent, invalid, valid-but-untrusted, or trusted, make that state available to policy and review rather than flattening it to a boolean.

FHIR and Questionnaire handling are implementation-heavy and intentionally outside the normative wire core. The Android prototype maps request selectors into wallet UI categories, supports canonical and inline Questionnaire forms, builds `QuestionnaireResponse` resources from collected answers, and preserves request item ids in generated artifacts and status. Production wallets can extend that approach with richer FHIR profile matching, data-source selection, sensitive-category policy, provenance-aware display, and per-item partial/declined/unavailable outcomes.

Internationalization and accessibility need platform-specific attention. Display strings can contain non-Latin scripts, combining marks, emoji, and bidirectional text. Wallets can use platform BIDI isolation, safe truncation, code-style rendering for machine values, and explicit labels to keep profile URLs, origins, identifiers, trust indicators, warnings, and action buttons from being visually spoofed by adjacent untrusted text. Locale selection is local UI behavior unless a deployment profile defines an interoperable extension.

Android, WASM, and Kotlin components illustrate useful layering. The Rust/WASM matcher stays coarse: it looks for `org-iso-mdoc` and the SMART Check-in doctype so Credential Manager can offer an entry without heap-heavy CBOR parsing. The Kotlin handler performs full CBOR, `requestInfo`, encryptionInfo, readerAuth, and `SessionTranscript` processing after selection. This split keeps matchers small and deterministic while leaving validation and consent to the richer wallet application layer.

Local key lifecycle matters. Wallet response keys, issuer/device demo keys, reader-auth verification material, cached requests, Questionnaire answers, and generated responses should have clear in-memory, persistence, backup, and deletion behavior. Demo self-signed issuer evidence and checked-in fixture keys are useful for development; production wallets need deployment policy before representing issuer, reader, or clinical-source trust.

### 15.3 EHR ingestion

EHR ingestion is a receiver workflow layered on top of a validated SMART response. A receiver can divide ingestion into quarantine, validation, reconciliation, and commit stages. The quarantine stage stores the original response and validation evidence with restricted access while the system determines whether the payload is syntactically valid, responsive to the original request, trusted enough for the target workflow, and safe to show or import.

A practical ingestion order is:

1. verify the same-device or kiosk completion evidence available to the receiver;
2. validate the SMART response shape under §6;
3. apply §6.6 against the original SMART request;
4. verify every SMART Health Card JWS in `application/smart-health-card` artifacts according to SMART Health Cards and local trust policy;
5. parse raw `application/fhir+json` artifacts under their declared `fhirVersion`;
6. evaluate FHIR `meta.profile`, Bundle structure, patient matching, source/provenance evidence, and local policy;
7. route item-level `declined`, `partial`, `unavailable`, `unsupported`, and `error` outcomes as normal workflow states; and
8. import, attach, suppress, or retain according to clinical, legal, and operational policy.

Raw FHIR JSON remains patient-mediated unless the artifact payload, extension profile, deployment profile, or another accepted mechanism supplies separate provenance, signature, source attestation, or authenticated retrieval evidence. mdoc issuer/device proof, HPKE opening, kiosk wrapper validation, request-id matching, and Holder approval are important presentation facts, but they do not transform unsigned raw FHIR into source-authenticated clinical data.

Receivers can minimize risk by rejecting or quarantining nonresponsive artifacts, unaccepted media types, unexpected FHIR versions, unresolved `fulfills[]` edges, duplicate or missing status rows, inconsistent status-to-artifact combinations, and resources that cannot be matched to the patient or encounter. Quarantine records should distinguish protocol-valid but clinically untrusted content from syntactically invalid content and from content that is valid but not appropriate for automatic import.

Operator displays should avoid showing sensitive clinical details on shared kiosk screens. Staff-facing completion screens can show coarse states such as waiting, response received, validation failed, partial response, ready for review, imported, or quarantined. Detailed FHIR, SHC, status messages, and debug evidence are better reserved for authorized review screens with audit logging and retention controls.

### 15.4 Kiosk transport-provider implementations

A kiosk provider is an untrusted relay for opaque request and submission state. Provider implementations can use databases, object storage, queues, webhooks, polling, local-network channels, or hosted realtime stores, but the useful abstraction is stable: write encrypted request, read encrypted request by wrapper `requestId`, write encrypted submission, download ciphertext bytes, and observe candidate submission rows for one wrapper `requestId`.

The active InstantDB/Instant Storage provider demonstrates this pattern. Request rows contain a wrapper `requestId` and an `EncryptedKioskRequest`. Submission rows contain a wrapper `requestId`, provider `submissionId`, storage path, storage file id, IV, and phone ephemeral public JWK; the ciphertext is stored as an `application/octet-stream` blob. The provider accepts synced or queued writes as delivery responsibility, while the Completion display remains responsible for local decryption, request-id binding, SMART response validation, and trust interpretation.

Provider profiles often need policy for row shape, blob size, expiration, cleanup, duplicate handling, idempotency, read/write authorization, anti-enumeration, rate limits, retry backoff, observation semantics, and error reporting. These controls are defense in depth. They are not replacements for request-envelope encryption, creator-JWS verification, response-submission encryption, AES-GCM AAD binding to wrapper `requestId`, decrypted `SubmissionPlaintext.requestId` checks, §6 validation, §8 validation, or §7 trust interpretation.

Keep the two kiosk encryption contexts distinct in code and documentation. The request envelope encrypts the compact kiosk request JWS with info `smart-health-checkin-kiosk-request-v1`. The response-submission envelope encrypts `SubmissionPlaintext` with info `smart-health-checkin-kiosk-response-v1`. Both use wrapper `requestId` as binding input for the active kiosk wrapper, but neither is the §8 HPKE context, whose info is the same-device `SessionTranscript` and whose AAD is empty.

Pointer handling should stay pointer-only for the active profile: the QR or handoff URL carries `#r=<requestId>` and not a SMART request, compact JWS, encrypted envelope, §8 `DeviceRequest`, `encryptionInfo`, Wallet response, submission ciphertext, clinical content, or private key material. Older or helper code that serializes inline kiosk fragments containing `deviceRequest` and `encryptionInfo` is useful only as historical or experimental material; SDK packaging should avoid presenting it as the active kiosk profile.

Completion displays need careful retry and cleanup behavior. Blob uploads and realtime rows can arrive out of order; a row may be visible before the blob is downloadable. Bounded retries with backoff are safer than immediate failure or infinite polling. After successful completion, expiration, abandonment, or cancellation, the trusted workflow can stop showing the QR, release desktop private key material, remove transient decrypted state, and request provider cleanup according to retention policy.

### 15.5 SDK packaging guidance

The current TypeScript source already suggests package boundaries:

| Package boundary | Contents |
| --- | --- |
| Core model | SMART request/response types, JSON validation, §6.6 cross-validation helpers, selector utilities, media-type helpers. |
| Direct mdoc / DC API verifier | `org-iso-mdoc` constants, CBOR/COSE/HPKE helpers, request construction, response opening/inspection, readerAuth helpers, fixture inspection utilities. |
| Kiosk wrapper | Kiosk JWS and encrypted envelope helpers, pointer parsing/building, provider interfaces, request/submission encryption, size checks. |
| Framework bindings | React hooks/components or other UI bindings that consume the non-React SDK without owning protocol parsing. |
| Native wallet libraries | Android/Kotlin request parsing, response construction, QuestionnaireResponse building, matcher integration, and platform trust adapters. |

Keep protocol constants in one place per language and export them through tested modules. In TypeScript, the non-React barrel can remain React-free so server code, tests, native bridges, and non-React frameworks do not inherit React dependencies. React bindings can stay thin: lifecycle, buttons, support detection, and rendering hooks, not duplicate CBOR, HPKE, or SMART validation logic.

Public SDK APIs should make validation order hard to misuse. Useful return types include a prepared request handle, public debug artifacts with private key material redacted, a private completion context held by the verifier authority, an opened response with validation results, and a clear distinction between development inspection data and production-safe telemetry. Avoid exposing helper APIs that invite callers to skip §6.6, mix kiosk wrapper ids with SMART request ids, or package active kiosk QR codes with inline §8 material.

Packaging for native wallets can mirror the Android split: a tiny matcher module, a request parser/validator, a response factory, clinical content adapters, UI/consent rendering, and platform-specific registration. Kotlin/JVM tests and TypeScript tests should share fixture vectors where possible, especially for `ItemsRequest` tag-24 bytes, `SessionTranscript`, readerAuth, HPKE empty-AAD opening, SMART response validation, kiosk JWS/envelope round trips, and request/response cross-validation.

Test harnesses should include positive byte vectors, negative mutation tests, schema/procedural validation, cross-language comparisons, and UI-safe rendering checks. Useful negative cases include scalar `profilesFrom`, request-profile wrappers, preset ids, legacy inline kiosk fragments, wrong wrapper-vs-SMART request ids, wrong kiosk HKDF info, wrong AAD, expired kiosk requests, wrong provider app id, malformed row metadata, oversized blobs, duplicate submissions, unsupported media types, and raw FHIR artifacts lacking acceptable provenance for automatic ingestion.

Distribution notes should label demo keys, self-signed certificates, fixture private keys, debug panels, public test vectors, and InstantDB demo configuration as non-production material. Production packages can provide hooks for key custody, trust-anchor configuration, telemetry redaction, retention policy, rate limiting, cleanup, and deployment-profile validation without baking any one hosting provider or EHR workflow into the core model.

## Organizer notes

**Strengths:** This draft keeps §15 informative, preserves the direct SMART request model, separates same-device, kiosk request, and kiosk response encryption contexts, and calls out practical gaps in the active demo completion UI. It also brings in platform-specific notes from browser/DC API, Android/Kotlin, WASM matcher, InstantDB provider, validation pipeline, i18n/BIDI, and SDK packaging.

**Caveats:** Some wording is intentionally broad because production trust anchors, EHR ingestion policy, server-owned verifier authority, and provider profiles are deployment decisions rather than settled core behavior. The active `kiosk-session.ts` inline-fragment helper appears stale relative to the pointer-only canonical kiosk profile and should be handled carefully by the organizer.

**Open issues:** Decide how much of the EHR ingestion pipeline belongs in §15 versus future deployment-profile guidance. Decide whether to explicitly name demo-only files and modules in final prose or keep the canonical section implementation-neutral.

**Downstream dependencies:** T6.B examples should show validation states without implying raw FHIR provenance. T6.C fixture alignment is the right place to decide on refreshed Android captures and to label historical versus active kiosk/session artifacts.
