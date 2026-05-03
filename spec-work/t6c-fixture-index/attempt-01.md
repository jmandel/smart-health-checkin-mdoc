# Appendix D: Test vectors and fixture index

This appendix is informative. It indexes checked-in fixture material and describes how future example vectors can be aligned with the version 1.0 SMART Health Check-in specification. It does not define a new protocol layer, does not add conformance obligations beyond the referenced normative sections, and does not make every checked-in byte string a conformance oracle.

SMART Health Check-in 1.0 has two normative layers relevant to fixtures:

1. the transport-neutral SMART request and SMART response JSON model in §§5-6; and
2. the direct same-device `org-iso-mdoc` presentation flow in §8.

Direct same-device `org-iso-mdoc` is the only normative live presentation fixture class for version 1.0. QR, NFC, deep-link, kiosk, pointer, relay, submission, and completion-screen material can be useful as historical captures, demos, deployment-local traces, or future-work evidence, but it is not SMART Health Check-in 1.0 protocol fixture material unless it lands on and preserves the §8 same-device flow.

## D.1 Fixture classes and comparison modes

Fixture manifests should identify both the fixture class and the comparison mode. The categories below are intentionally separate so that implementers do not mistake a diagnostic capture or semantic example for a byte-exact conformance vector.

| Class | Use | Typical comparison mode |
| --- | --- | --- |
| **Byte-exact fixture** | Establishes an exact serialized byte boundary such as `DeviceRequest`, tag-24 `ItemsRequest`, `encryptionInfo`, `SessionTranscript`, `dcapiResponse`, `DeviceResponse`, tag-24 `IssuerSignedItem`, or value-digest input. | Compare exact bytes, hex, base64url-without-padding, and SHA-256 values named by the fixture. |
| **Structural fixture** | Demonstrates valid object shape without freezing every nondeterministic byte, such as CBOR maps containing ECDSA signatures, generated nonces, or certificate dates. | Decode and compare required fields, labels, identifiers, algorithms, and validation results. |
| **Semantic example** | Shows a SMART request/response pair for a clinical scenario from §16. | Validate under §§5-6, Appendix B, Appendix H guidance, and §6.6 cross-validation; do not compare presentation bytes. |
| **Diagnostic trace** | Supports debugging across implementations or platforms, including decoded inspection reports, verifier reports, and byte-walk logs. | Human or tool-assisted inspection; comparison scope is listed in the manifest. |
| **Historical archive** | Retains older, external, or pre-rebase behavior as evidence. | Not a current conformance oracle; use only for regression context or negative tests when explicitly labeled. |
| **Implementation regression** | Tests one repository implementation or cross-language adapter. | Compare whatever that implementation's test names; do not publish as a universal vector without promotion review. |
| **Conformance-candidate vector** | Material that can become a public pass/fail vector after the specification freezes section references, byte boundaries, inputs, expected outputs, trust assumptions, and privacy labels. | Explicitly declared by a fixture profile; may be byte-exact, structural, semantic, or a layered combination. |

A final fixture entry should state: class, comparison mode, target role, section references, expected result, whether the material is synthetic, whether PHI is absent, whether private keys are intentionally public test keys, whether certificates or issuer evidence are demo/self-signed/test-only, and whether production trust is out of scope.

## D.2 Proposed fixture index structure

The checked-in repository can continue to keep implementation-owned paths, but the published index should group material by purpose. A future publication package can either preserve the current paths or mirror them under a generated index such as:

```text
fixtures/
  conformance-candidates/
    same-device-mdoc-v1/
      request-basic/
      request-readerauth/
      response-minimal/
      end-to-end-android-demo/
  byte-exact/
    request/
    transcript/
    response/
  structural/
    cbor-mdoc/
    smart-json/
  semantic-examples/
    section-16-1-insurance-card-only/
    section-16-2-us-core-summary/
    section-16-3-inline-questionnaire/
    section-16-4-mixed-bundle/
    section-16-5-status-outcomes/
    section-16-6-no-selectors/
  diagnostic-traces/
    real-platform/
    verifier-reports/
  historical-archives/
    external-mdoc/
    pre-rebase/
  implementation-regression/
    android/
    typescript/
```

