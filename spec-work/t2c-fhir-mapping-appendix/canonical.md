# Appendix H. Mapping to FHIR R4 idioms

This appendix explains how the SMART Health Check-in request and response model in §§5-6 maps to common FHIR R4 idioms. It is supporting implementation and test guidance; it does not define a separate FHIR API, FHIR search language, mdoc behavior, presentation initiation behavior, registry mechanism, JSON Schema rule, or downstream EHR ingestion policy.

The SMART request and SMART response remain transport-neutral clinical JSON objects. FHIR evidence described here is evidence in request selectors, raw FHIR JSON Artifacts, or signed SMART Health Card payloads. If this appendix appears to conflict with §§5-6, §§5-6 control. Requirement keywords in this appendix either restate those sections or are scoped to Appendix H processing guidance.

## H.1 FHIR release context and terms

Version 1.0 uses FHIR R4 idioms for examples and for the base interpretation of FHIR canonicals, `StructureDefinition` profiles, `Questionnaire`, `QuestionnaireResponse`, `Bundle.entry[].resource`, and `Resource.meta.profile`. The clinical model is not limited to one implementation guide. US Core, CARIN Digital Insurance Card, and similar guides are examples of profile sources that a Requester might reference; they are not required implementation guides for SMART Health Check-in 1.0.

For this appendix:

- **canonical** means a FHIR canonical URL string, optionally followed by a `|version` suffix where the relevant field permits that form.
- **parsed canonical** means the structured pair `(url, version?)` obtained by splitting a canonical at the first `|`, preserving the original wire string separately. The `url` member is the non-empty substring before the first `|` or the whole string when no suffix is present. The `version` member is the substring after the first `|`, when present, and is treated as opaque even if it contains additional `|` characters.
- **base canonical** means the parsed canonical `url`, without any `|version` suffix.
- **profile evidence** means evidence that a returned resource conforms to a requested exact profile or to a profile in a requested family. Evidence can include `meta.profile`, signed payload content, source or issuer constraints, trusted Wallet/Responder knowledge, FHIR package metadata, implementation-guide knowledge, configured family mappings, or local policy.

The SMART request `version` and SMART response `version` are SMART Health Check-in model versions, not FHIR versions. For raw FHIR JSON Artifacts, FHIR release information is carried by the Artifact-level `fhirVersion`. For SMART Health Card Artifacts, FHIR release information is inside each signed credential payload.

## H.2 Canonical URL and `canonical|version` handling

FHIR canonicals appear in `profiles[]`, `profilesFrom[]`, `form.fhir` selectors, returned `QuestionnaireResponse.questionnaire`, and returned `Resource.meta.profile` values. Section 5.5 defines the controlling decision matrix. The FHIR-facing summary is:

- preserve the exact wire string when carrying, signing, encrypting, comparing protocol bytes, logging, including values in fixtures, returning `QuestionnaireResponse.questionnaire`, or returning `Resource.meta.profile` values;
- parse canonicals into `(url, version?)` before resolution or conformance-resource lookup, and preserve the original canonical string separately for response construction and diagnostics;
- resolve a canonical to a FHIR resource with a configured canonical resolver or package cache that consumes `(url, version?)`, or with FHIR search semantics such as `GET [base]/{ResourceType}?url={url}&version={version}` when a version is present;
- verify the resolved resource after lookup: `resourceType` matches the expected FHIR resource type, `url` equals the requested parsed `url`, and `version` equals the requested parsed `version` when the request was versioned;
- use direct bare HTTP dereference of `url` only for unversioned canonicals, only when the recipient is willing to accept the publisher's served version, and only with post-resolution `resourceType` and `url` verification; do not satisfy a versioned canonical by stripping `|version` and dereferencing the bare URL; and
- compare at the same normalization level on both sides. A versioned request value is an exact-version claim when exact conformance is asserted or validated. An unversioned request value can match a supported version of the same base canonical when other evidence supports the match.

