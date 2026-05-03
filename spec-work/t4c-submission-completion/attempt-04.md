### 9.8 Submission ciphertext from phone to desktop

After successful §9.7 processing and successful phone-local §8 processing, the Phone presenter packages the validated result for return to the Completion display. This subsection defines only the kiosk return wrapper and its encryption. It does not redefine the SMART response model in §6, the trust framework in §7, the same-device `org-iso-mdoc` processing in §8, or the request/pointer processing in §§9.1-9.7.

The Phone presenter SHALL submit only after it has a SMART response or credential-completion result that was opened and validated by the phone-local Verifier under §8.7 and §8.8, including §6.6 cross-validation against `KioskRequestPayload.smartRequest`. Holder cancellation, Wallet unavailability, failed §8 opening, invalid mdoc evidence, invalid SMART response JSON, or failed §6.6 cross-validation SHALL NOT be reported as successful kiosk completion.

The active response-submission plaintext has this logical wrapper shape:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "submittedAt": 1760000000000,
  "payload": {
    "kind": "smart-health-checkin-response",
    "smartResponse": { "...": "SmartHealthCheckinResponse" }
  }
}
```

A Phone presenter implementing this profile SHALL set `SubmissionPlaintext.requestId` to `KioskRequestPayload.requestId`, not to `KioskRequestPayload.smartRequest.id` and not to `SmartHealthCheckinResponse.requestId`. It SHALL set `submittedAt` to a numeric submission time value in milliseconds since the Unix epoch. The `payload` member SHALL be a JSON object containing the validated credential-completion result. For the active SMART-response completion, `payload.kind` is `smart-health-checkin-response` and `payload.smartResponse` is the already validated `SmartHealthCheckinResponse` from §6. This wrapper does not change the §6 response shape: the SMART response inside `payload.smartResponse` still uses `requestId` equal to `KioskRequestPayload.smartRequest.id`.

A Phone presenter MAY use an implementation-specific credential-completion object inside `payload` only when the deployment profile defines how the Completion display validates and extracts the SMART response or other accepted result. Such a payload extension SHALL NOT cause the Submission service to receive plaintext clinical content and SHALL NOT bypass §6, §7, or §8 validation before workflow use.

For this profile, the Phone presenter SHALL encrypt the canonical JSON serialization of `SubmissionPlaintext` to `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` using the response-submission suite labeled:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For response-submission encryption:

- the Phone presenter generates a fresh ephemeral ECDH P-256 key pair for each submission attempt;
- the recipient public key is the P-256 JWK in the signed `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk`;
- the ECDH shared secret is input to HKDF with SHA-256;
- the HKDF salt is `utf8(KioskRequestPayload.requestId)`;
- the HKDF `info` string is `utf8("smart-health-checkin-kiosk-response-v1")`;
- the derived content-encryption key is AES-GCM with a 256-bit key;
- the AES-GCM IV is 96 bits and fresh for the encrypted submission;
- AES-GCM additional authenticated data is `utf8(KioskRequestPayload.requestId)`; and
- the ciphertext is the AES-GCM ciphertext and authentication tag over the serialized `SubmissionPlaintext` bytes.

The Phone presenter SHALL use only the signed `encryptResponseTo` metadata from the verified kiosk request. It SHALL NOT treat `encryptResponseTo` as §8 `encryptionInfo`, SHALL NOT reuse the §8 HPKE recipient key or `SessionTranscript`, and SHALL NOT use the T4.A request-envelope recipient key for response submission. Kiosk response-submission encryption is distinct from §8 HPKE and from the §9.3 request-envelope encryption, even though the active request and response wrapper suites use similar P-256 ECDH, HKDF-SHA-256, and AES-GCM building blocks.

The encrypted submission metadata exposed to the provider has this active logical shape:

```json
{
  "iv": "<base64url-96-bit-iv>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." },
  "ciphertextBlob": "<opaque bytes stored outside the row or as provider blob data>"
}
```

The ciphertext bytes MAY be stored as a provider blob rather than inline row data. The active provider uploads the bytes as `application/octet-stream` and writes a small submission row containing `submissionId`, `requestId`, `storagePath`, `storageFileId`, `iv`, and `phoneEphemeralPublicKeyJwk`. A provider profile MAY use another storage mechanism if the Completion display can retrieve the exact ciphertext bytes and associated IV and phone ephemeral public key for the same wrapper `requestId`.

A Phone presenter SHALL enforce the signed `constraints.maxPlaintextBytes` before submission. If the serialized `SubmissionPlaintext` exceeds that value, the Phone presenter SHALL fail safely and SHALL NOT submit a truncated or partial ciphertext as successful completion. A Phone presenter, Submission service, or provider profile SHOULD also enforce an encrypted-blob size limit; the active implementation rejects ciphertext blobs larger than `constraints.maxPlaintextBytes + 1024` bytes. Size limits are denial-of-service controls and do not replace decryption, authenticated-data, plaintext `requestId`, or SMART response validation.

The Phone presenter SHALL NOT publish plaintext `SubmissionPlaintext`, plaintext SMART response JSON, raw FHIR resources, SMART Health Cards, §8 `DeviceResponse`, §8 `dcapiResponse`, §8 private keys, desktop private keys, or Wallet secrets to the Submission service. Provider rows, storage paths, IVs, phone ephemeral public keys, and ciphertext blobs are transport metadata and ciphertext only.

### 9.9 Desktop completion processing

The Completion display watches, subscribes, polls, or otherwise reads provider submission rows associated with the kiosk wrapper `requestId` that it created or is authorized to process. The Completion display MUST possess the desktop private key corresponding to the `desktopPublicKeyJwk` that the Kiosk creator placed in the signed `KioskRequestPayload.encryptResponseTo` metadata at request creation. A Completion display SHALL keep that private key out of the untrusted Submission service's control.

For each candidate submission row, the Completion display SHALL:

1. confirm that the row is associated with the expected kiosk wrapper `requestId`;
2. retrieve the exact ciphertext bytes from the row or referenced blob object;
3. validate or reconstruct any provider-defined blob binding, such as the active `storagePath` form `submissions/<requestId>/<submissionId>.bin`;
4. base64url-decode the row `iv` and validate that it is a 96-bit AES-GCM IV for this profile;
5. import `phoneEphemeralPublicKeyJwk` as an acceptable ECDH P-256 public key;
6. derive the AES-GCM key with ECDH P-256, HKDF-SHA-256, `salt = utf8(expected wrapper requestId)`, `info = utf8("smart-health-checkin-kiosk-response-v1")`, and the retained desktop private key;
7. decrypt using AES-GCM with AAD `utf8(expected wrapper requestId)`;
8. parse the plaintext as UTF-8 JSON and validate it as `SubmissionPlaintext` for the selected profile;
9. require `SubmissionPlaintext.requestId` to equal the expected kiosk wrapper `requestId`; and
10. validate, extract, and process `SubmissionPlaintext.payload` under the applicable completion profile before workflow use.

For the active SMART-response payload, the Completion display SHALL require `payload.kind` to be `smart-health-checkin-response`, extract `payload.smartResponse`, validate it as a `SmartHealthCheckinResponse` under §6, and apply §6.6 cross-validation against the original `KioskRequestPayload.smartRequest`. If the Completion display is also acting as the §8 Verifier or receives phone-local Verifier evidence, it SHALL apply §8.7 and §8.8 validation before treating the response as transport-valid. A Completion display or downstream Requester SHALL apply §7 trust interpretation before clinical workflow use.

A Completion display SHALL reject or quarantine a submission if decryption fails, the authenticated data does not match the expected wrapper `requestId`, the plaintext is malformed, the plaintext wrapper `requestId` mismatches, the payload kind is unsupported, the SMART response fails §6 validation, the response `requestId` does not equal `smartRequest.id`, §6.6 cross-validation fails, or required §7/§8 trust evidence is absent or unacceptable under deployment policy.

The Submission service, provider row, blob storage metadata, storage URL, file name, storage content type, row creation time, upload account, IP address, and subscription event order are not clinical trust evidence. A Completion display SHALL NOT treat provider metadata as proof of patient identity, Holder consent, Wallet authenticity, mdoc issuer/device trust, clinical-source provenance, response freshness, or downstream authorization. Provider metadata can support routing, correlation, deduplication, diagnostics, and abuse controls only.

The Completion display SHOULD keep its UI semantics conservative. It can display states such as “waiting”, “response received”, “opening”, “validated”, “needs review”, “expired”, or “failed”. It SHALL NOT display “complete”, “accepted”, or similar workflow-success language until the encrypted submission has opened successfully and the required §6, §7, §8, and §9 checks for that deployment have succeeded.

### 9.10 Replay, expiration, and abuse considerations

Kiosk submissions are bearer-routed through an untrusted provider, so deployable systems need replay, expiration, cleanup, and abuse controls in addition to encryption.

A Kiosk creator SHALL set a finite `expiresAt` in the signed `KioskRequestPayload`. A Phone presenter SHALL reject expired requests before §8 re-entry under §9.7. A Phone presenter SHOULD also refuse to submit a response after the signed request has expired unless a deployment profile explicitly defines a short completion grace period for a Wallet interaction that began before expiration. A Completion display SHOULD stop advertising or accepting new submissions after expiration, abandonment, successful completion, or local timeout, subject to local recovery policy.

A Completion display and Requester SHOULD treat a kiosk wrapper `requestId` as single-use for successful clinical workflow completion. If multiple submission rows arrive for the same wrapper `requestId`, the Completion display SHALL validate each candidate independently before use and SHOULD accept at most one as the workflow-completing submission. Later duplicates SHOULD be ignored, quarantined, or presented for staff review according to deployment policy. A duplicate row, duplicate storage object, or repeated ciphertext SHALL NOT cause automatic repeated EHR ingestion or repeated downstream action.

The wrapper `requestId` binding in AES-GCM AAD and plaintext prevents simple cross-session ciphertext swapping when cryptographic checks are applied, but it is not by itself patient identity proof, Holder consent proof, clinical-source provenance, or complete replay protection. A replayed valid ciphertext for the same wrapper `requestId` can still decrypt; single-use state and workflow deduplication are therefore deployable requirements. The active demo provider does not by itself enforce global single-use acceptance or cleanup, so deployments that need that property must add authoritative server-side or workflow-side state.

A Kiosk creator SHOULD generate `requestId` with sufficient entropy to resist guessing over the active lifetime. Pointer URLs SHOULD be short-lived, displayed only for the active session, and refreshed or removed when stale. Submission services SHOULD make request lookup and submission-row access conditional on knowledge of the wrapper `requestId` or an equivalent bearer locator, and SHOULD rate-limit failed lookups and writes to make enumeration impractical. These relay controls are defense in depth and do not make the relay trusted with plaintext.

A Submission service or provider profile SHOULD enforce size limits, row-shape allow-lists, storage-path binding, upload content-type restrictions where applicable, per-request and per-origin write limits, read limits, and cleanup of expired request rows, orphaned blobs, duplicate rows, and abandoned sessions. The active Instant-backed provider checks plaintext and blob-size ceilings before write, validates `storagePath` on download, and bounds downloaded blob size; it does not standardize a universal retention schedule.

Logging and telemetry SHOULD be minimized. Providers, Kiosk creators, Phone presenters, and Completion displays SHOULD avoid logging plaintext SMART requests, plaintext submissions, raw FHIR resources, SMART Health Cards, compact kiosk request JWS plaintext, private keys, decrypted §8 responses, or full ciphertext blobs. Logs that include wrapper request ids, submission ids, storage paths, key ids, provider app ids, timestamps, IP addresses, user agents, error strings, and retry counts can still be sensitive and SHOULD be retained only as long as needed for security, operations, and audit obligations.

Error messages SHOULD avoid valid-request enumeration clues and clinical leakage. A Phone presenter or Completion display can tell a Holder or staff user to rescan a current QR code, retry, use a supported browser, or seek assistance without revealing whether a guessed `requestId` exists, whether a particular clinical response was present, or which cryptographic check failed.

### 9.11 Provider abstraction

The kiosk transport provider is an opaque, untrusted Submission service abstraction. A provider can be implemented with InstantDB, another realtime database, object storage plus a notification channel, a polling endpoint, a message queue, or another transport, provided the protocol-visible behavior preserves the untrusted-relay model.

A provider used for this profile SHALL provide equivalent capabilities to:

| Capability | Required behavior |
| --- | --- |
| Write request | Store or publish an `EncryptedKioskRequest` by wrapper `requestId` without needing plaintext `KioskRequestPayload` or plaintext `smartRequest`. |
| Read request | Return the request row or encrypted envelope for a supplied wrapper `requestId` so the Phone presenter can perform §9.7 validation. |
| Write submission | Accept encrypted submission metadata for a verified kiosk request, including wrapper `requestId`, IV, phone ephemeral public key, and a pointer to or storage of ciphertext bytes. |
| Download submission blob | Return the exact ciphertext bytes associated with a submission row, bounded by deployment size limits. |
| Observe submission rows | Let the Completion display watch, subscribe, poll, or list submission rows for a wrapper `requestId`. |

A provider SHALL NOT require access to plaintext SMART requests, plaintext SMART responses, raw FHIR clinical content, SMART Health Cards, Holder choices, §8 `DeviceResponse` plaintext, desktop private keys, Wallet secrets, or request-opening private key material merely to route request or submission state. A provider MAY enforce access control, row shape, storage path, expiration, rate limit, quota, audit, and cleanup policies as defense in depth.

For the active provider shape, a request row is equivalent to:

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

Those field names are active implementation evidence and a useful provider-profile example. They are not a requirement that all deployments use InstantDB, the same storage service, the same row ids, or the same database schema. Any provider-specific metadata remains untrusted unless cryptographically protected and validated by the Phone presenter or Completion display.

### 9.12 End-to-end kiosk example

This example illustrates the full kiosk wrapper across T4.A, T4.B, and T4.C. It omits byte fixtures, CDDL, exact signatures, exact ciphertexts, and object-storage URLs; those belong to T4.D and later fixture work.

1. The Requester constructs a direct SMART request under §5:

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
         "content": {
           "kind": "fhir.resources",
           "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-coverage"],
           "resourceTypes": ["Coverage"]
         },
         "accept": ["application/fhir+json"]
       }
     ]
   }
   ```

