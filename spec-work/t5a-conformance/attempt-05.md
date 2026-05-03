## 4. Conformance

This section identifies conformance targets and names the feature sets to which later requirements apply. It is an index and scoping section: it does not create alternate request, response, same-device, kiosk, trust, schema, CDDL, or fixture behavior. A role that claims conformance to a feature set SHALL satisfy the requirements for that role in the referenced sections.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** are interpreted as described in §1.5.1 only when they appear in all capitals.

### 4.1 Conformance targets

SMART Health Check-in defines protocol roles rather than product architectures. One deployed product can implement more than one target, and one target can be split across components, provided that the protocol-visible obligations for every claimed target are met.

#### 4.1.1 Requester / Verifier

A **Requester** conformance claim concerns construction of SMART requests under §5 and consumption of SMART responses under §6. A Requester SHALL construct only §5-conforming SMART requests for this version, SHALL keep requester identity and trust metadata out of the clinical request body as required by §5.2.7, and SHALL request only Artifact media types it is prepared to process for the corresponding item under §5.6.

A **Verifier** conformance claim concerns presentation-transport invocation and validation. A Verifier that claims the direct same-device `org-iso-mdoc` feature SHALL satisfy the Verifier obligations in §8, including §8.7 and §8.8, and SHALL apply the §6.6 SMART response cross-validation rules before accepting a response for Requester use. A Verifier or Requester SHALL keep transport validation, reader authentication, mdoc issuer/device evidence, SMART Health Card verification, and clinical-source trust decisions distinct under §7.

#### 4.1.2 Wallet / Responder

A **Wallet / Responder** conformance claim concerns receiving a valid SMART request through a claimed flow, preserving Holder control, constructing a SMART response under §6, and returning that response through the claimed presentation binding. A Wallet/Responder SHALL validate the SMART request under §5 before using it for response construction, SHALL preserve request item ids for `fulfills[]` and `requestStatus[]`, and SHALL set `SmartHealthCheckinResponse.requestId` to the accepted SMART request `id`.

A Wallet/Responder that claims the direct same-device `org-iso-mdoc` feature SHALL satisfy the Wallet/Responder obligations in §8, including request-carrier validation, origin/session-transcript processing, optional `readerAuth` classification and verification when used, Holder review or equivalent Holder-control processing, mdoc response construction, and HPKE response encryption. A Wallet/Responder SHALL NOT treat `purpose`, item display text, wrapper metadata, relay metadata, or unknown SMART request members as authenticated requester identity unless the fact is established by a separate trust layer or deployment policy as described in §7.

#### 4.1.3 Phone presenter

A **Phone presenter** conformance claim applies only to the cross-device kiosk flow. A Phone presenter that claims the kiosk feature SHALL perform the §9.7 pointer parsing, provider lookup, request-id binding, encrypted-request opening, compact JWS verification, creator-trust evaluation, embedded `smartRequest` validation, and phone-local re-entry into §8 before submitting a successful result.

The Phone presenter SHALL treat the kiosk wrapper `requestId` as distinct from `KioskRequestPayload.smartRequest.id`. It SHALL NOT reuse or infer a §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, Wallet response, or SMART response from the QR code, Pointer URL, provider row, encrypted envelope, or kiosk request JWS. It SHALL construct or participate in a fresh phone-local §8 flow using the validated `smartRequest`.

#### 4.1.4 Kiosk creator

A **Kiosk creator** conformance claim applies to creating the signed and encrypted kiosk request and Pointer URL defined in §§9.1-9.6. A Kiosk creator that claims the kiosk feature SHALL embed the complete §5 SMART request directly as `KioskRequestPayload.smartRequest`, SHALL sign the kiosk request payload as the §9.3 compact JWS, SHALL encrypt that compact JWS into an `EncryptedKioskRequest` under §9.5, and SHALL publish or display only the pointer material allowed by §9.6.

