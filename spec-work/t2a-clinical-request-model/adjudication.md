# T2.A adjudication — clinical request model

## Attempts reviewed

- `spec-work/t2a-clinical-request-model/attempt-01.md`
- `spec-work/t2a-clinical-request-model/attempt-02.md`
- `spec-work/t2a-clinical-request-model/attempt-03.md`
- `spec-work/t2a-clinical-request-model/attempt-04.md`
- `spec-work/t2a-clinical-request-model/attempt-05.md`

## Strongest contributions

- **Attempt 01**: Best comprehensive prose for the full requested outline, including clear examples, `profilesFrom[]` array enforcement, additive profile selectors, and response-media-type cross-validation notes.
- **Attempt 02**: Strongest conformance-target discipline and clearest `|version` matrix, especially preserving wire values while stripping suffixes for fetch/routing.
- **Attempt 03**: Best compact field tables, crisp no-identity framing, and concise extension-registration checklist.
- **Attempt 04**: Best alignment with active implementation caveats, especially avoiding hard length limits and treating the proposed item-id character set as guidance until schema closure.
- **Attempt 05**: Best polished narrative around requester identity prohibition, no-selector default, and separating kiosk wrapper details from §5.

## Contradictions, missing pieces, and overreach

- **Hard numeric and length limits**: Attempts 02 and 03 proposed concrete id length and item-id regex limits. Active validators require non-empty request ids and item ids, duplicate item-id rejection, and non-empty `accept[]`, but do not enforce id lengths or an item-id regex (`rp-web/src/sdk/core.ts` lines 96–125; `wallet-android/app/src/test/java/org/smarthealthit/checkin/wallet/SmartRequestAdapterTest.kt` lines 11–24). I kept hard numeric limits open for Appendix B/transport closure and made ASCII-safe item ids a SHOULD.
- **Whether `items[]` is non-empty**: Some attempts used SHOULD and one used SHALL. Active TypeScript validates that `items` is an array but does not reject an empty array (`rp-web/src/sdk/core.ts` lines 103–105). Android tests show missing top-level `id` rejected even with `items: []`, but do not establish empty-array rejection (`SmartRequestAdapterTest.kt` lines 11–15). I used Requester SHOULD include at least one item and recorded schema/conformance closure as downstream work.
- **Unknown fields and extension selectors**: Attempts varied between reject, ignore, and extension handling. T1 requires forward compatibility, while active TypeScript currently rejects unknown `content.kind` with “fhir.resources or questionnaire” (`rp-web/src/sdk/core.ts` lines 137–168). I allow unknown members to be ignored but treat unknown `content.kind` as an extension selector that cannot be guessed; §6/§13 must reconcile status handling and registry support.
- **Duplicate JSON member names**: Attempts differed on parser obligations. T1.A already says JSON member names are unique within an object (`spec-work/t1a-editorial-terminology/canonical.md` lines 81–84). I made Requesters avoid duplicates and processors reject when detected, while avoiding an untestable claim that every parser can detect duplicates after parsing.
- **`profilesFrom[]` shape**: All attempts preserved array shape, but some mentioned URNs or packages. Active docs state `profilesFrom` is a non-empty array of canonical URLs and version 1 does not define registered URNs (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 1068–1070). Active code validates `profilesFrom` as a non-empty array of canonical URLs (`rp-web/src/sdk/core.ts` lines 145–172). I made array shape normative and rejected string/object/package descriptors.
- **Profile additivity vs. `resourceTypes[]`**: Attempts agreed on profile additivity but varied on strictness for `resourceTypes[]`. Active docs state `profiles` and `profilesFrom` are additive (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 1070–1072) and describe `resourceTypes` as official FHIR resource names (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` line 1074). T1 canonicals warn not to broaden additivity to `resourceTypes[]`. I made `resourceTypes[]` a separate resource-type constraint.
- **Questionnaire shapes and disagreement**: All attempts included canonical, inline, and combined forms. Active code accepts string canonicals, inline `resourceType: "Questionnaire"`, and object forms with `canonical` or `resource` (`rp-web/src/sdk/core.ts` lines 150–166). The canonical adds conservative disagreement behavior because active code only validates shape; exact status-code mapping remains §6 work.
- **Canonical `|version` handling**: Attempts converged on strip-for-fetch and preserve-for-claims. Active Android tests confirm stripping before Questionnaire fetch (`SmartRequestAdapterTest.kt` lines 59–65), active docs say profile canonicals may include `|version` (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 266–276), and active docs say SMART Health Cards carry their own FHIR version (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 143–150). I adopted a decision matrix that preserves wire/clinical claims and strips only for fetch, routing, grouping, and profile-family lookup.
- **Accepted media types and response details**: Attempts sometimes repeated response-model details. Active types define core accepted media types as `application/smart-health-card` and `application/fhir+json` (`rp-web/src/sdk/core.ts` lines 4–7) and response artifact details separately (`rp-web/src/sdk/core.ts` lines 59–75, 232–247). I defined request-side `accept[]` semantics and only cross-referenced §6 for Artifact shapes.
- **Requester identity metadata**: Attempts aligned but varied in examples. Active docs explicitly prohibit clinic name, logo, or URL in the request body (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 52–55 and 1062–1065), and T1.C says identity belongs to transport/trust layers (`spec-work/t1c-architecture-roles-flows/canonical.md` lines 31–34). I made the prohibition explicit across top-level, item, selector, and extension members.

## Resolutions with repository evidence

- Preserved the transport-neutral clinical object framing from T1.B/T1.C: SMART request semantics are invariant across same-device, kiosk `smartRequest` embedding, and future bindings (`spec-work/t1b-purpose-scope-goals/canonical.md` lines 7–17; `spec-work/t1c-architecture-roles-flows/canonical.md` lines 22–35).
- Preserved direct kiosk embedding boundary without adding §9 wrapper details: T1.C says kiosk embeds the SMART request directly as `smartRequest` and does not use demo presets or wrappers in its place (`spec-work/t1c-architecture-roles-flows/canonical.md` lines 42–44 and 73–88).
- Used the active top-level and item shape from TypeScript: `type`, `version`, `id`, optional `purpose`, optional `fhirVersions`, and `items`, with item `id`, `title`, optional `summary`, optional `required`, `content`, and `accept` (`rp-web/src/sdk/core.ts` lines 29–45).
- Grounded validation strictness in active code: fixed `type`/`version`, non-empty `id`, optional string `purpose`, array-of-strings `fhirVersions`, array `items`, duplicate item-id rejection, non-empty item `title`, boolean `required`, non-empty string-array `accept`, and object `content` are validated in `rp-web/src/sdk/core.ts` lines 87–132.
- Grounded `profilesFrom[]` in both docs and code: docs define profile-family collection semantics and additivity (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 279–297); active validation requires non-empty canonical URL arrays (`rp-web/src/sdk/core.ts` lines 145–172); tests reject string and object `profilesFrom` values (`rp-web/src/protocol/index.test.ts` lines 82–111).
- Grounded no-selector default in docs and Android behavior: docs say omitting `profiles`, `profilesFrom`, and `resourceTypes` requests any patient-specific FHIR resources the Wallet can offer and the patient chooses to share (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 1064–1067); Android test `supportsBroadFhirResourceRequests` parses such a request (`SmartRequestAdapterTest.kt` lines 26–33).
- Grounded accepted media type behavior in docs, TypeScript types, and tests: docs state `accept` is ordered by verifier preference (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 58–64 and 1060–1063); TypeScript defines the two core media types (`rp-web/src/sdk/core.ts` lines 4–7); tests validate SMART Health Card artifacts and prohibit outer `fhirVersion` on them (`rp-web/src/protocol/index.test.ts` lines 134–159).
- Grounded example choices in active presets and fixtures: active store presets use `purpose`, `fhirVersions`, exact profiles, `profilesFrom`, inline Questionnaire, and `accept` arrays (`rp-web/src/store.ts` lines 57–118), and Android test vectors contain matching request JSON (`wallet-android/app/src/test/resources/test-vectors.json` lines 12–30).

## Downstream decisions

- Appendix B should encode fixed `type` and `version`, required top-level and item fields, duplicate item-id uniqueness as far as schema can express it, non-empty `accept[]`, `profilesFrom[]` as a non-empty array of canonical URL strings, selector unions, and whatever final id pattern/length limits are selected.
- §6 must define exact response status behavior for unsupported selectors, malformed known selectors discovered after initial parse, Questionnaire canonical/resource disagreement, unavailable content, declined items, partial fulfillment, Artifact `mediaType`, `fhirVersion`, `fulfills[]`, and `requestStatus[]` cross-validation.
- Appendix H must align FHIR mapping guidance with `resourceTypes[]` filtering, profile-family membership, `meta.profile`, Bundles, QuestionnaireResponse construction, and the `|version` decision matrix.
- §13 must define selector-kind and extension media-type registry templates, including designated expert criteria and compatibility rules.
- §8 and §9 must carry the SMART request without changing these clinical semantics; §9 must continue to embed this object directly as `smartRequest`.

## Open issues

- No blocking open issues for T2.A canonical text.
- Concrete string, array, request-byte, and transport-size limits remain open for Appendix B, §8, §9, fixtures, and conformance closure.
- Whether `items[]` becomes a hard non-empty array requirement remains open for schema/conformance closure; current active behavior does not fully enforce it.
- The final status code for Questionnaire canonical/resource disagreement should be chosen when §6 status semantics are canonical.
- Extension-selector and extension-media-type registration details remain dependent on §13.
