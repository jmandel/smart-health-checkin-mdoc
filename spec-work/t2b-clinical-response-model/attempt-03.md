## 6. Clinical content — response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder answers a SMART request after applying Holder decisions, Wallet policy, available Holder data sources, and the selected presentation flow. The same SMART response semantics apply when the object is returned by the same-device presentation flow, submitted through the cross-device kiosk wrapper, or carried by a future binding.

The SMART response is distinct from mdoc, Digital Credentials API, kiosk, encrypted-submission, and completion envelopes. Those presentation or wrapper artifacts can bind, protect, route, or authenticate the response, but they do not change the meaning of `requestId`, `artifacts[]`, Artifact `mediaType`, `fulfills[]`, or `requestStatus[]`.

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

A Wallet/Responder SHALL set `version` to the exact string `"1"` for responses conforming to SMART Health Check-in 1.0. The `version` member is the SMART response-model version. It is not a FHIR version, mdoc document type version, kiosk wrapper version, or transport profile version.

A Verifier SHALL reject a SMART response whose `version` member is absent or is not exactly `"1"`, unless a future version-compatibility rule explicitly defines compatible handling for another value.

#### 6.1.3 `requestId`

A Wallet/Responder SHALL set `requestId` to the exact `id` value from the SMART request being answered. A Verifier SHALL reject a SMART response if `requestId` does not exactly equal the original SMART request `id` for the presentation or kiosk session being processed.

`requestId` binds the clinical response to the clinical request. It is not a patient identifier, requester identifier, freshness proof, or substitute for presentation-session validation.

#### 6.1.4 `artifacts[]`

`artifacts` is the array of clinical content Artifacts returned by the Wallet/Responder. A Wallet/Responder SHALL include `artifacts` as an array. The array MAY be empty when no request item produces a returned Artifact, including when all items are declined, unavailable, unsupported, or error.

A Wallet/Responder SHALL encode each member of `artifacts[]` as an Artifact object following §6.2 and one of the concrete shapes in §6.3. A Verifier SHALL validate every Artifact before passing it to a Requester or receiver for clinical consumption.

The order of `artifacts[]` has no normative fulfillment meaning. A Wallet/Responder MAY order Artifacts for readability, grouping, or local convenience. A Requester or receiver SHALL use Artifact `id`, `mediaType`, `fulfills[]`, status entries, and payload contents rather than array position to determine response meaning.

#### 6.1.5 `requestStatus[]`

`requestStatus` is the per-request-item accounting array. A Wallet/Responder SHALL include `requestStatus` as an array with exactly one entry for each item in the original SMART request `items[]`. Status entries are required even when the corresponding item is fulfilled by one or more Artifacts.

A Verifier SHALL validate `requestStatus[]` against the original SMART request as defined in §6.4 and §6.6 before treating the response as clinically consumable.

### 6.2 Artifact common shape

An Artifact is a response object that contains clinical content or references clinical content returned by a Wallet/Responder. Every Artifact has a common shape plus media-type-specific fields:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` for every Artifact. A Wallet/Responder SHALL include exactly the body or locator fields required by the Artifact's media type and by §6.2.4.

#### 6.2.1 `id` uniqueness within response

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to one SMART response. A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within a single SMART response.

A Verifier SHALL reject a SMART response that contains an Artifact with a missing, non-string, empty, or duplicate `id`.

Artifact ids are not request item ids, patient identifiers, requester identifiers, persistent document identifiers, or clinical facts. A Requester or receiver SHALL NOT infer clinical meaning from the syntax of an Artifact `id`.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. The `mediaType` declares the response form of the Artifact. It is the Artifact-level type discriminator for response processing; the response model does not define a separate Artifact `type` or protocol-specific discriminator.

Version 1.0 defines two core Artifact media types:

| Media type | Artifact shape |
| --- | --- |
| `application/smart-health-card` | SMART Health Card file JSON with `value.verifiableCredential[]`; see §6.3.1. |
| `application/fhir+json` | Raw FHIR JSON with explicit Artifact `fhirVersion`; see §6.3.2. |

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` is acceptable for that item under the item's `accept[]` list and any registered media-type compatibility rule. A Verifier SHALL reject an Artifact-to-item fulfillment claim when the Artifact `mediaType` is not accepted by the referenced request item, except where a registered compatibility rule explicitly defines compatible substitution semantics.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids on every Artifact. Each value in `fulfills[]` SHALL exactly equal the `id` of an item in the original SMART request.

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not resolve to exactly one item in the original SMART request. Exact string equality is used for request item ids.

