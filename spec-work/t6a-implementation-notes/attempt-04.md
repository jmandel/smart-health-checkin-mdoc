## 15. Implementation notes

This section is informative. It describes implementation patterns that fit the normative request, response, direct `org-iso-mdoc`, kiosk, security, privacy, registry, and internationalization rules defined in §§5-14 and indexed in Appendix A. It does not define additional conformance obligations.

### 15.1 Verifier app

A verifier app is easiest to reason about when it keeps five layers separate:

1. **SMART request construction.** Build a transport-neutral `SmartHealthCheckinRequest` under §5. Keep requester identity, web origin, reader certificates, kiosk routing, callback endpoints, and other trust metadata outside the request body. For FHIR selectors, treat `profiles[]` and `profilesFrom[]` as additive selectors; `profilesFrom[]` is an array of canonical profile-family URLs, not a package descriptor, preset, request profile, IPS shortcut, or topic label.
2. **Browser and platform binding.** For same-device use, the current browser integration constructs the direct `org-iso-mdoc` request for `navigator.credentials.get(...)`: `DeviceRequest`, `encryptionInfo`, tag-24 `ItemsRequest`, and `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A practical browser integration keeps the exact `encryptionInfo` base64url string, generated HPKE recipient key material, and expected origin together in one request context so §8 response opening can use the same `SessionTranscript` bytes.
3. **Wallet response opening.** After the Digital Credentials API returns, first parse the returned `org-iso-mdoc` response and HPKE-open the `DeviceResponse` using §8 parameters, including empty HPKE AAD. Then inspect mdoc structure, issuer-signed element digests, device authentication, and the stable `smart_health_checkin_response` element before exposing clinical content to workflow code.
4. **SMART response validation.** Shape validation alone is not enough for workflow use. Apply §6.6 against the original request: exact `requestId`, known `fulfills[]` item ids, accepted `mediaType` for every fulfillment edge, FHIR-version compatibility, and exactly one `requestStatus[]` entry per request item. Treat failure as reject, quarantine, or staff-review input rather than as completed check-in.
5. **Trust interpretation.** Keep origin trust, optional `readerAuth`, mdoc issuer/device evidence, SMART Health Card signatures, raw-FHIR provenance, kiosk-creator trust, and local workflow authorization as separate validation results. Raw `application/fhir+json` content remains patient-mediated unless the artifact payload, a deployment profile, or other accepted evidence supplies separate provenance or signatures.

The current TypeScript verifier modules illustrate useful boundaries: `core.ts` owns transport-neutral request/response types and validators; `dcapi-verifier.ts` owns browser-local Digital Credentials API request preparation, response opening, and the verifier-authority seam; `react.tsx` is a thin optional UI layer. The checked-in demo can open and display responses and performs important SMART cross-validation through `openWalletResponse(...)`, but production apps still need complete §8 trust reporting, issuer and reader trust policy, SMART Health Card verification, raw-FHIR provenance handling, and EHR-ingestion policy before treating returned content as accepted clinical data.

Browser implementation notes:

- Detect Digital Credentials API availability and provide a non-destructive fallback path when unsupported, cancelled, or blocked by platform policy.
- Prefer fresh per-presentation HPKE recipient keys and nonce values. If a deployment profile permits reuse, document replay, correlation, retention, and compromise handling outside the SMART request body.
- Treat debug artifacts containing private verifier JWKs, `dcapiResponse` internals, decrypted `DeviceResponse` bytes, request JSON, or clinical payloads as controlled diagnostics. Demo panels can expose these values for fixture development; production telemetry and support bundles typically use redaction, scoped identifiers, and short retention.
- Render verifier and completion states precisely: prepared, wallet invoked, response received, HPKE opened, mdoc validation failed, SMART validation failed, valid but untrusted source, valid but declined/partial, accepted for local workflow, and imported downstream are different states.
- Use BIDI isolation and safe truncation for display text, origins, profile URLs, item ids, status messages, and diagnostic snippets so Holder-provided or requester-provided text cannot spoof trust indicators.

### 15.2 Wallet implementation guidance

A Wallet/Responder can structure request handling as a pipeline:

1. **Platform intake.** Accept only the direct `org-iso-mdoc` request shape for the active v1.0 flow. Recover the authenticated origin or deployment-approved origin-equivalent from the browser/platform channel, not from the SMART request JSON or kiosk metadata.
2. **Byte-level request parsing.** Base64url-decode `deviceRequest` and `encryptionInfo`; parse CBOR with definite-length and tag-24 checks appropriate to the platform; preserve the exact tag-24 `ItemsRequest` bytes for optional `readerAuth`; recover the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
3. **SMART request validation.** Validate the §5 object before matching local data. Reject malformed required fields, unsupported selector shapes, invalid `profilesFrom[]`, duplicate item ids, and unknown selector kinds that cannot be processed. Avoid inferring request semantics from display strings or historical dynamic-element experiments.
4. **Trust classification.** Classify origin and `readerAuth` separately. When per-`DocRequest.readerAuth` is present, verify the detached ES256 `COSE_Sign1`, exact `SessionTranscript`, exact tag-24 `ItemsRequest` bytes, protected alg, `x5chain` label 33 certificate evidence, and deployment trust policy before displaying it as trusted. Distinguish absent, malformed, signature-failed, valid-but-untrusted, and trusted reader states.
5. **Holder review.** Present request items at meaningful granularity. It is fine to group, summarize, translate, or reorder for accessibility, but preserve item ids exactly for `fulfills[]` and `requestStatus[].item`. Do not present `purpose`, `title`, `summary`, selector URLs, relay names, or demo branding as authenticated requester identity unless a separate trust layer established that fact.
6. **Response construction.** Build the §6 SMART response from Holder choices, Wallet policy, and available data. Use `declined`, `partial`, `unavailable`, `unsupported`, and `error` as normal item outcomes rather than transport failures when the request is valid enough to answer.
7. **mdoc response sealing.** Place the SMART response JSON as the issuer-signed `smart_health_checkin_response` element in namespace `org.smarthealthit.checkin`; preserve tag-24 digest boundaries; bind device authentication to the same `SessionTranscript`; encrypt the CBOR `DeviceResponse` with §8 HPKE using `info = SessionTranscript bytes` and empty AAD.

Android/Kotlin notes from the current implementation are useful but deliberately limited. The Kotlin parser uses a small CBOR reader/writer tailored to captured `org-iso-mdoc` requests; it rejects unsupported 64-bit lengths and indefinite-length items, preserves tag-24 bytes, computes the direct `dcapi` `SessionTranscript`, and verifies demo `readerAuth` signature material. The demo wallet reflects the Credential Manager caller into an allow-list to exercise origin plumbing; production wallets instead maintain a real trusted-browser or privileged-caller policy. The demo also writes rich debug bundles under app storage for adb capture; production builds usually gate this behind explicit diagnostic mode and avoid retaining PHI, private keys, full ciphertexts, or decrypted mdoc payloads.

FHIR and Questionnaire handling can be incremental. A practical wallet can map common `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to local store categories, while still preserving additive selector semantics and reporting `unsupported` or `partial` when matching is uncertain. For Questionnaire selectors, canonical fetchers can strip `|version` for HTTP retrieval while preserving canonical identity in `QuestionnaireResponse.questionnaire`; use timeouts, size caps, scheme allow-lists, and safe renderer policies. Mobile UIs should support large text, right-to-left scripts, combining marks, localization, and accessibility labels without normalizing protocol identifiers for comparison.

