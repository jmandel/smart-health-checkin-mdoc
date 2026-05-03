## 11. Security considerations

This section restates the security properties of the version 1.0 flows and identifies threats that implementers and deployment profiles need to address. It does not define a new presentation transport, clinical request model, response model, key-discovery system, trust registry, platform integration profile, or production operations policy. The conformance targets in this section are the components that create, relay, resolve, validate, display, submit, or consume SMART Health Check-in requests and responses under §§5-9.

The base same-device flow is direct Digital Credentials API `org-iso-mdoc` (§8). The kiosk flow (§9) is a wrapper that publishes an encrypted, signed kiosk request, displays a pointer-only QR code, resolves that pointer on the Holder's phone, and then re-enters the same §8 flow with the embedded `smartRequest`. Implementers need to preserve the trust-layer separation in §7 throughout these flows.

### 11.1 End-to-end encryption requirements

SMART Health Check-in uses multiple cryptographic boundaries. Implementations MUST keep them separate and MUST NOT substitute keys, ciphertexts, transcripts, or authenticated data between them.

1. **Same-device Wallet response encryption (§8).** The Wallet/Responder encrypts the CBOR `DeviceResponse` using HPKE base mode with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. The `SessionTranscript` is derived from the exact `encryptionInfo` base64url string and the authenticated origin or deployment-approved origin-equivalent. A Wallet/Responder MUST NOT return plaintext `DeviceResponse` bytes or plaintext SMART response JSON for the core §8 flow.
2. **Kiosk request-envelope encryption (§9.3-§9.5).** The Kiosk creator encrypts the compact kiosk request JWS using `ECDH-P256+HKDF-SHA256+AES-GCM`, with `salt = utf8(requestId)`, `info = utf8("smart-health-checkin-kiosk-request-v1")`, and AES-GCM AAD `utf8(requestId)`. The plaintext is the compact kiosk request JWS, not the unsigned payload and not the raw `smartRequest` alone.
3. **Kiosk response-submission encryption (§9.8-§9.9).** The Phone presenter encrypts `SubmissionPlaintext` JSON using `ECDH-P256+HKDF-SHA256+AES-GCM`, a fresh phone ephemeral P-256 key, the signed `encryptResponseTo.desktopPublicKeyJwk`, `salt = utf8(KioskRequestPayload.requestId)`, `info = utf8("smart-health-checkin-kiosk-response-v1")`, and AES-GCM AAD `utf8(KioskRequestPayload.requestId)`.

The kiosk Submission service/provider is an untrusted relay. A conforming untrusted-relay deployment MUST NOT require the provider to receive plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Holder choices, §8 response plaintext, request-opening private keys, desktop private keys, Wallet secrets, shared secrets, or provider-independent clinical trust decisions merely to route, store, notify, or make available kiosk state.

Production deployments need key custody that is stronger than the static demo pattern in the repository. Checked-in kiosk demo keys and browser-displayed desktop private JWKs are demonstration artifacts only. They MUST NOT be treated as production trust anchors, production request-opening keys, production desktop decryption keys, or an acceptable production key-custody policy.

### 11.2 Replay & freshness

Freshness is layered. `SmartHealthCheckinResponse.requestId == SmartHealthCheckinRequest.id` is a clinical correlation check; it is not a replay defense. Implementations need additional freshness checks at each presentation and wrapper boundary.

For the §8 same-device flow, a Verifier SHOULD use a fresh HPKE recipient key pair and fresh unpredictable `encryptionInfo.nonce` for each presentation session. A Wallet/Responder and Verifier MUST compute and validate the `SessionTranscript` from the exact `encryptionInfo` base64url value and authenticated origin or origin-equivalent. A Verifier MUST reject a response that cannot be HPKE-opened with the retained session key and expected `SessionTranscript`, whose device authentication is not bound to that same transcript, or whose SMART response fails §6.6 validation against the original SMART request.

