## 5. Clinical content — request (N)

This section defines the SMART request, a transport-neutral clinical JSON object. The same SMART request semantics apply when the object is carried by the same-device presentation flow, embedded directly as `smartRequest` in the cross-device kiosk flow, or carried by a future binding. Presentation transports can bind, authenticate, encrypt, or relay the object; they do not change the clinical meaning of the fields defined here.

### 5.1 Encoding rules

A Requester SHALL encode a SMART request as an RFC 8259 JSON object serialized as UTF-8 when the selected transport requires bytes or text. A Requester SHALL NOT use JSON comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, or non-JSON values in the SMART request.

A Wallet/Responder or Verifier that parses a SMART request SHALL reject a request that is not a JSON object or that contains duplicate object member names after JSON parsing. A Wallet/Responder or Verifier SHALL NOT assign semantics to JSON object member order unless a later transport section defines a byte-exact fixture or signature input for that transport.

A Requester SHALL use the JSON member names and value shapes defined in this section for the clinical request body. Unknown object members are reserved for forward-compatible extensions. A Wallet/Responder MAY ignore unknown members at the top level, item level, and within a known selector when those members do not change the meaning of known required members. A Wallet/Responder SHALL NOT ignore an unknown `content.kind`; unsupported selector kinds are handled as unsupported request items under the response rules in §6.

A Requester SHOULD keep display strings short enough for Wallet review, but this section does not define byte or character length limits. Organizer note: concrete maximum lengths, if any, should be set by JSON Schema, test vectors, or transport size limits after §8 and §9 are stable.

### 5.2 `SmartHealthCheckinRequest`

A SMART request has the following top-level shape:

| Field | Cardinality | Type | Summary |
| --- | --- | --- | --- |
| `type` | 1..1 | string | Fixed discriminator. |
| `version` | 1..1 | string | Request schema version. |
| `id` | 1..1 | string | Opaque request identifier. |
| `purpose` | 0..1 | string | Holder-facing workflow context, not identity. |
| `fhirVersions` | 0..1 | array of strings | FHIR release versions the Requester can consume for raw FHIR JSON. |
| `items` | 1..1 | array of objects | Clinical content request items. |

A Requester SHALL set `type` to the exact string `"smart-health-checkin-request"`.

A Requester SHALL set `version` to the exact string `"1"` for requests conforming to this version of the request model. The `version` field is the SMART Health Check-in request model version; it is not a FHIR version and not a presentation-transport version.

A Requester SHALL set `id` to a non-empty opaque string. A Requester SHOULD generate `id` values so they are collision-resistant within the Requester's check-in sessions and not guessable by parties that only observe unrelated sessions. A Wallet/Responder SHALL treat `id` as an opaque string and SHALL NOT parse clinical meaning, requester identity, or workflow policy from it.

A Requester MAY include `purpose` to provide short Holder-facing display or workflow context, such as `"Clinic check-in"`, `"insurance verification"`, or `"pre-visit intake"`. A Requester SHALL NOT use `purpose` as requester identity metadata, proof of authority, a consent directive, or a persistent authorization grant. A Wallet/Responder MAY display `purpose` with transport-provided origin or trust context, but a Wallet/Responder SHALL NOT treat `purpose` itself as proof of who is asking.

A Requester MAY include `fhirVersions` as an ordered array of FHIR release version strings, for example `"4.0.1"`, `"4.3.0"`, or `"5.0.0"`. If a Requester includes `fhirVersions`, the array order expresses the Requester's preference for raw FHIR JSON returned as `application/fhir+json`. A Wallet/Responder SHOULD use the first FHIR version in `fhirVersions` that it can produce when returning raw FHIR JSON for an item. A Requester that accepts `application/fhir+json` SHOULD include `fhirVersions` unless the Requester can safely process all FHIR versions that a conforming Wallet might return. `fhirVersions` does not constrain SMART Health Cards; for `application/smart-health-card`, the authoritative FHIR version is inside the signed health-card credential payload.

A Requester SHALL include `items` as an array. A Requester SHOULD include at least one request item. A Requester SHALL encode each member of `items` as a `SmartHealthCheckinRequestItem` as defined in §5.3.

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited requester identity metadata includes, but is not limited to, clinic or organization name fields, logo or image URL fields, requester website URL fields, verifier URL fields, certificate fields, and fields whose purpose is to convince the Holder who the Requester is. Requester and Verifier identity, origin, reader authentication, signatures, certificates, trust policy, and session freshness belong to the presentation transport, trust processing, or local policy layers, not to the clinical request body.

