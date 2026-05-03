### 9.8 Submission ciphertext from phone to desktop

This subsection defines the phone-to-desktop submission leg that begins only after the Phone presenter has completed §9.7 and has obtained a SMART response or credential completion through the phone-local §8 flow. It does not redefine kiosk request creation, Pointer URL rules, provider request lookup, or same-device re-entry. It also does not change the clinical response model in §6 or the same-device validation rules in §8.

The response-submission ciphertext is a kiosk wrapper artifact. It is distinct from the §8 HPKE ciphertext returned by the Wallet/Responder and distinct from the §9.5 `EncryptedKioskRequest` envelope. The Submission service routes only opaque submission state and ciphertext; it is not trusted with plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder decisions, or clinical trust decisions.

#### 9.8.1 `SubmissionPlaintext` shape

After a valid same-device result is available, the Phone presenter packages the result in a response-submission plaintext envelope. For the active profile, the logical plaintext shape is:

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

A Phone presenter SHALL set `SubmissionPlaintext.requestId` to the kiosk wrapper `KioskRequestPayload.requestId` that was validated in §9.7. This value is a kiosk session binding and relay-correlation value. It is not the clinical SMART request id, not patient identity, and not a freshness proof by itself.

A Phone presenter SHALL set `submittedAt` to the time at which it packages the submission, using the same millisecond-since-Unix-epoch numeric convention used by the active kiosk wrapper timestamps. A Completion display MAY use this value for display, duplicate handling, stale-submission policy, and audit correlation, but SHALL NOT treat `submittedAt` alone as proof that the underlying Wallet response is fresh or clinically valid.

A Phone presenter SHALL place the same-device completion result in `payload`. For a successful SMART Health Check-in response, the active payload shape is `{ "kind": "smart-health-checkin-response", "smartResponse": <SmartHealthCheckinResponse> }`. The `smartResponse` member is the transport-neutral SMART response defined in §6. This subsection does not add fields to `SmartHealthCheckinResponse`, does not create an alternate response model, and does not permit replacing §6 validation with wrapper validation.

A Phone presenter SHALL NOT include plaintext §8 `DeviceResponse` CBOR, Digital Credentials API `data.response`, §8 HPKE `enc` or `cipherText`, §8 `deviceRequest`, §8 `encryptionInfo`, request-opening private keys, desktop private keys, Wallet secrets, or provider credentials in `SubmissionPlaintext.payload`. An implementation MAY retain such material locally for debugging only under deployment policy, but it is not part of the version 1.0 kiosk submission plaintext.

#### 9.8.2 Size enforcement

A Phone presenter SHALL serialize `SubmissionPlaintext` as UTF-8 JSON before encryption. The active implementation uses the same deterministic key-sorted JSON serialization helper used by the kiosk wrapper code for byte counting and encryption of the submission plaintext. The clinical SMART response object remains subject to §6 semantics rather than to a global canonical JSON rule.

Before encrypting, a Phone presenter SHALL enforce the signed `KioskRequestPayload.constraints.maxPlaintextBytes` limit over the exact bytes it will encrypt. A Phone presenter SHALL fail safely and SHALL NOT write a submission row when the encoded plaintext exceeds that signed limit.

An implementation MAY impose a stricter local maximum. The active code also enforces an application maximum of 25 MiB for plaintext and an encrypted-blob guard of plaintext maximum plus 1024 bytes. A Submission service or provider SHOULD reject encrypted blobs that exceed its configured blob-size ceiling and SHOULD make those ceilings available to components that need to fail before upload. Provider-side size checks are defense in depth and do not replace the Phone presenter's enforcement of the signed plaintext limit.

#### 9.8.3 Response-submission encryption

For version 1.0, the Phone presenter SHALL encrypt the encoded `SubmissionPlaintext` to `KioskRequestPayload.encryptResponseTo.desktopPublicKeyJwk` using the response-submission suite labeled:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite:

