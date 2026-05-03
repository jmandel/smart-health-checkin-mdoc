## 15. Implementation notes

This section is informative. It describes practical implementation patterns observed in the prototype and likely deployment profiles. Interoperability requirements remain in §§4-14 and Appendix A; the notes below intentionally avoid creating additional conformance obligations.

### 15.1 Verifier app

A practical Verifier architecture separates five concerns: request authoring, presentation-session cryptography, browser invocation, response opening, and downstream workflow use. The current TypeScript layout illustrates this split: `core.ts` owns the transport-neutral request/response types and shape/cross-validation helpers; `dcapi-verifier.ts` owns the Digital Credentials API verifier authority seam; `protocol/index.ts` owns direct `org-iso-mdoc` byte construction and response inspection; React components are optional wrappers.

Request builders can start from workflow-specific UI choices, but they should emit the direct §5 SMART request model: `type`, `version`, `id`, `purpose`, optional `fhirVersions`, and `items[]`. Broad clinical choices are best expressed with `profilesFrom[]` arrays, exact StructureDefinitions with `profiles[]`, and official FHIR `resourceTypes[]`; when `profiles[]` and `profilesFrom[]` are both present, implementers should remember that §5 treats them as additive. Avoid old demo wrappers such as `requestProfile`, `preset`, IPS shortcuts, or “all of the above” objects in active kiosk or same-device payloads.

For same-device presentations, browser-facing code can treat `navigator.credentials.get` as a short-lived session. The Verifier creates a fresh SMART request serialization, `DeviceRequest`, `encryptionInfo`, HPKE recipient key material, and expected `SessionTranscript`, then retains the private opening material only until completion, abandonment, timeout, or controlled debug export. Browser-local storage works well for static demos; production deployments often move the verifier authority to a server or session service so the browser receives only public request material plus an opaque handle.

A robust response pipeline is easier to reason about when it is ordered as follows:

1. parse the browser credential wrapper and require direct `org-iso-mdoc`;
2. HPKE-open with §8 parameters, including `info = SessionTranscript` and empty AAD;
3. parse `DeviceResponse` and inspect the expected document, namespace, and stable `smart_health_checkin_response` element;
4. validate mdoc issuer/MSO, digest, device-signature, and trust evidence under §7/§8;
5. parse the SMART response JSON and apply §6 shape checks;
6. apply §6.6 cross-validation against the original SMART request;
7. evaluate Artifact-specific provenance, including SMART Health Card signatures and local policy for unsigned raw FHIR JSON;
8. only then render, ingest, route, or persist clinical workflow content.

Current demo utilities are helpful for byte inspection and cross-validation, but production completion code should not assume that decrypt-and-display equals full §8/§7/§6.6 validation. In particular, diagnostic panels that show decrypted payloads, private JWKs, `DeviceResponse` internals, or debug bundles are development aids. Production views can instead show state transitions such as prepared, wallet invoked, response opened, validation failed, item-level partial/declined, accepted for workflow, and imported.

Verifier logs and support artifacts need careful redaction. It is useful to keep public request artifacts, fixture ids, validation step names, and coarse failure categories. Avoid routine logging of plaintext SMART requests/responses, raw FHIR, SMART Health Cards, Questionnaire answers, HPKE private keys, live Pointer URLs, request-opening material, or unredacted stack traces. When byte fixtures are intentionally retained, label them as fixtures or diagnostics and keep them outside production telemetry.

### 15.2 Wallet implementation guidance

Wallets can implement the protocol as a pipeline from platform request discovery to Holder-controlled response construction. On Android, the prototype uses a narrow Credential Manager registration module, a small WASM matcher, an mdoc parsing/crypto module, a core SMART model module, a Compose UI module, and an app-provided holder data store. That organization keeps platform registration, transport parsing, clinical matching, consent UI, and data-source policy independently testable.

The Android matcher intentionally remains coarse. It looks for an `org-iso-mdoc` request and the SMART Check-in docType in decoded request bytes, then lets the handler perform full CBOR, requestInfo, encryptionInfo, readerAuth, and SMART request validation. This keeps the WASM sandbox small: no clock, entropy, filesystem, FHIR matching, or heap-heavy CBOR traversal. Other platforms can follow the same matcher/handler split when a platform picker needs a fast eligibility decision before launching the full wallet.

The handler side benefits from preserving exact bytes. Useful retained values include the unpadded `encryptionInfo` string, tag-24 `ItemsRequest` bytes, computed `SessionTranscript`, optional per-DocRequest `readerAuth`, and the extracted SMART request JSON. When `readerAuth` is present, the active §8 path uses detached COSE_Sign1 with protected algorithm `-7`, payload `null`, empty external AAD, and certificate evidence in COSE label 33 (`x5chain`). Wallet UI can display reader authentication as absent, failed, valid-but-untrusted, or trusted according to deployment policy rather than collapsing these states.

