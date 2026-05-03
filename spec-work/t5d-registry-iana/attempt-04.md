## 13. IANA / registry considerations

This section records the registries and registration requests needed for SMART Health Check-in 1.0. It is a registry mirror of the identifiers already defined in §§4-9; it does not create a second protocol, a second clinical request language, or new in-band request fields.

The registries in this section fall into four categories:

1. **External media-type references or requests.** These are IANA media-type matters only where this specification requests or references an IANA media type.
2. **mdoc / ISO ecosystem identifiers.** These are document type, namespace, element, and `requestInfo` identifiers used by the direct `org-iso-mdoc` binding. They are not IANA media-type registrations.
3. **SMART Health Check-in registries.** These are specification-controlled registries for status codes, selector kinds, profile identifiers, kiosk payload kinds, and related extension hooks.
4. **Deployment and future-profile identifiers.** These are additional constraints that MAY be defined by deployment profiles or later versions, subject to the expert-review rules in §13.7.

A registry entry or profile identifier SHALL NOT be used as a substitute for the transport-neutral SMART request or SMART response fields. In particular, profile identifiers SHALL NOT appear as `requestProfile` fields, preset ids, IPS shortcuts, “all of the above” shortcuts, or alternate kiosk clinical-request wrappers.

### 13.1 Media type registrations / references

SMART Health Check-in 1.0 uses the media types in Table 13-1. The table distinguishes externally defined media types, this specification's requested kiosk envelope media type, and opaque blob storage conventions.

| Media type or content type | Registry status for this specification | Use in SMART Health Check-in 1.0 |
| --- | --- | --- |
| `application/fhir+json` | Referenced external media type. This specification does not redefine FHIR JSON or claim ownership of the type. | Core SMART response Artifact `mediaType`; also appears in request item `accept[]` when the Requester can process raw FHIR JSON. A returned Artifact using this type carries a FHIR JSON Resource or Bundle in `value` and declares `fhirVersion`. |
| `application/smart-health-card` | Referenced SMART Health Cards media type. This specification does not redefine SMART Health Cards or claim ownership of the type. | Core SMART response Artifact `mediaType`; also appears in request item `accept[]` when the Requester can process SMART Health Cards. A returned Artifact using this type carries `value.verifiableCredential[]` and does not carry an outer Artifact-level `fhirVersion`. |
| `application/smart-health-checkin-kiosk-request+jws+aesgcm` | Registration requested by this specification, or provisional until registration is accepted. | `EncryptedKioskRequest.contentType` for the encrypted kiosk request envelope whose plaintext is a compact kiosk request JWS and whose encryption suite is labeled `ECDH-P256+HKDF-SHA256+AES-GCM` with `enc` `A256GCM`. |
| `application/octet-stream` | Referenced generic binary media type. This specification does not register or specialize it. | Opaque encrypted kiosk response-submission blobs stored or served by an untrusted Submission service/provider. The blob bytes are not a SMART response media type and are not clinical plaintext. |

The core clinical Artifact media-type registry for version 1.0 consists of `application/fhir+json` and `application/smart-health-card`. A Requester SHALL list an Artifact media type in `accept[]` only when it is prepared to process a conforming Artifact of that media type. A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact `mediaType` is accepted by that item, except where a registered compatibility rule explicitly permits substitution.

#### 13.1.1 `application/fhir+json`

This specification references `application/fhir+json` for raw FHIR JSON Artifacts. SMART Health Check-in constrains only its wrapper use:

- `Artifact.mediaType` is exactly `application/fhir+json`;
- `Artifact.value` is a FHIR JSON Resource or Bundle;
- `Artifact.fhirVersion` is present and is a non-empty FHIR release-version string; and
- unsigned raw FHIR JSON remains patient-mediated unless the payload or deployment profile supplies separate provenance, proof, or signature evidence.

No new IANA registration action is requested for `application/fhir+json` by SMART Health Check-in 1.0.

