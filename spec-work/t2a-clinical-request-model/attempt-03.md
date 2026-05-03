## 5. Clinical content — request

The SMART request is the transport-neutral clinical JSON object by which a Requester asks a Wallet/Responder to help a Holder share clinical or administrative content for a bounded check-in workflow. The same SMART request semantics apply when the object is carried by the same-device presentation flow, embedded directly as `smartRequest` in the cross-device kiosk wrapper, or carried by a future binding.

Presentation transports can authenticate origins, readers, Verifiers, sessions, or kiosk wrapper payloads. They do not change the meaning of `purpose`, request items, selectors, `accept[]`, item identifiers, or the advisory `required` flag defined in this section.

### 5.1 Encoding rules

A SMART request is a JSON object. A Requester SHALL encode a SMART request as valid JSON with unique object member names. A Wallet/Responder SHALL reject a SMART request that is not a JSON object or that cannot be decoded without duplicate-member ambiguity under the JSON parser used for protocol validation.

A Requester SHALL use the field names and JSON shapes defined in this section. A Wallet/Responder SHALL treat unknown top-level fields and unknown selector fields according to the extension rules in §5.4.3; a field is not a conforming extension merely because it is present.

A Requester SHALL encode all identifiers, FHIR canonicals, media types, FHIR versions, titles, summaries, and purpose values as JSON strings. A Requester SHALL encode arrays as JSON arrays, booleans as JSON booleans, and inline FHIR resources as JSON objects.

Object member order is not significant for the clinical content model. Array order is significant only where this section says so: `fhirVersions[]` and `accept[]` are ordered by Requester preference; `items[]` order is the Requester's display and workflow order unless a Wallet/Responder has a policy reason to group or reorder presentation to the Holder.

A transport binding MAY carry the SMART request as a JSON text string, a byte string containing UTF-8 JSON, a CBOR-carried string, a signed payload member, or another representation. The binding that carries the request SHALL define the exact representation, escaping, and session binding rules. The clinical request model in this section does not require a byte-for-byte JSON canonicalization.

### 5.2 `SmartHealthCheckinRequest`

A `SmartHealthCheckinRequest` has this top-level shape:

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

A Requester SHALL set `type` to the fixed string `"smart-health-checkin-request"`. A Wallet/Responder SHALL reject a request whose `type` is absent or not exactly `"smart-health-checkin-request"`.

#### 5.2.2 `version`

A Requester SHALL set `version` to the fixed string `"1"` for SMART Health Check-in 1.0. This is the request-schema version and is not a FHIR version. A Wallet/Responder SHALL reject a request whose `version` is absent or not exactly `"1"`, unless a later version-negotiation rule explicitly permits another value.

#### 5.2.3 `id`

A Requester SHALL set `id` to a non-empty opaque string that identifies this SMART request within the surrounding check-in interaction. A Requester SHOULD generate `id` values with enough entropy or contextual uniqueness to avoid accidental collision across active sessions visible to the same Requester or Verifier.

The `id` is used by the SMART response as `requestId` and by transport wrappers where they need to correlate the clinical request with presentation or kiosk state. The `id` is not a patient identifier, not a requester identifier, and not proof of freshness by itself.

#### 5.2.4 `purpose`

`purpose` is a short Holder-facing display or workflow label, such as `"Clinic check-in"`, `"Insurance verification"`, or `"Pre-visit intake"`.

A Requester MAY include `purpose`. When present, a Requester SHALL use `purpose` only to describe the workflow context for Holder review. A Requester SHALL NOT use `purpose` to carry requester identity, organization name, web origin, logo URL, contact URL, legal attestation, consent language, or trust metadata.

A Wallet/Responder MAY display `purpose` to the Holder. A Wallet/Responder SHALL NOT treat `purpose` as authenticated requester identity or as a transport trust signal.

#### 5.2.5 `fhirVersions[]`

