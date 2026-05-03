## 15. Implementation notes

This section is informative. It collects implementation patterns observed in the prototype, fixture work, and platform experiments. Normative behavior remains in §§5-14 and Appendix A; this section is intended to help implementers organize production code without creating additional conformance obligations.

### 15.1 Verifier app

A Verifier app has two jobs that are easy to blur: it creates a bounded SMART request under §5, and it validates whatever returns under §6, §7, and the selected transport binding. A practical architecture keeps those jobs in separate modules: request authoring and review, Digital Credentials API request construction, mdoc/HPKE opening, SMART response cross-validation, clinical-source verification, and local workflow ingestion.

Browser integrations can treat the direct `org-iso-mdoc` call as the active same-device surface. In the prototype this means constructing a `navigator.credentials.get()` argument with one `digital.requests[]` entry whose `protocol` is `org-iso-mdoc`, whose `data.deviceRequest` contains the §8 `DeviceRequest`, and whose `data.encryptionInfo` contains the verifier HPKE recipient information. The SMART request is carried directly in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`; implementations can avoid legacy dynamic element-name fallbacks except as diagnostics for older experiments.

Verifier-side validation is most reliable when ordered from transport to clinical semantics:

1. capture the exact request object and transport artifacts used for the presentation;
2. derive the §8 `SessionTranscript` from the exact `encryptionInfo` base64url string and authenticated origin or deployment-approved origin-equivalent;
3. open the Wallet response with the §8 HPKE context, using empty AAD as defined in §8;
4. inspect the `DeviceResponse`, `docType`, namespace, `smart_health_checkin_response` element, issuer-signed item digests, device authentication, and optional reader authentication according to §8;
5. parse the embedded SMART response and apply §6.6 against the original SMART request;
6. interpret issuer/device evidence, optional readerAuth, SMART Health Card signatures, raw FHIR provenance, and local trust policy under §7 and §11 before workflow use.

Shape validation alone is not enough. The active web SDK includes request and response shape validators plus `validateResponseAgainstRequest`; production Verifier apps can build around the same separation while adding full mdoc issuer/device trust checks, SMART Health Card verification, raw FHIR provenance assessment, patient matching, and local policy review. The current demo UI is useful for decrypting, inspecting, and displaying returned content, and it is best described as a development aid unless the deployment has completed all §8, §6.6, §7, and downstream validation steps.

Verifier UIs can reduce mistakes by showing different states for “request prepared,” “Wallet invoked,” “transport opened,” “SMART response structurally valid,” “cross-validation passed,” “trust/provenance assessed,” “accepted for staff review,” and “imported.” Public or shared screens often need less detail than developer panels. Debug panels that expose decrypted payloads, request artifacts, private JWKs, provider rows, stack traces, or fixture material are best kept out of production builds or gated by explicit diagnostic policy.

### 15.2 Wallet implementation guidance

A Wallet implementation can treat the SMART request as a transport-neutral clinical request whose Holder-facing review model is independent of mdoc internals. A common layering is:

- a parser that extracts `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, validates the §5 request, and preserves exact request and item identifiers;
- a request-classification layer that maps selectors to local data sources and UI groups without changing protocol values;
- a Holder UX layer for item-level review, refusal, partial disclosure, localization, and accessibility;
- a response factory that emits §6 `SmartHealthCheckinResponse` objects with exact `requestId`, `fulfills[]`, and `requestStatus[]` accounting;
- an mdoc responder that packages the SMART response into the stable `smart_health_checkin_response` element and encrypts the §8 response.

Wallet matching and request handling can be deliberately different. The Android experiment uses a small Rust/WASM Credential Manager matcher that self-filters on the outer `org-iso-mdoc` string and the decoded mdoc doctype `org.smarthealthit.checkin.1`; it does not parse FHIR or decide consent. Kotlin modules then parse the direct mdoc request, derive the DC API SessionTranscript, verify optional per-`DocRequest.readerAuth` when present, classify request items, and build the response. This division keeps the matcher small and avoids putting clinical logic into the Credential Manager sandbox.

Request classification can be friendly without becoming normative. For example, Android/Kotlin code may map known US Core, CARIN, IPS, or resource-type selectors to “coverage,” “plan,” “clinical history,” or “questionnaire” screens. That mapping still preserves additive `profiles[]` plus `profilesFrom[]` semantics from §5; it is not a `requestProfile`, preset, IPS shortcut, or “all-of-the-above” wrapper. Unknown selectors can be rendered as unsupported, unavailable, or policy-dependent outcomes rather than guessed from display text.

Wallet UX often needs extra care beyond the wire format:

