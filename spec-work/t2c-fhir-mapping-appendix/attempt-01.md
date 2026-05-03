# Appendix H. Mapping to FHIR R4 idioms

This appendix explains how the SMART Health Check-in clinical request and response model maps to common FHIR R4 idioms. It supports the normative request and response rules in §§5-6; it does not define a separate FHIR API, FHIR search language, mdoc behavior, kiosk behavior, or downstream EHR ingestion policy.

The guidance below is written for implementers, conformance-test authors, and deployment-profile authors who need to reason about FHIR canonicals, profile evidence, Bundles, SMART Health Cards, and QuestionnaireResponse construction. Where this appendix uses requirement keywords, the target is Appendix H processing guidance or a restatement of a requirement already defined in §§5-6.

## H.1 FHIR release scope and terminology

Version 1.0 is designed around FHIR R4 idioms and examples, especially `StructureDefinition` canonicals, `Questionnaire`, `QuestionnaireResponse`, `Bundle.entry[].resource`, and `Resource.meta.profile`. The clinical model is not limited to one implementation guide. US Core, CARIN Digital Insurance Card, and similar implementation guides are examples of profile sources that a Requester might reference; they are not made required by this appendix.

For this appendix:

- **canonical** means the FHIR canonical URL string used to identify a conformance resource, optionally followed by a `|version` suffix.
- **base canonical** means the canonical URL before any `|version` suffix.
- **profile evidence** means evidence that a returned resource conforms to a requested profile or to a profile in a requested family. Evidence can include `meta.profile`, signed payload content, trusted Wallet/Responder knowledge, FHIR package metadata, implementation-guide knowledge, or deployment policy. This specification does not require full FHIR profile validation as part of core SMART Health Check-in response validation.

## H.2 Canonical URL and `canonical|version` handling

FHIR canonicals are used in `profiles[]`, `profilesFrom[]`, questionnaire selectors, `QuestionnaireResponse.questionnaire`, and returned `meta.profile` values. Implementations need both comparison behavior and preservation behavior.

The controlling rule is §5.5:

- preserve the exact string when carrying, signing, encrypting, logging for conformance fixtures, returning `QuestionnaireResponse.questionnaire`, or returning `Resource.meta.profile` values;
- strip the `|version` suffix only for operations such as HTTP URL dereference, broad routing, grouping, and profile-family lookup, unless a FHIR-aware resolver or future profile-family definition explicitly defines version-sensitive behavior; and
- compare at the same normalization level on both sides. A versioned request value is an exact-version claim when exact conformance is being asserted or validated. An unversioned request value can match a supported version of the same base canonical when other evidence supports the match.

Examples:

```text
Requested exact profile:
  http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|8.0.1

Base canonical for fetch/routing/grouping:
  http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient

Returned meta.profile evidence, if known, should preserve the versioned claim:
  http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|8.0.1
```

A Wallet/Responder should not erase a version suffix from a returned `meta.profile` or `QuestionnaireResponse.questionnaire` value merely because it stripped the suffix earlier for routing or dereferencing. Conversely, a Verifier should not fail a response solely because a request used an unversioned canonical and the returned resource declares a versioned `meta.profile` with the same base canonical, unless local policy requires a specific version.

## H.3 Mapping `fhir.resources` selectors to FHIR resources

A `content.kind: "fhir.resources"` selector maps to patient-specific FHIR resources. The selector fields have distinct roles.

### H.3.1 `profiles[]`: exact profile matching

`profiles[]` contains exact `StructureDefinition` canonical URLs acceptable for the item. A returned resource can support a `profiles[]` match when:

1. the resource's `meta.profile[]` includes the requested canonical, applying §5.5 comparison rules;
2. signed content, such as a SMART Health Card payload, includes equivalent profile evidence; or
3. the Wallet/Responder or receiver has trusted local evidence that the resource conforms to the requested profile.

Core SMART Health Check-in validation does not require the Wallet/Responder or Verifier to run a full FHIR profile validator for every resource. A deployment profile or receiving system may require full validation before ingestion, but that is a downstream conformance or workflow policy.

### H.3.2 `profilesFrom[]`: profile-family membership