| Location or operation | FHIR-layer interpretation |
| --- | --- |
| `profiles[]` | Exact `StructureDefinition` profile canonicals. If the request includes `|version`, exact-version evidence must preserve and compare the suffix or provide equivalent local evidence for that exact profile version. A Wallet/Responder should not report `fulfilled` for a versioned `profiles[]` request value unless the returned resource's `meta.profile[]` includes the same versioned canonical or the Wallet/Responder has trusted evidence that the resource conforms to that exact profile version. If the request omits `|version`, evidence for a supported version of the same base canonical can be responsive, subject to §5.4.1.1 and local policy. |
| `profilesFrom[]` | Canonical profile-family URLs. Family lookup normally uses the base canonical; strip `|version` unless the family definition explicitly defines version-sensitive membership. This is a classification rule, not a resolution rule for `StructureDefinition` resources. |
| `form.fhir` `questionnaireCanonical` | The selector's `questionnaireCanonical` field is the Questionnaire identity requested by the Requester. Resolve it as a parsed `(url, version?)` using a canonical resolver, package cache, or FHIR search. Direct bare HTTP dereference is permitted only for unversioned Questionnaire canonicals and requires post-resolution `Questionnaire.url` verification. A versioned Questionnaire canonical is not resolved by stripping the suffix and dereferencing the bare URL. |
| Inline `Questionnaire.url` and `Questionnaire.version` | FHIR resource fields that can support consistency checks and can provide a canonical identity when no explicit request canonical was supplied. They do not replace an explicit request canonical when both are present. |
| `QuestionnaireResponse.questionnaire` | When known and when the requested canonical is the identity being answered, preserve the requested canonical including `|version`. |
| Returned `Resource.meta.profile[]` | FHIR conformance evidence inside returned resources. Preserve known values, including `|version` suffixes; do not remove suffixes merely because request routing or grouping used an unversioned form. |

A Wallet/Responder that cannot evaluate an exact version claim can report the item outcome using §6.4 status rules rather than guessing. A Verifier should avoid asymmetric comparisons, such as stripping only the request value or only the returned `meta.profile`, when exact version conformance is the question.

Resolution failure, post-resolution mismatch, or absence of exact-version evidence for a versioned request value is not a license to substitute a different FHIR artifact. The Wallet/Responder should report `unsupported`, `unavailable`, or `error` according to §6.4, depending on whether the problem is capability, data availability, or operational failure.

## H.3 Mapping `selection.fhir` selectors

A `content.kind: "selection.fhir"` selector requests existing patient-specific FHIR resources. It is not a general FHIR search expression, FHIRPath expression, GraphDefinition, `$everything` operation, SMART App Launch scope, authorization policy, form-completion instruction, or instruction to contact a FHIR server.

### H.3.1 `profiles[]`: exact profile matching

`profiles[]` contains exact `StructureDefinition` canonical URLs acceptable for the item. A returned resource can support a `profiles[]` match when:

1. the resource's `meta.profile[]` includes the requested canonical, applying §5.5 comparison rules and exact-version matching for versioned request values;
2. signed content, such as a SMART Health Card payload, includes equivalent profile evidence; or
3. the Wallet/Responder, Verifier, or receiver has trusted local evidence that the resource conforms to the requested profile.

The core protocol does not require the Wallet/Responder or Verifier to run a full FHIR profile validator for every resource. A deployment profile, certification program, or receiving system may require full validation before ingestion, but that is downstream conformance or workflow policy.

### H.3.2 `profilesFrom[]`: profile-family membership

`profilesFrom[]` is an array of canonical profile-family URLs. A profile family can identify a FHIR publication, implementation guide, profile collection, or other known family of FHIR profiles. A `profilesFrom[]` value is not a package descriptor, package id, package version, npm package name, registry alias, object, local topic label, or singleton string field unless a future version or registered extension defines such a value space.

FHIR resources do not normally declare profile-family membership directly. To evaluate a returned resource against `profilesFrom[]`, implementations generally need knowledge outside the SMART response, such as FHIR package metadata, `ImplementationGuide` content, configured family mappings, or local policy. `meta.profile[]` is useful evidence, but a Verifier still needs to know whether the declared profile belongs to one of the requested families.

