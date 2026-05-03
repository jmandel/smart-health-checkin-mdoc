### 9.8 Submission ciphertext from phone to desktop

After the Phone presenter has successfully completed §9.7 and has obtained a valid same-device SMART Health Check-in result through §8, the Phone presenter packages the completion for return to the Completion display. This submission leg is a kiosk wrapper transport. It does not redefine the SMART response model in §6, the same-device validation rules in §8, or the clinical-source trust rules in §7.

The Phone presenter SHALL submit only encrypted response-submission state through the Submission service/provider. A Phone presenter SHALL NOT publish the plaintext SMART response, raw FHIR content, SMART Health Cards, same-device `DeviceResponse`, Digital Credentials API response object, §8 HPKE plaintext, §8 HPKE private key material, or desktop private key material to the provider.

#### 9.8.1 `SubmissionPlaintext` wrapper

The active response-submission plaintext is a JSON object called `SubmissionPlaintext`. It wraps a completion payload for kiosk return:

```json
{
  "requestId": "<kiosk-wrapper-requestId>",
  "submittedAt": 1760000005000,
  "payload": {
    "kind": "smart-health-checkin-response",
    "smartResponse": {
      "type": "smart-health-checkin-response",
      "version": "1",
      "requestId": "example-checkin-request",
      "artifacts": [],
      "requestStatus": []
    }
  }
}
```

A Phone presenter SHALL set `SubmissionPlaintext.requestId` to `KioskRequestPayload.requestId`, the wrapper request identifier validated under §9.7. It SHALL NOT set this member to `KioskRequestPayload.smartRequest.id` or to `SmartHealthCheckinResponse.requestId`.

A Phone presenter SHALL set `submittedAt` to the phone's submission time as a JSON number containing milliseconds since the Unix epoch. A Completion display MAY use `submittedAt` for display, sorting, duplicate diagnostics, or local freshness policy. The `submittedAt` value is phone-supplied metadata; by itself it is not patient identity, requester identity, clinical freshness, Holder consent proof, or clinical-source provenance.

A Phone presenter SHALL encode `payload` as a JSON object. For the active successful SMART-response completion, `payload.kind` is the string `"smart-health-checkin-response"` and `payload.smartResponse` is the `SmartHealthCheckinResponse` object extracted and validated from the §8 same-device flow. This wrapper does not alter the §6 response shape. A Verifier or Completion display SHALL validate `payload.smartResponse` under §6 and SHALL compare `payload.smartResponse.requestId` to `KioskRequestPayload.smartRequest.id`, not to the kiosk wrapper `requestId`.

A deployment profile MAY define additional non-clinical completion payload kinds, such as failure notifications, only if those payloads are clearly distinguished from `"smart-health-checkin-response"` and cannot be mistaken for a validated §6 SMART response. The core version 1.0 successful completion payload is the SMART-response payload above.

#### 9.8.2 Plaintext size enforcement

The signed `KioskRequestPayload.constraints.maxPlaintextBytes` member limits the UTF-8 JSON bytes of `SubmissionPlaintext` before encryption. A Phone presenter SHALL serialize the `SubmissionPlaintext` using the response-submission serialization selected by the profile, count the resulting UTF-8 bytes, and reject submission before encryption when the byte count exceeds `constraints.maxPlaintextBytes`.

The active implementation uses deterministic key-sorted JSON for this wrapper-size check and encryption input. The deterministic rule recursively sorts object member names lexicographically, omits members whose value is `undefined`, preserves array order, and serializes with JSON stringification before UTF-8 encoding. This rule is for the kiosk response-submission wrapper. It does not define canonical JSON for the transport-neutral SMART response outside this wrapper.

A Phone presenter SHOULD also enforce its own implementation maximum even when the signed constraint is larger. The active demo maximum is 25 MiB of plaintext (`26214400` bytes). A provider or Submission service MAY apply lower row, object, or blob-size limits as defense in depth, provided failures are reported without exposing plaintext clinical content.

#### 9.8.3 Response-submission encryption

For the active version 1.0 kiosk profile, the Phone presenter encrypts `SubmissionPlaintext` to the desktop public key signed in `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` using the response-submission suite labeled:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite, the Phone presenter SHALL:

