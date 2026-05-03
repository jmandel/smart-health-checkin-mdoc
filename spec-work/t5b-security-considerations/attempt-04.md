## 11. Security considerations

This section collects security considerations for the version 1.0 same-device and kiosk flows defined in §§8-9. It does not define a new presentation flow, a new clinical content model, or new platform-specific Android/iOS implementation advice. Implementers need to apply the concrete validation rules in §§5-9 first; this section explains why those rules matter and where deployment policy remains responsible for production hardening.

### 11.1 End-to-end encryption requirements

SMART Health Check-in uses three separate cryptographic contexts. Implementations must keep their keys, transcripts, AAD, plaintexts, and validation outcomes separate.

1. **Same-device §8 presentation response.** The Wallet/Responder encrypts CBOR `DeviceResponse` bytes to the phone-local or same-device Verifier's HPKE recipient public key from `encryptionInfo`, using DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. The plaintext includes the mdoc `DeviceResponse`, not a plaintext SMART response transport outside the mdoc container.
2. **Kiosk §9 request envelope.** The Kiosk creator encrypts the compact kiosk request JWS to the request-opening P-256 public key identified by the signed `encryptRequestTo.keyId` and envelope `recipientKeyId`, using ECDH P-256, HKDF-SHA256, AES-256-GCM, salt and AAD `utf8(KioskRequestPayload.requestId)`, and info `utf8("smart-health-checkin-kiosk-request-v1")`.
3. **Kiosk §9 response submission.** The Phone presenter encrypts `SubmissionPlaintext` to the signed `encryptResponseTo.desktopPublicKeyJwk`, using a fresh phone ephemeral P-256 key, ECDH/HKDF-SHA256/AES-256-GCM, salt and AAD `utf8(KioskRequestPayload.requestId)`, and info `utf8("smart-health-checkin-kiosk-response-v1")`.

A conforming implementation MUST NOT substitute keys, ciphertexts, transcripts, info strings, or AAD across these contexts. In particular, §9 response submission does not reuse §8 HPKE keys or `SessionTranscript`, and the kiosk request envelope is not a §8 `DeviceRequest` or `encryptionInfo` carrier.

End-to-end confidentiality for kiosk clinical content depends on withholding request-opening private keys, desktop response private keys, and Wallet secrets from the untrusted Submission service. Browser-delivered private JWKs and checked-in demo keys in the active prototype are demonstration behavior only; they are not a production key-custody pattern. A production deployment needs a key-custody policy for Kiosk creator signing keys, request-opening keys, desktop response keys, rotation, recovery, and destruction. This specification does not yet define that production key-custody profile.

### 11.2 Replay and freshness

Freshness is layered. A SMART response `requestId` matching the SMART request `id` is a clinical correlation check, not a replay defense. Same-device freshness comes from the §8 presentation session: fresh `encryptionInfo` nonce, retained HPKE private key, origin-bound `SessionTranscript`, optional `readerAuth` bound to the exact `SessionTranscript` and tag-24 `ItemsRequestBytes`, and device authentication over the same transcript.

Kiosk freshness uses a different set of controls: high-entropy wrapper `requestId`, signed `createdAt` and `expiresAt`, pointer/envelope/payload `requestId` binding, request-envelope AES-GCM AAD, response-submission AES-GCM AAD, decrypted `SubmissionPlaintext.requestId`, and validation of the inner SMART response against the original `smartRequest.id`. Phone presenters are expected to reject expired or future-dated kiosk requests before Wallet invocation, and Completion displays are expected to apply expiration and duplicate-submission policy before workflow acceptance.

Production deployments SHOULD treat each kiosk wrapper `requestId` as single-use for successful clinical completion. A valid duplicate ciphertext for the same wrapper id can still decrypt; cryptography alone does not tell whether a later row is a replay, a retry, or a second Holder action. Completion displays and trusted workflow state need to mark completion, stop displaying stale QR codes, reject or quarantine later valid submissions, and avoid merging Artifacts or `requestStatus[]` from multiple submissions unless a future authenticated aggregation profile defines that behavior.

Provider cleanup, rate limiting, anti-enumeration controls, storage quotas, and row immutability are defense in depth. They do not replace local cryptographic validation, request/response cross-validation, or single-use workflow state.

