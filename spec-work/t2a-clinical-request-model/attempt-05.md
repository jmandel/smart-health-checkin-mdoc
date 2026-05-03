## 5. Clinical content — request

The SMART request is the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, for workflow-bounded clinical or administrative content. The same SMART request semantics apply when the object is carried by the same-device presentation flow, embedded directly as `smartRequest` in the cross-device kiosk payload, or carried by a future binding. Kiosk wrapper fields, pointer URLs, signatures, encryption, relay state, and completion-processing fields are defined in §9 and do not alter the clinical semantics defined here.

The SMART request body is not a requester identity credential. It carries Holder-facing display/workflow context and item-level clinical selectors. Requester identity, Verifier identity, origin, reader authentication, kiosk-creator signatures, trust anchors, and related metadata belong to presentation transport, trust processing, or local policy, not to self-asserted fields in the clinical request body.

### 5.1 Encoding rules

A SMART request is a JSON object encoded as UTF-8 JSON as defined by [RFC8259].

A Requester SHALL encode a SMART request as a JSON object, not as a JSON array, string, number, or literal. A Requester SHALL NOT use comments, trailing commas, `NaN`, `Infinity`, duplicate object member names, or other non-JSON extensions in a SMART request.

A Wallet/Responder SHALL reject a SMART request that is not valid UTF-8 JSON or whose top-level value is not a JSON object. A Wallet/Responder SHALL reject a SMART request that contains duplicate object member names in any object it processes if duplicate-name detection is available in the JSON parser or validation layer used by the Wallet/Responder. If duplicate-name detection is not available, the Wallet/Responder SHOULD fail closed for security-sensitive deployments rather than applying parser-specific “last member wins” behavior silently.

A Requester SHALL represent all field names exactly as specified in this section. Field names are case-sensitive. A Requester SHALL represent identifiers, FHIR canonicals, media types, FHIR versions, resource type names, titles, summaries, and purpose values as JSON strings.

A Wallet/Responder SHALL ignore unknown members in a SMART request unless this section or an extension specification registered under §5.4.3 assigns meaning to that member. Ignoring an unknown member does not make a malformed known member valid. A Requester SHOULD NOT include unknown members in the core request object except for registered extensions whose behavior is understood by the intended Wallet/Responder population.

Organizer note: active implementations validate the core field shapes but do not yet define uniform maximum lengths for strings or arrays. This draft does not invent hard numeric limits for §5.1; §8, §9, Appendix B, and fixture work should add transport and schema limits where needed.

### 5.2 `SmartHealthCheckinRequest` top-level fields

A `SmartHealthCheckinRequest` has the following shape:

```text
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": string,
  "purpose"?: string,
  "fhirVersions"?: string[],
  "items": SmartHealthCheckinRequestItem[]
}
```

A Requester SHALL include `type`, `version`, `id`, and `items`. A Requester MAY include `purpose` and `fhirVersions`. A Requester SHALL NOT include requester identity metadata in the SMART request body as described in §5.2.7.

#### 5.2.1 `type`

A Requester SHALL set `SmartHealthCheckinRequest.type` to the exact string `"smart-health-checkin-request"`.

A Wallet/Responder SHALL reject a SMART request whose `type` member is absent or is not exactly `"smart-health-checkin-request"`.

#### 5.2.2 `version`

A Requester SHALL set `SmartHealthCheckinRequest.version` to the exact string `"1"` for this version of the SMART request schema. This value is the SMART Health Check-in request-model version; it is not a FHIR version.

A Wallet/Responder SHALL reject a SMART request whose `version` member is absent or is not exactly `"1"`, unless a future version-negotiation rule explicitly defines compatible handling.

#### 5.2.3 `id`

`id` is an opaque Requester-generated request identifier. It is used by the SMART response `requestId` field and by transport or wrapper bindings that need to bind a response or kiosk state to a request.

