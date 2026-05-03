# SMART Health Check-in — design notes

Working notes on protocol-shape decisions that haven't been folded into
the canonical text yet. Each note states the problem, the typing
principle it would violate or restore, and the proposed fix with
locations to update when adopted.

The shared typing principle behind these notes:

> A given JSON key always points to one specific shape. A discriminated
> union of object shapes is acceptable when every variant is an object
> and the variants can be told apart by either a clear discriminator
> key value or by the presence/absence of distinct keys.

Primitive ↔ object polymorphism on the same key is not acceptable
(strings have no keys to discriminate by). Open-ended `mediaType: string`
catch-alls that hide multiple sibling carrier keys are not acceptable.

---

## 1. `questionnaire` content selector — collapse to a flat selector shape

### Background

The clinical request model (T2.A) defines a `questionnaire` content
selector for items whose answer is a FHIR `QuestionnaireResponse`.

The current canonical text and active TypeScript validator allow three
structurally different JSON values under the inner `questionnaire` key:

1. A bare canonical **string**, optionally with `|version`:

   ```json
   { "kind": "questionnaire", "questionnaire": "https://example.org/Questionnaire/x" }
   ```

2. A bare inline FHIR **`Questionnaire` resource object**:

   ```json
   {
     "kind": "questionnaire",
     "questionnaire": {
       "resourceType": "Questionnaire",
       "url": "https://example.org/Questionnaire/x",
       "status": "active",
       "item": []
     }
   }
   ```

3. A **wrapper object** with optional `canonical` and/or `resource`:

   ```json
   {
     "kind": "questionnaire",
     "questionnaire": {
       "canonical": "https://example.org/Questionnaire/x|1.2.3",
       "resource": { "resourceType": "Questionnaire", "...": "..." }
     }
   }
   ```

Sources:

- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:512–556` (prose),
  `:332` and `:356–397` (TS types), `:1076–1078` (normative rules).
- `spec-work/t2a-clinical-request-model/canonical.md:375–447`.
- `spec-work/t2a-clinical-request-model/attempt-05.md:362–429`.
- Validator: `rp-web/src/sdk/core.ts:150–166` (note `:156` literally
  branches on `questionnaire.resourceType === "Questionnaire"`).

### Problem

Two violations of the typing principle on the inner `questionnaire`
key:

1. **Primitive ↔ object polymorphism.** Form 1 is a string; forms 2
   and 3 are objects. Parsers must first branch on
   `typeof value === "string"` before they can do anything else with
   the field. A string has no keys to discriminate by.

2. **Redundant wrapping.** The selector already has a `kind` and the
   sibling `fhir.resources` selector puts its parameters
   (`profiles[]`, `profilesFrom[]`, `resourceTypes[]`) directly on the
   selector. The questionnaire selector instead nests its parameters
   one level deep under `questionnaire`, then has to admit three
   different shapes for that inner value, then has to disambiguate the
   two object shapes by sniffing for a `resourceType` member. None of
   that is necessary.

### Proposed fix

Hoist the questionnaire parameters onto the selector itself, in
parallel with how `fhir.resources` is shaped. The inner `questionnaire`
key goes away entirely.

```ts
export interface QuestionnaireContentSelector {
  kind: "questionnaire";

  /** FHIR canonical URL identifying the Questionnaire. May include `|version` per §5.5. */
  canonical?: FhirCanonical;

  /** Inline FHIR Questionnaire resource. */
  resource?: fhir_r4.Questionnaire;
}
```

Wire shape:

```json
// canonical only
{ "kind": "questionnaire", "canonical": "https://example.org/Questionnaire/x" }

// inline only
{
  "kind": "questionnaire",
  "resource": {
    "resourceType": "Questionnaire",
    "url": "https://example.org/Questionnaire/x",
    "status": "active",
    "item": [
      { "linkId": "headache", "text": "Headache today?", "type": "boolean" }
    ]
  }
}

