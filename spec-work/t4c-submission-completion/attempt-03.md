### 9.8 Submission ciphertext from phone to desktop

After the Phone presenter has successfully completed §9.7 and has obtained a valid SMART response through the phone-local §8 flow, it packages the result for return to the Completion display. This subsection defines only the kiosk response-submission wrapper. It does not redefine the SMART response model in §6, the §8 HPKE response returned by the Wallet/Responder, or the request-creation and pointer rules in §§9.1-9.7.

The kiosk response-submission wrapper uses the response-encryption metadata that the Kiosk creator signed in `KioskRequestPayload.encryptResponseTo`. The Submission service remains an untrusted relay: it stores or notifies about opaque submission state and encrypted blobs, but it is not trusted with plaintext SMART responses, Holder decisions, raw FHIR JSON, SMART Health Cards, or clinical trust decisions.

#### 9.8.1 `SubmissionPlaintext` shape

A Phone presenter that submits a successful kiosk response SHALL construct a JSON object with this logical shape before encrypting it:

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

The top-level `requestId` is the kiosk wrapper `KioskRequestPayload.requestId`, not the clinical SMART request id. The active demo encodes `submittedAt` as a JSON number containing milliseconds since the Unix epoch. The `payload` member carries the completion payload produced after §8 processing. For the active SMART response completion shape, `payload.kind` is `"smart-health-checkin-response"` and `payload.smartResponse` is the §6 `SmartHealthCheckinResponse` extracted and validated from the phone-local §8 flow.

A Phone presenter SHALL set top-level `SubmissionPlaintext.requestId` to the verified kiosk wrapper `requestId` from the signed kiosk request payload. A Phone presenter SHALL NOT substitute `smartRequest.id`, a provider row id, a storage path, a submission id, a patient identifier, or a §8 presentation-session identifier for this wrapper id.

A Phone presenter that sends a SMART response completion SHALL include the SMART response only inside `payload.smartResponse` or another registered completion payload shape. It SHALL NOT place §8 `DeviceResponse` CBOR, Digital Credentials API `dcapiResponse`, §8 HPKE ciphertext, raw `encryptionInfo`, Wallet private key material, desktop private key material, provider credentials, or unrelated local diagnostics in `payload`. The SMART response itself remains the §6 object; kiosk submission wrapping does not add clinical fields, requester identity, patient identity, Artifact provenance, or new status semantics to it.

#### 9.8.2 Size enforcement

The signed kiosk request payload contains `constraints.maxPlaintextBytes`. A Phone presenter SHALL serialize the `SubmissionPlaintext` as UTF-8 JSON for response-submission encryption and SHALL reject or fail safely before encryption if the resulting plaintext byte length exceeds `constraints.maxPlaintextBytes`.

A Phone presenter MAY also enforce a stricter implementation or deployment limit. The active implementation has an implementation maximum of 25 MiB for plaintext and rejects encrypted blobs larger than that limit plus 1024 bytes. A Submission service MAY enforce its own blob-size and row-size limits as defense in depth. These provider limits do not replace the Phone presenter's signed-constraint check and do not authorize truncating, splitting, recompressing, or otherwise rewriting clinical content in a way that changes the SMART response semantics.

A Kiosk creator SHOULD set `constraints.maxPlaintextBytes` to the smallest value that can accommodate the expected workflow and provider limit. A Phone presenter SHOULD avoid including unnecessary wrapper diagnostics in the plaintext because any plaintext bytes become visible to the Completion display after decryption and increase denial-of-service exposure before decryption.

#### 9.8.3 Response-submission encryption

For version 1.0, a Phone presenter SHALL encrypt the UTF-8 JSON serialization of `SubmissionPlaintext` to `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` using the response-submission suite labeled:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite:

