## 15. Implementation notes

This section collects implementation guidance for products that build on the normative SMART Health Check-in 1.0 protocol. It is informative. The requirements for interoperability are defined in the clinical request and response model (§§5-6), the trust framework (§7), the same-device direct `org-iso-mdoc` flow (§8), and the cross-cutting conformance, security, privacy, registry, and internationalization sections (§§4 and 11-14). The notes below describe practical ways to implement those requirements without adding a separate wire protocol or changing the meaning of the normative fields.

SMART Health Check-in 1.0 has two normative layers: the transport-neutral SMART request and SMART response, and the same-device direct `org-iso-mdoc` presentation flow over the W3C Digital Credentials API. In-person QR, NFC, deep-link, kiosk, desktop, staff-handoff, relay, and completion-screen behavior can be useful deployment UX, but those mechanisms are not standardized as pointer, envelope, relay, submission, or completion protocols in version 1.0. A deployment that uses a QR code or NFC tag typically uses it to land the Holder on a same-device Verifier page; that page then runs the §8 flow.

### 15.1 Verifier app

A Verifier app usually has three layers: a workflow UI that lets a portal, pre-visit, or in-person page decide what to ask for; a SMART request builder for the §5 clinical model; and a same-device Verifier implementation that prepares `org-iso-mdoc` request material, invokes the Digital Credentials API, opens the encrypted response, validates mdoc evidence, and applies §6.6 request/response cross-validation.

#### 15.1.1 Building the request from a UI form

Request-building UI should generate the actual §5 SMART request, not a local topic vocabulary that is later guessed by the Wallet. Practical request builders commonly expose checkboxes or templates for demographics, coverage, medications, allergies, conditions, visit-specific forms, or broad health-summary requests, but the output should be expressed as request items with stable item ids, Holder-facing `title` and optional `summary`, a selector in `content`, and an ordered `accept[]` list.

Common request-construction mistakes include:

- treating `purpose`, `title`, `summary`, launch-page text, logos, clinic names, callback URLs, or kiosk labels as authenticated requester identity. Those values are Holder-facing context only. Origin, reader authentication, and deployment trust policy are separate layers;
- encoding requester names, origins, endpoints, reader certificates, logos, trust assertions, pointer metadata, relay state, completion URLs, or kiosk routing fields inside the SMART request body. Such fields make the clinical request look self-authenticating when it is not;
- using local strings such as `"insurance"`, `"clinical-history"`, or `"all"` as if they were FHIR resource types or registered selector kinds. `resourceTypes[]` values are FHIR resource type names, and extension selector kinds need their own registration or deployment profile;
- encoding `profilesFrom` as a single string, package descriptor, NPM package name, registry alias, or local topic. In version 1.0 it is an array of canonical profile-family URLs;
- interpreting `profiles[]` plus `profilesFrom[]` as an intersection. They are additive profile selectors; `resourceTypes[]`, when present, is the separate resource-type constraint;
- using the old nested Questionnaire shape, such as `{ "kind": "questionnaire", "questionnaire": "..." }` or `{ "questionnaire": { "canonical": ..., "resource": ... } }`. The version 1.0 selector is flat: `{ "kind": "questionnaire", "canonical": ... }`, `{ "kind": "questionnaire", "resource": ... }`, or both sibling fields together;
- putting unsupported media types in `accept[]` because they seem plausible. The Verifier and downstream receiver should be able to parse, validate, and route any Artifact media type they advertise; and
- treating `required: true` as consent or as an instruction to the Wallet. It is only advisory workflow context.

Request builders that support versioned FHIR canonicals should parse `canonical|version` into `(url, version?)` for resolution and matching while preserving the original string exactly for values that are carried, echoed, logged in controlled diagnostics, returned in `QuestionnaireResponse.questionnaire`, or preserved in `meta.profile`. A versioned canonical should not be resolved by stripping the suffix and directly fetching the bare URL. Use a configured canonical resolver, FHIR package cache, terminology or IG resolver, or FHIR canonical search that consumes both `url` and `version`.

#### 15.1.2 Holding HPKE private material

The same-device §8 flow requires the Verifier to retain the HPKE recipient private key and the exact `encryptionInfo` base64url string until response processing completes or the session is abandoned. There are two common implementation patterns.

In a browser-local pattern, the Verifier page builds the SMART request, creates the §8 `DeviceRequest` and `encryptionInfo`, keeps the HPKE private key in browser memory, calls `navigator.credentials.get`, opens the returned `dcapiResponse`, and validates the SMART response locally. This is convenient for demos, static pages, and local development. It also means the browser page becomes the place where decrypted `DeviceResponse` bytes, SMART response JSON, and validation diagnostics can appear, so logging and debug panels need production controls.