#### 13.1.2 `application/smart-health-card`

This specification references `application/smart-health-card` for SMART Health Card Artifacts. SMART Health Check-in constrains only its wrapper use:

- `Artifact.mediaType` is exactly `application/smart-health-card`;
- `Artifact.value.verifiableCredential[]` carries one or more SMART Health Card verifiable credentials; and
- the Artifact does not carry an outer Artifact-level `fhirVersion`, because the signed SMART Health Card payload carries its own content semantics.

No new IANA registration action is requested for `application/smart-health-card` by SMART Health Check-in 1.0.

#### 13.1.3 `application/smart-health-checkin-kiosk-request+jws+aesgcm`

This specification requests registration, or uses provisionally pending registration, of the media type `application/smart-health-checkin-kiosk-request+jws+aesgcm` for the encrypted kiosk request envelope defined in §9.5.

Registration template:

| Field | Value |
| --- | --- |
| Type name | `application` |
| Subtype name | `smart-health-checkin-kiosk-request+jws+aesgcm` |
| Required parameters | None. |
| Optional parameters | None defined by version 1.0. |
| Encoding considerations | Binary safe transport is required when used directly. In the version 1.0 JSON envelope, ciphertext and IV members are base64url strings without padding. |
| Security considerations | The value identifies an encrypted request envelope whose plaintext is a compact JWS. Security depends on creator JWS verification, request-envelope ECDH P-256 + HKDF-SHA-256 + AES-GCM authentication, signed `requestId` binding, expiration checks, key custody, and the §11 kiosk relay considerations. The media type by itself is not proof of requester identity, Holder consent, clinical-source provenance, or response validity. |
| Interoperability considerations | The active profile fixes `alg` to `ECDH-P256+HKDF-SHA256+AES-GCM`, `enc` to `A256GCM`, the request-envelope HKDF info string to `smart-health-checkin-kiosk-request-v1`, and the plaintext to the compact JWS with protected-header `typ` `smart-health-checkin+kiosk-request+jws`. |
| Published specification | SMART Health Check-in 1.0, §9.5 and §13.1.3. |
| Applications that use this media type | SMART Health Check-in kiosk creators, Phone presenters, Completion displays, and Submission service/provider integrations. |
| Fragment identifier considerations | None. Kiosk pointer URLs use the `r` fragment parameter defined in §9.6; that pointer URL is not a representation of this media type. |
| Additional information | Deprecated aliases: none. File extensions and Macintosh file type codes: none specified. |
| Person and email address to contact for further information | Specification-maintainer contact to be supplied by the publication venue. |
| Intended usage | COMMON for implementations of the optional SMART Health Check-in kiosk profile. |
| Restrictions on usage | None beyond the protocol and security requirements in this specification. |
| Author / change controller | SMART Health Check-in specification project or successor standards venue. |

A Submission service/provider MAY store encrypted request state using database rows, object storage, or other provider-local representations, but a conforming `EncryptedKioskRequest` for the active profile SHALL declare `contentType` exactly `application/smart-health-checkin-kiosk-request+jws+aesgcm`.

### 13.2 mdoc registry entries

The direct same-device presentation binding uses W3C Digital Credentials API protocol `org-iso-mdoc` and mdoc identifiers listed in Table 13-2. These identifiers are mdoc / ISO ecosystem registrations or registration requests. They are not IANA media-type registrations and are not clinical Artifact media types.

