## 15. Implementation notes

This section is informative. It offers implementation patterns for the protocol defined elsewhere, but does not create additional conformance obligations. Implementers should treat §§5-6 as the source of truth for the transport-neutral clinical request/response model, §§7-8 as the source of truth for same-device direct `org-iso-mdoc` presentation and trust processing, and §§11-14 plus the appendices as cross-cutting validation, registry, privacy, internationalization, schema, CDDL, and fixture guidance.

SMART Health Check-in 1.0 has two normative layers only:

1. the clinical SMART request and SMART response JSON objects; and
2. the same-device presentation flow using W3C Digital Credentials API direct `org-iso-mdoc`.

In-person QR, NFC, deep-link, kiosk, staff handoff, relay, and completion displays can be useful deployment UX. They should land the Holder on a same-device Verifier page that runs §8, but their URL shapes, pointer records, storage, relay behavior, submission steps, and completion displays are not SMART Health Check-in 1.0 wire protocols.

A robust implementation usually separates:

- clinical model code for request/response validation, selectors, media types, statuses, and §6.6 cross-validation;
- verifier transport code for Digital Credentials API, CBOR, COSE, mdoc, HPKE, `SessionTranscript`, and response extraction;
- wallet transport code for parsing §8 requests, classifying trust signals, and encrypting §8 responses;
- wallet data-source and consent code for Holder review and Artifact construction;
- EHR ingestion code for patient matching, provenance evaluation, deduplication, reconciliation, persistence, and audit; and
- fixture/conformance tooling that states which protocol layer and comparison mode it exercises.

### 15.1 Verifier app

A Verifier app packages a SMART request for same-device presentation, opens the returned presentation, validates the SMART response against the original request, and passes only validated results to the Requester or downstream workflow. The same product may act as Requester and Verifier, but keeping those responsibilities separate reduces mistakes: request construction is clinical and workflow-oriented; presentation construction is byte- and trust-oriented.

#### 15.1.1 Building the request from a UI form

Request authoring should begin with what the downstream receiver can process. For each request item, collect or generate:

- a session-scoped item `id` that is not a patient identifier, source document id, secret, or cross-session tracker;
- Holder-facing `title` and, when useful, `summary`;
- an advisory `required` value only when it helps explain workflow importance;
- a `content` selector using a core or registered selector shape; and
- an ordered `accept[]` list containing only Artifact media types the receiver can parse, validate, route, and ingest for that item.

For FHIR resource requests, use `profiles[]` for exact `StructureDefinition` canonicals, `profilesFrom[]` for canonical profile-family URLs, and `resourceTypes[]` for official FHIR resource type names. `profiles[]` and `profilesFrom[]` are additive: a resource can match either exact profile evidence or profile-family membership, subject to `resourceTypes[]` and the rest of the item. UI labels should not imply that exact profiles narrow a profile-family request.

