## 11. Security considerations

This section reviews the security properties of the version 1.0 flows defined in §§7-9. It does not define a new transport, a new clinical request model, or a platform-specific implementation profile. The conformance targets named here are the roles that already perform the relevant processing: Verifier, Wallet/Responder, Kiosk creator, Phone presenter, Submission service, Completion display, Requester, and deployment profile.

Security claims in SMART Health Check-in are layered. Origin evidence, optional reader authentication, mdoc issuer/device evidence, SMART response validation, SMART Health Card signatures, raw-FHIR provenance, kiosk creator signatures, kiosk request encryption, kiosk response-submission encryption, provider controls, and downstream clinical policy are separate controls. Implementations SHALL NOT describe one successful control as proof that another control succeeded unless the relevant section or deployment profile explicitly defines that assurance relationship.

### 11.1 End-to-end encryption requirements

The same-device flow and kiosk wrapper use different encryption contexts for different plaintexts. They are complementary and MUST NOT be conflated.

In the base same-device §8 flow, the Wallet/Responder encrypts the CBOR `DeviceResponse` to the Verifier's HPKE recipient public key from `encryptionInfo`. The required core suite is DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM. The HPKE `info` value is the exact §8 `SessionTranscript` bytes, and the HPKE AAD is the empty byte string. A Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, or a response encrypted with a different suite for the core version 1.0 same-device flow.

In the kiosk request-publication leg, the Kiosk creator encrypts the compact kiosk request JWS, not the raw `smartRequest` alone and not an unsigned payload, using the custom wrapper suite labeled `ECDH-P256+HKDF-SHA256+AES-GCM`: P-256 ECDH, HKDF-SHA-256, AES-256-GCM, `salt = utf8(requestId)`, `info = utf8("smart-health-checkin-kiosk-request-v1")`, a fresh 96-bit IV, and AES-GCM AAD `utf8(requestId)`. A conforming untrusted-relay deployment SHALL NOT require the Submission service to possess request-opening private key material merely to store or serve encrypted request state.

In the kiosk response-submission leg, the Phone presenter encrypts `SubmissionPlaintext` to the signed `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` using the same custom primitive composition with `info = utf8("smart-health-checkin-kiosk-response-v1")`, wrapper `requestId` as salt and AAD, a fresh 96-bit IV, and a fresh phone ephemeral P-256 key. The Phone presenter SHALL NOT reuse §8 HPKE recipient keys, §8 `SessionTranscript`, request-envelope keys, provider-row keys, Pointer URL values, or unauthenticated page state as response-submission encryption inputs.

A Completion display SHALL decrypt response submissions locally with the desktop private key corresponding to the signed desktop public key. A Submission service SHALL NOT require plaintext SMART requests, plaintext SMART responses, raw FHIR content, SMART Health Cards, §8 response plaintext, Holder choices, Wallet secrets, desktop private keys, request-opening private keys, or shared secrets to route, notify, store, or return kiosk state.

Checked-in demo keys, browser-delivered demo private keys, self-signed demo reader certificates, and fixture private keys are test material only when explicitly marked as such. They are not production key-custody patterns, production trust anchors, or evidence that relay-side plaintext access is acceptable in a production deployment. A deployment profile that claims production security SHOULD define custody, rotation, revocation, backup, compromise response, and retention requirements for creator signing keys, request-opening keys, desktop response keys, §8 HPKE recipient keys, and reader/issuer trust anchors.

### 11.2 Replay and freshness

`SmartHealthCheckinResponse.requestId` binds the SMART response to the SMART request `id` under §6.6. That exact match is necessary, but it is not a freshness proof, patient identity proof, requester identity proof, or authorization proof.

For the same-device flow, freshness comes from the selected presentation session: fresh unpredictable `encryptionInfo.nonce` bytes, the Verifier's retained HPKE recipient key material, the exact `encryptionInfo` base64url string, the platform-provided origin or deployment-approved origin-equivalent, the resulting `SessionTranscript`, optional `readerAuth` bound to that transcript and exact tag-24 `ItemsRequest`, and device authentication bound to the same transcript. A Verifier SHOULD use a fresh HPKE recipient key pair per presentation session. A deployment profile that permits HPKE recipient-key reuse SHALL define replay, correlation, retention, and key-compromise handling.