#### Example: minimal request (non-normative)

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "request-123",
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

#### Example: fuller request (non-normative)

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "checkin-2026-05-02-abc",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "coverage",
      "title": "Insurance card",
      "summary": "Coverage information for billing and check-in.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
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
        ]
      },
      "accept": ["application/smart-health-card", "application/fhir+json"]
    }
  ]
}
```

### 5.3 `SmartHealthCheckinRequestItem`

A request item describes one unit of clinical content or action for Holder review and response accounting.

| Field | Cardinality | Type | Summary |
| --- | --- | --- | --- |
| `id` | 1..1 | string | Request-item identifier scoped to the SMART request. |
| `title` | 1..1 | string | Short Holder-facing title. |
| `summary` | 0..1 | string | Additional Holder-facing explanation. |
| `required` | 0..1 | boolean | Advisory workflow importance flag. |
| `accept` | 1..1 | array of strings | Ordered accepted response media types. |
| `content` | 1..1 | object | Content selector; see §5.4. |

A Requester SHALL assign each request item a non-empty `id`. A Requester SHALL NOT use the same item `id` more than once within a single SMART request. A Wallet/Responder SHALL treat item `id` values as scoped to the containing SMART request and SHALL use exact string equality when referring to those ids in the SMART response.

A Requester SHOULD limit item `id` values to ASCII letters, digits, period (`.`), underscore (`_`), tilde (`~`), and hyphen (`-`). A Requester SHOULD NOT put patient identifiers, requester identifiers, secrets, timestamps that enable cross-session tracking, or clinical facts in item `id` values. Organizer note: active validators currently require non-empty unique strings but do not enforce a character set; this draft recommends the above character set for schema closure and URL/log safety.

A Requester SHALL set `title` to a non-empty Holder-facing string describing the requested item. A Requester SHOULD make `title` specific enough for Holder review, for example `"Insurance card"` rather than `"Data"`.

A Requester MAY set `summary` to a Holder-facing explanation of the requested content. A Requester SHALL NOT use `summary` to carry requester identity metadata prohibited by §5.2. A Wallet/Responder MAY display `summary` to help the Holder decide whether to share the item.

A Requester MAY set `required` to indicate that the item is important for the Requester's workflow. If `required` is absent, a Wallet/Responder SHALL interpret it as `false`. The `required` flag is advisory only: a Wallet/Responder MAY allow the Holder to decline a required item, and a Requester or Verifier SHALL NOT interpret `required: true` as Holder consent, legal authorization, or proof that the item was actually returned. Downstream handling of missing required content is local workflow policy, informed by the per-item status in the SMART response.

A Requester SHALL set `accept` to a non-empty array of media type strings. The order of `accept` expresses Requester preference as defined in §5.6. A Wallet/Responder SHALL NOT return an Artifact for this item using a media type that is absent from the item's `accept` array unless a later negotiated extension explicitly permits that behavior.

A Requester SHALL set `content` to exactly one content selector object. The selector's `kind` member identifies the selector kind and determines the remaining shape as defined in §5.4.

### 5.4 Content selectors

A content selector is the value of a request item's `content` field. A Requester SHALL include a string `kind` member in every selector. A Requester SHALL use one of the selector kinds defined or registered for this specification.

This version defines these core selector kinds:

- `fhir.resources`, for patient-specific FHIR resources selected by exact profiles, profile families, resource types, or the no-selector default;
- `questionnaire`, for completion of a FHIR Questionnaire; and
- registered extension selector kinds, as described in §5.4.3.

A Wallet/Responder that supports a selector kind SHALL evaluate the selector using the rules for that kind. A Wallet/Responder that does not support a selector kind SHALL NOT pretend the item was fulfilled; it handles the item as unsupported according to §6.

### 5.4.1 `fhir.resources`

A `fhir.resources` selector requests patient-specific FHIR resources. A Requester SHALL encode it as an object with `kind` equal to `"fhir.resources"` and zero or more of `profiles`, `profilesFrom`, and `resourceTypes`.

#### 5.4.1.1 `profiles[]`

A Requester MAY include `profiles` as an array of FHIR `StructureDefinition` canonical URL strings. Each value identifies an exact profile acceptable for the item. A Requester SHOULD use FHIR canonical URLs for `profiles` values and MAY include a `|version` suffix as described in §5.5.

A Wallet/Responder evaluating `profiles` SHALL consider a resource responsive to `profiles` when the resource asserts or is otherwise known by the Wallet to conform to at least one listed profile, subject to `resourceTypes` if present. This specification does not require a Wallet to perform full FHIR profile validation during request matching; local data-source metadata, credential claims, `meta.profile`, or Wallet policy can determine what the Wallet is willing to present as matching.

#### 5.4.1.2 `profilesFrom[]`

A Requester MAY include `profilesFrom` as a non-empty array of canonical profile-family URL strings. Each value identifies a FHIR publication, implementation guide, profile collection, or other profile family whose resource profiles are acceptable.

A Requester SHALL encode `profilesFrom` as an array. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, registry token, or object containing package metadata. Version 1.0 defines `profilesFrom` values as canonical profile-family URLs; it does not define registered URNs for profile families.

A Wallet/Responder evaluating `profilesFrom` SHALL consider a resource responsive to `profilesFrom` when the resource matches a profile from at least one listed profile family, subject to `resourceTypes` if present. How a Wallet obtains or caches profile-family membership is a Wallet or deployment decision unless a later profile registry defines additional behavior.

#### 5.4.1.3 `resourceTypes[]`

A Requester MAY include `resourceTypes` as an array of official FHIR resource type names, for example `"Patient"`, `"Coverage"`, `"Condition"`, or `"MedicationRequest"`. A Requester SHALL use official FHIR resource type names, not local topic labels such as `"care-plans"` or `"insurance"`.

`resourceTypes` is an additional resource-type constraint, not a profile-family selector. If `resourceTypes` is present with `profiles` or `profilesFrom`, a Wallet/Responder SHALL treat `resourceTypes` as narrowing the candidate resources to those whose FHIR `resourceType` is listed and that also satisfy at least one applicable profile selector. If `resourceTypes` is present without `profiles` and without `profilesFrom`, a Wallet/Responder SHALL treat the selector as requesting patient-specific FHIR resources of the listed resource types, regardless of profile.

#### 5.4.1.4 Additivity rule when both `profiles` and `profilesFrom` are present

When `profiles` and `profilesFrom` are both present in the same `fhir.resources` selector, a Wallet/Responder SHALL treat them as additive profile selectors. A resource can satisfy the profile-selector portion of the item by matching any exact profile in `profiles` or by matching any profile from any family in `profilesFrom`. A Wallet/Responder SHALL NOT treat `profiles` as limiting, filtering, or narrowing `profilesFrom`, and a Requester SHALL NOT rely on `profiles` to narrow a broader `profilesFrom` request.

The additivity rule applies only to `profiles` and `profilesFrom`. `resourceTypes`, when present, is the separate resource-type constraint defined in §5.4.1.3.

#### 5.4.1.5 No-selector default

If a Requester sets `content.kind` to `"fhir.resources"` and omits `profiles`, `profilesFrom`, and `resourceTypes`, the Requester is asking for any patient-specific FHIR resources the Wallet can offer and the Holder chooses to share. A Wallet/Responder MAY fulfill such an item with any patient-specific FHIR resources compatible with the item's `accept` array and local policy. A Requester SHOULD use this no-selector default only when it can safely receive broad patient-specific FHIR content.

#### 5.4.1.6 Examples (non-normative)

US Core profile family:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Exact CARIN coverage profile:

```json
{
  "kind": "fhir.resources",
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ],
  "resourceTypes": ["Coverage"]
}
```

Mixed additive selector with a resource-type constraint:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
  ],
  "resourceTypes": ["Patient", "MedicationRequest", "AllergyIntolerance"]
}
```

