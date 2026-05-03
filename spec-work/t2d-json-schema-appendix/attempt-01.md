# Appendix B. JSON Schema for `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`

This appendix gives JSON Schema fragments for the SMART Health Check-in clinical request and response objects defined in §§5-6. The schemas are intended for shape validation and conformance-test scaffolding. They do not define a separate wire format, mdoc behavior, kiosk behavior, FHIR validation rule, registry mechanism, or downstream ingestion policy.

The schemas use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). JSON Schema implementations used for conformance testing SHALL evaluate these schemas using that dialect, including `$defs`, `oneOf`, `anyOf`, `const`, `enum`, and `not`.

If a schema fragment appears to conflict with §§5-6, §§5-6 control. The schemas intentionally do not close every object with `additionalProperties: false`, because §§5-6 allow registered extension selectors and extension Artifact media types, while §5.2.7 separately prohibits requester identity metadata in the clinical request body.

## B.1 Common definitions

The following definitions are shared by the request and response schemas. They are deliberately syntax-oriented. For example, `canonicalUrl` checks the URL-string shape needed by this specification; it does not prove that a FHIR conformance resource exists at the URL.

```json
{
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "mediaType": { "type": "string", "minLength": 1 },
    "fhirVersion": { "type": "string", "minLength": 1 },
    "canonical": { "type": "string", "minLength": 1 },
    "canonicalUrl": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://"
    },
    "idString": { "type": "string", "minLength": 1 }
  }
}
```

`idString` intentionally does not impose the suggested item-id character set from §5.3.1. Section 5 currently says newly defined item ids SHOULD use an ASCII-safe subset, while Wallets/Responders may accept other non-empty strings when they can preserve them exactly.

## B.2 `SmartHealthCheckinRequest` schema

