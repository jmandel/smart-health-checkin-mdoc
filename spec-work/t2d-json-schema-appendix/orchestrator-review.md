# T2.D orchestrator review

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
- `../t2c-fhir-mapping-appendix/orchestrator-review.md`

Decision: T2.D is accepted as the canonical Appendix B JSON Schema cutpoint.

Edits applied:

1. None.

Blocking issues:

- None.

Downstream notes:

- Appendix A should distinguish schema-checkable rules from procedural
  request/response cross-validation rules.
- Conformance tooling should pair these schema snippets with procedural checks
  for duplicate ids/status items, duplicate JSON member detection where
  possible, `requestId`, `fulfills[]`, `requestStatus[]`, per-item `accept[]`,
  FHIR version consistency, Bundle traversal, profile-family membership,
  QuestionnaireResponse comparison, and SMART Health Card validation.
- §13 should define how extension selector schemas, extension Artifact media-type
  schemas, media-type compatibility rules, and future status-code extensions
  compose with the base schemas.
- Any future tightening of id patterns, maximum lengths, transport byte limits,
  or `items[]` non-emptiness must be made in normative body text before schema
  snippets are tightened.
