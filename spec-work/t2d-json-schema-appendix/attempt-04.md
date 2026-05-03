# Appendix B. JSON Schema for SmartHealthCheckinRequest and SmartHealthCheckinResponse

This appendix provides JSON Schema snippets for the transport-neutral SMART request and SMART response objects defined in §§5-6. The schemas are intended for structural validation and test-vector alignment. They do not define mdoc carriage, kiosk wrapper behavior, FHIR package resolution, full FHIR validation, or downstream ingestion policy.

The schemas use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A validator claiming conformance to this appendix SHALL apply the 2020-12 dialect or a later dialect only when the later dialect is known to preserve the meaning of these keywords.

JSON Schema validation is necessary but not sufficient. Section B.4 lists procedural checks that must be performed against the original request, returned Artifacts, FHIR payloads, and deployment policy.

## B.1 Schema-use conventions

The schemas below deliberately validate the version 1.0 core shape without closing every extension point. Unknown members are not made schema errors solely by Appendix B, because §5 allows forward-compatible unknown-member handling and §§5-6 permit registered extension selectors and extension Artifact media types.

A Requester still SHALL NOT include self-asserted requester identity metadata in the SMART request body as defined in §5.2.7. This prohibition applies to top-level members, items, selectors, and extension members. A JSON Schema cannot reliably prevent all arbitrary identity-like unknown fields without closing extension points and thereby changing §5 behavior. Validators therefore SHALL enforce that prohibition procedurally or by profile-specific policy when needed.

The schemas use `minLength: 1` for required protocol strings whose accepted sections require non-empty values. They use simple string checks for media types, FHIR versions, FHIR resource types, and most FHIR canonicals; complete media type parsing and FHIR canonical validation are outside the core schema. `profilesFrom[]` is constrained more tightly because §5.4.1.2 requires a non-empty array of canonical URL strings.

`items[]` is required but is not given `minItems: 1` in this appendix schema. Section 5.2.6 currently says a Requester SHOULD include at least one item; it does not make a non-empty `items[]` a hard SHALL. A future schema-closure profile MAY add `minItems: 1` if the base specification is updated accordingly.

## B.2 SmartHealthCheckinRequest schema

