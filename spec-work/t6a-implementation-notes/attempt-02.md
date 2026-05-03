## 15. Implementation notes

This section provides informative implementation guidance for products that build, process, validate, or package SMART Health Check-in 1.0 exchanges. It does not add conformance requirements beyond the normative clinical model in §§5-6, the trust framework in §7, the same-device direct `org-iso-mdoc` flow in §8, and the security, privacy, registry, and internationalization requirements in §§11-14.

The most important implementation boundary is the layer boundary. SMART Health Check-in 1.0 has two normative layers: the transport-neutral SMART request and SMART response, and the same-device direct `org-iso-mdoc` presentation flow over the W3C Digital Credentials API. QR codes, NFC tags, deep links, kiosk screens, relay records, and completion pages can be useful deployment UX, but they are not a standardized pointer, envelope, relay, submission, or completion protocol. Implementations should design those deployment pieces so that, once the Holder reaches a Wallet-capable device, the Verifier page still runs the §8 same-device flow and the Wallet still constructs the §6 SMART response after Holder review.

### 15.1 Verifier app

A Verifier app is usually part of a patient portal, scheduling page, intake tool, payer workflow, or EHR-facing check-in application. The same deployed product often acts as both Requester and Verifier: it builds the clinical SMART request, invokes the same-device presentation flow, validates the returned presentation, and passes accepted content to a downstream receiver. Keeping the Requester and Verifier responsibilities separate in code helps avoid mixing clinical semantics with presentation trust.

#### 15.1.1 Building the request from a UI form

A request builder can start from workflow configuration such as “insurance card,” “US Core summary,” or “pre-visit questionnaire,” but the emitted protocol object should be the explicit §5 SMART request. Avoid emitting product presets, local topic labels, profile identifiers, or shortcut fields in place of real request items.

Useful request-builder practices include:

- assign a fresh, opaque `SmartHealthCheckinRequest.id` for the check-in session and avoid embedding patient, appointment, clinic, or routing identifiers in it;
- model each Holder-review decision as a separate request item when possible, with a stable item `id`, concise `title`, optional `summary`, advisory `required`, explicit `accept[]`, and one `content` selector;
- list only Artifact media types the receiver can parse, validate, and route for that item, ordered by preference;
- use `fhir.resources` selectors with `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` rather than local clinical-topic strings when FHIR identifiers fit;
- treat `profiles[]` and `profilesFrom[]` as additive profile selectors, with `resourceTypes[]` as the separate resource-type constraint;
- encode `profilesFrom` as an array of canonical profile-family URLs, not a singleton string or package descriptor; and
- use the flattened questionnaire selector shape, for example `{ "kind": "questionnaire", "canonical": "..." }`, `{ "kind": "questionnaire", "resource": { "resourceType": "Questionnaire", ... } }`, or both sibling fields together. Do not emit legacy nested `questionnaire` string, resource, or wrapper forms.

Request-building UI should distinguish display text from trust evidence. `purpose`, item `title`, and item `summary` are Holder-facing context; they should not carry the clinic's authenticated identity, web origin, reader certificate details, callback URLs, relay tokens, logo URLs, or trust claims. Those facts belong in the presentation layer, deployment policy, or local application session.

Canonical handling deserves a dedicated utility rather than ad hoc string manipulation. Implementers should parse each FHIR canonical into `(url, version?)` while retaining the exact original string. Resolution of versioned canonicals should use a package cache, configured canonical resolver, or FHIR canonical search such as `GET [base]/{ResourceType}?url={url}&version={version}` and should verify the resolved `resourceType`, `url`, and `version`. Direct HTTP dereference is suitable only for unversioned canonicals when the implementation is willing to accept the publisher-served version. A versioned canonical should not be satisfied by stripping `|version` and fetching the bare URL. Preserve exact strings in `meta.profile`, `QuestionnaireResponse.questionnaire`, diagnostics, and byte-oriented fixtures when the normative sections call for preservation.

#### 15.1.2 Holding HPKE private material

In the §8 flow the Verifier creates `encryptionInfo`, retains the matching HPKE private key, invokes `navigator.credentials.get`, and later opens the returned `dcapiResponse`. The private key and the exact `encryptionInfo` base64url string are presentation-session state. They should be scoped to one pending presentation when possible, retained only until completion or timeout, and kept separate from any kiosk, relay, analytics, or support state.