- the Phone presenter generates a fresh ephemeral ECDH P-256 key pair for each submission encryption;
- the recipient public key is the signed `encryptResponseTo.desktopPublicKeyJwk` value from the verified kiosk request payload;
- the ECDH shared secret is input to HKDF with SHA-256;
- the HKDF salt is `utf8(KioskRequestPayload.requestId)`;
- the HKDF `info` string is `utf8("smart-health-checkin-kiosk-response-v1")`;
- the derived content-encryption key is AES-GCM with a 256-bit key;
- the AES-GCM IV is 96 bits and fresh for the encrypted submission;
- AES-GCM additional authenticated data is `utf8(KioskRequestPayload.requestId)`; and
- the ciphertext bytes are the AES-GCM ciphertext including the authentication tag over the encoded `SubmissionPlaintext` bytes.

The Phone presenter SHALL publish or provide, as submission metadata, enough information for the Completion display to open the ciphertext. For the active provider row shape this metadata is:

```json
{
  "submissionId": "<provider-generated-or-phone-generated-id>",
  "requestId": "<kiosk-wrapper-requestId>",
  "storagePath": "submissions/<requestId>/<submissionId>.bin",
  "storageFileId": "<provider-file-id>",
  "iv": "<base64url-96-bit-iv>",
  "phoneEphemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

The encrypted blob stored at `storagePath` is the raw ciphertext byte string, not base64url JSON. The active provider uploads it with content type `application/octet-stream`. The row metadata and storage path are provider routing metadata; they are not clinical trust evidence.

A Phone presenter SHALL NOT publish the plaintext `SubmissionPlaintext`, plaintext `SmartHealthCheckinResponse`, FHIR resources, SMART Health Cards, or Wallet response bytes to the Submission service. A Phone presenter SHALL NOT encrypt the submission to a public key obtained only from the provider row, Pointer URL, or unauthenticated page state; it uses the `desktopPublicKeyJwk` that was signed in the kiosk request payload and validated under §9.7.

#### 9.8.4 Optional ciphertext digest metadata

A provider profile MAY carry a SHA-256 digest of the encrypted blob or another integrity hint for operational diagnostics, upload confirmation, deduplication, or fixture review. Such a digest is optional in the active row shape and is not required for Completion display decryption, because AES-GCM authentication already protects the encrypted plaintext under the derived key and request-id AAD.

If a provider profile defines a ciphertext digest field, the Phone presenter SHALL compute it over the exact encrypted blob bytes, the provider SHALL preserve it without rewriting the blob, and the Completion display SHALL treat a digest mismatch as a failed or corrupted submission. A ciphertext digest does not authenticate clinical content to the relay, does not replace AES-GCM authentication, and does not replace §6, §7, or §8 validation.

### 9.9 Desktop completion processing

The Completion display is the kiosk-side or desktop component that finishes the kiosk session after the Phone presenter writes an encrypted submission. It can poll, subscribe, or otherwise observe the selected provider for submission rows associated with the wrapper `requestId`. The provider remains untrusted for clinical content and for clinical trust decisions.

#### 9.9.1 Observe provider rows for the kiosk request

A Completion display SHALL retain the verified kiosk request payload, the original embedded `smartRequest`, and the desktop private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk` until completion, expiration, abandonment, or cleanup.

A Completion display SHALL observe or query the Submission service for submission rows whose row-level `requestId` equals the kiosk wrapper `KioskRequestPayload.requestId` for the active session. It SHALL ignore rows whose `requestId` does not exactly match the active wrapper request id. When the provider shape includes a storage path convention, a Completion display SHOULD require the row `storagePath` to match the provider profile, such as `submissions/<requestId>/<submissionId>.bin` for the active InstantDB example.

A Completion display SHALL NOT treat row presence, provider authorization, storage metadata, `storageFileId`, `submissionId`, `storagePath`, timestamps, or provider application identifiers as proof of Holder consent, patient identity, Wallet authenticity, SMART response validity, clinical-source provenance, or workflow completion.

#### 9.9.2 Download and decrypt locally

