## 13. IANA / registry considerations

This section records registry and change-control considerations for SMART Health Check-in 1.0. It mirrors identifiers defined normatively in §§4-9; it does not introduce new wire identifiers, new conformance profiles, or alternate request/response fields.

SMART Health Check-in 1.0 uses fixed model discriminators `type: "smart-health-checkin-request"`, `type: "smart-health-checkin-response"`, and model `version: "1"` for the transport-neutral SMART request and SMART response. These values are stable protocol constants, not media types and not conformance profile identifiers. Profile identifiers defined or reserved by this section are documentation, test-report, and deployment-policy labels; they SHALL NOT be placed in a SMART request as `requestProfile`, a preset id, an IPS shortcut, an “all of the above” shortcut, or any other in-band clinical selector.

### 13.1 Media type registrations / references

SMART Health Check-in 1.0 references the following media types in core request and response processing.

| Media type | Use in this specification | Registration status / action |
| --- | --- | --- |
| `application/fhir+json` | Core Artifact media type for raw FHIR JSON returned under §§5-6. A raw FHIR JSON Artifact declares `fhirVersion` in the SMART Health Check-in wrapper. | Existing FHIR JSON media type. This specification references it and does not request a new IANA registration for it. |
| `application/smart-health-card` | Core Artifact media type for SMART Health Card file-style JSON carrying `value.verifiableCredential[]`. The Artifact SHALL NOT carry an outer `fhirVersion`. | External SMART Health Cards media type / convention. This specification references it and does not claim to register it. |
| `application/smart-health-checkin-kiosk-request+jws+aesgcm` | `EncryptedKioskRequest.contentType` for the version 1 kiosk request envelope whose plaintext is a compact kiosk request JWS and whose envelope encryption is the §9.3 `ECDH-P256+HKDF-SHA256+AES-GCM` profile with `enc: "A256GCM"`. | SMART Health Check-in-defined media type candidate. If publication policy requires IANA registration, the registration request should use the template below. Until registration is completed, specifications and implementations SHOULD describe it as a SMART Health Check-in 1.0 media-type identifier, not as an already-permanent IANA assignment. |
| `application/octet-stream` | Opaque provider blob content type for encrypted kiosk response-submission ciphertext bytes. | Existing generic media type. This specification uses it for opaque encrypted bytes and does not register a new blob media type. |

For `application/smart-health-checkin-kiosk-request+jws+aesgcm`, the intended media-type registration request is:

| Field | Value |
| --- | --- |
| Type name | `application` |
| Subtype name | `smart-health-checkin-kiosk-request+jws+aesgcm` |
| Required parameters | none |
| Optional parameters | none defined by SMART Health Check-in 1.0 |
| Encoding considerations | binary or 8-bit safe transport; when used in `EncryptedKioskRequest.contentType`, the envelope itself is JSON and its ciphertext is base64url without padding |
| Security considerations | See §§9 and 11. The media type identifies an encrypted kiosk request envelope; recipients MUST still validate `v`, `alg`, `enc`, `contentType`, `requestId`, expiration, key identifiers, AES-GCM authentication, the decrypted compact JWS, JWS `typ`, creator signature, and embedded `smartRequest`. The content type is not a trust assertion. |
| Interoperability considerations | Version 1.0 fixes `alg` to `ECDH-P256+HKDF-SHA256+AES-GCM`, `enc` to `A256GCM`, request-envelope HKDF info to `smart-health-checkin-kiosk-request-v1`, and the separate response-submission HKDF info string to `smart-health-checkin-kiosk-response-v1`. Future incompatible envelope or submission formats need a new profile and may need a new media type. |
| Published specification | SMART Health Check-in 1.0, §§9 and 13 |
| Applications that use this media type | SMART Health Check-in kiosk creators, phone presenters, and submission services/providers |
| Fragment identifier considerations | none |
| Additional information | The plaintext is a compact JWS whose protected header `typ` is `smart-health-checkin+kiosk-request+jws`; the JWS payload embeds `smartRequest` directly. |
| Person and email address to contact | SMART Health IT project contact to be supplied at publication time |
| Intended usage | COMMON or LIMITED USE, to be decided by publication authority |
| Restrictions on usage | none beyond the published specification |
| Author | SMART Health IT project |
| Change controller | SMART Health IT project or successor standards-maintenance body |