In a server-owned pattern, the browser asks a backend authority to prepare the Digital Credentials API request. The backend stores the HPKE private key and session state behind an opaque handle. The browser calls `navigator.credentials.get` with public request material and returns the credential result to the backend for HPKE opening, mdoc validation, SMART response validation, audit, and workflow routing. This pattern can better support production audit and kiosk-like deployments, but it does not make the kiosk or relay a SMART Health Check-in protocol layer. It is still a deployment-specific way to run the same §8 same-device page and receive a validated SMART response.

Whichever pattern is used, implementations should separate request state, HPKE key material, origin/transcript inputs, reader-authentication evidence, opened plaintext, and downstream workflow records. Request ids, item ids, Artifact ids, launch handles, relay ids, and completion ids should not be reused as freshness proofs or as identifiers for other layers.

#### 15.1.3 Validating the response

Verifier-side validation is more than JSON shape validation. A useful implementation pipeline is:

1. retain the original SMART request object and exact request id;
2. require the returned Digital Credentials protocol to be `org-iso-mdoc`;
3. parse `data.response` as unpadded base64url CBOR for `dcapiResponse = ["dcapi", { enc, cipherText }]`;
4. reconstruct the expected `SessionTranscript` from the original exact `encryptionInfo` base64url string and origin;
5. HPKE-open using DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD;
6. validate the `DeviceResponse`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, issuer-signed element `smart_health_checkin_response`, MSO digest binding, issuer evidence under policy, and device signature;
7. extract the `elementValue` SMART response JSON string;
8. validate the §6 response shape; and
9. apply §6.6 cross-validation against the original request.

The §6.6 step catches many interoperability failures that schemas alone cannot catch: `requestId` mismatch; unknown, missing, duplicate, or malformed `fulfills[]` item ids; Artifact `mediaType` values that are not accepted by every fulfilled item; missing or duplicate `requestStatus[]` entries; invalid status codes; raw FHIR Artifacts without `fhirVersion`; SMART Health Card Artifacts with an outer `fhirVersion`; and returned FHIR or QuestionnaireResponse content that does not provide the expected evidence for the requested selector.

A Verifier should avoid creating a `GenericArtifact` path for unknown media types. Version 1.0 core Artifacts are `application/fhir+json` and `application/smart-health-card`. Extension Artifacts are branded, media-type-defined variants with typed payload rules. If a Verifier does not recognize an Artifact media type, it should reject or quarantine it rather than guessing from fields named `value`, `url`, `data`, or `document`.

#### 15.1.4 Diagnostics, fixtures, and support bundles

Implementations benefit from diagnostics that expose the request builder output, Digital Credentials request argument, decoded mdoc structures, `SessionTranscript`, HPKE opening result, extracted SMART response, and §6.6 validation report. Those diagnostics should be designed as controlled debug or fixture features, not as production telemetry defaults.

Support bundles and logs should avoid routine collection of plaintext SMART requests, SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, private keys, bearer URLs, access tokens, full QR URLs, full ciphertext blobs, and unredacted stack traces. Fixture material that includes demo private keys, self-signed certificates, decrypted bytes, or sample clinical JSON should be clearly labeled as test material. A production crash bundle containing live PHI, bearer credentials, or reusable request-opening material is sensitive production data, not an ordinary conformance artifact.

### 15.2 Wallet implementation guidance

A Wallet implementation typically has a thin platform entry point, a same-device `org-iso-mdoc` request parser, a transport-neutral SMART request adapter, a Holder review and consent UI, a Holder data-source boundary, a SMART response factory, and a same-device response builder.

#### 15.2.1 Origin, reader trust, and display

Wallets should keep authenticated trust signals visually and logically separate from unauthenticated request display text. The origin or origin-equivalent used for §8 `SessionTranscript` construction should come from the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It should not be derived from the SMART request body, `purpose`, item text, selector URLs, launch-page text, QR URL, package-looking strings, or returned Artifact content.

When optional per-`DocRequest.readerAuth` is present, Wallets that support or rely on it should classify it carefully: absent, malformed, cryptographically failed, cryptographically valid but untrusted or policy-unacceptable, or trusted under deployment policy. The presence of `readerAuth`, an `x5chain`, a common name, a logo, or a demo certificate is not the same as trusted reader authentication.

