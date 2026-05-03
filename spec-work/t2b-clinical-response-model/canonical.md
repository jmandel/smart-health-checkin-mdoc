## 6. Clinical content — response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder answers a SMART request after Holder review, Wallet policy, and available Holder data sources have been applied. The same SMART response semantics apply when the object is returned by the same-device presentation flow or carried by a future binding.

Presentation transports can wrap, encrypt, authenticate, retain, or relay a SMART response, but they do not change the meaning of `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, or `requestStatus[]`. A SMART response is distinct from mdoc envelopes, Digital Credentials API response objects, implementation-defined hand-off records, completion acknowledgments, and downstream EHR ingestion records.

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

A Verifier SHALL reject a SMART response whose `version` member is absent or is not exactly `"1"`, unless a future version-compatibility rule explicitly defines compatible handling for another value.

#### 6.1.3 `requestId`

A Wallet/Responder SHALL set `requestId` to the exact `id` value from the SMART request being answered. A Verifier SHALL compare `requestId` to the original request `id` using exact string equality and SHALL reject a SMART response when the values differ.

`requestId` is a correlation value for the clinical exchange. It is not a patient identifier, requester identifier, presentation-session identifier, freshness proof, or clinical fact. Presentation bindings can add separate session freshness and replay controls; those controls do not replace the `requestId` binding required here.

#### 6.1.4 `artifacts[]`

`artifacts` is the list of clinical Artifacts returned by the Wallet/Responder. A Wallet/Responder SHALL encode `artifacts` as an array. The array MAY be empty when no request item produces a returned Artifact, provided `requestStatus[]` still accounts for every request item as defined in §6.4.

A Wallet/Responder SHALL encode each member of `artifacts[]` as an Artifact following §6.2 and the applicable concrete Artifact rules in §6.3.

The order of `artifacts[]` has no clinical fulfillment meaning unless a registered Artifact media type defines order-sensitive semantics inside its own payload. Requesters and receivers use Artifact `id`, `mediaType`, `fulfills[]`, status entries, and payload contents rather than array position to determine response meaning.

#### 6.1.5 `requestStatus[]`

`requestStatus` is the per-request-item outcome list. A Wallet/Responder SHALL encode `requestStatus` as an array of status objects following §6.4. The `requestStatus[]` array is required even when every item is fulfilled, because it records item-level outcomes and preserves accounting for declined, unavailable, unsupported, partial, and error outcomes.

### 6.2 Artifact common shape

An Artifact is a response object that contains clinical content or references clinical content returned by a Wallet/Responder. Every Artifact has this common shape, with media-type-specific fields as applicable:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "<media-type-specific-payload>": {}
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` on every Artifact. A Wallet/Responder SHALL also include the payload fields defined for the Artifact's media type.

#### 6.2.1 `id` uniqueness within response

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to a single SMART response and are stable only within that response.

A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within a single SMART response. A Verifier SHALL reject a SMART response with a missing, non-string, empty, or duplicate Artifact `id`.

A Requester or receiver SHALL NOT treat Artifact ids as patient identifiers, requester identifiers, global document identifiers, or clinical provenance identifiers unless that meaning is separately established by the Artifact payload or deployment policy.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. `mediaType` declares the clinical response form of the Artifact. Artifacts use `mediaType`; they do not use a separate Artifact-level protocol `type` discriminator.

Version 1.0 defines these core Artifact media types:

| Media type | Artifact class | Summary |
| --- | --- | --- |
| `application/smart-health-card` | SMART Health Card Artifact | `value` is a SMART Health Card file-style JSON object with `verifiableCredential[]`. |
| `application/fhir+json` | Raw FHIR JSON Artifact | `value` is a raw FHIR Resource or Bundle, and the Artifact declares `fhirVersion`. |

