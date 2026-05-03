# Appendix B. JSON Schema for SMART Health Check-in request and response

This appendix provides JSON Schema snippets for the transport-neutral clinical JSON objects defined in §§5-6: `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`. The schemas are intended for syntactic validation, implementation tests, and fixture review. They do not define mdoc behavior, kiosk behavior, registry behavior, FHIR profile validation, or downstream clinical acceptance.

If a schema rule in this appendix appears to conflict with §§5-6, §§5-6 control. Normative language in this appendix either restates §§5-6 or states what it means to conform to the Appendix B schema snippets.

## B.1 Dialect and validation model

The schema snippets in this appendix use **JSON Schema 2020-12** (`https://json-schema.org/draft/2020-12/schema`). A validator that claims conformance to this appendix SHALL evaluate these snippets using JSON Schema 2020-12 semantics or a later dialect that is explicitly backwards-compatible for the keywords used here.

These snippets intentionally avoid closing all extension points. They use `additionalProperties: true` or `unevaluatedProperties: true` where §§5-6 allow forward-compatible unknown members or registered extensions. A deployment profile MAY publish a stricter schema, but such a profile must not silently change the core protocol semantics.

JSON Schema validation is only one validation phase. A Verifier still applies the procedural cross-checks in §6.6 and summarized in B.4.

## B.2 `SmartHealthCheckinRequest` schema

The request schema fixes the top-level `type` and `version`, requires the top-level fields from §5.2, encodes the request-item shape from §5.3, and encodes the two core selector shapes from §5.4.

The schema does **not** set `minItems: 1` on top-level `items[]`, because §5.2.6 currently says a Requester SHOULD include at least one request item rather than making non-empty `items[]` a hard SHALL. Schema/conformance closure can publish a stricter profile if the core text is later changed.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/schemas/1/SmartHealthCheckinRequest.schema.json",
  "title": "SmartHealthCheckinRequest",
  "type": "object",
  "required": ["type", "version", "id", "items"],
  "properties": {
    "type": { "const": "smart-health-checkin-request" },
    "version": { "const": "1" },
    "id": { "type": "string", "minLength": 1 },
    "purpose": { "type": "string" },
    "fhirVersions": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 }
    },
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/requestItem" }
    }
  },
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "canonicalUrl": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://"
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
      "additionalProperties": true
    },
    "mediaType": { "type": "string", "minLength": 1 },
    "contentSelector": {
      "anyOf": [
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
          "items": { "$ref": "#/$defs/nonEmptyString" }
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
      "additionalProperties": true
    },
    "questionnaireSelector": {
      "type": "object",
      "required": ["kind", "questionnaire"],
      "properties": {
        "kind": { "const": "questionnaire" },
        "questionnaire": { "$ref": "#/$defs/questionnaireReference" }
      },
      "additionalProperties": true
    },
    "questionnaireReference": {
      "anyOf": [
        { "$ref": "#/$defs/nonEmptyString" },
        { "$ref": "#/$defs/inlineQuestionnaire" },
        { "$ref": "#/$defs/questionnaireObject" }
      ]
    },
    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
      },
      "additionalProperties": true
    },
    "questionnaireObject": {
      "type": "object",
      "anyOf": [
        { "required": ["canonical"] },
        { "required": ["resource"] }
      ],
      "properties": {
        "canonical": { "$ref": "#/$defs/nonEmptyString" },
        "resource": { "$ref": "#/$defs/inlineQuestionnaire" }
      },
      "additionalProperties": true
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
      "additionalProperties": true
    }
  }
}
```

Notes on this request schema:

- `profilesFrom[]` is a non-empty array of canonical URL strings. A string, object, package descriptor, implementation-guide object, package id, registry alias, local topic label, or URN form does not satisfy the core schema.
- `profiles[]` and `profilesFrom[]` are both allowed in the same selector. The schema deliberately does not encode a narrowing relationship between them; §5.4.1.4 defines them as additive profile selectors.
- `resourceTypes[]` is a separate array of strings. Whether a string is an official FHIR `resourceType` for the relevant FHIR release is a FHIR/procedural check, not a generic JSON Schema check.
- The questionnaire branch allows a canonical string, an inline FHIR `Questionnaire` object, or an object with `canonical`, `resource`, or both.
- The extension-selector branch permits syntactic validation of registered extension selectors without embedding a future registry in this appendix. A core-only validator can remove that branch only when it is intentionally validating a no-extension profile.
- The SMART request body SHALL NOT carry requester identity metadata under §5.2.7. This schema cannot fully detect arbitrary unknown identity-like extension fields while also preserving forward-compatible extension points. Processors must enforce the requester-identity prohibition procedurally and through extension review.

## B.3 `SmartHealthCheckinResponse` schema

The response schema fixes `type` and `version`, requires `requestId`, `artifacts[]`, and `requestStatus[]`, and distinguishes the two core Artifact media types from generic or extension Artifacts.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/schemas/1/SmartHealthCheckinResponse.schema.json",
  "title": "SmartHealthCheckinResponse",
  "type": "object",
  "required": ["type", "version", "requestId", "artifacts", "requestStatus"],
  "properties": {
    "type": { "const": "smart-health-checkin-response" },
    "version": { "const": "1" },
    "requestId": { "type": "string", "minLength": 1 },
    "artifacts": {
      "type": "array",
      "items": { "$ref": "#/$defs/artifact" }
    },
    "requestStatus": {
      "type": "array",
      "items": { "$ref": "#/$defs/itemStatus" }
    }
  },
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "mediaType": { "type": "string", "minLength": 1 },
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
              "additionalProperties": true
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
            "value": {
              "type": "object",
              "required": ["resourceType"],
              "properties": {
                "resourceType": { "$ref": "#/$defs/nonEmptyString" }
              },
              "additionalProperties": true
            }
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
              "type": "string",
              "minLength": 1,
              "not": {
                "enum": ["application/smart-health-card", "application/fhir+json"]
              }
            },
            "url": { "$ref": "#/$defs/nonEmptyString" },
            "data": { "$ref": "#/$defs/nonEmptyString" }
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
    "itemStatus": {
      "type": "object",
      "required": ["item", "status"],
      "properties": {
        "item": { "$ref": "#/$defs/nonEmptyString" },
        "status": {
          "enum": ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"]
        },
        "message": { "type": "string" }
      },
      "additionalProperties": true
    }
  }
}
```