For kiosk request resolution, the Phone presenter MUST reject expired signed kiosk requests before Wallet invocation. It MUST bind the Pointer URL `r` value, provider row `requestId` when present, `EncryptedKioskRequest.requestId`, and verified `KioskRequestPayload.requestId` by exact string equality. It also needs to apply policy for unacceptable future `createdAt`, invalid `createdAt`/`expiresAt` relationships, clock skew, maximum lifetime, and provider context.

For kiosk response submission, the Completion display MUST bind candidate submissions through provider-row filtering, response-submission AES-GCM AAD, decrypted `SubmissionPlaintext.requestId`, and §6.6 validation of `payload.smartResponse.requestId` against the embedded `smartRequest.id`. These checks prevent many cross-session substitutions, but they do not prevent replay of the same valid ciphertext for the same active wrapper id. Production deployments SHOULD treat a successfully validated kiosk wrapper `requestId` as single-use for routine clinical workflow completion, stop displaying the QR after completion, and ignore, quarantine, or send later submissions for staff review rather than merging them.

Submission services SHOULD enforce rate limits, anti-enumeration controls, storage quotas, expiration cleanup, row-shape checks, blob-size limits, duplicate suppression, and bounded observation semantics as defense in depth. These provider controls do not replace cryptographic validation by the Phone presenter and Completion display.

### 11.3 Origin spoofing & UI redress

Authenticated origin is supplied by the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. A Wallet/Responder MUST NOT derive origin from the SMART request JSON, `purpose`, item `title`, item `summary`, selector URLs, request ids, kiosk pointer metadata, relay URLs, provider app ids, Artifact contents, or page display text.

Wallet and phone-presenter UX needs to prevent requester display text from masquerading as authenticated identity. If a Wallet/Responder, Phone presenter, or Completion display shows `purpose`, item titles, item summaries, provider names, pointer ids, or kiosk wrapper metadata, it SHOULD distinguish that unauthenticated workflow text from authenticated origin, reader-authenticated identity, deployment-approved creator identity, or local policy information.

A Phone presenter MUST NOT treat scanning a QR code, loading a submit page, or successfully decrypting a kiosk request as Holder consent. The Wallet/Responder needs to retain control over Holder review, disclosure, refusal, partial fulfillment, and Wallet policy. Implementations SHOULD avoid UI redress patterns in which the kiosk screen or phone page implies that sharing has already been approved before the Wallet has performed Holder review.

The current desktop demo exposes developer-oriented details, including signed request payloads and demo private key material, and its display validation is not a production assurance mechanism. Production kiosks should suppress or strongly gate technical detail panes, avoid public display of clinical payload details, and clearly separate patient-facing status from staff/debug diagnostics.

### 11.4 Reader impersonation

Reader / Verifier trust is separate from origin trust, kiosk-creator trust, mdoc issuer/device evidence, and clinical-source trust. In the core version 1.0 same-device flow, `readerAuth` is optional unless a deployment profile requires it. When present, it is per-`DocRequest.readerAuth` as a detached `COSE_Sign1` over:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The `readerAuth` protected header uses ES256 (`alg` `-7`), the serialized payload is `null`, and reader certificate evidence is carried in COSE header label `33` (`x5chain`) with at least the leaf certificate. A Verifier that includes `readerAuth` MUST compute it for the exact `SessionTranscript` and exact tag-24 `ItemsRequestBytes` used in the presentation request, and MUST NOT reuse it across sessions, origins, encryption information, SMART request serializations, or requested element sets.

A Wallet/Responder that supports or relies on reader authentication MUST verify the signature, detached-payload binding, `SessionTranscript`, exact `ItemsRequestBytes`, algorithm, key material, and deployment trust policy before treating the reader as authenticated. It MUST distinguish absent `readerAuth`, syntactically invalid `readerAuth`, cryptographically failed `readerAuth`, cryptographically valid but untrusted `readerAuth`, and trusted `readerAuth`.

The presence of `readerAuth`, a certificate chain, a common name, a logo, a provider app id, or a kiosk wrapper signature is not sufficient to prevent reader impersonation. Production reader trust requires deployment-defined trust anchors, path validation, revocation/status policy where available, key-usage constraints, naming rules, and Holder-facing display policy.

