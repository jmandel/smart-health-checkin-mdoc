## 6. Clinical content — response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder reports the outcome of a SMART request. The SMART response is distinct from any mdoc presentation, Digital Credentials API result, kiosk submission envelope, completion notification, or future presentation binding that carries it.

A SMART response binds to exactly one SMART request through `requestId`. It returns zero or more clinical Artifacts, links Artifacts to the request items they fulfill, and reports one per-item outcome for every request item. Transport bindings can add signatures, encryption, session binding, origin or reader evidence, relay metadata, and delivery state, but they do not change the clinical meaning of `requestId`, Artifact `mediaType`, Artifact `fulfills[]`, or `requestStatus[]`.

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

`requestId` is a correlation value, not a patient identifier, requester identifier, proof of freshness, or clinical fact. Presentation bindings can add separate session freshness or replay controls; those controls do not replace the `requestId` binding required here.

#### 6.1.4 `artifacts[]`

A Wallet/Responder SHALL include `artifacts` as an array. Each member of `artifacts[]` SHALL be an Artifact object as defined in §§6.2–6.3. The array MAY be empty when no request item produces an Artifact, for example when all items are declined, unavailable, unsupported, or fail before content can be produced.

The order of `artifacts[]` has no clinical meaning unless a registered Artifact media type defines order-sensitive semantics within its own payload. A Requester or receiver MAY display, store, or process Artifacts in any order after successful validation.

#### 6.1.5 `requestStatus[]`

A Wallet/Responder SHALL include `requestStatus` as an array. Each member of `requestStatus[]` SHALL be a request-item status object as defined in §6.4. The array SHALL contain exactly one entry for each `SmartHealthCheckinRequest.items[].id` in the original request and SHALL NOT contain any entry for an item id that is not present in the original request.

Per-item status is required even when an item is fulfilled by one or more Artifacts. Per-item status is also required when no Artifact is returned for an item, so Holder decisions and Wallet outcomes remain visible to the Requester.

### 6.2 Artifact common shape

An Artifact is a response object that contains or references clinical content. Every Artifact has this common shape:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` on every Artifact. An Artifact SHALL include at least one body field as defined in §6.2.4 and in the media-type-specific rules in §6.3.

#### 6.2.1 `id` uniqueness within the response

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to one SMART response. A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within a single SMART response.

A Verifier SHALL reject a SMART response with a missing, non-string, empty, or duplicate Artifact `id`. A Requester or receiver SHALL NOT treat an Artifact `id` as globally unique, as a patient identifier, as a requester identifier, or as clinical content.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. `mediaType` identifies the representation and interpretation of the Artifact body. It is the response-form discriminator for Artifacts; this specification does not define a separate Artifact-level protocol `type` discriminator.

Version 1.0 defines the core Artifact media types `application/smart-health-card` and `application/fhir+json`. Other media types are extension Artifacts and are governed by §6.3.3 and the registry rules in §13.

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]` list, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. A Verifier SHALL enforce this check for every `artifacts[].fulfills[]` reference.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item id strings on every Artifact. Each value in `fulfills[]` SHALL equal the `id` of an item in the original SMART request. A Wallet/Responder SHALL use exact string values from the original request and SHALL NOT rewrite, normalize, or infer item ids from display text.

A Verifier SHALL reject a SMART response when any Artifact `fulfills[]` value does not resolve to exactly one item in the original request. A Verifier SHALL also reject a response when a `fulfills[]` value resolves to an item whose `accept[]` list does not accept the Artifact `mediaType`, unless a registered compatibility rule applies.

#### 6.2.4 Body field: `value`, `url`, or `data`

An Artifact body is carried by one or more of these fields:

- `value`: a JSON value whose interpretation is defined by `mediaType`;
- `url`: a string locator for content whose dereferencing, authorization, lifetime, integrity, and privacy semantics are defined by `mediaType` or by a registered profile for that media type; or
- `data`: a string containing embedded non-JSON bytes or text encoded as defined by `mediaType` or by a registered profile for that media type.

A Wallet/Responder SHALL use the body field required by the Artifact's `mediaType` definition. For `application/smart-health-card`, the body field is `value` as defined in §6.3.1. For `application/fhir+json`, the body field is `value` as defined in §6.3.2.

