# T1.B orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- `../t1a-editorial-terminology/canonical.md`
- `../t1a-editorial-terminology/orchestrator-review.md`

Decision: T1.B is accepted as the canonical purpose/scope/goals cutpoint.

Edits applied:

1. None.

Blocking issues:

- None.

Downstream notes:

- T1.C should preserve the three-layer framing: clinical content model,
  same-device presentation flow, and cross-device kiosk flow.
- T2.A should preserve `profilesFrom[]` as canonical profile-family URL arrays
  and `profiles[]` plus `profilesFrom[]` as additive profile selectors.
- T4 should preserve the kiosk scope boundary: the kiosk payload embeds the
  SMART request directly and re-enters same-device presentation on the phone.
- §11 and §12, not reserved §10, are the correct security/privacy destinations
  for the threat-model summary.