- the Phone presenter generates a fresh ephemeral ECDH P-256 key pair for each submitted response;
- the recipient public key is `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk`;
- the ECDH shared secret is input to HKDF with SHA-256;
- the HKDF salt is `utf8(KioskRequestPayload.requestId)`;
- the HKDF `info` string is `utf8("smart-health-checkin-kiosk-response-v1")`;
- the derived content-encryption key is AES-GCM with a 256-bit key;
- the AES-GCM IV is 96 bits and fresh for the encrypted submission;
- AES-GCM additional authenticated data is `utf8(KioskRequestPayload.requestId)`; and
- the ciphertext is the AES-GCM ciphertext including its authentication tag over the `SubmissionPlaintext` JSON bytes.

The Phone presenter SHALL include or make available to the Completion display the response-submission IV, the phone ephemeral public JWK, and the ciphertext bytes. In the active provider shape, ciphertext bytes are stored as an opaque blob and the submission row contains the IV and phone ephemeral public JWK:

```json
{
  "submissionId": "<opaque-submission-id>",
  "requestId": "<kiosk-wrapper-requestId>",
  "iv": "<base64url-96-bit-iv>",
  "storagePath": "submissions/<requestId>/<submissionId>.bin",
  "storageFileId": "<provider-file-id>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

The provider row and blob metadata are relay metadata. A Phone presenter SHALL NOT rely on them as clinical trust, Holder consent, patient identity, SMART response validity, or proof that the Completion display has consumed the response.

#### 9.8.4 Submission write

A Phone presenter SHALL write the encrypted submission through the `submitTo` provider context validated in §9.7. For the active provider abstraction, this means writing an opaque ciphertext blob and a submission row that can be observed by `requestId`. A Phone presenter SHALL fail safely if the provider is unavailable, rejects the write, cannot store the ciphertext within configured limits, or reports that the row and blob were not accepted for delivery.

A Submission service SHALL NOT require plaintext `SubmissionPlaintext`, plaintext `payload.smartResponse`, raw FHIR content, SMART Health Cards, or Holder decisions in order to route, store, notify, or make available the submission. A Submission service MAY require the wrapper `requestId`, provider-local row id, storage path, submission id, ciphertext blob, IV, phone ephemeral public key, size metadata, content type, and operational authentication needed for its storage model.

### 9.9 Desktop completion processing

The Completion display completes the kiosk session by observing provider submission state for the wrapper `requestId`, downloading the corresponding ciphertext blob, decrypting locally with the desktop private key generated for the kiosk request, validating the plaintext and clinical response, and only then presenting completion state to the local workflow.

The Completion display is a response consumer and Verifier-side processor for this kiosk leg. It SHALL preserve the distinction between wrapper validation, response-submission decryption, SMART response validation, §8 transport validation already performed on the phone, and downstream clinical workflow.

#### 9.9.1 Observe provider submission rows

A Completion display SHALL subscribe, poll, or otherwise observe the selected provider for submission rows associated with the active kiosk wrapper `requestId`. If the provider returns rows for other wrapper ids, rows whose storage paths are outside the selected provider's expected namespace, rows with malformed IVs, rows with missing phone ephemeral keys, or ambiguous rows, the Completion display SHALL reject or ignore those rows for the active kiosk session.

The active implementation filters rows by exact `requestId` equality and by a storage path beginning with `submissions/<requestId>/`. A provider profile MAY define a different storage namespace, but it SHALL provide an equivalent way for the Completion display to distinguish rows belonging to the active wrapper request from unrelated provider state.

Provider notification is not completion. A Completion display SHALL NOT mark the clinical workflow complete merely because a row exists, a blob exists, a provider reports a local write, or a storage path matches. Completion requires successful decryption and validation under this subsection and any applicable local policy.

#### 9.9.2 Download and decrypt locally

For each candidate submission row selected for processing, the Completion display SHALL download the referenced ciphertext blob using the selected provider's blob-download capability. It SHALL enforce implementation and deployment blob-size limits before attempting decryption or before allocating unbounded memory.

The Completion display SHALL decrypt the ciphertext using the response-submission construction in §9.8.3 with:

```text
ECDH P-256 shared secret = ECDH(desktop private key, row.phoneEphemeralPublicKeyJwk)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(row.iv)
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = SubmissionPlaintext JSON bytes
```

The desktop private key is the private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk` generated by the Kiosk creator for this kiosk request. A Completion display SHALL keep that private key local to the kiosk-side completion boundary or another deployment-approved trusted component. An untrusted Submission service SHALL NOT need the desktop private key to route or store response submissions.

