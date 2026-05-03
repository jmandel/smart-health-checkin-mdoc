## 15. Implementation notes

This section provides informative implementation guidance for products and libraries that implement SMART Health Check-in 1.0. It does not add conformance requirements beyond the normative request, response, trust, same-device presentation, security, privacy, registry, and internationalization rules in §§4-14.

Implementations are easier to test and maintain when they keep the same layering as the specification:

1. a transport-neutral SMART request/response core for §§5-6;
2. a same-device `org-iso-mdoc` / Digital Credentials API adapter for §§7-8;
3. a FHIR and SMART Health Card validation layer for returned Artifact payloads;
4. a Holder-facing Wallet user experience and data-source boundary; and
5. deployment-specific launch, kiosk, EHR, retention, and staff-workflow code outside the protocol core.

In-person QR, NFC, deep-link, kiosk, staff-handoff, relay, submission, and completion-display behavior can be important product work, but it should be treated as deployment-defined UX that lands the Holder on a same-device Verifier page. It should not be implemented as a second SMART Health Check-in wire protocol, a second clinical request language, or an alternate response submission path that bypasses §8 validation.

### 15.1 Verifier app

A Verifier app usually has both a Requester component and a presentation component. The Requester decides what content the workflow needs and builds a `SmartHealthCheckinRequest`. The Verifier component packages that request for the same-device `org-iso-mdoc` flow, receives the encrypted mdoc response, validates it, extracts the SMART response, and only then passes clinical content to the Requester or downstream systems.

#### 15.1.1 Request construction

Verifier implementations should start with a request-builder API that produces the exact §5 JSON shape before any mdoc or Digital Credentials API code runs. A practical builder normally accepts:

- a workflow purpose string for Holder display;
- one or more request items with stable item ids, titles, summaries, advisory `required` flags, selectors, and ordered `accept[]` media types;
- the FHIR release versions the receiver can process for raw FHIR JSON;
- local workflow metadata kept outside the SMART request body.

The builder should validate the request as soon as it is constructed. Useful negative tests include duplicate item ids, empty `accept[]`, unsupported local topic labels in `resourceTypes[]`, scalar `profilesFrom`, legacy nested questionnaire shapes, requester identity fields in the SMART request body, and versioned canonicals that are later resolved by strip-and-fetch behavior. A Verifier that offers user-configurable request templates should lint templates before they are used in production workflows.

Request construction is also the right place to keep media-type promises honest. If an item lists `application/fhir+json`, the receiver should be prepared to parse and route FHIR JSON with a declared `fhirVersion`. If an item lists `application/smart-health-card`, the receiver should be prepared to validate SMART Health Card JWSs and inspect their signed FHIR payloads. Extension media types should be exposed only when the Verifier supports the registered branded Artifact variant, not by assuming a generic `value`, `url`, or `data` carrier.

For FHIR selectors, implementers should prefer canonical FHIR identifiers over local categories. Use `profiles[]` for exact `StructureDefinition` canonicals, `profilesFrom[]` for profile-family canonicals such as implementation-guide URLs, and `resourceTypes[]` for official FHIR resource type names. When both `profiles[]` and `profilesFrom[]` are present, request-builder UI should describe them as additive, with `resourceTypes[]` as a separate resource-type constraint.

For questionnaire items, builder APIs should use the flattened shape:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/intake|1.2.3",
  "resource": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/intake",
    "version": "1.2.3",
    "status": "active",
    "item": []
  }
}
```

The obsolete nested `questionnaire` member should not be generated, accepted in new fixtures, or silently coerced in conformance tooling.

#### 15.1.2 Same-device Web/DC API integration

The same-device integration should be isolated in a small adapter around `navigator.credentials.get(...)`. That adapter can take a valid SMART request JSON object and return a parsed validation result, while hiding CBOR, COSE, HPKE, and base64url details from ordinary application code.

An implementation-oriented Verifier pipeline is:

1. serialize the SMART request as UTF-8 JSON text;
2. place that text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
3. request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`;
4. CBOR-encode and tag-24-wrap the `ItemsRequest`;
5. construct `DeviceRequest.version` `"1.0"` with per-`DocRequest.readerAuth` when reader authentication is used;
6. create fresh `encryptionInfo = ["dcapi", { nonce, recipientPublicKey }]`;
7. retain the HPKE private key, exact `encryptionInfo` CBOR bytes, exact unpadded `encryptionInfo` base64url string, request origin, and original SMART request until validation completes; and
8. call the Digital Credentials API with protocol `org-iso-mdoc`.

