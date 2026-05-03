## 6. Clinical content — response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder answers a SMART request after Holder review, Wallet policy, and available Holder data sources have been applied. The same SMART response semantics apply when the object is returned by the same-device presentation flow, encrypted for kiosk submission, or carried by a future binding.

Presentation transports can wrap, encrypt, authenticate, retain, or relay a SMART response, but they do not change the meaning of `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, or `requestStatus[]`. A SMART response is distinct from mdoc envelopes, Digital Credentials API response objects, kiosk submissions, completion acknowledgments, and downstream EHR ingestion records.

### 6.1 `SmartHealthCheckinResponse`

A `SmartHealthCheckinResponse` has this top-level shape:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "<request-id>",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include `type`, `version`, `requestId`, `artifacts`, and `requestStatus`.

#### 6.1.1 `type`

A Wallet/Responder SHALL set `type` to the exact string `"smart-health-checkin-response"`. A Verifier SHALL reject a SMART response whose `type` member is absent or is not exactly `"smart-health-checkin-response"`.

#### 6.1.2 `version`

A Wallet/Responder SHALL set `version` to the exact string `"1"` for responses conforming to SMART Health Check-in 1.0. The `version` member is the SMART response-model version. It is not a FHIR version and not a presentation-transport version.

A Verifier SHALL reject a SMART response whose `version` member is absent or is not exactly `"1"`, unless a future version-negotiation rule explicitly defines compatible handling for another value.

#### 6.1.3 `requestId`

A Wallet/Responder SHALL set `requestId` to the exact `id` value from the SMART request being answered. A Verifier SHALL reject a SMART response unless `requestId` exactly equals the original `SmartHealthCheckinRequest.id` for the request being validated.

`requestId` is a correlation value for this clinical exchange. It is not a patient identifier, requester identifier, transport nonce, presentation-session identifier, or clinical fact.

#### 6.1.4 `artifacts[]`

`artifacts` is the list of clinical Artifacts returned by the Wallet/Responder. A Wallet/Responder SHALL encode `artifacts` as an array. The array MAY be empty when no request item produces a returned Artifact, provided `requestStatus[]` still accounts for every request item as defined in §6.4.

A Wallet/Responder SHALL encode each member of `artifacts` as an Artifact following §6.2 and the applicable concrete Artifact rules in §6.3.

#### 6.1.5 `requestStatus[]`

`requestStatus` is the per-request-item outcome list. A Wallet/Responder SHALL encode `requestStatus` as an array of status objects following §6.4. The `requestStatus[]` array is required even when every item is fulfilled, because it records the Wallet/Responder's claim about item-level outcomes and preserves accounting for declined, unavailable, unsupported, partial, and error outcomes.

### 6.2 Artifact common shape

An Artifact is a response object that contains clinical content or references clinical content returned by a Wallet/Responder. Every Artifact has this common shape:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` on every Artifact. A Wallet/Responder SHALL also include a payload body or locator as defined below and by the Artifact's media type.

#### 6.2.1 `id` uniqueness within response

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to a single SMART response and are stable only within that response.

A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within a single SMART response. A Verifier SHALL reject a SMART response with a missing, non-string, empty, or duplicate Artifact `id`.

A Requester or receiver SHALL NOT treat Artifact ids as patient identifiers, requester identifiers, global document identifiers, or clinical provenance identifiers unless that meaning is separately established by the Artifact payload or deployment policy.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. `mediaType` declares the clinical response form of the Artifact. It is not an mdoc document type, kiosk wrapper type, protocol discriminator, or transport envelope type.

Version 1.0 defines these core Artifact media types:

| Media type | Artifact class | Summary |
| --- | --- | --- |
| `application/smart-health-card` | SMART Health Card Artifact | `value` is a SMART Health Card file-style JSON object with `verifiableCredential[]`. |
| `application/fhir+json` | Raw FHIR JSON Artifact | `value` is a raw FHIR Resource or Bundle, and the Artifact declares `fhirVersion`. |

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. A Verifier SHALL apply the same check under §6.6.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids on every Artifact. Each value in `fulfills[]` SHALL exactly equal the `id` of an item in the original SMART request.

