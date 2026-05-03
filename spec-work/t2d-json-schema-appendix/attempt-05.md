# Appendix B. JSON Schema for SMART Health Check-in request and response

This appendix defines JSON Schema snippets for the transport-neutral `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse` objects defined in §§5-6. The schemas are intended for implementation, documentation, fixture, and conformance-tooling use. They do not define mdoc carriage, kiosk wrapper behavior, registry behavior, FHIR package resolution, Questionnaire rendering, or full FHIR profile validation.

If a schema fragment in this appendix appears to conflict with §§5-6, §§5-6 control. Requirement keywords in this appendix either restate accepted requirements from §§5-6 or define what it means to validate against these Appendix B schemas.

## B.1 Dialect and validation model

The schemas in this appendix use **JSON Schema 2020-12** with the `https://json-schema.org/draft/2020-12/schema` dialect. Implementations that publish extracted schema files from these snippets SHOULD preserve the `$schema` value and `$defs` structure unless they intentionally produce an equivalent bundled form.

A JSON instance conforms to the Appendix B request or response schema when it validates successfully against the corresponding root schema in this appendix. Schema validation is only the first validation layer. A Verifier still applies the procedural request/response cross-validation rules in §6.6 and any presentation-transport validation required by the selected flow.

The schemas intentionally use permissive unknown-member handling (`unevaluatedProperties: true`) because §5.1.4 permits forward-compatible unknown members and §§5.4.3 and 6.3.3 permit registered extension selectors and extension Artifacts. This means JSON Schema cannot by itself fully enforce the prohibition on requester identity metadata in §5.2.7 without closing extension points or maintaining an incomplete blacklist of identity-like property names. Requesters SHALL NOT use unknown or extension members to carry requester identity metadata; validators that need to enforce this prohibition need a policy layer in addition to the structural schemas below.

The schemas use simple string patterns for FHIR canonical URLs and media types. They do not replace FHIR canonical processing, media-type registry processing, or the `canonical|version` handling matrix in §5.5.

## B.2 Shared definitions

The following definitions are referenced by both root schemas.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "fhirCanonicalUrl": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z][A-Za-z0-9+.-]*://[^\\s|]+(?:\\|[^\\s|]+)?$"
    },
    "mediaType": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+(?:\\s*;\\s*[A-Za-z0-9!#$&^_.+-]+=[^;\\s]+)*$"
    },
    "fhirResourceObject": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "$ref": "#/$defs/nonEmptyString" }
      },
      "unevaluatedProperties": true
    },
    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
      },
      "unevaluatedProperties": true
    }
  }
}
```

The `fhirCanonicalUrl` definition permits an optional `|version` suffix because §§5.4-5.5 permit versioned FHIR canonicals in selected fields. The pattern intentionally requires a URL-like scheme with `://`; version 1.0 does not define URNs, package descriptors, or registry aliases for `profilesFrom[]`.

## B.3 `SmartHealthCheckinRequest` schema