`fhirVersions` lists FHIR release versions that the Requester can consume for raw FHIR JSON returned in response to this request. Examples include `"4.0.1"`, `"4.3.0"`, and `"5.0.0"`.

A Requester MAY include `fhirVersions`. When present, a Requester SHALL encode it as an array of one or more strings ordered by Requester preference. A Wallet/Responder SHOULD prefer earlier entries when it can produce otherwise equivalent raw FHIR JSON Artifacts.

`fhirVersions` applies to raw FHIR JSON response Artifacts such as `application/fhir+json`. It does not override FHIR version information that is intrinsic to a signed SMART Health Card or to another response format defined by a registered extension.

Open issue: the active code validates that `fhirVersions`, if present, is an array of strings, but does not currently reject an empty array. The eventual JSON Schema should decide whether to enforce non-empty arrays for this optional field.

#### 5.2.6 `items[]`

`items` is the ordered list of request items. A Requester SHALL include `items` as an array. A Requester SHOULD include at least one item; a zero-item request has no clinical content to fulfill and should be treated as a Requester construction error unless a future binding defines a discovery-only use.

A Wallet/Responder SHALL validate every item according to §5.3 before using the request for Holder review or response construction.

#### 5.2.7 Prohibited requester identity metadata

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited requester identity metadata includes, without limitation, clinic name fields, organization name fields, requester display-name fields, requester URL fields, logo fields, icon fields, brand-color fields, certificate references, verifier metadata, origin strings, reader identifiers, and legal identity assertions whose purpose is to identify or authenticate the Requester.

Requester and Verifier identity, origin, reader authentication, certificates, signed kiosk metadata, freshness, and trust policy belong to the presentation transport, trust-processing, or local policy layers. A Wallet/Responder SHALL NOT treat any field in the clinical request body as authenticated requester identity unless that field is defined by a future version or registered extension with an explicit trust model.

#### 5.2.8 Examples

Example: a single US Core Patient request.

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

Example: this section does not define kiosk wrapper fields. In the cross-device kiosk flow, §9 embeds the same object directly as the `smartRequest` member of the kiosk payload.

### 5.3 `SmartHealthCheckinRequestItem`

A request item describes one unit of requested clinical content or action for Holder review, Wallet processing, response fulfillment, and per-item status reporting.

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

A Requester SHALL include `id`, `title`, `content`, and `accept` for every item. A Requester MAY include `summary` and `required`.

#### 5.3.1 `id`

A Requester SHALL set every item `id` to a non-empty string unique within the enclosing SMART request. A Wallet/Responder SHALL reject a request with duplicate item ids.

A Requester SHOULD use item ids that are stable within the interaction, short enough for diagnostics, and safe for use as JSON string references in responses. A Requester SHOULD restrict newly defined item ids to ASCII letters, digits, period (`.`), underscore (`_`), and hyphen (`-`), beginning with a letter or digit. A Wallet/Responder MAY accept other non-empty Unicode string ids if it can preserve them exactly in response validation and display.

Item ids are scoped to one SMART request. They are not global identifiers and are not patient or requester identifiers.

#### 5.3.2 `title`

A Requester SHALL set `title` to a non-empty Holder-facing string naming the item. The title should be concise enough for Wallet display, for example `"Patient demographics"`, `"Insurance card"`, or `"Intake form"`.

A Wallet/Responder MAY display `title` to the Holder and SHOULD preserve the association between each displayed title and the underlying item id when collecting Holder decisions.

#### 5.3.3 `summary`

A Requester MAY set `summary` to a Holder-facing explanation of the requested content. A Requester SHALL use `summary` to describe the content or workflow need, not to assert requester identity or trust.

A Wallet/Responder MAY display `summary` to the Holder. A Wallet/Responder SHALL NOT treat `summary` as authenticated requester identity.

#### 5.3.4 `required`

`required` is an advisory indication that the Requester considers the item required for its workflow. If `required` is absent, its default value is `false`.

