# T5.A orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T1, T2, T3, and T4 canonical/review files
- active request/response validators, same-device protocol code, kiosk protocol
  code, docs, and fixture policy material as needed

Decision: T5.A is accepted as the canonical conformance cutpoint.

Edits applied:

- None.

Validation notes:

- Confirmed §4 stays a conformance map over accepted §§5-9 obligations instead
  of creating a second protocol definition.
- Confirmed the canonical distinguishes core transport-neutral §5/§6 clinical
  object support from live §8 presentation support, optional §9 kiosk support,
  optional `readerAuth`, deployment trust policy, fixture profiles, and reserved
  OID4VP work.
- Confirmed profile labels are presented as provisional documentation/test-report
  labels pending §13, while stable wire identifiers mirror accepted T2/T3/T4
  identifiers.
- Confirmed stale kiosk request-profile, preset, IPS, "all of the above", and
  inline §8 QR-fragment approaches are rejected rather than normalized.

Accepted decisions:

- Conformance claims must identify target, feature/profile set, specification
  version, and deployment profile where applicable.
- Targets include Requester/Verifier, Holder Wallet/Responder, Phone presenter,
  Kiosk creator, Completion display, Submission service/provider,
  deployment/profile author, and conformance/fixture author.
- Direct same-device `org-iso-mdoc` is the version 1.0 live presentation binding
  for roles claiming live presentation support, but narrower core-model,
  provider-relay, schema, fixture, or profile-author claims do not imply live
  §8 support.
- Kiosk conformance is optional and wraps/re-enters §8; it is not a second
  clinical request/response protocol.
- Extension and versioning language preserves required validation, trust-layer
  separation, direct `smartRequest`, pointer-only QR, and untrusted-relay
  boundaries.

Blocking issues:

- None.

Downstream notes:

- T5.D must finalize registry/profile identifier syntax without contradicting
  the provisional labels and stable wire identifiers listed here.
- T5.F must expand Appendix A from stable normative requirements and target
  taxonomy without adding independent obligations.
