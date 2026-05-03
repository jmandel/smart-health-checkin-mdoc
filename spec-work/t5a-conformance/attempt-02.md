## 4. Conformance

This section identifies the conformance targets for SMART Health Check-in 1.0 and explains how implementations claim support for the core clinical model, the same-device presentation flow, the kiosk wrapper, trust-policy features, fixtures, and future bindings. It is a conformance map over obligations defined elsewhere; it does not create a second source of request, response, transport, trust, kiosk, or fixture rules.

The key words in this section are interpreted as described in §1.5.1. Each requirement names the target to which it applies.

### 4.1 Conformance targets

A component MAY claim one or more conformance targets. When one product performs several roles, it is evaluated separately for each role it claims.

#### 4.1.1 Requester / Verifier

A **Requester** claims conformance for constructing SMART requests and consuming SMART responses under the clinical model in §§5-6. A **Verifier** claims conformance for carrying a SMART request through a presentation flow, validating the presentation response, extracting the SMART response, and applying §6.6 response cross-validation before Requester use.

A Requester / Verifier claiming **Core clinical request/response support** SHALL conform to the requester-side rules in §5, the verifier-side rules in §6.6, and the trust-layer separation in §7 when interpreting response evidence. In particular, it SHALL preserve the distinction between the clinical `SmartHealthCheckinRequest.id`, request item ids, Artifact ids, wrapper ids, transport-session identifiers, origins, reader identifiers, issuer identifiers, and provider row ids.

A Verifier claiming **same-device `org-iso-mdoc` support** SHALL implement the Verifier-side obligations in §8, including the fixed `org-iso-mdoc` identifiers, request carrier, `SessionTranscript` construction, HPKE opening, mdoc/MSO/digest/device-signature checks, response extraction from the stable element, and §6.6 cross-validation. A same-device claim does not imply support for kiosk wrapping unless the implementation also claims the kiosk targets in §4.1.3-§4.1.6.

A Verifier or Requester SHALL NOT claim production issuer trust, reader trust, clinical-source provenance, patient identity proof, downstream clinical acceptance, or EHR write-back authorization merely because a SMART response is syntactically valid, because §8 transport validation succeeded, or because §9 kiosk wrapper validation succeeded. Those claims require the applicable evidence and deployment policy defined in §7, §8, §9, or a deployment profile.

#### 4.1.2 Holder Wallet / Responder

A **Holder Wallet / Responder** claims conformance for receiving a SMART request through a supported presentation flow, applying Holder control and Wallet policy, constructing a SMART response, and returning it through that flow.

A Wallet/Responder claiming **Core clinical request/response support** SHALL parse and validate SMART requests under §5, process request items as the Holder-review and response-accounting granularity, construct SMART responses under §6, preserve `SmartHealthCheckinRequest.id` as `SmartHealthCheckinResponse.requestId`, preserve request item ids for `fulfills[]` and `requestStatus[].item`, and report unsupported, unavailable, declined, partial, fulfilled, and error outcomes according to §6.4.

A Wallet/Responder claiming **same-device `org-iso-mdoc` support** SHALL implement the Wallet-side obligations in §8, including request extraction from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, optional `readerAuth` processing when supported or relied on, phone or same-device origin/session binding, Holder review, SMART response construction, issuer-signed stable-element carriage, device authentication, and HPKE response encryption.

A Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown SMART request members, kiosk pointer metadata, provider app ids, row ids, key ids, or demo strings as authenticated requester identity. A Wallet/Responder SHALL NOT claim that unsigned raw FHIR JSON is an issuer-signed clinical credential unless separate accepted Artifact evidence or deployment policy establishes that source trust.

#### 4.1.3 Phone presenter

A **Phone presenter** claims conformance for the phone-side kiosk role defined in §9.7 and, when it proceeds to submission, §9.8.

A Phone presenter claiming kiosk support SHALL resolve the §9.6 Pointer URL, retrieve the encrypted request state, bind pointer, provider row, envelope, and signed payload wrapper `requestId` values as required by §9.7, open and verify the kiosk request wrapper, validate the embedded `smartRequest` under §5, and then construct a fresh phone-local §8 same-device presentation request using that validated `smartRequest`.

