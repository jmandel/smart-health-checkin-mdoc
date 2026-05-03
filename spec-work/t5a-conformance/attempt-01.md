## 4. Conformance

This section defines how implementations claim conformance to SMART Health Check-in 1.0. It is an index and classification layer over the requirements in §§5-9 and the extension points later cataloged in §13. It does not create alternate clinical payloads, alternate kiosk shortcuts, or additional trust meanings beyond the sections it references.

A conformance claim SHALL identify the role or roles implemented, the optional profiles claimed, the version of this specification, and any deployment profile that changes policy choices left open by this specification. A component MAY implement more than one role in one product, but it SHALL satisfy each claimed role independently.

### 4.1 Conformance targets

#### 4.1.1 Requester / Verifier

The **Requester** is the role that constructs the SMART request and consumes the SMART response. The **Verifier** is the presentation-processing role that packages a SMART request for a selected presentation profile, receives a response, validates transport artifacts for that profile, extracts the SMART response, and applies response validation before Requester use.

A Requester claiming core clinical-model conformance SHALL construct `SmartHealthCheckinRequest` objects according to §5. In particular, it SHALL use the fixed request `type` and `version`, preserve request item identifiers, express accepted response forms with per-item `accept[]` media types, use defined selector shapes or registered extension selectors, and keep requester identity, origin, reader, kiosk, callback, encryption, and trust metadata out of the SMART request body.

A Verifier claiming core response-validation conformance SHALL validate `SmartHealthCheckinResponse` objects according to §6 before clinical workflow use. In particular, it SHALL validate the exact `requestId` match to the original SMART request `id`, resolve every Artifact `fulfills[]` reference, enforce Artifact media-type acceptability for every fulfilled item, require unique `requestStatus[]` coverage for every request item, and apply the raw FHIR JSON and SMART Health Card rules in §§6-7.

A Verifier claiming the direct same-device presentation profile SHALL also satisfy the Verifier-side requirements in §8, including the fixed `org-iso-mdoc` protocol, `org.smarthealthit.checkin.1` docType, `org.smarthealthit.checkin` namespace, `org.smarthealthit.checkin.request` requestInfo carrier, `smart_health_checkin_response` stable element, direct `dcapi` `SessionTranscript`, HPKE processing, mdoc issuer/device validation, and the §8.8 Verifier checklist.

#### 4.1.2 Wallet / Responder

The **Wallet / Responder** receives a SMART request through a selected presentation profile, applies Holder review and Wallet policy, constructs a SMART response, and returns it through that profile.

A Wallet/Responder claiming core clinical-model conformance SHALL validate SMART requests according to §5, process request items as the Holder-review and response-accounting unit, preserve request item ids for `fulfills[]` and `requestStatus[]`, construct `SmartHealthCheckinResponse` objects according to §6, and copy the accepted SMART request `id` exactly into `SmartHealthCheckinResponse.requestId`.

A Wallet/Responder claiming direct same-device presentation conformance SHALL also satisfy the Wallet-side requirements in §8, including validation of the direct `org-iso-mdoc` request wrapper, recovery of the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, computation of the same `SessionTranscript`, optional `readerAuth` processing when supported or relied upon, construction of the issuer-signed `smart_health_checkin_response` element, mdoc device proof, and HPKE encryption of the `DeviceResponse`.

#### 4.1.3 Phone presenter

The **Phone presenter** is the phone-side component in the optional cross-device kiosk profile. A Phone presenter claiming kiosk conformance SHALL satisfy §9.7 and any later §9 requirements that apply to phone-side submission. It SHALL parse the pointer-only `#r=<requestId>` form for the active profile, retrieve the encrypted request state, bind the pointer, provider row when present, encrypted envelope, and signed payload wrapper `requestId` values, open the `EncryptedKioskRequest`, verify the compact kiosk request JWS and creator trust under deployment policy, validate the embedded `smartRequest` under §5, and then construct a fresh phone-local §8 presentation request using that `smartRequest`.

A Phone presenter SHALL preserve the distinction between the kiosk wrapper `requestId` and `smartRequest.id`. It SHALL NOT reuse or infer a §8 `DeviceRequest`, §8 `encryptionInfo`, `SessionTranscript`, Wallet response, SMART response, or response-submission ciphertext from the QR code, Pointer URL, provider row, encrypted envelope, or JWS.

