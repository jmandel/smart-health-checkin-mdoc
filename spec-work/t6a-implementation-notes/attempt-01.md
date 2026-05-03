## 15. Implementation notes

This section is informative. It describes practical implementation patterns for the protocol defined in §§5-14 without adding conformance requirements. Where validation or wire behavior is mentioned, the source of truth remains the referenced normative section.

### 15.1 Verifier app

A verifier app is easiest to keep correct when it is structured as a pipeline with explicit state handoffs:

1. build and validate the transport-neutral SMART request under §5;
2. construct the direct `org-iso-mdoc` browser request under §8, including `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, the stable `smart_health_checkin_response` element, `DeviceRequest` version `"1.0"`, `encryptionInfo`, and optional per-`DocRequest.readerAuth`;
3. retain the exact `encryptionInfo` base64url string, origin, request object, recipient private key, and any reader-authentication state until completion or abandonment;
4. call the browser Digital Credentials API with `protocol: "org-iso-mdoc"`;
5. open the returned HPKE ciphertext with `info = SessionTranscript bytes` and empty AAD as defined in §8.6; and
6. complete §8.7/§8.8 mdoc checks and §6.6 SMART response cross-validation before workflow use.

Browser integrations often benefit from a small “verifier authority” seam. A browser-local authority can generate the §8 HPKE key pair, call `navigator.credentials.get()`, and open the response in page memory for demos. A server-owned or hardware-backed authority can use the same prepare/complete shape while keeping private key material outside long-lived browser state. In either case, app UI code can handle a prepared request handle and public debug artifacts rather than raw private keys.

Production verifier UX can distinguish several states that demos often collapse: preparing request bytes, awaiting the platform wallet picker, receiving a credential result, HPKE open failed, mdoc validation failed, SMART response invalid, response valid with declined or partial item outcomes, accepted for local workflow, and imported downstream. The current web demo is useful for inspection, but active code primarily opens, inspects, and validates the embedded SMART response against the original request; it is not a full production completion validator for every §8 issuer/MSO/device-trust and downstream-policy decision.

Verifier implementations can reduce operational risk by treating logs and debug panels as separate products. Public or support-safe artifacts can include request ids, high-level validation status, and redacted byte lengths. Private diagnostic bundles can be gated, time-limited, and clearly labeled when they include HPKE private JWKs, decrypted `DeviceResponse` bytes, SMART responses, raw FHIR, SMART Health Cards, reader certificates, or fixture keys. Routine telemetry can use aggregate counters and coarse failure categories rather than plaintext payloads, full pointer URLs, or stable per-Holder identifiers.

### 15.2 Wallet implementation guidance

Wallets can separate three responsibilities: platform request intake, Holder review, and response construction. On Android, Credential Manager supplies the calling app and origin context; the wallet can use the platform origin API or an approved origin-equivalent for §8 `SessionTranscript` construction, while avoiding request-body fields as origin substitutes. Development builds that reflect the current caller into an allowlist are helpful for end-to-end testing, but production wallets usually maintain a curated browser/package/signature allowlist and display absent or failed origin evidence clearly.

A lightweight matcher can stay deliberately coarse. The current WASM matcher approach looks for `org-iso-mdoc` and the `org.smarthealthit.checkin.1` docType quickly, then leaves full CBOR parsing, request validation, origin handling, `readerAuth` evaluation, and Holder review to Kotlin after the user selects the entry. This keeps the matcher fast and avoids depending on WASM features that may not be available in Credential Manager, such as randomness, I/O, logging, or default-hashed Rust collections. Rust matchers can prefer `BTreeMap`/`BTreeSet` and no entropy-on-init code; C matchers can use a tiny no-stdlib ABI surface.

Wallet-side parsing can preserve byte-exact inputs that later checks need: tag-24 `ItemsRequest` bytes, the exact `encryptionInfo` base64url string, `SessionTranscript` bytes, optional detached `readerAuth` bytes, and decoded SMART request JSON. Kotlin or other native parsers can map the SMART request into a UI model only after validating `type`, `version`, item ids, selector shape, `profilesFrom[]` array shape, accepted media types, and duplicate ids. When local categorization is heuristic, such as grouping US Core, CARIN coverage, IPS, or Questionnaire requests for display, the wallet can keep the original ids and selector values unchanged for response construction.

Holder review is both a usability and privacy control. Practical UI can show `purpose`, item `title`, `summary`, accepted media types, broad or no-selector requests, `required` as advisory workflow context, and whether `intentToRetain` is set by the mdoc request. It can also distinguish authenticated origin, trusted reader authentication, kiosk creator trust, self-attested/demo issuer evidence, and unauthenticated display text. For BIDI and internationalized text, render untrusted display strings with isolation, keep machine identifiers in code-style or bounded fields, and avoid normalization, case folding, or translation when comparing protocol ids, canonicals, media types, status codes, request ids, or wrapper ids.

Response builders can construct the smallest responsive artifact set that fits Holder choices, available data, Wallet policy, and `accept[]`. A practical implementation can return `declined`, `partial`, `unavailable`, `unsupported`, or `error` at item level instead of fabricating content. For raw FHIR JSON, include a single FHIR release per artifact and preserve `meta.profile` where known. For Questionnaire responses, keep the requested canonical and version when known, and avoid silently merging conflicting canonical and inline forms.

Local key lifecycle is short in most wallet flows: parse the request, classify trust evidence, collect Holder choices, build the SMART response, construct the mdoc `DeviceResponse`, HPKE-encrypt with the verifier recipient key and §8 transcript, return through the platform, then release transient request bytes, secrets, and decrypted payloads unless a controlled debug capture is enabled.

### 15.3 EHR ingestion

EHR ingestion is downstream of protocol acceptance. A practical receiver can keep distinct queues or flags for: transport opened, §8 mdoc validation status, optional reader-authentication status, SMART response shape validation, §6.6 request/response cross-validation, SMART Health Card signature/trust validation, raw FHIR validation, patient matching, clinical review, and import result.

A safe default is to quarantine before import. Quarantine can retain the original SMART request, validation report, extracted artifacts, item statuses, source-trust assessment, and operator-facing summary without immediately writing returned resources into the longitudinal chart. Staff or automated policy can then decide whether to attach as patient-mediated documents, reconcile into discrete data, reject, or request additional evidence.

Raw `application/fhir+json` artifacts are useful but patient-mediated unless separate provenance, signature, authenticated retrieval evidence, or deployment policy establishes more. Ingestion code can therefore avoid treating mdoc issuer/device proof, kiosk wrapper verification, exact `requestId` matching, or Holder approval as clinical-source provenance for raw FHIR. SMART Health Card artifacts have a different path: verify each JWS, evaluate issuer trust and payload content, then map signed resources to the local workflow.

FHIR-aware validation can run after generic §6.6 checks. It can verify declared `fhirVersion`, parse Resources or Bundles, reject mixed FHIR releases inside one raw-FHIR artifact, inspect `resourceType`, `meta.profile`, Bundle entries, `QuestionnaireResponse.questionnaire`, and selector responsiveness, then apply local IG validators or terminology services as needed. Failures can produce quarantine or item-level workflow messages rather than altering protocol semantics.

Ingestion implementations can minimize linkage and leakage by generating local import ids rather than reusing request ids, artifact ids, wrapper ids, provider row ids, or storage paths as patient identifiers. Operator screens can show per-item outcome codes and concise validation states while hiding sensitive clinical details on public kiosk screens. Audit logs can record decision provenance, trust-layer outcomes, and import disposition without storing private keys, live pointer URLs, full ciphertext blobs, or unredacted PHI in routine telemetry.

### 15.4 Kiosk transport-provider implementations

A kiosk provider can be implemented as an untrusted mailbox. The active InstantDB-backed prototype demonstrates the needed shape: write an `EncryptedKioskRequest` row keyed by wrapper `requestId`, let the phone read that opaque request state, accept an opaque encrypted submission blob plus routing metadata, and let the desktop observe candidate rows for the active wrapper id. Equivalent providers can use databases, object storage, queues, serverless functions, WebSocket notifications, or polling as long as plaintext clinical content and private keys remain outside the relay.

Provider APIs are cleaner when they use role-specific methods: write encrypted request, read encrypted request, write encrypted submission, download submission blob, and observe submission rows. Request rows can contain only `requestId` and `encryptedRequest`. Submission rows can contain `submissionId`, wrapper `requestId`, bounded storage path, storage file id, IV, and phone ephemeral public JWK, with ciphertext stored as `application/octet-stream`. Provider metadata is routing and decryption metadata, not Holder consent, patient identity, requester identity, clinical-source provenance, or completion evidence.

Implementations can keep the three cryptographic contexts visually and structurally separate in code:

- §8 HPKE response encryption: `info = SessionTranscript`, empty AAD, `DeviceResponse` plaintext;
- §9 request-envelope encryption: info `smart-health-checkin-kiosk-request-v1`, AAD `requestId`, compact kiosk request JWS plaintext; and
- §9 response-submission encryption: info `smart-health-checkin-kiosk-response-v1`, AAD `requestId`, `SubmissionPlaintext` JSON plaintext.

The active pointer profile uses only `#r=<requestId>`. Avoid adding SMART requests, compact JWSs, encrypted envelopes, §8 `deviceRequest`/`encryptionInfo`, response ciphertexts, keys, clinical data, or trust assertions to QR codes or pointer URLs. Older helper code or archived descriptors that inline §8 fragments are useful historical context but not the active kiosk pointer model.