// both
{
  "kind": "questionnaire",
  "canonical": "https://example.org/Questionnaire/x|1.2.3",
  "resource": { "resourceType": "Questionnaire", "...": "..." }
}
```

Constraints:

- A Requester SHALL include at least one of `canonical` or `resource`.
- If `canonical` is present, it SHALL be a non-empty FHIR canonical
  string (`|version` allowed per §5.5).
- If `resource` is present, it SHALL be a JSON object whose
  `resourceType` is `"Questionnaire"`.
- A Wallet/Responder SHALL reject a `questionnaire` selector that has
  neither `canonical` nor `resource`, that has a `canonical` value
  which is not a non-empty string, or that has a `resource` value
  which is not a Questionnaire resource object.

This satisfies the typing principle:

- The selector is always an object discriminated by `kind`.
- `canonical` and `resource` each have one shape, and either MAY be
  absent.
- No primitive-vs-object split, no presence-of-`resourceType`
  sniffing, no redundant nesting.

The disagreement-handling rules currently drafted in §5.4.2.4 carry
over unchanged, lifted from `questionnaire.canonical` /
`questionnaire.resource` to the selector's own `canonical` /
`resource`.

### Migration

Removed shapes (no longer accepted on the wire):

- Bare canonical string under `questionnaire`.
- Bare inline `Questionnaire` resource under `questionnaire`.
- Wrapper-object form `questionnaire: { canonical?, resource? }`.

Senders update from:

```json
{ "kind": "questionnaire", "questionnaire": "https://.../Q/x" }
```

to:

```json
{ "kind": "questionnaire", "canonical": "https://.../Q/x" }
```

and from:

```json
{ "kind": "questionnaire", "questionnaire": { "resourceType": "Questionnaire", "...": "..." } }
```

to:

```json
{ "kind": "questionnaire", "resource": { "resourceType": "Questionnaire", "...": "..." } }
```

Receivers updating to the tightened schema SHOULD reject (rather than
auto-coerce) the legacy nested shapes during the transition so
round-tripping bugs surface immediately.

### Locations to update when adopted

Spec / prose:

- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`
  - TS types `:329–397` (drop `QuestionnaireRef`,
    `QuestionnaireCanonicalAndResource`,
    `QuestionnaireCanonicalObject`, `QuestionnaireResourceObject`;
    rewrite `QuestionnaireContentSelector` with `canonical?` and
    `resource?` directly).
  - §4 `questionnaire` prose `:512–556` (replace examples).
  - §9 request rules `:1076–1078` (rule 11/12 collapse into a single
    rule on the selector).
- `spec-work/t2a-clinical-request-model/canonical.md:369–470` and the
  embedded example at `:459–470`.
- `spec-work/t2a-clinical-request-model/attempt-05.md:362–464` and
  the top-level example at `:165–186`.

Validator / SDK:

- `rp-web/src/sdk/core.ts`
  - `SmartCheckinContentSelector.questionnaire` type union `:18–27` →
    single object interface with `canonical?` / `resource?` directly.
  - `validateContentSelector` `:150–166`: drop the `typeof string`
    branch and the `resourceType === "Questionnaire"` short-circuit;
    instead validate `canonical?` and `resource?` directly on the
    selector and require at least one of them.

Wallet / Android:

- `wallet-android/smart-checkin-core/src/main/java/.../SmartRequest.kt`
  and any other JSON adapter that parses `questionnaire`.
- `wallet-android/app/src/test/java/.../SmartRequestAdapterTest.kt`
  and `wallet-android/app/src/test/resources/test-vectors.json`.

Tests / fixtures / demos:

- `rp-web/src/protocol/index.test.ts` — add tests for the new selector
  shape and rejection of every legacy shape.
- `rp-web/src/store.ts` — confirm any inline Questionnaire demo preset
  uses the new shape.

---

## 2. Remove `GenericArtifact`; declare the artifact-type list extensible

### Background

The clinical response model (T2.B) defines a `SmartHealthCheckinArtifact`
union with three branches:

```ts
export type SmartHealthCheckinArtifact =
  | SmartHealthCardArtifact   // mediaType: "application/smart-health-card", value: { verifiableCredential: string[] }
  | FhirJsonArtifact          // mediaType: "application/fhir+json",         fhirVersion, value: fhir_r4.Resource
  | GenericArtifact;          // mediaType: string, plus one of value/url/data
```

`GenericArtifact` is the catch-all extension hook. It is itself a
sub-union of three shapes distinguished only by which payload-locator
key happens to be present:

```ts
export type GenericArtifact =
  | GenericValueArtifact   // { value: unknown }
  | GenericUrlArtifact     // { url: string }
  | GenericDataArtifact;   // { data: string }

export interface GenericArtifactBase extends SmartHealthCheckinArtifactBase {
  mediaType: string;       // not pinned to any specific value
  filename?: string;
  fhirVersion?: FhirVersion;
}
```

Sources:

- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:656–767` (TS types).
- Normative rule 21: `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:1122`.
- Active validator: `rp-web/src/sdk/core.ts:69–75` and `:248–250`.
- T2.B prose: `spec-work/t2b-clinical-response-model/attempt-04.md:76,
  93–94, 98, 153–159, 374, 382`.

### Problem

`GenericArtifact` is doing two unrelated jobs at once and not doing
either of them well.

1. **Shape-by-presence at the protocol level.** All three sub-types
   share `mediaType: string`, so `mediaType` discriminates nothing
   among them. The artifact's content shape is determined purely by
   which of `value` / `url` / `data` is present. Worse, normative rule
   21 explicitly permits more than one of those keys to coexist with
   media-type-defined merge semantics — so even the presence
   discriminator is not reliable.

2. **Wrong-layer extension hook.** `GenericArtifact` bakes the choice
   of "inline JSON / external URL / inline string blob" into the
   protocol itself. Any future extension media type is forced through
   one of those three lanes regardless of fit, and cannot define a
   payload that needs both a URL and an inline manifest, or a
   structured `{encoding, data}` shape, without abusing rule 21's
   multi-key escape hatch. The protocol has no way to add a new
   branded artifact variant with its own typed shape today.

3. **Nothing uses it.** No producer or consumer of generic artifacts
   exists in the active code. SHC and FHIR JSON artifacts cover every
   emitted artifact in the rp-web SDK, the kiosk flow, the Android
   wallet, and the test fixtures. The generic carrier is paying
   ongoing complexity cost (validator branches, three sub-types in the
   public TypeScript surface, the rule 21 multi-key clause) for zero
   current utility.

### Proposed change

1. **Remove `GenericArtifact`** (and its three sub-interfaces) from
   the protocol. The v1 core artifact union becomes a closed
   discriminated union over `mediaType`:

   ```ts
   export type SmartHealthCheckinArtifact =
     | SmartHealthCardArtifact
     | FhirJsonArtifact;
   ```

2. **Declare the artifact-type list extensible.** Make it explicit in
   §6.3 and the registry rules (§13) that the set of artifact variants
   in the union is open for extension: future revisions or registered
   extensions MAY define **additional artifact types** for use. Each
   newly defined artifact type SHALL:

   - pin a specific `mediaType` literal (or a clearly-bounded media
     type pattern);
   - define its own typed fields, including the carrier shape (whether
     a single `value`, a structured payload, or something else);
   - be added to the artifact union as a new branded variant rather
     than going through a generic catch-all.

This satisfies the typing principle:

- Every artifact is an object.
- Every artifact has a `mediaType` discriminator pinned to a specific
  literal value.
- Every artifact's payload-bearing keys are pinned by that literal.
- New artifact types are added by extension under the same discipline.

### Sketch — how a future extension is added

```ts
export interface ExampleClinicalDocumentArtifact extends SmartHealthCheckinArtifactBase {
  mediaType: "application/example-clinical-document+json";
  document: { url: string; integrity?: string };
}

export type SmartHealthCheckinArtifact =
  | SmartHealthCardArtifact
  | FhirJsonArtifact
  | ExampleClinicalDocumentArtifact;
```

The "is this delivered inline, by URL, or as base64?" question becomes
a property of the extension media type's own definition, not a
protocol-level shape choice imposed on every extension.

### Wire impact

Effectively zero today. No producer in the repo emits a
`GenericArtifact` shape. Receivers that today happily ignore
unrecognized artifact types continue to work.

### Migration

For the rare fixture, demo, or integration that may have relied on a
generic-shaped artifact:

- Inline-JSON extension artifacts (the `value` carrier) — re-expressed
  as a registered extension artifact with its own pinned `mediaType`
  literal and `value` shape.
- URL-pointer extension artifacts (the `url` carrier) — move into a
  registered extension media type whose typed fields include the
  pointer. The protocol no longer has a freestanding `url` field on
  artifacts.
- Inline-string-blob extension artifacts (the `data` carrier) —
  likewise move into a registered extension whose typed fields
  include the encoded payload and an explicit encoding identifier.

Rule 21 (multi-key coexistence with media-type-defined merge) goes
away entirely; merge semantics, when needed, live inside the
extension's own typed fields.

### Locations to update when adopted

Spec / prose:

- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`
  - §5 Response TypeScript `:656–659` (drop `| GenericArtifact`).
  - §5 `:738–767` (remove `GenericArtifact`, `GenericArtifactBase`,
    `GenericValueArtifact`, `GenericUrlArtifact`, `GenericDataArtifact`).
  - §9 response rule 21 `:1122` (delete).
  - Add an "extensibility" subsection to §6 stating that the artifact
    union is open for extension by registered additional artifact
    types.