A Requester MAY set `required` to `true` or `false`. A Wallet/Responder SHALL treat `required` as advisory workflow context, not as a consent override. A Wallet/Responder MAY still allow the Holder to decline an item marked `required: true`, report the item as declined, unavailable, unsupported, partial, or error according to §6, or apply local policy.

A Verifier or Requester MAY use the returned per-item status to decide whether the downstream workflow can continue. That downstream decision does not change the Wallet/Responder's obligation to report per-item outcomes accurately.

#### 5.3.5 `accept[]`

A Requester SHALL set `accept` to a non-empty array of media type strings that it can process for this item. The array order is significant and expresses Requester preference, from most preferred to least preferred. Section 5.6 defines the core media types and ordering semantics.

A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact's `mediaType` is one of the media types in that item's `accept[]`, except where a registered media-type extension explicitly defines compatibility with an accepted type.

#### 5.3.6 `content`

A Requester SHALL set `content` to a content selector object. A content selector object SHALL include a string `kind` member. The `kind` value determines the remaining selector shape and semantics. Version 1.0 defines `fhir.resources` (§5.4.1) and `questionnaire` (§5.4.2), and allows registered extension selectors (§5.4.3).

A Wallet/Responder SHALL reject an item whose `content` is absent, not an object, or whose `kind` is unsupported unless the Wallet/Responder can process that selector under a registered extension it supports. A Wallet/Responder that supports the overall request but cannot fulfill a supported item's selector can return a per-item status under §6 rather than failing the entire presentation.

### 5.4 Content selectors

A content selector describes the clinical content or action requested for one item. Selectors identify acceptable response content; they do not by themselves require the Wallet to have that content, prove the content's provenance, or force Holder disclosure.

A Requester SHALL use the most specific standard selector that fits the requested content. A Requester SHOULD use FHIR-native canonicals, profile families, resource types, and Questionnaire references where applicable rather than private topic strings.

A Wallet/Responder SHALL evaluate selectors in combination with `accept[]`, Holder decisions, Wallet policy, available Holder data sources, and applicable transport/trust rules. Selector satisfaction is a clinical-content question; transport proof alone does not mean that an item was fulfilled.

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

A Requester SHALL set `kind` to `"fhir.resources"`. A Requester MAY include `profiles`, `profilesFrom`, and `resourceTypes` in any combination, subject to the rules below.

##### 5.4.1.1 `profiles[]` — exact `StructureDefinition` canonicals

`profiles` lists exact FHIR profile canonical URLs for acceptable resources. A Requester that includes `profiles` SHALL encode it as an array of one or more FHIR canonical strings identifying `StructureDefinition` profiles. A `profiles` value MAY include a `|version` suffix as defined in §5.5.

A Wallet/Responder MAY satisfy a `profiles[]` selector with a resource whose `meta.profile` or other trusted conformance evidence indicates conformance to one of the listed profiles, subject to `resourceTypes[]`, `accept[]`, Holder decision, and local policy. The precise clinical confidence needed to assert conformance is deployment- and Artifact-dependent and is not created solely by this request field.

##### 5.4.1.2 `profilesFrom[]` — profile-family canonicals

`profilesFrom` lists canonical URLs identifying FHIR publications, implementation guides, profile collections, or other profile families whose resource profiles are acceptable.

A Requester that includes `profilesFrom` SHALL encode it as a non-empty array of canonical profile-family URL strings. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, implementation-guide object, npm package name, registry alias, or URN unless a future registered extension explicitly defines such a value. A Wallet/Responder SHALL reject a `profilesFrom` value that is not a non-empty array of strings.

A `profilesFrom` value identifies a family from which acceptable resource profiles can be drawn. It does not require the SMART request to enumerate every profile in that family.

##### 5.4.1.3 `resourceTypes[]` — official FHIR resource type names

`resourceTypes` narrows a `fhir.resources` selector by official FHIR `resourceType` names, such as `"Patient"`, `"Coverage"`, `"Condition"`, `"MedicationRequest"`, or `"Observation"`.

