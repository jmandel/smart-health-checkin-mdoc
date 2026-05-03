## 15. Implementation notes

This section provides informative guidance for implementers building products, SDKs, test harnesses, and deployment profiles around SMART Health Check-in 1.0. It does not add conformance requirements. The interoperable protocol surface remains the transport-neutral SMART request and SMART response in §§5-6 and the same-device direct `org-iso-mdoc` presentation flow and trust model in §§7-8. Security, privacy, registry, internationalization, schema, CDDL, and fixture requirements are defined in their own sections and appendices.

Implementations can use many product architectures. A patient portal, payer site, front-desk app, or intake application might perform both Requester and Verifier roles; a Wallet might combine request parsing, Holder review, local credential storage, FHIR rendering, and mdoc response construction; an EHR might receive returned Artifacts through a separate ingestion service. Those product boundaries are local choices. The implementation pattern that most reduces interop risk is to keep the following interfaces explicit:

- a clinical model layer that builds, parses, validates, and cross-validates SMART request and SMART response JSON;
- a presentation layer that knows about Digital Credentials API, mdoc, CBOR, COSE, HPKE, `SessionTranscript`, and same-device origin handling;
- a trust-policy layer that records origin, optional `readerAuth`, mdoc issuer/device evidence, and clinical-source evidence as separate decisions;
- a holder-data or receiver-data layer that maps local EHR, wallet, credential, or FHIR resources to and from the core Artifact model; and
- a diagnostic and fixture layer that can expose byte boundaries without leaking live clinical payloads, private keys, bearer URLs, or production trust material.

In-person initiation by QR code, NFC tag, deep link, printed URL, staff handoff, or kiosk display can be useful deployment UX. Such initiation should be designed as a way to land the Holder on a same-device Verifier page that runs §8. It should not be implemented as a second standardized SMART Health Check-in pointer, relay, envelope, submission, or completion protocol unless a future profile defines one.

### 15.1 Verifier app

A Verifier app is usually easiest to maintain when request construction, presentation-session state, response opening, protocol validation, and downstream workflow handoff are separate modules.

#### 15.1.1 Building the request from a UI form

A Requester-facing UI can collect workflow intent in familiar terms such as “insurance card,” “clinical summary,” or “intake form,” but its output should be the §5 SMART request shape rather than a local topic vocabulary. A useful builder interface accepts local form state and produces:

```ts
interface CheckinRequestDraft {
  id: string;
  purpose?: string;
  fhirVersions?: string[];
  items: CheckinRequestItemDraft[];
}
```

The final builder should then map each item to explicit `content` and `accept[]` values:

- use `content.kind: "fhir.resources"` with `profiles[]`, `profilesFrom[]`, and/or `resourceTypes[]` when the requested content can be expressed with FHIR-native selectors;
- represent profile families as `profilesFrom: ["<canonical family URL>"]`, not as package descriptors, local topic labels, or singleton strings;
- treat `profiles[]` and `profilesFrom[]` as additive selectors in UI preview and validation messages;
- use `content.kind: "questionnaire"` with direct sibling `canonical` and/or `resource`, and avoid generating the legacy nested `questionnaire` key; and
- list only Artifact media types that the receiving system can parse, validate, and route for that item.

Request builders should preserve exact machine values. Item ids, FHIR canonicals, media types, status codes, mdoc identifiers, and algorithm labels should not be localized, Unicode-normalized for comparison, case-folded, or rewritten for display convenience. Human-readable `purpose`, `title`, and `summary` can be localized or authored for the Holder, but they should not be treated as authenticated requester identity or as consent language.

A practical Verifier UI often benefits from a preview panel that shows both a Holder-friendly summary and the exact SMART request JSON. The preview should make broad selectors, no-selector `fhir.resources` items, versioned canonicals, accepted media types, and retention expectations visible to implementers and testers before a request is sent.

#### 15.1.2 Holding HPKE private material

The same-device §8 flow requires the Verifier to retain the HPKE recipient private key and exact `encryptionInfo` base64url string until the Wallet response is opened or the session is abandoned. Implementations can hold that material in different places:

| Pattern | Typical use | Notes |
| --- | --- | --- |
| Browser-local authority | Static demos, patient-portal pages, local development | The page generates the HPKE key pair, invokes `navigator.credentials.get`, opens the response, and then clears the private key. This is simple, but browser memory, debug panels, crash reports, and support tools need careful handling. |
| Server-owned authority | Production portals or workflows needing server-side audit, policy, or ingestion | The browser receives a prepared DC API request and an opaque handle. The server retains private key material, opens the returned credential, validates it, and returns a workflow result. This can simplify downstream ingestion but increases server responsibility for sensitive cryptographic material and plaintext. |
| Split or delegated authority | Enterprise, native bridge, or high-assurance deployments | A local page, backend service, and native container can divide preparation and completion, as long as the exact §8 transcript inputs and response-validation obligations are preserved. |

Whichever pattern is used, the implementation should make the authority boundary explicit. Application UI code should not need to know whether private key material is browser-local or server-owned. The state record behind a presentation handle should include the original SMART request, the exact `encryptionInfo` base64url string, the origin value used for the transcript, the HPKE recipient private key, feature flags such as optional `readerAuth`, and enough metadata to apply §6.6 and §8 validation. It should not use the SMART request `id`, item ids, Artifact ids, QR handle, or relay handle as a substitute for freshness or transcript binding.

Completed or abandoned sessions should clear HPKE private material and decrypted response plaintext as soon as the deployment's operational, audit, and clinical obligations allow. Diagnostic exports that include private JWKs, decrypted `DeviceResponse` bytes, SMART responses, or FHIR payloads should be treated as controlled fixture or incident material, not routine telemetry.

#### 15.1.3 Validating the response

Verifier apps should validate in layers and keep the result of each layer visible to logs and workflow policy without conflating the layers.

A useful response-opening pipeline is:

1. confirm that the Digital Credentials API result uses protocol `org-iso-mdoc` and has `data.response` as unpadded base64url CBOR;
2. parse the direct `dcapiResponse` wrapper and HPKE-open the ciphertext with `info = SessionTranscript bytes` and empty AAD;
3. parse `DeviceResponse`, validate the accepted document's `docType`, issuer-signed namespace, stable element, MSO digest binding, issuer evidence, and device signature under §8 and deployment policy;
4. extract the `smart_health_checkin_response` `elementValue` as JSON text;
5. validate the SMART response shape under §6;
6. cross-validate against the original SMART request: exact `requestId`, resolvable `fulfills[]`, `mediaType` accepted by every fulfilled item, exactly one `requestStatus[]` entry per original item, and FHIR/SMART Health Card branch-specific checks; and
7. separately evaluate clinical-source evidence, FHIR profile or Questionnaire responsiveness, patient-match policy, provenance, and local ingestion rules.

A single “valid” boolean is usually too coarse for operations. Verifier apps should retain a structured validation report that can distinguish, for example, HPKE failure, mdoc signature failure, untrusted issuer, missing stable element, invalid SMART response JSON, cross-validation failure, unsupported media type, raw FHIR provenance absent, SMART Health Card signature failure, and local EHR ingestion rejection.

Shape validation alone is not enough. JSON Schema validation can reject many malformed requests and responses, but it cannot prove `requestId` correlation, status coverage against the original request, media-type acceptance for each fulfillment edge, FHIR Bundle responsiveness, SMART Health Card validity, exact-version profile evidence, or same-device transcript binding.

#### 15.1.4 Surfacing fixtures for support and diagnostics

Verifier implementations should expose diagnostics at stable boundaries, especially during certification and cross-vendor testing. Useful artifacts include:

- the original SMART request JSON;
- the DC API navigator argument, with `deviceRequest` and `encryptionInfo` base64url fields;
- decoded `ItemsRequest` and its tag-24 bytes;
- the exact `encryptionInfo` base64url string and computed `SessionTranscript`;
- optional `readerAuth` inspection results, separated into absent, malformed, cryptographically failed, valid but untrusted, and trusted states;
- the returned `dcapiResponse` wrapper, HPKE `enc` and `cipherText`, and HPKE-open result;
- mdoc/MSO/digest/device-signature validation results;
- the extracted SMART response JSON; and
- the §6.6 cross-validation report.