2. The Kiosk creator generates a fresh wrapper `requestId`, a desktop response-encryption key pair, and a signed `KioskRequestPayload` with the SMART request embedded directly as `smartRequest`. The wrapper `requestId` is distinct from `smartRequest.id`. The Kiosk creator encrypts the compact request JWS into an `EncryptedKioskRequest`, writes the request row through the provider, and displays a Pointer URL such as:

   ```text
   https://clinic.example/verifier/submit.html#r=<wrapper-requestId>
   ```

3. The Holder opens the Pointer URL on a phone. The Phone presenter parses `r`, retrieves the provider row, binds the pointer id to the row, envelope, and signed payload `requestId`, opens the encrypted request, verifies the creator JWS, validates `smartRequest` under §5, and constructs a fresh phone-local §8 `org-iso-mdoc` request using that `smartRequest`.

4. The Wallet/Responder processes the §8 request on the phone, obtains Holder review, and returns a SMART response in the stable `smart_health_checkin_response` element. The phone-local Verifier opens the §8 result, validates mdoc evidence, extracts the SMART response, and applies §6.6 against the original `smartRequest`. The SMART response's `requestId` is `clinic-checkin-2026-05-02-001`, not the kiosk wrapper `requestId`.

5. The Phone presenter creates `SubmissionPlaintext` with wrapper `requestId`, `submittedAt`, and `payload.kind = "smart-health-checkin-response"` containing the validated SMART response. It encrypts that plaintext to the signed `desktopPublicKeyJwk` with `info = "smart-health-checkin-kiosk-response-v1"`, AAD equal to the wrapper `requestId`, a fresh 12-byte IV, and a fresh phone ephemeral P-256 key. It uploads or writes only ciphertext and metadata through the provider.

