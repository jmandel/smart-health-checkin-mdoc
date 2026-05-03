# T2.A orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- `../t1a-editorial-terminology/canonical.md`
- `../t1a-editorial-terminology/orchestrator-review.md`
- `../t1b-purpose-scope-goals/canonical.md`
- `../t1b-purpose-scope-goals/orchestrator-review.md`
- `../t1c-architecture-roles-flows/canonical.md`
- `../t1c-architecture-roles-flows/orchestrator-review.md`

Decision: T2.A is accepted as the canonical clinical request-model cutpoint.

Edits applied:

1. Clarified inline Questionnaire validation so a Wallet/Responder rejects or
   reports unsupported when an inline Questionnaire resource lacks
   `resourceType: "Questionnaire"`, not only when a present `resourceType` has a
   different value.

Blocking issues:

- None.

Downstream notes:

- T2.B must define exact response status behavior for unsupported selectors,
  unavailable content, declined items, partial fulfillment, errors, malformed
  selectors found after initial parsing, and Questionnaire canonical/resource
  disagreement.
- T2.B must preserve request/response binding through `requestId` and item
  accounting through `requestStatus[]`.
- Appendix B should decide concrete schema limits, including whether `items[]`
  becomes a hard non-empty array requirement.
- Appendix H should align `resourceTypes[]`, profile-family matching,
  `meta.profile`, Bundles, QuestionnaireResponse construction, and canonical
  `|version` handling with §5.
- §13 should define selector-kind and extension-media-type registry templates.
