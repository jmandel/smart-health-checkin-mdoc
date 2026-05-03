# T5.C orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T1, T2, T3, T4, T5.A, T5.B, and T5.D canonical/review files
- active request/response validators, same-device protocol code, kiosk protocol
  code, provider rows, demo UI, docs, and fixture metadata as needed

Decision: T5.C is accepted as the canonical privacy-considerations cutpoint.

Edits applied:

1. Converted one lower-case normative-looking `must not` into an explicit
   `SHALL NOT` for Wallet/Responder display behavior.
2. Reworded one lower-case `must` in the Artifact packaging discussion to avoid
   accidental RFC 2119 ambiguity.

Validation notes:

- Confirmed §12 remains a privacy overlay on accepted §§5-11 rather than a new
  consent protocol, retention schedule, Wallet storage model, or implementation
  guide.
- Confirmed request context, item ids, Artifact ids, wrapper request ids,
  provider rows, submission ids, storage paths, QR metadata, key ids, timestamps,
  logs, browser state, debug panels, and fixture metadata are treated as
  potentially sensitive.
- Confirmed selective disclosure is described through request-item boundaries,
  Holder control, Wallet policy, Artifact construction, accepted media types,
  `fulfills[]`, and `requestStatus[]`, not through separate mdoc elements for
  every FHIR profile, item, resource, Questionnaire, or Artifact.
- Confirmed stale kiosk request-profile, preset, IPS shortcut, "all of the
  above", and inline §8 URL-fragment behavior are rejected or treated only as
  negative evidence.

Accepted decisions:

- Holder mediation is necessary but not sufficient privacy protection; metadata
  and operational state also need minimization.
- `required: true`, `intentToRetain`, QR scanning, pointer lookup, provider row
  presence, wrapper verification, successful decryption, and clicked phone-page
  buttons are not Holder consent by themselves.
- SMART Health Card Artifacts and raw FHIR JSON Artifacts have different privacy
  and provenance properties; raw FHIR remains patient-mediated unless separately
  provenanced or signed.
- Pointer-only QR reduces plaintext exposure but is not anonymous; wrapper ids
  and provider metadata can still correlate check-in activity.
- Demo/debug panels, checked-in keys, fixture private JWKs, and real-platform
  captures are diagnostic/test material and not production privacy practice.

Blocking issues:

- None.

Downstream notes:

- T5.E should add i18n requirements only for actual human-readable request,
  response, status/message, Questionnaire, UI, and error text fields.
- T5.F should add privacy checklist rows for minimization, per-item Holder
  control, identifier scoping, retention, telemetry, fixture labeling, and
  metadata handling.
- §15 should carry platform-specific browser/mobile logging, storage, screenshot,
  analytics, support-bundle, cleanup-job, and production UI guidance.