The request schema fixes `type` and `version`, requires `id` and `items`, permits `purpose` and `fhirVersions`, and validates each request item. It does not set `minItems: 1` on `items[]`, because §5.2.6 currently makes non-empty `items[]` a SHOULD and leaves hard closure to Appendix B/conformance work.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealthit.org/checkin/schemas/SmartHealthCheckinRequest-1.schema.json",
  "title": "SmartHealthCheckinRequest",
  "type": "object",
  "required": ["type", "version", "id", "items"],
  "properties": {
    "type": { "const": "smart-health-checkin-request" },
    "version": { "const": "1" },
    "id": { "$ref": "#/$defs/idString" },
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
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "idString": { "type": "string", "minLength": 1 },
    "mediaType": { "type": "string", "minLength": 1 },
    "fhirVersion": { "type": "string", "minLength": 1 },
    "canonical": { "type": "string", "minLength": 1 },
    "canonicalUrl": { "type": "string", "minLength": 1, "pattern": "^https?://" },

    "requestItem": {
      "type": "object",
      "required": ["id", "title", "content", "accept"],
      "properties": {
        "id": { "$ref": "#/$defs/idString" },
        "title": { "$ref": "#/$defs/nonEmptyString" },
        "summary": { "type": "string" },
        "required": { "type": "boolean" },
        "content": { "$ref": "#/$defs/contentSelector" },
        "accept": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/mediaType" }
        }
      }
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
          "items": { "$ref": "#/$defs/canonical" }
        },
        "profilesFrom": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalUrl" }
        },
        "resourceTypes": {
          "type": "array",
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      }
    },

    "questionnaireSelector": {
      "type": "object",
      "required": ["kind", "questionnaire"],
      "properties": {
        "kind": { "const": "questionnaire" },
        "questionnaire": { "$ref": "#/$defs/questionnaireRef" }
      }
    },

    "questionnaireRef": {
      "oneOf": [
        { "$ref": "#/$defs/canonical" },
        { "$ref": "#/$defs/inlineQuestionnaire" },
        { "$ref": "#/$defs/questionnaireObjectRef" }
      ]
    },

    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
      }
    },

    "questionnaireObjectRef": {
      "type": "object",
      "anyOf": [
        { "required": ["canonical"] },
        { "required": ["resource"] }
      ],
      "properties": {
        "canonical": { "$ref": "#/$defs/canonical" },
        "resource": { "$ref": "#/$defs/inlineQuestionnaire" }
      }
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
      }
    }
  }
}
```

### B.2.1 Request schema notes

- `profilesFrom[]` is a non-empty array of canonical URL strings. It is not a singleton string, object, package descriptor, package id, registry alias, local topic label, or URN in version 1.0.
- `profiles[]` and `profilesFrom[]` are allowed to appear together. The schema does not attempt to make one narrow the other; §5.4.1.4 defines their additive semantics.
- `profiles[]` and `resourceTypes[]` arrays are not given `minItems` here because §5 permits any combination of selectors, including no selector. A stricter publication profile could add `minItems: 1` for present arrays if §§5-6 are updated accordingly.
- `questionnaire` accepts a canonical string, an inline `Questionnaire` resource object, or an object containing `canonical`, `resource`, or both.
- The schema cannot reliably prohibit every possible unknown member that resembles requester identity metadata without closing extension points. Section 5.2.7 remains a procedural and semantic prohibition: requester, organization, logo, origin, URL, trust, kiosk, and wrapper identity metadata do not belong in the SMART request body.

## B.3 `SmartHealthCheckinResponse` schema

The response schema fixes `type` and `version`, requires `requestId`, `artifacts[]`, and `requestStatus[]`, validates common Artifact shape, branches on `mediaType` for the two core Artifact classes, and permits generic or extension Artifacts that include at least one of `value`, `url`, or `data`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealthit.org/checkin/schemas/SmartHealthCheckinResponse-1.schema.json",
  "title": "SmartHealthCheckinResponse",
  "type": "object",
  "required": ["type", "version", "requestId", "artifacts", "requestStatus"],
  "properties": {
    "type": { "const": "smart-health-checkin-response" },
    "version": { "const": "1" },
    "requestId": { "$ref": "#/$defs/idString" },
    "artifacts": {
      "type": "array",
      "items": { "$ref": "#/$defs/artifact" }
    },
    "requestStatus": {
      "type": "array",
      "items": { "$ref": "#/$defs/itemStatus" }
    }
  },
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "idString": { "type": "string", "minLength": 1 },
    "mediaType": { "type": "string", "minLength": 1 },
    "fhirVersion": { "type": "string", "minLength": 1 },

    "artifact": {
      "oneOf": [
        { "$ref": "#/$defs/smartHealthCardArtifact" },
        { "$ref": "#/$defs/fhirJsonArtifact" },
        { "$ref": "#/$defs/genericArtifact" }
      ]
    },

    "artifactBase": {
      "type": "object",
      "required": ["id", "mediaType", "fulfills"],
      "properties": {
        "id": { "$ref": "#/$defs/idString" },
        "mediaType": { "$ref": "#/$defs/mediaType" },
        "fulfills": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/idString" }
        }
      }
    },

    "smartHealthCardArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "required": ["mediaType", "value"],
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
              }
            }
          },
          "not": { "required": ["fhirVersion"] }
        }
      ]
    },

    "fhirJsonArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "required": ["mediaType", "fhirVersion", "value"],
          "properties": {
            "mediaType": { "const": "application/fhir+json" },
            "fhirVersion": { "$ref": "#/$defs/fhirVersion" },
            "value": {
              "type": "object",
              "required": ["resourceType"],
              "properties": {
                "resourceType": { "$ref": "#/$defs/nonEmptyString" }
              }
            }
          }
        }
      ]
    },

    "genericArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
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
            "url": { "type": "string", "minLength": 1 },
            "data": { "type": "string", "minLength": 1 },
            "fhirVersion": { "$ref": "#/$defs/fhirVersion" }
          },
          "anyOf": [
            { "required": ["value"] },
            { "required": ["url"] },
            { "required": ["data"] }
          ]
        }
      ]
    },

    "itemStatus": {
      "type": "object",
      "required": ["item", "status"],
      "properties": {
        "item": { "$ref": "#/$defs/idString" },
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
      }
    }
  }
}
```

### B.3.1 Response schema notes

- `application/smart-health-card` Artifacts use `value.verifiableCredential[]` and do not carry an outer Artifact-level `fhirVersion`. The FHIR release context is inside each signed SMART Health Card payload.
- `application/fhir+json` Artifacts require both `fhirVersion` and `value`. The schema checks that `value` is a JSON object with `resourceType`; it does not validate the full FHIR resource, Bundle entries, terminology, profiles, or release-specific FHIR grammar.
- Generic and extension Artifacts are valid only when their `mediaType` is not one of the two core media types and at least one of `value`, `url`, or `data` is present. If more than one appears, the extension media type or deployment profile defines their combined meaning.
- The schema allows `fhirVersion` on generic Artifacts because §6.3.3 permits extension media types to define their own FHIR-version handling. It does not imply that every generic Artifact has raw-FHIR semantics.
- The schema validates status-code spelling and optional `message` type. It does not decide whether a status is clinically or procedurally consistent with returned Artifacts.

## B.4 Illustrative valid fragments

Example: additive exact-profile and profile-family selector. The example is illustrative; US Core is not mandatory for SMART Health Check-in.

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

Example: SMART Health Card Artifact. The JWS value is truncated.

```json
{
  "id": "artifact-insurance-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance-card"],
  "value": {
    "verifiableCredential": ["eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9..."]
  }
}
```

Example: raw FHIR JSON Artifact.