Wallet consent screens work best when they present authenticated trust signals separately from unauthenticated request text. The SMART request `purpose`, item `title`, item `summary`, profile URLs, Questionnaire text, and `required` flag are useful Holder-facing context, not proof of requester identity. UI can group, summarize, translate, or reorder items for usability, accessibility, safety, and localization, while preserving item ids for `fulfills[]` and `requestStatus[]` accounting.

FHIR matching is wallet- and data-source-specific. Implementations can map exact `profiles[]` values to resources with matching `meta.profile`, map `profilesFrom[]` profile-family canonicals such as US Core or IPS to locally known profile sets, and use `resourceTypes[]` as official FHIR resource-type filters. For `questionnaire`, the wallet can hydrate or render inline Questionnaire resources, construct `QuestionnaireResponse`, and preserve known canonical/version identity. If the wallet cannot confidently satisfy a selector or media type, §6 status outcomes such as `unsupported`, `unavailable`, `partial`, or `declined` are often better than over-disclosing.

Mobile UI needs internationalization and BIDI hygiene because request text, Questionnaire labels, FHIR displays, and status messages are externally supplied. Platform text widgets should isolate untrusted display text from origins, trust badges, profile URLs, media types, and action buttons. Machine identifiers such as item ids, Artifact ids, media types, canonicals, docTypes, namespace names, and kiosk ids should be compared exactly, not after localization, case folding, or Unicode normalization.

Local key lifecycle is a policy boundary. Demo wallets can self-sign issuer evidence and write debug bundles for fixture generation. Production wallets can keep issuer/device keys, reader-auth trust anchors, Holder data credentials, and debug exports under the platform key store and app privacy policy. Debug bundles like the Android handler-run directories are valuable for T6.C fixture work, but they should be disabled, gated, or scrubbed in production builds.

### 15.3 EHR ingestion

EHR ingestion is downstream of protocol validation. A receiving system can treat the SMART response as a candidate package that first passes §6/§6.6 response checks, then trust-layer checks from §7/§8/§9, and finally local clinical policy. A useful ingestion record separates: transport validation result, mdoc issuer/device evidence, reader or creator evidence, Artifact media type, clinical-source provenance, patient matching, selector responsiveness, and final workflow disposition.

Raw `application/fhir+json` Artifacts deserve an explicit quarantine path. Unless separate provenance, signature, source attestation, authenticated retrieval evidence, or a deployment profile says otherwise, raw FHIR remains patient-mediated even when it arrived through a valid mdoc or kiosk transport. A practical receiver can store such content in a staging area, run FHIR parsing and profile checks, associate it with the check-in encounter, flag provenance as patient-mediated, and require staff or automated policy review before chart import.

SMART Health Card Artifacts follow a different path: the receiver verifies each JWS in `value.verifiableCredential[]`, evaluates issuer and payload trust under SMART Health Cards policy, then maps the contained FHIR to local ingestion workflows. Even there, a valid JWS does not automatically solve patient matching, recency, clinical appropriateness, duplicate detection, or write-back authorization.

FHIR-aware ingestion often benefits from layered validation:

- JSON and media-type shape checks from §6;
- request/response checks for `requestId`, `fulfills[]`, accepted `mediaType`, status coverage, and FHIR version compatibility;
- FHIR parser validation for declared `fhirVersion`;
- Bundle traversal and resource-level checks for `resourceType`, `id`, `meta.profile`, references, and QuestionnaireResponse linkage;
- local mapping to patient, coverage, documents, observations, forms, or tasks;
- deduplication against existing chart content;
- provenance labeling and audit logging;
- quarantine or rejection for overbroad, nonresponsive, unsupported, malformed, or untrusted content.

Receivers should avoid using Artifact ids or request item ids as patient ids, document ids, source-system ids, or provenance ids unless independent payload evidence gives them that meaning. Status messages are suitable for human diagnostics but not for clinical decision logic, especially when localized.

### 15.4 Kiosk transport-provider implementations

The kiosk provider is an untrusted relay for opaque encrypted request and submission state. An implementation can expose capabilities similar to `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `observe submission rows for requestId`. The active InstantDB provider stores an encrypted request row by wrapper `requestId`, stores response ciphertext as an `application/octet-stream` blob under a request-scoped storage path, records row metadata such as IV and phone ephemeral public JWK, and uses local-first acceptance states such as “synced” or “enqueued” as delivery signals.

The QR/Pointer URL remains small and pointer-only: `#r=<requestId>`. The signed kiosk payload embeds the conforming §5 SMART request directly as `smartRequest`; the provider row and QR do not contain the SMART request, compact JWS, `EncryptedKioskRequest` object, §8 `DeviceRequest`, `encryptionInfo`, Wallet response, SMART response, clinical payloads, private keys, or trust assertions. Phone code resolves the pointer, opens and verifies the kiosk wrapper, validates `smartRequest`, and then constructs a fresh phone-local §8 flow.

