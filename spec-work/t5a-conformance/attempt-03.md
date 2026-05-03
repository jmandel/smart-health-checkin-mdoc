## 4. Conformance

This section identifies conformance targets and names the feature sets against which implementations can claim support. It is a cross-cutting index of obligations defined in §§5-9 and the supporting appendices. It does not create a second source of request, response, trust, mdoc, kiosk, schema, CDDL, fixture, security, privacy, or registry requirements.

A product can implement more than one target. A single deployed system might act as Requester, Verifier, Kiosk creator, Completion display, and downstream receiver; a phone page might act as Phone presenter and phone-local Verifier; a Wallet normally acts as Wallet/Responder. Each implementation SHALL satisfy the requirements for every target and optional feature it claims.

### 4.1 Conformance targets

#### 4.1.1 Requester / Verifier

A **Requester** is conformant when it constructs SMART requests according to §5 and consumes SMART responses only after the applicable validation rules have been applied. A Requester SHALL NOT place requester identity, organization metadata, origin, reader credentials, kiosk metadata, callback endpoints, or trust assertions in the SMART request body as substitutes for presentation-layer trust.

A **Verifier** is conformant for a claimed presentation flow when it packages a valid SMART request for that flow, validates the returned presentation artifacts required by the flow, extracts a SMART response, and applies §6.6 cross-validation against the original SMART request before Requester use. For the same-device `org-iso-mdoc` feature, the Verifier's obligations are those in §8.2, §8.3, §8.7, and §8.8. For the kiosk completion context, Verifier or Completion-display validation also includes the applicable §9 binding and decryption checks.

#### 4.1.2 Wallet / Responder

A **Wallet/Responder** is conformant when it receives a SMART request through a claimed presentation flow, validates the request as required by §5 and the selected flow, preserves Holder control at request-item granularity, constructs a SMART response under §6, and returns that response through the selected presentation flow.

A Wallet/Responder SHALL preserve the distinction between clinical request fields and authenticated trust evidence. In particular, it SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown request members, kiosk wrapper fields, origin-looking strings, or Artifact contents as authenticated requester identity unless the selected presentation flow, trust processing, or deployment policy establishes that fact outside the SMART request body.

#### 4.1.3 Phone presenter

A **Phone presenter** is the kiosk phone-side target. A Phone presenter is conformant for the kiosk feature when it performs §9.7 pointer parsing, provider retrieval, wrapper `requestId` binding, encrypted-envelope validation and opening, compact JWS verification, creator and provider policy checks, freshness checks, embedded `smartRequest` validation, and fresh phone-local re-entry into the §8 same-device flow.

A Phone presenter SHALL keep the kiosk wrapper `requestId` distinct from `smartRequest.id`. It SHALL NOT reuse or infer a §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, Wallet response, SMART response, or response-submission ciphertext from the Pointer URL, QR code, provider row, encrypted envelope, or kiosk request JWS.

#### 4.1.4 Kiosk creator

A **Kiosk creator** is conformant for the kiosk feature when it creates the §5 SMART request, embeds that complete request directly as `KioskRequestPayload.smartRequest`, signs the kiosk request payload, encrypts the compact JWS into an `EncryptedKioskRequest`, publishes only encrypted request state through the selected provider, and displays or conveys only a Pointer URL as defined in §§9.1-9.6.

A Kiosk creator SHALL NOT replace `smartRequest` with `requestProfile`, a preset, an IPS shortcut, a broad selector label, an SDK helper object, an inline §8 request fragment, or any other non-§5 clinical wrapper. A Kiosk creator SHALL preserve wrapper `requestId` bindings and SHALL NOT put requester identity, trust, relay, completion, encryption, or pointer metadata inside the embedded SMART request.

#### 4.1.5 Completion display

