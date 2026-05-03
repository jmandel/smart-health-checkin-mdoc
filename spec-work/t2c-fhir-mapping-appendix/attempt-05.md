# Appendix H. Mapping to FHIR R4 idioms

This appendix is explanatory and supports the normative request and response model in §§5-6. It describes how SMART Health Check-in selectors and Artifacts map to common FHIR R4 implementation patterns so implementers and test writers can evaluate responses consistently. It does not define a new FHIR query language, a new clinical ingestion workflow, a new transport binding, or additional request/response requirements beyond the cross-referenced rules in §§5-6.

SMART requests and SMART responses remain transport-neutral clinical JSON objects. FHIR evidence described here is evidence inside request selectors, raw FHIR JSON Artifacts, or signed SMART Health Card payloads; it is not mdoc, kiosk, issuer, or reader evidence.

## H.1 Canonical URL and `canonical|version` handling

FHIR canonical references often appear as either a base canonical URL or as `canonical|version`. Section 5.5 defines the required handling matrix. The operational rule for this appendix is:

- preserve the original canonical string whenever it is carried, compared as a semantic claim, logged for diagnostics, included in test fixtures, or returned in FHIR content;
- strip the `|version` suffix only for operations that are not exact semantic comparison, such as ordinary URL dereferencing, local item routing, display grouping, or profile-family lookup, unless a FHIR-aware resolver or a future profile-family definition explicitly defines version-sensitive behavior; and
- when exact version conformance is being asserted or checked, compare at the same normalization level on both sides.

The following table summarizes the main FHIR fields used by this profile.

| Field | FHIR idiom | Appendix guidance |
| --- | --- | --- |
| `content.profiles[]` | Exact `StructureDefinition` canonical, optionally `|version` | Treat as an exact profile selector. If the request is versioned, version evidence should be preserved and compared as versioned evidence. If the request is unversioned, evidence for any supported version of the same base canonical can be responsive, subject to §5.4.1.1 and local policy. |
| `content.profilesFrom[]` | Canonical profile-family URL | Treat as a family identifier, not as a list of exact profiles. Strip `|version` for family lookup unless the family definition says otherwise. Membership knowledge usually comes from IG/package metadata, configured tables, or local policy outside the SMART request. |
| `content.questionnaire` canonical | FHIR `Questionnaire` canonical, optionally `|version` | Preserve as the identity of the Questionnaire being answered. If dereferencing over HTTP, strip `|version` from the URL construction while retaining the original canonical as semantic identity. |
| `QuestionnaireResponse.questionnaire` | Canonical reference to answered `Questionnaire` | When known and when the requested canonical is the identity being answered, preserve the requested canonical including `|version`. |
| returned `Resource.meta.profile[]` | Declared profile conformance evidence | Preserve values as supplied or known, including `|version` suffixes. Do not remove suffixes merely because routing or grouping used unversioned canonical values. |

A Requester that includes `|version` in a selector is communicating that exact version information matters. A Wallet/Responder that cannot evaluate that exactness can still report the item outcome using §6.4 status rules rather than guessing. A Verifier or response consumer should avoid asymmetric comparisons such as stripping the request value but not the returned `meta.profile`, or vice versa, when exact version conformance is the question.

## H.2 Mapping `fhir.resources` selectors

A `fhir.resources` selector describes patient-specific FHIR resources. Section 5.4.1 defines the selector shape and normative matching semantics. Appendix H maps those semantics to FHIR R4 idioms.

### H.2.1 `profiles[]` exact matching

Each `profiles[]` value identifies an acceptable exact FHIR profile canonical. In FHIR JSON, the strongest portable evidence is usually a matching value in `Resource.meta.profile[]` or, for a Bundle, in `Bundle.entry[].resource.meta.profile[]`.

A resource can also be responsive when the Wallet/Responder has equivalent local knowledge or trusted conformance evidence that the resource conforms to the requested profile. For example, a Wallet may know that a locally stored resource came from a source endpoint or credential type constrained to a requested profile even if `meta.profile` is absent. This specification does not require full FHIR profile validation during Wallet-side request matching or Verifier-side response validation.

Test writers should therefore distinguish these cases:

1. positive evidence: `meta.profile[]` contains the requested canonical, applying §5.5 version rules;
2. absent evidence: no `meta.profile[]` is present, which is not automatically a core protocol error but may be unacceptable to a deployment profile or receiving system; and
3. contradictory evidence: `meta.profile[]` or other trusted evidence shows only profiles outside the requested selector, which a Verifier may reject or quarantine for the fulfilled item.

### H.2.2 `profilesFrom[]` profile-family membership

`profilesFrom[]` is an array of canonical profile-family URLs. A value can identify a FHIR publication, implementation guide, profile collection, or other published family of profiles. It is not a package descriptor object, npm package name, registry alias, local topic string, or singleton string field.

FHIR resources do not normally declare “I am from this profile family” directly. Instead, family membership is inferred by evaluating exact profile evidence against an implementation guide or configured family map. For example, if `profilesFrom[]` contains `http://hl7.org/fhir/us/core`, a returned resource whose `meta.profile[]` includes `http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient` may be treated as profile-family evidence when the Verifier's US Core family map includes that profile.

Because profile-family membership depends on external knowledge, Verifiers and Wallets should document the family maps, IG versions, package sources, or local policy they use. A missing or unknown family map should result in unsupported, partial, quarantine, or local-ingestion rejection behavior as appropriate; it should not cause implementations to reinterpret the profile-family URL as a free-text topic.

### H.2.3 Additive profile selectors and `resourceTypes[]`

When both `profiles[]` and `profilesFrom[]` are present, they are additive profile selectors. A FHIR resource satisfies the profile-selector portion when it matches any exact profile in `profiles[]` or any profile belonging to any family in `profilesFrom[]`.

`resourceTypes[]` is separate. When present with profile selectors, it filters the profile-selected set by the resource's FHIR `resourceType`. It does not become additive with profiles, and it does not narrow one profile selector by another. A resource returned for such an item should therefore pass two checks:

1. profile evidence: exact profile match or profile-family membership; and
2. type evidence: `resource.resourceType` is one of the listed official FHIR resource type names.

When `resourceTypes[]` is present without `profiles[]` or `profilesFrom[]`, it is a resource-type request. When all three fields are omitted, §5.4.1.5 defines the no-selector default: the item asks for any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by accepted media types, FHIR version compatibility, Wallet capability, local policy, and Holder decision.

### H.2.4 US Core and CARIN examples

US Core and CARIN are useful examples because they publish recognizable FHIR R4 profile canonicals and profile families. This specification does not require Requesters to use US Core, CARIN, or any particular implementation guide.

Example selector for an exact CARIN-style Coverage profile:

```json
{
  "kind": "fhir.resources",
  "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
  "resourceTypes": ["Coverage"]
}
```

Example selector for a US Core profile family:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

These examples illustrate selector mechanics only. They do not make US Core or CARIN conformance a condition of SMART Health Check-in conformance, and they do not require Wallets to possess or return every resource that an implementation guide defines.

## H.3 Raw FHIR JSON Artifact mapping

Section 6.3.2 defines the raw FHIR JSON Artifact for `mediaType: "application/fhir+json"`. Appendix H gives FHIR-layer interpretation guidance.

### H.3.1 Single Resource versus Bundle

A raw FHIR JSON Artifact's `value` is either:

1. a single FHIR Resource JSON object with a string `resourceType`; or
2. a FHIR Bundle JSON object with `resourceType: "Bundle"` and FHIR resources in `Bundle.entry[].resource`.

A single Resource is appropriate when the Artifact contains exactly one responsive resource, such as one `Patient` or one `QuestionnaireResponse`. A Bundle is appropriate when one Artifact packages multiple resources, such as a Patient plus Coverage and clinical-history resources.

For Bundle Artifacts, selector validation is applied to the resources in `Bundle.entry[].resource`, not to the Bundle alone. Bundle-level `meta.profile` may describe the Bundle profile if present, but it does not substitute for profile evidence on contained entry resources when the request asked for Patient, Coverage, Condition, MedicationRequest, or other non-Bundle resources.

### H.3.2 `fhirVersion` and mixed-version handling

An `application/fhir+json` Artifact has an outer `fhirVersion`. Section 6 requires that all resources in that Artifact be interpreted under that version. For a Bundle, this includes the Bundle itself and each `Bundle.entry[].resource`.