When it submits a successful kiosk result, a Phone presenter SHALL follow §9.8: create `SubmissionPlaintext` with top-level `requestId` equal to the kiosk wrapper id, include the SMART response under the active `payload.kind` only after successful phone-local processing, enforce signed `constraints.maxPlaintextBytes` over the bytes it encrypts, and encrypt to the signed `encryptResponseTo.desktopPublicKeyJwk` using the response-submission construction. The Phone presenter SHALL NOT require the untrusted provider to receive plaintext SMART responses or clinical content.

#### 4.1.4 Kiosk creator

The **Kiosk creator** is the desktop, kiosk, server-side, or combined component that starts the optional cross-device kiosk profile. A Kiosk creator claiming kiosk conformance SHALL satisfy §§9.1-9.6. It SHALL embed the complete §5 SMART request directly as `KioskRequestPayload.smartRequest`; sign the `KioskRequestPayload` as the specified ES256 compact JWS; encrypt that compact JWS as an `EncryptedKioskRequest`; publish only encrypted request state through the Submission service or equivalent provider; and display or convey only a Pointer URL for the active profile.

A Kiosk creator SHALL NOT replace `smartRequest` with `requestProfile`, `preset`, `presetId`, an IPS shortcut, a profile-family shortcut, an “all of the above” label, an SDK helper object, an inline §8 request fragment, or any other alternate clinical request wrapper. It SHALL keep the kiosk wrapper `requestId` distinct from `smartRequest.id` and SHALL NOT put kiosk pointer, relay, completion, encryption, requester-identity, trust, callback, logo, origin, package, or provider metadata inside the SMART request body.

#### 4.1.5 Completion display

The **Completion display** is the kiosk-side or desktop component that completes the optional kiosk profile after the phone writes encrypted submission state. A Completion display claiming kiosk conformance SHALL satisfy §§9.9-9.10. It SHALL retain the verified kiosk request payload, the original embedded `smartRequest`, and the desktop private key corresponding to the signed response-encryption public key until completion, expiration, abandonment, or cleanup. It SHALL observe submission rows for the active wrapper `requestId`, download encrypted bytes, decrypt locally with the response-submission construction, bind decrypted `SubmissionPlaintext.requestId` to the wrapper id, validate the submitted SMART response under §6, apply §6.6 against the original embedded `smartRequest`, account for §8 validation as required by the selected deployment trust boundary, and apply §7 trust interpretation before clinical workflow use.

A Completion display SHALL NOT treat provider row presence, storage paths, upload events, provider authorization, row order, timestamps, app ids, or successful decryption alone as Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, response freshness, or downstream authorization.

#### 4.1.6 Submission service / provider

The **Submission service** or provider is the untrusted relay used by the optional kiosk profile. A provider claiming kiosk-provider conformance SHALL provide the relay capabilities required by §9.11 for the selected provider profile: write encrypted requests, read encrypted requests, write encrypted submissions, make encrypted submission bytes available, and let the Completion display observe candidate submissions for a wrapper `requestId`.

A Submission service SHALL NOT require access to plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder decisions, Wallet secrets, request-opening private keys, desktop private keys, or shared secrets merely to route, store, notify, or make available kiosk state.

#### 4.1.7 Profile, extension, fixture, and conformance-test authors

A profile author defines additional deployment policy, registered extensions, optional profile identifiers, or conformance-test constraints. A profile author SHALL state which roles and optional features are constrained, which trust layers or extensions are in scope, and which additional checks are required beyond core §§5-9. A profile author SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, or status codes.

A conformance-test author SHALL test a claimed role only against the requirements for that role and claimed optional profiles. Test vectors, Appendix C pseudo-CDDL, Appendix D fixtures, and Appendix E byte ladders support testing, but they SHALL NOT be used to introduce alternate field names, alternate request carriers, alternate response carriers, kiosk request shortcuts, or production trust claims not stated in normative prose.

### 4.2 Mandatory features

The mandatory core of SMART Health Check-in 1.0 is the transport-neutral clinical request and response model.

An implementation that claims **Core Requester** conformance SHALL support construction of SMART requests using the §5 top-level request shape, request item shape, `fhir.resources` selector, `questionnaire` selector, `profiles[]`, `profilesFrom[]` as an array of canonical profile-family URLs, `resourceTypes[]`, additive `profiles[]` plus `profilesFrom[]` semantics, per-item `accept[]`, and the §5.5 canonical `|version` handling rules that apply to the operations it performs.

An implementation that claims **Core Wallet/Responder** conformance SHALL support parsing and validation of the §5 request shape, item ids, the two core selector kinds to the extent it claims to satisfy them, unsupported-item reporting for unrecognized or unsupported selector semantics, Holder-controlled item-level response accounting, construction of §6 SMART responses, core status codes, many-to-many Artifact fulfillment, raw FHIR JSON Artifacts when returned as `application/fhir+json`, and SMART Health Card Artifacts when returned as `application/smart-health-card`.

