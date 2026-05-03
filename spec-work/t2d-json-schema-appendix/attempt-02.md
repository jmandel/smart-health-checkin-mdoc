# Appendix B. JSON Schema for SMART Health Check-in request and response

This appendix defines JSON Schema snippets for validating the transport-neutral `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse` objects defined in §§5-6. The schemas are intended for syntactic validation and for those structural constraints that JSON Schema can express without access to the original request, FHIR package knowledge, SMART Health Card payload validation, or deployment policy.

Appendix B uses JSON Schema draft 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A conforming Appendix B validator SHOULD support draft 2020-12. The schemas below are Markdown-embedded snippets; this appendix does not define a separately versioned checked-in schema artifact.

If any schema text appears to conflict with §§5-6, §§5-6 control. The schemas intentionally keep the core request extension points open where §5 allows unknown members or registered extension selectors. They therefore do not, by themselves, prove that a request or response is semantically valid for a specific check-in.

## B.1 Shared definitions

The following definitions are used by both the request and response schemas. The `canonicalUrl` pattern is deliberately conservative for version 1.0 profile-family and FHIR canonical URL use: it accepts HTTP(S) URL strings and an optional FHIR `|version` suffix where the corresponding §5 field permits one. The pattern is not a full FHIR canonical validator.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "canonicalUrl": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://[^\\s|]+(\\|[^\\s|]+)?$"
    },
    "mediaType": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[^\\s/]+/[^\\s;]+(?:\\s*;[^\\s=]+=[^\\s;]+)*$"
    },
    "fhirVersion": {
      "type": "string",
      "minLength": 1
    }
  }
}
```

## B.2 `SmartHealthCheckinRequest` schema

The request schema encodes the fixed request `type` and `version`, the required top-level fields from §5.2, item shape from §5.3, and core selector shapes from §5.4. It does not set `minItems` on top-level `items[]` because §5.2.6 currently says a Requester SHOULD include at least one request item and leaves hard closure of zero-item requests to Appendix B/conformance closure. A stricter deployment profile MAY add `"minItems": 1` if it deliberately turns that SHOULD into a profile-specific requirement.

The schema keeps `unevaluatedProperties` open for request objects, items, and selector objects. This preserves §5.1.4 forward-compatible unknown-member handling and registered extension selector space. It also means the schema cannot fully prevent arbitrary unknown fields whose names or values resemble requester identity metadata; §5.2.7 remains a procedural and policy validation rule.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/smart-health-checkin-request.schema.json",
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
      "items": { "$ref": "#/$defs/fhirVersion" }
    },
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/requestItem" }
    }
  },
  "unevaluatedProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "canonicalUrl": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://[^\\s|]+(\\|[^\\s|]+)?$"
    },
    "mediaType": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[^\\s/]+/[^\\s;]+(?:\\s*;[^\\s=]+=[^\\s;]+)*$"
    },
    "fhirVersion": { "type": "string", "minLength": 1 },
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
          "items": { "$ref": "#/$defs/canonicalUrl" }
        },
        "profilesFrom": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalUrl" }
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
      "oneOf": [
        { "$ref": "#/$defs/canonicalUrl" },
        { "$ref": "#/$defs/inlineQuestionnaire" },
        {
          "type": "object",
          "anyOf": [
            { "required": ["canonical"] },
            { "required": ["resource"] }
          ],
          "properties": {
            "canonical": { "$ref": "#/$defs/canonicalUrl" },
            "resource": { "$ref": "#/$defs/inlineQuestionnaire" }
          },
          "unevaluatedProperties": true
        }
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
    "extensionSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": {
          "type": "string",
          "not": { "enum": ["fhir.resources", "questionnaire"] },
          "minLength": 1
        }
      },
      "unevaluatedProperties": true
    }
  }
}
```

### B.2.1 Request schema notes

- `profilesFrom[]` is a non-empty array of canonical URL strings. The schema does not permit the legacy or non-conforming singleton string, object, package descriptor, package id, registry alias, or local topic vocabulary shapes.
- `profiles[]` and `profilesFrom[]` are independently allowed in the same `fhir.resources` selector. Their presence in the same object is additive under §5.4.1.4; the schema does not and must not express them as mutually exclusive or as narrowing one another.
- `profiles[]` and `resourceTypes[]`, when present, are arrays. This schema sets `minItems: 1` for these arrays to match the §5 text that treats present selectors as lists of one or more values.
- Omitting `profiles`, `profilesFrom`, and `resourceTypes` from a `fhir.resources` selector remains valid and carries the no-selector semantics defined in §5.4.1.5.
- `questionnaire` accepts a canonical string, an inline FHIR `Questionnaire` object, or an object containing `canonical`, `resource`, or both.
- The extension-selector branch allows non-core `content.kind` values so the base schema does not reject registered extension selectors. A deployment profile or extension schema can replace this permissive branch with the registered extension's exact shape.

