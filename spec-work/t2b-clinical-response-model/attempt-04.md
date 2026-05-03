## 6. Clinical content — response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder answers a SMART request after Holder review, Wallet policy, and available Holder data sources have been considered. The SMART response remains distinct from the mdoc presentation response, kiosk submission envelope, completion notification, or any other transport wrapper that carries it.

A SMART response is artifact-centered. It binds to exactly one SMART request, carries zero or more returned Artifacts, links each returned Artifact to the request item or items it claims to fulfill, and reports one status for every request item whether or not an Artifact was produced.

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

A Wallet/Responder SHALL set `requestId` to the exact `id` value from the SMART request being answered. A Verifier SHALL reject a SMART response unless `requestId` is exactly equal, by string equality, to the original SMART request `id`.

`requestId` is a correlation value for this request/response pair. It is not a patient identifier, requester identifier, freshness proof, or clinical fact.

#### 6.1.4 `artifacts[]`

`artifacts` is the array of returned clinical Artifacts. A Wallet/Responder SHALL encode `artifacts` as an array. The array MAY be empty when no request item produces returned content, for example because all items are declined, unavailable, unsupported, or in error.

A Wallet/Responder SHALL encode each member of `artifacts[]` as an Artifact object under §6.2 and, when applicable, one of the concrete shapes in §6.3.

#### 6.1.5 `requestStatus[]`

`requestStatus` is the per-request-item status array. A Wallet/Responder SHALL encode `requestStatus` as an array of status objects under §6.4. A Wallet/Responder SHALL include exactly one `requestStatus[]` entry for each item in the original SMART request `items[]`, including items with no returned Artifact.

### 6.2 Artifact common shape

An Artifact is a response object that contains clinical content or references clinical content returned by a Wallet/Responder. Every Artifact has an `id`, declares a `mediaType`, identifies the request item or items it fulfills using `fulfills[]`, and carries or locates a body using `value`, `url`, or `data` as defined below.

The common shape is:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

#### 6.2.1 `id` uniqueness within response

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to a single SMART response. A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within one SMART response.

A Verifier SHALL reject a SMART response that contains an Artifact with a missing, non-string, empty, or duplicate `id`.

Artifact ids are not request item ids, patient identifiers, requester identifiers, or persistent clinical identifiers. A Wallet/Responder and Verifier SHALL compare Artifact ids using exact string equality when they need to reference them within a response or in diagnostics.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. The Artifact `mediaType` identifies the representation of the Artifact body. Artifacts use `mediaType`; they do not use a separate artifact-level protocol type discriminator.

