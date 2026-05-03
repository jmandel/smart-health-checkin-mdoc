# T5.B orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T1, T2, T3, T4.A, T4.B, T4.C, and T4.D canonical/review files
- active same-device protocol code, request/response validators, kiosk protocol
  code, provider code, demo-key material, docs, and fixture evidence as needed

Decision: T5.B is accepted as the canonical security-considerations cutpoint.

Edits applied:

- None in T5.B.
- A related consistency edit was applied to T4.D Appendix C so its crypto-boundary
  table says §8 same-device HPKE uses empty AAD.

Validation notes:

- Confirmed §11 threat-checks the actual accepted §8 and §9 flows rather than
  introducing new protocol machinery.
- Confirmed the three cryptographic contexts are kept separate: §8 HPKE,
  §9 kiosk request-envelope encryption, and §9 kiosk response-submission
  encryption.
- Confirmed trust layers stay separated: origin, privileged-caller policy,
  optional reader authentication, mdoc issuer/device evidence, clinical-source
  provenance, kiosk wrapper validation, provider controls, and downstream policy
  are not interchangeable.
- Confirmed active implementation gaps are called out as gaps without weakening
  the accepted model: desktop demo display validation, looser schema/JWK/mirrored
  metadata checks, demo key custody, stale `kiosk-session` fragment helper, and
  lack of deterministic kiosk fixtures.

Accepted decisions:

- Successful encryption/decryption, HPKE opening, mdoc validation, kiosk wrapper
  validation, provider delivery, or request-id matching does not by itself prove
  Holder consent, patient identity, requester identity, reader trust, issuer
  accreditation, clinical-source provenance, semantic response validity, or
  downstream authorization.
- Replay/freshness is flow-specific and requires session, pointer, timestamp,
  request-id, single-use, and validation controls rather than relying on one id.
- The kiosk relay remains untrusted for clinical and trust decisions even when
  it provides useful operational defenses such as access control, rate limiting,
  cleanup, row-shape checks, or duplicate suppression.
- QR/pointer security text preserves pointer-only `#r=<requestId>` behavior and
  treats metadata leakage as a privacy/security issue without reviving inline
  request fragments.

Blocking issues:

- None.

Downstream notes:

- T5.C should expand privacy implications of the metadata/logging/retention
  issues identified here.
- T5.D should mirror fixed wire identifiers and profile/agility hooks without
  inventing new security semantics.
- T6.C should add deterministic kiosk vectors for the implementation gaps called
  out here.
