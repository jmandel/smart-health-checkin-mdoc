## 11. Security considerations

This section summarizes security properties and residual risks for SMART Health Check-in 1.0. It does not introduce a new presentation protocol or replace the normative processing rules in §§5-9. Implementers should read each subsection as a threat check over the actual flows: the same-device direct `org-iso-mdoc` flow in §8, and the kiosk wrapper that resolves a pointer, validates a signed and encrypted kiosk request, re-enters §8 on the phone, and submits an encrypted result under §9.

### 11.1 End-to-end encryption requirements

The core same-device presentation flow protects the Wallet-to-Verifier response with HPKE over the CBOR `DeviceResponse`. The Wallet/Responder encrypts the §8 `DeviceResponse` using DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. The `SessionTranscript` includes the exact `encryptionInfo` base64url string and the authenticated origin or deployment-approved origin-equivalent. A Verifier must not accept plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a substituted HPKE suite, or a response whose HPKE context is not bound to the expected transcript.

The kiosk flow has two additional encryption contexts, both distinct from §8 HPKE:

1. the request envelope encrypts the compact kiosk request JWS to the request-opening P-256 key with HKDF info `smart-health-checkin-kiosk-request-v1`, AES-256-GCM, and wrapper `requestId` as salt and AAD; and
2. the response submission encrypts `SubmissionPlaintext` to the signed desktop P-256 public JWK with HKDF info `smart-health-checkin-kiosk-response-v1`, AES-256-GCM, and the same wrapper `requestId` as salt and AAD.

Implementations SHALL NOT substitute keys, recipients, info strings, transcripts, AAD values, ciphertext fields, or validation results between these three contexts. In particular, `encryptResponseTo` is not §8 `encryptionInfo`; the kiosk request-opening key is not the desktop response-submission key; and the §8 phone-local HPKE recipient key is not a kiosk relay key.

Production deployments should keep private keys out of untrusted relays and public client code unless the deployment has an explicit key-custody design that preserves the intended trust boundary. Checked-in demo keys, browser-displayed private JWKs, and fixture private keys are test material only and do not establish a production key-management policy.

### 11.2 Replay and freshness

The same-device flow obtains freshness primarily from a fresh `encryptionInfo` nonce, a Verifier HPKE recipient key selected for the presentation session, and the `SessionTranscript` used by reader authentication, device authentication, and HPKE. `SmartHealthCheckinResponse.requestId` binds the clinical response to the SMART request `id`, but it is not a freshness proof. A Verifier must retain the original SMART request, the exact `encryptionInfo` spelling, expected origin, and HPKE private key for the active session, and must reject responses that fail HPKE opening, mdoc validation, device authentication, or §6.6 cross-validation.

The kiosk wrapper adds signed `createdAt` and `expiresAt`, a high-entropy wrapper `requestId`, pointer/envelope/payload/request-row equality checks, AES-GCM AAD over the wrapper id, and Completion display validation of decrypted `SubmissionPlaintext.requestId`. These controls prevent many cross-session swaps but do not by themselves make a kiosk session single-use. A production kiosk deployment SHOULD mark a wrapper `requestId` complete after the first valid accepted submission, stop displaying the QR, and reject, quarantine, or staff-review later submissions for the same wrapper id. The untrusted provider may enforce duplicate suppression or cleanup as defense in depth, but clinical acceptance cannot depend solely on provider ordering or row state.

Freshness policy needs deployment parameters: clock-skew tolerance, maximum kiosk lifetime, grace period for a phone interaction that began before expiration, cleanup timing, and handling for abandoned or superseded sessions. Stale QR codes and captured Pointer URLs remain bearer locators until expiration, provider cleanup, and local workflow state make them unusable.

### 11.3 Origin spoofing and UI redress

Origin evidence comes from the Browser / User Agent, Credential Manager, platform, or deployment-approved privileged-caller mechanism. It does not come from the SMART request body, `purpose`, item display text, selector URLs, callback-looking strings, kiosk pointer URLs, provider app ids, logos, or unknown extension members. Wallets that display request context should visually distinguish authenticated origin or reader information from unauthenticated Holder-facing request text.

A malicious Requester can choose misleading `purpose`, `title`, `summary`, profile URLs, or questionnaire text. A Wallet/Responder SHALL NOT present those fields as verified organization identity. It may display them as requested workflow context, apply local risk warnings, require additional confirmation, or reject the request if origin, reader, or deployment policy is inadequate.

Kiosk displays create additional UI-redress risk because the Holder sees a public QR and then a phone page. The QR is only a pointer; scanning it is not consent. The phone-side page must complete wrapper validation and then invoke the Wallet for Holder review. Desktop demos may show developer panels, decrypted details, private JWKs, provider rows, or open responses; those displays are validation aids, not production UX. Production Completion displays should avoid exposing clinical content or secrets on public kiosk screens and should clearly distinguish “row observed”, “decrypted”, “validated”, and “accepted for workflow”.