The index should also allow existing roots to remain addressable, because current tests and tools already use paths under `fixtures/dcapi-requests/`, `fixtures/responses/`, and `wallet-android/app/src/test/resources/`.

## D.3 Current checked-in same-device fixture roots

### D.3.1 `fixtures/dcapi-requests/ts-smart-checkin-basic/`

**Purpose:** generated TypeScript request material for the core same-device request shape without `readerAuth`.

**Likely classification:** diagnostic request fixture and conformance candidate for basic verifier request construction after the SMART JSON is regenerated to match the final §16 and §5 selector canon.

**Key byte boundaries and files:**

- `request.json` and `navigator-credentials-get.arg.json`: Digital Credentials API request views containing `protocol: "org-iso-mdoc"`, `data.deviceRequest`, and `data.encryptionInfo`.
- `device-request.b64u` and `device-request.cbor.hex`: complete encoded `DeviceRequest` bytes.
- `encryption-info.b64u` and `encryption-info.cbor.hex`: transcript-bound `encryptionInfo` bytes and exact base64url spelling.
- `inspection.json`: decoded request inspection.
- `smart-request.expected.json`: SMART request extracted from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: test-only HPKE material.

**Caveats:** the current `smart-request.expected.json` uses a legacy nested `questionnaire` shape. It is useful as a request-byte fixture for the checked-in implementation, but it is not final §5/§16 canonical SMART request content until regenerated with flattened `content.kind = "questionnaire"` plus sibling `canonical` and/or `resource` members. The included private key is intentionally public fixture material only.

### D.3.2 `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`

**Purpose:** generated TypeScript request material for the same-device request with optional per-`DocRequest.readerAuth`.

**Likely classification:** diagnostic request fixture and conformance candidate for optional reader-authentication structure, detached-payload binding, and transcript inputs. It is not a production reader-trust vector.

**Key byte boundaries and files:**

- All basic request files from D.3.1.
- `items-request-tag24.cbor`: exact tag-24 `ItemsRequest` bytes used in `ReaderAuthenticationBytes`.
- `session-transcript.cbor`: exact direct `dcapi` `SessionTranscript` bytes.
- `reader-auth.cbor`: detached `COSE_Sign1` reader authentication.
- `reader-certificate.der` and `reader-public.jwk.json`: demo reader material.
- `inspection.json`: decoded readerAuth properties.

**Caveats:** `readerAuth` is optional in the core profile unless a deployment profile requires it. This fixture can test syntax and cryptographic binding, but it does not establish accepted reader trust anchors, revocation policy, production certificate profiles, or organization display rules. Its SMART request content also needs final selector regeneration before promotion.

### D.3.3 `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`

**Purpose:** real Chrome/Android Credential Manager request capture using demo data. It demonstrates that the current Android path carries the SMART request through `ItemsRequest.requestInfo`, preserves the exact `encryptionInfo` base64url string, carries `readerAuth`, and produces the direct `dcapi` transcript input for origin `http://127.0.0.1:3010`.

**Likely classification:** diagnostic real-platform capture, historical capture, and conformance candidate for named request/transcript checks after regeneration and policy freeze.

**Key byte boundaries and files:**