- `spec-work/t2b-clinical-response-model/attempt-04.md:76, 93–94, 98,
  153–159, 374, 382` — replace with: artifact union is closed for v1
  core; extensions add new branded artifact variants with pinned
  `mediaType` and pinned field shapes; §13 defines registry mechanics.

Validator / SDK:

- `rp-web/src/sdk/core.ts`
  - `SmartArtifact` union `:59–75` (drop the catch-all branch).
  - `validateArtifact` `:232–250` (remove the `value` / `url` / `data`
    fallback branch; reject artifacts whose `mediaType` is not a
    recognized core or registered-extension value).

Tests / fixtures / tooling:

- `rp-web/src/protocol/index.test.ts` — drop or convert any test that
  exercises generic-shaped artifacts; add a rejection test for
  unrecognized `mediaType`.
- `site/wire-protocol-inspector.html:1850` references `artifact.data`
  in one display branch; that path can simplify to the two core
  artifact shapes. Archived explainer HTMLs reference `.data` /
  `.value` similarly but are static archives and do not need updates.

### Out of scope

- Whether and how to define a registry document (§13) for extension
  artifact types — this note only commits the protocol to admit such
  extensions, not to specify the registry mechanics.

---

## 3. Canonical `|version` handling — resolve, don't strip-and-hope

### Background

FHIR canonical references can carry a version suffix:
`http://example.org/Questionnaire/intake|1.2.3`. The protocol uses
canonicals in `profiles[]`, `profilesFrom[]`, the questionnaire
selector, `meta.profile`, and `QuestionnaireResponse.questionnaire`.

