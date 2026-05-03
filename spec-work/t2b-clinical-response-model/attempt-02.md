## 6. Clinical content — response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder reports the outcome of a SMART request. The SMART response remains distinct from mdoc presentation responses, kiosk encrypted submissions, completion notifications, transport acknowledgments, and any downstream EHR ingestion record.

A SMART response is artifact-centered. It binds to one SMART request by `requestId`, carries zero or more returned clinical Artifacts, links each Artifact to the request item or items it fulfills, and reports one status for every request item. A successful presentation transport does not by itself imply that every request item was fulfilled; per-item status is the clinical accounting mechanism.

### 6.1 `SmartHealthCheckinResponse` (top level)

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

A Wallet/Responder SHALL construct a SMART response as a JSON object. A Wallet/Responder SHALL include `type`, `version`, `requestId`, `artifacts`, and `requestStatus`.

#### 6.1.1 `type`

A Wallet/Responder SHALL set `type` to the exact string `"smart-health-checkin-response"`.

A Verifier SHALL reject a SMART response whose `type` member is absent or is not exactly `"smart-health-checkin-response"`.

#### 6.1.2 `version`

A Wallet/Responder SHALL set `version` to the exact string `"1"` for responses conforming to SMART Health Check-in 1.0. The `version` member is the SMART response-model version. It is not a FHIR version and not a presentation-transport version.

A Verifier SHALL reject a SMART response whose `version` member is absent or is not exactly `"1"`, unless a future version-negotiation rule explicitly defines compatible handling for another value.

#### 6.1.3 `requestId`

A Wallet/Responder SHALL set `requestId` to the exact `SmartHealthCheckinRequest.id` value from the SMART request being answered.

A Verifier SHALL reject a SMART response if `requestId` does not equal the original request's `id` by exact string comparison. The request id is a binding and correlation value only; a Requester or Verifier SHALL NOT treat `requestId` as a patient identifier, requester identity proof, freshness proof, or clinical fact.

#### 6.1.4 `artifacts[]`

`artifacts` is the array of returned clinical Artifacts. A Wallet/Responder SHALL encode `artifacts` as an array. The array MAY be empty when no request item produces returned content, for example because all items were declined, unavailable, unsupported, or failed.

Each member of `artifacts` SHALL conform to §6.2 and to the concrete Artifact rule for its `mediaType` in §6.3. Each Artifact declares the request item ids that it fulfills; fulfillment is not inferred from Artifact order, Artifact id, FHIR resource type, display text, or status message.

#### 6.1.5 `requestStatus[]`

`requestStatus` is the per-request-item status array. A Wallet/Responder SHALL encode `requestStatus` as an array. A Wallet/Responder SHALL include exactly one `requestStatus[]` entry for each `SmartHealthCheckinRequest.items[]` member, including items for which no Artifact is returned. Section 6.4 defines the entry shape and status-code semantics.

A Verifier SHALL reject a SMART response whose `requestStatus[]` does not cover every original request item exactly once.

### 6.2 Artifact common shape

