# Appendix H: Mapping to FHIR R4 idioms

This appendix is explanatory and supports the normative clinical request and response model in §§5–6. It describes how SMART Health Check-in 1.0 selectors and Artifacts relate to common FHIR R4 idioms so implementers can build Wallet, Verifier, and test-vector behavior consistently.

Appendix H does not define a separate request or response model. If this appendix appears to conflict with §§5–6, the normative rules in §§5–6 control. In particular, the SMART request and SMART response remain transport-neutral clinical JSON objects; presentation transports, mdoc envelopes, kiosk wrappers, and downstream ingestion records do not change FHIR selector or Artifact semantics.

## H.1 FHIR canonical URLs and `canonical|version`

FHIR canonicals appear in SMART Health Check-in in several places:

- `content.profiles[]`, where each value is an exact FHIR `StructureDefinition` canonical URL, optionally with `|version`;
- `content.profilesFrom[]`, where each value is a canonical URL for a profile family, implementation guide, publication, or collection;
- `content.questionnaire`, where a Questionnaire may be identified by canonical string, inline FHIR `Questionnaire`, or an object containing `canonical`, `resource`, or both;
- returned FHIR `QuestionnaireResponse.questionnaire`; and
- returned FHIR `Resource.meta.profile` and `Bundle.entry[].resource.meta.profile`.

FHIR uses the `canonical|version` form to identify a canonical URL plus a version. The `|version` suffix is not part of the HTTP URL to dereference unless a FHIR-aware resolver explicitly supports that syntax. Section 5.5 defines the normative decision matrix. Operationally:

- preserve the original string when carrying, signing, encrypting, logging for conformance fixtures, or comparing protocol values exactly;
- strip `|version` before ordinary HTTP dereference or broad local routing, while retaining the original semantic identity;
- for exact version conformance claims, compare versioned values at the same normalization level on both sides; and
- do not remove a `|version` suffix from returned `meta.profile` or `QuestionnaireResponse.questionnaire` merely because request routing stripped it.

For `profilesFrom[]`, unversioned family canonicals are the common form. A Requester can include `|version` only when it intends a versioned profile-family identity and expects the Wallet/Responder to understand that convention. Profile-family membership lookup normally uses the base canonical unless a future profile-family definition explicitly defines version-sensitive membership.

## H.2 Mapping `fhir.resources` selectors to FHIR resources

A `fhir.resources` selector identifies acceptable patient-specific FHIR resources. It is not a FHIR search expression, FHIRPath expression, GraphQL query, SMART App Launch scope, or instruction to contact a FHIR server. A Wallet can satisfy the selector from any Holder data source available to it, subject to Holder decision, Wallet policy, media-type support, FHIR version support, and §§5–6.

### H.2.1 Exact profiles: `profiles[]`

`profiles[]` maps to FHIR `StructureDefinition` profile canonicals. A returned resource is strong evidence for an exact-profile match when its `meta.profile` array contains the requested canonical. If the request value includes `|version`, evidence is strongest when the returned `meta.profile` includes the same versioned canonical. If the request value is unversioned, a returned versioned `meta.profile` whose base canonical matches can be considered evidence for the requested base canonical, subject to local policy.

Section 5.4.1.1 also permits Wallet/Responder matching based on equivalent local knowledge or trusted conformance evidence. Therefore absence of `meta.profile` is not automatically a core protocol failure. A receiver that needs explicit FHIR conformance evidence for local ingestion can reject or quarantine content under local policy, but that downstream decision is distinct from the base SMART response shape and accounting rules.

### H.2.2 Profile families: `profilesFrom[]`

`profilesFrom[]` is an array of canonical profile-family URLs. It is not a package descriptor, package id, package version, registry alias, local topic string, object, or URN in version 1.0 unless a future extension defines such a value space.

A returned resource is evidence for profile-family membership when one of its `meta.profile` values is known to belong to any requested family. The mapping from family canonical to exact member profiles can come from implementation-guide knowledge, FHIR package metadata, configured mappings, or other deployment knowledge outside the SMART response. The SMART response does not define a wrapper-level profile-summary field for this purpose; Verifiers should inspect the FHIR payload itself.