The version 1.0 core Artifact union is closed over these two core variants. A version 1.0 Verifier SHALL NOT treat an unrecognized `mediaType` as a generic Artifact merely because it carries a field named `value`, `url`, `data`, or another plausible carrier.

The Artifact type list is extensible by future SMART Health Check-in versions and by registered or profiled extension Artifact media types. Each extension Artifact type SHALL be a branded variant that pins a specific `mediaType` literal or clearly bounded media-type pattern and defines its own typed payload fields. The base protocol does not define generic carrier semantics for unknown media types.

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. A Verifier SHALL enforce the same check under §6.6.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids on every Artifact. Each value in `fulfills[]` SHALL exactly equal the `id` of an item in the original SMART request.

A Wallet/Responder MAY list more than one request item id in `fulfills[]` when one Artifact satisfies multiple items. If the same Artifact fulfills multiple items, the Artifact's `mediaType` SHALL be acceptable for every item listed in `fulfills[]`.

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not resolve to exactly one request item in the original SMART request.

#### 6.2.4 Payload fields are media-type-specific

An Artifact's payload-bearing fields are defined by its branded Artifact variant.

For the two core media types defined in this section, a Wallet/Responder SHALL use `value` as the payload field. A SMART Health Card Artifact SHALL use `value.verifiableCredential[]` as defined in §6.3.1. A raw FHIR JSON Artifact SHALL use `value` as the FHIR Resource or Bundle as defined in §6.3.2.

Registered or profiled extension Artifact types MAY define `value`, a structured locator, an encoded payload field, or any other typed fields appropriate for that media type. Such fields have only the semantics assigned by the registered or profiled extension Artifact definition. The protocol does not define a generic `value` / `url` / `data` catch-all, and it does not define a rule that allows multiple generic carrier keys to coexist with media-type-defined merge semantics.

A Verifier or receiver SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration rules from a field name alone. Those rules come from a recognized core Artifact definition, a supported registered or profiled extension Artifact definition, a transport binding, or local policy.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card artifact (`application/smart-health-card`)

A SMART Health Card Artifact represents one or more SMART Health Card Verifiable Credential JWS strings in the same JSON shape used by SMART Health Card file download.

A Wallet/Responder that returns a SMART Health Card Artifact SHALL set `mediaType` to `"application/smart-health-card"` and SHALL include `value` as a JSON object containing `verifiableCredential`.

A Wallet/Responder SHALL encode `value.verifiableCredential` as a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS. A Verifier or receiver that consumes this Artifact SHALL verify and process each JWS according to SMART Health Cards and local trust policy.

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer `fhirVersion`. FHIR content and FHIR version semantics for this Artifact class are inside the signed SMART Health Card credential payloads, not in the SMART Health Check-in Artifact wrapper.

A SMART Health Card Artifact SHALL NOT use an Artifact-level profile summary field to claim conformance to request selectors. A Verifier validates clinical suitability by inspecting signed payload content, including FHIR resources and their `meta.profile` values where present, and by applying the original request selectors and local policy.

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

#### 6.3.2 Raw FHIR JSON artifact (`application/fhir+json`)

A raw FHIR JSON Artifact represents patient-mediated FHIR JSON content. It is not independently issuer-signed unless the payload itself contains a proof, signature, Provenance, or other evidence. Successful presentation transport proves the transaction and transport binding defined by the selected flow; it does not by itself prove the clinical provenance of unsigned raw FHIR JSON.

A Wallet/Responder that returns a raw FHIR JSON Artifact SHALL set `mediaType` to `"application/fhir+json"`, SHALL include `fhirVersion` as a non-empty FHIR release-version string, and SHALL include `value` as a FHIR JSON object.

A raw FHIR JSON Artifact `value` SHALL be one of:

1. a single FHIR Resource JSON object with `resourceType` present as a string; or
2. a FHIR Bundle JSON object with `resourceType` equal to `"Bundle"` and `entry[]` resources when the Artifact packages multiple resources.