SMART Health Check-in 1.0 defines no media-type compatibility substitutions beyond exact equality. A Wallet/Responder SHALL NOT return an Artifact for an item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a future registered media-type compatibility rule is explicitly supported by the receiving Verifier. A media-type extension registrant SHALL define payload shape, body field use (`value`, `url`, `data`), encoding, dereferencing, integrity, FHIR-version semantics, validation, status behavior, security considerations, privacy considerations, and compatibility with any core media type.

### 13.2 mdoc registry entries

The direct same-device presentation flow uses the existing W3C Digital Credentials API protocol id `org-iso-mdoc`. This specification does not request a new Digital Credentials API protocol identifier.

SMART Health Check-in 1.0 uses the following mdoc / ISO ecosystem identifiers and requests that corresponding registrations, reservations, or deployment-profile listings be created in the applicable mdoc, ISO/IEC 18013-5, or community registry process when such a process is available.

| Registry area | Entry | Meaning / reference | Change policy |
| --- | --- | --- | --- |
| mdoc document type | `org.smarthealthit.checkin.1` | SMART Health Check-in 1.0 mdoc document type for the direct `org-iso-mdoc` flow (§8). The suffix `1` is tied to the version 1.0 same-device mdoc profile, not to FHIR version. | SMART Health IT or successor standards-maintenance body. Breaking mdoc-carrier changes SHOULD use a new profile identifier and, where necessary, a new `docType` suffix. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the SMART Health Check-in response element (§8). | Same as document type. |
| mdoc element identifier | `smart_health_checkin_response` | Stable issuer-signed element whose `elementValue` is the UTF-8 JSON serialization of `SmartHealthCheckinResponse` (§8.5). | Same as document type. |
| `ItemsRequest.requestInfo` key | `org.smarthealthit.checkin.request` | Request carrier key whose value is the JSON serialization of `SmartHealthCheckinRequest` (§8.2). | Same as document type. |

A Verifier SHALL request exactly `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response` for the core direct flow. A Verifier SHALL carry the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic element names, archived claim-name experiments, kiosk wrapper fields, profile identifiers, or selector names as alternate version 1.0 request carriers.

The stable response element carries one SMART response. Registrations for additional mdoc elements SHALL NOT redefine FHIR profile selectors, request items, Artifact media types, status codes, or individual clinical resources as separate core mdoc elements unless a future version or explicit deployment profile defines such behavior.

### 13.3 Status code registry

SMART Health Check-in maintains a status-code registry for `requestStatus[].status`. Version 1.0 defines these initial entries:

| Code | Status | Semantics | Reference |
| --- | --- | --- | --- |
| `fulfilled` | active | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. | §6.4.2 |
| `partial` | active | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. | §6.4.2 |
| `unavailable` | active | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without Holder refusal being the relevant cause. | §6.4.2 |
| `declined` | active | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. | §6.4.2 |
| `unsupported` | active | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. | §6.4.2 |
| `error` | active | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. | §6.4.2 |

A Wallet/Responder SHALL use only active version 1.0 status codes unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless such support is present.

A status-code registration request SHALL include: exact code string; lifecycle status (`provisional`, `active`, `deprecated`, or `reserved`); semantics; when a Wallet/Responder uses it instead of each existing code; expected Artifact relationship, if any; Verifier handling; security considerations; privacy considerations, especially for associated `message` text; and at least one example. A new status code SHALL NOT redefine existing code semantics or remove the requirement that `requestStatus[]` cover every request item exactly once.

### 13.4 Content-selector kind registry

SMART Health Check-in maintains a content-selector kind registry for `SmartHealthCheckinRequestItem.content.kind`. Version 1.0 defines these initial entries:

| `content.kind` | Status | Selector shape | Semantics | Reference |
| --- | --- | --- | --- | --- |
| `fhir.resources` | active | `content` may contain `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` as defined in §5.4.1. | Request FHIR resources matching exact profiles, profile-family URLs, resource types, or the no-selector default. `profiles[]` and `profilesFrom[]` are additive, not narrowing alternatives. | §5.4.1 |
| `questionnaire` | active | `content.questionnaire` is a canonical string, an inline Questionnaire resource, or an object with `canonical` and/or `resource`. | Request collection of answers for a FHIR Questionnaire and return a responsive Artifact, commonly an `application/fhir+json` QuestionnaireResponse. | §5.4.2 |