A Requester SHALL include `id` as a non-empty string. A Requester SHALL scope `id` so that it is unique among SMART requests created by that Requester for the same check-in session. A Requester SHOULD generate `id` values that are not predictable by parties outside the session.

A Wallet/Responder SHALL preserve the request `id` value for response construction so the response can echo it as `requestId` under §6.

Organizer note: the outline asks for recommended entropy and identifier limits. Active code only requires a non-empty string. A later organizer may choose a concrete URL-safe syntax and length limit, but this attempt does not make that unimplemented tightening normative for top-level `id`.

#### 5.2.4 `purpose`

`purpose` is optional Holder-facing display and workflow context. Examples include `"Clinic check-in"`, `"insurance verification"`, and `"pre-visit intake"`.

A Requester MAY include `purpose` to help a Wallet/Responder explain why the requested items are being requested. If present, a Requester SHALL encode `purpose` as a string.

A Requester SHALL NOT use `purpose` as requester identity metadata. In particular, `purpose` describes the workflow context, not the legal name, brand, logo, web origin, certificate identity, or trust status of the Requester or Verifier.

A Wallet/Responder MAY display `purpose` to the Holder as workflow context. A Wallet/Responder SHALL NOT treat `purpose` as authenticated requester identity.

#### 5.2.5 `fhirVersions[]`

`fhirVersions` is an optional ordered list of FHIR release versions the Requester can consume for raw FHIR JSON Artifacts and other response forms that rely on an outer FHIR version declaration. Examples include `"4.0.1"`, `"4.3.0"`, and `"5.0.0"`.

If present, a Requester SHALL encode `fhirVersions` as a JSON array of strings. A Requester SHOULD order `fhirVersions` from most preferred to least preferred.

A Wallet/Responder MAY use `fhirVersions` when choosing how to construct `application/fhir+json` Artifacts. `fhirVersions` does not override the FHIR version declared inside a SMART Health Card credential; SMART Health Card FHIR-version handling is defined by the SMART Health Cards content itself and by §6.

If `fhirVersions` is omitted, a Wallet/Responder MAY choose any FHIR version it can produce that is otherwise compatible with the selected media type and the Requester's accepted media types. Response validation rules in §6 determine whether a returned raw FHIR JSON Artifact is acceptable to the Verifier.

#### 5.2.6 `items[]`

`items` is the ordered list of request items. Each item describes one unit of requested content or action, Holder-facing item text, accepted response media types, and a content selector.

A Requester SHALL include `items` as a JSON array. A Requester SHALL include at least one item. A Requester SHALL ensure every member of `items` is a `SmartHealthCheckinRequestItem` as defined in §5.3.

A Wallet/Responder SHALL process `items` as the consent and response-accounting granularity for the SMART request. The order of `items` MAY be used by a Wallet/Responder for display, but item order does not change selector semantics or response fulfillment semantics.

#### 5.2.7 Prohibited requester identity metadata

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited requester identity metadata includes, but is not limited to, requester or clinic name fields, logos, logo URLs, brand URLs, claimed web origins, legal-entity identifiers, certificates, reader-authentication material, trust-chain material, or kiosk-creator identity claims.

This prohibition applies to the clinical request object itself, including the top-level object and request items. It does not prevent presentation transports from carrying authenticated origin, reader, or kiosk-creator information in their own envelopes. It also does not prevent `purpose`, `title`, or `summary` from describing the requested workflow or requested content, provided they are not used as identity assertions.

A Wallet/Responder SHALL NOT treat any string inside `purpose`, `title`, `summary`, selector values, or extension members as authenticated requester identity unless the same fact is established by the selected presentation transport or local trust policy.

#### 5.2.8 Examples

The examples in this subsection are illustrative. They do not create requirements beyond the normative text above.