For questionnaire requests, generate the flattened selector shape only:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/intake|1.2.3",
  "resource": { "resourceType": "Questionnaire" }
}
```

At least one of `canonical` or `resource` is present, and both are direct members of the selector. Legacy nested forms such as `questionnaire: "..."` or `questionnaire: { "canonical": "...", "resource": ... }` are invalid SMART Health Check-in 1.0 selector shapes. Authoring tools that supply both canonical and inline resource should check consistency between the parsed canonical URL/version and `Questionnaire.url` / `Questionnaire.version` when those FHIR fields are present.

Canonical handling should use a shared parser. Parse `canonical|version` into `(url, version?)` while preserving the original wire string exactly for fixtures, diagnostics, returned `meta.profile`, and generated `QuestionnaireResponse.questionnaire`. Versioned canonicals should be resolved through a configured resolver, package cache, terminology service, implementation-guide resolver, or FHIR search using both `url` and `version`; do not satisfy a versioned canonical by stripping `|version` and directly fetching the bare URL.

The request body should not carry requester identity or presentation metadata. Organization names, origins, logos, callback URLs, package names, certificates, trust-framework labels, pointer ids, relay ids, and completion endpoints belong to the application shell, deployment policy, or presentation transport, not to the §5 clinical JSON.

#### 15.1.2 Holding HPKE private material

The Verifier needs the HPKE recipient private key, the exact `encryptionInfo` base64url string, the origin used for the request, and the original SMART request until the response is opened or the session is abandoned.

A browser-local Verifier authority keeps this material in browser memory. This is convenient for static demos, test pages, and same-device portals because the page builds the request, calls `navigator.credentials.get`, opens the returned response, and validates the SMART response. It also means debug logs, console events, crash reports, and screenshots need careful redaction because request-opening material and decrypted clinical content may be present in the page process.

A server-owned Verifier authority lets the browser receive public request material and an opaque handle while a backend stores the HPKE private key, original request, expected origin, and transcript inputs. After `navigator.credentials.get` returns, the browser sends the result and handle to the backend for HPKE opening and validation. This can better support production key custody, audit, and EHR ingestion, but it requires session storage, replay controls, and sensitive handling of encrypted responses and opened plaintext.

Whichever model is used, use fresh HPKE recipient keys and fresh unpredictable nonces for presentation sessions unless a deployment profile defines safe reuse. Preserve the exact unpadded `encryptionInfo` base64url string because §8 binds that text string into the `SessionTranscript`; decoding and re-encoding to a different spelling changes the transcript input.

#### 15.1.3 Same-device request construction

Verifier transport code should keep the §8 constants in a small audited table:

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| `DeviceRequest.version` | `1.0` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| namespace | `org.smarthealthit.checkin` |
| response element | `smart_health_checkin_response` |
| request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| HPKE `info` and `aad` | `SessionTranscript` bytes and empty byte string |

Serialize the SMART request as UTF-8 JSON text and place that text string in the `requestInfo` key above. Do not use dynamic mdoc element names, base64url-encoded request JSON, or alternate request carriers for the core version 1.0 flow. Request only the stable element `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`; model FHIR profiles, request items, questionnaires, and statuses inside the SMART response, not as separate mdoc elements.

The mdoc `intentToRetain` value for the stable response element defaults to `true` for ordinary clinical check-in workflows. A Verifier can set it to `false` only when it truly intends ephemeral use and applicable deployment policy permits that signal. The flag is not Holder consent and does not override Wallet policy, law, or downstream retention requirements.

If reader authentication is deployed, construct optional per-`DocRequest.readerAuth` over the exact tag-24 `ItemsRequest` bytes and the same `SessionTranscript` used by the session. Version 1.0 uses `DeviceRequest.version` `"1.0"` and per-DocRequest `readerAuth`; do not substitute `readerAuthAll` from `DeviceRequest` `"1.1"` for the core profile unless a future profile defines it.

#### 15.1.4 Validating the response

Implement response processing as a layered pipeline that records separate outcomes:

1. returned Digital Credentials protocol and direct `dcapiResponse` wrapper;
2. HPKE opening with the retained private key, required suite, `info = SessionTranscript`, and empty AAD;
3. CBOR `DeviceResponse` version, status, and expected `docType`;
4. MSO / `issuerAuth` validation, validity information, value-digest checks, and issuer trust-policy evaluation;
5. device authentication with the MSO device key and expected `SessionTranscript`;
6. extraction of `smart_health_checkin_response` from namespace `org.smarthealthit.checkin`;
7. SMART response shape validation under §6;
8. §6.6 cross-validation against the original SMART request;
9. Artifact-specific validation, such as SMART Health Card JWS verification or FHIR payload inspection; and
10. downstream clinical acceptance and ingestion policy.

Failures in layers 1-8 generally mean the response is not protocol-valid for Requester use. Failures in Artifact-specific or downstream clinical checks may lead to quarantine, manual review, partial ingestion, or workflow fallback even when the SMART response is structurally valid.

For §6.6, shape validation alone is insufficient. Compare `requestId` to the original request `id`; ensure every `fulfills[]` value resolves to an original item; ensure each Artifact `mediaType` is recognized and accepted by every fulfilled item; ensure `requestStatus[]` covers every item exactly once; validate raw FHIR JSON `fhirVersion` and Bundle shape; reject outer `fhirVersion` on SMART Health Card Artifacts; and inspect FHIR selector evidence where local policy requires it.

Unknown Artifact media types should not be accepted through generic carrier heuristics. Version 1.0 core Artifacts are only `application/smart-health-card` and `application/fhir+json`. Extension Artifacts need a supported branded media-type definition with typed payload fields.

#### 15.1.5 Failure handling and diagnostics

Verifier UX should distinguish browser support failure, user cancellation, request validation failure, platform error, HPKE/mdoc/trust validation failure, SMART response cross-validation failure, item-level status outcomes, and downstream ingestion failure. Item-level `declined`, `partial`, `unavailable`, `unsupported`, and `error` are normal protocol outcomes when the request was otherwise valid enough to answer.

Support artifacts are valuable when explicitly bounded. Useful fixture/debug material includes the SMART request JSON, `DeviceRequest`, tag-24 `ItemsRequest`, `encryptionInfo`, exact `encryptionInfo` base64url string, `SessionTranscript`, optional `readerAuth`, returned `dcapiResponse`, decrypted `DeviceResponse`, extracted SMART response JSON, and validation reports. Production exports should redact or omit private keys, live PHI, SMART Health Card JWSs, raw FHIR resources, Questionnaire answers, bearer URLs, full launch URLs, and unredacted stack traces unless an authorized incident or audit process governs the export.

Fixture manifests should say whether comparison is byte-exact, structural, semantic, diagnostic, historical, or illustrative. Test keys, demo certificates, deterministic randomness, decrypted payloads, and self-attested issuer material should be labeled as non-production.

### 15.2 Wallet implementation guidance

A Wallet/Responder combines platform invocation, same-device request parsing, trust classification, Holder review, holder-data lookup, response construction, mdoc packaging, and HPKE encryption. These concerns should remain separate so platform-specific code does not leak into the clinical model and clinical data policy does not depend on CBOR or Credential Manager APIs.

#### 15.2.1 Platform invocation and origin policy

On platforms with a Credential Manager or similar broker, registration and matching should be narrow. A matcher can advertise handling for direct `org-iso-mdoc` requests with `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`. It should not perform Holder consent, fetch clinical data, or build a response.

Origin, privileged-browser, verified-app-link, package identity, signing certificate, enterprise configuration, or allow-list evidence should come from authenticated platform channels. Do not derive verified origin or organization identity from `purpose`, item text, selector URLs, QR contents, deep-link parameters, launch page text, or unknown SMART request members. Maintain separate states for authenticated origin, absent origin, untrusted origin, trusted reader authentication, failed reader authentication, issuer/device evidence, and clinical-source evidence.

Development builds can use demo allow-lists or test package names, but those should be labeled and kept out of production trust policy.

#### 15.2.2 Request parsing and reader authentication

Before disclosure, the Wallet transport module should:

- confirm protocol `org-iso-mdoc`;
- parse unpadded base64url `deviceRequest` and `encryptionInfo` as CBOR;
- require `DeviceRequest.version` `"1.0"`;
- locate a tag-24 `ItemsRequest` for `docType` `org.smarthealthit.checkin.1`;
- preserve the exact tag-24 `ItemsRequest` bytes for optional readerAuth verification;
- recover `intentToRetain` for Holder display or policy;
- extract the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a string;
- validate the SMART request under §5;
- reconstruct `SessionTranscript` from the exact `encryptionInfo` base64url string and authenticated origin or approved origin-equivalent; and
- classify `readerAuth`, if present, as malformed, cryptographically failed, cryptographically valid but untrusted, or trusted under policy.

Malformed wrappers and invalid SMART requests should fail safely before disclosure. Unsupported selectors, unavailable data, Holder refusal, partial sharing, and processing errors after the request is otherwise understood can be reported as §6 item status outcomes if the Wallet proceeds to return a SMART response.

#### 15.2.3 Consent screen design

The request item is the Holder-review and response-accounting unit. Wallet UI can group, summarize, reorder, translate, or progressively disclose details for accessibility and safety, but should preserve meaningful control over each item, broad selector, accepted media type, advisory `required` flag, retention signal, and item-level outcome.

Display unauthenticated request text separately from authenticated trust evidence. `purpose`, item `title`, item `summary`, Questionnaire text, profile URLs, link origins, demo branding, and page labels are context, not verified requester identity. If authenticated origin, privileged-caller evidence, trusted readerAuth, issuer/device evidence, or local policy warnings are available, show those as separate signals.

Consent UI should support sharing selected items, declining individual items, reporting understood-but-unavailable content, reporting unsupported selector shapes or media types, reporting partial content, and reporting errors without exposing sensitive diagnostics. `required: true`, `intentToRetain`, scanning a QR code, tapping NFC, opening a link, or pressing a page button outside the Wallet is not consent by itself.

#### 15.2.4 Holder-store interface

Production Wallets should place holder-data lookup behind an app-owned interface, similar in spirit to a `SmartHealthWalletStore`. The interface can receive the parsed request item, accepted media types, FHIR version preferences, Holder choices, Questionnaire answers, trust state, and local policy context. It can return an Artifact candidate or an outcome such as `declined`, `unavailable`, `unsupported`, `partial`, or `error`.

This boundary is where production code decides which local credentials, SMART Health Cards, cached FHIR resources, issuer-provided documents, connected services, or user-entered answers are eligible; whether sensitive-category policy requires redaction or refusal; how to map `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to available records; which `fhirVersion` can be produced; whether to package one Artifact for several items or separate Artifacts to minimize disclosure; and what status best describes the result.