A **Completion display** is conformant for the kiosk feature when it observes candidate encrypted submissions for the active wrapper `requestId`, downloads bounded ciphertext, decrypts locally using the retained desktop private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk`, validates `SubmissionPlaintext.requestId`, validates the active `payload.kind = "smart-health-checkin-response"` payload under §6 and §6.6 against the original embedded `smartRequest`, accounts for §8 validation before clinical workflow use, and applies §7 trust interpretation.

A Completion display SHALL NOT treat provider row presence, upload success, storage path, row order, provider app id, decrypted wrapper binding, or response-submission decryption alone as Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.

#### 4.1.6 Submission service / provider

A **Submission service** or provider is conformant for the kiosk relay role when it can store, serve, notify about, and make available the opaque encrypted request and submission state required by §9 without needing plaintext clinical content or private key material. A Submission service SHALL NOT require plaintext SMART requests, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder decisions, §8 response plaintext, desktop private keys, Wallet secrets, request-opening private key material, or shared secrets merely to route, store, or notify about kiosk state.

Provider-specific APIs, databases, queues, webhooks, object stores, and local-network transports MAY differ, provided the protocol-visible behavior satisfies §9.11 and any claimed provider profile.

#### 4.1.7 Profile, fixture, schema, CDDL, and conformance-test authors

A **profile author** or **conformance-test author** is conformant to this specification when additional constraints, tests, schemas, CDDL fragments, and fixtures derive from the normative body rather than replacing it. Such authors SHALL identify the target role, feature set, section reference, expected outcome, and any stricter deployment assumption for each requirement they add or test.

Appendix B JSON Schema, Appendix C pseudo-CDDL, Appendix D fixtures, and Appendix H FHIR mapping material support validation and testing. They SHALL NOT be used to introduce alternate request carriers, response carriers, selector semantics, kiosk wrappers, trust claims, status meanings, media-type substitutions, or production trust anchors that are absent from the normative sections they support.

### 4.2 Mandatory features

Every implementation that claims **SMART Health Check-in Core 1.0** conformance for a clinical role SHALL support the transport-neutral clinical content model in §§5-6 for that role:

- A Requester SHALL construct `SmartHealthCheckinRequest` objects with the fixed `type`, `version`, request `id`, `items[]`, item ids, item display fields, selectors, `accept[]`, and canonical-handling rules defined in §5.
- A Wallet/Responder SHALL parse, validate, and answer SMART requests according to §5 and SHALL construct `SmartHealthCheckinResponse` objects according to §6.
- A Verifier or receiver SHALL validate SMART responses according to §6, including exact `requestId` matching, `fulfills[]` resolution, Artifact media-type acceptance, unique `requestStatus[]` coverage, and the FHIR/SMART Health Card checks applicable to returned Artifacts.

Core support includes the version 1.0 request selector kinds `fhir.resources` and `questionnaire`, the status-code set in §6.4, the response Artifact common shape in §6.2, and the core Artifact media types `application/fhir+json` and `application/smart-health-card` to the extent a role advertises, returns, or consumes them. A Requester SHALL list only media types it can process for the corresponding item; a Wallet/Responder is not required to return a media type that the Holder declines, that it cannot produce, or that is unavailable from Holder data sources.

Core support does not require a Wallet to be a longitudinal health-record store, a FHIR server, a SMART Health Card issuer, a full FHIR profile validator, or an EHR write-back component. Core support also does not require a Requester to accept every possible FHIR profile, every FHIR release, every extension selector, or every extension Artifact media type.

A conformant implementation SHALL preserve the trust separation in §7. Raw FHIR JSON remains patient-mediated unless separate provenance, signature, source attestation, authenticated retrieval evidence, extension-profile rule, or deployment policy establishes clinical-source trust. Demo keys, self-signed material, diagnostic fixtures, and prototype allow-lists SHALL NOT be represented as production trust anchors unless an applicable deployment policy explicitly accepts them for that environment.

### 4.3 Optional features

An implementation MAY claim support for one or more optional features. A requirement in an optional feature applies only to implementations that claim that feature or operate in a deployment profile that requires it.

#### 4.3.1 Same-device direct `org-iso-mdoc`

The **same-device direct `org-iso-mdoc` feature** is the base version 1.0 presentation flow defined in §8. A Verifier or Wallet/Responder that claims this feature SHALL implement the identifiers, request carrier, stable response element, tag-24 boundaries, direct `dcapi` `SessionTranscript`, HPKE response encryption, mdoc validation, SMART response extraction, and validation checklists in §8 and supporting appendices.

This feature is transport binding support. It does not change the §5 SMART request, §6 SMART response, §7 trust-layer separation, or clinical-source trust rules.

#### 4.3.2 Optional `readerAuth` and deployment trust policy

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. A Verifier that claims support for signed reader authentication SHALL construct per-`DocRequest.readerAuth` as defined in §8. A Wallet/Responder that claims support for reader authentication SHALL verify and classify `readerAuth` states according to §§7-8 and its applicable trust policy.

A deployment profile MAY require authenticated origin, privileged-caller policy, mandatory `readerAuth`, reader certificate chains, revocation checks, issuer trust anchors, self-attested wallet labeling, nonce-length rules, replay handling, or stricter Holder display. Such a profile SHALL state the affected targets and SHALL NOT redefine SMART request fields, SMART response fields, selector semantics, status codes, or Artifact media-type rules.

#### 4.3.3 Cross-device kiosk wrapper

The **cross-device kiosk feature** is the wrapper defined in §9. A Kiosk creator, Phone presenter, Submission service/provider, Completion display, Verifier, or Requester that claims kiosk support SHALL implement the applicable §9 responsibilities for its role. Kiosk support includes direct `smartRequest` embedding, pointer-only QR/URL behavior, untrusted-relay treatment, wrapper `requestId` binding, phone-local §8 re-entry, response-submission encryption, Completion display processing, and provider abstraction as applicable.

Kiosk support does not define a second clinical request or response model. The embedded `smartRequest` is a §5 SMART request, and the successful active payload contains a §6 SMART response. The wrapper `requestId` remains distinct from `smartRequest.id` and from `SmartHealthCheckinResponse.requestId`.

#### 4.3.4 Fixture, schema, CDDL, and validation-profile material

Appendix B schema conformance, Appendix C pseudo-CDDL conformance, Appendix D fixture conformance, and future external conformance-test-suite conformance are optional unless a deployment or certification program requires them. A tool that claims one of these profiles SHALL state which schema, CDDL fragment, fixture class, vector class, or checklist row it implements and whether the expected comparison is structural, semantic, byte-exact, diagnostic, or historical.

Conformance candidates and diagnostic fixtures are not production trust anchors. A fixture containing demo certificates, demo issuer keys, intentionally public private keys, static request-opening keys, or self-attested material SHALL be labeled as test or demo material and SHALL NOT be used to claim production issuer, reader, creator, or clinical-source trust.

#### 4.3.5 Reserved future OID4VP binding

The OpenID4VP binding in §10 is reserved for future work. An implementation MAY experiment with an OID4VP mapping only as an extension or future-profile activity. Such experimentation SHALL NOT be represented as required SMART Health Check-in 1.0 conformance and SHALL NOT weaken the direct `org-iso-mdoc` or kiosk requirements claimed by the implementation.

### 4.4 Profile identifiers

Conformance claims SHOULD identify the role, feature set, specification version, and any deployment profile or fixture profile. Until §13 finalizes registry syntax, this specification uses the following profile labels as stable human-readable claim labels:

| Profile label | Applies to | Summary |
| --- | --- | --- |
| `shc-checkin-core-1` | Requester, Wallet/Responder, Verifier/receiver, profile authors | Transport-neutral §5 request and §6 response support. |
| `shc-checkin-mdoc-direct-1` | Verifier, Wallet/Responder, Phone presenter acting as phone-local Verifier | Same-device direct `org-iso-mdoc` support under §8. |
| `shc-checkin-mdoc-reader-auth-1` | Verifier, Wallet/Responder, deployment profiles | Optional per-`DocRequest.readerAuth` support and validation under §§7-8. |
| `shc-checkin-kiosk-1` | Kiosk creator, Phone presenter, Submission service/provider, Completion display, Verifier/Requester | Cross-device kiosk wrapper under §9. |
| `shc-checkin-schema-json-1` | Validators, SDKs, conformance-test authors | Appendix B JSON Schema support for the §5/§6 model, subject to procedural checks. |
| `shc-checkin-fixtures-1` | Fixture producers and conformance-test authors | Appendix D fixture classification and selected vector classes. |
| `shc-checkin-oid4vp-reserved` | Experimenters and future-profile authors | Reserved placeholder; not a SMART Health Check-in 1.0 required binding. |

A conformance claim SHALL NOT use a profile label to imply support for roles or optional features that were not implemented and tested. For example, support for `shc-checkin-core-1` does not imply kiosk support, production reader trust, production mdoc issuer trust, SMART Health Card issuer trust, or OID4VP support. Support for `shc-checkin-kiosk-1` includes the role-specific kiosk responsibilities claimed by the implementation; it does not by itself make an untrusted Submission service a clinical processor.

Deployment profiles MAY define more specific identifiers for jurisdictions, certification programs, provider profiles, fixture vector classes, trust frameworks, or stricter security/privacy policies. Those identifiers SHALL be additive constraints on the base labels above unless a future version of this specification says otherwise.

### 4.5 Versioning rules

The SMART request and SMART response `version` fields are model versions for the transport-neutral clinical content model. For SMART Health Check-in 1.0, Requesters and Wallets/Responders SHALL use the string value `"1"` in those fields, as defined in §§5.2.2 and 6.1.2. A Wallet/Responder SHALL reject a SMART request with another value unless a future version-compatibility rule explicitly defines compatible handling. A Verifier SHALL reject a SMART response with another value unless a future version-compatibility rule explicitly defines compatible handling.

The SMART request and SMART response `type` discriminators are fixed for version 1.0: `smart-health-checkin-request` and `smart-health-checkin-response`. Implementations SHALL NOT use a kiosk wrapper field, mdoc document type, JWS `typ`, Artifact media type, fixture profile, or future OID4VP value in place of those clinical model discriminators.

Presentation-flow versions are separate from clinical model versions. The same-device direct `org-iso-mdoc` flow uses `DeviceRequest.version` `"1.0"`, mdoc `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and stable element `smart_health_checkin_response` as defined in §8. The kiosk wrapper uses its own version fields, content type, JWS `typ`, HKDF info strings, algorithm labels, pointer shape, and submission payload kind as defined in §9. A conforming implementation SHALL NOT infer compatibility across these layers merely because version numbers look similar.