| Identifier kind | Value | Version 1.0 use |
| --- | --- | --- |
| Digital Credentials API protocol | `org-iso-mdoc` | Direct same-device presentation protocol id. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | The SMART Health Check-in mdoc document type for version 1.0. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the stable response element. |
| mdoc element | `smart_health_checkin_response` | The one requested and disclosed element carrying `JSON.stringify(SmartHealthCheckinResponse)` as a string. |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` | The key whose value is `JSON.stringify(SmartHealthCheckinRequest)` in the §8 request. |

A Verifier implementing the §8 direct same-device flow SHALL use `org-iso-mdoc` as the Digital Credentials API protocol, SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`, and SHALL carry the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` for the version 1.0 core profile.

A Wallet/Responder implementing the §8 flow SHALL disclose the SMART response as the element value of `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. A Verifier SHALL NOT treat dynamic element names, individual FHIR profiles, status codes, request items, Artifact media types, questionnaires, kiosk wrapper fields, or archived claim-name experiments as alternate version 1.0 mdoc registry entries.

Registration or reservation of `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request` in the appropriate mdoc / ISO maintenance venue is requested or remains provisional pending that venue's process. Until such registration is complete, implementations using these identifiers do so as the SMART Health Check-in 1.0 identifiers defined by this specification.

### 13.3 Status code registry

The SMART Health Check-in Status Code Registry governs values of `SmartHealthCheckinResponse.requestStatus[].status`. Version 1.0 defines the initial entries in Table 13-3.

| Code | Semantics | Change policy |
| --- | --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. | Specification Required. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. | Specification Required. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without Holder refusal being the relevant cause. | Specification Required. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. | Specification Required. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. | Specification Required. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. | Specification Required. |

A Wallet/Responder SHALL use only these status codes in a SMART Health Check-in 1.0 response unless the receiving Verifier explicitly supports a registered status-code extension. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless such an extension is explicitly supported.

A status-code registration request SHALL include:

- the exact status string;
- the intended request-processing state;
- how it differs from `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`;
- whether Artifacts are expected, permitted, or prohibited for the status;
- Wallet/Responder construction rules;
- Verifier validation and display rules;
- security and privacy considerations, including guidance for `message`; and
- at least one example request/response fragment.

A new status code SHALL NOT redefine the meaning of the version 1.0 codes, weaken `requestStatus[]` coverage, or convert transport failures, requester identity assertions, provider metadata, or trust decisions into clinical outcome codes.

### 13.4 Content-selector kind registry

The SMART Health Check-in Content-Selector Kind Registry governs values of `SmartHealthCheckinRequest.items[].content.kind`. Version 1.0 defines the initial entries in Table 13-4.

| Kind | Selector shape | Summary | Change policy |
| --- | --- | --- | --- |
| `fhir.resources` | Object with optional `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` arrays. | Requests patient-specific FHIR resources. `profiles[]` and `profilesFrom[]` are additive; `profilesFrom[]` is an array of canonical profile-family URLs; `resourceTypes[]` is an official FHIR resource-type constraint. | Specification Required. |
| `questionnaire` | Object carrying a Questionnaire canonical string, inline Questionnaire resource, or object with `canonical` and/or `resource`. | Requests completion of, or response to, a FHIR Questionnaire. | Specification Required. |

A selector-kind registration request SHALL include:

- the exact `content.kind` value;
- JSON shape, required members, optional members, and unknown-member handling;
- clinical meaning and content-satisfaction rules;
- interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, and Questionnaire handling where applicable;
- Wallet/Responder unsupported, unavailable, partial, declined, and error behavior;
- Artifact fulfillment and media-type expectations;
- Verifier validation rules;
- security and privacy considerations; and
- examples.

A selector-kind registration SHALL NOT redefine `SmartHealthCheckinRequest.type`, `version`, `id`, `purpose`, `items[]`, item `id`, item `required`, item `accept[]`, the core `fhir.resources` or `questionnaire` semantics, requester identity handling, or trust-layer separation. A Holder Wallet/Responder that does not support a selector kind SHALL NOT guess its semantics from display text, local topics, profile labels, provider metadata, or wrapper fields.

### 13.5 Profile-id registry

