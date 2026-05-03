# SMART Health Check-in Request/Response

Status: draft public explainer aligned with the design-note-rebased spec work.
Scope: transport-neutral SMART Health Check-in request and response JSON objects.

SMART Health Check-in 1.0 is layered:

1. the clinical request and response objects described here; and
2. the same-device direct `org-iso-mdoc` presentation flow described by the
   active wire profile.

In-person QR, NFC, deep-link, kiosk, staff-desktop, relay, and completion-screen
behavior can be useful deployment UX, but those mechanisms are not standardized
SMART Health Check-in 1.0 pointer, envelope, relay, submission, or completion
protocols. A deployment that uses them should treat them as a way to land the
Holder on a same-device Verifier page that runs the direct `org-iso-mdoc` flow.

## 1. Design summary

The SMART request says what clinical content or action the Requester can
consume. The SMART response returns Artifacts and per-item status. The
presentation transport is responsible for origin/session binding, encryption,
delivery, and mdoc validation; the JSON objects are responsible for the clinical
content contract.

### Direct mdoc carrier

```text
protocol:  org-iso-mdoc
docType:   org.smarthealthit.checkin.1
namespace: org.smarthealthit.checkin
element:   smart_health_checkin_response
```

The request is carried in the mdoc request:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
  = JSON.stringify(SmartHealthCheckinRequest)
```

The response is carried as the disclosed mdoc element value:

```text
namespace:         "org.smarthealthit.checkin"
elementIdentifier: "smart_health_checkin_response"
elementValue:      JSON.stringify(SmartHealthCheckinResponse)
```

OID4VP is future/reserved work in this repository's spec drafting. It is not the
live SMART Health Check-in 1.0 presentation flow implemented by this demo.

## 2. Design principles

1. **Keep mdoc simple.** Use one docType, one namespace, and one stable response
   element. Do not model each FHIR profile, questionnaire, or artifact as a
   separate mdoc element.
2. **Keep requester identity out of the clinical request body.** Do not place
   requester name, logo, URL, callback endpoint, package id, certificate, or
   deployment routing metadata in this object. Identity and trust come from the
   surrounding transport, reader authentication when used, platform evidence,
   and wallet policy.
3. **Use FHIR canonicals where they fit.** Exact FHIR profile requests use
   `StructureDefinition` canonical URLs. Broad profile-family requests use
   canonical URLs for FHIR publications, implementation guides, or profile
   collections.
4. **Do not use local topic vocabularies when FHIR terms exist.** Optional
   narrowing uses official FHIR `resourceType` names, not custom labels such as
   `"care-plans"` or `"clinical-history"`.
5. **Treat response forms as media types.** The `accept[]` list is ordered by
   Requester preference. Core response Artifacts are
   `application/smart-health-card` and `application/fhir+json`.
6. **Make the response Artifact-centered.** A single Artifact can fulfill
   multiple request items, and a single request item can be fulfilled by multiple
   Artifacts.
7. **Declare FHIR version for raw FHIR JSON.** SMART Health Cards carry FHIR
   version inside signed credentials. Raw FHIR JSON Artifacts declare
   `fhirVersion` explicitly.
8. **Report per-item outcomes.** `requestStatus[]` has one entry for each
   request item, including declined, unavailable, unsupported, and error cases
   that produce no Artifact.
9. **Do not overclaim raw FHIR provenance.** The mdoc transport proves
   presentation-layer facts. Unsigned raw FHIR JSON remains patient-mediated
   unless the payload, deployment profile, or accepted evidence supplies
   separate clinical-source provenance.

## 3. Request format

A request has:

```text
type
version
id
purpose?
fhirVersions?
items[]
```

Each request item has:

```text
id
title
summary?
required?
content
accept[]
```

### Request TypeScript

```ts
import type * as fhir_r4 from "./fhir_r4";

export interface SmartHealthCheckinRequest {
  type: "smart-health-checkin-request";
  version: "1";
  id: string;
  purpose?: string;
  fhirVersions?: FhirVersion[];
  items: SmartHealthCheckinRequestItem[];
}

export interface SmartHealthCheckinRequestItem {
  id: string;
  title: string;
  summary?: string;
  required?: boolean;
  content: SmartHealthCheckinContentSelector;
  accept: SmartHealthCheckinAcceptedMediaType[];
}