Implementers should treat the exact `encryptionInfo` base64url string as state, not as a reproducible formatting detail, because §8 binds that string into the `SessionTranscript`. Similarly, byte-level diagnostic tools should preserve the exact tag-24 `ItemsRequest` bytes, reader-authentication bytes, `SessionTranscript`, HPKE inputs, and returned `dcapiResponse` bytes. These values are useful for support and fixture comparison, but privacy and security guidance in §§11-12 should govern whether they are logged or retained.

When `readerAuth` is used, it is often easiest to implement it as a clearly optional module. The Verifier can expose policy choices such as unsigned, signed-for-test, signed-with-deployment-certificate, and required-by-profile without changing the SMART request body. Deployment trust material, certificate chains, organization display labels, and callback endpoints should remain outside the clinical request.

#### 15.1.3 Response validation

Verifier-side validation should be implemented as a staged pipeline that records separate outcomes for each layer:

1. Digital Credentials API wrapper shape and returned protocol;
2. base64url and CBOR decoding of `dcapiResponse`;
3. HPKE opening with the required suite, `info = SessionTranscript`, and empty AAD;
4. mdoc `DeviceResponse` structure, document type, namespace, and stable element;
5. MSO, issuer signature, value digest, disclosed `IssuerSignedItem`, and device signature validation;
6. deployment-policy classification of origin, reader authentication, issuer evidence, and device evidence;
7. extraction and JSON parsing of the `smart_health_checkin_response` element value;
8. SMART response validation under §6;
9. §6.6 cross-validation against the original SMART request; and
10. FHIR, SMART Health Card, provenance, and local ingestion checks.

This separation helps avoid overclaiming. HPKE success does not mean the reader is trusted. A trusted reader certificate does not mean raw FHIR JSON has clinical-source provenance. A valid mdoc digest does not mean a returned Bundle satisfies a requested profile. A `fulfilled` status does not mean the EHR must ingest the Artifact.

Verifier test suites should include negative cases for each stage. Examples include wrong `protocol`, padded or malformed base64url, incorrect `SessionTranscript`, non-empty HPKE AAD, wrong HPKE suite, missing stable response element, wrong `docType`, digest mismatch, device-signature failure, absent `requestId`, mismatched `requestId`, duplicate Artifact ids, unknown `fulfills[]` references, unaccepted Artifact media type, outer `fhirVersion` on a SMART Health Card Artifact, missing `fhirVersion` on raw FHIR JSON, duplicate or missing `requestStatus[]` entries, unknown status codes, scalar `profilesFrom`, and legacy questionnaire selectors in the original request.

FHIR-aware validation can be layered after core protocol validation. For raw FHIR JSON, Verifiers should inspect `resourceType`, Bundle entries, `meta.profile[]`, `QuestionnaireResponse.questionnaire`, and `fhirVersion`. For SMART Health Cards, Verifiers should verify each JWS according to SMART Health Cards before using signed payload content as selector evidence. Full FHIR profile validation, terminology checks, patient matching, deduplication, and clinical acceptance are often deployment or EHR policy rather than core protocol validation, but the Verifier should preserve enough evidence for those downstream decisions.

#### 15.1.4 Fixtures and diagnostics

Verifier teams should maintain fixtures at several levels:

- pure SMART request and SMART response JSON fixtures;
- request/response cross-validation fixtures that pair each response with the original request;
- same-device request construction fixtures for `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, and `SessionTranscript`;
- optional `readerAuth` fixtures;
- encrypted response fixtures for `dcapiResponse`, HPKE opening, `DeviceResponse`, issuer-signed item, MSO digest, and device signature;
- end-to-end fixtures from real browser or platform captures, clearly labeled as diagnostic or historical when they are not stable conformance vectors.

Fixtures should say whether comparison is byte-exact, structure-exact, semantic, diagnostic, or illustrative. They should also label demo private keys, self-signed certificates, synthetic patient data, and real-platform captures so that test material is not mistaken for production trust material.

### 15.2 Wallet implementation guidance

A Wallet/Responder implementation benefits from the same separation of concerns as a Verifier: a platform adapter receives the request, a protocol core validates and parses it, a Wallet UI obtains Holder decisions, a Holder data-source boundary resolves content, and a same-device adapter packages the response. This keeps clinical logic testable without requiring Android Credential Manager, browser APIs, CBOR, COSE, HPKE, or demo stores in every unit test.

#### 15.2.1 Request intake and platform trust

The Wallet's platform adapter should recover the same evidence that §8 and §7 discuss: the outer Digital Credentials API or Credential Manager request, the protocol id, `deviceRequest`, `encryptionInfo`, authenticated origin or origin-equivalent context, optional `readerAuth`, and any platform caller information used by local policy.

The Wallet should extract the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. It should not accept archived dynamic element names, a plaintext request in the outer Digital Credentials API wrapper, deployment launch parameters, or other request-like fields as alternate version 1.0 carriers.

Wallet implementations should model trust states explicitly. For example, origin can be trusted, absent, or unavailable; `readerAuth` can be absent, malformed, cryptographically failed, valid but untrusted, or trusted under policy; issuer evidence can be production-trusted, deployment-local, self-attested, test-only, or rejected. Those states are useful for UI and policy, but they should not be collapsed into SMART request fields or into a single “verified” boolean.

Android implementations commonly split the Credential Manager matcher from the handler. The matcher can be lightweight and decide whether to surface the Wallet for `org-iso-mdoc` requests. The handler can parse the full request, obtain caller origin information, perform Holder review, build the SMART response, and return the Digital Credential response. That split is platform-specific implementation architecture, not a protocol role.

#### 15.2.2 Holder review and consent UX

The request item is the natural unit for Holder review and response accounting. Wallet UI should make item titles, summaries, broad selectors, accepted media types, advisory `required` flags, and retention signals understandable, while preserving item ids exactly for response construction. Grouping or summarizing related items can improve usability, but the implementation should still be able to return a distinct status for every item.

Wallet UI should visually distinguish unauthenticated request display text from authenticated origin, trusted reader information, issuer/device evidence, and local warnings. The `purpose`, item `title`, item `summary`, selector URLs, Questionnaire text, launch page text, QR-code context, and demo branding are not authenticated requester identity by themselves.

Holder decisions should map cleanly to §6 statuses. If the Holder refuses an item, `declined` is often appropriate. If the Wallet supports the request but has no shareable matching content, `unavailable` is usually better than `unsupported`. If the selector shape, media type, Questionnaire features, exact canonical version, or extension semantics are not supported, use `unsupported`. If processing fails after the item is understood, use `error`. If only some responsive content is shared, use `partial`.

Internationalization and accessibility should be addressed in UI code without altering protocol identifiers. Implementations can translate or summarize display strings, but exact values such as request ids, item ids, `content.kind`, media types, canonicals, status codes, mdoc identifiers, and cryptographic inputs should remain exact for validation and response construction.

#### 15.2.3 Holder-data boundary

Production Wallets should put patient-data lookup and selection behind an explicit Holder data-source interface. That interface can return SMART Health Cards, raw FHIR resources, Questionnaire responses, or other registered Artifact forms without exposing the transport adapter to local storage details.

The boundary should receive enough context to honor the request:

- the original request item id and selector;
- accepted media types in preference order;
- request-level `fhirVersions[]`;
- Holder choices;
- trust and policy states that affect disclosure;
- available FHIR package, profile-family, and canonical-resolution services;
- Questionnaire answers or prefill data where applicable.

For `fhir.resources` selectors, matching should consider exact profiles, profile-family membership, resource types, FHIR version compatibility, Holder choice, and local policy. Wallets should preserve `meta.profile[]` values they know, including `|version` suffixes. They should not manufacture wrapper-level profile claims merely to satisfy a selector.

For `questionnaire` selectors, the Wallet should support the flattened `canonical` and/or `resource` shape directly on the selector. Versioned Questionnaire canonicals should be resolved by structured canonical resolution or FHIR search plus post-resolution verification, not by stripping the suffix and fetching a bare URL. When both canonical and inline resource are supplied, material disagreement should be surfaced as `unsupported` or `error` rather than silently merging definitions.

#### 15.2.4 Response construction

Wallet response construction is simplest when it starts from a table of request-item outcomes and a separate list of Artifacts. Each Artifact should have a unique response-scoped id, a recognized `mediaType`, a non-empty `fulfills[]`, and media-type-defined payload fields. Every request item should receive exactly one `requestStatus[]` entry whether or not an Artifact is returned.

For the two core media types:

- `application/fhir+json` Artifacts should carry `fhirVersion` and a single FHIR Resource or Bundle in `value`;
- `application/smart-health-card` Artifacts should carry `value.verifiableCredential[]` and no outer Artifact-level `fhirVersion`.

Wallet code should reject or avoid generic Artifact helpers that accept arbitrary media types with arbitrary `value`, `url`, or `data` carriers unless a registered extension media type has explicitly defined that shape. This makes extension support a typed capability rather than an accidental fallback.

Many-to-many fulfillment is useful, but response builders should validate every fulfillment edge before emitting the response. If one Bundle fulfills both demographics and coverage items, both items need to accept `application/fhir+json`, and the Bundle content should be responsive to both selectors. If a broad clinical-history item is only partly covered, the status should say `partial` even when several valid Artifacts are returned.

#### 15.2.5 Same-device response packaging

After constructing the SMART response JSON, the Wallet's same-device adapter packages it as the issuer-signed mdoc element `smart_health_checkin_response` in namespace `org.smarthealthit.checkin` under `docType` `org.smarthealthit.checkin.1`. The response is then protected in the mdoc `DeviceResponse` and HPKE-encrypted for the Verifier with the §8 suite and `SessionTranscript`.

Implementation tests should verify:

- the SMART response is an `IssuerSignedItem.elementValue` string, not a device-signed replacement element or plaintext Digital Credentials API field;
- the MSO value digest covers the complete tag-24-wrapped issuer-signed item;
- `DeviceAuthentication` uses the same `SessionTranscript` as request handling and HPKE;
- HPKE uses DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD;
- the outer response is `{"protocol":"org-iso-mdoc","data":{"response":"..."}}`.

Demo Wallets often use self-signed issuer material or generated device keys. That can be appropriate for fixtures and local development if labeled clearly. Production Wallets and deployment profiles need explicit key custody, issuer trust, revocation, rotation, and test-vs-production separation policies.

### 15.3 EHR ingestion

EHR ingestion begins after the Verifier has completed transport validation, SMART response validation, and request/response cross-validation. A valid SMART Health Check-in response means the protocol exchange was valid; it does not by itself complete patient matching, establish legal authority, prove clinical provenance for unsigned data, adjudicate eligibility, or require EHR write-back.

An ingestion pipeline should keep the following records logically separate:

- the original SMART request and request item definitions;
- the presentation validation report and trust-layer outcomes;
- the extracted SMART response;
- each Artifact payload and its validation results;
- SMART Health Card issuer and payload validation results;
- raw FHIR JSON `fhirVersion`, Bundle, resource, and profile evidence;
- local patient-match, encounter-match, consent, provenance, deduplication, and reconciliation decisions;
- final workflow disposition for each request item.

For raw FHIR JSON Artifacts, receivers should treat the content as patient-mediated unless the payload or deployment profile supplies separate provenance or signature evidence. Practical ingestion often includes FHIR parsing, release-specific validation, resource-type checks, `meta.profile[]` inspection, QuestionnaireResponse checks, terminology or invariant validation where required, deduplication against existing records, and quarantine or staff review when evidence is insufficient.

For SMART Health Card Artifacts, receivers should verify each JWS, inspect the signed FHIR payload, apply issuer trust policy, and then evaluate whether the signed content satisfies the original selectors. A signed SMART Health Card can still be irrelevant to a particular request item, stale for a workflow, or insufficient under local policy.

EHR systems should expect normal non-fulfillment outcomes. `declined`, `partial`, `unavailable`, `unsupported`, and `error` are not necessarily transport failures. Workflow rules can decide whether to continue check-in, ask staff to collect missing information, re-request a narrower item, route to manual review, or proceed with a warning.

When importing or attaching returned content, systems should avoid losing protocol context. It is useful to retain item ids, Artifact ids, fulfillment edges, status codes, FHIR version, profile evidence, source-trust classification, and validation timestamps with the local record or audit trail. At the same time, privacy policy should limit routine logs and telemetry so they do not capture raw FHIR payloads, SMART Health Cards, Questionnaire answers, HPKE plaintext, private keys, bearer URLs, full launch URLs, or unnecessary status messages.

For in-person deployments, completion displays and staff screens should be driven by local workflow state after validation. They should not assume that scanning a QR code, loading a landing page, receiving an encrypted response, or seeing a `fulfilled` status automatically means EHR import succeeded.

### 15.4 SDK packaging guidance

SDKs are most useful when they mirror the protocol layers and expose testable seams rather than a single monolithic “check-in” function.

A typical SDK family can be organized as:

- **core model package**: TypeScript, Kotlin, Swift, Java, or other models for `SmartHealthCheckinRequest`, request items, selectors, `SmartHealthCheckinResponse`, Artifacts, and statuses; JSON parsing; schema validation; duplicate-key handling where the runtime permits it; §6.6 cross-validation helpers;
- **FHIR helper package**: canonical parsing and preservation, resolver interfaces, `profilesFrom[]` family lookup hooks, raw FHIR Bundle traversal, QuestionnaireResponse helpers, and SMART Health Card payload inspection hooks;
- **Verifier same-device package**: `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, optional `readerAuth`, Digital Credentials API request construction, HPKE opening, mdoc validation, stable-element extraction, and validation reports;
- **Wallet same-device package**: request parsing, origin and reader-auth classification, Holder-review models, response construction hooks, mdoc response construction, HPKE sealing, and platform response formatting;
- **platform bindings**: browser helpers, Android Credential Manager provider and matcher integration, native UI adapters, framework-specific components, and diagnostic export controls;
- **test and fixture package**: JSON examples, negative corpora, byte ladders, self-signed demo keys, real-platform captures, and conformance-candidate vectors.