For kiosk request pickup, the Phone presenter SHALL enforce the pointer/envelope/payload `requestId` bindings and the signed `createdAt` / `expiresAt` checks defined in §9.7 before invoking the Wallet. A Kiosk creator SHOULD use short lifetimes suitable for in-person check-in and SHOULD stop displaying or refresh a Pointer URL after expiration, abandonment, cancellation, or successful completion.

For kiosk response submission, the Completion display SHALL bind candidate rows to the active wrapper `requestId`, decrypt with AES-GCM AAD `utf8(requestId)`, compare decrypted `SubmissionPlaintext.requestId` to the active wrapper id, validate the inner SMART response against `smartRequest.id`, and apply the required §6, §7, §8, and §9 checks before workflow use. These checks prevent many cross-session swaps, but they do not prevent replay of the same valid ciphertext for the same active wrapper id. Production deployments SHOULD treat successful kiosk sessions as single-use, reject or quarantine duplicate submissions, and define clock-skew windows, maximum lifetimes, grace periods, retry behavior, and cleanup.

A Submission service MAY add rate limits, access-control checks, row immutability, first-writer-wins behavior, compare-and-set state, cleanup, and anti-enumeration controls as defense in depth. Those controls SHALL NOT replace Verifier, Phone presenter, or Completion display cryptographic validation and SHALL NOT require relay access to plaintext clinical content.

### 11.3 Origin spoofing and UI redress

Origin evidence is supplied by the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It is not supplied by the SMART request body, kiosk pointer, provider row, `purpose`, item `title`, item `summary`, selector URL, logo-looking extension, callback-looking string, package-looking string, or Artifact content.

A Wallet/Responder SHALL NOT display unauthenticated SMART request text as authenticated requester identity. When authenticated origin, privileged-caller context, trusted reader identity, kiosk creator identity, and unauthenticated display text are shown together, the Wallet/Responder or Phone presenter SHOULD visually distinguish those categories. If origin evidence is absent or reduced-assurance, the Wallet/Responder MAY reject the request, continue only under explicit reduced-assurance policy, require additional Holder confirmation, restrict content, or omit verified branding; it SHALL NOT silently substitute a self-asserted SMART request field for origin.

QR and kiosk UI surfaces are especially susceptible to redress. A Kiosk creator SHOULD display the Pointer URL only for the current active session, avoid overlay patterns that obscure origin or expiration state, and avoid wording that implies scanning is consent. A Phone presenter SHOULD show enough validated request context for Holder review without representing provider app ids, row ids, key ids, or pointer text as authenticated requester identity.

Active desktop demo code currently opens and displays decrypted submissions for demonstration; it does not establish a production display-validation model. A production Completion display SHOULD distinguish row observed, blob downloaded, decryption failed, SMART response invalid, §8 validation unavailable, response valid with declined/partial statuses, accepted for workflow, and imported into downstream systems. Public kiosk screens SHOULD avoid displaying sensitive clinical details unless local authorization and policy permit.

### 11.4 Reader impersonation

Core version 1.0 supports optional per-`DocRequest.readerAuth`. Deployments that need authenticated reader identity can require it, but the core profile permits unsigned reader requests when Wallet policy allows.

When present, `readerAuth` is detached `COSE_Sign1` with ES256 (`alg` `-7`), serialized payload `null`, empty external AAD, `ReaderAuthenticationBytes` over the §8 `SessionTranscript` and exact tag-24 `ItemsRequest`, and reader certificate evidence under COSE header label `33` (`x5chain`) with at least the leaf certificate. A Verifier that includes `readerAuth` SHALL compute it for the current session and request bytes and SHALL NOT reuse it across sessions, origins, encryption information, SMART request serializations, or requested element sets.

A Wallet/Responder that supports or relies on reader authentication SHALL distinguish absent `readerAuth`, syntactically invalid `readerAuth`, cryptographically failed `readerAuth`, cryptographically valid but untrusted or policy-unacceptable `readerAuth`, and trusted `readerAuth`. It SHALL NOT treat a certificate common name, a logo, a `kid`, a self-signed demo certificate, an included leaf certificate, or successful signature verification against an untrusted key as production reader trust without deployment-policy acceptance.

