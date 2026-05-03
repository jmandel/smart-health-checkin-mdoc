## 15. Implementation notes

This section is informative. It describes implementation patterns for the protocol defined elsewhere and does not add conformance requirements. Interoperability requirements are defined by the transport-neutral SMART request and SMART response in §§5-6 and by the same-device direct `org-iso-mdoc` presentation and trust flow in §§7-8, with supporting security, privacy, registry, internationalization, schema, CDDL, and fixture material in later sections and appendices.

SMART Health Check-in 1.0 has two normative layers only:

1. the clinical SMART request and SMART response JSON objects; and
2. the same-device presentation flow using W3C Digital Credentials API direct `org-iso-mdoc`.

In-person QR, NFC, deep-link, kiosk, desktop, staff-handoff, relay, and completion-screen behavior can be useful deployment UX. In version 1.0 those mechanisms are not standardized pointer, envelope, relay, submission, or completion protocols. A deployment that uses them should treat them as a way to land the Holder on a same-device Verifier page that runs §8.

Implementations are easiest to test when they keep these boundaries explicit:

- a clinical model layer for request/response parsing, selectors, media types, statuses, and §6.6 cross-validation;
- a same-device presentation layer for Digital Credentials API, CBOR, COSE, mdoc, HPKE, `SessionTranscript`, and origin handling;
- a trust-policy layer that records origin, optional `readerAuth`, mdoc issuer/device evidence, and clinical-source evidence as separate decisions;
- a Wallet holder-data or receiver-data layer for local clinical records, credentials, FHIR resources, and ingestion policy; and
- diagnostic and fixture tooling that labels comparison mode and avoids leaking production secrets or clinical payloads.

### 15.1 Verifier app

A Verifier app packages a SMART request for same-device presentation, opens the returned presentation, validates the extracted SMART response against the original request, and passes only validated results to the Requester or downstream workflow. The same product often acts as both Requester and Verifier, but separating clinical request construction from presentation validation helps avoid trust and data-model confusion.

#### 15.1.1 Building the request from a UI form

Request authoring should begin with what the downstream receiver can parse, validate, route, and ingest. For each request item, a builder should collect or generate a session-scoped item `id`, Holder-facing `title` and optional `summary`, advisory `required` value, one `content` selector, and an ordered `accept[]` list containing only supported Artifact media types.

For `fhir.resources` selectors, use FHIR-native identifiers rather than local topic labels. `profiles[]` identifies exact `StructureDefinition` canonicals. `profilesFrom[]` is an array of canonical profile-family URLs, not a singleton string, package descriptor, registry alias, or local topic. `resourceTypes[]` contains official FHIR resource type names. When `profiles[]` and `profilesFrom[]` are both present, describe them as additive profile selectors; `resourceTypes[]` is a separate resource-type constraint.