A Wallet/Responder SHOULD use a Bundle when returning multiple FHIR resources in a single `application/fhir+json` Artifact. A Wallet/Responder MAY return a single resource directly when the Artifact contains only that resource.

A Wallet/Responder SHALL interpret all FHIR resources in one `application/fhir+json` Artifact under the Artifact's `fhirVersion`. A Wallet/Responder SHALL NOT mix resources requiring different FHIR releases within the same `application/fhir+json` Artifact. When responsive content uses different FHIR releases, the Wallet/Responder SHALL return separate `application/fhir+json` Artifacts, each with its own `fhirVersion`, or report the affected item as partial, unavailable, unsupported, or error according to §6.4.

A Wallet/Responder SHOULD choose a `fhirVersion` advertised in the request's `fhirVersions[]` when the original request included that field and the Wallet/Responder can produce responsive raw FHIR JSON in an advertised version. A Verifier SHALL reject an `application/fhir+json` Artifact whose `fhirVersion` is absent or not a non-empty string. A Verifier SHOULD treat an `application/fhir+json` Artifact whose `fhirVersion` is not acceptable for the original request or receiver as unsupported for ingestion, even if the SMART response is otherwise syntactically valid.

A raw FHIR JSON Artifact SHOULD NOT include an Artifact-level profile summary field. Wallets/Responders SHALL preserve FHIR `meta.profile` strings in the returned resource or in `Bundle.entry[].resource.meta.profile` where known, including any `|version` suffixes preserved under §5.5. Wallets/Responders SHALL NOT strip or normalize version suffixes from source `meta.profile` strings when constructing a raw FHIR JSON Artifact. Verifiers and receivers SHOULD inspect the FHIR payload itself, especially `meta.profile`, rather than relying on a wrapper-level profile summary.

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

#### 6.3.3 Extensible Artifact variants

Future SMART Health Check-in versions and registered or profiled extension Artifact media types can define additional Artifact variants beyond the two version 1.0 core variants in §6.3.1 and §6.3.2.

A Wallet/Responder MAY return an extension Artifact only when the Artifact `mediaType` is accepted by every request item listed in `fulfills[]`, subject to any registered compatibility rule, and when the Wallet/Responder can construct the Artifact according to a recognized extension Artifact definition. The extension Artifact SHALL include `id`, `mediaType`, `fulfills`, and the typed payload fields required by that definition.

An extension registrant SHALL define the exact media type string or bounded media-type pattern; the branded Artifact variant name; all required and optional typed payload fields; payload shape; encoding; dereferencing and integrity rules; FHIR-version handling if any; status behavior; validation rules; security considerations; privacy considerations; and compatibility, if any, with core media types.

An extension registrant SHALL NOT define only an unbounded `mediaType: string` catch-all and SHALL NOT rely on protocol-level generic `value`, `url`, or `data` carrier semantics for unknown media types. If an extension needs a URL pointer, inline JSON payload, encoded data blob, manifest, or combination of fields, those fields and their interaction rules SHALL be part of that extension Artifact's own typed definition.

An extension registrant SHALL NOT define an Artifact media type that redefines the semantics of `type`, `version`, `requestId`, `artifacts[]`, `requestStatus[]`, `id`, `mediaType`, or `fulfills[]`.

If an extension Artifact contains raw FHIR content, its media type or extension profile SHALL define whether an outer `fhirVersion` is required and how it is validated. If no such rule exists, a Verifier SHALL NOT assume the Artifact has the same FHIR-version semantics as `application/fhir+json`.

#### 6.3.4 Examples

The examples in this subsection are illustrative. They do not define required clinical content, required profile selections, required Holder decisions, or fixed identifiers.

Example: response with a SMART Health Card Artifact, a raw FHIR JSON Artifact, and item-level status.

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

Example: extension Artifact with a typed document locator. This example is not a core media type and does not define a registered extension.

