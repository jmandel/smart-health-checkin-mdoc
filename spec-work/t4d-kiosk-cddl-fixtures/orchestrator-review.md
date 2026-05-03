# T4.D orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T1, T2, T3, T4.A, T4.B, and T4.C canonical/review files
- active kiosk protocol, provider, InstantDB mailbox, submit page, creator page,
  provider tests, fixture roots, same-device fixture generators, and Android test
  vector resources

Decision: T4.D is accepted as the canonical kiosk CDDL/schema and fixture-index
cutpoint. T4 is complete.

Edits applied:

1. Tightened adjudication wording about mirrored non-id envelope metadata so it
   matches the canonical: wrapper `requestId` binding is mandatory, Kiosk
   creators must set mirrored metadata consistently, and stricter non-id
   mismatch rejection is recommended for profiles/conformance vectors because
   active code is looser for some non-id mirrors.
2. During T5.B review, corrected the Appendix C crypto-boundary table to state
   that the §8 same-device HPKE context uses empty AAD, matching accepted §8 and
   §11 text.

Validation notes:

- Confirmed the canonical uses Appendix C pseudo-CDDL / JSON-shape guidance and
  does not claim to define complete JOSE, JWK, JSON Schema, ISO/IEC 18013-5,
  InstantDB, COSE, CBOR, or HPKE schemas.
- Confirmed active kiosk request facts: direct `smartRequest`, ES256 compact JWS
  with deterministic key-sorted JSON signing input, request-envelope content
  type, request-envelope HKDF info `smart-health-checkin-kiosk-request-v1`, and
  pointer-only `#r=<requestId>` URLs.
- Confirmed active response-submission facts: `SubmissionPlaintext` with wrapper
  `requestId`, numeric `submittedAt`, active payload kind
  `smart-health-checkin-response`, response-submission HKDF info
  `smart-health-checkin-kiosk-response-v1`, opaque blob storage, and slim
  submission row metadata.
- Confirmed checked-in fixture paths listed by the canonical exist, and no
  tracked deterministic `fixtures/kiosk/` suite exists today.

Accepted decisions:

- Appendix C kiosk material stays profile-constrained and wrapper-specific.
- Request-envelope crypto, response-submission crypto, and §8 HPKE stay
  explicitly separated by plaintext, recipient, info/transcript, AAD, and
  ciphertext fields.
- Existing Chrome/Android captures remain diagnostic/historical for kiosk
  purposes because they cover same-device §8 material, not the §9 kiosk wrapper.
- A refreshed kiosk capture should wait until §9, security/privacy/registry
  guidance, and final example/fixture expectations are stable.
- Future kiosk vectors should cover deterministic JWS input, encrypted request
  envelope, pointer parsing, phone resolution, response submission,
  wrong-request-id/AAD failures, expiration, size limits, malformed
  rows/JWK/IVs, duplicate rows, no-plaintext-leakage checks, and cross-boundary
  crypto separation.

Blocking issues:

- None.

Downstream notes:

- T5.A conformance must reflect the now-canonical T2/T3/T4 obligations without
  inventing new protocol requirements.
- T5.B security must threat-check the actual §8 and §9 crypto flows, replay and
  freshness boundaries, QR/pointer metadata, relay behavior, and plaintext
  leakage risks.
- T6.C is the natural later point to decide whether to request a human-assisted
  refreshed Android/Chrome kiosk capture and promote any resulting material into
  `fixtures/kiosk/`.
