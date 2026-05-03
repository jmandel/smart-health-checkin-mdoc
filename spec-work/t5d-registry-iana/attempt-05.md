## 13. Registry and IANA considerations

This section records the registry-facing identifiers used by SMART Health Check-in 1.0. It mirrors identifiers defined normatively in §§5-9 and profile labels introduced in §4. It does not create alternate clinical request fields, response fields, presentation carriers, kiosk shortcuts, or production trust anchors.

The registries below fall into four categories:

1. **IANA media-type considerations** for media types used or requested by this specification.
2. **mdoc / ISO ecosystem registrations** for the `org-iso-mdoc` document type, namespace, and element names.
3. **SMART Health Check-in registries** maintained by this specification or a successor change-control process for selector kinds, status codes, profile identifiers, and extension semantics.
4. **Deployment or future-profile identifiers** that can be profiled without changing the version 1.0 wire model.

Unless a registry entry explicitly says otherwise, all string comparisons in this section are exact, case-sensitive comparisons over the Unicode strings shown here.

### 13.1 Media type registrations / references

SMART Health Check-in 1.0 uses media types in three different ways:

- request item `accept[]` values and response Artifact `mediaType` values in the clinical model;
- kiosk wrapper metadata fields such as `EncryptedKioskRequest.contentType`; and
- opaque provider blob storage metadata.

The core clinical Artifact media types are:

| Media type | Use in this specification | Registry status / action |
| --- | --- | --- |
| `application/fhir+json` | Request item `accept[]`; response Artifact `mediaType` for raw FHIR JSON Resources or Bundles. A conforming Artifact using this media type also carries an outer `fhirVersion` under §6.3.2. | Existing FHIR JSON media type. This specification references it and does not request a new IANA registration for it. |
| `application/smart-health-card` | Request item `accept[]`; response Artifact `mediaType` for SMART Health Card file-style JSON with `value.verifiableCredential[]`. A conforming Artifact using this media type does not carry an outer Artifact-level `fhirVersion`. | Existing SMART Health Cards media type as used by SMART Health Cards. This specification references it and does not request a new IANA registration for it. |
| `application/smart-health-checkin-kiosk-request+jws+aesgcm` | `EncryptedKioskRequest.contentType` for the encrypted kiosk request envelope whose plaintext is a compact kiosk request JWS encrypted with the §9 request-envelope suite. | SMART Health Check-in-specific media type. If this specification is submitted for publication through a stream that can request IANA registration, this value is the requested registration name; otherwise it is a provisional specification-defined value pending IANA or deployment-profile registration. |
| `application/octet-stream` | Opaque ciphertext blob storage for the active kiosk response-submission provider shape. | Existing generic binary media type. It identifies provider blob bytes, not a SMART response Artifact media type and not clinical content semantics. |

The provisional registration template for `application/smart-health-checkin-kiosk-request+jws+aesgcm` is:

| Field | Value |
| --- | --- |
| Type name | `application` |
| Subtype name | `smart-health-checkin-kiosk-request+jws+aesgcm` |
| Required parameters | None. |
| Optional parameters | None defined by this specification. |
| Encoding considerations | Binary-safe transport is required for envelope JSON and base64url fields. The object itself is JSON; the encrypted payload and cryptographic fields are base64url strings as defined in §9. |
| Security considerations | The envelope contains routing metadata and ciphertext for a compact kiosk request JWS. Confidentiality and integrity depend on the §9 request-envelope suite, request-id binding, creator JWS verification, key management, and deployment trust policy. The media type alone does not authenticate the creator or authorize clinical disclosure. |
| Interoperability considerations | Version 1.0 envelopes set `v: 1`, `alg: "ECDH-P256+HKDF-SHA256+AES-GCM"`, `enc: "A256GCM"`, and this exact `contentType`. Future incompatible envelope formats need a new version, profile, or media type. |
| Published specification | SMART Health Check-in 1.0, §9 and §13.1. |
| Applications that use this media type | SMART Health Check-in kiosk creators, phone presenters, and submission services/providers. |
| Fragment identifier considerations | None. Pointer URLs use fragment parameter `r` on ordinary web URLs; that fragment is not a fragment identifier for this media type. |
| Additional information | Magic number: none. File extensions: none registered. Macintosh file type code: none. |
| Person and email address to contact for further information | To be supplied by the publishing work group or designated registry contact. |
| Intended usage | COMMON for deployments of the optional kiosk wrapper. |
| Restrictions on usage | None beyond the specification. |
| Author / change controller | To be supplied by the publishing work group or standards venue. |