Version 1.0 defines the core Artifact media types `application/smart-health-card` and `application/fhir+json` in §6.3. Extension Artifacts use registered or otherwise agreed media types as described in §6.3.3 and §13.

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` is acceptable for that item under the item `accept[]` list and any registered compatibility rule. A Verifier SHALL perform the corresponding cross-check under §6.6.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of strings on every Artifact. Each string in `fulfills[]` SHALL be the `id` of a request item from the original SMART request.

A Wallet/Responder SHALL NOT include unknown item ids in `fulfills[]`. A Verifier SHALL reject a SMART response if any `fulfills[]` value does not resolve to exactly one item in the original SMART request.

A Wallet/Responder MAY include more than one item id in one Artifact `fulfills[]` array when the same Artifact satisfies multiple request items. A Wallet/Responder MAY return multiple Artifacts whose `fulfills[]` arrays include the same item id when several Artifacts together satisfy or partially satisfy one request item.

#### 6.2.4 Body field: `value`, `url`, or `data`

An Artifact body is represented by one or more of `value`, `url`, and `data`:

- `value` carries an inline JSON value whose interpretation is defined by the Artifact `mediaType`.
- `url` carries a string locator for Artifact content. The core response model does not define authentication, dereferencing, caching, expiration, or integrity semantics for `url`. An extension media-type registrant or transport-profile author SHALL define those semantics before a receiver relies on dereferenced content.
- `data` carries a string representation of Artifact content. The core response model does not define a universal encoding for `data`. An extension media-type registrant or transport-profile author SHALL define the encoding, integrity expectations, and decoding rules before a receiver consumes `data`.

For `application/smart-health-card`, a Wallet/Responder SHALL use `value` with the shape in §6.3.1. For `application/fhir+json`, a Wallet/Responder SHALL use `value` with the shape in §6.3.2.

For generic or extension Artifacts, a Wallet/Responder SHALL include at least one of `value`, `url`, or `data`. If a Wallet/Responder includes more than one of these fields in the same extension Artifact, the extension media-type definition SHALL define how receivers interpret the fields together, including precedence and consistency checks. A receiver SHALL NOT infer such precedence from this core specification alone.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card artifact (`application/smart-health-card`)

A SMART Health Card Artifact represents SMART Health Card file JSON. It has this shape:

```json
{
  "id": "artifact-insurance-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance"],
  "value": {
    "verifiableCredential": [
      "<SMART Health Card Verifiable Credential JWS>"
    ]
  }
}
```

A Wallet/Responder that returns an Artifact with `mediaType` equal to `application/smart-health-card` SHALL include `value` as a JSON object containing `verifiableCredential`. `value.verifiableCredential` SHALL be a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS.

A Wallet/Responder SHALL NOT include an outer `fhirVersion` member on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that includes an outer `fhirVersion` member.

The SMART Health Card Artifact does not list profiles in the Artifact wrapper. A Verifier validates and interprets each signed credential payload according to SMART Health Cards and applicable trust policy. The FHIR version relevant to the SMART Health Card content is determined from the signed credential payload, not from a SMART Health Check-in outer `fhirVersion` field.

#### 6.3.2 Raw FHIR JSON artifact (`application/fhir+json`)

A raw FHIR JSON Artifact represents an inline FHIR Resource or Bundle as JSON. It has this shape:

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

A Wallet/Responder that returns an Artifact with `mediaType` equal to `application/fhir+json` SHALL include `fhirVersion` as a non-empty FHIR release-version string. A Wallet/Responder SHALL include `value` as a JSON object containing a FHIR `resourceType` member. A Verifier SHALL reject an `application/fhir+json` Artifact whose `fhirVersion` is missing or not a string, or whose `value` is absent or not a FHIR JSON object.

The `value` of an `application/fhir+json` Artifact MAY be a single FHIR Resource or a FHIR Bundle. If `value.resourceType` is `"Bundle"`, the Bundle SHALL contain only resources interpreted under the Artifact's `fhirVersion`. A Wallet/Responder SHALL NOT mix FHIR release versions within one `application/fhir+json` Bundle Artifact. If a Wallet/Responder needs to return raw FHIR JSON content from different FHIR releases, it SHALL use separate `application/fhir+json` Artifacts with appropriate `fhirVersion` values.

For a non-Bundle `application/fhir+json` Artifact, the single resource in `value` is interpreted under the Artifact's `fhirVersion`. For a Bundle Artifact, `Bundle.entry[].resource` resources are interpreted under the Artifact's `fhirVersion`; Bundle metadata and contained resources do not create a second outer FHIR-version declaration.

Raw FHIR JSON is patient-mediated clinical content unless the payload itself contains separate provenance, signatures, or other source evidence. Successful presentation transport does not by itself make an unsigned raw FHIR JSON Artifact equivalent to an issuer-signed clinical credential.

A raw FHIR JSON Artifact does not include an Artifact-level profile summary. Verifiers and response consumers inspect `value.meta.profile`, `Bundle.entry[].resource.meta.profile`, QuestionnaireResponse references, resource types, and other FHIR content as needed under §6.6 and Appendix H.

#### 6.3.3 Generic and extension artifacts

An extension Artifact is any Artifact whose `mediaType` is not one of the core media types defined in §6.3.1 and §6.3.2. A Wallet/Responder MAY return an extension Artifact only when the fulfilled request item accepts that media type, or when a registered media-type compatibility rule states that the extension Artifact satisfies a media type in the item `accept[]` list.

An extension media-type registrant SHALL define the Artifact body representation, including whether the Artifact uses `value`, `url`, `data`, or a defined combination of those fields. The registrant SHALL also define validation rules, fulfillment rules, status interactions, FHIR-version handling if any, security considerations, privacy considerations, and compatibility with any core or other extension media types.

An extension Artifact MAY include `fhirVersion` only when the extension media-type definition says that the Artifact body contains raw FHIR content or otherwise needs an outer FHIR release-version declaration. An extension media-type definition SHALL NOT redefine the semantics of `id`, `mediaType`, `fulfills[]`, `requestId`, `requestStatus[]`, `application/smart-health-card`, or `application/fhir+json`.

A Verifier that does not support an extension Artifact media type SHALL NOT treat the Artifact as fulfilling a request item unless a registered compatibility rule it supports applies. Unsupported extension Artifacts do not by themselves invalidate the entire SMART response when all required request-status and cross-validation rules are otherwise satisfied, but they cannot be consumed as fulfillment for an item the Verifier does not accept or understand.

#### 6.3.4 Examples

The examples in this subsection are illustrative. Example identifiers, FHIR content, JWS strings, and clinical selections are not fixed protocol values.

Example: SMART Health Card Artifact.

```json
{
  "id": "artifact-coverage-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance"],
  "value": {
    "verifiableCredential": [
      "eyJhbGciOiJFUzI1NiIsInppcCI6IkRFRiJ9..."
    ]
  }
}
```

Example: raw FHIR JSON single-resource Artifact.

```json
{
  "id": "artifact-patient",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["patient"],
  "value": {
    "resourceType": "Patient",
    "id": "example",
    "meta": {
      "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
    }
  }
}
```

Example: raw FHIR JSON Bundle Artifact.

```json
{
  "id": "artifact-clinical-history",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["clinical-history"],
  "value": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      {
        "resource": {
          "resourceType": "Condition",
          "id": "condition-example",
          "meta": {
            "profile": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"]
          },
          "clinicalStatus": {
            "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active" }]
          },
          "code": { "text": "Example condition" },
          "subject": { "reference": "Patient/example" }
        }
      }
    ]
  }
}
```

Example: complete response with no Artifacts for a declined item.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "example-checkin-request",
  "artifacts": [],
  "requestStatus": [
    {
      "item": "intake",
      "status": "declined",
      "message": "Holder declined to answer this item."
    }
  ]
}
```

