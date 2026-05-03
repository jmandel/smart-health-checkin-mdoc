# Appendix D: Test vectors and fixture index

This appendix is informative. It indexes checked-in fixture material, explains how those fixtures relate to the SMART Health Check-in 1.0 same-device profile and the worked examples in §16, and records the gaps that must be closed before any fixture is promoted into a conformance vector.

The only version 1.0 live presentation fixture class is the same-device direct `org-iso-mdoc` flow defined in §8. In-person QR, NFC, deep-link, kiosk, relay, or staff-handoff material can be useful for demonstrations or deployment-local testing, but it is not a SMART Health Check-in 1.0 protocol fixture unless it lands on and exercises the §8 same-device flow. OpenID4VP, `dc_api.jwt`, DCQL, mDL, and earlier dynamic-element experiments are historical or future-work material for this specification.

Fixtures do not create new protocol requirements. A fixture can make an existing rule easier to test, but conformance requirements remain the requirements in §§4–14, Appendix A, Appendix B, Appendix C, and Appendix E.

## D.1 Fixture classes

Use the following classes when labeling fixtures and example vectors.

| Class | Use |
| --- | --- |
| **Byte-exact fixture** | A file whose exact bytes are the validation target: for example, a CBOR `DeviceRequest`, tag-24 `ItemsRequest`, unpadded base64url `encryptionInfo` spelling, `SessionTranscript`, `dcapiResponse`, `DeviceResponse`, tag-24 `IssuerSignedItem`, MSO, digest input, HPKE `enc`, or HPKE ciphertext. Byte-exact fixtures should list the exact file path, hash, producer, and whether nondeterminism is intentionally frozen. |
| **Structural fixture** | A fixture used to verify decoded shape, field placement, byte boundaries, or cross-object binding without requiring every enclosing byte to be stable. Examples include decoded `inspection.json`, `expected-walk.json`, `pymdoc-byte-check.json`, and parser walk outputs. |
| **Semantic example** | A request/response JSON pair or Artifact payload used to illustrate selector semantics, media-type handling, status reporting, or FHIR mapping. §16 worked examples are semantic examples; they are not byte-level mdoc captures. |
| **Diagnostic trace** | A platform capture, debug bundle, decoded diagnostic notation, or implementation trace used for troubleshooting and regression analysis. Diagnostic traces may prove that a platform path worked at capture time, but they are not automatically portable pass/fail vectors. |
| **Historical archive** | Material retained to document research, external ecosystem behavior, deprecated encodings, or older profile choices. Historical archives must not be cited as active SMART Health Check-in 1.0 protocol behavior. |
| **Conformance-candidate vector** | Material that is close to becoming a pass/fail vector but still needs a frozen validation statement: exact obligations exercised, expected result, byte or field comparison target, trust material, nondeterminism policy, and relationship to Appendix A. |

Every fixture entry should also state whether the fixture is: byte-exact, structure-exact, semantic-only, diagnostic-only, historical-only, or conformance-candidate. These labels are independent; a real capture can be diagnostic and contain byte-exact subfiles, while still not being a conformance vector.

## D.2 Privacy, security, and publication rules

Public fixtures for this specification use synthetic data, demo keys, and non-production trust material only.

Fixture directories should indicate, in `manifest.json`, `metadata.json`, or adjacent prose:

- whether the fixture contains PHI or real-person data;
- whether any private key, HPKE recipient key, reader key, issuer key, certificate, JWKS, or trust anchor is intentionally public test material;
- whether reader, issuer, device, or SMART Health Card trust material is production, demo, self-signed, specification-example, or unknown;
- whether timestamps, origins, package names, localhost addresses, source paths, or browser identifiers are diagnostic metadata rather than protocol constants; and
- which files are safe to publish and which files, if any, should remain local.

Fixtures containing PHI, production private keys, production secrets, bearer tokens, real verifier trust material, or unredacted operational logs must not be promoted into the public fixture suite. Status messages and diagnostic summaries should not include secrets, stack traces, or unnecessary clinical details.

## D.3 Active same-device request fixtures

### `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`

**Role:** Real Chrome/Android Credential Manager request capture for SMART Health Check-in over direct `org-iso-mdoc`.

**Classification:** Diagnostic trace and historical capture, with byte-exact subfiles that are conformance candidates for the request byte ladder.

**Aligned with v1.0:**

