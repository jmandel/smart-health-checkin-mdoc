## 5. Clinical content — request

This section defines the SMART request, the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content. The same SMART request semantics apply when the object is carried by a presentation flow or by a future binding.

Presentation transports can add origin context, Verifier or reader authentication, signatures, encryption, freshness, device evidence, routing identifiers, relay behavior, and validation artifacts. They do not change the meaning of `purpose`, request items, selectors, `accept[]`, item identifiers, or the advisory `required` flag defined here.

The SMART request body is not a requester identity credential, consent record, persistent authorization grant, or transport transcript. Requester identity, Verifier identity, web origin, reader authentication, trust anchors, certificates, session freshness, implementation-defined hand-off state, and related trust metadata belong to presentation transport, trust processing, or local policy, not to self-asserted fields in the clinical request body.

### 5.1 Encoding rules

A SMART request is a JSON object. A Requester SHALL encode a SMART request as JSON conforming to RFC 8259. When a SMART request is serialized as text or bytes by a transport binding, the serialized JSON text SHALL be UTF-8.

#### 5.1.1 JSON UTF-8, RFC 8259, and no comments

A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or any other value outside the JSON data model in a SMART request. A Wallet/Responder or Verifier that parses a SMART request SHALL reject a request whose top-level value is not a JSON object or whose representation cannot be parsed according to the selected transport's encoding rules.

Literal JSON examples in this section are examples only. They use valid RFC 8259 JSON and do not include comments, trailing commas, ellipses, or placeholder values unless explicitly marked as non-literal explanatory pseudocode.

A transport binding that carries a SMART request SHALL define whether the request is carried as JSON text, a byte string containing UTF-8 JSON, a JSON-valued member of another object, a signed payload member, or another exact representation. This section does not define a byte-for-byte JSON canonicalization for the clinical request object.

#### 5.1.2 Object key uniqueness, ordering, and non-JSON numbers

JSON object member names in a SMART request SHALL be unique within each object. A Wallet/Responder or Verifier SHALL reject a SMART request when duplicate object member names are detected during parsing or validation. Implementations SHOULD avoid parser configurations that silently apply parser-specific “first member wins” or “last member wins” behavior to security-relevant protocol data.

Object member order has no clinical meaning in the SMART request model. Array order has meaning only where a field definition states it has meaning. In this section, `fhirVersions[]` and `accept[]` are ordered by Requester preference, and `items[]` order is the Requester's preferred display or workflow order.

This section defines no numeric fields. A Requester SHALL NOT encode identifiers, versions, booleans, arrays, media types, FHIR canonicals, or display strings as JSON numbers. Because RFC 8259 JSON has no `NaN`, `Infinity`, or `-Infinity` values, those values SHALL NOT appear in a SMART request.

#### 5.1.3 Numeric, string, and identifier limits

This section does not define global maximum lengths for strings, arrays, or serialized request bytes. A Requester SHOULD keep request ids, item ids, titles, summaries, purpose text, canonicals, media type strings, and inline Questionnaire content no larger than needed for the check-in workflow and Holder review. A Wallet/Responder MAY reject a request that exceeds implementation, transport, safety, display, or policy limits, provided the rejection is reported according to the selected flow and applicable privacy requirements.

Appendix B, §8, fixture work, and conformance closure are expected to define any concrete schema or transport limits needed for interoperable testing. Until those limits are fixed, conformance to this section is based on the field-specific rules below rather than on ungrounded numeric maxima.

#### 5.1.4 Forward-compatible unknown-member handling

A Wallet/Responder MAY ignore unknown members at the top level of the SMART request, in request items, and inside known selector objects when those members do not change the meaning of known required members. Ignoring an unknown member does not make a malformed known member valid.

A Requester SHALL NOT rely on an unknown member to carry requester identity, override Holder control, change `accept[]`, change selector semantics, change `required`, or impose transport, trust, or consent behavior.

An unknown `content.kind` value is not an ignorable member. It identifies an extension selector kind and is processed according to §5.4.3 and the response status rules in §6.

### 5.2 `SmartHealthCheckinRequest`

