# T2.B orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- `../t1a-editorial-terminology/canonical.md`
- `../t1a-editorial-terminology/orchestrator-review.md`
- `../t1b-purpose-scope-goals/canonical.md`
- `../t1b-purpose-scope-goals/orchestrator-review.md`
- `../t1c-architecture-roles-flows/canonical.md`
- `../t1c-architecture-roles-flows/orchestrator-review.md`
- `../t2a-clinical-request-model/canonical.md`
- `../t2a-clinical-request-model/orchestrator-review.md`

Decision: T2.B is accepted as the canonical clinical response-model cutpoint.

Edits applied:

1. Tightened `unavailable` status semantics so it does not blur into Holder
   refusal; `declined` remains the status for Holder refusal or Holder-preference
   policy that prohibits disclosure.
2. Removed an unrequested scratch design note created during drafting
   (`design-notes-generic-artifact-removal.md`). It was not one of the retained
   attempt/adjudication/canonical artifacts and conflicted with the accepted
   T2.B extension-artifact model.

Blocking issues:

- None.

Downstream notes:

- T2.C / Appendix H must align Bundle handling, single-resource handling,
  `meta.profile`, profile-family membership, `QuestionnaireResponse.questionnaire`,
  canonical `|version` comparisons, and mixed-FHIR-version guidance with §§5-6.
- Appendix B must encode response shape constraints where possible and leave
  procedural validation for request/response cross-checks that JSON Schema
  cannot express.
- §13 must define status-code, selector-kind, extension media-type, and
  media-type compatibility registry mechanics.
- §8 and §9 must extract or decrypt the SMART response and then apply §6.6
  validation without redefining response clinical semantics.
- §11 and §12 should revisit status-message privacy, extension `url`/`data`
  handling, raw FHIR provenance limits, retention, and telemetry.