A broad profile-family request does not require the Wallet/Responder to disclose every matching resource. Holder decision, accepted media types, FHIR version compatibility, Wallet capability, available data, local policy, and §6.4 status determine the response.

### H.3.3 Additive profile selectors and `resourceTypes[]`

`profiles[]` and `profilesFrom[]` are additive profile selectors. If both are present, the profile-selector portion of the item is satisfied by a resource that matches any exact profile in `profiles[]` or any profile that belongs to any family in `profilesFrom[]`, subject to `resourceTypes[]` and the rest of the item definition.

`resourceTypes[]` is a separate resource-type constraint. When it appears with `profiles[]` or `profilesFrom[]`, a responsive resource must satisfy the additive profile-selector portion and have a listed FHIR `resourceType`. When `resourceTypes[]` appears alone, the item requests patient-specific resources of the listed official FHIR resource types.

Example:

```json
{
  "kind": "selection.fhir",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
  ],
  "resourceTypes": ["Patient", "Condition"]
}
```

The exact US Core Patient profile and the US Core profile family remain additive profile matches. `resourceTypes[]` separately limits responsive resources to `Patient` or `Condition` resources.

### H.3.4 No-selector default

When a `selection.fhir` selector omits `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, §5.4.1.5 defines the no-selector default: the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision.

For FHIR mapping, a Verifier should not expect a specific `meta.profile` value or resource type solely from this selector. The default is intentionally broad; it is not a command to export a complete patient record and not a guarantee that returned content is comprehensive.

## H.4 Raw FHIR JSON Artifacts (`application/fhir+json`)

A raw FHIR JSON Artifact maps directly to a FHIR Resource or Bundle carried in the Artifact `value` field. Section 6.3.2 defines the normative Artifact shape. Core FHIR mapping in this appendix covers the core `application/fhir+json` and `application/smart-health-card` Artifact media types; extension Artifacts that carry FHIR-related content are separate branded media-type variants with their own typed payload shapes and FHIR-version rules.

### H.4.1 Single Resource vs. Bundle

A raw FHIR JSON Artifact `value` is either:

1. a single FHIR Resource JSON object with a string `resourceType`; or
2. a FHIR Bundle with `resourceType: "Bundle"` and resources in `Bundle.entry[].resource`.

A single-resource Artifact is appropriate when one resource is being returned. A Bundle is the usual FHIR packaging idiom when several resources are returned together, when supporting resources are included, or when one Artifact fulfills several request items. A Bundle used only to package returned resources is commonly a `collection` Bundle, but this appendix does not require a specific Bundle `type` unless another profile or local policy does.

For selector validation:

- a non-Bundle Artifact is evaluated as the single FHIR resource in `value`;
- a Bundle Artifact is evaluated by inspecting `Bundle.entry[].resource` entries;
- a Bundle entry without `resource` does not provide FHIR resource content for selector matching; and
- the outer Bundle's `resourceType: "Bundle"` does not by itself satisfy a request for `Patient`, `Coverage`, `Observation`, or another non-Bundle resource type.

Bundle-level `meta.profile`, if present, may describe the Bundle profile. It does not substitute for profile evidence on entry resources when the request asked for non-Bundle clinical resources.

### H.4.2 `fhirVersion` and mixed-version handling

An `application/fhir+json` Artifact carries an outer `fhirVersion`. That value applies to a single Resource Artifact or to the Bundle and all `Bundle.entry[].resource` resources in that Artifact. Under §§6.3.2 and 6.6.5, Wallets/Responders do not mix resources that require different FHIR releases in one raw FHIR JSON Artifact.

When responsive content exists in multiple FHIR releases, the Wallet/Responder should use separate raw FHIR JSON Artifacts, each with its own `fhirVersion`, or report the affected item as `partial`, `unavailable`, `unsupported`, or `error` under §6.4. A Verifier that detects mixed FHIR release requirements in one raw FHIR JSON Bundle rejects or quarantines the Artifact under §6.6.5. Detection may be conservative because many FHIR resources do not explicitly label their release inside the resource body.

The request-level `fhirVersions[]` is a preference and capability signal for raw FHIR JSON and other response forms with an outer FHIR version declaration. It does not override version information inside SMART Health Cards.

An extension media type that carries raw FHIR JSON or a FHIR-derived document is not automatically treated as `application/fhir+json`. Its extension definition needs to state its typed fields, whether it has an outer FHIR version declaration, how FHIR resources are located inside the payload, and how selector matching is performed.

### H.4.3 `meta.profile` evidence

Returned FHIR resources should preserve `meta.profile[]` values where known, including `|version` suffixes. In a Bundle, this evidence appears on `Bundle.entry[].resource.meta.profile`, not as an Artifact-level profile summary.

Verifiers and receivers should inspect profile evidence in the FHIR payload itself. Absence of `meta.profile` is not automatically a core protocol error because §5 allows matching based on equivalent local knowledge or trusted conformance evidence. Contradictory profile evidence, missing evidence needed by a local workflow, or failure of full FHIR validation can lead a receiver to reject or quarantine content under deployment policy without changing the SMART request/response model.

## H.5 SMART Health Card Artifacts at the FHIR layer

An `application/smart-health-card` Artifact is a SMART Health Card file-style JSON object whose `value.verifiableCredential[]` contains one or more SMART Health Card JWS strings. The Artifact wrapper has no outer `fhirVersion` under §§6.3.1 and 6.6.5.

FHIR-version semantics for this Artifact class are inside each signed SMART Health Card payload. A Verifier validates each JWS according to SMART Health Cards and local trust policy, then evaluates the signed FHIR payload content against the original request selectors. Selector responsiveness is determined from signed payload resources, their declared FHIR version, their `resourceType` values, and profile evidence such as `meta.profile` where present.

The same selector concepts apply at the FHIR layer:

- `profiles[]` maps to exact profile evidence in signed resources;
- `profilesFrom[]` maps to membership of signed-resource profiles in a requested family;
- `resourceTypes[]` filters by signed-resource `resourceType`; and
- no-selector items can be satisfied by suitable patient-specific signed FHIR content, subject to Holder decision and local policy.

The SMART Health Check-in Artifact wrapper should not include an Artifact-level profile summary to substitute for inspecting signed content. A SMART Health Card can be validly signed yet still fail to satisfy a requested profile, resource type, Questionnaire, or local ingestion policy.

## H.6 FHIR form selector mapping

A `content.kind: "form.fhir"` selector asks the Wallet/Responder to collect or provide answers to a FHIR Questionnaire. The selector is a flat object with `kind: "form.fhir"` and sibling optional fields `questionnaireCanonical` and `questionnaire`, at least one of which is present. It does not use `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; those fields belong to `selection.fhir` request items. For `application/fhir+json`, the expected returned FHIR resource is a `QuestionnaireResponse`, either as a single Resource Artifact or inside a Bundle.

