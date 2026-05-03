# Appendix D: Test vectors and fixture index

This appendix is informative. It indexes checked-in fixture material and explains how fixture files, semantic examples, and future conformance vectors align with the SMART Health Check-in 1.0 specification. It does not define a new protocol layer, change the clinical request or response models in §§5-6, or add requirements beyond the same-device direct `org-iso-mdoc` flow in §8.

The only live presentation fixture class for version 1.0 is the same-device direct `org-iso-mdoc` class. QR, NFC, deep-link, kiosk, relay, staff-handoff, completion-screen, OpenID4VP, and other cross-device or deployment-local materials can be retained as historical, diagnostic, or demo artifacts, but they are not SMART Health Check-in 1.0 presentation-protocol fixtures unless a future profile standardizes them. In-person implementations that use those mechanisms should treat them as ways to land the Holder on a page that runs the §8 same-device flow.

## D.1 Fixture classes and comparison modes

A fixture entry should state both its class and its intended comparison mode. A checked-in file can be useful without being a conformance oracle.

| Class | Purpose | Typical comparison mode |
| --- | --- | --- |
| **Byte-exact fixture** | Fixes a serialized byte boundary such as CBOR, tag-24 input, HPKE field, digest input, detached signature payload, or base64url wrapper spelling. | Compare the exact bytes in `.cbor`, `.bin`, `.b64u`, or `.hex` files and the corresponding SHA-256 value in the manifest. |
| **Structural fixture** | Exercises a decoded envelope or object shape without freezing every serialized byte, often because signatures, nonces, timestamps, or map ordering are intentionally variable. | Decode and inspect required fields, identifiers, carriers, algorithms, and cross-references. |
| **Semantic example** | Illustrates request and response JSON semantics, selectors, media types, statuses, and many-to-many fulfillment. | Validate as JSON against §§5-6 and Appendix B; compare meaning rather than raw JSON serialization. |
| **Diagnostic trace** | Captures implementation or platform behavior for debugging, support, byte-ladder review, or cross-library comparison. | Use sidecar inspections and diagnostic notation to locate differences; do not treat incidental platform metadata as protocol requirements. |
| **Historical archive** | Preserves older experiments, external captures, or non-SMART material that informed the profile. | Confirm expected rejection or historical context only. Do not infer current SMART Health Check-in behavior. |
| **Implementation regression** | Supports one repository implementation or cross-language test. | Run that implementation's tests; promote to public vector status only after expected inputs, outputs, and stability assumptions are documented. |
| **Conformance-candidate vector** | Material that may become a pass/fail vector after the specification freezes byte boundaries, accepted variability, trust assumptions, and expected validation outcomes. | Use the explicitly named byte-exact, structural, and semantic checks for that vector profile. |

The final public vector manifest should identify, for each entry, whether validation is byte-exact, structural, semantic, diagnostic-only, historical, implementation-regression, or conformance-candidate. It should also identify whether the fixture contains synthetic clinical data, intentionally public private keys, demo certificates, self-signed or non-production trust material, and any files that are intentionally not stable byte oracles.

## D.2 Privacy and security handling for fixtures

Published fixtures should contain only synthetic clinical content. They should not contain PHI, production secrets, bearer credentials, production issuer keys, production reader certificates, access tokens, live relay handles, real patient identifiers, or operational URLs that grant access to systems. If a capture ever contains such material, it should be redacted or excluded rather than promoted.

Test private keys can appear in fixtures only when they are intentionally public, are scoped to the fixture, unlock no PHI, and are clearly marked in `manifest.json` or `metadata.json`. Demo reader certificates, self-signed issuer material, HPKE recipient private keys, and generated device keys are non-production trust material. Successful validation against those keys proves the fixture's structure and byte binding, not production trust.

Diagnostic traces should avoid unredacted SMART requests, SMART responses, raw FHIR resources, SMART Health Card JWS values, Questionnaire answers, stack traces, local file paths, and crash bundles unless the material is synthetic and intended for publication. Status messages in negative or partial examples should avoid secrets and unnecessary clinical details.

## D.3 Relationship between §16 examples and fixture manifests

Section 16 contains semantic examples, not byte vectors. The examples illustrate the clinical JSON model and should be validated against §§5-6 and Appendix B:

- `type`, `version`, request `id`, response `requestId`, item ids, Artifact ids, and `requestStatus[]` coverage;
- `fhir.resources` selectors with `profiles[]`, `profilesFrom[]` as an array, `resourceTypes[]`, additive `profiles[]` + `profilesFrom[]` behavior, and the no-selector default;
- flattened `questionnaire` selectors with direct `canonical` and/or `resource` members and no legacy nested `questionnaire` key;
- structured canonical `|version` handling, preserving exact versioned canonical strings in `meta.profile[]` and `QuestionnaireResponse.questionnaire` when applicable;
- the two core Artifact media types, `application/smart-health-card` and `application/fhir+json`;
- SMART Health Card Artifacts with `value.verifiableCredential[]` and no outer `fhirVersion`;
- raw FHIR JSON Artifacts with `fhirVersion` and a FHIR Resource or Bundle in `value`; and
- `fulfilled`, `partial`, `declined`, `unavailable`, `unsupported`, and `error` item outcomes.

A fixture manifest can point to a §16 example by name when the fixture's SMART request or SMART response is intended to exercise the same scenario. The manifest should state whether the fixture embeds the exact §16 JSON text, a semantically equivalent normalized JSON object, or an older/stale implementation sample. Because §§5-6 do not define canonical JSON serialization, semantic example alignment should normally compare parsed JSON objects and validation results, not byte-for-byte JSON text, unless a vector profile explicitly freezes the JSON serialization used at a transport boundary.

If fixture clinical JSON is refreshed to align with §16, the refresh should keep these model decisions visible: no `GenericArtifact`, no unbounded Artifact carrier for unknown `mediaType`, no legacy nested Questionnaire selector, no singleton-string `profilesFrom`, no stripped version suffixes, and no new requester identity or relay metadata in the SMART request body.

## D.4 Same-device request fixture roots

### D.4.1 `fixtures/dcapi-requests/ts-smart-checkin-basic/`

**Purpose:** Synthetic TypeScript-generated request material for the core same-device request shape without `readerAuth`.

**Current classification:** Implementation regression and diagnostic material; conformance candidate for verifier request construction after the clinical JSON, deterministic fields, nonce assumptions, and byte boundaries are refreshed and frozen.

**Important files and boundaries:**

- `request.json` and `navigator-credentials-get.arg.json`: JSON Digital Credentials API request views.
- `device-request.b64u` and `device-request.cbor.hex`: encoded `DeviceRequest` wrapper.
- `encryption-info.b64u` and `encryption-info.cbor.hex`: transcript-bound HPKE recipient information.
- `inspection.json`: decoded request structure.
- `smart-request.expected.json`: expected SMART request extracted from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: intentionally public test HPKE material for offline checks.

**Use:** Compare the direct `org-iso-mdoc` wrapper, `DeviceRequest.version = "1.0"`, tag-24 `ItemsRequest`, `docType`, namespace, stable element, requestInfo carrier, base64url-no-padding fields, and transcript inputs. Do not infer that the demo SMART request body is the final §16 example or that the fixed nonce/key choices are production requirements.

**Known alignment issue:** Existing generated vectors may contain older questionnaire forms. Any conformance promotion should regenerate them with the flattened `questionnaire` selector and the final §16 clinical examples.

### D.4.2 `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`

**Purpose:** Synthetic TypeScript-generated request material with optional per-`DocRequest.readerAuth`.

**Current classification:** Implementation regression and diagnostic material; conformance candidate for optional reader-authentication structure and byte binding. Reader trust remains deployment policy.

**Important files and boundaries:**

- The request and `encryptionInfo` files from D.4.1.
- `items-request-tag24.cbor`: exact tag-24 `ItemsRequest` bytes used in `ReaderAuthenticationBytes`.
- `session-transcript.cbor`: transcript bytes bound into `readerAuth`.
- `reader-auth.cbor`: detached `COSE_Sign1`.
- `reader-certificate.der` and `reader-public.jwk.json`: demo reader material.
- `inspection.json`: decoded readerAuth properties, including protected algorithm `-7`, detached payload `null`, and certificate evidence where exposed.

**Use:** Verify that `readerAuth`, when present, signs `tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))` using the exact transcript and exact tag-24 `ItemsRequest` bytes. Treat the certificate as demo material and do not require all deployments to include or trust `readerAuth` unless a deployment profile does so.

**Known alignment issue:** As with the basic TypeScript root, clinical request bodies should be refreshed before promotion if they still use legacy Questionnaire selector shapes or pre-§16 example content.

### D.4.3 `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`

**Purpose:** Real Chrome/Android Credential Manager request capture using demo data. It demonstrates the current platform path for carrying a SMART request through `ItemsRequest.requestInfo`, preserving the exact `encryptionInfo` base64url string, carrying `readerAuth`, and reproducing the direct `dcapi` transcript inputs.