The store should not know about Digital Credentials API, CBOR, COSE, HPKE, or platform registration. The transport module should not know how to query patient records or determine clinical suitability.

#### 15.2.5 Profile-family and canonical matching

Wallets can use pragmatic FHIR evidence without running a full profile validator for every resource. Exact `profiles[]` matching can use `meta.profile[]`, signed SMART Health Card payload evidence, or trusted local conformance evidence. `profilesFrom[]` usually requires package metadata, implementation-guide knowledge, configured family maps, or local policy because FHIR resources do not normally declare family membership directly.

When both `profiles[]` and `profilesFrom[]` are present, treat them as additive. A resource that matches either an exact profile or any profile in a requested family can satisfy the profile-selector portion, subject to `resourceTypes[]`, accepted media type, FHIR version, Holder decision, and local policy.

For canonical `|version`, parse structurally and keep the original string. Stripping or ignoring `|version` is appropriate only for local routing, broad classification, family lookup, or display grouping where §5.5 permits it. Do not strip for versioned resolution, exact-version profile evidence, generated `QuestionnaireResponse.questionnaire`, returned `meta.profile`, diagnostics, or fixtures.

#### 15.2.6 QuestionnaireResponse construction

For `content.kind = "questionnaire"`, a Wallet can render an inline `resource`, resolve a `canonical`, or use both when consistent. If both are present and materially disagree, treating the item as `unsupported` is usually safer than collecting answers against ambiguous instructions. Operational failure after a supported Questionnaire is understood is more naturally `error`.