The request schema fixes the request `type` and `version`, requires the top-level members required by §5.2, and encodes the request item and selector shapes from §§5.3-5.4. It does **not** require `items[]` to be non-empty because §5.2.6 currently makes non-empty `items[]` a SHOULD rather than a SHALL. A future schema-closure step could add `minItems: 1` if the body text is changed to make non-empty `items[]` mandatory.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealthit.org/checkin/schemas/1/SmartHealthCheckinRequest.schema.json",
  "title": "SmartHealthCheckinRequest",
  "type": "object",
  "required": ["type", "version", "id", "items"],
  "properties": {
    "type": { "const": "smart-health-checkin-request" },
    "version": { "const": "1" },
    "id": { "$ref": "#/$defs/nonEmptyString" },
    "purpose": { "type": "string" },
    "fhirVersions": {
      "type": "array",
      "items": { "$ref": "#/$defs/nonEmptyString" }
    },
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/requestItem" }
    }
  },
  "unevaluatedProperties": true,
  "$defs": {
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "fhirCanonicalUrl": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z][A-Za-z0-9+.-]*://[^\\s|]+(?:\\|[^\\s|]+)?$"
    },
    "mediaType": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+(?:\\s*;\\s*[A-Za-z0-9!#$&^_.+-]+=[^;\\s]+)*$"
    },
    "requestItem": {
      "type": "object",
      "required": ["id", "title", "content", "accept"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "title": { "$ref": "#/$defs/nonEmptyString" },
        "summary": { "type": "string" },
        "required": { "type": "boolean" },
        "content": { "$ref": "#/$defs/contentSelector" },
        "accept": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/mediaType" }
        }
      },
      "unevaluatedProperties": true
    },
    "contentSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": { "type": "string", "minLength": 1 }
      },
      "oneOf": [
        { "$ref": "#/$defs/fhirResourcesSelector" },
        { "$ref": "#/$defs/questionnaireSelector" },
        { "$ref": "#/$defs/extensionSelector" }
      ]
    },
    "fhirResourcesSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": { "const": "fhir.resources" },
        "profiles": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/fhirCanonicalUrl" }
        },
        "profilesFrom": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/fhirCanonicalUrl" }
        },
        "resourceTypes": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      },
      "unevaluatedProperties": true
    },
    "questionnaireSelector": {
      "type": "object",
      "required": ["kind", "questionnaire"],
      "properties": {
        "kind": { "const": "questionnaire" },
        "questionnaire": { "$ref": "#/$defs/questionnaireReference" }
      },
      "unevaluatedProperties": true
    },
    "questionnaireReference": {
      "anyOf": [
        { "$ref": "#/$defs/fhirCanonicalUrl" },
        { "$ref": "#/$defs/inlineQuestionnaire" },
        { "$ref": "#/$defs/questionnaireDescriptor" }
      ]
    },
    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
      },
      "unevaluatedProperties": true
    },
    "questionnaireDescriptor": {
      "type": "object",
      "anyOf": [
        { "required": ["canonical"] },
        { "required": ["resource"] }
      ],
      "properties": {
        "canonical": { "$ref": "#/$defs/fhirCanonicalUrl" },
        "resource": { "$ref": "#/$defs/inlineQuestionnaire" }
      },
      "unevaluatedProperties": true
    },
    "extensionSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": {
          "type": "string",
          "minLength": 1,
          "not": { "enum": ["fhir.resources", "questionnaire"] }
        }
      },
      "unevaluatedProperties": true
    }
  }
}
```

### B.3.1 Request schema notes

- `profilesFrom[]` is encoded only as a non-empty array of canonical URL strings. The schema does not permit the string form, object form, package-descriptor form, package id, package version, registry alias, local topic label, or URN forms rejected by §5.4.1.2.
- `profiles[]` and `profilesFrom[]` can both appear on the same `fhir.resources` selector. The schema permits both fields and does not imply that either narrows the other. Additive semantics are defined by §5.4.1.4 and must be evaluated procedurally when matching returned content.
- `resourceTypes[]` is checked only as a non-empty string array. Whether each string is an official FHIR `resourceType` name for a relevant FHIR release is outside this structural schema.
- A `fhir.resources` selector with no `profiles`, `profilesFrom`, or `resourceTypes` is schema-valid and has the no-selector meaning defined in §5.4.1.5.
- The questionnaire schema permits the canonical string, inline `Questionnaire`, and object forms from §5.4.2. It checks the inline `resourceType: "Questionnaire"` shape but does not validate the full FHIR `Questionnaire` resource or Questionnaire feature support.
- The schema requires every item `accept[]` to be a non-empty array of media type strings. It does not know which media types a Wallet supports and does not perform response Artifact compatibility checks.
- Duplicate `items[].id` values are prohibited by §5.3.1, but JSON Schema 2020-12 cannot express uniqueness by an object property without non-standard extensions. Validators need a procedural duplicate-id check.

## B.4 `SmartHealthCheckinResponse` schema

The response schema fixes response `type` and `version`, requires the top-level members required by §6.1, and encodes the common Artifact, core media-type Artifact, generic Artifact, and status shapes from §§6.2-6.4.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealthit.org/checkin/schemas/1/SmartHealthCheckinResponse.schema.json",
  "title": "SmartHealthCheckinResponse",
  "type": "object",
  "required": ["type", "version", "requestId", "artifacts", "requestStatus"],
  "properties": {
    "type": { "const": "smart-health-checkin-response" },
    "version": { "const": "1" },
    "requestId": { "$ref": "#/$defs/nonEmptyString" },
    "artifacts": {
      "type": "array",
      "items": { "$ref": "#/$defs/artifact" }
    },
    "requestStatus": {
      "type": "array",
      "items": { "$ref": "#/$defs/requestStatus" }
    }
  },
  "unevaluatedProperties": true,
  "$defs": {
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "mediaType": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+(?:\\s*;\\s*[A-Za-z0-9!#$&^_.+-]+=[^;\\s]+)*$"
    },
    "fhirResourceObject": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "$ref": "#/$defs/nonEmptyString" }
      },
      "unevaluatedProperties": true
    },
    "artifact": {
      "oneOf": [
        { "$ref": "#/$defs/smartHealthCardArtifact" },
        { "$ref": "#/$defs/rawFhirJsonArtifact" },
        { "$ref": "#/$defs/genericArtifact" }
      ]
    },
    "artifactCommon": {
      "type": "object",
      "required": ["id", "mediaType", "fulfills"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "mediaType": { "$ref": "#/$defs/mediaType" },
        "fulfills": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      },
      "unevaluatedProperties": true
    },
    "smartHealthCardArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactCommon" },
        {
          "type": "object",
          "required": ["value"],
          "properties": {
            "mediaType": { "const": "application/smart-health-card" },
            "value": {
              "type": "object",
              "required": ["verifiableCredential"],
              "properties": {
                "verifiableCredential": {
                  "type": "array",
                  "minItems": 1,
                  "items": { "$ref": "#/$defs/nonEmptyString" }
                }
              },
              "unevaluatedProperties": true
            }
          },
          "not": { "required": ["fhirVersion"] },
          "unevaluatedProperties": true
        }
      ]
    },
    "rawFhirJsonArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactCommon" },
        {
          "type": "object",
          "required": ["fhirVersion", "value"],
          "properties": {
            "mediaType": { "const": "application/fhir+json" },
            "fhirVersion": { "$ref": "#/$defs/nonEmptyString" },
            "value": { "$ref": "#/$defs/fhirResourceObject" }
          },
          "unevaluatedProperties": true
        }
      ]
    },
    "genericArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactCommon" },
        {
          "type": "object",
          "properties": {
            "mediaType": {
              "allOf": [
                { "$ref": "#/$defs/mediaType" },
                { "not": { "enum": ["application/smart-health-card", "application/fhir+json"] } }
              ]
            },
            "url": { "type": "string", "minLength": 1 },
            "data": { "type": "string", "minLength": 1 },
            "value": true,
            "fhirVersion": { "$ref": "#/$defs/nonEmptyString" }
          },
          "anyOf": [
            { "required": ["value"] },
            { "required": ["url"] },
            { "required": ["data"] }
          ],
          "unevaluatedProperties": true
        }
      ]
    },
    "requestStatus": {
      "type": "object",
      "required": ["item", "status"],
      "properties": {
        "item": { "$ref": "#/$defs/nonEmptyString" },
        "status": {
          "enum": ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"]
        },
        "message": { "type": "string" }
      },
      "unevaluatedProperties": true
    }
  }
}
```

