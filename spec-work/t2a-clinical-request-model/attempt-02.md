# T2.A Request model — attempt 02

## 5. Clinical content — request

This section defines the SMART request: the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, for check-in content. The same SMART request semantics apply when the object is carried by the same-device presentation flow, embedded directly as `smartRequest` in the cross-device kiosk wrapper, or carried by a future binding. Transport bindings can add origin, Verifier, reader-authentication, encryption, freshness, and relay metadata, but they do not change the clinical meaning of this object.

### 5.1 Encoding rules

A SMART request is a JSON object encoded as UTF-8 JSON.

A Requester SHALL serialize a SMART request as JSON conforming to RFC 8259. A Requester SHALL NOT emit JSON text containing comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, or `-Infinity`.

A Wallet/Responder that parses a SMART request SHALL reject a request that is not a JSON object, is not encoded as UTF-8 in the containing transport, contains duplicate object member names detected by the parser, or contains values outside the JSON data model.

Unless a field definition states otherwise, JSON object member order has no clinical meaning. Arrays are ordered when the field definition says they are ordered; in this section, `fhirVersions[]` and `accept[]` use array order to express Requester preference.

A Requester SHALL represent all identifiers and FHIR canonicals in this section as JSON strings. This section defines no JSON numeric fields. A Requester SHALL NOT encode booleans or arrays as strings.

A Requester SHOULD keep `SmartHealthCheckinRequest.id` and `items[].id` short enough for display, logging, and cross-reference use. This draft proposes a maximum of 128 Unicode scalar values for `SmartHealthCheckinRequest.id` and 64 ASCII characters for `items[].id`; see Organizer notes because active prototype validators currently enforce non-empty strings and item-id uniqueness, but not final length limits.

A Wallet/Responder that encounters an unknown top-level member or unknown request-item member MAY ignore that member. A Requester SHALL NOT rely on an unknown member to convey requester identity, to change the meaning of a standard selector, to override `accept[]`, or to impose consent behavior. Unknown `content.kind` values are not ignored; they are extension selectors governed by §5.4.3.

### 5.2 `SmartHealthCheckinRequest` top-level fields

A SMART request has this top-level shape:

```ts
interface SmartHealthCheckinRequest {
  type: "smart-health-checkin-request";
  version: "1";
  id: string;
  purpose?: string;
  fhirVersions?: string[];
  items: SmartHealthCheckinRequestItem[];
}
```

A Requester SHALL include `type`, `version`, `id`, and `items`. A Requester MAY include `purpose` and `fhirVersions`.

#### 5.2.1 `type`

A Requester SHALL set `SmartHealthCheckinRequest.type` to the fixed string `"smart-health-checkin-request"`.

A Wallet/Responder SHALL reject a SMART request whose `type` is absent or is not exactly `"smart-health-checkin-request"`.

#### 5.2.2 `version`

A Requester SHALL set `SmartHealthCheckinRequest.version` to the fixed string `"1"` for this version of the request model. This is the SMART Health Check-in request-model version; it is not the FHIR version.

A Wallet/Responder SHALL reject a SMART request whose `version` is absent or is not exactly `"1"`, unless that Wallet/Responder explicitly implements another version of this specification and has selected that version by a later-defined version-negotiation rule.

#### 5.2.3 `id`

A Requester SHALL include `id` as a non-empty opaque string identifying this SMART request within the Requester's check-in session. The Requester SHOULD generate `id` values with enough uniqueness to avoid collision among active requests it creates.

A Requester SHALL NOT place patient identifiers, encounter identifiers, account numbers, requester names, URLs, or other human-meaningful identity metadata in `id` unless the deployment has separately determined that those values are appropriate for all logs and protocol locations where request ids appear.

A Wallet/Responder SHALL treat `id` as an opaque correlation value. A Wallet/Responder SHALL NOT infer requester identity, patient identity, authorization, or clinical meaning from the syntax of `id`.

#### 5.2.4 `purpose`

`purpose` is an optional Holder-facing display and workflow-context string. Examples include `"Clinic check-in"`, `"Insurance verification"`, and `"Pre-visit intake"`.

A Requester MAY include `purpose` to help the Holder understand why the requested items are being asked for. If `purpose` is present, the Requester SHALL use it to describe the workflow purpose, not the Requester's identity.