1. verify that `KioskRequestPayload.encryptResponseTo.alg` is `ECDH-P256+HKDF-SHA256+AES-GCM` and that `desktopPublicKeyJwk` is importable and acceptable as a P-256 ECDH public key for this use;
2. generate a fresh ephemeral ECDH P-256 key pair for the submission;
3. derive the ECDH shared secret between the phone ephemeral private key and `desktopPublicKeyJwk`;
4. derive an AES-256-GCM content-encryption key with HKDF-SHA-256 using `salt = utf8(KioskRequestPayload.requestId)` and `info = utf8("smart-health-checkin-kiosk-response-v1")`;
5. generate a fresh 96-bit AES-GCM IV;
6. encrypt the UTF-8 `SubmissionPlaintext` bytes using AES-GCM with `additionalData = utf8(KioskRequestPayload.requestId)`; and
7. return the IV, the phone ephemeral public JWK, and the ciphertext bytes or blob to the provider as opaque submission state.

The response-submission encryption suite is distinct from the §8 HPKE suite and distinct from the §9.3 request-envelope encryption. It uses a similar P-256 ECDH, HKDF-SHA-256, and AES-GCM primitive family in active code, but it has its own HKDF `info` string, its own ephemeral phone key, its own IV, and its own plaintext wrapper.

A Phone presenter SHALL NOT reuse the §8 HPKE recipient key, §8 `encryptionInfo`, §8 `SessionTranscript`, §9.3 request-envelope ephemeral key, request-opening private key, desktop private key, or any key derived for a different `requestId` as the response-submission encryption key.

#### 9.8.4 Submission row and encrypted blob

A Submission service/provider carries the encrypted submission as opaque routing state. The active provider writes the ciphertext bytes as a storage blob with content type `application/octet-stream` and writes a small realtime submission row equivalent to:

```json
{
  "submissionId": "<provider-submission-id>",
  "requestId": "<kiosk-wrapper-requestId>",
  "storagePath": "submissions/<kiosk-wrapper-requestId>/<provider-submission-id>.bin",
  "storageFileId": "<provider-storage-file-id>",
  "iv": "<base64url-96-bit-iv>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

A Phone presenter or provider implementation that uses this row shape SHALL set row `requestId` to `SubmissionPlaintext.requestId`, SHALL place the encrypted blob at a storage path bound to that `requestId` and `submissionId`, and SHALL include the IV and phone ephemeral public JWK needed by the Completion display to decrypt the blob. The provider row is not clinical evidence and is not trusted to assert the SMART response, patient identity, Holder consent, or clinical provenance.

A Phone presenter SHOULD reject or abort writes when the encrypted blob exceeds the selected implementation limit. The active code applies a blob guard of `constraints.maxPlaintextBytes + 1024` bytes, with a 25 MiB plaintext default. A Completion display SHOULD also cap downloaded blob size before decryption to bound memory and denial-of-service risk.

The active outline mentions SHA-256 attestation. The active slim row no longer carries a plaintext or ciphertext digest; it relies on AES-GCM authentication, the `requestId` AAD binding, path checks, and post-decryption plaintext validation. A deployment profile MAY add a digest or integrity metadata for operational reasons, but it SHALL NOT treat unauthenticated provider metadata as a substitute for AES-GCM authentication and §6/§8 validation.

### 9.9 Desktop completion processing

The Completion display is the desktop, kiosk, staff workstation, or server-side component that created or is associated with the kiosk request and later observes encrypted submission state. It consumes a response only after local decryption and validation. The relay remains untrusted.

#### 9.9.1 Observe rows for the wrapper request

A Completion display SHALL watch, subscribe, poll, or otherwise query the selected provider for submission rows associated with the active `KioskRequestPayload.requestId`. It SHALL treat provider rows as untrusted notifications that opaque encrypted state might be available. It SHALL NOT treat row presence, `submissionId`, `storagePath`, `storageFileId`, upload time, provider account, provider ACL result, or metadata ordering as proof of clinical validity or Holder approval.

For the active provider row shape, the Completion display SHALL filter candidate rows by exact `requestId` equality and SHALL reject or ignore rows whose `storagePath` is not bound to the same `requestId` under the selected provider path rule. If several rows are observed for one request, the Completion display SHALL process them according to the duplicate and replay policy in §9.10.

#### 9.9.2 Download and decrypt locally

For each candidate row selected for processing, the Completion display SHALL download the ciphertext blob from the provider using the row's storage locator and provider API. It SHALL enforce a maximum download size before attempting decryption.

The Completion display SHALL decrypt the blob using the desktop private key generated and retained at §9.4 request creation time for the matching `encryptResponseTo.desktopPublicKeyJwk`. For the active suite, it SHALL:

1. import `row.phoneEphemeralPublicKeyJwk` as a P-256 ECDH public key acceptable for response-submission decryption;
2. derive the ECDH shared secret between the desktop private key and the row phone ephemeral public key;
3. derive the AES-256-GCM key with HKDF-SHA-256 using `salt = utf8(KioskRequestPayload.requestId)` and `info = utf8("smart-health-checkin-kiosk-response-v1")`;
4. base64url-decode `row.iv` as the 96-bit AES-GCM IV;
5. decrypt the blob using AES-GCM with `additionalData = utf8(KioskRequestPayload.requestId)`; and
6. parse the resulting UTF-8 JSON as `SubmissionPlaintext`.

A Completion display SHALL reject the candidate submission if row shape validation fails, the blob is unavailable beyond local retry policy, a size limit is exceeded, base64url decoding fails, the phone public JWK is missing or unacceptable, key agreement fails, AES-GCM authentication fails, UTF-8 decoding fails, JSON parsing fails, or the plaintext is not a syntactically valid `SubmissionPlaintext` object.

A Completion display SHALL keep the desktop private key out of the untrusted relay. Browser-held desktop private keys in the static demo illustrate protocol shape; production key custody is a deployment and security-profile decision.

#### 9.9.3 Bind and validate the completion payload

After decryption, a Completion display SHALL compare `SubmissionPlaintext.requestId` to the active `KioskRequestPayload.requestId` using exact string equality. It SHALL reject the submission if the values differ. This check binds the decrypted wrapper plaintext to the kiosk session; it is not patient matching, clinical freshness, Holder identity, or clinical-source provenance by itself.

For a successful active SMART-response completion, the Completion display or Verifier SHALL require `SubmissionPlaintext.payload.kind` to be `"smart-health-checkin-response"` and SHALL require `SubmissionPlaintext.payload.smartResponse` to be present as a JSON object. It SHALL then apply all applicable §6, §7, and §8 validation before workflow use, including at least:

- SMART response `type` and `version` validation under §6.1;
- exact comparison of `SmartHealthCheckinResponse.requestId` to `KioskRequestPayload.smartRequest.id`, not to the kiosk wrapper `requestId`;
- Artifact id, `mediaType`, `fulfills[]`, core media-type, FHIR-version, and extension-media validation under §§6.2-6.6;
- `requestStatus[]` coverage for every original `smartRequest.items[].id` exactly once under §6.4 and §6.6;
- same-device mdoc, HPKE, `SessionTranscript`, issuer/device, and response-extraction validation outcomes produced by §8 for the phone-local flow, to the extent those outcomes are included in or retained with the completion in the selected implementation; and
- trust-layer evaluation under §7, including the rule that raw FHIR JSON is patient-mediated unless separate signatures, provenance, Artifact evidence, or deployment policy establish clinical-source trust.

If the active phone payload contains only the validated `smartResponse` and not the raw same-device debug artifacts, the Completion display can validate the §6 response shape and original-request binding, but it cannot reconstruct every §8 byte-level validation input from provider metadata. A deployment that requires the desktop side to independently audit §8 details SHALL define how the needed §8 validation record or evidence is retained and protected without exposing plaintext clinical content to the relay.

The Completion display MAY render a completion status, Artifact summary, or Holder-facing/staff-facing workflow result after validation succeeds. It SHALL distinguish local display of a decrypted, validated payload from provider row status. It SHALL NOT expose decrypted clinical content, raw ciphertext, private keys, stack traces, or request-id enumeration hints in logs or error surfaces beyond what deployment policy permits.

### 9.10 Replay, expiration, and abuse considerations

The kiosk submission leg uses short-lived, high-entropy wrapper ids, signed expiration, encryption, provider path checks, and validation, but those controls do not automatically make a deployment single-use or abuse-resistant. Implementations need explicit replay, retention, rate-limit, and cleanup policy.

#### 9.10.1 Single-use and duplicate submissions

A production Kiosk creator or Completion display SHOULD treat each kiosk wrapper `requestId` as single-use for clinical workflow acceptance. After accepting one valid SMART-response completion for a request, it SHOULD mark the kiosk session complete, stop displaying the QR code, stop accepting additional clinical completions for routine workflow use, and either ignore, quarantine, or separately review later submissions for the same `requestId`.

The active demo observes all matching submission rows and opens them until one valid response is received; it does not enforce a provider-level single-use lock, atomic claim, deletion, or server-side completion state. A deployable provider profile SHOULD add an atomic accepted/completed state, server-side write-once rule, or equivalent workflow guard when duplicate acceptance would be harmful.

A Completion display SHALL NOT accept a later duplicate merely because it appears newer in provider ordering or has a later `submittedAt`. Provider row ordering and phone-supplied times are untrusted for clinical acceptance. If multiple valid submissions are possible under local policy, the Requester/Verifier SHALL define deterministic reconciliation, staff review, or rejection behavior.

#### 9.10.2 Expiration and stale pointers

A Phone presenter SHALL enforce request expiration during §9.7 before Wallet invocation. A Completion display SHOULD also enforce the signed `KioskRequestPayload.expiresAt` and local completion window before accepting a submission for workflow use. A provider MAY reject new submission writes or hide request rows after expiration as defense in depth, but relay expiration is not a substitute for cryptographic and signed-payload validation.

A Kiosk creator SHOULD display the Pointer URL only while the kiosk session is active and SHOULD stop displaying or refresh it after expiration, abandonment, staff cancellation, or successful completion. A stale QR code or captured Pointer URL remains a bearer locator for encrypted request state until provider cleanup removes it; possession of the pointer does not prove Holder consent or authorization.

Deployments SHOULD define clock-skew tolerance for `createdAt`, `expiresAt`, and `submittedAt`. The active request lifetime is ten minutes and active validation tolerates a `createdAt` up to one minute in the future. Those values are implementation evidence, not universal production limits.

#### 9.10.3 Cleanup and retention

A Submission service/provider SHOULD delete or make inaccessible expired request rows, submission rows, and encrypted blobs according to a short retention policy suitable for the check-in workflow. A Completion display or Requester SHOULD delete desktop private keys and any decrypted `SubmissionPlaintext` not needed for the downstream workflow after processing under local retention policy.

Provider cleanup is privacy and abuse mitigation, not the root confidentiality control. The relay still SHALL be treated as untrusted while rows and blobs exist. Logs, analytics, crash reports, browser storage, and telemetry SHOULD avoid retaining Pointer URLs, `requestId` values, storage paths, key ids, IP addresses, user-agent fingerprints, timestamps, and access patterns longer than needed.

#### 9.10.4 Pointer guessing, rate limits, and denial of service

A Kiosk creator SHOULD generate wrapper `requestId` values with enough entropy to resist online guessing within the provider namespace and request lifetime. The active implementation uses 32 random bytes encoded as base64url without padding. Provider access controls SHOULD require knowledge of the exact `requestId` and storage path for reads, as the active InstantDB rules do, but such controls are defense in depth.

A Submission service/provider SHOULD apply rate limits, quotas, object-size limits, path-shape checks, anti-enumeration controls, and abuse monitoring to request reads, submission writes, storage uploads, and storage downloads. It SHOULD bound the number of submissions and blobs accepted for one `requestId`. It SHOULD reject malformed rows and storage paths before they cause expensive downloads or decrypt attempts.

A Completion display SHOULD cap the number of rows processed per request, apply retry backoff for not-yet-available blobs, avoid unbounded parallel downloads, and report only coarse errors to users. It SHOULD distinguish transient provider availability from cryptographic or validation failure without leaking whether guessed request ids are valid.

### 9.11 Provider abstraction

The Submission service/provider is an opaque transport abstraction. It stores and routes encrypted request and submission state, and it notifies the Completion display that a candidate encrypted submission exists. It is not a clinical trust anchor and does not need access to plaintext SMART requests or SMART responses.

A provider abstraction for the active kiosk profile needs these capabilities:

| Capability | Required behavior |
| --- | --- |
| Write request | Store an `EncryptedKioskRequest` under the wrapper `requestId` or an equivalent lookup key without seeing plaintext `KioskRequestPayload` or `smartRequest`. |
| Read request | Return the request row or encrypted envelope for an exact wrapper `requestId` lookup during §9.7. |
| Write submission | Accept a `SubmissionPlaintext`-derived encrypted blob plus row metadata for the same wrapper `requestId`, without seeing plaintext clinical response content. |
| Download submission blob | Let the Completion display retrieve the ciphertext blob identified by an observed submission row, subject to provider policy and size limits. |
| Observe submission rows | Let the Completion display subscribe, poll, or query candidate submission rows for one wrapper `requestId`. |

The active TypeScript abstraction `KioskTransportProvider` exposes these operations as `writeRequest`, `readRequest`, `writeSubmission`, `downloadSubmissionBlob`, and `useSubmissionRows`, along with provider `name`, `appId`, and `configured` state. The active InstantDB provider is one implementation example; the protocol does not require InstantDB specifically.

A provider MAY enforce access control, anti-enumeration, row-field allow-lists, storage-path rules, object-size limits, quotas, rate limits, coarse expiration, cleanup, audit logging, or abuse detection. Those controls are defense in depth. A Requester, Verifier, Phone presenter, or Completion display SHALL NOT rely on provider metadata or provider access control as the only protection for clinical content or as proof that a SMART response is valid.

A provider row SHOULD contain only routing and decryption metadata that the receiver cannot derive otherwise. The active request row contains `requestId` and `encryptedRequest`. The active submission row contains `submissionId`, `requestId`, `storagePath`, `storageFileId`, `iv`, and `phoneEphemeralPublicKeyJwk`. Provider profiles SHOULD minimize additional metadata because row ids, storage paths, app ids, key ids, timestamps, IP addresses, and access patterns can be sensitive even when ciphertext remains confidential.

Provider-specific identifiers such as `submitTo.backend: "instantdb"`, provider application ids, storage file ids, and row ids are transport routing metadata. They are not requester identity, patient identity, clinical-source provenance, or Holder consent.

### 9.12 End-to-end kiosk example

This example is illustrative. It ties together T4.A request creation, T4.B phone resolution and same-device re-entry, and T4.C encrypted submission and completion processing. It does not define byte fixtures, CDDL, fixed keys, fixed hashes, fixed ciphertexts, production trust anchors, or required clinical content. Kiosk CDDL and fixture vectors are deferred to T4.D.

1. **Desktop creates a SMART request.** A clinic kiosk constructs a transport-neutral SMART request under §5:

   ```json
   {
     "type": "smart-health-checkin-request",
     "version": "1",
     "id": "example-checkin-request",
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
       }
     ]
   }
   ```

2. **Kiosk creator publishes pointer state.** The Kiosk creator generates a fresh wrapper `requestId`, a desktop P-256 response-encryption key pair, and a signed `KioskRequestPayload` that embeds the SMART request directly as `smartRequest`. It includes `encryptResponseTo.desktopPublicKeyJwk` and `constraints.maxPlaintextBytes`, encrypts the compact JWS into `EncryptedKioskRequest`, writes the encrypted request through the provider, and displays only a Pointer URL such as:

   ```text
   https://clinic.example/verifier/submit.html#r=<kiosk-wrapper-requestId>
   ```

3. **Phone resolves and re-enters §8.** The Holder opens the pointer on the phone. The Phone presenter parses `#r`, reads the provider request row, opens `EncryptedKioskRequest`, verifies the creator JWS, validates timestamps, provider binding, algorithms, constraints, and direct `smartRequest`, and constructs a fresh phone-local §8 `org-iso-mdoc` request using the embedded SMART request. It does not reuse any §8 `DeviceRequest`, `encryptionInfo`, or Wallet response from the QR or provider row.

