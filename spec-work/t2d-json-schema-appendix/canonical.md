# Appendix B. JSON Schema for `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`

This appendix provides JSON Schema snippets for the transport-neutral SMART request and SMART response objects defined in §§5-6. The snippets are intended for structural validation, fixture review, and conformance-test scaffolding. They do not define mdoc carriage, registry behavior, full FHIR validation, SMART Health Card validation, or downstream clinical ingestion policy.

If a schema rule in this appendix appears to conflict with §§5-6, §§5-6 control. Normative language in this appendix either restates §§5-6 or is scoped to conformance with these Appendix B schema snippets.

## B.1 Dialect and validation model

The schema snippets use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A validator that claims conformance to Appendix B SHALL evaluate these snippets using JSON Schema 2020-12 semantics, or a later dialect only when that dialect is known to preserve the semantics of the keywords used here.

The snippets intentionally keep core extension points open. Unknown members are not made schema errors solely by Appendix B, because §§5-6 allow forward-compatible unknown members and registered extension selectors. Registered extension Artifact media types are represented by additional or profiled schemas rather than by a generic core catch-all. Deployment profiles MAY publish stricter schemas, but those schemas must identify their additional constraints rather than silently changing the core protocol.

JSON Schema validation is not complete SMART Health Check-in validation. A Verifier still applies the request/response, FHIR, SMART Health Card, transport, trust, and deployment-policy checks required elsewhere in the specification. Section B.4 summarizes important checks that are not fully expressible in these standalone schemas.

The request schema requires `items[]` but does not set `minItems: 1`, because §5.2.6 currently says a Requester SHOULD include at least one request item and leaves any hard prohibition on zero-item requests to later schema/conformance closure.

## B.2 `SmartHealthCheckinRequest` schema

