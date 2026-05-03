### 9.8 Submission ciphertext from phone to desktop

This subsection defines the return leg after the Phone presenter has completed §9.7 and has obtained a SMART Health Check-in response or other completion result through the phone-local §8 flow. It defines only the kiosk response-submission wrapper. It does not redefine the SMART response model in §6, the trust interpretation in §7, the same-device `org-iso-mdoc` flow in §8, or kiosk request creation and pointer resolution in §§9.1-9.7.

The response-submission ciphertext is a kiosk wrapper artifact. It is distinct from the §8 HPKE ciphertext returned by the Wallet/Responder, distinct from the §9.5 `EncryptedKioskRequest`, and distinct from the transport-neutral `SmartHealthCheckinResponse`. The Submission service or provider routes opaque submission state and ciphertext; it is not trusted with plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder decisions, Wallet secrets, or clinical trust decisions.

#### 9.8.1 `SubmissionPlaintext` shape

For the active successful SMART-response completion profile, the Phone presenter SHALL construct a UTF-8 JSON plaintext object with this logical shape before encryption:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "submittedAt": 1760000000000,
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

A Phone presenter SHALL set `SubmissionPlaintext.requestId` to the kiosk wrapper `KioskRequestPayload.requestId` validated under §9.7. It SHALL NOT set this member to `KioskRequestPayload.smartRequest.id`, `SmartHealthCheckinResponse.requestId`, a provider row id, a storage path, a patient identifier, or a §8 presentation-session identifier.

A Phone presenter SHALL set `submittedAt` to a JSON number containing the submission time in milliseconds since the Unix epoch. `submittedAt` is phone-supplied metadata for display, sorting, duplicate diagnostics, audit correlation, or deployment freshness policy. It is not, by itself, proof of Holder consent, patient identity, clinical freshness, response validity, or clinical-source provenance.

For the active successful payload, `payload.kind` SHALL be the exact string `"smart-health-checkin-response"`, and `payload.smartResponse` SHALL be a `SmartHealthCheckinResponse` as defined in §6. The inner SMART response remains the clinical response object: its `requestId` binds to `KioskRequestPayload.smartRequest.id`, not to the wrapper `requestId`.

A Phone presenter SHALL NOT include plaintext §8 `DeviceResponse` CBOR, Digital Credentials API `dcapiResponse`, §8 HPKE `enc` or `cipherText`, §8 `deviceRequest`, §8 `encryptionInfo`, request-opening private keys, desktop private keys, Wallet secrets, provider credentials, or unrelated diagnostics in the active `SubmissionPlaintext.payload`. A deployment profile MAY define additional completion payload kinds or validation-evidence payloads only if they preserve §6, §7, §8, and §9 validation semantics and do not require the untrusted provider to receive plaintext clinical content.

#### 9.8.2 Size enforcement

A Phone presenter SHALL serialize `SubmissionPlaintext` as UTF-8 JSON before response-submission encryption and SHALL enforce the signed `KioskRequestPayload.constraints.maxPlaintextBytes` limit over the exact bytes it will encrypt. If the encoded plaintext exceeds that signed limit, the Phone presenter SHALL fail safely and SHALL NOT write a successful submission row or truncated ciphertext.

The active implementation uses deterministic key-sorted JSON for this byte count and encryption input: object member names are sorted lexicographically, `undefined` members are omitted, array order is preserved, and JSON stringification produces the UTF-8 input. This rule applies to the kiosk wrapper bytes for this profile; it does not define canonical JSON for the transport-neutral SMART response outside this wrapper.

An implementation MAY impose a stricter local maximum and SHOULD reject a signed limit it cannot safely enforce. The active prototype sets `constraints.maxPlaintextBytes` to 25 MiB and also rejects encrypted blobs larger than that plaintext maximum plus 1024 bytes. Those numbers are active implementation limits and useful deployment guidance; they are not a universal clinical data-model maximum unless adopted by a conformance profile or deployment policy.