The SMART Health Check-in Profile-id Registry governs identifiers or labels for coherent conformance, deployment, provider, fixture, and extension profiles. Profile identifiers are for conformance claims, documentation, test reports, deployment policy, or extension references. They are not SMART request fields, SMART response fields, clinical selectors, status codes, media types, kiosk payload shortcuts, or substitutes for `KioskRequestPayload.smartRequest`.

Until permanent registry syntax is finalized by the publication venue, SMART Health Check-in 1.0 uses the provisional conformance labels from §4 in Table 13-5.

| Provisional label | Summary |
| --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-kiosk-1` | Cross-device §9 kiosk wrapper support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |

A profile-id registration request SHALL include:

- the exact profile identifier or label;
- whether it is a conformance, deployment, provider, fixture, media-type, selector, status-code, kiosk-payload, or future-binding profile;
- the conformance target roles it constrains;
- the optional features it requires or forbids;
- the specification version and sections it profiles;
- any trust anchors, assurance labels, key-management constraints, size limits, replay/expiration rules, fixture classes, or validation rules it adds;
- interoperability expectations and downgrade behavior; and
- security, privacy, and internationalization considerations.

A profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media-type rules, fulfillment links, status codes, same-device carriers, kiosk `smartRequest` embedding, wrapper/SMART id separation, pointer-only QR behavior for the active profile, cryptographic context separation, or the untrusted-relay model. Future or deployment profiles MAY add stricter validation, production trust anchors, provenance requirements, provider constraints, fixture comparison modes, or new registered extension points if they state those constraints explicitly.

### 13.6 JWS `typ` registry entry

The compact kiosk request JWS defined in §9.3 uses protected-header `typ` value `smart-health-checkin+kiosk-request+jws`. This value identifies the signed kiosk request payload whose JSON body is `KioskRequestPayload` and whose `smartRequest` member embeds a complete `SmartHealthCheckinRequest` directly.

Initial JWS `typ` entry:

| Field | Value |
| --- | --- |
| `typ` value | `smart-health-checkin+kiosk-request+jws` |
| Applies to | Compact JWS protected header for the signed kiosk request payload. |
| Payload | `KioskRequestPayload` with `v: 1`, `requestId`, `smartRequest`, `encryptRequestTo`, `encryptResponseTo`, `constraints`, and creator/provider metadata as defined in §9.4. |
| Signing algorithm in active profile | `alg` `ES256`; creator key identified by `kid` and interpreted under deployment policy. |
| Request-envelope binding | The compact JWS is encrypted into `EncryptedKioskRequest` with `contentType` `application/smart-health-checkin-kiosk-request+jws+aesgcm`; request-envelope HKDF info is `smart-health-checkin-kiosk-request-v1`. |
| Security considerations | The `typ` value is only a type discriminator. It is not proof of creator trust, requester identity, Holder consent, response validity, mdoc issuer/device trust, or clinical-source provenance. Implementations still verify the signature, validate the payload, bind wrapper `requestId`, enforce expiration, and validate the embedded `smartRequest`. |

This specification treats this `typ` value as a SMART Health Check-in registry entry unless a JOSE or publication-venue registry provides a more appropriate permanent registry. No implementation SHALL accept a different `typ` value as equivalent for the active version 1.0 kiosk request JWS unless a future version or explicit deployment profile registers that value and defines compatibility.

The kiosk response-submission plaintext uses `payload.kind` value `smart-health-checkin-response` for the active successful payload. That value belongs to the SMART Health Check-in kiosk payload-kind extension space, not to the JWS `typ` field and not to the SMART response top-level `type` discriminator, although it intentionally names the enclosed `SmartHealthCheckinResponse` payload class.

### 13.7 Designated expert review process

Registries created by SMART Health Check-in use Specification Required with Designated Expert review unless a future standards venue assigns a different policy. Expert review is intended to keep extension points interoperable without freezing deployment-specific innovation.

Designated Experts SHOULD approve registrations that:

- use collision-resistant, stable identifiers;
- identify the exact registry being extended;
- provide complete syntax, validation, processing, unsupported-behavior, and examples;
- preserve the transport-neutral SMART request and SMART response model;
- preserve direct `smartRequest` embedding for kiosk requests and the distinction between wrapper `requestId` and `smartRequest.id`;
- preserve pointer-only QR behavior for the active kiosk profile, including fragment parameter `r`;
- preserve the separation among §8 HPKE, §9 request-envelope encryption, and §9 response-submission encryption;
- preserve trust-layer separation among origin, optional `readerAuth`, mdoc issuer/device evidence, kiosk wrapper validation, provider metadata, Holder action, and clinical-source provenance;
- state security, privacy, logging, retention, replay, size, and downgrade considerations; and
- state conformance-target and profile interactions.

Designated Experts SHOULD reject or request revision for registrations that:

- redefine core request or response fields rather than adding an explicit extension;
- introduce in-band `requestProfile`, preset, IPS shortcut, “all of the above” shortcut, or local-topic shortcut semantics;
- require untrusted relays or providers to see plaintext SMART requests, SMART responses, raw FHIR, SMART Health Cards, private keys, shared secrets, or clinical trust decisions merely to route state;
- blur `application/fhir+json`, `application/smart-health-card`, `application/octet-stream` ciphertext blobs, `application/smart-health-checkin-kiosk-request+jws+aesgcm` envelopes, and SMART response Artifact media types;
- make unknown status codes valid for general version 1.0 validation without explicit Verifier support;
- convert profile identifiers into clinical selectors or SMART request fields;
- treat demo keys, self-signed material, fixture captures, provider ids, or example strings as production trust anchors; or
- weaken required validation in §§5-9.

Registrations MAY be marked provisional, experimental, deprecated, or reserved. A provisional or experimental registration SHALL state whether unrelated implementations are expected to interoperate with it. Deprecated registrations SHOULD identify replacement identifiers and migration guidance, but deprecation SHALL NOT change the meaning of already published SMART Health Check-in 1.0 messages.

## Organizer notes

### Strengths

- Mirrors the active identifiers from §§4-9 without inventing a second clinical protocol.
- Clearly separates IANA media-type considerations, mdoc / ISO ecosystem identifiers, SMART Health Check-in internal registries, provisional conformance labels, and future deployment profiles.
- Preserves all active constants: request/response type and version, selector kinds, core media types, status codes, `org-iso-mdoc`, mdoc identifiers, kiosk JWS `typ`, kiosk content type, algorithm labels, HKDF info strings, pointer parameter `r`, and successful kiosk payload kind.
- Emphasizes that profile identifiers are not `requestProfile` fields and cannot replace direct `smartRequest` embedding.

### Caveats

- The exact publication venue and change controller for the IANA media-type request are placeholders until governance is chosen.
- The mdoc identifier registration process is intentionally described as an mdoc / ISO ecosystem matter rather than as an IANA action; final wording may need adjustment to match the maintenance authority's terminology.
- The JWS `typ` value is treated as a SMART Health Check-in registry entry unless a JOSE-specific venue is selected.

### Open questions

- Should the permanent profile-id registry use these provisional labels verbatim, convert them to URLs, or assign a standards-venue namespace?
- Should kiosk response-submission `payload.kind` values get a separate named registry in §13, or remain part of the profile-id / extension review process?
- Should the kiosk encrypted-request media type be submitted in the standards tree as written, or published first as a provisional/vendor-tree value during implementation testing?

### Downstream dependencies

- T5.F should add checklist rows for registry use, extension registration contents, unknown status-code rejection, selector-kind registration, media-type compatibility, and profile-id non-use as request fields.
- Security and privacy sections should align their media-type, relay, ciphertext-blob, and demo-key guidance with the distinctions in §13.1 and §13.7.
- Final examples and fixtures should label whether fixture identifiers and profile labels are conformance vectors, diagnostic material, historical captures, implementation regressions, or illustrative examples.