A Phone presenter SHALL NOT reuse or infer a §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, §8 HPKE key, Wallet `DeviceResponse`, SMART response, or response-submission ciphertext from the QR code, Pointer URL, provider row, encrypted request envelope, or kiosk request JWS. The kiosk flow re-enters §8 on the phone; it does not carry prebuilt same-device request fragments in the pointer.

When a Phone presenter submits a successful kiosk result, it SHALL follow §9.8: top-level `SubmissionPlaintext.requestId` is the kiosk wrapper id, the active successful payload kind is `smart-health-checkin-response`, the inner `smartResponse.requestId` remains `smartRequest.id`, and response-submission encryption uses the signed desktop public key and the §9.8 response-submission crypto context.

#### 4.1.4 Kiosk creator

A **Kiosk creator** claims conformance for creating the signed and encrypted kiosk request wrapper and Pointer URL defined in §§9.1-9.6.

A Kiosk creator claiming kiosk support SHALL create a conforming §5 SMART request, embed that request directly as `KioskRequestPayload.smartRequest`, sign the kiosk payload as specified in §9.3 and §9.4, encrypt the compact kiosk request JWS into the §9.5 `EncryptedKioskRequest`, publish protected request state through a Submission service or equivalent provider, and display or convey only the §9.6 pointer.

A Kiosk creator SHALL NOT replace `smartRequest` with `requestProfile`, a preset or preset id, an IPS shortcut, an “all of the above” shortcut, an SDK helper object, a local topic wrapper, a legacy inline §8 fragment, or any other alternate clinical request wrapper. The kiosk wrapper `requestId` SHALL remain distinct from `smartRequest.id`.

A Kiosk creator SHALL NOT put plaintext clinical content, private keys, same-device §8 artifacts, response-submission ciphertext, or production trust claims into the Pointer URL. Demo keys, demo issuer strings, demo audience strings, and demo provider ids SHALL NOT be represented as production trust anchors unless an explicit deployment profile accepts them for that environment.

#### 4.1.5 Completion display

A **Completion display** claims conformance for the kiosk-side completion processing defined in §9.9 and the replay, expiration, and provider considerations in §§9.10-9.11.