An implementation that claims **Core Verifier** conformance SHALL support §6 response validation and §6.6 cross-validation against the original request. A Core Verifier that advertises an `accept[]` media type for an item SHALL be prepared to parse, validate, and route conforming Artifacts of that media type for that item.

The core clinical model is transport-neutral. Core conformance by itself does not claim support for W3C Digital Credentials API, direct `org-iso-mdoc`, kiosk pointer transport, `readerAuth`, production issuer trust, production clinical-source trust, a particular FHIR implementation guide, a particular Submission service, or OpenID4VP.

### 4.3 Optional features

The following features are optional in SMART Health Check-in 1.0. If an implementation claims one of these features, all normative requirements for the claimed role in the referenced sections apply.

| Optional feature | Applicable targets | Requirements when claimed |
| --- | --- | --- |
| Direct same-device `org-iso-mdoc` presentation | Verifier, Wallet/Responder, conformance-test author | Implement the applicable §8 requirements and validation checklists, using the fixed protocol id, docType, namespace, requestInfo carrier, stable response element, `SessionTranscript`, HPKE suite, and mdoc validation rules. |
| Optional `readerAuth` / authenticated reader deployment policy | Verifier, Wallet/Responder, deployment profile author | When `readerAuth` is included, supported, required, or relied upon, process it as specified in §§7-8. Deployment profiles define certificate-chain acceptance, trust anchors, revocation, assurance labels, required-vs-optional behavior, and Holder display. |
| Cross-device kiosk wrapper | Kiosk creator, Phone presenter, Completion display, Submission service/provider, Verifier, Wallet/Responder | Implement the applicable §9 requirements while preserving the §5/§6 clinical model and phone-local re-entry into §8. |
| Extension selector kinds | Requester, Wallet/Responder, Verifier, extension/profile author | Define and process extension selector kinds under §5.4.3 and §4.6. Unknown selector kinds are not guessed from display text. |
| Extension Artifact media types or compatibility rules | Requester, Wallet/Responder, Verifier, extension/profile author | Define media type string, Artifact shape, validation, security, privacy, FHIR-version handling if any, and compatibility with core media types under §§5-6 and §4.6. |
| Additional completion payload kinds or validation-evidence payloads | Phone presenter, Completion display, profile author | Define payload shape and validation while preserving §6, §7, §8, and §9 semantics and without requiring the untrusted provider to see plaintext clinical content. |
| Fixture/vector conformance profile | Fixture author, conformance-test author | Use Appendix C/D/E material as derived test scaffolding. Do not promote demo keys, demo issuer/audience strings, historical captures, or provider app ids to production trust anchors. |
| Future OpenID4VP binding | Future profile author | Reserved for §10 and later versions. SMART Health Check-in 1.0 conformance SHALL NOT require OpenID4VP support and SHALL NOT treat an OID4VP mapping as a substitute for the direct §8 profile unless a future version defines that binding. |

A deployment profile MAY require an optional feature for that deployment. Such a requirement is a deployment-profile claim, not a change to the core SMART Health Check-in 1.0 mandatory set.

### 4.4 Profile identifiers

Profile identifiers name conformance claims and registry entries. They are not clinical request fields and SHALL NOT be placed in `SmartHealthCheckinRequest` as `requestProfile`, `preset`, profile label, shortcut, or negotiation metadata.

Version 1.0 uses the following stable identifiers or identifier families in normative wire artifacts:

| Identifier kind | Value | Scope |
| --- | --- | --- |
| SMART request discriminator | `smart-health-checkin-request` | §5 `type` field. |
| SMART response discriminator | `smart-health-checkin-response` | §6 `type` field. |
| SMART request/response model version | `1` | §5 and §6 `version` fields. |
| Direct DC API protocol id | `org-iso-mdoc` | §8 Digital Credentials API protocol. |
| mdoc docType | `org.smarthealthit.checkin.1` | §8 same-device mdoc document type; suffix `.1` denotes the major SMART Health Check-in mdoc profile generation. |
| mdoc namespace | `org.smarthealthit.checkin` | §8 same-device namespace. |
| mdoc stable element | `smart_health_checkin_response` | §8 response element. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | §8 `ItemsRequest.requestInfo` key. |
| Kiosk request JWS `typ` | `smart-health-checkin+kiosk-request+jws` | §9 compact kiosk request JWS protected header. |
| Kiosk encrypted-request content type | `application/smart-health-checkin-kiosk-request+jws+aesgcm` | §9 `EncryptedKioskRequest.contentType`. |
| Kiosk successful payload kind | `smart-health-checkin-response` | §9 `SubmissionPlaintext.payload.kind` for active successful submissions. |