A Requester that includes `resourceTypes` SHALL encode it as an array of one or more strings. A Requester SHALL use official FHIR resource type names appropriate to the FHIR versions it can consume. A Requester SHALL NOT use local topic names such as `"care-plans"`, `"insurance"`, or `"labs"` in `resourceTypes[]` unless those strings are official FHIR resource type names.

When `resourceTypes[]` appears with `profiles[]` and/or `profilesFrom[]`, a Wallet/Responder SHALL treat `resourceTypes[]` as an additional resource-type constraint on the resources that can satisfy the item. In other words, a resource selected through `profiles[]` or `profilesFrom[]` satisfies the item only if its FHIR `resourceType` is also present in `resourceTypes[]`. This rule defines the resource-type interaction separately from profile-selector additivity.

When `resourceTypes[]` appears without `profiles[]` or `profilesFrom[]`, it requests patient-specific FHIR resources of those resource types, regardless of profile conformance, subject to the rest of the item definition.

##### 5.4.1.4 Additivity rule when both `profiles` and `profilesFrom` are present

`profiles[]` and `profilesFrom[]` are additive profile selectors. When both fields are present, a resource can satisfy the profile portion of the selector by matching any exact profile in `profiles[]` or by matching any profile from any profile family identified in `profilesFrom[]`.

A Requester SHALL NOT interpret `profiles[]` as narrowing `profilesFrom[]`. A Wallet/Responder SHALL NOT require a resource to match both an exact profile in `profiles[]` and a profile family in `profilesFrom[]` unless another explicit selector field or extension requires that additional constraint. Exact `profiles[]` entries can highlight records of interest; they do not limit the broader `profilesFrom[]` request.

##### 5.4.1.5 No-selector default

If `kind` is `"fhir.resources"` and `profiles`, `profilesFrom`, and `resourceTypes` are all omitted, the item requests any patient-specific FHIR resources that the Wallet/Responder can offer, the Holder chooses to share, and the Requester can consume through the item's `accept[]` media types.

A Requester SHOULD avoid the no-selector default unless the workflow truly accepts broad patient-specific FHIR content. A Wallet/Responder MAY satisfy a no-selector request with any patient-specific FHIR resources consistent with Holder consent, Wallet policy, `fhirVersions[]`, and `accept[]`; it is not required to disclose all available resources.

##### 5.4.1.6 Examples

Example: exact CARIN Coverage profile.

```json
{
  "kind": "fhir.resources",
  "profiles": [
    "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
  ]
}
```

Example: US Core profile family, optionally narrowed to selected resource types.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "resourceTypes": ["Condition", "MedicationRequest", "Observation"]
}
```

Example: additive exact profiles plus a profile family.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
  ]
}
```

The last example accepts resources matching either listed exact profile or profiles from the US Core family. The listed exact profiles do not narrow the US Core family.

#### 5.4.2 `questionnaire`

A `questionnaire` selector requests completion of a FHIR Questionnaire and expects a response format capable of carrying the resulting FHIR `QuestionnaireResponse`, commonly `application/fhir+json`.

```ts
interface QuestionnaireContentSelector {
  kind: "questionnaire";
  questionnaire: string | Questionnaire | {
    canonical?: string;
    resource?: Questionnaire;
  };
}
```

A Requester SHALL set `kind` to `"questionnaire"` and SHALL include `questionnaire`.

##### 5.4.2.1 By canonical

A Requester MAY express `questionnaire` as a non-empty FHIR canonical string. The canonical MAY include a `|version` suffix as defined in §5.5.

A Wallet/Responder that supports canonical Questionnaire resolution MAY fetch, locate, or otherwise resolve the Questionnaire according to Wallet policy and the surrounding trust model. A Wallet/Responder that cannot resolve or use the canonical can report the item as unavailable, unsupported, or error according to §6.

Example:

```json
{
  "kind": "questionnaire",
  "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake"
}
```

##### 5.4.2.2 Inline `Questionnaire`

