## 11. Security considerations

This section summarizes security considerations for the version 1.0 same-device and kiosk flows defined in §§8-9. It does not create a new presentation binding, clinical provenance framework, platform allow-list, or production key-custody policy. Normative requirements here are directed at implementations of the relevant flow and restate security properties that must be preserved when applying §§5-9.

### 11.1 End-to-end encryption requirements

SMART Health Check-in has three distinct cryptographic protection contexts. Implementations SHALL keep their keys, transcript inputs, algorithm identifiers, ciphertext fields, and validation results separate.

1. In the same-device direct `org-iso-mdoc` flow, the Wallet/Responder encrypts the CBOR `DeviceResponse` using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. The Verifier opens this HPKE ciphertext only with the retained recipient private key corresponding to the exact `encryptionInfo` supplied in the request.
2. In the kiosk request leg, the Kiosk creator encrypts the compact kiosk request JWS using `ECDH-P256+HKDF-SHA256+AES-GCM`, salt and AES-GCM AAD equal to the kiosk wrapper `requestId`, and HKDF `info = "smart-health-checkin-kiosk-request-v1"`. The plaintext is the compact JWS, not the unsigned payload and not the raw `smartRequest` alone.
3. In the kiosk submission leg, the Phone presenter encrypts `SubmissionPlaintext` using `ECDH-P256+HKDF-SHA256+AES-GCM`, salt and AES-GCM AAD equal to the kiosk wrapper `requestId`, and HKDF `info = "smart-health-checkin-kiosk-response-v1"`. The recipient is the signed `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk`, not a key learned from the Pointer URL, provider row, or §8 `encryptionInfo`.

A Wallet/Responder, Phone presenter, Submission service, provider, Completion display, or Verifier SHALL NOT downgrade any active version 1.0 ciphertext to plaintext transport, substitute one encryption context for another, reuse §8 HPKE key material as kiosk wrapper key material, or treat successful decryption as sufficient clinical validation. Encryption protects confidentiality and session/context binding for the encrypted bytes; it does not by itself prove Holder consent, patient identity, requester identity, issuer trust, reader trust, clinical-source provenance, or downstream authorization.

### 11.2 Replay and freshness

Freshness is supplied by flow-specific mechanisms rather than by the transport-neutral SMART request or SMART response alone. `SmartHealthCheckinRequest.id`, `SmartHealthCheckinResponse.requestId`, Artifact ids, request item ids, provider row ids, and submission ids are correlation values; they are not freshness proofs.

For §8, the Verifier SHOULD use a fresh HPKE recipient key pair and SHALL use fresh unpredictable nonce bytes in `encryptionInfo` for each presentation request. The direct `dcapi` `SessionTranscript` binds the exact `encryptionInfo` base64url string and authenticated origin or approved origin-equivalent. Optional `readerAuth`, device authentication, HPKE opening, and Verifier validation all depend on that transcript. Reusing recipient keys, nonces, or reader-authentication material across presentation sessions increases replay and correlation risk and requires explicit deployment-profile controls.

For §9, a Kiosk creator SHOULD generate high-entropy wrapper `requestId` values and short-lived signed `createdAt` / `expiresAt` windows appropriate to an in-person kiosk session. The Phone presenter SHALL reject expired kiosk requests before Wallet invocation, and the Completion display SHALL apply expiration and duplicate-submission policy before workflow acceptance. A production deployment SHOULD treat each wrapper `requestId` as single-use for successful clinical completion. A Completion display SHALL NOT accept a duplicate merely because it decrypts, arrives later, or carries a later `submittedAt`.

Providers MAY implement anti-enumeration, rate limiting, first-writer-wins, cleanup, and coarse expiration as defense in depth, but conforming Requesters and Completion displays SHALL NOT rely on an untrusted provider as the sole replay or freshness authority.

### 11.3 Origin spoofing and UI redress

Origin trust comes from the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It does not come from the SMART request JSON, kiosk Pointer URL, relay host name, `purpose`, item `title`, item `summary`, selector URLs, provider application ids, certificates embedded in unrelated payload fields, or display branding.

