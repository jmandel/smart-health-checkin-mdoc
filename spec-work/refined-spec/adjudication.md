# Refined spec adjudication

## Decision

Accepted `attempt-10.md` as the synthesis base for `spec.md`, with small
greenfield wording edits applied in the final file.

## Attempt quality gate

All ten attempts completed and wrote isolated files under
`spec-work/refined-spec/`. Each reported a coherent single-file Markdown draft,
valid JSON fences, and no reintroduction of the old selector literals
`fhir.resources` or `kind: "questionnaire"`.

| Attempt | Size | Lines | Notes |
| --- | ---: | ---: | --- |
| `attempt-01.md` | 222,725 bytes | 2,225 | Strong standards detail, but too long for the target. |
| `attempt-02.md` | 107,224 bytes | 795 | Concise, but lighter on normative coverage. |
| `attempt-03.md` | 132,482 bytes | 1,320 | Good size, but retained extra Appendix D material. |
| `attempt-04.md` | 138,814 bytes | 1,242 | Good conformance focus, but retained extra Appendix D material. |
| `attempt-05.md` | 137,661 bytes | 1,161 | Good trust flow, slightly above target. |
| `attempt-06.md` | 132,601 bytes | 1,255 | Polished publisher style, slightly above target. |
| `attempt-07.md` | 127,158 bytes | 1,175 | Strong deduplication and target size. |
| `attempt-08.md` | 120,345 bytes | 1,166 | Strong reader flow and target size, but fewer normative-keyword hits. |
| `attempt-09.md` | 129,988 bytes | 1,137 | Best balance of target size, certification framing, and Appendix A/B/C preservation. |
| `attempt-10.md` | 138,655 bytes | 1,242 | Strongest base once the size target was relaxed: FHIR IG style, field tables, Appendix A/B/C preservation, and high normative coverage. |

## Rationale

`attempt-09.md` best matched the original 120-130 KB target, but the user
clarified that exceeding the target is acceptable if the stronger draft is
better. With that constraint relaxed, `attempt-10.md` is the better synthesis
base: it preserves more normative-keyword coverage, uses a clearer FHIR
Implementation Guide style with compact field tables, keeps only Appendices A,
B, and C, and maintains the current `selection.fhir` / `form.fhir` selector
terminology. `attempt-07.md` and `attempt-08.md` confirmed that the smaller
target was achievable, while `attempt-01.md` demonstrated the cost of keeping
too much standards prose.

## Final synthesis edits

The final `spec.md` is based on `attempt-10.md` with only targeted
cleanup:

- normalized the `selection.fhir` selector wording and checklist row to refer to
  `content.kind`, matching the `form.fhir` wording and request-item model;
- made the no-catch-all Artifact rule explicit by naming `GenericArtifact`;
- kept the active selector model as `selection.fhir` for existing FHIR resources
  and `form.fhir` for FHIR Questionnaire form completion;
- retained the companion-material posture for examples, fixtures, byte ladders,
  FHIR mapping walkthroughs, implementation notes, and historical captures;
- preserved Appendices A, B, and C as the only appendices in the refined spec.