- `credential-manager-request.json`, `request.json`, and `navigator-credentials-get.arg.json`: platform and web request wrappers.
- `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, and `device-request.diag`: complete `DeviceRequest` bytes and diagnostics.
- `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request.decoded.json`, `items-request-tag24.cbor`, and `items-request-tag24.cbor.hex`: decoded and tag-24 request boundaries.
- `request-info.json`, `requested-element.txt`, `smart-request.raw.json`, `smart-request.json`, `smart-request.hydrated.json`, and `smart-request.expected.json`: SMART request extraction and comparison material.
- `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, and `encryption-info.diag`: `encryptionInfo` bytes and exact base64url spelling.
- `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.diag`: direct `dcapi` transcript material.
- `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, and `reader-auth-detached-payload.cbor.hex`: reader-authentication material.
- `recipient-public.jwk.json` and `recipient-private.jwk.json`: paired test-only HPKE recipient material for offline response opening.
- `metadata.json`, `inspection.json`, and `request-artifacts.json`: capture context and decoded inspection.

**Caveats:** the capture uses synthetic/demo clinical data and intentionally public test material. Incidental localhost origin, package name, timestamps, nonce values, demo certificates, and debug-bundle details are not core protocol requirements. The current SMART request contains a legacy nested `questionnaire` member and should be treated as pre-final clinical JSON until regenerated.

### D.3.4 `fixtures/responses/pymdoc-minimal/`

**Purpose:** independently generated minimal mdoc response material for walking issuer-signed SMART response carriage, tag-24 digest inputs, MSO contents, `issuerAuth`, and decoded document structure without requiring a live platform capture.

**Likely classification:** diagnostic response byte-walk fixture and conformance candidate for response substructure and value-digest boundaries.

**Key byte boundaries and files:**

- `smart-response.json` and `input.json`: SMART response/input material.
- `issuer-signed-item.cbor`, `issuer-signed-item.cbor.hex`, and `issuer-signed-item.diag`: untagged `IssuerSignedItem`.
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, and `issuer-signed-item-tag24.diag`: exact tag-24 item bytes.
- `value-digest-input.cbor`, `value-digest-input.cbor.hex`, and `value-digest-input.diag`: digest-input oracle; this should match the tag-24 item bytes.
- `mso.cbor`, `mso.cbor.hex`, `mso.diag`, `mso-tag24.cbor`, `mso-tag24.cbor.hex`, and `mso-tag24.diag`: MSO material.
- `issuer-auth.cbor`, `issuer-auth.cbor.hex`, and `issuer-auth.diag`: issuer authentication.
- `document.cbor`, `document.cbor.hex`, and `document.diag`: document-level mdoc structure.
- `expected-walk.json` and `manifest.json`: expected inspection and fixture context.

**Caveats:** this root does not exercise the Digital Credentials API result wrapper, HPKE `dcapiResponse`, live origin binding, or response opening. ECDSA signatures and other fields can be nondeterministic, so conformance checks should compare only explicitly declared stable bytes, digests, and decoded fields unless a fixture profile freezes deterministic signing.

### D.3.5 `fixtures/responses/real-chrome-android-smart-checkin/`

**Purpose:** real Android Wallet response artifacts paired with `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`. It demonstrates the complete same-device response path: Digital Credentials API result, CBOR `dcapiResponse`, HPKE fields, HPKE-opened `DeviceResponse`, issuer-signed SMART response item, MSO digest binding, device authentication, and extracted SMART response JSON.

**Likely classification:** diagnostic real-platform response capture, historical capture, and conformance candidate for named end-to-end checks after the paired request, trust assumptions, and final SMART example content are frozen.

**Key byte boundaries and files:**

- `wallet-response.digital-credential.json`, `credential.json`, and `submit.json`: Digital Credentials API result and demo submission views.
- `dcapi-response.cbor`, `dcapi-response.cbor.hex`, and `dcapi-response.cbor.b64u`: direct response envelope `["dcapi", {"enc": bstr, "cipherText": bstr}]`.
- `hpke-enc.bin`, `hpke-enc.bin.hex`, `hpke-enc.bin.b64u`, `hpke-ciphertext.bin`, `hpke-ciphertext.bin.hex`, and `hpke-ciphertext.bin.b64u`: HPKE `enc` and ciphertext boundaries.
- `device-response.cbor`, `device-response.cbor.hex`, and `device-response.cbor.b64u`: HPKE plaintext `DeviceResponse`.
- `issuer-signed-item-tag24.cbor`, `issuer-signed-item-tag24.cbor.hex`, `issuer-signed-item-tag24.cbor.b64u`, `value-digest.bin`, `value-digest.bin.hex`, and `value-digest.bin.b64u`: stable element and value-digest boundary.
- `mso.cbor`, `mso.cbor.hex`, `mso.cbor.b64u`, `issuer-auth.cbor`, `issuer-auth.cbor.hex`, and `issuer-auth.cbor.b64u`: issuer proof material.
- `device-authentication.cbor`, `device-authentication.cbor.hex`, `device-authentication.cbor.b64u`, `session-transcript.cbor`, `session-transcript.cbor.hex`, and `session-transcript.cbor.b64u`: device-authentication context.
- `smart-response.raw.json`, `smart-response.json`, and `smart-response.expected.json`: extracted SMART response material.
- `dcapi-response-inspection.json`, `response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, and `pymdoc-byte-check.json`: decoded inspections, HPKE-open reports, and mdoc byte checks.
- `metadata.json`: capture context and pairing metadata.