`profilesFrom[]` is an array of canonical profile-family URLs. A profile family can identify a publication, implementation guide, profile collection, or other known family of FHIR profiles. A `profilesFrom[]` value is not a package descriptor, package id, npm package name, registry alias, object, or local topic label unless a future version or registered extension defines that value space.

To evaluate a returned resource against `profilesFrom[]`, the Wallet/Responder or Verifier generally needs knowledge outside the SMART request, such as FHIR package metadata, implementation-guide content, configured family mappings, or local policy. `meta.profile[]` is useful evidence, but the Verifier still needs to know whether the declared profile belongs to one of the requested families.

When a `profilesFrom[]` value contains a `|version` suffix, §5.5 says to strip the suffix before profile-family lookup unless the family definition explicitly defines version-sensitive membership. The original requested string should still be preserved for diagnostics and fixture comparison.

### H.3.3 Additive `profiles[]` and `profilesFrom[]`

`profiles[]` and `profilesFrom[]` are additive profile selectors. If both are present, the profile-selector portion of the item is satisfied by a resource that matches any exact profile in `profiles[]` or any profile that belongs to any family in `profilesFrom[]`, subject to `resourceTypes[]` and the rest of the item definition.

`profiles[]` does not narrow `profilesFrom[]`. For example:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
  ],
  "resourceTypes": ["Patient", "Condition"]
}
```

The exact US Core Patient profile and all profiles in the US Core family remain additive profile matches, but `resourceTypes[]` separately limits responsive resources to `Patient` or `Condition` resources.

### H.3.4 `resourceTypes[]`: resource-type filtering

`resourceTypes[]` contains official FHIR `resourceType` names. It is a resource-type constraint, not a profile selector. When `resourceTypes[]` appears with `profiles[]` or `profilesFrom[]`, a resource must satisfy the additive profile-selector portion and have a listed `resourceType`. When `resourceTypes[]` appears alone, the item requests patient-specific resources of the listed types.

A Verifier should inspect the resource's actual `resourceType` member. For a Bundle, the relevant value for contained clinical resources is normally `Bundle.entry[].resource.resourceType`; the outer Bundle's `resourceType: "Bundle"` does not by itself satisfy a request for `Patient`, `Coverage`, or `Observation`.

### H.3.5 No-selector default

When a `fhir.resources` selector omits `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, §5.4.1.5 defines the no-selector default: the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision.

For FHIR mapping purposes, this means a Verifier should not expect a specific `meta.profile` value or resource type solely from the selector. Requesters should use clear item display text for broad requests and should avoid this default unless the receiving workflow can safely handle broad patient-specific FHIR content.

## H.4 Raw FHIR JSON Artifacts (`application/fhir+json`)

A raw FHIR JSON Artifact maps directly to a FHIR Resource or Bundle carried in the Artifact `value` field. Section 6.3.2 defines the normative shape.

### H.4.1 Single Resource vs. Bundle

A raw FHIR JSON Artifact `value` is either:

1. a single FHIR Resource JSON object with a string `resourceType`; or
2. a FHIR Bundle with `resourceType: "Bundle"` and resources in `Bundle.entry[].resource`.

A single-resource Artifact is appropriate when one resource is being returned. A Bundle is the usual FHIR packaging idiom when several resources are returned together, when supporting resources are included, or when one Artifact fulfills several request items.

Verifier selector checks should look inside Bundle entries. For example, a Bundle that fulfills a Coverage request should contain a `Bundle.entry[].resource` whose `resourceType` is `Coverage` and whose profile evidence or other trusted evidence supports the requested CARIN-style profile, if one was requested.

### H.4.2 `fhirVersion` and mixed-version handling

An `application/fhir+json` Artifact carries an outer `fhirVersion`. That value applies to the single Resource or to the Bundle and all `Bundle.entry[].resource` resources in that Artifact. Wallets/Responders do not mix resources that require different FHIR releases in one raw FHIR JSON Artifact under §§6.3.2 and 6.6.5.

When responsive content exists in multiple FHIR releases, the Wallet/Responder should use separate raw FHIR JSON Artifacts, each with its own `fhirVersion`, or report the affected item as `partial`, `unavailable`, `unsupported`, or `error` under §6.4. A Verifier that detects mixed FHIR releases in one raw FHIR JSON Bundle rejects or quarantines the Artifact under §6.6.5.

