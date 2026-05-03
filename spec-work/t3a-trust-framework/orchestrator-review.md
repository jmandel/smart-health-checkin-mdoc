# T3.A orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- `../t1a-editorial-terminology/canonical.md`
- `../t1b-purpose-scope-goals/canonical.md`
- `../t1c-architecture-roles-flows/canonical.md`
- `../t2a-clinical-request-model/canonical.md`
- `../t2a-clinical-request-model/orchestrator-review.md`
- `../t2b-clinical-response-model/canonical.md`
- `../t2b-clinical-response-model/orchestrator-review.md`
- `../t2c-fhir-mapping-appendix/canonical.md`
- `../t2d-json-schema-appendix/canonical.md`

Decision: T3.A is accepted as the canonical trust-framework cutpoint.

Edits applied:

1. None.

Blocking issues:

- None.

Downstream notes:

- T3.B must define the precise same-device `org-iso-mdoc` mechanics that §7
  references: origin binding, per-`DocRequest.readerAuth`, `ReaderAuthentication`,
  `SessionTranscript`, HPKE, MSO/issuerAuth checks, digest validation,
  device-key proof, response extraction, and failure handling.
- §9 must preserve the trust boundaries established here when defining kiosk
  wrapper signatures, pointer binding, same-device re-entry, encrypted
  submission, and Completion display processing.
- §§11-12 should revisit origin spoofing, reader impersonation, issuer-trust
  pivots, raw FHIR overclaiming, status-message privacy, retention, telemetry,
  reduced-assurance UX, and kiosk relay metadata.
- Appendix A should distinguish core protocol obligations from deployment-profile
  trust-policy obligations.