Future minor or extension profiles MAY add fields, selectors, media types, Artifact forms, fixture classes, or deployment constraints without changing the core version string only when recipients that do not understand the addition can ignore it or report it as unsupported without changing the meaning of known required fields. A future incompatible change to required field semantics, request/response binding, status accounting, core selector meaning, same-device carriers, or kiosk wrapper bindings requires a new version or profile identifier.

### 4.6 Extension model

SMART Health Check-in is extensible through registered or explicitly profiled extension points. Extensions are additive. They SHALL NOT redefine the semantics of core request fields, response fields, selectors, status codes, Artifact media-type rules, same-device request and response carriers, kiosk wrapper identifiers, or trust-layer separation.

A content-selector extension SHALL follow §5.4.3. Its definition SHALL specify the exact `content.kind` value, JSON shape, clinical meaning, fulfillment rules, interaction with `accept[]` and `fhirVersions[]`, status behavior, validation rules, security and privacy considerations, and examples. A Wallet/Responder that does not support an extension selector SHALL NOT guess its semantics from display text; it rejects or reports `unsupported` according to §5, §6, and the selected flow.

An Artifact media-type extension SHALL follow §6.3.3 and §5.6. Its definition SHALL specify the media type, payload fields, use of `value`, `url`, or `data`, dereferencing and integrity rules, FHIR-version semantics if any, validation rules, status behavior, security and privacy considerations, and compatibility with core media types if any. A Wallet/Responder SHALL NOT claim an extension Artifact fulfills an item unless the item accepted that media type or a supported compatibility rule applies. A Verifier SHALL enforce the same rule under §6.6.