The following snippet is an illustrative publication schema for the core request object.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealthit.org/checkin/1.0/schema/SmartHealthCheckinRequest.schema.json",
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
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "canonicalString": { "type": "string", "minLength": 1 },
    "canonicalUrlString": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://[^\\s]+$"
    },
    "mediaTypeString": { "type": "string", "minLength": 1 },
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
          "items": { "$ref": "#/$defs/mediaTypeString" }
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
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalString" }
        },
        "profilesFrom": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalUrlString" }
        },
        "resourceTypes": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      }
    },
    "questionnaireSelector": {
      "type": "object",
      "required": ["kind", "questionnaire"],
      "properties": {
        "kind": { "const": "questionnaire" },
        "questionnaire": { "$ref": "#/$defs/questionnaireReference" }
      }
    },
    "questionnaireReference": {
      "anyOf": [
        { "$ref": "#/$defs/canonicalString" },
        { "$ref": "#/$defs/inlineQuestionnaire" },
        {
          "type": "object",
          "anyOf": [
            { "required": ["canonical"] },
            { "required": ["resource"] }
          ],
          "properties": {
            "canonical": { "$ref": "#/$defs/canonicalString" },
            "resource": { "$ref": "#/$defs/inlineQuestionnaire" }
          }
        }
      ]
    },
    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
      }
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
      }
    }
  }
}
```

Notes:

- `profilesFrom` is a non-empty array of canonical URL strings. The schema does not allow the earlier string, object, package-descriptor, or registry-alias forms.
- `profiles` and `profilesFrom` are independent optional arrays. Allowing both in the same selector is intentional and represents the additive profile-selector rule in §5.4.1.4; it does not imply narrowing.
- A `fhir.resources` selector may omit all of `profiles`, `profilesFrom`, and `resourceTypes` to express the no-selector default from §5.4.1.5.
- The schema requires `content.kind` and validates the two core selector shapes. It also permits extension selector kinds so Appendix B does not prohibit future registered selector kinds.
- The `questionnaire` selector permits a canonical string, an inline Questionnaire resource object, or an object containing `canonical`, `resource`, or both. The schema can check that inline resources say `resourceType: "Questionnaire"`; it cannot determine whether a canonical and inline resource materially disagree.
- `accept[]` is a non-empty array of media type strings ordered by Requester preference. The schema does not decide whether a given media type is registered, supported, or compatible with a future extension.

## B.3 SmartHealthCheckinResponse schema

The following snippet is an illustrative publication schema for the core response object.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealthit.org/checkin/1.0/schema/SmartHealthCheckinResponse.schema.json",
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
      "items": { "$ref": "#/$defs/statusEntry" }
    }
  },
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "mediaTypeString": { "type": "string", "minLength": 1 },
    "artifact": {
      "type": "object",
      "required": ["id", "mediaType", "fulfills"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "mediaType": { "$ref": "#/$defs/mediaTypeString" },
        "fulfills": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        },
        "value": true,
        "url": { "type": "string", "minLength": 1 },
        "data": { "type": "string", "minLength": 1 },
        "fhirVersion": { "$ref": "#/$defs/nonEmptyString" }
      },
      "oneOf": [
        { "$ref": "#/$defs/smartHealthCardArtifact" },
        { "$ref": "#/$defs/rawFhirJsonArtifact" },
        { "$ref": "#/$defs/genericArtifact" }
      ]
    },
    "smartHealthCardArtifact": {
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
    },
    "rawFhirJsonArtifact": {
      "type": "object",
      "required": ["mediaType", "fhirVersion", "value"],
      "properties": {
        "mediaType": { "const": "application/fhir+json" },
        "fhirVersion": { "$ref": "#/$defs/nonEmptyString" },
        "value": {
          "type": "object",
          "required": ["resourceType"],
          "properties": {
            "resourceType": { "$ref": "#/$defs/nonEmptyString" }
          }
        }
      }
    },
    "genericArtifact": {
      "type": "object",
      "required": ["mediaType"],
      "properties": {
        "mediaType": {
          "type": "string",
          "not": { "enum": ["application/smart-health-card", "application/fhir+json"] },
          "minLength": 1
        },
        "url": { "type": "string", "minLength": 1 },
        "data": { "type": "string", "minLength": 1 }
      },
      "anyOf": [
        { "required": ["value"] },
        { "required": ["url"] },
        { "required": ["data"] }
      ]
    },
    "statusEntry": {
      "type": "object",
      "required": ["item", "status"],
      "properties": {
        "item": { "$ref": "#/$defs/nonEmptyString" },
        "status": {
          "enum": ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"]
        },
        "message": { "type": "string" }
      }
    }
  }
}
```

Notes:

- The response schema fixes `type` and `version` and requires `requestId`, `artifacts[]`, and `requestStatus[]`.
- Every Artifact has `id`, `mediaType`, and non-empty `fulfills[]` at the common level. Artifact id uniqueness is procedural unless a validator performs an additional uniqueness pass over object member values.
- `application/smart-health-card` Artifacts use `value.verifiableCredential[]` as a non-empty array of strings and SHALL NOT include an outer Artifact-level `fhirVersion`.
- `application/fhir+json` Artifacts require `fhirVersion` and `value`. The schema checks only that `value` is a FHIR-looking JSON object with a string `resourceType`; Bundle traversal, release consistency, profile evidence, and full FHIR validation are procedural.
- Generic and extension Artifacts are allowed when their media type is not a core media type and at least one of `value`, `url`, or `data` is present. The schema does not invent dereferencing, encoding, integrity, or FHIR-version semantics for these fields.
- `requestStatus[].status` is limited to the version 1.0 status codes. Future status-code extensions need a future schema or profile that explicitly supports them.

## B.4 Constraints outside JSON Schema

A conforming validator SHALL NOT treat successful Appendix B schema validation as complete SMART Health Check-in response validation. The following checks are expressible only partially, or not at all, in a standalone schema:

| Constraint | Procedural validation needed |
| --- | --- |
| `requestId` binding | Compare `SmartHealthCheckinResponse.requestId` to the original `SmartHealthCheckinRequest.id` using exact string equality. |
| `fulfills[]` references | Confirm every Artifact `fulfills[]` value equals an existing request `items[].id`. |
| `requestStatus[]` exact coverage | Confirm exactly one status entry for every request item, no missing item, no unknown item, and no duplicate `requestStatus[].item`. |
| Duplicate item and Artifact ids | Detect duplicate request `items[].id`, duplicate response `artifacts[].id`, and duplicate status items. JSON Schema uniqueness over object member values is not sufficient in the portable core schema. |
| Accepted media types | For every Artifact-to-item fulfillment edge, confirm `artifact.mediaType` appears in that item's `accept[]`, unless a registered compatibility rule supported by the Verifier applies. |
| Requester identity metadata | Enforce the §5.2.7 prohibition on identity-like request fields without relying solely on field-name enumeration in the open core schema. |
| Profile-selector semantics | Apply additive `profiles[]` and `profilesFrom[]` semantics and apply `resourceTypes[]` as a separate constraint. Do not treat exact profiles as narrowing a profile-family request. |
| `profilesFrom[]` membership | Determine whether returned resource profiles belong to requested profile families using implementation-guide, package, family-map, or local policy knowledge. Do not infer membership from string prefix alone unless that is part of such policy. |
| Bundle traversal | Inspect `Bundle.entry[].resource` for raw FHIR JSON selector matching; do not treat an outer Bundle alone as satisfying non-Bundle resource-type or profile requests. |
| FHIR release consistency | Interpret each raw FHIR Artifact under its outer `fhirVersion`; reject or quarantine detected mixed-release Bundles. SMART Health Card Artifacts obtain FHIR-version semantics from signed payloads, not from an outer wrapper field. |
| Questionnaire comparison | For questionnaire items, compare returned `QuestionnaireResponse.questionnaire` and inline/canonical request identities under §5.5 and Appendix H. Detect material canonical/resource disagreement procedurally. |
| Full FHIR profile validation | Run any required FHIR profile, terminology, Questionnaire, or ingestion validation outside the core JSON Schema. The core protocol does not require universal full FHIR validation. |

## B.5 Illustrative validation examples

The following request fragment is valid under the request schema and preserves the additive profile-selector rule:

```json
{
  "id": "clinical-history",
  "title": "US Core clinical resources",
  "content": {
    "kind": "fhir.resources",
    "profilesFrom": ["http://hl7.org/fhir/us/core"],
    "profiles": [
      "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
    ],
    "resourceTypes": ["Patient", "Condition"]
  },
  "accept": ["application/smart-health-card", "application/fhir+json"]
}
```

The following response Artifact fragment is valid as a SMART Health Card Artifact because it has `value.verifiableCredential[]` and no outer `fhirVersion`:

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

The following response Artifact fragment is valid as raw FHIR JSON because it declares `fhirVersion` and carries a FHIR JSON object in `value`:

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

These examples are illustrative. They do not define required clinical content, required implementation guides, or a complete response-validation outcome.

## Organizer notes

### Strengths

- Uses JSON Schema 2020-12 and gives concrete Markdown-embedded request and response snippets suitable for Appendix B without creating a separate checked-in schema file.
- Preserves accepted §§5-6 requirements: fixed `type`/`version`, required fields, `profilesFrom[]` non-empty canonical URL array, additive `profiles[]`/`profilesFrom[]`, questionnaire forms, non-empty `accept[]`, SHC no outer `fhirVersion`, raw FHIR requiring `fhirVersion`, generic Artifact `value`/`url`/`data`, and status enum.
- Explicitly separates structural schema validation from cross-object and FHIR validation so Appendix B does not silently introduce new requirements beyond §§5-6 and Appendix H.

### Caveats

- The schema leaves extension points open and therefore cannot fully police identity-like unknown request fields. This is intentional but requires procedural enforcement of §5.2.7.
- The schema uses a simple HTTP(S) pattern for `profilesFrom[]` canonical URL strings. If final §5 or §13 broadens canonical URL syntax, this pattern may need adjustment.
- JSON Schema cannot portably assert uniqueness of `items[].id`, `artifacts[].id`, or `requestStatus[].item` by a nested property without non-standard extensions.

### Open issues

- Whether the final publication will make `items[]` non-empty remains a schema-closure and conformance question; this draft preserves the current SHOULD.
- Final registered selector-kind, media-type compatibility, and status-code extension rules may require future schemas or profile-specific overlays.
- The final spec may want separate machine-readable schema files later; this cutpoint only supplies Markdown appendix snippets as requested.

### Downstream dependencies

- Appendix A should list procedural validation obligations from §§5-6 separately from schema-shape checks.
- Appendix D fixtures and conformance tests should include negative cases for string/object `profilesFrom`, SHC outer `fhirVersion`, missing raw FHIR `fhirVersion`, duplicate ids/status items, unresolved `fulfills[]`, and media types not accepted by fulfilled items.
- Future §13 registry work should define how extension selectors, extension Artifact media types, and status-code extensions publish compatible schema overlays.