### 5.4.2 `questionnaire`

A `questionnaire` selector requests that the Wallet or a Holder data source collect answers to a FHIR Questionnaire and return an appropriate response Artifact, typically raw FHIR JSON containing a `QuestionnaireResponse` when `application/fhir+json` is accepted.

A Requester SHALL encode a `questionnaire` selector as an object with `kind` equal to `"questionnaire"` and a `questionnaire` member. A Requester MAY encode `questionnaire` in any of these forms:

1. a FHIR canonical URL string, optionally with a `|version` suffix;
2. an inline FHIR `Questionnaire` resource object whose `resourceType` is `"Questionnaire"`; or
3. an object containing `canonical`, `resource`, or both, where `canonical` is a FHIR canonical URL string and `resource` is an inline FHIR `Questionnaire` resource object.

A Requester that supplies both `canonical` and `resource` SHALL ensure that they identify the same Questionnaire. At minimum, a Requester SHOULD ensure that, when `resource.url` is present, its canonical URL without any `|version` suffix matches the canonical URL before any `|version` suffix in `canonical`; when both `canonical` and `resource.version` are present, a Requester SHOULD ensure that they describe the same intended version. A Wallet/Responder SHALL NOT silently substitute a different Questionnaire if the supplied canonical and inline resource disagree. A Wallet/Responder SHOULD reject the item or report an unsupported/error outcome when it detects such disagreement.