Notes on this response schema:

- `application/smart-health-card` Artifacts use `value.verifiableCredential[]` and SHALL NOT carry an outer Artifact-level `fhirVersion`. FHIR-version semantics for this branch are inside each SMART Health Card credential payload.
- `application/fhir+json` Artifacts require `fhirVersion` and a JSON-object `value` with a string `resourceType`. The schema does not perform full FHIR validation.
- Generic or extension Artifacts are permitted when their `mediaType` is not one of the two core media types and at least one of `value`, `url`, or `data` is present. Their registered media type or extension profile defines payload shape, dereferencing, integrity, encoding, and any FHIR-version rules.
- `requestStatus[].status` is limited to the §6.4.2 version 1.0 status code set unless a future registered extension is explicitly supported by a receiving Verifier.

## B.4 Validation not fully expressible in JSON Schema

A conforming implementation MUST NOT treat successful validation against the snippets above as complete protocol validation. At minimum, the following constraints require procedural validation against the original request, FHIR content, a registry, deployment policy, or the selected transport:

| Constraint | Why the schema snippet does not fully express it |
| --- | --- |
| `SmartHealthCheckinResponse.requestId` equals `SmartHealthCheckinRequest.id` | The standalone response schema has no access to the original request value. |
| Every `artifacts[].fulfills[]` value resolves to a request item id | The response schema cannot inspect the original request's `items[].id` set. |
| `requestStatus[]` covers every request item exactly once | JSON Schema 2020-12 cannot, in a standalone response schema, compare status `item` values to the request's item-id set or enforce uniqueness by a property value across objects. |
| Duplicate request item ids, duplicate Artifact ids, and duplicate status items | JSON Schema can compare whole array entries with `uniqueItems`, but it cannot reliably enforce uniqueness of a selected object property without non-standard extensions. |
| Artifact `mediaType` is accepted by each fulfilled item | This requires joining each Artifact's `fulfills[]` values to request items and checking each item's `accept[]`, including any registered compatibility rule. |
| Bundle traversal and selector responsiveness | Raw FHIR Bundle validation requires inspecting `Bundle.entry[].resource`, resource types, profiles, and sometimes supporting resources. |
| Profile-family membership for `profilesFrom[]` | Membership generally depends on implementation-guide knowledge, package metadata, configured mappings, or local policy outside the JSON instance. |
| QuestionnaireResponse comparison | A Verifier may need to compare `QuestionnaireResponse.questionnaire` with a requested canonical, inline Questionnaire `url`/`version`, and §5.5 `|version` handling. |
| Full FHIR profile validation | Core SMART Health Check-in does not require a generic JSON Schema validator to validate FHIR profiles, terminology, invariants, or implementation-guide rules. |
| Requester identity metadata prohibition in unknown or extension fields | The core schema keeps extension points open. Detecting arbitrary self-asserted requester identity fields requires procedural policy and extension review. |

## B.5 Illustrative validation flow

The following sequence is illustrative:

1. Parse the JSON using RFC 8259 rules and reject duplicate object member names when detected.
2. Validate the SMART request against the B.2 request schema.
3. Apply §5 procedural checks that are outside the schema, including duplicate request-item id detection, registered extension-selector handling, and requester-identity metadata review.
4. Validate the SMART response against the B.3 response schema.
5. Apply §6.6 cross-validation against the original request: exact `requestId` match, `fulfills[]` reference resolution, per-item `accept[]` compatibility, exact `requestStatus[]` coverage, FHIR-version checks, and FHIR selector-responsiveness checks.
6. Apply transport, trust, security, privacy, and deployment policy checks defined elsewhere in this specification or by the deployment.

## Organizer notes

**Strengths:** This draft gives complete 2020-12 request and response schema snippets, preserves `profilesFrom[]` as a non-empty canonical URL array, keeps `profiles[]` and `profilesFrom[]` additive, models questionnaire forms, and captures media-type-specific Artifact branches without adding kiosk or mdoc rules.

**Caveats:** The snippets intentionally leave extension points open and therefore cannot fully enforce the requester-identity metadata prohibition. They also avoid making `items[]` non-empty because §5.2.6 is currently SHOULD-level.

**Open issues:** Final publication should decide whether Appendix B remains illustrative snippets or publishes stable `$id` URLs, whether a stricter no-extension schema is needed, and whether schema/conformance closure changes zero-item requests from SHOULD-not to SHALL-not.

**Downstream dependencies:** Appendix A should index only the underlying §§5-6 requirements and any final Appendix B schema-conformance requirements. §13 registry work may later supply schemas for extension selectors, extension Artifact media types, status-code extensions, and media-type compatibility rules.