```json
{
  "id": "artifact-extension-document",
  "mediaType": "application/example-clinical-document+json",
  "fulfills": ["document-request"],
  "document": {
    "url": "https://example.invalid/checkin/artifacts/artifact-extension-document",
    "integrity": "sha256-..."
  }
}
```

The extension example's `document` field shape and dereferencing, authorization, integrity, retention, and expiration semantics would need to be defined by the extension media-type registration before interoperable use.

### 6.4 Status reporting

`requestStatus[]` reports the Wallet/Responder's outcome for every request item. It accounts for Holder decisions, Wallet capability, available Holder data sources, content selection, media-type support, and errors. Status is per request item, not per Artifact.

Each status entry has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

#### 6.4.1 `requestStatus[]` covers every request item exactly once

A Wallet/Responder SHALL include exactly one status entry for every item in the original SMART request. A Wallet/Responder SHALL set each `requestStatus[].item` to the exact `id` of one request item. A Wallet/Responder SHALL NOT include duplicate status entries for the same request item and SHALL NOT include a status entry for an item id that is not present in the original request.

A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every request item exactly once and contains no unknown item id.

If the original SMART request contains zero items, a conforming Wallet/Responder still SHALL include `requestStatus` as an array. Appendix B and conformance closure are expected to decide whether zero-item requests become prohibited; §5.2.6 currently makes non-empty `items[]` a SHOULD rather than a hard requirement.

#### 6.4.2 Status code registry

A Wallet/Responder SHALL set `requestStatus[].status` to one of the following version 1.0 status codes unless a future registered status-code extension is explicitly supported by the receiving Verifier.

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without a Holder refusal being the relevant cause. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, `questionnaireCanonical`/`questionnaire` combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use `unsupported`, not `unavailable`, when it cannot process the request item because the selector kind, selector shape, requested media type, FHIR version, or Questionnaire definition is not supported. A Wallet/Responder SHALL use `unavailable`, not `unsupported`, when it understands the item but lacks matching shareable content.

A Wallet/Responder SHOULD use `unsupported` for a material `questionnaireCanonical`/`questionnaire` disagreement detected before answers are collected or response construction begins. A Wallet/Responder SHOULD use `error` for an operational failure that occurs while rendering, collecting, converting, or constructing a response for a Questionnaire that the Wallet/Responder otherwise understood.

A Wallet/Responder SHALL use `declined` when the relevant reason for non-fulfillment is the Holder's decision not to share or complete the item. A Wallet/Responder MAY also use `declined` when local Wallet policy implements Holder preferences that prohibit disclosure for the item.

A Wallet/Responder SHALL use `partial` when it returns responsive content but does not claim complete satisfaction, including when only a subset of matching FHIR resources is shared for a broad selector or when Holder decisions or Wallet policy permit only a subset of available content.

A Wallet/Responder SHALL use `fulfilled` only when it believes the item is fully satisfied. `fulfilled` is the Wallet/Responder's response-construction claim; it does not prevent a Verifier from rejecting the response during validation or a Requester from applying stricter downstream clinical policy.

A Wallet/Responder SHALL use `error` when a processing failure prevents normal outcome classification. Error status is appropriate for transient data-source failures, internal exceptions, parsing failures in Holder data after item processing begins, failed conversion to an accepted Artifact media type, or response-construction failures. A Wallet/Responder SHOULD avoid placing sensitive diagnostics in `message`.

A `fulfilled` or `partial` status SHOULD have at least one Artifact whose `fulfills[]` includes the item id unless a registered extension explicitly defines a non-Artifact fulfillment pattern. An item with `declined`, `unavailable`, or `unsupported` status normally has no fulfilling Artifact. A Verifier SHOULD flag inconsistent status-to-Artifact combinations according to local policy or stricter deployment profiles.

A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless a future status-code registry entry is explicitly supported by that Verifier.

#### 6.4.3 Optional `message`

