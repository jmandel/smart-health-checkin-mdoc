## 5. Clinical content — request

This section defines the SMART request, the transport-neutral clinical JSON object a Requester uses to describe workflow-bounded content it asks a Holder to consider sharing through a Wallet/Responder. The same SMART request semantics apply when the object is carried by the same-device presentation flow, when it is embedded directly as `smartRequest` in a kiosk payload, or when a future binding carries it. Presentation transports can authenticate, encrypt, bind, route, or contextualize the request, but they do not alter the field semantics in this section.

A SMART request is not a Verifier credential, a requester identity statement, a consent record, or a transport transcript. Requester identity, origin, reader metadata, logos, certificates, session state, kiosk wrapper state, and other trust evidence belong outside the clinical request body.

### 5.1 Encoding rules

A Requester SHALL encode a SMART request as a JSON object conforming to RFC 8259 and UTF-8 when serialized as text.

A Requester SHALL NOT include comments, trailing commas, `NaN`, `Infinity`, `-Infinity`, duplicate object member names, or any non-JSON value in a SMART request.

A Wallet/Responder SHALL reject a SMART request that is not a JSON object or that cannot be parsed according to the encoding used by the selected transport.

Object member order is not semantically significant. Array order is semantically significant where this section says so, including `items[]`, `fhirVersions[]`, and `accept[]`.

A Requester SHALL use JSON strings for identifiers, FHIR canonicals, FHIR versions, FHIR resource-type names, media types, human-readable display strings, and extension selector names unless a specific field definition states otherwise.

A Requester SHALL use JSON booleans for boolean fields, including `items[].required`.

A Wallet/Responder MAY ignore unknown members in the SMART request object, request items, and known selector objects unless the selected conformance profile, a registered extension, or local policy requires rejection. Ignoring an unknown member does not permit a Wallet/Responder to ignore malformed values of known members.

Organizer note for §5.1: the final specification should align size limits, string length limits, identifier length limits, and JSON parser duplicate-key behavior with Appendix B and with the concrete transport limits in §8 and §9. This attempt intentionally does not invent numeric limits not grounded in current code or documents.

### 5.2 `SmartHealthCheckinRequest`

A `SmartHealthCheckinRequest` has the following top-level shape:

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

The members are defined below.

#### 5.2.1 `type`

A Requester SHALL set `type` to the exact string `"smart-health-checkin-request"`.

A Wallet/Responder SHALL reject a SMART request whose `type` is absent or is not the exact string `"smart-health-checkin-request"`.

#### 5.2.2 `version`

A Requester SHALL set `version` to the exact string `"1"` for SMART Health Check-in 1.0 request objects.

A Wallet/Responder SHALL reject a SMART request whose `version` is absent or is not a version the Wallet/Responder supports. A Wallet/Responder that implements only this version SHALL reject any value other than `"1"`.

The `version` member identifies the SMART request schema version. It is not a FHIR version and does not constrain the FHIR versions of returned raw FHIR Artifacts.

#### 5.2.3 `id`

A Requester SHALL include `id` as a non-empty string.

A Requester SHALL generate `id` so that it is unique for that Requester within the presentation or kiosk session in which the request is used.

A Requester SHOULD generate `id` with enough unpredictability to avoid accidental collision and to make cross-session guessing impractical when the identifier is exposed in logs, wrappers, or response validation.

A Wallet/Responder SHALL preserve the request `id` as an opaque value for response construction. Section §6 defines the response `requestId` binding.

The request `id` is a correlation identifier, not requester identity and not Holder identity.

#### 5.2.4 `purpose`

A Requester MAY include `purpose` as a string containing short Holder-facing display or workflow context, for example `"Clinic check-in"`, `"insurance verification"`, or `"pre-visit intake"`.

A Requester SHALL NOT use `purpose` to assert the Requester's identity, legal name, verified origin, trust status, logo, endpoint, certificate status, or authorization to receive data.

A Wallet/Responder MAY display `purpose` to the Holder as request context, but a Wallet/Responder SHALL NOT treat `purpose` as authenticated requester identity.

