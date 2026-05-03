# T3.B adjudication — direct `org-iso-mdoc` same-device flow

## Inputs reviewed

I reviewed the required outline, dependency, methodology, prerequisite canonical/review files, and all five T3.B attempts. I also checked active behavior in the direct mdoc profile documentation, protocol explainer, TypeScript verifier/SDK, TypeScript tests, Android test vectors, Android parser, Android readerAuth verifier, Android consent plumbing, Android SMART request adapter, Android response factory, Android mdoc responder, and Android protocol tests.

## Attempt-by-attempt assessment

### Attempt 01

**Strengths:** Most complete end-to-end normative flow. It cleanly separated SMART clinical semantics from mdoc/DC API transport; included exact identifiers, requestInfo, tag-24 ItemsRequest, v1.0 per-DocRequest `readerAuth`, SessionTranscript, HPKE, response construction, verifier processing, and extensive checklist language. It also clearly stated that transport success does not create raw-FHIR clinical-source provenance.

**Weaknesses:** It over-enumerated fixture filenames, including some names that needed confirmation against the repository. Its checklist was very long for body text and sometimes mixed conformance rows with deployment-policy reminders. It left nonce length as 16+ bytes while examples and docs often show 32 bytes, requiring adjudication.

### Attempt 02

**Strengths:** Concise and accurate on the core contradictions: request in `ItemsRequest.requestInfo`, response in `IssuerSignedItem.elementValue`, v1.0 per-DocRequest `readerAuth`, direct `dcapi` SessionTranscript, HPKE response envelope, and §6.6 response cross-validation. It used good conformance-target phrasing and avoided redefining §§5-6.

**Weaknesses:** It cited generated/deterministic fixture roots and response roots in §8.9 that needed repository confirmation. Its `intentToRetain` language was a little too strong when saying a deployment profile may require `false`; the active design says default `true` with deployment override when truly ephemeral, not a normative preference for `false` profiles.

### Attempt 03

**Strengths:** Best structural match to the outline: it separated identifiers, request construction, SessionTranscript, wallet handling, response construction, HPKE, verifier processing, checklist, and capture pointers. It explicitly deferred exact ISO/CDDL and security details to appendices and §11.

**Weaknesses:** It named fixture roots that are real, but also risked making active fixture paths appear normative. It stated “known active fixture roots” more broadly than the prompt permits unless each path is confirmed. It was less explicit than needed about distinguishing cryptographically valid-but-untrusted `readerAuth` from trusted `readerAuth`.

### Attempt 04

**Strengths:** Strongest privacy/trust framing. It avoided kiosk behavior except re-entry, kept requester identity out of the SMART request, and highlighted that `requestId` matching is not freshness or identity proof. It also included useful diagnostic/logging caution.

**Weaknesses:** It appears to put the issuer-signed response item into `DeviceNameSpaces` during response construction. Active Android response construction uses the response as an issuer-signed namespace item and normally uses an empty device-signed namespace for `DeviceAuthentication` (`SmartHealthMdocResponder.kt` lines 57-64, 79-88, 95-108). Therefore I did not adopt that wording. It also required rejection of duplicate stable elements; that may be right, but duplicate-handling belongs to Appendix C/conformance closure unless fixtures decide exact policy.

### Attempt 05

**Strengths:** Most compact and spec-ready. It preserved the active identifiers and precise request/response carriers; made the SMART request in `requestInfo` and the SMART response element value unambiguous; described v1.0 `DeviceRequest`, tag-24 wrapping, optional `readerAuth`, direct `dcapi` SessionTranscript, HPKE, and verifier processing without overloading §8 with kiosk.

**Weaknesses:** It normatively fixed `encryptionInfo` nonce at 32 bytes in one subsection, while active TypeScript enforces only a minimum of 16 bytes and defaults to 32 (`rp-web/src/protocol/index.ts` lines 272-273). It also left some verifier checks condensed and did not explicitly list all `readerAuth` trust states required by the prompt.

## Active evidence and accepted-dependency constraints

