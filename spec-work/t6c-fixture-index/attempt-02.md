# Appendix D. Test vectors and fixture index

This appendix is informative. It indexes checked-in fixture material, explains how those materials relate to the normative SMART Health Check-in 1.0 model, and gives guidance for promoting future example vectors into repeatable conformance candidates. It does not define a second presentation flow, add new clinical semantics, create production trust anchors, or make any checked-in capture a universal conformance oracle merely because it exists.

Fixture expectations derive from the normative clinical request and response model in §§5-6, the trust framework in §7, the same-device direct `org-iso-mdoc` presentation flow in §8, the schema and CDDL appendices, and the worked examples in §16. If this appendix conflicts with those sections, the normative sections control.

SMART Health Check-in 1.0 has one normative live presentation fixture class: the same-device direct `org-iso-mdoc` flow for `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable element `smart_health_checkin_response`, and request carrier `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. QR, NFC, deep-link, kiosk, relay, completion-screen, and staff-handoff materials may be useful deployment-local or historical demo artifacts, but they are not SMART Health Check-in 1.0 protocol fixtures unless the captured page proceeds to the §8 same-device flow and the fixture scope is limited to that flow.

## D.1 Fixture taxonomy

Fixture entries should identify both the artifact class and the comparison mode. These labels prevent real-platform captures, implementation regression files, examples, and future conformance vectors from being confused with each other.

| Class | Scope | Typical comparison mode | Use |
| --- | --- | --- | --- |
| **Byte-exact fixture** | A named serialized byte boundary such as CBOR, COSE, HPKE output, digest input, or base64url text. | Exact bytes, hex, digest, or base64url string. | Tests security-sensitive boundaries such as tag-24 wrapping, `SessionTranscript`, value-digest inputs, and HPKE envelopes. |
| **Structural fixture** | A decoded request, response, mdoc, COSE, CDDL, schema, or inspection object. | Field presence, constants, types, decoded relationships, and validation report contents. | Tests parsers and validators without requiring nondeterministic bytes to match. |
| **Semantic example** | SMART request/response JSON illustrating clinical selectors, Artifacts, statuses, and many-to-many fulfillment. | JSON model validation and request-aware semantic checks. | Explains protocol behavior and seeds future vectors. |
| **Diagnostic trace** | Debug bundle, inspection report, byte walk, implementation log extract, or cross-library comparison output. | Human or tool-assisted investigation; may combine byte and structural checks. | Helps implementers debug failures and compare libraries. |
| **Historical archive** | Real platform or third-party capture retained as evidence of prior or external behavior. | Usually diagnostic-only unless a subset is explicitly promoted. | Documents provenance and avoids losing useful empirical observations. |
| **Implementation regression** | Test resource for a repository implementation, SDK, or native platform module. | Whatever the implementation test harness declares. | Prevents local regressions; not automatically a public conformance vector. |
| **Conformance-candidate vector** | A fixture set proposed for pass/fail use by independent implementations. | Explicit byte-exact, structural, and semantic checks with expected outcomes. | Candidate input to certification or external conformance tooling after review. |

The same directory can contain several classes. For example, a real Android response capture contains byte-exact subfixtures, structural inspections, diagnostic traces, and historical real-platform evidence; only an explicitly selected subset should be treated as conformance-candidate material.

## D.2 Manifest and labeling conventions

A fixture root should have a `manifest.json`, `metadata.json`, or equivalent index that records enough information for a later reader to understand the fixture without inspecting implementation logs. Informative fixture metadata should include:

- fixture id and human label;
- class labels from D.1;
- producing tool, platform, or capture source;
- creation date when relevant;
- protocol id and SMART Health Check-in identifiers exercised;
- whether the material is synthetic, real-platform demo, third-party, historical, or deployment-local;
- comparison mode for each file or file group: byte-exact, structural, semantic, diagnostic-only, or illustrative;
- expected validation outcome: positive, negative, partial, unsupported, error, or diagnostic-only;
- related §8, Appendix C, Appendix E, Appendix B, §6.6, or §16 examples;
- hashes for byte-exact files when useful;
- whether the fixture contains PHI, production secrets, bearer credentials, production private keys, or reusable non-demo trust material;
- whether any private keys are intentionally public test vectors;
- whether certificates, issuer material, reader material, trust anchors, origins, package names, or allow-list evidence are demo/test-only or production-trusted by a named deployment policy; and
- any nondeterministic fields that should not be byte-compared, such as randomized ECDSA signatures, nonces, timestamps, generated key pairs, or real-platform wrapper details.

Checked-in public fixtures should use synthetic clinical data or non-PHI demo data. Demo private keys, self-signed certificates, local origins, test issuer strings, and intentionally public HPKE recipient private keys are fixture material only. They are not production issuer trust, reader trust, origin trust, clinical-source provenance, or key-management guidance.

## D.3 Same-device byte ladder and expected boundaries

A complete same-device `org-iso-mdoc` fixture set can expose the following boundaries. A vector does not need every boundary, but each included boundary should state its comparison mode and expected use.

### D.3.1 Verifier request side

| Boundary | Expected file names or fields | Validation purpose |
| --- | --- | --- |
| SMART request JSON text | `smart-request.json`, `smart-request.raw.json`, `smart-request.expected.json` | Validates §5 request shape, flattened `questionnaire` selectors, array `profilesFrom[]`, `accept[]`, canonical `|version` preservation, and absence of requester identity metadata. |
| Digital Credentials API request wrapper | `navigator-credentials-get.arg.json`, `request.json`, `credential-manager-request.json` | Confirms direct `org-iso-mdoc` invocation and the presence of base64url `deviceRequest` and `encryptionInfo` fields. |
| `DeviceRequest` bytes | `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, `device-request.diag` | Confirms `DeviceRequest.version` `1.0`, `docRequests[]`, and tag-24 `ItemsRequest` carriage. |
| `ItemsRequest` bytes | `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request.decoded.json`, `items-request-tag24.cbor`, `items-request-tag24.cbor.hex` | Confirms `docType`, namespace, stable element, `intentToRetain`, exact tag-24 boundary, and requestInfo key. |
| `requestInfo` extraction | `request-info.json`, `requested-element.txt` | Confirms the SMART request is carried only at `org.smarthealthit.checkin.request` and the requested element is `smart_health_checkin_response`. |
| HPKE request setup | `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, `encryption-info.diag`, `recipient-public.jwk.json`, `recipient-private.jwk.json` | Confirms direct `dcapi` `encryptionInfo`, P-256 COSE_Key recipient key, fresh nonce expectations, and offline opening material where intentionally public. |
| Transcript material | `session-transcript.cbor`, `session-transcript.cbor.hex`, `session-transcript.diag` | Confirms `dcapiInfo = CBOR([exactEncryptionInfoBase64Url, origin])`, `handover = ["dcapi", SHA-256(dcapiInfo)]`, and `SessionTranscript = CBOR([null, null, handover])`. |
| Optional reader authentication | `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, `reader-auth-detached-payload.cbor.hex`, `reader-certificate.der`, `reader-public.jwk.json` | Confirms optional per-`DocRequest.readerAuth`, detached payload binding to the exact transcript and tag-24 `ItemsRequest`, ES256, and demo certificate material. |
| Decoded inspection | `inspection.json`, `request-artifacts.json` | Provides structural and diagnostic summaries for independent tools. |

### D.3.2 Wallet response side

| Boundary | Expected file names or fields | Validation purpose |
| --- | --- | --- |
| SMART response JSON text | `smart-response.json`, `smart-response.raw.json`, `smart-response.expected.json` | Validates §6 response shape, exact `requestId`, core Artifact media types, `fhirVersion` rules, `fulfills[]`, and `requestStatus[]` coverage. |
| Issuer-signed item | `issuer-signed-item.cbor`, `issuer-signed-item.cbor.hex`, `issuer-signed-item.diag`, `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.diag` | Confirms stable element `elementIdentifier`, string `elementValue`, tag-24 boundary, and digest input. |
| MSO and digest | `value-digest-input.cbor`, `value-digest-input.cbor.hex`, `value-digest.bin`, `value-digest.bin.hex`, `mso.cbor`, `mso.cbor.hex`, `mso-tag24.cbor`, `mso-tag24.cbor.hex` | Confirms SHA-256 digest over the complete tag-24 `IssuerSignedItem`, `MSO.docType`, digest algorithm, digest id consistency, and device key evidence. |
| Issuer proof | `issuer-auth.cbor`, `issuer-auth.cbor.hex`, `issuer-auth.diag` | Confirms COSE_Sign1 structure and fixture-level issuer proof material. Production trust remains out of scope for demo fixtures. |
| Device authentication | `device-authentication.cbor`, `device-authentication.cbor.hex`, `device-authentication.cbor.b64u` | Confirms `DeviceAuthentication` is bound to the same `SessionTranscript`, `docType`, and tag-24 `DeviceNameSpaces`. |
| DeviceResponse plaintext | `device-response.cbor`, `device-response.cbor.hex`, `device-response.cbor.b64u`, `document.cbor`, `document.diag` | Confirms the mdoc `DeviceResponse` or document structure that contains the issuer-signed SMART response element. |
| HPKE result and DC API wrapper | `wallet-response.digital-credential.json`, `credential.json`, `submit.json`, `dcapi-response.cbor`, `dcapi-response.cbor.hex`, `dcapi-response.cbor.b64u`, `hpke-enc.bin`, `hpke-ciphertext.bin` | Confirms direct `dcapiResponse = ["dcapi", {enc, cipherText}]`, base64url result shape, and encrypted response fields. |
| Opened and parsed inspections | `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, `pymdoc-byte-check.json`, `expected-walk.json` | Provides structural, diagnostic, and cross-library evidence for HPKE opening, mdoc validation, digest binding, device signature, and SMART response extraction. |