When returning `application/fhir+json`, construct a FHIR `QuestionnaireResponse` as a single resource or inside a Bundle and include the Artifact `fhirVersion`. If the request canonical is the Questionnaire identity being answered, preserve it exactly in `QuestionnaireResponse.questionnaire`, including `|version`. If only an inline Questionnaire is supplied, populate `QuestionnaireResponse.questionnaire` from `Questionnaire.url` and `Questionnaire.version` when known and appropriate; do not invent a misleading canonical only to satisfy a receiver preference.

Questionnaire rendering features such as Structured Data Capture behavior, terminology validation, launch context, expression evaluation, and detailed answer validation are deployment or extension choices unless a profile requires them. A Wallet that cannot safely render needed features can report `unsupported`.

#### 15.2.7 Response construction and mdoc packaging

After Holder review and data lookup, construct one SMART response under §6. `requestId` is the exact accepted SMART request `id`; `requestStatus[]` covers every original item exactly once; and every Artifact `fulfills[]` edge uses a media type accepted by that item.

For core Artifacts:

- `application/smart-health-card` uses `value.verifiableCredential[]` and no outer Artifact `fhirVersion`;
- `application/fhir+json` uses `value` as a FHIR Resource or Bundle and includes a non-empty Artifact `fhirVersion`; and
- unrecognized or extension media types are not generic Artifacts; they need a supported branded media-type definition.

Package the SMART response as the `elementValue` of an issuer-signed item named `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`, under `docType` `org.smarthealthit.checkin.1`. Compute the MSO digest over the complete tag-24 `IssuerSignedItem` bytes, create `issuerAuth`, create device authentication bound to the same `SessionTranscript`, and HPKE-encrypt the CBOR `DeviceResponse` with the §8 suite, `info = SessionTranscript`, and empty AAD. Demo or self-attested issuer material can be useful for development, but should be labeled separately from production issuer trust.

#### 15.2.8 Native module boundaries and testing

On Android or similar platforms, a useful split is:

- registration/matcher module for Credential Manager or platform broker records;
- direct-mdoc module for request parsing, `SessionTranscript`, readerAuth, CBOR/COSE/HPKE, and encrypted response generation;
- core module for SMART request parsing, request-item models, statuses, response construction, QuestionnaireResponse helpers, and holder-store interfaces;
- UI module for consent, trust display, Questionnaire prompts, and recovery; and
- app/data module for holder-data lookup, clinical policy, issuer/source trust policy, and storage.

