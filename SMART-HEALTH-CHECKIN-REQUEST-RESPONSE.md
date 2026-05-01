# SMART Health Check-in Request/Response

Status: draft — intended active payload shape
Scope: transport-neutral request/response objects for SMART Health Check-in, intended to be carried over direct `org-iso-mdoc` and OID4VP.

This repo is greenfield. When this payload shape is adopted, implementations can
migrate directly to it rather than supporting the earlier prototype
untyped `{ "version": "1", "items": [...] }` prototype in parallel.

## 1. Design summary

SMART Health Check-in uses a small, transport-neutral clinical request object and a small, transport-neutral response object.

The transport layer is responsible for request authentication, origin/session binding, encryption, and delivery. The request/response objects are responsible only for the clinical content contract.

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

### OID4VP carrier

The same request object can be carried in a signed OID4VP Request Object, for example:

```text
smart_health_checkin.request = SmartHealthCheckinRequest
```

The same response object can be returned in the `vp_token`.

## 2. Design principles

1. **Keep mdoc simple.** Use one docType, one namespace, and one stable response element. Do not model each FHIR profile, questionnaire, or artifact as a separate mdoc element.

2. **Keep request identity out of the clinical request body.** Do not place requester name, logo, or URL in this object. Those are easy to spoof. Identity and trust should come from the surrounding transport: origin binding, signed Request Object, verifier metadata, and wallet policy.

3. **Use FHIR canonicals where they fit.** Exact FHIR profile requests should use canonical `StructureDefinition` URLs. Broad requests should point to FHIR publications, implementation guides, or profile collections by canonical URL.

4. **Do not use local topic vocabularies when FHIR terms exist.** Optional narrowing should use official FHIR `resourceType` names, not custom labels such as `"care-plans"`.

5. **Treat response forms as media types.** The `accept` list is ordered by verifier preference. For example, `application/smart-health-card` naturally includes its own signed health-card structure; `application/fhir+json` naturally means raw FHIR JSON.

6. **Make the response artifact-centered.** A single artifact can fulfill multiple request items, and a single request item can be fulfilled by multiple artifacts.

7. **Declare FHIR version for raw FHIR JSON.** SMART Health Cards already carry FHIR version inside the signed credential payload. Raw FHIR JSON artifacts must declare `fhirVersion` explicitly.

8. **Report per-item outcomes.** `requestStatus[]` is required and has one entry for each request item, including declined, unavailable, unsupported, and error cases that produce no artifact.

9. **Default to retention for SMART Check-in.** In the direct mdoc carrier,
`intentToRetain` defaults to `true` for `smart_health_checkin_response`, because
realistic clinical check-in workflows usually ingest returned artifacts into an
EHR. Deployments can override this when the verifier truly intends ephemeral use.

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

/**
 * SMART Health Check-in request.
 *
 * This is the transport-neutral clinical request object.
 *
 * It intentionally does not include requester display metadata such as clinic
 * name, logo, or URL. Identity and display trust should come from the
 * surrounding transport and wallet policy, not from self-asserted fields here.
 */
export interface SmartHealthCheckinRequest {
  /**
   * Fixed discriminator.
   */
  type: "smart-health-checkin-request";

  /**
   * Version of this request schema.
   *
   * This is not the FHIR version.
   */
  version: "1";

  /**
   * Opaque verifier-generated request id.
   *
   * The response echoes this as response.requestId.
   */
  id: string;

  /**
   * Optional short purpose label for patient-facing context.
   *
   * Examples:
   *   "check-in"
   *   "insurance verification"
   *   "pre-visit intake"
   *
   * This is not requester identity.
   */
  purpose?: string;

  /**
   * FHIR versions the verifier can consume.
   *
   * Ordered by verifier preference.
   *
   * This applies to FHIR content returned outside SMART Health Cards.
   * For SMART Health Cards, the authoritative FHIR version is declared inside
   * each signed health card credential.
   *
   * Examples:
   *   ["4.0.1"]
   *   ["4.0.1", "4.3.0"]
   *   ["4.0.1", "5.0.0"]
   */
  fhirVersions?: FhirVersion[];

  /**
   * Clinical content request items.
   *
   * Each request item can be fulfilled by zero, one, or many artifacts.
   */
  items: SmartHealthCheckinRequestItem[];
}

/**
 * One requested piece or category of clinical content.
 */
export interface SmartHealthCheckinRequestItem {
  /**
   * Stable id for this request item.
   *
   * Response artifacts refer to these ids in artifact.fulfills.
   */
  id: string;