- display `purpose`, item `title`, `summary`, accepted media types, broad/no-selector warnings, advisory `required`, and retention-related signals as request context, not authenticated requester identity;
- visually separate authenticated origin, privileged-caller evidence, readerAuth results, issuer/device trust, and local policy from unauthenticated display strings;
- render Unicode, right-to-left text, mixed-direction identifiers, profile URLs, and FHIR displays with isolation and clear boundaries as discussed in §14;
- support Holder choices that result in `declined`, `partial`, `unavailable`, `unsupported`, or `error` without treating those outcomes as exceptional failures;
- avoid embedding secrets, stack traces, source-system names, or unnecessary clinical facts in `requestStatus[].message`.

Local key and data lifecycles are implementation decisions with security consequences. A Wallet can use fresh presentation-session keys for §8 response encryption, keep readerAuth verification state separate from issuer/device trust, separate demo keys from production anchors, and clear transient request/response bytes after completion. Debug bundles such as the Android handler-run captures are valuable for fixture development, but production apps can treat equivalent bundles as sensitive diagnostic artifacts because they may contain mdoc bytes, SMART JSON, HPKE inputs, SessionTranscript material, and clinical payloads.

### 15.3 EHR ingestion

EHR ingestion starts after protocol validation; the protocol does not make returned content clinically acceptable by itself. A practical receiver pipeline separates “received,” “opened,” “protocol-valid,” “trusted enough for review,” “matched to a chart,” “mapped to local data,” and “committed.” Between those states, returned Artifacts can be quarantined, displayed for staff reconciliation, or rejected without losing the audit trail needed to explain the decision.

Receivers can validate in this order:

1. retain the original SMART request and the validated SMART response;
2. confirm §6.6 request/response accounting, including `requestId`, `fulfills[]`, accepted `mediaType`, FHIR version constraints, and complete `requestStatus[]` coverage;
3. verify each SMART Health Card JWS according to SMART Health Cards and local trust policy;
4. validate raw `application/fhir+json` syntax, declared `fhirVersion`, resource or Bundle shape, profiles, references, and local profile conformance;
5. evaluate clinical-source provenance separately from mdoc issuer/device evidence, especially for unsigned raw FHIR JSON;
6. run patient matching, duplicate detection, sensitivity handling, staff review, and local write policy before EHR attachment or import.

Unsigned raw FHIR JSON remains patient-mediated unless a payload, extension profile, deployment profile, signature, provenance resource, source attestation, authenticated retrieval evidence, or local policy supplies separate clinical-source trust. That distinction is important for chart import: a valid mdoc presentation can prove presentation-container properties without proving that every raw FHIR resource is source-authenticated.

A useful quarantine model stores the minimum necessary protocol envelope, validation summary, Artifact ids, item statuses, provenance evidence, and staff disposition. It avoids routine retention of unresponsive Artifacts, duplicate data, full debug traces, request-opening keys, desktop private keys, Wallet secrets, or live Pointer URLs. Where legal, audit, or incident policy requires retention, receivers can label whether data is Holder-mediated, source-signed, staff-reviewed, imported, suppressed, or rejected.

Implementations can make partial and negative outcomes ordinary. `declined`, `partial`, `unavailable`, `unsupported`, and `error` can drive workflow prompts such as “ask staff for card,” “request manual medication review,” or “continue check-in without import.” They are not reliable evidence that the patient has or lacks any particular condition or document.

### 15.4 Kiosk transport-provider implementations

The kiosk transport provider is an untrusted relay for opaque encrypted request and submission state. Provider implementations can be databases, local-network queues, object stores, webhooks, polling endpoints, or InstantDB/Instant Storage-style adapters, but the provider boundary is easier to review when the API is limited to five capabilities: write encrypted request, read encrypted request, write encrypted submission, download submission ciphertext, and observe submission rows.

The active TypeScript adapter demonstrates that shape with `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows`. Request rows store a wrapper `requestId` and an `EncryptedKioskRequest`; submission rows store a wrapper `requestId`, submission id, storage path, storage file id, IV, and phone ephemeral public key. The ciphertext blob remains `application/octet-stream`. These names are implementation evidence, not a requirement to use InstantDB or the same schema.

Provider code can keep these invariants visible:

- the QR/Pointer URL is pointer-only, using `#r=<requestId>` for the active profile;
- the signed kiosk payload embeds the §5 SMART request directly as `smartRequest`;
- the request envelope encrypts the compact kiosk request JWS with the kiosk request encryption context;
- the phone re-enters a fresh phone-local §8 `org-iso-mdoc` flow after wrapper validation;
- the response-submission wrapper uses the separate kiosk response encryption context and does not reuse §8 HPKE keys, `SessionTranscript`, or `encryptionInfo`;
- the provider never needs plaintext SMART requests, SMART responses, raw FHIR, SMART Health Cards, Holder decisions, or private keys merely to route state.