Wallet tests should cover invalid requests, duplicate ids, missing `accept[]`, invalid `profilesFrom`, legacy nested questionnaire shapes, versioned canonical preservation, additive profile/profile-family matching, all six status codes, many-to-many fulfillment, SMART Health Card and raw FHIR JSON Artifact shapes, readerAuth classification, exact `SessionTranscript`, tag-24 byte preservation, MSO digest, device authentication, HPKE seal, and debug-bundle redaction.

### 15.3 EHR ingestion

EHR ingestion begins after the Verifier has extracted and validated a SMART response. It is not a protocol-defined write-back operation. A receiving system should keep these decisions separate:

1. Was the same-device presentation valid under §8?
2. Was the SMART response valid and cross-validated under §6.6?
3. Which trust layers succeeded, failed, or were absent?
4. Which Artifacts are syntactically valid for their media types?
5. Which Artifacts satisfy local clinical, provenance, profile, terminology, patient-match, and workflow policies?
6. What should be attached, reconciled, imported, routed for review, rejected, or deleted?

A protocol-valid response can still be unsuitable for automatic ingestion. An item-level `declined`, `partial`, `unavailable`, `unsupported`, or `error` outcome can be a valid response that triggers workflow fallback rather than protocol failure.

#### 15.3.1 Artifact intake and validation

For `application/smart-health-card`, verify every JWS in `value.verifiableCredential[]` according to SMART Health Cards and local trust policy. Inspect signed FHIR payloads for resource type, profile evidence, patient identity clues, FHIR release, and selector responsiveness. Do not expect or add an outer Artifact `fhirVersion`.

For `application/fhir+json`, require Artifact `fhirVersion`, then interpret the single Resource or Bundle entries under that FHIR release. Inspect `resourceType`, `meta.profile[]`, `Bundle.entry[].resource`, `QuestionnaireResponse.questionnaire`, and any Provenance or source evidence. Preserve `meta.profile` values exactly, including `|version`. If mixed FHIR releases, insufficient profile evidence, unsupported FHIR versions, or insufficient provenance are detected, quarantine or reject under local policy rather than silently rewriting content.

For extension media types, ingest only extensions the receiver explicitly supports. Do not infer dereferencing, integrity, expiration, authorization, FHIR-version, or merge semantics from generic fields named `value`, `url`, or `data`.

#### 15.3.2 Patient matching and provenance

SMART Health Check-in does not perform identity proofing or patient matching. EHR receivers should match returned content to the local patient or encounter using local patient-matching policy, existing portal session context, staff workflow context, demographics, coverage identifiers, or other accepted evidence. Request ids, item ids, Artifact ids, mdoc issuer/device evidence, HPKE success, Holder approval, and same-device transport validity are protocol/session evidence, not patient identity proof.

Raw FHIR JSON remains patient-mediated unless the payload, extension profile, deployment profile, or accepted provenance supplies source evidence. SMART Health Cards can provide signed clinical-source evidence, but the receiver still evaluates each JWS issuer and payload. mdoc issuer/device evidence proves properties of the presentation container, not automatically the clinical source of every Artifact.

#### 15.3.3 Deduplication, reconciliation, and write paths

Deduplicate and reconcile using clinical identifiers and source evidence inside each Artifact, not SMART response wrapper ids alone. Useful signals can include FHIR `identifier`, `id` with source context, `meta.source`, `meta.versionId`, Provenance, SMART Health Card issuer and credential metadata, coverage member identifiers, Questionnaire canonical/version, timestamps, and local matching rules. Artifact ids are response-scoped and should not become long-term document keys unless a deployment adds an explicit mapping.

Ingestion paths can attach a received Artifact or rendered summary to an encounter for staff review, create an intake workqueue task, reconcile demographics or coverage into pending updates, import a QuestionnaireResponse as patient-entered data, store a SMART Health Card as external signed evidence, quarantine content that fails policy, or record only item status when no clinical content is accepted.

Receipt of a SMART response is not automatic EHR write-back authorization. Local policy, legal duties, patient matching, clinical review, and audit requirements determine whether and how content enters the record.

#### 15.3.4 Status, retention, and diagnostics

Store or route `requestStatus[]` with enough context for workflow recovery. `fulfilled` is the Wallet's response-construction claim; local validation may still reject an Artifact. `partial` should not be treated as complete. `declined` should avoid revealing more than the Holder chose to disclose. `unavailable`, `unsupported`, and `error` often call for alternative intake, manual collection, or retry.