  /**
   * Short patient-facing title.
   *
   * Examples:
   *   "Insurance card"
   *   "US Core records"
   *   "Migraine check-in"
   */
  title: string;

  /**
   * Optional patient-facing explanation of the requested content.
   *
   * This should describe the content, not the requester's identity.
   */
  summary?: string;

  /**
   * Whether this request item is required for the verifier's workflow.
   *
   * If omitted, default is false.
   *
   * The wallet may still allow the patient to decline. The verifier decides
   * how to handle missing required content downstream.
   */
  required?: boolean;

  /**
   * Clinical content selector.
   */
  content: SmartHealthCheckinContentSelector;

  /**
   * Ordered list of response media types the verifier can consume.
   *
   * The order expresses verifier preference. There is no separate preference
   * field.
   *
   * Example:
   *
   *   accept: [
   *     "application/smart-health-card",
   *     "application/fhir+json"
   *   ]
   *
   * means:
   *
   *   Prefer a SMART Health Card if available; otherwise raw FHIR JSON is
   *   acceptable.
   */
  accept: SmartHealthCheckinAcceptedMediaType[];
}

/**
 * Supported clinical content selector kinds.
 */
export type SmartHealthCheckinContentSelector =
  | FhirResourcesContentSelector
  | QuestionnaireContentSelector;

/**
 * Request FHIR resources.
 *
 * This covers:
 *
 *   - exact profile requests
 *   - broad profile-publication requests
 *   - CARIN-style insurance card requests
 *   - US Core-style broad clinical content requests
 *
 * If profiles, profilesFrom, and resourceTypes are all omitted, this requests
 * any patient-specific FHIR resources the wallet can offer and the patient
 * chooses to share.
 */
export interface FhirResourcesContentSelector {
  kind: "fhir.resources";

  /**
   * Exact FHIR profile canonical URLs.
   *
   * These are canonical StructureDefinition URLs.
   *
   * Examples:
   *
   *   "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
   *
   *   "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
   *
   * A version may be appended using canonical|version when the verifier needs
   * an exact profile version.
   *
   * Example:
   *
   *   "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|8.0.1"
   *
   * If no version is included, the request is intentionally looser:
   *
   *   Return resources conforming to a supported version of this profile.
   */
  profiles?: FhirCanonical[];

  /**
   * Reference to a FHIR publication, implementation guide, or profile
   * collection whose resource profiles are acceptable.
   *
   * This is the broad, FHIR-native hook for requests like:
   *
   *   "Give me any records conforming to US Core profiles."
   *
   * Simple form:
   *
   *   profilesFrom: "http://hl7.org/fhir/us/core"
   *
   * Expanded form:
   *
   *   profilesFrom: {
   *     canonical: "http://hl7.org/fhir/us/core",
   *     package: "hl7.fhir.us.core"
   *   }
   *
   * The canonical is the semantic identity. package and version are optional
   * resolver hints.
   */
  profilesFrom?: OneOrMany<FhirProfileCollectionRef>;

  /**
   * Optional narrowing by official FHIR resourceType names.
   *
   * This avoids inventing local topic vocabularies while still letting a
   * verifier narrow a broad profile-collection request.
   *
   * Examples:
   *
   *   ["Condition", "MedicationRequest", "Observation"]
   *
   *   ["Coverage", "Patient", "Organization"]
   *
   * If omitted, the request is broad over the resource profiles identified by
   * profiles and/or profilesFrom. If no profile selector is present either, the
   * request is broad over all patient-specific FHIR resources available to share.
   */
  resourceTypes?: FhirResourceType[];
}

/**
 * Request completion of a FHIR Questionnaire.
 *
 * The questionnaire can be:
 *
 *   - a canonical URL
 *   - an inline fhir_r4.Questionnaire
 *   - both a canonical URL and an inline Questionnaire body
 *
 * The expected raw FHIR response is a QuestionnaireResponse.
 */
export interface QuestionnaireContentSelector {
  kind: "questionnaire";

  questionnaire: QuestionnaireRef;
}

/**
 * Questionnaire reference.
 *
 * String form:
 *
 *   questionnaire:
 *     "https://clinic.example.org/fhir/Questionnaire/migraine-intake"
 *
 * Inline form:
 *
 *   questionnaire:
 *     { resourceType: "Questionnaire", ... }
 *
 * Combined form:
 *
 *   questionnaire:
 *     {
 *       canonical: "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
 *       resource: { resourceType: "Questionnaire", ... }
 *     }
 */