4. **Wallet returns a SMART response through §8.** After Holder review, the Wallet/Responder constructs a §6 SMART response whose `requestId` equals `"example-checkin-request"`, the SMART request `id`. The phone-local Verifier applies §8 processing and §6 validation. A minimal successful response might be:

   ```json
   {
     "type": "smart-health-checkin-response",
     "version": "1",
     "requestId": "example-checkin-request",
     "artifacts": [
       {
         "id": "artifact-patient",
         "mediaType": "application/fhir+json",
         "fhirVersion": "4.0.1",
         "fulfills": ["patient"],
         "value": {
           "resourceType": "Patient",
           "id": "example"
         }
       }
     ],
     "requestStatus": [
       { "item": "patient", "status": "fulfilled" }
     ]
   }
   ```

5. **Phone encrypts completion for the desktop.** The Phone presenter wraps the validated response as:

   ```json
   {
     "requestId": "<kiosk-wrapper-requestId>",
     "submittedAt": 1760000005000,
     "payload": {
       "kind": "smart-health-checkin-response",
       "smartResponse": {
         "type": "smart-health-checkin-response",
         "version": "1",
         "requestId": "example-checkin-request",
         "artifacts": [],
         "requestStatus": []
       }
     }
   }
   ```

   In a real submission, `smartResponse` is the complete §6 object produced through §8. The Phone presenter enforces `constraints.maxPlaintextBytes`, encrypts the wrapper to `encryptResponseTo.desktopPublicKeyJwk` with the §9.8 response-submission suite, uploads the ciphertext blob, and writes a submission row containing only routing/decryption metadata.