A Wallet/Responder MAY fetch a Questionnaire identified by canonical URL. When fetching over HTTP, a Wallet/Responder SHALL apply the `|version` handling rule in §5.5 and SHALL NOT treat the literal `|version` suffix as part of the HTTP URL. A Wallet/Responder MAY use an inline `Questionnaire` without network retrieval.

#### Example: inline migraine intake (non-normative)

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

### 5.4.3 Extension selectors and registration rules

An extension selector kind is a `content.kind` value other than the core kinds defined in §5.4. A Requester MAY use an extension selector kind only when the kind is registered or otherwise explicitly defined by a profile that both the Requester and Wallet/Responder support.

An extension registrant SHALL define all of the following for each selector kind:

- the exact `content.kind` string;
- the JSON shape and required members of the selector;
- the clinical meaning of the selector;
- how the Wallet/Responder determines whether content satisfies the selector;
- interactions, if any, with `accept`, `fhirVersions`, FHIR canonicals, and response status;
- privacy and security considerations specific to the selector; and
- at least one example request item using the selector.

An extension registrant SHALL NOT define an extension selector kind that redefines the semantics of `type`, `version`, `id`, `purpose`, `fhirVersions`, `items`, `accept`, `required`, or any core selector kind. An extension registrant SHOULD choose a collision-resistant selector kind name, for example a reverse-DNS or URI-like name, until a formal selector-kind registry is established in §13.

A Wallet/Responder that does not support an extension selector kind SHALL handle the corresponding item as unsupported; it SHALL NOT infer equivalent semantics from the selector kind string alone.

### 5.5 Canonical `|version` handling

FHIR canonicals can include a version suffix using the form `canonical|version`. This suffix is part of the FHIR canonical value in some contexts and a resolver hint in others. Requesters and Wallets/Responders SHALL apply the following decision matrix.

| Operation | Conformance target | Required handling |
| --- | --- | --- |
| Send exact profile in `profiles[]` | Requester | MAY include `|version` when an exact profile version is desired. |
| Match returned or available resource to `profiles[]` | Wallet/Responder | Preserve the suffix for exact version-sensitive comparison; if performing version-agnostic routing or grouping, compare consistently after stripping the suffix from both sides. |
| Evaluate profile-family membership for `profilesFrom[]` | Wallet/Responder | Strip any `|version` suffix before resolving or grouping the profile-family canonical, unless a later registered profile-family definition explicitly defines version-sensitive membership. |
| Fetch a canonical over HTTP | Wallet/Responder | Strip the `|version` suffix before constructing the HTTP URL. |
| Classify Wallet UI kind or local routing from a canonical | Wallet/Responder | Strip the `|version` suffix so routing does not depend on profile or Questionnaire version. |
| Deduplicate or group profile canonicals for display | Wallet/Responder | Strip the `|version` suffix for logical grouping, while preserving the original strings for audit/debug display when retained. |
| Populate returned FHIR resource `meta.profile` | Wallet/Responder | Preserve any `|version` suffix that is part of the resource's profile claim. |
| Populate returned `QuestionnaireResponse.questionnaire` | Wallet/Responder | Preserve the canonical and `|version` suffix identifying the Questionnaire version that was answered when that information is known. |
| Write test fixtures, logs, or debug bundles | Requester, Wallet/Responder, Verifier | Preserve the original canonical strings sent on the wire, subject to applicable privacy rules. |