export type QuestionnaireRef =
  | FhirCanonical
  | fhir_r4.Questionnaire
  | QuestionnaireCanonicalAndResource;

export type QuestionnaireCanonicalAndResource =
  | QuestionnaireCanonicalObject
  | QuestionnaireResourceObject;

export interface QuestionnaireCanonicalObject {
  /**
   * Canonical URL identifying the questionnaire.
   *
   * May include a version suffix using canonical|version.
   */
  canonical: FhirCanonical;

  /**
   * Inline FHIR R4 Questionnaire resource.
   *
   * Useful when the wallet should render the questionnaire without fetching it
   * from a remote endpoint.
   */
  resource?: fhir_r4.Questionnaire;
}

export interface QuestionnaireResourceObject {
  /**
   * Canonical URL identifying the questionnaire.
   *
   * May include a version suffix using canonical|version.
   */
  canonical?: FhirCanonical;

  /**
   * Inline FHIR R4 Questionnaire resource.
   *
   * Useful when the wallet should render the questionnaire without fetching it
   * from a remote endpoint.
   */
  resource: fhir_r4.Questionnaire;
}

/**
 * Reference to a FHIR publication, implementation guide, package, or profile
 * collection.
 *
 * Version 1 accepts canonical URLs only. Registered URNs would imply a registry
 * this profile does not define; deployments that need URNs can define an
 * extension.
 */
export type FhirProfileCollectionRef =
  | FhirCanonical
  | FhirProfileCollectionRefObject;

export interface FhirProfileCollectionRefObject {
  /**
   * Canonical URL for the FHIR publication / IG / profile collection.
   *
   * Example:
   *
   *   "http://hl7.org/fhir/us/core"
   */
  canonical: FhirCanonical;

  /**
   * Optional FHIR package id.
   *
   * Example:
   *
   *   "hl7.fhir.us.core"
   *
   * This is a resolver/distribution hint, not the semantic identity.
   */
  package?: string;

  /**
   * Optional package/publication/profile-collection version.
   *
   * Avoid requiring this unless exact version matching is important.
   */
  version?: string;
}

/**
 * Response media types this verifier can consume.
 *
 * The request's accept array is ordered by preference.
 *
 * Known core media types:
 *
 *   - application/smart-health-card
 *       JSON object with verifiableCredential[] containing one or more SMART
 *       Health Card JWS strings.
 *
 *   - application/fhir+json
 *       Raw FHIR JSON. The response artifact must declare fhirVersion.
 *
 *   - application/smart-health-link
 *       SMART Health Link or similar retrievable package.
 *
 * Other media types may be used by extension.
 */
export type SmartHealthCheckinAcceptedMediaType =
  | "application/smart-health-card"
  | "application/fhir+json"
  | "application/smart-health-link"
  | (string & {});

/**
 * FHIR canonical URL string.
 *
 * A version may be appended as canonical|version.
 */
export type FhirCanonical = string;

/**
 * FHIR release version.
 *
 * Examples:
 *   "4.0.1"  // R4
 *   "4.3.0"  // R4B
 *   "5.0.0"  // R5
 */
export type FhirVersion = string;

/**
 * Official FHIR resourceType name.
 *
 * Kept as string so this protocol is not locked to one FHIR release.
 */
export type FhirResourceType = string;

export type OneOrMany<T> = T | T[];
```

## 4. Request semantics

### `fhir.resources`

`fhir.resources` requests patient-specific FHIR resources.

The verifier can request exact profiles:

```json
{
  "kind": "fhir.resources",
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ]
}
```

Or broad resource profiles from a FHIR publication / IG / profile collection:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": "http://hl7.org/fhir/us/core"
}
```

Optional `resourceTypes` narrows a broad request using official FHIR resource type names:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": "http://hl7.org/fhir/us/core",
  "resourceTypes": ["Condition", "MedicationRequest", "Observation"]
}
```

### `questionnaire`

`questionnaire` requests that the wallet/source app collect answers to a FHIR Questionnaire and return a FHIR `QuestionnaireResponse`.

The questionnaire may be referenced by canonical:

```json
{
  "kind": "questionnaire",
  "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake"
}
```

Or included inline:

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "status": "active",
    "title": "Migraine Check-in",
    "item": []
  }
}
```