A Completion display claiming kiosk support SHALL observe or retrieve candidate submissions for the active wrapper `requestId`, download bounded ciphertext bytes, decrypt locally using the desktop private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk`, bind decrypted `SubmissionPlaintext.requestId` to the kiosk wrapper request id, validate the active payload under §6 and §6.6 against the original embedded `smartRequest`, account for §8 validation according to §9.9.3, and apply §7 trust interpretation before clinical workflow use.

A Completion display SHALL NOT treat provider row presence, storage path, upload event, provider authorization, row order, provider app id, successful AES-GCM decryption, or wrapper `requestId` equality as Holder consent, patient identity, requester identity, mdoc issuer/device trust, clinical-source provenance, SMART response validity, or downstream authorization by itself.

#### 4.1.6 Submission service / provider

A **Submission service** or **provider** claims conformance for the relay capabilities used by the kiosk flow. A provider is an untrusted transport component unless a deployment profile gives it additional responsibilities.

A Submission service/provider claiming kiosk-provider support SHALL provide capabilities equivalent to storing or serving encrypted request state, accepting encrypted submission state, returning or making available exact ciphertext bytes, and notifying or enabling the Completion display to discover submissions for a wrapper `requestId`, as described in §9.11.

A Submission service/provider SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext `SmartHealthCheckinResponse`, raw FHIR resources, SMART Health Cards, Holder choices, §8 `DeviceResponse` plaintext, private keys, shared secrets, or provider-visible clinical trust decisions merely to route, store, notify, or make available kiosk state.

#### 4.1.7 Profile authors, deployment-profile authors, and conformance-test authors

A **profile author** or **deployment-profile author** defines stricter or additional constraints for a deployment community, certification program, registry, trust framework, or fixture profile. A **conformance-test author** creates executable checks or vectors for one or more conformance targets.

A profile or test author SHALL identify the conformance target, optional feature, profile identifier, version, trust assumptions, fixture class, and referenced normative section for every rule or test it adds. A profile or test author SHALL NOT silently redefine SMART request semantics, SMART response semantics, selector additivity, Artifact media-type rules, response status semantics, same-device carriers, kiosk direct `smartRequest` embedding, wrapper/SMART id separation, pointer-only QR behavior, or the untrusted-relay model.

A conformance test MAY be stricter than the base specification only when it clearly identifies itself as testing a named deployment profile, fixture profile, optional feature, or certification level rather than core SMART Health Check-in 1.0 conformance.

### 4.2 Mandatory features

This subsection summarizes mandatory features for implementations that claim the corresponding conformance target. Detailed rules remain in the cited sections.

#### 4.2.1 Core clinical model

An implementation claiming any SMART Health Check-in 1.0 clinical conformance target SHALL support the transport-neutral SMART request and SMART response model in §§5-6 for the role it performs.

Core clinical support includes:

- fixed request and response `type` values and version `"1"`;
- request `id` and response `requestId` binding;
- request items with item ids, Holder-facing text, `accept[]`, advisory `required`, and `content.kind` selectors;
- `fhir.resources` and `questionnaire` selector handling as applicable to the role;
- `profilesFrom[]` as an array of canonical profile-family URLs;
- additive `profiles[]` plus `profilesFrom[]` semantics;
- accepted media types expressed through `accept[]` and Artifact `mediaType`;
- core media types `application/fhir+json` and `application/smart-health-card` where the implementation claims it can request, produce, or consume them;
- raw FHIR JSON Artifact `fhirVersion` handling;
- SMART Health Card Artifact `value.verifiableCredential[]` handling with no outer Artifact-level `fhirVersion`;
- per-item `requestStatus[]` coverage exactly once for every request item; and
- many-to-many Artifact fulfillment with `fulfills[]` references validated against the original request.

A component MAY claim only the subset of media types, selector kinds, and Artifact processing directions that match its role. For example, a Requester can claim it can consume `application/fhir+json` without claiming it can produce such Artifacts, while a Wallet/Responder can claim it can produce `application/fhir+json` without claiming it can verify SMART Health Card issuer trust for downstream ingestion.

#### 4.2.2 Same-device presentation profile

An implementation claiming the same-device `org-iso-mdoc` presentation profile SHALL implement the applicable §8 obligations for its role. Same-device support is mandatory for an implementation that claims conformance to the version 1.0 same-device presentation flow; it is not automatically mandatory for a component that claims only JSON Schema validation, fixture authoring, a kiosk provider relay, or a deployment-profile authoring role.

A same-device implementation SHALL use the §8 identifiers and carriers: protocol `org-iso-mdoc`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, response element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`. It SHALL NOT model FHIR profiles, request items, questionnaires, Artifacts, or statuses as separate core mdoc elements.

#### 4.2.3 Kiosk profile when claimed

An implementation claiming a kiosk target SHALL implement the applicable §9 obligations for its role. Kiosk support is optional relative to same-device-only deployments, but once claimed it includes the accepted wrapper invariants: direct `smartRequest`, distinct wrapper `requestId`, pointer-only QR/URL, untrusted relay, phone-local fresh §8 re-entry, response-submission encryption to the signed desktop key, and Completion display validation before workflow use.

#### 4.2.4 Trust separation

All conformance targets SHALL preserve the trust separation defined in §7. This is mandatory because request/response validation, presentation validation, kiosk wrapper validation, and clinical-source trust answer different questions.

In particular:

- same-device transport success is not clinical-source provenance;
- optional `readerAuth` success is not EHR write-back authorization;
- mdoc issuer/device validation is not proof that unsigned raw FHIR JSON came from a clinical system;
- kiosk wrapper signature verification is not Holder consent or patient identity proof;
- provider row state is not SMART response validation; and
- demo keys and fixtures are not production trust anchors.

### 4.3 Optional features

Optional features are not required for every SMART Health Check-in component. A component that claims an optional feature SHALL satisfy the requirements cited for that feature.

#### 4.3.1 Optional direct same-device §8 support

A component MAY claim the direct same-device `org-iso-mdoc` feature. A Requester/Verifier or Wallet/Responder that makes that claim SHALL implement §8 for its role. A kiosk implementation that invokes a Wallet on the phone depends on a phone-local §8 Verifier/Wallet path, but a standalone Submission service/provider does not.

#### 4.3.2 Optional cross-device kiosk §9 support

