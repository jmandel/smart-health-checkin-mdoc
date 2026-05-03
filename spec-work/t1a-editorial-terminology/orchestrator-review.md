# T1.A orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`

Decision: T1.A is accepted as the canonical foundation cutpoint after two small
orchestrator edits.

Edits applied:

1. Rephrased Markdown source-of-truth guidance so it does not emphasize HTML
   rendering or generated anchors at this stage.
2. Removed "package" from the Profile family definition to avoid suggesting that
   `profilesFrom[]` carries package metadata. The active protocol shape remains
   an array of canonical profile-family URLs.

Blocking issues: none.

Downstream notes:

- T1.B and T1.C should reuse the role names and layering terms from
  `canonical.md`.
- Later §5 should define exact selector semantics, including that
  `profiles[]` and `profilesFrom[]` are additive and that `resourceTypes[]`
  interaction is defined separately.