`fulfills[]` is a claim about which request items the Artifact helps satisfy. It does not by itself prove that the Artifact content actually matches the request selector, accepted media type, FHIR version constraints, or profile guidance. A Verifier SHALL apply the cross-validation rules in §6.6 before consuming the response.

#### 6.2.4 Body fields: `value`, `url`, and `data`

An Artifact carries or locates content using one or more body fields. The core media types in §6.3.1 and §6.3.2 use `value`.

For an Artifact whose `mediaType` is `application/smart-health-card`, a Wallet/Responder SHALL include `value` and SHALL NOT use `url` or `data` in place of `value` unless a future revision explicitly defines such a representation for SMART Health Cards.

For an Artifact whose `mediaType` is `application/fhir+json`, a Wallet/Responder SHALL include `value` containing the raw FHIR JSON Resource or Bundle and SHALL NOT use `url` or `data` in place of `value` unless a future revision explicitly defines such a representation for raw FHIR JSON.

For a generic or extension Artifact, a Wallet/Responder SHALL include at least one of `value`, `url`, or `data`:

- `value` carries a JSON value whose interpretation is defined by the Artifact `mediaType`.
- `url` carries a string locator whose dereference, authorization, lifetime, integrity, and privacy semantics are defined by the Artifact `mediaType` or extension profile.
- `data` carries an inline string representation, such as an encoded byte sequence, whose encoding and decoding rules are defined by the Artifact `mediaType` or extension profile.

If a generic or extension Artifact includes more than one of `value`, `url`, or `data`, its media type or extension profile SHALL define how the fields are interpreted together. A Verifier SHALL reject a generic or extension Artifact that does not include any of `value`, `url`, or `data`, or that uses a combination the media type does not define.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card artifact (`application/smart-health-card`)

