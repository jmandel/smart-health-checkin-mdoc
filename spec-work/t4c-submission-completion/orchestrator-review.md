# T4.C orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T1, T2, T3, T4.A, and T4.B canonical/review files
- active kiosk protocol, provider, InstantDB mailbox, submit page, creator page,
  and provider tests

Decision: T4.C is accepted as the canonical kiosk submission and desktop
completion cutpoint.

Edits applied:

- None.

Validation notes:

- Confirmed active `SubmissionPlaintext` shape is wrapper `requestId`, numeric
  `submittedAt`, and a caller-supplied `payload`; the active successful payload
  uses `kind: "smart-health-checkin-response"` with `smartResponse`.
- Confirmed active response-submission encryption uses P-256 ECDH,
  HKDF-SHA-256, AES-256-GCM, salt/AAD equal to the wrapper `requestId`,
  HKDF info `smart-health-checkin-kiosk-response-v1`, a 12-byte IV, and a fresh
  phone ephemeral public key per submission.
- Confirmed the active provider stores ciphertext as an opaque
  `application/octet-stream` blob and row metadata with `submissionId`,
  `requestId`, `storagePath`, `storageFileId`, `iv`, and
  `phoneEphemeralPublicKeyJwk`.
- Confirmed active desktop UI opens and displays decrypted submissions but does
  not independently rerun full SMART response / §8 validation in that UI path.
  The canonical therefore correctly states validation requirements before
  clinical workflow use instead of treating prototype display as sufficient.

Accepted decisions:

- T4.C starts only after T4.B phone resolution and phone-local §8 processing.
- Top-level `SubmissionPlaintext.requestId` is the kiosk wrapper id; inner
  `payload.smartResponse.requestId` remains the original `smartRequest.id`.
- The signed `constraints.maxPlaintextBytes` limit applies to the exact
  serialized plaintext bytes before encryption.
- The relay/provider remains untrusted and is not a Holder-consent,
  patient-identity, credential-validity, issuer-trust, clinical-provenance, or
  downstream-authorization signal.
- Single-use handling, duplicate behavior, expiration windows, cleanup, rate
  limiting, logging minimization, and production key custody are deployment
  requirements or later security/privacy material, not provider trust.
- InstantDB/Instant Storage is an implementation example; provider capabilities
  are normative only at the relay abstraction level.

Blocking issues:

- None.

Downstream notes:

- T4.D must translate the accepted T4.A/T4.B/T4.C field names, crypto labels,
  request-id bindings, row/blob metadata, and negative examples into kiosk CDDL,
  schema, fixture-index, and failure-vector material.
- T4.D should decide whether active fixture material is sufficient or whether a
  refreshed Android/Chrome capture should be requested after T4 is canonical.
- Later §11, §12, §13, §15, §16.6, and Appendix D should carry production
  security/privacy/registry/deployment details that T4.C intentionally leaves
  out of the core flow.