A Completion display SHALL reject the submission if the IV cannot be decoded, the phone ephemeral public JWK is missing or cannot be imported as an acceptable P-256 ECDH public key, key agreement fails, AES-GCM authentication fails, plaintext decoding as UTF-8 fails, or the plaintext is not a JSON object with the expected `SubmissionPlaintext` shape.

#### 9.9.3 Validate request binding and extract completion payload

After decryption, a Completion display SHALL compare `SubmissionPlaintext.requestId` to the active `KioskRequestPayload.requestId` by exact string equality. It SHALL reject the submission if the values differ. This check is a kiosk wrapper binding only; it is not patient identity, clinical-source provenance, or a freshness proof by itself.

For an active SMART response completion payload, the Completion display SHALL require:

1. `payload` is a JSON object;
2. `payload.kind` is `"smart-health-checkin-response"` or another completion kind explicitly supported by the deployment profile;
3. when `payload.kind` is `"smart-health-checkin-response"`, `payload.smartResponse` is present as a JSON object;
4. `payload.smartResponse` validates as a §6 `SmartHealthCheckinResponse`; and
5. `payload.smartResponse.requestId` exactly equals the original embedded `KioskRequestPayload.smartRequest.id` under §6.6.

The Completion display SHALL apply the §6.6 cross-validation rules against the original `KioskRequestPayload.smartRequest` before consuming the SMART response. It SHALL also apply §7 trust interpretation and any retained §8 validation result or deployment evidence associated with the phone-local presentation before presenting clinical content as protocol-valid.

If the Completion display did not itself perform the phone-local §8 validation, it SHALL consume only a completion payload shape whose validation evidence is sufficient under deployment policy to show that §8 processing and §6/§6.6 validation succeeded before submission. The active phone UI submits the SMART response only after a successful local completion object is available, but deployable Completion displays should not rely solely on that UI state when validating an untrusted relay result.

#### 9.9.4 Treat provider metadata as untrusted

A Completion display SHALL NOT treat provider row fields, storage paths, file ids, upload timestamps, database update status, provider app ids, IP addresses, user-agent strings, or other relay metadata as clinical trust, Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, or clinical-source provenance. Those fields can be useful for routing, retry, operator diagnostics, rate limiting, cleanup, and abuse handling, but clinical response use requires decryption and validation of the returned SMART response and its Artifacts.

A Completion display SHOULD present completion state in a way that distinguishes at least these cases: waiting for a submission, encrypted submission observed but blob not yet available, decryption failed or malformed submission, SMART response validation failed, response valid but item statuses include declined/unavailable/unsupported/partial/error outcomes, and response accepted for local workflow. It SHOULD avoid displaying raw decrypted clinical content in debug panels unless the user is authorized for that workflow and local privacy policy permits the display.

### 9.10 Replay, expiration, and abuse considerations

This subsection describes replay, freshness, expiration, cleanup, metadata, and denial-of-service controls for the phone-to-desktop submission leg. Some controls are enforceable by core protocol processors; others are deployable requirements for provider profiles and operational systems. The active demo demonstrates size checks, request-id binding, provider row filtering, and expiration validation for request pickup, but it does not implement every production single-use, cleanup, audit, or abuse-control mechanism described here.

#### 9.10.1 Single-use and duplicate submissions

A deployment that presents a single in-person kiosk session SHOULD treat each kiosk wrapper `requestId` as single-use for successful completion. After the Completion display accepts one valid submission for a wrapper `requestId`, it SHOULD stop displaying the Pointer URL, stop accepting additional submissions for ordinary workflow processing, and mark later submissions for the same wrapper id as duplicate, suspicious, or operator-review events.

A Submission service MAY still receive duplicate rows because phones can retry, provider queues can replay, a Holder can tap submit more than once, or an attacker can replay a ciphertext row. A Completion display SHALL NOT accept duplicate submissions merely because they decrypt. It SHOULD define deterministic duplicate handling, such as accepting the first valid submission by provider ordering, requiring operator review for multiple valid submissions, or accepting only a submission that matches an out-of-band in-person workflow state.