6. **Completion display opens and validates.** The Completion display observes a submission row for the wrapper `requestId`, downloads the ciphertext blob, decrypts with the desktop private key retained from request creation, checks `SubmissionPlaintext.requestId`, extracts `payload.smartResponse`, validates it against the original `smartRequest`, applies §6/§8/§7 trust and response-processing rules, and then updates the kiosk workflow. The provider never receives plaintext SMART request or plaintext SMART response content.

## Organizer notes

### Strengths

- Aligns with accepted T4.A/T4.B: direct `smartRequest`, pointer-only `#r`, distinct wrapper and clinical request identifiers, untrusted relay, and phone-local §8 re-entry.
- Captures active code shapes: `SubmissionPlaintext`, `EncryptedPayload`, InstantDB slim submission rows, storage blob, `KioskTransportProvider`, `completeKioskRequest`, and `openKioskSubmission` behavior.
- Separates the response-submission ECDH/HKDF/AES-GCM construction from §8 HPKE and from §9.3 request-envelope encryption.
- States deployable replay/cleanup/rate-limit guidance without pretending the demo currently enforces single-use or provider cleanup.

### Caveats

- Active phone submission currently wraps only `{ kind: "smart-health-checkin-response", smartResponse }`; it does not submit a full independently auditable §8 validation transcript to the desktop. The text calls out that deployments needing desktop-side §8 audit evidence must define protected retention or carriage.
- Active row shape has no SHA-256 digest despite the outline's `9.8.4 SHA-256 attestation` note. This draft treats AES-GCM authentication and post-decryption checks as the active integrity mechanism and leaves optional digests to deployment profiles.
- Active demo key custody is browser/static and suitable only for demonstration. Production key handling remains for security/deployment guidance.

### Open issues

- Decide in T4.D whether to specify a response-submission JSON schema/CDDL and exact deterministic JSON fixture vectors for `SubmissionPlaintext`.
- Decide in conformance closure whether the 25 MiB plaintext default, `+1024` blob guard, ten-minute TTL, one-minute future-skew tolerance, and 32-byte wrapper id entropy become core requirements, profile requirements, or implementation examples.
- Define whether phone-to-desktop failure notifications are in core v1.0 or an extension payload kind.
- Define a production single-use mechanism if certification requires more than Completion-display-side duplicate rejection.

### Downstream dependencies

- T4.D should align kiosk CDDL/fixtures with `SubmissionPlaintext`, IV/base64url handling, phone ephemeral public JWK, storage-row field names, HKDF `info`, salt/AAD, and duplicate/failure vectors.
- §11 and §12 should revisit relay metadata leakage, QR substitution, pointer guessing, DoS, demo-key treatment, retained desktop private keys, logs, browser storage, and cleanup.
- §13 and Appendix A should mirror the final algorithm labels, provider capabilities, content types, JWS types, and conformance targets selected from this draft.
