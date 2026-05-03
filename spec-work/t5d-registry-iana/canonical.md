### 13.1 Media type registrations / references

The transport-neutral SMART request discriminator is `type: "smart-health-checkin-request"` with `version: "1"`. The transport-neutral SMART response discriminator is `type: "smart-health-checkin-response"` with `version: "1"`. These are protocol constants, not media types, not mdoc identifiers, not JWS `typ` values, and not profile identifiers.

SMART Health Check-in 1.0 uses media types and content-type values in three different roles:

1. clinical Artifact media types in `SmartHealthCheckinRequest.items[].accept[]` and `SmartHealthCheckinResponse.artifacts[].mediaType`;
2. kiosk encrypted-request envelope metadata in `EncryptedKioskRequest.contentType`; and
3. opaque encrypted blob storage or transfer metadata for kiosk submissions.

Implementations compare the string values in this section by exact, case-sensitive string equality unless a future registered extension explicitly defines other processing.

| Media type or content type | SMART Health Check-in 1.0 use | Registry posture |
| --- | --- | --- |
| `application/fhir+json` | Core clinical Artifact media type for raw FHIR JSON Resources or Bundles. A conforming SMART Health Check-in Artifact using this media type carries `value` as FHIR JSON and carries an outer `fhirVersion`. | Externally defined by the FHIR ecosystem and referenced by this specification. SMART Health Check-in does not redefine it or request a new registration for it. |
| `application/smart-health-card` | Core clinical Artifact media type for SMART Health Card file-style JSON with `value.verifiableCredential[]`. A conforming SMART Health Check-in Artifact using this media type does not carry an outer Artifact-level `fhirVersion`. | Externally defined or governed by SMART Health Cards and referenced by this specification. SMART Health Check-in does not redefine it or claim ownership of it. |
| `application/smart-health-checkin-kiosk-request+jws+aesgcm` | Exact `EncryptedKioskRequest.contentType` for the version-1 encrypted kiosk request envelope whose plaintext is a compact kiosk request JWS. | SMART Health Check-in-defined content-type value and candidate IANA media-type registration request. Until registration is completed, implementations and deployments must not describe it as an already-permanent IANA assignment. |
| `application/octet-stream` | Opaque encrypted kiosk response-submission blob bytes stored or transferred by a Submission service/provider. | Existing generic media type, referenced for encrypted bytes only. It is not a SMART response Artifact media type and does not define clinical content semantics. |

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics and the receiving Verifier supports that rule. A Verifier SHALL apply the corresponding §6.6 validation.

A future Artifact media-type registration for SMART Health Check-in use SHALL define the exact media type string; payload shape; use of `value`, `url`, `data`, or combinations of those fields; encoding; dereferencing and integrity rules; FHIR-version semantics if any; validation behavior; status-code interaction; security considerations; privacy considerations; and any compatibility with existing media types. A media-type extension SHALL NOT redefine the semantics of SMART request or response core fields.

If `application/smart-health-checkin-kiosk-request+jws+aesgcm` is submitted for IANA registration, the request should preserve the active value above and include at least this information:

| Registration field | Requested value or note |
| --- | --- |
| Type name | `application` |
| Subtype name | `smart-health-checkin-kiosk-request+jws+aesgcm` |
| Required parameters | None. |
| Optional parameters | None defined by SMART Health Check-in 1.0. |
| Encoding considerations | Binary-safe transport is required for the JSON envelope and base64url fields. In the active JSON envelope, cryptographic fields such as `iv`, `ciphertext`, and public-key coordinates are base64url without padding. |
| Security considerations | The value identifies an encrypted kiosk request envelope, not a trust assertion. Recipients still validate `v`, `alg`, `enc`, `contentType`, request-id binding, timestamps, key identifiers, AES-GCM authentication, decrypted compact JWS syntax, JWS `typ`, creator signature, deployment trust policy, and the embedded `smartRequest`. |
| Interoperability considerations | Version 1.0 uses `alg` `ECDH-P256+HKDF-SHA256+AES-GCM`, `enc` `A256GCM`, request-envelope HKDF info `smart-health-checkin-kiosk-request-v1`, plaintext compact JWS `typ` `smart-health-checkin+kiosk-request+jws`, and direct `smartRequest` embedding. Future incompatible envelope formats need a new version, profile, or content-type value. |
| Published specification | SMART Health Check-in 1.0, §§9 and 13. |
| Applications that use this media type | SMART Health Check-in kiosk creators, Phone presenters, Completion displays, and Submission service/provider integrations. |
| Fragment identifier considerations | None. The active kiosk Pointer URL uses fragment parameter `r` on an ordinary web URL; that pointer URL is not a representation of this media type. |
| Additional information | Magic number: none. File extensions: none registered. Deprecated aliases: none. |
| Person and email address to contact | To be supplied by the publication venue or standards-maintenance body. |
| Intended usage | COMMON or LIMITED USE, as determined by the publication venue. |
| Restrictions on usage | None beyond the published specification and deployment policy. |
| Author / change controller | SMART Health Check-in specification project or successor standards-maintenance body. |