## B.3 `SmartHealthCheckinResponse` schema

The response schema encodes the fixed response `type` and `version`, the required top-level fields from §6.1, common Artifact shape from §6.2, media-type-specific branches from §6.3, generic/extension Artifact body-field rules, and status codes from §6.4.

The Artifact schema uses `oneOf` branches keyed by `mediaType`:

- `application/smart-health-card` requires `value.verifiableCredential[]` and rejects outer Artifact-level `fhirVersion`.
- `application/fhir+json` requires `fhirVersion` and `value`; `value` must be a JSON object with a string `resourceType`.
- generic or extension Artifacts require a non-core `mediaType` and at least one of `value`, `url`, or `data`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/smart-health-checkin-response.schema.json",
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
      "items": { "$ref": "#/$defs/itemStatus" }
    }
  },
  "unevaluatedProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "mediaType": {
      "type": "string",
      "minLength": 1,
      "pattern": "^[^\\s/]+/[^\\s;]+(?:\\s*;[^\\s=]+=[^\\s;]+)*$"
    },
    "fhirVersion": { "type": "string", "minLength": 1 },
    "artifactBase": {
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
      }
    },
    "artifact": {
      "oneOf": [
        { "$ref": "#/$defs/smartHealthCardArtifact" },
        { "$ref": "#/$defs/rawFhirJsonArtifact" },
        { "$ref": "#/$defs/genericArtifact" }
      ]
    },
    "smartHealthCardArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
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
            },
            "fhirVersion": false
          },
          "unevaluatedProperties": true
        }
      ]
    },
    "rawFhirJsonArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "required": ["fhirVersion", "value"],
          "properties": {
            "mediaType": { "const": "application/fhir+json" },
            "fhirVersion": { "$ref": "#/$defs/fhirVersion" },
            "value": {
              "type": "object",
              "required": ["resourceType"],
              "properties": {
                "resourceType": { "$ref": "#/$defs/nonEmptyString" }
              },
              "unevaluatedProperties": true
            }
          },
          "unevaluatedProperties": true
        }
      ]
    },
    "genericArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "anyOf": [
            { "required": ["value"] },
            { "required": ["url"] },
            { "required": ["data"] }
          ],
          "properties": {
            "mediaType": {
              "allOf": [
                { "$ref": "#/$defs/mediaType" },
                {
                  "not": {
                    "enum": ["application/smart-health-card", "application/fhir+json"]
                  }
                }
              ]
            },
            "url": { "type": "string", "minLength": 1 },
            "data": { "type": "string", "minLength": 1 }
          },
          "unevaluatedProperties": true
        }
      ]
    },
    "itemStatus": {
      "type": "object",
      "required": ["item", "status"],
      "properties": {
        "item": { "$ref": "#/$defs/nonEmptyString" },
        "status": {
          "enum": [
            "fulfilled",
            "partial",
            "unavailable",
            "declined",
            "unsupported",
            "error"
          ]
        },
        "message": { "type": "string" }
      },
      "unevaluatedProperties": true
    }
  }
}
```

### B.3.1 Response schema notes

- `artifacts[]` MAY be empty. Per-item outcomes are still reported in `requestStatus[]`.
- `requestStatus[]` is required even when all items are fulfilled.
- The schema rejects an outer `fhirVersion` on SMART Health Card Artifacts and requires `fhirVersion` on raw FHIR JSON Artifacts.
- The raw FHIR branch checks only the wrapper requirement that `value` is an object with a string `resourceType`; it does not validate the full FHIR resource or Bundle content.
- Generic and extension Artifacts are allowed when they use a non-core `mediaType` and include at least one of `value`, `url`, or `data`. The schema does not assign dereferencing, integrity, encoding, FHIR-version, or privacy semantics to `url` or `data`.

## B.4 Constraints that require procedural validation

A validator cannot rely on Appendix B schema validation alone. The following checks are required by §§5-6 or Appendix H guidance but are not fully expressible in this standalone JSON Schema:

| Constraint | Why schema alone is insufficient | Source rule |
| --- | --- | --- |
| `SmartHealthCheckinResponse.requestId` equals the original `SmartHealthCheckinRequest.id` | Requires comparing two separate JSON documents. | §6.1.3, §6.6.1 |
| Every `artifacts[].fulfills[]` value resolves to an original request `items[].id` | Requires the original request's item-id set. | §6.2.3, §6.6.2 |
| Every Artifact `mediaType` is accepted by each fulfilled request item | Requires looking up each fulfilled item's `accept[]` and any registered compatibility rules. | §5.6, §6.2.2, §6.6.3 |
| `requestStatus[]` covers every original request item exactly once and contains no unknown item | Requires the original request's item-id set. JSON Schema can check status entry shape but not coverage against another document. | §6.4.1, §6.6.4 |
| Duplicate request item ids, duplicate Artifact ids, and duplicate status entries by item | Draft 2020-12 `uniqueItems` compares whole array values, not a selected object member such as `id` or `item`. | §5.3.1, §6.2.1, §6.4.1 |
| Duplicate JSON object member names | Most JSON Schema validators receive an already-parsed data model after duplicate-member behavior has occurred. | §5.1.2 |
| Prohibited requester identity metadata in unknown fields | The base schema keeps extension points open; detecting identity-like unknown fields requires policy, allow-lists, or a closed deployment profile. | §5.2.7 |
| `profiles[]`/`profilesFrom[]` additivity and profile-family membership | JSON Schema can allow both arrays but cannot determine whether returned FHIR resources match exact profiles or profile families. | §5.4.1.4, Appendix H.3 |
| Bundle traversal and raw FHIR selector responsiveness | Requires inspecting `Bundle.entry[].resource`, `resourceType`, `meta.profile`, and request selectors. | §6.6.6, Appendix H.4 |
| Mixed FHIR release detection within a raw FHIR Bundle | Requires FHIR-aware inspection and can be conservative because resources may not self-label releases. | §6.3.2, §6.6.5, Appendix H.4.2 |
| SMART Health Card payload validation | Requires JWS verification and SMART Health Cards processing outside the wrapper schema. | §6.3.1, Appendix H.5 |
| Questionnaire canonical/resource consistency and `QuestionnaireResponse.questionnaire` comparison | Requires FHIR-aware comparison and the original questionnaire selector. | §5.4.2.4, §6.6.6, Appendix H.6 |
| Full FHIR profile validation | Requires FHIR validators, implementation-guide/package knowledge, terminology services, and deployment policy. Core protocol validation does not require it. | Appendix H.3.1, Appendix H.8 |

## B.5 Illustrative validation flow

The following pseudocode is illustrative. It shows where Appendix B schema validation fits relative to procedural validation; it is not a new transport binding or implementation API.

```text
validate request JSON syntax and duplicate-member policy
validate request against SmartHealthCheckinRequest schema
apply §5 procedural checks, including duplicate item ids and requester-identity prohibition