Implementers should not try to signal per-entry FHIR release differences inside one raw FHIR JSON Bundle. If responsive content is available only in different FHIR releases, the Wallet/Responder should return separate raw FHIR JSON Artifacts, each with its own `fhirVersion`, or use the item status mechanism for content it cannot return in an acceptable version. A Verifier that detects mixed FHIR release assumptions inside one Bundle should reject or quarantine that Artifact as described in §6.6.5.

The request-level `fhirVersions[]` field applies to raw FHIR JSON returned outside SMART Health Cards. It does not apply as an outer wrapper constraint on SMART Health Card Artifacts.

### H.3.3 `meta.profile` evidence

For raw FHIR JSON, `Resource.meta.profile[]` and `Bundle.entry[].resource.meta.profile[]` are the most direct portable conformance evidence. Wallets/Responders should preserve known `meta.profile` values, including `|version` suffixes. Verifiers and receivers should inspect the FHIR payload itself rather than relying on an Artifact-level profile summary field.

Absence of `meta.profile` is not automatically a SMART Health Check-in protocol error because §5 allows matching based on equivalent local knowledge or trusted conformance evidence. However, a receiving system may require `meta.profile` evidence for ingestion, certification, audit, or local safety policy. Such a local rejection is distinct from rejecting the SMART response shape itself.

Test suites should include both single-resource and Bundle cases, with `meta.profile` present on the resource being matched. They should also include cases where profile evidence is absent to verify that implementations can separate core protocol validation from stricter local ingestion policy.

## H.4 SMART Health Card Artifact mapping at the FHIR layer

A SMART Health Card Artifact uses `mediaType: "application/smart-health-card"` and carries `value.verifiableCredential[]`. It does not carry an outer SMART Health Check-in `fhirVersion`. Section 6 requires Verifiers to reject a SMART Health Card Artifact that includes such an outer `fhirVersion`.

FHIR content and FHIR version semantics for a SMART Health Card Artifact are inside each signed credential payload. A Verifier that consumes the Artifact validates each JWS according to SMART Health Cards and local trust policy, then evaluates the signed FHIR payload content against the original request selectors. If a signed payload contains FHIR resources with `meta.profile[]`, those values provide FHIR-layer evidence just as they do for raw FHIR JSON, but with the additional provenance and integrity properties of the signed health card.

Because a SMART Health Card can contain its own FHIR bundle or resource collection, test writers should evaluate selector satisfaction after decoding and validating the signed payload, not by inspecting the SMART Health Check-in Artifact wrapper alone. The wrapper's `fulfills[]` values claim which request items the Artifact satisfies; the signed payload supplies the clinical content evidence for that claim.

## H.5 Questionnaire selector mapping

A `questionnaire` selector requests completion of a FHIR Questionnaire. When the fulfilled Artifact uses `application/fhir+json`, the expected FHIR payload is a `QuestionnaireResponse`.

### H.5.1 Canonical Questionnaire

When a request supplies a Questionnaire canonical, the Wallet/Responder may resolve it through a configured service, FHIR endpoint, cache, Holder data source, or other local mechanism. For ordinary URL dereferencing, §5.5 says to strip any `|version` suffix before constructing the network URL while preserving the original canonical as the semantic identity.

A returned `QuestionnaireResponse.questionnaire` should preserve the requested Questionnaire canonical, including `|version`, when that canonical is the known identity being answered. This helps the Verifier connect the response to the original selector and helps downstream systems distinguish versions of the same Questionnaire.

### H.5.2 Inline Questionnaire

When a request supplies an inline FHIR `Questionnaire`, the inline resource is the body the Requester asks the Wallet/Responder to render or process. The inline resource must be a FHIR object with `resourceType: "Questionnaire"` under §5.4.2.2.

If the inline Questionnaire has `url` and `version`, a Wallet/Responder can use those fields to populate or check `QuestionnaireResponse.questionnaire`. If no canonical identity is known, the Wallet/Responder should not invent a misleading canonical merely to fill the field. The absence of `QuestionnaireResponse.questionnaire` may reduce downstream traceability, but it is a FHIR-content issue to evaluate with local policy and the requirements in §§5-6.

### H.5.3 Combined canonical and inline Questionnaire

When the request supplies both a canonical and an inline resource, the canonical is the explicit identity and the inline resource is the body to render or process. Section 5.4.2.4 defines disagreement handling: Requesters should keep `canonical`, `resource.url`, and `resource.version` consistent; Wallets/Responders must not silently merge conflicting definitions or rewrite the Requester's canonical.