## D.4 Checked-in fixture roots

The following entries describe currently checked-in material. Class labels are conservative; promotion to conformance-vector status requires the review described in D.8.

### D.4.1 `fixtures/dcapi-requests/ts-smart-checkin-basic/`

**Classification:** synthetic structural fixture; conformance candidate for verifier-side request construction after final vector content is frozen.

**Purpose:** Generated TypeScript request material for the core same-device request shape without reader authentication. It exercises the direct `org-iso-mdoc` wrapper, `DeviceRequest`, tag-24 `ItemsRequest`, `requestInfo` SMART request carrier, `encryptionInfo`, and retained test HPKE key material.

**Important files:** `request.json`, `navigator-credentials-get.arg.json`, `device-request.b64u`, `device-request.cbor.hex`, `encryption-info.b64u`, `encryption-info.cbor.hex`, `inspection.json`, `smart-request.expected.json`, `recipient-public.jwk.json`, and `recipient-private.jwk.json`.

**Caveats:** The private JWK is intentionally public test material. Unless a future vector profile says otherwise, this fixture does not make its nonce size, key reuse, JSON serialization, map ordering, or demo clinical payload universally required.

### D.4.2 `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`

**Classification:** synthetic structural and byte-boundary fixture; conformance candidate for optional readerAuth construction after reader-auth vector policy is frozen.

**Purpose:** Generated TypeScript request material with optional per-`DocRequest.readerAuth`. It adds exact tag-24 `ItemsRequest` bytes, `SessionTranscript`, detached reader-authentication payload, demo reader certificate evidence, and reader public key material.

**Important files:** all files from D.4.1 plus `items-request-tag24.cbor`, `session-transcript.cbor`, `reader-auth.cbor`, `reader-certificate.der`, and `reader-public.jwk.json`.