An Artifact is a response object that contains clinical content or identifies clinical content returned by a Wallet/Responder. All Artifacts have this common shape, with additional members depending on `mediaType`:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "value": {}
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` on every Artifact. A Wallet/Responder SHALL NOT use an Artifact-level protocol type discriminator other than `mediaType` to identify the Artifact's clinical response format.

#### 6.2.1 `id` uniqueness

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to one SMART response.

A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within one SMART response. A Verifier SHALL reject a SMART response with a missing, non-string, empty, or duplicate Artifact `id`.

A Wallet/Responder SHOULD use Artifact ids that are stable within the interaction and short enough for diagnostics. A Wallet/Responder SHOULD NOT include patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in Artifact `id` values.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. `mediaType` identifies the representation and validation rules for the Artifact payload.

Version 1.0 defines the core Artifact media types `application/smart-health-card` and `application/fhir+json`. Other media types are extension Artifacts under §6.3.3 and the extension and registry rules in §13.

For every request item id listed in `fulfills[]`, a Wallet/Responder SHALL use an Artifact `mediaType` that appears in that request item's `accept[]` list, except where a registered compatibility rule explicitly defines compatible substitution semantics. A Verifier SHALL reject an Artifact as fulfilling an item if the Artifact `mediaType` is not accepted by that item under this rule.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids on every Artifact. Each value in `fulfills[]` SHALL equal the `id` of an item in the original SMART request by exact string comparison.

A Verifier SHALL reject a SMART response if any `fulfills[]` value does not resolve to an item in the original SMART request. A Verifier SHALL also reject or ignore, according to the selected flow's failure handling, an Artifact whose `fulfills[]` is absent, empty, not an array of strings, or contains only unresolved ids.

A Wallet/Responder MAY list multiple item ids in one Artifact's `fulfills[]` when the same Artifact accurately fulfills all listed items and its `mediaType` is accepted by each listed item.

#### 6.2.4 Payload fields: `value`, `url`, and `data`

Core Artifacts use `value` as defined in §6.3.1 and §6.3.2. For `application/smart-health-card`, `value` is the SMART Health Card file JSON object. For `application/fhir+json`, `value` is a FHIR JSON Resource or Bundle.

Extension Artifacts MAY use `value`, `url`, `data`, or a registered combination of those fields:

- `value` carries an inline JSON value whose meaning is defined by the Artifact `mediaType`.
- `url` carries a string locator for an external payload. A Requester/receiver SHALL NOT treat a `url` Artifact as retrieved, authenticated, authorized, or clinically trusted merely because the URL appears in the SMART response; dereferencing, authentication, integrity, expiry, and privacy behavior must be defined by the extension media type or local policy.
- `data` carries a string payload whose encoding and interpretation are defined by the Artifact `mediaType` or extension registration. This section does not define a generic base64, base64url, text, compression, or encryption convention for `data`.

An extension-media-type registrant SHALL define which of `value`, `url`, and `data` is required or allowed, how multiple payload fields are interpreted together, and any integrity, dereferencing, confidentiality, size, and FHIR-version rules.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card Artifact (`application/smart-health-card`)

A SMART Health Card Artifact has `mediaType` equal to `"application/smart-health-card"` and a `value` object containing a non-empty `verifiableCredential` array:

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

A Wallet/Responder returning an `application/smart-health-card` Artifact SHALL include `value.verifiableCredential` as a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS.

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` member on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer `fhirVersion` member.

A Verifier SHALL inspect each signed SMART Health Card credential according to SMART Health Card processing rules, including FHIR-version semantics carried inside the signed credential payload. A Verifier SHALL NOT infer the FHIR version of a SMART Health Card from the SMART response wrapper.

#### 6.3.2 Raw FHIR JSON Artifact (`application/fhir+json`)

A raw FHIR JSON Artifact has `mediaType` equal to `"application/fhir+json"`, declares an outer `fhirVersion`, and carries a FHIR JSON Resource or Bundle in `value`:

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

A Wallet/Responder returning an `application/fhir+json` Artifact SHALL include `fhirVersion` as a non-empty FHIR release-version string. A Verifier SHALL reject an `application/fhir+json` Artifact whose `fhirVersion` member is absent, empty, or not a string.

A Wallet/Responder returning an `application/fhir+json` Artifact SHALL include `value`. The `value` member SHALL be either a single FHIR JSON Resource object or a FHIR JSON Bundle object for the declared `fhirVersion`.

If `value.resourceType` is `"Bundle"`, the Bundle and every resource contained in `Bundle.entry[].resource` SHALL be interpreted under the Artifact's declared `fhirVersion`. A Wallet/Responder SHALL NOT place resources from multiple FHIR release versions in the same `application/fhir+json` Bundle Artifact. Content from different FHIR release versions SHALL be returned in separate `application/fhir+json` Artifacts.