A SMART Health Card Artifact returns SMART Health Card file JSON. A Wallet/Responder SHALL construct this Artifact with `mediaType` equal to `"application/smart-health-card"` and `value` as a JSON object containing a non-empty `verifiableCredential` array of SMART Health Card Verifiable Credential JWS strings.

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

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` member on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that contains an outer `fhirVersion` member. A Verifier or receiver that needs FHIR-version information for SMART Health Card content SHALL inspect and verify the signed SMART Health Card credential payloads according to the SMART Health Cards specification and local trust policy.

A Wallet/Responder SHOULD include in one SMART Health Card Artifact only credentials that the Wallet/Responder is willing to present as part of the same response form for the listed `fulfills[]` items. This section does not define a new SMART Health Card packaging format, signature format, issuer trust rule, or FHIR-version rule beyond requiring the file JSON shape above.

#### 6.3.2 Raw FHIR JSON artifact (`application/fhir+json`)

A raw FHIR JSON Artifact returns a FHIR Resource or Bundle directly as JSON. A Wallet/Responder SHALL construct this Artifact with `mediaType` equal to `"application/fhir+json"`, SHALL include `fhirVersion` as a non-empty FHIR release-version string, and SHALL include `value` containing the raw FHIR JSON payload.

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

The `fhirVersion` member applies to the Artifact `value` as a whole. A Wallet/Responder SHALL NOT omit `fhirVersion` for `application/fhir+json`. A Verifier SHALL reject an `application/fhir+json` Artifact that omits `fhirVersion`, has a non-string or empty `fhirVersion`, or uses a FHIR version the Verifier cannot process for the fulfilled item.

The `value` of an `application/fhir+json` Artifact SHALL be either:

1. a single FHIR Resource JSON object with a `resourceType` string; or
2. a FHIR Bundle JSON object with `resourceType` equal to `"Bundle"` and `entry[]` containing zero or more entries whose `resource`, when present, is interpreted as a FHIR Resource under the Artifact `fhirVersion`.

A Wallet/Responder SHALL NOT place FHIR resources from multiple FHIR release versions in the same `application/fhir+json` Bundle Artifact. When the Wallet/Responder needs to return raw FHIR JSON from different FHIR releases, it SHALL return separate `application/fhir+json` Artifacts with separate `fhirVersion` values.

A Verifier SHALL interpret every resource in a raw FHIR JSON Artifact under the Artifact `fhirVersion`. A Verifier SHALL reject or quarantine an `application/fhir+json` Artifact when it detects mixed-version content that cannot be interpreted consistently under the declared `fhirVersion`.

Raw FHIR JSON is patient-mediated clinical content. Unless the payload itself carries a signature, provenance, or other evidence accepted by local policy, successful presentation transport does not make raw FHIR JSON equivalent to an issuer-signed clinical credential.

#### 6.3.3 Generic and extension artifacts

A generic or extension Artifact is any Artifact whose `mediaType` is not one of the core media types defined in §6.3.1 or §6.3.2.

An extension registrant defining an Artifact media type for SMART Health Check-in SHALL define all of the following: the exact media type string; required and optional Artifact members; which of `value`, `url`, and `data` are allowed; payload encoding; any `fhirVersion` handling; how `fulfills[]` is evaluated against request selectors; validation rules; security considerations; privacy considerations; any compatibility with core media types for `accept[]` matching; and at least one example Artifact.

An extension registrant SHALL NOT define an Artifact media type that redefines the semantics of `type`, `version`, `requestId`, Artifact `id`, `mediaType`, `fulfills[]`, core status codes, or the core `application/smart-health-card` and `application/fhir+json` shapes.

A Wallet/Responder SHALL NOT use an unregistered or privately defined extension Artifact when interoperable processing by unrelated Verifiers or Requesters is expected. A Verifier MAY reject, quarantine, or ignore an extension Artifact whose media type it does not understand, subject to the response-level validation rules for `requestStatus[]` and local policy.

#### 6.3.4 Examples

The examples in this subsection are illustrative. Example identifiers, URLs, JWS strings, FHIR resources, and clinical data are not fixed protocol values.

Example: SMART Health Card Artifact.

```json
{
  "id": "artifact-coverage-card",
  "mediaType": "application/smart-health-card",
  "fulfills": ["coverage"],
  "value": {
    "verifiableCredential": [
      "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9.example.example"
    ]
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
            "profile": [
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns"
            ]
          },
          "clinicalStatus": {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                "code": "active"
              }
            ]
          },
          "code": { "text": "Example condition" },
          "subject": { "reference": "Patient/example" }
        }
      }
    ]
  }
}
```

Example: generic extension Artifact using a URL locator. This example is not a core media type and does not define a registered extension.

```json
{
  "id": "artifact-extension-document",
  "mediaType": "application/example-clinical-document+json",
  "fulfills": ["document-request"],
  "url": "https://example.org/checkin/artifacts/artifact-extension-document"
}
```

### 6.4 Status reporting

`requestStatus[]` reports the outcome for each request item. It accounts for Holder decisions, Wallet capability, available Holder data sources, media-type support, selector support, and errors. Status is per request item, not per Artifact.

A Wallet/Responder SHALL include exactly one `requestStatus[]` entry for each item in the original SMART request `items[]`. A Wallet/Responder SHALL NOT include more than one status entry for the same request item. A Wallet/Responder SHALL NOT include a status entry for an item id that is absent from the original SMART request.

Each status entry has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

A Wallet/Responder SHALL include `item` as the exact request item id and `status` as one of the status codes defined in §6.4.2. A Wallet/Responder MAY include `message` as a string.

#### 6.4.1 Complete and unique coverage

A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every original request item exactly once. This rule applies even when `artifacts[]` is empty and even when the presentation transport reports success.

If the original SMART request contains zero items, a conforming Wallet/Responder still SHALL include `requestStatus` as an array. Organizer note: §5 currently makes non-empty `items[]` a SHOULD and defers hard closure; Appendix B and conformance closure should decide whether zero-item requests are prohibited.

#### 6.4.2 Status code registry

Version 1.0 defines these status codes:

| Status code | Meaning | Artifact expectation |
| --- | --- | --- |
| `fulfilled` | The Wallet/Responder believes the item was fully satisfied under the request selector, accepted media type, Holder decision, and Wallet policy. | At least one Artifact normally fulfills the item. |
| `partial` | The Wallet/Responder returned some relevant content or completed part of the requested action but does not claim complete fulfillment. | One or more Artifacts normally fulfill the item. |
| `unavailable` | The Wallet/Responder understood the item and could support the requested form in principle, but found no matching shareable content or no usable Holder data source content for the item. | No Artifact normally fulfills the item. |
| `declined` | The Holder declined to share or complete the item, or Wallet policy treated the Holder's decision as non-disclosure for that item. | No Artifact normally fulfills the item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector, required selector features, Questionnaire, or requested media types. | No Artifact normally fulfills the item. |
| `error` | The Wallet/Responder encountered an error while attempting to satisfy the item after accepting or attempting to process it. | An Artifact may or may not be present, depending on the point of failure. |

A Wallet/Responder SHALL use `unsupported` for a request item when it does not support the item's `content.kind`, a required selector shape, all listed `accept[]` media types, or a Questionnaire form required to safely process the item. If a material disagreement between a questionnaire canonical and an inline Questionnaire resource is detected before collection or response construction, a Wallet/Responder SHOULD report `unsupported` when the problem is that the item cannot be safely interpreted, and SHOULD report `error` when the problem is an operational failure after interpretation had begun.

A Wallet/Responder SHALL use `unavailable`, rather than `unsupported`, when the item is understood and supported but the Wallet/Responder has no matching shareable content available for the Holder or local policy. For a broad no-selector `fhir.resources` item, `unavailable` means no patient-specific FHIR content was available or shareable for the item.

A Wallet/Responder SHALL use `declined` when the relevant reason for non-fulfillment is the Holder's decision not to share or complete the item. A Wallet/Responder MAY also use `declined` when local Wallet policy implements Holder preferences that prohibit disclosure for the item.

A Wallet/Responder SHALL use `partial` when it returns responsive content but does not claim complete satisfaction. Examples include returning only some matching FHIR resources from a broad profile-family request, completing only part of a requested Questionnaire workflow where that partial response is still useful, or returning some but not all locally available content because of Holder decisions or policy.

A Wallet/Responder SHALL use `fulfilled` only when it believes the item is fully satisfied. `fulfilled` is the Wallet/Responder's response-construction claim; it does not prevent a Verifier from rejecting the response during validation or a Requester from applying stricter downstream clinical policy.

A Wallet/Responder SHALL use `error` when a processing failure prevents normal outcome classification. Error status is appropriate for transient data-source failures, internal exceptions, fetch failures after a Questionnaire was otherwise supported, or response-construction failures. A Wallet/Responder SHOULD avoid placing sensitive diagnostics in `message`.

Future status codes are registry-controlled by §13. Until such a registry entry exists and is understood by the Verifier, a Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation.

#### 6.4.3 Optional `message`

A Wallet/Responder MAY include `message` in a status entry to provide a short human-readable explanation. If present, `message` SHALL be a string.

`message` is for diagnostics or Holder/Requester-facing explanation. A Wallet/Responder SHALL NOT rely on `message` to change the machine-readable meaning of `status`, `fulfills[]`, `mediaType`, or the Artifact payload. A Verifier or receiver SHALL NOT infer a different status-code meaning from `message`.

A Wallet/Responder SHOULD minimize sensitive details in `message`. For example, `"No matching shareable records found"` is usually safer than listing diagnoses, payers, data-source names, or internal exception details.

### 6.5 Many-to-many fulfillment

The SMART response model intentionally supports many-to-many fulfillment.

A Wallet/Responder MAY use one Artifact to fulfill multiple request items when the Artifact's content and `mediaType` are appropriate for each item. In that case, the Wallet/Responder SHALL list every fulfilled request item id in the Artifact `fulfills[]`, and the Artifact `mediaType` SHALL be accepted by every listed request item.

A Wallet/Responder MAY use multiple Artifacts to fulfill one request item when the requested content is naturally packaged in several response forms, FHIR versions, sources, resources, credentials, or chunks. In that case, each Artifact that contributes to the item SHALL include the item id in its own `fulfills[]`.

A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry for the item, regardless of how many Artifacts fulfill it. A Requester or receiver SHALL NOT infer item status solely from the number of Artifacts that reference the item.

Example: shared QuestionnaireResponse Artifact.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "example-checkin-request",
  "artifacts": [
    {
      "id": "artifact-intake-response",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["intake", "clinical-history"],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "status": "completed",
        "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
      }
    }
  ],
  "requestStatus": [
    { "item": "intake", "status": "fulfilled" },
    { "item": "clinical-history", "status": "partial", "message": "Shared available matching information." }
  ]
}
```