A registered extension Artifact media type SHALL define its exact media type string; payload field usage (`value`, `url`, `data`, or combinations); encoding; dereferencing rules; integrity and freshness expectations; FHIR-version handling if raw FHIR content is involved; compatibility, if any, with core `accept[]` values; and security and privacy considerations. An extension media type SHALL NOT redefine the semantics of `SmartHealthCheckinRequest.type`, `SmartHealthCheckinRequest.version`, `SmartHealthCheckinResponse.type`, `SmartHealthCheckinResponse.version`, `requestId`, `artifacts[]`, Artifact `id`, Artifact `mediaType`, Artifact `fulfills[]`, or `requestStatus[]`.

### 13.2 mdoc registry entries

The direct same-device presentation binding uses the W3C Digital Credentials API protocol id `org-iso-mdoc` and an mdoc document structure aligned with ISO/IEC 18013-5 ecosystem conventions. This specification does not assert that the following names are already permanently registered in an external ISO, IANA, W3C, or platform registry. It records the values that SMART Health Check-in 1.0 requests, uses, and expects deployment profiles to reserve consistently.

| Identifier kind | Value | Version 1.0 use |
| --- | --- | --- |
| Digital Credentials API protocol id | `org-iso-mdoc` | Direct same-device request to the platform credential API. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | SMART Health Check-in 1.0 document type requested and returned in the §8 flow. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the SMART Health Check-in response element. |
| mdoc element identifier | `smart_health_checkin_response` | Requested and disclosed element whose `elementValue` is the SMART response JSON object as defined by §6 and carried by §8. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | Key in `ItemsRequest.requestInfo` whose value is the SMART request serialized as JSON text. |

A Verifier claiming `smart-health-checkin-mdoc-dcapi-1` support SHALL use the values above exactly. It SHALL NOT model FHIR profiles, request items, media types, status codes, Questionnaires, individual clinical resources, or kiosk metadata as additional core mdoc elements. The stable element `smart_health_checkin_response` carries the transport-neutral SMART response; clinical semantics remain inside §§5-6.

An mdoc or ISO ecosystem registration request for `org.smarthealthit.checkin.1` should include at least:

- the document type `org.smarthealthit.checkin.1`;
- the namespace `org.smarthealthit.checkin`;
- the element `smart_health_checkin_response`;
- the request carrier `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`;
- the statement that the element value is a SMART Health Check-in response with `type: "smart-health-checkin-response"` and `version: "1"`;
- the statement that the request carrier value is a JSON text serialization of a SMART Health Check-in request with `type: "smart-health-checkin-request"` and `version: "1"`; and
- references to §8 validation, §7 trust-layer separation, and §6.6 cross-validation.

Deployment profiles MAY define stricter issuer trust anchors, reader-authentication requirements, certificate policies, production assurance levels, or platform allow-list rules for these identifiers. Such profiles SHALL NOT change the values above for SMART Health Check-in 1.0, and SHALL NOT treat demo keys, fixture keys, or self-signed development material as production registrations unless the deployment profile explicitly says so and states the resulting assurance level.

### 13.3 Status code registry

The SMART Health Check-in status code registry governs values of `SmartHealthCheckinResponse.requestStatus[].status`. Version 1.0 defines these initial entries:

| Status code | Meaning | Extension notes |
| --- | --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. | Core code. Not extensible by changing its meaning. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. | Core code. Not extensible by changing its meaning. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without Holder refusal being the relevant cause. | Core code. Not extensible by changing its meaning. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. | Core code. Not extensible by changing its meaning. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. | Core code. Not extensible by changing its meaning. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. | Core code. Not extensible by changing its meaning. |

A Wallet/Responder conforming to SMART Health Check-in 1.0 SHALL use only these status codes unless it is operating under a future registered status-code extension that the receiving Verifier explicitly supports. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless the Verifier explicitly supports the relevant future registry entry.

A request for a new status code SHALL include:

- the proposed status string;
- the precise condition it reports;
- how it differs from all six core codes;
- whether it can appear with returned Artifacts and how it interacts with `fulfills[]`;
- Verifier behavior when the code is unsupported;
- security and privacy considerations, especially whether the code can reveal sensitive Holder, Wallet, clinical, or infrastructure information; and
- test cases showing valid and invalid use.

New status codes SHALL NOT redefine item coverage, many-to-many fulfillment, media-type validation, `requestStatus[]` exactly-once coverage, or the Holder-control semantics of the core response model.

### 13.4 Content-selector kind registry