For each candidate row it chooses to process, the Completion display SHALL download the encrypted blob through the provider's `downloadSubmissionBlob` capability or equivalent. It SHALL enforce provider and implementation size limits before attempting to allocate or decrypt unbounded data.

The Completion display SHALL decrypt the blob locally using the desktop private key generated for the kiosk request, the row `phoneEphemeralPublicKeyJwk`, the row `iv`, and the response-submission construction in §9.8.3:

```text
ECDH P-256 shared secret = ECDH(desktop private key, row.phoneEphemeralPublicKeyJwk)
HKDF-SHA-256 salt        = utf8(KioskRequestPayload.requestId)
HKDF-SHA-256 info        = utf8("smart-health-checkin-kiosk-response-v1")
AES-GCM key length       = 256 bits
AES-GCM IV               = base64url-decode(row.iv)
AES-GCM AAD              = utf8(KioskRequestPayload.requestId)
plaintext                = SubmissionPlaintext UTF-8 JSON bytes
```

The Completion display SHALL reject the submission if base64url decoding fails, the phone ephemeral public key cannot be imported or is unacceptable, key agreement fails, AES-GCM authentication fails, plaintext UTF-8 decoding fails, JSON parsing fails, or the plaintext is not a `SubmissionPlaintext` object.

A Completion display SHALL keep the desktop private key out of the untrusted provider's control. Browser-resident demo key material is demonstration behavior; production deployments need a key-custody model appropriate to the Completion display's trust boundary.

#### 9.9.3 Validate binding and clinical response before workflow use

After decryption, the Completion display SHALL compare `SubmissionPlaintext.requestId` to the verified kiosk wrapper `KioskRequestPayload.requestId` using exact string equality. It SHALL reject the submission if the values differ. This check binds the decrypted submission to the kiosk session; it does not prove patient identity or freshness by itself.

For a payload whose `kind` is `smart-health-checkin-response`, the Completion display, acting as Verifier and response consumer for the kiosk workflow, SHALL validate `payload.smartResponse` as a `SmartHealthCheckinResponse` under §6 and SHALL apply the §6.6 cross-validation rules against the original embedded `smartRequest`. In particular, `payload.smartResponse.requestId` SHALL exactly equal `KioskRequestPayload.smartRequest.id`, not the kiosk wrapper `requestId`.

The Completion display SHALL also account for the §8 validation performed for the phone-local presentation before treating the response as presentation-valid. In deployments where the Phone presenter performs §8 Verifier-side processing and submits only the extracted SMART response, the Completion display SHALL accept the submission for workflow use only if that §8 validation result is available through a trusted local channel, a deployment-defined attestation, or an architecture in which the Completion display itself can perform the relevant §8 checks before extraction. A provider row or storage blob is not such an attestation.

A Completion display SHALL apply §7 trust interpretation before workflow use. Wrapper decryption, row matching, and successful submission decryption do not create clinical-source provenance for unsigned raw FHIR JSON, do not make the relay trusted, and do not prove that the Holder is the intended patient. A Completion display or downstream Requester MAY display completion status, route the SMART response to local workflow, quarantine it, or ask staff to reconcile it according to deployment policy, but SHALL NOT bypass required §6, §7, or §8 validation because a provider row arrived.

A Completion display SHOULD avoid showing sensitive clinical details on public kiosk screens. It SHOULD distinguish a transport-level state such as "encrypted submission received" from a validation state such as "SMART response accepted for this kiosk session" and from downstream states such as "imported into the EHR".

### 9.10 Replay, expiration, and abuse considerations

Kiosk response submission is exposed to bearer locators, untrusted relays, shared displays, network delay, duplicate writes, and attempted denial of service. This subsection gives deployable requirements and guidance while recognizing that the active demo provider does not enforce every production control.

#### 9.10.1 Single-use and duplicate submissions

A deployment that uses the kiosk flow for production clinical workflow SHALL define single-use or duplicate-handling policy for each kiosk wrapper `requestId`. At minimum, the Completion display or a trusted application component SHALL ensure that only one accepted submission becomes the authoritative completion result for a kiosk session unless a deployment workflow explicitly permits multiple accepted submissions.