A Requester MAY express `questionnaire` as an inline FHIR `Questionnaire` resource object. The inline resource SHALL have `resourceType` equal to `"Questionnaire"`.

A Wallet/Responder MAY render or process an inline Questionnaire without fetching it from a remote endpoint, subject to Wallet policy, safety checks, language support, and Questionnaire feature support.

Example:

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

##### 5.4.2.3 Combined canonical plus resource

A Requester MAY express `questionnaire` as an object containing `canonical`, `resource`, or both. If the object form is used, a Requester SHALL include at least one of `canonical` or `resource`. If `canonical` is present, it SHALL be a non-empty FHIR canonical string. If `resource` is present, it SHALL be a FHIR `Questionnaire` resource object.

The combined form lets the Requester identify the Questionnaire canonically while also providing an inline body for Wallet rendering.

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

##### 5.4.2.4 Wallet behavior when both forms supplied disagree

When both a canonical and an inline `resource` are supplied, a Requester SHOULD ensure that the canonical identifies the same Questionnaire as the inline resource. At minimum, the canonical URL before any `|version` suffix should match the inline `resource.url` when `resource.url` is present, and the suffix should match `resource.version` when both are present.

A Wallet/Responder SHALL NOT silently combine contradictory Questionnaire identities into a new Questionnaire. If the supplied canonical and inline resource disagree in a way the Wallet/Responder can detect, the Wallet/Responder SHALL either reject the item as malformed during request processing or report the item as error/unsupported according to §6. A Wallet/Responder MAY prefer the inline resource for rendering when it is consistent with the canonical.

##### 5.4.2.5 Example: inline migraine intake

Example:

```json
{
  "id": "migraine-intake",
  "title": "Migraine check-in",
  "summary": "Brief intake questions before today's visit.",
  "content": {
    "kind": "questionnaire",
    "questionnaire": {
      "resourceType": "Questionnaire",
      "title": "Migraine Check-in",
      "status": "active",
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
        }
      ]
    }
  },
  "accept": ["application/fhir+json"]
}
```

#### 5.4.3 Extension selectors and registration rules

Version 1.0 defines selector kinds `fhir.resources` and `questionnaire`. Additional selector kinds are extension selectors.

An extension registrant SHALL define a globally unique `kind` string for each extension selector. The `kind` string SHOULD be a URI, URL, reverse-DNS name, or other collision-resistant identifier controlled by the registrant. An extension registrant SHALL define the selector's JSON shape, required and optional fields, matching semantics, interaction with `accept[]`, error/status behavior when unsupported, security and privacy considerations, and any FHIR canonical `|version` handling.

A Requester MAY include an extension selector only when it has reason to believe the Wallet/Responder supports that extension or when the Requester can tolerate an unsupported per-item outcome. A Wallet/Responder that does not support an extension selector SHALL NOT guess at its semantics. It SHALL reject the request item as unsupported or report the item as unsupported according to §6, depending on whether the surrounding flow supports per-item error reporting at that processing stage.

Extension selectors SHALL NOT redefine the semantics of `type`, `version`, `id`, `purpose`, `fhirVersions[]`, `items[]`, item `id`, item `required`, or core selector kinds. An extension selector SHALL NOT introduce requester identity metadata into the SMART request body unless a future version of this specification defines an explicit trust model for doing so.

Open issue: §13 should define the registry template and designated-expert process for selector kinds. Until that registry is finalized, extension selector names should be treated as provisional.

### 5.5 Canonical `|version` handling decision matrix

FHIR canonicals can append a version suffix using `canonical|version`. The suffix is part of some semantic claims, but it is not a literal HTTP URL path or query string. Implementations need consistent handling so that versioned canonicals do not break lookup while still preserving exact version claims where they matter.

A Requester MAY include `|version` suffixes in `profiles[]` values and Questionnaire canonicals. A Requester SHOULD NOT include `|version` suffixes in `profilesFrom[]` unless the Requester intends to identify a versioned profile family and the Wallet/Responder is expected to understand that convention.