For human-readable conformance claims and later §13 registry rows, this draft recommends the following profile-id labels unless the registry cutpoint replaces them with final URIs:

| Profile-id label | Meaning |
| --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 request and §6 response support for the claimed role. |
| `smart-health-checkin-dcapi-mdoc-1` | Direct same-device §8 `org-iso-mdoc` presentation support. |
| `smart-health-checkin-kiosk-1` | Cross-device §9 kiosk wrapper support for the claimed role. |
| `smart-health-checkin-readerauth-policy-1` | Deployment profile requiring or constraining optional §7/§8 `readerAuth`. |
| `smart-health-checkin-fixture-profile-1` | Byte/vector constraints for Appendix C/D/E conformance testing, without production trust claims. |
| `smart-health-checkin-oid4vp-reserved` | Reserved name for future §10 work; not a SMART Health Check-in 1.0 implementation requirement. |

A conformance claim SHALL state both the profile identifier and the role, such as Core Wallet/Responder, Direct mdoc Verifier, Kiosk Phone presenter, or Kiosk Completion display. A profile identifier alone does not say which side of the protocol was implemented.

### 4.5 Versioning rules

The SMART request and response `type` discriminators are fixed for this specification generation. A conforming version 1.0 Requester SHALL set the SMART request `version` to the exact string `"1"`; a conforming version 1.0 Wallet/Responder SHALL set the SMART response `version` to the exact string `"1"`; and receivers SHALL reject other values unless a future version-compatibility rule explicitly defines compatible handling.

The SMART request/response `version` is the clinical model version. It is not a FHIR version, not the mdoc `DeviceRequest.version`, not the kiosk payload `v`, not a provider schema version, and not a deployment policy version. Raw FHIR JSON release context is carried by Artifact `fhirVersion` under §6. SMART Health Card FHIR-version semantics are inside the signed SMART Health Card payloads.

The direct same-device mdoc profile uses `DeviceRequest.version` exactly `"1.0"` and mdoc docType `org.smarthealthit.checkin.1`. A future breaking mdoc profile that changes the docType-visible surface SHOULD use a different docType major suffix, such as `.2`, rather than silently changing the semantics of `org.smarthealthit.checkin.1`.

The kiosk wrapper uses numeric `v: 1` for `KioskRequestPayload` and `EncryptedKioskRequest` in the active profile. Future incompatible kiosk wrapper changes SHALL use a new wrapper version, content type, profile identifier, or registry entry sufficient for receivers to reject unsupported messages safely.

Minor, backward-compatible additions MAY add optional members, registered selector kinds, registered media types, registered status codes, profile identifiers, fixture profiles, or deployment-profile constraints when existing conforming receivers can ignore or reject unsupported extensions safely under §§5-6 and §4.6. Breaking changes that alter required fields, redefine existing field meanings, change core selector semantics, change fulfillment/status accounting, move the SMART request or response to a different carrier, or weaken required validation require a new version or profile identifier.

### 4.6 Extension model

SMART Health Check-in 1.0 is extensible through registered selector kinds, registered Artifact media types, registered status codes, registered profile identifiers, and deployment profiles. Extensions are additive. They SHALL NOT redefine the clinical semantics of existing SMART request fields, SMART response fields, core selector kinds, core Artifact media types, fulfillment links, or core status codes.

Unknown JSON members in locations where §§5-6 permit forward-compatible unknown members MAY be ignored when they do not change the meaning of known required members. An unknown `content.kind` is not an ignorable member; it is an extension selector kind. A Wallet/Responder that does not support an extension selector SHALL NOT guess its meaning from `title`, `summary`, `purpose`, profile labels, local topic names, or other display text. It SHALL reject the request or report the affected item as `unsupported` according to the selected flow and §6.

An extension selector registrant SHALL define the exact `content.kind` string, JSON shape, required and optional members, clinical meaning, content-satisfaction rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status and Artifact fulfillment, unknown-member handling, privacy and security considerations, and example request items. An extension selector SHALL NOT permit requester identity metadata in the SMART request body unless a future version defines an explicit trust model for that metadata.

An Artifact media-type extension registrant SHALL define the media type string, Artifact body fields, parsing and validation rules, integrity and dereferencing behavior for any `url` or `data` fields, interaction with `accept[]`, FHIR-version handling if any, security considerations, privacy considerations, and any compatibility substitution rules with core media types. Without a registered compatibility rule, a Verifier SHALL enforce exact media-type acceptability under §6.6.