Successful reader authentication proves possession of the reader private key and binding to the session/request bytes accepted by the Wallet. It does not prove clinical authority, patient identity, clinical-source provenance, EHR write-back authorization, or downstream clinical appropriateness. A Wallet that proceeds after absent or failed reader authentication SHALL NOT present the reader as reader-authenticated.

### 11.5 Issuer trust pivots

Verifier processing in §8 requires HPKE opening, `DeviceResponse` parsing, MSO and `issuerAuth` validation, digest validation over the tag-24 `IssuerSignedItem`, device-signature verification, SMART response extraction, and §6.6 cross-validation. A Verifier SHALL keep these checks distinct from production issuer trust and clinical-source trust.

A syntactically valid MSO, matching value digest, valid signature against an included certificate, valid device key proof, successful HPKE open, origin binding, readerAuth validation, kiosk wrapper validation, or exact `requestId` match does not by itself prove production issuer accreditation, patient matching, clinical correctness, clinical-source provenance, downstream authorization, or EHR write-back permission.

A Verifier or deployment profile that claims production mdoc issuer trust SHALL define and apply accepted issuer trust anchors, registry entries, certificate constraints, status or revocation expectations where available, validity handling, and production-vs-test separation. Self-attested or demo mdoc evidence MAY be accepted only under an explicit assurance label and policy; it SHALL NOT be described as externally issuer-accredited production trust unless the applicable trust-anchor policy supports that claim.

For clinical content, a SMART Health Card Artifact carries signed clinical-source evidence inside `value.verifiableCredential[]`; each JWS needs SMART Health Cards verification and local trust-policy evaluation before source claims are relied on. Raw `application/fhir+json` Artifacts are patient-mediated unless the Artifact payload, extension profile, deployment profile, or accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof. Transport encryption, mdoc issuer signatures, device-key proof, readerAuth, origin evidence, kiosk wrapper signatures, and successful SMART response validation SHALL NOT be used to claim that unsigned raw FHIR JSON is an issuer-signed clinical credential.

### 11.6 Cryptographic agility

Version 1.0 deliberately fixes algorithm choices in the profile rather than negotiating them inside individual requests:

- same-device §8 HPKE: DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM;
- same-device COSE signatures: ES256 / `-7`;
- kiosk creator JWS: compact JWS with `alg = ES256` and `typ = smart-health-checkin+kiosk-request+jws`;
- kiosk request and response wrapper encryption: `ECDH-P256+HKDF-SHA256+AES-GCM` with AES-256-GCM, separate request/response HKDF info strings, and wrapper `requestId` as salt/AAD.

A conforming implementation SHALL reject unsupported algorithms for the profile it implements rather than silently downgrade, ignore algorithm labels, or substitute another suite. A future version, deployment profile, or registry entry can define new suites, but it needs explicit identifiers, field locations, validation rules, transcript or AAD rules, fixture updates, and downgrade prevention. Implementations SHOULD structure code so suite changes are profile-selected and testable, not inferred from attacker-controlled in-band strings.

Demo keys and fixture vectors are not cryptographic-agility mechanisms. They exercise current byte boundaries and should be refreshed, demoted, or reclassified when algorithms, deterministic encoding rules, nonce-size rules, certificate formats, or trust policies change.

### 11.7 Plaintext leakage

The protocol encrypts clinical payloads on the defined wire paths, but implementations can still leak plaintext or sensitive metadata through logs, crash reports, debug panels, browser storage, fixture bundles, analytics, screenshots, console output, support exports, database indexes, and error messages.

Requesters, Verifiers, Wallets/Responders, Kiosk creators, Phone presenters, Submission services, Completion displays, and providers SHOULD NOT log or persist plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, decrypted kiosk JWS payloads, `SubmissionPlaintext`, §8 `DeviceResponse` plaintext, §8 `dcapiResponse` plaintext after opening, private keys, shared secrets, provider credentials, access tokens, or full ciphertext blobs except under controlled diagnostic or fixture procedures.

