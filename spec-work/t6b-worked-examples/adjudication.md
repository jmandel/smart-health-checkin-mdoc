# T6.B Worked examples adjudication

## Decision basis

The canonical §16 content was resolved against the accepted T1/T2/T3/T5/T6.A canonicals and the design notes, not by majority vote among attempts. The controlling rules are: §16 is informative; the only v1.0 normative protocol surfaces are the SMART request/response JSON model and same-device direct `org-iso-mdoc`; in-person launch, kiosk, QR/NFC, relay, staff handoff, and completion behavior are deployment UX only; Questionnaire selectors are flattened; core Artifacts are only `application/smart-health-card` and `application/fhir+json`; `profiles[]` and `profilesFrom[]` are additive; versioned canonicals are preserved exactly where carried or emitted; response status covers every item exactly once; and raw FHIR JSON remains patient-mediated unless separately provenanced.

## Attempt-by-attempt review

### Attempt 01

Strong contributions: clear six-subsection coverage, readable request/response pairs, good demonstration of SHC-preferred insurance, raw FHIR bundles, `fulfills[]`, per-item statuses, and the no-selector case. It also explicitly showed a flattened Questionnaire selector and included useful validation notes.

Errors and omissions: the introduction retained QR/NFC/deep-link/kiosk/staff-handoff language in a way that could be read as reviving deployment initiation protocols. It included a nested Questionnaire non-example near the main Questionnaire example; that can be useful as an invalid note but should not compete with the canonical shape. Some explanatory text was less precise about core Artifact closure and raw-FHIR provenance than later attempts.

### Attempt 02

Strong contributions: the most explicit treatment of the closed core Artifact set, SHC wrapper rules, raw FHIR as patient-mediated, additive `profiles[]`/`profilesFrom[]`, exact status coverage, and flattened Questionnaire selectors. The examples were concise and generally aligned with §5/§6 field names.

Errors and omissions: several notes drifted toward normative guidance rather than illustrative validation observations. Its mixed-bundle wording could confuse `partial` status with `fulfills[]`: an Artifact may fulfill an item for which status is `partial`, but the prose needs to make clear that `partial` is the Wallet's claim of incomplete satisfaction, not a malformed fulfillment edge.

### Attempt 03

Strong contributions: best overall balance of protocol fidelity and worked-example readability. It preserved the informative framing, avoided outer `fhirVersion` on SHC Artifacts, marked raw FHIR as patient-mediated, used the flattened Questionnaire selector, kept request/status accounting coherent, and handled versioned Questionnaire canonicals well.

Errors and omissions: it still referred to the same-device flow in places where §16 does not need transport detail. A few broad FHIR examples risked implying that small example Bundles completely satisfy broad selectors unless validation notes explain the Wallet's status claim and local ingestion policy.

### Attempt 04

Strong contributions: strong validation-note structure, good explanation of media-type matching, SHC vs raw-FHIR differences, flattened Questionnaire use, and many-to-many fulfillment. It was useful for distilling the canonical validation bullets after each example.

Errors and omissions: it most visibly listed QR/NFC/deep-link/kiosk/staff-screen/launch-page mechanics. Those terms are acceptable only as deployment-defined UX in implementation notes; the canonical §16 text should not make them examples of a standardized protocol. Some prose was more prescriptive than an informative worked-example block should be.

### Attempt 05

Strong contributions: comprehensive, internally consistent examples with stable fixture-friendly ids, good additive selector explanation, good raw-FHIR patient-mediated caveat, complete status coverage, and broad coverage of all six target subsections. It provided the strongest source material for polished examples.

Errors and omissions: the introduction explicitly mentioned kiosks, relays, and completion screens, which conflicts with the public-doc descope if used without qualification. Some broad statements about one Artifact satisfying multiple items needed tighter accept-media-type and status caveats.

## Contradictions and resolutions

- **Deployment UX vs protocol:** Attempts 01, 04, and 05 varied in how prominently they mentioned QR/NFC/deep-link/kiosk/relay/completion flows. Canonical resolution: §16 does not standardize those mechanisms and should focus on request/response JSON. Same-device direct `org-iso-mdoc` may be mentioned only to say these examples can be carried there without changing clinical semantics.
- **Questionnaire selector shape:** Attempts generally used flattened selectors, but Attempt 01 included legacy nested forms as examples. Canonical resolution: only `content.kind = "questionnaire"` with direct `canonical` and/or `resource` appears in valid examples; legacy nested forms are mentioned only as invalid/non-example notes.
- **Artifact variants:** All attempts mostly used the two core media types, but some wording left room for generic carriers. Canonical resolution: no `GenericArtifact`, generic `value/url/data`, or extension Artifact examples appear in §16.
- **`profiles[]` plus `profilesFrom[]`:** Attempts differed on whether exact profiles narrow a family. Canonical resolution: they are additive, with `resourceTypes[]` as the separate constraint; the US Core example demonstrates this explicitly.
- **Versioned canonicals:** Attempts mostly preserved `|version`. Canonical resolution: examples preserve exact strings in selectors, `meta.profile`, and `QuestionnaireResponse.questionnaire`; they do not suggest stripping and fetching a bare URL.
- **Status/fulfillment semantics:** Attempts differed on whether a fulfilling Artifact requires `fulfilled` status. Canonical resolution: every item gets exactly one status. `fulfilled` or `partial` should generally have at least one Artifact edge; `declined`, `unavailable`, `unsupported`, and `error` normally do not. `partial` with a fulfilling Artifact is valid when responsive content was returned but complete satisfaction is not claimed.
- **Raw FHIR provenance:** Attempts differed in emphasis. Canonical resolution: every raw-FHIR example is described as patient-mediated unless its payload separately carries provenance, signature, or accepted source evidence. Holder approval, HPKE/mdoc transport, and valid wrapper syntax do not prove clinical-source provenance.

## JSON and internal consistency checks

All JSON code blocks in attempts 01-05 parsed as JSON during adjudication. The canonical examples below were generated with JSON serialization and then parse-checked. The canonical examples use `mediaType`, not an Artifact-level `type`; use `fulfills[]`; include `fhirVersion` only on `application/fhir+json`; omit outer `fhirVersion` from `application/smart-health-card`; and include exactly one `requestStatus[]` entry for each request item.

## T6.C fixture follow-up implications

The canonical examples use stable, synthetic ids suitable for later fixture work, but they are not a fixture index. T6.C should decide which examples become byte-exact, structural, semantic, diagnostic, historical, illustrative, or conformance-candidate fixtures. Placeholder SMART Health Card JWS strings would need replacement with signed synthetic credentials, raw FHIR snippets would need fixture-grade validation, and any trust material must be clearly labeled non-production.
