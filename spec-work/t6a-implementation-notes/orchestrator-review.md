# T6.A Implementation notes orchestrator review

## Decision

Accepted. The organizer's canonical `spec-work/t6a-implementation-notes/canonical.md`
is ready to serve as the T6.A implementation-notes section.

## Checks performed

- Reviewed `adjudication.md` and the complete `canonical.md`.
- Checked the canonical against the design-note-rebased outline and prerequisite
  request/response, FHIR mapping, JSON Schema, same-device, trust, security,
  privacy, registry, i18n, and checklist canonicals.
- Verified the `profilesFrom[]` guidance against the current §5.4.1.2 shape:
  a non-empty array of canonical profile-family URL strings, not a package
  descriptor or local topic alias.
- Confirmed that the section is informative and does not introduce uppercase
  RFC 2119 requirements.
- Confirmed that the canonical preserves:
  - the two-layer model: clinical SMART request/response plus same-device direct
    `org-iso-mdoc`;
  - deployment-defined treatment of QR/NFC/deep-link/kiosk/staff-handoff,
    relay, and completion-screen behavior;
  - flattened Questionnaire selectors;
  - removal of `GenericArtifact` as a core catch-all;
  - structured canonical `|version` handling without strip-and-fetch for
    versioned canonicals;
  - exact §8 constants and trust-layer separation.

## Notes for downstream work

- Public docs and site explainers still need a descope pass so they do not
  present the former kiosk flow as a first-class SMART Health Check-in 1.0
  protocol layer.
- T6.B worked examples should read this canonical before drafting and should not
  reintroduce superseded T4/kiosk protocol mechanics.