### 11.5 Issuer trust pivots

Issuer/device-attestation trust for the mdoc presentation container is not the same as clinical-source trust for returned Artifacts. A Verifier MUST validate the §8 mdoc layer before accepting the presentation as transport-valid: HPKE opening, `DeviceResponse` structure, MSO and `issuerAuth`, value-digest binding for the tag-24 `IssuerSignedItem`, device-key proof over the expected `SessionTranscript`, stable element extraction, SMART response validation, and §6.6 cross-validation.

After those checks, a Verifier still MUST NOT infer clinical-source provenance for unsigned raw FHIR JSON from transport success, origin evidence, reader authentication, issuer signatures, device-key proof, kiosk wrapper validation, Holder consent, or SMART response shape validation. Raw `application/fhir+json` Artifacts remain patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof. SMART Health Card Artifacts require SMART Health Card JWS verification and local trust-policy evaluation.

Deployments that accept self-attested Wallet evidence need to label that assurance level clearly. A self-signed or demo issuer certificate, matching MSO digest, successful HPKE opening, or cryptographically valid signature against an included leaf certificate MUST NOT be treated as production issuer trust unless it chains to or otherwise matches a trust anchor accepted by deployment policy.

Kiosk wrapper signatures authenticate wrapper properties under creator-key policy; they do not prove clinical-source provenance, patient identity, Wallet authenticity, mdoc issuer trust, downstream EHR write authorization, or legal authority to consume returned content.

### 11.6 Cryptographic agility

Version 1.0 intentionally fixes active algorithm identifiers instead of negotiating cryptography in-band:

- Same-device §8 response protection uses DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM.
- Same-device COSE signatures use ES256 / `-7`.
- Optional `readerAuth` carries certificate evidence in COSE header label `33` (`x5chain`).
- Kiosk request-envelope and response-submission wrappers use `ECDH-P256+HKDF-SHA256+AES-GCM` with AES-GCM-256 content-encryption keys and distinct info strings.
- Kiosk request JWS uses compact JWS with `alg: "ES256"` and `typ: "smart-health-checkin+kiosk-request+jws"`.

Implementations MUST reject unsupported algorithm labels rather than silently downgrading, substituting defaults, or accepting provider-supplied alternatives. Algorithm agility for future versions should be introduced through versioned profiles, registry updates, or deployment profiles that define exact wire identifiers, key constraints, downgrade protections, validation behavior, fixture expectations, and deprecation timelines.

Deployment profiles SHOULD define how weak, deprecated, compromised, or policy-forbidden keys and algorithms are disabled, and how overlapping key rotation is handled without requiring relays to see plaintext clinical content. Current active code accepts some WebCrypto-importable JWK shapes and does not yet enforce every production key-policy constraint; conformance profiles should make public-key-only JWK requirements, private-member rejection, key-ops expectations, and mirrored metadata checks explicit.

### 11.7 Plaintext leakage

Plaintext leakage can occur outside the cryptographic envelope through logs, debug panels, crash reports, browser history, analytics, screenshots, developer tools, fixture bundles, database indexes, storage paths, or operational dashboards. Components SHOULD minimize the collection and retention of sensitive plaintext and metadata.

Kiosk creators, Phone presenters, Wallets/Responders, Submission services, Completion displays, Requesters, and Verifiers SHOULD NOT log or expose plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, decrypted kiosk JWS payloads, §8 `DeviceResponse` plaintext, `dcapiResponse` bytes, request-opening private keys, desktop private keys, Wallet secrets, provider credentials, access tokens, shared secrets, or full ciphertext blobs except under controlled diagnostic or fixture procedures.

If a deployment provides diagnostics, it SHOULD separate public patient/kiosk screens from staff-authorized or developer-authorized views, redact clinical payloads by default, mark intentionally public test keys, and avoid storing decrypted content longer than needed for the active workflow, audit, or recovery policy. Error messages SHOULD be recoverable without exposing valid request-id enumeration clues, provider internals, stack traces, clinical content, or secrets.