A selector-kind registration request SHALL include: exact `content.kind` string; lifecycle status; JSON shape with required and optional members; clinical meaning; content-satisfaction rules; interactions with `accept[]`, `fhirVersions[]`, FHIR canonicals, `|version`, `requestStatus[]`, Artifact `fulfills[]`, and §6.6 validation; unsupported, unavailable, partial, declined, and error behavior; unknown-member handling; security considerations; privacy considerations; and examples.

A selector-kind registration SHALL NOT redefine `type`, `version`, request `id`, `purpose`, `fhirVersions[]`, `items[]`, item `id`, `required`, `accept[]`, `fhir.resources`, `questionnaire`, or requester-identity/trust processing. Unrelated Wallets/Responders are not expected to process unregistered private selector kinds; when interoperable processing is expected, the selector kind SHOULD be registered or constrained by an explicit deployment profile.

### 13.5 Profile-id registry

SMART Health Check-in maintains a profile-id registry for conformance, deployment, provider, fixture, and future-binding labels. Profile ids are not SMART request fields, SMART response fields, clinical selectors, media types, status codes, kiosk payload shortcuts, or substitutes for `smartRequest`.

Until a permanent registry syntax is approved, SMART Health Check-in 1.0 uses the following provisional profile labels from §4:

| Profile label | Status | Meaning |
| --- | --- | --- |
| `smart-health-checkin-core-1` | provisional | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | provisional | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-kiosk-1` | provisional | Cross-device §9 kiosk wrapper support for the claimed role. |
| `smart-health-checkin-readerauth-1` | provisional | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | provisional | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | reserved | Placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

A profile-id registration request SHALL include: exact label or URI; lifecycle status; target roles; required and optional features; referenced SMART Health Check-in version; whether the profile is runtime, deployment-policy, provider, fixture, schema, CDDL, conformance-vector, or future/reserved material; additional validation, trust, security, privacy, retention, size, replay, or fixture requirements; and whether it depends on another profile.

A profile SHALL NOT redefine core SMART request or response semantics, selector semantics, Artifact media-type rules, fulfillment/status accounting, same-device carriers, kiosk `smartRequest` embedding, wrapper `requestId` versus `smartRequest.id` separation, pointer-only QR behavior, cryptographic context separation, or §7 trust-layer separation. A profile MAY impose stricter policy, narrower media-type support, production trust anchors, provider requirements, fixture comparison modes, or additional validation when those constraints are stated as profile requirements.

### 13.6 JWS `typ` registry entry

SMART Health Check-in 1.0 uses the following JWS protected-header `typ` value for signed kiosk request payloads:

| Header | Value | Status | Applies to | Reference |
| --- | --- | --- | --- | --- |
| `typ` | `smart-health-checkin+kiosk-request+jws` | active SMART Health Check-in value; external JOSE registry action, if any, is a publication-time request rather than an already-completed assignment | Compact JWS whose payload is a §9.4 `KioskRequestPayload` containing `v: 1`, wrapper `requestId`, and direct `smartRequest` embedding | §9.3 |

A Kiosk creator SHALL set the protected-header `typ` to `smart-health-checkin+kiosk-request+jws` for the version 1.0 kiosk request JWS. A Phone presenter SHALL require this `typ` when verifying a kiosk request JWS for this profile. The `typ` value identifies the signed kiosk request wrapper; it is not an Artifact media type, not the encrypted-envelope `contentType`, not a profile id, and not a SMART request `type` value.

Future JWS `typ` registrations SHALL specify the exact payload shape, protected-header requirements, signing algorithms, canonicalization or serialization rules, recipient validation behavior, interaction with `EncryptedKioskRequest.contentType`, security considerations, and privacy considerations. A future `typ` SHALL NOT be used to smuggle a different clinical request language into the kiosk flow; the active version 1.0 payload embeds `smartRequest` directly.

The kiosk response-submission plaintext also uses payload kind `smart-health-checkin-response` for the active successful completion payload. That value is a kiosk `SubmissionPlaintext.payload.kind`, not a JOSE `typ`. New payload kinds require a future profile or extension that preserves §6 validation, §7 trust interpretation, §8 validation evidence boundaries, and the untrusted-relay model.

### 13.7 Designated expert review process

Until an external standards body or registry operator is named, SMART Health Check-in registry changes are reviewed by designated experts appointed by the SMART Health IT project or successor standards-maintenance body. If a registry is later delegated to IANA, an ISO/IEC mdoc registry, a JOSE registry, or another external operator, the external operator's process controls that registry while this section remains guidance for SMART Health Check-in-specific review criteria.

Designated expert review applies to SMART Health Check-in status codes, selector kinds, media-type compatibility rules, extension Artifact media types, profile ids, kiosk payload kinds, provider profiles, fixture profiles, and SMART Health Check-in-specific JWS `typ` usage. Media types, mdoc identifiers, and JOSE header values that require external registration also need the applicable external registration procedure; this specification does not claim those registrations are complete merely by listing requested values.

The designated experts SHOULD approve a registration only when the request:

1. names an exact collision-resistant identifier and registry category;
2. identifies lifecycle status and change controller;
3. references a stable public specification or deployment profile;
4. preserves the version 1.0 transport-neutral SMART request and SMART response semantics;
5. preserves exact `requestId`, `fulfills[]`, `requestStatus[]`, selector, media-type, and status validation rules unless a future version explicitly changes them;
6. preserves same-device `org-iso-mdoc` carriers: `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`, unless the registration is explicitly for a future incompatible profile;
7. preserves kiosk direct `smartRequest` embedding, wrapper id separation, pointer parameter `r`, untrusted-relay boundaries, request-envelope info string `smart-health-checkin-kiosk-request-v1`, response-submission info string `smart-health-checkin-kiosk-response-v1`, and separate request-envelope, response-submission, and §8 HPKE cryptographic contexts;
8. defines unsupported-recipient behavior that allows older implementations to reject, ignore, or report unsupported without unsafe reinterpretation;
9. includes security and privacy considerations appropriate to clinical check-in data; and
10. includes enough examples and validation guidance for independent implementation.

Experts SHOULD reject or require revision of registrations that create ambiguous synonyms for existing codes or selector kinds, put requester identity or trust assertions into the SMART request body, turn profile ids into in-band request selectors, require untrusted relays to see plaintext clinical content, overclaim clinical-source provenance for unsigned raw FHIR JSON, conflict with existing media types, or use demo/fixture keys as production trust anchors.

Deprecation is permitted when an entry is unsafe, ambiguous, superseded, or not implemented, but deprecation SHALL NOT silently change the meaning of already-active identifiers. Deprecated entries remain listed with their prior semantics, replacement guidance if any, and receiver handling expectations.

## Organizer notes

### Strengths

- Mirrors the canonical identifiers from §§4-9 without inventing new request fields or alternate carriers.
- Separates IANA media-type considerations, mdoc/ISO ecosystem registrations, SMART Health Check-in internal registries, JOSE `typ` usage, and provisional conformance labels.
- Preserves exact active values for media types, selector kinds, status codes, mdoc identifiers, kiosk algorithms, HKDF info strings, pointer `r`, JWS `typ`, and payload kind.

### Caveats

- The text intentionally treats `application/smart-health-checkin-kiosk-request+jws+aesgcm`, mdoc entries, and JWS `typ` as registration requests or SMART-defined values, not as completed permanent external registrations.
- The profile-id syntax remains provisional because §4 deliberately left final registry syntax to this cutpoint and there is no existing external registry in the implementation.
- The media-type template includes publication-contact placeholders that a final editor must fill or remove according to the chosen publication path.

### Open questions

- Which organization is the formal change controller for permanent media-type, JOSE, and mdoc/ISO ecosystem registrations at publication time?
- Should the kiosk encrypted-request media type be submitted to IANA as COMMON or LIMITED USE?
- Should SMART Health Check-in use URI-form profile identifiers in a future registry, or retain short labels with an external registry table?

### Downstream dependencies

- T5.F should index registry obligations, extension templates, and unknown-code handling without adding new identifiers.
- T6 fixture work should classify fixture/profile labels consistently with the provisional profile-id registry here.
- T7 future-work text should avoid implying that OID4VP or production trust-anchor registries are complete in version 1.0.