Minimal FHIR resource request example:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-2025-001",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "patient",
      "title": "Patient demographics",
      "summary": "Demographics for check-in",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
        ]
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Fuller mixed request example:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-2025-002",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "coverage",
      "title": "Insurance card",
      "summary": "Coverage information for billing",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "clinical-history",
      "title": "US Core clinical resources",
      "summary": "Problems, medications, allergies, and related US Core records.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Migraine check-in",
      "content": {
        "kind": "questionnaire",
        "questionnaire": {
          "resourceType": "Questionnaire",
          "title": "Migraine Check-in",
          "status": "active",
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
  ]
}
```

### 5.3 `SmartHealthCheckinRequestItem`

A `SmartHealthCheckinRequestItem` has the following shape:

```text
{
  "id": string,
  "title": string,
  "summary"?: string,
  "required"?: boolean,
  "content": ContentSelector,
  "accept": string[]
}
```

A Requester SHALL include `id`, `title`, `content`, and `accept` for every request item. A Requester MAY include `summary` and `required`.

#### 5.3.1 `id` uniqueness and character set

`id` is the request-scoped identifier for a request item. Response Artifacts and per-item status entries refer to request items by this value.

A Requester SHALL encode each item `id` as a non-empty string. A Requester SHALL NOT repeat the same item `id` within one SMART request.

A Wallet/Responder SHALL reject a SMART request containing a missing, non-string, empty, or duplicate item `id`.

Proposed identifier syntax for organizer consideration: item ids should be simple URL-safe ASCII tokens matching `^[A-Za-z0-9._~-]+$`. Active implementations currently enforce non-empty uniqueness but not this character set. This draft therefore treats the character-set rule as an organizer note rather than a normative SHALL until Appendix B and implementation validators are aligned.

#### 5.3.2 `title`

`title` is short Holder-facing display text for the request item.

A Requester SHALL encode `title` as a non-empty string. A Requester SHOULD make `title` describe the requested content or action, not the identity of the Requester.

A Wallet/Responder MAY display `title` to the Holder. A Wallet/Responder SHALL NOT treat `title` as authenticated requester identity.

#### 5.3.3 `summary`

`summary` is optional Holder-facing explanatory text for the request item.

If present, a Requester SHALL encode `summary` as a string. A Requester SHOULD use `summary` to clarify the requested content, requested action, or workflow relevance. A Requester SHOULD NOT use `summary` to assert requester identity or trust status.

A Wallet/Responder MAY display `summary` to the Holder.

#### 5.3.4 `required`

`required` is an advisory workflow signal from the Requester. It indicates that the Requester considers the item important for the check-in workflow.

If present, a Requester SHALL encode `required` as a boolean. If `required` is omitted, a Wallet/Responder SHALL interpret it as `false` for display and decision-support purposes.

A Wallet/Responder MAY use `required` to explain the likely workflow impact of declining or omitting the item. A Wallet/Responder SHALL NOT treat `required: true` as overriding Holder control, Wallet policy, legal requirements, or consent UX requirements. A Holder may still decline an item, and the resulting SMART response can report declined, unavailable, partial, unsupported, or error outcomes as defined in §6.

#### 5.3.5 `accept[]`

`accept` is the non-empty ordered list of response media types the Requester can consume for this item.

A Requester SHALL encode `accept` as a non-empty JSON array of strings. A Requester SHALL order `accept` from most preferred to least preferred. A Requester SHALL NOT list a media type unless the Requester can process an Artifact of that media type for the item.

A Wallet/Responder MAY satisfy an item using any media type listed in that item's `accept[]`, subject to Holder decision, Wallet policy, available data, and the selector. A Wallet/Responder SHOULD choose the earliest acceptable media type it can produce when multiple choices are otherwise equivalent. A Wallet/Responder SHALL NOT return an Artifact for an item using a media type that is absent from that item's `accept[]`.

#### 5.3.6 `content`

`content` is the content selector for the item. A Requester SHALL encode `content` as an object with a `kind` member. A Requester SHALL use one of the selector kinds defined in §5.4 or a registered extension selector kind defined according to §5.4.3.

A Wallet/Responder SHALL reject an item whose `content` is absent, is not an object, or has an unsupported `kind`, unless an extension specification explicitly defines safe fallback behavior for that selector kind.

### 5.4 Content selectors (`content.kind`)

A content selector describes acceptable clinical content for a request item. Version 1.0 defines two core selector kinds:

- `fhir.resources`, for patient-specific FHIR resources; and
- `questionnaire`, for completion of a FHIR Questionnaire and return of a corresponding answer Artifact.

A Requester SHALL set `content.kind` to a string. A Wallet/Responder SHALL process the selector according to its `kind`. Selector matching determines whether clinical content is responsive to an item; it does not by itself decide whether the Holder consents to disclose it or whether the response transport is trusted.

### 5.4.1 `fhir.resources`

A `fhir.resources` selector requests patient-specific FHIR resources. It can contain any combination of the following optional members:

```text
{
  "kind": "fhir.resources",
  "profiles"?: string[],
  "profilesFrom"?: string[],
  "resourceTypes"?: string[]
}
```

A Requester SHALL set `kind` to `"fhir.resources"` for this selector. If `profiles`, `profilesFrom`, or `resourceTypes` is present, a Requester SHALL encode that member as an array of strings. The absence of one selector member does not make another selector member invalid.

#### 5.4.1.1 `profiles[]`

`profiles` lists exact FHIR `StructureDefinition` canonical URLs. A Requester SHOULD use canonical `StructureDefinition` URLs in `profiles[]`. A Requester MAY append a `|version` suffix when it needs an exact profile version.

A Wallet/Responder MAY treat a resource as matching `profiles[]` when the resource declares one of the listed profile canonicals in `meta.profile` or when the Wallet/Responder has equivalent local knowledge that the resource conforms to the listed profile. Exact conformance validation is deployment- and data-source-specific unless a later profile or validation rule makes it mandatory.

#### 5.4.1.2 `profilesFrom[]`

`profilesFrom` is the broad, FHIR-native selector for profile families. Each value is a canonical URL identifying a FHIR publication, implementation guide, profile collection, or other profile family whose resource profiles are acceptable.

A Requester SHALL encode `profilesFrom` as a non-empty array of canonical profile-family URLs when the member is present. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, package id, version object, or other non-array shape. Version 1.0 does not define registered URNs for profile families; deployments that need non-URL identifiers require an extension selector or future registry rule.

A Wallet/Responder SHALL reject a `fhir.resources` selector with `profilesFrom` present but not encoded as a non-empty array of strings.

#### 5.4.1.3 `resourceTypes[]`

`resourceTypes` narrows a `fhir.resources` selector by official FHIR resource type name, such as `Patient`, `Coverage`, `Condition`, `MedicationRequest`, or `Observation`.

A Requester SHALL use official FHIR resource type names in `resourceTypes[]`. A Requester SHALL NOT use local topic labels, display strings, or implementation-specific category names in `resourceTypes[]`.

When `resourceTypes[]` is present with `profiles[]` or `profilesFrom[]`, a Wallet/Responder SHALL treat `resourceTypes[]` as a resource-type filter over the profile-selected set. A resource is responsive only if it matches at least one applicable profile selector and its `resourceType` is in `resourceTypes[]`.

When `resourceTypes[]` is present without `profiles[]` or `profilesFrom[]`, a Wallet/Responder SHALL treat the item as requesting patient-specific FHIR resources whose `resourceType` is in `resourceTypes[]`, subject to Holder decision and accepted media types.

#### 5.4.1.4 Additivity rule when both `profiles[]` and `profilesFrom[]` are present

`profiles[]` and `profilesFrom[]` are additive profile selectors. A Requester MAY include both fields in one `fhir.resources` selector.

When both fields are present, a Wallet/Responder SHALL treat a resource as profile-selected if the resource matches any exact profile in `profiles[]` or any profile belonging to any profile family identified by `profilesFrom[]`, subject to any `resourceTypes[]` filter and the rest of the item definition. A Wallet/Responder SHALL NOT interpret `profiles[]` as narrowing, limiting, or enumerating the profiles available through `profilesFrom[]`.

#### 5.4.1.5 No-selector default

If `kind` is `"fhir.resources"` and `profiles`, `profilesFrom`, and `resourceTypes` are all omitted, the selector requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share.

A Wallet/Responder MAY satisfy a no-selector `fhir.resources` item with any patient-specific FHIR resources that can be returned using a media type in `accept[]`. A Wallet/Responder SHOULD present broad no-selector requests with clear Holder-facing context because they can be overbroad.

#### 5.4.1.6 Examples

The examples in this subsection are illustrative.

Exact CARIN-style coverage profile:

```json
{
  "kind": "fhir.resources",
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ]
}
```

US Core profile family:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

US Core profile family narrowed to selected resource types:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "resourceTypes": ["Condition", "MedicationRequest", "Observation"]
}
```