**Caveats:** this fixture proves the active Android demo response shape, not production issuer trust or clinical-source provenance. It must be paired with the request fixture and the intentionally public test-only HPKE private JWK. The extracted SMART response is useful for response validation, but it should be regenerated to align with final §16 examples, synthetic names, flattened Questionnaire selectors, versioned canonical preservation, and any final clinical example choices.

### D.3.6 `wallet-android/app/src/test/resources/test-vectors.json`

**Purpose:** Android unit-test resource generated from TypeScript protocol code. It records active identifiers, generated request vectors, a negative non-SMART mdoc vector, and `SessionTranscript` vectors for cross-language checks.

**Likely classification:** implementation regression and conformance candidate for identifiers, request parsing, rejection of non-SMART mdoc material, and transcript derivation.

**Key byte boundaries and fields:**

- `doctype`, `namespace`, `responseElement`, and `requestInfoKey`: active §8 identifiers.
- `requestVectors[].smartRequestJson` and `requestVectors[].deviceRequestHex`: generated request vectors.
- `rejectionVectors[]`: negative/non-SMART mdoc material, including Mattr mDL capture material.
- `sessionTranscriptVectors[]`: `origin`, `encryptionInfoHex`, exact `encryptionInfoBase64Url`, and `sessionTranscriptHex`.

**Caveats:** current generated request vectors include legacy nested `questionnaire` shapes. Treat them as implementation regression material until regenerated from the final request model.

### D.3.7 Historical and external captures

`fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/` and `fixtures/dcapi-requests/negative-mattr-mdl/` preserve external Mattr direct mdoc material that uses mDL `docType` and namespace values rather than SMART Health Check-in identifiers. These files are useful as historical evidence of direct `org-iso-mdoc` envelope shape and as negative fixtures proving that non-SMART mdoc requests are not SMART Health Check-in requests.

They are not SMART Health Check-in 1.0 positive protocol fixtures. They should remain under historical or negative classification unless a future document explicitly reclassifies a narrow byte boundary, such as generic direct mdoc wrapper behavior, without implying acceptance of the mDL clinical or identity semantics.

## D.4 Required byte-boundary ladder for same-device vectors

A complete same-device vector can be organized as a ladder. Each rung should name the file that contains the exact bytes or the decoded inspection result. Existing fixtures cover many, but not all, of these rungs.