### 6.4 Status reporting

`requestStatus[]` reports the Wallet/Responder's outcome for each original request item. Status reporting is required even when Artifacts are returned, because Artifact presence alone does not distinguish full fulfillment, partial fulfillment, Holder decline, unavailability, unsupported selectors, unsupported media types, or errors.

A status object has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

#### 6.4.1 Coverage of every request item exactly once

A Wallet/Responder SHALL include exactly one status object in `requestStatus[]` for each item in the original SMART request `items[]`. The status object's `item` member SHALL equal that request item's `id`. A Wallet/Responder SHALL NOT include status objects for unknown request item ids and SHALL NOT include duplicate status objects for the same request item id.

A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every original request item exactly once and contains no unknown or duplicate item ids.

#### 6.4.2 Status code registry

A Wallet/Responder SHALL set `requestStatus[].status` to one of the following version 1.0 status codes unless a future registered status code extension is explicitly accepted by the receiving Verifier.

| Status code | Meaning | Artifact expectation |
| --- | --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied, subject to Holder decision, available data, Wallet capability, and the request item's selector and `accept[]`. | One or more Artifacts normally fulfill the item, unless the item semantics explicitly permit completion without content. |
| `partial` | The Wallet/Responder returned some relevant content or completed part of the requested action, but does not claim complete fulfillment. This is appropriate for broad selectors, no-selector requests, incomplete Holder data sources, or selective Holder sharing of only part of an item. | One or more Artifacts usually fulfill the item. |
| `unavailable` | The Wallet/Responder understood the item and one or more acceptable response media types, but found no matching shareable content or no usable Holder data source for the item. | No Artifact normally fulfills the item. |
| `declined` | The Holder declined to share or complete the request item, or Wallet policy acting for Holder control prevented disclosure as a Holder decision outcome. | No Artifact normally fulfills the item; if local policy permits sharing a subset, use `partial` instead. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media types, required Questionnaire features, or a material Questionnaire canonical/resource disagreement detected before safe collection or response construction. | No Artifact normally fulfills the item. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy an item it otherwise understood and supported. | An Artifact MAY be absent or partial, depending on the failure and local policy. |