Provider implementations can improve reliability without seeing plaintext. Common controls include authenticated writes, row-shape validation, storage path conventions, blob-size ceilings, immutable or first-writer-wins rows, observation streams, bounded polling, retry backoff, rate limits, anti-enumeration rules, quotas, expiration indexes, and cleanup of orphaned rows/blobs. These controls are defense in depth; clinical acceptance still happens at the Phone presenter, Completion display, Verifier, and downstream receiver.

Kiosk crypto contexts should remain visibly separate in code and telemetry. The request envelope encrypts the compact request JWS with info `smart-health-checkin-kiosk-request-v1` and AAD derived from the wrapper `requestId`. The response submission encrypts `SubmissionPlaintext` with info `smart-health-checkin-kiosk-response-v1` and the same wrapper-id AAD concept. The phone-local §8 Wallet response uses HPKE with `info = SessionTranscript` and empty AAD. Sharing helpers is fine; sharing keys, labels, ciphertext fields, or validation outcomes across these contexts is a common implementation bug.

Completion displays can treat provider notifications as hints, not completion. A practical UI downloads bounded blobs, decrypts locally with the retained desktop private key, binds decrypted `SubmissionPlaintext.requestId` to the active wrapper id, requires the active `payload.kind`, validates the nested SMART response against the original embedded `smartRequest`, and records how §8/§7 validation was obtained. The current demo opens and displays submissions for development; production completion should also track validation evidence, duplicate/replay policy, expiration policy, and quarantine paths before workflow use.

### 15.5 SDK packaging guidance

A clean SDK boundary mirrors the protocol layering:

- **Core model package**: TypeScript/Kotlin data models, parsers, shape validation, response cross-validation, media-type/status constants, and selector helpers. No browser, React, Credential Manager, InstantDB, or EHR dependencies.
- **Direct mdoc/DC API verifier package**: `org-iso-mdoc` request construction, `SessionTranscript`, optional readerAuth construction, HPKE opening, `DeviceResponse` inspection/validation hooks, and verifier authority abstractions for browser-local or server-owned key custody.
- **Wallet mdoc package**: platform request parsing, tag-24 and CBOR helpers, readerAuth verification, MSO/device-auth construction, HPKE sealing, and fixture hooks.
- **Kiosk session package**: signed/encrypted kiosk request payloads, pointer parsing, request/response encryption, submission plaintext handling, and provider interfaces independent of a concrete backend.
- **Provider adapters**: InstantDB, WebSocket, hosted relay, local development, or other transports that route only encrypted state and operational metadata.
- **UI bindings**: React hooks/components, Android Compose screens, native bridges, or server-rendered pages that depend on the lower layers but are not imported by framework-neutral code.
- **Test/fixture utilities**: deterministic key material, byte-ladder builders, negative corpus generators, debug inspectors, and conformance-manifest helpers separated from production packages.

Packaging should make unsafe imports difficult. For example, a core package should not import React; a provider adapter should not import FHIR parsing or private key stores; a matcher should not import clinical matching; and a production UI should not automatically include fixture private keys or debug exporters. Public artifacts helpers can redact private verifier key material by default, while internal test helpers can opt into exact bytes for reproducibility.

Cross-language SDKs can share golden JSON and CBOR fixtures rather than sharing implementation code. The Android/Kotlin parser and TypeScript verifier already demonstrate useful comparison points: exact `requestInfo` extraction, `profilesFrom[]` parsing, tag-24 byte preservation, `SessionTranscript` construction, HPKE contexts, and kiosk wrapper encryption. T6.C is the natural checkpoint for deciding whether new Android captures are needed to replace or supplement historical fixture material.

## Organizer notes

**Strengths:** This draft keeps §15 informative, preserves the active direct SMART request and pointer-only kiosk decisions, and highlights implementation gaps without weakening the normative model. It gives concrete guidance for verifier, wallet, EHR, kiosk-provider, and SDK packaging audiences.

**Caveats:** Some suggested production patterns, especially EHR quarantine, server-owned verifier authority, and completion-display validation evidence, are deployment guidance rather than implemented product behavior. The active demo exposes debug material and does not represent production logging or key custody.

**Open issues:** Final text should align terms with the final §7-§9 validation vocabulary and with the fixture taxonomy from T6.C. If future kiosk vectors add validation-evidence payloads, §15.4 may need a short update.

**Downstream dependencies:** T6.B examples can reuse this validation pipeline language. T6.C fixture indexing should decide which Android handler bundles and kiosk tests are conformance candidates, diagnostics, historical captures, or illustrative material.