| Rung | Boundary | Existing file examples | Validation purpose |
| --- | --- | --- | --- |
| 1 | SMART request JSON text | `smart-request.expected.json`, `smart-request.raw.json`, `smart-request.json` | Validate §5, final selector shape, media types, canonical `|version` preservation, and absence of requester identity metadata. |
| 2 | `ItemsRequest` logical value | `items-request.decoded.json`, `items-request.diag` | Confirm `docType`, namespace, stable element, `intentToRetain`, and `requestInfo` carrier key. |
| 3 | tag-24 `ItemsRequest` bytes | `items-request-tag24.cbor`, `items-request-tag24.cbor.hex` | Byte input for `ReaderAuthenticationBytes`; confirms tag-24 boundary. |
| 4 | complete `DeviceRequest` bytes | `device-request.cbor`, `device-request.cbor.hex`, `device-request.b64u` | Confirms `DeviceRequest.version` `"1.0"`, `docRequests[]`, and optional per-`DocRequest.readerAuth`. |
| 5 | Digital Credentials request argument | `navigator-credentials-get.arg.json`, `request.json`, `credential-manager-request.json` | Confirms `protocol: "org-iso-mdoc"`, unpadded base64url fields, and no alternate request carrier. |
| 6 | `encryptionInfo` bytes and exact base64url string | `encryption-info.cbor`, `encryption-info.cbor.hex`, `encryption-info.b64u`, `encryption-info.diag` | Confirms direct `"dcapi"` shape, nonce, P-256 recipient public key, and exact transcript string input. |
| 7 | `SessionTranscript` bytes | `session-transcript.cbor`, `session-transcript.cbor.hex`, `session-transcript.diag` | Confirms `CBOR([null, null, ["dcapi", SHA-256(CBOR([encryptionInfoBase64Url, origin]))]])`. |
| 8 | optional `readerAuth` | `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor` | Confirms detached `COSE_Sign1`, ES256, payload `null`, x5chain label `33`, and binding to transcript plus tag-24 `ItemsRequest`. |
| 9 | SMART response JSON text | `smart-response.expected.json`, `smart-response.raw.json`, `smart-response.json` | Validate §6, §6.6 cross-checks against the original request, core Artifact media types, `fhirVersion`, SHC wrapper rules, and statuses. |
| 10 | tag-24 `IssuerSignedItem` bytes | `issuer-signed-item-tag24.cbor`, `.hex`, `.b64u` | Confirms stable element `smart_health_checkin_response` and digest input boundary. |
| 11 | MSO value digest | `value-digest.bin`, `value-digest.bin.hex`, `value-digest-input.cbor` | Confirms SHA-256 over the complete tag-24 `IssuerSignedItem` bytes. |
| 12 | MSO and `issuerAuth` | `mso.cbor`, `mso-tag24.cbor`, `issuer-auth.cbor`, diagnostics | Confirms `docType`, digest algorithm, device key, and issuer signature shape under demo/test trust material. |
| 13 | `DeviceAuthentication` and device signature | `device-authentication.cbor`, `pymdoc-byte-check.json` | Confirms device-authentication payload uses the same `SessionTranscript`, `docType`, and tag-24 `DeviceNameSpaces`. |
| 14 | `DeviceResponse` plaintext | `device-response.cbor`, `device-response.cbor.hex`, `document.cbor` | Confirms document shape, status, namespace, issuer-signed item, and device-signed container. |
| 15 | HPKE fields | `hpke-enc.bin`, `hpke-ciphertext.bin`, `.hex`, `.b64u` | Confirms response encryption artifacts; HPKE open uses `info = SessionTranscript` and empty AAD. |
| 16 | `dcapiResponse` | `dcapi-response.cbor`, `.hex`, `.b64u` | Confirms direct response wrapper and base64url result payload. |
| 17 | Digital Credentials result | `wallet-response.digital-credential.json`, `credential.json` | Confirms returned `protocol` and `data.response` wrapper. |
| 18 | Verification report | `hpke-opened-response-inspection.json`, `opened-response-inspection.json`, `response-inspection.json`, `pymdoc-byte-check.json` | Confirms layered decoding, HPKE opening, mdoc validation, digest matching, device proof, SMART extraction, and request-aware validation. |

A conformance-candidate vector does not need every rung, but it should explicitly list the rungs it covers and the rungs it intentionally omits.

