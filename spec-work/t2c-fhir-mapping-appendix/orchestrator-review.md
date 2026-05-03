# T2.C orchestrator review

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

Decision: T2.C is accepted as the canonical Appendix H FHIR mapping cutpoint.

Edits applied:

1. None.

Blocking issues:

- None.

Downstream notes:

- T2.D / Appendix B should encode raw FHIR and SMART Health Card Artifact shape
  constraints where JSON Schema can express them, but leave profile-family
  membership, Bundle traversal, QuestionnaireResponse comparison, and full FHIR
  validation to procedural tests or deployment profiles.
- Worked examples should keep US Core and CARIN illustrative rather than
  mandatory, while covering exact-profile, profile-family, resource-type,
  no-selector, raw FHIR, SMART Health Card, and QuestionnaireResponse cases.
- Fixture vectors should preserve canonical strings and `meta.profile` values
  exactly, including `|version` suffixes where present.
- Future registry or deployment-profile work can define machine-readable
  profile-family maps, stronger FHIR validation requirements, or explicit
  IG/package sources for `profilesFrom[]` evaluation.