export type SmartHealthCheckinContentSelector =
  | FhirResourcesContentSelector
  | QuestionnaireContentSelector;

export interface FhirResourcesContentSelector {
  kind: "selection.fhir";
  profiles?: FhirCanonical[];
  profilesFrom?: FhirProfileCollectionRef[];
  resourceTypes?: FhirResourceType[];
}

export interface QuestionnaireContentSelector {
  kind: "form.fhir";
  questionnaireCanonical?: FhirCanonical;
  questionnaire?: fhir_r4.Questionnaire;
}

export type SmartHealthCheckinAcceptedMediaType =
  | "application/smart-health-card"
  | "application/fhir+json"
  | (string & {});

export type FhirCanonical = string;
export type FhirProfileCollectionRef = string;
export type FhirResourceType = string;
export type FhirVersion = string;
```

For `content.kind = "form.fhir"`, at least one of `questionnaireCanonical` or
`questionnaire` is present. Both are direct selector members. The
SMART Health Check-in 1.0 selector does not use the older field names
`canonical` or `resource`; nested forms such as
`questionnaire: { canonical, resource }` are also not the 1.0 shape.

## 4. Request semantics

### `selection.fhir`

`selection.fhir` requests patient-specific FHIR resources.

Exact profile request:

```json
{
  "kind": "selection.fhir",
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ]
}
```

Broad profile-family request:

```json
{
  "kind": "selection.fhir",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Optional resource type narrowing:

```json
{
  "kind": "selection.fhir",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "resourceTypes": ["Condition", "MedicationRequest", "Observation"]
}
```

`profiles[]` identifies exact profile canonicals. `profilesFrom[]` identifies
profile families by canonical URL. `resourceTypes[]` uses official FHIR resource
type names.

When `profiles[]` and `profilesFrom[]` are both present, they are additive
profile selectors: a resource can satisfy the item by matching an exact profile
in `profiles[]` or any profile belonging to a family in `profilesFrom[]`, subject
to `resourceTypes[]` if present. `profiles[]` does not narrow a broader
`profilesFrom[]` request.

If `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, the
item requests any patient-specific FHIR resources the Wallet can offer and the
Holder chooses to share, constrained by `accept[]`, `fhirVersions[]`, Wallet
capability, policy, and Holder decision.

### `form.fhir`

`form.fhir` requests that the Wallet or source app collect answers to a FHIR
Questionnaire and return a FHIR `QuestionnaireResponse`.

Canonical-only request:

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
}
```

Inline request:

```json
{
  "kind": "form.fhir",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "title": "Migraine Check-in",
    "item": []
  }
}
```

Canonical plus inline body:

```json
{
  "kind": "form.fhir",
  "questionnaireCanonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "title": "Migraine Check-in",
    "item": []
  }
}
```

When both `questionnaireCanonical` and `questionnaire` are supplied, the canonical
is the requested identity and the inline `questionnaire` is the body to render.
Material disagreement in URL, explicit version, or answer-changing item structure
should be reported as `unsupported` before answers are collected.

## 5. Canonical `|version` handling

FHIR canonicals can append a version with `canonical|version`. Implementations
should parse them into `(url, version?)` while preserving the original string
where the protocol carries, emits, compares, logs, or records it.

Resolution guidance:

| Operation | Guidance |
| --- | --- |
| Parse request canonical | Split into `url` and optional `version`; preserve the original string. |
| Resolve versioned canonical | Use a configured resolver, FHIR package cache, implementation-guide resolver, terminology service, or FHIR canonical search with both `url` and `version`. |
| Direct HTTP dereference | Use only for unversioned canonicals, and verify the returned resource's type and `url`. |
| Versioned direct fetch | Do not satisfy a versioned canonical by stripping the version suffix and fetching the bare URL. |
| `profilesFrom[]` family lookup | Local routing or family classification can use the base URL unless the family definition is version-sensitive. |
| Exact profile matching | Preserve and compare the exact versioned canonical or equivalent trusted exact-version evidence. |
| `QuestionnaireResponse.questionnaire` | Preserve the requested Questionnaire canonical, including the version suffix, when it identifies the Questionnaire being answered. |
| Returned `meta.profile[]` | Preserve exact profile strings, including version suffixes, where known. |
| Fixtures and diagnostics | Preserve exact wire strings. |

FHIR search examples:

```text
GET [base]/StructureDefinition?url={url}&version={version}
GET [base]/Questionnaire?url={url}&version={version}
GET [base]/Questionnaire?url={url}
```

After resolution, verify the expected `resourceType`, `url`, and requested
`version` when a version was requested.

## 6. Response format

The response is Artifact-centered:

```text
one Artifact can fulfill multiple request items
one request item can be fulfilled by multiple Artifacts
some request items may have no Artifacts
```

Each Artifact says which item ids it fulfills:

```text
artifact.fulfills = ["item-id-1", "item-id-2"]
```

Per-item status is separate so that a Wallet can report declined, unavailable,
unsupported, partial, or error outcomes even when there is no Artifact.

### Response TypeScript

```ts
import type * as fhir_r4 from "./fhir_r4";

export interface SmartHealthCheckinResponse {
  type: "smart-health-checkin-response";
  version: "1";
  requestId: string;
  artifacts: SmartHealthCheckinArtifact[];
  requestStatus: SmartHealthCheckinItemStatus[];
}

export interface SmartHealthCheckinItemStatus {
  item: string;
  status: SmartHealthCheckinItemStatusCode;
  message?: string;
}

export type SmartHealthCheckinItemStatusCode =
  | "fulfilled"
  | "partial"
  | "unavailable"
  | "declined"
  | "unsupported"
  | "error";

export type SmartHealthCheckinArtifact =
  | SmartHealthCardArtifact
  | FhirJsonArtifact;

export interface SmartHealthCheckinArtifactBase {
  id: ArtifactId;
  fulfills: string[];
}

export interface SmartHealthCardArtifact extends SmartHealthCheckinArtifactBase {
  mediaType: "application/smart-health-card";
  value: SmartHealthCardFile;
}

export interface SmartHealthCardFile {
  verifiableCredential: string[];
}

export interface FhirJsonArtifact extends SmartHealthCheckinArtifactBase {
  mediaType: "application/fhir+json";
  fhirVersion: FhirVersion;
  value: fhir_r4.Resource;
}

export type ArtifactId = string;
```

The core Artifact union has no `GenericArtifact` catch-all. Future Artifact
extensions should be branded, media-type-defined variants with pinned or bounded
`mediaType` values and typed payload fields. Receivers should not infer protocol
semantics from generic fields named `value`, `url`, or `data` for an unknown
media type.

## 7. Response Artifact semantics

### SMART Health Card Artifacts

```json
{
  "id": "artifact-insurance-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance-card"],
  "value": {
    "verifiableCredential": [
      "<<Verifiable Credential as JWS>>"
    ]
  }
}
```

The Artifact does not list profiles. Verifiers inspect and verify the signed
SMART Health Card payload. The wrapper does not carry an outer `fhirVersion`;
the signed credential payload carries FHIR version information.

### Raw FHIR JSON Artifacts

```json
{
  "id": "artifact-us-core-bundle",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["us-core-records"],
  "value": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": []
  }
}
```

The Artifact declares `fhirVersion`. Verifiers inspect `value.meta.profile` and
`Bundle.entry[].resource.meta.profile` where present. Raw FHIR JSON is not
independently issuer-signed unless the payload or deployment evidence supplies a
proof.

### Many-to-many fulfillment

A single Artifact can fulfill multiple request items:

```json
{
  "id": "artifact-questionnaire-response",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["migraine-intake", "us-core-records"],
  "value": {
    "resourceType": "QuestionnaireResponse",
    "status": "completed",
    "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
  }
}
```

A single request item can be fulfilled by multiple Artifacts when several pieces
of content together satisfy or partially satisfy that item. Every fulfillment
edge still needs to be valid: the Artifact media type must be accepted by the
item, the content must be responsive to the selector, and status accounting
still happens once per request item.

## 8. Full example request

```ts
import type * as fhir_r4 from "./fhir_r4";

export const exampleRequest: SmartHealthCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "req_123",
  purpose: "check-in",
  fhirVersions: ["4.0.1"],
  items: [
    {
      id: "insurance-card",
      title: "Insurance card",
      summary: "Insurance coverage information you can share.",
      required: false,
      content: {
        kind: "selection.fhir",
        profiles: [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ]
      },
      accept: ["application/smart-health-card", "application/fhir+json"]
    },
    {
      id: "us-core-records",
      title: "US Core records",
      summary: "US Core resources, including patient demographics, problems, medications, and allergies.",
      required: false,
      content: {
        kind: "selection.fhir",
        profilesFrom: ["http://hl7.org/fhir/us/core"],
        profiles: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ]
      },
      accept: ["application/smart-health-card", "application/fhir+json"]
    },
    {
      id: "migraine-intake",
      title: "Migraine check-in",
      required: true,
      content: {
        kind: "form.fhir",
        questionnaireCanonical: "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
        questionnaire: {
          resourceType: "Questionnaire",
          url: "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
          version: "1.2.3",
          status: "active",
          title: "Migraine Check-in",
          item: [
            {
              linkId: "visit-priority",
              type: "text",
              text: "What would you most like to discuss today?",
              required: true
            }
          ]
        } as fhir_r4.Questionnaire
      },
      accept: ["application/fhir+json"]
    }
  ]
};
```

## 9. Full example response

```ts
import type * as fhir_r4 from "./fhir_r4";

export const exampleResponse: SmartHealthCheckinResponse = {
  type: "smart-health-checkin-response",
  version: "1",
  requestId: "req_123",
  artifacts: [
    {
      id: "artifact-insurance-shc",
      mediaType: "application/smart-health-card",
      fulfills: ["insurance-card"],
      value: {
        verifiableCredential: [
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiIsImtpZCI6IjEyMzQ1In0..."
        ]
      }
    },
    {
      id: "artifact-us-core-bundle",
      mediaType: "application/fhir+json",
      fhirVersion: "4.0.1",
      fulfills: ["us-core-records"],
      value: {
        resourceType: "Bundle",
        type: "collection",
        entry: [
          {
            resource: {
              resourceType: "Condition",
              id: "condition-1",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"
                ]
              },
              subject: { reference: "Patient/patient-1" },
              code: { text: "Migraine" }
            }
          }
        ]
      } as fhir_r4.Bundle
    },
    {
      id: "artifact-migraine-questionnaire-response",
      mediaType: "application/fhir+json",
      fhirVersion: "4.0.1",
      fulfills: ["migraine-intake"],
      value: {
        resourceType: "QuestionnaireResponse",
        status: "completed",
        questionnaire: "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
        item: [
          {
            linkId: "visit-priority",
            answer: [
              {
                valueString: "Discuss migraine frequency and medication options."
              }
            ]
          }
        ]
      } as fhir_r4.QuestionnaireResponse
    }
  ],
  requestStatus: [
    { item: "insurance-card", status: "fulfilled" },
    {
      item: "us-core-records",
      status: "partial",
      message: "Shared available matching US Core resources."
    },
    { item: "migraine-intake", status: "fulfilled" }
  ]
};
```

## 10. Validation rules to remember

Request validation:

1. `type` is `"smart-health-checkin-request"` and `version` is `"1"`.
2. `items[].id` values are unique within a request.
3. `items[].accept` is a non-empty ordered list.
4. The request object does not include self-asserted requester identity or
   deployment routing metadata.
5. `profiles[]` values are FHIR profile canonicals and may include `|version`.
6. `profilesFrom[]` is an array of canonical URLs identifying profile families.
7. `profiles[]` and `profilesFrom[]`, when both present, are additive.
8. `resourceTypes[]` uses official FHIR resource type names.
9. Questionnaire selectors use direct `canonical?` and/or `resource?` fields.

Response validation:

1. `type` is `"smart-health-checkin-response"` and `version` is `"1"`.
2. `requestId` equals the corresponding request `id`.
3. `artifacts[].id` values are unique within a response.
4. `artifacts[].fulfills[]` contains ids from the original request.
5. Each fulfillment edge uses a media type accepted by that request item.
6. `application/smart-health-card` values contain `verifiableCredential[]` and no
   outer `fhirVersion`.
7. `application/fhir+json` values contain `fhirVersion` and a FHIR Resource or
   Bundle.
8. `requestStatus[]` covers every original request item exactly once.
9. Unknown core media types are not interpreted through a generic Artifact
   fallback.
