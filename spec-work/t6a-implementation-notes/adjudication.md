# T6.A Implementation notes adjudication

## Inputs reviewed

Reviewed `attempt-01.md` through `attempt-05.md`, the current outline and dependency tree, `design-notes.md`, `methodology.md`, and all prerequisite canonicals named in the task. The controlling upstream decisions are that SMART Health Check-in 1.0 has exactly two normative layers, the §5/§6 transport-neutral clinical model and the §7/§8 same-device direct `org-iso-mdoc` presentation/trust flow; in-person QR/NFC/deep-link/kiosk handoff remains deployment-defined UX rather than a standardized pointer, relay, submission, or completion protocol, consistent with `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:9-28`, `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:75-105`, and `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:286-324`.

## Attempt-by-attempt adjudication

### Attempt 01

Strongest contributions:

- Clear opening layer model and explicit warning not to revive kiosk, relay, submission, or completion behavior as a second wire protocol.
- Good Verifier staging: request building, exact §8 request construction, preserving the exact `encryptionInfo` base64url string, layered validation, and diagnostic fixture levels.
- Strong Wallet guidance on trust-state modeling, request-item consent, status mapping, holder-data boundaries, response construction, and mdoc packaging.
- Practical EHR and SDK material, especially around raw FHIR provenance, status/Artifact mismatches, telemetry minimization, and extension media types.

Errors or omissions:

- More expansive than the outline in places, adding substructure that would need trimming for a final concise §15.
- Some diagnostic examples are useful but should not imply that every product needs to expose every byte boundary in routine support tooling.

### Attempt 02

Strongest contributions:

- Best alignment with the outline headings, especially §15.1.2 “Holding HPKE private material”.
- Clear browser-local versus server-owned Verifier authority framing while preserving the non-protocol status of any handles or server session state.
- Useful constants table for direct `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, `docType`, namespace, response element, requestInfo key, and HPKE `info`/`aad`.
- Strong Wallet subsections for origin policy, parsing, consent, holder-store, profile-family matching, QuestionnaireResponse construction, Android matcher/handler split, and iOS/Safari limitations.

Errors or omissions:

- Includes many near-normative “should” implementation statements that need to remain clearly advisory in §15.
- More detailed platform subsections than needed in the final canonical, though the iOS/Safari warning is worth preserving.

### Attempt 03

Strongest contributions:

- Concise but comprehensive treatment of the two-layer/no-kiosk posture.
- Good Verifier validation pipeline and clear distinction among HPKE, origin, reader authentication, mdoc issuer/device evidence, SMART response validity, SMART Health Card trust, raw FHIR provenance, and EHR ingestion.
- Strong SDK packaging structure: core model, FHIR helpers, web verifier, native wallet packages, schema/CDDL/fixture tools, and extension packages.
- Good negative-test list covering stale questionnaire shapes, scalar `profilesFrom`, GenericArtifact-style fallbacks, canonical strip-and-fetch, wrong mdoc identifiers, wrong request carriers, and HPKE mistakes.

Errors or omissions:

- Some material reads like conformance-test design rather than implementation notes; canonical should keep it as migration/testing guidance, not a new checklist.
- It could be more explicit about HPKE private-material custody models, where attempt 02 was stronger.

### Attempt 04

Strongest contributions:

- Useful modular architecture framing and a concise validation-report model.
- Good tables for HPKE authority patterns and SDK package boundaries.
- Strong emphasis on exact machine-value preservation and not localizing or rewriting identifiers.
- Good Android matcher/handler split and clear fixture/support redaction guidance.

Errors or omissions:

- The draft includes illustrative TypeScript/Kotlin interfaces. Those are useful for implementers but too language-specific for canonical §15 text.
- “Source of truth” allow-list process language is sound as deployment advice, but final text should avoid implying a single required operational governance model.

### Attempt 05

Strongest contributions:

- Best list of common interoperability traps for request builders, especially requester identity in clinical request fields, local topic strings, scalar `profilesFrom`, old nested Questionnaire selector forms, unaccepted media types, and treating `required` as consent.
- Strong raw FHIR provenance warning: transport, mdoc, readerAuth, Holder approval, `requestId`, Artifact id, and `fulfills[]` do not prove EHR provenance.
- Clear SDK examples-current guidance and explicit rejection of GenericArtifact-style catch-alls.
- Good concise discussion of status/Artifact relationships and deduplication on payload evidence rather than wrapper ids.

Errors or omissions:

- Less detailed than attempts 02 and 03 on the exact §8 byte-ladder validation and HPKE custody choices.
- Some EHR telemetry guidance is broad; canonical should keep it directly tied to implementation notes and privacy/security sections.

## Contradictions and resolutions

- **Normative kiosk / relay posture.** All attempts mostly reject a normative kiosk protocol, but some use server-owned handles, relay words, or kiosk-like deployment examples. Resolution: §15 may mention those as deployment architecture only. It must not define or imply a version 1.0 pointer, relay, submission, completion, or alternate response path. This follows `spec.md.outline:331-351`, `spec-work/design-notes.md:721-731`, `spec-work/t1a-editorial-terminology/canonical.md:31-47`, `spec-work/t5a-conformance/canonical.md:7-13`, and `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:1-8`.
- **Questionnaire selector shape.** Attempts consistently prefer the flat selector, but differ in how much compatibility behavior to suggest. Resolution: canonical states that new builders and validators should use `content.kind = "questionnaire"` with direct `canonical` and/or `resource`; legacy nested `questionnaire` string/object/wrapper forms should fail visibly rather than be silently coerced, consistent with `spec-work/t2a-clinical-request-model/canonical.md:369-389`, `spec-work/t2d-json-schema-appendix/canonical.md:103-149`, and `spec-work/t2c-fhir-mapping-appendix/canonical.md:146-188`.
- **Canonical `|version` resolution.** Attempts agree that strip-and-fetch is wrong, but differ on whether stripping is ever acceptable. Resolution: canonical repeats the structured parse/resolution/search/post-resolution verification rule and limits stripping to local routing/grouping/family lookup where `spec-work/t2a-clinical-request-model/canonical.md:528-551` permits it; versioned resolution and post-resolution verification follow `spec-work/t2a-clinical-request-model/canonical.md:514-526`, and carried, emitted, fixture, `meta.profile`, and `QuestionnaireResponse.questionnaire` values preserve exact strings.
- **GenericArtifact and unknown media types.** Attempts agree that core has no GenericArtifact. Resolution: canonical says SDKs and validators should model only the two core Artifact variants plus explicit branded extension variants, and should not infer semantics from `value`, `url`, `data`, or similar fields, per `spec-work/t2b-clinical-response-model/canonical.md:74-107` and `spec-work/t5d-registry-iana/canonical.md:7-15`.
- **Status/Artifact consistency.** Attempts use slightly different strength for `fulfilled`/`partial` needing Artifacts. Resolution: canonical follows §6.4.2: `fulfilled` or `partial` usually/should have at least one fulfilling Artifact, while `declined`, `unavailable`, and `unsupported` normally do not; Verifiers and receivers should flag mismatches for review without inventing new §15 requirements, matching `spec-work/t2b-clinical-response-model/canonical.md:274-307` and `spec-work/t2b-clinical-response-model/canonical.md:353-397`.
- **Raw FHIR provenance.** Attempts vary in wording but agree on the principle. Resolution: canonical states that raw `application/fhir+json` is patient-mediated unless separate accepted provenance/signature/source evidence exists; transport trust and clinical-source trust remain separate under §7, especially `spec-work/t3a-trust-framework/canonical.md:127-151` and `spec-work/t5b-security-considerations/canonical.md:43-51`.
- **iOS/Safari and platform bridges.** Attempts differ on whether to include a separate subsection. Resolution: because the outline includes iOS/Safari considerations under §15.2, canonical includes a concise platform note: non-Android or future platforms can implement the same §8 invariants, but custom URL schemes or relays are not version 1.0 bindings, consistent with `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:9-28`, `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:75-105`, and `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:286-324`.
- **Diagnostic fixture detail.** Attempts differ in how much byte material to list. Resolution: canonical includes examples of useful debug boundaries but stresses controlled, redacted diagnostics and defers fixture classification to the appendices and T6.C, aligning with `spec-work/t3d-same-device-cddl-fixtures/canonical.md:278-419`.

## Downstream preservation notes

- §15 is informative only; do not introduce new `SHALL`/`MUST` obligations here.
- Keep Requester/Verifier, Wallet/Responder, Holder, Artifact, selector, and profile-family terminology aligned with §§1–6.
- Keep §8 constants exact: `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, `org.smarthealthit.checkin.request`, `DeviceRequest.version` `"1.0"`, optional per-`DocRequest.readerAuth`, and HPKE with `info = SessionTranscript` and empty AAD.
- Treat public/demo docs and fixtures as follow-up only when they may mislead implementers into reviving stale questionnaire shapes, GenericArtifact, strip-and-fetch canonical resolution, or kiosk-as-protocol claims.

## Blocking issues

None. T6.A can be completed as informative implementation notes against the current canonicals.