A Kiosk creator SHALL NOT replace `smartRequest` with `requestProfile`, a preset or preset id, an IPS shortcut, an “all of the above” label, an SDK helper object, a legacy inline §8 fragment, or any other alternate clinical-request wrapper. A Kiosk creator SHALL keep wrapper routing, encryption, creator, provider, and completion metadata outside the embedded SMART request.

#### 4.1.5 Submission service / provider

A **Submission service** or **provider** conformance claim applies to the untrusted relay behavior described in §§9.1-9.12. A Submission service/provider used for the active kiosk flow SHALL provide equivalent capabilities to store or retrieve encrypted request state, store encrypted submission state, make ciphertext available to the Completion display, and let the Completion display observe candidate submissions for one wrapper `requestId` as described in §9.11.

A Submission service/provider SHALL NOT require plaintext `KioskRequestPayload`, plaintext `smartRequest`, plaintext `SubmissionPlaintext`, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder choices, §8 response plaintext, private keys, shared secrets, or clinical trust decisions merely to route, store, notify about, or make available kiosk state. Provider access control, cleanup, rate limiting, anti-enumeration, and size checks are defense in depth and do not replace the cryptographic and response-validation requirements imposed on Phone presenters and Completion displays.

#### 4.1.6 Completion display

A **Completion display** conformance claim applies to kiosk-side receipt and processing of encrypted submissions under §§9.8-9.12. A Completion display that claims the kiosk feature SHALL retain the verified kiosk request payload, the original embedded `smartRequest`, and the desktop private key corresponding to the signed `encryptResponseTo.desktopPublicKeyJwk` until the session completes, expires, is abandoned, or is cleaned up.

Before accepting a submitted SMART response for workflow use, a Completion display SHALL observe candidate rows for the expected wrapper `requestId`, download bounded ciphertext, decrypt locally using §9.8.3, verify the decrypted `SubmissionPlaintext.requestId` equals the wrapper `requestId`, validate `payload.smartResponse` under §6, apply §6.6 against the original embedded `smartRequest`, account for §8 validation as required by §9.9.3, and apply §7 trust interpretation. Provider notification, upload success, storage paths, row order, or provider metadata SHALL NOT be treated as Holder consent, patient identity, SMART response validity, mdoc issuer/device trust, clinical-source provenance, or downstream authorization.

#### 4.1.7 Profile, registry, schema, CDDL, fixture, and conformance-test authors

A **profile author** or **registry author** defines additional constraints, optional feature requirements, extension selector kinds, extension Artifact media types, status-code extensions, trust anchors, provider profiles, or conformance profiles. A profile author SHALL state which conformance targets are constrained, which optional features are required, and which additional validation, trust, security, privacy, or fixture expectations apply. A profile author SHALL NOT redefine the core semantics of SMART request fields, SMART response fields, selector kinds, Artifact media types, fulfillment links, or status codes.

A **schema, CDDL, fixture, or conformance-test author** SHALL derive tests from the normative requirements in the body of this specification and the appendices that explicitly restate those requirements. Appendix A is an index of requirements, not a source of new obligations. Fixture and test material that uses demo keys, self-signed material, checked-in private keys, synthetic data, or real-platform captures SHALL label that material's trust status and SHALL NOT represent it as production trust evidence unless the applicable deployment profile accepts it.

### 4.2 Mandatory features

The following feature sets are mandatory only for implementations that claim the corresponding conformance target or profile.

#### 4.2.1 Core SMART request and response support

An implementation that claims **Core SMART request support** for the Requester target SHALL construct SMART requests according to §5, including the fixed `type` and `version`, request `id`, item shape, selector rules, `accept[]` semantics, canonical `|version` handling, and prohibited requester-identity metadata.

An implementation that claims **Core SMART request processing** for the Wallet/Responder target SHALL parse and validate SMART requests according to §5, preserve request and item identifiers needed for response construction, handle unknown members and unknown selector kinds according to §5, and avoid treating request display fields as authenticated requester identity.