A Wallet/Responder that uses origin trust SHALL use authenticated platform-provided origin information, or an explicitly approved origin-equivalent defined by deployment policy, for §8 `SessionTranscript` construction and Holder display. If origin cannot be authenticated, the Wallet/Responder SHALL treat origin trust as absent and SHALL NOT silently substitute request display text or kiosk metadata as verified origin.

User interfaces SHOULD reduce origin spoofing and redress risk by distinguishing authenticated origin or reader information from unauthenticated request text. A Wallet/Responder MAY show `purpose`, item titles, summaries, and selectors as Holder-facing request context, but SHALL NOT label those fields as verified requester identity. Kiosk and phone pages SHOULD avoid layouts that imply scanning a QR code is consent, that provider row presence is completion, or that a branded demo page proves production requester authority. Platform-specific Android, iOS, browser allow-list, or native UI implementation advice belongs in §15 rather than in this security section.

### 11.4 Reader impersonation

Reader / Verifier authentication is optional in core version 1.0 unless a deployment profile requires it. When present, §8 uses per-`DocRequest.readerAuth`, not `DeviceRequest` version `"1.1"` `readerAuthAll`, as the core mechanism. The `readerAuth` value is a detached `COSE_Sign1` over tag-24 `ReaderAuthentication` that includes the same `SessionTranscript` and exact tag-24 `ItemsRequest` bytes used for the presentation. Its protected header uses ES256 / COSE `alg` `-7`, and the core profile carries reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate.

A Wallet/Responder that supports or relies on reader authentication SHALL verify the signature, detached payload, `SessionTranscript`, exact request bytes, algorithm, signing key, and certificate or trust-anchor policy before treating the reader as authenticated. The Wallet/Responder SHALL distinguish absent `readerAuth` from malformed, cryptographically failed, valid-but-untrusted, and trusted `readerAuth` states. It SHALL NOT treat the mere presence of `readerAuth`, `x5chain`, a common name, a logo, a demo certificate, or a key id as successful reader authentication.

Successful reader authentication proves possession of the accepted reader private key for the signed request bytes and session. It does not prove clinical-source provenance, patient matching, downstream authorization, or legal authority to consume returned content.

### 11.5 Issuer trust pivots

The same-device mdoc layer provides issuer/MSO signatures, value-digest binding for disclosed issuer-signed items, and device-key proof bound to the presentation `SessionTranscript`. A Verifier SHALL complete the §8 mdoc validation checklist and apply §7 issuer/device trust policy before claiming production issuer trust.

A Verifier SHALL NOT pivot from syntactic mdoc validity to production issuer trust unless the MSO issuer evidence chains to, or otherwise matches, trust anchors accepted by the applicable deployment policy. Self-signed, local, fixture, test, demo, or self-attested issuer evidence can be useful for development and for deployment-local assurance, but it SHALL NOT be represented as external production issuer accreditation unless the deployment trust framework supports that claim.

Issuer/device trust also must not be pivoted into clinical-source trust. An `application/fhir+json` Artifact remains patient-mediated raw FHIR JSON unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof. SMART Health Card Artifacts carry signed clinical-source evidence inside `value.verifiableCredential[]`, but receivers still need to verify those JWSs and apply selector and local policy checks.

### 11.6 Cryptographic agility

Version 1.0 fixes its active algorithms to reduce downgrade and negotiation ambiguity: §8 direct `org-iso-mdoc` uses P-256 HPKE with AES-128-GCM and ES256 COSE signatures; §9 kiosk wrapper encryption uses P-256 ECDH, HKDF-SHA-256, and AES-256-GCM; kiosk creator signatures use ES256 compact JWS. Implementations SHALL reject unsupported or unexpected algorithm labels in version 1.0 protocol artifacts rather than silently accepting alternate algorithms.