If `value.resourceType` is not `"Bundle"`, the `value` object SHALL be interpreted as one FHIR Resource under the Artifact's declared `fhirVersion`.

A raw FHIR JSON Artifact is not independently issuer-signed merely because it is carried in a successful presentation transport. A Requester/receiver SHOULD treat provenance, signature, author, source, and trust evidence according to the returned FHIR content, surrounding flow evidence, and local policy.

#### 6.3.3 Generic / extension Artifacts

A generic or extension Artifact is any Artifact whose `mediaType` is not one of the core media types defined in §6.3.1 and §6.3.2.

A Wallet/Responder SHALL NOT return an extension Artifact as fulfilling a request item unless that item's `accept[]` permits the extension `mediaType` or a registered compatibility rule defines the returned `mediaType` as satisfying an accepted type.

An extension Artifact SHALL include at least one payload field among `value`, `url`, and `data`, unless the extension media type's registered definition explicitly defines a no-body Artifact shape. If an extension Artifact includes more than one of `value`, `url`, and `data`, the extension media type's definition SHALL specify how the fields are interpreted together.

If an extension Artifact contains raw FHIR content or otherwise depends on an outer FHIR version declaration, the extension-media-type registrant SHALL define whether `fhirVersion` is required, prohibited, or optional and how Verifiers validate FHIR-version consistency.

An extension-media-type registrant SHALL define the media type string, Artifact payload shape, required and optional members, relationship to request `accept[]`, validation rules, status interaction, FHIR-version handling, security considerations, privacy considerations, and examples. An extension media type SHALL NOT redefine the semantics of core response members `type`, `version`, `requestId`, `artifacts`, `requestStatus`, Artifact `id`, Artifact `mediaType`, or Artifact `fulfills`.

#### 6.3.4 Examples

The examples in this subsection are illustrative. Example ids, display text, clinical content, and JWS values are not fixed protocol values.

Example: one raw FHIR Patient Artifact fulfilling one item.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "example-patient-request",
  "artifacts": [
    {
      "id": "artifact-patient",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["patient"],
      "value": {
        "resourceType": "Patient",
        "id": "example"
      }
    }
  ],
  "requestStatus": [
    { "item": "patient", "status": "fulfilled" }
  ]
}
```

Example: mixed outcomes with no Artifact for a declined item.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "example-checkin-request",
  "artifacts": [
    {
      "id": "artifact-clinical-history",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["clinical-history"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": []
      }
    }
  ],
  "requestStatus": [
    { "item": "coverage", "status": "declined", "message": "Holder declined to share this item." },
    { "item": "clinical-history", "status": "partial", "message": "Shared available matching resources." },
    { "item": "intake", "status": "unsupported", "message": "Questionnaire features are not supported by this Wallet." }
  ]
}
```

Example: one Artifact fulfilling multiple items. This is valid only if `application/fhir+json` is accepted by both `intake` and `clinical-history` in the original request.

```json
{
  "id": "artifact-questionnaire-response",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["intake", "clinical-history"],
  "value": {
    "resourceType": "QuestionnaireResponse",
    "status": "completed"
  }
}
```

### 6.4 Status reporting

`requestStatus[]` records the outcome for each request item at the granularity defined by `SmartHealthCheckinRequest.items[]`. Status accounts for both Holder decisions and Wallet outcomes. It is required even when every item is fulfilled and even when no Artifacts are returned.

Each status entry has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

A Wallet/Responder SHALL include `item` and `status` in every `requestStatus[]` entry. A Wallet/Responder MAY include `message`.

A Wallet/Responder SHALL set `item` to the exact id of one request item from the original SMART request. A Wallet/Responder SHALL include exactly one status entry for each request item and SHALL NOT include more than one status entry for the same item.