An implementation that claims **Core SMART response construction** for the Wallet/Responder target SHALL construct SMART responses according to §6, including `requestId`, `artifacts[]`, Artifact `mediaType`, non-empty `fulfills[]`, concrete core Artifact shapes, `requestStatus[]`, status-code semantics, many-to-many fulfillment, and FHIR-version rules.

An implementation that claims **Core SMART response validation** for the Verifier, Requester, Completion display, receiver, or conformance-test target SHALL validate the response under §6 and apply §6.6 against the original SMART request. Shape validation alone is not sufficient.

#### 4.2.2 Mandatory preservation of trust-layer separation

All implementations that claim any SMART Health Check-in conformance target SHALL preserve the trust-layer separation defined in §7 for the features they implement. In particular, they SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from successful transport presentation, mdoc issuer/device evidence, reader authentication, kiosk wrapper validation, Holder consent, request display text, response shape validation, provider metadata, or demo fixture keys.

An implementation that consumes `application/smart-health-card` Artifacts SHALL verify the SMART Health Card JWS content according to SMART Health Cards and local trust policy before relying on signed clinical content. An implementation that consumes `application/fhir+json` Artifacts SHALL treat them as patient-mediated raw FHIR JSON unless separate provenance, signature, authenticated retrieval evidence, extension-profile rules, or deployment policy supplies accepted source proof.

#### 4.2.3 Mandatory behavior for claimed direct same-device support

An implementation that claims the **direct same-device `org-iso-mdoc` feature** SHALL satisfy the applicable §8 obligations for its role. For Verifiers, this includes constructing the direct `org-iso-mdoc` request with `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable element `smart_health_checkin_response`, request carrier `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, `DeviceRequest.version` `"1.0"`, direct `dcapi` `encryptionInfo`, the §8.3 `SessionTranscript`, HPKE opening, mdoc validation, stable-element extraction, and §6.6 response validation. For Wallets/Responders, this includes validating the same request structure, using the same transcript construction, constructing the issuer-signed stable response element, producing device authentication, and encrypting the `DeviceResponse` using the §8 HPKE profile.

The direct same-device feature is the base presentation flow defined by this specification, but a product can also claim only transport-neutral request/response tooling, schema validation, fixture production, or profile-authoring conformance without claiming that it can perform live §8 presentation.

#### 4.2.4 Mandatory behavior for claimed kiosk support

An implementation that claims the **cross-device kiosk feature** SHALL satisfy the applicable §9 obligations for each kiosk target it implements. Kiosk support depends on the core SMART request/response model and on phone-local re-entry into the §8 same-device flow. A kiosk implementation SHALL NOT define a kiosk-specific clinical request or response language in place of the embedded `smartRequest` and resulting SMART response.

Kiosk targets SHALL preserve these already-defined invariants: direct `smartRequest` embedding; wrapper `requestId` distinct from `smartRequest.id`; pointer-only QR/URL with fragment `r` for the active profile; untrusted relay/provider behavior; response submission encrypted to the signed desktop public key; and Completion display validation before workflow use.

### 4.3 Optional features

Optional features are not required for every Core implementation. When an implementation claims an optional feature, the relevant requirements become mandatory for that claim.

#### 4.3.1 Direct same-device `org-iso-mdoc`

Support for live direct same-device presentation is optional relative to a purely transport-neutral request/response, schema, profile-authoring, or fixture-authoring implementation. An implementation that claims this feature SHALL identify which §8 role or roles it implements: Verifier, Wallet/Responder, or both.

#### 4.3.2 Cross-device kiosk wrapper

Support for the cross-device kiosk wrapper is optional. An implementation that claims this feature SHALL identify which kiosk targets it implements: Kiosk creator, Phone presenter, Submission service/provider, Completion display, Requester/Verifier, or Wallet/Responder. A kiosk claim SHALL NOT imply that the implementation supports all other kiosk targets unless the claim says so.

