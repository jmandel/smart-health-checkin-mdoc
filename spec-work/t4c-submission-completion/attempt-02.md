### 9.8 Submission ciphertext from phone to desktop

This subsection defines the return leg after the Phone presenter has resolved and validated the kiosk request under §9.7, has re-entered the same-device `org-iso-mdoc` flow under §8, and has obtained a SMART response or credential-completion result that is acceptable for kiosk return. It does not redefine the SMART response model in §6, the same-device response construction in §8, or the kiosk request and pointer rules in §§9.1-9.7.

The response-submission artifact is a kiosk wrapper artifact. It is distinct from:

- the §8 HPKE-encrypted `DeviceResponse` returned by the Wallet/Responder to the phone-local Verifier;
- the §9.5 `EncryptedKioskRequest` request envelope;
- the transport-neutral `SmartHealthCheckinResponse`; and
- any provider row, storage object, or completion display state.

A Phone presenter that submits a successful kiosk result SHALL construct a `SubmissionPlaintext` JSON object with this logical shape:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "submittedAt": 1760000060000,
  "payload": {
    "kind": "smart-health-checkin-response",
    "smartResponse": {
      "type": "smart-health-checkin-response",
      "version": "1",
      "requestId": "<smartRequest.id>",
      "artifacts": [],
      "requestStatus": []
    }
  }
}
```

`SubmissionPlaintext.requestId` is the kiosk wrapper `KioskRequestPayload.requestId` validated under §9.7. It is not the clinical SMART request id. The enclosed `payload.smartResponse.requestId`, when the active success payload kind is used, remains the §6 clinical response binding to `KioskRequestPayload.smartRequest.id`.

`submittedAt` is a JSON number containing the Phone presenter's submission time in milliseconds since the Unix epoch for the active version 1 profile. It is routing and audit metadata. A Completion display SHALL NOT treat `submittedAt` by itself as proof of request freshness, patient presence, Holder consent, or clinical-source provenance.

The `payload` member carries the completion payload for the selected kiosk submission profile. For the active success profile, `payload.kind` is `"smart-health-checkin-response"` and `payload.smartResponse` is the SMART response extracted from the completed §8 presentation. A Phone presenter SHALL NOT place a second clinical request language, request profile wrapper, demo preset, raw FHIR shortcut, or provider-specific row state in `payload` as a substitute for the SMART response. A Phone presenter that supports a profile carrying a richer credential completion object MAY include additional completion evidence only when that profile defines how the Completion display validates it under §8 and §7.

Before encryption, a Phone presenter SHALL serialize `SubmissionPlaintext` as UTF-8 JSON. The active implementation uses the same deterministic key-sorted JSON function used for kiosk JWS payloads when measuring and encrypting the submission plaintext. A deployment profile MAY require deterministic serialization for byte-for-byte fixtures, but the clinical SMART response semantics remain the JSON object semantics defined in §6.

A Phone presenter SHALL enforce the signed `KioskRequestPayload.constraints.maxPlaintextBytes` before encrypting or submitting the plaintext. The byte count is the length in octets of the UTF-8 submission plaintext serialization. A Phone presenter SHOULD also enforce its own implementation maximum and reject a signed maximum it cannot safely enforce. The active implementation sets `maxPlaintextBytes` to 25 MiB and also rejects encrypted blobs larger than `maxPlaintextBytes + 1024` bytes; those numeric values are active implementation limits, not universal clinical-model limits unless adopted by a deployment profile or conformance class.

A Phone presenter SHALL encrypt `SubmissionPlaintext` to `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` using the response-submission suite labeled:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite:

- the Phone presenter generates a fresh ephemeral ECDH P-256 key pair for each submission;
- the recipient public key is `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` from the verified signed kiosk request payload;
- the ECDH shared secret is input to HKDF with SHA-256;
- the HKDF salt is `utf8(KioskRequestPayload.requestId)`;
- the HKDF `info` string is `utf8("smart-health-checkin-kiosk-response-v1")`;
- the derived content-encryption key is AES-GCM with a 256-bit key;
- the AES-GCM IV is 96 bits and fresh for the submission;
- AES-GCM additional authenticated data is `utf8(KioskRequestPayload.requestId)`; and
- the plaintext is the UTF-8 JSON serialization of `SubmissionPlaintext`.

The encrypted submission payload has this logical shape before provider-specific storage:

```json
{
  "iv": "<base64url-96-bit-iv>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." },
  "ciphertext": "<ciphertext-bytes-or-provider-blob>"
}
```

The active provider stores `iv` and `phoneEphemeralPublicKeyJwk` on the submission row and stores the AES-GCM ciphertext bytes as a provider blob. The ciphertext bytes include the AES-GCM authentication tag. A provider MAY expose the ciphertext as a blob, byte array, object-storage file, or equivalent opaque object, but it SHALL NOT require plaintext SMART response content in order to route or notify about the submission.

This version does not require a separate provider-visible SHA-256 attestation field for the ciphertext blob. AES-GCM authentication, with `requestId` as AAD and with the signed desktop public key as recipient metadata, provides the cryptographic integrity check for the encrypted submission. A provider or deployment profile MAY store a SHA-256 digest of the ciphertext blob for download retry diagnostics or storage-integrity checks, but a Completion display SHALL NOT treat such a digest from the untrusted provider as clinical trust, Holder consent, or a substitute for decryption and validation.

### 9.9 Desktop completion processing

The Completion display is the kiosk-side or desktop component that learns that encrypted submission state exists for the kiosk wrapper request, obtains the ciphertext, opens it using the desktop private key generated during §9.4 request creation, validates the returned content, and presents completion state to the local workflow.

A Completion display SHALL retain the desktop private key corresponding to `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` only for the active kiosk session or for the minimum retention window required by the deployment. A Completion display SHALL keep that private key out of the Submission service's control when the Submission service is treated as an untrusted relay. Demo pages that display or serialize desktop private key material for development inspection are not production key-management patterns.

A Completion display SHALL watch, subscribe, poll, or otherwise read provider submission rows scoped to the kiosk wrapper `requestId`. For the active provider row shape, a submission row is equivalent to:

```json
{
  "id": "<provider-row-id>",
  "submissionId": "<submission-id>",
  "requestId": "<kiosk-wrapper-requestId>",
  "iv": "<base64url-96-bit-iv>",
  "storagePath": "submissions/<requestId>/<submissionId>.bin",
  "storageFileId": "<provider-file-id>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

The row shape is provider metadata. A Completion display SHALL NOT treat the provider row, `submissionId`, `storagePath`, `storageFileId`, timestamps, provider application id, provider ACL decision, or provider notification as clinical trust or as proof that the submission is valid.

For each candidate row, a Completion display SHALL perform at least these steps before workflow use:

1. confirm that the row `requestId` exactly equals the kiosk wrapper `requestId` for the active session;
2. reject rows whose provider-defined storage locator is inconsistent with the row or selected provider profile, when that profile defines such a consistency check;
3. download the ciphertext blob or equivalent opaque encrypted bytes;
4. enforce an implementation and deployment maximum on ciphertext bytes before decryption;
5. import `phoneEphemeralPublicKeyJwk` as a P-256 ECDH public key acceptable for the response-submission suite;
6. derive the AES-256-GCM key using ECDH with the retained desktop private key, HKDF-SHA-256 with `salt = utf8(requestId)`, and `info = utf8("smart-health-checkin-kiosk-response-v1")`;
7. decrypt with AES-GCM using the row `iv` and `additionalData = utf8(requestId)`;
8. parse the plaintext as UTF-8 JSON and validate it as `SubmissionPlaintext`;
9. require `SubmissionPlaintext.requestId` to exactly equal the kiosk wrapper `requestId`; and
10. validate and consume `SubmissionPlaintext.payload` according to the selected payload profile.

When the active success payload kind is used, the Completion display SHALL require `payload.kind` to equal `"smart-health-checkin-response"`, SHALL require `payload.smartResponse` to be a JSON object, SHALL validate it as a `SmartHealthCheckinResponse` under §6, and SHALL apply §6.6 cross-validation against the original `KioskRequestPayload.smartRequest` before accepting the response for Requester use. In particular, `payload.smartResponse.requestId` SHALL equal `KioskRequestPayload.smartRequest.id`; it SHALL NOT equal the kiosk wrapper `requestId` unless the Requester happened to choose the same string, which implementations SHOULD avoid.

A Completion display SHALL preserve the §7 trust-layer distinctions. Kiosk response-submission decryption proves that the ciphertext was encrypted to the signed desktop public key with knowledge of the response-submission ECDH shared secret and the wrapper `requestId` AAD. It does not by itself prove patient identity, Holder consent, clinical-source provenance, mdoc issuer trust, device-key proof, requester identity, or downstream EHR write-back authorization.

A Completion display or a trusted Verifier component acting for it SHALL ensure that §8 validation has been applied to the same-device credential completion before the returned SMART response is used in the workflow. If the submitted payload contains raw credential-completion evidence, the Completion display SHALL perform the §8.7 and §8.8 validation steps itself. If the submitted payload contains only the active demo-style `smartResponse` wrapper, the deployment SHALL treat the Phone presenter as the phone-local Verifier that already opened and validated the §8 response, and the Completion display SHALL still perform §6 and §6.6 validation locally before use. A provider row or storage object SHALL NOT be used as evidence that §8 validation succeeded.

A Completion display SHALL fail safely and avoid workflow completion when decryption fails, the plaintext cannot be parsed, the wrapper `requestId` check fails, the payload kind is unsupported, SMART response validation fails, §6.6 cross-validation fails, required §8 or §7 evidence is absent for the deployment's assurance target, or local replay/expiration policy rejects the row.

### 9.10 Replay, expiration, and abuse considerations

Replay and abuse controls span the Kiosk creator, Phone presenter, Submission service, and Completion display. The cryptographic bindings in §§9.3, 9.5, and 9.8 are necessary but not sufficient operational controls.

A Kiosk creator SHALL set `KioskRequestPayload.expiresAt` to a time later than `createdAt` and SHOULD use a short lifetime suitable for an in-person kiosk session. The active implementation uses ten minutes. A Phone presenter SHALL reject expired kiosk requests before Wallet invocation under §9.7. A Completion display SHOULD reject newly observed submissions for a kiosk request after the request's expiration plus a deployment-defined grace period for upload and provider notification latency.

A Kiosk creator SHOULD stop displaying the Pointer URL after successful completion, expiration, abandonment, or local cancellation. A stale QR code remains a bearer locator for encrypted request state even when the relay does not expose plaintext clinical content.

A Completion display SHOULD treat a kiosk wrapper request as single-use for workflow completion. After accepting one valid submission, it SHOULD mark the local kiosk session complete and ignore, quarantine, or require manual review for later submissions with the same wrapper `requestId`. A Submission service MAY enforce single-submission rows, first-writer-wins, row state transitions, or cleanup policies, but a Completion display SHALL NOT rely solely on the untrusted provider to prevent duplicate or replayed submissions.

If multiple candidate submissions are observed before completion, a Completion display SHOULD process them deterministically under deployment policy, for example by accepting the first valid decrypted submission and quarantining the rest, or by requiring staff review. It SHALL NOT merge Artifacts or status rows from multiple submissions as if they were one SMART response unless a future profile explicitly defines such aggregation.

The wrapper `requestId` SHOULD be high entropy and unguessable for the request lifetime. Pointer guessing, row enumeration, and storage-path guessing are provider-abuse risks even though request and response plaintext are encrypted. A Submission service SHOULD apply rate limits, anti-enumeration controls, authorization rules, request-id scoped storage rules, and coarse expiration checks. These controls are defense in depth; cryptographic validation and local completion validation remain required.

The Phone presenter, Submission service, and Completion display SHALL enforce size limits before accepting, encrypting, storing, downloading, parsing, or rendering large submissions. The active implementation enforces `constraints.maxPlaintextBytes` before encryption and a larger ciphertext blob guard before upload/download. Deployments SHOULD choose limits that account for expected SMART Health Card and FHIR Bundle sizes, browser memory limits, storage quotas, denial-of-service risk, and clinical workflow needs.

A Submission service SHOULD clean up request rows, submission rows, and encrypted blobs after expiration, completion, abandonment, or a deployment-defined retention period. A Kiosk creator and Completion display SHOULD clean up local private keys, decrypted submissions, transient SMART responses, QR state, and debug artifacts when no longer needed for the active workflow. Retention needed for audit, troubleshooting, or legal obligations is deployment policy and SHOULD minimize plaintext and sensitive metadata.

Provider logs, analytics, database indexes, object-storage names, error messages, and debug screens SHOULD minimize sensitive metadata. Values such as wrapper `requestId`, submission id, storage path, provider app id, key ids, timestamps, IP addresses, user agents, QR display time, row counts, and retry behavior can be correlating even when clinical content remains encrypted. Components SHOULD NOT log decrypted SMART responses, raw FHIR content, SMART Health Cards, private keys, shared secrets, access tokens, or full ciphertext blobs except under controlled diagnostic procedures.

A Phone presenter SHOULD report Holder cancellation, Wallet unavailability, same-device failure, and submission failure in a way that helps the Holder recover without exposing sensitive diagnostics. This core version defines successful encrypted submission. A future or deployment-specific profile MAY define encrypted failure-status submission, but it SHALL preserve the untrusted-relay and metadata-minimization properties of this section.

### 9.11 Provider abstraction

The Submission service/provider abstraction is intentionally narrow. It stores or serves opaque encrypted request and submission state and notifies interested components that state exists. It is not a clinical Requester, Verifier, Wallet, issuer, or trust anchor.

An application-side provider adapter used for the active kiosk flow SHALL provide capabilities equivalent to the following interface. The interface is shown at the adapter boundary; a remote Submission service behind the adapter does not receive plaintext unless it is also inside the trusted application boundary:

```ts
type KioskTransportProvider = {
  name: string;
  appId: string;
  configured: boolean;
  writeRequest(input: {
    payload: KioskRequestPayload;
    encryptedRequest: EncryptedKioskRequest;
  }): Promise<KioskRequestRow>;
  readRequest(requestId: string): Promise<KioskRequestRow>;
  writeSubmission(input: {
    request: VerifiedKioskRequest;
    plaintext: SubmissionPlaintext;
    encrypted: EncryptedPayload;
    totalPlaintextBytes: number;
  }): Promise<KioskSubmissionRow>;
  downloadSubmissionBlob(row: KioskSubmissionRow): Promise<Uint8Array>;
  observeSubmissionRows(requestId: string): KioskSubmissionRows;
};
```

The names above reflect the active implementation. A conforming provider adapter MAY use different programming-language names, callbacks, polling, webhooks, queues, storage APIs, or database concepts, provided it offers equivalent protocol behavior. When the adapter receives `plaintext` or `totalPlaintextBytes`, it uses them only for local consistency and size checks before writing encrypted state; the untrusted remote provider capability is the storage and notification of opaque encrypted objects.

A Submission service/provider SHALL support writing and reading an encrypted kiosk request by wrapper `requestId` or by an equivalent lookup key bound to that `requestId`. A Submission service/provider SHALL support writing an encrypted submission row and downloading the associated ciphertext blob or equivalent encrypted bytes. A Submission service/provider SHALL support observing, subscribing to, polling for, or listing submission rows scoped to a wrapper `requestId` so that a Completion display can learn that a candidate submission exists.

A Submission service/provider SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext SMART responses, raw FHIR resources, SMART Health Cards, §8 `DeviceResponse` plaintext, private keys, or shared secrets in order to provide these remote capabilities. A provider MAY receive signed or encrypted wrapper metadata, opaque ciphertext, row ids, storage locators, public ephemeral keys, IVs, content types, sizes, timestamps, and provider-local state needed to route and store opaque objects.

A provider MAY enforce row-shape validation, request-id scoped access rules, object-size limits, rate limits, anti-enumeration controls, expiration, cleanup, and abuse controls. Those controls improve deployment safety but do not make the provider trusted with clinical content or clinical validation decisions.

The active implementation uses InstantDB rows and Instant Storage as one provider example. The active request row stores `requestId` and `encryptedRequest`. The active submission row stores `submissionId`, `requestId`, `iv`, `storagePath`, `storageFileId`, and `phoneEphemeralPublicKeyJwk`, with ciphertext bytes stored as an `application/octet-stream` blob under `submissions/<requestId>/<submissionId>.bin`. These InstantDB details are not universal protocol requirements.

A provider profile SHOULD define whether submission observation is push-based, polling-based, webhook-based, local-first, eventually consistent, or transactional; how row and blob writes become visible; what retry and idempotency behavior is expected; what storage-path consistency checks apply; how errors are reported without leaking enumeration clues; and what cleanup behavior applies after expiration or completion.

### 9.12 End-to-end kiosk example

This example is illustrative. It ties together §§9.1-9.11 without defining byte fixtures, CDDL, provider-specific schemas, production trust anchors, or required clinical content.

1. A clinic kiosk acts as Kiosk creator, Requester, Verifier, and Completion display for one check-in session. It constructs this SMART request:

   ```json
   {
     "type": "smart-health-checkin-request",
     "version": "1",
     "id": "clinic-checkin-2025-10-09-001",
     "purpose": "Clinic check-in",
     "fhirVersions": ["4.0.1"],
     "items": [
       {
         "id": "patient-demographics",
         "title": "Patient demographics",
         "summary": "Demographics for today’s visit.",
         "content": {
           "kind": "fhir.resources",
           "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
           "resourceTypes": ["Patient"]
         },
         "accept": ["application/fhir+json"]
       },
       {
         "id": "coverage",
         "title": "Insurance coverage",
         "summary": "Coverage information for billing.",
         "content": {
           "kind": "fhir.resources",
           "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
           "resourceTypes": ["Coverage"]
         },
         "accept": ["application/fhir+json"]
       }
     ]
   }
   ```

2. The Kiosk creator generates a fresh wrapper `requestId`, generates a desktop P-256 ECDH key pair for response submission, embeds the SMART request directly as `smartRequest` in `KioskRequestPayload`, signs the payload as the kiosk request JWS, encrypts that JWS as `EncryptedKioskRequest`, writes the encrypted request through the provider, and displays only a Pointer URL such as:

   ```text
   https://clinic.example/verifier/submit.html#r=<kiosk-wrapper-requestId>
   ```

3. The Holder scans the QR code with a phone. The Phone presenter parses `#r`, reads the encrypted request row, binds the pointer, row, envelope, and signed payload `requestId` values, opens the request envelope, verifies the creator JWS, validates the embedded `smartRequest`, and confirms expiration and provider binding under §9.7.

4. The Phone presenter constructs a fresh §8 same-device `org-iso-mdoc` request on the phone using the validated embedded `smartRequest`. The Wallet/Responder presents the requested items for Holder review and returns a SMART response through the phone-local same-device flow.

5. After successful §8 processing, the Phone presenter constructs `SubmissionPlaintext` using the wrapper `requestId`, the current `submittedAt` time, and a payload containing the validated SMART response. It enforces the signed `constraints.maxPlaintextBytes`, encrypts the plaintext to `encryptResponseTo.desktopPublicKeyJwk` using the §9.8 response-submission suite, uploads the ciphertext blob, and writes a submission row containing only routing and decryption metadata.

6. The Completion display observes a submission row for the wrapper `requestId`, downloads the ciphertext blob, decrypts it with the retained desktop private key, verifies that the plaintext wrapper `requestId` matches the active kiosk session, validates the enclosed SMART response under §6, applies §6.6 cross-validation against the original `smartRequest`, ensures the required §8 and §7 validation evidence for the deployment has been applied, and only then marks the kiosk check-in complete for local workflow purposes.

The example deliberately omits kiosk CDDL, byte vectors, real ciphertexts, fixed keys, provider credentials, and fixture URLs. Those belong to T4.D and later fixture sections.

### Organizer notes

**Strengths.** This draft keeps the kiosk return leg as a wrapper around the already-defined SMART response and same-device flow. It uses active field names (`SubmissionPlaintext`, `EncryptedPayload`, `storagePath`, `phoneEphemeralPublicKeyJwk`) and the active ECDH/HKDF/AES-GCM parameters while preserving the untrusted-relay model.

**Caveats.** Active demo submission payloads carry only `{ kind: "smart-health-checkin-response", smartResponse }` after phone-local validation, so the desktop cannot independently replay all §8 validation unless richer completion evidence is submitted or retained by a trusted Verifier component. The draft calls this out as a deployment assurance choice rather than pretending the provider row proves §8 success.

**Open issues.** Conformance closure should decide whether to standardize a richer credential-completion payload, a ciphertext SHA-256 row field, exact duplicate-submission behavior, concrete TTL/grace windows, and universal size ceilings. Security/privacy sections should revisit desktop private-key retention, demo key exposure, row metadata leakage, storage cleanup, and phone-to-desktop failure reporting.

**Downstream dependencies.** T4.D should derive kiosk CDDL and fixtures from the field names and response-submission crypto here, without adding clinical semantics. Appendix A should split the SHALL/SHOULD requirements by Phone presenter, Completion display, Submission service/provider, Kiosk creator, and Requester/Verifier. T6 examples can reuse the §9.12 flow but should not introduce IPS shortcuts, request-profile wrappers, or “all of the above” selectors.