**Caveats:** The vector can test readerAuth syntax, detached payload binding, and cryptographic verification against demo material. It does not require all deployments to use readerAuth and does not make the demo certificate a production trust anchor.

### D.4.3 `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`

**Classification:** real-platform diagnostic trace and historical capture; selected byte boundaries are conformance candidates only after explicit promotion.

**Purpose:** Real Chrome/Android Credential Manager request capture using demo data. It demonstrates that the current platform path can carry the SMART request through `ItemsRequest.requestInfo`, preserve exact `encryptionInfo` base64url text for transcript construction, include per-`DocRequest.readerAuth`, and expose offline HPKE opening material for the paired response fixture.

**Important files:** `credential-manager-request.json`, `navigator-credentials-get.arg.json`, `request.json`, `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, `device-request.diag`, `items-request.cbor`, `items-request.cbor.hex`, `items-request.decoded.json`, `items-request.diag`, `items-request-tag24.cbor`, `items-request-tag24.cbor.hex`, `request-info.json`, `requested-element.txt`, `smart-request.raw.json`, `smart-request.json`, `smart-request.hydrated.json`, `smart-request.expected.json`, `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, `encryption-info.diag`, `session-transcript.cbor`, `session-transcript.cbor.hex`, `session-transcript.diag`, `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, `reader-auth-detached-payload.cbor.hex`, `recipient-public.jwk.json`, `recipient-private.jwk.json`, `metadata.json`, `inspection.json`, and `request-artifacts.json`.

**Caveats:** This is real-platform demo evidence, not a platform requirement. Browser package name, local origin, timestamp, nonce, certificate subject, UI path, and debug details are incidental unless a named deployment profile adopts them. The included private key is intentionally public fixture material.

### D.4.4 `fixtures/responses/pymdoc-minimal/`

**Classification:** synthetic response-side byte walk and structural fixture; conformance candidate for issuer-signed response carriage and digest inputs after deterministic fields are identified.

**Purpose:** Minimal response material generated independently for walking the issuer-signed SMART response item, tag-24 digest input, MSO, `issuerAuth`, and decoded document structure without requiring a live browser or Android capture.

**Important files:** `smart-response.json`, `input.json`, `issuer-signed-item.cbor`, `issuer-signed-item.cbor.hex`, `issuer-signed-item.diag`, `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.diag`, `value-digest-input.cbor`, `value-digest-input.cbor.hex`, `value-digest-input.diag`, `mso.cbor`, `mso.cbor.hex`, `mso.diag`, `mso-tag24.cbor`, `mso-tag24.cbor.hex`, `mso-tag24.diag`, `issuer-auth.cbor`, `issuer-auth.cbor.hex`, `issuer-auth.diag`, `document.cbor`, `document.cbor.hex`, `document.diag`, `expected-walk.json`, and `manifest.json`.

**Caveats:** This root does not cover the Digital Credentials API result wrapper, HPKE `dcapiResponse`, live origin binding, or full end-to-end response opening. Some complete bytes may contain nondeterministic signatures; compare stable intermediates or declared hashes rather than every generated byte unless deterministic signing is frozen.

### D.4.5 `fixtures/responses/real-chrome-android-smart-checkin/`

**Classification:** real-platform diagnostic trace and historical capture; paired end-to-end conformance candidate only after request fixture, trust assumptions, and expected validation policy are frozen.

**Purpose:** Real Android Wallet response artifacts paired with `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`. It demonstrates the complete demo response path: Digital Credentials API result, CBOR `dcapiResponse`, HPKE `enc` and `cipherText`, HPKE-opened `DeviceResponse`, issuer-signed SMART response item, MSO value digest, device authentication, and extracted SMART response JSON.

**Important files:** `wallet-response.digital-credential.json`, `credential.json`, `submit.json`, `dcapi-response.cbor`, `dcapi-response.cbor.hex`, `dcapi-response.cbor.b64u`, `hpke-enc.bin`, `hpke-enc.bin.hex`, `hpke-enc.bin.b64u`, `hpke-ciphertext.bin`, `hpke-ciphertext.bin.hex`, `hpke-ciphertext.bin.b64u`, `device-response.cbor`, `device-response.cbor.hex`, `device-response.cbor.b64u`, `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.cbor.b64u`, `value-digest.bin`, `value-digest.bin.hex`, `value-digest.bin.b64u`, `mso.cbor`, `mso.cbor.hex`, `mso.cbor.b64u`, `issuer-auth.cbor`, `issuer-auth.cbor.hex`, `issuer-auth.cbor.b64u`, `device-authentication.cbor`, `device-authentication.cbor.hex`, `device-authentication.cbor.b64u`, `session-transcript.cbor`, `session-transcript.cbor.hex`, `session-transcript.cbor.b64u`, `smart-response.raw.json`, `smart-response.json`, `smart-response.expected.json`, `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, `pymdoc-byte-check.json`, and `metadata.json`.