Developer diagnostics that show decrypted submissions, signed payloads, provider rows, or technical details SHOULD be disabled, access-controlled, redacted, or clearly labeled in production. If fixtures intentionally include private test keys, demo certificates, decrypted payloads, or non-PHI sample data, fixture metadata SHOULD mark them as intentionally public test material and state that they unlock no production data. A fixture, crash bundle, or debug export containing live PHI, production private keys, bearer credentials, or unredacted clinical content is a security incident, not a conformance artifact.

Error messages SHOULD help a Holder or staff recover without revealing valid request-id enumeration clues, clinical content, decrypted payloads, stack traces, provider internals, key ids beyond what is necessary, or secrets. Logs and telemetry SHOULD minimize pointer values, wrapper request ids, submission ids, storage paths, timestamps, IP addresses, user agents, row counts, retry behavior, and access patterns because these can reveal check-in activity even when content remains encrypted.

### 11.8 Kiosk relay treated as honest-but-curious / untrusted relay

The kiosk Submission service is an untrusted relay for protocol security purposes. It can store, serve, notify, rate-limit, clean up, and route opaque state. It is not a clinical Requester, Verifier, Wallet, issuer, reader, trust anchor, clinical-source provenance service, Holder-consent signal, patient-identity signal, or downstream authorization signal.

A provider used for the active kiosk flow SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder decisions, §8 response plaintext, desktop private keys, Wallet secrets, request-opening private key material, or shared secrets merely to route or store kiosk state. Provider access control, row rules, blob permissions, upload/download status, row order, provider app id, storage path, and subscription events are defense-in-depth and operational signals only.

The Completion display and Phone presenter SHALL perform their own cryptographic and semantic validation even when the provider authenticates users or enforces row rules. The Completion display SHALL NOT treat provider notification as completion and SHALL NOT treat provider acceptance of a row/blob as SMART response validity, Holder consent, clinical-source provenance, mdoc issuer/device trust, or downstream authorization.

Active demo code currently uses browser-delivered request-opening private key material and demo key registries to support a static demo. That pattern is not a production policy. A production deployment needs a key-custody design in which an untrusted provider cannot decrypt request envelopes or response submissions merely by operating the relay.

### 11.9 Side-channel and metadata leakage on QR

The active Pointer URL is pointer-only: it carries URL routing information and fragment parameter `r=<requestId>`. It SHALL NOT contain the plaintext `smartRequest`, FHIR resources, SMART Health Cards, Questionnaire answers, compact kiosk request JWS, `EncryptedKioskRequest`, §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, §8 HPKE ciphertext, Wallet `DeviceResponse`, SMART response, response-submission ciphertext, storage blob, private keys, bearer credentials, or trust assertions intended to bypass §7/§8 validation.

Pointer-only does not mean metadata-free. The URL host/path, wrapper `requestId`, QR image, display time, provider app id, key ids, created/expiry times, scan timing, IP addresses, user agents, browser history, screenshots, local scripts, analytics, and camera observers can reveal that a check-in interaction is occurring and can support correlation. The fragment form reduces routine server-log exposure to the phone page origin, but fragments can still be visible to the browser, local JavaScript, screenshots, shoulder-surfers, analytics scripts, and copied URLs.

A Kiosk creator SHOULD generate high-entropy wrapper `requestId` values, keep Pointer URLs short for reliable scanning, display or refresh QR codes only for active sessions, and stop displaying stale QR codes after expiration, abandonment, cancellation, or completion. Phone presenters, Submission services, and Completion displays SHOULD apply anti-enumeration controls, rate limits, short lifetimes, cleanup, and metadata minimization. A Holder scanning a QR code has only opened a locator; scanning is not Holder consent and is not authorization to disclose clinical content.

### 11.10 Wallet UX guarantees

Wallet UX is part of the security boundary because the Holder relies on it to understand what is being requested and what is being disclosed. A Wallet/Responder SHALL preserve Holder control at request-item granularity. The advisory `required: true` flag SHALL NOT be treated as consent and SHALL NOT prevent the Holder from declining, partially fulfilling, or otherwise controlling disclosure according to Wallet policy and applicable law.