A Completion display SHOULD treat the first submission that decrypts successfully and passes all required validation as the accepted completion result, then mark the kiosk session complete and stop displaying the QR code. Later submissions for the same wrapper `requestId` SHOULD be ignored, quarantined, or shown as duplicates according to local policy. A Completion display SHALL NOT merge clinical Artifacts from multiple submissions for the same kiosk session unless a deployment profile defines how multiple Holder-approved responses are authenticated, ordered, reconciled, and audited.

A Submission service MAY prevent duplicate submission rows, make submission rows immutable, or provide compare-and-set completion state. These controls are useful defense in depth, but the Completion display and Requester cannot rely on an untrusted relay alone to decide clinical acceptance.

#### 9.10.2 Expiration, stale QR codes, and cleanup

A Kiosk creator sets `createdAt` and `expiresAt` in the signed kiosk request payload under §9.4. The active implementation uses a ten-minute request lifetime. A Phone presenter SHALL reject expired kiosk requests under §9.7 before Wallet invocation. A Phone presenter SHOULD also refuse to submit a response after the signed `expiresAt` unless the deployment profile explicitly defines a grace period for an already-started same-device presentation.

A Completion display SHALL apply an expiration policy before accepting a submission for workflow use. The policy SHOULD reject submissions whose kiosk request expired before the phone submitted the response, whose `submittedAt` is outside the accepted clock-skew or grace window, or whose row appears after the kiosk session was abandoned or replaced. Clock-skew windows and grace periods are deployment policy and SHOULD be short for in-person kiosk sessions.

A Kiosk creator or Completion display SHOULD stop displaying the Pointer URL after expiration, abandonment, or successful completion. A Submission service SHOULD remove or make inaccessible expired request rows, orphaned encrypted request envelopes, submission rows, and encrypted blobs according to retention policy. Cleanup reduces replay, correlation, and storage-abuse risk, but deletion from the relay is not a substitute for cryptographic validation.

#### 9.10.3 Pointer guessing, ciphertext swapping, and replay

A Kiosk creator SHOULD generate wrapper `requestId` values with enough entropy to resist guessing during the request lifetime and within the provider namespace; the active implementation uses 32 random bytes encoded as base64url without padding. Submission services SHOULD require exact request-id knowledge for request and submission lookup and SHOULD avoid enumerable request or file listings.

A Completion display SHALL bind every accepted submission to the expected wrapper `requestId` through provider row filtering, response-submission AES-GCM AAD, decrypted `SubmissionPlaintext.requestId`, and §6.6 validation against `smartRequest.id`. These checks make simple ciphertext swapping across kiosk sessions fail decryption or validation when the wrong request id or key is used.

Replay of the same provider row and blob can still produce a valid decryption for the same kiosk session. Therefore freshness and single-use are application-state decisions in addition to cryptographic checks. A Completion display SHALL NOT treat successful decryption of an old blob as sufficient when the session is already complete, expired, abandoned, or superseded.

#### 9.10.4 Rate limits, denial of service, and size limits

A Submission service SHOULD enforce rate limits, write limits, storage quotas, row-shape validation, blob-size ceilings, and anti-enumeration controls for requests, submissions, and file downloads. It SHOULD make request rows and submission rows immutable once created unless a deployment profile defines safe update semantics.

A Phone presenter SHALL enforce the signed plaintext size limit before encryption. A Completion display and Submission service SHOULD enforce encrypted-blob size limits before download, allocation, decryption, or rendering. Components SHOULD fail closed for malformed rows, invalid public keys, invalid IVs, unexpected storage paths, oversized blobs, repeated failed decryptions, and excessive duplicate submissions.

Denial-of-service protections SHALL NOT require the untrusted Submission service to receive plaintext SMART requests, plaintext SMART responses, raw FHIR content, or private key material. Provider-side rejection reasons and logs SHOULD avoid revealing whether a guessed `requestId` exists.

#### 9.10.5 Logging and metadata minimization