For Questionnaire requests, generate only the flattened selector shape:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/intake|1.2.3",
  "resource": { "resourceType": "Questionnaire" }
}
```

At least one of `canonical` or `resource` is present, and both are direct selector members. Legacy nested forms such as `questionnaire: "..."`, `questionnaire: { "resourceType": "Questionnaire" }`, or `questionnaire: { "canonical": ..., "resource": ... }` should not be emitted, silently coerced, or used in new fixtures.

Canonical handling should use a shared utility. Parse `canonical|version` into `(url, version?)` while preserving the original string exactly where the protocol carries, emits, records, or compares it. Versioned canonicals are resolved through a configured resolver, package cache, implementation-guide resolver, terminology service, or FHIR canonical search using both `url` and `version`; do not satisfy a versioned canonical by stripping `|version` and directly fetching the bare URL.

The SMART request body should not carry requester identity or presentation metadata. Organization names, origins, logos, callback URLs, package names, certificates, trust-framework labels, pointer ids, relay ids, and completion endpoints belong to the application shell, deployment policy, or presentation transport, not to the §5 clinical JSON.

#### 15.1.2 Holding HPKE private material

The §8 flow requires the Verifier to retain the HPKE recipient private key, the exact unpadded `encryptionInfo` base64url string, the origin used for the request, and the original SMART request until response processing completes or the presentation session is abandoned.

A browser-local Verifier authority keeps this state in the page process. This is convenient for demos, static pages, and simple same-device portals because the page builds the request, invokes `navigator.credentials.get`, opens the response, and validates the SMART response. It also means debug panels, browser storage, crash reports, screenshots, and console logs need controls because request-opening key material and decrypted clinical content may be present.

A server-owned or split Verifier authority can store the HPKE private key, original request, exact `encryptionInfo` spelling, expected origin, freshness metadata, and workflow state behind an opaque application handle. The browser can invoke the Digital Credentials API with public request material and return the result for server-side opening and validation. This can support audit and EHR ingestion, but the handle is deployment state around the §8 flow; it is not a standardized SMART Health Check-in pointer or relay protocol.

Whichever model is used, use fresh HPKE recipient key material and fresh unpredictable nonces for presentation sessions unless a deployment profile defines safe reuse. Keep request state, HPKE keys, transcript inputs, optional reader-authentication evidence, decrypted plaintext, and downstream workflow records separated. Do not treat request ids, item ids, Artifact ids, launch handles, relay handles, or completion ids as freshness proofs or transcript bindings.

#### 15.1.3 Validating the response

Verifier-side validation should be layered and request-aware. A practical pipeline records separate outcomes for:

1. the original SMART request validation and retained request context;
2. the returned Digital Credentials protocol and direct `dcapiResponse` wrapper;
3. HPKE opening with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD;
4. CBOR `DeviceResponse` parsing, version/status checks, expected `docType`, namespace, and stable response element;
5. MSO, issuer signature, value digest, disclosed issuer-signed item, and device-signature validation;
6. deployment-policy evaluation of origin, optional `readerAuth`, issuer evidence, and device evidence;
7. extraction of the `smart_health_checkin_response` element value as SMART response JSON;
8. §6 SMART response validation and §6.6 cross-validation against the original request; and
9. Artifact-specific validation, downstream patient matching, provenance review, and local ingestion policy.

Shape validation alone is insufficient. §6.6 validation checks exact `requestId`, `fulfills[]` references, media-type acceptance for every fulfillment edge, exactly one `requestStatus[]` entry per request item, raw FHIR `fhirVersion`, SMART Health Card wrapper rules, and FHIR-aware evidence where local policy requires it.

Keep trust states distinct. HPKE success does not prove reader trust. Reader authentication does not prove raw FHIR provenance. A valid mdoc digest does not prove a FHIR Bundle satisfies a requested profile. A `fulfilled` status does not force EHR ingestion.

#### 15.1.4 Surfacing fixtures for support and diagnostics

Useful diagnostics can include the SMART request JSON, Digital Credentials API argument, `DeviceRequest`, tag-24 `ItemsRequest`, `encryptionInfo`, exact `encryptionInfo` base64url string, `SessionTranscript`, optional `readerAuth`, returned `dcapiResponse`, HPKE opening result, mdoc/MSO/digest/device-signature validation report, extracted SMART response JSON, and §6.6 cross-validation report.

Production support tools should redact by default. Routine telemetry should avoid plaintext SMART requests and responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, request-opening private keys, bearer URLs, access tokens, full launch or QR URLs, decrypted `DeviceResponse` bytes, and unredacted stack traces. Fixture manifests should label whether material is byte-exact, structural, semantic, diagnostic, historical, illustrative, or conformance-candidate, and should clearly mark synthetic data, demo private keys, self-signed certificates, and non-production trust material.

### 15.2 Wallet implementation guidance

A Wallet/Responder receives a presentation request, classifies trust signals, presents meaningful Holder controls, gathers responsive content, constructs a SMART response, and wraps it in the §8 same-device presentation response. These responsibilities should remain separable so platform-specific invocation code does not leak into the clinical model and clinical data policy does not depend on CBOR or HPKE internals.

#### 15.2.1 Origin allowlist maintenance

Origin, privileged-browser, verified-app-link, package identity, signing-certificate, entitlement, enterprise-configuration, or allow-list evidence should come from authenticated platform or deployment channels. Do not derive verified origin or organization identity from `purpose`, item text, selector URLs, Questionnaire text, QR contents, deep-link parameters, launch page text, unknown SMART request members, package-looking strings, logos, or returned Artifacts.

Production allow-lists and privileged-caller policies should have clear update, rollback, test/prod separation, and display policies. Development builds may use reflective allow-lists or demo caller evidence, but those states should be labeled as non-production. If origin evidence is absent or unacceptable, Wallet policy can fail, proceed with reduced assurance, require additional Holder confirmation, omit branding, restrict returned content, or report item outcomes as appropriate; it should not display unauthenticated text as verified requester identity.

#### 15.2.2 Consent screen design

The request item is the protocol's Holder-review and response-accounting unit. Wallet UI can group, summarize, reorder, translate, or suppress details for accessibility, localization, safety, and local policy, but it should preserve meaningful item-level control and exact item ids for `fulfills[]` and `requestStatus[].item`.

Consent screens should distinguish authenticated origin or privileged-caller evidence, optional reader-authentication state, issuer/device evidence, unauthenticated SMART request display text, requested selectors, accepted response forms, retention signals such as `intentToRetain`, broad or no-selector requests, sensitive-category warnings, and the Holder's available choices.

`required: true`, `intentToRetain`, scanning a QR code, tapping NFC, opening a deep link, or clicking a page button outside the Wallet is not Holder consent by itself. `declined`, `partial`, `unavailable`, `unsupported`, and `error` are normal item-level outcomes when the request is otherwise valid enough to answer. Use `unsupported` when the Wallet cannot understand or support the selector, media type, FHIR version, Questionnaire features, exact canonical version, or extension semantics. Use `unavailable` when the Wallet understands the item but lacks matching shareable data. Use `partial` when responsive content is shared but complete fulfillment is not claimed.

#### 15.2.3 Holder-store interface

Production Wallets should place patient-data lookup and source selection behind an app-owned Holder data-source interface. That boundary can receive the validated request item, accepted media types, request `fhirVersions[]`, Holder choices, Questionnaire answers, trust and policy state, and available FHIR package or canonical-resolution services. It can return candidate Artifacts or item outcomes such as `declined`, `unavailable`, `unsupported`, `partial`, or `error`.

The Holder-store boundary is where implementations decide which SMART Health Cards, cached FHIR resources, issuer-provided documents, connected services, user-entered answers, or other Holder data sources are eligible; how sensitive data is redacted or withheld; whether one Artifact can accurately fulfill several items; and whether a broad item is only partially fulfilled. Store code should not know about Digital Credentials API wrappers, tag-24 boundaries, COSE, HPKE, or mdoc MSO construction. Transport code should not query patient records or determine clinical suitability.

#### 15.2.4 Profile-family resource matching

`fhir.resources` matching should treat selectors as FHIR-native constraints, not free-text topics. Exact `profiles[]` matching can use `meta.profile[]`, signed SMART Health Card payload evidence, source metadata, or trusted local conformance evidence. Versioned `profiles[]` values need exact-version evidence before claiming full fulfillment. `profilesFrom[]` identifies profile families and usually requires package metadata, `ImplementationGuide` knowledge, configured family maps, issuer knowledge, or local policy because FHIR resources do not normally declare family membership directly. `resourceTypes[]` uses official FHIR resource type names.

Matching code can use base canonicals for local routing, broad grouping, or profile-family lookup where §5.5 permits, but it should preserve exact strings for resolution, exact-version matching, `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, fixtures, and returned content.