#### 4.3.3 Reader authentication and deployment trust policy

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. An implementation that claims `readerAuth` support SHALL satisfy the applicable §7.2 and §8 requirements for construction, verification, certificate evidence, trust-policy evaluation, and failure-state distinction. A deployment profile MAY require `readerAuth`, authenticated origin, privileged-caller allow-lists, issuer trust anchors, creator-key registries, provider profiles, clinical-source evidence, or stricter validation for its environment; such a profile SHALL state the target roles and assurance consequences.

Demo certificates, self-signed keys, checked-in private test keys, reflective allow-lists, demo issuer strings, and browser-delivered demo key material MAY be used in test or demonstration environments only when clearly labeled. They SHALL NOT be represented as production trust anchors or production key-management patterns unless an explicit deployment policy accepts them for that environment.

#### 4.3.4 Extension selectors, media types, status codes, and payload kinds

Extension selector kinds, extension Artifact media types, future status-code extensions, kiosk completion payload kinds other than the active `smart-health-checkin-response`, provider profiles, and stricter deployment schemas are optional. An implementation that claims support for such an extension SHALL implement the extension's registered or profile-defined shape, processing rules, validation rules, security considerations, privacy considerations, and interactions with §5, §6, §7, §8, and §9.

#### 4.3.5 Fixture and conformance-vector material

Fixture, byte-ladder, CDDL, schema, and conformance-vector material is optional for ordinary runtime components unless a certification program or deployment profile requires it. When such material is used as pass/fail evidence, the fixture or test profile SHALL state the exact requirements exercised, the expected validation outcome, whether comparison is byte-exact, structure-exact, semantic, or diagnostic-only, and the status of any test keys, demo certificates, real-platform captures, or synthetic data.

#### 4.3.6 Future OID4VP binding

The OpenID4VP binding in §10 is reserved and informative for version 1.0. No implementation is required to support OID4VP to claim conformance to the version 1.0 core request/response model, the direct same-device `org-iso-mdoc` feature, or the cross-device kiosk feature. An implementation SHALL NOT claim that an OID4VP experiment satisfies the §8 direct same-device feature or the §9 kiosk wrapper unless a future version or explicit profile defines that mapping.

### 4.4 Profile identifiers

A profile identifier names a set of constraints for a conformance claim, deployment profile, optional feature, or test suite. Profile identifiers are not in-band clinical selectors and do not replace §5 `profiles[]`, §5 `profilesFrom[]`, request item `accept[]`, or Artifact `mediaType`.

Version 1.0 uses the following conceptual profile identifiers; §13 owns the final registry form and change-control policy:

| Identifier | Feature set | Conformance targets |
| --- | --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response model | Requester, Wallet/Responder, Verifier/receiver, schema/test authors |
| `smart-health-checkin-mdoc-1` | Direct same-device `org-iso-mdoc` flow in §8, including the core clinical model | Requester/Verifier, Wallet/Responder, fixture/test authors |
| `smart-health-checkin-kiosk-1` | Cross-device kiosk wrapper in §9, including phone-local re-entry into §8 | Kiosk creator, Phone presenter, Submission service/provider, Completion display, Requester/Verifier, Wallet/Responder |
| `smart-health-checkin-reader-auth-1` | Optional per-`DocRequest.readerAuth` support and deployment trust policy hooks | Verifier, Wallet/Responder, deployment profile authors, test authors |
| `smart-health-checkin-fixtures-1` | Schema, CDDL, byte-ladder, fixture, and conformance-vector constraints when promoted by Appendix A/§13/T6.C | Fixture and conformance-test authors |
| `smart-health-checkin-oid4vp-reserved` | Reserved informative future binding | Profile authors only; no version 1.0 runtime conformance claim |

A conforming implementation or certification report SHOULD state the profile identifier or identifiers it claims and the role or roles implemented for each. A profile identifier SHALL NOT be used inside the SMART request body to smuggle requester identity, to narrow or override request selectors, to bypass `accept[]`, or to change response validation rules.

### 4.5 Versioning rules