Single-use completion does not mean that `SmartHealthCheckinResponse.requestId` alone proves freshness. The clinical SMART response `requestId` binds to `smartRequest.id` under §6; kiosk freshness and replay control come from the wrapper `requestId`, signed timestamps, provider policy, response-submission encryption, and local workflow state.

#### 9.10.2 Expiration windows and stale QR codes

A Kiosk creator SHALL set a finite `expiresAt` on the signed kiosk request payload as required by §9.4. A Phone presenter SHALL reject expired kiosk requests under §9.7 before invoking the Wallet. A Phone presenter SHOULD also reject response submission if the signed kiosk request has expired before submission completes, unless a deployment profile explicitly permits a short completion grace period after Holder approval.

A Completion display SHOULD stop showing a Pointer URL when the signed request expires, when the session is abandoned, or when a valid completion is accepted. It SHOULD clearly present a stale or expired QR state rather than continuing to invite scans of an expired bearer locator.

A deployment profile SHOULD define clock-skew tolerance, maximum kiosk request lifetime, completion grace period, and cleanup timing. The active implementation uses a ten-minute request lifetime and rejects requests that appear too far in the future during payload validation; production deployments should choose values suitable for their workflow and threat model.

#### 9.10.3 Cleanup and retention

A Submission service SHOULD delete or make inaccessible encrypted request rows, encrypted submission rows, and ciphertext blobs after expiration, abandonment, successful completion, or a locally defined retention period. A Completion display SHOULD release the desktop private key when the kiosk session completes or is abandoned, subject to any legally required audit or recovery policy.

Retention of encrypted blobs can still create privacy risk because ciphertext size, timing, provider ids, storage paths, submission counts, access patterns, and IP addresses can reveal sensitive workflow metadata. Submission services and Completion displays SHOULD minimize logs, analytics, indexes, and operational dashboards that expose these metadata.

#### 9.10.4 Pointer guessing, row enumeration, and provider abuse

A Kiosk creator SHOULD generate wrapper `requestId` values with enough entropy to resist guessing during the request lifetime and provider namespace. The active implementation uses 32 random bytes encoded as base64url without padding. A Submission service SHOULD apply rate limits, anti-enumeration rules, access-control checks, and coarse expiration checks to request-row reads, submission-row writes, blob uploads, blob downloads, and subscription streams.

A Submission service SHALL NOT expose plaintext clinical content to implement these controls. A provider can rate-limit by wrapper `requestId`, row id, storage path prefix, authenticated application context, client IP, session cookie, account, or other operational metadata, but it should avoid creating persistent cross-session identifiers unless required by deployment policy.

#### 9.10.5 Size limits and denial-of-service

Phone presenters, Submission services, and Completion displays SHALL enforce bounded sizes for plaintext submissions, ciphertext blobs, provider rows, IV fields, JWK fields, and downloaded data before performing expensive parsing or decryption. They SHOULD reject unsupported compression, multipart splitting, recursive JSON expansion, excessive numbers of rows for one `requestId`, excessive retry rates, and oversized provider metadata.

Completion displays SHOULD process candidate rows defensively. A malicious relay or client can create many rows, missing blobs, malformed IVs, invalid ephemeral keys, or ciphertexts that fail authentication. Implementations SHOULD cap concurrent downloads and decryptions, apply backoff for transient provider errors, and keep operator-facing errors concise without exposing secrets or sensitive clinical content.

#### 9.10.6 Failure reporting and privacy

Phone presenters and Completion displays SHOULD distinguish wrapper failures, provider failures, cryptographic failures, SMART response validation failures, Holder-decision outcomes, and downstream workflow failures in local state. They SHOULD NOT expose private keys, raw decrypted JWS payloads, plaintext SMART responses in logs, access tokens, internal stack traces, valid-id enumeration clues, provider credentials, or sensitive clinical details in user-facing errors or telemetry.