Holder-facing UI can show request context such as `purpose`, item `title`, item `summary`, profile URLs, media types, and Questionnaire text, but should not label those values as verified organization identity. If authenticated origin, trusted reader information, issuer/device evidence, or local-policy warnings are shown, they should be distinguished from the requester's unauthenticated clinical display text.

#### 15.2.2 Consent screen design

The request item is the protocol's Holder-review and response-accounting unit. Wallet UI can group, summarize, reorder, translate, or suppress details for accessibility, localization, clinical safety, or policy reasons, but it should preserve meaningful Holder control over the requested items and should preserve item ids exactly for `fulfills[]` and `requestStatus[].item`.

Consent screens should make broad selectors and accepted response forms understandable. For example, an item using `profilesFrom: ["http://hl7.org/fhir/us/core"]` is broader than a single Coverage request. An item that accepts `application/fhir+json` and `application/smart-health-card` may produce different provenance and ingestion properties depending on which Artifact form is returned. The UI should not let `required: true`, mdoc `intentToRetain`, a QR scan, a page button, or a same-device invocation substitute for Holder review.

Wallets should treat `declined`, `partial`, `unavailable`, `unsupported`, and `error` as normal item-level outcomes, not necessarily as transport failures. `unsupported` is appropriate when the Wallet cannot understand the selector shape, Questionnaire, media type, FHIR version, or extension semantics. `unavailable` is appropriate when the Wallet understands the request but lacks matching shareable data. `declined` records Holder refusal or policy that implements Holder preference. `partial` is often preferable to overclaiming complete fulfillment when only some relevant content is returned.

#### 15.2.3 Holder-store interface

Production Wallets should put patient data lookup, source selection, redaction, local clinical policy, sensitivity handling, and matching logic behind an app-owned Holder data-source interface. The protocol does not require longitudinal Wallet storage, a particular issuance mechanism, a connected FHIR API, or a particular local database. A Wallet can use SMART Health Cards, cached FHIR resources, issuer-provided credentials, connected services, local files, or other Holder data sources, provided the returned Artifacts and status accounting follow §6.

The Holder-store boundary is also where implementations can avoid over-disclosure. It can decide whether to split raw FHIR content into separate Artifacts, whether one Artifact accurately fulfills several request items, whether a broad request should be partially fulfilled, and whether sensitive content should be withheld or separately confirmed. It should not manufacture `meta.profile` claims, source provenance, or wrapper-level profile summaries that are not supported by the payload or trusted local evidence.

#### 15.2.4 Profile-family and FHIR resource matching

Wallet matching code should treat `fhir.resources` selectors as FHIR-native constraints, not as free-text topics. `profiles[]` can match explicit `meta.profile` values or equivalent trusted local conformance evidence. `profilesFrom[]` identifies profile families such as implementation guides or profile collections and often requires package metadata, implementation-guide knowledge, configured family maps, or local policy. `resourceTypes[]` uses official FHIR resource type names and constrains the responsive resource type when present.

When exact-version profile matching matters, a Wallet should preserve and compare versioned canonicals at the right level. A versioned `profiles[]` request value should not be satisfied by stripping `|version` and matching only the base canonical unless the Wallet has equivalent local evidence for the exact requested version. Returned raw FHIR resources should preserve known `meta.profile` strings exactly, including `|version` suffixes.

For raw FHIR JSON, each `application/fhir+json` Artifact should have one `fhirVersion` that applies to the single Resource or to the Bundle and all `Bundle.entry[].resource` entries. Content that requires different FHIR releases is better represented as separate Artifacts or as a partial/unavailable/unsupported/error outcome than as a mixed-version Bundle.

#### 15.2.5 QuestionnaireResponse construction

Questionnaire selectors use the flat shape `content.kind = "questionnaire"` with direct `canonical` and/or `resource` members. Wallets should reject or report `unsupported` for legacy nested shapes rather than silently coercing them, because silent compatibility can hide interop bugs.

When both `canonical` and inline `resource` are present, the canonical is the Requester's explicit Questionnaire identity and the inline resource is the body to render or use. A Wallet should check consistency among the parsed canonical URL and version, `resource.url`, `resource.version`, and item structure. Material disagreement is usually better reported as `unsupported` before answers are collected, or `error` if a failure occurs during rendering, collection, conversion, or response construction after the Questionnaire was otherwise understood.

When generating a FHIR `QuestionnaireResponse`, the Wallet should preserve the requested Questionnaire canonical exactly in `QuestionnaireResponse.questionnaire` when that canonical is known and is the identity being answered. If only an inline Questionnaire is present, the Wallet can derive a canonical from `Questionnaire.url` and `Questionnaire.version` when appropriate; it should not invent a misleading canonical solely to satisfy a receiver field preference.

