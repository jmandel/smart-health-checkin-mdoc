## 13. Registry and IANA considerations

This section records the identifiers used by SMART Health Check-in 1.0 and defines the change-control expectations for future extensions. It is intentionally a mirror of identifiers defined elsewhere in this specification. It does not create alternate request fields, alternate response fields, alternate same-device carriers, or kiosk shortcuts.

The registries in §§13.3-13.5 are SMART Health Check-in registries maintained with this specification or by its successor governance process. The media-type material in §13.1 is an IANA consideration. The mdoc material in §13.2 is for the mdoc / ISO / Digital Credentials ecosystem and is not an IANA media-type registration. Profile identifiers in §13.5 name conformance or deployment profiles; they are not in-band SMART request members and SHALL NOT be used as `requestProfile`, preset identifiers, IPS shortcuts, or substitutes for §5 selectors.

### 13.1 Media type registrations and references

SMART Health Check-in 1.0 uses media types in three places:

1. `SmartHealthCheckinRequestItem.accept[]` advertises Artifact media types the Requester can consume.
2. `SmartHealthCheckinResponse.artifacts[].mediaType` declares the clinical form of each returned Artifact.
3. The kiosk wrapper uses a content type for encrypted request envelopes and opaque blob storage for ciphertext.

#### 13.1.1 Referenced clinical Artifact media types

Version 1.0 defines two core clinical Artifact media types:

| Media type | Use in SMART Health Check-in | Registration posture |
| --- | --- | --- |
| `application/fhir+json` | Raw FHIR JSON Artifact. The Artifact SHALL include `fhirVersion` and `value` containing a FHIR Resource or Bundle as defined in §6.3.2. | Referenced FHIR JSON media type. This specification does not create a new registration for it. |
| `application/smart-health-card` | SMART Health Card Artifact. The Artifact `value` is the SMART Health Card file-style JSON object containing `verifiableCredential[]` as defined in §6.3.1. | Referenced SMART Health Cards media type. If an external registration template is needed, it belongs with the SMART Health Cards specification, not with this document's core registry. |

A Wallet/Responder SHALL NOT return an Artifact for an item unless the Artifact `mediaType` is listed in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. A Verifier SHALL enforce that rule under §6.6.

Extension Artifact media types are allowed only through the extension model in §§4.6, 5.6, and 6.3.3. A media-type extension definition SHALL specify the exact media type string, payload fields, use of `value`, `url`, and/or `data`, dereferencing and integrity rules, FHIR-version semantics if any, validation rules, status behavior, security considerations, privacy considerations, and compatibility with existing media types if any. An extension media type SHALL NOT redefine the meaning of SMART request or response core fields.

#### 13.1.2 Kiosk encrypted request content type

The active kiosk request-envelope content type is:

```text
application/smart-health-checkin-kiosk-request+jws+aesgcm
```

This value is used as `EncryptedKioskRequest.contentType` for the §9.5 encrypted request envelope. The plaintext encrypted by that envelope is the compact kiosk request JWS whose protected header has `typ` `smart-health-checkin+kiosk-request+jws`; the envelope algorithm label is `ECDH-P256+HKDF-SHA256+AES-GCM`; the envelope `enc` value is `A256GCM`; and the request-envelope HKDF `info` string is `smart-health-checkin-kiosk-request-v1`.

At publication time this document should either request an IANA media-type registration for this exact subtype or clearly mark it as a specification-controlled provisional subtype pending IANA review. A registration request, if submitted, should use this template:

| Field | Value |
| --- | --- |
| Type name | `application` |
| Subtype name | `smart-health-checkin-kiosk-request+jws+aesgcm` |
| Required parameters | none |
| Optional parameters | none |
| Encoding considerations | binary-safe transport; the concrete envelope is JSON and carries base64url-encoded ciphertext and key material |
| Security considerations | See §§9 and 11. The content is an encrypted compact JWS; confidentiality depends on P-256 ECDH, HKDF-SHA-256, AES-GCM, fresh IVs, request-id salt/AAD binding, creator JWS verification, and keeping request-opening private keys out of untrusted relays. |
| Interoperability considerations | Processors must validate `v`, `alg`, `enc`, `contentType`, `requestId`, timestamps, key identifiers, and the decrypted JWS before using the embedded `smartRequest`. |
| Published specification | SMART Health Check-in 1.0 §9.5 and this §13.1.2 |
| Applications that use this media type | SMART Health Check-in kiosk creators, phone presenters, completion displays, and submission-service integrations |
| Fragment identifier considerations | none |
| Additional information | The value identifies the encrypted kiosk request envelope, not the SMART clinical request body and not the phone-to-desktop response-submission ciphertext. |
| Person and email address to contact | specification maintainers / TBD before publication |
| Intended usage | COMMON for implementations of the optional kiosk profile; not used by the mandatory transport-neutral clinical model |
| Restrictions on usage | none beyond this specification |
| Author | SMART Health Check-in specification authors |
| Change controller | SMART Health Check-in specification governance / TBD before publication |

This draft does not assert that the IANA registration has already occurred. If designated expert review requires a different registered subtype syntax, the final specification must reconcile that decision with the active `contentType` value and with deployed implementations.

#### 13.1.3 Opaque submission blobs

The active kiosk provider stores encrypted phone-to-desktop submission ciphertext bytes as an opaque blob with content type:

```text
application/octet-stream
```

This is ordinary use of the generic binary media type. It is not a SMART Health Check-in-specific registration. The blob bytes are not self-describing clinical content; the Completion display interprets them only with the provider row metadata, IV, phone ephemeral public JWK, retained desktop private key, wrapper `requestId`, and §9.8 response-submission rules. A provider's storage content type SHALL NOT replace AES-GCM authentication, decrypted `SubmissionPlaintext.requestId` validation, `payload.kind` validation, §6 response validation, §6.6 cross-validation, §7 trust interpretation, or §8 validation accounting.

### 13.2 mdoc registry entries

The version 1.0 live presentation binding is the W3C Digital Credentials API direct mdoc flow using protocol id:

```text
org-iso-mdoc
```

SMART Health Check-in uses one mdoc document type, one namespace, one stable response element, and one `requestInfo` carrier key:

| Identifier kind | Value | Defined use |
| --- | --- | --- |
| DC API protocol id | `org-iso-mdoc` | Direct same-device mdoc presentation protocol used by §8. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | Document type requested by Verifiers and returned by Wallets/Responders for SMART Health Check-in 1.0. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the SMART response element. |
| mdoc element identifier | `smart_health_checkin_response` | Requested and disclosed issuer-signed item whose `elementValue` is the JSON string serialization of `SmartHealthCheckinResponse`. |
| `ItemsRequest.requestInfo` key | `org.smarthealthit.checkin.request` | Carrier for the JSON string serialization of `SmartHealthCheckinRequest`. |