Provider hardening is mostly operational: high-entropy request ids, short lifetimes, row-shape checks, storage-path binding, blob-size ceilings, read/write quotas, rate limits, anti-enumeration behavior, immutable rows or duplicate-suppression hints, bounded polling and retry backoff, cleanup for expired or abandoned sessions, and dashboards that do not expose live pointer values or plaintext payloads. Because the relay can replay, reorder, delay, or duplicate rows, the trusted Completion display can still apply local single-use state, expiration policy, decryption, `SubmissionPlaintext.requestId` binding, §6/§6.6 validation, §8 validation accounting, and §7 trust interpretation before workflow acceptance.

Demo completion screens often show provider rows, private JWKs, decrypted submissions, and full debug JSON for development. Production completion displays can instead show coarse states, stop or refresh stale QR codes, release desktop private keys after completion/abandonment, and move invalid or duplicate submissions to ignored/quarantine/staff-review states without merging multiple submissions into one check-in result.

### 15.5 SDK packaging guidance

A useful SDK boundary mirrors the protocol layers:

- **core**: TypeScript/Kotlin models, request/response constructors, parsers, duplicate-id checks, selector shape checks, media-type checks, and `validateResponseAgainstRequest`-style §6.6 cross-validation;
- **dcapi-verifier**: browser Digital Credentials API request construction, `org-iso-mdoc` constants, CBOR/tag-24 helpers, `encryptionInfo`, `SessionTranscript`, optional `readerAuth`, HPKE open, and inspection helpers;
- **wallet-mdoc**: platform request parsing, `readerAuth` classification, mdoc response construction, HPKE seal, and fixture-friendly byte outputs;
- **kiosk-session/provider**: request JWS creation, encrypted request envelope, pointer creation/parsing, provider abstraction, submission encryption/decryption, and replay/cleanup hooks;
- **react or UI adapters**: optional hooks, buttons, review components, and demo pages; and
- **test/fixtures**: deterministic vectors, byte ladders, historical capture readers, negative cases, and conformance-checklist mapping.