#### 9.8.3 Response-submission encryption and row metadata

For version 1.0, a Phone presenter SHALL encrypt the `SubmissionPlaintext` UTF-8 JSON bytes to the `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` value from the verified signed kiosk request payload, using the response-submission suite labeled:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite:

- the Phone presenter generates a fresh ephemeral ECDH P-256 key pair for each encrypted submission;
- the recipient public key is the signed `encryptResponseTo.desktopPublicKeyJwk` value;
- the ECDH shared secret is input to HKDF with SHA-256;
- the HKDF salt is `utf8(KioskRequestPayload.requestId)`;
- the HKDF `info` string is `utf8("smart-health-checkin-kiosk-response-v1")`;
- the derived content-encryption key is AES-GCM with a 256-bit key;
- the AES-GCM IV is 96 bits and fresh for the submission;
- AES-GCM additional authenticated data is `utf8(KioskRequestPayload.requestId)`; and
- the ciphertext bytes are the AES-GCM ciphertext including the authentication tag over the encoded `SubmissionPlaintext` bytes.

The Phone presenter SHALL use only the signed `encryptResponseTo` metadata from the verified kiosk request. It SHALL NOT treat `encryptResponseTo` as §8 `encryptionInfo`, SHALL NOT reuse the §8 HPKE recipient key or `SessionTranscript`, SHALL NOT use the §9.3 request-envelope recipient key for response submission, and SHALL NOT encrypt to a public key obtained only from an unauthenticated provider row, Pointer URL, or page state.

The Phone presenter SHALL make available to the Completion display the ciphertext bytes, IV, and phone ephemeral public JWK. In the active provider row shape, ciphertext bytes are stored as an opaque `application/octet-stream` blob and the row is equivalent to:

```json
{
  "submissionId": "<provider-submission-id>",
  "requestId": "<kiosk-wrapper-requestId>",
  "storagePath": "submissions/<requestId>/<submissionId>.bin",
  "storageFileId": "<provider-file-id>",
  "iv": "<base64url-96-bit-iv>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

The provider row and storage locator are routing metadata. They are not clinical trust evidence. A provider profile MAY add a digest or storage-integrity hint for operational diagnostics, retries, or fixture review, but the active row does not require a SHA-256 attestation field. Any such digest SHALL NOT replace AES-GCM authentication, decrypted `requestId` validation, §6 validation, §7 trust interpretation, or §8 validation.

A Submission service SHALL NOT require plaintext `SubmissionPlaintext`, plaintext `payload.smartResponse`, raw FHIR content, SMART Health Cards, Holder decisions, §8 response plaintext, or private key material in order to route, store, notify, or make available the encrypted submission.

### 9.9 Desktop completion processing

The Completion display is the kiosk-side or desktop component that observes encrypted submission state, downloads the ciphertext blob, decrypts it with the desktop private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk`, validates the result, and presents completion state to the local workflow.

#### 9.9.1 Observe provider submission rows

A Completion display SHALL retain the verified kiosk request payload, the original embedded `smartRequest`, and the desktop private key corresponding to `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` until completion, expiration, abandonment, or cleanup.

A Completion display SHALL subscribe, poll, query, or otherwise observe the selected provider for submission rows associated with the active kiosk wrapper `requestId`. It SHALL ignore or reject rows whose row-level `requestId` does not exactly equal the active wrapper `requestId`. When a selected provider profile defines a storage-locator convention, the Completion display SHOULD validate that convention before download; for the active provider shape, the expected path is `submissions/<requestId>/<submissionId>.bin`.

Provider notification is not completion. A Completion display SHALL NOT treat row presence, a storage path, a file id, a provider write status, an upload timestamp, provider authorization, provider app id, IP address, user agent, or subscription event order as proof of Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, response freshness, or downstream authorization.

#### 9.9.2 Download and decrypt locally