### 13.2 mdoc registry entries

The version-1 same-device presentation binding uses the W3C Digital Credentials API direct mdoc protocol id:

```text
org-iso-mdoc
```

SMART Health Check-in references `org-iso-mdoc` as the active Digital Credentials API protocol id for this flow. This specification does not create that protocol id and does not claim an IANA media-type registration for it.

The SMART Health Check-in mdoc profile uses these version-1 identifiers:

| Identifier kind | Value | Defined use |
| --- | --- | --- |
| Digital Credentials API protocol id | `org-iso-mdoc` | Direct same-device mdoc presentation protocol used by §8 and by phone-local kiosk re-entry. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | SMART Health Check-in 1.0 document type requested by Verifiers and returned by Wallets/Responders. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the stable SMART response element. |
| Requested and disclosed element | `smart_health_checkin_response` | Issuer-signed element whose `elementValue` is the JSON text serialization of a `SmartHealthCheckinResponse`. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | `ItemsRequest.requestInfo` key whose value is the JSON text serialization of a `SmartHealthCheckinRequest`. |

A Verifier claiming the version-1 direct mdoc profile SHALL use the values above exactly. It SHALL carry the SMART request only at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`.

A Wallet/Responder claiming the version-1 direct mdoc profile SHALL disclose the SMART response as the `elementValue` of `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. It SHALL NOT treat dynamic element names, archived claim-name experiments, individual FHIR profiles, request items, Artifact media types, Questionnaires, status codes, kiosk wrapper fields, or locally chosen namespaces as alternate version-1 core carriers.

These values are SMART Health Check-in profile identifiers for use in the mdoc / ISO / Digital Credentials ecosystem. Registration, reservation, or publication in an applicable external registry may be needed for some deployments, but this specification does not assert that such external registration is complete. Future incompatible mdoc-carrier changes SHOULD use a new profile identifier and, when necessary, a new `docType` suffix rather than changing the meaning of `org.smarthealthit.checkin.1` in place.

### 13.3 Status code registry

SMART Health Check-in maintains a specification-controlled registry for `SmartHealthCheckinResponse.requestStatus[].status`. Version 1.0 defines these initial entries:

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without Holder refusal being the relevant cause. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and was not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use only these status codes in a SMART Health Check-in 1.0 response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless it explicitly supports the corresponding future registry entry.

A future status-code registration SHALL define the exact code string; lifecycle status; semantics; how the code differs from the six core codes; allowed or expected relationship to returned Artifacts; interaction with `required`, selector kinds, media types, Holder choice, `message`, and §6.6 validation; Wallet/Responder construction rules; Verifier validation and display behavior; unsupported-recipient behavior; security considerations; privacy considerations; and at least one example or conformance test. New status codes SHALL NOT redefine any of the six version-1 codes or remove the requirement that `requestStatus[]` account for every request item exactly once.

### 13.4 Content-selector kind registry

SMART Health Check-in maintains a specification-controlled registry for `SmartHealthCheckinRequest.items[].content.kind`. Version 1.0 defines these initial entries:

| Selector kind | Selector shape summary | Semantics |
| --- | --- | --- |
| `fhir.resources` | `content` may include `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` as arrays of strings. | Requests patient-specific FHIR resources. `profiles[]` and `profilesFrom[]` are additive profile selectors; `resourceTypes[]` is an additional official FHIR resource-type constraint when present. |
| `questionnaire` | `content.questionnaire` is a FHIR canonical string, an inline FHIR `Questionnaire`, or an object containing `canonical`, `resource`, or both. | Requests completion of, or response to, a FHIR Questionnaire, with returned content represented by an accepted Artifact media type. |

A Requester SHALL use one of these selector kinds or a registered extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support a selector kind SHALL NOT infer its semantics from display text, profile labels, local topic names, wrapper field names, provider metadata, or requester identity metadata. It SHALL reject the request or report the affected item as `unsupported` according to the selected flow and §6.

A future selector-kind registration SHALL define the exact `content.kind` string; JSON shape; required and optional members; unknown-member handling; clinical meaning; content-satisfaction rules; interactions with `accept[]`, `fhirVersions[]`, FHIR canonicals and `|version`, item status, Artifact fulfillment, and §6.6 validation; unsupported, unavailable, partial, declined, and error behavior; examples; security considerations; and privacy considerations. Registrants SHOULD choose collision-resistant names, such as reverse-DNS or URI-like names, unless the registry later defines a stricter syntax.