Active demos deliberately show technical details for protocol review and may display decrypted submission summaries or demo private JWK material. That behavior is useful for development and fixtures but is not production guidance.

### 11.8 Kiosk relay treated as honest-but-curious/untrusted relay

The kiosk Submission service/provider is untrusted for confidentiality and clinical trust decisions. It may store, route, notify, rate-limit, clean up, and enforce coarse access controls, but conforming deployments do not rely on it to protect plaintext clinical content or decide whether a clinical response is valid.

The provider may see wrapper request ids, provider app ids, creator/recipient key ids, timestamps, ciphertext sizes, storage paths, submission ids, IVs, public ephemeral keys, IP addresses, user agents, read/write timing, and row counts. It SHOULD NOT receive plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext `payload.smartResponse`, raw FHIR content, SMART Health Cards, Holder decisions, Wallet secrets, request-opening private keys, desktop private keys, or shared secrets merely to perform routing or notification.

Requester, Phone presenter, and Completion display processing MUST remain safe when the provider returns missing rows, duplicate rows, stale rows, malformed rows, ambiguous lookup results, wrong row ids, wrong storage paths, wrong IVs, invalid public keys, oversized blobs, delayed blobs, replayed blobs, reordered notifications, or modified ciphertext. The correct response is fail-safe rejection, bounded retry, quarantine, or staff review according to deployment policy, not fallback to plaintext or unvalidated provider metadata.

Provider-side access control, row-shape validation, anti-enumeration policy, and cleanup are defense in depth. They do not replace pointer/request-id binding, JWS verification, envelope decryption, submission decryption, SMART response validation, §8 validation, §7 trust interpretation, or workflow authorization.

### 11.9 Side-channel and metadata leakage on QR

The active kiosk pointer profile is pointer-only:

```text
https://clinic.example/verifier/submit.html#r=<wrapper-requestId>
```

The QR code or equivalent handoff MUST NOT contain the plaintext `smartRequest`, FHIR resources, SMART Health Cards, Questionnaire answers, compact kiosk request JWS, `EncryptedKioskRequest`, §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, §8 HPKE ciphertext, Wallet `DeviceResponse`, SMART response, response-submission ciphertext, storage blob, private keys, bearer credentials, or trust assertions intended to bypass §7/§8 validation.

The fragment `r` form reduces ordinary server-log exposure for the web origin serving the phone page because URL fragments are not sent in HTTP requests, but it does not make the pointer secret. The full QR payload can be observed by cameras, nearby people, browser history, screenshots, local scripts, crash reports, analytics on the phone page, and shoulder surfing. Pointer possession is a bearer locator for encrypted request state; it is not Holder consent, requester authentication, patient identity, request freshness by itself, clinical-source provenance, or authorization to consume returned content.

Kiosk creators SHOULD use high-entropy wrapper `requestId` values, short lifetimes suitable for in-person use, QR refresh or removal after expiration/abandonment/completion, and display placement that limits casual scanning from unintended distances. Providers SHOULD minimize metadata, logs, analytics, indexes, and retained rows associated with pointer reads and submission writes.

Legacy or experimental URL fragments that inline §8 `deviceRequest`, `encryptionInfo`, return transports, or similar same-device request material are stale/non-canonical for version 1.0 kiosk. They should not be used to define QR content, conformance behavior, or security expectations for the active pointer-only profile.

### 11.10 Wallet UX guarantees

Wallet UX is a security control because it is where Holder review and disclosure decisions occur. A Wallet/Responder implementing this specification MUST validate the incoming §8 request before disclosure, recover the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, and run Holder review or equivalent Holder-control processing at request-item granularity.

The Wallet/Responder MUST preserve request item `id` values for fulfillment and status accounting. It MAY group, summarize, reorder, localize, or suppress display details for accessibility, safety, legal, or policy reasons, but it MUST NOT treat `required: true`, mdoc `intentToRetain`, a QR scan, a provider row, a kiosk wrapper signature, or a button click outside the Wallet as Holder consent.

