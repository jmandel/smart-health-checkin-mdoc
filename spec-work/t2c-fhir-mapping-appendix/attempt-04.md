# Appendix H. Mapping to FHIR R4 idioms

This appendix is explanatory implementation guidance for applying the request and response model in §§5–6 to FHIR R4-style resources, canonicals, Bundles, and Questionnaire workflows. It does not define a new selector language, response shape, transport behavior, or clinical conformance profile. Where this appendix uses normative keywords, it either restates requirements already defined in §§5–6 or scopes conformance to this appendix's interpretation guidance.

SMART Health Check-in request and response objects remain transport-neutral clinical JSON objects. The FHIR mappings below are the same whether the SMART request and SMART response are carried by the same-device presentation flow, by the kiosk wrapper, or by a future binding.

## H.1 FHIR versions and the role of R4

Version 1.0 uses FHIR R4 idioms for examples and for the base interpretation of FHIR canonicals, `Resource.meta.profile`, `Bundle.entry[].resource`, `Questionnaire`, and `QuestionnaireResponse`. The SMART request `version` and SMART response `version` are SMART Health Check-in model versions, not FHIR versions.

For raw FHIR JSON Artifacts (`mediaType: "application/fhir+json"`), §6 requires an Artifact-level `fhirVersion`. That value tells the receiver how to interpret the FHIR JSON carried in the Artifact `value`. Request `fhirVersions[]`, when present, is an ordered statement of raw FHIR JSON versions the Requester can consume; Wallets should use it when selecting an `application/fhir+json` version.

For SMART Health Card Artifacts (`mediaType: "application/smart-health-card"`), §6 requires `value.verifiableCredential[]` and prohibits an outer Artifact-level `fhirVersion`. Each signed SMART Health Card payload carries its own FHIR-version semantics. A Verifier that consumes a SMART Health Card Artifact evaluates FHIR version, `meta.profile`, and resource content inside the signed credential payload, not in the SMART Health Check-in Artifact wrapper.

## H.2 FHIR canonical and `canonical|version` handling

FHIR canonicals in this specification can identify exact profiles, profile families, Questionnaires, and returned conformance evidence. A canonical may include a `|version` suffix where §§5–6 permit it. Implementations should treat the suffix as semantic version information, not as a literal HTTP URL path or query component.

The following guidance summarizes the §5.5 decision matrix for FHIR-facing implementations:

| Location or operation | FHIR-layer interpretation |
| --- | --- |
| `profiles[]` request values | Exact `StructureDefinition` profile canonicals. If the request includes `|version`, exact-version evidence should preserve and compare the suffix. If the request omits `|version`, matching may use a supported version of the base canonical. |
| `profilesFrom[]` request values | Canonical profile-family URLs. The value space is an array of canonical profile-family URLs, not a package descriptor, package id, registry alias, object, or single string. Version-sensitive family membership is not defined unless a future family definition explicitly says so. |
| `questionnaire` canonical string or object `canonical` | The Questionnaire identity requested by the Requester. If dereferenced over HTTP, strip `|version` for URL construction unless using a FHIR-aware resolver that accepts versioned canonical syntax out of band; preserve the original canonical for response construction and validation. |
| Inline `Questionnaire.url` and `Questionnaire.version` | FHIR resource fields that can support consistency checks against a supplied canonical. They do not replace the explicit request canonical when both are present. |
| `QuestionnaireResponse.questionnaire` | Should preserve the requested Questionnaire canonical, including `|version`, when that canonical is the identity being answered and is known. |
| Returned `Resource.meta.profile[]` | FHIR conformance evidence inside the returned resource. Wallets should preserve known values, including `|version` suffixes; Verifiers should not assume versions were stripped merely because selector routing used an unversioned comparison. |

A Wallet or Verifier should compare canonicals at the same normalization level on both sides: versioned-to-versioned when exact version conformance is being asserted or validated, and base-canonical-to-base-canonical when the request was intentionally unversioned or when profile-family membership is being evaluated without a version-sensitive family definition.