When a family is requested, a Wallet is not required to return every resource that could possibly belong to that family. Holder decision, available data, local policy, and the item status determine whether the Wallet reports `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, or `error` under §6.4.

### H.2.3 Additive profile selectors and `resourceTypes[]`

`profiles[]` and `profilesFrom[]` are additive profile selectors. When both appear, a resource satisfies the profile-selector portion if it matches any exact profile in `profiles[]` or any profile belonging to any family in `profilesFrom[]`.

`resourceTypes[]` is different: it is a separate resource-type constraint. When `resourceTypes[]` appears with either profile selector, a responsive resource must both satisfy the additive profile-selector portion and have a FHIR `resourceType` listed in `resourceTypes[]`. When `resourceTypes[]` appears by itself, it requests patient-specific resources of those official FHIR resource types.

Examples:

- `profiles: [US Core Patient]` requests resources conforming to that exact profile.
- `profilesFrom: [US Core]` requests resources belonging to the US Core profile family, as understood by the Wallet and Verifier.
- `profilesFrom: [US Core]` plus `resourceTypes: ["Condition", "MedicationRequest"]` requests only US Core-family resources whose FHIR `resourceType` is `Condition` or `MedicationRequest`.
- `profiles: [US Core Patient]` plus `profilesFrom: [US Core]` does not narrow US Core to Patient; the exact profile and family are additive.

### H.2.4 No-selector default

When `content.kind` is `"fhir.resources"` and `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, the item uses the no-selector default from §5.4.1.5: it asks for any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share, constrained by the item's `accept[]`, request `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision.

For FHIR processing, the no-selector default is intentionally broad. Test writers should expect valid responses ranging from no Artifact with `unavailable` or `declined`, to one or more Artifacts containing a subset of available patient-specific resources with `partial`, to a Wallet-specific set the Wallet believes fully satisfies the item.

## H.3 Raw FHIR JSON Artifacts (`application/fhir+json`)

Section 6.3.2 defines raw FHIR JSON Artifacts. At the FHIR layer, the Artifact `value` is either a single FHIR Resource JSON object or a FHIR Bundle JSON object.

### H.3.1 Single Resource

A single-resource raw FHIR JSON Artifact has:

```json
{
  "id": "artifact-patient",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["patient"],
  "value": {
    "resourceType": "Patient",
    "meta": {
      "profile": [
        "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
      ]
    }
  }
}
```

The outer `fhirVersion` declares the FHIR release used to interpret the raw FHIR JSON value. For R4 content this is commonly `"4.0.1"`. The returned resource's `resourceType` and `meta.profile` provide FHIR-layer evidence for selector matching.

### H.3.2 Bundle

A Bundle raw FHIR JSON Artifact has `value.resourceType` equal to `"Bundle"`; contained resources appear in `value.entry[].resource` following FHIR JSON conventions. The Artifact-level `fhirVersion` applies to the Bundle and to all resources contained in that Bundle.

```json
{
  "id": "artifact-us-core-bundle",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["clinical-history"],
  "value": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      {
        "resource": {
          "resourceType": "Condition",
          "meta": {
            "profile": [
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"
            ]
          }
        }
      }
    ]
  }
}
```

A Wallet/Responder uses a Bundle when it packages multiple resources in a single raw FHIR JSON Artifact. A single Artifact can fulfill multiple request items if the Artifact `mediaType` is accepted by every fulfilled item and the contained resources are responsive to those items under §§5–6.

### H.3.3 Mixed FHIR versions

A raw FHIR JSON Artifact has one outer `fhirVersion`. All resources inside that Artifact are interpreted under that FHIR release. A Wallet/Responder therefore does not mix R4, R4B, R5, or other FHIR-release content inside one `application/fhir+json` Artifact. If responsive raw FHIR content exists in different FHIR releases, it is represented as separate Artifacts, each with its own `fhirVersion`, or the affected item is accounted for with the appropriate §6.4 status.

For a Bundle, a Verifier that detects resources requiring different FHIR releases inside the same Bundle should apply the §6.6 mixed-version disposition: reject or quarantine the Artifact according to validation and local policy. Test fixtures for raw FHIR Bundle handling should include the outer `fhirVersion` and should not rely on per-entry FHIR-version declarations.

### H.3.4 `meta.profile` evidence

FHIR `meta.profile` is the natural location for FHIR conformance evidence in raw FHIR JSON. Wallets/Responders should preserve known `meta.profile` values on returned resources, including version suffixes. Verifiers and response consumers should inspect:

- `value.meta.profile` for single-resource Artifacts;
- `value.entry[].resource.meta.profile` for Bundle Artifacts; and
- other FHIR content relevant to the selector, such as `resourceType` and `QuestionnaireResponse.questionnaire`.