A Wallet/Responder MAY list more than one request item id in `fulfills[]` when one Artifact satisfies multiple items. If the same Artifact fulfills multiple items, the Artifact's `mediaType` SHALL be acceptable for every item listed in `fulfills[]`.

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not resolve to exactly one request item in the original SMART request.

#### 6.2.4 Body fields: `value`, `url`, and `data`

An Artifact body is carried or located by one or more of `value`, `url`, and `data`:

- `value` carries the Artifact payload directly as a JSON value.
- `url` carries a string locator for retrieving the Artifact payload.
- `data` carries a string-encoded payload whose encoding is defined by the Artifact's media type or extension profile.

For the two core media types defined in this section, a Wallet/Responder SHALL use `value` as the payload field. A SMART Health Card Artifact SHALL use `value.verifiableCredential[]` as defined in §6.3.1. A raw FHIR JSON Artifact SHALL use `value` as the FHIR Resource or Bundle as defined in §6.3.2.

For generic or extension Artifacts, a Wallet/Responder SHALL include at least one of `value`, `url`, or `data`. If an extension Artifact includes more than one of these fields, the Artifact's registered media type or extension profile SHALL define how the fields are interpreted together, including precedence, dereferencing behavior, integrity protection, encoding, and privacy considerations.

A Verifier or receiver SHALL NOT infer dereferencing, decoding, signature, freshness, or integrity rules for `url` or `data` from the field name alone. Those rules come from the Artifact media type, extension profile, transport binding, or local policy.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card Artifact (`application/smart-health-card`)

A SMART Health Card Artifact represents one or more SMART Health Card Verifiable Credential JWS strings in the same JSON shape used by SMART Health Card file download.

A Wallet/Responder that returns a SMART Health Card Artifact SHALL set `mediaType` to `"application/smart-health-card"` and SHALL include `value` as a JSON object containing `verifiableCredential`.

A Wallet/Responder SHALL encode `value.verifiableCredential` as a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS. A Verifier or receiver that consumes this Artifact SHALL verify and process each JWS according to SMART Health Cards and local trust policy.

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer `fhirVersion`. FHIR content and FHIR version semantics for this Artifact class are inside the signed SMART Health Card credential payloads, not in the SMART Health Check-in Artifact wrapper.

Example: SMART Health Card Artifact.

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

#### 6.3.2 Raw FHIR JSON Artifact (`application/fhir+json`)

A raw FHIR JSON Artifact represents patient-mediated FHIR JSON content. It is not independently issuer-signed unless the payload itself contains a proof, signature, Provenance, or other evidence. Successful presentation transport proves the transaction and transport binding defined by the selected flow; it does not by itself prove the clinical provenance of unsigned raw FHIR JSON.

A Wallet/Responder that returns a raw FHIR JSON Artifact SHALL set `mediaType` to `"application/fhir+json"`, SHALL include `fhirVersion` as a non-empty FHIR release-version string, and SHALL include `value` as a FHIR JSON object.

A raw FHIR JSON Artifact `value` SHALL be one of:

1. a single FHIR Resource JSON object with `resourceType` present as a string; or
2. a FHIR Bundle JSON object with `resourceType` equal to `"Bundle"` and `entry[]` resources when the Artifact packages multiple resources.

A Wallet/Responder SHOULD use a Bundle when returning multiple FHIR resources in a single `application/fhir+json` Artifact. A Wallet/Responder MAY return a single resource directly when the Artifact contains only that resource.

