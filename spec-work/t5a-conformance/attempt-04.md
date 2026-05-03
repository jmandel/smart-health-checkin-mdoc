## 4. Conformance

This section defines conformance targets and feature claims for SMART Health Check-in 1.0. It is a map over the normative requirements in §§5-9 and the appendices; it does not create a second source of protocol behavior. A component conforms by satisfying the requirements for the role and feature set it claims.

A single product can claim more than one target. For example, a clinic desktop can be a Requester, Verifier, Kiosk creator, Completion display, and downstream receiver; a phone web application can be a Phone presenter and a phone-local Verifier for §8. When one product performs multiple roles, it SHALL satisfy the requirements for each claimed role at the boundary where that role's protocol artifacts are produced or consumed.

Appendix A is the conformance-checklist index. If this section and a later normative section appear to disagree, the more specific requirement in §§5-9 controls and Appendix A should be corrected to match it.

### 4.1 Conformance targets

The conformance targets in Table 4-1 are used throughout this specification and in Appendix A.

| Target | Scope of claim | Primary normative sections |
| --- | --- | --- |
| **Requester / Verifier** | Creates a SMART request, invokes a presentation flow, validates the returned transport artifact, extracts a SMART response, and validates it before Requester use. | §§5, 6.6, 7, 8; §9 when kiosk roles are also claimed |
| **Wallet / Responder** | Receives a SMART request through a supported flow, applies Holder review and Wallet policy, constructs a SMART response, and returns it through the selected flow. | §§5, 6, 7, 8 |
| **Phone presenter** | Resolves a kiosk Pointer URL, validates the kiosk wrapper, constructs a fresh phone-local §8 request from the embedded `smartRequest`, and submits the encrypted result. | §§9.7-9.8, with §8 when acting as phone-local Verifier |
| **Kiosk creator** | Creates the kiosk wrapper, signs and encrypts the request envelope, publishes encrypted request state, and displays a pointer-only URL. | §§9.1-9.6 |
| **Completion display** | Observes encrypted kiosk submissions, decrypts them locally, validates wrapper and SMART response bindings, and presents completion state. | §§9.8-9.11, plus §§6-8 and §7 as applicable |
| **Submission service / provider** | Stores, serves, or notifies about encrypted kiosk request and submission state without access to plaintext clinical content. | §§9.2, 9.5, 9.8, 9.11 |
| **Profile author / conformance-test author** | Defines deployment profiles, extension registrations, fixture profiles, or tests that constrain optional features without changing core semantics. | §§4.3-4.6, §7.6, §13, Appendices A-D |
| **Browser / User Agent** | Supplies the W3C Digital Credentials API or platform mediation assumed by §8. | §8 and W3C Digital Credentials API; this specification does not define a standalone Browser conformance class |

A component SHALL NOT claim conformance for a target unless it implements the mandatory requirements for that target and the feature profiles it advertises. A component MAY implement a subset of targets if the product boundary exposes only that subset.

Requester and Verifier are listed together because many implementations combine them. A combined Requester / Verifier SHALL keep the clinical-request role distinct from the presentation-validation role: requester identity, origin, reader authentication, trust anchors, certificates, kiosk metadata, and relay metadata SHALL NOT be added to the SMART request body except as permitted by §5.

Wallet and Responder are listed together because the Wallet normally performs the Responder role. A Wallet / Responder SHALL preserve Holder control, request item ids, Artifact media types, fulfillment links, and per-item status semantics when constructing a SMART response.

A Submission service / provider conformance claim is a relay claim only. It SHALL NOT imply clinical Requester, Verifier, Wallet, issuer, source-provenance, Holder-consent, or downstream-authorization conformance.

Profile authors and conformance-test authors SHALL identify the targets and optional features being tested. They SHALL NOT convert examples, demo constants, checked-in demo keys, implementation-specific SDK names, provider product names, or historical fixtures into production trust anchors or universal protocol requirements unless a normative profile or registry entry explicitly does so.

### 4.2 Mandatory features

All conforming implementations that process SMART Health Check-in clinical objects SHALL support the transport-neutral clinical content model for the roles they claim:

1. A Requester SHALL construct `SmartHealthCheckinRequest` objects according to §5, including the fixed `type` and `version`, request `id`, request items, `content.kind`, and item `accept[]` requirements.
2. A Wallet / Responder that accepts a SMART request SHALL parse and validate the request under §5 before constructing a SMART response or reporting supported item-level outcomes.
3. A Wallet / Responder SHALL construct `SmartHealthCheckinResponse` objects according to §6, including fixed `type` and `version`, `requestId` equal to the SMART request `id`, Artifact shape, `mediaType`, `fulfills[]`, and `requestStatus[]` coverage.
4. A Verifier or receiver SHALL apply the §6.6 cross-validation rules before treating a SMART response as protocol-valid for Requester use.
5. Implementations SHALL preserve the distinction between the clinical content model and presentation transport. A valid SMART request or response does not by itself prove origin trust, reader trust, mdoc issuer trust, device-key proof, Holder identity, clinical-source provenance, or downstream workflow authorization.

The following clinical content features are mandatory for the relevant target because they are part of the core §5-§6 model:

| Feature | Mandatory target behavior | Test implication |
| --- | --- | --- |
| Fixed request and response discriminators | Requesters and Wallets / Responders produce `type` and `version` exactly as §§5-6 define; Wallets / Responders and Verifiers reject incompatible values unless a future compatibility rule applies. | Positive and negative JSON validation tests. |
| Request item accounting | Requesters assign unique item ids; Wallets / Responders preserve them; Verifiers validate `fulfills[]` and `requestStatus[].item` against them. | Cross-validation tests with missing, duplicate, and unknown ids. |
| Core selectors | Requesters and Wallets / Responders support the `fhir.resources` and `questionnaire` selector shapes when they claim general core clinical processing. A Wallet / Responder that cannot process a selector SHALL reject or report `unsupported` as §§5-6 allow rather than guessing from display text. | Selector-shape and unsupported-selector tests. |
| `profilesFrom[]` array shape and additive profile selectors | `profilesFrom` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive; `resourceTypes[]` is a separate resource-type constraint. | Tests reject object/string `profilesFrom` and verify additive semantics. |
| Core media types | Requesters advertise only accepted media types. Wallets / Responders return Artifacts only with accepted `mediaType` values unless a registered compatibility rule applies. Verifiers enforce the same check. | Media-type mismatch tests. |
| Raw FHIR JSON handling | Raw FHIR JSON Artifacts use `mediaType: "application/fhir+json"`, include `fhirVersion`, and are patient-mediated unless separately provenanced. | FHIR-version and source-trust tests. |
| SMART Health Card handling | SMART Health Card Artifacts use `mediaType: "application/smart-health-card"`, carry `value.verifiableCredential[]`, and do not carry an outer Artifact-level `fhirVersion`. | SHC shape and outer-`fhirVersion` rejection tests. |
| Status coverage | `requestStatus[]` covers every request item exactly once and uses known status codes unless an explicit supported extension applies. | Status coverage and unknown-code tests. |
| Source-trust separation | Implementations do not treat transport success, wrapper validation, or raw FHIR JSON shape as clinical-source proof. | Policy/test assertions distinguish SMART Health Cards, raw FHIR, and provenance extensions. |

No implementation is required merely by core clinical conformance to support every FHIR profile, every profile family, every Questionnaire feature, every FHIR release, every SMART Health Card issuer, every extension media type, direct same-device transport, kiosk transport, reader authentication, or future OID4VP. Those are capability, deployment-profile, or optional-feature claims.

### 4.3 Optional features

An optional feature is not required for every SMART Health Check-in implementation. However, an implementation that advertises an optional feature SHALL implement the normative requirements for that feature and target.

#### 4.3.1 Direct same-device `org-iso-mdoc` presentation

The direct same-device profile is the base version 1.0 presentation flow. A Verifier or Wallet / Responder that claims support for this feature SHALL implement §8 for its role. In particular:

- a Verifier SHALL carry the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
- a Wallet / Responder SHALL carry the SMART response only as the `elementValue` of the issuer-signed `smart_health_checkin_response` item in namespace `org.smarthealthit.checkin`;
- both sides SHALL use the §8 `SessionTranscript` construction, direct `dcapi` handover, and required HPKE suite for the core profile; and
- a Verifier SHALL complete the §8.7 and §8.8 validation checklist, including §6.6 cross-validation, before accepting the response.

Support for direct same-device presentation does not imply support for kiosk, readerAuth, a particular production issuer trust anchor, full FHIR profile validation, or clinical-source trust for unsigned raw FHIR JSON.

#### 4.3.2 Cross-device kiosk wrapper