## H.3 Mapping `fhir.resources` selectors

A `fhir.resources` selector describes responsive patient-specific FHIR resources. It is not a general FHIR search expression, GraphDefinition, `$everything` operation, or authorization policy.

### H.3.1 Exact profiles with `profiles[]`

Each `profiles[]` value is an exact FHIR `StructureDefinition` canonical acceptable for the item. A returned resource is good evidence for the selector when `Resource.meta.profile[]` contains the requested canonical, applying the `|version` handling in §5.5 and H.2.

The absence of `meta.profile` is not by itself a core protocol error. Section 5 permits a Wallet/Responder to match based on equivalent local knowledge or trusted conformance evidence, and §6.6 says Verifiers should inspect `meta.profile` while recognizing that full FHIR profile validation is not required by the core protocol. A receiver may still reject or quarantine content under local ingestion policy when it needs profile evidence that is absent or insufficient.

### H.3.2 Profile-family membership with `profilesFrom[]`

Each `profilesFrom[]` value identifies a profile family, such as a FHIR publication, implementation guide, or profile collection. The selector is satisfied by resources conforming to any profile that belongs to any requested family, subject to the other constraints on the item.

Profile-family membership is not computed from the string prefix of `meta.profile` alone unless local policy or family metadata says that is safe. Implementations may use FHIR package metadata, ImplementationGuide definitions, known IG canonical indexes, configured mappings, or other deployment knowledge to decide which exact profiles are members of a family. `Resource.meta.profile[]` remains useful evidence, but the family-membership decision may require knowledge outside the SMART response.

When a `profilesFrom[]` request is broad, Wallets should consider Holder review and minimization carefully. A broad family request, for example US Core, can cover many resource types and profiles; it does not require the Wallet to disclose every available matching resource.

### H.3.3 Additive profile selectors and `resourceTypes[]`

When both `profiles[]` and `profilesFrom[]` are present, they are additive profile selectors. A resource may satisfy the profile-selector portion of the item by matching any exact profile in `profiles[]` or any profile that belongs to any family in `profilesFrom[]`.

`resourceTypes[]` is separate. When present, it filters the candidate set by official FHIR `resourceType` name. Thus a selector with `profilesFrom: ["http://hl7.org/fhir/us/core"]` and `resourceTypes: ["Patient", "Condition"]` asks for resources in the requested family whose FHIR `resourceType` is either `Patient` or `Condition`; it does not ask for all US Core resource types. Conversely, `profiles[]` does not narrow or enumerate `profilesFrom[]`.

### H.3.4 No-selector default