```json
{
  "id": "artifact-patient-fhir",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["patient"],
  "value": {
    "resourceType": "Patient",
    "id": "example"
  }
}
```

Example: generic extension Artifact using a URL locator. This is not a registered core media type.

```json
{
  "id": "artifact-extension-document",
  "mediaType": "application/example-clinical-document+json",
  "fulfills": ["document-request"],
  "url": "https://example.invalid/checkin/artifacts/artifact-extension-document"
}
```

## B.5 Constraints requiring procedural validation

JSON Schema validation of a request or response object alone is not sufficient for full SMART Health Check-in validation. A Verifier or conformance suite applies the following checks procedurally against the original SMART request, the SMART response, applicable registries, and the returned clinical payloads:

1. `SmartHealthCheckinResponse.requestId` exactly equals the original `SmartHealthCheckinRequest.id`.
2. Every `artifacts[].fulfills[]` value resolves to one original `items[].id`.
3. `requestStatus[]` contains exactly one entry for every original request item, contains no unknown item id, and contains no duplicate `item` value.
4. For each fulfilled item, the Artifact `mediaType` appears in that item's `accept[]`, unless a registered compatibility rule supported by the Verifier defines compatible substitution semantics.
5. Duplicate item ids, duplicate Artifact ids, and duplicate status items are detected by property-aware processing. JSON Schema 2020-12 can check array item equality with `uniqueItems`, but it cannot portably enforce uniqueness by an object member such as `id` or `item` without non-standard extensions.
6. Raw FHIR Bundle traversal is performed outside this schema: Verifiers inspect `Bundle.entry[].resource`, not just the outer Bundle, when checking resource-type, profile, and QuestionnaireResponse responsiveness.
7. `profilesFrom[]` profile-family membership requires implementation-guide, package, configured family-map, registry, or local-policy knowledge outside the SMART response. It is not computed safely from string prefix alone.
8. QuestionnaireResponse validation, including comparison of `QuestionnaireResponse.questionnaire` to a requested canonical and `|version`, is procedural and follows §5.5, §6.6, and Appendix H.
9. Full FHIR profile validation, terminology validation, SMART Health Card signature validation, issuer trust evaluation, provenance evaluation, and downstream clinical acceptance are outside JSON Schema. Deployment profiles may require them, but Appendix B does not silently add them to §§5-6.
10. Requester identity metadata remains prohibited by §5.2.7 even when it appears in an unknown member that this schema cannot reject without closing extension points.

## Organizer notes

### Strengths

- Uses JSON Schema 2020-12 and keeps the schema snippets embedded in Markdown rather than creating a separate checked-in schema file.
- Preserves the accepted §§5-6 shapes: fixed request/response `type` and `version`, required request and response fields, request item fields, core selector branches, Artifact branches, status enum, and generic extension Artifact body fields.
- Encodes `profilesFrom[]` as a non-empty array of canonical URL strings and permits `profiles[]` plus `profilesFrom[]` together without narrowing semantics.
- Keeps `items[]` as an array without `minItems: 1`, matching the current §5.2.6 SHOULD rather than silently converting it to a SHALL.
- Separates schema-expressible shape checks from procedural validation needed for request/response cross-checking, Bundle traversal, profile-family membership, QuestionnaireResponse comparison, and full FHIR validation.

### Caveats

- The schemas leave object extension points open. This supports registered extensions but means JSON Schema alone cannot catch every prohibited requester-identity-like unknown field.
- The request schema does not enforce uniqueness of `items[].id`, and the response schema does not enforce uniqueness of `artifacts[].id` or `requestStatus[].item`; portable JSON Schema needs procedural checks for uniqueness by property.
- The raw FHIR branch checks only the wrapper and minimum `resourceType` shape. It intentionally does not embed FHIR JSON Schemas or constrain Bundle internals.
- The generic Artifact branch excludes the two core media types so core branch rules cannot be bypassed, but it otherwise depends on future extension media-type definitions for payload semantics.

### Open issues

- Final publication should decide whether Appendix B remains an embedded normative-equivalent schema appendix or also publishes extracted `.schema.json` artifacts.
- Final conformance closure may choose stricter id patterns, array size limits, string length limits, or `items[]` `minItems: 1`, but those would need corresponding body-text updates.
- Future registry work should define how registered extension selector schemas and extension media-type schemas are composed with these base schemas.

### Downstream dependencies

- Appendix A should index schema-related SHALL/SHOULD statements only when they restate or deliberately add conformance requirements.
- §13 registry work should provide composition rules for extension selector kinds, extension Artifact media types, media-type compatibility, and future status codes.
- Test-vector and conformance tooling should pair these schemas with procedural validators for `requestId`, `fulfills[]`, `requestStatus[]` coverage, accepted media types, duplicate ids, and FHIR-specific checks from Appendix H.