#### 15.2.5 QuestionnaireResponse construction

A Questionnaire selector is flat: `content.kind` is `"questionnaire"` with direct optional `canonical` and `resource` members. Wallet parsers should reject or report `unsupported` for legacy nested `questionnaire` forms so stale integrations fail visibly.

When only `canonical` is supplied, the Wallet can resolve the Questionnaire through a configured resolver, package cache, FHIR canonical search, Holder data source, or other mechanism that respects §5.5. When only `resource` is supplied, the Wallet can render the inline Questionnaire without network retrieval if it supports the required features and local policy permits. When both are supplied, the canonical is the Requester's explicit identity and the resource is the body to render. Material disagreement in URL, explicit version, or answer-changing item structure is usually better reported as `unsupported` before answers are collected; operational failure after the Questionnaire was otherwise understood is usually `error`.

When returning `application/fhir+json`, the Wallet should construct a FHIR `QuestionnaireResponse` as a single resource or inside a Bundle and include the Artifact `fhirVersion`. If the requested canonical is the Questionnaire identity being answered, preserve it exactly in `QuestionnaireResponse.questionnaire`, including `|version`. If only an inline Questionnaire was supplied, use `Questionnaire.url` and `Questionnaire.version` when they provide a clear canonical identity; do not invent a misleading canonical solely to satisfy a receiver preference.