`meta.profile` evidence is not a full FHIR validation result. This profile does not require every Wallet or Verifier to run complete FHIR StructureDefinition validation. A practical implementation can use `meta.profile`, issuer or source evidence, local knowledge, package metadata, or configured mappings to decide whether content is responsive enough for the exchange. Receivers that need stricter assurance can perform full FHIR validation as a local or deployment-profile requirement.

## H.4 SMART Health Card Artifacts at the FHIR layer

An `application/smart-health-card` Artifact carries SMART Health Card file-style JSON in `value.verifiableCredential[]`. It does not carry an outer SMART Health Check-in `fhirVersion`. The signed SMART Health Card payload carries its own FHIR version semantics, and Verifiers inspect each signed credential payload under SMART Health Cards processing and local trust policy.

At the FHIR selector layer, a SMART Health Card can fulfill an item only when `application/smart-health-card` appears in that item's `accept[]` or an accepted compatibility rule applies. The Verifier evaluates the signed payload's FHIR resources, including `resourceType` and `meta.profile` where present, against the original request selectors. As with raw FHIR JSON, no Artifact-level profile-summary field is defined for core SMART Health Card Artifacts.

SMART Health Cards and raw FHIR JSON can both be responsive to a FHIR selector, but they differ in evidence and version handling:

| Aspect | Raw FHIR JSON Artifact | SMART Health Card Artifact |
| --- | --- | --- |
| Media type | `application/fhir+json` | `application/smart-health-card` |
| FHIR version location | Outer Artifact `fhirVersion` | Inside each signed credential payload |
| Payload field | `value` is a FHIR Resource or Bundle | `value.verifiableCredential[]` contains JWS strings |
| Profile evidence | FHIR `meta.profile` in `value` resources | FHIR `meta.profile` inside signed payload resources |
| Source assurance | Patient-mediated unless payload has separate evidence | Determined by SMART Health Card signature and local trust policy |

## H.5 Questionnaire selector mapping

A `questionnaire` selector asks the Wallet/Responder to support completion of a FHIR Questionnaire and to return an appropriate response Artifact. When the accepted response media type is `application/fhir+json`, the FHIR-layer response content is normally a `QuestionnaireResponse` resource.

### H.5.1 Canonical Questionnaire

When the request supplies a Questionnaire canonical string, the canonical is the requested Questionnaire identity. If it contains `|version`, the Wallet strips that suffix for ordinary HTTP fetch while preserving the original canonical as the semantic identity. If the Wallet returns a FHIR `QuestionnaireResponse` and knows the requested canonical identity, it should set `QuestionnaireResponse.questionnaire` to that requested canonical, preserving `|version` when it was part of the identity being answered.

Example:

```json
{
  "resourceType": "QuestionnaireResponse",
  "status": "completed",
  "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
}
```

A Verifier can compare this field to the request canonical using §5.5 rules. Exact versioned requests should be checked against versioned evidence when present; unversioned requests can be compared by base canonical.

### H.5.2 Inline Questionnaire

When the request supplies an inline FHIR `Questionnaire` resource, the inline resource is the Questionnaire body the Requester asks the Wallet to render or use. If the inline Questionnaire has `url` and `version`, those fields can inform the returned `QuestionnaireResponse.questionnaire` value. If the inline Questionnaire lacks a canonical identity, a Wallet may still return a valid `QuestionnaireResponse` that omits `questionnaire`, but Verifiers that require a stable questionnaire identity may reject or quarantine it under local policy.

The request model requires inline resources to have `resourceType: "Questionnaire"`. If the inline resource is missing that type or uses a different type, the Wallet/Responder rejects the request or reports the item as unsupported under §§5–6.

### H.5.3 Combined canonical and inline resource

When the request supplies both a `canonical` and an inline `resource`, the canonical is the explicit identity and the resource is the body to render or use. A consistent pair commonly has:

- the canonical base URL equal to `resource.url`, when `resource.url` is present; and
- the canonical `|version` equal to `resource.version`, when both versions are present.

If the Wallet detects a material disagreement, §5.4.2.4 says it does not silently merge conflicting definitions or rewrite the Requester's canonical. Section 6.4 maps such cases to item status behavior: `unsupported` is appropriate when the ambiguity is detected before answers are collected or response construction begins; `error` is appropriate for operational failures after the Wallet otherwise understood the Questionnaire.

### H.5.4 QuestionnaireResponse validation