When `content.kind` is `"fhir.resources"` and `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, §5 defines the item as requesting any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision.

FHIR implementations should treat this as intentionally broad. A response may be partial, unavailable, declined, unsupported, or fulfilled according to §6. The no-selector default is not a command to run a complete patient-record export and is not a guarantee that returned content is comprehensive.

## H.4 Raw FHIR JSON Artifacts

An `application/fhir+json` Artifact maps directly to FHIR JSON carried in the Artifact `value` and interpreted under the Artifact `fhirVersion`.

### H.4.1 Single Resource

When an Artifact contains one FHIR resource, `value` may be that resource directly. The object should have `resourceType` as a string and should be interpreted under the Artifact's `fhirVersion`. For selector validation, a Verifier should inspect the resource's `resourceType`, `meta.profile[]`, references, and relevant fields such as `QuestionnaireResponse.questionnaire`.

A single-resource Artifact can fulfill more than one request item only when its `fulfills[]` lists each item and the Artifact's `mediaType` is accepted by every listed item. The FHIR mapping does not infer fulfillment from `resourceType`, profile, or resource id alone.

### H.4.2 Bundle

When an Artifact packages multiple FHIR resources, `value` should be a FHIR Bundle, commonly `Bundle.type = "collection"` for a gathered set of patient-mediated resources. Each returned resource is carried in `Bundle.entry[].resource` and interpreted under the same Artifact-level `fhirVersion`.

For Bundle selector validation, Verifiers should inspect:

- `Bundle.resourceType` and `Bundle.type`;
- each populated `Bundle.entry[].resource.resourceType`;
- each populated `Bundle.entry[].resource.meta.profile[]`;
- relevant FHIR references and subject/patient relationships according to local policy; and
- any `QuestionnaireResponse.questionnaire` values when the Bundle contains QuestionnaireResponse resources.

A Bundle may contain resources that support several request items. The SMART response `fulfills[]` edges and `requestStatus[]` entries remain the authoritative protocol accounting for which items the Wallet claims the Bundle fulfills.

### H.4.3 Mixed FHIR versions

Section 6 requires all FHIR resources in one `application/fhir+json` Artifact to be interpreted under the Artifact's `fhirVersion`. A Wallet must not mix resources requiring different FHIR releases inside one raw FHIR JSON Artifact. If responsive content spans FHIR releases, the Wallet should return separate `application/fhir+json` Artifacts, each with its own `fhirVersion`, or report an appropriate per-item status.

A Verifier should reject or quarantine a raw FHIR JSON Bundle when it detects mixed FHIR release versions in one Artifact. Detection can use explicit resource metadata where present, known source-system evidence, or resource-shape incompatibilities. The core protocol does not require a Verifier to perform exhaustive cross-release inference over every FHIR element.

### H.4.4 `meta.profile` preservation and inspection

Wallets should preserve `meta.profile[]` values in returned resources where known, including version suffixes. This applies to a single-resource Artifact and to each `Bundle.entry[].resource`. Wallets should not move this evidence into a SMART Health Check-in wrapper-level profile summary field for core raw FHIR JSON Artifacts.

Verifiers should inspect returned `meta.profile[]` values when determining whether a resource is responsive to `profiles[]` or `profilesFrom[]`. However, neither Wallets nor Verifiers are required by the core protocol to perform full FHIR profile validation for every returned resource. Implementations may rely on issuer evidence, source-system provenance, local mapping tables, previously validated conformance, or other trusted evidence. Receivers that need stricter assurance can require full validation, specific IG versions, Provenance resources, signatures, or quarantine workflows as local policy.

## H.5 SMART Health Card Artifacts at the FHIR layer

A SMART Health Card Artifact carries SMART Health Card file-style JSON in `value.verifiableCredential[]`. The FHIR layer for this Artifact is inside each signed Verifiable Credential JWS payload.

FHIR mapping consequences:

- the Artifact wrapper has `mediaType: "application/smart-health-card"` and no outer `fhirVersion`;
- a Verifier processes each JWS according to SMART Health Cards and local trust policy;
- FHIR version, resource content, and `meta.profile[]` evidence are read from the signed payload;
- selector responsiveness is evaluated against signed payload resources and claims, not against a wrapper-level profile summary; and
- multiple credentials in one Artifact can collectively support the Artifact's `fulfills[]` claims, subject to §6 many-to-many fulfillment and media-type checks.

Because SMART Health Cards are signed payloads, Verifiers should preserve the distinction between successful SMART Health Card signature/trust processing and selector responsiveness. A credential can be validly signed yet not satisfy the requested profile, resource type, Questionnaire, or local ingestion policy.

## H.6 Questionnaire selector mapping

A `questionnaire` selector requests completion of a FHIR Questionnaire and return of a response Artifact. When `application/fhir+json` is used, the expected FHIR resource is `QuestionnaireResponse`.

### H.6.1 Canonical-only request

When the request supplies a Questionnaire canonical string, the Wallet may resolve, cache, or otherwise obtain the Questionnaire definition by local means. If it dereferences the canonical as a URL, it should strip a `|version` suffix for the network URL while retaining the full requested canonical as the Questionnaire identity.

If a `QuestionnaireResponse` is returned and the requested canonical is known to be the identity answered, `QuestionnaireResponse.questionnaire` should carry that canonical exactly, including `|version` when present. If the Wallet cannot resolve, render, support, or answer the Questionnaire, it should use the §6 status mechanism rather than fabricating an ambiguous response.

### H.6.2 Inline Questionnaire request

When the request supplies an inline FHIR `Questionnaire` resource, the inline resource must have `resourceType: "Questionnaire"` under §5. A Wallet may render and answer the inline resource without network retrieval, subject to Wallet policy, Holder safety, language support, and Questionnaire feature support.

For a returned `QuestionnaireResponse`, the best available value for `QuestionnaireResponse.questionnaire` depends on the inline resource:

- if the request also supplied a `canonical`, preserve that canonical as described in H.6.3;
- otherwise, if the inline `Questionnaire.url` is known and `Questionnaire.version` is present, the Wallet may construct the FHIR canonical form `url|version` for `QuestionnaireResponse.questionnaire`;
- otherwise, if only `Questionnaire.url` is known, the Wallet may use that URL; and
- otherwise, the Wallet may omit `QuestionnaireResponse.questionnaire` if it cannot state a canonical identity safely, while preserving other QuestionnaireResponse linkage such as item `linkId` values.

### H.6.3 Combined canonical and inline resource

When the request supplies both `canonical` and `resource`, the canonical is the Requester's explicit Questionnaire identity and the inline resource is the body the Requester asks the Wallet to render or use. The Wallet should check consistency between `canonical`, `resource.url`, `resource.version`, and the item structure.

If the Wallet detects material disagreement, §5 says it must not silently merge conflicting definitions or rewrite the requested canonical. Section 6 maps pre-answer ambiguity to `unsupported` in ordinary cases and operational failures during rendering, answer collection, conversion, or response construction to `error`. A Verifier should treat an `unsupported` status for a detected material disagreement as a valid item outcome, not as a transport failure.

If the Wallet proceeds and returns a `QuestionnaireResponse`, `QuestionnaireResponse.questionnaire` should preserve the supplied canonical, including `|version`, when that canonical is the identity being answered and is known.

### H.6.4 QuestionnaireResponse validation

For questionnaire items fulfilled with `application/fhir+json`, Verifiers should confirm that the returned FHIR resource is a `QuestionnaireResponse`, either as a single Resource or as a resource inside a Bundle. Verifiers should inspect `QuestionnaireResponse.questionnaire`, response status, item `linkId` structure, and any local Questionnaire constraints needed for ingestion.

The core protocol does not require a Verifier to run full FHIR Questionnaire validation, terminology validation, or expression evaluation. A Requester that depends on those checks should perform them downstream or require them through a deployment profile.

## H.7 Relationship to US Core, CARIN, and other implementation guides

Examples in §§5–6 and this appendix may use US Core and CARIN-style canonicals because they are familiar FHIR R4 implementation-guide idioms for patient demographics, clinical summaries, and insurance-card content. These examples are illustrative. SMART Health Check-in 1.0 does not require US Core, CARIN, or any particular implementation guide unless a request item explicitly asks for that profile or profile family and the Wallet chooses or is able to satisfy it.

A Requester can ask for US Core-style content by using `profilesFrom: ["http://hl7.org/fhir/us/core"]`, exact US Core `profiles[]`, and optional `resourceTypes[]` filters. A Requester can ask for CARIN-style insurance-card content by using exact CARIN profile canonicals and appropriate `resourceTypes[]`, such as `Coverage`, where applicable. In both cases, selector processing still follows §5: `profiles[]` and `profilesFrom[]` are additive, `resourceTypes[]` is a separate constraint, no-selector requests remain broad, and response Artifacts must use accepted media types.

Implementers should avoid hard-coding US-only assumptions into the core protocol layer. Other jurisdictions and deployment communities can use their own FHIR canonicals, profile families, and local trust policies through the same selector and Artifact rules.

## H.8 Verifier and Wallet use of FHIR conformance evidence

Wallets and Verifiers should use FHIR conformance evidence proportionally to the workflow risk and the available Artifact type.

A Wallet constructing a response should:

- prefer resources whose `resourceType` and known profile conformance align with the request selectors;
- preserve `meta.profile[]` and `QuestionnaireResponse.questionnaire` values where known;
- avoid claiming `fulfilled` when it only returned a subset or uncertain match, using `partial` or another §6 status when appropriate; and
- avoid manufacturing profile claims it cannot support.

A Verifier validating a response should:

- apply the required §6.6 cross-checks before clinical ingestion;
- inspect FHIR `resourceType`, `meta.profile[]`, `Bundle.entry[].resource`, `QuestionnaireResponse.questionnaire`, and signed SMART Health Card payloads as applicable;
- evaluate `profilesFrom[]` using implementation-guide, package, family, or local policy knowledge rather than wrapper-level shortcuts;
- preserve version suffixes in evidence and logs subject to privacy minimization; and
- distinguish core protocol validity from downstream clinical acceptance.

Full FHIR profile validation is not a baseline requirement of SMART Health Check-in 1.0. It can be required by local policy, certification programs, deployment profiles, or receiving system ingestion rules. A core-conformant Verifier may accept, reject, quarantine, or route otherwise valid SMART responses according to those downstream requirements after it has applied the protocol validation rules in §6.

## Organizer notes

### Strengths

- Keeps Appendix H explicitly subordinate to §§5–6 and avoids defining a new request, response, transport, mdoc, or kiosk behavior.
- Preserves accepted dependency facts: `profilesFrom[]` array shape, additive `profiles[]`/`profilesFrom[]`, separate `resourceTypes[]`, raw FHIR outer `fhirVersion`, no outer SMART Health Card `fhirVersion`, and preservation of `|version` in returned FHIR evidence.
- Gives implementers and test writers concrete inspection points for single resources, Bundles, `Bundle.entry[].resource`, `meta.profile[]`, SMART Health Card signed payloads, and `QuestionnaireResponse.questionnaire`.
- Separates protocol validation from downstream FHIR profile validation, allowing stronger local policies without making full FHIR validation a universal requirement.

### Caveats

- This draft intentionally uses SHOULD-level guidance for most FHIR evidence handling because §§5–6 do not require full profile validation and because FHIR conformance evidence can come from local knowledge rather than only `meta.profile`.
- Mixed-version detection is inherently partial unless a Wallet or Verifier has source-system or profile knowledge; the draft avoids requiring exhaustive inference while preserving §6's no-mixed-version rule.
- Profile-family membership for `profilesFrom[]` depends on IG/package/local knowledge that is outside the SMART response; conformance tooling will need fixtures or predefined family maps to test this deterministically.

### Open issues

- Appendix B and final conformance tooling need to decide how much of the FHIR guidance can be schema-checked versus only procedurally tested.
- The final specification should confirm whether examples remain R4-only or mention R4B/R5 compatibility in Appendix H after conformance closure.
- Status handling for some Questionnaire failures is inherited from §6, but deployment profiles may want finer distinctions for unsupported Questionnaire features, terminology failures, and answer validation errors.

### Downstream dependencies

- Appendix B should encode the raw FHIR versus SMART Health Card Artifact-shape distinctions and leave `meta.profile`, Bundle content, mixed-version, and QuestionnaireResponse checks to procedural validation where JSON Schema cannot express them.
- §13 registry work should define how future selector kinds, media types, profile-family identifiers, and compatibility rules document their FHIR-version and conformance-evidence behavior.
- Worked examples and fixtures should include at least one single-resource raw FHIR Artifact, one Bundle with `Bundle.entry[].resource.meta.profile`, one SMART Health Card Artifact without outer `fhirVersion`, and one QuestionnaireResponse preserving a versioned canonical.