**Current classification:** Diagnostic real-platform capture and historical evidence; selected byte boundaries are conformance candidates only after origin, nonce, readerAuth, demo certificate, trust, and clinical payload assumptions are frozen.

**Important files and boundaries:**

- `credential-manager-request.json`, `navigator-credentials-get.arg.json`, and `request.json`: request wrapper views.
- `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, and `device-request.diag`: complete request bytes and diagnostics.
- `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request.decoded.json`, `items-request-tag24.cbor`, and `items-request-tag24.cbor.hex`: request item boundaries.
- `request-info.json`, `requested-element.txt`, `smart-request.raw.json`, `smart-request.json`, `smart-request.hydrated.json`, and `smart-request.expected.json`: SMART request extraction and semantic comparison material.
- `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, and `encryption-info.diag`: transcript-bound encryption information and exact wrapper spelling.
- `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.diag`: transcript material.
- `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, and `reader-auth-detached-payload.cbor.hex`: reader-authentication material.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: intentionally public test-only HPKE recipient material for reopening the paired response fixture.
- `metadata.json`, `inspection.json`, and `request-artifacts.json`: capture context and decoded inspection.

**Use:** Use byte-exact comparisons for named files whose SHA-256 values appear in `metadata.json`; use decoded sidecars for structural checks. Treat browser package name, localhost origin, timestamps, nonce value, certificate subject, and debug bundle layout as capture context unless a future vector profile expressly freezes them.

### D.4.4 `fixtures/dcapi-requests/negative-mattr-mdl/`

**Purpose:** Negative request material derived from an external Mattr mDL `org-iso-mdoc` capture. It is useful for proving that a matcher or handler does not accept non-SMART mdoc requests as SMART Health Check-in requests.

**Current classification:** Negative historical/diagnostic fixture and implementation regression.

**Important files and boundaries:**

- `metadata.json`: identifies the source capture and records `expectedSmartHealthCheckin: false`.

**Use:** Validate rejection or non-match behavior. This fixture is not a kiosk, cross-device, or SMART Health Check-in presentation vector. Its mDL doctype and namespace are intentionally not `org.smarthealthit.checkin.1` and `org.smarthealthit.checkin`.

## D.5 Same-device response fixture roots

### D.5.1 `fixtures/responses/pymdoc-minimal/`

**Purpose:** Minimal response material generated independently with `pyMDOC-CBOR` for walking issuer-signed SMART response carriage, tag-24 digest input, MSO contents, `issuerAuth`, and decoded document structure without a live platform capture.

**Current classification:** Diagnostic response byte-walk vector and implementation regression; conformance candidate for response substructure and value-digest boundaries if deterministic fields and expected results are frozen.

**Important files and boundaries:**

- `smart-response.json` and `input.json`: clinical response and generation input.
- `issuer-signed-item.cbor`, `.hex`, and `.diag`: untagged issuer-signed item.
- `issuer-signed-item-tag24.cbor`, `.hex`, and `.diag`: tag-24 item bytes.
- `value-digest-input.cbor`, `.hex`, and `.diag`: digest input oracle.
- `mso.cbor`, `mso-tag24.cbor`, and their `.hex` / `.diag` siblings: MSO material.
- `issuer-auth.cbor`, `.hex`, and `.diag`: issuer authentication.
- `document.cbor`, `.hex`, and `.diag`: document-level structure.
- `expected-walk.json` and `manifest.json`: expected inspection and fixture context.

**Use:** Compare the tag-24 issuer item digest input and the decoded walk. Full `document.cbor` bytes may include nondeterministic ECDSA signatures, so conformance tests should compare only explicitly stable bytes, digests, and decoded fields unless deterministic signing is fixed.

**Scope limit:** This fixture does not exercise the Digital Credentials API result wrapper, HPKE `dcapiResponse`, live origin binding, or response opening. Pair it with §8/App C response-validation logic rather than treating it as an end-to-end presentation capture.

### D.5.2 `fixtures/responses/real-chrome-android-smart-checkin/`

**Purpose:** Real Android Wallet response artifacts paired with the real Chrome/Android request capture. It demonstrates the complete same-device response path: Digital Credentials API result, CBOR `dcapiResponse`, HPKE `enc` and `cipherText`, HPKE-opened `DeviceResponse`, issuer-signed SMART response item, MSO value digest, device authentication, and extracted SMART response JSON.

**Current classification:** Diagnostic real-platform response capture and historical evidence; conformance candidate only for named end-to-end checks after the paired request, test keys, origin, trust policy, and expected validation policy are frozen.

**Important files and boundaries:**

- `wallet-response.digital-credential.json`, `credential.json`, and `submit.json`: JSON wrapper/result views.
- `dcapi-response.cbor`, `.hex`, and `.b64u`: direct response envelope.
- `hpke-enc.bin`, `hpke-ciphertext.bin`, and their `.hex` / `.b64u` siblings: HPKE fields.
- `device-response.cbor`, `.hex`, and `.b64u`: HPKE plaintext.
- `issuer-signed-item-tag24.cbor`, `.hex`, `.b64u`, `value-digest.bin`, `.hex`, and `.b64u`: issuer-signed item and digest boundary.
- `mso.cbor`, `issuer-auth.cbor`, and their `.hex` / `.b64u` siblings: issuer proof material.
- `device-authentication.cbor`, `session-transcript.cbor`, and their `.hex` / `.b64u` siblings: device-authentication context.
- `smart-response.raw.json`, `smart-response.json`, and `smart-response.expected.json`: extracted SMART response material.
- `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, and `pymdoc-byte-check.json`: decoded inspections and byte checks.
- `metadata.json`: capture context and pairing metadata.