- The outline assigns §8 to the same-device `org-iso-mdoc` flow and requires requestInfo, one stable element, tag-24 wrapping, SessionTranscript, HPKE info, and verifier response checks (`spec.md.outline` lines 227-281; `spec.md.outline.dependency_tree` lines 234-250).
- The drafting methodology requires adjudication against active docs/code/fixtures rather than majority vote (`spec-work/methodology.md` lines 75-88, 139-188).
- T1/T2 architecture fixes the separation between transport-neutral SMART clinical objects and presentation transport (`spec-work/t1a-editorial-terminology/canonical.md` lines 31-35, 61-64; `spec-work/t1c-architecture-roles-flows/canonical.md` lines 11-20, 36-42).
- T1.B and T1.C make same-device direct `org-iso-mdoc` the base flow and kiosk a wrapper/re-entry flow, not a separate clinical protocol (`spec-work/t1b-purpose-scope-goals/canonical.md` lines 7-15; `spec-work/t1c-architecture-roles-flows/canonical.md` lines 71-89).
- T2.A requires the SMART request to exclude requester identity metadata and treats `purpose`, `title`, and `summary` as display context rather than authenticated identity (`spec-work/t2a-clinical-request-model/canonical.md` lines 1-8, 78-84, 100-112).
- T2.B requires `requestId` to exactly match the request `id`, but says this is not freshness, patient identity, or clinical proof (`spec-work/t2b-clinical-response-model/canonical.md` lines 33-38). T3.A reinforces this scoping (`spec-work/t3a-trust-framework/canonical.md` lines 153-158).
- T2.B requires Verifier cross-validation after response extraction: `requestId`, `fulfills[]`, media type, `requestStatus[]`, and FHIR/SHC checks (`spec-work/t2b-clinical-response-model/canonical.md` lines 348-388). The TypeScript SDK currently enforces a subset of these checks (`rp-web/src/sdk/core.ts` lines 254-292), and tests exercise response/request mismatch rejection (`rp-web/src/protocol/index.test.ts` lines 554-580).
- T3.A requires keeping origin, readerAuth, mdoc issuer/device evidence, and clinical-source provenance separate (`spec-work/t3a-trust-framework/canonical.md` lines 5-15, 53-89, 91-125, 127-149).
- Active docs identify the fixed `org-iso-mdoc` identifiers, stable response element, requestInfo carrier, HPKE suite, and ES256 COSE algorithm (`docs/profiles/org-iso-mdoc.md` lines 5-16; `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 16-38; `docs/PROTOCOL-EXPLAINER.md` lines 15-33).
- Active TypeScript constants match the identifiers (`rp-web/src/protocol/index.ts` lines 42-46), and tests assert them (`rp-web/src/protocol/index.test.ts` lines 193-199).
- Active TypeScript request construction serializes SMART JSON into `requestInfo`, requests `smart_health_checkin_response` with `true`, uses `DeviceRequest` version `"1.0"`, builds `encryptionInfo`, and optionally signs per-DocRequest `readerAuth` when origin is available (`rp-web/src/protocol/index.ts` lines 272-340, 354-388, 403-427, 445-475).
- Active docs explicitly say version `"1.0"` is used and `readerAuthAll` is not used (`docs/profiles/org-iso-mdoc.md` lines 39-76).
- Active Android parsing extracts `requestInfo["org.smarthealthit.checkin.request"]`, preserves tag-24 ItemsRequest bytes, and stores readerAuth bytes (`MdocCbor.kt` lines 226-256). Android test vectors assert the same document type, namespace, response element, and requestInfo key (`test-vectors.json` lines 1-8; `GeneratedVectorsTest.kt` lines 31-55).
- Active SessionTranscript construction is `CBOR([encryptionInfoBase64Url, origin])`, `['dcapi', sha256(...)]`, `CBOR([null, null, handover])` in docs, TypeScript, Android, and tests (`docs/profiles/org-iso-mdoc.md` lines 144-168; `rp-web/src/protocol/index.ts` lines 416-427; `DirectMdocRequest.kt` lines 120-124; `GeneratedVectorsTest.kt` lines 72-85).
- Active Android origin handling uses Credential Manager caller metadata, falls back to an `android-app:` value in the dev build, and labels this in debug state (`HandlerActivity.kt` lines 105-213). This supports a spec distinction between authenticated origin and reduced-assurance/privileged-caller states, not silent substitution from the SMART request body.
- Active readerAuth verification uses the exact SessionTranscript and ItemsRequest bytes, requires detached COSE_Sign1 with alg `-7` and x5chain, and reports present/signatureValid/certificateSubject to debug and UI (`DirectMdocRequest.kt` lines 126-144; `SmartMdocCrypto.kt` lines 108-164; `HandlerActivity.kt` lines 148-176, 431-453; UI evidence in `MainActivity.kt` lines 814-880).
- Active Android SMART request parsing and consent model validate clinical request fields and preserve item ids for UI/response accounting (`SmartRequest.kt` lines 12-38, 40-57, 92-152; `SmartRequestAdapterTest.kt` lines 10-82).
- Active Android response construction sets `requestId` from the request, builds per-item `requestStatus[]`, includes raw FHIR `fhirVersion`, then carries the SMART response as `IssuerSignedItem.elementValue` for `smart_health_checkin_response` (`SmartCheckinResponseFactory.kt` lines 13-65; `SmartHealthMdocResponder.kt` lines 36-64, 95-116).
- Active mdoc response construction signs MSO as `issuerAuth`, computes value digest over tag-24 `IssuerSignedItem`, signs `DeviceAuthentication` with SessionTranscript, uses HPKE with SessionTranscript as `info`, and wraps as `['dcapi', {'enc', 'cipherText'}]` (`SmartHealthMdocResponder.kt` lines 63-150; `SmartMdocCrypto.kt` lines 191-235; `DirectMdocProtocolTest.kt` lines 47-135).
- Active fixtures exist for generated request vectors, readerAuth vectors, real Chrome/Android request/response captures, and minimal response documents (`fixtures/dcapi-requests/ts-smart-checkin-basic/`, `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`, `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`, `fixtures/responses/pymdoc-minimal/`, `fixtures/responses/real-chrome-android-smart-checkin/`). TypeScript and Android tests cite these roots (`rp-web/src/protocol/index.test.ts` lines 345-381, 413-523; `AndroidMdocValidationFixtureTest.kt` lines 13-59).

## Contradictions resolved

1. **`requestInfo` versus dynamic element names:** I resolved in favor of `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as the only version 1.0 SMART request carrier. Active docs and constants say dynamic element-name experiments are archived (`docs/profiles/org-iso-mdoc.md` lines 298-304; `rp-web/src/protocol/index.ts` lines 1-10).
2. **Response carrier:** The SMART response is an issuer-signed mdoc element value, not `requestInfo` and not an unprotected transport field. Active docs and Android response code confirm `IssuerSignedItem.elementValue` for `smart_health_checkin_response` (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 32-38; `SmartHealthMdocResponder.kt` lines 57-64).
3. **`DeviceRequest` version:** I kept version `"1.0"` and optional per-`DocRequest.readerAuth`; `readerAuthAll` for version `"1.1"` is excluded from core behavior because active docs explicitly exclude it (`docs/profiles/org-iso-mdoc.md` lines 74-76).
4. **Core `readerAuth` policy:** `readerAuth` is optional in the core flow, but deployments may require it. Wallets/Responders must distinguish absent, syntactically invalid, cryptographically failed, cryptographically valid but untrusted, and trusted states. Active code currently exposes absent/present/signatureValid and certificate subject; §7 requires the fuller policy distinction.
5. **Origin handling:** Origin is the platform/requester origin or privileged-caller context used in the DC API invocation, not a SMART request field. If authenticated origin is unavailable, that is a reduced-assurance or failure state per §7, not a reason to copy `purpose`, URLs, or item text into the transcript.
6. **Nonce length:** I did not make 32 bytes mandatory. Active fixtures and docs show 32 bytes (`docs/profiles/org-iso-mdoc.md` lines 123-142), but active TypeScript only enforces at least 16 bytes (`rp-web/src/protocol/index.ts` lines 272-273). Canonical §8 states fresh unpredictable nonce bytes and notes that Appendix C/E or deployment profiles can tighten size for conformance vectors.
7. **`DeviceNameSpaces`:** I did not adopt wording that puts the issuer-signed response element into device-signed namespaces. Active response code signs an empty `DeviceNameSpaces` by default while issuer-signing the SMART response element (`SmartHealthMdocResponder.kt` lines 79-108; `DirectMdocProtocolTest.kt` lines 116-128).
8. **`digestID` value:** Active Android uses `digestID` 0 for the single element (`SmartHealthMdocResponder.kt` lines 57-64), but I did not make 0 a normative constant. Canonical text requires consistency between the `IssuerSignedItem.digestID` and MSO `valueDigests`, leaving exact CDDL/vector fixtures to Appendix C/D.
9. **Fixture paths:** I cite only confirmed active fixture roots in §8.9 and explicitly say Appendix D/E, not §8, own the byte ladder and fixture index.
10. **Clinical-source provenance:** I preserved the T3.A rule that successful same-device presentation, HPKE, mdoc issuer/device validation, or `requestId` match does not turn unsigned raw FHIR JSON into clinically sourced evidence.
11. **Verifier acceptance:** I required both transport/mdoc validation and §6.6 SMART response cross-validation. A valid HPKE open or mdoc signature alone is insufficient.
12. **Kiosk scope:** I kept kiosk out of §8 except a short re-entry note, because §9 owns pointer, relay, kiosk wrapper, submission encryption, and completion behavior.

## Deferred issues and downstream work

- **Appendix C CDDL:** exact map labels, duplicate document/element handling, CDDL for `ItemsRequest`, `DeviceRequest`, `ReaderAuthentication`, `DeviceResponse`, MSO subset, `DeviceAuthentication`, `encryptionInfo`, and `dcapiResponse`; precise tag-24 byte boundaries; exact nonce-size constraints if conformance fixes them.
- **Appendix D fixtures:** classify generated deterministic vectors, real Chrome/Android captures, minimal pymdoc response fixtures, readerAuth vectors, and historical captures; ensure every named path exists and is labeled as conformance vector, diagnostic, or historical capture.
- **Appendix E byte ladder:** provide the concrete byte ladder for SMART JSON serialization, tag-24 `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `dcapiInfo`, SessionTranscript, optional `ReaderAuthentication`, `IssuerSignedItem` digest, `DeviceAuthentication`, HPKE `info`, and `dcapiResponse`.
- **§11 security:** close replay/freshness expectations, origin spoofing/UI redress, reader impersonation, reduced-assurance origin UX, HPKE key reuse, plaintext logs/debug bundles, duplicate-element handling if security-sensitive, and raw-FHIR overclaiming.
- **§13 conformance/registries:** register the mdoc identifiers, define deployment profile hooks, decide whether core conformance requires authenticated origin, and decide whether 32-byte nonces or specific duplicate rejection become testable requirements.