6. The Completion display observes the submission row for the wrapper `requestId`, downloads the ciphertext blob, decrypts with the retained desktop private key, checks the plaintext wrapper `requestId`, extracts `payload.smartResponse`, revalidates the SMART response under §6 and §6.6 against the original `smartRequest`, applies §7/§8 trust policy, and only then marks the kiosk workflow complete or ready for local staff review.

### Organizer notes

**Strengths.** This draft keeps T4.C scoped to the phone-to-desktop return leg and completion processing. It preserves accepted T4.A/T4.B decisions: direct `smartRequest` embedding, pointer-only QR, untrusted relay, distinct wrapper and SMART request identifiers, and fresh phone-local §8 re-entry. It names the active `SubmissionPlaintext`, `EncryptedPayload`, provider row, HKDF info, AAD, IV, size limits, and provider capabilities from code without making InstantDB the protocol.

**Caveats.** Active code validates and encrypts a compact payload `{kind, smartResponse}` rather than a full portable §8 evidence bundle for desktop re-validation. The draft therefore requires §6/§8/§7 validation before workflow use but leaves deployment-specific evidence conveyance for profiles or later sections. Active demo behavior does not enforce universal server-side single-use, authoritative cleanup, or retention; the draft phrases those as deployable requirements or SHOULD-level controls where appropriate.

**Open issues.** T4.D needs CDDL/schema and fixtures for `SubmissionPlaintext`, response-submission ciphertext metadata, row shapes, and failure vectors, or must explicitly defer them. §11/§12 need final security and privacy treatment for relay metadata, replay, QR substitution, pointer guessing, logging, key custody, and denial-of-service. §13/T5 should decide whether provider identifiers, TTL windows, size ceilings, single-use behavior, and completion payload kinds become registered conformance-profile values.

**Downstream dependencies.** Appendix A should capture the normative Phone presenter, Completion display, Submission service/provider, Kiosk creator, and Requester/Verifier requirements from §§9.8-9.11. Worked examples in §16 can expand §9.12 with byte ladders only after T4.D fixtures and final §8 validation evidence expectations are stable.