A Wallet/Responder MAY include `message` as a string on any status object to provide a concise explanation intended for the Requester or response consumer. A Wallet/Responder SHALL NOT include secrets, access tokens, internal stack traces, unnecessary patient details, or unrelated Holder data in `message`.

A receiver MAY display, log, route, suppress, or localize `message` according to local policy, workflow needs, and privacy requirements. The machine-processable status code is `status`; receivers SHALL NOT rely on `message` to determine the normative status semantics.

### 6.5 Many-to-many fulfillment

The SMART response model is Artifact-centered and status-explicit. Artifact boundaries do not have to mirror request item boundaries.

#### 6.5.1 One artifact may fulfill many items

A Wallet/Responder MAY return one Artifact whose `fulfills[]` contains multiple request item ids when the same clinical content satisfies multiple items. For example, a FHIR Bundle that includes patient demographics and coverage resources might fulfill both a patient-demographics item and an insurance item if `application/fhir+json` is accepted by both items and the Bundle content satisfies both selectors.

#### 6.5.2 One item may be fulfilled by many artifacts

A Wallet/Responder MAY return multiple Artifacts whose `fulfills[]` contain the same request item id when several pieces of content together satisfy or partially satisfy one item. For example, a broad clinical-history item might be fulfilled by one raw FHIR JSON Bundle and one SMART Health Card if both media types are accepted for that item.

For every claimed fulfillment edge between an Artifact and an item, the Artifact `mediaType` SHALL be accepted by that item under §5.6 and §6.6. Many-to-many fulfillment does not relax media-type, FHIR-version, selector, status, or validation rules.

A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry for the item, regardless of how many Artifacts fulfill it. `requestStatus[]` reports the overall item outcome; `fulfills[]` reports which Artifact payloads support that outcome.

A Verifier SHALL evaluate all Artifacts that list an item in `fulfills[]` when validating or consuming that item. A receiver MAY choose which valid Artifacts to ingest or display according to workflow and local policy, but it SHALL NOT treat the mere presence of multiple Artifacts as a protocol error.

#### 6.5.3 Example: shared QuestionnaireResponse

The following example is illustrative. It shows one FHIR `QuestionnaireResponse` Artifact that claims to fulfill both an intake item and a broader clinical-history item. This is valid only if `application/fhir+json` is accepted by both items and the returned QuestionnaireResponse is responsive to both selectors under the original request.

```json
{
  "id": "artifact-questionnaire-response",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["intake", "clinical-history"],
  "value": {
    "resourceType": "QuestionnaireResponse",
    "status": "completed",
    "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
  }
}
```

### 6.6 Cross-validation rules Verifier SHALL apply

A Verifier validates a SMART response against the original SMART request before the Requester or downstream receiver consumes returned content. Shape validation of the SMART response alone is not sufficient.

#### 6.6.1 `requestId` match

A Verifier SHALL reject a SMART response unless `SmartHealthCheckinResponse.requestId` exactly equals the original `SmartHealthCheckinRequest.id`.

#### 6.6.2 `fulfills[]` references resolve

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not exactly match one `items[].id` value in the original SMART request. A Verifier SHALL reject a SMART response if an Artifact `fulfills[]` array is absent, empty, not an array of strings, or contains an unresolved item id.

#### 6.6.3 Artifact `mediaType` is recognized and in each fulfilled item's `accept[]`

For every Artifact, a Verifier SHALL verify that the Artifact `mediaType` is one of the version 1.0 core media types or a registered or profiled extension Artifact media type that the Verifier explicitly supports. A Verifier SHALL reject an Artifact whose `mediaType` is unrecognized, even if the Artifact includes a field named `value`, `url`, `data`, or another plausible carrier.

For every Artifact and every item id in that Artifact's `fulfills[]`, a Verifier SHALL verify that the Artifact `mediaType` appears in the corresponding request item's `accept[]` list, unless a registered media-type compatibility rule supported by the Verifier defines compatible substitution semantics.