The request-level `fhirVersions[]` is a preference and capability signal for raw FHIR JSON and other response forms with an outer FHIR version declaration. It does not override version information inside SMART Health Cards.

### H.4.3 `meta.profile` evidence

Returned FHIR resources should preserve `meta.profile[]` values where known, including `|version` suffixes. In a Bundle, this evidence appears on `Bundle.entry[].resource.meta.profile`, not as an Artifact-level profile summary.

Verifiers and receivers should inspect profile evidence in the FHIR payload itself. Absence of `meta.profile` is not automatically a core protocol error because §5 allows matching based on equivalent local knowledge or trusted conformance evidence. However, a Requester, receiver, certification program, or deployment profile may require `meta.profile` evidence, full FHIR validation, or both before ingestion.

## H.5 SMART Health Card Artifacts at the FHIR layer

An `application/smart-health-card` Artifact is a SMART Health Card file-style JSON object whose `value.verifiableCredential[]` contains one or more SMART Health Card JWS strings. The Artifact wrapper has no outer `fhirVersion` under §§6.3.1 and 6.6.5.

FHIR-version semantics for this Artifact class are inside each signed SMART Health Card payload. A Verifier validates the JWS and then applies SMART Health Cards processing and local trust policy. When determining whether a SMART Health Card Artifact is responsive to a `fhir.resources` selector, the Verifier examines the signed payload's FHIR resources, their declared FHIR version, their `resourceType` values, and profile evidence such as `meta.profile` where present.

The same selector concepts apply at the FHIR layer:

- `profiles[]` maps to exact profile evidence in signed resources;
- `profilesFrom[]` maps to membership of signed-resource profiles in a requested family;
- `resourceTypes[]` filters by signed-resource `resourceType`; and
- no-selector items can be satisfied by suitable patient-specific signed FHIR content, subject to Holder decision and local policy.

The SMART Health Check-in Artifact wrapper should not include an Artifact-level profile summary to substitute for inspecting signed content.

## H.6 Questionnaire selector mapping

A `content.kind: "questionnaire"` selector asks the Wallet/Responder to collect or provide answers to a FHIR Questionnaire. For `application/fhir+json`, the expected returned FHIR resource is a `QuestionnaireResponse`.

### H.6.1 Questionnaire identity selection

The requested Questionnaire can be expressed as:

1. a canonical string, optionally with `|version`;
2. an inline `Questionnaire` resource; or
3. an object with `canonical`, `resource`, or both.

When a canonical is supplied and is the Questionnaire identity being answered, a generated `QuestionnaireResponse.questionnaire` should preserve that canonical exactly, including any `|version` suffix. When only an inline Questionnaire is supplied, the Wallet/Responder should populate `QuestionnaireResponse.questionnaire` from the inline resource's canonical identity when known, usually `Questionnaire.url` plus `|Questionnaire.version` when both are present and the version is intended as the canonical version. If no canonical identity is known, FHIR permits a QuestionnaireResponse without that element, but receivers may require it by deployment policy.

### H.6.2 Inline and canonical+inline cases

When both `canonical` and inline `resource` are supplied, the canonical is the Requester's explicit identity for response construction and receiver interpretation, while the inline resource is the body to render or use. The Wallet/Responder should not silently rewrite the requested canonical to match a conflicting inline resource.

Before collecting answers, a Wallet/Responder should check for material disagreement as described in §5.4.2.4: different base canonical URLs, different explicit versions, or conflicting item structure that would change Holder answers. If material disagreement is detected, §6.4 says the item outcome is normally `unsupported` when the Questionnaire cannot safely be processed; an operational failure after a Questionnaire is otherwise understood is normally `error`.

### H.6.3 QuestionnaireResponse validation

A Verifier evaluating a questionnaire item returned as `application/fhir+json` should check that:

- the Artifact media type is accepted by the item;
- the raw FHIR Artifact includes `fhirVersion`;
- the returned resource is a `QuestionnaireResponse`, or a Bundle containing the relevant `QuestionnaireResponse` in `Bundle.entry[].resource`;
- `QuestionnaireResponse.questionnaire`, when present, preserves the requested canonical and `|version` under §5.5 when that canonical is the identity being answered;
- the response is linked to the correct request item through Artifact `fulfills[]` and item status; and
- the response status is consistent with §6.4, including valid `unsupported`, `declined`, `partial`, and `error` outcomes.