Support tooling should redact by default. Live production diagnostics should not routinely include plaintext FHIR resources, SMART Health Cards, Questionnaire answers, request-opening private keys, bearer URLs, full launch URLs, unredacted stack traces, or reusable identifiers. Public fixtures can include intentionally public test keys and demo certificates only when clearly labeled as test-only and separated from production material.

### 15.2 Wallet implementation guidance

A Wallet/Responder implementation needs to parse presentation requests, classify trust signals, present meaningful Holder controls, gather responsive content, construct a SMART response, and wrap it in the §8 same-device presentation response. These responsibilities are easier to test when the Wallet separates a presentation adapter from a clinical response engine and from its holder-data store.

#### 15.2.1 Origin allow-list maintenance

Wallets that use origin or privileged-caller trust should obtain origin evidence from the Browser / User Agent, Credential Manager, platform channel, or a deployment-approved privileged-caller mechanism. They should not derive origin or organization identity from the SMART request body, launch URL, QR code contents, `purpose`, item display text, selector URLs, logos, package-looking strings, or returned Artifact contents.

A production allow-list or privileged-caller policy is operational infrastructure. It should have a clear source of truth, update process, rollback path, test/prod separation, and display policy. Development builds can use reflective allow-lists or demo caller evidence, but the UI and logs should label those states as non-production. If origin evidence is absent or unacceptable, Wallet policy can reject, continue with reduced assurance, require additional Holder confirmation, omit branding, restrict returned content, or report item outcomes as appropriate; it should not display unauthenticated text as verified requester identity.

#### 15.2.2 Consent screen design

The request item is the natural unit for Holder review and status accounting. Wallet consent screens can group, summarize, reorder, translate, or suppress details for accessibility, safety, localization, and local policy, but the underlying item ids and per-item decisions should be preserved exactly for `fulfills[]` and `requestStatus[].item`.

A risk-reducing consent screen distinguishes at least these kinds of information:

- authenticated origin or privileged-caller evidence, if available;
- trusted, untrusted, failed, or absent reader authentication, if used by the deployment;
- mdoc issuer/device evidence and any limitations of self-attested or test material;
- unauthenticated request display context such as `purpose`, item `title`, item `summary`, profile URLs, and Questionnaire text;
- accepted media types and retention signal (`intentToRetain`) in user-meaningful terms;
- broad or no-selector FHIR requests;
- sensitive categories or local policy warnings; and
- available choices to share, decline, or partially share items.

The advisory `required` flag should be shown, if useful, as workflow context rather than as a command. Scanning a QR code, opening a page, invoking the DC API, or seeing `intentToRetain: true` is not by itself Holder consent. If the Holder declines an item, if data is unavailable, if a selector is unsupported, or if a Questionnaire cannot be processed safely, those are ordinary §6 item outcomes when the request is otherwise valid enough to answer.

#### 15.2.3 Holder-store interface

Wallets should treat the holder-data store as an app-owned boundary rather than as part of the protocol. A store interface can accept a parsed request item, the Holder's decision, and any captured Questionnaire answers, and can return a candidate Artifact or a status outcome:

```kotlin
interface HolderDataStore {
    fun resolveItem(
        item: ParsedRequestItem,
        decision: HolderDecision,
        answers: QuestionnaireAnswerSnapshot
    ): ItemResolution
}
```

The store can be backed by SMART Health Cards, cached FHIR Bundles, issuer-provided credentials, connected APIs, local files, or other data sources. The protocol-visible output is still a SMART response with Artifacts, `fulfills[]`, and `requestStatus[]`. Store code should not need to know about Digital Credentials API wrappers, `DeviceRequest`, CBOR tag 24, HPKE, or mdoc MSO construction. Conversely, mdoc response code should not need to know whether a FHIR resource came from a local cache, a credential, a connected account, or a demo fixture.