If one Artifact fulfills multiple request items, the Verifier SHALL apply this check independently to every fulfilled item.

#### 6.6.4 `requestStatus` covers items uniquely

A Verifier SHALL reject a SMART response unless `requestStatus[]` contains exactly one status object for every original request item id, contains no status object for an unknown item id, and contains no duplicate `item` value.

The Verifier SHALL NOT infer that an item with no status entry is fulfilled merely because an Artifact references it. The status entry is the required per-item accounting record.

#### 6.6.5 FHIR version consistency

For every `application/fhir+json` Artifact, a Verifier SHALL confirm that `fhirVersion` is present as a non-empty string and that `value` is a FHIR JSON object with a string `resourceType`. If the original SMART request included `fhirVersions[]`, the Verifier SHOULD verify that each raw FHIR JSON Artifact's `fhirVersion` is one of the requested FHIR versions, unless local policy or a future compatibility rule permits another version.

A Verifier SHALL interpret every non-Bundle `application/fhir+json` resource under the Artifact's `fhirVersion`. For a Bundle Artifact, a Verifier SHALL interpret the Bundle and all `Bundle.entry[].resource` resources under the Artifact's `fhirVersion`. A Verifier SHALL reject or quarantine an `application/fhir+json` Bundle when it detects mixed FHIR release versions inside one Bundle.

A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer Artifact-level `fhirVersion`. For SMART Health Card Artifacts, a Verifier determines FHIR-version semantics from each signed credential payload under SMART Health Cards rather than from an outer SMART Health Check-in wrapper field.

#### 6.6.6 Bundle and `meta.profile` guidance

A Verifier SHOULD inspect returned FHIR `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related FHIR content when validating that returned raw FHIR JSON is responsive to the original selector. Absence of `meta.profile` is not automatically a protocol error because §5 permits Wallet/Responder matching based on equivalent local knowledge or trusted conformance evidence, but a Wallet/Responder SHALL NOT report `fulfilled` for a request item that requested a versioned profile unless the returned resource's `meta.profile` includes that exact versioned canonical or the Wallet/Responder has equivalent local conformance evidence for that exact profile version. When validating a raw FHIR JSON Artifact's claimed fulfillment of a versioned profile request, a Verifier SHALL require the same exact-version evidence before accepting that fulfillment edge. Receivers that require profile evidence for ingestion MAY reject or quarantine content that lacks the evidence they need.

A Verifier SHALL preserve returned `meta.profile` strings exactly as asserted in the FHIR payload when evaluating, recording, or forwarding them. In particular, a Verifier SHALL NOT strip a `|version` suffix from a returned `meta.profile` string in order to satisfy an exact-version profile request.

For `profilesFrom[]`, a Verifier MAY need implementation-guide, profile-family, or local policy knowledge outside the SMART response to decide whether a returned profile belongs to the requested profile family. A Verifier SHOULD treat `meta.profile` as evidence to be evaluated in context, not as an Artifact-level shortcut. A Wallet/Responder SHOULD NOT include a separate profile-summary field outside the FHIR payload for core raw FHIR JSON Artifacts.

For questionnaire items returning `application/fhir+json`, a Verifier SHOULD validate that the returned resource is a `QuestionnaireResponse` and that `QuestionnaireResponse.questionnaire`, when present, preserves the requested Questionnaire canonical and `|version` according to §5.5. If the request supplied both a Questionnaire canonical and inline resource and the Wallet/Responder reported the item as `unsupported` because of material disagreement, the Verifier SHOULD treat that as a valid item outcome rather than a transport failure.

A Verifier SHOULD preserve the distinction between response validation and downstream clinical acceptance. A SMART response can be syntactically valid and correctly bound to the original SMART request while still being incomplete, declined, unsupported, unsuitable for local ingestion, or insufficient under local clinical policy.
