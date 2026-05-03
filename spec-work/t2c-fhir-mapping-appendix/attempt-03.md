# Appendix H. Mapping to FHIR R4 idioms

Appendix H is explanatory and supporting material for the normative SMART request and SMART response model in §§5–6. It describes how the model maps to common FHIR R4 idioms so implementers and test writers can evaluate selectors, construct FHIR-shaped Artifacts, and preserve conformance evidence consistently. It does not define a new transport binding, require a FHIR server, require full FHIR profile validation, or add request/response fields beyond §§5–6.

Unless stated as a cross-reference to §§5–6, conformance language in this appendix is guidance for implementations that choose to use this appendix as their FHIR mapping profile.

## H.1 FHIR version context

FHIR version context is carried differently for the two core FHIR-shaped Artifact media types:

- For `application/fhir+json`, §6 requires an outer Artifact `fhirVersion`. The Artifact `value` is interpreted under that FHIR release. In a Bundle Artifact, the Bundle and all `Bundle.entry[].resource` resources are interpreted under the same outer `fhirVersion`.
- For `application/smart-health-card`, §6 prohibits an outer Artifact `fhirVersion`. The signed SMART Health Card payload carries its own FHIR-version semantics. Verifiers determine FHIR version by processing the signed credential payload according to SMART Health Cards and local trust policy.

A request's `fhirVersions[]` is a preference and capability signal for raw FHIR JSON and other response forms whose definitions rely on an outer FHIR version. It does not rewrite FHIR version semantics inside a signed SMART Health Card.

## H.2 FHIR canonical URL handling

FHIR canonicals appear in this specification in `profiles[]`, `profilesFrom[]`, questionnaire selectors, `QuestionnaireResponse.questionnaire`, and returned resource `meta.profile`. A canonical may carry a version suffix using `canonical|version`. The general rule from §5.5 is: preserve the original string where it is an identity or conformance claim; strip the suffix only for operations, such as URL dereference or broad routing, where the suffix is not part of the literal network location.

| Field or operation | FHIR mapping guidance |
| --- | --- |
| `profiles[]` request selector | Treat each value as an exact `StructureDefinition` canonical selector. If the request value includes `|version`, exact version evidence should be preserved and compared at the versioned-canonical level when such evidence is available. If the request value is unversioned, compare against the base canonical. |
| `profilesFrom[]` request selector | Treat each value as a canonical URL for a profile family, such as an implementation guide, publication, or profile collection. Membership lookup is normally based on the base family canonical; strip `|version` for family lookup unless the family definition explicitly defines version-sensitive membership. |
| Questionnaire canonical selector | Preserve the requested canonical as the Questionnaire identity. If the Wallet fetches the Questionnaire by URL, strip `|version` from the network URL unless using a FHIR-aware resolver that accepts versioned canonical syntax out of band. |
| Inline Questionnaire with `url` and `version` | Treat `url` as the canonical URL and `version` as the FHIR resource's version identifier. When constructing a canonical identity from an inline resource, use `url|version` only when both values are known and the version is intended as the canonical version being answered. |
| Combined questionnaire `canonical` plus inline `resource` | The `canonical` member is the Requester's explicit Questionnaire identity. The inline resource is the body to render or process. Do not silently rewrite the requested canonical to match a conflicting inline resource. |
| `QuestionnaireResponse.questionnaire` | When a questionnaire item is answered and the Questionnaire canonical identity is known, preserve the requested Questionnaire canonical, including any `|version`, in `QuestionnaireResponse.questionnaire`. If only an inline Questionnaire without canonical identity is supplied, set this element only when a suitable canonical can be derived from the inline resource. |
| Returned `meta.profile` | Preserve returned FHIR `meta.profile` strings where known, including `|version` suffixes. Do not remove version suffixes merely because routing, display grouping, or profile-family lookup used an unversioned form. |

## H.3 Mapping `fhir.resources` selectors