## D.5 Alignment with §16 worked examples

Section 16 examples are semantic examples first. They should be the source for future SMART JSON example vectors, and selected examples can later be embedded into same-device mdoc byte vectors. The table below maps each §16 example to fixture candidates without requiring new live captures.

| §16 example | Semantic vector candidate | Same-device fixture candidate | Notes |
| --- | --- | --- | --- |
| §16.1 Insurance-card-only check-in | `semantic-examples/section-16-1-insurance-card-only/request.json` and `response.json` | Request-only byte vector using `ts-smart-checkin-basic` structure; optional full response vector with `application/smart-health-card` Artifact | Exercises CARIN Coverage selector, SHC preferred in `accept[]`, core SHC Artifact shape, and no outer `fhirVersion`. Existing checked-in request/response fixtures currently use raw FHIR for insurance; regenerate rather than reinterpret. |
| §16.2 US Core summary check-in | Semantic request/response JSON pair | Request-only and response structural vector | Exercises `profilesFrom[]` array, additive exact `profiles[]` plus profile-family semantics, `resourceTypes[]`, raw FHIR Bundle, `fhirVersion`, and versioned `meta.profile` preservation. |
| §16.3 Inline questionnaire pre-visit intake | Semantic request/response JSON pair | Request byte vector after regeneration; optional response byte vector | Exercises flattened `questionnaire` selector with sibling `canonical` and `resource`, structured canonical `|version` handling, and `QuestionnaireResponse.questionnaire` preservation. This should replace legacy nested questionnaire fixtures before promotion. |
| §16.4 Mixed bundle | Semantic request/response JSON pair | Full response structural vector using one `application/fhir+json` Artifact fulfilling multiple items | Exercises many-to-many fulfillment, media-type acceptance across all fulfilled items, Coverage plus clinical history plus intake, and raw FHIR patient-mediated provenance caveats. |
| §16.5 Per-item declined / partial / error | Semantic request/response JSON pair and negative/edge validation cases | Structural response vector; no live capture required | Exercises `requestStatus[]` coverage, `partial`, `declined`, and `error` outcomes, optional `message` privacy, and status-to-Artifact consistency. |
| §16.6 No selectors | Semantic request/response JSON pair | Request-only byte vector if broad-request handling needs platform regression coverage | Exercises `content.kind = "fhir.resources"` with no `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`, broad Holder-facing explanation, and raw FHIR `fhirVersion`. |

For final publication, each semantic example should be validated independently as JSON before any byte fixture wraps it. A byte fixture that embeds a §16 example should list the source example, its exact JSON serialization, and whether byte comparison is over that serialization or only over decoded JSON semantics.

## D.6 Validation checklist for promoted vectors

Before a checked-in fixture is promoted to a conformance-candidate or conformance vector, its manifest should answer the following checklist.

### D.6.1 Clinical JSON checks

- The SMART request has `type: "smart-health-checkin-request"`, `version: "1"`, a non-empty `id`, and `items[]` following §5.
- Request items have unique `id` values, Holder-facing `title`, a `content` selector, and non-empty `accept[]`.
- `profilesFrom` is an array of canonical profile-family URLs, not a string, object, package descriptor, local topic, or registry alias.
- `profiles[]` and `profilesFrom[]` are treated as additive profile selectors; `resourceTypes[]` is a separate FHIR resource-type constraint.
- Questionnaire selectors use the flattened shape: `content.kind = "questionnaire"` with sibling `canonical` and/or `resource`; no nested `questionnaire` member appears in final positive vectors.
- Canonical `|version` values are parsed structurally for resolution while preserving the original wire string in returned `meta.profile`, `QuestionnaireResponse.questionnaire`, logs, diagnostics, and fixture comparisons where applicable.
- Request `accept[]` values and response Artifact `mediaType` values use only core media types or explicitly registered/profilled extensions; version 1.0 core vectors use `application/fhir+json` and/or `application/smart-health-card`.
- `application/fhir+json` Artifacts include `fhirVersion` and FHIR JSON `value` content.
- `application/smart-health-card` Artifacts include `value.verifiableCredential[]` and no outer Artifact-level `fhirVersion`.
- There is no `GenericArtifact` fallback or unbounded generic `value`/`url`/`data` carrier for unknown media types.
- `requestId` exactly matches the original request `id`.
- Every `fulfills[]` value resolves to a request item and every fulfillment edge uses a media type accepted by that item.
- `requestStatus[]` covers every request item exactly once and uses only version 1.0 status codes unless a named extension vector is being tested.