### B.4.1 Response schema notes

- The schema enforces the core media-type branches that are structurally expressible: `application/smart-health-card` requires `value.verifiableCredential[]` and rejects an outer `fhirVersion`; `application/fhir+json` requires `fhirVersion` and a FHIR JSON object in `value`; generic or extension Artifacts require at least one of `value`, `url`, or `data`.
- The schema does not validate SMART Health Card JWS signatures, contents, issuer trust, or embedded FHIR version. Verifiers inspect signed credential payloads under SMART Health Cards and local trust policy.
- The raw FHIR branch checks that `value` is an object with a string `resourceType`. It does not validate the full FHIR resource, Bundle entries, resource profiles, terminology, or business rules.
- The generic Artifact branch intentionally excludes the two core media types so that core Artifacts cannot bypass their stricter branch requirements by using `url` or `data`.
- Duplicate `artifacts[].id` values and duplicate `requestStatus[].item` values are prohibited by §6, but JSON Schema 2020-12 cannot express uniqueness by an object property without non-standard extensions. Validators need procedural duplicate checks.

## B.5 Illustrative fragments

The following fragments are illustrative only.

Example: additive `profiles[]` and `profilesFrom[]` selector. Both profile selector fields are permitted and are additive under §5.4.1.4.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
  ],
  "resourceTypes": ["Patient", "MedicationRequest", "Condition"]
}
```

Example: questionnaire selector using both a canonical and an inline `Questionnaire` resource.

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
    "resource": {
      "resourceType": "Questionnaire",
      "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
      "version": "1.2.3",
      "status": "active",
      "item": []
    }
  }
}
```