A Requester SHALL NOT use `purpose` as a requester identity claim, verified organization name, logo surrogate, origin claim, consent directive, or persistent authorization grant.

A Wallet/Responder MAY display `purpose` to the Holder as untrusted request context. A Wallet/Responder SHALL NOT present `purpose` as verified requester identity unless that identity is established by the selected presentation transport, trust policy, or local Wallet policy outside the SMART request body.

#### 5.2.5 `fhirVersions[]`

`fhirVersions` is an optional ordered array of FHIR release-version strings that the Requester can consume for raw FHIR JSON content returned outside SMART Health Cards. Examples include `"4.0.1"`, `"4.3.0"`, and `"5.0.0"`.

A Requester that includes `fhirVersions` SHALL encode it as an array of strings ordered from most preferred to least preferred. A Requester SHOULD include at least one FHIR release version when any request item accepts `application/fhir+json`.

A Wallet/Responder that returns raw FHIR JSON for an item SHOULD choose a FHIR version from `fhirVersions[]` when it can do so while satisfying the item and the Holder's choices. A Wallet/Responder MAY return no Artifact for an item, or report an appropriate per-item status under §6, when it cannot produce a raw FHIR JSON Artifact in a version acceptable to the Requester.

For SMART Health Card Artifacts, the authoritative FHIR version is declared inside each signed SMART Health Card credential payload, not by `fhirVersions[]`.

#### 5.2.6 `items[]`

`items` is the array of request items. Each item describes one unit of requested clinical content or action, its Holder-facing text, its content selector, and the response media types the Requester can consume for that item.

A Requester SHALL encode `items` as an array. A Requester SHOULD include at least one item. A Wallet/Responder SHALL reject a request whose `items` member is absent or is not an array.

#### 5.2.7 Prohibited requester identity metadata

The SMART request body is not a requester identity credential.

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited identity metadata includes, but is not limited to, requester organization name, clinic name, logo, brand image URL, homepage URL, staff name, physical address, certificate subject, trust-framework assertion, or origin claim, when those fields are included to identify who is asking.

A Requester SHALL convey requester identity, Verifier identity, origin context, signatures, reader authentication, and other trust evidence through the selected presentation transport, trust framework, or deployment policy, not through ad hoc SMART request fields.

A Wallet/Responder SHALL NOT treat any SMART request body field, including unknown fields, `purpose`, `title`, or `summary`, as verified requester identity. A Wallet/Responder MAY use those fields as untrusted Holder-facing context.

#### 5.2.8 Examples: minimal and fuller SMART requests

The examples in this subsection are examples only. They do not add requirements beyond the prose above.