This appendix does not define universal Questionnaire rendering rules, answer validation rules, terminology validation rules, launch-context rules, or SDC-specific behavior. Deployments that require those features should define them in a deployment profile or extension.

## H.7 Relationship to US Core, CARIN, and other implementation guides

US Core and CARIN examples are important interoperability examples because they supply familiar FHIR profile canonicals and profile-family concepts for demographics, clinical summaries, and insurance-card workflows. This specification uses such examples to illustrate selector construction; it does not require a Wallet/Responder to support every profile in US Core, CARIN, or any other implementation guide.

A Requester can ask for:

```json
{
  "kind": "fhir.resources",
  "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
  "resourceTypes": ["Coverage"]
}
```

or:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Those examples mean that the Requester can process content matching those selectors if the Holder and Wallet/Responder can provide it. They do not make the examples mandatory clinical content, mandatory Wallet storage requirements, or mandatory Verifier ingestion policy.

## H.8 Verifier and Wallet use of FHIR conformance evidence

SMART Health Check-in is intentionally lighter than a full FHIR conformance-testing pipeline. Wallets/Responders and Verifiers should use FHIR conformance evidence pragmatically:

- preserve and inspect `meta.profile[]` where known;
- use `resourceType` checks for `resourceTypes[]` filtering;
- use implementation-guide or package knowledge for `profilesFrom[]` membership;
- preserve `|version` suffixes when returning profile or Questionnaire identity claims;
- verify SMART Health Card signatures and inspect signed FHIR payloads before relying on SHC FHIR evidence; and
- distinguish protocol validation from downstream clinical acceptance.

A response can be a valid SMART Health Check-in response and still be unsuitable for a Requester's local workflow because it lacks a required profile, profile version, issuer trust signal, provenance, patient-match confidence, terminology validation, or downstream business requirement. Conversely, a core protocol implementation is not non-conformant merely because it does not perform full FHIR profile validation, unless a deployment profile or certification program adds that requirement.

## H.9 Organizer notes

### Strengths

- Aligns Appendix H with accepted §§5-6 requirements without introducing new request or response fields.
- Preserves `profilesFrom[]` as an array of profile-family canonicals and keeps `profiles[]`/`profilesFrom[]` additive while treating `resourceTypes[]` as a separate resource-type constraint.
- Gives implementers and test writers concrete guidance for Bundle traversal, single-resource handling, raw FHIR `fhirVersion`, SMART Health Card FHIR-version layering, `meta.profile`, and `QuestionnaireResponse.questionnaire` preservation.
- States that US Core and CARIN are examples, not required implementation guides.

### Caveats

- The appendix intentionally avoids mandating full FHIR profile validation. Some certification programs may want stronger requirements, but those should be added deliberately as conformance-profile requirements rather than silently in Appendix H.
- Profile-family membership for `profilesFrom[]` depends on implementation-guide/package knowledge that the core request does not carry. Test fixtures will need explicit expected mappings or limited profile-family examples.
- Mixed-version detection inside arbitrary FHIR Bundles may be hard to automate because FHIR resources often do not self-declare release version. The response model still requires one outer raw-FHIR `fhirVersion` per Artifact.

### Open issues

- Whether Appendix B or the conformance checklist should add optional test assertions for `meta.profile` preservation and `QuestionnaireResponse.questionnaire` preservation.
- Whether final examples should use specific US Core and CARIN versioned canonicals, unversioned canonicals, or both.
- Whether deployment profiles should define a machine-readable registry or package source for `profilesFrom[]` family membership.

### Downstream dependencies

- Appendix B should encode raw FHIR vs SMART Health Card Artifact shape rules but leave Bundle/profile-family semantic checks to procedural validation.
- Worked examples should exercise exact profile matching, profile-family matching, resource-type filtering, no-selector behavior, raw FHIR Bundle traversal, SMART Health Card inspection, and QuestionnaireResponse construction.
- Conformance checklist rows should point to §§5-6 for normative requirements and to this appendix only for FHIR mapping guidance.