A Wallet/Responder SHALL validate the SMART request before disclosure, preserve request item `id` values for `fulfills[]` and `requestStatus[]`, and construct a SMART response that accounts for every item exactly once under §6. Unsupported selectors, unavailable data, Holder refusal, partial sharing, and item-level processing errors are response outcomes when the request is otherwise valid enough to answer; they are not automatically transport failures.

A Wallet/Responder or Phone presenter MAY group, summarize, reorder, or suppress details for accessibility, safety, localization, local policy, or law, but it SHALL NOT misrepresent unauthenticated request display text as authenticated requester identity. It SHOULD distinguish authenticated origin, authenticated reader information, trusted creator information, local policy warnings, and unauthenticated `purpose` / item text when those are shown.

When operating in reduced-assurance states, such as missing origin evidence, absent readerAuth where policy expected it, failed or untrusted readerAuth, demo issuer evidence, self-attested mdoc evidence, or unverifiable clinical-source provenance, the Wallet/Responder SHOULD use accurate labels and risk controls rather than silently normalizing the interaction. A Wallet/Responder SHALL NOT claim that raw FHIR JSON is source-signed or production issuer-trusted merely because the mdoc transport, kiosk wrapper, or SMART response validation succeeded.

## Organizer notes

### Strengths

- The accepted T3/T4 flow gives strong separation of cryptographic contexts: §8 HPKE for mdoc `DeviceResponse`, kiosk request-envelope encryption for compact JWS pickup, and kiosk response-submission encryption for phone-to-desktop completion.
- The canonical text consistently separates clinical request/response semantics from origin, readerAuth, mdoc issuer/device proof, kiosk wrapper signatures, provider routing, and clinical-source provenance.
- Pointer-only QR design avoids putting clinical content, request wrappers, §8 artifacts, response ciphertexts, or secrets directly into the QR.
- The direct `org-iso-mdoc` decisions are crisp: request in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, stable response element `smart_health_checkin_response`, optional per-`DocRequest.readerAuth` with x5chain label `33`, direct `dcapi` `SessionTranscript`, and the fixed HPKE suite.

### Caveats

- Active kiosk code still uses demo issuer/audience strings and browser-delivered demo private keys for a static demo. This draft labels them non-production rather than inventing a production custody policy.
- Active TypeScript validation is looser than final conformance might need for some JWK, base64url, IV-length, duplicate-member, and mirrored metadata checks. This draft states the security expectation but leaves exact schema/vector closure to §13, Appendix A, and future fixture profiles.
- Active desktop demo display opens submissions for review but does not independently prove a complete production validation workflow. This draft requires validation before clinical workflow use and calls out the display-validation gap.
- No deterministic checked-in kiosk fixture suite exists today. Same-device fixtures are useful prerequisites but do not exercise the §9 JWS/envelope/pointer/submission wrapper end to end.

### Open issues

- Production key custody and rotation for creator signing keys, request-opening keys, desktop response keys, reader certificates, and issuer anchors remain deployment-profile / §13 work.
- Core conformance still needs decisions on authenticated-origin requirements, nonce-size profiles, duplicate document/element/member handling, deterministic encoding for vectors, clock-skew windows, TTLs, entropy minima, and whether any kiosk mirrored metadata mismatches are mandatory failures.
- A future kiosk fixture suite should include positive and negative vectors for deterministic JWS input, request-envelope encryption, pointer parsing, request-id binding, response-submission encryption, replay/duplicate behavior, size limits, no-plaintext-leakage checks, and cross-boundary crypto misuse.
- Privacy §12 should expand metadata-retention, telemetry, public-screen, browser-history, screenshot, and relay-correlation risks without changing the security flow.

### Downstream dependencies

- T5.A and Appendix A should turn the security requirements above into one-row-per-rule conformance entries with explicit targets.
- T5.C should reuse the plaintext and metadata leakage analysis for privacy requirements.
- T5.D should register or freeze the algorithm labels, JWS `typ`, content type, payload-kind values, provider profile identifiers, and any conformance-profile parameters that become stable.
- T6.C / Appendix D should decide whether to request a human-assisted refreshed kiosk capture and whether to promote a future `fixtures/kiosk/` suite to conformance-vector status.