### 11.3 Origin spoofing and UI redress

The authenticated origin used for §8 is supplied by the Browser / User Agent, Credential Manager, platform channel, or a deployment-approved privileged-caller mechanism. Wallets/Responders must not derive origin from SMART request JSON, `purpose`, item `title`, item `summary`, selector URLs, request ids, kiosk pointer metadata, relay URLs, provider app ids, callback-looking strings, or returned Artifact contents.

UI redress risks arise when unauthenticated display text is shown next to authenticated origin, reader, or kiosk-creator information. Wallets and Phone presenters SHOULD visually distinguish:

- authenticated origin or privileged-caller evidence;
- trusted reader authentication, if present and policy-accepted;
- trusted kiosk-creator or provider binding information, if established by deployment policy; and
- unauthenticated SMART request display text such as `purpose`, item titles, summaries, and selector labels.

Scanning a QR code or seeing a familiar clinic name in request text is not Holder consent or requester authentication. Wallet UX needs to preserve Holder control at request-item granularity and avoid click-through screens that make unauthenticated request text look like platform-verified identity.

The active desktop demo displays useful developer details, including signed payloads and demo-only desktop private JWK material. That is acceptable only as clearly marked demonstration/debug behavior. Production Completion displays SHOULD avoid public-screen disclosure of decrypted clinical content, private keys, detailed provider rows, stack traces, or debug payloads, and should require staff authorization before displaying sensitive details.

### 11.4 Reader impersonation

Reader authentication is optional in the core §8 flow. When present, it is per-`DocRequest.readerAuth`: a detached `COSE_Sign1` using ES256 over tag-24 `ReaderAuthentication` that binds the exact `SessionTranscript` and exact tag-24 `ItemsRequestBytes`. The COSE header label `33` (`x5chain`) carries reader certificate evidence with at least the leaf certificate.

A Wallet/Responder that relies on reader authentication MUST verify the detached signature, protected algorithm, request-byte binding, transcript binding, signing key, certificate or key evidence, and deployment trust policy before treating the reader as authenticated. It must distinguish absent reader authentication from syntactically invalid, cryptographically failed, cryptographically valid but untrusted, and trusted reader authentication.

The mere presence of a certificate, common name, logo, `kid`, kiosk creator signature, provider app id, web origin, or SMART request `purpose` does not make a reader trusted. Demo self-signed reader certificates and ephemeral demo reader identities do not establish production reader trust. Deployment profiles that require reader authentication need to define trust anchors, certificate path validation, validity-time handling, key usage or policy constraints, revocation expectations, display-name mapping, and behavior when evidence is missing or fails.

### 11.5 Issuer trust pivots

The mdoc layer can prove that the disclosed `smart_health_checkin_response` element is integrity-protected by an MSO digest, that `issuerAuth` validates under an issuer key, and that device authentication is bound to the session transcript. These are issuer/device-attestation properties of the presentation container. They are not automatically clinical-source provenance, patient matching, downstream EHR write-back authorization, or legal authority to consume content.

Verifiers must evaluate issuer trust under §7.3 and deployment policy before claiming production issuer assurance. A syntactically valid MSO, matching digest, valid signature against an included leaf certificate, or self-signed issuer certificate is not production issuer trust unless the evidence chains to or otherwise matches an accepted trust anchor. Demo issuer material and checked-in keys are test material only.

Raw FHIR JSON Artifacts remain patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, authenticated retrieval evidence, or equivalent source proof. A Verifier may accept patient-mediated raw FHIR JSON under local policy, but it must not equate mdoc issuer signatures, §8 transport success, `readerAuth`, kiosk wrapper validation, or SMART response shape validation with SMART Health Card issuer trust or clinical provenance.

### 11.6 Cryptographic agility

Version 1.0 fixes its active cryptographic suites rather than negotiating them in-band:

- §8 response encryption uses HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM.
- §8 COSE signatures use ES256 / `-7` where this profile signs reader, issuer, or device structures.
- §9 kiosk request JWS uses ES256 with `typ = "smart-health-checkin+kiosk-request+jws"`.
- §9 kiosk request and response wrapper encryption use the labeled ECDH-P256+HKDF-SHA256+AES-GCM suite with AES-256-GCM and distinct info strings.