The current decision matrix (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:455–474`,
`spec-work/t2a-clinical-request-model/canonical.md:506–523`,
`spec-work/t2a-clinical-request-model/attempt-05.md:482–495`) tells
implementations to **strip `|version` before HTTP fetch**, with the
rationale "a versioned canonical is an identifier, not a literal URL."

The active code follows that guidance literally
(`wallet-android/app/src/main/java/.../SmartQuestionnaireFetcher.kt:65–69, :71–89`):

```kotlin
internal fun canonicalUrlForFetch(canonical: String): String {
    val rawUrl = canonical.substringBefore('|')
    require(rawUrl.isNotBlank()) { "Questionnaire canonical URL is blank" }
    return rawUrl
}
```

It then issues a plain `GET` against the bare URL, validates only that
the response has `resourceType: "Questionnaire"`, and never checks
whether the returned resource's `version` matches what was requested.
A test (`SmartRequestAdapterTest.kt:60–65`) pins this behavior.

### Problem

The "strip and fetch" rule conflates a **routing/grouping rule** with
a **resolution rule**, and gets the resolution rule wrong:

1. **Stripping discards a semantic claim at the moment it matters
   most.** A Requester who asks for
   `…/StructureDefinition/us-core-patient|8.0.1` is asking for that
   exact profile version. Resolving the canonical by stripping the
   suffix and dereferencing the base URL turns the fetch into a
   guess: whatever the publisher happens to be serving at that URL
   today is what the Wallet/Verifier ends up using. There is no
   guarantee it is version 8.0.1.

2. **It's not how FHIR canonicals are supposed to be resolved.** FHIR
   canonical references are resolved through canonical-reference
   semantics: against a FHIR server, that means
   `GET [base]/{ResourceType}?url={base-canonical}&version={version}`.
   Against a configured terminology/conformance resolver or package
   index, the resolver consumes `(url, version)` as a structured pair
   and returns the matching artifact. A bare HTTP GET on the
   suffix-stripped URL is at best a fallback for unversioned
   canonicals served as plain documents, and even then the recipient
   needs to verify the returned resource's `(url, version)` against
   the request.

3. **No verification after fetch.** The active code never checks that
   the resource it received matches the canonical the Requester asked
   for. Combined with (1), this means a request for `intake|1.2.3`
   silently accepts `intake|5.0.0` if the publisher rolled forward.

4. **Profile-matching guidance is undermined.** §5.5 already says that
   when `profiles[]` contains a versioned canonical, exact-version
   conformance applies. But if the recipient resolves the profile
   StructureDefinition by stripping the suffix and fetching the base
   URL, it has no version-stamped artifact in hand to compare against
   the resource's `meta.profile`.

### Proposed change

Replace the "strip `|version` before HTTP fetch" line with
canonical-reference resolution semantics, and require post-resolution
verification.

#### Parsing

A canonical reference SHALL be parsed structurally into:

- `url`: the substring before the first `|` (or the whole string if
  no `|` is present); MUST be a non-empty string.
- `version`: the substring after the first `|`, when present; MAY
  itself contain further `|`-separated segments per FHIR (treated as
  opaque).

Implementations SHALL preserve the original wire string for echoing,
logging, response construction, and `meta.profile` / `QuestionnaireResponse.questionnaire`
emission, regardless of how they internally resolve it.

#### Resolution

A Wallet/Responder or Verifier resolving a canonical reference SHALL
use one of the following mechanisms, **in this order of preference**,
and SHALL NOT silently fall back from a more reliable mechanism to a
less reliable one without recording that fallback:

1. **Configured canonical resolver / package cache.** Implementations
   that maintain a local FHIR package cache, terminology service, or
   IG resolver SHALL look the canonical up by `(url, version)` (or by
   `url` alone when version is absent) and use the matching artifact.

2. **FHIR search against a configured FHIR endpoint.** When resolving
   against a FHIR server, the implementation SHALL use canonical
   search semantics:

   - With version: `GET [base]/{ResourceType}?url={url}&version={version}`
   - Without version: `GET [base]/{ResourceType}?url={url}` (the
     server returns its preferred version per its own policy).

   The implementation SHALL select a single resource from the search
   bundle whose `(url, version)` exactly matches the request, and
   SHALL fail resolution if no such resource is present.

3. **Direct HTTP dereference of the bare URL.** Permitted only when
   the canonical has **no** `|version` suffix, the recipient is
   willing to accept whatever version the publisher serves, AND the
   recipient validates that the returned resource is the expected
   resource type. A direct dereference SHALL NOT be used to satisfy
   a versioned canonical.

#### Post-resolution verification

After resolving any canonical, the implementation SHALL verify that
the resolved resource has:

- `resourceType` matching the expected type (e.g., `Questionnaire`,
  `StructureDefinition`).
- `url` equal to the requested `url`.
- `version` equal to the requested `version` when the request was
  versioned.

If any of these checks fail, the implementation SHALL treat the item
as `unsupported` or `error` per §6 rather than proceeding with a
mismatched resource.

#### Profile matching

The §5.5 rule that `profiles[]` versioned values require exact-version
conformance is restated and tightened:

- A request value `profiles[i] = base|version`: a Wallet/Responder
  SHALL NOT report `fulfilled` for a resource whose `meta.profile`
  does not include the same `base|version` (or for which the
  Wallet/Responder lacks evidence that the resource conforms to that
  exact profile version).
- A request value `profiles[i] = base` (no version): a Wallet/Responder
  MAY match any supported version.

The "strip for routing/grouping/family-membership" rules in the
existing decision matrix remain unchanged — those are local
classification operations that do not consume version semantics.

### Updated decision matrix (replaces the current §5.5 table)

| Operation | Handling of `|version` |
| --- | --- |
| Parse, carry, sign, encrypt, compare wire bytes, log, fixture | Preserve the canonical string exactly as it appeared. |
| Resolve a canonical to a FHIR resource | Use a configured canonical resolver, or FHIR search (`?url=…&version=…`); direct HTTP dereference is permitted only for unversioned canonicals. After resolution, verify `(url, version)` on the returned resource. |
| Profile-family membership for `profilesFrom[]` | Strip `|version` for family lookup unless a future profile-family registry defines version-specific membership. |
| Wallet routing or content-kind classification | Strip `|version` for routing decisions. |
| De-duplication or grouping for Holder display | MAY group canonicals that differ only by `|version`; SHALL preserve the exact requested string in any echoed/displayed/recorded form. |
| Profile matching: request value has `|version` | Require exact-version evidence (`meta.profile` includes the same versioned canonical, or equivalent local conformance evidence). |
| Profile matching: request value has no `|version` | MAY match any supported version. |
| `QuestionnaireResponse.questionnaire` | Preserve `|version` when known. |
| Returned resource `meta.profile` | Preserve `|version` exactly as the source asserted it. |
| Verifier-side exact conformance check | Compare versioned-to-versioned when an exact version was requested; unversioned-to-base when not. |

### Wire impact

Receivers that today emit the stripped-fetch behavior will need to
either build a canonical resolver or restrict themselves to
unversioned canonicals. The Active rp-web SDK does not fetch
canonicals at all and is unaffected.

The Android wallet's `SmartQuestionnaireFetcher` would need the
following changes:

- Stop dereferencing the bare URL when the canonical carries
  `|version`.
- Implement (a) FHIR search resolution against a configurable base
  URL or (b) a canonical-resolver hook the host app can supply, with
  the bare-GET path retained only for unversioned canonicals.
- After fetch, verify the resolved Questionnaire's `url` and
  `version` against the request and surface a clear error when they
  disagree.

The pinned test
(`SmartRequestAdapterTest.kt:60–65`,
`stripsCanonicalVersionBeforeQuestionnaireFetch`) is asserting the
wrong behavior and should be replaced with tests that exercise the
canonical-resolver path and the post-fetch verification.

### Locations to update when adopted

Spec / prose:

- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:455–474` — replace
  the §3 decision matrix with the table above and add the resolution
  / verification subsections.
- `spec-work/t2a-clinical-request-model/canonical.md:500–523` —
  same: rewrite §5.5.
- `spec-work/t2a-clinical-request-model/attempt-05.md:476–495` —
  same.

Validators / SDK:

- `rp-web/src/sdk/core.ts` — no fetcher today; if/when a canonical
  resolver is added, follow the rules above.
- `wallet-android/app/src/main/java/.../SmartQuestionnaireFetcher.kt`
  — rewrite per the proposed change; remove `canonicalUrlForFetch`'s
  silent strip-and-fetch behavior or scope it to unversioned
  canonicals only.
- `wallet-android/smart-checkin-core/.../SmartRequest.kt:99, :159, :162`
  — these are profile-family routing helpers and continue to strip;
  no change needed in those code paths.

Tests / fixtures:

- `wallet-android/app/src/test/java/.../SmartRequestAdapterTest.kt:60–65`
  — replace the strip-asserting test with tests that:
  - resolve a versioned canonical via a stubbed FHIR-search resolver;
  - reject a fetched Questionnaire whose `(url, version)` does not
    match the request;
  - permit direct dereference for unversioned canonicals only.
- `wallet-android/app/src/test/resources/test-vectors.json` — add
  versioned-canonical fixtures that exercise both the success and
  mismatch paths.

### Out of scope

- Defining the wire/configuration format for "canonical resolver"
  hooks an implementation may plug in (package cache, registry
  endpoint, etc.). This note constrains the resolution semantics, not
  the resolver implementation surface.
- Whether `profilesFrom[]` should ever carry `|version` — the
  existing SHOULD-NOT guidance stands and is independent of this
  change.

---

## 4. Cross-device kiosk flow is not a standardized protocol — descope §9 and friends

### Background

Today the outline carves out three coordinated layers:

1. clinical content model (transport-neutral SMART request/response),
2. base same-device presentation flow (DC API direct `org-iso-mdoc`),
3. an optional **cross-device kiosk flow** with its own normative
   wrapper: `KioskRequestPayload`, `EncryptedKioskRequest`, kiosk
   content types, ES256 JWS + ECDH-P-256/HKDF-SHA-256/AES-256-GCM
   ladder, dedicated salt/info constants, AAD = UTF-8 `requestId`,
   `submitTo` transport descriptor, `encryptResponseTo` desktop key,
   `maxPlaintextBytes` negotiation, kiosk roles ("Kiosk creator",
   "Submission service", "Phone presenter", "Completion display"),
   and an entire §9 plus T4A/T4B/T4C/T4D tranche of normative work
   covering pointer URLs, phone resolution, submission encryption,
   completion processing, replay/expiration rules, and an end-to-end
   byte ladder.

The repo's demo implements all of that against InstantDB rows + Instant
Storage. It works, but every tranche of T4 work assumes that
shape becomes a normative spec deliverable.

### Observation

A cross-device check-in is, at the wire level, just a UX pattern: the
verifier shows the user something (QR, NFC tag, deep link, paper
handout, badge tap, SMS, …) that lands the user's phone on a
same-device page that runs the §8 flow. Once the phone loads that page,
§8 takes over and the wallet has the same guarantees it would have if
the patient had simply visited that URL directly. The clinic-to-phone
hand-off:

- carries no clinical content on the wire that §5/§6/§8 doesn't already
  cover (the request body and its trust properties are owned by §5/§7);
- needs no interoperability between vendors — the clinic that prints
  the QR is the same party that hosts the page the phone loads;
- has no security property that isn't inherited from §7 (origin and
  reader-auth) and §8 (mdoc transport, HPKE, MSO/issuer/device proof);