A `fhir.resources` selector requests patient-specific FHIR resources. The selector fields map to FHIR evidence as follows.

### H.3.1 `profiles[]` exact profile selectors

Each `profiles[]` value identifies an exact FHIR `StructureDefinition` canonical. A resource is strong evidence for a `profiles[]` match when its `meta.profile` array contains the requested canonical, applying the version-handling rules in §5.5 and H.2.

The protocol does not require the Wallet or Verifier to run a full FHIR profile validator. A Wallet may select content based on `meta.profile`, trusted issuer statements, a known data-source contract, local conformance metadata, prior validation, or other trusted evidence that the resource conforms to the requested profile. A Verifier may apply stricter local policy before ingestion, including full FHIR validation, but that local policy is separate from core SMART response syntax validation.

### H.3.2 `profilesFrom[]` profile-family selectors

Each `profilesFrom[]` value identifies a profile family. Examples include a FHIR implementation guide canonical such as US Core or a published collection of payer or insurance-card profiles. The request is not required to enumerate every exact profile in the family.

To evaluate membership, implementations may use FHIR package metadata, ImplementationGuide resources, configured mappings, implementation-guide documentation, registry entries, or deployment policy. `profilesFrom[]` is additive with `profiles[]`: a resource can satisfy the profile-selector portion of the item by matching any exact profile in `profiles[]` or any member profile from any requested family in `profilesFrom[]`.

### H.3.3 `resourceTypes[]` filtering

`resourceTypes[]` is a separate FHIR resource-type constraint. When present with `profiles[]` or `profilesFrom[]`, the returned resource must both satisfy the additive profile-selector portion and have a FHIR `resourceType` listed in `resourceTypes[]`. When present without profile selectors, `resourceTypes[]` requests patient-specific resources whose FHIR `resourceType` is listed.

This means `profiles[]` plus `profilesFrom[]` broaden acceptable profile matches, while `resourceTypes[]` narrows by resource type. Test cases should exercise this distinction explicitly.

### H.3.4 No-selector default

If `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, §5 defines the item as a broad request for any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share, constrained by accepted media types, FHIR version compatibility, Wallet capability, local policy, and Holder decision. A response to a no-selector item can be `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, or `error` under §6; the broad selector does not require disclosure of all available Holder data.

## H.4 Raw FHIR JSON Artifacts: `application/fhir+json`

A raw FHIR JSON Artifact maps the SMART response Artifact wrapper to a FHIR JSON payload:

```json
{
  "id": "artifact-fhir-1",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["clinical-history"],
  "value": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": []
  }
}
```

The Artifact wrapper supplies response accounting (`id`, `mediaType`, `fulfills[]`) and the outer FHIR release (`fhirVersion`). The FHIR payload is in `value`.

### H.4.1 Single Resource vs Bundle

For one returned FHIR resource, `value` may be that resource directly. For multiple returned resources, a Bundle is the usual FHIR packaging form. A Bundle used only to package returned resources for check-in is commonly a `collection` Bundle, but this specification does not require a specific Bundle `type` unless another profile or local policy does.

For selector validation:

- A non-Bundle Artifact is evaluated as the single FHIR resource in `value`.
- A Bundle Artifact is evaluated by inspecting `Bundle.entry[].resource` entries.
- A Bundle entry without `resource` does not provide FHIR resource content for selector matching.
- Contained resources remain part of their containing resource and are not independent fulfillment units unless local policy or a registered extension defines otherwise.

### H.4.2 Mixed-version handling

All resources in one `application/fhir+json` Artifact are interpreted under the Artifact's outer `fhirVersion`. A Wallet should not place resources requiring different FHIR releases in one raw FHIR JSON Artifact. If responsive content spans FHIR releases, the Wallet should return separate raw FHIR JSON Artifacts with separate `fhirVersion` values, choose a response status such as `partial`, `unsupported`, `unavailable`, or `error` as appropriate under §6, or use another accepted media type whose rules handle the content.