Implementations MUST reject unsupported algorithm labels or mismatched content types for the profile they implement. They should not silently downgrade to legacy dynamic element-name encodings, inline §8 kiosk fragments, alternate HPKE suites, `DeviceRequest` version `"1.1"` `readerAuthAll`, or provider-supplied keys unless a future version or deployment profile explicitly defines that behavior.

Future cryptographic agility should be introduced by explicit versioned profiles, registry entries, and conformance vectors. It should define algorithm identifiers, key formats, transcript/AAD/info construction, downgrade prevention, and mixed-version behavior. It should not rely on opaque library defaults or provider metadata.

### 11.7 Plaintext leakage

The main plaintext-leakage rule is simple: clinical request and response content should appear only at the component that is supposed to process it, after the relevant cryptographic and trust checks.

A Kiosk creator must not publish the compact request JWS in plaintext through the relay or QR. The Pointer URL must not contain the plaintext `smartRequest`, FHIR resources, SMART Health Cards, Questionnaire answers, compact JWS, `EncryptedKioskRequest`, §8 `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, Wallet response bytes, response-submission ciphertext, private keys, or trust assertions intended to bypass §7/§8 validation.

A Phone presenter must not include plaintext §8 `DeviceResponse` CBOR, `dcapiResponse`, HPKE `enc` or `cipherText`, §8 request material, request-opening private keys, desktop private keys, Wallet secrets, provider credentials, or unrelated diagnostics in the active `SubmissionPlaintext.payload`. For the active successful completion profile, `payload.kind` is `"smart-health-checkin-response"` and `payload.smartResponse` is the §6 SMART response.

Completion displays and Requesters should minimize logs and debug displays containing decrypted SMART responses, raw FHIR resources, SMART Health Cards, request JWS payloads, private keys, provider credentials, access tokens, full ciphertext blobs, or stack traces. Public kiosk screens should show workflow state rather than sensitive clinical details unless local authorization and policy permit otherwise.

### 11.8 Kiosk relay as honest-but-curious or untrusted relay

The kiosk Submission service/provider is not a clinical Requester, Verifier, Wallet, issuer, trust anchor, or clinical-source provenance service. It stores, serves, or notifies about opaque encrypted request and submission state. Its normal visible data can include wrapper `requestId`, provider row ids, storage paths, file ids, key ids, content type, timestamps, ciphertext sizes, public ephemeral keys, IVs, IP addresses, user agents, and access patterns.

A conforming deployment must not require the provider to receive plaintext SMART requests, plaintext SMART responses, raw FHIR clinical content, SMART Health Cards, Holder choices, §8 response plaintext, desktop private keys, Wallet secrets, request-opening private keys, or shared secrets merely to route kiosk state.

Provider-side access control, authenticated writes, row-shape checks, storage path conventions, rate limits, duplicate suppression, cleanup, and notification ordering are useful defense in depth. They are not trust evidence for Holder consent, patient identity, requester identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, or downstream authorization. Completion displays must locally decrypt, bind, validate, and apply §6, §7, §8, and §9 rules before workflow use.

### 11.9 Side-channel and metadata leakage on QR

A pointer-only QR sharply reduces clinical leakage, but it does not make the handoff anonymous. The Pointer URL exposes at least the URL origin/path and wrapper `requestId` to cameras, shoulder surfers, browser history, screenshots, local scripts, analytics on the phone page, and possibly device sync or accessibility tooling. Even URL fragments, while not sent in ordinary HTTP requests, can be read by the loaded page and can appear in local histories or telemetry.

Kiosk creators should keep the Pointer URL short, high-entropy, session-scoped, and short-lived. They should stop displaying or refresh it after expiration, abandonment, cancellation, or successful completion. Request ids, submission ids, storage paths, key ids, provider app ids, row counts, timestamps, retry behavior, and access patterns can reveal check-in activity and support correlation even when payloads remain encrypted.

Deployments SHOULD minimize QR retention, screen recordings, analytics, logs, database indexes, dashboards, crash reports, and telemetry that expose pointer values or relay metadata. User-facing errors should not reveal whether a guessed request id was valid, expired, already completed, or merely unavailable beyond what is needed for safe recovery.

### 11.10 Wallet UX guarantees

Security depends on Wallet and Phone presenter UX as well as cryptography. A Wallet/Responder must validate the §8 request before disclosure, recover the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, compute the `SessionTranscript` from authenticated origin or approved origin-equivalent context, classify reader authentication accurately, and run Holder review or equivalent policy at request-item granularity.

Wallet UX must not treat `required: true`, QR scanning, kiosk wrapper verification, provider lookup success, or `purpose` text as consent. It should show or summarize each request item in a way that preserves item ids for response accounting, makes broad selectors understandable, and distinguishes declined, unavailable, unsupported, partial, fulfilled, and error outcomes.

When authenticated origin, reader authentication, privileged-caller evidence, or kiosk-creator trust is absent or untrusted, Wallets should avoid verified-identity branding and should apply local policy: reject, proceed with reduced assurance, require additional Holder confirmation, restrict returned content, or add warnings. If the selected flow cannot construct the required `SessionTranscript`, the Wallet must not silently substitute a self-asserted request field as origin.

Phone presenters in kiosk mode also have a UX responsibility: they should display that the QR carried only a pointer; the full SMART request was decrypted and verified before Wallet invocation; and sharing still happens through the Holder's Wallet. They should fail safely if pointer resolution, envelope opening, JWS verification, provider binding, freshness checks, SMART request validation, same-device invocation, or SMART response validation fails.

## Organizer notes

### Strengths

- The canonical T3/T4 design keeps clinical JSON, same-device mdoc presentation, and kiosk relay wrappers distinct.
- The three encryption contexts have different recipients, info/transcript inputs, AAD, and plaintexts, reducing cross-protocol confusion when implementations enforce the separation.
- The pointer-only QR and untrusted-provider model substantially reduce relay exposure of clinical content.
- §7 correctly separates origin, reader, issuer/device, and clinical-source trust, preventing transport success from becoming a provenance claim.

### Caveats

- The active desktop demo intentionally exposes technical details and demo private JWK material. Security text should label this as demo-only rather than treating it as production display validation.
- Active TypeScript checks are stricter for core ids, algorithms, content type, expiry, and app id than for every schema, JWK, and mirrored metadata rule described in canonical T4 text. Conformance vectors should close this gap rather than relying on demo behavior.
- Legacy `rp-web/src/sdk/kiosk-session.ts` still models a stale URL-fragment approach that inlines §8 `deviceRequest` and `encryptionInfo`; it should remain explicitly non-canonical.
- There is no deterministic checked-in `fixtures/kiosk/` suite yet, so kiosk replay, malformed JWK, mirrored metadata, and no-plaintext-leakage assertions are not all independently vectorized.
- Production key custody, creator-key trust, request-opening key distribution, desktop private-key lifecycle, and issuer/reader trust anchors remain deployment-profile work.

### Open issues

1. Define production key-custody and trust-anchor policy for kiosk creator signing keys, request-opening keys, desktop response keys, readerAuth certificates, and issuer/MSO anchors.
2. Decide exact conformance behavior for mirrored envelope metadata mismatches beyond `requestId` and for P-256 public JWK shape restrictions, including rejection of private `d` members in public metadata.
3. Add deterministic kiosk fixture vectors for request JWS, encrypted request envelope, pointer parsing, response submission, duplicate/replay handling, and plaintext-leakage checks.
4. Decide how Completion displays receive or preserve §8 validation evidence when the phone-local Verifier submits only the active `smartResponse` wrapper.
5. Align §12 privacy text with metadata leakage called out here, especially pointer ids, provider rows, storage paths, debug panels, telemetry, and retention.

### Downstream dependencies

- T5.C privacy should reuse the metadata-minimization and QR side-channel analysis without redefining cryptographic validation.
- T5.F conformance checklist should include security-relevant SHALL/SHOULD rows already present in §§7-9 and only add rows from §11 where they are true cross-cutting conformance targets.
- T6 examples and fixture alignment should clearly mark demo keys as intentionally public test material and avoid promoting historical same-device captures as kiosk vectors.
- §15 implementation guidance can contain platform-specific Android/iOS/browser advice; §11 should remain at the protocol-threat and validation-boundary level.
