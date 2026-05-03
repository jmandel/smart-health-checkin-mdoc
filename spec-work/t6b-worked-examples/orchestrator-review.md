# T6.B Worked examples orchestrator review

## Decision

Accepted. The organizer's canonical `spec-work/t6b-worked-examples/canonical.md`
is ready to serve as the T6.B worked-examples section.

## Checks performed

- Reviewed `adjudication.md` and the complete `canonical.md`.
- Parsed all canonical JSON blocks.
- Checked each request/response pair for:
  - matching `requestId`;
  - exact `requestStatus[]` coverage of request items;
  - known `fulfills[]` item ids;
  - Artifact media types accepted by every fulfilled item;
  - only core Artifact media types;
  - `fhirVersion` present only where required for `application/fhir+json`;
  - no outer `fhirVersion` on `application/smart-health-card`.
- Searched for stale selector and Artifact patterns. The remaining
  `questionnaire` matches are FHIR `QuestionnaireResponse.questionnaire` values,
  not the old request selector wrapper.

## Design alignment

The canonical preserves the design-note-rebased posture:

- §16 is informative and request/response-focused.
- QR, NFC, deep links, kiosks, staff handoff, relays, and completion screens are
  mentioned only as deployment-defined ways to reach an implementation, not as a
  standardized T4/kiosk protocol.
- Questionnaire examples use the flattened `content.kind = "questionnaire"`
  selector with direct `canonical` and/or `resource`.
- Core Artifacts are limited to `application/smart-health-card` and
  `application/fhir+json`; no `GenericArtifact` or generic `value`/`url`/`data`
  extension fallback is shown.
- Versioned canonicals are preserved in request selectors, `meta.profile[]`, and
  `QuestionnaireResponse.questionnaire`.
- `profiles[]` and `profilesFrom[]` are treated as additive profile selectors.
- Raw FHIR JSON examples are explicitly patient-mediated unless separate
  provenance, signature, source attestation, or equivalent evidence is present.

## Notes for downstream work

T6.C should decide which examples become fixture candidates and replace
placeholder SMART Health Card JWS strings or minimal FHIR snippets with
fixture-grade synthetic payloads where needed.