This example illustrates one Artifact contributing to two request items while each item still has exactly one status entry.

### 6.6 Cross-validation rules Verifier SHALL apply

A Verifier SHALL validate the SMART response against the original SMART request before passing Artifacts to a Requester, receiver, EHR ingestion pipeline, payer workflow, or other downstream consumer. The validation in this section is clinical-content validation; transport sections add presentation, cryptographic, origin, reader, kiosk, freshness, and replay validation.

A Verifier SHALL apply at least the following checks.

#### 6.6.1 `requestId` match

The Verifier SHALL confirm that `SmartHealthCheckinResponse.requestId` exactly equals the original `SmartHealthCheckinRequest.id` for the current presentation or kiosk session. If it does not match, the Verifier SHALL reject the response.

#### 6.6.2 `fulfills[]` references resolve

The Verifier SHALL confirm that each Artifact `fulfills[]` value resolves to exactly one item in the original SMART request `items[]`. If any fulfillment reference is missing, misspelled, duplicated only by ambiguous request construction, or otherwise unresolved, the Verifier SHALL reject the response.

#### 6.6.3 Artifact `mediaType` is accepted by each fulfilled item

For each Artifact and for each item id in its `fulfills[]`, the Verifier SHALL confirm that the Artifact `mediaType` is present in that request item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics.