Core packages should not depend on kiosk relays, EHR-specific persistence, demo assets, Android activities, Compose, React, browser globals, or production trust anchors. Same-device transport packages should not need to know how a Wallet stores patient data or how an EHR reconciles imports. Platform bindings can compose the layers for a product, but the public API should still let tests exercise each layer independently.

SDK validation APIs should report structured errors with section-oriented categories, for example request-shape errors, selector errors, canonical-resolution errors, presentation-wrapper errors, HPKE errors, mdoc validation errors, SMART response shape errors, cross-validation errors, FHIR payload errors, SMART Health Card errors, and deployment-policy failures. User-facing applications can map those errors to safe recovery text without logging sensitive payloads or exposing stack traces.

SDK authors should include migration tests for known stale shapes and experiments:

- reject `profilesFrom` encoded as a scalar or package object;
- reject nested `questionnaire` selector forms;
- reject unrecognized core Artifact media types unless an extension is registered and implemented;
- reject `GenericArtifact`-style fallback carriers in core validation;
- reject versioned canonical resolution that strips `|version` and direct-fetches the bare URL without structured resolution and post-resolution verification;
- reject old dynamic mdoc element-name or alternate request-carrier experiments;
- reject `DeviceRequest.version` `"1.1"` `readerAuthAll` as a substitute for the version 1.0 per-`DocRequest.readerAuth` mechanism unless a future profile explicitly adds it.

Finally, SDKs should make diagnostics explicit. Debug exports, byte ladders, and fixture captures are valuable for interoperability, but APIs should require deliberate opt-in and labeling for outputs that include plaintext SMART requests or responses, FHIR payloads, SMART Health Cards, private or test keys, certificate chains, `DeviceResponse` plaintext, HPKE fields, request-opening material, origins, package names, launch URLs, or workflow identifiers.