- has no privacy property that isn't already owned by the
  transport-neutral model (the QR can carry just an opaque pointer, or
  even an opaque URL — the spec doesn't have to mandate which).

Independent specs that share this shape (ISO/IEC 18013-7 Annex C,
EUDIW reference flows, OpenID4VP cross-device) define the same-device
wire format and leave the cross-device hand-off to deployments.

### Decision

The kiosk / cross-device flow is **out of scope for SMART Health
Check-in 1.0 as a normative protocol layer.** The spec defines:

1. the clinical content model (§§5-6, Appendices B/H), and
2. exactly one same-device presentation flow — direct `org-iso-mdoc`
   over the W3C DC API (§§7-8, Appendices C/D/E for that flow).

The verifier MAY initiate a check-in in person by presenting a URL
(QR, NFC, deep link, etc.) that lands the user's phone on a page that
runs the §8 flow. The format of that URL, the pointer/relay/storage
mechanism behind it, and the path the response takes back to the
clinic are **implementation-defined and not specified**.

### What stays in the spec

- §§5-6 clinical request/response model and validation rules.
- §7 trust framework (applies regardless of who launched the §8 flow).
- §8 same-device DC API direct `org-iso-mdoc` flow.
- §11 security considerations limited to §§5-8 (no kiosk-specific
  freshness/replay/expiry rules — same-device freshness from
  SessionTranscript suffices for the only normative flow).
- §12 privacy considerations limited to §§5-8.
- Conformance classes for **Verifier**, **Wallet/Responder**, and
  optionally **Verifier-side validator** — no kiosk-creator or phone-
  submitter classes.

### What drops from the spec

- **§9 entirely** (cross-device kiosk flow, kiosk JWS body,
  `EncryptedKioskRequest` envelope, QR/pointer URL format,
  resolution/decryption rules, submission encryption, completion
  processing, kiosk replay/`expiresAt`/clock-skew rules).
- **Tranches T4A, T4B, T4C, T4D** drop in full.
- **§1.6 terminology**: drop *Kiosk creator*, *Submission service*,
  *Phone presenter*, *Completion display* as protocol roles. They
  remain fine as informal labels in non-normative narrative.
- **§3.2.2 and §3.4.2**: cross-device flow stays only as a brief
  non-normative example in architecture, not as a second flow.
- **§4 conformance classes**: drop kiosk-creator and phone-submitter
  classes; drop the kiosk profile-id placeholder.
- **§11.2 / §11.8 / §11 generally**: drop kiosk-specific replay,
  freshness-window, and "honest-but-curious relay" subsections.
- **§13 IANA / registry placeholders**: drop
  `application/smart-health-checkin-kiosk-request+jws+aesgcm` and any
  related kiosk content type or kiosk profile id.
- **§15 implementation guidance**: drop §15.4 "Kiosk transport-provider
  implementations" (or downgrade to a one-paragraph pointer at the
  repo demo).