If one Artifact fulfills multiple request items, the Verifier SHALL apply this check independently to every fulfilled item. The Artifact is invalid for the response if its `mediaType` is not accepted by any item it claims to fulfill.

#### 6.6.4 `requestStatus` covers items uniquely

The Verifier SHALL confirm that `requestStatus[]` contains exactly one entry for every original request item id and no entries for unknown item ids. The Verifier SHALL reject a response with missing status entries, duplicate status entries for the same item, or status entries for unknown items.

The Verifier SHOULD compare status and Artifact references for consistency. For `fulfilled` and `partial`, at least one valid Artifact will normally reference the item. For `declined`, `unavailable`, and `unsupported`, no Artifact will normally reference the item. Deviations can be deployment-specific but should be treated cautiously and documented by the receiving system.

#### 6.6.5 FHIR version consistency for `application/fhir+json`

For every `application/fhir+json` Artifact, the Verifier SHALL confirm that `fhirVersion` is present as a non-empty string and that the Verifier can process that FHIR release for every item the Artifact claims to fulfill. When the original request included `fhirVersions[]`, the Verifier SHALL confirm that each raw FHIR JSON Artifact uses a FHIR version compatible with the request and with the receiving system's capabilities.

The Verifier SHALL interpret a raw FHIR JSON Artifact `value` under the Artifact `fhirVersion`. If the Artifact is a Bundle, the Verifier SHALL treat all contained resources as being under that same FHIR version. The Verifier SHALL reject or quarantine the Artifact if it detects mixed-version Bundle content or another inconsistency that prevents safe interpretation under the declared `fhirVersion`.