A Wallet/Responder SHALL interpret all FHIR resources in one `application/fhir+json` Artifact under the Artifact's `fhirVersion`. A Wallet/Responder SHALL NOT mix resources requiring different FHIR releases within the same `application/fhir+json` Artifact. When responsive content uses different FHIR releases, the Wallet/Responder SHALL return separate `application/fhir+json` Artifacts, each with its own `fhirVersion`, or report the affected item as partial, unavailable, unsupported, or error according to §6.4.

A Wallet/Responder SHOULD choose a `fhirVersion` advertised in the request's `fhirVersions[]` when the original request included that field and the Wallet/Responder can produce responsive raw FHIR JSON in an advertised version. A Verifier SHALL reject an `application/fhir+json` Artifact whose `fhirVersion` is absent or not a string. A Verifier SHOULD treat an `application/fhir+json` Artifact whose `fhirVersion` is not acceptable for the original request or receiver as unsupported for ingestion, even if the SMART response is otherwise syntactically valid.

A raw FHIR JSON Artifact SHOULD NOT include an Artifact-level profile summary field. Wallets/Responders SHOULD preserve FHIR `meta.profile` values in the returned resource or in `Bundle.entry[].resource.meta.profile` where known. Verifiers and receivers SHOULD inspect the FHIR payload itself, especially `meta.profile`, rather than relying on a wrapper-level profile summary.

Example: raw FHIR JSON Bundle Artifact.

```json
{
  "id": "artifact-us-core-bundle",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["us-core-records"],
  "value": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "id": "patient-1",
          "meta": {
            "profile": [
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
            ]
          }
        }
      }
    ]
  }
}
```

#### 6.3.3 Generic and extension Artifacts

A generic or extension Artifact is any Artifact whose `mediaType` is not one of the core media types defined in §6.3.1 or §6.3.2.

A Wallet/Responder MAY return a generic or extension Artifact only when the Artifact `mediaType` is accepted by every request item listed in `fulfills[]`, subject to any registered compatibility rule. A generic or extension Artifact SHALL include `id`, `mediaType`, `fulfills`, and at least one of `value`, `url`, or `data`.

An extension registrant SHALL define the exact media type string; whether `value`, `url`, `data`, or a combination is used; payload shape; encoding; dereferencing and integrity rules; FHIR-version handling if any; status behavior; validation rules; security considerations; privacy considerations; and compatibility, if any, with core media types.

An extension registrant SHALL NOT define an Artifact media type that redefines the semantics of `type`, `version`, `requestId`, `artifacts[]`, `requestStatus[]`, `id`, `mediaType`, or `fulfills[]`.

If an extension Artifact contains raw FHIR content, its media type or extension profile SHALL define whether an outer `fhirVersion` is required and how it is validated. If no such rule exists, a Verifier SHALL NOT assume the Artifact has the same FHIR-version semantics as `application/fhir+json`.

#### 6.3.4 Examples

The examples in this subsection are illustrative. They do not define required clinical content, required profile selections, required Holder decisions, or fixed identifiers.