A Verifier SHALL reject a SMART response if `requestStatus[]` references an unknown request item, omits any request item, or contains duplicate entries for the same request item.

The status code registry for SMART Health Check-in 1.0 contains exactly these core values:

| Code | Wallet/Responder semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact(s). |
| `partial` | The Holder authorized and the Wallet/Responder returned some relevant Artifact content, but the Wallet/Responder does not claim complete fulfillment of the item. |
| `unavailable` | The Holder did not decline the item, but the Wallet/Responder found no matching shareable content or no content available under Wallet policy and Holder data sources. |
| `declined` | The Holder declined to share content for the request item. |
| `unsupported` | The Wallet/Responder could not understand or support the item selector, requested media type(s), required Questionnaire features, registered extension, or other item semantics. This is the status for an unsupported selector discovered after the request is being processed. A material disagreement between a supplied Questionnaire canonical and inline Questionnaire resource SHOULD be reported as `unsupported` when the Wallet/Responder refuses to process the ambiguous item. |
| `error` | The Wallet/Responder encountered an unexpected processing failure while attempting to satisfy the item. `error` is not used merely because the Holder declined, content was unavailable, or a selector/media type was unsupported. |

A Wallet/Responder SHALL use one of the status codes in this registry. A Verifier SHALL reject a status entry whose `status` value is not one of these strings, unless a future version or registered status-code extension defines compatible handling.

When `message` is present, a Wallet/Responder SHALL encode it as a string. `message` is a diagnostic or Holder-facing explanation; it does not change the machine-readable status semantics. A Requester/receiver SHOULD NOT depend on `message` for automated clinical routing or validation decisions.

A Wallet/Responder SHOULD use `fulfilled` or `partial` only when at least one returned Artifact lists the item id in `fulfills[]`, unless a registered extension explicitly defines a non-Artifact fulfillment pattern. A Wallet/Responder SHALL NOT use `fulfilled` to hide a Holder decline, unsupported selector, unavailable content, or processing error.

### 6.5 Many-to-many fulfillment

The response model supports many-to-many fulfillment between request items and Artifacts.

A Wallet/Responder MAY use one Artifact to fulfill multiple request items when the same clinical content accurately satisfies each listed item and the Artifact `mediaType` is accepted by every listed item.

A Wallet/Responder MAY use multiple Artifacts to fulfill one request item when the item is naturally represented by multiple credentials, multiple FHIR Resources or Bundles, multiple FHIR versions, multiple sources, or multiple accepted media types. Each such Artifact SHALL list the item id in `fulfills[]`.

A Verifier SHALL evaluate fulfillment links by exact item id references, not by Artifact array order or status array order. A Verifier SHALL NOT assume that one `fulfilled` status corresponds to exactly one Artifact, and SHALL NOT assume that one Artifact corresponds to exactly one item.

When one item is fulfilled by multiple Artifacts, the Requester/receiver is responsible for downstream reconciliation, deduplication, provenance assessment, and workflow handling according to local policy. This specification defines the response accounting and validation surface; it does not define EHR write-back or clinical reconciliation.

### 6.6 Cross-validation rules Verifier SHALL apply

A Verifier SHALL validate a SMART response against the original SMART request before the Requester consumes returned clinical content. At minimum, the Verifier SHALL apply the following checks:

1. **Response identity.** The response `type` is `"smart-health-checkin-response"`, `version` is `"1"`, and `requestId` exactly equals the original request `id`.
2. **Artifact ids.** Every Artifact has a non-empty `id`, and Artifact ids are unique within the response.
3. **Fulfillment references.** Every `artifacts[].fulfills[]` value resolves to exactly one item in the original request.
4. **Accepted media types.** For each Artifact and each item id listed in that Artifact's `fulfills[]`, the Artifact `mediaType` appears in that request item's `accept[]`, except where a registered compatibility rule explicitly defines compatible substitution semantics.
5. **Status coverage.** `requestStatus[]` contains exactly one entry for every original request item and contains no entries for unknown or duplicate items.
6. **Core Artifact shape.** `application/smart-health-card` Artifacts contain `value.verifiableCredential[]` and do not carry an outer `fhirVersion`; `application/fhir+json` Artifacts contain `fhirVersion` and `value`.
7. **FHIR version consistency.** For each `application/fhir+json` Artifact, the Verifier validates that the declared `fhirVersion` is acceptable for the fulfilled item(s) and for the Requester's processing policy. If the original request included `fhirVersions[]`, a Verifier SHOULD treat a raw FHIR JSON Artifact with an unlisted FHIR version as unacceptable unless local policy or a registered extension allows it. A Verifier SHALL treat all resources in one raw FHIR JSON Bundle as being under the Artifact's `fhirVersion` and SHALL reject a Bundle when it can determine that the Bundle mixes FHIR release versions.
8. **FHIR shape and profile evidence.** For raw FHIR JSON, the Verifier SHALL inspect the FHIR payload rather than relying on non-existent Artifact profile summary fields. For a single resource, relevant profile evidence is in `value.meta.profile` and other FHIR conformance evidence available to the receiver. For a Bundle, relevant profile evidence is in `value.entry[].resource.meta.profile` and any Bundle-level `value.meta.profile` that is meaningful for the Bundle itself. A Verifier SHOULD use `meta.profile` as evidence for `profiles[]` and `profilesFrom[]` matching, but this section does not require full FHIR profile validation for every returned resource.
9. **Status-to-Artifact consistency.** A Verifier SHOULD flag a response for local review if an item has `fulfilled` or `partial` status but no Artifact fulfills that item, or if an item has `declined`, `unavailable`, `unsupported`, or `error` status while Artifacts also claim to fulfill it, unless a registered extension defines that combination.

A Verifier SHALL fail validation rather than silently rewriting request ids, item ids, Artifact ids, media types, FHIR versions, or fulfillment links to make a response appear valid.

A Requester/receiver MAY apply additional clinical, provenance, trust, deduplication, and ingestion policy after these protocol checks pass. Those downstream checks do not replace the response-model validation required here.

## Organizer notes

### Strengths

- Preserves the accepted dependency facts: transport-neutral response object, `requestId` binding, media-type-centered Artifacts, per-item status, core SHC/FHIR shapes, and many-to-many fulfillment.
- Makes the Verifier's cross-validation obligations explicit and ties them back to T2.A `accept[]`, item ids, `fhirVersions[]`, selectors, and Questionnaire ambiguity.
- Keeps examples illustrative and avoids defining mdoc, kiosk, EHR ingestion, or issuer-trust behavior inside §6.

### Caveats

- The draft is intentionally stricter than active TypeScript for some semantic checks, especially media-type cross-validation, `requestStatus[]` exact coverage, mixed-version Bundle rejection, and status-to-Artifact consistency.
- `data` encoding for extension Artifacts remains undefined because active code only establishes it as a string; §13 or extension registrations must define concrete encoding.
- The draft uses `unsupported` as the preferred status for Questionnaire canonical/resource disagreement that makes the item ambiguous; organizers should confirm whether any cases should instead be `error`.

### Downstream dependencies

- Appendix B should encode required response fields, Artifact id uniqueness, `fulfills[]` non-empty arrays, SHC no-`fhirVersion`, raw FHIR required `fhirVersion`, and status-code enum where JSON Schema can express them.
- Appendix H should align Bundle, single-resource, `meta.profile`, QuestionnaireResponse, and mixed-FHIR-version guidance with these rules.
- §13 should finalize extension Artifact/media-type registration and status-code registry mechanics, including compatibility rules for `accept[]` substitution.
- §8 and §9 should call §6 validation after extracting the SMART response from same-device or kiosk transport wrappers.