Example: minimal request for any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "request-123",
  "items": [
    {
      "id": "any-fhir",
      "title": "FHIR resources for check-in",
      "content": {
        "kind": "fhir.resources"
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example: fuller request with profile selectors, a profile-family selector, an inline Questionnaire, ordered FHIR versions, and ordered per-item media-type preferences:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "clinic-checkin-123",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1", "4.3.0"],
  "items": [
    {
      "id": "patient",
      "title": "Patient demographics",
      "summary": "Demographics for check-in.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
        ]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "clinical-history",
      "title": "US Core clinical resources",
      "summary": "Problems, medications, allergies, and other available US Core resources.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ],
        "resourceTypes": ["Condition", "MedicationRequest", "AllergyIntolerance"]
      },
      "accept": ["application/smart-health-card", "application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Migraine intake form",
      "content": {
        "kind": "questionnaire",
        "questionnaire": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
          "status": "active",
          "title": "Migraine Check-in",
          "item": []
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

### 5.3 `SmartHealthCheckinRequestItem`

A request item has this shape:

```ts
interface SmartHealthCheckinRequestItem {
  id: string;
  title: string;
  summary?: string;
  required?: boolean;
  content: SmartHealthCheckinContentSelector;
  accept: string[];
}
```

A Requester SHALL include `id`, `title`, `content`, and `accept` for each request item. A Requester MAY include `summary` and `required`.

#### 5.3.1 `id` uniqueness and character set

A Requester SHALL assign each item an `id` that is unique within the containing SMART request. Response Artifacts and per-item status entries use these item ids to refer back to the request.

A Wallet/Responder SHALL reject a SMART request that contains duplicate `items[].id` values.

This draft proposes that a Requester SHALL use item ids matching the following ASCII pattern:

```text
^[A-Za-z0-9._~-]{1,64}$
```

The proposed character set avoids whitespace, JSON Pointer delimiters, URL query delimiters, and characters that are commonly confused in logs or form field names, while allowing current example ids such as `patient`, `coverage`, `clinical-history`, and `intake`.

Organizer note: active prototype validators require non-empty strings and uniqueness, but do not yet enforce this final character set. If the organizer accepts this rule, Appendix B and implementations need an alignment change.

#### 5.3.2 `title`

`title` is a short Holder-facing title for the item.

A Requester SHALL include `title` as a non-empty string. A Requester SHOULD write `title` as a description of the requested content or action, not as the Requester's identity.

A Wallet/Responder SHOULD make `title` available for Holder review when the selected flow includes Holder review.

#### 5.3.3 `summary`

`summary` is an optional Holder-facing explanation of the requested content.

A Requester MAY include `summary` to provide detail that does not fit in `title`. If `summary` is present, the Requester SHALL encode it as a string. A Requester SHOULD use `summary` to describe the item, clinical content, or workflow relevance; the Requester SHOULD NOT use `summary` to make requester identity claims.

A Wallet/Responder MAY display `summary` to the Holder as untrusted request context.

#### 5.3.4 `required`

`required` is an optional boolean indicating that the Requester considers the item important for its downstream workflow. If `required` is absent, the item is interpreted as not marked required.

A Requester SHALL encode `required`, when present, as a JSON boolean.

A Requester SHALL treat `required` as advisory workflow metadata. A Requester SHALL NOT use `required: true` to imply that the Holder has already consented, that the Wallet must disclose content, or that the Wallet must prevent the Holder from declining the item.

A Wallet/Responder MAY use `required` in Holder-facing display or ordering. A Wallet/Responder SHALL NOT treat `required: true` as authorization to bypass Holder control, Wallet policy, or applicable law. A Wallet/Responder MAY allow the Holder to decline a required item; downstream Requester handling of a missing required item is outside the request body and is reflected by response status and local workflow.

#### 5.3.5 `accept[]`

`accept` is a non-empty ordered array of response media types that the Requester can consume for this item.

A Requester SHALL include `accept` as a non-empty array of strings. A Requester SHALL order `accept[]` from most preferred to least preferred for that item. There is no separate preference field.

A Wallet/Responder SHOULD choose the earliest media type in `accept[]` that it supports, that is available from Holder data sources, and that can satisfy the item under Holder choices and Wallet policy. A Wallet/Responder MAY choose a later media type when an earlier media type is unavailable, unsupported, or not authorized by the Holder.

A Wallet/Responder SHALL NOT return an Artifact for an item using a media type that is absent from that item's `accept[]`. Detailed response validation is defined in §6.

#### 5.3.6 `content`

`content` is the selector object describing the requested clinical content or action.

A Requester SHALL include `content` as a JSON object with a `kind` string. A Wallet/Responder SHALL reject an item whose `content` member is absent, is not an object, or lacks a `kind` string that the Wallet/Responder can process as a core selector or extension selector.

Core selector kinds are `"fhir.resources"` and `"questionnaire"`. Extension selectors are governed by §5.4.3.

### 5.4 Content selectors

A content selector describes acceptable clinical content for a request item. It is not a FHIR search query language, a clinical decision support expression, a patient-matching rule, or an authorization policy.

A Requester SHALL encode each selector as an object with a `kind` member. A Requester SHALL NOT use a selector to carry requester identity metadata or presentation-transport metadata.

A Wallet/Responder SHALL evaluate selectors according to their `kind`. A Wallet/Responder that does not support a selector kind SHALL NOT reinterpret it as another selector kind. Unsupported selector outcomes are reported in the SMART response under §6.

#### 5.4.1 `fhir.resources`

A `fhir.resources` selector requests patient-specific FHIR resources. It has this shape:

```ts
interface FhirResourcesContentSelector {
  kind: "fhir.resources";
  profiles?: string[];
  profilesFrom?: string[];
  resourceTypes?: string[];
}
```

A Requester SHALL set `content.kind` to `"fhir.resources"` for this selector.

A Requester MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, or any combination of those members. A Requester SHALL encode each included member as an array of strings. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, implementation-guide manifest, or other non-array value.

A Wallet/Responder SHALL reject a `fhir.resources` selector whose `profiles`, `profilesFrom`, or `resourceTypes` member is present but is not an array of strings. A Wallet/Responder SHALL reject a `profilesFrom` member that is an empty array.

##### 5.4.1.1 `profiles[]` — exact `StructureDefinition` canonicals

`profiles[]` identifies exact FHIR profile canonicals, normally `StructureDefinition` canonical URLs. A Requester MAY include a FHIR canonical `|version` suffix as described in §5.5.

A Requester SHOULD use canonical `StructureDefinition` URLs in `profiles[]`. A Requester MAY include a `|version` suffix when it needs a specific profile version.

A Wallet/Responder evaluating `profiles[]` SHOULD consider a resource responsive when the resource can be matched to at least one requested profile canonical under §5.5. For raw FHIR resources, the usual evidence is `Resource.meta.profile`; other Holder data sources can provide equivalent profile knowledge.

##### 5.4.1.2 `profilesFrom[]` — profile-family canonicals

`profilesFrom[]` identifies one or more profile families by canonical URL. A profile family can be a FHIR implementation guide, publication, profile collection, or other published family of FHIR profiles.

A Requester SHALL encode `profilesFrom` as a non-empty array of canonical URLs when the member is present. A Requester SHALL NOT use registered URNs, package ids, package versions, npm package names, or objects in `profilesFrom[]` unless a later version of this specification or a registered extension defines such a value space.

A Wallet/Responder evaluating `profilesFrom[]` SHOULD consider a resource responsive when the Wallet/Responder can determine that the resource conforms to a profile that belongs to at least one requested profile family, subject to `resourceTypes[]` when present. This specification does not require every Wallet to know every profile-family membership; unsupported or unavailable matches are reported under §6.

##### 5.4.1.3 `resourceTypes[]` — official FHIR resource type names

`resourceTypes[]` narrows a `fhir.resources` request using official FHIR resource type names such as `Patient`, `Coverage`, `Condition`, `MedicationRequest`, `Observation`, or `AllergyIntolerance`.

A Requester SHALL use official FHIR resource type names in `resourceTypes[]`. A Requester SHALL NOT use local topic labels such as `"care-plans"`, `"insurance"`, or `"clinical-history"` in `resourceTypes[]`.

A Wallet/Responder evaluating `resourceTypes[]` SHALL treat it as a resource-type constraint. If `resourceTypes[]` is present with `profiles[]` or `profilesFrom[]`, a responsive resource must both have a `resourceType` listed in `resourceTypes[]` and match at least one profile selector under the additivity rule in §5.4.1.4. If `resourceTypes[]` is present without `profiles[]` or `profilesFrom[]`, the selector requests patient-specific FHIR resources whose `resourceType` is listed in `resourceTypes[]`.

##### 5.4.1.4 Additivity rule when both `profiles[]` and `profilesFrom[]` are present

`profiles[]` and `profilesFrom[]` are additive profile selectors.

A Wallet/Responder evaluating a `fhir.resources` selector that contains both `profiles[]` and `profilesFrom[]` SHALL treat a resource as satisfying the profile portion of the selector if the resource matches any exact profile in `profiles[]` or matches any profile from any family in `profilesFrom[]`, subject to `resourceTypes[]` when present.

A Wallet/Responder SHALL NOT interpret `profiles[]` as narrowing `profilesFrom[]`. Exact profiles can highlight specific records of interest, but they do not limit the broader profile-family request.

##### 5.4.1.5 No-selector default

If a `fhir.resources` selector omits all of `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, the selector requests any patient-specific FHIR resources that the Wallet/Responder can offer and the Holder chooses to share.

A Requester SHOULD use the no-selector default only when it can safely process broad patient-specific FHIR content and when a more specific FHIR selector would not better express the check-in need.

A Wallet/Responder MAY satisfy a no-selector request with any patient-specific FHIR resources available under Holder choices and Wallet policy, using a media type listed in `accept[]`.

##### 5.4.1.6 Examples

The examples in this subsection are examples only.

Example: exact CARIN digital insurance card Coverage profile:

```json
{
  "kind": "fhir.resources",
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ]
}
```

Example: broad US Core profile-family request:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Example: US Core profile-family request narrowed to selected resource types, with an additional exact profile called out additively:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
  ],
  "resourceTypes": ["Condition", "MedicationRequest", "AllergyIntolerance"]
}
```

#### 5.4.2 `questionnaire`

A `questionnaire` selector asks the Wallet/Responder to support completion of a FHIR Questionnaire and return the resulting answers in an accepted response media type. For `application/fhir+json`, the expected clinical response content is a FHIR `QuestionnaireResponse`; response details are defined in §6.

The selector has this shape:

```ts
type QuestionnaireRef =
  | string
  | Questionnaire
  | { canonical?: string; resource?: Questionnaire };

interface QuestionnaireContentSelector {
  kind: "questionnaire";
  questionnaire: QuestionnaireRef;
}
```

A Requester SHALL set `content.kind` to `"questionnaire"` for this selector. A Requester SHALL include `questionnaire` as one of: a FHIR canonical string, an inline FHIR `Questionnaire` resource object, or an object containing at least one of `canonical` or `resource`.

A Wallet/Responder SHALL reject or report unsupported for a `questionnaire` selector whose `questionnaire` member is absent, blank, or not one of those shapes.

##### 5.4.2.1 By canonical

A Requester MAY identify a Questionnaire by a FHIR canonical string. A Requester MAY include a `|version` suffix in that canonical.

Example:

```json
{
  "kind": "questionnaire",
  "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|2026.04"
}
```

A Wallet/Responder that fetches a Questionnaire by canonical SHALL apply the canonical-fetch rule in §5.5: the network fetch URL is the portion before `|`, while the original canonical string, including any `|version`, remains the semantic Questionnaire identifier.

##### 5.4.2.2 Inline `Questionnaire`

A Requester MAY include an inline FHIR `Questionnaire` resource as the `questionnaire` value.

A Requester that includes an inline Questionnaire SHALL set its `resourceType` to `"Questionnaire"`. A Wallet/Responder SHALL reject or report unsupported for an inline questionnaire resource whose `resourceType` is present and is not `"Questionnaire"`.

Example:

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

##### 5.4.2.3 Combined canonical and resource

A Requester MAY provide both a canonical and an inline Questionnaire resource by using an object with `canonical` and `resource` members. This form lets a Wallet/Responder render the inline resource without fetching while preserving the canonical identity to be echoed in generated FHIR content.

A Requester that uses the combined form SHALL include at least one of `canonical` or `resource`. If `canonical` is present, the Requester SHALL encode it as a non-empty string. If `resource` is present, the Requester SHALL encode it as a FHIR `Questionnaire` resource object.

Example:

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|2026.04",
    "resource": {
      "resourceType": "Questionnaire",
      "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
      "version": "2026.04",
      "status": "active",
      "title": "Migraine Check-in",
      "item": []
    }
  }
}
```

##### 5.4.2.4 Wallet behavior when both forms supplied disagree

A Requester SHOULD ensure that a combined-form `canonical` agrees with the inline `resource`. In particular, when `resource.url` is present, it SHOULD equal the canonical URL portion before any `|version`; when `resource.version` is present and `canonical` contains `|version`, those version values SHOULD identify the same Questionnaire version.

A Wallet/Responder that detects a disagreement between `canonical` and `resource` SHALL NOT silently answer a different Questionnaire than the one it presents to the Holder. The Wallet/Responder SHALL either:

1. use the inline `resource` as the Questionnaire presented to the Holder and preserve the supplied `canonical` as the requested Questionnaire identity in any generated FHIR response content where applicable; or
2. treat the item as unsupported or erroneous under §6.

A Wallet/Responder SHOULD choose option 2 when the disagreement could cause the Holder to answer one Questionnaire while the Requester believes a materially different Questionnaire was answered.

##### 5.4.2.5 Example: inline migraine intake

The example in this subsection is an example only.

```json
{
  "id": "intake",
  "title": "Migraine Check-in",
  "content": {
    "kind": "questionnaire",
    "questionnaire": {
      "resourceType": "Questionnaire",
      "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
      "status": "active",
      "title": "Migraine Check-in",
      "item": [
        {
          "linkId": "headache",
          "text": "Are you experiencing a headache today?",
          "type": "boolean"
        }
      ]
    }
  },
  "accept": ["application/fhir+json"]
}
```

#### 5.4.3 Extension selectors and registration rules

A selector whose `content.kind` is not `"fhir.resources"` or `"questionnaire"` is an extension selector.

A Requester SHALL NOT use an unregistered or privately defined extension selector when interoperable processing by independent Wallets is required. A Requester MAY use a private extension selector only by prior agreement with the intended Wallet/Responder and Verifier ecosystem.

An extension registrant SHALL define all of the following for each registered extension selector kind:

- the exact `content.kind` string;
- the JSON shape of the selector;
- which members are required and optional;
- matching semantics for Wallet/Responder processing;
- interaction with `accept[]` and any required or recommended response media types;
- Holder-facing display expectations, if any;
- security and privacy considerations;
- JSON Schema implications for Appendix B; and
- whether unknown members inside the extension selector are ignored, rejected, or reserved.

An extension registrant SHALL NOT define an extension selector kind that redefines the meaning of `type`, `version`, `id`, `purpose`, `fhirVersions`, `items`, request-item `required`, request-item `accept`, `fhir.resources`, or `questionnaire`. An extension registrant SHALL NOT define an extension selector kind that permits requester identity metadata in the SMART request body.

A Wallet/Responder that does not support an extension selector SHALL report the item as unsupported under §6 rather than treating it as a core selector or silently satisfying a different request.

### 5.5 Canonical `|version` handling

FHIR canonicals can append a version suffix using `canonical|version`. This section distinguishes operations that preserve the suffix from operations that strip it for lookup or routing.

A Requester, Wallet/Responder, or Verifier performing an operation in the following table SHALL apply the handling rule for that operation.

| Operation | Conformance target | Handling | Reason |
| --- | --- | --- | --- |
| Parse, carry, log, sign, encrypt, compare transport bytes, or include in test fixtures | Requester, Wallet/Responder, Verifier | Preserve the canonical string exactly as it appeared in the SMART request or response. | Wire evidence and diagnostics must reflect the actual value sent. |
| HTTP fetch of a canonical Questionnaire or other FHIR conformance resource | Wallet/Responder | Strip the `|version` suffix before constructing the network URL; retain the original canonical as semantic identity. | A versioned canonical is not necessarily a literal URL. |
| Wallet-side item routing or broad kind classification | Wallet/Responder | Strip `|version` for routing decisions. | Routing to coverage, clinical, questionnaire, or similar local handlers should not depend on version suffix syntax. |
| Profile-family membership for `profilesFrom[]` | Wallet/Responder | Strip `|version` before family lookup unless a registered profile-family definition says otherwise. | Profile-family matching is broad and version-agnostic by default. |
| Exact `profiles[]` matching when the request value has no `|version` | Wallet/Responder | Match resources known to conform to any version of the requested canonical. | An unversioned profile request intentionally permits supported profile versions. |
| Exact `profiles[]` matching when the request value includes `|version` | Wallet/Responder | Preserve and compare the version suffix when version evidence is available; do not strip only one side of the comparison. | A versioned profile request asks for that profile version. |
| Profile de-duplication or grouping for display | Wallet/Responder | May group values that differ only by `|version`, but must not lose exact values needed for response construction, logs, or validation. | Display grouping is not the same as semantic erasure. |
| `QuestionnaireResponse.questionnaire` generated for a questionnaire item | Wallet/Responder | Preserve the request canonical, including `|version`, when that canonical is the Questionnaire identity being answered. | The Requester needs to know which exact Questionnaire version was answered. |
| Returned FHIR `Resource.meta.profile` | Wallet/Responder | Preserve `|version` values that are present in source data or generated claims. | Profile version claims are part of FHIR resource provenance/conformance evidence. |
| Verifier-side exact conformance checks against returned resources | Verifier | Compare at the same level on both sides: versioned-to-versioned when exact version was requested and evidence is present; unversioned-to-base-canonical when the request was unversioned. | Stripping one side only creates false matches and false failures. |

A Wallet/Responder SHALL NOT rewrite a requested canonical in a way that changes the semantic Questionnaire or profile being requested. A Verifier SHALL preserve canonical strings from the request when validating the response, except where this table explicitly says that a lookup or grouping operation strips `|version`.

### 5.6 Accepted media types and ordering semantics

`accept[]` is per-item media-type negotiation. It tells the Wallet/Responder which response Artifact media types the Requester can consume for that item and in what order the Requester prefers them.

A Requester SHALL include a non-empty `accept[]` array on every request item. A Requester SHALL use media type strings, not local labels, in `accept[]`. A Requester SHALL order the array from most preferred to least preferred.

A Requester SHOULD include only media types it can parse, validate, and route for the corresponding item. A Requester SHOULD NOT list `application/smart-health-card` for an item if it cannot process SMART Health Card file JSON with `verifiableCredential[]`. A Requester SHOULD NOT list `application/fhir+json` for an item if it cannot process raw FHIR JSON Artifacts and their `fhirVersion` declarations.

The core media types are:

- `application/fhir+json`: raw FHIR JSON. For questionnaire items, this media type indicates that the Requester can consume a FHIR `QuestionnaireResponse`. For FHIR resource items, it indicates that the Requester can consume raw FHIR Resource or Bundle content. Response Artifact details are defined in §6.
- `application/smart-health-card`: SMART Health Card file JSON whose `verifiableCredential[]` entries contain SMART Health Card JWS strings. Response Artifact details are defined in §6.

A Wallet/Responder SHOULD select the earliest listed media type that it supports and can produce for the item, subject to Holder choice and Wallet policy. A Wallet/Responder MAY select a later listed media type when earlier listed media types cannot be produced or are not authorized by the Holder.

A Wallet/Responder SHALL NOT return a media type for a request item unless that media type appears in the item's `accept[]`. If one Artifact fulfills multiple request items, §6 validation must ensure the Artifact media type is acceptable for every fulfilled item.

A Requester MAY include extension media types in `accept[]`. An extension registrant that defines a media type for SMART Health Check-in use SHALL define its Artifact shape, validation rules, security and privacy considerations, and interaction with any selector kinds that require or recommend that media type.

## Organizer notes

### Strengths

- Preserves the clinical-content/transport split: the SMART request is a transport-neutral JSON object, and requester identity stays in transport/trust layers rather than in the clinical body.
- Makes `profilesFrom[]` a non-empty array of canonical profile-family URLs and explicitly rejects string, object, package-descriptor, and URN shapes for version 1.
- Defines `profiles[]` plus `profilesFrom[]` as additive profile selectors while treating `resourceTypes[]` as a separate narrowing constraint.
- Gives concrete conformance targets for Requester, Wallet/Responder, Verifier, and extension registrant requirements.
- Defines questionnaire canonical, inline, and combined forms, including a conservative disagreement rule that avoids silent Questionnaire substitution.
- Keeps kiosk wrapper details out of §5 except to preserve the invariant that kiosk embeds the SMART request directly as `smartRequest` and does not alter request semantics.

### Caveats and open issues

- The proposed `items[].id` character set and length limit are opinionated. Active code currently enforces non-empty strings and uniqueness but not this regex; accepting it requires validator, schema, and fixture alignment.
- The proposed top-level `id` length guidance is not enforced in active code. The organizer should decide whether to make a hard maximum normative in §5, put limits in Appendix B only, or defer to transport size limits.
- Active TypeScript validation currently allows `items: []`; this draft uses a Requester SHOULD rather than SHALL for at least one item. The organizer may choose to make non-empty `items[]` normative if empty requests have no valid use.
- The exact degree of Wallet obligation for `profilesFrom[]` membership knowledge remains deployment-sensitive. This draft requires shape and additive semantics but lets unsupported profile-family knowledge surface through response status.
- Questionnaire disagreement behavior is stricter than current prototype fetch/hydration behavior. If accepted, tests should cover canonical/resource mismatch handling.
- Extension-selector registration depends on the later §13 content-selector registry and §4 conformance model.

### Downstream dependencies

- §6 response validation must enforce `requestId`, per-item status coverage, Artifact `fulfills[]`, and the rule that each Artifact media type appears in every fulfilled item's `accept[]`.
- Appendix B JSON Schema must encode the fixed `type` and `version`, `profilesFrom[]` array shape, request-item id uniqueness where possible, accepted selector shapes, and any final id regex/length constraints.
- Appendix H FHIR mapping should align `fhir.resources` matching, `resourceTypes[]` narrowing, `meta.profile`, Bundles, and `QuestionnaireResponse.questionnaire` with §§5.4–5.5.
- §8 and §9 transport sections should carry the SMART request without changing these semantics; §9 should continue to embed the SMART request directly as `smartRequest` in the kiosk payload.
- §13 registry work must define extension selector and extension media-type registration procedures without reopening core selector semantics.