A Verifier that detects mixed FHIR release requirements inside one raw FHIR JSON Bundle should reject or quarantine that Artifact for ingestion under §6.6. Detection may be conservative; many FHIR resources do not explicitly label their release inside the resource body.

### H.4.3 `meta.profile` evidence

FHIR `meta.profile` is the primary in-payload location for declared profile conformance. Wallets should preserve known `meta.profile` values in returned resources, including version suffixes. In a Bundle, this means preserving `Bundle.entry[].resource.meta.profile` for each resource where known.

Absence of `meta.profile` is not automatically a core protocol error. §§5–6 allow matching and fulfillment claims based on equivalent trusted evidence. However, a Verifier or downstream receiver may require `meta.profile` evidence, full profile validation, issuer provenance, or other proof before ingestion. Such stricter acceptance policy should be reported as local validation or ingestion policy, not as a different SMART request/response model.

## H.5 SMART Health Card Artifacts at the FHIR layer

An `application/smart-health-card` Artifact uses the SMART Health Card file-style JSON shape in `value`:

```json
{
  "id": "artifact-shc-1",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance-card"],
  "value": {
    "verifiableCredential": ["eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9..."]
  }
}
```

The Artifact wrapper does not declare `fhirVersion`. Each signed Verifiable Credential JWS carries the SMART Health Card payload, including the FHIR bundle and FHIR-version semantics defined by SMART Health Cards. FHIR-layer validation for request selectors therefore occurs after verifying and decoding the signed credential payload according to SMART Health Cards and local trust policy.

When a SMART Health Card Artifact claims to fulfill a `fhir.resources` item, a Verifier should inspect the signed FHIR payload's resources, resource types, and `meta.profile` values where present. The same selector concepts apply, but evidence comes from inside the signed payload rather than from an outer raw-FHIR Artifact `fhirVersion` field.

## H.6 Questionnaire selector mapping

A `questionnaire` selector requests completion of a FHIR Questionnaire. For `application/fhir+json`, the expected response payload is a FHIR `QuestionnaireResponse`, either as a single Resource Artifact or inside a Bundle Artifact.

### H.6.1 Questionnaire canonical

When the request supplies a canonical string, the Wallet may resolve it through a configured service, FHIR endpoint, cache, Holder data source, embedded package, or other local mechanism. The Wallet should preserve the requested canonical as the Questionnaire identity. If a `QuestionnaireResponse` is returned and the identity is known, `QuestionnaireResponse.questionnaire` should equal the requested canonical, including any `|version` suffix.

### H.6.2 Inline Questionnaire

When the request supplies an inline Questionnaire resource, the Wallet can render or process that resource without network retrieval, subject to Wallet feature support and safety policy. If the inline resource has `url` and `version`, those fields can provide the canonical identity for `QuestionnaireResponse.questionnaire`. If no canonical identity is known, the Wallet may omit `QuestionnaireResponse.questionnaire` rather than inventing one.

### H.6.3 Combined canonical and inline resource

When both a canonical and inline resource are supplied, the canonical is the identity the Requester is asking to be answered, and the inline resource is the body supplied for rendering or processing. If the Wallet detects a material disagreement between them, §5 says it must not silently merge or rewrite the definitions, and §6 maps pre-answer ambiguity to an `unsupported` outcome and operational failures after processing begins to `error`.

Material disagreement includes different canonical URLs after applying §5.5 comparison rules, different explicit versions, or item-structure differences that would change Holder answers. A Verifier should treat an `unsupported` status for such a disagreement as a valid item outcome rather than a transport failure, provided the rest of the SMART response validates.

### H.6.4 QuestionnaireResponse validation

For a returned `QuestionnaireResponse`, a Verifier should check at least:

- `resourceType` is `QuestionnaireResponse` for the resource claimed to answer the questionnaire item;
- `QuestionnaireResponse.questionnaire`, when present, preserves the requested canonical identity and `|version` according to §5.5;
- the Artifact `mediaType` is accepted by the fulfilled item;
- the Artifact's `fhirVersion` is present for raw FHIR JSON and acceptable under the request and local policy; and
- item status and fulfillment links are consistent with §6.