#### 15.2.6 Android Credential Manager: matcher / handler split

On Android, a useful architecture is to keep the Credential Manager matcher small and deterministic. The matcher can inspect enough of the request to decide whether to surface the Wallet for direct `org-iso-mdoc` requests for `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`.

The handler or Wallet activity owns the protocol work: parse `data.deviceRequest` and `data.encryptionInfo`, locate and preserve the tag-24 `ItemsRequest`, extract the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, compute the direct `dcapi` `SessionTranscript`, classify optional `readerAuth`, run Holder review, call the Holder-store boundary, build the SMART response, place it in the issuer-signed `smart_health_checkin_response` element, and return the HPKE-sealed `dcapiResponse`.

This split is platform machinery. It should not create alternate request carriers, dynamic element encodings, plaintext response paths, Android-specific protocol fields, or a display label that is mistaken for requester identity.

#### 15.2.7 iOS / Safari considerations

SMART Health Check-in 1.0 does not define a separate iOS, Safari, native-app, browser-extension, or custom-URL binding. Implementations on other platforms should preserve the same §8 invariants when claiming live version 1.0 presentation support: direct `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable element `smart_health_checkin_response`, direct `dcapi` `SessionTranscript`, and the specified HPKE suite with empty AAD.

If a platform cannot supply authenticated origin or an approved origin-equivalent, or cannot support the direct §8 flow, describe the gap as a platform or deployment limitation. Do not compensate by adding requester identity metadata to the SMART request body or by treating a deep link, custom URL scheme, app-to-app callback, or relay as an equivalent standardized version 1.0 presentation protocol.

### 15.3 EHR ingestion

EHR ingestion begins after the Verifier has accepted the presentation response as protocol-valid. Ingestion is local workflow, not automatic protocol success. A valid SMART Health Check-in response can still be unsuitable for automatic import because of patient-match uncertainty, missing provenance, unsupported FHIR version, insufficient profile evidence, stale data, Holder refusal, partial fulfillment, or local policy.

A receiving system should keep these decisions separate:

1. protocol validation under §§6-8;
2. trust assessment for origin, optional reader authentication, mdoc issuer/device evidence, and clinical-source evidence;
3. patient and encounter matching under local policy;
4. Artifact-specific parsing and validation;
5. clinical-source provenance assessment;
6. deduplication, reconciliation, and conflict handling; and
7. persistence, routing, audit, quarantine, deletion, or staff-review decisions.

For `application/smart-health-card` Artifacts, verify each JWS, evaluate issuer trust under local policy, inspect signed FHIR payloads, and decide whether the signed content satisfies the original selectors and workflow requirements. A valid SMART Health Card signature does not guarantee that every requested item is complete, current, patient-matched, or suitable for write-back.

For `application/fhir+json` Artifacts, use the Artifact-level `fhirVersion` to choose parsers and validators, inspect `resourceType`, `Bundle.entry[].resource`, `meta.profile[]`, `QuestionnaireResponse.questionnaire`, identifiers, references, Provenance resources, signatures, and any implementation-guide-specific constraints required locally. Treat raw FHIR JSON as patient-mediated unless separate accepted provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present. The mdoc issuer signature, device proof, HPKE opening, reader authentication, `requestId` match, Artifact id, `fulfills[]`, or Holder approval does not by itself prove that unsigned raw FHIR came from an EHR.

Status accounting should survive ingestion. `requestStatus[]` accounts for every requested item exactly once. `fulfills[]` identifies which Artifact payloads support one or more items. A `fulfilled` or `partial` item usually has at least one fulfilling Artifact; `declined`, `unavailable`, or `unsupported` items usually do not. Receivers should flag mismatches for review, but should not infer fulfillment from an Artifact reference without the corresponding status entry, and should not infer clinical facts from non-fulfilled statuses.

Deduplicate and reconcile using clinical payload evidence and local rules rather than SMART Health Check-in wrapper ids alone. Request ids, item ids, Artifact ids, presentation-session values, mdoc identifiers, and launch handles are scoped accounting or transport values. They are not patient identifiers, global document identifiers, source-system ids, Provenance ids, or record ids unless the Artifact payload or deployment policy independently establishes that meaning.

Telemetry and operational logs around ingestion can be as sensitive as the payload. Minimize stored plaintext requests, responses, raw FHIR, SMART Health Cards, Questionnaire answers, item-level refusal details, origins, certificate subjects, launch handles, validation failures, and support traces. Operator-facing errors should help recovery without exposing unnecessary clinical details, secrets, stack traces, token values, source-system internals, or valid-id enumeration clues.

### 15.4 SDK packaging guidance

SDKs are most useful when they preserve the protocol's layer boundaries and expose testable seams rather than a single monolithic “check-in” function.

A typical SDK family can be organized as:

- **Core clinical model package:** request and response types, parsers, duplicate-key-aware JSON handling where available, selectors, core Artifact variants, status codes, canonical parsing and preservation, schema helpers, and §6.6 cross-validation utilities. This package should not depend on browser APIs, React, Android/iOS UI, CBOR, COSE, HPKE, mdoc, relay storage, demo assets, or EHR-specific ingestion policy.
- **FHIR helper package:** canonical resolver interfaces, package-cache or FHIR-search resolution hooks, profile-family matcher interfaces, Bundle traversal, `meta.profile` and `QuestionnaireResponse.questionnaire` helpers, SMART Health Card payload inspection hooks, and optional FHIR validator adapters. It should distinguish full FHIR validation from core protocol validation.
- **Verifier same-device package:** fixed §8 identifiers, `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, optional `readerAuth`, Digital Credentials API request construction, HPKE private-material custody seams, response opening, mdoc validation, stable-element extraction, layered validation reports, and fixture import/export.
- **Wallet clinical core package:** SMART request parsing, item classification, Holder decision models, holder-store interfaces, response construction, status accounting, QuestionnaireResponse helpers, and validation of every fulfillment edge.
- **Wallet same-device transport package:** platform invocation adapters, request matching, tag-24 and CBOR handling, origin and reader-auth classification, issuer-signed item creation, MSO/digest/device-authentication construction, HPKE sealing, and platform result wrapping.
- **UI and framework bindings:** React hooks, Web Components, Compose screens, SwiftUI views, server middleware, EHR adapters, localization helpers, and debug panels that orchestrate the lower layers without redefining wire fields or trust semantics.
- **Fixture and conformance tools:** JSON Schema runners, CDDL/CBOR inspectors, byte-ladder generators, negative vectors, trust-material labeling, and diagnostic export controls.