The Wallet/Responder needs to support meaningful refusal and partial sharing. Unsupported selectors, unavailable data, Holder refusal, partial fulfillment, and processing errors are clinical response outcomes under §6 when the request was otherwise valid enough to answer. Wallets SHOULD make these choices understandable to Holders and preserve item-level `requestStatus[]` accounting so Requesters can distinguish declined, unavailable, unsupported, partial, fulfilled, and error outcomes.

If origin, reader authentication, or deployment trust information is shown, the Wallet SHOULD distinguish authenticated evidence from unauthenticated SMART request display text. If required evidence is absent, invalid, expired, revoked, unsupported, ambiguous, or inconsistent, the Wallet MUST follow local policy and any deployment profile: reject, proceed with reduced assurance, request additional confirmation, restrict returned content, or otherwise fail safely.

Platform-specific implementation advice for Android, iOS, browsers, Credential Manager, app links, entitlements, and operating-system UI belongs in §15 or deployment profiles. This section only requires the protocol-level UX outcomes: validated request processing, Holder control, clear trust-layer display, no consent-by-scan, and item-level response accounting.

### Organizer notes

**Strengths**

- The accepted T3/T4 material has strong separation between clinical objects (§§5-6), trust interpretation (§7), same-device `org-iso-mdoc` mechanics (§8), and kiosk wrappers (§9).
- The §8 byte ladder is threat-checkable: direct `org-iso-mdoc`, stable request/response carriers, optional per-`DocRequest.readerAuth`, direct `dcapi` `SessionTranscript`, HPKE response protection, mdoc digest/device validation, and §6.6 cross-validation are all explicit.
- The §9 kiosk design correctly treats the provider as an untrusted relay, uses pointer-only QR, encrypts request and response-submission legs separately, signs the kiosk request, and keeps wrapper `requestId` distinct from `smartRequest.id`.

**Caveats**

- The desktop kiosk demo exposes developer technical details and demo private key material; this is acceptable as demo evidence but should be called out as non-production behavior.
- Active code is looser than the desired final conformance posture on some schema, JWK, private-member, and mirrored metadata checks. The specification can require stricter processing without claiming the current demo fully enforces it.
- Demo issuer strings, audience strings, provider app ids, self-signed/demo certificates, and checked-in demo keys are not production trust anchors.
- Raw FHIR transport does not create clinical provenance. Unsigned raw FHIR JSON remains patient-mediated unless separate accepted evidence supplies provenance or source trust.

**Open issues**

- No deterministic kiosk fixture suite exists yet. Future vectors need positive and negative request-JWS, envelope, pointer, submission, replay, metadata-leakage, and cross-boundary-separation cases.
- Production key custody policy is not yet defined for kiosk creator signing keys, request-opening keys, desktop response-decryption keys, and reader/issuer trust anchors.
- Exact conformance handling for duplicate JSON/CBOR keys, mirrored envelope metadata mismatches, public JWK constraints, row ambiguity, duplicate submissions, and completion grace windows needs closure in §13, Appendix A, fixture profiles, or deployment profiles.
- Desktop completion currently relies on demo/local validation surfaces; production deployments need a clear boundary for preserving or conveying §8 validation evidence when only the active `smartResponse` wrapper is submitted to the kiosk.

**Downstream dependencies**

- §12 should turn the metadata and plaintext-leakage observations here into privacy requirements for logging, retention, analytics, screenshots, provider metadata, QR exposure, and public kiosk display.
- §13 and Appendix A should assign concrete conformance checks to the normative requirements above, especially failure cases and algorithm/key constraints.
- Fixture work should produce a deterministic `fixtures/kiosk/` suite and label all test keys, PHI status, byte-exact fields, semantic checks, expected failures, and non-production trust material.
- §15 should contain platform-specific Android/iOS/browser implementation guidance without moving those operational details into this security-considerations section.