Or both:

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "resource": {
      "resourceType": "Questionnaire",
      "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
      "status": "active",
      "title": "Migraine Check-in",
      "item": []
    }
  }
}
```

## 5. Response format

The response is artifact-centered.

This is important because:

```text
one artifact can fulfill multiple request items
one request item can be fulfilled by multiple artifacts
some request items may have no artifacts
```

Each artifact says which item ids it fulfills:

```text
artifact.fulfills = ["item-id-1", "item-id-2"]
```

Per-item status is separate so that a wallet can report declined, unavailable, unsupported, or error outcomes even when there is no artifact.

### Response TypeScript

```ts
import type * as fhir_r4 from "./fhir_r4";

/**
 * SMART Health Check-in response.
 *
 * The response is artifact-centered.
 */
export interface SmartHealthCheckinResponse {
  /**
   * Fixed discriminator.
   */
  type: "smart-health-checkin-response";

  /**
   * Version of this response schema.
   */
  version: "1";

  /**
   * Echoes SmartHealthCheckinRequest.id.
   */
  requestId: string;

  /**
   * Returned clinical artifacts.
   *
   * Each artifact declares which request item ids it fulfills.
   */
  artifacts: SmartHealthCheckinArtifact[];

  /**
   * Per-item status.
   *
   * This is needed because some request items may be declined, unavailable,
   * unsupported, partially fulfilled, or failed without producing an artifact.
   */
  requestStatus: SmartHealthCheckinItemStatus[];
}

/**
 * Status for one request item.
 */
export interface SmartHealthCheckinItemStatus {
  /**
   * Request item id from SmartHealthCheckinRequest.items[].id.
   */
  item: string;

  /**
   * Overall status for this request item.
   */
  status: SmartHealthCheckinItemStatusCode;

  /**
   * Optional explanation.
   *
   * Examples:
   *   "Patient declined to share this item."
   *   "No matching records found."
   *   "Shared available matching resources."
   */
  message?: string;
}

export type SmartHealthCheckinItemStatusCode =
  | "fulfilled"
  | "partial"
  | "unavailable"
  | "declined"
  | "unsupported"
  | "error";

/**
 * Returned artifact.
 */
export type SmartHealthCheckinArtifact =
  | SmartHealthCardArtifact
  | FhirJsonArtifact
  | SmartHealthLinkArtifact
  | GenericArtifact;

/**
 * Common artifact fields.
 */
export interface SmartHealthCheckinArtifactBase {
  /**
   * Stable only within this response.
   */
  id: ArtifactId;

  /**
   * Request item ids this artifact fulfills.
   *
   * A single artifact may fulfill multiple request items.
   */
  fulfills: string[];
}

/**
 * SMART Health Card artifact.
 *
 * For mediaType application/smart-health-card, value is the same JSON object
 * used for SMART Health Card file download:
 *
 *   {
 *     "verifiableCredential": [
 *       "<<Verifiable Credential as JWS>>"
 *     ]
 *   }
 *
 * Each JWS is a SMART Health Card Verifiable Credential. The authoritative
 * FHIR version is inside the signed credential payload, not in this wrapper.
 */
export interface SmartHealthCardArtifact extends SmartHealthCheckinArtifactBase {
  mediaType: "application/smart-health-card";

  value: SmartHealthCardFile;
}

/**
 * JSON body for media type application/smart-health-card.
 */
export interface SmartHealthCardFile {
  /**
   * One or more SMART Health Card Verifiable Credential JWS strings.
   */
  verifiableCredential: string[];
}

/**
 * Raw FHIR JSON artifact.
 *
 * This is not independently issuer-signed unless the payload itself contains
 * a proof. The surrounding transport proves transaction binding; it does not
 * prove clinical provenance.
 */
export interface FhirJsonArtifact extends SmartHealthCheckinArtifactBase {
  mediaType: "application/fhir+json";

  /**
   * Required FHIR release/version for this raw FHIR payload.
   *
   * If value is a Bundle, all resources in that Bundle are interpreted under
   * this same FHIR version. Mixed-version FHIR content should be returned as
   * separate application/fhir+json artifacts.
   */
  fhirVersion: FhirVersion;

  /**
   * Raw FHIR Resource or Bundle.
   *
   * This specification uses fhir_r4.Resource for examples because the likely first
   * target is FHIR R4. A multi-version implementation may use a wider generated
   * FHIR union here.
   */
  value: fhir_r4.Resource;
}

/**
 * SMART Health Link or similar retrievable package.
 */
export interface SmartHealthLinkArtifact extends SmartHealthCheckinArtifactBase {
  mediaType: "application/smart-health-link";

  url: string;
}

/**
 * Generic extension artifact.
 */