Future profiles can add algorithm agility, but they need explicit versioning, registry entries, conformance rules, downgrade protection, key-type constraints, and fixture coverage. A version 1.0 implementation MUST NOT treat locally supported WebCrypto, JOSE, COSE, HPKE, or platform algorithms as implicitly valid for SMART Health Check-in artifacts unless the selected profile names them.

Cryptographic agility also includes key lifecycle. Production deployments need policy for creator signing keys, reader keys, request-opening keys, desktop response-decryption keys, issuer anchors, revocation/status checks, rotation, compromise response, and test-vs-production separation. Checked-in demo keys, browser-delivered demo private keys, and fixture private keys are not production key-custody patterns.

### 11.7 Plaintext leakage

Plaintext clinical and protocol material can leak through debug panels, logs, crash reports, analytics, browser storage, screenshots, QR images, database indexes, fixture bundles, or developer tools even when the wire artifacts are encrypted. Implementations SHOULD minimize retention and logging of plaintext SMART requests, SMART responses, raw FHIR resources, SMART Health Cards, decrypted kiosk request JWS payloads, decrypted submissions, §8 `DeviceResponse` plaintext, private keys, shared secrets, provider credentials, access tokens, full ciphertext blobs, and valid-id enumeration clues.

A Submission service or relay SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext `smartResponse`, raw FHIR content, SMART Health Cards, request-opening private keys, desktop private keys, Wallet secrets, or shared secrets merely to route, store, notify, or make available kiosk state. A Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes or plaintext SMART response JSON for the core §8 flow.

Diagnostic fixtures can include intentionally public test private keys or plaintext examples only when clearly labeled as fixture material and separated from production traffic. Active demos display or hold private key material in browser state for demonstration; that behavior is not a production pattern. The current desktop demo can display a decrypted SMART response after opening a submission, but that UI path is not by itself proof that full §6, §7, §8, and §9 validation has been performed for clinical workflow use.

### 11.8 Kiosk relay treated as honest-but-curious / untrusted relay

The kiosk Submission service/provider is an untrusted relay for opaque encrypted state. It can store, serve, route, upload, download, notify, rate-limit, and clean up request and submission artifacts. It is not a clinical Requester, Verifier, Wallet, issuer, trust anchor, Holder-consent service, patient-identity service, clinical-source provenance service, or downstream authorization service.

The relay is expected to see operational metadata such as wrapper request ids, submission ids, storage paths, key ids, provider app ids, ciphertext sizes, timestamps, IP addresses, user agents, row counts, retry behavior, and access patterns. It SHALL NOT need plaintext clinical content or private keys for the active profile. Provider access control, app ids, row-shape checks, and storage permissions are defense in depth; they do not replace request-envelope encryption, creator-JWS verification, pointer/payload binding, response-submission encryption, Completion display decryption, SMART response validation, §8 validation, or §7 trust interpretation.

A malicious or compromised relay may omit, delay, replay, duplicate, reorder, substitute, or corrupt rows and blobs. The protocol counters these attacks through high-entropy pointer ids, signed and encrypted request state, request-id binding across pointer/row/envelope/payload, AES-GCM AAD, provider-row filtering, bounded-size processing, expiration, and duplicate-handling policy. These controls do not eliminate all denial-of-service or traffic-analysis risks.

### 11.9 Side-channel and metadata leakage on QR

The active Pointer URL is pointer-only and carries the kiosk wrapper `requestId` in the URL fragment parameter `r`. It SHALL NOT contain plaintext SMART requests, compact kiosk request JWSs, encrypted request envelopes, FHIR resources, SMART Health Cards, Questionnaire answers, §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, HPKE ciphertexts, Wallet responses, response-submission ciphertexts, private keys, bearer credentials, or trust assertions intended to bypass §7 or §8 validation.

Even pointer-only QR codes leak metadata. The complete URL and QR image can be observed by cameras, nearby people, screen-sharing tools, screenshots, browser history, local scripts, analytics in the phone page, and the origin serving the page. The `r` value is a bearer locator for encrypted request state; possession of it is not Holder consent, patient identity, requester authentication, freshness proof, or authorization to consume returned content.