### H.6.1 Questionnaire identity selection

The requested Questionnaire can be expressed as:

1. `questionnaireCanonical`: a non-empty FHIR canonical string, optionally with `|version`;
2. `questionnaire`: an inline FHIR `Questionnaire` resource object; or
3. both `questionnaireCanonical` and `questionnaire` on the selector object.

When selector `questionnaireCanonical` is supplied and is the Questionnaire identity being answered, a generated `QuestionnaireResponse.questionnaire` should preserve that canonical exactly, including any `|version` suffix. When only an inline Questionnaire `questionnaire` is supplied, the Wallet/Responder should populate `QuestionnaireResponse.questionnaire` from the inline resource's canonical identity when known, usually `Questionnaire.url` plus `|Questionnaire.version` when both are present and the version is intended as the canonical version. If no canonical identity is known, the Wallet/Responder should not invent a misleading canonical merely to fill the field; downstream receivers may still require one by deployment policy.

Example canonical-only selector:

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
}
```

Example inline selector:

```json
{
  "kind": "form.fhir",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "item": []
  }
}
```

### H.6.2 Inline and canonical+inline cases

When both sibling fields `questionnaireCanonical` and `questionnaire` are supplied, the canonical is the Requester's explicit identity for response construction and receiver interpretation, while the inline resource is the body to render or use. The Wallet/Responder should check consistency between `questionnaireCanonical`, `questionnaire.url`, `questionnaire.version`, and material item structure. It should not silently merge conflicting definitions or rewrite the requested canonical to match a conflicting inline resource.

Material disagreement is described in §5.4.2.4 and includes different base canonical URLs after applying §5.5 comparison rules, different explicit versions, or conflicting item structure that would change Holder answers. If material disagreement is detected before answers are collected or response construction begins, §6.4 favors `unsupported`. An operational failure after a Questionnaire is otherwise understood is normally `error`. A Verifier should treat an `unsupported` status for such disagreement as a valid item outcome rather than a transport failure when the rest of the SMART response validates.

### H.6.3 QuestionnaireResponse validation

A Verifier evaluating a questionnaire item returned as `application/fhir+json` should check that:

- the Artifact media type is accepted by the item;
- the raw FHIR Artifact includes `fhirVersion`;
- the returned FHIR content is a `QuestionnaireResponse`, or a Bundle containing the relevant `QuestionnaireResponse` in `Bundle.entry[].resource`;
- `QuestionnaireResponse.questionnaire`, when present, preserves the selector's requested `questionnaireCanonical` and `|version` under §5.5 when that canonical is the identity being answered;
- the response is linked to the correct request item through Artifact `fulfills[]` and item status; and
- the response status is consistent with §6.4, including valid `unsupported`, `declined`, `partial`, and `error` outcomes.

This appendix does not define universal Questionnaire rendering rules, answer validation rules, terminology validation rules, launch-context rules, Structured Data Capture behavior, or expression evaluation. Deployments that require those features should define them in a deployment profile or extension.

## H.7 Relationship to US Core, CARIN, and other implementation guides

US Core and CARIN examples are useful because they provide familiar FHIR R4 profile canonicals and profile-family concepts for demographics, clinical summaries, and insurance-card workflows. They are illustrative only.

Example exact CARIN-style Coverage selector:

```json
{
  "kind": "selection.fhir",
  "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
  "resourceTypes": ["Coverage"]
}
```

Example US Core profile-family selector:

```json
{
  "kind": "selection.fhir",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

These examples mean that the Requester can process content matching those selectors if the Holder and Wallet/Responder can provide it. They do not make US Core, CARIN, or any other implementation guide mandatory clinical content, a mandatory Wallet storage requirement, or mandatory Verifier ingestion policy. Other jurisdictions and deployment communities can use their own FHIR canonicals, profile families, and local trust policies through the same selector and Artifact rules.

## H.8 Verifier and Wallet use of FHIR conformance evidence

SMART Health Check-in uses FHIR-native identifiers to improve interoperability, but it is intentionally lighter than a full FHIR conformance-testing pipeline. Wallets/Responders and Verifiers should use FHIR conformance evidence pragmatically:

- preserve and inspect `resourceType`, `meta.profile[]`, canonical URLs, `QuestionnaireResponse.questionnaire`, `Questionnaire.url`, and `Questionnaire.version` where known;
- use implementation-guide, package, family-map, or local policy knowledge for `profilesFrom[]` membership;
- verify SMART Health Card signatures and inspect signed FHIR payloads before relying on SMART Health Card FHIR evidence;
- avoid manufacturing profile claims or wrapper-level profile summaries that are not supported by the payload; and
- distinguish protocol validation from downstream clinical acceptance.

A response can be a valid SMART Health Check-in response and still be unsuitable for a Requester's local workflow because it lacks a required profile, profile version, issuer trust signal, provenance, patient-match confidence, terminology validation, or downstream business requirement. Conversely, a core protocol implementation is not non-conformant merely because it does not perform full FHIR profile validation, unless a deployment profile or certification program adds that requirement.