A selector-kind registration SHALL NOT redefine SMART request top-level fields, SMART response fields, `fhir.resources`, `questionnaire`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, Holder control, requester identity handling, or trust-layer boundaries.

### 13.5 Profile-id registry

SMART Health Check-in maintains a specification-controlled registry for profile identifiers. A profile identifier names a coherent set of conformance, deployment, provider, fixture, certification, or future-binding rules for one or more targets and feature sets.

Profile identifiers are not SMART request fields, SMART response fields, clinical selectors, Artifact media types, status codes, kiosk payload kinds, request presets, IPS shortcuts, “all of the above” shortcuts, topic labels, or substitutes for `KioskRequestPayload.smartRequest`. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, an “all of the above” shortcut, a profile-family shortcut, a topic label, or negotiation metadata to bypass §5 selectors, §5 `accept[]`, §6 response validation, §7 trust processing, §8 validation, or §9 kiosk validation.

Until final publication registry mechanics are established, SMART Health Check-in 1.0 uses these provisional human-readable labels from §4:

| Profile label | Status | Summary |
| --- | --- | --- |
| `smart-health-checkin-core-1` | Provisional label | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Provisional label | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-kiosk-1` | Provisional label | Cross-device §9 kiosk wrapper support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Provisional label | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Provisional label | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | Reserved label | Placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

A future profile-id registration SHALL define the identifier; versioning policy; lifecycle status; target roles; required and optional features; prerequisite profiles; affected specification sections; allowed extension identifiers; validation obligations; trust-policy assumptions; fixture or conformance expectations when applicable; security considerations; privacy considerations; compatibility behavior; and whether the profile is for runtime interoperability, deployment policy, provider behavior, certification, fixtures, diagnostics, historical captures, or illustrative examples.

A deployment or extension profile MAY impose stricter trust, validation, media-type, selector, size, expiration, replay, duplicate-handling, retention, provider, provenance, or fixture requirements. It SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, core selector kinds, Artifact media-type rules, fulfillment/status accounting, same-device carriers, kiosk direct `smartRequest` embedding, wrapper/SMART id separation, pointer-only `r` behavior for the active profile, cryptographic context separation, or the untrusted-relay model.

### 13.6 JWS `typ` registry entry

The version-1 kiosk request wrapper uses a compact JWS whose protected header contains:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

SMART Health Check-in defines the following specification-controlled JWS type value:

| Field | Value |
| --- | --- |
| JWS `typ` value | `smart-health-checkin+kiosk-request+jws` |
| Applies to | Compact JWS for the §9 `KioskRequestPayload`. |
| Payload | `KioskRequestPayload` JSON object with `v: 1`, wrapper `requestId`, and direct `smartRequest` embedding. |
| Signing algorithm in the active profile | `ES256`, with creator key identified by protected-header `kid` and interpreted under deployment trust policy. |
| Enclosing encrypted request envelope | `EncryptedKioskRequest` with `contentType` `application/smart-health-checkin-kiosk-request+jws+aesgcm`, algorithm label `ECDH-P256+HKDF-SHA256+AES-GCM`, `enc` `A256GCM`, and request-envelope HKDF info `smart-health-checkin-kiosk-request-v1`. |
| Security considerations | The `typ` value is a type discriminator. Processors still verify compact JWS syntax, `alg`, `kid`, signature validity, creator trust, issuer/audience/provider policy, timestamps, request-id binding, algorithm labels, constraints, and the embedded SMART request. Matching `typ` alone does not establish creator trust, Holder consent, requester identity, SMART response validity, mdoc issuer/device trust, or clinical-source provenance. |

A Kiosk creator claiming the version-1 kiosk profile SHALL set the protected-header `typ` to `smart-health-checkin+kiosk-request+jws`. A Phone presenter claiming the version-1 kiosk profile SHALL require this exact `typ` value when verifying the compact kiosk request JWS and SHALL NOT accept another value as equivalent unless a future registered profile explicitly defines compatible handling.

This specification does not claim that `smart-health-checkin+kiosk-request+jws` is permanently registered in an external JOSE or IANA registry. If a future JOSE or publication-venue registry is used, the registration should preserve this active value or define an explicit migration profile.

The active kiosk response-submission plaintext uses `payload.kind` value `smart-health-checkin-response` for successful submissions containing a `payload.smartResponse`. That value is a kiosk payload-kind value, not a JOSE `typ`, not the SMART response top-level `type`, not an Artifact media type, and not an encrypted request `contentType`. Future payload kinds require future profile or registry review and must preserve §6 validation, §7 trust interpretation, §8 validation boundaries, §9 request-id binding, and the untrusted-relay model. The active response-submission encryption context uses HKDF info `smart-health-checkin-kiosk-response-v1` and stores ciphertext bytes as `application/octet-stream` blobs.

### 13.7 Designated expert review process

SMART Health Check-in registry changes use designated expert review unless a future governance process or external registry operator defines a stricter process. The expert's role is to protect interoperability, privacy, security, and the architectural invariants of SMART Health Check-in; it is not to approve private business arrangements, production trust anchors, or clinical policy decisions.

Designated expert review applies before an entry is treated as an interoperable SMART Health Check-in registration for:

- new or changed status codes;
- new content-selector `kind` values;
- extension Artifact media types or media-type compatibility rules for SMART Health Check-in use;
- profile identifiers beyond the provisional and reserved labels in §13.5;
- future kiosk completion payload kinds beyond the active `smart-health-checkin-response` successful payload kind;
- provider profiles that claim interoperability beyond local deployment configuration;
- SMART Health Check-in-specific JWS `typ` values, kiosk wrapper content types, or cryptographic suite labels; and
- future SMART Health Check-in mdoc `docType`, namespace, element, or request-carrier changes.

External registries and specifications, including IANA media types, FHIR, SMART Health Cards, JOSE, COSE, HPKE, ISO/IEC mdoc structures, Digital Credentials API protocol identifiers, issuer trust lists, and deployment trust frameworks, remain governed by their own processes. SMART Health Check-in review can reference those identifiers but does not replace their external registration or trust-policy review.

A registration request SHOULD include the requested identifier; registry category; lifecycle status; change controller; stable public specification or deployment profile; affected conformance targets, features, and versions; exact syntax; processing rules; validation rules; unsupported-recipient behavior; compatibility or deprecation behavior; examples or conformance tests; security considerations; privacy considerations; logging and retention considerations when applicable; fixture or diagnostic status when applicable; and dependencies on external standards or deployment policy.

The designated expert SHOULD approve a registration only when the request:

1. uses a syntactically clear, stable, and collision-resistant identifier for its registry;
2. identifies the exact target, feature, version, and protocol section affected;
3. preserves the transport-neutral §5/§6 SMART request and SMART response semantics unless the entry is explicitly for a future incompatible version;
4. preserves request/response validation behavior, including `requestId`, `fulfills[]`, `requestStatus[]`, media-type checks, status-code handling, and §6.6 cross-validation;
5. preserves core selector semantics, including `fhir.resources`, `questionnaire`, additive `profiles[]` plus `profilesFrom[]`, `resourceTypes[]`, and per-item `accept[]` rules;
6. preserves the §7 trust-layer separation among origin evidence, optional reader authentication, mdoc issuer/device evidence, kiosk wrapper validation, provider metadata, Holder action, and clinical-source provenance;
7. preserves the version-1 same-device identifiers `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request` unless the registration is explicitly for a future mdoc profile;
8. preserves kiosk direct `smartRequest` embedding, wrapper `requestId` versus `smartRequest.id` separation, pointer-only active QR behavior using fragment parameter `r`, the untrusted-relay model, and separation among §8 HPKE, §9 request-envelope encryption, and §9 response-submission encryption;
9. defines unsupported-recipient behavior that lets older implementations reject, ignore, quarantine, or report unsupported without unsafe reinterpretation;
10. includes security and privacy considerations proportionate to the clinical content and metadata involved, including URLs, provider rows, ciphertext blobs, key identifiers, logs, telemetry, and diagnostic artifacts;
11. avoids requiring untrusted relays or providers to see plaintext SMART requests, SMART responses, raw FHIR content, SMART Health Cards, private keys, shared secrets, or clinical trust decisions merely to route state; and
12. includes enough examples, fixture expectations, or conformance guidance for independent implementation.

The designated expert SHOULD reject or request revision of a registration that redefines existing fields or identifiers; creates ambiguous synonyms for existing status codes or selector kinds; introduces requester identity, organization metadata, trust assertions, callback endpoints, kiosk metadata, or production trust-anchor claims into the SMART request body; turns profile identifiers into in-band request selectors; relies on `requestProfile`, presets, IPS shortcuts, “all of the above” shortcuts, or local topic labels instead of §5 selectors; requires untrusted relays to see plaintext clinical content; weakens Holder control or required validation; conflates wrapper and clinical request identifiers; treats demo keys, self-signed fixture material, provider ids, example issuer/audience strings, or checked-in private keys as production trust anchors; or overclaims clinical-source provenance for unsigned raw FHIR JSON from transport success alone.

Private or deployment-local identifiers MAY be used within a controlled deployment when all participants are configured for them and the deployment accepts the interoperability risk. Such identifiers should be documented as local and must not be represented as SMART Health Check-in-wide registrations when interoperable processing by unrelated implementations is expected.

A provisional or experimental registration SHOULD state its expiration, review checkpoint, or promotion criteria. A deprecated registration remains listed with its prior semantics, replacement guidance if any, and receiver handling expectations; deprecation does not silently change the meaning of already-published SMART Health Check-in 1.0 messages.