A Wallet/Responder SHALL use `unsupported`, not `unavailable`, when it cannot process the request item because the selector kind, selector shape, requested media type, or Questionnaire definition is not supported. A Wallet/Responder SHALL use `unavailable`, not `unsupported`, when it understands the item but lacks matching shareable content.

If both `questionnaire.canonical` and `questionnaire.resource` are supplied and a Wallet/Responder detects a material disagreement before collecting answers or constructing a response, the Wallet/Responder SHOULD report `unsupported` for that item. If the Wallet/Responder supports the Questionnaire form but an operational failure occurs while rendering, collecting, or constructing the response, it SHOULD report `error`.

#### 6.4.3 Optional `message`

A Wallet/Responder MAY include `message` as a string on any status object to provide a concise explanation intended for the Requester or response consumer. A Wallet/Responder SHALL NOT include secrets, access tokens, internal stack traces, unnecessary patient details, or unrelated Holder data in `message`.

A receiver MAY display, log, route, suppress, or localize `message` according to local policy, workflow needs, and privacy requirements. The machine-processable status code is `status`; receivers SHALL NOT rely on `message` to determine the normative status semantics.

### 6.5 Many-to-many fulfillment

The response model deliberately separates request item accounting from Artifact packaging.

#### 6.5.1 One Artifact may fulfill many items

A Wallet/Responder MAY return one Artifact whose `fulfills[]` contains multiple request item ids when the same clinical content satisfies multiple items. For example, a FHIR Bundle containing patient demographics and coverage resources might fulfill both a patient-demographics item and an insurance item, if `application/fhir+json` is accepted by both items and the Bundle content satisfies both selectors.

#### 6.5.2 One item may be fulfilled by many Artifacts

A Wallet/Responder MAY return multiple Artifacts whose `fulfills[]` contain the same request item id when several pieces of content together satisfy or partially satisfy one item. For example, a broad clinical-history item might be fulfilled by one raw FHIR JSON Bundle and one SMART Health Card, if both media types are accepted for that item.

For every claimed fulfillment edge between an Artifact and an item, the Artifact `mediaType` SHALL be accepted by that item under §5.6 and §6.6. Many-to-many fulfillment does not relax media-type, FHIR-version, selector, status, or validation rules.

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

### 6.6 Cross-validation rules a Verifier SHALL apply

A Verifier SHALL validate a SMART response against the original SMART request before passing returned content to the Requester or downstream workflow. Syntactic validity of the SMART response object is not enough; the response must be cross-checked against the request that it claims to answer.

#### 6.6.1 `requestId` match

A Verifier SHALL reject a SMART response unless `response.requestId` exactly equals the original SMART request `id`.

#### 6.6.2 `fulfills[]` references resolve

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not exactly match one `items[].id` value in the original SMART request. A Verifier SHALL reject a SMART response if an Artifact `fulfills[]` array is absent, empty, not an array of strings, or contains an unresolved item id.

#### 6.6.3 Artifact `mediaType` is accepted by each fulfilled item

For every Artifact and every item id in that Artifact's `fulfills[]`, a Verifier SHALL verify that the Artifact `mediaType` appears in the corresponding request item's `accept[]` list, unless a registered media-type compatibility rule supported by the Verifier defines compatible substitution semantics.

If one Artifact fulfills multiple items, the Verifier SHALL apply this check independently to every fulfilled item. If the media type is not accepted by any claimed fulfilled item, the Verifier SHALL reject the response or ignore that fulfillment edge according to a future error-handling profile; version 1.0 core validation treats the response as invalid for conformance purposes.

#### 6.6.4 `requestStatus[]` covers items uniquely