### D.6.2 Same-device mdoc checks

- The Digital Credentials protocol is `org-iso-mdoc`.
- `DeviceRequest.version` is `"1.0"`; the core vector does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the reader-authentication mechanism.
- `ItemsRequest` is tag-24 wrapped when placed in `DocRequest.itemsRequest`.
- `ItemsRequest.docType` is `org.smarthealthit.checkin.1`.
- `ItemsRequest.nameSpaces["org.smarthealthit.checkin"]` requests only the stable `smart_health_checkin_response` element for the core response carrier.
- The SMART request is carried only as a CBOR text string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
- `encryptionInfo` has the direct `"dcapi"` shape with fresh or explicitly fixture-fixed nonce bytes and a P-256 COSE_Key recipient public key.
- The `SessionTranscript` uses the exact unpadded `encryptionInfo` base64url string and the stated origin or origin-equivalent value.
- If `readerAuth` is present, it is a detached ES256 `COSE_Sign1` over tag-24 `ReaderAuthentication` bound to the same `SessionTranscript` and exact tag-24 `ItemsRequest` bytes; demo reader trust is labeled.
- The SMART response is carried only as the `elementValue` string of the issuer-signed `smart_health_checkin_response` item in namespace `org.smarthealthit.checkin`.
- The value digest is over the complete tag-24 `IssuerSignedItem` bytes.
- `issuerAuth`, MSO, digest, `DeviceAuthentication`, and device signature checks are described as structural or cryptographic validation under the stated test trust policy.
- HPKE uses DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD.
- `dcapiResponse` is CBOR `["dcapi", {"enc": bstr, "cipherText": bstr}]` and the Digital Credentials result carries it in `data.response` as unpadded base64url.

### D.6.3 Report and trust checks

- The manifest names the target role: Requester/Verifier, Wallet/Responder, Verifier-side validator, fixture author, or implementation regression.
- Expected pass/fail result is explicit, including negative vectors such as non-SMART mDL mdoc requests.
- The vector states whether comparison is byte-exact, structural, semantic, diagnostic-only, historical, or implementation-regression.
- Demo keys, demo certificates, self-signed issuer evidence, deterministic randomness, and intentionally public private keys are labeled non-production.
- The vector does not claim production origin, reader, issuer, device, patient identity, clinical-source, or EHR-ingestion trust unless the relevant policy and evidence are included and in scope.
- Verification reports distinguish transport validation, trust-policy evaluation, SMART response validation, Artifact-specific validation, and downstream clinical acceptance.

## D.7 Privacy and security handling for fixture publication

Published fixtures should use synthetic data, demo keys, and non-production trust material. Fixture authors should treat any live PHI, production private key, bearer credential, reusable request-opening material, access token, production trust anchor, unredacted crash bundle, or support export as sensitive production data rather than as ordinary fixture material.

Fixture manifests should include at least:

```json
{
  "containsPhi": false,
  "syntheticClinicalData": true,
  "privateKeys": "intentionally-public-test-fixture-only",
  "readerTrust": "demo-or-not-in-scope",
  "issuerTrust": "demo-or-not-in-scope",
  "productionUse": false
}
```