Operational behavior matters as much as API shape. Deployments often add high-entropy wrapper ids, short lifetimes, row-shape checks, storage-path binding, blob-size limits, retry backoff, row immutability or first-accepted workflow state, duplicate suppression, anti-enumeration controls, rate limits, quotas, and cleanup of expired or orphaned rows and blobs. These controls are defense in depth; the Completion display still validates decrypted `SubmissionPlaintext.requestId`, `payload.kind`, the inner SMART response, §8 evidence or trusted validation state, and §7 trust interpretation before workflow use.

Logging and telemetry can be designed around redaction from the beginning. Useful metrics include aggregate counts, coarse error categories, payload sizes, latency bands, and provider availability. Routine logs can avoid full Pointer URLs, live wrapper ids, decrypted JWS payloads, SMART responses, raw FHIR, SHCs, private keys, provider credentials, full ciphertext blobs, and enumeration hints. Developer-only views can label demo keys and decrypted payloads as diagnostic material and keep them separate from production support bundles.

### 15.5 SDK packaging guidance

SDKs are easiest to adopt when their module boundaries mirror the protocol layers. A web or mobile SDK can expose:

- SMART request/response types and validators for §5 and §6;
- request/response cross-validation helpers that take both the original request and candidate response;
- direct `org-iso-mdoc` request construction, inspection, SessionTranscript, readerAuth, CBOR/COSE, and HPKE utilities;
- Wallet-side parsing and response packaging helpers;
- kiosk wrapper crypto and pointer utilities;
- transport-provider interfaces separate from any specific provider implementation;
- fixture and inspection tools for byte-level tests.

Keeping these packages separate prevents accidental semantic shortcuts. For example, a kiosk package can depend on SMART validators and mdoc helpers, but it does not define a second clinical request language. A provider package can route encrypted rows without importing FHIR parsers or clinical trust policy. A UI package can render localized request summaries without rewriting request ids, selector values, media types, or status codes.

Packaging can also make unsafe defaults harder to ship. Demo keys, self-signed reader certificates, browser-displayed private JWKs, debug panels, fixture private keys, and deterministic test vectors can live in demo or test packages rather than production runtime packages. Production-facing APIs can require callers to supply trust anchors, key stores, origin policy, readerAuth policy, FHIR/SHC validators, retention policy, and telemetry hooks explicitly.

Test harnesses are part of the SDK surface. Useful tests include request selector shape tests, additive `profiles[]`/`profilesFrom[]` matching cases, response cross-validation, Digital Credentials API request inspection, readerAuth with COSE header label 33 `x5chain`, §8 HPKE opening with empty AAD, kiosk request and response encryption with separated HKDF info strings, pointer-only URL parsing, provider duplicate/retry behavior, Android/Kotlin parsing fixtures, WASM matcher eligibility fixtures, and end-to-end byte ladders. T6.C is the natural place to decide whether refreshed Android captures are needed after examples and fixture expectations stabilize.

## Organizer notes

**Strengths**

- Keeps §15 informative and points implementers back to §§5-14 and Appendix A for conformance.
- Preserves current protocol decisions: direct SMART request embedding, additive selectors, direct `org-iso-mdoc`, pointer-only kiosk URLs, separated kiosk encryption contexts, optional per-DocRequest readerAuth, and raw-FHIR provenance separation.
- Captures practical web, Android/Kotlin, WASM matcher, InstantDB/provider, validation, logging, lifecycle, and SDK packaging lessons without making them new wire-format rules.

**Caveats**

- Some language intentionally describes production guidance more broadly than the current demo implements; the Verifier and kiosk UI text calls out that decrypt-and-display behavior is not full production completion validation by itself.
- The Android notes are based on current checked-in modules and fixtures, not a refreshed capture cycle.
- EHR ingestion remains deployment-specific because patient matching, quarantine, provenance policy, and import workflows are outside the core protocol.

**Open issues**

- Decide during T6.C whether fixture indexes mark existing Android captures as historical or request refreshed captures after §16 examples settle.
- Confirm whether final SDK packaging text names concrete package paths or remains language-neutral.
- Decide whether the final §15 includes a short implementation pipeline diagram or remains prose-only.

**Downstream dependencies**

- T6.B examples can reuse the validation and kiosk lifecycle ordering here.
- T6.C fixture alignment can turn the listed harness categories into index entries and coverage notes.
- T7 final editorial pass can verify that this section has no independent conformance language and that all cross-references match final numbering.