For a questionnaire item fulfilled by an `application/fhir+json` Artifact, a Verifier should inspect that the returned FHIR content is a `QuestionnaireResponse` or a Bundle containing a responsive `QuestionnaireResponse`. It should also inspect `QuestionnaireResponse.questionnaire` when present, request item status, Artifact `fulfills[]`, Artifact `mediaType`, and `fhirVersion` together. The Verifier should not infer questionnaire fulfillment solely from Artifact order, display text, status `message`, or a wrapper-level field.

A `QuestionnaireResponse` Artifact may fulfill more than one request item only when it is responsive to each item and the Artifact media type is accepted by each item. For example, a visit-intake `QuestionnaireResponse` might fulfill both an `intake` questionnaire item and a broader clinical-history item if the original selectors and local policy support that interpretation.

## H.6 US Core, CARIN, and other implementation-guide examples

US Core and CARIN-style canonicals are useful examples because they are familiar FHIR R4 implementation-guide idioms:

- `http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient` is an exact profile canonical suitable for `profiles[]`.
- `http://hl7.org/fhir/us/core` is a profile-family canonical suitable for `profilesFrom[]` when asking for US Core-family resources.
- `http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage` is an exact Coverage profile canonical suitable for insurance-card examples.

These examples do not make US Core, CARIN, or any other implementation guide required for SMART Health Check-in 1.0 conformance. A Requester can use other FHIR R4 profile canonicals and profile families. A Wallet can support the profile sets and data sources available in its deployment. A Verifier or receiver can require particular implementation guides for local ingestion, but that is a deployment or downstream workflow policy unless stated by a separate conformance profile.

## H.7 Conformance evidence without mandatory full FHIR validation

SMART Health Check-in uses FHIR-native selectors so implementations can reuse existing FHIR identifiers and conformance evidence. It does not require every Wallet, Verifier, or Requester to implement a complete FHIR validation engine.

Practical evidence can include:

- explicit `meta.profile` declarations in returned resources;
- SMART Health Card signatures and payload inspection;
- trusted issuer, source, or provenance evidence carried by the Artifact payload;
- local Wallet knowledge that a stored resource conforms to a requested profile;
- FHIR implementation-guide or package metadata that maps profile families to member profiles;
- local receiver policy or configured mappings; and
- optional full FHIR validation when a deployment requires it.

A Verifier should separate base protocol validation from downstream clinical acceptance. Base protocol validation checks request/response binding, Artifact shape, media-type acceptance, item fulfillment references, status coverage, FHIR-version wrapper rules, and obvious FHIR-layer responsiveness. Downstream clinical acceptance can be stricter: a receiver may validate profiles, reject stale resources, require source trust, require a particular implementation guide version, or quarantine content that lacks sufficient conformance evidence.

## Organizer notes

### Strengths

- Preserves Appendix H as supporting material for §§5–6 rather than creating an alternate model.
- Covers canonical URL and `|version` handling across profiles, profile families, Questionnaire selectors, `QuestionnaireResponse.questionnaire`, and returned `meta.profile`.
- Explicitly separates additive profile selectors from the independent `resourceTypes[]` constraint.
- Gives implementer/test-writer guidance for raw FHIR single resources, Bundles, mixed-version handling, SMART Health Card FHIR-version handling, and QuestionnaireResponse construction.
- Explains how US Core and CARIN examples can be used without making either implementation guide mandatory.

### Caveats

- This appendix assumes the §5.5 canonical-version matrix and §6.6 FHIR validation text remain stable.
- Full FHIR profile validation is intentionally not required; deployments that need stronger conformance evidence will need local policy or future conformance profiles.
- Profile-family membership for `profilesFrom[]` depends on implementation-guide/package knowledge outside the SMART response, so test fixtures should state the family mapping they are exercising.

### Open issues

- Appendix B and conformance tooling still need to decide which FHIR-layer checks are schema-checkable versus procedural.
- Future registry work may define media-type compatibility rules or extension selectors that add FHIR-version or profile-evidence behavior outside the two core media types.
- Final examples should decide whether to include versioned `meta.profile` and versioned `QuestionnaireResponse.questionnaire` cases to exercise `|version` preservation.

### Downstream dependencies

- Appendix B should encode the raw FHIR versus SMART Health Card Artifact wrapper differences where JSON Schema can express them.
- §13 registry work should preserve that extension media types define their own FHIR-version and evidence rules if they carry FHIR content.
- Worked examples in §16 should align with this appendix's examples for US Core, CARIN Coverage, no-selector defaults, Bundles, and QuestionnaireResponse.