The following table is normative for the named operation and conformance target.

| Operation | Conformance target | Handling of `|version` | Requirement |
| --- | --- | --- | --- |
| Parsing a request field that permits FHIR canonicals | Wallet/Responder | Preserve exact string | A Wallet/Responder SHALL preserve the original canonical string for diagnostics, response construction where relevant, and policy decisions. |
| HTTP fetch or URL dereference of a canonical | Wallet/Responder | Strip suffix before fetch | A Wallet/Responder SHALL remove the `|version` suffix before treating a canonical as a network URL, unless a FHIR-aware resolver explicitly accepts versioned canonical syntax out of band. |
| Matching an exact profile in `profiles[]` | Wallet/Responder | Compare consistently | A Wallet/Responder SHALL compare requested and candidate profile canonicals at a consistent level: either exact including suffix when exact version conformance is being asserted, or base canonical after suffix removal when only family/profile identity is being routed. It SHALL NOT strip the suffix on only one side of an exact-version conformance check. |
| Membership/routing for `profilesFrom[]` | Wallet/Responder | Strip for family lookup | A Wallet/Responder SHOULD strip any `|version` suffix before profile-family lookup or routing, unless the profile-family definition explicitly defines version-specific membership. |
| Wallet content-kind classification | Wallet/Responder | Strip for routing | A Wallet/Responder SHOULD strip `|version` before classifying a canonical as coverage, patient, questionnaire, clinical history, or another internal routing category. |
| De-duplication/grouping for display | Wallet/Responder | Strip for grouping, preserve for detail | A Wallet/Responder MAY group canonicals that differ only by `|version` for display, but SHALL preserve exact requested strings where exact version matters to Holder review or response construction. |
| `QuestionnaireResponse.questionnaire` in a returned raw FHIR response | Wallet/Responder | Preserve version when known | If a Wallet/Responder answers a versioned Questionnaire canonical, it SHOULD preserve the `|version` value in `QuestionnaireResponse.questionnaire` when constructing raw FHIR JSON. |
| Returned resource `meta.profile` | Wallet/Responder | Preserve version claims | A Wallet/Responder SHALL NOT remove `|version` suffixes from returned `meta.profile` values merely because the request used an unversioned selector. |
| Test fixtures, logs, and debug bundles | Requester, Wallet/Responder, Verifier | Preserve exact wire value | Implementations that create fixtures or protocol debug bundles SHOULD preserve the canonical strings exactly as carried on the wire, subject to privacy minimization. |

Open issue: the eventual FHIR mapping appendix should align this matrix with FHIR R4/R4B/R5 canonical resolution details and with exact conformance validation language for `meta.profile`.

### 5.6 Accepted media types and ordering semantics

Each request item has its own `accept[]` list. `accept[]` declares the response Artifact media types the Requester can consume for that item and orders them by Requester preference.

A Requester SHALL include a non-empty `accept[]` array on every request item. A Requester SHALL include only media type strings for formats it can actually process for that item. A Wallet/Responder SHALL treat the first entry as the Requester's most preferred supported media type and later entries as lower-preference alternatives.

A Wallet/Responder SHOULD choose the earliest acceptable media type it can produce for an item, considering Holder decision, available Holder data sources, FHIR version support, local policy, and whether the resulting Artifact can accurately fulfill the item. A Wallet/Responder MAY choose a lower-preference accepted media type when the higher-preference type is unavailable, stale, incomplete, unsupported, unsafe, or declined by the Holder.

A Wallet/Responder SHALL NOT infer that a media type accepted for one item is accepted for another item. If one Artifact fulfills multiple items, its `mediaType` SHALL be acceptable for every item it claims to fulfill, unless a registered extension defines an explicit compatibility rule.

#### 5.6.1 `application/fhir+json`

`application/fhir+json` means raw FHIR JSON. A Requester MAY include `application/fhir+json` in `accept[]` when it can process raw FHIR JSON for the item.