Versioning is layered. A conformance claim SHALL distinguish SMART request/response model versions, mdoc document-type versions, kiosk wrapper versions, extension/profile versions, FHIR versions, and fixture-vector versions.

#### 4.5.1 SMART request and response model version

For SMART Health Check-in 1.0, a Requester SHALL set `SmartHealthCheckinRequest.type` to `"smart-health-checkin-request"` and `version` to `"1"`, and a Wallet/Responder SHALL set `SmartHealthCheckinResponse.type` to `"smart-health-checkin-response"` and `version` to `"1"`. Wallets/Responders and Verifiers SHALL reject other values unless a future version-compatibility rule explicitly defines compatible handling.

The SMART model `version` is not a FHIR version, not a kiosk wrapper version, not a Digital Credentials API version, not an mdoc `DeviceRequest.version`, and not a trust-framework assurance label.

#### 4.5.2 mdoc and direct same-device versioning

The direct same-device feature uses Digital Credentials protocol `org-iso-mdoc`, mdoc `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable element `smart_health_checkin_response`, and `DeviceRequest.version` `"1.0"` as defined in §8. A future major version that changes incompatible mdoc semantics SHOULD use a distinct document type or profile identifier rather than silently changing the meaning of `org.smarthealthit.checkin.1`.

#### 4.5.3 Kiosk wrapper versioning

The kiosk request payload and `EncryptedKioskRequest` envelope use numeric `v: 1` for the active profile. The active kiosk request JWS `typ`, request-envelope `contentType`, algorithm labels, HKDF info strings, pointer profile, and response-submission payload kind are versioned profile material owned by §9 and §13. Kiosk versioning SHALL NOT change the semantics of the embedded §5 SMART request or the §6 SMART response.

#### 4.5.4 FHIR and profile-family versioning

FHIR release versions are carried by request `fhirVersions[]`, raw FHIR Artifact `fhirVersion`, SMART Health Card payloads, and FHIR canonicals according to §§5-6 and Appendix H. A conformance profile SHALL NOT treat SMART Health Check-in `version: "1"` as a FHIR release. A profile-family selector in `profilesFrom[]` remains a §5 selector, not a conformance-profile identifier for this specification.

#### 4.5.5 Compatible extension and profile evolution

A future extension or deployment profile MAY add stricter validation, registered selector kinds, registered media types, registered status codes, additional payload kinds, provider profiles, fixture-vector profiles, or trust requirements. Such additions SHALL identify their version and target roles. They SHALL NOT redefine the semantics of existing core fields, accepted media types, status codes, identifier scopes, direct `smartRequest` embedding, pointer-only kiosk behavior, or source-trust separation for claims made under version 1.0.

### 4.6 Extension model

Extensions are explicit, registered or profile-defined additions. Unknown extension material is not a license to change core semantics.

A selector-kind registrant SHALL follow §5.4.3. A media-type registrant or Artifact-profile author SHALL follow §6.3.3. A deployment-profile author SHALL follow §7.6. A kiosk provider, payload-kind, or fixture-vector profile author SHALL state the shape, processing rules, validation rules, security and privacy considerations, and target roles for the extension. Registry and review procedures are completed in §13.

A Requester SHALL NOT use unregistered or privately defined extension selectors when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support an extension selector kind SHALL NOT guess its semantics from display text. A Verifier or receiver that does not support an extension Artifact media type, status-code extension, or payload kind SHALL NOT infer validation, dereferencing, integrity, FHIR-version, or source-trust behavior from field names alone.

Extensions SHALL NOT:

- redefine `SmartHealthCheckinRequest.type`, `version`, `id`, `purpose`, `fhirVersions[]`, `items[]`, item `id`, item `required`, item `accept[]`, `fhir.resources`, `questionnaire`, or core selector semantics;
- redefine `SmartHealthCheckinResponse.type`, `version`, `requestId`, `artifacts[]`, `requestStatus[]`, Artifact `id`, `mediaType`, or `fulfills[]`;
- permit requester identity metadata in the SMART request body unless a future version defines an explicit trust model;
- replace direct kiosk `smartRequest` embedding with `requestProfile`, presets, IPS shortcuts, SDK helper wrappers, or inline §8 fragments;
- make the untrusted Submission service a plaintext clinical processor merely by changing provider row shape; or
- claim production trust from demo keys, self-signed fixture material, or diagnostic captures without an explicit deployment trust policy.

An extension MAY impose stricter constraints than the base specification, including narrower media types, mandatory `readerAuth`, mandatory provenance-bearing Artifact forms, stricter FHIR validation, shorter kiosk lifetimes, stronger provider controls, or byte-exact fixture requirements, provided the extension identifies those constraints as additional to the base conformance claim.

### 4.7 Conformance checklist cross-link

Appendix A is the conformance checklist for certification and interoperability testing. Appendix A SHALL list one row per normative requirement or tightly grouped requirement set, identify the conformance target, cite the stable section number, name the applicable profile or optional feature, and avoid creating requirements not present in the normative body.

Conformance-test authors SHOULD organize Appendix A and test suites around the feature sets in this section:

1. Core SMART request construction and processing (§5).
2. Core SMART response construction and cross-validation (§6).
3. Trust-layer separation and deployment-policy seams (§7).
4. Direct same-device `org-iso-mdoc` request, response, validation, and optional `readerAuth` (§8 and Appendices C/E/G as applicable).
5. Kiosk request creation, pointer transport, phone resolution, response submission, completion processing, provider abstraction, and replay/expiration handling (§9 and kiosk Appendix C/D material as applicable).
6. Extension, profile, registry, schema, CDDL, fixture, and future-binding material (§§4, 10, 13 and Appendices A-D/H as applicable).

A checklist row for an optional feature SHALL state that the requirement applies only to implementations claiming that feature or to deployment profiles that make the feature mandatory. A checklist row that references fixture material SHALL state whether the fixture is a conformance vector, diagnostic material, historical capture, implementation regression, or illustrative example.

## Organizer notes

### Strengths

- Separates conformance targets by role and keeps requirements target-specific.
- Treats the transport-neutral SMART request/response model, direct §8 presentation, kiosk §9 wrapper, optional `readerAuth`, fixture material, extensions, and future OID4VP as separate claims.
- Preserves accepted decisions: direct `smartRequest`, no `requestProfile`/preset/IPS shortcuts, wrapper `requestId` distinct from `smartRequest.id`, pointer-only QR, untrusted relay, source-trust separation, raw FHIR as patient-mediated unless separately provenanced, and no production trust claims from demo keys.

### Caveats

- The profile identifiers are deliberately conceptual because §13 owns the final registry syntax and change-control text.
- The text references Appendix A, fixture promotion, and registry behavior before T5.F/T5.D/T6.C are canonical; downstream organizers should align names and checklist granularity.
- Direct same-device is described as optional relative to pure transport-neutral tooling, while still acknowledging it as the base live presentation flow for version 1.0.

### Open questions

- Should final §4 use the conceptual profile identifiers shown here, URI identifiers, OIDs, or registry slugs once §13 is canonical?
- Should Appendix A group repeated role obligations by feature set, or require one row for every SHALL in §§5-9 even when rows become numerous?
- Should any zero-item request rule, nonce-size rule, duplicate CBOR/JSON handling rule, or fixture-promotion rule move into core conformance, or remain deployment/profile material as the prerequisite sections currently suggest?

### Downstream dependencies

- T5.D should finalize profile-id, selector-kind, media-type, status-code, payload-kind, JWS `typ`, content-type, and provider-profile registry language.
- T5.F should convert this section and §§5-9 into a one-row-per-rule checklist without adding new obligations.
- T5.B/T5.C should threat-check and privacy-check the same trust boundaries, relay opacity, key-custody caveats, raw-FHIR source trust, and fixture/demo-key limitations summarized here.
- T6.C should decide which same-device and kiosk fixtures are promoted from diagnostic/historical material to conformance vectors.