A browser-local Verifier authority is simple for prototypes and purely same-device pages: the page generates the recipient key pair, keeps the private key in memory, invokes the Digital Credentials API, opens the response, and then deletes the pending context. This pattern minimizes server exposure to request-opening key material but requires careful browser-state handling, timeout cleanup, refresh recovery, and log redaction.

A server-owned or split authority can prepare a request and later complete it, but it should treat request handles as sensitive operational state. The server should retain the original SMART request, recipient private key, exact `encryptionInfo` spelling, expected origin, and freshness metadata in an authenticated session or equivalent protected store. A server-owned design should not turn the handle into a standardized SMART Health Check-in pointer or relay protocol; it is a deployment detail around the same §8 presentation.

Whether browser-local or server-owned, the Verifier should use fresh HPKE recipient key material and fresh nonce bytes per presentation session unless a deployment profile explicitly defines reuse handling. Debug artifacts that include recipient private JWKs, decrypted `DeviceResponse` bytes, or plaintext SMART responses are development or fixture material only and should not be collected in routine production telemetry.

#### 15.1.3 Validating the response

Verifier implementations benefit from a pipeline that records separate pass/fail/unknown results for each layer instead of collapsing all failures into a generic “bad response.” A practical validation pipeline is:

1. validate the original SMART request under §5 before invoking the Wallet and retain it for cross-validation;
2. construct the Digital Credentials API request with protocol `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, requestInfo key `org.smarthealthit.checkin.request`, tag-24 `ItemsRequest`, and direct `dcapi` `encryptionInfo`;
3. reconstruct the expected `SessionTranscript` from the exact `encryptionInfo` base64url string and origin used for the invocation;
4. require the result protocol to be `org-iso-mdoc`, decode the direct `dcapiResponse`, and HPKE-open using DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD;
5. validate the `DeviceResponse`, MSO, `issuerAuth`, value digests, stable issuer-signed item, and device authentication according to §8 and local issuer/device trust policy;
6. extract the SMART response JSON only from `elementValue` of the `smart_health_checkin_response` issuer-signed item in namespace `org.smarthealthit.checkin`;
7. validate the SMART response under §6 and apply §6.6 against the retained request: exact `requestId`, valid `fulfills[]`, accepted `mediaType` per fulfilled item, exactly one status per request item, and FHIR-version checks; and
8. apply Artifact-specific validation, including SMART Health Card JWS verification and raw FHIR JSON or QuestionnaireResponse checks needed by the receiving workflow.

The Verifier should keep trust decisions distinct in its data model and user/operator displays. HPKE success, origin binding, optional reader authentication, mdoc issuer trust, device-key proof, SMART response validity, SMART Health Card issuer trust, raw FHIR provenance, patient matching, and downstream ingestion acceptance are different states. For example, a raw `application/fhir+json` Artifact can be protocol-valid and still be patient-mediated content without clinical-source provenance; an EHR may quarantine it until local provenance, patient matching, or FHIR-profile policy is satisfied.

#### 15.1.4 Surfacing fixtures for support and diagnostics

Good diagnostic output makes byte-boundary failures reproducible without exposing production secrets. Development builds can surface the JSON Digital Credentials API argument, base64url `deviceRequest`, base64url `encryptionInfo`, computed `SessionTranscript`, optional `readerAuth`, and decoded SMART request. Response-side diagnostics can show the returned wrapper, HPKE `enc`, ciphertext length, `DeviceResponse` inspection, digest checks, stable element extraction, and the §6.6 validation report.

Production support tools should prefer redacted summaries: protocol id, fixed identifiers, validation layer that failed, fixture class or build version, and coarse error category. Avoid routinely logging plaintext SMART requests, plaintext SMART responses, FHIR resources, SMART Health Cards, Questionnaire answers, request-opening private keys, full QR/deep-link URLs, bearer URLs, stack traces with payloads, or valid-id enumeration clues. When detailed bundles are needed for authorized support or conformance work, label them as diagnostic or fixture material, separate test keys from production keys, and document whether the data are synthetic, PHI-bearing, self-attested, historical, or conformance-candidate material.

### 15.2 Wallet implementation guidance

A Wallet implementation typically has three internal responsibilities: request intake and trust processing, Holder review and data selection, and response construction. The code can be split differently on each platform, but the protocol-visible behavior should preserve the §5 item semantics, §6 response accounting, §7 trust separation, and §8 same-device byte boundaries.

#### 15.2.1 Origin allowlist maintenance

On some platforms the Wallet receives authenticated web origin directly from the Browser or User Agent. On others, such as Android Credential Manager integrations, the Wallet may need a privileged-caller or browser allowlist before the platform exposes a caller origin. Treat this allowlist as production trust configuration, not as request data. A production Wallet should maintain explicit browser package names, signing-certificate fingerprints, entitlements, app-link relationships, or enterprise controls according to deployment policy. Reflecting the current caller back into an allowlist can be useful for development diagnostics, but it should not be presented as production origin trust.

If origin cannot be authenticated, the Wallet should treat origin trust as absent and follow local policy: fail, proceed with reduced assurance, ask for stronger Holder confirmation, suppress branding, restrict content, or require another trust layer. It should not derive origin or requester identity from `purpose`, item display text, selector URLs, launch URLs, package-looking strings, or unknown request members.

#### 15.2.2 Consent screen design

The request item is the natural unit for Holder review and response accounting. A Wallet UI can group, summarize, reorder, translate, or suppress details for accessibility, localization, safety, and policy, but it should preserve meaningful item-level control and exact item ids for `fulfills[]` and `requestStatus[].item`.

Consent screens should distinguish at least these categories:

- authenticated origin or privileged-caller evidence, when available;
- reader authentication state, when `readerAuth` is present or required;
- unauthenticated SMART request display text such as `purpose`, item `title`, and `summary`;
- each requested selector and accepted response form in Holder-understandable terms;
- retention signal, including the §8 default `intentToRetain = true` for ordinary clinical workflows;
- Holder choices such as share, decline, partial share, or omit unavailable content; and
- warnings for broad or no-selector requests, sensitive categories, unsupported media types, untrusted context, or material Questionnaire conflicts.

`required: true`, `intentToRetain`, scanning a QR code, tapping NFC, opening a deep link, or clicking a page button outside the Wallet is not Holder consent. A Wallet should support ordinary non-fulfillment outcomes as first-class results: `declined`, `partial`, `unavailable`, `unsupported`, and `error` can all be correct item statuses.

#### 15.2.3 Holder-store interface

A Wallet can abstract Holder data sources behind an interface similar to a `SmartHealthWalletStore`: given a validated request item, Holder choices, and any collected Questionnaire answers, return a candidate Artifact or report that content is declined, unavailable, unsupported, partial, or errored. The interface should not assume that every Wallet is a FHIR server, longitudinal health record, issuer, or online data broker.

The store layer should receive already-validated selector objects rather than raw untrusted JSON when possible. It should preserve source `meta.profile` values, including `|version`, and should avoid manufacturing profile claims or provenance fields that the source data do not support. For `application/fhir+json`, it should choose a FHIR release compatible with the request and include `fhirVersion`. For `application/smart-health-card`, it should keep FHIR-version semantics inside each JWS and omit any outer Artifact `fhirVersion`.

When one source payload can satisfy multiple approved items, the Wallet can emit one Artifact with multiple `fulfills[]` entries. When several payloads together satisfy one item, it can emit multiple Artifacts for that item. In both cases, the store and response factory should validate every fulfillment edge: the item accepted the Artifact media type, the payload is responsive to the selector, and the item status accurately describes full or partial fulfillment.

#### 15.2.4 Profile-family resource matching

Profile-family matching for `profilesFrom[]` usually requires knowledge outside the SMART request. Wallets can use FHIR package metadata, ImplementationGuide content, configured family maps, issuer knowledge, or local policy to determine whether an exact profile belongs to a family. `profilesFrom[]` should not be interpreted as a package id, npm package name, registry alias, topic label, or singleton string.

For exact `profiles[]` values, `meta.profile[]` is useful evidence but not the only possible evidence; signed payloads, source metadata, package knowledge, or local conformance evidence may also support a match. Versioned requests need exact-version evidence before claiming full fulfillment. Unversioned requests can match a supported version of the same base canonical when evidence supports the match. Wallets should avoid running expensive full FHIR validation on every candidate resource unless local policy or a deployment profile requires it, but they should not claim `fulfilled` when they lack evidence for a requested exact version.

#### 15.2.5 QuestionnaireResponse construction

A `questionnaire` selector is flat: `content.kind` is `"questionnaire"`, with direct optional `canonical` and `resource` members. Wallet parsers should reject or report `unsupported` for legacy nested `questionnaire` forms rather than silently coercing them, so stale integrations fail visibly.

When only `canonical` is supplied, the Wallet can resolve the Questionnaire using a configured resolver, package cache, FHIR canonical search, Holder data source, or other local mechanism that respects §5.5. When only `resource` is supplied, the Wallet can render the inline Questionnaire without network retrieval if it supports the Questionnaire features and local policy permits. When both are supplied, the canonical is the Requester's explicit identity and the resource is the body to render; material disagreement in URL, explicit version, or answer-changing item structure should normally lead to `unsupported` or `error` rather than silent merge.

Generated `QuestionnaireResponse.questionnaire` should preserve the requested canonical, including `|version`, when that canonical is the identity being answered and the information is known. If only an inline Questionnaire was supplied, the Wallet can use `Questionnaire.url` and `Questionnaire.version` when they provide a clear canonical identity, but it should not invent a misleading canonical just to fill the field. Questionnaire rendering, SDC behavior, terminology validation, launch context, and expression evaluation are deployment or extension topics unless a future profile defines them.

#### 15.2.6 Android Credential Manager: matcher and handler split

An Android Wallet can separate lightweight matching from full handling. A matcher or provider entry can inspect enough of a Credential Manager request to decide whether to advertise a SMART Health Check-in option. The handler activity, launched after user selection, can parse the full `ProviderGetCredentialRequest`, recover caller origin through the platform and allowlist policy, decode direct `org-iso-mdoc`, validate the §8 request wrapper, extract the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, run Holder review, build the §6 SMART response, package the mdoc `DeviceResponse`, HPKE-encrypt it, and return a `DigitalCredential`.

This split is platform machinery. It should not create alternate request carriers, dynamic element encodings, plaintext response paths, or Android-specific protocol fields. Debug bundles created by the handler are valuable for fixture alignment, but production builds should redact or disable private keys, decrypted responses, PHI, and reusable launch material.

#### 15.2.7 iOS and Safari considerations

Implementations targeting iOS or Safari should treat current platform behavior as an integration surface, not as a separate SMART Health Check-in binding. The same protocol constants, request carrier, `SessionTranscript` construction, HPKE parameters, response carrier, and validation requirements apply when the platform supports the W3C Digital Credentials API direct `org-iso-mdoc` path or a deployment-approved origin-equivalent.

If a platform cannot provide authenticated origin or cannot support the §8 direct flow, an implementation should fail safely or operate only under an explicit deployment profile that defines the origin-equivalent input, assurance level, Holder display, and Verifier validation behavior. It should not compensate by adding requester identity metadata to the SMART request body or by using a deployment-local deep-link envelope as if it were a version 1.0 presentation protocol.

### 15.3 EHR ingestion

EHR ingestion begins after a Verifier has accepted the presentation response as protocol-valid. Even then, ingestion is local workflow, not automatic protocol success. A response can be valid SMART Health Check-in content and still be unsuitable for an EHR because of patient-match uncertainty, missing provenance, unsupported FHIR version, insufficient profile evidence, stale data, Holder refusal, partial fulfillment, or local policy.

A receiving EHR or intake system should keep at least three states separate:

1. **Protocol validation:** §8 presentation validation and §6.6 request/response cross-validation passed.
2. **Clinical-source and content validation:** SMART Health Card JWSs, raw FHIR provenance, FHIR `resourceType`, `fhirVersion`, `meta.profile`, `QuestionnaireResponse.questionnaire`, terminology, and profile evidence were evaluated under local policy.
3. **Workflow acceptance:** patient matching, deduplication, reconciliation, staff review, persistence, routing, audit, and legal or operational requirements were satisfied.

For `application/smart-health-card`, the receiver should verify each JWS, evaluate the accepted issuer or trust framework, inspect signed FHIR payload content against the original selectors, and decide what to attach or reconcile. The presence of a valid SMART Health Card signature does not by itself prove every requested item was fully satisfied or that the content belongs in a particular chart without patient matching and workflow review.

For `application/fhir+json`, the receiver should treat the payload as patient-mediated unless the payload, extension profile, or deployment policy supplies accepted provenance or signature evidence. The outer `fhirVersion` gives FHIR release context; it is not source proof. Receivers should inspect Bundles by looking at `Bundle.entry[].resource`, not only the outer Bundle, and should preserve returned `meta.profile` strings including version suffixes. They can reject or quarantine content that lacks needed profile evidence, includes unexpected resource types, mixes FHIR releases, duplicates local records ambiguously, or fails local validation.

Deduplication should be conservative. Protocol ids, item ids, Artifact ids, request ids, mdoc identifiers, and presentation-session values are scoped accounting or transport values, not global clinical document identifiers. Match returned resources using FHIR identifiers, provenance, timestamps, source evidence, patient-matching policy, and local reconciliation rules rather than Artifact `id` alone.

Operationally, ingestion systems should retain enough validation metadata to explain why content was accepted, quarantined, declined, or ignored, without retaining unnecessary plaintext or secrets. Useful metadata can include request item id, status code, Artifact id, media type, validation outcome, provenance outcome, receiver policy version, and staff disposition. Avoid storing unnecessary launch URLs, HPKE private keys, decrypted mdoc internals, full debug bundles, or sensitive status messages in routine EHR records.

### 15.4 SDK packaging guidance

SDKs are most useful when they preserve the specification's layer boundaries. A reasonable packaging model is:

- **Core clinical model package:** TypeScript, Kotlin, Swift, Java, or other models and validators for `SmartHealthCheckinRequest`, `SmartHealthCheckinResponse`, selectors, core Artifact variants, status codes, canonical parsing, JSON Schema helpers, and §6.6 cross-validation utilities. This package should not depend on a browser, Credential Manager, HPKE implementation, relay service, or EHR ingestion stack.
- **FHIR helper package:** optional utilities for canonical `|version` parsing and preservation, package-cache or FHIR-search resolution, profile-family membership maps, raw FHIR Bundle traversal, `meta.profile` evidence inspection, and QuestionnaireResponse construction. It should distinguish full FHIR validation from core protocol validation.
- **DC API Verifier package:** request construction and response opening for direct `org-iso-mdoc`, including fixed identifiers, tag-24 boundaries, direct `dcapi` `SessionTranscript`, HPKE key management hooks, optional `readerAuth` construction, fixture export, and layered validation reports.
- **Wallet mdoc package:** request parsing, origin/privileged-caller inputs, optional `readerAuth` classification, Holder-review handoff models, response construction, issuer-signed item creation, MSO/digest/device authentication, HPKE sealing, and platform result wrapping.
- **Framework bindings:** React, server, Android, iOS, or EHR-specific adapters that wire the packages into application state, UI, storage, routing, and diagnostics without redefining wire fields.

SDK APIs should make unsafe shortcuts hard. Avoid a generic `GenericArtifact` class for unknown media types; model core `application/fhir+json` and `application/smart-health-card` as concrete variants and require extension variants to pin their media type and payload shape. Avoid accepting questionnaire selectors with legacy nested shapes. Avoid helper methods that strip `|version` and fetch the bare canonical. Avoid APIs that accept a SMART response without the original request for §6.6 cross-validation.

Return structured validation reports rather than only throwing strings. Reports can identify parse errors, schema errors, unsupported selector kinds, media-type mismatches, status-coverage errors, FHIR-version issues, HPKE failures, issuer trust results, device-authentication failures, SMART Health Card validation results, raw FHIR provenance status, and downstream policy decisions. Such reports support conformance testing and operational debugging while keeping trust layers distinct.

SDKs should also ship fixture and conformance utilities with clear labels. A fixture containing demo certificates, intentionally public private keys, deterministic randomness, synthetic data, or historical platform captures should be marked as diagnostic, implementation regression, historical, illustrative, or conformance-candidate. Do not imply that checked-in fixture keys, demo reader certificates, self-attested issuer material, localhost origins, nonce sizes, digestID choices, or exact clinical sample data are production requirements unless a named deployment or conformance profile says so.