The request schema fixes the top-level `type` and `version`, requires the top-level fields from §5.2, validates the item shape from §5.3, and validates the two core selector shapes from §5.4 while leaving room for registered extension selector kinds.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/SmartHealthCheckinRequest.schema.json",
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
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "canonicalString": {
      "type": "string",
      "minLength": 1,
      "description": "FHIR canonical reference string; a |version suffix, when present, is parsed as structured canonical-reference version metadata rather than as part of a direct HTTP URL."
    },
    "canonicalUrlString": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://\\S+$"
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
      },
      "additionalProperties": true
    },
    "contentSelector": {
      "oneOf": [
        { "$ref": "#/$defs/selectionFhirSelector" },
        { "$ref": "#/$defs/formFhirSelector" },
        { "$ref": "#/$defs/extensionSelector" }
      ]
    },
    "selectionFhirSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": { "const": "selection.fhir" },
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
      },
      "not": {
        "anyOf": [
          { "required": ["questionnaireCanonical"] },
          { "required": ["questionnaire"] }
        ]
      },
      "additionalProperties": true
    },
    "formFhirSelector": {
      "type": "object",
      "required": ["kind"],
      "anyOf": [
        { "required": ["questionnaireCanonical"] },
        { "required": ["questionnaire"] }
      ],
      "not": {
        "anyOf": [
          { "required": ["profiles"] },
          { "required": ["profilesFrom"] },
          { "required": ["resourceTypes"] }
        ]
      },
      "properties": {
        "kind": { "const": "form.fhir" },
        "questionnaireCanonical": { "$ref": "#/$defs/canonicalString" },
        "questionnaire": { "$ref": "#/$defs/inlineQuestionnaire" }
      },
      "additionalProperties": true
    },
    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
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
          "not": { "enum": ["selection.fhir", "form.fhir"] }
        }
      },
      "additionalProperties": true
    }
  }
}
```

Notes on this request schema:

- `profilesFrom[]` is a non-empty array of canonical URL strings. It is not a singleton string, object, package descriptor, implementation-guide object, package id, package version, registry alias, local topic label, or URN form in version 1.0.
- `profiles[]` and `profilesFrom[]` are independently allowed in the same `selection.fhir` selector. Their combined presence is additive under §5.4.1.4; the schema does not make either array narrow the other.
- `profiles[]` and `resourceTypes[]`, when present, are arrays with at least one string. Whether a `resourceTypes[]` value is an official FHIR `resourceType` for a particular FHIR release is a FHIR-aware procedural check.
- A `selection.fhir` selector may omit all of `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to express the no-selector default from §5.4.1.5.
- A `form.fhir` selector is a single object shape with one or both of the sibling members `questionnaireCanonical` and `questionnaire`. It does not allow `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; use a separate `selection.fhir` request item when existing FHIR resource selection is also needed.
- Canonical strings MAY include a `|version` suffix. Consumers parse the suffix as structured FHIR canonical-reference version metadata and do not treat it as part of a direct HTTP URL.
- The extension-selector branch permits syntactic validation of registered extension selector kinds without embedding a future registry in Appendix B. A core-only deployment profile can replace this branch when it intentionally rejects all extension selectors.
- The SMART request body SHALL NOT carry requester identity metadata under §5.2.7. This schema cannot reliably reject arbitrary identity-like unknown or extension members while keeping extension points open, so processors must enforce that prohibition procedurally and through extension review.

## B.3 `SmartHealthCheckinResponse` schema

The response schema fixes `type` and `version`, requires `requestId`, `artifacts[]`, and `requestStatus[]`, validates the common Artifact shape, branches on `mediaType` for the two core Artifact classes, and validates the version 1.0 status-code set. Registered extensions can publish additional profiled schemas for additional Artifact media types; the core schema does not include a generic unknown-media-type catch-all.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/SmartHealthCheckinResponse.schema.json",
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
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "mediaTypeString": { "type": "string", "minLength": 1 },
    "artifactBase": {
      "type": "object",
      "required": ["id", "mediaType", "fulfills"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "mediaType": { "$ref": "#/$defs/mediaTypeString" },
        "fulfills": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      },
      "additionalProperties": true
    },
    "artifact": {
      "oneOf": [
        { "$ref": "#/$defs/smartHealthCardArtifact" },
        { "$ref": "#/$defs/rawFhirJsonArtifact" }
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
              "additionalProperties": true
            }
          },
          "not": { "required": ["fhirVersion"] },
          "additionalProperties": true
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
          "additionalProperties": true
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

- `artifacts[]` MAY be empty. Per-item outcomes are still reported through `requestStatus[]`.
- Every Artifact has `id`, `mediaType`, and non-empty `fulfills[]` at the common level. Uniqueness of Artifact ids and validity of fulfillment references require procedural validation.
- `application/smart-health-card` Artifacts use `value.verifiableCredential[]` as a non-empty array of strings and SHALL NOT carry an outer Artifact-level `fhirVersion`. FHIR-version semantics for this branch are inside each signed SMART Health Card credential payload.
- `application/fhir+json` Artifacts require `fhirVersion` and `value`. The schema checks only that `value` is a JSON object with a string `resourceType`; it does not validate the full FHIR Resource, Bundle entries, terminology, profiles, or release-specific FHIR grammar.
- The core Artifact schema accepts only the two core `mediaType` discriminator values above. Registered extension Artifacts are represented by additional schemas or deployment profiles that pin their own `mediaType` value or bounded media-type pattern and define their own payload-bearing fields.
- `requestStatus[].status` is limited to the version 1.0 status code set unless a future registered extension is explicitly supported by the receiving Verifier and by a corresponding schema/profile.

## B.4 Validation not fully expressible in JSON Schema

A conforming implementation MUST NOT treat successful validation against the snippets above as complete protocol validation. At minimum, the following constraints require procedural validation against the original request, returned payloads, FHIR knowledge, registries, presentation transport, trust policy, or deployment policy.

| Constraint | Why the standalone schema is insufficient |
| --- | --- |
| `SmartHealthCheckinResponse.requestId` equals `SmartHealthCheckinRequest.id` | The response schema has no access to the original request value. |
| Every `artifacts[].fulfills[]` value resolves to a request item id | The response schema cannot inspect the original request's `items[].id` set. |
| `requestStatus[]` covers every request item exactly once | JSON Schema cannot, in a standalone response schema, compare status `item` values to the original request's item-id set. |
| Duplicate request item ids, duplicate Artifact ids, and duplicate status items | JSON Schema 2020-12 `uniqueItems` compares whole array entries; it does not portably enforce uniqueness of a selected object member such as `id` or `item`. |
| Duplicate JSON object member names | Many validators receive an already-parsed JSON data model after duplicate-member handling has occurred. |
| Artifact `mediaType` is accepted by each fulfilled item | This requires joining each Artifact's `fulfills[]` values to request items and checking each item's `accept[]`, including any registered compatibility rule. |
| Requester identity metadata prohibition | The base schema keeps unknown members and extension points open. Detecting arbitrary self-asserted requester identity fields requires procedural policy, allow-lists, extension review, or a stricter deployment profile. |
| Bundle traversal and selector responsiveness | Raw FHIR Bundle validation requires inspecting `Bundle.entry[].resource`, resource types, profiles, and sometimes supporting resources; the outer Bundle alone is not enough. |
| Profile-family membership for `profilesFrom[]` | Membership depends on implementation-guide knowledge, package metadata, configured family mappings, registry information, or local policy outside the JSON instance. |
| Additive profile-selector semantics | The schema can allow `profiles[]` and `profilesFrom[]` together, but it cannot determine whether returned content satisfies either additive profile selector subject to `resourceTypes[]`. |
| QuestionnaireResponse comparison | A Verifier may need to compare `QuestionnaireResponse.questionnaire` with a requested `form.fhir` selector's `questionnaireCanonical`, inline `questionnaire.url`/`questionnaire.version`, and §5.5 structured `|version` handling. |
| Raw FHIR release consistency | The schema can require an outer `fhirVersion`, but detecting mixed-release Bundles and deciding whether a raw FHIR Artifact's release is acceptable requires FHIR-aware and request-aware checks. |
| SMART Health Card payload validation | The schema can check the wrapper's `verifiableCredential[]` shape, but JWS verification, payload inspection, issuer trust, FHIR version, and selector responsiveness are SMART Health Cards and policy checks. |
| Full FHIR profile validation | FHIR profile, terminology, invariant, Questionnaire, and implementation-guide validation require FHIR validators and deployment policy outside the core JSON Schema. |
| Limits not fixed by §§5-6 | Maximum string lengths, array sizes, byte sizes, URL dereferencing behavior, and extension payload limits belong to transport profiles, extension registrations, conformance tooling, or deployment policy unless later normative text fixes them. |

## B.5 Illustrative validation flow

The following sequence is illustrative. It shows where Appendix B schema validation fits relative to other validation; it is not a new transport binding or implementation API.

1. Parse JSON using RFC 8259 rules and reject duplicate object member names when detected.
2. Validate the SMART request against the B.2 request schema.
3. Apply §5 procedural checks, including duplicate request-item id detection, registered extension-selector handling, and requester-identity metadata review.
4. Validate the SMART response against the B.3 response schema.
5. Apply §6.6 cross-validation against the original request: exact `requestId` match, `fulfills[]` reference resolution, per-item `accept[]` compatibility, exact `requestStatus[]` coverage, and FHIR-version checks.
6. Apply FHIR, SMART Health Card, QuestionnaireResponse, transport, trust, security, privacy, and deployment-policy checks as applicable.