If a Wallet/Responder detects a material disagreement before answers are collected or response construction begins, §6.4 guidance favors reporting `unsupported`. If an operational failure occurs while rendering, collecting, converting, or constructing a response for a Questionnaire the Wallet/Responder otherwise understood, §6.4 guidance favors `error`. A Verifier should treat an `unsupported` status for a material canonical/resource disagreement as a valid item outcome rather than a transport failure.

### H.5.4 QuestionnaireResponse validation points

Verifier and receiver checks for a questionnaire item commonly include:

- the fulfilled Artifact's `mediaType` is accepted by the item;
- for raw FHIR JSON, `fhirVersion` is present and acceptable for ingestion;
- the FHIR payload is a `QuestionnaireResponse` when `application/fhir+json` is used for a questionnaire item;
- `QuestionnaireResponse.questionnaire`, when present, matches the requested canonical according to §5.5;
- response status is consistent with whether an Artifact was returned; and
- any Questionnaire-specific constraints required by the receiving workflow are applied as local validation, not as new SMART Health Check-in core protocol requirements.

## H.6 Verifier and Wallet use of FHIR conformance evidence

SMART Health Check-in uses FHIR-native identifiers to improve interoperability, but it does not require every Wallet or Verifier to run full FHIR profile validation during the check-in exchange.

Wallets/Responders can use a mix of evidence when deciding what to offer or return:

- `meta.profile[]` declarations on resources;
- profile declarations inside signed SMART Health Card payloads;
- source-system, credential-type, or issuer constraints known to the Wallet;
- configured implementation-guide or profile-family maps;
- cached conformance-resource metadata; and
- Holder decision and Wallet policy.

Verifiers and receivers can use a similar mix of evidence when deciding whether a returned Artifact is responsive and ingestible. Core response validation in §6.6 checks binding, fulfillment references, accepted media types, status coverage, FHIR-version presence for raw FHIR JSON, and relevant FHIR payload evidence. Full FHIR profile validation, terminology validation, clinical reconciliation, deduplication, persistence, and workflow acceptance remain deployment decisions unless required by another profile or local policy.

Implementations should make this distinction visible in diagnostics: “SMART response is invalid” should be reserved for failures of the SMART Health Check-in response model or selected transport validation, while “content not accepted for ingestion” can describe stricter FHIR conformance, trust, or workflow policy failures.

## Organizer notes

### Strengths

- Preserves the dependency boundary: Appendix H explains FHIR mapping for §§5-6 without defining new request, response, mdoc, or kiosk behavior.
- Gives implementers and test writers concrete checks for `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, no-selector defaults, Bundle entries, `meta.profile`, `fhirVersion`, SMART Health Cards, and QuestionnaireResponse construction.
- Keeps US Core and CARIN as examples rather than mandatory implementation guides.
- Emphasizes that `meta.profile` is useful evidence but not a universal requirement for core protocol validity.

### Caveats

- Some guidance intentionally remains at SHOULD/explanatory level because the normative requirements already live in §§5-6 and Appendix H should not silently strengthen them.
- Profile-family membership depends on external IG/package knowledge that is not standardized by this draft. Interoperability programs may need to publish concrete family maps for certification.
- QuestionnaireResponse validation can become much deeper than this appendix describes; full Questionnaire semantics, terminology, and workflow-specific answer validation remain outside the core check-in protocol.

### Open issues

- Appendix B and conformance tooling should decide how much of this FHIR-layer guidance can be represented in schema versus procedural tests.
- Future registry work may define canonical profile-family registry entries, media-type compatibility rules, or extension selector metadata that tighten some currently local-policy decisions.
- The final specification should align references to FHIR R4, R4B, or later releases with the final versioning policy for `fhirVersions[]` and examples.

### Downstream dependencies

- Appendix A should index only the normative requirements from §§5-6 and any final normative Appendix H conformance guidance, not every explanatory sentence here.
- Worked examples in §16 should include raw FHIR single Resource, raw FHIR Bundle, SMART Health Card, US Core family, CARIN exact profile, no-selector, and QuestionnaireResponse cases that exercise the distinctions in this appendix.
- Fixture vectors should preserve canonical strings and `meta.profile` values exactly, including `|version` suffixes where present.