For each candidate row selected for processing, the Completion display SHALL download the referenced ciphertext blob or equivalent encrypted bytes through the provider's blob-download capability. It SHALL enforce implementation and deployment size limits before allocating unbounded memory, parsing provider metadata, or attempting decryption.

The Completion display SHALL decrypt using the response-submission construction from §9.8.3:

```text
ECDH P-256 shared secret = ECDH(desktop private key, row.phoneEphemeralPublicKeyJwk)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(row.iv)
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = SubmissionPlaintext UTF-8 JSON bytes
```

The Completion display SHALL reject the candidate submission if row shape validation fails, the blob is unavailable beyond local retry policy, a size limit is exceeded, base64url decoding fails, the IV is not acceptable for this profile, the phone ephemeral public JWK is missing or unacceptable as a P-256 ECDH public key, key agreement fails, AES-GCM authentication fails, UTF-8 decoding fails, JSON parsing fails, or the plaintext is not a `SubmissionPlaintext` object for the selected profile.

A Completion display SHALL keep the desktop private key out of the untrusted provider's control. Browser-held or displayed desktop private key material in demos is not a production key-custody pattern.

#### 9.9.3 Bind, validate, and consume the payload

After decryption, the Completion display SHALL compare `SubmissionPlaintext.requestId` to the active `KioskRequestPayload.requestId` using exact string equality. It SHALL reject the submission if the values differ. This check binds the decrypted wrapper plaintext to the kiosk session; it is not patient identity, Holder consent, clinical freshness, or clinical-source provenance by itself.

For the active successful SMART-response payload, the Completion display SHALL require `payload.kind` to equal `"smart-health-checkin-response"`, SHALL require `payload.smartResponse` to be present as a JSON object, SHALL validate `payload.smartResponse` as a §6 `SmartHealthCheckinResponse`, and SHALL apply the §6.6 cross-validation rules against the original embedded `KioskRequestPayload.smartRequest`. In particular, `payload.smartResponse.requestId` SHALL exactly equal `KioskRequestPayload.smartRequest.id`.

The Completion display, or a trusted Verifier component acting for it, SHALL account for §8 validation before the returned SMART response is used in a clinical workflow. If the submitted payload includes raw credential-completion evidence needed for §8 validation, the Completion display SHALL perform the applicable §8.7 and §8.8 checks itself. If the submitted payload contains only the active `smartResponse` wrapper after phone-local validation, the deployment SHALL ensure that the phone-local Verifier's §8 validation result is available through trusted local state, protected validation evidence, or another deployment-defined trust boundary. A provider row or storage blob is not evidence that §8 validation succeeded.

A Completion display or downstream Requester SHALL apply §7 trust interpretation before clinical workflow use. Kiosk response-submission decryption proves that the ciphertext opened under the signed desktop key and wrapper `requestId` AAD. It does not by itself prove patient identity, Holder consent, Wallet authenticity, mdoc issuer trust, device-key proof, reader authentication, requester identity, clinical-source provenance for unsigned raw FHIR JSON, or downstream EHR write-back authorization.

A Completion display SHOULD distinguish transport and workflow states such as waiting, row observed, blob unavailable, decryption failed, malformed submission, SMART response validation failed, response valid with item-level declined/partial/unavailable/unsupported/error outcomes, accepted for local workflow, and imported into a downstream system. It SHOULD avoid displaying sensitive clinical details on public kiosk screens or in debug panels unless the user is authorized and local policy permits it.

### 9.10 Replay, expiration, and abuse considerations

Kiosk response submission is bearer-routed through an untrusted provider. Encryption and request-id binding are necessary but not sufficient for production replay, freshness, abuse, and privacy controls.

#### 9.10.1 Single-use and duplicate submissions

A production deployment SHOULD treat each kiosk wrapper `requestId` as single-use for successful clinical workflow completion. After one submission decrypts successfully and passes all required validation and local policy, the Completion display or another trusted workflow component SHOULD mark the session complete, stop displaying the Pointer URL, and stop accepting later submissions for routine workflow use.