A `SmartHealthCheckinRequest` has this top-level shape:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "<request-id>",
  "purpose": "<holder-facing purpose>",
  "fhirVersions": ["4.0.1"],
  "items": []
}
```

A Requester SHALL include `type`, `version`, `id`, and `items`. A Requester MAY include `purpose` and `fhirVersions`.

#### 5.2.1 `type`

A Requester SHALL set `type` to the exact string `"smart-health-checkin-request"`. A Wallet/Responder SHALL reject a SMART request whose `type` member is absent or is not exactly `"smart-health-checkin-request"`.

#### 5.2.2 `version`

A Requester SHALL set `version` to the exact string `"1"` for requests conforming to SMART Health Check-in 1.0. The `version` member is the SMART request-model version. It is not a FHIR version and not a presentation-transport version.

A Wallet/Responder SHALL reject a SMART request whose `version` member is absent or is not exactly `"1"`, unless a future version-negotiation rule explicitly defines compatible handling for another value.

#### 5.2.3 `id`

A Requester SHALL include `id` as a non-empty opaque Requester-generated request identifier. A Requester SHALL generate `id` values so they are unique among SMART requests created by that Requester for the same check-in session. A Requester SHOULD generate `id` values with enough unpredictability or contextual uniqueness to avoid accidental collision and cross-session guessing by parties that only observe unrelated sessions.

A Wallet/Responder SHALL preserve the request `id` value for response construction so §6 can bind the SMART response to the request using `requestId`.

The request `id` is not a patient identifier, requester identifier, proof of freshness, or clinical fact. A Wallet/Responder SHALL NOT infer requester identity, patient identity, authorization, or clinical meaning from the syntax of `id`.

#### 5.2.4 `purpose`

`purpose` is optional Holder-facing display and workflow context. Examples include `"Clinic check-in"`, `"Insurance verification"`, and `"Pre-visit intake"`.

A Requester MAY include `purpose`. If present, a Requester SHALL encode `purpose` as a string and SHALL use it only to describe the workflow context for Holder review. A Requester SHALL NOT use `purpose` to carry requester identity, organization name, web origin, logo URL, contact URL, legal attestation, proof of authority, consent language, trust status, or persistent authorization semantics.

A Wallet/Responder MAY display `purpose` to the Holder as request context. A Wallet/Responder SHALL NOT treat `purpose` as authenticated requester identity or as a transport trust signal.

#### 5.2.5 `fhirVersions[]`

`fhirVersions` is an optional ordered array of FHIR release-version strings that the Requester can consume for raw FHIR JSON Artifacts and other response forms whose registered definition relies on an outer FHIR version declaration. Examples include `"4.0.1"`, `"4.3.0"`, and `"5.0.0"`.

If a Requester includes `fhirVersions`, the Requester SHALL encode it as an array of strings ordered from most preferred to least preferred. A Requester that accepts `application/fhir+json` SHOULD include at least one FHIR release version unless the Requester can safely process any FHIR version that a conforming Wallet/Responder might return under §6.

A Wallet/Responder SHOULD use `fhirVersions[]` when choosing a FHIR version for `application/fhir+json` Artifacts, subject to Holder decision, available Holder data sources, Wallet capability, local policy, and the selected item `accept[]` media types. `fhirVersions[]` does not override FHIR version information that is intrinsic to a signed SMART Health Card or another response format defined by a registered extension.

#### 5.2.6 `items[]`

`items` is the ordered list of request items. A Requester SHALL include `items` as an array. A Requester SHOULD include at least one request item. A zero-item request has no clinical content to fulfill and is expected to be closed during Appendix B and conformance work; this section does not make non-empty `items[]` a hard requirement because current active validators accept an empty array once other required top-level fields are present.

A Requester SHALL encode each member of `items` as a `SmartHealthCheckinRequestItem` as defined in §5.3. A Wallet/Responder SHALL process `items[]` as the request's Holder-review and response-accounting granularity. The order of `items[]` is the Requester's preferred display and workflow order. A Wallet/Responder MAY group, summarize, or reorder items for accessibility, safety, or local policy, but SHALL preserve item `id` values for fulfillment and status reporting.

#### 5.2.7 Prohibited requester identity metadata

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited requester identity metadata includes, but is not limited to:

- requester, clinic, practice, payer, organization, staff, or facility name fields;
- logo, image, icon, brand-color, or display-brand fields;
- requester URL, website, callback URL, endpoint URL, domain, origin, package name, application id, or certificate fields;
- signed-request, reader, Verifier, trust-framework, issuer, accreditation, or legal-entity metadata; and
- pointer, relay, completion, encryption, nonce, hand-off, or wrapper metadata from any implementation-defined initiation flow.

This prohibition applies to the clinical request object itself, including the top-level object, request items, selectors, and extension members. It does not prevent presentation transports from carrying authenticated origin, reader, Verifier, or other deployment-specific information in their own envelopes.

A Wallet/Responder SHALL NOT treat any field in the SMART request body, including unknown fields, `purpose`, `items[].title`, `items[].summary`, selector values, or extension members, as authenticated requester identity unless the same fact is established by the selected presentation transport, trust processing, or local policy outside the SMART request body.

#### 5.2.8 Examples

The examples in this subsection are illustrative. Example identifiers, display text, URLs, and clinical selections are not fixed protocol values.

Example: single FHIR-resource request.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "example-patient-request",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "patient",
      "title": "Patient demographics",
      "summary": "Demographics for check-in.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example: mixed FHIR-resource and inline Questionnaire request.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "example-checkin-request",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "coverage",
      "title": "Insurance card",
      "summary": "Coverage information for billing.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
        "resourceTypes": ["Coverage"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "clinical-history",
      "title": "US Core clinical resources",
      "summary": "Problems, medications, allergies, and other available US Core records.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ],
        "resourceTypes": ["Patient", "MedicationRequest", "Condition", "AllergyIntolerance"]
      },
      "accept": ["application/smart-health-card", "application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Migraine check-in",
      "content": {
        "kind": "questionnaire",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
          "version": "1.2.3",
          "status": "active",
          "title": "Migraine Check-in",
          "item": [{ "linkId": "headache", "text": "Are you experiencing a headache today?", "type": "boolean" }]
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

### 5.3 `SmartHealthCheckinRequestItem`

A request item describes one unit of requested clinical content or action. Request items are the unit of Holder review, accepted response media-type advertisement, fulfillment references, and per-item status reporting.

A `SmartHealthCheckinRequestItem` has this shape:

```json
{
  "id": "<item-id>",
  "title": "<holder-facing title>",
  "summary": "<holder-facing explanation>",
  "required": false,
  "content": { "kind": "fhir.resources" },
  "accept": ["application/fhir+json"]
}
```

A Requester SHALL include `id`, `title`, `content`, and `accept` for every item. A Requester MAY include `summary` and `required`.

#### 5.3.1 `id` uniqueness and character set

A Requester SHALL include `id` as a non-empty string on every request item. A Requester SHALL NOT use the same item `id` more than once within a single SMART request. A Wallet/Responder SHALL reject a SMART request with a missing, non-string, empty, or duplicate item `id`.

Item ids are scoped to one SMART request. They are not global identifiers and are not patient or requester identifiers. A Wallet/Responder and Verifier SHALL use exact string equality when comparing item ids.

A Requester SHOULD use item ids that are stable within the interaction, short enough for diagnostics, and safe for use as JSON string references in responses. Newly defined item ids SHOULD consist only of ASCII letters, digits, period (`.`), underscore (`_`), tilde (`~`), and hyphen (`-`). Until Appendix B and active validators define a stricter pattern, Wallets/Responders MAY accept other non-empty string ids when they can preserve them exactly.

A Requester SHOULD NOT include patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in item `id` values.

#### 5.3.2 `title`

A Requester SHALL include `title` as a non-empty Holder-facing string on every request item. `title` names the requested item, for example `"Patient demographics"`, `"Insurance card"`, or `"Intake form"`. A Requester SHALL NOT use `title` as a substitute for authenticated requester identity metadata.

A Wallet/Responder SHOULD make `title` available in Holder review when requesting consent for the item, subject to accessibility, localization, safety, and local policy.

#### 5.3.3 `summary`

A Requester MAY include `summary` as a string that gives a Holder-facing explanation of the requested content or action. A Requester SHOULD use `summary` to clarify broad selectors, profile-family requests, or questionnaire purpose when `title` alone would be ambiguous. A Requester SHALL NOT use `summary` as a substitute for authenticated requester identity metadata.

A Wallet/Responder MAY display, summarize, or suppress `summary` according to Wallet UX policy, but SHALL preserve item ids for response accounting regardless of display choices.

#### 5.3.4 `required` advisory semantics

A Requester MAY include `required` as a boolean. If `required` is omitted, a Wallet/Responder SHALL interpret it as `false` for display and decision-support purposes. When `required` is `true`, the Requester is indicating that the item is important for the Requester's downstream workflow.

A Requester SHALL treat `required` as advisory workflow context only. `required: true` is not Holder consent, not legal authorization, not a command to the Wallet, and not a guarantee that responsive content will be returned.

A Wallet/Responder MAY display or otherwise consider `required` during Holder review. A Wallet/Responder SHALL NOT treat `required: true` as authorization to bypass Holder control, Wallet policy, applicable law, or consent UX requirements.

A Wallet/Responder MAY return declined, unavailable, unsupported, partial, or error status for an item whose `required` value is `true`. The Requester decides outside this protocol how its downstream workflow proceeds when required content is missing.

#### 5.3.5 `accept[]` ordered preference

A Requester SHALL include `accept` as a non-empty array of media type strings on every request item. A Requester SHALL order `accept[]` from most preferred to least preferred for that item. There is no separate preference field. A Requester SHALL NOT include a media type in `accept[]` unless the Requester is prepared to process a conforming Artifact of that media type for the item.

A Wallet/Responder MAY choose any media type listed in `accept[]` for the item, considering Holder decision, available Holder data sources, Wallet capability, FHIR version support, local policy, and whether the resulting Artifact can accurately fulfill the item. A Wallet/Responder SHOULD choose the earliest acceptable media type it can produce when multiple choices are otherwise equivalent.

A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact's `mediaType` is listed in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. If no listed media type can be produced for an item, a Wallet/Responder SHALL report the item outcome using the response status mechanism defined in §6 rather than returning an Artifact with an unaccepted media type.

#### 5.3.6 `content` selector

A Requester SHALL include `content` as a selector object on every request item. A Requester SHALL include `content.kind` as a string identifying the selector kind. The `kind` value determines the remaining selector shape and semantics.

Version 1.0 defines the selector kinds `fhir.resources` and `questionnaire`. Registered extensions can define additional selector kinds as described in §5.4.3.

A Wallet/Responder that does not understand `content.kind` SHALL NOT infer the selector's semantics from display text or unrelated fields. It SHALL treat the item as unsupported or reject the request according to the selected flow and §6 status rules.

### 5.4 Content selectors

A content selector describes what clinical content or action would satisfy a request item. Selectors are not a general FHIR query language, clinical decision support expression, patient-matching rule, authorization policy, or requester identity channel.

A Requester SHALL use a selector shape defined by this section or by a registered extension selector. A Wallet/Responder SHALL evaluate selector semantics independently for each request item, while allowing one response Artifact to fulfill multiple items where §6 permits.

#### 5.4.1 `fhir.resources`

A `fhir.resources` selector requests patient-specific FHIR resources. It has this shape:

```json
{
  "kind": "fhir.resources",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

A Requester SHALL set `kind` to `"fhir.resources"` for this selector. A Requester MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination of those fields, or none of them. If `profiles`, `profilesFrom`, or `resourceTypes` is present, a Requester SHALL encode that member as an array of strings.

##### 5.4.1.1 `profiles[]`

`profiles[]` identifies exact FHIR `StructureDefinition` profile canonical URLs acceptable for the item.

A Requester MAY include `profiles` as an array of one or more FHIR canonical strings. A Requester SHOULD use canonical `StructureDefinition` URLs in `profiles[]` values. A `profiles[]` value MAY include a `|version` suffix as defined in §5.5 when the Requester needs an exact profile version.

A Wallet/Responder MAY treat a resource as matching `profiles[]` when the resource declares one of the listed profile canonicals in `meta.profile` or when the Wallet/Responder has equivalent local knowledge or trusted conformance evidence that the resource conforms to the listed profile. This specification does not require a Wallet/Responder to perform full FHIR profile validation during request matching.

##### 5.4.1.2 `profilesFrom[]`

`profilesFrom[]` identifies one or more profile families by canonical URL. A profile family can be a FHIR publication, implementation guide, profile collection, or other published family of FHIR profiles.

A Requester MAY include `profilesFrom` as a non-empty array of canonical profile-family URL strings. A Requester SHALL encode `profilesFrom` as an array. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, implementation-guide object, package id, package version, npm package name, registry alias, local topic vocabulary, or URN unless a future version or registered extension explicitly defines such a value space.

A Wallet/Responder SHALL reject a `fhir.resources` selector whose `profilesFrom` member is present but is not a non-empty array of strings. A Wallet/Responder MAY additionally reject `profilesFrom[]` values that are not canonical URLs under its validation policy.

A `profilesFrom[]` value identifies a family from which acceptable resource profiles can be drawn. It does not require the SMART request to enumerate every profile in that family. A Wallet/Responder MAY use local knowledge, FHIR package metadata available outside the request, implementation-guide definitions, configured profile-family mappings, or other deployment knowledge to determine which exact profiles are members of a `profilesFrom[]` family.

##### 5.4.1.3 `resourceTypes[]`

`resourceTypes[]` narrows a `fhir.resources` selector by official FHIR `resourceType` names, such as `"Patient"`, `"Coverage"`, `"Condition"`, `"MedicationRequest"`, `"Observation"`, or `"AllergyIntolerance"`.

A Requester MAY include `resourceTypes` as an array of one or more strings. A Requester SHALL use official FHIR resource type names appropriate to the FHIR versions it can consume. A Requester SHALL NOT use local topic labels, display strings, or implementation-specific category names such as `"care-plans"`, `"insurance"`, or `"clinical-history"` in `resourceTypes[]` unless those strings are official FHIR resource type names.

When `resourceTypes[]` is present with `profiles[]` or `profilesFrom[]`, a Wallet/Responder SHALL treat `resourceTypes[]` as an additional resource-type constraint on the profile-selected set. A resource is responsive only if it matches at least one applicable profile selector under §5.4.1.4 and its FHIR `resourceType` is listed in `resourceTypes[]`.

When `resourceTypes[]` is present without `profiles[]` and without `profilesFrom[]`, a Wallet/Responder SHALL treat the selector as requesting patient-specific FHIR resources whose `resourceType` is listed in `resourceTypes[]`, subject to Holder decision, accepted media types, FHIR version compatibility, available data, and local policy.

##### 5.4.1.4 Additivity rule when both `profiles[]` and `profilesFrom[]` are present

`profiles[]` and `profilesFrom[]` are additive profile selectors. When both fields are present in the same `fhir.resources` selector, a Wallet/Responder SHALL treat a resource as satisfying the profile-selector portion of the item if the resource matches any exact profile in `profiles[]` or any profile belonging to any profile family identified by `profilesFrom[]`, subject to `resourceTypes[]` when present and the rest of the item definition.

A Requester SHALL NOT rely on `profiles[]` to narrow a broader `profilesFrom[]` request. A Wallet/Responder SHALL NOT interpret `profiles[]` as limiting, filtering, enumerating, or narrowing the profiles available through `profilesFrom[]`.

This additivity rule applies only to `profiles[]` and `profilesFrom[]`. `resourceTypes[]`, when present, is the separate resource-type constraint defined in §5.4.1.3.

##### 5.4.1.5 No-selector default

If `content.kind` is `"fhir.resources"` and `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision.

A Requester SHOULD avoid the no-selector default unless the workflow can safely consume broad patient-specific FHIR content and the item display text clearly explains the breadth of the request. A Wallet/Responder MAY satisfy a no-selector item with any patient-specific FHIR resources compatible with the item's `accept[]` media types. A Wallet/Responder is not required to disclose all available resources and MAY fulfill a no-selector item partially according to §6.

##### 5.4.1.6 Examples

The examples in this subsection are illustrative.

Example: exact CARIN-style Coverage profile.

```json
{
  "kind": "fhir.resources",
  "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
  "resourceTypes": ["Coverage"]
}
```

Example: US Core profile family.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Example: additive exact profiles plus a profile family, with resource-type filtering.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
  ],
  "resourceTypes": ["Patient", "MedicationRequest", "Condition"]
}
```

In the last example, `profiles[]` and `profilesFrom[]` are additive profile selectors. The `resourceTypes[]` values filter the resulting profile-selected set to the listed FHIR resource types.

#### 5.4.2 `questionnaire`

A `questionnaire` selector requests completion of a FHIR Questionnaire and return of an appropriate response Artifact. For `application/fhir+json`, the expected clinical response content is a FHIR `QuestionnaireResponse`; §6 defines response Artifact shapes and response validation.

A `questionnaire` selector has this shape:

```json
{
  "kind": "questionnaire",
  "canonical": "<Questionnaire canonical>",
  "resource": { "resourceType": "Questionnaire" }
}
```

A Requester SHALL set `content.kind` to `"questionnaire"` for this selector. A Requester SHALL include `canonical`, `resource`, or both as direct members of the selector. A Requester SHALL NOT include a nested `questionnaire` member in the selector.

If `canonical` is present, the Requester SHALL encode it as a non-empty FHIR canonical string. The canonical MAY include a `|version` suffix as defined in §5.5.

If `resource` is present, the Requester SHALL encode it as an inline FHIR `Questionnaire` resource object whose `resourceType` is `"Questionnaire"`.

A Wallet/Responder SHALL reject or report unsupported for a `questionnaire` selector that has neither `canonical` nor `resource`, that has a `canonical` value that is not a non-empty string, that has a `resource` value that is not a Questionnaire resource object, or that uses a legacy nested `questionnaire` member. The legacy forms of a bare canonical string under `questionnaire`, a bare inline Questionnaire under `questionnaire`, and a wrapper object `questionnaire: { canonical, resource }` are not valid SMART Health Check-in 1.0 selector shapes.

##### 5.4.2.1 By canonical

A Requester MAY provide `canonical` as the Questionnaire identity to be resolved. The canonical MAY include a `|version` suffix as defined in §5.5.

Example:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
}
```

A Wallet/Responder MAY resolve the canonical using a configured canonical resolver, FHIR search against a configured endpoint, cached content, Holder data source, or other local mechanism that satisfies §5.5. Direct HTTP dereference of a Questionnaire canonical is permitted only for unversioned canonicals under §5.5.

If the Wallet/Responder cannot resolve, render, or otherwise use the referenced Questionnaire, it SHALL report the item outcome using the response status mechanism in §6 rather than fabricating a Questionnaire.

##### 5.4.2.2 Inline `Questionnaire`

A Requester MAY provide `resource` as an inline FHIR `Questionnaire` resource object. A Requester SHALL ensure that an inline resource used in this form has `resourceType` equal to `"Questionnaire"`.

A Wallet/Responder SHALL reject or report unsupported for an inline questionnaire resource whose `resourceType` is absent or is not `"Questionnaire"`. A Wallet/Responder MAY render or process an inline Questionnaire without fetching it from a remote endpoint, subject to Wallet policy, safety checks, language support, and Questionnaire feature support.

Example:

```json
{
  "kind": "questionnaire",
  "resource": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "title": "Migraine Check-in",
    "item": [{ "linkId": "headache", "text": "Are you experiencing a headache today?", "type": "boolean" }]
  }
}
```

##### 5.4.2.3 Combined canonical and resource

A Requester MAY provide both `canonical` and `resource` as direct members of the `questionnaire` selector. The combined form lets a Wallet/Responder render the inline resource without network retrieval while preserving a stable canonical identity for response construction and receiver interpretation.

Example:

```json
{
  "kind": "questionnaire",
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
```

##### 5.4.2.4 Wallet behavior when both forms supplied disagree

When both `canonical` and `resource` are supplied, the canonical is the Requester's explicit identifier for the Questionnaire, and the inline resource is the Questionnaire body the Requester is asking the Wallet/Responder to render or use.

A Requester SHOULD ensure that `canonical`, `resource.url`, and `resource.version` are consistent when these fields are present. At minimum, when `resource.url` is present, its canonical URL should match the `url` parsed from `canonical` under §5.5; when both a canonical `|version` suffix and `resource.version` are present, those values should describe the same intended Questionnaire version.

A Wallet/Responder SHALL NOT silently merge conflicting Questionnaire definitions from the inline resource and a fetched canonical resource. A Wallet/Responder SHALL NOT silently rewrite the Requester's canonical to match a conflicting inline resource.

If a Wallet/Responder detects a material disagreement between the supplied canonical and inline resource, the Wallet/Responder SHOULD treat the item as unsupported or error according to §6 rather than collecting answers against an ambiguous Questionnaire. A material disagreement includes a different canonical URL after applying §5.5 parsing and comparison rules, a different explicit version, or conflicting item structure that would change Holder answers.

##### 5.4.2.5 Example

The following inline migraine-intake request item is illustrative and does not define required clinical questions.

```json
{
  "id": "intake",
  "title": "Migraine check-in",
  "summary": "Brief intake questions before today's visit.",
  "content": {
    "kind": "questionnaire",
    "resource": {
      "resourceType": "Questionnaire",
      "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
      "version": "1.2.3",
      "status": "active",
      "title": "Migraine Check-in",
      "item": [
        { "linkId": "wellbeing", "text": "How have you been feeling since your last visit?", "type": "text" },
        { "linkId": "headache", "text": "Are you experiencing a headache today?", "type": "boolean" }
      ]
    }
  },
  "accept": ["application/fhir+json"]
}
```

#### 5.4.3 Extension selectors and registration rules

An extension selector is a selector whose `content.kind` is not one of the core selector kinds defined in §5.4.

An extension registrant SHALL define all of the following for each extension selector kind: the exact `content.kind` string; JSON shape and required and optional members; clinical meaning; content-satisfaction rules; interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, and Artifact fulfillment; unsupported, unavailable, partial, and error behavior under §6; unknown-member handling; privacy and security considerations; and at least one example request item.

An extension registrant SHALL NOT define an extension selector that redefines the semantics of `type`, `version`, `id`, `purpose`, `fhirVersions[]`, `items[]`, item `id`, item `required`, item `accept[]`, `fhir.resources`, `questionnaire`, or any other core field or selector kind.

An extension registrant SHALL NOT define an extension selector that permits requester identity metadata in the SMART request body unless a future version of this specification defines an explicit trust model for doing so.

An extension registrant SHOULD choose a collision-resistant selector kind name, such as a reverse-DNS name or URI-like name, until §13 defines the formal selector-kind registry syntax.

A Requester SHALL NOT use an unregistered or privately defined extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support an extension selector kind SHALL NOT guess its semantics or satisfy it from display text alone. It SHALL either reject the request as unsupported or report the affected item as unsupported according to §6, depending on where in the selected flow the unsupported selector is discovered.

### 5.5 Canonical `|version` handling

FHIR canonicals can append a version suffix using `canonical|version`. The suffix is part of some semantic claims, but it is not a literal HTTP URL path or query string. Implementations need consistent handling so versioned canonicals do not break lookup while exact version claims are preserved where they matter.

A Requester MAY include `|version` suffixes in fields where this section permits FHIR canonicals. A Requester SHOULD NOT include a `|version` suffix in `profilesFrom[]` unless the Requester intends to identify a versioned profile family and expects the Wallet/Responder to understand that convention.

#### 5.5.1 Parsing and preservation

A Requester, Wallet/Responder, or Verifier that processes a FHIR canonical SHALL parse the canonical structurally into a non-empty `url` and an optional `version`. The `url` is the substring before the first `|`, or the whole string when no `|` is present. The `version`, when present, is the substring after the first `|`; any further `|` characters are part of the opaque version string.

Implementations SHALL preserve the original wire canonical string exactly for echoing, logging, response construction, test fixtures, returned `Resource.meta.profile` values, and generated `QuestionnaireResponse.questionnaire` values when that canonical is the Questionnaire identity being answered. Internal parsing for resolution, routing, grouping, or comparison SHALL NOT by itself rewrite the canonical that is carried or emitted.

#### 5.5.2 Resolution

A Wallet/Responder or Verifier resolving a canonical reference to a FHIR resource SHALL use a configured canonical resolver, package cache, terminology service, implementation-guide resolver, or FHIR search against a configured FHIR endpoint when such a mechanism is available. The resolver SHALL consume the parsed `(url, version)` pair, or `url` alone when no version is present, and return a matching resource.

When resolving against a FHIR endpoint, the implementation SHALL use FHIR canonical search semantics for the expected resource type: `GET [base]/{ResourceType}?url={url}&version={version}` for a versioned canonical, or `GET [base]/{ResourceType}?url={url}` for an unversioned canonical. The implementation SHALL select a single resource from the search result whose `(url, version)` matches the request and SHALL fail resolution if no such resource is present.

Direct HTTP dereference of the parsed `url` is permitted only for an unversioned canonical, only when the recipient is willing to accept the version the publisher serves at that URL, and only if the returned resource passes the verification rules below. A Wallet/Responder or Verifier SHALL NOT satisfy a versioned canonical by stripping `|version` and directly dereferencing the bare URL.

#### 5.5.3 Post-resolution verification

After resolving a canonical to a FHIR resource, the implementation SHALL verify that the resolved resource has the expected `resourceType`, has `url` equal to the parsed request `url`, and, when the request canonical was versioned, has `version` equal to the parsed request `version`.

If any of these checks fail, the implementation SHALL treat the affected request item or validation step as unsupported or error under §6 rather than proceeding with a mismatched resource.

#### 5.5.4 Profile matching and local classification

When a `profiles[]` request value includes `|version`, a Wallet/Responder SHALL NOT report `fulfilled` for a resource unless the resource's `meta.profile` includes the same versioned canonical or the Wallet/Responder has equivalent local conformance evidence for that exact profile version. A Verifier performing exact conformance checks SHALL apply the same versioned-to-versioned comparison.

When a `profiles[]` request value has no `|version`, a Wallet/Responder or Verifier MAY match resources known to conform to any supported version of the requested base canonical, subject to the evidence and validation rules applicable to the Artifact.

Wallet-side routing, broad content-kind classification, profile-family membership for `profilesFrom[]`, de-duplication, and Holder-display grouping MAY strip or ignore `|version` only for those local classification or grouping operations. Such stripping SHALL NOT affect resolution, exact-version profile matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation where exact version semantics matter.

#### 5.5.5 Decision matrix

A Requester, Wallet/Responder, or Verifier performing an operation in the following table SHALL apply the handling rule for that operation.

| Operation | Conformance target | Handling of `|version` |
| --- | --- | --- |
| Parse, carry, sign, encrypt, compare transport bytes, log, include in test fixtures, echo, or preserve in response fields | Requester, Wallet/Responder, Verifier | Preserve the canonical string exactly as it appeared in the SMART request or response, subject to privacy minimization for retained records. |
| Resolve a canonical Questionnaire or other FHIR conformance resource | Wallet/Responder, Verifier | Parse to `(url, version)`, use a configured canonical resolver or FHIR canonical search when available, permit direct HTTP dereference only for unversioned canonicals, and verify the resolved resource's `(url, version)` and `resourceType`. |
| Wallet-side item routing or broad content-kind classification | Wallet/Responder | Strip or ignore `|version` only for routing decisions so local routing to questionnaire or other handlers does not depend on version suffix syntax. |
| Profile-family membership for `profilesFrom[]` | Wallet/Responder | Strip or ignore `|version` before profile-family lookup unless a future profile-family definition explicitly defines version-sensitive membership. |
| Exact `profiles[]` matching when the request value has no `|version` | Wallet/Responder, Verifier | Match resources known to conform to a supported version of the requested base canonical, subject to the evidence and validation rules applicable to the Artifact. |
| Exact `profiles[]` matching when the request value includes `|version` | Wallet/Responder, Verifier | Require exact-version evidence; compare the versioned request canonical to versioned `meta.profile` values or equivalent local conformance evidence. |
| De-duplication or grouping for Holder display | Wallet/Responder | MAY group canonicals that differ only by `|version`, but SHALL preserve exact requested strings where exact version matters to Holder review, response construction, diagnostics, or validation. |
| `QuestionnaireResponse.questionnaire` generated for a questionnaire item | Wallet/Responder | Preserve the request canonical, including `|version`, when that canonical is the Questionnaire identity being answered and the information is known. |
| Returned FHIR `Resource.meta.profile` | Wallet/Responder | SHALL NOT remove `|version` suffixes from returned `meta.profile` values merely because request matching stripped versions for routing, family lookup, or grouping. |
| Verifier-side exact conformance checks against returned resources | Verifier | Compare at the same normalization level on both sides: versioned-to-versioned when exact version was requested and evidence is present, or unversioned-to-base-canonical when the request was unversioned. |

A Wallet/Responder SHALL NOT rewrite a requested canonical in a way that changes the semantic Questionnaire or profile being requested. A Wallet/Responder SHALL NOT strip a `|version` suffix from returned clinical content fields where the suffix communicates the profile or Questionnaire version actually used.

Appendix H should align FHIR R4/R4B/R5 canonical resolution, `meta.profile`, Bundles, and `QuestionnaireResponse.questionnaire` guidance with these rules.

### 5.6 Accepted media types and ordering semantics

Each request item has its own `accept[]` list. `accept[]` declares the response Artifact media types the Requester can consume for that item and orders them by Requester preference.

A Requester SHALL include a non-empty `accept[]` array on every request item. A Requester SHALL encode each value as a media type string. A Requester SHALL order `accept[]` from most preferred to least preferred and SHALL NOT rely on any separate preference field.

A Requester SHALL list only media types it is prepared to parse, validate, and route for the corresponding item.

A Wallet/Responder MAY return any Artifact media type listed in the fulfilled item's `accept[]`, subject to Holder decision, available Holder data sources, Wallet capability, FHIR version support, local policy, and content-source constraints. A Wallet/Responder SHOULD choose the earliest listed media type it can produce when multiple response forms are otherwise equivalent for the item.

A Wallet/Responder SHALL NOT return a media type for a request item unless that media type appears in that item's `accept[]`, except where a registered compatibility rule says that the returned media type satisfies an accepted type.

A Verifier SHALL treat an Artifact as invalid for a fulfilled item if the Artifact `mediaType` is not present in that item's `accept[]`, except where a registered compatibility rule says that the returned media type satisfies an accepted type. If one Artifact fulfills multiple request items, its `mediaType` SHALL be acceptable for every item it claims to fulfill under the preceding rule.

Version 1.0 defines the following core media types for request `accept[]` values:

| Media type | Meaning in `accept[]` | Response-model dependency |
| --- | --- | --- |
| `application/fhir+json` | The Requester can consume raw FHIR JSON for this item. For questionnaire items, this means a FHIR `QuestionnaireResponse`; for FHIR resource items, this means a FHIR Resource or Bundle as defined in §6 and Appendix H. | A corresponding response Artifact uses `mediaType: "application/fhir+json"` and declares `fhirVersion` under §6. |
| `application/smart-health-card` | The Requester can consume SMART Health Card file JSON for this item. | A corresponding response Artifact uses `mediaType: "application/smart-health-card"`; the signed health-card content carries its own FHIR-version semantics under §6. |

Extension media types MAY be used when defined by a registered extension or deployment agreement. An extension media-type registrant SHALL define the media type string, Artifact shape, processing rules, validation rules, security considerations, privacy considerations, FHIR-version handling if any, and any compatibility with core media types.

Example of ordered preference:

```json
"accept": [
  "application/smart-health-card",
  "application/fhir+json"
]
```

This example means that the Requester prefers a SMART Health Card when the Wallet/Responder can provide one, but raw FHIR JSON is also acceptable for the item. It does not require the Wallet/Responder to create a SMART Health Card when none is available, and it does not require disclosure when the Holder declines.