Example: response with a SMART Health Card Artifact, a raw FHIR JSON Artifact, and an item-level partial status.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req_123",
  "artifacts": [
    {
      "id": "artifact-insurance-shc",
      "mediaType": "application/smart-health-card",
      "fulfills": ["insurance-card"],
      "value": {
        "verifiableCredential": [
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9..."
        ]
      }
    },
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
  ],
  "requestStatus": [
    { "item": "insurance-card", "status": "fulfilled" },
    {
      "item": "us-core-records",
      "status": "partial",
      "message": "Shared available matching US Core resources."
    }
  ]
}
```

### 6.4 Status reporting

`requestStatus[]` reports the Wallet/Responder's outcome for every request item. It accounts for Holder decisions, Wallet capability, available Holder data sources, content selection, media-type support, and errors.

Each status entry has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

A Wallet/Responder SHALL include exactly one status entry for every item in the original SMART request. A Wallet/Responder SHALL set each `requestStatus[].item` to the exact `id` of one request item. A Wallet/Responder SHALL NOT include duplicate status entries for the same request item and SHALL NOT include a status entry for an item id that is not present in the original request.

A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every request item exactly once and contains no unknown item id.

A Wallet/Responder SHALL set `requestStatus[].status` to one of the following registered status codes:

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. At least one returned Artifact SHOULD list the item in `fulfills[]` unless the item is satisfied by a registered extension rule that does not require an Artifact. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. At least one returned Artifact SHOULD list the item in `fulfills[]`. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching shareable content, or no matching content remained after Holder decision and Wallet policy. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, or FHIR version well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use `unsupported` for an item whose `content.kind` is not understood when the request is otherwise processed and an item-level response is returned. A Wallet/Responder SHOULD use `unsupported` for a known selector shape that is syntactically acceptable at the request level but cannot be supported by the Wallet/Responder, including an unsupported extension selector, unsupported requested media types, unsupported FHIR release, unsupported Questionnaire features, or a material Questionnaire canonical/resource disagreement detected before answers are collected.

A Wallet/Responder SHOULD use `error` for operational failures such as local data-source failure, parsing failure in Holder data after item processing begins, failed conversion to an accepted Artifact media type, or unexpected Questionnaire processing failure. A Wallet/Responder SHOULD NOT use `error` merely because the Holder declined, no content was available, or the selector/media type was unsupported.

A Wallet/Responder MAY include `message` as a string explaining the status. A Wallet/Responder SHOULD keep `message` concise and avoid unnecessary sensitive details. A Verifier or receiver MAY display, log, or route `message` according to local policy and applicable privacy requirements, but SHALL NOT depend on `message` for machine-readable status semantics.

### 6.5 Many-to-many fulfillment

The SMART response model is Artifact-centered and status-explicit. Artifact boundaries do not have to mirror request item boundaries.

A Wallet/Responder MAY return one Artifact that fulfills multiple request items by listing multiple item ids in that Artifact's `fulfills[]`. This is appropriate when one payload naturally satisfies several requested items, such as a FHIR Bundle that includes resources responsive to both a broad clinical-history item and a narrower demographics item.

A Wallet/Responder MAY return multiple Artifacts that fulfill one request item by listing the same item id in multiple Artifacts' `fulfills[]`. This is appropriate when the Wallet/Responder has responsive content in separate packages, media types, FHIR versions, sources, or credentials.

A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry for the request item, regardless of how many Artifacts fulfill it. `requestStatus[]` reports the overall item outcome; `fulfills[]` reports which Artifact payloads support that outcome.

A Verifier SHALL evaluate all Artifacts that list an item in `fulfills[]` when validating or consuming that item. A receiver MAY choose which valid Artifacts to ingest or display according to workflow and local policy, but it SHALL NOT treat the mere presence of multiple Artifacts as a protocol error.

Example: one Artifact fulfills two items.

```json
{
  "id": "artifact-questionnaire-response",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["migraine-intake", "us-core-records"],
  "value": {
    "resourceType": "QuestionnaireResponse",
    "status": "completed",
    "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake"
  }
}
```

### 6.6 Cross-validation rules Verifiers apply

A Verifier validates a SMART response against the original SMART request before the Requester or downstream receiver consumes returned content. Shape validation of the SMART response alone is not sufficient.

A Verifier SHALL apply all of the following cross-validation rules:

1. **Request binding.** `SmartHealthCheckinResponse.requestId` SHALL exactly equal the original `SmartHealthCheckinRequest.id`.
2. **Artifact fulfillment references.** Every value in every Artifact `fulfills[]` SHALL resolve to exactly one `items[].id` in the original SMART request.
3. **Accepted media types.** For each Artifact and each item id in its `fulfills[]`, the Artifact `mediaType` SHALL appear in that request item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics.
4. **Status coverage.** `requestStatus[]` SHALL contain exactly one entry for every original request item and SHALL contain no entries for unknown or duplicate item ids.
5. **FHIR JSON version declaration.** Every `application/fhir+json` Artifact SHALL include `fhirVersion` as a non-empty string. The Verifier SHALL reject a raw FHIR JSON Artifact that omits `fhirVersion`.
6. **FHIR JSON version consistency.** A Verifier SHALL interpret every resource in one `application/fhir+json` Artifact under the Artifact's `fhirVersion`. If a Verifier detects resources in one raw FHIR JSON Artifact that require different FHIR releases, it SHALL reject that Artifact for ingestion and treat the affected item or items according to local error handling.
7. **SMART Health Card FHIR-version source.** A Verifier SHALL reject an `application/smart-health-card` Artifact with an outer `fhirVersion` and SHALL inspect the signed SMART Health Card credential payloads for FHIR-version semantics.
8. **Bundle and resource shape.** A Verifier SHALL reject an `application/fhir+json` Artifact whose `value` is not a FHIR JSON object with a string `resourceType`. If `value.resourceType` is `"Bundle"`, the Verifier SHALL process resources from `Bundle.entry[].resource` according to FHIR rules and the Artifact's `fhirVersion`.

A Verifier SHOULD inspect returned FHIR `meta.profile` values when deciding whether a raw FHIR JSON Artifact actually satisfies the request item's `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, or questionnaire expectations. For Bundles, this inspection SHOULD include `Bundle.entry[].resource.meta.profile`. Absence of `meta.profile` is not automatically a protocol error because §5 permits Wallet/Responder matching based on equivalent local knowledge or trusted conformance evidence, but receivers that require profile evidence for ingestion MAY reject or quarantine content that lacks the evidence they need.