- **§16 worked examples**: drop §16.6 "Cross-device kiosk full byte
  ladder."
- **Appendix C CDDL**: drop kiosk JWS / encrypted-request envelope
  CDDL; keep only same-device CDDL.
- **Appendix D fixtures**: kiosk JWS round-trip vectors become
  repo-demo fixtures, not conformance vectors. They stay where they
  are in `fixtures/` but are not referenced from the spec.
- **Appendix A conformance inventory**: no rows for kiosk-creator,
  phone-submitter, or relay behaviour.

### What about the existing repo demo?

The repo's `rp-web` kiosk creator/submit pages and the InstantDB
mailbox provider continue to work and continue to be useful as a
worked example of *one* way to land a phone on the §8 flow. Their
documentation lives in `rp-web/README.md`, `site/kiosk-flow-explainer
.html`, and `docs/plans/kiosk-transport-row-slim.md` — none of those
need to be referenced from the normative spec text. They should
explicitly be labeled "demo, not spec."

### Why this is safe

- **Privacy:** the QR carries an opaque pointer; the clinical
  request/response never appears on the wire anywhere outside §8 HPKE.
  Whatever pointer/relay design the clinic picks, the relay sees
  ciphertext only, and our existing slim-row schema already enforces
  that. The spec doesn't have to bless any particular relay shape.