Synthetic examples should avoid embedding real patient names, member identifiers, appointment ids, access tokens, production endpoints, staff identifiers, valid bearer URLs, or production certificate subjects. If realistic FHIR content is needed, identifiers should be clearly synthetic and scoped to the fixture. Diagnostic traces should minimize plaintext SMART requests, SMART responses, raw FHIR, SMART Health Cards, Questionnaire answers, origins, package names, certificate subjects, timestamps, and validation failures unless those fields are necessary for the named validation purpose.

A fixture can include decrypted plaintext, HPKE private JWKs, or demo issuer keys only when the manifest states that the material is intentionally public test material and must never be reused in production. Fixture success does not prove clinical-source provenance for unsigned raw FHIR JSON; that provenance must come from Artifact payload evidence such as SMART Health Card signatures, accepted FHIR Provenance, source attestation, or deployment policy.

## D.8 Gaps and follow-up work

The current repository already demonstrates many same-device byte boundaries, but several gaps should be closed before final publication or conformance promotion.

1. **Regenerate SMART request fixtures for flattened Questionnaire selectors.** Current request vectors in `ts-smart-checkin-*`, the real Android request capture, and Android `test-vectors.json` include legacy nested `questionnaire` members. Positive final vectors should use the §5/§16 flattened shape.
2. **Align semantic examples with §16.** Create `request.json` and `response.json` semantic vectors for each §16 example, then decide which examples merit byte wrapping. Do not reinterpret older demo payloads as §16 examples if ids, selectors, media types, statuses, or clinical content differ.
3. **Add final `application/smart-health-card` example coverage.** Existing prominent same-device response fixtures emphasize `application/fhir+json`; §16.1 needs a semantic SHC Artifact vector with `value.verifiableCredential[]` and no outer `fhirVersion`.
4. **Add exact `canonical|version` preservation checks.** §16.2 and §16.3 include versioned canonicals; fixture reports should show preservation in `meta.profile` and `QuestionnaireResponse.questionnaire` where applicable.
5. **Add status outcome vectors.** §16.5 should become a semantic edge-case vector for `partial`, `declined`, and `error`, including safe `message` handling and request-aware `requestStatus[]` coverage checks.
6. **Separate conformance candidates from diagnostics in manifests.** Existing manifests have useful hashes and labels, but final manifests should explicitly declare class, comparison mode, section references, target role, expected result, and trust status.
7. **Freeze or defer nondeterministic byte policy.** Decide which vectors compare exact complete bytes and which compare decoded fields because of nonce, random, timestamp, certificate, or ECDSA-signature nondeterminism.
8. **Define duplicate and multi-document handling if tested.** Appendix C lists duplicate JSON/CBOR keys, multiple matching `docRequests`, multiple matching documents, duplicate stable elements, deterministic CBOR map ordering, and digestID conventions as deferred exactness issues. Fixture vectors should not make these universal pass/fail rules unless the normative text or a fixture profile does so.
9. **Promote the real Android end-to-end capture cautiously.** It is valuable proof of current platform behavior, but final conformance status needs regenerated clinical JSON, stable trust assumptions, origin policy, nonce policy, demo certificate labeling, and a documented verification report.
10. **Keep historical Mattr and kiosk/relay material out of positive v1.0 protocol fixtures.** Use them only as historical, demo, deployment-local, negative, or future-work material unless a future specification version defines a normative binding for them.
11. **Avoid production trust implications.** Demo reader certificates, demo issuer certificates, checked-in private keys, localhost origins, package names, and self-attested material must remain labeled as non-production and must not be used as production trust anchors.
12. **Document validation tooling boundaries.** Tools can run JSON Schema, FHIR-aware checks, CBOR/CDDL inspections, HPKE open, mdoc digest/device checks, and §6.6 cross-validation, but each report should state which layers were actually validated and which were out of scope.

Promotion from diagnostic or historical status to a public conformance vector should identify the exact obligations exercised, the byte or decoded fields to compare, the expected pass/fail result, the trust and privacy assumptions, and all test-only keys or certificates needed to reproduce the result.