export type GenericArtifact =
  | GenericValueArtifact
  | GenericUrlArtifact
  | GenericDataArtifact;

export interface GenericArtifactBase extends SmartHealthCheckinArtifactBase {
  mediaType: string;

  filename?: string;

  /**
   * Optional only when the artifact is known to contain raw FHIR content.
   */
  fhirVersion?: FhirVersion;
}

export interface GenericValueArtifact extends GenericArtifactBase {
  value: unknown;
}

export interface GenericUrlArtifact extends GenericArtifactBase {
  url: string;
}

export interface GenericDataArtifact extends GenericArtifactBase {
  data: string;
}

/**
 * Stable only within this response.
 */
export type ArtifactId = string;

/**
 * FHIR release version.
 */
export type FhirVersion = string;
```

## 6. Response artifact semantics

### SMART Health Card artifacts

A SMART Health Card artifact has:

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

The artifact does not list profiles. Verifiers inspect the signed SHC payload.

The artifact does not need an outer `fhirVersion`. Verifiers inspect each signed health-card credential, where the FHIR version is part of the signed payload.

### Raw FHIR JSON artifacts

A raw FHIR JSON artifact has:

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

The artifact must declare `fhirVersion`.

The artifact does not list profiles. Verifiers inspect:

```text
value.meta.profile
Bundle.entry[].resource.meta.profile
```

### Many-to-many fulfillment

A single artifact can fulfill multiple request items:

```json
{
  "id": "artifact-questionnaire-response",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["migraine-intake", "us-core-records"],
  "value": {
    "resourceType": "QuestionnaireResponse",
    "status": "completed"
  }
}
```

A single request can be fulfilled by multiple artifacts:

```json
[
  {
    "id": "artifact-us-core-bundle-1",
    "fulfills": ["us-core-records"]
  },
  {
    "id": "artifact-questionnaire-response",
    "fulfills": ["us-core-records", "migraine-intake"]
  }
]
```

## 7. Full example request

```ts
import type * as fhir_r4 from "./fhir_r4";