The SMART Health Check-in content-selector kind registry governs values of `SmartHealthCheckinRequest.items[].content.kind`. Version 1.0 defines these initial entries:

| Selector kind | Request shape summary | Version 1.0 processing |
| --- | --- | --- |
| `fhir.resources` | Requests patient-specific FHIR resources. Optional `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are arrays of strings. `profiles[]` and `profilesFrom[]` are additive; `resourceTypes[]` is an additional resource-type constraint when present. | Defined in §5.4.1. |
| `questionnaire` | Requests completion of a FHIR Questionnaire. The `questionnaire` member can be a canonical string, an inline FHIR `Questionnaire`, or a combined object containing canonical and resource forms. | Defined in §5.4.2. |

A Requester SHALL NOT use a selector kind to carry requester identity, transport metadata, trust anchors, kiosk pointer data, callback endpoints, or profile labels. A Wallet/Responder SHALL treat an unknown `content.kind` value as an extension selector kind and process it under §5.4.3 and §6 status rules; it is not an ignorable unknown member.

A request for a new selector kind SHALL include:

- the selector kind string;
- the JSON shape of `content` for that kind;
- required and optional members;
- Holder display guidance;
- matching semantics and any interaction with FHIR canonicals, `|version`, `fhirVersions[]`, `accept[]`, response Artifact media types, and status reporting;
- unsupported behavior, including when `unsupported` vs. `unavailable` is appropriate;
- security and privacy considerations; and
- examples and validation tests.

New selector kinds SHALL NOT redefine the semantics of `fhir.resources`, `questionnaire`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, `required`, request item ids, or the prohibition on requester identity metadata in the SMART request body.

### 13.5 Profile-id registry

A profile identifier names a coherent set of conformance rules for a target and feature set. Profile identifiers are documentation, testing, deployment, or certification labels. They are not SMART request fields, SMART response fields, selector kinds, Artifact media types, status codes, kiosk payload shortcuts, request presets, or substitutes for `KioskRequestPayload.smartRequest`.

Version 1.0 uses the following provisional conformance labels from §4.4 pending final publication registry mechanics:

| Profile label | Meaning |
| --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-kiosk-1` | Cross-device §9 kiosk wrapper support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |

A conformance claim SHOULD identify the relevant profile label, specification version, target role, optional features, and deployment profile where applicable. A deployment or certification program MAY define additional profile identifiers for stricter trust anchors, platform allow-lists, provider profiles, schemas, fixture classes, retention policies, or clinical-source provenance requirements.

A new profile identifier SHALL state:

- the conformance target or targets it constrains;
- the SMART Health Check-in specification version and prerequisite profile labels;
- required optional features, if any;
- additional validation, security, privacy, retention, trust, fixture, or deployment requirements;
- whether the profile is suitable for production, testing, diagnostics, fixtures, or historical captures; and
- how unsupported implementations should represent or reject the claim.

A profile identifier SHALL NOT be used as an in-band `requestProfile` field, preset id, IPS shortcut, “all of the above” shortcut, profile-family shortcut, or replacement for a full §5 SMART request. Kiosk creators SHALL continue to embed the complete SMART request directly as `smartRequest`.

### 13.6 JWS `typ` registry entry

The kiosk request wrapper uses a compact JWS protected header with:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

This specification defines the JWS `typ` value `smart-health-checkin+kiosk-request+jws` for the signed kiosk request payload in §9.3 and §9.4. A Phone presenter claiming kiosk support SHALL require this exact `typ` value when verifying the compact kiosk request JWS.

The provisional registry entry is:

| Field | Value |
| --- | --- |
| Type value | `smart-health-checkin+kiosk-request+jws` |
| Used with | JWS protected header `typ` for compact kiosk request JWS. |
| Payload | `KioskRequestPayload` JSON object with `v: 1` and direct `smartRequest` member. |
| Algorithms in version 1.0 | `alg: "ES256"` for the compact JWS. The enclosing encrypted-request envelope uses `ECDH-P256+HKDF-SHA256+AES-GCM` with `enc: "A256GCM"`; those are not JWS `typ` values. |
| Security considerations | Verifiers must check `typ`, `alg`, `kid`, signature validity, creator trust, audience, expiration, provider binding, request-id binding, and embedded SMART request validity. Matching `typ` alone does not establish creator trust or Holder consent. |
| Change controller | SMART Health Check-in specification change-control process or the eventual standards venue. |

Future JWS types for different kiosk payloads, algorithms, or deployment profiles SHALL use distinct `typ` values or a future versioning rule. They SHALL NOT reuse `smart-health-checkin+kiosk-request+jws` with incompatible payload semantics.