The Verifier SHALL NOT require an outer `fhirVersion` on `application/smart-health-card` Artifacts and SHALL reject such an outer member if present. FHIR-version checks for SMART Health Cards are performed by inspecting and verifying each signed credential payload, not by reading an Artifact wrapper field.

#### 6.6.6 Bundle and `meta.profile` guidance

A Verifier SHOULD inspect FHIR `meta.profile` values in raw FHIR JSON payloads when validating whether returned resources correspond to requested `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`. For a single-resource Artifact, the relevant field is normally `value.meta.profile`. For a Bundle Artifact, the relevant fields are normally `value.entry[].resource.meta.profile` and each entry resource's `resourceType`.

A Wallet/Responder SHOULD preserve returned FHIR `meta.profile` values, including any `|version` suffixes, rather than summarizing or replacing them with an Artifact-level profile summary. A Wallet/Responder SHOULD NOT include an Artifact-level profile summary field for core raw FHIR JSON Artifacts. A Verifier SHOULD inspect the FHIR payload itself rather than relying on any non-standard summary field.

For `profilesFrom[]`, a Verifier MAY need implementation-guide, profile-family, package, or local policy knowledge outside the SMART response to decide whether a returned `meta.profile` belongs to the requested profile family. This specification does not require full FHIR profile validation during response validation, but a Verifier SHALL NOT treat successful JSON shape validation alone as proof that a returned resource satisfies a requested clinical profile.

For questionnaire items returning `application/fhir+json`, a Verifier SHOULD validate that the returned resource is a `QuestionnaireResponse` and that `QuestionnaireResponse.questionnaire`, when present, preserves the requested Questionnaire canonical and `|version` according to §5.5. If the request supplied both a Questionnaire canonical and inline resource, disagreement handling during Wallet processing is governed by §5.4.2.4 and status semantics in §6.4.2; receiver-side clinical acceptance remains local policy.

## Organizer notes

Strengths of this draft:

- Keeps the SMART response as a transport-neutral clinical JSON object and avoids defining mdoc or kiosk carriage details in §6.
- Uses `mediaType` as the Artifact discriminator and preserves the active core shapes: SMART Health Card `value.verifiableCredential[]` with no outer `fhirVersion`, and raw FHIR JSON with required `fhirVersion`.
- Makes `requestStatus[]` complete and unique per request item, with explicit semantics for Holder decisions, unsupported selectors/media types, unavailable content, partial fulfillment, and errors.
- Gives Verifier cross-validation rules tied to the original request, especially `requestId`, `fulfills[]`, `accept[]`, status coverage, FHIR version consistency, and `meta.profile` guidance.

Caveats and downstream dependencies:

- Appendix B should encode as many response constraints as possible, including Artifact id uniqueness, status item uniqueness, required core Artifact fields, and media-type-specific prohibitions.
- §13 must define registry processes for extension media types and future status codes, including compatibility rules for `accept[]` matching.
- Appendix H should refine Bundle/profile-family validation guidance, QuestionnaireResponse mapping, and FHIR-version handling across R4/R4B/R5 without adding hidden new requirements.
- §8 and §9 must bind this same SMART response object into the same-device and kiosk flows without changing the clinical response semantics.
- Final conformance work should decide whether inconsistent but syntactically valid combinations, such as `declined` with an Artifact reference, are hard failures or receiver-policy warnings.