Kiosk metadata can be sensitive even when clinical content is encrypted. Pointer values, wrapper request ids, submission ids, storage paths, key ids, provider application ids, timestamps, IP addresses, user agents, row counts, and access patterns can reveal that a Holder is checking in and can support correlation across sessions.

A Kiosk creator, Phone presenter, Submission service, Completion display, and Requester SHOULD minimize logs, analytics, retained provider metadata, and diagnostic displays. They SHOULD NOT log plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, decrypted JWS payloads, private keys, shared secrets, provider credentials, or full ciphertext blobs except in explicit test fixtures or tightly controlled diagnostics. Holder-facing and staff-facing error messages SHOULD be useful without exposing enumeration clues, clinical content, stack traces, secrets, or provider internals.

### 9.11 Provider abstraction

The kiosk flow uses a provider abstraction so that the relay can be InstantDB, another storage service, a queue, a WebSocket service, a polling endpoint, a local network relay, or another deployment-specific transport. This specification defines provider capabilities and trust boundaries, not one required provider product.

A provider used for the active kiosk flow needs these logical capabilities:

1. **Write encrypted request state.** Store or publish a request row containing a lookup `requestId` and the `EncryptedKioskRequest` envelope from §9.5.
2. **Read encrypted request state.** Given the exact wrapper `requestId` and provider routing context, return the corresponding request row or envelope to the Phone presenter.
3. **Write encrypted submission state.** Store an encrypted submission blob and a submission row containing at least `submissionId`, wrapper `requestId`, blob locator such as `storagePath` or equivalent, AES-GCM `iv`, and `phoneEphemeralPublicKeyJwk`.
4. **Download encrypted submission blob.** Given an authorized submission row or equivalent locator, return the exact ciphertext bytes to the Completion display.
5. **Observe submission rows.** Allow the Completion display to subscribe, poll, or query for submission rows associated with the exact wrapper `requestId`.

A provider MAY enforce authentication, authorization, rate limits, row-shape rules, exact lookup parameters, storage-path rules, blob-size limits, expiration, cleanup, or immutable-row semantics. A provider SHOULD avoid enumerable listings and SHOULD require exact request or storage identifiers for reads where possible.

A provider SHALL NOT be required to see plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext `SmartHealthCheckinResponse`, raw FHIR content, SMART Health Cards, §8 Wallet response bytes, request-opening private keys, desktop private keys, or Wallet secrets in order to provide the capabilities above.

A provider row is not a clinical credential, not a request signature, not a response signature, and not a trust anchor. A Phone presenter and Completion display SHALL treat provider rows, storage paths, storage file ids, provider timestamps, provider application ids, provider authentication state, and provider notifications as untrusted routing metadata unless a separate deployment profile defines an additional authenticated provider role and its assurance level.

The active implementation's InstantDB provider is one example. Its request row stores `requestId` and `encryptedRequest`; its submission row stores `submissionId`, `requestId`, `storagePath`, `storageFileId`, `iv`, and `phoneEphemeralPublicKeyJwk`; its encrypted blob is stored under `submissions/<requestId>/<submissionId>.bin`; and its UI observes rows by `requestId`. These field names are useful evidence for the active profile but do not make InstantDB a required protocol dependency.

### 9.12 End-to-end kiosk example

This example is illustrative. It ties together the already-defined T4.A, T4.B, and T4.C steps without defining byte fixtures, CDDL, or production trust anchors.

1. **Kiosk creation.** A clinic desktop acts as Kiosk creator, Requester, Verifier, and Completion display for one in-person check-in session. It constructs this SMART request:

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
         "id": "coverage",
         "title": "Insurance coverage",
         "summary": "Coverage information for billing.",
         "content": {
           "kind": "fhir.resources",
           "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
           "resourceTypes": ["Coverage"]
         },
         "accept": ["application/fhir+json", "application/smart-health-card"]
       }
     ]
   }
   ```

   The Kiosk creator embeds this object directly as `smartRequest` in a signed `KioskRequestPayload`, generates a distinct high-entropy wrapper `requestId`, includes `encryptResponseTo.desktopPublicKeyJwk` for the desktop completion key, encrypts the compact kiosk request JWS as an `EncryptedKioskRequest`, writes it to the provider, and displays a Pointer URL whose fragment is only `#r=<wrapper-requestId>`.