When the store cannot produce an Artifact that matches the item selector and accepted media type, it should return an outcome that maps cleanly to `unsupported`, `unavailable`, `declined`, `partial`, or `error`. This makes status accounting explicit and avoids returning unaccepted media types or unrelated data merely to fill a required-looking item.

#### 15.2.4 Profile-family resource matching

`profilesFrom[]` generally requires local knowledge of implementation guides, package metadata, family mappings, or deployment policy. Wallets should design a resolver or matcher API that can answer questions such as:

```text
Does resource R match any exact profile in profiles[]?
Does resource R belong to any family in profilesFrom[]?
Does resource R have one of the requested resourceTypes[]?
What exact profile evidence supports the match?
```

The matcher should preserve exact `meta.profile` strings from source resources, including any `|version` suffixes. It can use base canonicals for broad routing, grouping, or profile-family lookup where §5.5 permits, but it should not strip versions when resolving versioned canonicals, returning `meta.profile`, constructing `QuestionnaireResponse.questionnaire`, or claiming exact-version fulfillment.

Implementations that do not perform full FHIR profile validation can still be useful if they honestly report their evidence. For example, a Wallet can match a locally known US Core resource based on source metadata or package knowledge without validating every invariant at disclosure time. If exact-version evidence is unavailable for a versioned request, the Wallet should avoid claiming full fulfillment for that exact profile and should choose an appropriate item status.

#### 15.2.5 QuestionnaireResponse construction

Wallets should implement questionnaire handling around the flattened selector shape:

```json
{ "kind": "questionnaire", "canonical": "https://example.org/fhir/Questionnaire/intake|1.2.3" }
```

or:

```json
{ "kind": "questionnaire", "resource": { "resourceType": "Questionnaire" } }
```

or both direct sibling fields together. Parsers should reject or report unsupported for legacy nested `questionnaire` string/object/wrapper shapes rather than silently coercing them.

A Questionnaire module should separate four tasks:

1. resolve or select the Questionnaire definition using structured `(url, version?)` canonical handling;
2. render or otherwise process the Questionnaire under Wallet policy and FHIR capabilities;
3. collect or prefill answers with Holder control; and
4. construct a FHIR `QuestionnaireResponse` Artifact, normally `application/fhir+json` with an explicit `fhirVersion`.

When the request supplied a `canonical` and that canonical is the Questionnaire identity being answered, the generated `QuestionnaireResponse.questionnaire` should preserve the requested string exactly, including `|version`. When only an inline `resource` is supplied, the Wallet can use `Questionnaire.url` and `Questionnaire.version` when known and appropriate. If both `canonical` and `resource` are present, material disagreement should not be silently merged or rewritten; `unsupported` is often the safer item outcome before answer collection, while `error` is more appropriate for operational failures after the Questionnaire was otherwise understood.

#### 15.2.6 Android Credential Manager: matcher / handler split

On Android, a practical architecture is to keep the Credential Manager matcher small and deterministic, and place richer parsing and response construction in a handler flow.

The matcher can inspect enough of the incoming credential request to decide whether the Wallet can handle direct `org-iso-mdoc` for `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`. It should reject non-SMART mdoc requests and stale carrier variants without trying to infer clinical meaning from dynamic elements or display text.

The handler can then perform the full §8 request processing sequence: decode the `DeviceRequest`, preserve tag-24 `ItemsRequest` bytes, extract the SMART request JSON, compute the direct `dcapi` `SessionTranscript` from the exact `encryptionInfo` base64url string and authenticated origin or origin-equivalent, classify optional `readerAuth`, run Holder review, build the SMART response, construct the issuer-signed stable element, sign mdoc structures, and HPKE-encrypt the `DeviceResponse`.

Keeping a platform-light clinical core helps testability. A Kotlin or native core module can parse SMART request JSON, classify items for UI, call a holder-store interface, and build SMART response JSON without depending on Android activities, Compose, Credential Manager, CBOR, COSE, or HPKE. The mdoc/Credential Manager layer can then be tested with fixture byte ladders and negative vectors.

#### 15.2.7 iOS / Safari considerations