Mixed additive selector:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ],
  "resourceTypes": ["Coverage", "Patient", "MedicationRequest"]
}
```

In the mixed example, `profilesFrom` and `profiles` are additive profile selectors, and `resourceTypes` filters the resulting profile-selected set to the listed FHIR resource types.

### 5.4.2 `questionnaire`

A `questionnaire` selector requests completion of a FHIR Questionnaire. The expected raw FHIR JSON response content is a FHIR `QuestionnaireResponse`; §6 defines Artifact shapes and response validation.

A Requester SHALL set `content.kind` to `"questionnaire"` for this selector. A Requester SHALL include `questionnaire` as either a non-empty canonical string, an inline FHIR `Questionnaire` resource object, or an object containing at least one of `canonical` or `resource`.

A Wallet/Responder SHALL reject a `questionnaire` selector whose `questionnaire` member is absent, blank, or not one of the shapes defined below.

#### 5.4.2.1 By canonical

A Requester MAY identify a Questionnaire by canonical URL:

```json
{
  "kind": "questionnaire",
  "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake"
}
```

The canonical MAY include a `|version` suffix. A Wallet/Responder that fetches the Questionnaire over HTTP SHALL apply the `|version` handling rules in §5.5.

#### 5.4.2.2 Inline `Questionnaire`

A Requester MAY include an inline FHIR `Questionnaire` resource as the `questionnaire` value:

```json
{
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
}
```

A Requester SHOULD include enough Questionnaire content for the Wallet/Responder to render and collect answers without relying on an unauthenticated network fetch, when inline collection is intended.

#### 5.4.2.3 Combined canonical plus resource

A Requester MAY provide both a canonical and an inline resource by using object form:

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
    "resource": {
      "resourceType": "Questionnaire",
      "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
      "version": "1.2.3",
      "status": "active",
      "title": "Migraine Check-in",
      "item": []
    }
  }
}
```