If `purpose` is omitted, the request remains valid; Wallet/Responder display policy determines any fallback wording.

#### 5.2.5 `fhirVersions[]`

A Requester MAY include `fhirVersions` as an array of one or more FHIR release-version strings that the Requester can consume for raw FHIR JSON Artifacts.

When present, a Requester SHALL order `fhirVersions[]` by Requester preference, most preferred first.

A Wallet/Responder SHOULD use `fhirVersions[]` when choosing a FHIR version for `application/fhir+json` Artifacts, subject to Holder data availability, Wallet capability, and the selected item `accept[]` media types.

`fhirVersions[]` applies to raw FHIR JSON Artifacts. It does not override the FHIR version encoded inside a SMART Health Card Verifiable Credential.

Open issue: this attempt does not make `fhirVersions[]` mandatory for requests that accept `application/fhir+json`, because current active implementations allow it to be omitted. The final §6 validation rules should decide whether a Verifier rejects raw FHIR JSON Artifacts whose `fhirVersion` was not advertised.

#### 5.2.6 `items[]`

A Requester SHALL include `items` as an array of `SmartHealthCheckinRequestItem` objects.

A Wallet/Responder SHALL process `items[]` as the set of request items presented for Holder review and response accounting. Section §6 defines how each request item is covered by response status.

A Requester SHOULD include at least one request item. Open issue: active validators currently require `items` to be an array but do not consistently reject an empty array; the final JSON Schema and conformance checklist should decide whether `items[]` is required to be non-empty.

The order of `items[]` is the Requester's preferred display and review order. A Wallet/Responder MAY group, summarize, or reorder items for accessibility, safety, or local policy, but it SHALL preserve each item `id` for response fulfillment and status.

#### 5.2.7 Prohibited requester identity metadata

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited examples include, but are not limited to:

- requester, clinic, practice, payer, organization, staff, or facility name fields;
- logo, image, icon, brand-color, or display-brand fields;
- requester URL, website, callback URL, endpoint URL, domain, origin, package name, application id, or certificate fields;
- signed-request, reader, Verifier, trust-framework, issuer, or accreditation metadata; and
- kiosk pointer, Submission service, relay, completion, encryption, nonce, or wrapper metadata.

A Wallet/Responder SHALL NOT treat any unknown request-body member as authenticated requester identity metadata. A Wallet/Responder MAY reject a request that contains apparent requester identity metadata in the clinical request body.

Holder-facing clinical context belongs in `purpose`, `items[].title`, and `items[].summary`. Trust context belongs to the selected presentation transport, trust framework, kiosk wrapper, or local Wallet policy.

#### 5.2.8 Examples