If a deployment defines phone-to-desktop failure notifications, those notifications SHALL be protected consistently with the untrusted-relay model and SHALL NOT leak clinical content or Holder decisions to the relay in plaintext unless a deployment profile explicitly moves that information into a trusted channel. This core subsection defines successful encrypted completion; it does not require a plaintext failure row.

### 9.11 Provider abstraction

The Submission service/provider is an abstraction over storage, notification, and blob transfer. The active implementation uses an InstantDB-backed provider, but the protocol does not require InstantDB. A provider can be implemented by a database plus object storage, a message bus, a server endpoint, a local network channel, or another deployment-specific transport, provided it preserves the untrusted-relay boundary.

A provider profile or implementation that supports the kiosk flow SHALL provide capabilities equivalent to the active `KioskTransportProvider` contract:

| Capability | Required behavior |
| --- | --- |
| Request write | Accept an `EncryptedKioskRequest` and make it retrievable or resolvable by the wrapper `requestId` or an equivalent provider routing key. |
| Request read | Return the encrypted request row or envelope for a Phone presenter lookup without requiring plaintext `KioskRequestPayload` or plaintext `smartRequest`. |
| Submission write | Accept an encrypted submission blob plus row metadata sufficient for the Completion display to locate and decrypt the blob. |
| Blob download | Return the ciphertext bytes for a selected submission row while enforcing provider size and access policy. |
| Row observation | Let the Completion display subscribe, poll, or otherwise discover candidate submission rows for the active wrapper `requestId`. |

The active request row shape contains `requestId` and `encryptedRequest`. The active submission row shape contains `submissionId`, `requestId`, `iv`, `storagePath`, `storageFileId`, and `phoneEphemeralPublicKeyJwk`, while the ciphertext is stored as an opaque blob. A different provider MAY choose different row ids, storage locators, notification mechanisms, or authorization machinery, but it SHALL preserve the cryptographic inputs required by §§9.8-9.9 and SHALL NOT require access to plaintext clinical content merely to route state.

A provider profile SHOULD define:

- row and blob size limits;
- expiration and cleanup behavior;
- duplicate-row and duplicate-blob behavior;
- access-control and anti-enumeration policy;
- row-ordering or timestamp semantics if Completion displays need deterministic duplicate handling;
- storage path or blob locator validation rules;
- content type handling for opaque ciphertext blobs;
- error and retry semantics; and
- metadata minimization and logging requirements.

Provider metadata is not clinical trust. A Requester, Verifier, Phone presenter, Completion display, or downstream receiver SHALL NOT treat a provider's successful write, row timestamp, storage path, file id, app id, account id, or subscription event as proof of Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, or clinical-source provenance.

### 9.12 End-to-end kiosk example

This example is illustrative and omits byte-level fixtures, CDDL, signatures, ciphertexts, and production trust-anchor configuration. Appendix C and Appendix D own CDDL and fixture material.