### 11.4 Reader impersonation

`readerAuth` is optional in the core 1.0 flow unless a deployment profile requires it. When present, it is a per-`DocRequest` detached `COSE_Sign1` using ES256 over `ReaderAuthentication`, bound to the exact `SessionTranscript` and tag-24 `ItemsRequest` bytes, and carries reader certificate evidence in COSE header label `33` (`x5chain`). A Wallet/Responder that relies on reader authentication must verify the signature, detached-payload binding, algorithm, request bytes, certificate/key evidence, and deployment trust policy.

The absence of `readerAuth` and failed `readerAuth` are different security states. A Wallet may process an unsigned request only under explicit local or deployment policy and must not label it reader-authenticated. A syntactically valid `x5chain`, common name, logo, or demo certificate is not production reader trust unless the deployment trust policy accepts the chain or key for the relevant use.

Reader authentication does not prove patient identity, clinical-source provenance, EHR write-back authorization, or downstream acceptance. It authenticates the presentation requester at the reader layer only.

### 11.5 Issuer trust pivots

The mdoc layer can show that the SMART response element was carried in an mdoc `DeviceResponse`, that the disclosed issuer-signed item hashes to the MSO digest, that `issuerAuth` verifies under accepted issuer evidence, and that device authentication is bound to the expected `SessionTranscript`. Those are transport-container and device-proof properties. They are not automatically clinical-source provenance for every Artifact.

A Verifier or receiver SHALL treat raw `application/fhir+json` Artifacts as patient-mediated unless the payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, authenticated retrieval evidence, or source attestation. SMART Health Card Artifacts carry their own signed credential payloads and must be verified under SMART Health Card and local trust policy.

Deployments may support self-attested wallet or test issuer models, but they must not relabel those presentations as production issuer-trusted. Demo issuer keys, demo reader certificates, checked-in fixture keys, and kiosk demo creator keys are intentionally non-production evidence unless a controlled test deployment explicitly says otherwise.

### 11.6 Cryptographic agility