Example: raw FHIR JSON Artifact.

```json
{
  "id": "artifact-us-core-bundle",
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

Example: SMART Health Card Artifact. The Artifact has no outer `fhirVersion`.

```json
{
  "id": "artifact-insurance-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance-card"],
  "value": {
    "verifiableCredential": [
      "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9..."
    ]
  }
}
```

Example: generic extension Artifact using a URL locator. The media type or extension profile would need to define dereferencing, authorization, integrity, retention, expiration, and privacy semantics before interoperable use.

```json
{
  "id": "artifact-extension-document",
  "mediaType": "application/example-clinical-document+json",
  "fulfills": ["document-request"],
  "url": "https://example.invalid/checkin/artifacts/artifact-extension-document"
}
```

## B.6 Constraints requiring procedural validation

JSON Schema validation is not sufficient for full protocol conformance. Implementations and conformance tools need additional procedural checks for at least the following constraints:

| Constraint | Reason it is not fully captured by these schemas |
| --- | --- |
| `SmartHealthCheckinResponse.requestId` equals the original `SmartHealthCheckinRequest.id` | Requires comparing two separate JSON instances. |
| Every Artifact `fulfills[]` value refers to an original request `items[].id` | Requires request/response cross-instance lookup. |
| `requestStatus[]` covers every request item exactly once and contains no unknown item | Requires cross-instance set comparison; duplicate-by-property uniqueness is not standard JSON Schema. |
| Duplicate request item ids, duplicate Artifact ids, and duplicate status entries | JSON Schema can compare whole array items with `uniqueItems`, but cannot portably enforce uniqueness by a named property. |
| Artifact `mediaType` appears in the `accept[]` list of each item it fulfills | Requires per-edge comparison against the original request and future media-type compatibility rules. |
| `items[]` non-empty | §5.2.6 currently makes this a SHOULD; schema closure may add `minItems: 1` only if the normative text is changed or a stricter conformance profile says so. |
| Requester identity metadata prohibition across unknown or extension members | Structural schemas cannot reliably recognize every identity-like field without closing extension points or using non-standard policy rules. |
| Official FHIR `resourceTypes[]` names | Requires FHIR-version-aware vocabulary knowledge. |
| Bundle traversal and mixed-version detection | Requires inspecting FHIR Bundle contents and may be conservative because resources may not self-label release versions. |
| Profile-family membership for `profilesFrom[]` | Requires implementation-guide, package, family-map, registry, or local policy knowledge outside the JSON instance. |
| Additive selector satisfaction by returned content | Requires evaluating returned FHIR resources or SMART Health Card payloads against request selectors. |
| `QuestionnaireResponse.questionnaire` comparison to questionnaire selectors | Requires FHIR-aware comparison, `|version` handling, and inspection of raw FHIR or signed payload contents. |
| Full FHIR resource, profile, terminology, and Questionnaire validation | Requires FHIR validators and deployment-specific requirements outside this structural schema. |
| SMART Health Card JWS validation and trust processing | Requires SMART Health Cards processing and local trust policy outside this structural schema. |

## Organizer notes

**Strengths:** This draft anchors Appendix B in JSON Schema 2020-12, provides complete request and response schema snippets, preserves `profilesFrom[]` as a non-empty array of canonical URL strings, permits additive `profiles[]` plus `profilesFrom[]`, avoids hardening `items[]` beyond the current SHOULD, and separates structural schema validation from §6.6 procedural validation.

**Caveats:** The canonical URL and media-type regexes are pragmatic structural checks, not complete FHIR or RFC media-type parsers. The schema leaves `unevaluatedProperties` open to preserve extension behavior, so requester identity metadata needs a non-schema policy check. Property-based uniqueness and request/response cross-instance checks remain procedural.

**Open issues:** Final schema publication needs a decision on whether extracted schema files will be generated from Markdown and whether a stricter conformance profile will add `items.minItems: 1`, stronger id patterns, or hard size limits. Extension selector and extension Artifact registries in §13 may need schema hooks or examples once registry mechanics are canonical.

**Downstream dependencies:** Appendix A should index only the underlying §§5-6 obligations and any Appendix B schema-conformance obligations selected for publication. Appendix H and conformance tooling should cover Bundle traversal, profile-family membership, QuestionnaireResponse comparison, SMART Health Card payload inspection, and full FHIR/profile validation where deployments require them.