SDK APIs should make unsafe shortcuts hard. Avoid a `GenericArtifact` class for core handling. Model `application/fhir+json` and `application/smart-health-card` as concrete variants, and require extension Artifacts to be explicit branded media-type-defined variants with their own typed fields. Do not infer dereferencing, integrity, expiration, authorization, FHIR-version, or merge semantics from fields named `value`, `url`, `data`, or `document`.

Expose structured validation reports rather than only throwing strings. Reports can distinguish request-shape errors, selector errors, canonical-resolution errors, presentation-wrapper errors, HPKE errors, mdoc validation errors, SMART response shape errors, cross-validation errors, FHIR payload errors, SMART Health Card errors, provenance status, and deployment-policy failures. Applications can map those reports to safe recovery text without logging sensitive payloads.

SDK examples and tests should stay current with the normative model. Include positive and negative coverage for flattened Questionnaire selectors, `profilesFrom[]` arrays, additive `profiles[]` plus `profilesFrom[]`, exact preservation of versioned canonicals, no `GenericArtifact` fallback, `application/fhir+json` with `fhirVersion`, `application/smart-health-card` with `value.verifiableCredential[]` and no outer `fhirVersion`, exact §8 identifiers, `DeviceRequest.version` `"1.0"`, optional per-`DocRequest.readerAuth`, exact `encryptionInfo` transcript binding, HPKE `info = SessionTranscript` with empty AAD, and §6.6 request-aware validation. Archived kiosk, pointer, relay, OID4VP, or dynamic-element experiments should be labeled historical or future work rather than exported as SMART Health Check-in 1.0 protocol APIs.

Finally, SDK documentation should state conformance scope precisely. A package can support the core clinical model without implementing live same-device presentation. A DC API verifier package can implement §8 without defining EHR ingestion. A fixture package can provide diagnostic captures without claiming production issuer trust. Clear package boundaries help implementers compose the profile without accidentally standardizing deployment-local behavior.