Duplicate rows can arise from phone retries, provider queue replay, Holder repeated actions, or attacker replay of a valid row/blob for the same wrapper `requestId`. A Completion display SHALL NOT accept a duplicate merely because it decrypts, appears later in provider ordering, or has a later `submittedAt`. Later submissions SHOULD be ignored, quarantined, or presented for staff review according to deployment policy. A Completion display SHALL NOT merge Artifacts or `requestStatus[]` entries from multiple submissions for the same kiosk session unless a future profile defines authenticated aggregation and reconciliation rules.

A Submission service MAY enforce first-writer-wins rows, immutable rows, atomic accepted/completed state, compare-and-set state transitions, duplicate suppression, or cleanup as defense in depth. The Completion display and Requester SHALL NOT rely solely on the untrusted provider to decide clinical acceptance.

#### 9.10.2 Expiration, stale pointers, and clock skew

A Kiosk creator sets signed `createdAt` and `expiresAt` values in `KioskRequestPayload` under §9.4. A Phone presenter SHALL reject expired kiosk requests under §9.7 before Wallet invocation. A Phone presenter SHOULD also refuse to submit a successful response after the signed `expiresAt` unless a deployment profile explicitly defines a short completion grace period for a Wallet interaction that began before expiration.

A Completion display SHALL apply an expiration policy before accepting a submission for workflow use. The policy SHOULD reject submissions whose kiosk request expired before submission, whose `submittedAt` is outside accepted clock-skew or grace windows, or whose row appears after the session was completed, abandoned, cancelled, or superseded. Clock-skew tolerance, maximum lifetime, completion grace period, and retry windows are deployment policy and SHOULD be short for in-person kiosk sessions.

A Kiosk creator or Completion display SHOULD stop displaying or refresh the Pointer URL after expiration, abandonment, cancellation, or successful completion. A stale QR code or captured Pointer URL remains a bearer locator for encrypted state until provider cleanup and local policy prevent further use.

#### 9.10.3 Pointer guessing, replay, rate limits, and denial of service

A Kiosk creator SHOULD generate wrapper `requestId` values with enough entropy to resist online guessing during the request lifetime and within the provider namespace. The active implementation uses 32 random bytes encoded as base64url without padding.

A Completion display SHALL bind every accepted submission to the expected wrapper `requestId` through provider row filtering, response-submission AES-GCM AAD, decrypted `SubmissionPlaintext.requestId`, and §6.6 validation against `smartRequest.id`. These checks prevent simple cross-session ciphertext swapping when the wrong wrapper id or desktop key is used. They do not prevent replay of the same valid ciphertext for the same active session; single-use workflow state is still required.

A Submission service SHOULD apply rate limits, write limits, read limits, storage quotas, row-shape validation, storage-path binding, blob-size ceilings, anti-enumeration controls, access-control checks, and cleanup for request reads, submission writes, blob uploads, blob downloads, and observation streams. Provider-side controls SHALL NOT require plaintext SMART requests, plaintext SMART responses, raw FHIR content, SMART Health Cards, private keys, or shared secrets.

Phone presenters, Submission services, and Completion displays SHALL enforce bounded sizes for plaintext submissions, ciphertext blobs, IV fields, JWK fields, provider rows, and downloaded data before expensive parsing, allocation, decryption, or rendering. Completion displays SHOULD cap concurrent downloads and decryptions, bound the number of rows processed for one `requestId`, apply retry backoff, and fail closed for malformed rows, invalid IVs, invalid public keys, missing blobs, oversized blobs, and repeated failed decryptions.

#### 9.10.4 Cleanup, logging, and metadata minimization

A Submission service SHOULD delete or make inaccessible expired request rows, encrypted request envelopes, submission rows, ciphertext blobs, orphaned blobs, and duplicate rows after expiration, abandonment, successful completion, or a deployment-defined retention period. A Completion display SHOULD release the desktop private key and remove decrypted submissions, transient SMART responses, QR state, and debug artifacts when no longer needed for the active workflow, subject to legal, audit, or recovery policy.