Full validation of answer types, required questions, enableWhen logic, terminology bindings, and QuestionnaireResponse profile conformance can be important for clinical ingestion, but it is not required by this core protocol unless a deployment profile, Questionnaire profile, or local policy requires it.

## H.7 US Core, CARIN, and other implementation-guide examples

US Core and CARIN-style insurance-card profiles are useful examples because they publish familiar FHIR canonicals and profile families. For example:

- `profilesFrom: ["http://hl7.org/fhir/us/core"]` can request resources from the US Core profile family.
- `profiles: ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"]` can request an exact insurance-card Coverage profile.
- `resourceTypes: ["Coverage"]` can constrain a broader profile selection to Coverage resources.

These examples do not make US Core, CARIN, or any particular implementation guide mandatory for SMART Health Check-in 1.0. Requesters choose selectors appropriate to their workflow, and Wallets respond based on Holder decision, available data, accepted media types, FHIR version compatibility, Wallet capability, and local policy.

## H.8 Practical guidance for FHIR conformance evidence

Wallets and Verifiers should use FHIR conformance evidence pragmatically:

- Preserve known FHIR evidence (`resourceType`, `meta.profile`, canonical URLs, `QuestionnaireResponse.questionnaire`, `Questionnaire.url`, `Questionnaire.version`) rather than replacing it with wrapper-level summaries.
- Prefer in-payload FHIR evidence and signed credential evidence over non-standard Artifact summary fields.
- Treat missing `meta.profile` as missing evidence, not automatically as a protocol syntax failure.
- Keep profile validation and clinical ingestion policy distinct from SMART response shape validation. A response can be structurally valid under §6 and still be rejected by a receiver's local FHIR validation or clinical policy.
- When testing selector behavior, include cases for unversioned and versioned canonicals, additive `profiles[]` plus `profilesFrom[]`, independent `resourceTypes[]` filtering, Bundle entries, single resources, SMART Health Card payload inspection, and Questionnaire canonical preservation.

## Organizer notes

### Strengths

- Aligns Appendix H with the accepted §§5–6 model and keeps the appendix explanatory rather than creating a second normative request/response layer.
- Covers canonical `|version` preservation, profile-family membership, `resourceTypes[]` filtering, no-selector behavior, raw FHIR Bundle handling, SMART Health Card FHIR-version boundaries, and QuestionnaireResponse construction in one implementer-facing place.
- Explicitly separates core SMART response validation from full FHIR profile validation and downstream ingestion policy.

### Caveats

- The text assumes Appendix H remains informative/supporting material. If the final specification wants an Appendix H conformance class, the normative keywords should be reviewed and tied to Appendix A rows deliberately.
- Bundle `type` is left as guidance rather than a fixed requirement because §§5–6 do not currently require a particular Bundle type.
- Mixed-version detection can be difficult when resource bodies lack explicit release markers; tests should focus on declared wrapper behavior and clear conflict cases.

### Open issues

- Decide whether future examples should include explicit `meta.profile` version suffixes to test version-preservation behavior.
- Decide whether a later deployment profile should require full validation for specific profiles such as US Core or CARIN; this appendix intentionally does not.
- Decide whether Appendix B or fixture work should include procedural checks for Bundle entries and `QuestionnaireResponse.questionnaire`, since JSON Schema alone cannot validate most cross-resource selector semantics.

### Downstream dependencies

- Appendix B should encode only the JSON-shape parts it can express and leave selector-to-FHIR-payload validation to procedural conformance tests.
- Worked examples should avoid implying that US Core or CARIN are required profiles, while still using them as realistic examples.
- Conformance checklist work should avoid adding Appendix H-only SHALL rows unless the organizer intentionally elevates a guidance statement into a normative requirement.