SMART Health Check-in 1.0 does not define a separate iOS or Safari binding. Implementers exploring iOS, Safari, native-app, or browser-extension surfaces should preserve the same two normative layers: the §§5-6 clinical model and, for live version 1.0 presentation claims, the §8 direct `org-iso-mdoc` same-device flow.

Where a platform cannot supply the origin, DC API wrapper, direct mdoc request, HPKE transcript, or Wallet invocation semantics required by §8, the implementation should describe the gap as a platform or deployment limitation rather than treating a deep link, custom URL scheme, app-to-app callback, or web relay as an equivalent standardized SMART Health Check-in flow. Experimental platform bridges can still be valuable, but their conformance claim should be scoped to the pieces they actually implement, such as core SMART request/response validation or fixture generation.

### 15.3 EHR ingestion of returned artifacts

EHR ingestion begins after the Verifier has accepted a presentation response as protocol-valid for the applicable layers. Ingestion is not defined by SMART Health Check-in 1.0, but receivers can reduce risk by preserving a structured handoff from the Verifier to the local clinical workflow.

A useful ingestion record separates:

- the original SMART request and request item ids;
- the accepted SMART response and Artifact ids;
- per-item `requestStatus[]` outcomes;
- Artifact media types and payload summaries;
- §8 validation results, including origin, HPKE, mdoc issuer/device, digest, and device-authentication outcomes;
- optional `readerAuth` state and policy result;
- clinical-source evidence such as SMART Health Card verification, FHIR Provenance, signatures, source attestations, or absence of such evidence;
- FHIR release context and profile evidence; and
- local patient-match, deduplication, reconciliation, routing, and acceptance decisions.

Receivers should treat `fulfilled` and protocol-valid as inputs to local workflow, not as automatic EHR write-back. A response can pass SMART Health Check-in validation while still being unsuitable for ingestion because of local patient-match uncertainty, missing provenance, unacceptable FHIR version, absent profile evidence, stale clinical data, unsupported terminology, duplicate content, or policy restrictions.

For `application/smart-health-card` Artifacts, ingestion should verify each JWS, inspect the signed payload, evaluate issuer trust under local policy, determine FHIR version from the signed credential content, and then assess whether signed resources satisfy the original selectors. The SMART Health Check-in wrapper should not add an outer `fhirVersion` to this Artifact class.

For `application/fhir+json` Artifacts, ingestion should use the Artifact-level `fhirVersion` to choose parsers and validators. A single raw FHIR Artifact should be interpreted as one FHIR release; if a Bundle appears to mix releases or contains resources that cannot be interpreted under the declared version, the receiver can quarantine or reject it locally. Raw FHIR JSON should be treated as patient-mediated unless separate accepted provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present.

Deduplication should be based on clinical payload evidence and local policy rather than on SMART Health Check-in wrapper ids alone. Request ids, item ids, and Artifact ids are scoped accounting values. They are useful for audit and troubleshooting but should not be treated as global document identifiers, patient identifiers, provenance identifiers, or source-system ids unless the payload or deployment policy establishes that meaning.

Status accounting should survive ingestion. Even when an EHR imports only a subset of returned Artifacts, it can retain or display the per-item outcomes so staff know which items were declined, unavailable, unsupported, partial, fulfilled, errored, or rejected by local ingestion policy. User-facing or operator-facing status messages should avoid unnecessary sensitive details, stack traces, token values, and source-system internals.

### 15.4 SDK packaging guidance

SDKs should make the protocol layers visible in their package boundaries. One useful packaging model is:

| Package or module | Contents | Should avoid |
| --- | --- | --- |
| Core clinical model | Type definitions, builders, parsers, JSON Schema helpers, request/response validation, §6.6 cross-validation, canonical parsing helpers, Artifact validators, status utilities | Browser APIs, Android/iOS UI, CBOR, COSE, HPKE, mdoc, relay storage, EHR-specific ingestion policy |
| FHIR support | Canonical resolver interface, profile-family matcher interface, Bundle traversal, `meta.profile` and `QuestionnaireResponse.questionnaire` helpers, optional FHIR validator adapters | Hard-coded mandatory IGs, strip-and-fetch resolution for versioned canonicals, wrapper-level profile summaries |
| DC API verifier | `org-iso-mdoc` request construction, HPKE key management seam, `navigator.credentials.get` argument construction, response opening, §8 verifier checklist, fixture export | Clinical selector interpretation beyond validation, EHR ingestion policy, production trust-anchor assumptions hidden in demos |
| Wallet clinical core | SMART request parsing, item classification, Holder decision model, holder-store interface, SMART response construction, status accounting, QuestionnaireResponse builder | Credential Manager, mdoc signing, platform UI dependencies, demo fixture assumptions in production code |
| Same-device mdoc wallet | Credential Manager or platform adapter, request matcher, tag-24 and CBOR handling, `readerAuth` classification, MSO/device-signature construction, HPKE seal | FHIR business logic and holder-data lookup mixed into cryptographic parsing |
| UI/framework bindings | React hooks, Compose screens, SwiftUI views, debug panels, localization helpers | New protocol semantics, hidden mutation of machine identifiers, trust conflation in display labels |
| Fixture/conformance tools | JSON Schema runners, CDDL/CBOR inspectors, byte-ladder generators, negative vectors, trust-material labeling | Treating diagnostic or historical captures as production trust anchors or universal conformance by default |

The core package should expose explicit APIs for operations that are easy to get wrong:

```ts
parseCanonical(input): { original: string; url: string; version?: string }
resolveCanonical(parsed, expectedResourceType, resolverOptions)
validateSmartCheckinRequest(value)
validateSmartCheckinResponse(value)
validateResponseAgainstRequest(request, response)
validateArtifactAgainstAcceptedMedia(item, artifact)
classifyItemStatusOutcome(reason)
```

The canonical resolver API is especially important. It should accept parsed `(url, version?)` values, support package-cache or FHIR-search resolution, verify the returned `resourceType`, `url`, and exact `version` when requested, and preserve the original string for response construction and diagnostics. It should not offer “strip version and fetch URL” as the implementation path for versioned canonicals.

Artifact validators should branch by recognized `mediaType`. The core union for version 1.0 has `application/smart-health-card` and `application/fhir+json`; extension Artifacts should be added as branded media-type-defined variants with their own typed fields. SDKs should avoid generic `value` / `url` / `data` catch-alls for unknown media types, because field names alone do not define dereferencing, integrity, provenance, expiration, FHIR-version, or security semantics.

Status helpers should make it easy for Wallets to account for every item exactly once and for Verifiers to detect missing, duplicate, or unknown status entries. A good test surface includes fulfilled, partial, declined, unavailable, unsupported, and error outcomes; many-to-many Artifact fulfillment; unaccepted media types; invalid FHIR versions; unknown media types; missing `requestId`; and contradictory status-to-Artifact combinations.

Same-device SDKs should expose deterministic inspection hooks for fixture generation without making those hooks production telemetry defaults. Test surfaces should cover the fixed `org-iso-mdoc` identifiers, `DeviceRequest.version` `"1.0"`, the stable requestInfo key, tag-24 `ItemsRequest`, optional per-`DocRequest.readerAuth`, exact `encryptionInfo` base64url transcript binding, HPKE suite and empty AAD, stable response element extraction, MSO digest input, device authentication, and §6.6 cross-validation.

Framework bindings should be thin. React hooks, Compose screens, SwiftUI components, or server middleware can orchestrate SDK calls and render status, but they should not redefine selector semantics, alter machine-value comparison, infer trust from display text, or silently convert legacy request shapes. Bindings should surface structured validation and trust reports so applications can make local policy decisions without parsing exception strings.

Finally, SDK documentation should state conformance scope precisely. A package can support the core clinical model without implementing live same-device presentation. A DC API verifier package can implement §8 without defining EHR ingestion. A fixture package can provide diagnostic captures without claiming production issuer trust. Clear package boundaries and claims help implementers compose the profile without accidentally standardizing deployment-local behavior.