### 13.7 Designated expert review process

The SMART Health Check-in registries for status codes, selector kinds, profile identifiers, extension Artifact media types, kiosk payload kinds, provider profiles, and future algorithm/profile labels use Specification Required or Designated Expert Review unless a publication venue assigns a stricter process.

Designated experts should approve registrations that are complete, interoperable, and compatible with the base architecture. Expert review should check that a proposed registration:

1. has a stable name and change controller;
2. identifies the affected conformance targets and protocol sections;
3. defines exact syntax and processing rules;
4. defines unsupported behavior and validation failure behavior;
5. preserves the transport-neutral §5/§6 clinical model;
6. preserves §7 trust-layer separation;
7. does not add requester identity metadata to the SMART request body;
8. does not redefine `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, or `org.smarthealthit.checkin.request` for version 1.0;
9. does not replace direct kiosk `smartRequest` embedding with presets, `requestProfile`, IPS shortcuts, or “all of the above” shortcuts;
10. includes security and privacy considerations proportionate to the data, identifiers, metadata, and trust claims involved; and
11. includes enough examples or tests for independent implementations to validate support.

Designated experts should reject or request revision for registrations that conflict with core semantics, rely on unregistered hidden behavior, expose unnecessary clinical or metadata information, conflate transport trust with clinical-source provenance, require untrusted providers to see plaintext clinical content, or cannot be implemented without private bilateral knowledge.

The following active kiosk values are fixed by §9 for version 1.0 and are not registry extension points unless a future profile explicitly defines a compatible extension mechanism:

| Identifier | Value |
| --- | --- |
| Kiosk request-envelope algorithm label | `ECDH-P256+HKDF-SHA256+AES-GCM` |
| Kiosk encrypted-request `enc` | `A256GCM` |
| Kiosk request-envelope HKDF info | `smart-health-checkin-kiosk-request-v1` |
| Kiosk response-submission HKDF info | `smart-health-checkin-kiosk-response-v1` |
| Pointer URL fragment parameter | `r` |
| Active successful submission payload kind | `smart-health-checkin-response` |

A future or deployment profile MAY define additional completion payload kinds, provider profiles, validation-evidence payloads, or algorithm suites only if the profile states how unsupported implementations fail safely and how the extension preserves §6 validation, §7 trust interpretation, §8 validation, kiosk wrapper request-id binding, and the untrusted-relay model.

## Organizer notes

### Strengths

- Mirrors the identifiers already fixed by T2, T3, T4, and T5.A rather than inventing new wire names.
- Separates IANA media-type considerations, mdoc/ISO ecosystem registrations, SMART Health Check-in internal registries, provisional conformance labels, and deployment/future profiles.
- Keeps profile identifiers out of the SMART request and rejects `requestProfile`, presets, IPS shortcuts, and “all of the above” shortcuts.
- Includes concrete review criteria for future selector kinds, status codes, Artifact media types, profile labels, JWS types, kiosk payload kinds, provider profiles, and algorithm/profile labels.

### Caveats

- The media-type registration template uses placeholder contact and change-controller fields because no publication venue or registry authority is established in the current repo.
- The `application/smart-health-card` row treats the value as an existing SMART Health Cards media type by reference; final publication should verify exact external registration status and citation text.
- The mdoc names are stated as requested/specification-defined ecosystem values, not as already-permanent ISO or platform registry entries.
- The JWS `typ` registry is framed as a SMART Health Check-in registry entry because there is no confirmed external JOSE registry action in the current materials.

### Open questions

- Which organization, work group, or standards venue will be listed as change controller for the kiosk media type, JWS `typ`, and SMART Health Check-in registries?
- Will `application/smart-health-checkin-kiosk-request+jws+aesgcm` be pursued as an IANA media type registration for 1.0, or remain a provisional/deployment media type until a later publication?
- Should profile labels remain bare strings or become URLs/URNs in a later profile registry? This draft preserves the §4 provisional labels and does not make them in-band request fields.
- Should a future registry separately track kiosk completion payload kinds beyond the active `smart-health-checkin-response` kind?

### Downstream dependencies

- T5.F should add checklist rows for registry-controlled extension behavior without creating new protocol obligations.
- T5.B and T5.C should align security/privacy text with the designated-expert criteria, especially metadata leakage, provider opacity, extension review, and demo-vs-production trust labels.
- T6.C should label fixtures and conformance vectors according to the provisional profile-id and fixture-profile language.
- T7.A and T7.B should keep OID4VP and broader registry authority questions as future work unless a publication venue resolves them before final draft assembly.