Retention policy should cover both clinical payloads and metadata such as request ids, item ids, Artifact ids, origins, certificate subjects, timestamps, validation outcomes, payload sizes, and status messages. Routine telemetry should avoid plaintext SMART requests, SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, decrypted mdoc responses, HPKE keys, bearer URLs, full launch URLs, and full QR payloads.

Public fixtures should use synthetic or non-PHI data, intentionally public test keys, and labels describing their trust status. Live PHI, production private keys, bearer credentials, or unredacted clinical payloads in support bundles should be handled under production security and privacy procedures.

### 15.4 SDK packaging guidance

SDKs should mirror the protocol layers rather than product demos. A clean package structure lets implementers reuse the clinical model without pulling in browser, React, Android, CBOR, COSE, HPKE, or demo-relay dependencies.

#### 15.4.1 Transport-neutral core package

A core package should expose:

- request and response types;
- validators for request shape, response shape, and response-against-request cross-validation;
- selector utilities for `fhir.resources` and flattened `questionnaire`;
- canonical parsing/preservation helpers;
- status-code and many-to-many fulfillment helpers;
- FHIR helpers for `profilesFrom[]` family matching hooks, `QuestionnaireResponse.questionnaire`, `meta.profile`, and raw FHIR Artifact inspection; and
- extension hooks that require branded media-type variants rather than generic unknown Artifact carriers.

The core package should not depend on browser APIs, React, Android Credential Manager, CBOR/COSE/HPKE libraries, network fetching, demo data, or EHR-specific ingestion policy. It can define resolver and policy interfaces whose implementations are injected by applications.

#### 15.4.2 Web verifier and framework packages

A web verifier package can own DC API feature detection, `DeviceRequest` / `ItemsRequest` / `encryptionInfo` construction, a verifier-authority interface for browser-local or server-owned HPKE private material, HPKE opening, mdoc validation hooks, SMART response extraction, core cross-validation, debug redaction, and fixture import/export.

Framework bindings such as React, Vue, Svelte, or Web Components should be optional wrappers. They should manage UI lifecycle and error presentation without duplicating protocol parsing. A framework-neutral entry point should not import React-specific or other framework-specific code.

If a deployment offers QR/NFC/deep-link initiation, keep those helpers in a deployment package or application layer. They can retrieve or prepare a SMART request and then call the same-device verifier package. Do not package deployment relay helpers as SMART Health Check-in conformance layers.

#### 15.4.3 Native wallet packages

Native wallet SDKs can use the same boundary pattern:

- registration/matcher package for platform broker integration;
- transport package for direct `org-iso-mdoc`, `SessionTranscript`, readerAuth, mdoc response construction, and HPKE;
- core package for SMART models, status handling, response construction, QuestionnaireResponse helpers, and holder-store interfaces;
- UI package for consent and Questionnaire rendering; and
- app/data package for clinical data lookup, source trust policy, issuer policy, and storage.

Demo issuer keys, fixture keys, sample FHIR resources, and debug panels should stay out of stable production packages or be clearly marked as test material. Trust and validation outcomes should be exposed as structured data so apps can display warnings, proceed with reduced assurance, or reject safely.

#### 15.4.4 Schema, CDDL, fixture, and extension packages

Conformance tooling benefits from separate modules for JSON Schema, pseudo-CDDL, fixture manifests, and byte-ladder tests. These modules should identify the section under test and whether comparison is byte-exact, structural, semantic, diagnostic, historical, or illustrative.

Negative tests should include nested questionnaire selectors, scalar/object `profilesFrom`, unrecognized generic Artifact media types, versioned canonical strip-and-fetch behavior, wrong `org-iso-mdoc` identifiers, wrong request carrier locations, `DeviceRequest.version` values other than `"1.0"` for the core profile, missing tag-24 wrappers, altered `encryptionInfo` base64url transcript inputs, non-empty HPKE AAD or wrong HPKE suite, missing `requestStatus[]` coverage, and unaccepted Artifact media types in `fulfills[]`.

Extension packages should expose explicit opt-in support and document the extension selector kind or media type, payload shape, validation rules, security and privacy considerations, unsupported-recipient behavior, and fixture expectations. Avoid API names such as `GenericArtifact` for core handling. Unknown media types should be rejected, quarantined, or handed only to an explicitly registered extension handler.