A component MAY claim one or more kiosk roles: Kiosk creator, Phone presenter, Submission service/provider, or Completion display. A kiosk conformance claim applies only to the roles claimed. For example, a provider can conform to the untrusted-relay capabilities in §9.11 without claiming that it can create kiosk requests, decrypt submissions, or validate SMART responses.

#### 4.3.3 Optional `readerAuth` and deployment trust policy

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it under §8. A Wallet/Responder that claims support for reader authentication or relies on it for policy SHALL verify and classify it under §7.2 and §8.

A deployment profile MAY make origin requirements, privileged-caller policy, `readerAuth`, reader certificate validation, issuer trust anchors, self-attested wallet treatment, clinical-source provenance, or retention policy mandatory for that deployment. Such requirements are deployment-profile requirements; they SHALL NOT redefine the SMART request body as a requester identity container.

#### 4.3.4 Optional media types, selector kinds, Artifact forms, and status extensions

Requesters, Wallets/Responders, Verifiers, profile authors, and conformance tests MAY support registered extension selector kinds, Artifact media types, payload kinds, compatibility rules, or status codes. Extension support is optional unless a named deployment profile requires it.

An implementation that does not support an extension selector or Artifact media type SHALL follow the unsupported-item or validation behavior defined in §§5-6 and the applicable extension registration. It SHALL NOT guess semantics from display text, local topic labels, wrapper field names, or unregistered shortcuts.

#### 4.3.5 Optional fixture and profile material

Appendix B schemas, Appendix C pseudo-CDDL, Appendix D fixture indexes, Appendix E byte ladders, and future `fixtures/kiosk/` vectors support testing and implementation. A component MAY claim conformance to a named fixture or vector profile only when that profile states its exact pass/fail checks, trust assumptions, fixed test keys, deterministic-encoding expectations, and section links.

Checked-in demo or diagnostic fixture material SHALL NOT be treated as production trust material. A fixture profile MAY use intentionally public private keys, self-signed certificates, deterministic randomness, demo issuer ids, demo audience ids, and historical captures only when they are clearly marked as test or diagnostic material.

#### 4.3.6 Future OID4VP binding

OpenID4VP support is reserved for future work in §10. Version 1.0 components SHALL NOT claim that OID4VP support is required for core SMART Health Check-in conformance. A future OID4VP profile MAY carry the same SMART request/response model, but it SHALL define its own profile identifier, versioning, request and response mapping, security properties, and conformance tests before it is used as a conformance claim.

### 4.4 Profile identifiers

A profile identifier names a coherent set of conformance rules for a target and feature set. A conformance claim SHOULD include the profile identifier, version, conformance target, optional features, and any deployment-profile or fixture-profile dependencies.

This specification defines or reserves the following profile identifiers for version 1.0 conformance language:

| Profile identifier | Status | Summary |
| --- | --- | --- |
| `smart-health-checkin-core-1` | Defined | Core transport-neutral SMART request and SMART response model in §§5-6, including §6.6 cross-validation and §7 trust separation for interpretation. |
| `smart-health-checkin-mdoc-dcapi-1` | Defined | Same-device direct `org-iso-mdoc` over W3C Digital Credentials API as defined in §8, using the identifiers in §8.1. |
| `smart-health-checkin-kiosk-1` | Defined | Cross-device kiosk wrapper in §9, including direct `smartRequest`, pointer-only URL, phone-local §8 re-entry, encrypted submission, and provider abstraction. |
| `smart-health-checkin-readerauth-1` | Optional feature profile | Optional per-`DocRequest.readerAuth` construction and verification layered on `smart-health-checkin-mdoc-dcapi-1`, subject to deployment trust policy. |
| `smart-health-checkin-fixtures-1` | Fixture/profile material | Umbrella label for named Appendix D or future fixture-vector profiles. It is not a production protocol trust label by itself. |
| `smart-health-checkin-oid4vp-reserved` | Reserved / non-conformance | Placeholder for future OID4VP mapping work. It is not a SMART Health Check-in 1.0 conformance profile. |

Profile identifiers name conformance scope; they are not SMART request fields, SMART response fields, clinical selectors, media types, status codes, kiosk payload shortcuts, or substitutes for `smartRequest`.