Keep UI frameworks optional. The current `rp-web/src/sdk` shape intentionally avoids exporting React from the non-React barrel so Vue, Svelte, server code, mobile bridges, and tests can use the core and verifier modules without pulling in React. A future package split can preserve that boundary, with browser-only modules separated from portable JSON validation and native-wallet modules.

SDK validation APIs can return structured results rather than only throwing strings. Useful fields include layer, section reference, target role, severity, machine code, human-safe message, redacted context, and whether the result blocks protocol validity, workflow import, or only production trust. This makes it easier for apps to implement quarantine, support-safe telemetry, and conformance evidence without copying protocol logic into UI code.

Test harnesses can cover both semantic and byte-exact behavior. Core tests can mutate request/response shape, `profilesFrom[]`, additive selector handling, media-type mismatches, status coverage, FHIR version rules, and raw-FHIR/SHC artifact differences. Byte-level tests can preserve tag-24 boundaries, `SessionTranscript` construction, readerAuth detached payloads with x5chain label 33, HPKE empty AAD, kiosk deterministic JSON signing input, AES-GCM AAD, pointer-only URLs, provider rows, duplicate/replay handling, and Android/Kotlin parity. Fixture labels can distinguish conformance candidates, historical captures, diagnostics, demo-only keys, and illustrative examples.

Package documentation can be explicit about demo defaults: checked-in keys, self-signed reader certificates, reflective Android origin allowlists, browser-local verifier private keys, InstantDB app ids, debug bundles, and decrypted developer panels are development aids. Production deployments can replace those seams with managed key custody, trusted browser policy, deployment-specific trust anchors, retention controls, and monitored provider operations without changing the core SMART request and response model.

## Organizer notes

**Strengths:** This attempt keeps §15 informative, preserves the direct SMART request model and active `org-iso-mdoc`/kiosk decisions, and calls out implementation gaps without weakening normative validation. It covers browser/DC API, Android/Kotlin/WASM, EHR quarantine, InstantDB-style providers, logging, local key lifecycle, i18n/BIDI, SDK boundaries, and fixtures.

**Caveats:** Some implementation details are based on current demo code and should remain examples, not conformance text. The organizer may want to trim package names or code-specific references if the final spec should be less repository-aware.

**Open issues:** Final wording may need alignment with T6.B/T6.C examples and fixture index labels. Production trust-anchor, EHR import policy, and browser allowlist choices remain deployment-profile topics rather than §15 decisions.

**Downstream dependencies:** T6.B can reuse these notes for worked example validation narratives. T6.C can turn the testing guidance into fixture-index categories and decide whether new Android captures are needed there, not in this cutpoint.