export const exampleRequest: SmartHealthCheckinRequest = {
  type: "smart-health-checkin-request",
  version: "1",
  id: "req_123",
  purpose: "check-in",

  // Ordered by verifier preference.
  fhirVersions: ["4.0.1"],

  items: [
    {
      id: "insurance-card",
      title: "Insurance card",
      summary: "Insurance coverage information you can share.",
      required: false,
      content: {
        kind: "fhir.resources",
        profiles: [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ]
      },
      accept: [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    },

    {
      id: "us-core-records",
      title: "US Core records",
      summary: "Patient records your app can share that conform to US Core profiles.",
      required: false,
      content: {
        kind: "fhir.resources",
        profilesFrom: "http://hl7.org/fhir/us/core"
      },
      accept: [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    },

    {
      id: "migraine-intake",
      title: "Migraine check-in",
      required: true,
      content: {
        kind: "questionnaire",
        questionnaire: {
          canonical: "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
          resource: {
            resourceType: "Questionnaire",
            url: "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
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
        }
      },
      accept: [
        "application/fhir+json"
      ]
    }
  ]
};
```

## 8. Full example response

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
              subject: {
                reference: "Patient/patient-1"
              },
              code: {
                text: "Migraine"
              }
            }
          },
          {
            resource: {
              resourceType: "Observation",
              id: "observation-1",
              meta: {
                profile: [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab"
                ]
              },
              status: "final",
              code: {
                text: "Example lab result"
              },
              subject: {
                reference: "Patient/patient-1"
              }
            }
          }
        ]
      } as fhir_r4.Bundle
    },

    {
      id: "artifact-migraine-questionnaire-response",
      mediaType: "application/fhir+json",
      fhirVersion: "4.0.1",
      fulfills: ["migraine-intake", "us-core-records"],
      value: {
        resourceType: "QuestionnaireResponse",
        status: "completed",
        questionnaire: "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
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
    {
      item: "insurance-card",
      status: "fulfilled"
    },
    {
      item: "us-core-records",
      status: "partial",
      message: "Shared available matching US Core resources."
    },
    {
      item: "migraine-intake",
      status: "fulfilled"
    }
  ]
};
```

## 9. Normative rules

### Request rules

1. `SmartHealthCheckinRequest.type` SHALL be `"smart-health-checkin-request"`.

2. `SmartHealthCheckinRequest.version` SHALL be `"1"` for this version of the schema.

3. `items[].id` values SHALL be unique within a request.

4. `items[].accept` SHALL be ordered by verifier preference.

5. The request object SHALL NOT include self-asserted requester identity metadata such as clinic name, logo, or URL.

6. For `content.kind = "fhir.resources"`, omitting `profiles`, `profilesFrom`, and `resourceTypes` means the verifier is requesting any patient-specific FHIR resources the wallet can offer and the patient chooses to share.

7. `profiles` values SHOULD be FHIR profile canonical URLs and MAY include a `|version` suffix.

8. `profilesFrom` SHALL identify a FHIR publication, implementation guide, or profile collection by canonical URL. Package and version are optional resolver hints. Version 1 does not define registered URNs for profile collections.

9. `resourceTypes`, when present, SHALL use official FHIR resource type names.

10. For `content.kind = "questionnaire"`, the questionnaire MAY be a canonical URL, an inline `Questionnaire`, or both.

11. If the questionnaire is expressed as an object, it SHALL include at least one of `canonical` or `resource`.

### Response rules

1. `SmartHealthCheckinResponse.type` SHALL be `"smart-health-checkin-response"`.

2. `SmartHealthCheckinResponse.version` SHALL be `"1"` for this version of the schema.

3. `requestId` SHALL equal the corresponding request `id`.

4. `artifacts[].id` values SHALL be unique within a response.

5. `artifacts[].fulfills` SHALL contain ids from the original request's `items[].id`.

6. For each id in `artifacts[].fulfills`, the artifact `mediaType` SHALL appear in that request item's `accept[]` list.

7. A single artifact MAY fulfill multiple request items.

8. A single request item MAY be fulfilled by multiple artifacts.

9. `application/smart-health-card` artifact values SHALL be JSON objects with a `verifiableCredential` array containing one or more SMART Health Card JWS strings.

10. `application/smart-health-card` artifacts SHALL NOT rely on an outer `fhirVersion`; verifiers SHALL inspect each signed credential payload for its FHIR version.

11. `application/fhir+json` artifacts SHALL include `fhirVersion`.

12. If an `application/fhir+json` artifact value is a Bundle, all resources in that Bundle SHALL be interpreted under the artifact's `fhirVersion`. Mixed FHIR versions SHOULD be returned as separate artifacts.

13. Artifacts SHOULD NOT include a profile summary field. Verifiers SHOULD inspect FHIR `meta.profile` values in the payload itself.

14. `requestStatus` SHALL include one entry for each original request item, and `requestStatus[].item` SHALL contain that item's id.

15. `requestStatus.status = "fulfilled"` means the wallet believes the request item was fully satisfied.

16. `requestStatus.status = "partial"` means the wallet returned some relevant artifacts but does not claim complete fulfillment.

17. `requestStatus.status = "unavailable"` means the wallet found no matching shareable content.

18. `requestStatus.status = "declined"` means the patient declined the request item.

19. `requestStatus.status = "unsupported"` means the wallet could not understand or support the request item or requested media types.

20. `requestStatus.status = "error"` means the wallet encountered an error attempting to satisfy the request item.

21. Generic extension artifacts SHALL include at least one payload locator/body field: `value`, `url`, or `data`. If an extension artifact includes more than one of these fields, its media type or profile SHALL define how the fields are interpreted together.

### Direct mdoc carrier rules

1. The direct mdoc carrier SHALL request the stable element
   `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`.

2. The direct mdoc carrier SHALL default `intentToRetain` to `true` for
   `smart_health_checkin_response`. A deployment MAY override this if the
   verifier truly intends ephemeral use and will not ingest returned artifacts.

## 10. Notes on SMART Health Cards

For `application/smart-health-card`, the payload is modeled after SMART Health Card file download:

```json
{
  "verifiableCredential": [
    "<<Verifiable Credential as JWS>>",
    "<<Verifiable Credential as JWS>>"
  ]
}
```

Each JWS is independently verified as a SMART Health Card credential. FHIR content and FHIR version are inside the signed credential payload.

## 11. Notes on raw FHIR JSON

For `application/fhir+json`, the artifact explicitly declares:

```json
{
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "value": {
    "resourceType": "Bundle"
  }
}
```

This mirrors the useful part of SMART Health Cards — an explicit FHIR version paired with FHIR content — while avoiding a false claim that raw FHIR JSON has independent issuer proof.

## 12. Open questions

1. Should the protocol define a maximum response size or leave this to transport/profile constraints?

2. Should `application/smart-health-link` artifacts be inline URLs only, or should they support the full SMART Health Links manifest body?