1. A Requester decides that the front-desk workflow needs demographics and selected US Core clinical resources. It constructs this SMART request:

   ```json
   {
     "type": "smart-health-checkin-request",
     "version": "1",
     "id": "front-desk-us-core-001",
     "purpose": "Clinic check-in",
     "fhirVersions": ["4.0.1"],
     "items": [
       {
         "id": "patient",
         "title": "Patient demographics",
         "summary": "Demographics for check-in.",
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
         "title": "US Core clinical resources",
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

2. The Kiosk creator embeds that object directly as `KioskRequestPayload.smartRequest`, generates a fresh wrapper `requestId`, includes `encryptResponseTo.desktopPublicKeyJwk` for the Completion display's per-request desktop key, signs the kiosk request payload, encrypts the compact JWS into an `EncryptedKioskRequest`, writes the encrypted request through the provider, and displays only a Pointer URL such as:

   ```text
   https://clinic.example/verifier/submit.html#r=<kiosk-wrapper-requestId>
   ```

3. The Holder scans the Pointer URL with a phone. The Phone presenter resolves `r`, retrieves the encrypted request row, opens the request envelope, verifies the creator JWS, validates `submitTo`, timestamps, constraints, and the embedded SMART request, and then constructs a fresh phone-local §8 `org-iso-mdoc` request using `smartRequest`.

4. The Wallet/Responder processes the §8 request on the phone. It applies Holder review, Wallet policy, and §6 response construction. It returns the SMART response through §8, where the phone-local Verifier opens and validates the `org-iso-mdoc` response and extracts a `SmartHealthCheckinResponse`.

5. The Phone presenter constructs `SubmissionPlaintext` with top-level `requestId` equal to the kiosk wrapper id and `payload.smartResponse.requestId` equal to `"front-desk-us-core-001"`. It enforces `constraints.maxPlaintextBytes`, encrypts the plaintext to `encryptResponseTo.desktopPublicKeyJwk` using the response-submission suite, uploads the ciphertext blob, and writes a submission row containing the IV, phone ephemeral public key, wrapper `requestId`, and blob locator.

6. The Completion display observes a provider row for the wrapper `requestId`, downloads the ciphertext blob, decrypts with the desktop private key created for the kiosk request, verifies that the plaintext wrapper `requestId` matches, extracts `payload.smartResponse`, validates it under §6 and §6.6 against the original `smartRequest`, applies §7 trust interpretation and retained §8 validation evidence, and then displays the workflow result. If item statuses show `declined`, `partial`, `unavailable`, `unsupported`, or `error`, those are clinical response outcomes for the Requester workflow, not kiosk transport failures.

## Organizer notes

### Strengths

- Aligns the draft with active field names: `SubmissionPlaintext.requestId`, `submittedAt`, `payload`, `EncryptedPayload.iv`, `ciphertext`, and `phoneEphemeralPublicKeyJwk`.
- Keeps the kiosk wrapper `requestId` distinct from `smartRequest.id` and from `SmartHealthCheckinResponse.requestId`.
- Preserves the untrusted-relay model for both request rows and submission rows/blobs.
- Separates kiosk response-submission crypto from §8 HPKE and from request-envelope encryption while using the active ECDH/HKDF/AES-GCM primitive suite.
- Requires desktop-side validation under §6/§6.6/§7 before workflow use instead of trusting provider metadata or phone UI state.

### Caveats

- Active code demonstrates encrypted submission and provider observation, but it does not appear to enforce production single-use semantics, server-side cleanup, anti-enumeration, or complete desktop-side §6.6 validation after decrypting a provider row.
- The active completion payload is a wrapper with `kind: "smart-health-checkin-response"` and `smartResponse`; a later organizer may want a registry for completion `kind` values or a stricter schema.
- The outline mentions SHA-256 attestation for §9.8.4, but the active submission path stores only ciphertext bytes plus row metadata and does not appear to include a separate submission hash. This attempt does not invent one.
- Active demo pages expose debug information, including demo-only desktop private JWK material on the creator page. That is useful for prototype review but should remain outside production requirements.

### Open issues

- Decide whether core §9 should mandate single-use acceptance or leave exact duplicate policy to deployment profiles while strongly recommending single-use completion.
- Decide whether a completion payload evidence field is needed when the Completion display did not itself perform phone-local §8 validation.
- Decide whether Appendix B or T4.D should add JSON Schema/CDDL for `SubmissionPlaintext`, `EncryptedPayload`, and provider row shapes, or leave provider rows profile-specific.
- Decide whether a standardized submission ciphertext content type is needed beyond the active `application/octet-stream` blob storage behavior.
- Decide how phone-to-desktop failure notifications, if any, should be protected and represented without leaking Holder decisions or clinical content to the relay.

### Downstream dependencies

- T4.D should align kiosk CDDL and fixtures with the response-submission suite, `SubmissionPlaintext`, encrypted blob and row fields, base64url IV, phone ephemeral public JWK, and size-limit behavior.
- §11 and §12 should revisit replay, stale QR, pointer guessing, metadata minimization, provider logs, debug UI leakage, key custody, and denial-of-service controls.
- §13 should decide whether algorithm labels, completion `kind` values, provider backend identifiers, content types, TTL limits, and provider profiles need registry treatment.
- Appendix A should capture the normative Phone presenter, Completion display, Submission service/provider, Kiosk creator, and Requester/Verifier requirements introduced in §§9.8-9.11.