Example: minimal FHIR-resource request.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-patient-001",
  "items": [
    {
      "id": "patient",
      "title": "Patient demographics",
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

Example: fuller request using display context, FHIR version preference, additive profile selectors, and an inline Questionnaire.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-checkin-2026-05-02-001",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "summary": "Coverage information you can share for billing.",
      "required": false,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ]
      },
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
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
      "accept": ["application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Migraine check-in",
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
  ]
}
```

These examples are illustrative. Example identifiers, display text, URLs, and clinical selections are not fixed protocol values.

### 5.3 `SmartHealthCheckinRequestItem`

A request item describes one unit of requested clinical content or Holder action. Request items are the unit of Holder review, accepted response media-type advertisement, fulfillment references, and per-item status reporting.

A `SmartHealthCheckinRequestItem` has the following shape:

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

#### 5.3.1 `id` uniqueness and allowed character set

A Requester SHALL include `id` as a non-empty string on every request item.

A Requester SHALL ensure that `items[].id` values are unique within a single SMART request.

A Wallet/Responder SHALL reject a SMART request with duplicate `items[].id` values.

A Requester SHOULD use item ids consisting only of ASCII letters, digits, period (`.`), underscore (`_`), and hyphen (`-`), beginning with an ASCII letter or digit. This convention supports stable references in JSON, logs, schemas, and human review without treating item ids as URLs.

Open issue: current active validators require non-empty strings and uniqueness but do not enforce the proposed restricted character set. Appendix B should either encode the restricted pattern or relax this prose to match implementation.

#### 5.3.2 `title`

A Requester SHALL include `title` as a non-empty string on every request item.

`title` is Holder-facing text describing the item being requested, such as `"Patient demographics"`, `"Insurance card"`, or `"Intake form"`.

A Requester SHALL NOT use `title` as a substitute for authenticated requester identity metadata.

A Wallet/Responder SHOULD make `title` available in Holder review when requesting consent for the item, subject to accessibility, localization, and safety policy.

#### 5.3.3 `summary`

A Requester MAY include `summary` as a string that gives a Holder-facing explanation of the requested content.

A Requester SHOULD use `summary` to clarify broad selectors, profile-family requests, or questionnaire purpose when `title` alone would be ambiguous.

A Requester SHALL NOT use `summary` as a substitute for authenticated requester identity metadata.

A Wallet/Responder MAY display, summarize, or suppress `summary` according to Wallet UX policy, but it SHALL preserve item ids for response accounting regardless of display choices.

#### 5.3.4 `required` advisory semantics

A Requester MAY include `required` as a boolean. If omitted, `required` is interpreted as `false`.

When `required` is `true`, the Requester is indicating that the item is important for the Requester's downstream workflow.

A Requester SHALL treat `required` as advisory workflow context only. `required: true` is not Holder consent, not a command to the Wallet, and not a guarantee that responsive content will be returned.

A Wallet/Responder MAY display or otherwise consider `required` during Holder review, but a Wallet/Responder SHALL preserve the Holder's ability to decline disclosure unless a separate law, policy, or product constraint outside this specification applies.

A Wallet/Responder MAY return declined, unavailable, unsupported, partial, or error status for an item whose `required` value is `true`. The Requester decides outside this protocol how its workflow proceeds when required content is missing.

#### 5.3.5 `accept[]` ordered preference

A Requester SHALL include `accept` as a non-empty array of media-type strings on every request item.

A Requester SHALL order `accept[]` by Requester preference, most preferred first.

A Wallet/Responder SHALL NOT return an Artifact for an item using a media type that is absent from that item's `accept[]`, unless a later registered extension explicitly defines compatible substitution semantics.

A Wallet/Responder MAY choose any media type listed in `accept[]` for the item, considering Holder data availability, Wallet capability, local policy, and Holder choice. The first media type is preferred by the Requester, but it is not a requirement that the Wallet/Responder use the first supported type if a later type is more appropriate for Holder policy or available data.

If no listed media type can be produced for an item, a Wallet/Responder SHALL report the item outcome using the response status mechanism defined in §6 rather than returning an Artifact with an unaccepted media type.

#### 5.3.6 `content`

A Requester SHALL include `content` as a selector object on every request item.

A Requester SHALL include `content.kind` as a string identifying the selector kind.

For version 1.0, this section defines the selector kinds `fhir.resources` and `questionnaire`. Registered extensions can define additional selector kinds as described in §5.4.3.

A Wallet/Responder that does not understand `content.kind` MAY treat the item as unsupported and report that per-item status in the SMART response. A Wallet/Responder SHALL NOT infer the semantics of an unknown selector from unrelated fields.

### 5.4 Content selectors (`content.kind`)

A content selector describes what clinical content or action would satisfy a request item. Selectors are intentionally not a general FHIR query language. They identify acceptable categories of content using FHIR-native identifiers where possible, leaving data-source search, Holder review, and response packaging to the Wallet/Responder.

A Requester SHALL use a selector shape defined by this section or by a registered extension selector.

A Wallet/Responder SHALL evaluate selector semantics independently for each request item, while allowing one response Artifact to fulfill multiple items where §6 permits.

#### 5.4.1 `fhir.resources`

A `fhir.resources` selector requests patient-specific FHIR resources.

The selector has this shape:

```json
{
  "kind": "fhir.resources",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

A Requester MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination of those fields, or none of them.

A Wallet/Responder SHALL treat `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` as constraints on responsive FHIR resources according to the subsections below.

##### 5.4.1.1 `profiles[]`

A Requester MAY include `profiles` as an array of FHIR `StructureDefinition` canonical strings.

A Requester SHOULD use `profiles[]` for exact FHIR profile requests, such as a US Core Patient profile or a CARIN Coverage profile.

A Requester MAY include a FHIR canonical `|version` suffix in a `profiles[]` value when the Requester needs an exact profile version.

A Wallet/Responder SHOULD consider a resource responsive to a `profiles[]` value when the resource claims, or can otherwise be determined by Wallet policy to conform to, that exact profile canonical according to the canonical-version handling rules in §5.5.

Open issue: the final response validation section should decide how strictly a Verifier checks raw FHIR `meta.profile` declarations versus other evidence of profile conformance.

##### 5.4.1.2 `profilesFrom[]`

A Requester MAY include `profilesFrom` as an array of one or more canonical profile-family URLs.

A Requester SHALL encode `profilesFrom` as an array. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, implementation-guide object, registry object, or local topic vocabulary.

Each `profilesFrom[]` value identifies a FHIR publication, implementation guide, profile collection, or other profile family by canonical URL. Version 1.0 does not define registered URNs or package metadata in `profilesFrom[]`.

A Wallet/Responder SHALL reject a `fhir.resources` selector if `profilesFrom` is present but is not an array of one or more strings.

A Wallet/Responder MAY use local knowledge, FHIR package metadata available outside the request, implementation-guide definitions, or configured profile-family mappings to determine which exact profiles are members of a `profilesFrom[]` family.

##### 5.4.1.3 `resourceTypes[]`

A Requester MAY include `resourceTypes` as an array of official FHIR resource type names, for example `"Patient"`, `"Coverage"`, `"Condition"`, or `"MedicationRequest"`.

A Requester SHALL use official FHIR resource type names in `resourceTypes[]`, not local topic names such as `"care-plans"` or `"insurance-card"`.

`resourceTypes[]` narrows the requested FHIR resources to resources whose `resourceType` is one of the listed values. It does not add profile families and it does not make `profiles[]` narrow `profilesFrom[]`.

When `resourceTypes[]` is present together with `profiles[]` and/or `profilesFrom[]`, a Wallet/Responder SHOULD treat a resource as responsive only if both of the following are true:

1. the resource satisfies at least one profile selector from `profiles[]` or `profilesFrom[]`; and
2. the resource's FHIR `resourceType` is listed in `resourceTypes[]`.

When `resourceTypes[]` is present and both `profiles[]` and `profilesFrom[]` are omitted, a Wallet/Responder SHOULD treat the selector as requesting patient-specific FHIR resources of the listed resource types.

Open issue: the final canonical text should decide whether the two SHOULDs above become SHALLs. This attempt uses SHOULD because profile membership and resource-type mapping can be complicated across FHIR versions and because active documents describe `resourceTypes[]` as optional narrowing without a fully specified conformance algorithm.

##### 5.4.1.4 Additivity rule when both `profiles[]` and `profilesFrom[]` are present

When both `profiles[]` and `profilesFrom[]` are present, a Wallet/Responder SHALL treat them as additive profile selectors. A resource may satisfy the profile part of the selector by matching any exact profile in `profiles[]` or by matching any profile in any profile family identified by `profilesFrom[]`, subject to `resourceTypes[]` and the rest of the item definition.

A Requester SHALL NOT rely on `profiles[]` to narrow the profiles selected by `profilesFrom[]`.

A Wallet/Responder SHALL NOT interpret the presence of `profiles[]` as limiting or filtering the broader `profilesFrom[]` request.

##### 5.4.1.5 No-selector default

If `kind` is `"fhir.resources"` and `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, and Holder decision.

A Requester SHOULD avoid the no-selector default unless the workflow can safely consume broad patient-specific FHIR content and the item display text clearly explains the breadth of the request.

A Wallet/Responder MAY fulfill a no-selector item partially and report partial status rather than attempting to disclose all available patient-specific FHIR content.

##### 5.4.1.6 Examples

Example: US Core profile family.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Example: exact CARIN Coverage profile.

```json
{
  "kind": "fhir.resources",
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ]
}
```

Example: additive profile selectors with resource-type narrowing.

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

In the last example, `profiles[]` and `profilesFrom[]` are additive. The `resourceTypes[]` values narrow the resulting FHIR resources to the listed resource types.

#### 5.4.2 `questionnaire`

A `questionnaire` selector requests completion of, or response to, a FHIR Questionnaire. The expected raw FHIR response form for `application/fhir+json` is a FHIR `QuestionnaireResponse`; §6 defines response Artifact shape.

The selector has this outer shape:

```json
{
  "kind": "questionnaire",
  "questionnaire": "<canonical-or-inline-or-combined>"
}
```

A Requester SHALL include `questionnaire` in every `questionnaire` selector.

A Requester MAY express `questionnaire` in any of these forms:

1. a FHIR canonical string;
2. an inline FHIR `Questionnaire` resource object; or
3. an object containing `canonical`, `resource`, or both.

A Wallet/Responder SHALL reject or report unsupported for a `questionnaire` selector whose `questionnaire` member is absent or is not one of those forms.

##### 5.4.2.1 By canonical

A Requester MAY provide `questionnaire` as a FHIR canonical string, optionally including `|version`.

Example:

```json
{
  "kind": "questionnaire",
  "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
}
```

A Wallet/Responder MAY resolve the canonical using a configured service, a FHIR endpoint, cached content, or another Holder data source. When fetching by URL, a Wallet/Responder SHOULD apply the canonical-version handling rule in §5.5 and not treat the `|version` suffix as part of the literal HTTP URL.

If the Wallet/Responder cannot resolve or render the referenced Questionnaire, it SHALL report the item outcome using the response status mechanism in §6 rather than fabricating a Questionnaire.

##### 5.4.2.2 Inline `Questionnaire`

A Requester MAY provide `questionnaire` as an inline FHIR `Questionnaire` resource object.

Example:

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
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

A Requester SHALL ensure that an inline resource used in this form has `resourceType` equal to `"Questionnaire"`.

A Wallet/Responder SHALL reject or report unsupported for an inline questionnaire resource whose `resourceType` is not `"Questionnaire"`.

##### 5.4.2.3 Combined canonical and resource

A Requester MAY provide `questionnaire` as an object with `canonical` and `resource` members. At least one of those members SHALL be present.

Example:

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

A Requester SHOULD use the combined form when it wants the Wallet/Responder to have both a stable canonical identifier for response binding and an inline resource to render without network retrieval.

A Wallet/Responder SHALL reject or report unsupported for a combined form whose `resource` member is present but is not an object with `resourceType` equal to `"Questionnaire"`.

##### 5.4.2.4 Wallet behavior when both forms supplied disagree

If both a canonical and an inline resource are supplied, a Requester SHOULD ensure that the canonical without `|version` matches the inline Questionnaire `url`, when the inline resource has `url`, and that the canonical version suffix matches the inline Questionnaire `version`, when both are present.

A Wallet/Responder SHOULD detect obvious disagreement between supplied canonical information and inline resource metadata before presenting the questionnaire to the Holder.

If a Wallet/Responder detects disagreement that could cause the Holder to answer a different Questionnaire than the Requester identified, the Wallet/Responder SHOULD reject the item or report the item as unsupported or error. A Wallet/Responder SHALL NOT silently rewrite the Requester's canonical to match a conflicting inline resource.

Open issue: the final spec should decide the exact status code for canonical/resource disagreement after §6 status semantics are canonical.

##### 5.4.2.5 Example

Example: inline migraine intake Questionnaire.

```json
{
  "kind": "questionnaire",
  "questionnaire": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "title": "Migraine Check-in",
    "item": [
      {
        "linkId": "wellbeing",
        "text": "How have you been feeling since your last visit?",
        "type": "text"
      },
      {
        "linkId": "headache",
        "text": "Are you experiencing a headache today?",
        "type": "boolean"
      },
      {
        "linkId": "severity",
        "text": "Pain severity (0-10)",
        "type": "integer"
      }
    ]
  }
}
```

This example is illustrative and does not define required clinical questions.

#### 5.4.3 Extension selectors — registration rules

Extension selector kinds allow future or deployment-specific request semantics without changing the base `fhir.resources` and `questionnaire` selectors.

An extension registrant SHALL define a selector kind string, the JSON shape for that selector, its conformance targets, its interaction with `accept[]`, and its response validation expectations.

An extension registrant SHALL define whether unknown fields inside the extension selector are ignored, rejected, or processed by an extension-specific rule.

An extension registrant SHALL define any privacy or safety display text requirements needed for Holder review.

An extension registrant SHALL NOT define an extension selector that changes the semantics of `type`, `version`, `id`, `purpose`, `fhirVersions[]`, `items[]`, `items[].id`, `items[].required`, `items[].accept[]`, `fhir.resources`, or `questionnaire` for non-extension items.

An extension registrant SHOULD use collision-resistant selector kind names, such as reverse-DNS names or names allocated by the registry defined in §13.4.

A Wallet/Responder that does not support an extension selector kind MAY report the corresponding item as unsupported. A Wallet/Responder SHALL NOT satisfy an unsupported extension selector by guessing from its display text alone.

### 5.5 Canonical `|version` handling

FHIR canonicals can include a version suffix in the form `canonical|version`. This section defines how Requesters and Wallets treat that suffix in request processing. The suffix can be part of an exact semantic claim, but it is not a literal HTTP URL component.

| Operation | Requester requirement | Wallet/Responder requirement | Rationale |
| --- | --- | --- | --- |
| Including exact profile versions in `profiles[]` | A Requester MAY include `|version` when it needs an exact profile version. | A Wallet/Responder SHOULD preserve the suffix for exact conformance evaluation and response validation evidence. | Exact profile requests can be version-sensitive. |
| Including profile-family references in `profilesFrom[]` | A Requester MAY include only canonical profile-family URLs; use of `|version` is an open issue for final text. | A Wallet/Responder SHOULD strip `|version`, if present, when resolving broad family membership unless an extension says otherwise. | Family membership and routing are generally version-agnostic in active implementations. |
| HTTP fetch of a canonical | A Requester SHOULD NOT assume `canonical|version` is a dereferenceable URL. | A Wallet/Responder SHALL remove the `|version` suffix before using a canonical as a literal HTTP URL. | FHIR versioned canonicals are identifiers, not literal URLs. |
| Wallet-side classification or routing | No special Requester action. | A Wallet/Responder SHOULD strip `|version` when classifying a request as coverage, clinical, questionnaire, or another local kind. | Routing should not depend on profile version strings. |
| De-duplication and grouping | A Requester SHOULD avoid duplicate canonicals that differ only by redundant versioning unless it intentionally needs multiple versions. | A Wallet/Responder MAY group values that differ only by `|version` for display, while preserving exact values for conformance checks. | Holder display should not become noisy, but exact claims still matter. |
| `QuestionnaireResponse.questionnaire` in returned raw FHIR | A Requester SHOULD provide stable canonical information when it expects a QuestionnaireResponse to bind to a questionnaire. | A Wallet/Responder SHOULD preserve the canonical including `|version`, when known, in the resulting QuestionnaireResponse. | The receiver needs to know which questionnaire version was answered. |
| Returned resource `meta.profile` | No special Requester action beyond requested selectors. | A Wallet/Responder SHALL NOT remove `|version` from returned FHIR `meta.profile` values merely because request matching stripped versions for routing. | Returned resource metadata is part of the clinical content claim. |
| Exact conformance comparison | A Requester that includes `|version` in `profiles[]` SHOULD expect exact-version comparison. | A Wallet/Responder and Verifier SHOULD compare at the same normalization level on both sides; they SHOULD NOT strip one side while preserving the other. | Avoid profile-confusion and false matches. |
| Logs, fixtures, debug bundles, and transport payloads | A Requester SHOULD serialize the request value it actually intends. | A Wallet/Responder SHOULD preserve the on-the-wire canonical strings in logs and fixtures subject to privacy policy. | Captures should be debuggable and reproducible. |

Open issue: the treatment of `|version` in `profilesFrom[]` should be made fully normative after a registry or profile-family resolution model is selected. Current active evidence supports `profilesFrom[]` as canonical URL arrays without package descriptors or registered URNs.

### 5.6 Accepted media types (`accept[]`)

`accept[]` appears on each request item and declares the response Artifact media types the Requester can consume for that item.

Version 1.0 defines these core media types:

- `application/fhir+json`
- `application/smart-health-card`

A Requester MAY include registered extension media types in `accept[]`.

A Requester SHALL NOT include a media type in `accept[]` unless the Requester is prepared to process a conforming Artifact of that media type for the item.

A Requester SHALL order `accept[]` by preference, most preferred first.

A Wallet/Responder SHALL interpret `accept[]` order as Requester preference only. The Wallet/Responder remains responsible for Holder review, Wallet policy, and available data-source decisions.

A Wallet/Responder SHALL return only media types listed in the fulfilled item's `accept[]`, subject to any registered extension compatibility rules.

For `application/fhir+json`, a Wallet/Responder returning a raw FHIR JSON Artifact SHALL use the Artifact shape defined in §6 and include the Artifact-level `fhirVersion` required by §6.

For `application/smart-health-card`, a Wallet/Responder returning a SMART Health Card Artifact SHALL use the Artifact shape defined in §6. The FHIR version is determined by the signed SMART Health Card content, not by an outer raw-FHIR `fhirVersion` wrapper.

If one Artifact fulfills multiple request items, a Verifier SHALL validate under §6 that the Artifact media type is acceptable for every fulfilled item.

An extension registrant defining an extension media type SHALL define the Artifact shape or reference an existing media-type specification, define whether `fhirVersion` is applicable, and define validation rules sufficient for a Verifier to decide whether the Artifact can fulfill an item that listed that media type.

## Organizer notes

Strengths:

- Preserves the transport-neutral clinical request model and explicitly keeps requester identity metadata out of the request body.
- Makes `profilesFrom[]` an array of canonical profile-family URLs and states profile-selector additivity without broadening it to `resourceTypes[]`.
- Defines `resourceTypes[]` separately as narrowing, while marking the strictness of its conformance algorithm as an issue for organizer adjudication.
- Grounds request, item, selector, questionnaire, and media-type shapes in the active TypeScript, request/response design document, web tests, store presets, and Android vectors.
- Keeps examples illustrative and avoids kiosk wrapper details beyond the fact that kiosk embeds the SMART request directly as `smartRequest`.

Caveats and open issues:

- Exact string length, array length, duplicate-key parser behavior, and item-id pattern enforcement should be synchronized with Appendix B and transport size limits.
- `items[]` non-empty status is unresolved because active validators require an array but do not consistently reject an empty array.
- `profilesFrom[]` with `|version` needs a final decision once profile-family resolution and registries are settled.
- Questionnaire canonical/resource disagreement needs final status-code mapping after §6 is canonical.
- The no-selector default is intentionally broad; privacy text in §12 should give Wallet display and minimization guidance.

Downstream dependencies:

- §6 must define response `requestId`, Artifact shapes, per-item status coverage, media-type validation against each fulfilled item, and exact status behavior for unsupported selectors and questionnaire disagreement.
- Appendix B must encode `profilesFrom[]` array shape, known selector shapes, `accept[]` non-empty arrays, and any final item-id pattern or `items[]` non-empty rule.
- Appendix H should align FHIR profile matching, `meta.profile`, QuestionnaireResponse binding, and canonical `|version` preservation with §5.5.
- §9 must keep kiosk wrapper details separate while preserving direct `smartRequest` embedding.