A Kiosk creator, Phone presenter, Completion display, or Submission service / provider that claims kiosk support SHALL implement the applicable §9 requirements for its target. The kiosk feature is a wrapper around the same SMART request and the same phone-local §8 flow; it SHALL NOT define or accept a second clinical request language.

The kiosk feature claim includes these preserved decisions:

- `KioskRequestPayload.smartRequest` is the complete §5 SMART request object, embedded directly;
- `requestProfile`, preset, presetId, IPS shortcut, “all of the above” labels, SDK helper wrappers, and inline §8 request fragments are not substitutes for `smartRequest`;
- the kiosk wrapper `requestId` is distinct from `smartRequest.id` and from `SmartHealthCheckinResponse.requestId`;
- the Pointer URL / QR profile is pointer-only and carries the wrapper id as `#r=<requestId>`;
- the Submission service is an untrusted relay for encrypted state and does not receive plaintext clinical content; and
- the Phone presenter constructs a fresh §8 request on the phone after wrapper validation and does not reuse §8 artifacts from the QR, provider row, encrypted envelope, or kiosk request JWS.

#### 4.3.3 Reader authentication and deployment trust policy

`readerAuth` is optional in the core version 1.0 same-device flow unless a deployment profile makes it mandatory. A Verifier that includes `readerAuth` SHALL construct it as §8 defines. A Wallet / Responder that supports or relies on reader authentication SHALL verify it and classify absent, failed, valid-but-untrusted, and trusted states according to §7 and §8.

Deployment profiles MAY require reader authentication, authenticated origins, privileged-caller policies, issuer trust anchors, self-attested wallet labeling, clinical-source provenance, stricter FHIR validation, size limits, expiration windows, or single-use kiosk completion. A deployment profile SHALL document which targets and trust layers it constrains and SHALL NOT redefine SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, or status codes.

Demo certificates, demo issuer strings, demo audience strings, checked-in demo private keys, reflective allow-lists, provider app ids, fixture keys, and self-signed evidence SHALL NOT be treated as production trust anchors unless an explicit deployment policy accepts them for that environment and labels the resulting assurance level.

#### 4.3.4 Fixture, schema, and conformance-vector material

Appendix B schemas, Appendix C pseudo-CDDL, Appendix D fixture indexes, and Appendix E byte ladders support conformance testing but do not create alternate protocol behavior. A fixture or conformance-vector profile MAY freeze producer choices such as deterministic randomness, fixed test keys, stricter lexical ids, nonce length, digest ids, duplicate handling, or exact byte serialization for a named vector class. Such a profile SHALL identify the choices as vector constraints and SHALL NOT imply that every conforming production deployment uses the same keys, randomness, fixture ids, demo trust anchors, or historical captures.

#### 4.3.5 Future OID4VP binding

Any OpenID4VP binding described by this document is reserved for future work. A component SHALL NOT claim SMART Health Check-in 1.0 presentation conformance solely by implementing an OID4VP mapping unless a future version or registered profile defines that binding as a conformance feature. Future OID4VP work SHALL preserve the §5-§6 clinical content model, source-trust separation, extension rules, and versioning rules.

### 4.4 Profile identifiers

Profile identifiers are stable names for conformance claims, registry entries, deployment profiles, and test suites. They are not substitutes for on-the-wire fields. When a profile identifier is used in documentation, metadata, a test report, or a deployment agreement, the identifier SHALL name the feature set and target obligations being claimed.

Version 1.0 defines the following profile-identification vocabulary for conformance use:

| Profile identifier | Meaning | Key wire identifiers |
| --- | --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5-§6 SMART request/response clinical content model. | Request `type: "smart-health-checkin-request"`; response `type: "smart-health-checkin-response"`; `version: "1"`. |
| `smart-health-checkin-same-device-mdoc-1` | Direct same-device §8 presentation over W3C Digital Credentials API `org-iso-mdoc`. | Protocol `org-iso-mdoc`; `docType` `org.smarthealthit.checkin.1`; namespace `org.smarthealthit.checkin`; element `smart_health_checkin_response`; requestInfo key `org.smarthealthit.checkin.request`. |
| `smart-health-checkin-kiosk-1` | Cross-device §9 kiosk wrapper around phone-local same-device re-entry. | JWS `typ` `smart-health-checkin+kiosk-request+jws`; content type `application/smart-health-checkin-kiosk-request+jws+aesgcm`; pointer fragment `r`; request/response HKDF info strings from §9. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` support for the same-device profile. | Detached ES256 `COSE_Sign1`, `ReaderAuthentication`, COSE header label `33` (`x5chain`), §8 transcript and tag-24 `ItemsRequest` binding. |
| `smart-health-checkin-fixture-profile-1` | Named test-vector or fixture constraints over core, same-device, kiosk, or readerAuth behavior. | The profile identifies its exact fixture roots, producer assumptions, keys, byte-exact checks, and pass/fail expectations. |
| `smart-health-checkin-oid4vp-reserved` | Reserved placeholder for a future OID4VP binding. | No SMART Health Check-in 1.0 presentation conformance is implied. |

Profile authors MAY define narrower deployment profile identifiers or conformance suite identifiers. Such identifiers SHALL declare whether they include core clinical content only, same-device presentation, kiosk wrapper behavior, readerAuth, production trust policy, fixture-vector assumptions, or another registered extension.

A profile identifier SHALL NOT be placed inside a SMART request as a shortcut for requested clinical content. In particular, `requestProfile`, preset names, profile labels, IPS shortcuts, or similar wrapper fields are not part of the §5 clinical request model unless a future registered selector extension defines them without changing core semantics.

### 4.5 Versioning rules

SMART Health Check-in uses separate version markers at separate layers. Implementations SHALL compare and interpret the version marker for the layer they are processing and SHALL NOT substitute one layer's version for another.

| Layer | Version or discriminator | Rule |
| --- | --- | --- |
| SMART request | `type: "smart-health-checkin-request"`, `version: "1"` | Requesters produce these values for version 1.0; Wallets / Responders reject incompatible values unless a future compatibility rule applies. |
| SMART response | `type: "smart-health-checkin-response"`, `version: "1"` | Wallets / Responders produce these values for version 1.0; Verifiers reject incompatible values unless a future compatibility rule applies. |
| Same-device mdoc | `DeviceRequest.version` and `DeviceResponse.version` `"1.0"`; `docType` `org.smarthealthit.checkin.1` | Verifiers and Wallets / Responders use the §8 version 1.0 shape. Future major mdoc profile versions can use a new `docType` suffix. |
| Kiosk request payload | numeric `v: 1` | Kiosk processors use the §9 version-1 payload shape and reject unsupported versions. |
| Kiosk encrypted request | numeric `v: 1`, `alg`, `enc`, `contentType` | Kiosk processors validate the profile labels before decryption and use §9 request-envelope rules. |
| Kiosk submission payload | `payload.kind: "smart-health-checkin-response"` for active success | Completion displays validate the active payload kind and the nested SMART response. Other payload kinds require a future profile or extension. |
| FHIR content | request `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes | These are FHIR-layer signals, not SMART Health Check-in model versions. §§5-6 and Appendix H control their handling. |

A minor revision or deployment profile MAY add optional fields, stricter policy, new registered selector kinds, new registered media types, new status-code extensions, new fixture profiles, or new trust-profile requirements if older processors can ignore or reject the extension according to existing rules without changing core semantics.

A change is breaking and requires a new major profile or version when it changes the meaning of existing SMART request fields, SMART response fields, selector semantics, status codes, Artifact fulfillment, same-device carriers, kiosk wrapper id binding, cryptographic context separation, or required validation outcomes.

### 4.6 Extension model

SMART Health Check-in extension points are explicit. An implementation SHALL NOT use unknown fields, profile identifiers, display text, demo presets, provider metadata, or wrapper identifiers to change core semantics.

A registered extension MAY define:

- a new `content.kind` selector under §5.4.3;
- a new Artifact `mediaType` or a media-type compatibility rule under §§5.6 and 6.3.3;
- a new status code under the status-code registry, with Verifier support required before use in a version 1.0 response;
- a new completion `payload.kind` for kiosk, if it preserves §6, §7, §8, and §9 validation semantics;
- a deployment trust profile that constrains origin, readerAuth, issuer trust, clinical-source provenance, size limits, expiration, or replay handling; or
- a conformance-vector profile that fixes byte-level producer assumptions for tests.

An extension registrant SHALL define the exact identifier or media type, JSON shape, required and optional members, producer requirements, consumer validation rules, interactions with existing selectors and media types, status behavior, security considerations, privacy considerations, versioning behavior, and conformance-test implications.