**Caveats:** The response must be interpreted with the paired request fixture and intentionally public test-only HPKE private key. It proves active Android demo behavior, not production issuer trust or clinical-source provenance for unsigned raw FHIR JSON.

### D.4.6 `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/`

**Classification:** third-party historical archive and diagnostic structural fixture; negative or background evidence for SMART Health Check-in.

**Purpose:** Captures an external verifier's `org-iso-mdoc` request shape under a Safari-like user-agent path. It informed envelope understanding, but it uses mDL identifiers rather than SMART Health Check-in identifiers.

**Important files:** `navigator-credentials-get.arg.json`, `device-request.cbor`, `device-request.cbor.hex`, `device-request.diag`, `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `encryption-info.cbor`, `encryption-info.cbor.hex`, `encryption-info.diag`, `manifest.json`, and `notes.md`.

**Caveats:** This is not a SMART Health Check-in positive fixture. It should not be cited as support for alternate SMART request carriers, mDL docTypes, or browser-specific normative behavior.

### D.4.7 `fixtures/dcapi-requests/negative-mattr-mdl/`

**Classification:** negative structural fixture.

**Purpose:** Records that the Mattr mDL capture is not expected to parse as SMART Health Check-in, despite using the same Digital Credentials protocol id.

**Important files:** `metadata.json`.

**Caveats:** Negative fixtures are useful for rejecting non-SMART mdoc requests. They do not define all possible non-SMART failures.

### D.4.8 `wallet-android/app/src/test/resources/test-vectors.json`

**Classification:** implementation regression file and conformance candidate for selected identifiers, rejection cases, and transcript derivation.

**Purpose:** Android unit-test resource generated from TypeScript protocol code. It records active identifiers, generated request vectors, rejection vectors, and `SessionTranscript` vectors for cross-language checks.

**Important contents:** top-level `doctype`, `namespace`, `responseElement`, and `requestInfoKey`; request vector SMART JSON and `DeviceRequest` hex; rejection vectors for non-SMART mdoc material; transcript vectors with origin, `encryptionInfo` hex, exact `encryptionInfo` base64url text, and `SessionTranscript` hex.

**Caveats:** This is not the entire public fixture suite. Exact nonce values, generated clinical request bodies, and negative-case coverage are implementation-test choices unless promoted by a future fixture profile.

### D.4.9 Other checked-in illustrative material

`fixtures/sample-shc/` contains SMART Health Card sample material and verification tooling useful for Artifact-level examples. `fixtures/headache-summary-svgs/` contains illustrative SVG and summary material for demo clinical presentation. These roots are semantic or illustrative support material unless a future vector explicitly embeds them in a SMART Health Check-in request/response fixture. They do not define new Artifact media types, do not revive `GenericArtifact`, and do not create SMART Health Check-in presentation fixtures by themselves.

`fixtures/responses/android-kotlin-generated/` contains generated inspection outputs useful for implementation regression and cross-language diagnostics. It should be referenced by a public conformance index only if its producer assumptions, expected inputs, and comparison mode are documented.

## D.5 Alignment with §16 worked examples

Section 16 examples are synthetic semantic examples. They are not byte fixtures until an organizer freezes exact JSON serialization, key material, randomness, CBOR encoding choices, trust assumptions, and expected validation outcomes. The table below identifies how each example can map to future candidate vectors without requiring new real-platform captures.

| §16 example | Future semantic vector id | Candidate checks |
| --- | --- | --- |
| §16.1 Insurance-card-only check-in | `ex16-1-insurance-shc` | Request item uses exact CARIN Coverage profile and `accept[]` preference with `application/smart-health-card` first; response uses only `application/smart-health-card`, `value.verifiableCredential[]`, no outer `fhirVersion`, `fulfills[] = ["insurance-card"]`, and status `fulfilled`. |
| §16.2 US Core summary check-in | `ex16-2-us-core-fhir` | `profilesFrom[]` is an array; `profiles[]` and `profilesFrom[]` are additive; `resourceTypes[]` constrains resources; response uses raw FHIR JSON with `fhirVersion`, Bundle payload, exact versioned `meta.profile` preservation, and §6.6 checks. |
| §16.3 Inline questionnaire pre-visit intake | `ex16-3-inline-questionnaire` | Request uses flattened `content.kind = "questionnaire"` with direct `canonical` and `resource`; no nested `questionnaire` key; response is `QuestionnaireResponse` in `application/fhir+json`; `QuestionnaireResponse.questionnaire` preserves the versioned canonical. |
| §16.4 Mixed bundle | `ex16-4-mixed-bundle` | One raw FHIR JSON Artifact fulfills several items; each fulfillment edge uses an accepted media type; bundle includes Coverage, Condition, and QuestionnaireResponse examples; requestStatus covers each item exactly once. |
| §16.5 Per-item declined / partial / error | `ex16-5-item-outcomes` | Status semantics are independent of Artifact boundaries; `partial` can have a fulfilling Artifact; `declined` and `error` items have status entries without fabricated Artifacts; status messages avoid secrets and unnecessary clinical detail. |
| §16.6 No selectors | `ex16-6-open-ended-share` | `fhir.resources` selector with no `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`; broad Holder-facing text; raw FHIR JSON Bundle with `fhirVersion`; no implication that all available records must be disclosed. |

A future vector pack can combine these semantic examples with same-device wrappers in two layers:

1. **Clinical JSON vectors:** canonical request JSON, response JSON, schema validation results, and §6.6 cross-validation results. These can be stable without HPKE, CBOR, COSE, or real platform captures.
2. **Same-device presentation vectors:** selected clinical JSON vectors embedded in deterministic `DeviceRequest`, `ItemsRequest`, `SessionTranscript`, `IssuerSignedItem`, MSO, `DeviceAuthentication`, `DeviceResponse`, HPKE `dcapiResponse`, and Digital Credentials API wrapper material. These require explicit vector-profile decisions for randomness, key material, signatures, map ordering, and trust labels.

The first future vector pack should prefer synthetic spec vectors over new live captures. Existing real Chrome/Android captures remain valuable as real-platform diagnostic evidence and can be labeled `real-platform-demo` or `historical-capture`; synthetic spec vectors can be labeled `synthetic-spec-vector` and designed for independent reproducibility.

## D.6 Candidate conformance-vector profile

A candidate conformance vector should identify the exact target and expected result. A useful profile can include these groups:

| Group | Candidate vector focus |
| --- | --- |
| Request model positives | Minimal request; multi-item request; additive `profiles[]` plus `profilesFrom[]`; flattened Questionnaire selector; no-selector request. |
| Request model negatives | Missing or wrong `type`/`version`; duplicate item ids; scalar `profilesFrom`; legacy nested `questionnaire`; invalid `accept[]`; requester identity metadata in the SMART body. |
| Response model positives | SMART Health Card Artifact; raw FHIR JSON Bundle; many-to-many fulfillment; partial/declined/error statuses; exact `requestId`. |
| Response model negatives | Unknown `mediaType`; generic `value`/`url`/`data` catch-all; outer `fhirVersion` on SHC; missing `fhirVersion` on raw FHIR; unresolved `fulfills[]`; duplicate or missing `requestStatus[]`. |
| Same-device request | Direct `org-iso-mdoc`; `DeviceRequest.version` `1.0`; tag-24 `ItemsRequest`; fixed `docType`, namespace, element, requestInfo key; exact `encryptionInfo` base64url transcript input. |
| Same-device readerAuth | Optional per-`DocRequest.readerAuth`; detached payload over exact tag-24 `ItemsRequest` and `SessionTranscript`; demo x5chain; failure and absent states distinct from trusted states. |
| Same-device response | HPKE `dcapiResponse`; `DeviceResponse`; issuer-signed stable element; MSO value digest over tag-24 issuer item; device signature over transcript-bound `DeviceAuthentication`; extracted SMART response validation. |
| Trust and provenance | Separate expected states for origin, readerAuth, issuer/device evidence, SHC signature verification, raw-FHIR provenance, and downstream ingestion. |

A vector profile should say which fields are byte-exact and which are structural. Deterministic test keys and deterministic nonces may be used for reproducibility, but their use should be labeled as fixture-only. If ECDSA signatures or HPKE outputs are nondeterministic, compare the verified relationships and declared stable intermediates rather than unstable whole-document bytes.

## D.7 Versioning, refresh, and reproducibility

Fixture roots should be refreshed, reclassified, or demoted when any of the following change:

1. §5 request fields, selector shapes, `profilesFrom[]`, canonical `|version` handling, accepted media types, or requester-identity prohibitions;
2. §6 Artifact shapes, core media types, removal of `GenericArtifact`, `fhirVersion` placement, `fulfills[]`, status semantics, or §6.6 cross-validation;
3. §8 same-device identifiers, request carrier, response element, tag-24 boundaries, direct `dcapi` `SessionTranscript`, HPKE suite, `readerAuth`, MSO digest input, or device-authentication construction;
4. Appendix B schema, Appendix C CDDL, Appendix E byte ladder, or registry labels used by the fixture;
5. §16 example content that the vector claims to instantiate;
6. browser, Credential Manager, wallet, or capture-tool behavior that affects real-platform wrapper shape, origin, or transcript inputs;
7. producer tooling, dependency versions, CBOR/COSE/HPKE libraries, or deterministic encoding assumptions;
8. promotion from diagnostic or historical status to conformance-candidate status; or
9. discovery of PHI, production secrets, stale trust material, or operational metadata unsuitable for publication.

Reproducible synthetic vectors should record generator version, input JSON, deterministic test keys or seeds when used, exact hashes, and post-generation validation reports. Real-platform captures should record enough platform context to explain the observation, but incidental context should not become conformance criteria.

## D.8 Promotion criteria

Before a checked-in fixture is described as a conformance-candidate or conformance vector, the promoting document should identify:

- the fixture id and files included in the vector;
- the conformance target: Requester/Verifier, Holder Wallet/Responder, verifier-side validator, schema tool, CDDL tool, fixture tool, or deployment profile;
- prerequisite profiles or optional features, such as readerAuth;
- the exact specification sections and checklist rows exercised;
- comparison mode for each file or field;
- expected pass/fail outcome and error category for negative vectors;
- how nondeterministic bytes are handled;
- test-only keys, certificates, origins, issuer material, and trust assumptions;
- whether clinical payloads are synthetic and whether PHI is absent;
- whether raw FHIR JSON provenance is absent, patient-mediated, or separately evidenced;
- known gaps and non-goals; and
- refresh triggers.

Promotion should be conservative. A fixture can be excellent diagnostic evidence while remaining inappropriate as a universal pass/fail vector because it depends on a local origin, browser package, live platform version, demo certificate, local wallet UI, nondeterministic signing, or unreviewed clinical example content.

## D.9 Historical and deployment-local material

Historical captures and deployment-local demos should be labeled so they cannot be mistaken for SMART Health Check-in 1.0 wire requirements. In particular:

- external mDL captures using `org-iso-mdoc` are useful background for envelope behavior, but they are not SMART Health Check-in positive fixtures unless they use the SMART Health Check-in `docType`, namespace, stable element, and requestInfo key;
- archived dynamic element-name request experiments are not active request carriers;
- OID4VP, `dc_api.jwt`, DCQL, and other reserved or archived binding experiments are not §8 conformance substitutes;
- kiosk, QR, relay, storage-row, completion-screen, and cross-device demo fixtures are deployment-local unless the fixture scope is the same-device page's §8 invocation and response; and
- demo branding, local URLs, package names, or certificate common names are not authenticated requester identity unless a deployment trust policy outside the SMART request body establishes that fact.

## D.10 Privacy and security handling

Fixture publication should follow the same separation of concerns as the protocol:

- use synthetic clinical payloads or non-PHI demo payloads;
- avoid patient identifiers, real appointment identifiers, payer member identifiers, access tokens, bearer URLs, production QR URLs, production launch handles, production private keys, and unredacted logs;
- label intentionally public test private keys, demo certificates, self-signed issuer material, and local trust anchors as non-production;
- keep raw FHIR JSON provenance claims separate from mdoc issuer/device proof and readerAuth proof;
- avoid status messages, error strings, stack traces, or diagnostic reports that reveal secrets or unnecessary clinical details;
- separate public conformance vectors from controlled support bundles, incident artifacts, and live production captures; and
- treat any fixture containing PHI, production credentials, or reusable production key material as sensitive production data rather than an ordinary repository fixture.

## D.11 Gaps and follow-up work

The current fixture set is strong for active same-device byte boundaries and real Chrome/Android demonstration, but several gaps remain before a public conformance vector suite is complete:

1. Freeze clinical JSON vector files corresponding to each §16 worked example, including expected §6.6 validation reports.
2. Add negative clinical JSON vectors for scalar `profilesFrom`, legacy nested `questionnaire`, unrecognized `mediaType`, `GenericArtifact`-style catch-alls, missing raw-FHIR `fhirVersion`, outer SHC `fhirVersion`, unresolved `fulfills[]`, and incomplete `requestStatus[]`.
3. Decide whether synthetic same-device vectors freeze deterministic CBOR map ordering, nonce length, digestID convention, and deterministic signing, or instead compare stable structural and digest relationships.
4. Split real-platform captures from synthetic spec vectors in labels and manifests so Chrome/Android demo evidence is not confused with platform-neutral requirements.
5. Add explicit vector manifests mapping each file to byte-exact, structural, semantic, diagnostic, historical, or conformance-candidate status.
6. Add a small set of readerAuth negative vectors for absent, malformed, cryptographically invalid, valid-but-untrusted, and trusted demo states.
7. Add raw FHIR provenance labeling in semantic examples so validators do not infer clinical-source trust from same-device transport success.
8. Confirm whether `wallet-android/app/src/test/resources/test-vectors.json` should remain implementation-regression material, be mirrored under `fixtures/`, or be referenced only by implementation tests.
9. Keep kiosk, relay, QR, OID4VP, and other reserved or deployment-local material out of the SMART Health Check-in 1.0 fixture index except as explicitly historical or future work.

None of these follow-up items requires a new live capture to complete the specification text. They can be satisfied by synthetic vectors and explicit manifests unless a future implementation or certification program wants additional real-platform diagnostic evidence.