Kiosk creators SHOULD keep Pointer URLs short, display them only for the active session, refresh or stop displaying them after expiration, abandonment, cancellation, or completion, and avoid embedding clinic, patient, appointment, or requested-content details in pointer-visible fields. Use of a fragment reduces routine server-log exposure for the `r` parameter, but it does not protect against all local, browser, analytics, optical, or shoulder-surfing observation.

### 11.10 Wallet UX guarantees

Wallet UX is a security control because Holder-mediated disclosure is central to the protocol. A Wallet/Responder SHALL perform Holder review or equivalent Holder-control processing before disclosing content through §8, except where an explicit deployment profile defines a different Holder-control mechanism and assurance level. Review operates at request-item granularity: scanning a QR code, opening a Pointer URL, satisfying a `required: true` advisory flag, receiving a valid kiosk wrapper, or invoking the Digital Credentials API is not consent by itself.

A Wallet/Responder SHALL preserve request item ids for response accounting and SHALL construct `requestStatus[]` so every original request item is covered exactly once when it returns a SMART response. It SHOULD make the requested content, accepted media types, and item outcomes understandable to the Holder, subject to accessibility, localization, safety, and local policy. It MAY group or summarize items, but it SHALL NOT hide the fact that multiple items or broad selectors are being requested in a way that defeats meaningful Holder control.

Wallets and Phone presenters SHOULD distinguish authenticated trust signals from unauthenticated display context. They should avoid representing `purpose`, item text, profile URLs, provider app ids, relay URLs, demo keys, or wrapper signatures as verified requester identity. They should also avoid overpromising clinical provenance for raw FHIR JSON or implying that successful transport encryption means a returned Artifact is clinically complete, current, or suitable for downstream ingestion.

## Organizer notes

### Strengths

- Aligns §11 with the accepted T3/T4 architecture: direct §8 `org-iso-mdoc` is the base flow, and kiosk is a wrapper that re-enters §8 on the phone.
- Explicitly separates the three encryption contexts: §8 HPKE, §9 request-envelope encryption, and §9 response-submission encryption.
- Preserves trust-layer separation from §7, including origin trust, optional reader authentication, issuer/device trust, and clinical-source trust.
- Calls out active prototype behavior without turning demo keys, browser-held private keys, or prototype display paths into production requirements.

### Caveats

- Some active TypeScript validation is looser than the canonical text for schema depth, JWK constraints, mirrored non-id envelope metadata, and desktop completion validation. This draft treats the canonical requirements as the security target and describes the implementation gaps as caveats, not as protocol design.
- The active `docs/profiles/org-iso-mdoc.md` still contains older example request shapes in places; this draft follows the accepted §5 request model and §8 canonical text instead.
- The kiosk fixture suite is not yet deterministic or complete; security language should not imply byte-level conformance vectors already exist for all kiosk failure cases.

### Open issues

- Production key custody, trust-anchor management, reader/issuer registries, revocation/status checking, and privileged-browser allow-list policy remain deployment-profile or later-section work.
- A future conformance cutpoint should decide which freshness windows, nonce lengths, duplicate-handling requirements, and mirrored-metadata checks are core conformance versus deployment-profile obligations.
- A future fixture cutpoint should add deterministic kiosk vectors covering request JWS signing input, encrypted request envelopes, response-submission encryption, request-id/AAD failures, expiration, malformed JWK/IV/row cases, duplicate rows, and plaintext-leakage checks.

### Downstream dependencies

- §12 privacy should build on the metadata and side-channel discussion here, especially QR observation, provider metadata, logs, browser history, analytics, and retention.
- §13 registries should reflect fixed version 1.0 algorithm labels, media types, profile identifiers, JWS `typ`, and any future algorithm-agility mechanism.
- §15 implementation notes should carry platform-specific Android/iOS/browser guidance, production key-custody advice, and UI implementation patterns without weakening the normative security boundaries above.
- Appendix A should extract only the clear conformance requirements that target an identifiable role and avoid duplicating informative threat explanations.