If `questionnaire` is an object that is not itself an inline Questionnaire resource, a Requester SHALL include at least one of `canonical` or `resource`. If `resource` is present, a Requester SHALL encode it as an object whose `resourceType` is `"Questionnaire"`.

#### 5.4.2.4 Wallet behavior when both forms supplied disagree

When both `canonical` and `resource` are supplied, the canonical is the Requester's explicit identifier for the Questionnaire, and the inline resource is the Questionnaire body the Requester is asking the Wallet/Responder to render or use.

A Requester SHOULD ensure that `canonical`, `resource.url`, and `resource.version` are consistent when these fields are present. A Wallet/Responder SHALL NOT silently merge conflicting Questionnaire definitions from the inline resource and a fetched canonical resource.

If a Wallet/Responder detects a material disagreement between the supplied canonical and inline resource, the Wallet/Responder SHOULD treat the item as unsupported or error according to §6 rather than collecting answers against an ambiguous Questionnaire. A material disagreement includes a different canonical URL after applying §5.5 comparison rules, a different explicit version, or conflicting item structure that would change Holder answers.

#### 5.4.2.5 Example

The following example is illustrative:

```json
{
  "id": "intake",
  "title": "Migraine check-in",
  "content": {
    "kind": "questionnaire",
    "questionnaire": {
      "resourceType": "Questionnaire",
      "title": "Migraine Check-in",
      "status": "active",
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

### 5.4.3 Extension selectors and registration rules

An extension selector is a selector whose `content.kind` is not one of the core selector kinds defined in §5.4.

An extension registrant SHALL define a globally unique `content.kind` string for the extension selector. An extension registrant SHALL define the JSON shape, required members, processing semantics, failure behavior, privacy considerations, security considerations, and expected response media types for the selector. An extension registrant SHALL specify how the selector composes with per-item `accept[]`, item status reporting, and Artifact fulfillment.

An extension registrant SHOULD use a collision-resistant kind name, such as a reverse-DNS or registered URI-derived name, unless §13 later defines a formal registry syntax. An extension registrant SHOULD reuse FHIR canonicals and official FHIR names where they fit rather than defining local topic vocabularies.

A Requester SHALL NOT use an unregistered or privately defined extension selector when interoperable processing by unrelated Wallet/Responders is expected. A Wallet/Responder that does not understand an extension selector kind SHALL NOT guess its semantics. It SHALL either reject the request as unsupported or report the affected item as unsupported according to §6, depending on where in the flow the unsupported selector is discovered.

### 5.5 Canonical `|version` handling

FHIR canonicals may include a `|version` suffix. Implementations need consistent rules for when the suffix is part of the semantic claim and when it is removed for resolution, grouping, or routing.

A Requester MAY include `|version` in fields where this section permits a FHIR canonical. A Wallet/Responder and Verifier SHALL apply the following decision matrix when processing SMART request selectors and corresponding response content.

| Operation | Required action | Conformance target | Rationale |
| --- | --- | --- | --- |
| HTTP fetch of a canonical value | Strip `|version` before treating the value as a URL to fetch; preserve the original value for records and response construction. | Wallet/Responder | A versioned canonical is an identifier, not a literal fetch URL. |
| Profile-family membership for `profilesFrom[]` | Strip `|version` for family lookup unless a future profile-family registry defines version-specific membership. | Wallet/Responder | Family routing and membership are version-agnostic in version 1.0. |
| Wallet routing or kind classification | Strip `|version` for routing decisions. | Wallet/Responder | Routing to coverage, questionnaire, or clinical views should not depend on the profile version suffix. |
| Profile de-duplication or grouping | Strip `|version` when grouping logical profile identities; preserve original strings when echoing or logging. | Wallet/Responder, Verifier | Strings differing only by suffix can refer to the same logical profile for grouping. |
| Exact profile conformance check | Preserve and compare `|version` consistently on both sides when the Requester supplied a versioned profile. | Wallet/Responder, Verifier | Exact version requests require exact version semantics. |
| Returned resource `meta.profile` | Preserve any `|version` present in the resource. | Wallet/Responder | Resource metadata can legitimately assert exact profile versions. |
| `QuestionnaireResponse.questionnaire` | Preserve `|version` when the answered Questionnaire was versioned. | Wallet/Responder | The receiver needs to know which Questionnaire version was answered. |
| Test fixtures, audit records, and debug bundles | Preserve the wire value exactly, subject to privacy policy. | Wallet/Responder, Verifier | Diagnostics should record what was sent or received. |

A Wallet/Responder SHALL NOT strip `|version` from returned clinical content where the suffix is part of the clinical or conformance assertion, including returned `meta.profile` entries and `QuestionnaireResponse.questionnaire` values.

Organizer note: active Android tests confirm stripping `|version` before Questionnaire fetch. The table above generalizes the existing implementation note into spec text; Appendix H and response validation should keep it aligned.

### 5.6 Accepted media types and ordering semantics

`accept[]` is item-specific. It advertises the response media types the Requester can consume for that item, ordered by Requester preference.

A Requester SHALL include a non-empty `accept[]` array on every request item. A Requester SHALL encode each value as a media type string. A Requester SHALL order `accept[]` from most preferred to least preferred. A Requester SHALL NOT rely on any separate preference field.

A Wallet/Responder MAY return any Artifact media type listed in the fulfilled item's `accept[]`. A Wallet/Responder SHOULD prefer the earliest listed media type it can produce when content, Holder decision, and Wallet policy otherwise permit multiple equivalent response forms. A Wallet/Responder MAY return a less-preferred listed media type when the preferred form is unavailable, unsupported, declined by the Holder, inconsistent with Wallet policy, or not appropriate for the available Holder data source.

A Verifier SHALL treat an Artifact as invalid for a fulfilled item if the Artifact `mediaType` is not present in that item's `accept[]`.

Version 1.0 defines the following core media types for request `accept[]` values:

| Media type | Meaning in `accept[]` | Response-model dependency |
| --- | --- | --- |
| `application/fhir+json` | The Requester can consume raw FHIR JSON for this item. | A corresponding response Artifact uses `mediaType: "application/fhir+json"` and declares `fhirVersion` under §6. |
| `application/smart-health-card` | The Requester can consume SMART Health Card content for this item. | A corresponding response Artifact uses `mediaType: "application/smart-health-card"`; the signed health card content carries its own FHIR-version semantics under §6. |

Extension media types MAY be used when defined by a registered extension or deployment agreement. An extension media-type registrant SHALL define the Artifact shape, processing rules, validation rules, privacy considerations, security considerations, and any FHIR-version handling needed for that media type. An extension media-type registrant SHOULD use existing registered media types where possible rather than minting local strings.

Example of ordered preference:

```json
"accept": [
  "application/smart-health-card",
  "application/fhir+json"
]
```

This example means that the Requester prefers a SMART Health Card when the Wallet/Responder can provide one, but raw FHIR JSON is also acceptable for the item. It does not require the Wallet/Responder to create a SMART Health Card when none is available.

## Organizer notes

Strengths of this attempt:

- Preserves the accepted architecture: the SMART request is a transport-neutral clinical JSON object, and kiosk embeds it directly as `smartRequest` without defining a second clinical protocol.
- Makes `purpose`, `title`, and `summary` Holder-facing context, not requester identity, and keeps requester identity metadata out of the clinical request body.
- Makes `profilesFrom[]` an array of canonical profile-family URLs and states that `profiles[]` plus `profilesFrom[]` are additive, not narrowing.
- Defines `resourceTypes[]` separately as a resource-type filter, avoiding accidental broadening of the profile-additivity rule.
- Keeps response Artifact details mostly in §6 while explaining enough `accept[]` semantics for request construction.

Caveats and open issues:

- Active validators enforce item id non-empty uniqueness but not a character set. This attempt proposes URL-safe ASCII item ids only as an organizer note until schema and code align.
- Active validators do not enforce hard maximum lengths or duplicate JSON member rejection uniformly. Appendix B and transport sections should decide practical size and parser requirements.
- Extension selector and media-type registration language should be reconciled with the later §4 extension model and §13 registries.
- Questionnaire disagreement behavior is intentionally conservative but may need response-status vocabulary details from §6.

Downstream dependencies:

- §6 must define `requestId`, Artifact `mediaType`, `fhirVersion`, `fulfills[]`, `requestStatus[]`, and cross-validation against `accept[]`.
- Appendix B must encode the `profilesFrom[]` array shape, additive selector permissiveness, and any final identifier/length limits.
- Appendix H should align FHIR `|version`, `meta.profile`, Questionnaire, and Bundle guidance with §5.5.
- §8 and §9 should carry the same SMART request object without changing these clinical semantics, and §9 should keep kiosk wrapper details outside the request body.