A Verifier SHOULD preserve the distinction between response validation and downstream clinical acceptance. A SMART response can be syntactically valid and correctly bound to the original SMART request while still being incomplete, declined, unsupported, unsuitable for local ingestion, or insufficient under local clinical policy.

## Organizer notes

### Strengths

- Preserves the accepted clinical-content boundary: the SMART response is a transport-neutral JSON object distinct from mdoc, kiosk, and downstream workflow envelopes.
- Uses `requestId`, `mediaType`, `fulfills[]`, `fhirVersion`, `value.verifiableCredential[]`, and `requestStatus[]` shapes grounded in the active docs and TypeScript validators.
- Makes per-item status accounting explicit and aligns status meanings with T2.A downstream needs, including unsupported selectors and Questionnaire canonical/resource disagreement.
- States many-to-many fulfillment in both construction and validation terms.
- Separates raw FHIR JSON validation from SMART Health Card validation, especially the outer `fhirVersion` prohibition for SMART Health Cards.

### Caveats and open issues

- The active validators do not yet enforce every cross-validation rule drafted here, especially media-type acceptance against each fulfilled item and deep FHIR Bundle version/profile checks.
- The precise JSON Schema expression of “covers every request item exactly once” will need non-schema validation or fixture-level checks.
- The draft uses `unsupported` for material Questionnaire canonical/resource disagreement detected before collection; if organizers prefer `error` for some disagreement cases, §6.4 should be adjusted consistently with §5.4.2.4.
- `url` and `data` are kept generic because active code only validates their presence for extension Artifacts; dereferencing, encoding, and integrity rules must come from extension registrations or later transport profiles.

### Downstream dependencies

- Appendix B should encode core response shape, Artifact unions, `requestStatus[]` status-code values, SMART Health Card `fhirVersion` prohibition, and raw FHIR JSON `fhirVersion` requirement where JSON Schema can express them.
- Appendix H should supply detailed FHIR mapping guidance for Bundles, `meta.profile`, QuestionnaireResponse construction, resource type checks, profile-family evidence, and version comparisons.
- §13 should define registries for status codes, selector kinds, extension media types, and compatibility rules.
- §8 and §9 should carry this SMART response object without redefining clinical semantics, while adding transport/session validation and kiosk wrapper binding.