2. **Phone resolution and same-device re-entry.** The Holder scans the QR code. The Phone presenter parses `r`, retrieves the encrypted request row, opens the request envelope, verifies the creator JWS, checks expiration and provider binding, validates the embedded `smartRequest` under §5, and constructs a fresh phone-local §8 `org-iso-mdoc` request using that `smartRequest`. The QR and provider row do not carry §8 `deviceRequest` or `encryptionInfo`.

3. **Wallet response.** The Wallet/Responder handles the phone-local §8 request, shows Holder review, and returns a §8 mdoc/DC API response containing a SMART response. The phone-side Verifier processing validates the same-device response under §8 and extracts a `SmartHealthCheckinResponse` whose `requestId` is `clinic-checkin-2026-05-02-001`, the SMART request `id`, not the wrapper `requestId`.

4. **Encrypted submission.** The Phone presenter creates:

   ```json
   {
     "requestId": "<wrapper-requestId>",
     "submittedAt": 1760000300000,
     "payload": {
       "kind": "smart-health-checkin-response",
       "smartResponse": {
         "type": "smart-health-checkin-response",
         "version": "1",
         "requestId": "clinic-checkin-2026-05-02-001",
         "artifacts": [],
         "requestStatus": [
           { "item": "patient-demographics", "status": "fulfilled" },
           { "item": "coverage", "status": "unavailable" }
         ]
       }
     }
   }
   ```

   It enforces `constraints.maxPlaintextBytes`, encrypts this plaintext to the signed desktop public key using `smart-health-checkin-kiosk-response-v1` as HKDF `info` and the wrapper `requestId` as salt and AAD, stores the ciphertext blob, and writes a submission row with the IV, phone ephemeral public JWK, and blob locator.

5. **Desktop completion.** The Completion display observes the submission row for the wrapper `requestId`, downloads the encrypted blob, decrypts it with the retained desktop private key, checks decrypted `SubmissionPlaintext.requestId`, validates the inner SMART response under §6 against the original `smartRequest`, applies §7 and §8 validation/trust policy, marks the kiosk session complete, and stops displaying the QR code. The provider never receives plaintext clinical content and is not trusted to decide clinical validity.

## Organizer notes

**Strengths.** This draft preserves the accepted T4.A/T4.B invariants: direct `smartRequest` embedding, pointer-only `#r`, distinct wrapper and SMART request identifiers, untrusted relay, and phone-local §8 re-entry. It aligns field names and crypto details with active code: `SubmissionPlaintext`, `EncryptedPayload`, 25 MiB active plaintext guard, blob guard, `phoneEphemeralPublicKeyJwk`, `iv`, and `submissions/<requestId>/<submissionId>.bin`.

**Caveats.** Active demo code submits only `{ kind, smartResponse }` after phone-side validation and does not include a signed phone-side §8 validation attestation in the submission. The Completion display language therefore requires deployable architectures to account for §8 validation rather than pretending the provider row proves it.

**Open issues.** Decide in organizer/canonical review whether to standardize optional ciphertext digest metadata from the outline's SHA-256 attestation item, since active rows no longer carry it. Decide whether `submittedAt` should be required in schema/CDDL despite active assertion only checking `requestId` and object `payload`. Decide exact clock-skew, grace-period, and single-use conformance levels in §11/§12/§13.

**Downstream dependencies.** T4.D should add kiosk CDDL/schema and fixtures for `SubmissionPlaintext`, submission row metadata, response encryption inputs, failure vectors, and size-limit cases without inventing clinical fixtures here. Appendix A should inventory the Phone presenter, Completion display, Submission service/provider, Kiosk creator, and Requester/Verifier requirements from §§9.8-9.11. Security and privacy sections should revisit relay metadata, duplicate submissions, stale QR codes, cleanup, and demo key custody.