Encrypted metadata can still be sensitive. Pointer values, wrapper request ids, submission ids, storage paths, key ids, provider app ids, timestamps, IP addresses, user agents, row counts, retry behavior, and access patterns can reveal check-in activity and support correlation.

Kiosk creators, Phone presenters, Submission services, Completion displays, and Requesters SHOULD minimize logs, analytics, database indexes, dashboards, browser storage, crash reports, and telemetry that expose these metadata. They SHOULD NOT log plaintext SMART requests, plaintext submissions, raw FHIR resources, SMART Health Cards, decrypted JWS payloads, §8 response plaintext, private keys, shared secrets, provider credentials, access tokens, or full ciphertext blobs except under controlled diagnostic or fixture procedures. User-facing errors SHOULD be recoverable without exposing valid-id enumeration clues, clinical content, stack traces, secrets, or provider internals.

### 9.11 Provider abstraction

The kiosk transport provider is an untrusted relay abstraction. It stores, serves, or notifies about opaque encrypted request and submission state. It is not a clinical Requester, Verifier, Wallet, issuer, trust anchor, or clinical-source provenance service.

A provider used for the active kiosk flow SHALL provide capabilities equivalent to:

| Capability | Required behavior |
| --- | --- |
| Write encrypted request | Store or publish an `EncryptedKioskRequest` under the wrapper `requestId` or equivalent lookup key without requiring plaintext `KioskRequestPayload` or plaintext `smartRequest`. |
| Read encrypted request | Return the request row or encrypted envelope for a supplied wrapper `requestId` so the Phone presenter can perform §9.7 validation. |
| Write encrypted submission | Accept an encrypted submission blob or equivalent encrypted bytes plus row metadata sufficient for later decryption, including wrapper `requestId`, IV, phone ephemeral public key, and a blob locator or inline ciphertext mechanism. |
| Download submission blob | Return the exact ciphertext bytes associated with a selected submission row, bounded by provider and deployment size limits. |
| Observe submission rows | Let the Completion display subscribe, poll, query, list, or otherwise discover candidate submission rows for one wrapper `requestId`. |

The active TypeScript adapter exposes these capabilities as `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows`, along with provider `name`, `appId`, and `configured` state. Other implementations MAY use different programming-language names, callbacks, queues, webhooks, polling endpoints, object stores, databases, or local-network transports, provided the protocol-visible behavior is equivalent.

A Submission service/provider SHALL NOT require access to plaintext SMART requests, plaintext SMART responses, raw FHIR clinical content, SMART Health Cards, Holder choices, §8 `DeviceResponse` plaintext, desktop private keys, Wallet secrets, request-opening private key material, or shared secrets merely to route request or submission state. A provider MAY receive opaque ciphertext, public ephemeral keys, IVs, content types, sizes, row ids, storage locators, timestamps, provider-local auth state, and operational metadata needed for storage and notification.

For the active InstantDB/Instant Storage example, a request row is equivalent to:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

and a submission row is equivalent to:

```json
{
  "submissionId": "<provider-submission-id>",
  "requestId": "<kiosk-wrapper-requestId>",
  "storagePath": "submissions/<requestId>/<submissionId>.bin",
  "storageFileId": "<provider-file-id>",
  "iv": "<base64url-96-bit-iv>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

These field names and InstantDB details are implementation evidence and a provider-profile example. They are not universal requirements to use InstantDB, a particular storage service, the same row ids, or the same database schema.

A provider profile SHOULD define row and blob size limits, expiration and cleanup behavior, duplicate handling, access-control and anti-enumeration policy, storage-locator validation, row ordering or timestamp semantics, idempotency, retry behavior, observation semantics, error reporting that avoids enumeration clues, logging requirements, and metadata minimization.

### 9.12 End-to-end kiosk example

This example is illustrative. It ties together §§9.1-9.11 without defining byte fixtures, CDDL, production trust anchors, fixed keys, fixed ciphertexts, provider credentials, or required clinical content. T4.D and later fixture sections own byte-level material.

1. A clinic desktop acts as Requester, Verifier, Kiosk creator, and Completion display for one in-person check-in session. It constructs a §5 SMART request directly:

   ```json
   {
     "type": "smart-health-checkin-request",
     "version": "1",
     "id": "clinic-checkin-2026-05-02-001",
     "purpose": "Clinic check-in",
     "fhirVersions": ["4.0.1"],
     "items": [
       {
         "id": "patient-demographics",
         "title": "Patient demographics",
         "summary": "Information used to confirm your chart at check-in.",
         "required": true,
         "content": {
           "kind": "fhir.resources",
           "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
           "resourceTypes": ["Patient"]
         },
         "accept": ["application/fhir+json"]
       },
       {
         "id": "us-core-summary",
         "title": "US Core clinical summary",
         "summary": "Available US Core problems, medications, allergies, immunizations, and observations.",
         "content": {
           "kind": "fhir.resources",
           "profilesFrom": ["http://hl7.org/fhir/us/core"],
           "resourceTypes": ["Condition", "MedicationRequest", "AllergyIntolerance", "Immunization", "Observation"]
         },
         "accept": ["application/fhir+json", "application/smart-health-card"]
       }
     ]
   }
   ```

2. The Kiosk creator generates a fresh high-entropy wrapper `requestId`, a per-request desktop response-encryption key pair, and a signed `KioskRequestPayload` with the SMART request embedded directly as `smartRequest`. The wrapper `requestId` is distinct from `smartRequest.id`. The Kiosk creator encrypts the compact kiosk request JWS into an `EncryptedKioskRequest`, writes the encrypted request through the provider, and displays only a Pointer URL such as:

   ```text
   https://clinic.example/verifier/submit.html#r=<wrapper-requestId>
   ```

3. The Holder opens the Pointer URL on a phone. The Phone presenter parses `r`, retrieves the provider request row, opens the encrypted request envelope, verifies the creator JWS, validates timestamps, provider binding, algorithm labels, constraints, and the direct `smartRequest`, and constructs a fresh phone-local §8 `org-iso-mdoc` request using that `smartRequest`. The QR code and provider row do not carry §8 `deviceRequest`, §8 `encryptionInfo`, a Wallet response, or clinical content.

4. The Wallet/Responder processes the §8 request on the phone, obtains Holder review, and returns a SMART response in the stable `smart_health_checkin_response` element. The phone-local Verifier opens and validates the §8 result and applies §6.6 against the original `smartRequest`. The SMART response `requestId` is `clinic-checkin-2026-05-02-001`, not the kiosk wrapper `requestId`.

5. The Phone presenter creates `SubmissionPlaintext` with top-level `requestId` equal to the wrapper id, a numeric `submittedAt`, and `payload.kind = "smart-health-checkin-response"` containing the SMART response. It enforces `constraints.maxPlaintextBytes`, encrypts the plaintext to the signed `desktopPublicKeyJwk` with HKDF info `"smart-health-checkin-kiosk-response-v1"`, wrapper `requestId` as salt and AAD, a fresh 12-byte IV, and a fresh phone ephemeral P-256 key. It uploads or writes only ciphertext and metadata through the provider.

6. The Completion display observes a submission row for the wrapper `requestId`, downloads the ciphertext blob, decrypts with the retained desktop private key, checks decrypted `SubmissionPlaintext.requestId`, extracts `payload.smartResponse`, validates the SMART response under §6 and §6.6 against the original `smartRequest`, accounts for §8 validation, applies §7 trust interpretation, and only then marks the kiosk workflow complete or ready for local staff review. The provider never receives plaintext clinical content and is not trusted to decide clinical validity.