A Verifier SHALL reject a SMART response unless `requestStatus[]` contains exactly one status object for every original request item id, contains no status object for an unknown item id, and contains no duplicate `item` value.

The Verifier SHALL NOT infer that an item with no status entry is fulfilled merely because an Artifact references it. The status entry is the required per-item accounting record.

#### 6.6.5 FHIR version consistency for `application/fhir+json`

A Verifier SHALL reject an `application/fhir+json` Artifact unless it includes `fhirVersion` as a non-empty string and `value` as a FHIR JSON object. If the original SMART request included `fhirVersions[]`, the Verifier SHOULD verify that each raw FHIR JSON Artifact's `fhirVersion` is one of the requested FHIR versions, unless local policy or a future compatibility rule permits another version.

A Verifier SHALL interpret every non-Bundle `application/fhir+json` resource under the Artifact's `fhirVersion`. For a Bundle Artifact, a Verifier SHALL interpret the Bundle and all `Bundle.entry[].resource` resources under the Artifact's `fhirVersion`. A Verifier SHALL reject or quarantine an `application/fhir+json` Bundle when it detects mixed FHIR release versions inside one Bundle.

A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer `fhirVersion`. For SMART Health Card Artifacts, a Verifier determines FHIR-version semantics from each signed credential payload under SMART Health Cards rather than from an outer SMART Health Check-in wrapper field.

#### 6.6.6 Bundle and `meta.profile` guidance

A Verifier SHOULD inspect FHIR `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related FHIR content when validating that returned raw FHIR JSON is responsive to the original selector. This specification does not require a Verifier to perform full FHIR profile validation for every returned resource as part of core SMART Health Check-in response validation.

A Verifier SHOULD treat `meta.profile` as evidence to be evaluated in context, not as an Artifact-level shortcut. An Artifact SHOULD NOT include a separate profile-summary field outside the FHIR payload. If a request used `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, or `questionnaire` selectors, response consumers should use Appendix H guidance to decide how much profile-family membership, resource-type checking, QuestionnaireResponse checking, and canonical `|version` comparison is needed for their workflow.

## Organizer notes

### Strengths

- Preserves the accepted layering: the SMART response is a transport-neutral clinical JSON object and remains separate from mdoc and kiosk envelopes.
- Makes `requestId`, `fulfills[]`, `accept[]`, `requestStatus[]`, and raw-FHIR `fhirVersion` cross-checks explicit for Verifiers.
- Keeps Artifact typing media-type based, with SMART Health Cards using `value.verifiableCredential[]` and no outer `fhirVersion`.
- Defines status semantics tightly enough to cover Holder decisions, Wallet outcomes, unsupported selectors, media-type mismatch, and Questionnaire canonical/resource disagreement.
- Keeps many-to-many fulfillment as a first-class model without weakening per-item status accounting.

### Caveats and open issues

- The active code permits generic Artifacts with `value`, `url`, or `data`, but does not define a universal `data` encoding or `url` dereferencing model. This draft therefore requires extension media-type definitions to supply those semantics.
- Current active validators cross-check `requestId`, `fulfills[]`, and `requestStatus[]` coverage, but do not yet enforce every proposed Verifier check, such as `accept[]` media-type cross-checking or FHIR Bundle mixed-version detection.
- The exact conformance behavior for receiving unsupported extension Artifacts could be refined by §4 conformance classes and §13 registries.
- Appendix B should decide whether JSON Schema can express the “exactly once per request item” and “mediaType accepted by fulfilled item” constraints or whether those remain procedural validation rules.

### Downstream dependencies

- Appendix H should align Bundle handling, `meta.profile`, profile-family membership, `QuestionnaireResponse.questionnaire`, and canonical `|version` comparison with §§5–6.
- §13 should define media-type, selector-kind, and status-code registry procedures, including compatibility rules.
- §8 and §9 should carry this SMART response unchanged inside same-device and kiosk transport wrappers, and should invoke §6.6 validation after extraction/decryption.
- §11 and §12 should revisit status messages, raw FHIR provenance, extension `url` dereferencing, and response retention from security and privacy perspectives.