### 15.3 EHR ingestion

EHR ingestion is downstream policy, not part of the presentation protocol. An ingestion service can reduce risk by treating every completed response as an evidence package with separate fields for:

- original SMART request and selected deployment profile;
- §8 validation results, including HPKE opening, mdoc issuer/MSO/digest/device checks, stable element extraction, and transcript binding;
- optional reader/origin/kiosk-creator trust decisions;
- §6 and §6.6 SMART validation results;
- per-artifact clinical-source evidence, such as SMART Health Card JWS verification or FHIR Provenance/signature evidence;
- Holder-level outcomes from `requestStatus[]`;
- quarantine, import, reconciliation, and audit decisions.

A common ingestion order is: parse bounded JSON, validate the SMART response shape, cross-validate against the original request, verify transport evidence, evaluate trust layers, inspect artifacts, then route each artifact to quarantine, staff review, patient-mediated document storage, or structured import. For raw FHIR JSON, verify `fhirVersion`, resource or Bundle shape, mixed-version constraints, selector responsiveness, and local patient matching. Because raw FHIR is patient-mediated by default, structured chart import often needs additional provenance, staff reconciliation, or local policy approval. SMART Health Card artifacts carry signed clinical-source evidence inside `value.verifiableCredential[]`, but ingestion still needs JWS verification, issuer trust policy, payload inspection, and patient matching.