**Use:** Pair this fixture with `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` and its intentionally public HPKE private JWK to reopen the encrypted response offline. Expected validation includes HPKE opening with `info = SessionTranscript bytes` and empty AAD, mdoc document parsing, issuerAuth verification under demo trust material, value-digest recomputation over the tag-24 item, device-signature verification against the MSO device key, extraction of the SMART response JSON from `smart_health_checkin_response`, and §6.6 cross-validation against the original SMART request.

**Caveat:** Successful mdoc, HPKE, digest, and device-authentication validation in this fixture does not prove production issuer trust and does not create clinical-source provenance for unsigned raw FHIR JSON.

## D.6 Captures, archives, and non-SMART material

### D.6.1 `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/`

**Purpose:** External Mattr Safari-branch capture showing an `org-iso-mdoc` envelope for mDL. It informed the envelope shape but does not carry SMART Health Check-in doctype, namespace, requestInfo key, or response element.

**Current classification:** Historical external capture and diagnostic archive.

**Use:** Use only for envelope research, negative matching, or historical explanation. Do not use it as a SMART Health Check-in conformance vector, and do not infer any kiosk, QR, relay, or cross-device SMART Health Check-in behavior from it.

### D.6.2 `docs/archive/`, `docs/plans/`, and historical kiosk or OID4VP material

Archived docs and plans can explain how earlier designs were replaced. They are not fixture roots for SMART Health Check-in 1.0 unless a future profile explicitly reactivates them. Kiosk, relay, pointer, submission, completion, OpenID4VP, DCQL, and `dc_api.jwt` materials should remain labeled historical, deployment-local, or future work.

## D.7 Implementation regression vectors

### D.7.1 `wallet-android/app/src/test/resources/test-vectors.json`

**Purpose:** Android unit-test resource generated from TypeScript protocol code. It records active identifiers, generated request vectors, rejection vectors, and SessionTranscript vectors for cross-language checks.

**Current classification:** Implementation regression and conformance candidate for identifiers, request parsing, rejection of non-SMART mdoc material, and SessionTranscript derivation.

**Important fields:**

- `doctype`, `namespace`, `responseElement`, and `requestInfoKey`.
- `requestVectors[].smartRequestJson` and `requestVectors[].deviceRequestHex`.
- `rejectionVectors[]`, including non-SMART mdoc material.
- `sessionTranscriptVectors[]` with `origin`, `encryptionInfoHex`, `encryptionInfoBase64Url`, and `sessionTranscriptHex`.

**Known alignment issue:** Some request vectors may still encode legacy nested Questionnaire selectors. They are useful as current implementation regression data, but they should not be promoted as public §5/§16 semantic examples until regenerated with the flattened selector shape and final example content.

## D.8 Negative vectors

Negative vectors should be explicit about the layer being tested and the expected outcome. A rejected presentation request is different from a valid presentation whose SMART response reports `declined`, `unsupported`, `unavailable`, `partial`, or `error` for one item.

Useful negative-vector categories include:

1. **Non-SMART mdoc request:** wrong `docType`, namespace, element, or missing `requestInfo["org.smarthealthit.checkin.request"]`; expected outcome is non-match or presentation rejection.
2. **Malformed request carrier:** `requestInfo` value absent, not a string, not JSON, or not a valid SMART request under §5; expected outcome is presentation rejection or safe platform failure.
3. **Clinical request validation failure:** invalid `type`, `version`, duplicate item ids, empty `accept[]`, singleton-string `profilesFrom`, legacy nested Questionnaire selector, malformed canonical, or unsupported selector; expected outcome depends on where the failure is discovered but should not fabricate fulfillment.
4. **Transcript or HPKE failure:** changed `encryptionInfo` spelling, wrong origin, wrong transcript bytes, non-empty AAD, wrong HPKE suite, or wrong private key; expected outcome is HPKE open failure or device-authentication failure.
5. **ReaderAuth failure:** detached payload mismatch, wrong tag-24 `ItemsRequest`, wrong transcript, invalid signature, or untrusted demo certificate; expected outcome should distinguish syntax, cryptographic validity, and trust policy.
6. **Response wrapper failure:** missing `dcapi` response envelope, plaintext `DeviceResponse`, wrong protocol id, or malformed base64url; expected outcome is transport rejection.
7. **mdoc response failure:** wrong `docType`, namespace, element, MSO digest, issuerAuth, device signature, or response carrier location; expected outcome is mdoc validation failure.
8. **SMART response failure:** `requestId` mismatch, unresolved `fulfills[]`, unaccepted `mediaType`, missing raw FHIR `fhirVersion`, SMART Health Card with outer `fhirVersion`, duplicate Artifact ids, or incomplete `requestStatus[]`; expected outcome is §6.6 rejection.
9. **Semantic item outcome:** valid SMART response with `declined`, `partial`, `unavailable`, `unsupported`, or `error`; expected outcome is acceptance of the response as a protocol-valid item outcome, not transport rejection.

Negative vectors should include small expected-result JSON files or manifest fields naming the expected failing layer and the expected diagnostic category. This keeps a test suite from treating all failures as interchangeable.

## D.9 Future conformance-vector manifest

A final conformance-vector bundle should have a machine-readable manifest, for example `fixtures/manifest.json` or per-vector `manifest.json` files plus an index. The manifest should avoid new protocol semantics and should instead name the existing obligations exercised. For each vector, include:

- vector id, title, class, and comparison mode;
- normative sections exercised, such as §5, §6, §8, Appendix B, Appendix C, or Appendix E;
- fixture root and files included;
- byte-exact files and expected SHA-256 values;
- structural decoded files and expected field checks;
- semantic SMART request/response JSON checks and any §16 example alignment;
- negative-vector expected outcome, if applicable;
- whether data is synthetic and whether `containsPhi` is false;
- all intentionally public private keys, demo certificates, self-signed issuer material, and non-production trust anchors;
- producer tool and version, when relevant;
- whether signatures, timestamps, nonces, CBOR map order, digestID, or JSON serialization are deterministic; and
- refresh triggers and known gaps.

A fixture should be refreshed, reclassified, or demoted when the §8 byte ladder changes; the clinical JSON examples change; the flattened Questionnaire, `profilesFrom[]`, canonical `|version`, or Artifact media-type rules change; browser or Credential Manager behavior affects wrapper shape, origin, or transcript inputs; readerAuth or trust material changes; HPKE/COSE/mdoc library behavior changes; or a review discovers PHI, non-test secrets, stale trust material, or operational metadata unsuitable for publication.

## D.10 Gaps and follow-up work

The current repository contains enough material to ground the same-device direct `org-iso-mdoc` byte boundaries, but it is not yet a complete external conformance suite. Known follow-up work includes:

1. Refresh generated request vectors so all SMART request JSON uses the final §5 shape, including flattened Questionnaire selectors, array `profilesFrom[]`, structured canonical `|version` handling, and final §16 example scenarios.
2. Decide which existing diagnostic captures, if any, become public conformance vectors, and freeze only their intended byte boundaries and semantic checks.
3. Add or generate semantic JSON examples corresponding to each §16 scenario, or state explicitly that §16 remains prose-only example material.
4. Add manifest entries that distinguish byte-exact files from structural sidecars and diagnostic traces.
5. Add negative vectors for the final invalid-shape cases most likely to regress: legacy nested Questionnaire, singleton-string `profilesFrom`, unknown `mediaType` treated as a generic Artifact, missing raw FHIR `fhirVersion`, and `requestId` / `fulfills[]` / `requestStatus[]` mismatches.
6. Keep kiosk, relay, pointer, OpenID4VP, DCQL, and external mDL archives labeled as historical, deployment-local, or future work rather than SMART Health Check-in 1.0 live protocol fixtures.