A status-code extension SHALL NOT be used in a version 1.0 SMART response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat unknown status codes as invalid for version 1.0 response validation unless such support is present.

A kiosk or presentation extension SHALL preserve the direct `smartRequest` decision, the wrapper `requestId` versus `smartRequest.id` distinction, pointer-only QR behavior for the active kiosk profile unless a new pointer profile is explicitly identified, the untrusted relay boundary, and the separation among §9 request-envelope encryption, §9 response-submission encryption, and §8 HPKE. It SHALL NOT use an extension to put plaintext clinical content or private keys into the Pointer URL or untrusted provider state.

An extension or deployment profile MAY add stricter validation, narrower accepted media types, production trust anchors, provenance requirements, size limits, duplicate-handling rules, deterministic vector encodings, or registry-controlled identifiers. It SHALL state those constraints as additional profile requirements and SHALL NOT silently change the meaning of a base SMART Health Check-in 1.0 conformance claim.

### 4.7 Conformance checklist cross-link

Appendix A is the authoritative checklist index for conformance testing. Each Appendix A row should identify exactly one requirement, target, section reference, feature or profile label, and test expectation. Appendix A is not an independent source of additional requirements; if a checklist row conflicts with §§4-14, the normative body controls and the checklist should be corrected.

Conformance checklist authors SHOULD distinguish at least these groups:

1. Core §5 request-construction requirements for Requesters.
2. Core §5 request-parsing and Holder-control requirements for Wallets/Responders.
3. Core §6 response-construction requirements for Wallets/Responders.
4. Core §6.6 response-validation requirements for Verifiers and receivers.
5. §7 trust-separation and deployment-profile requirements.
6. §8 same-device `org-iso-mdoc` Verifier and Wallet/Responder requirements.
7. Optional §8 `readerAuth` and deployment trust-policy requirements.
8. §9 Kiosk creator, Phone presenter, Submission service/provider, and Completion display requirements.
9. Appendix B schema checks and procedural checks not expressible in JSON Schema.
10. Appendix C CDDL or pseudo-CDDL checks, with clear byte-boundary scope.
11. Appendix D fixture classes, including whether material is conformance candidate, diagnostic, historical, implementation regression, or illustrative.
12. Extension, registry, security, privacy, and internationalization requirements once §§11-14 are complete.

A conformance result SHOULD state whether each requirement was passed, failed, not applicable because the feature was not claimed, or not testable because it belongs to deployment policy outside the selected conformance profile.

## Organizer notes

**Strengths:** This draft keeps §4 as a cross-cutting conformance map rather than a duplicate of §§5-9. It names the requested targets, separates core clinical model support from same-device, kiosk, readerAuth, fixture/schema material, and future OID4VP, and preserves the major accepted decisions: direct `smartRequest`, no presets or IPS shortcuts, wrapper `requestId` distinct from `smartRequest.id`, pointer-only QR, untrusted relay, source-trust separation, raw FHIR as patient-mediated unless separately provenanced, and no production trust from demo keys.

**Caveats:** The profile labels in §4.4 are proposed human-readable labels pending §13 registry closure. The organizer may want to replace them with final canonical URLs or URNs once T5.D decides registry syntax. The draft intentionally avoids imposing global size, TTL, nonce-length, duplicate-member, deterministic-CBOR, or production trust-anchor rules because those remain deployment-profile, security, registry, or fixture-profile topics.

**Open questions:** Should the final §4 make the same-device direct `org-iso-mdoc` feature mandatory for all SMART Health Check-in 1.0 implementations, or only mandatory for implementations claiming a presentation binding? Should Appendix A include SHOULD-level privacy and security guidance as testable recommendations or leave them to T5.B/T5.C profiles? Should the schema and fixture labels be registry identifiers or certification-program labels?

**Downstream dependencies:** T5.F should turn these targets and features into one-row-per-rule checklist entries. T5.D should finalize profile identifier syntax, extension registries, status-code registry policy, JWS `typ`, kiosk content type, and provider/profile identifiers. T5.B/T5.C should threat-check and privacy-check the conformance boundaries, especially optional readerAuth, demo keys, untrusted relay metadata, raw FHIR overclaiming, logs, and fixture material. T6.C should decide which diagnostic or conformance-candidate fixtures are promoted to external test vectors.