A Requester SHALL NOT rely on an HTTP server accepting a literal `|version` suffix in a URL. A Wallet/Responder SHALL NOT strip a `|version` suffix from returned clinical content fields where the suffix communicates the version of a profile or Questionnaire actually used.

### 5.6 Accepted media types

Each request item has an `accept` array listing response media types the Requester can process for that item. A Requester SHALL include a non-empty `accept` array on every request item. A Requester SHALL list only media types it is prepared to validate and consume for the item.

This version defines these core media types for request `accept` values:

- `application/fhir+json`: raw FHIR JSON. In the response model, an Artifact using this media type declares `fhirVersion` and carries a FHIR Resource or Bundle as its value.
- `application/smart-health-card`: a SMART Health Card file JSON object whose `verifiableCredential` array contains one or more SMART Health Card JWS strings. The FHIR version is determined from the signed health-card credential payload, not from the request's `fhirVersions` array.

A Requester MAY include extension media types. An extension registrant defining a media type for SMART Health Check-in SHALL specify the Artifact shape, validation rules, FHIR-version interaction if any, security considerations, and privacy considerations for that media type. An extension registrant SHALL NOT define an extension media type that changes the meaning of the core media types above.

The order of `accept` expresses Requester preference, most preferred first. A Wallet/Responder SHOULD choose the earliest media type in `accept` that it supports and can produce for the item, after applying Wallet policy, Holder decisions, data availability, and content-source constraints. A Wallet/Responder MAY choose a later media type in the array when the preferred media type is unavailable, unsupported, disallowed by policy, or not suitable for the available content.

A Wallet/Responder SHALL NOT return an Artifact for a request item using a media type that is absent from that item's `accept` array. If one Artifact fulfills multiple request items, a Wallet/Responder SHALL choose a media type that appears in the `accept` array for every item the Artifact claims to fulfill. A Requester or Verifier SHALL use exact media type string comparison, including parameters if any, unless a later media-type registration defines explicit parameter normalization rules.

## Organizer notes

### Strengths

- Preserves the clinical content model as transport-neutral and keeps kiosk wrapper details out of §5 except for the invariant that kiosk embeds the SMART request directly as `smartRequest`.
- Makes requester identity metadata prohibition explicit while preserving `purpose` as Holder-facing workflow context.
- Defines `profilesFrom` as an array of canonical profile-family URLs and states additive `profiles[]` plus `profilesFrom[]` semantics without accidentally making `resourceTypes[]` additive.
- Separately defines `resourceTypes[]` as an additional resource-type constraint, including the case where it appears without profile selectors.
- Provides a concrete `questionnaire` disagreement rule and a canonical `|version` matrix aligned with current docs and Android fetch behavior.

### Caveats and open issues

- Active TypeScript validation currently accepts non-empty item ids without the proposed ASCII-safe character set. The organizer should decide whether to adopt the proposed charset and update schemas/tests, or relax §5.3 to non-empty unique strings only.
- Active TypeScript validation rejects unknown `content.kind` values, while this draft anticipates registered extension selectors and unsupported-item handling. Schema and validator behavior should be reconciled with §5.4.3 and §6 status handling.
- This draft uses advisory language for non-empty `items[]` because active validators allow an empty array. The organizer should decide whether zero-item requests are invalid or merely unhelpful.
- No hard length limits are specified for strings or arrays. Transport sections may need size limits for same-device `requestInfo`, kiosk envelopes, QR/pointer metadata, and fixture generation.

### Downstream dependencies

- §6 must define exact response status behavior for declined, unsupported, unavailable, partial, fulfilled, and error outcomes, including how unsupported selector kinds are reported.
- Appendix B JSON Schema must encode `profilesFrom` as a non-empty array when present, additive selector permissiveness, required `accept[]`, and any final item-id charset decision.
- Appendix H should align FHIR mapping details for `meta.profile`, Bundles, `QuestionnaireResponse.questionnaire`, profile-family membership, and `resourceTypes[]` narrowing.
- §13 should establish registries for extension selector kinds and extension media types, including designated expert review criteria.