Quarantine is a normal outcome for otherwise well-formed responses when evidence is incomplete: unsupported FHIR version, unresolved profile-family mapping, untrusted issuer, failed SMART Health Card signature, ambiguous patient match, duplicate submission, stale kiosk session, or unexpected extra content. Quarantine records should preserve enough evidence for authorized review while minimizing PHI spread and avoiding routine telemetry of raw payloads.

Avoid treating these signals as clinical acceptance by themselves: QR scan, provider row presence, upload success, successful kiosk decryption, wrapper `requestId` equality, mdoc container validity, Holder approval, or `fulfilled` status. Each is useful evidence in its own layer, not a substitute for downstream clinical policy.

### 15.4 Kiosk transport-provider implementations

The active kiosk flow is a wrapper around the same §5 SMART request, phone-local §8 presentation, and §6 SMART response. The QR/URL is pointer-only:

```text
https://clinic.example/verifier/submit.html#r=<wrapper-requestId>
```

The pointer identifies encrypted request state; it does not inline a SMART request, `DeviceRequest`, `encryptionInfo`, request JWS, encrypted request object, SMART response, or ciphertext blob. Historical helpers or tests that encode `dr=`, `ei=`, relay descriptors, or inline same-device fragments are useful migration warnings, not the active v1.0 kiosk profile.

A provider implementation can be as simple as the five-capability abstraction used by the current TypeScript adapter:

- write encrypted request envelope by wrapper `requestId`;
- read encrypted request envelope by wrapper `requestId`;
- write encrypted response-submission metadata and opaque ciphertext;
- download exact ciphertext bytes for a selected submission;
- observe, poll, list, subscribe to, or receive notifications for candidate submissions for one wrapper `requestId`.

Provider APIs can use InstantDB, object storage plus database rows, WebSocket notification, polling, webhooks, local-network transports, or server queues. The important design property is that the provider only needs opaque ciphertext and routing metadata: wrapper ids, row ids, storage paths, content type, IVs, public ephemeral keys, key ids, timestamps, sizes, and operational auth state. It does not need plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, SMART responses, raw FHIR, SMART Health Cards, Holder choices, §8 plaintext, private keys, shared secrets, or clinical trust decisions.

Operational guidance for providers and completion displays:

- Use high-entropy wrapper ids and short lifetimes; stop showing stale QR codes after expiration, abandonment, cancellation, or successful completion.
- Keep request-envelope and response-submission crypto contexts separate. The request wrapper uses `smart-health-checkin-kiosk-request-v1`; the response submission uses `smart-health-checkin-kiosk-response-v1`; both differ from §8 HPKE.
- Validate pointer, provider row, envelope, signed payload, and decrypted submission ids by exact equality at the appropriate layers, while keeping wrapper `requestId` distinct from `smartRequest.id` and `SmartHealthCheckinResponse.requestId`.
- Enforce row and blob size limits before expensive parsing, allocation, or decryption; cap concurrent downloads and retries; apply backoff for missing blobs or transient storage propagation.
- Treat duplicate valid submissions as replay/retry/staff-review events unless a future profile defines aggregation. Do not merge artifacts across submissions for one kiosk session by default.
- Design errors to support recovery without revealing whether a guessed wrapper id exists, expired, completed, or failed policy.
- Minimize metadata retention: wrapper ids, storage paths, key ids, IP addresses, user agents, row counts, timestamps, and retry behavior can reveal check-in activity even while payloads remain encrypted.
- Keep local desktop response private keys only as long as needed for active completion, expiration, cleanup, recovery, or authorized audit.

The current InstantDB/Instant Storage demo demonstrates this shape: request rows store encrypted request envelopes; submission rows carry metadata and an opaque `application/octet-stream` blob; the creator page observes rows and decrypts locally. Demo technical panels display provider rows and desktop private JWK material to aid development; production kiosks typically hide those details, use server-owned or hardware-backed key custody where appropriate, and provide staff-facing states such as waiting, received, decrypting, validation failed, needs review, accepted, or imported.

### 15.5 SDK packaging guidance

SDKs are easier to adopt when package boundaries mirror protocol boundaries:

- **Core model package.** Transport-neutral TypeScript/Kotlin/Swift/etc. types, parsers, JSON Schema helpers, and §6.6 cross-validation. This package should not depend on browser APIs, React, Android Credential Manager, mdoc libraries, storage providers, or EHR-specific ingestion.
- **Direct `org-iso-mdoc` verifier package.** Browser/platform request construction, `DeviceRequest`/`encryptionInfo` builders, `SessionTranscript` helpers, optional `readerAuth` construction, HPKE opening, mdoc inspection, and validation evidence reporting.
- **Wallet/responder package.** Platform intake, request parsing, selector matching interfaces, Holder-review data models, response construction, mdoc response building, and HPKE sealing. Mobile implementations may split core SMART logic from Android Credential Manager or iOS/Safari-specific entry points.
- **Kiosk wrapper package.** Pointer parsing, request JWS/envelope helpers, response-submission encryption/decryption, provider interfaces, retry/cleanup helpers, and validation-state models. Keep stale inline-fragment helpers clearly deprecated or in a compatibility namespace so they cannot be confused with pointer-only `#r=`.
- **UI bindings.** React, Compose, SwiftUI, or other presentation layers should stay thin and consume validated state from core/verifier/wallet packages. They should own rendering, accessibility, localization, BIDI isolation, and workflow labels, not duplicate protocol parsing.
- **Provider adapters.** InstantDB, object-store, worker-relay, local-network, or server-queue adapters can implement a common untrusted-relay interface without pulling clinical validators or UI dependencies into the transport package.
- **Test and fixture tools.** Keep byte-ladder generation, CBOR diagnostics, Android capture inspection, deterministic vector generation, and negative corpus tests in developer-facing packages or test modules. Fixture manifests should label demo keys, public private keys, historical captures, synthetic data, and comparison mode.

Useful test seams include injected `CredentialGetter` functions for browser verifier tests, deterministic nonce/key material for byte vectors, memory kiosk providers for workflow tests, JSON negative corpora for request/response validation, HPKE context substitution tests, `readerAuth` positive and negative vectors, and Android/Kotlin tests that compare parser output and response bytes to checked-in fixtures. Packaging should make it possible to run core validators in CI without a browser, and to run platform capture tests only where the relevant browser/OS stack is available.

Logging and telemetry APIs should be opt-in and structured around redacted validation evidence. Avoid default logs that include full SMART requests, raw FHIR, SMART Health Cards, Questionnaire answers, `dcapiResponse`/`DeviceResponse` internals, kiosk decrypted payloads, live pointer URLs, full QR images, private keys, shared secrets, access tokens, or full ciphertext blobs.

### Organizer notes

**Strengths**

- Preserves the direct SMART request model, additive selector semantics, pointer-only kiosk URL, untrusted relay model, direct `org-iso-mdoc` profile, optional per-`DocRequest.readerAuth`, empty-AAD §8 HPKE, and separated kiosk encryption contexts.
- Calls out practical browser, React, Android/Kotlin, CBOR, WASM/coarse matching, provider, validation, EHR-ingestion, logging, cleanup, retry, i18n, and packaging concerns without moving platform details into the normative core.
- Explicitly warns that demo/debug UIs and current checked-in code are development aids, not complete production validation, trust, telemetry, or key-custody patterns.

**Caveats**

- The text intentionally avoids adding numeric limits or new validation rules beyond references to §§5-14. Deployment profiles or fixture sections may later choose concrete limits.
- Current SDK code still contains a `kiosk-session.ts` descriptor pattern with inline `deviceRequest`/`encryptionInfo`; §15 should treat that as historical or migration material unless later code removes or renames it.
- EHR ingestion guidance is policy-oriented because patient matching, chart import, provenance acceptance, audit, and legal retention remain deployment-specific.

**Open issues**

- Production reader, issuer, kiosk-creator, provider, and clinical-source trust-anchor registries remain downstream deployment-profile work.
- Machine-readable `profilesFrom[]` family maps and FHIR profile-validation depth remain implementation choices unless a later profile defines them.
- Complete deterministic kiosk vectors and final fixture index alignment belong in T6.C; this draft does not request refreshed Android captures.

**Downstream dependencies**

- T6.B examples should reuse these implementation states without changing protocol semantics.
- T6.C can decide how to label current Android captures, demo private keys, InstantDB traces, and stale inline-kiosk helpers.
- T7 future-work text can reference production trust anchors, privileged-browser policy, OID4VP binding, external conformance suites, and iOS/Safari feasibility without reopening §15.