A Wallet/Responder that returns an `application/fhir+json` Artifact SHALL construct the Artifact according to §6, including the response-model requirement to declare the Artifact's `fhirVersion`. The request's `fhirVersions[]` guides which FHIR versions are preferred or acceptable for raw FHIR JSON.

#### 5.6.2 `application/smart-health-card`

`application/smart-health-card` means a SMART Health Card response Artifact whose value contains the SMART Health Card payload shape defined in §6, including `verifiableCredential[]` with one or more SMART Health Card JWS strings.

A Requester MAY include `application/smart-health-card` in `accept[]` when it can process SMART Health Cards for the item. The request's `fhirVersions[]` does not override FHIR version declarations inside the signed SMART Health Card credential payload.

#### 5.6.3 Extension media types and registration rules

A Requester MAY include other media type strings in `accept[]`. An extension registrant defining a media type for SMART Health Check-in SHALL document the media type string, Artifact value shape, whether `fhirVersion` is required or prohibited, how the format fulfills request items, validation rules, security and privacy considerations, and any compatibility with core media types.

A Wallet/Responder SHALL NOT return an extension media type for an item unless that exact media type appears in the item's `accept[]` or a registered compatibility rule says that the returned media type satisfies an accepted type.

Open issue: §13 should define whether SMART Health Check-in maintains its own media-type usage registry or only references IANA media type registrations plus a profile-specific extension registry.

#### 5.6.4 `accept` ordering semantics

The `accept[]` order expresses Requester preference, not a Wallet/Responder obligation to return the first type at all costs. Earlier entries are more preferred than later entries. There is no separate priority field.

A Requester SHOULD order `accept[]` from most preferred to least preferred based on downstream processing capability and clinical workflow value. A Wallet/Responder SHOULD preserve the Requester's ordering when presenting technical choices or diagnostics, but MAY simplify Holder display to clinical content choices rather than media-type strings.

Example: a Requester that prefers a signed SMART Health Card when available but can fall back to raw FHIR JSON can write:

```json
"accept": [
  "application/smart-health-card",
  "application/fhir+json"
]
```

This example does not require a Wallet/Responder to synthesize a SMART Health Card if it only has raw FHIR JSON available, nor does it require disclosure when the Holder declines.

## Organizer notes

Strengths:

- Preserves the transport-neutral clinical request model and explicitly states that same-device, kiosk `smartRequest` embedding, and future bindings share the same request semantics.
- Keeps `purpose`, `title`, and `summary` Holder-facing while prohibiting requester identity metadata from the clinical request body.
- Makes `profilesFrom[]` an array of profile-family canonical URLs and makes `profiles[]` plus `profilesFrom[]` additive, while separately defining `resourceTypes[]` as a narrowing constraint.
- Defines a concrete Questionnaire disagreement rule rather than leaving Wallet behavior ambiguous.
- Includes a conformance-targeted `|version` decision matrix suitable for Appendix A extraction.

Caveats and open issues:

- The active implementation allows `fhirVersions: []`; this draft recommends non-empty if present but marks schema enforcement as an open issue.
- The item-id charset is a SHOULD, not a SHALL, because active code currently validates only non-empty uniqueness and exact preservation.
- Extension selector and media-type registration text depends on §13 registry design.
- Exact response Artifact details, statuses, and validation belong to §6; this draft references them only as needed for `accept[]` and fulfillment compatibility.

Downstream dependencies:

- §6 must define response `requestId`, Artifact `mediaType`, `fhirVersion` requirements, `fulfills[]`, and per-item status values consistently with this request model.
- Appendix B should encode the fixed top-level fields, item uniqueness where possible, `profilesFrom[]` array shape, non-empty `accept[]`, and selector unions.
- Appendix H should align FHIR canonical handling, QuestionnaireResponse construction, `meta.profile` preservation, and FHIR version handling with §5.5.
- §9 should embed this object directly as `smartRequest` without adding clinical wrapper semantics.
