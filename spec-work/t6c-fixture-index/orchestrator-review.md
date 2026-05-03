# T6.C Fixture index orchestrator review

## Decision

Accepted. The organizer's canonical `spec-work/t6c-fixture-index/canonical.md`
is ready to serve as the T6.C fixture-index and example-vector-alignment section.

## Checks performed

- Reviewed `adjudication.md` and the complete `canonical.md`.
- Removed unintended fixture/generator edits left by a draft pass; T6.C is
  documentation-only and does not modify fixture bytes.
- Verified the adjudication and canonical now describe the committed fixture
  state: generated TS request fixtures and Android vectors still need refresh
  before promotion because they include legacy nested Questionnaire material.
- Checked Markdown table structure after replacing literal canonical-version
  pipe text inside table cells.
- Searched for stale positive references to:
  - legacy request `questionnaire` wrapper shapes;
  - strip-and-fetch canonical resolution;
  - standardized kiosk/relay/submission/completion protocol language;
  - uppercase RFC 2119 obligations in this informative appendix.

## Design alignment

The canonical preserves the design-note-rebased posture:

- direct same-device `org-iso-mdoc` is the only v1.0 live presentation fixture
  class;
- kiosk, QR, relay, completion-screen, Mattr/Safari, OID4VP, dynamic-element,
  SVG/HTML, and other demo/archive material is historical, illustrative,
  deployment-local, or future work unless the indexed bytes are the §8
  same-device artifacts;
- fixture classes distinguish byte-exact, structural, semantic, diagnostic,
  historical, illustrative, implementation-regression, and conformance-candidate
  material;
- promotion criteria cover flattened Questionnaire selectors, no
  `GenericArtifact`, exact canonical-version preservation, core Artifact media
  types, validation reports, synthetic data, and non-production trust labels.

## Notes for downstream work

The appendix closes the current spec-buildout tranche. Future implementation and
fixture work should regenerate semantic §16 vectors, fixture-grade SHC/FHIR
payloads, Android test vectors, and real Android captures after the implementation
schema changes are ready.