validate response JSON syntax and duplicate-member policy
validate response against SmartHealthCheckinResponse schema
compare response.requestId to request.id
build the request item-id and accept[] maps
check artifact id uniqueness
for each artifact.fulfills[] value, require an existing request item
for each artifact fulfillment edge, require artifact.mediaType in that item's accept[]
require requestStatus[] to cover every request item exactly once
apply FHIR, SMART Health Card, QuestionnaireResponse, and deployment-policy checks as needed
```

## Organizer notes

### Strengths

- Uses draft 2020-12 and gives embedded Markdown schema snippets rather than introducing a separate schema file.
- Preserves accepted §§5-6 shapes: fixed `type`/`version`, required fields, non-empty `accept[]`, non-empty `profilesFrom[]`, additive `profiles[]` plus `profilesFrom[]`, questionnaire canonical/inline/object forms, SHC no outer `fhirVersion`, raw FHIR required `fhirVersion`, and generic Artifact `value`/`url`/`data` support.
- Explicitly separates schema-expressible validation from procedural request/response cross-validation and FHIR/SMART Health Card validation.

### Caveats

- The canonical URL and media type regexes are intentionally lightweight. A future publication pass may prefer `format` annotations, stricter ABNF-derived patterns, or no regex beyond `minLength`.
- The schema leaves unknown request fields open to preserve extension handling, so the requester-identity prohibition remains a procedural/policy check.
- Standard JSON Schema cannot enforce uniqueness by `items[].id`, `artifacts[].id`, or `requestStatus[].item`; validators need procedural checks.
- This draft does not set `items.minItems: 1` because accepted §5.2.6 only says SHOULD. If the final conformance program chooses to prohibit zero-item requests, this schema should be revised deliberately and cross-referenced to that normative change.

### Open issues

- Decide whether final Appendix B should include a single combined schema document with `$defs` for both request and response, or keep two schema snippets as shown here.
- Decide whether extension selectors and extension Artifacts should remain permissive in the base schema or be split into a core-closed schema plus an extension-enabled schema.
- Decide how much regex strictness to apply to FHIR canonical URLs, FHIR release strings, official FHIR resource type names, and media type parameters without creating accidental incompatibilities.
- Decide whether final publication will include executable JSON Schema test vectors for accepted and rejected examples.

### Downstream dependencies

- Appendix A should index Appendix B conformance only where it restates §§5-6 or clearly defines schema-validation behavior.
- §13 registry work should define how registered extension selector schemas, extension media-type schemas, media-type compatibility rules, and status-code extensions compose with this base schema.
- Fixture and conformance tooling should implement the procedural checks in B.4 and should not report schema success as full protocol validation.