For extension Artifacts, a Wallet/Responder SHALL include at least one of `value`, `url`, or `data`. If an extension Artifact includes more than one of these fields, the extension media-type definition or registered profile SHALL define how the fields are interpreted together, including precedence, integrity, and failure behavior. A Verifier that does not support the extension definition SHALL NOT guess how multiple body fields combine.

This section does not define a universal dereferencing protocol for `url`, a universal encoding for `data`, or a universal maximum Artifact size. Those constraints belong to the relevant media-type registration, transport binding, deployment profile, or conformance schema.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card artifact (`application/smart-health-card`)

A SMART Health Card Artifact has `mediaType` equal to `application/smart-health-card` and carries a SMART Health Card file-like JSON object in `value`:

```json
{
  "id": "artifact-insurance-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance-card"],
  "value": {
    "verifiableCredential": [
      "<SMART Health Card Verifiable Credential JWS>"
    ]
  }
}
```

A Wallet/Responder returning an `application/smart-health-card` Artifact SHALL include `value` as a JSON object with `verifiableCredential` as a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS.

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` member on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that includes an outer `fhirVersion` member. The FHIR version, clinical payload, issuer signature, and other SMART Health Card semantics are determined by inspecting and validating each signed credential payload according to SMART Health Cards and applicable trust policy.

An `application/smart-health-card` Artifact SHALL NOT use an Artifact-level profile summary field to claim conformance to request selectors. A Verifier validates clinical suitability by inspecting signed payload content, including FHIR resources and their `meta.profile` values where present, and by applying the original request selectors and local policy.

#### 6.3.2 Raw FHIR JSON artifact (`application/fhir+json`)

A raw FHIR JSON Artifact has `mediaType` equal to `application/fhir+json`, carries raw FHIR JSON in `value`, and declares the FHIR release version in `fhirVersion`:

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

A Wallet/Responder returning an `application/fhir+json` Artifact SHALL include `fhirVersion` as a non-empty FHIR release-version string. A Verifier SHALL reject an `application/fhir+json` Artifact whose `fhirVersion` is absent or not a non-empty string.

A Wallet/Responder returning an `application/fhir+json` Artifact SHALL include `value` as a FHIR JSON Resource object or a FHIR JSON Bundle object. The `value` object SHALL include `resourceType` as required by FHIR JSON. If `value.resourceType` is `"Bundle"`, every included `entry[].resource` resource SHALL be interpreted under the Artifact's `fhirVersion`. If `value.resourceType` is not `"Bundle"`, the Artifact represents a single FHIR resource interpreted under the Artifact's `fhirVersion`.

A Wallet/Responder SHALL NOT place resources from different FHIR release versions in the same `application/fhir+json` Bundle Artifact. When responsive raw FHIR JSON content uses different FHIR release versions, the Wallet/Responder SHALL return separate `application/fhir+json` Artifacts, each with its own `fhirVersion`, or SHALL report affected items as partial, unavailable, unsupported, or error as appropriate under §6.4.

A raw FHIR JSON Artifact is patient-mediated clinical content. The surrounding presentation transport can prove transaction binding and protect delivery, but it does not by itself make unsigned raw FHIR JSON equivalent to issuer-signed clinical credentials. If a raw FHIR JSON payload carries Provenance, signatures, or other source evidence, a Verifier processes that evidence according to FHIR, applicable profiles, and local policy.

A Wallet/Responder SHOULD preserve relevant FHIR `meta.profile` values in returned resources when those values support selector matching or receiver validation. A Wallet/Responder SHALL NOT remove `|version` suffixes from returned `meta.profile` values merely because request matching stripped versions for routing or grouping under §5.5.

#### 6.3.3 Generic and extension artifacts

An Artifact whose `mediaType` is not one of the core media types defined in §6.3.1 or §6.3.2 is an extension Artifact.

An extension registrant SHALL define the exact media type string; Artifact body field requirements; JSON shape or byte encoding; whether `value`, `url`, `data`, or a combination is used; dereferencing and integrity requirements for `url`; encoding requirements for `data`; whether `fhirVersion` is prohibited, optional, or required; fulfillment rules; interaction with request item `accept[]`, selectors, `fhirVersions[]`, and `requestStatus[]`; Verifier validation rules; privacy and security considerations; and at least one example.

An extension registrant SHALL NOT define an extension Artifact media type that redefines the semantics of `type`, `version`, `requestId`, `artifacts[]`, Artifact `id`, Artifact `mediaType`, Artifact `fulfills[]`, `requestStatus[]`, `application/smart-health-card`, or `application/fhir+json`.

A Wallet/Responder SHALL NOT return an extension Artifact as fulfilling an item unless that media type is listed in the item's `accept[]` or a registered compatibility rule applies. A Verifier or receiver that does not support an extension Artifact's `mediaType` SHALL NOT infer clinical semantics from the Artifact `id`, display strings, filename, URL, or payload shape alone.

#### 6.3.4 Examples

The examples in this subsection are illustrative. They do not define required clinical content, identifiers, issuer trust, or complete validation fixtures.

Example: SMART Health Card Artifact.

```json
{
  "id": "artifact-insurance-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance-card"],
  "value": {
    "verifiableCredential": [
      "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiIsImtpZCI6IjEyMzQ1In0..."
    ]
  }
}
```

Example: raw FHIR JSON Bundle Artifact.

```json
{
  "id": "artifact-us-core-bundle",
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
          "id": "condition-1",
          "meta": {
            "profile": [
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"
            ]
          },
          "subject": { "reference": "Patient/patient-1" },
          "code": { "text": "Example condition" }
        }
      }
    ]
  }
}
```

Example: extension Artifact using `url`.

```json
{
  "id": "artifact-imaging-manifest",
  "mediaType": "application/example-imaging-manifest+json",
  "fulfills": ["imaging-history"],
  "url": "https://example.invalid/artifacts/imaging-manifest/123"
}
```

The extension example is not a registered version 1.0 core media type. Its dereferencing, authorization, integrity, retention, and expiration semantics would need to be defined by the extension media-type registration before interoperable use.

### 6.4 Status reporting

`requestStatus[]` reports the outcome for each request item. It accounts for Holder decisions and Wallet outcomes independently from Artifact packaging.

A request-item status object has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

A Wallet/Responder SHALL include `item` and `status` in each status object. A Wallet/Responder MAY include `message`.

#### 6.4.1 Exactly one status per request item

A Wallet/Responder SHALL produce exactly one `requestStatus[]` entry for each item in the original SMART request. The status object's `item` value SHALL equal that request item's `id` using exact string equality.

A Wallet/Responder SHALL NOT produce duplicate `requestStatus[]` entries for the same request item. A Wallet/Responder SHALL NOT produce a `requestStatus[]` entry for an item id that is absent from the original SMART request.

A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every original request item exactly once and contains no unknown item id.

#### 6.4.2 Status code registry

Version 1.0 defines these status codes:

| Code | Meaning |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by the returned Artifact or Artifacts. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and the Holder did not decline it, but no matching shareable content was available. |
| `declined` | The Holder declined to share content for the request item, or Wallet policy acting for the Holder declined disclosure. |
| `unsupported` | The Wallet/Responder could not understand or support the request item, selector, requested media type, FHIR version, Questionnaire form, or other requested capability. |
| `error` | The Wallet/Responder encountered an error while attempting to satisfy the request item after it was otherwise understood. |

A Wallet/Responder SHALL set `status` to one of the registered strings above unless a future status-code registry entry is explicitly supported by both the Wallet/Responder and the Verifier. A Verifier SHALL reject an unknown status code unless a later version or extension status-code negotiation rule permits it.

A Wallet/Responder SHOULD use `unsupported` rather than `error` when the item cannot be processed because of an unsupported selector kind, unsupported extension selector, unsupported requested media type, unsupported FHIR version, unsupported Questionnaire features, or detected Questionnaire canonical/resource disagreement that makes the requested Questionnaire ambiguous before answer collection.

A Wallet/Responder SHOULD use `unavailable` rather than `unsupported` when the item is understood and supported but no matching shareable content exists or can be found in available Holder data sources.

A Wallet/Responder SHOULD use `partial` when at least one relevant Artifact is returned for the item but the Wallet/Responder cannot or does not claim that the item is fully satisfied, including broad `fhir.resources` requests where only a subset of available matching content is shared.

A Wallet/Responder SHOULD use `declined` when the absence of Artifact content is due to Holder choice or Wallet policy acting on Holder control, even if responsive content might otherwise be available.

A Wallet/Responder SHOULD use `error` when processing fails because of an internal failure, retrieval failure, parsing failure in a Holder data source, serialization failure, or other exceptional condition not better represented as `unsupported`, `unavailable`, `declined`, or `partial`.

A `fulfilled` or `partial` status SHOULD have at least one Artifact whose `fulfills[]` includes the item id. An item with `declined`, `unavailable`, `unsupported`, or `error` status usually has no fulfilling Artifact, but this specification does not prohibit a Wallet/Responder from returning partial diagnostic or supported-subset Artifacts when the selected status and Artifact content are not misleading.

#### 6.4.3 Optional `message`

A Wallet/Responder MAY include `message` as a human-readable string explaining the status. If present, `message` SHALL be a string.

`message` is for diagnostics and Holder/Requester workflow context. A Wallet/Responder SHOULD keep `message` concise and SHOULD NOT include secrets, access tokens, internal stack traces, unrelated clinical facts, or unnecessary sensitive details. A Requester or receiver SHALL NOT treat `message` as structured clinical data or as a substitute for Artifact validation.

### 6.5 Many-to-many fulfillment

The response model is Artifact-centered. One Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts.

#### 6.5.1 One Artifact may fulfill many items

A Wallet/Responder MAY list multiple request item ids in one Artifact's `fulfills[]` when the same Artifact content is responsive to each listed item and the Artifact `mediaType` is accepted by every listed item.

Example: a single FHIR Bundle could fulfill both a broad clinical-history item and a patient-demographics item if the Bundle contains responsive content for both and both items accept `application/fhir+json`.

#### 6.5.2 One item may be fulfilled by many Artifacts

A Wallet/Responder MAY return multiple Artifacts whose `fulfills[]` arrays include the same request item id when the item is satisfied by several packages or media types accepted by the item.

Example: a clinical-history item could be fulfilled by one SMART Health Card Artifact containing signed immunization credentials and one raw FHIR JSON Artifact containing a QuestionnaireResponse, if the item accepted both media types and the returned content is responsive.

#### 6.5.3 Example: shared QuestionnaireResponse

The following example is illustrative. The same QuestionnaireResponse is associated with both an intake item and a broader clinical-history item.

```json
{
  "id": "artifact-questionnaire-response",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["intake", "clinical-history"],
  "value": {
    "resourceType": "QuestionnaireResponse",
    "status": "completed",
    "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
    "item": [
      {
        "linkId": "headache",
        "answer": [{ "valueBoolean": true }]
      }
    ]
  }
}
```

This example does not require Requesters to accept QuestionnaireResponses as clinical-history content. The Verifier still applies the original request selectors, `accept[]` lists, media-type rules, and local policy.

### 6.6 Cross-validation rules a Verifier SHALL apply

A Verifier validates a SMART response against the original SMART request before passing the result to a Requester or downstream receiver. Shape validation of the response alone is insufficient.

#### 6.6.1 `requestId` match

A Verifier SHALL verify that `SmartHealthCheckinResponse.requestId` exactly equals `SmartHealthCheckinRequest.id` from the request being answered. If the values differ, the Verifier SHALL reject the response.

#### 6.6.2 `fulfills[]` references resolve

A Verifier SHALL verify that every `artifacts[].fulfills[]` value exactly matches one `items[].id` value in the original request. If any fulfillment reference is unknown, duplicated only by response construction error, or otherwise unresolved, the Verifier SHALL reject the response.

#### 6.6.3 Artifact `mediaType` is accepted by each fulfilled item

For each Artifact and each item id in that Artifact's `fulfills[]`, a Verifier SHALL verify that the Artifact `mediaType` appears in the corresponding request item's `accept[]` list, unless a registered media-type compatibility rule explicitly permits the Artifact for that accepted value. If no such match or compatibility rule exists, the Verifier SHALL reject the response.

A Verifier SHOULD consider the request item's `accept[]` ordering when choosing among multiple valid Artifacts for downstream processing, but ordering does not make a later accepted media type invalid.

#### 6.6.4 `requestStatus` covers items uniquely

A Verifier SHALL verify that `requestStatus[]` contains exactly one entry for each original request item id and no entries for unknown item ids. A Verifier SHALL reject a response with a missing, duplicate, or unknown `requestStatus[].item` value.

A Verifier SHOULD flag, according to local policy, a response where status and Artifact links appear inconsistent, such as `fulfilled` with no fulfilling Artifact or `declined` with a fulfilling Artifact. Such inconsistency can be a validation failure in stricter deployment profiles, but this section leaves local disposition open because extension Artifacts and diagnostic subset returns may need profile-specific handling.

#### 6.6.5 FHIR version consistency for `application/fhir+json`

A Verifier SHALL verify that every `application/fhir+json` Artifact includes a non-empty `fhirVersion` and a FHIR JSON `value` object with a `resourceType` member. A Verifier SHALL interpret the single-resource or Bundle payload under the Artifact's `fhirVersion`.

If the original request included `fhirVersions[]`, a Verifier SHALL verify that an `application/fhir+json` Artifact's `fhirVersion` is one of the requested values unless the Requester has explicitly accepted broader FHIR-version handling by local policy or by a registered extension rule.

A Verifier SHALL reject an `application/fhir+json` Bundle Artifact when the Verifier detects resources in the Bundle that are not valid for, or are explicitly marked as belonging to, the Artifact's declared `fhirVersion`. A Verifier SHOULD require separate Artifacts for raw FHIR JSON content from different FHIR release versions.

A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer Artifact-level `fhirVersion`. For SMART Health Card Artifacts, the Verifier determines FHIR version and clinical content by validating each JWS payload according to SMART Health Cards and local trust policy.

#### 6.6.6 Bundle and `meta.profile` checks

A Verifier SHALL apply the original request selectors to returned content before treating an Artifact as satisfying an item. For `fhir.resources` items, this includes checking returned FHIR resource types against `resourceTypes[]` when present and checking exact profile or profile-family suitability against `profiles[]` and `profilesFrom[]` using the §5.4 and §5.5 rules.

A Verifier SHOULD inspect FHIR `meta.profile` values in raw FHIR JSON payloads and in SMART Health Card credential payloads when those values are present. For a raw FHIR JSON Bundle, relevant profile checks apply to `Bundle.entry[].resource.meta.profile`; a Bundle-level `meta.profile` does not by itself prove that every entry resource satisfies a requested profile.

A Verifier SHOULD treat missing `meta.profile` as inconclusive rather than automatically invalid when the Wallet/Responder or returned credential has other reliable evidence that a resource conforms to a requested profile. Conversely, a Verifier SHOULD NOT treat a claimed `meta.profile` alone as sufficient when local policy or the selected workflow requires full FHIR validation, issuer trust, provenance, or clinical-source assurance.

When validating Questionnaire response content, a Verifier SHOULD compare `QuestionnaireResponse.questionnaire` to the requested Questionnaire canonical using the §5.5 `|version` handling rules. If the request supplied both a canonical and an inline Questionnaire resource and the Wallet/Responder reported the item as `unsupported` because of material disagreement, the Verifier SHOULD treat that as a valid item outcome rather than a transport failure.

### Organizer notes

Strengths:

- Preserves the accepted layering: the SMART response is a transport-neutral clinical JSON object and is not an mdoc or kiosk envelope.
- Makes `requestId`, `fulfills[]`, `mediaType`, and `requestStatus[]` cross-validation explicit and assigns those obligations to the Verifier.
- Keeps Artifact typing centered on `mediaType`; SMART Health Cards have `value.verifiableCredential[]` and no outer `fhirVersion`; raw FHIR JSON has an outer `fhirVersion`.
- Gives status codes operational semantics aligned with T2.A open items, including unsupported selectors, unsupported media types, Questionnaire ambiguity, unavailable data, Holder decline, partial fulfillment, and errors.

Caveats:

- The draft intentionally does not define universal size limits, `url` dereferencing, `data` encoding, or extension media-type registry mechanics; those belong to Appendix B, §13, transport profiles, or registered extensions.
- The draft states stronger mixed-version Bundle handling than the older active docs by making Wallet separation and Verifier rejection normative when mixed versions are detected. This is consistent with the requested cutpoint but should be confirmed by the organizer.
- Status/Artifact consistency is a SHOULD-level local-policy check rather than unconditional rejection to leave room for extension artifacts and partial diagnostic returns.

Downstream dependencies:

- Appendix B should encode fixed response `type` and `version`, required top-level fields, Artifact id uniqueness, status item uniqueness, core media-type conditional requirements, and whatever constraints are feasible for `requestStatus[]` coverage.
- Appendix H should align Bundle handling, FHIR release versions, `meta.profile`, `QuestionnaireResponse.questionnaire`, and profile-family validation guidance with §§5–6.
- §13 should define media-type, Artifact-extension, selector-kind, and status-code registry templates, including compatibility substitution rules for `accept[]` validation.
- §8 and §9 should carry this SMART response without changing clinical semantics and should add only transport/session/wrapper validation around it.
