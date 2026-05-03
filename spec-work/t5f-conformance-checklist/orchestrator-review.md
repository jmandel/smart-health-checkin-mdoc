# T5.F orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T1, T2, T3, T4, T5.A, T5.B, T5.C, T5.D, and T5.E
  canonical/review files
- active request/response validators, same-device constants and flow code,
  kiosk protocol/provider/tests, docs, fixture metadata, and the dependency tree
  as needed

Decision: T5.F is accepted as the canonical Appendix A conformance checklist.

Edits applied:

1. Expanded the checklist introduction to clarify that optional-feature,
   optional-target, and optional-deployment rows apply only when the
   implementation claims that feature, target, profile, or deployment
   constraint, even if the source section uses `SHALL` or `SHOULD` for the
   claimed feature.
2. Reworded row A-156 to avoid a lower-case normative-looking `should` inside a
   row whose level column already states `SHOULD`.

Validation notes:

- Confirmed the canonical checklist has 187 checklist rows with sequential ids
  `A-001` through `A-187`.
- Confirmed every checklist row has the expected six columns: id, target, level,
  section, checklist item, and evidence/validation.
- Confirmed row targets are limited to the accepted §4.1 target labels:
  Requester / Verifier, Holder Wallet / Responder, Phone presenter, Kiosk
  creator, Completion display, Submission service / provider,
  Deployment/profile author, and Conformance/fixture author.
- Confirmed row levels are limited to `SHALL`, `SHALL NOT`, `SHOULD`, `MAY`,
  `Conditional`, and `Optional-profile`.
- Confirmed the checklist is an index of accepted obligations rather than a new
  normative source.
- Confirmed stale terms and flows appear only in negative checklist rows:
  `requestProfile`, presets, IPS shortcuts, "all of the above", inline §8
  fragments, `readerAuthAll`, and locale-negotiation fields are not presented as
  positive v1.0 mechanisms.

Accepted decisions:

- Appendix A rows can use the RFC 2119 level from the source section while
  relying on the row target, source section, and introductory applicability
  statement to scope optional features such as direct same-device support,
  kiosk support, `readerAuth`, fixture profiles, extensions, and deployment
  profiles.
- Kiosk rows remain positive only for the accepted direct-`smartRequest`,
  pointer-only, encrypted-wrapper, phone-reentry, encrypted-submission, and
  untrusted-relay model.
- Same-device rows remain positive only for the accepted direct `org-iso-mdoc`
  flow with fixed identifiers, tag-24 `ItemsRequest`, direct `dcapi`
  `SessionTranscript`, HPKE suite, stable response element, optional per-
  `DocRequest.readerAuth`, and §6.6 response validation.
- Trust, provenance, security, privacy, registry, and internationalization rows
  remain cross-links to accepted sections and do not create new assurance,
  consent, registration, or localization semantics.

Blocking issues:

- None.

Downstream notes:

- T5 cross-cutting normative closure is complete.
- T6.A should turn accepted normative text into implementation guidance without
  changing obligations.
- T6.B/T6.C should align worked examples and fixture indexes to Appendix A and
  should be the natural point to decide whether a refreshed Android/Chrome kiosk
  capture is needed.