- Uses protocol `org-iso-mdoc`.
- Uses `DeviceRequest.version = "1.0"`.
- Requests docType `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`.
- Carries SMART request JSON in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
- Preserves the tag-24 `ItemsRequest` boundary.
- Includes direct `dcapi` `encryptionInfo` bytes and the exact unpadded base64url spelling needed for `SessionTranscript` construction.
- Includes optional per-`DocRequest.readerAuth`, detached payload material, and demo reader certificate evidence.
- Includes the paired test-only HPKE recipient private JWK so the matching response fixture can be opened offline.

**Key files and byte boundaries:**

- `navigator-credentials-get.arg.json`, `credential-manager-request.json`, and `request.json`: JSON request wrapper views.
- `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, and `device-request.diag`: complete `DeviceRequest` wrapper.
- `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request.decoded.json`, `items-request-tag24.cbor`, and `items-request-tag24.cbor.hex`: untagged and tag-24 request-item boundaries.
- `request-info.json`, `requested-element.txt`, `smart-request.raw.json`, `smart-request.json`, `smart-request.hydrated.json`, and `smart-request.expected.json`: SMART request extraction and comparison material.
- `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, and `encryption-info.diag`: transcript-sensitive HPKE recipient material.
- `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.diag`: direct `dcapi` transcript output.
- `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, and `reader-auth-detached-payload.cbor.hex`: optional reader-authentication material.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: intentionally public, test-only HPKE key material.
- `metadata.json`, `inspection.json`, and `request-artifacts.json`: decoded context, hashes, sizes, and capture notes.

**Current alignment gaps:** The clinical request body is not yet aligned with the final §16 example set. In particular, the checked-in request uses an older nested `content.questionnaire` form for the intake item; the v1.0 model uses flattened questionnaire selectors with sibling `canonical?` and `resource?`. The request also uses older demonstration item ids and selector choices rather than the polished §16 examples. This fixture should therefore be cited for the same-device wire envelope and byte boundaries, not as the final clinical JSON example vector.

**Promotion requirements:** Before any part is promoted to a conformance vector, freeze the expected origin handling, nonce expectations, readerAuth validation policy, deterministic comparison targets, and the updated SMART request body. The fixture's localhost origin, Android package, timestamps, demo certificate subject, and private key are not protocol requirements.

### `fixtures/dcapi-requests/ts-smart-checkin-basic/`

**Role:** Generated TypeScript request fixture for the same-device request shape without `readerAuth`.

**Classification:** Structural fixture and conformance candidate for verifier request construction.

**Key files and byte boundaries:**

- `request.json` and `navigator-credentials-get.arg.json`: Digital Credentials API request shape.
- `device-request.b64u` and `device-request.cbor.hex`: encoded `DeviceRequest`.
- `encryption-info.b64u` and `encryption-info.cbor.hex`: direct `dcapi` encryption information.
- `inspection.json`: decoded request structure.
- `smart-request.expected.json`: expected SMART request extracted from `requestInfo`.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: test-only HPKE key material.

**Current alignment gaps:** This generated fixture uses the correct same-device carrier pattern but retains a legacy questionnaire selector spelling (`content.questionnaire` as a string). It should be regenerated with flattened `canonical` and/or `resource` members before being treated as a final request vector. It also should be aligned with one named §16 example or an explicitly minimal Appendix D example.

### `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`

**Role:** Generated TypeScript request fixture for optional per-`DocRequest.readerAuth`.

**Classification:** Structural fixture and conformance candidate for optional readerAuth byte binding; diagnostic for trust policy.

**Additional key files:**

- `items-request-tag24.cbor`: exact tag-24 `ItemsRequest` bytes used by `ReaderAuthenticationBytes`.
- `session-transcript.cbor`: transcript bytes used by readerAuth.
- `reader-auth.cbor`: detached `COSE_Sign1`.
- `reader-certificate.der` and `reader-public.jwk.json`: demo reader-authentication material.

**Current alignment gaps:** The readerAuth structure is aligned with §8 and Appendix C, but the embedded clinical request has the same legacy questionnaire-selector gap as the basic generated request. The demo certificate and reader trust outcome are not production trust policy and should remain test-only.

### `fixtures/dcapi-requests/negative-mattr-mdl/`

**Role:** Negative or non-SMART mdoc request material.

**Classification:** Historical or implementation-regression fixture.

**Use:** This material can help test rejection of non-SMART or mDL-shaped direct mdoc inputs. It must not be described as a SMART Health Check-in request fixture because it does not use the SMART Health Check-in docType, namespace, request carrier, or clinical model.

## D.4 Active same-device response fixtures

### `fixtures/responses/real-chrome-android-smart-checkin/`

**Role:** Real Android Wallet response artifacts paired with `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`.

**Classification:** Diagnostic trace and historical capture, with byte-exact subfiles that are conformance candidates for end-to-end response processing.

**Aligned with v1.0:**

- Returns a Digital Credentials API result with protocol `org-iso-mdoc` and `data.response` as unpadded base64url CBOR.
- Wraps HPKE output as direct `dcapiResponse = ["dcapi", {"enc", "cipherText"}]`.
- HPKE-opens to a CBOR `DeviceResponse`.
- Carries the SMART response as the issuer-signed `smart_health_checkin_response` item in namespace `org.smarthealthit.checkin`.
- Provides MSO value-digest material for the tag-24 `IssuerSignedItem`.
- Provides `issuerAuth`, device-authentication bytes, `deviceSignature`, and the paired `SessionTranscript`.
- The extracted SMART response uses core Artifact media types and includes `fhirVersion` for raw FHIR JSON artifacts.

**Key files and byte boundaries:**

- `wallet-response.digital-credential.json`, `credential.json`, and `submit.json`: JSON result wrapper views.
- `dcapi-response.cbor`, `dcapi-response.cbor.hex`, and `dcapi-response.cbor.b64u`: direct response envelope.
- `hpke-enc.bin`, `hpke-enc.bin.hex`, `hpke-enc.bin.b64u`, `hpke-ciphertext.bin`, `hpke-ciphertext.bin.hex`, and `hpke-ciphertext.bin.b64u`: HPKE output fields.
- `device-response.cbor`, `device-response.cbor.hex`, and `device-response.cbor.b64u`: HPKE plaintext.
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.cbor.b64u`, `value-digest.bin`, `value-digest.bin.hex`, and `value-digest.bin.b64u`: issuer-signed item and digest boundary.
- `mso.cbor`, `mso.cbor.hex`, `mso.cbor.b64u`, `issuer-auth.cbor`, `issuer-auth.cbor.hex`, and `issuer-auth.cbor.b64u`: issuer proof material.
- `device-authentication.cbor`, `device-authentication.cbor.hex`, `device-authentication.cbor.b64u`, `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.cbor.b64u`: device-authentication context.
- `smart-response.raw.json`, `smart-response.json`, and `smart-response.expected.json`: extracted clinical response.
- `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, and `pymdoc-byte-check.json`: decoded inspections and cross-library byte checks.
- `metadata.json`: capture context, pairing metadata, hashes, and test-key notes.

**Current alignment gaps:** The response fixture's clinical body is paired with the older request fixture and is not a final §16 example vector. It uses raw FHIR JSON artifacts and status entries consistent with the response model, but the underlying request contains a legacy questionnaire selector and the response content includes demo clinical facts and ids chosen for the Android capture rather than the final worked examples. The response should be used to validate the response carrier, HPKE opening, issuer/device proof walk, value-digest boundary, and SMART-response extraction; it should not be treated as the canonical §16 mixed-bundle example.

**Promotion requirements:** A conformance promotion needs a frozen paired request, a frozen validation policy for demo issuer/device/reader trust material, explicit HPKE-open inputs, exact expected errors or success outcomes, and a decision about which cryptographic bytes are stable enough to compare. Successful validation of this fixture does not establish clinical-source provenance for unsigned raw FHIR JSON.

### `fixtures/responses/pymdoc-minimal/`

**Role:** Independently generated minimal mdoc response fixture for walking issuer-signed SMART response carriage.

**Classification:** Structural fixture, byte-ladder fixture, and conformance candidate for response substructure.

**Aligned with v1.0:**

- Uses docType `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`.
- Places a SMART response JSON string in the issuer-signed element value.
- Uses a core raw FHIR JSON Artifact with `mediaType: "application/fhir+json"` and `fhirVersion: "4.0.1"`.
- Includes `requestStatus[]` covering the request item.
- Records the tag-24 `IssuerSignedItem` digest boundary and MSO material.

**Key files and byte boundaries:**

- `smart-response.json` and `input.json`: clinical response and fixture input.
- `issuer-signed-item.cbor`, `issuer-signed-item.cbor.hex`, and `issuer-signed-item.diag`: untagged issuer-signed item.
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, and `issuer-signed-item-tag24.diag`: tag-24 item bytes.
- `value-digest-input.cbor`, `value-digest-input.cbor.hex`, and `value-digest-input.diag`: value-digest oracle.
- `mso.cbor`, `mso.cbor.hex`, `mso.diag`, `mso-tag24.cbor`, `mso-tag24.cbor.hex`, and `mso-tag24.diag`: MSO material.
- `issuer-auth.cbor`, `issuer-auth.cbor.hex`, and `issuer-auth.diag`: issuer authentication.
- `document.cbor`, `document.cbor.hex`, and `document.diag`: document-level structure.
- `expected-walk.json` and `manifest.json`: expected inspection and hashes.

**Current alignment gaps:** This fixture does not exercise Digital Credentials API JSON wrappers, direct `dcapiResponse`, HPKE, origin binding, request/response cross-checking against a paired SMART request, or §16 semantic examples. Complete document bytes may include nondeterministic ECDSA signatures; stable comparison should focus on declared byte boundaries, decoded structure, and hashes named in the manifest.

### `fixtures/responses/android-kotlin-generated/`

**Role:** Android-generated response debug artifacts.

**Classification:** Implementation regression and diagnostic material.

**Use:** This directory can support repository-level regression tests and cross-language checks. It should not be exposed as a public conformance vector unless its producer, paired request, clinical body, and trust material are frozen in the same way as the real Chrome/Android response fixture.

## D.5 External, historical, and non-protocol captures

### `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/`

**Role:** External Mattr verifier capture showing an `org-iso-mdoc` envelope under Safari user-agent branching.

**Classification:** Historical archive and diagnostic envelope evidence.

**Aligned with v1.0:** It confirms useful ecosystem details for the direct mdoc wrapper: `data.deviceRequest`, `data.encryptionInfo`, CBOR `encryptionInfo = ["dcapi", {...}]`, and P-256 recipient key structure.

**Not a SMART Health Check-in fixture:** The captured document type and namespace are mDL-oriented, not `org.smarthealthit.checkin.1` / `org.smarthealthit.checkin`; the capture came from an external verifier and Safari-UA spoofing. It must not be used as a SMART Health Check-in request vector or as evidence for any kiosk, relay, QR, or OpenID4VP protocol requirement.

### Archived OpenID4VP and earlier profile documents

Documents under archive paths, including OpenID4VP, `dc_api.jwt`, DCQL, and earlier dynamic-element or compressed-element experiments, are historical research. They may explain why the current design chose direct same-device `org-iso-mdoc`, but they are not version 1.0 protocol fixtures. Any future OID4VP vectors belong to a future binding and must remain separate from this Appendix D index for the core same-device profile.

## D.6 Semantic Artifact and worked-example material

### §16 worked examples

The examples in §16 are the primary semantic examples for final text. They exercise:

- CARIN insurance-card selection with SMART Health Card preferred;
- US Core summary selection with additive `profilesFrom[]` and `profiles[]` semantics;
- flattened Questionnaire selectors using sibling `canonical` and `resource` members;
- structured canonical `|version` handling and preservation in returned `meta.profile` and `QuestionnaireResponse.questionnaire` values;
- many-to-many fulfillment where one raw FHIR Bundle fulfills several request items;
- `fulfilled`, `partial`, `declined`, and `error` status outcomes; and
- no-selector open-ended FHIR sharing.

These examples are semantic JSON examples, not byte-exact same-device captures. A final vector set can embed one or more §16 request/response pairs inside the §8 same-device carrier, but doing so requires new generation or regeneration of fixture bytes; it should not be inferred from the current real Android capture.

### `fixtures/sample-shc/`

**Role:** SMART Health Card sample JWS material for the `application/smart-health-card` Artifact branch.

**Classification:** Semantic Artifact fixture and implementation regression material, not a same-device presentation fixture.

**Aligned with v1.0:** The directory contains signed SMART Health Card examples from the SMART Health Cards specification issuer, with wrappers of the form `{"verifiableCredential": [...]}` and decoded payloads. This aligns with the core Artifact shape for `application/smart-health-card`, where the SMART Health Check-in Artifact contains `value.verifiableCredential[]` and no outer `fhirVersion`.

**Limitations:** These samples are not CARIN insurance-card examples and are not embedded in a SMART Health Check-in response fixture. They should be cited as SHC payload-validation material only. Trust is against specification-example JWKS material and local policy, not against production issuer trust anchors.

### `fixtures/headache-summary-svgs/`

**Role:** Demonstration rendering and sample summary material.

**Classification:** Illustrative or historical application material.

**Use:** SVG or HTML summaries are not core v1.0 Artifact media types. They must not be described as SMART Health Check-in 1.0 response Artifacts unless a future registered extension media type and branded Artifact shape are defined. The core v1.0 examples use only `application/smart-health-card` and `application/fhir+json`; fixture guidance must not reintroduce `GenericArtifact` or unregistered core Artifact media types.

## D.7 Repository tests and tools that ground fixture handling

### `tools/fixtures-tool/`

**Role:** Python tooling for issuing, parsing, and validating mdoc response fixtures.

**Classification:** Implementation-regression tooling and fixture-generation support.

Important checks include:

- docType, namespace, and stable element matching;
- extraction of the SMART response from the issuer-signed element;
- recomputation of SHA-256 over the tag-24 `IssuerSignedItem` digest input;
- MSO and `issuerAuth` structure checks;
- ES256 `issuerAuth` and device-signature verification for checked-in response fixtures;
- `DeviceAuthentication` docType and `SessionTranscript` binding checks; and
- comparison of extracted SMART response JSON to expected JSON.

This tooling supports the fixture index but does not define new conformance requirements. If tooling behavior and the specification disagree, the specification controls and the tool should be updated.

### `wallet-android/app/src/test/resources/test-vectors.json`

**Role:** Android unit-test vectors generated for cross-language checks.

**Classification:** Implementation regression and conformance candidate for selected identifiers, request parsing, rejection cases, and `SessionTranscript` derivation.

**Use:** The stable identifiers and transcript examples are useful inputs for future vector promotion. The file is not, by itself, the public conformance suite; nonce choices, generated clinical payloads, and rejection cases need an explicit Appendix A mapping before promotion.

## D.8 Alignment matrix

| Fixture or example source | Current best use | v1.0 alignment | Known gaps before final vector status |
| --- | --- | --- | --- |
| `dcapi-requests/real-chrome-android-smart-checkin/` | Real-platform request byte ladder and diagnostics | Same-device `org-iso-mdoc` carrier, identifiers, `requestInfo`, `encryptionInfo`, transcript, optional readerAuth | Clinical request uses legacy nested questionnaire shape and non-§16 example content; demo origin/trust/key details must be frozen or excluded |
| `responses/real-chrome-android-smart-checkin/` | End-to-end response opening, mdoc proof walk, digest and device-auth checks | Direct `dcapiResponse`, HPKE, `DeviceResponse`, issuer-signed SMART response element, core raw FHIR Artifact shapes | Paired with legacy request; clinical body is not final §16 content; trust policy and deterministic comparison targets not frozen |
| `dcapi-requests/ts-smart-checkin-basic/` | Generated request construction without readerAuth | Same-device wrapper and request carrier | Legacy questionnaire selector; needs regeneration from final example content |
| `dcapi-requests/ts-smart-checkin-readerauth/` | Optional readerAuth byte binding | Same-device wrapper, readerAuth over exact transcript and tag-24 `ItemsRequest` | Legacy questionnaire selector; demo reader trust only |
| `responses/pymdoc-minimal/` | Minimal response substructure and digest-boundary walk | SMART response in issuer-signed stable element; raw FHIR Artifact with `fhirVersion`; digest boundary | No DC API wrapper, HPKE, origin, paired request, or §16 semantics |
| `sample-shc/` | SHC Artifact payload verification | `value.verifiableCredential[]` material for `application/smart-health-card` | Not a same-device fixture; not embedded in SMART Health Check-in request/response; no insurance-card SHC sample |
| `captures/2026-04-30-mattr-safari-org-iso-mdoc/` | Historical ecosystem envelope evidence | Direct mdoc envelope shape only | mDL docType/namespace, external verifier, UA-spoof capture; not SMART Health Check-in |
| `headache-summary-svgs/` | Illustrative application output | None for core v1.0 Artifact media types | SVG/HTML are not core Artifacts; extension work would be future work |
| §16 worked examples | Final semantic JSON examples | Current canonical clinical model: flattened Questionnaire selectors, additive profiles, canonical `|version`, core media types, statuses | Not byte-exact; require generated same-device wrappers if used as example vectors |

## D.9 Recommended final example-vector set

A final public example-vector set should be small, named, and explicitly mapped to §16 and Appendix A. The following set can be generated from existing code and captures without inventing a new protocol layer:

1. **`same-device-request-basic`** — Byte-exact `DeviceRequest`, `encryptionInfo`, and `SessionTranscript` carrying a final §16 request that has no `readerAuth`. Validation target: request wrapper, docType, namespace, stable element, `requestInfo` key, flattened selectors, exact `encryptionInfo` base64url spelling, and transcript bytes.
2. **`same-device-request-readerauth`** — Same as the basic request, with optional per-`DocRequest.readerAuth`. Validation target: tag-24 `ItemsRequest` boundary, detached `ReaderAuthenticationBytes`, ES256 protected header, x5chain location, and policy-neutral cryptographic validity.
3. **`same-device-response-minimal`** — A deterministic or structure-exact response carrying the minimal raw FHIR JSON Artifact. Validation target: issuer-signed element carrier, tag-24 value-digest input, MSO digest binding, `issuerAuth`, device authentication, and §6 response validation.
4. **`same-device-end-to-end-mixed`** — A paired request/response generated from §16.4 after fixture regeneration. Validation target: HPKE open using the paired request's transcript, extraction of the SMART response from the stable issuer-signed element, `requestId` match, every `fulfills[]` reference, media-type acceptance for every edge, `fhirVersion`, and complete `requestStatus[]` coverage.
5. **`semantic-shc-artifact`** — A non-mdoc semantic vector showing an `application/smart-health-card` Artifact with `value.verifiableCredential[]`. Validation target: wrapper shape, absence of outer `fhirVersion`, and independent SMART Health Card signature validation against test/example issuer material.
6. **`negative-non-smart-mdoc`** — A rejection vector for a direct mdoc request or response that does not use the SMART Health Check-in docType, namespace, or stable element. Validation target: rejection before treating arbitrary mdoc content as SMART Health Check-in.

Items 1–4 are future fixture-regeneration work unless the current checked-in bytes are refreshed to embed the final §16 JSON. Items 5–6 can be assembled from existing semantic and negative material but still need explicit expected outcomes.

## D.10 Refresh and promotion checklist

A fixture should be refreshed, reclassified, or demoted when any of the following changes:

1. the §8 same-device byte ladder, including request carrier, tag-24 boundaries, `SessionTranscript`, HPKE `info`, response carrier, or stable identifiers;
2. the SMART request or response JSON embedded in a byte fixture;
3. the §16 worked examples used as semantic sources;
4. JSON Schema rules for flattened Questionnaire selectors, `profilesFrom[]`, canonical `|version` preservation, status coverage, or concrete Artifact media types;
5. CDDL or diagnostic notation for `DeviceRequest`, `ItemsRequest`, `encryptionInfo`, `dcapiResponse`, `IssuerSignedItem`, MSO, or `DeviceAuthentication`;
6. readerAuth generation, certificate evidence, x5chain placement, or trust-policy wording;
7. HPKE, COSE, CBOR, pyMDOC-CBOR, TypeScript, Kotlin, or browser/Credential Manager behavior that changes bytes or decoded structure;
8. a decision to freeze or not freeze nonce size, digestID conventions, deterministic CBOR map ordering, duplicate-key handling, or deterministic ECDSA behavior;
9. a decision to promote a diagnostic capture into a conformance vector; or
10. discovery of PHI, secrets, production trust material, inappropriate source metadata, or stale demo keys.

Promotion from diagnostic or historical status to conformance-vector status should identify:

- the exact fixture directory and files under test;
- whether the comparison is byte-exact, structure-exact, semantic, or diagnostic-only;
- the specific section or Appendix A rule exercised;
- the expected validation outcome;
- all test-only keys, certificates, JWKS, origins, nonces, and trust anchors needed to reproduce validation;
- whether clinical content is synthetic and whether any real-person data is present;
- whether the fixture is stable across tool versions; and
- who owns regeneration when the specification or tooling changes.