A Requester, Kiosk creator, Phone presenter, or deployment profile SHALL NOT place a profile identifier in the SMART request body to bypass §5 selector rules, §7 trust processing, §8 validation, or §9 kiosk validation. In particular, profile identifiers SHALL NOT reintroduce `requestProfile`, preset names, demo shortcuts, IPS shortcuts, or “all of the above” labels as protocol payloads in place of `smartRequest`.

### 4.5 Versioning rules

#### 4.5.1 Clinical model version

The SMART request and SMART response `version` members use the clinical model version. For SMART Health Check-in 1.0, Requesters SHALL set request `version` to `"1"`, and Wallets/Responders SHALL set response `version` to `"1"`. Wallets/Responders and Verifiers SHALL reject unsupported clinical model versions unless a future compatibility rule explicitly defines compatible handling.

The clinical model version is not a FHIR release version, not a Digital Credentials API version, not a `DeviceRequest.version`, not a kiosk payload `v`, and not a deployment-profile version.

#### 4.5.2 Same-device and mdoc versioning

The same-device profile uses `DeviceRequest.version` `"1.0"`, mdoc `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and stable element `smart_health_checkin_response` as defined in §8. These values are versioned presentation identifiers, not clinical request body fields.

A future incompatible same-device profile can define a new profile identifier and, if necessary, a new `docType` suffix. It SHALL NOT change the semantics of an existing `docType` or stable element in a way that makes existing §8 validators accept different clinical semantics under the same identifier.

#### 4.5.3 Kiosk wrapper versioning

The kiosk wrapper uses numeric `v: 1` in `KioskRequestPayload` and `EncryptedKioskRequest`, the JWS `typ` `smart-health-checkin+kiosk-request+jws`, content type `application/smart-health-checkin-kiosk-request+jws+aesgcm`, request-envelope HKDF info `smart-health-checkin-kiosk-request-v1`, and response-submission HKDF info `smart-health-checkin-kiosk-response-v1` as defined in §9.

A future incompatible kiosk wrapper SHALL define a new wrapper version, profile identifier, and any changed `typ`, content type, or crypto labels. It SHALL NOT reinterpret version-1 fields so that pointer-only QR, direct `smartRequest`, wrapper/SMART id separation, or the untrusted-relay confidentiality model are weakened for version-1 processors.

#### 4.5.4 Backward-compatible additions

A future minor or deployment-profile addition MAY add registered selector kinds, media types, Artifact forms, payload kinds, status codes, fixture profiles, trust policies, or stricter validation rules when those additions are explicitly identified and do not redefine existing version-1 semantics.

An implementation MAY ignore unknown members only where §§5-6, §8, §9, or an extension registration permits doing so. Unknown members SHALL NOT be used to change existing required fields, bypass Holder control, substitute requester identity metadata into the SMART request body, alter `accept[]`, alter selector additivity, weaken validation, or change the meaning of status codes.

#### 4.5.5 Breaking changes

A change is breaking when it changes the meaning of a fixed `type`, `version`, selector kind, media type, status code, mdoc identifier, kiosk wrapper field, crypto context, pointer format, or required validation outcome for an existing profile. Breaking changes require a new versioned profile or future specification revision.

### 4.6 Extension model

Extensions let deployments and future versions add request selectors, Artifact media types, payload kinds, status codes, trust policies, fixture profiles, and provider profiles without changing existing core semantics.

An extension registrant SHALL define the extension's identifier, version, conformance targets, JSON shape or wire shape, validation rules, interaction with existing SMART request/response fields, security considerations, privacy considerations, error or unsupported behavior, and at least one example. Where applicable, the registrant SHALL define schema, CDDL, fixture, and registry implications.

An extension registrant SHALL NOT redefine or contradict these version-1 invariants:

- the SMART request body is not requester identity metadata;
- `profilesFrom[]` is an array of canonical profile-family URLs;
- `profiles[]` and `profilesFrom[]` are additive profile selectors;
- `resourceTypes[]` is an official-FHIR-resource-type constraint, not a local topic vocabulary;
- request item ids are scoped to one SMART request;
- `SmartHealthCheckinResponse.requestId` equals the clinical `smartRequest.id` being answered;
- Artifacts declare `mediaType`, not an Artifact-level protocol `type` discriminator;
- `requestStatus[]` covers every request item exactly once;
- raw FHIR JSON remains patient-mediated unless separately provenanced or signed;
- same-device §8 uses direct `org-iso-mdoc`, the §8 request carrier, and the stable response element for the version-1 profile;
- kiosk request payloads embed `smartRequest` directly;
- the kiosk wrapper `requestId` is distinct from `smartRequest.id`;
- the QR/Pointer URL is pointer-only for the active profile;
- the Submission service/provider is untrusted with plaintext clinical content; and
- demo keys, demo strings, and diagnostic fixtures do not create production trust claims.

A Requester MAY use an extension selector or media type only when it expects the relevant Wallet/Responder and Verifier ecosystem to understand it or when unsupported outcomes are acceptable under §6. A Wallet/Responder or Verifier that does not support an extension SHALL NOT infer its semantics from display text, profile identifiers, local topic labels, provider metadata, or demo names.

A deployment profile MAY impose stricter requirements than the base specification, such as mandatory `readerAuth`, narrower media types, required SMART Health Card trust, required provenance for raw FHIR JSON, maximum sizes, TTLs, duplicate handling, or provider cleanup. It SHALL label those requirements as deployment-profile requirements and SHALL NOT present them as base conformance unless this specification makes them base requirements.

### 4.7 Conformance checklist cross-link

Appendix A is the conformance checklist for this specification. Appendix A indexes normative requirements by stable section number, conformance target, optional feature or profile, and test implication. Appendix A is not an independent source of requirements; if a checklist row conflicts with the normative section it cites, the cited normative section controls.

Conformance checklist authors SHALL include one row per testable SHALL or SHOULD requirement and SHOULD include the following columns:

| Column | Purpose |
| --- | --- |
| Section | Stable section containing the requirement. |
| Target | Requester, Verifier, Wallet/Responder, Phone presenter, Kiosk creator, Completion display, Submission service/provider, profile author, or conformance-test author. |
| Profile / feature | Core, same-device, kiosk, readerAuth, deployment profile, fixture profile, or future binding. |
| Requirement summary | One concise statement of the obligation. |
| Test implication | Schema, procedural validation, byte-vector, crypto-vector, fixture, trust-policy, or documentation check. |
| Optionality | Mandatory for target, optional feature when claimed, deployment-profile requirement, or informative guidance. |

Appendix A SHOULD keep core transport-neutral request/response tests separate from same-device §8 tests, kiosk §9 tests, optional `readerAuth` and deployment-policy tests, fixture/profile-vector tests, and future OID4VP tests. This separation is necessary so a same-device-only implementation is not failed for omitting kiosk support, a provider relay is not failed for not parsing clinical FHIR content, and a clinical JSON validator is not treated as a production trust framework.

## Organizer notes

**Strengths.** This draft makes conformance target-aware language explicit, separates role claims from product architecture, and maps core clinical, same-device, kiosk, readerAuth, fixture, deployment-profile, and future-binding scopes without turning §4 into a replacement for §§5-9. It preserves the accepted decisions: direct `smartRequest`, no `requestProfile`/preset/IPS shortcut, wrapper `requestId` distinct from `smartRequest.id`, pointer-only QR, untrusted relay, source-trust separation, raw FHIR as patient-mediated unless separately provenanced, and no production trust claims from demo keys.

**Caveats.** Some SHALL statements in §4 are summary conformance-claim rules rather than the primary detailed obligations; the organizer should verify that Appendix A links each checklist row to the detailed source section when possible. The profile identifiers proposed here are useful labels but should be reconciled with the later registry cutpoint before publication.

**Open questions.** Decide whether profile identifiers should use URIs, reverse-DNS names, or the short strings proposed here. Decide whether `smart-health-checkin-fixtures-1` should remain an umbrella label or be replaced by named vector profiles after T6.C. Decide whether Appendix A should include separate target rows for Requester and Verifier when one application performs both roles.

**Downstream dependencies.** T5.B/T5.C should use the same target separation for security and privacy. T5.D should either register or revise the profile identifiers, JWS `typ`, content types, algorithm labels, selector/status/media-type registries, and any future payload-kind registry. T5.F should convert the target/profile summaries here into one-row-per-rule checklist entries without adding new requirements.