A status-code extension registrant SHALL define the code string, item-level semantics, when Wallets/Responders use it, how Verifiers distinguish it from `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`, and how it interacts with Artifact fulfillment. A version 1.0 Verifier SHALL treat unknown status codes as invalid unless it explicitly supports the registry entry.

A deployment profile MAY require stricter validation, narrower accepted media types, stronger origin or reader trust, particular issuer trust anchors, stronger clinical-source provenance, additional Holder display, replay controls, fixture-vector constraints, or rejection of otherwise optional modes. A deployment profile SHALL document the roles constrained, trust layers constrained, accepted trust anchors or registries, freshness and revocation expectations, failure behavior, and assurance labels. It SHALL NOT claim that demo keys, demo issuer/audience strings, provider app ids, checked-in fixtures, transport encryption, mdoc issuer signatures, device-key proof, `readerAuth`, origin evidence, kiosk wrapper signatures, or successful SMART response validation create production clinical-source provenance for unsigned raw FHIR JSON.

### 4.7 Conformance checklist cross-link

Appendix A is the one-row-per-rule conformance checklist for this specification. Each Appendix A row SHALL identify the requirement source section, conformance target, requirement keyword, testable obligation, and optional feature or deployment profile to which the row applies.

Appendix A SHALL separate at least these buckets:

1. core SMART request construction and request validation requirements from §5;
2. core SMART response construction and response validation requirements from §6;
3. trust-separation and deployment-policy requirements from §7;
4. direct same-device `org-iso-mdoc` Verifier and Wallet/Responder requirements from §8;
5. optional kiosk Kiosk creator, Phone presenter, Completion display, and Submission service/provider requirements from §9;
6. extension, registry, versioning, and profile-identifier requirements from §§4 and 13;
7. security, privacy, and internationalization requirements from §§11-14 when those sections are complete; and
8. fixture/vector requirements from Appendices C-D only when a conformance profile explicitly promotes them.

Appendix A SHALL NOT collapse separate trust layers into one checklist item. Origin trust, optional reader authentication, mdoc issuer evidence, device-key proof, SMART response syntax, SMART Health Card verification, raw FHIR source provenance, kiosk wrapper verification, provider routing, and downstream clinical acceptance are separate checks unless a deployment profile explicitly defines a combined policy decision.

## Organizer notes

### Strengths

- Separates conformance by role and optional profile so §4 mirrors the actual obligations in §§5-9 rather than creating a new protocol layer.
- Preserves the key architectural decisions: transport-neutral clinical model, direct `smartRequest`, no request-profile/preset/IPS shortcut, distinct wrapper `requestId` and `smartRequest.id`, pointer-only QR, untrusted relay, source-trust separation, patient-mediated raw FHIR unless separately provenanced, and no production trust claims from demo keys.
- Gives profile and conformance-test authors explicit boundaries without letting fixture material or deployment policy redefine the core model.

### Caveats

- The profile-id labels in §4.4 are draft registry labels. T5.D may replace them with final URIs or registry names.
- The direct same-device §8 profile is treated here as optional relative to the transport-neutral core, even though it is the base presentation flow for version 1.0 examples and kiosk re-entry.
- Some fixture/vector language is intentionally conservative because current same-device captures are diagnostic/historical for kiosk purposes and no deterministic `fixtures/kiosk/` suite exists yet.

### Open questions

- Should final §4 make direct `org-iso-mdoc` support mandatory for any product-level “SMART Health Check-in 1.0 implementation” claim, while still allowing a narrower “Core clinical model only” claim for libraries and validators?
- Should Appendix B/conformance closure make non-empty `items[]` mandatory, or preserve the current §5 position that it is only a SHOULD until validators are tightened?
- Should final §13 use URL-based profile identifiers, reverse-DNS identifiers, or the short labels proposed above?

### Downstream dependencies

- T5.D must finalize registry entries for profile ids, selector kinds, media types, status codes, JWS `typ`, kiosk content type, algorithm labels, provider profiles, and fixture profiles.
- T5.F must expand the §4.7 buckets into a one-row-per-SHALL/SHOULD Appendix A inventory.
- T5.B/T5.C must threat-check the optional-profile boundaries called out here, especially readerAuth policy, raw FHIR source trust, kiosk replay/freshness, provider metadata leakage, debug plaintext, and demo-key handling.
- T6.C should decide whether and how fixture material is promoted into conformance vectors after §11-§13 and final examples stabilize.