Version 1.0 fixes algorithm choices inside named profile rules instead of negotiating arbitrary algorithms in band. Same-device §8 uses direct `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, ES256/COSE alg `-7`, and HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM. The kiosk wrapper uses ES256 compact JWS for the signed request and the labeled P-256 ECDH/HKDF-SHA-256/AES-256-GCM constructions for request-envelope and response-submission encryption.

Implementations should fail closed on unknown versions, unsupported algorithms, wrong JWS `typ`, wrong content type, unacceptable JWKs, malformed base64url, invalid IV lengths, and unexpected wrapper shapes. Future agility should be expressed by a new profile, version, registry entry, or deployment profile that defines exact processing and downgrade behavior; it should not be implemented by silently accepting weaker in-band algorithm labels.

Deprecation policy is a deployment and registry concern. A deployment profile that adds or removes algorithms should define transition periods, fixture coverage, downgrade resistance, key-use separation, and how Wallets and Verifiers report unsupported profiles.

### 11.7 Plaintext leakage

Clinical content and secrets can leak outside cryptography through logs, developer panels, crash reports, browser storage, analytics, screenshots, QR images, provider dashboards, debug bundles, fixture captures, and clipboard or share flows. Implementations SHOULD avoid logging or displaying plaintext SMART requests, SMART responses, raw FHIR resources, SMART Health Cards, decrypted kiosk JWS payloads, §8 `DeviceResponse` plaintext, `dcapiResponse` internals, private keys, shared secrets, provider credentials, access tokens, full ciphertext blobs, or valid-id enumeration clues except under controlled diagnostic or fixture procedures.

The current demo intentionally exposes technical details, demo-only private keys, and provider rows for inspection. That is useful to validate boundaries but is not a production UI or logging pattern. Fixture material that contains private test keys should mark them intentionally public test material, declare non-PHI status, and avoid accidental reuse.

Plaintext leakage controls should apply before and after cryptographic validation. Failed decryptions, malformed requests, invalid JWS payloads, and unsupported Wallet responses can still contain attacker-controlled or sensitive-looking text and should be handled with bounded parsing and sanitized diagnostics.

### 11.8 Kiosk relay treated as honest-but-curious or untrusted relay

The kiosk Submission service/provider is a relay for opaque encrypted request and submission state. It is not a clinical Requester, Verifier, Wallet, issuer, trust anchor, source-provenance service, or completion authority. It may store request rows, encrypted envelopes, submission rows, ciphertext blobs, public ephemeral keys, IVs, storage paths, timestamps, and operational metadata; it should not need plaintext SMART requests, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder decisions, §8 plaintext, private keys, or shared secrets.

Phone presenters and Completion displays must perform their own cryptographic and semantic validation even when the provider enforces access control, row-shape checks, expiration, rate limits, storage-path conventions, or duplicate suppression. Provider controls are defense in depth, not substitutes for JWS verification, request-id binding, AES-GCM authentication, §8 validation, §6.6 validation, §7 trust interpretation, and workflow authorization.

The active implementation is stricter for some fields than others: it binds the key request ids and validates algorithm/content-type/expiration, while some mirrored envelope metadata, JWK details, and schema constraints are not yet covered by a deterministic kiosk fixture suite. Security text should acknowledge this as an implementation/conformance gap rather than weakening the target model.

### 11.9 Side-channel and metadata leakage on QR

The pointer-only QR design intentionally keeps clinical content, request JWS, encrypted envelopes, same-device §8 artifacts, response ciphertexts, and keys out of the QR. The active pointer format carries the wrapper `requestId` in fragment parameter `r`, with ordinary URL routing metadata in the scheme, host, port, and path. URL fragments reduce routine server-log exposure, but the full QR remains visible to cameras, bystanders, browser history, screenshots, local scripts, analytics on the phone page, and shoulder-surfing.

Even without clinical plaintext, metadata can reveal check-in activity. Wrapper request ids, provider app ids, key ids, storage paths, submission ids, timestamps, IP addresses, user agents, QR refresh timing, row counts, failed lookups, and retry patterns can support correlation or enumeration. Kiosk creators and providers SHOULD use high-entropy wrapper ids, short lifetimes, rate limits, anti-enumeration controls, metadata minimization, bounded logs, and timely cleanup.

QR codes should be displayed only for the active session and removed or refreshed after expiration, abandonment, cancellation, or successful completion. A QR displayed on a shared screen should not include staff-only diagnostics or patient-specific clinical details.

### 11.10 Wallet UX guarantees

Wallet security depends on Holder control. A Wallet/Responder must give the Holder a meaningful opportunity, according to Wallet policy and accessibility requirements, to review the request and decide what to share at request-item granularity. `required: true` is advisory workflow metadata; it is not consent and must not force disclosure. The Wallet may support decline, partial fulfillment, unavailable, unsupported, and error outcomes through the §6 status model.

The Wallet should preserve item ids for response accounting, but it may group, summarize, reorder, or suppress display details for safety, localization, accessibility, or local policy. If it displays origin, reader, or trust information, it should distinguish authenticated evidence from unauthenticated SMART request text. If trust evidence is absent, failed, untrusted, or reduced-assurance, the Wallet should not overstate the Requester identity or assurance level.

Opening a Pointer URL, scanning a QR, resolving a kiosk request, or seeing a provider row is not Holder consent. Consent or refusal occurs in the Wallet/Responder or equivalent Holder-control surface after valid request extraction and trust processing. If the same-device invocation fails or the Holder cancels before a valid Wallet response is produced, the Phone presenter should fail safely and must not synthesize clinical content or claim successful kiosk completion.

## Organizer notes

### Strengths

- Restates the three separate encryption contexts and their exact recipients, labels, and binding inputs without inventing a fourth protocol.
- Preserves the T3/T4 trust-layer separation: origin, optional `readerAuth`, mdoc issuer/device proof, kiosk creator signature, and clinical-source provenance are not interchangeable.
- Calls out kiosk-specific threats: pointer-only QR metadata, untrusted relay behavior, duplicate submissions, stale pointers, and desktop completion validation.

### Caveats

- Some active code is a prototype and is intentionally looser than final conformance language in selected areas, including detailed schema/JWK validation and mirrored kiosk envelope metadata checks.
- Desktop demo screens expose debug details and demo key material; the draft treats this as a validation gap/demo behavior, not a production requirement.
- The text intentionally avoids platform-specific Android/iOS implementation advice; that material belongs in §15.

### Open issues

- No deterministic `fixtures/kiosk/` suite currently proves the kiosk JWS, request envelope, pointer, submission encryption, replay, and negative-validation matrix end to end.
- Production key custody, trust-anchor onboarding, revocation/status checks, and demo-vs-production separation need deployment-profile or §13/§15 follow-up.
- Kiosk completion evidence for phone-local §8 validation remains a deployment boundary: if only `smartResponse` is submitted, deployments need a trusted way to account for §8 validation before clinical use.

### Downstream dependencies

- T5.C should expand privacy treatment for identifiers, QR metadata, logs, telemetry, retention, and public kiosk displays.
- T5.D should mirror fixed algorithm labels, JWS `typ`, content types, profile identifiers, and any future agility/deprecation registry hooks.
- T6 fixture work should add kiosk positive and negative vectors for no-plaintext leakage, mirrored metadata mismatch, bad JWKs/IVs, replay, duplicate submission, and cross-context key/info/AAD confusion.