A Verifier SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`. A Verifier SHALL carry the SMART request only as a JSON string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item in namespace `org.smarthealthit.checkin` with `elementIdentifier` `smart_health_checkin_response`.

These values are mdoc / ISO / Digital Credentials ecosystem identifiers. This document should request registration or allocation through the applicable mdoc ecosystem process when such a process is available or required. Until such registration is complete, implementations SHALL treat the values above as the SMART Health Check-in 1.0 identifiers and SHALL NOT substitute dynamic element names, archived claim-name experiments, kiosk wrapper fields, OID4VP placeholders, or locally chosen namespaces for the active §8 carrier.

Future incompatible changes to the mdoc shape SHOULD use a new profile identifier and, where necessary, a new `docType` suffix rather than changing the semantics of `org.smarthealthit.checkin.1` in place.

### 13.3 Status code registry

SMART Health Check-in defines a specification-controlled registry for `SmartHealthCheckinResponse.requestStatus[].status` values. Version 1.0 registers the following status codes:

| Code | Semantics | Artifact expectation |
| --- | --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. | Usually at least one Artifact fulfills the item. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. | Usually at least one Artifact fulfills the item. |
| `unavailable` | The item was understood and supported, but no matching content was available or shareable under Wallet policy, and Holder refusal was not the relevant cause. | Usually no fulfilling Artifact. |
| `declined` | The Holder declined to share or complete the item, or Wallet policy implemented the Holder's refusal for that item. | Usually no fulfilling Artifact. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. | Usually no fulfilling Artifact. |
| `error` | An operational or processing error occurred while attempting to satisfy an item that was understood and was not simply declined, unavailable, or unsupported. | Usually no fulfilling Artifact unless partial output and local policy justify one. |

A Wallet/Responder SHALL use only the registered version 1.0 status codes above unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless it explicitly supports the corresponding future registry entry.

A future status-code registration SHALL define the code string, semantics, allowed relationship to returned Artifacts, interaction with `required`, selector kinds, media types, Holder choice, error handling, `message`, §6.6 validation, security considerations, privacy considerations, and backward-compatible behavior for Verifiers that do not support the code. New status codes SHALL NOT redefine the semantics of the six core codes.

### 13.4 Content-selector kind registry

SMART Health Check-in defines a specification-controlled registry for `SmartHealthCheckinRequestItem.content.kind` values. Version 1.0 registers the following selector kinds:

| Kind | Selector shape | Summary |
| --- | --- | --- |
| `fhir.resources` | `{ "kind": "fhir.resources", "profiles"?: string[], "profilesFrom"?: string[], "resourceTypes"?: string[] }` | Requests patient-specific FHIR resources by exact profile canonicals, profile-family canonicals, FHIR resource types, or the no-selector default defined in §5.4.1. |
| `questionnaire` | `{ "kind": "questionnaire", "questionnaire": <canonical string or inline/object form> }` | Requests completion of a FHIR Questionnaire and return of an appropriate response Artifact, commonly `application/fhir+json` containing a QuestionnaireResponse. |

A Requester SHALL use a selector kind defined by this registry or by a registered extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support a selector kind SHALL NOT infer semantics from item display text, profile labels, local topic names, wrapper field names, provider metadata, or requester identity metadata. It SHALL reject the request as unsupported or report the affected item as `unsupported` according to the selected flow and §6 rules.

A future selector-kind registration SHALL define the exact `content.kind` string, JSON shape, required and optional members, clinical meaning, content-satisfaction rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals and `|version`, item status, Artifact fulfillment, unknown-member handling, unsupported/unavailable/partial/error behavior, examples, security considerations, and privacy considerations. Selector kinds SHOULD use collision-resistant names, such as reverse-DNS or URI-like names, unless this registry later defines a stricter naming convention. A selector-kind registration SHALL NOT permit requester identity metadata in the SMART request body or redefine the semantics of `fhir.resources`, `questionnaire`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, or core request fields.

### 13.5 Profile-id registry

SMART Health Check-in defines a specification-controlled registry for profile identifiers. A profile identifier names a coherent set of conformance rules for one or more targets and feature sets. Profile identifiers are documentation, conformance, deployment, or test-report identifiers. They are not SMART request fields, SMART response fields, clinical selectors, Artifact media types, status codes, kiosk payload kinds, or shortcuts for `smartRequest`.

The following profile labels are provisional labels from §4 and are registered here as SMART Health Check-in 1.0 profile identifiers unless final publication replaces them with URI-form identifiers:

| Profile identifier | Summary | Status |
| --- | --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. | Version 1.0 core profile label. |
| `smart-health-checkin-mdoc-dcapi-1` | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. | Version 1.0 live presentation profile label. |
| `smart-health-checkin-kiosk-1` | Optional cross-device §9 kiosk wrapper support for the claimed role. | Version 1.0 optional kiosk profile label. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. | Optional deployment/profile label. |
| `smart-health-checkin-fixtures-1` | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. | Optional testing/profile label. |
| `smart-health-checkin-oid4vp-reserved` | Reserved placeholder for future OID4VP work. | Informative / reserved; not a SMART Health Check-in 1.0 runtime conformance profile. |

A conformance claim SHOULD identify the profile identifier, specification version, target role, optional features, and any deployment-profile or fixture-profile dependencies. A deployment profile MAY define stricter validation, narrower accepted media types, production trust anchors, provenance requirements, size limits, duplicate-handling rules, deterministic vector encodings, provider profiles, or registry-controlled identifiers. Such a profile SHALL state the affected conformance targets and SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media-type rules, fulfillment/status accounting, same-device carriers, kiosk `smartRequest` embedding, wrapper/SMART id separation, pointer-only QR behavior, cryptographic context separation, or the untrusted-relay model.

A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, an “all of the above” shortcut, a topic label, or negotiation metadata to bypass §5 selectors, §5 `accept[]`, §6 response validation, §7 trust processing, §8 validation, or §9 kiosk validation.

Future profile registrations SHALL define the identifier, versioning policy, target roles, required and optional features, dependencies on other profiles, allowed extension identifiers, validation obligations, trust-policy assumptions, security considerations, privacy considerations, and whether the profile is for runtime interoperability, deployment policy, certification, fixtures, diagnostics, historical captures, or illustrative examples.

### 13.6 JWS `typ` registry entry

The active kiosk request JWS protected header uses:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

This document registers the following SMART Health Check-in JWS type value in the specification-controlled JWS-type registry:

| Field | Value |
| --- | --- |
| JWS `typ` value | `smart-health-checkin+kiosk-request+jws` |
| Applies to | Compact JWS for `KioskRequestPayload` in §9.4 |
| Signing algorithm in active profile | `ES256` |
| Payload | `KioskRequestPayload` JSON object with `v: 1` and direct `smartRequest` embedding |
| Relationship to media types | This is a JOSE `typ` discriminator for the signed kiosk request wrapper. It is not an Artifact media type and not the encrypted envelope `contentType`. |
| Security considerations | The `typ` value helps distinguish the kiosk request wrapper from other compact JWS uses; processors still must verify signature, `kid`, trusted creator policy, `iss`, `aud`, timestamps, provider binding, algorithm labels, constraints, and the embedded SMART request. |

This specification does not claim that `typ` values are permanently registered with IANA. If a future JOSE or media-type registry registration is required, the final request should preserve the active value above or define an explicit migration profile. A processor that verifies kiosk request JWSs SHALL require the protected-header `typ` value to equal `smart-health-checkin+kiosk-request+jws` for this profile and SHALL NOT accept a different `typ` as equivalent unless a future registered profile explicitly defines that behavior.

### 13.7 Designated expert review process

SMART Health Check-in registry changes require designated expert review unless a future governance process replaces this section. The expert's role is to protect interoperability, privacy, security, and the architectural invariants of the specification, not to judge the clinical merits of a particular deployment community.

The review process applies to:

- new or changed SMART Health Check-in status codes;
- new content-selector `kind` values;
- new profile identifiers;
- new JWS `typ` values used by SMART Health Check-in wrappers;
- SMART Health Check-in-specific media-type registration requests or compatibility rules;
- SMART Health Check-in mdoc identifier updates or requests for external mdoc ecosystem registration; and
- future kiosk payload kinds beyond the active `smart-health-checkin-response` successful payload kind.

A registration request SHOULD include the requested identifier, registry category, specification text, processing rules, validation rules, unsupported-recipient behavior, examples, security considerations, privacy considerations, conformance target impact, versioning impact, and contact/change-controller information. For media-type registrations, the request SHOULD include the applicable IANA template. For mdoc identifiers, the request SHOULD identify the applicable ISO / mdoc / Digital Credentials ecosystem process and should not present an unapproved allocation as completed.

The designated expert SHOULD approve a request only when all of the following are true:

1. The identifier is syntactically clear, collision-resistant for its registry, and not misleadingly similar to a core identifier.
2. The definition preserves the transport-neutral §5/§6 clinical model and does not introduce a second clinical request or response language.
3. The definition does not put requester identity, organization metadata, trust assertions, callback endpoints, kiosk metadata, or production trust-anchor claims into the SMART request body.
4. The definition preserves the §7 trust-layer separation among origin evidence, optional reader authentication, mdoc issuer/device evidence, kiosk wrapper validation, provider metadata, Holder action, and clinical-source provenance.
5. The definition preserves the §8 active same-device identifiers when it claims `smart-health-checkin-mdoc-dcapi-1`: `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`.
6. Any kiosk extension preserves direct `smartRequest` embedding, wrapper `requestId` versus `smartRequest.id` separation, pointer-only active QR behavior using `r` for the active profile unless a new pointer profile is explicitly registered, the untrusted-relay model, and the separation among §8 HPKE, §9 request-envelope encryption, and §9 response-submission encryption.
7. The definition states how unsupported recipients reject, ignore, quarantine, or report the extension without changing the meaning of known required fields.
8. The definition includes security and privacy considerations proportionate to the data and metadata exposed, including logs, telemetry, URLs, provider rows, ciphertext blobs, key identifiers, and clinical content.
9. The definition does not use demo keys, self-signed fixture material, provider ids, checked-in private keys, or example issuer/audience strings as production trust anchors unless an explicit deployment profile states the resulting assurance level.
10. The definition includes enough examples and validation guidance for independent implementation and conformance testing.

The expert SHOULD reject or request revision for registrations that redefine core status codes, turn profile identifiers into in-band selectors, introduce IPS/preset/all-of-the-above shortcuts, require untrusted relays to see plaintext clinical content merely to route state, weaken required validation, or blur the distinction between internal SMART Health Check-in registries, IANA media-type registrations, and mdoc ecosystem allocations.

## Organizer notes

### Strengths

- Mirrors the active identifiers from T2, T3, T4, and T5.A without introducing new clinical request fields.
- Separates IANA media-type considerations, mdoc ecosystem identifiers, SMART Health Check-in internal registries, provisional profile labels, and future deployment profiles.
- Preserves the kiosk constants: encrypted request content type, JWS `typ`, algorithm label, `A256GCM`, request/response HKDF info strings, pointer `r`, and active `smart-health-checkin-response` payload kind.
- Provides review criteria that reinforce direct `smartRequest` embedding, no request-profile/preset shortcuts, untrusted relay behavior, and trust-layer separation.

### Caveats

- The exact IANA posture for `application/smart-health-checkin-kiosk-request+jws+aesgcm` needs publication-time review; this draft treats it as a requested or provisional registration, not as an already-approved registration.
- The mdoc `docType`, namespace, element, and requestInfo key may need coordination with an external ISO/mdoc ecosystem process if one is available for this class of identifier.
- The §4 profile labels are kept as provisional-but-registered-in-this-draft labels; final publication may prefer URI-form identifiers or a separately hosted registry.

### Open questions

- Who is the formal change controller and contact for IANA templates and SMART Health Check-in internal registries?
- Should the final profile-id registry use short labels exactly as in §4, HTTPS URLs, URNs, or both?
- Should kiosk response-submission payload kinds get an explicit registry table now, or remain covered by the designated expert process until a second kind exists?
- Does the final media-type template need a subtype adjustment to satisfy IANA designated expert guidance while preserving deployed `contentType` strings?

### Downstream dependencies

- T5.F should add checklist rows for using only registered status codes, selector kinds, profile identifiers, kiosk content types, mdoc identifiers, and JWS `typ` values.
- T5.B and T5.C should align security and privacy text with the registry criteria for media types, provider blobs, profile extensions, logs, telemetry, and deployment trust claims.
- T6 examples and fixture indexes should label which profile identifiers they exercise and should not introduce unregistered selector kinds, status codes, payload kinds, or media types as if they were core.
- T7 future-work text should keep OID4VP and external trust-anchor registries clearly separate from the active SMART Health Check-in 1.0 registry entries above.