- **Trust:** the §7 trust layers (origin, reader auth, MSO/issuer,
  device key, clinical-source provenance) all attach to §8 once the
  phone is on the same-device page. Whether a kiosk or a billboard or
  a mailed letter pointed the user to that page is irrelevant to §7.
- **Clinical semantics:** §§5-6 are transport-neutral. The wallet
  parses the same SMART request and returns the same SMART response
  shape regardless of how the page got loaded.
- **Interop:** there is nothing for two independent vendors to
  interoperate over in a cross-device hand-off — the clinic that
  prints the QR is the same party that hosts the page. No registry,
  no negotiation surface, no interoperable wire format is needed.

### Open question (defer)

Whether a future minor release should standardize an **optional**
verifier-signed SMART request envelope (so wallets that resolve a QR
can verify the request originated from a known clinic key set) — out
of scope for 1.0. If demand materializes, add it as a separate
opt-in profile, not as the kiosk wrapper the current outline carves
out.

### Locations to update when adopted

- `spec.md.outline`:
  - Reframe §1.0 introduction to two layers (clinical content +
    same-device flow), drop the third-layer kiosk wording.
  - Drop kiosk roles from §1.6 terminology.
  - Reword §2.1.2 to describe in-person initiation as an example
    UX, not a normative wire flow.
  - Drop or rewrite §3.2.2 and §3.4.2 as non-normative examples.
  - Drop §3.3.5–§3.3.8 (kiosk roles).
  - Drop §4.1.3 / §4.1.4 / §4.4.2.
  - Delete §9 in full.
  - Drop §11.2's kiosk reference and §11.8 entirely.
  - Drop §13.1.3 and the kiosk profile-id row in §13.5.
  - Drop §15.4.
  - Drop §16.6.
  - Trim Appendix C wording referencing kiosk envelopes.
  - Trim Appendix D wording referencing kiosk JWS round-trip vectors.
- `spec.md.outline.dependency_tree`:
  - Drop T4A / T4B / T4C / T4D and any references to them in later
    tranches.
- `spec-work/`:
  - Mark `t4*` tranche directories as superseded (or remove from the
    work plan).
  - Add a banner to `t1b-purpose-scope-goals/canonical.md` and
    `t1c-architecture-roles-flows/canonical.md` so the next pickup
    drops the third-layer / kiosk-as-wrapper framing where it
    appears.
- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` and
  `docs/PROTOCOL-EXPLAINER.md`: trim any prose that frames the kiosk
  flow as part of the protocol; mention it (if at all) only as a
  demo-only deployment example.
- `README.md` and `site/index.html`: relabel the kiosk demo as a
  worked example of one possible in-person initiation, not a SMART
  Health Check-in protocol layer.

### Out of scope

- Removing the kiosk demo code or routes. The demo continues to ship
  as a worked example.
- Rewriting `docs/plans/kiosk-transport-row-slim.md` or related
  implementation plans — those describe the demo and stay accurate;
  they just stop being inputs to the spec.
- Choosing a future optional verifier-signed-request profile (see
  open question above).