#### 15.2.6 Android Credential Manager matcher / handler split

On Android, the Credential Manager matcher is best treated as an eligibility filter, not as the protocol implementation. A small matcher can look for `org-iso-mdoc` and the SMART Health Check-in `docType` `org.smarthealthit.checkin.1` in the incoming request so the wallet entry appears only for relevant Digital Credentials requests. The matcher should not try to perform FHIR matching, Questionnaire rendering, consent, HPKE, COSE, or response construction.

The handler or wallet activity owns the real protocol work: parse `data.deviceRequest` and `data.encryptionInfo`, locate the tag-24 `ItemsRequest`, extract `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, reconstruct the §8 `SessionTranscript`, classify or verify `readerAuth`, adapt the SMART request for Holder review, call the Holder-store boundary, build the SMART response, place it in the `smart_health_checkin_response` issuer-signed element, and return the HPKE-sealed `dcapiResponse`.

Keeping this split helps avoid a class of bugs where a platform registration or matcher label is mistaken for requester identity, protocol validation, or clinical content support.

#### 15.2.7 iOS, Safari, and other platform considerations

The normative protocol is platform-neutral at the Verifier and Wallet roles, but same-device invocation depends on browser, operating-system, and wallet APIs. Implementations on platforms other than the active Android/Chrome path should first reproduce the §8 invariants: direct `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable element `smart_health_checkin_response`, direct `dcapi` `SessionTranscript`, and the specified HPKE suite with empty AAD.

If a platform cannot supply an authenticated origin or approved origin-equivalent for the transcript, the implementation should treat origin trust as absent or follow a deployment profile that explicitly defines the substitute input and assurance level. It should not use page text, launch URLs, request fields, or branding as a transcript or identity substitute.

### 15.3 EHR ingestion of returned artifacts

EHR ingestion begins after protocol validation; it is not itself standardized by SMART Health Check-in 1.0. A receiving system can import, reconcile, attach, route, display, amend, quarantine, or discard returned content according to local workflow, law, patient-matching policy, clinical-source trust policy, and record-management rules. Those decisions do not change the SMART response's protocol validity.

A practical ingestion pipeline keeps these stages distinct:

1. protocol validation under §§6-8;
2. trust assessment for origin, reader, mdoc issuer/device evidence, and clinical-source evidence;
3. patient matching and encounter/workflow correlation under local policy;
4. Artifact-specific parsing and validation;
5. clinical-source provenance assessment;
6. deduplication, reconciliation, and conflict handling; and
7. persistence, routing, audit, or quarantine decisions.

Raw `application/fhir+json` Artifacts should be treated as patient-mediated unless separate accepted evidence supplies provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof. The mdoc issuer signature, device proof, HPKE opening, reader authentication, `requestId` match, Artifact id, `fulfills[]`, or Holder approval does not by itself prove that unsigned raw FHIR came from an EHR. A receiver may still accept raw FHIR for a workflow under local policy, but it should not label it as source-signed clinical content unless the payload or deployment profile supports that claim.

SMART Health Card Artifacts have different ingestion behavior. The receiver should verify each JWS in `value.verifiableCredential[]` according to SMART Health Cards and local trust policy, inspect the signed FHIR payload, and then decide whether the signed content satisfies the original selectors and local workflow requirements. A valid SMART Health Card signature is not the same as a guarantee that every requested item is complete, current, patient-matched, or suitable for automatic write-back.

The relationship among `requestStatus[]`, `artifacts[]`, and `fulfills[]` is important for ingestion. `requestStatus[]` accounts for every requested item exactly once. `fulfills[]` identifies which Artifact payloads support one or more items. A `fulfilled` or `partial` item usually has at least one fulfilling Artifact; `declined`, `unavailable`, or `unsupported` items usually do not. Receivers should flag mismatches for review, but should not infer fulfillment from an Artifact reference without the corresponding status entry, and should not infer clinical facts from non-fulfilled statuses.

Deduplication should be based on Artifact payload evidence and local clinical rules, not on SMART Health Check-in ids alone. Request ids, item ids, and Artifact ids are scoped accounting values. They are not patient identifiers, global document identifiers, source-system ids, Provenance ids, or record ids unless the Artifact payload or deployment policy independently establishes that meaning.