An extension SHALL NOT redefine the semantics of `type`, `version`, `id`, `purpose`, `items[]`, `accept[]`, `content.kind`, `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, `requestStatus[]`, §8 request or response carriers, kiosk `smartRequest`, wrapper `requestId`, pointer-only QR behavior, or trust-layer separation.

A Wallet / Responder or Verifier that does not support an extension selector, media type, status code, profile, or payload kind SHALL NOT guess its meaning from display text, URLs, wrapper names, or implementation-specific hints. It SHALL reject the unsupported artifact or report the affected item as `unsupported` where §§5-6 permit item-level reporting.

### 4.7 Conformance checklist cross-link

Appendix A SHALL list each normative `SHALL` and `SHOULD` requirement as a separate row with at least:

| Column | Meaning |
| --- | --- |
| Section | The stable section number containing the requirement. |
| Target | Requester / Verifier, Wallet / Responder, Phone presenter, Kiosk creator, Completion display, Submission service / provider, profile author, conformance-test author, or deployment profile. |
| Feature profile | Core, same-device mdoc, kiosk, readerAuth, deployment trust, fixture profile, extension, or reserved future binding. |
| Requirement summary | Short imperative summary preserving the normative target. |
| Test implication | Schema, CDDL, fixture, byte-level, policy, or manual-review implication. |
| Notes | Any dependency on deployment policy, trust anchor, future registry, or fixture profile. |

Appendix A SHALL be an index of requirements defined elsewhere, not a source of additional obligations. Checklist rows for optional features SHALL indicate that the row applies only to implementations claiming that feature or to deployment profiles that make the feature mandatory.

A conformance test suite SHOULD separate at least these suites: core SMART request/response JSON validation; §6.6 cross-validation; same-device §8 request and response byte/structure validation; optional readerAuth validation; kiosk request-wrapper, pointer, phone-resolution, submission, and completion validation; extension-registry behavior; source-trust separation; and fixture-profile byte-exact vectors.

## Organizer notes

### Strengths

- Keeps §4 as a conformance map rather than a second protocol definition.
- Names all requested targets, including Phone presenter, Completion display, Submission service / provider, and profile/conformance-test authors.
- Separates core clinical conformance from optional same-device, kiosk, readerAuth/deployment policy, fixture profiles, and reserved OID4VP.
- Preserves key accepted decisions: direct `smartRequest`, no requestProfile/preset/IPS shortcut, wrapper `requestId` distinct from `smartRequest.id`, pointer-only QR, untrusted relay, source-trust separation, raw FHIR as patient-mediated unless separately provenanced, and no production trust claims from demo keys.

### Caveats

- The proposed profile identifiers in §4.4 are conformance labels for organizer review. §13 should either register them, rename them, or replace them with the final registry vocabulary.
- The core-selector mandatory wording may need organizer tuning if the final conformance class allows a Wallet / Responder to support only a declared subset of selector kinds and report all other core selectors as unsupported.
- The draft intentionally leaves numeric limits such as 25 MiB, 32-byte kiosk ids, 32-byte §8 nonces, and exact clock-skew windows to deployment profiles, fixture profiles, §11, or §13 unless already fixed by a claimed vector class.

### Open questions

- Should `items[]` remain allowed to be empty for core conformance, matching current §5 and Appendix B, or should T5/A or Appendix A close the zero-item request question by making non-empty items mandatory?
- Should direct same-device support be a required feature for any complete SMART Health Check-in 1.0 product claim, or should the final conformance model allow a pure core clinical validator and a kiosk-only component to claim narrower roles?
- Should `smart-health-checkin-same-device-mdoc-1` and `smart-health-checkin-kiosk-1` be formal profile identifiers, or should §13 use URI-style identifiers?

### Downstream dependencies

- T5.F / Appendix A should expand the checklist rows from §§5-9 and classify them by the targets and feature profiles named here.
- T5.D / §13 should finalize profile identifiers, selector-kind registry rules, media-type extension rules, status-code extension rules, JWS `typ`, content type, algorithm labels, and conformance-vector profile conventions.
- T5.B and T5.C should use this target taxonomy when writing security and privacy obligations for origin trust, readerAuth, issuer/device evidence, raw FHIR provenance, kiosk relay metadata, logs, retention, and replay controls.
- T6.C should use the fixture-profile language here to decide which same-device and kiosk materials become conformance vectors and which remain historical or diagnostic.