For raw FHIR ingestion, receivers should inspect the actual FHIR content: `resourceType`, `Bundle.entry[].resource`, `meta.profile[]`, `QuestionnaireResponse.questionnaire`, `fhirVersion`, identifiers, references, Provenance resources, signatures, and any implementation-guide-specific constraints they require. They should preserve returned canonical strings and profile values exactly where they are recorded or forwarded, especially versioned canonicals. Stripping `|version` during ingestion can erase the evidence needed to distinguish exact-profile claims from base-canonical matches.

Telemetry and operational logs around ingestion can be as sensitive as the payload. Ingestion systems should minimize stored plaintext requests, responses, raw FHIR, SMART Health Cards, Questionnaire answers, item-level refusal details, origins, certificate subjects, launch handles, validation failures, and support traces. Operator-facing errors should help staff recover without exposing unnecessary clinical details or enabling enumeration of valid request ids or patient state.

### 15.4 SDK packaging guidance

SDKs are easiest to adopt and test when they preserve the protocol's layer boundaries. A recommended packaging pattern is:

- a transport-neutral core package for SMART request and response types, shape validation, canonical parsing helpers, media-type constants, status constants, and request/response cross-validation;
- a Verifier same-device package for Digital Credentials API direct `org-iso-mdoc` request preparation, HPKE recipient state, `navigator.credentials.get` argument construction, response opening, mdoc validation, and debug artifact redaction;
- optional framework bindings, such as React hooks or components, that remain thin wrappers over the core and Verifier packages;
- native Wallet core libraries for request adaptation, Holder-review models, response construction, QuestionnaireResponse building, and Holder-store interfaces;
- native same-device transport libraries for CBOR, COSE, HPKE, `SessionTranscript`, readerAuth, mdoc response construction, and fixed §8 identifiers; and
- platform registration or UI packages that integrate with Android Credential Manager, Compose, iOS wallet APIs, or browser support without owning clinical semantics.

Core packages should not depend on React, Compose, Credential Manager, browser globals, CBOR, COSE, HPKE, demo assets, kiosk relays, or EHR ingestion code. Same-device transport packages should not own FHIR matching, Holder data lookup, consent policy, or downstream clinical ingestion. UI packages should not parse mdoc or make trust decisions from unauthenticated display strings. This separation makes it easier to test each layer and reduces the chance that implementation-defined deployment UX becomes mistaken for a protocol requirement.

SDKs should expose constants for the fixed §8 values rather than requiring applications to retype them: Digital Credentials protocol `org-iso-mdoc`, mdoc `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable response element `smart_health_checkin_response`, requestInfo key `org.smarthealthit.checkin.request`, `DeviceRequest.version` `"1.0"`, and the HPKE and COSE algorithm choices. They should also expose helpers for exact base64url-without-padding handling and for preserving the exact `encryptionInfo` string used in `SessionTranscript` construction.

Validation APIs should make the difference between structural validation and procedural cross-validation explicit. For example, a core validator can say whether a JSON object has the SMART response shape, while a separate request-aware function validates `requestId`, `fulfills[]`, media-type acceptance, status coverage, FHIR-version rules, and selector evidence. Returning structured error codes rather than only strings helps UI, tests, and ingestion systems decide whether to reject, quarantine, ask the Holder to retry, or continue with reduced assurance.

Extension support should be opt-in and typed. Adding an extension Artifact should mean adding a branded media-type variant with a pinned `mediaType` or bounded media-type pattern and well-defined payload fields. It should not mean widening the core Artifact union to an unbounded `GenericArtifact` with arbitrary `value`, `url`, or `data` semantics. Similarly, extension selector kinds should be represented as registered or profiled shapes, not as display labels or profile shortcuts.

SDK examples should be kept current with the normative model. In particular, examples should use the flattened Questionnaire selector; `profilesFrom[]` as an array; additive profile selectors; `application/fhir+json` with `fhirVersion`; `application/smart-health-card` with `value.verifiableCredential[]` and no outer `fhirVersion`; exact preservation of versioned canonicals; and same-device direct `org-iso-mdoc` constants. Archived kiosk, pointer, relay, or OID4VP experiments should be labeled as historical or future work and should not be exported from primary packages as SMART Health Check-in 1.0 protocol APIs.

Finally, SDKs should make safe diagnostics possible. Public artifact helpers can redact HPKE private keys, bearer URLs, access tokens, raw clinical payloads, and production trust material while preserving enough decoded structure to debug request construction, transcript derivation, mdoc validation, and §6.6 failures. Fixture APIs should identify whether a vector is conformance candidate, diagnostic, historical capture, implementation regression, or illustrative example, and should mark demo keys and self-signed certificates as non-production.
