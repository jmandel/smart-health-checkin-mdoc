# T6.C adjudication — fixture index / final example-vector alignment

## Inputs reviewed

I reviewed all five attempts, the outline and dependency tree, `spec-work/design-notes.md`, `spec-work/methodology.md`, and the accepted prerequisite canonicals named in the task. I also inspected current fixture roots and consumers, including `fixtures/README.md`, `fixtures/dcapi-requests/*`, `fixtures/responses/*`, `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/`, `fixtures/sample-shc/`, `fixtures/headache-summary-svgs/`, `docs/PROTOCOL-EXPLAINER.md`, `docs/profiles/org-iso-mdoc.md`, `site/wire-protocol-explainer.html`, `rp-web/src/protocol/index.test.ts`, and Android test-vector resources.

## Attempt-by-attempt assessment

### Attempt 01

**Strongest contributions:** Attempt 01 provides a broad, well-structured index of active request fixtures, response fixtures, historical captures, semantic worked examples, tests/tools, an alignment matrix, and a recommended future vector set. Its treatment of `fixtures/sample-shc/` and `fixtures/headache-summary-svgs/` is especially useful because it prevents illustrative/demo payloads from becoming core v1.0 Artifact fixtures.

**Errors and omissions:** It is too directory-by-directory for final Appendix D text and includes some implementation-tool discussion that is useful for adjudication but too detailed for canonical spec prose. Its claim that the generated `ts-smart-checkin-*` fixtures still use legacy Questionnaire selectors is accurate for the committed fixture state, but final prose should express this as a follow-up gap rather than overstate the fixtures as unusable. The real Chrome/Android request and Android `test-vectors.json` also still contain legacy nested Questionnaire material.

### Attempt 02

**Strongest contributions:** Attempt 02 has the clearest taxonomy and promotion checklist. It correctly frames fixtures as informative, separates exact byte comparison from structural and semantic comparison, and gives a strong privacy/security metadata model. Its same-device byte-boundary table is a good basis for the canonical boundary guidance.

**Errors and omissions:** The proposed future directory tree is helpful as an organizational idea but should not appear as if the spec requires repository restructuring. Some fixture status claims need to distinguish current implementation-regression fixtures from future conformance-candidate vectors. The canonical should preserve its promotion criteria but avoid mandating new paths.

### Attempt 03

**Strongest contributions:** Attempt 03 is concise and polished. It clearly states that direct same-device `org-iso-mdoc` is the only v1.0 live presentation fixture class and provides a compact matrix mapping current roots, exactness level, validator checks, current status, and follow-up. Its language on privacy/security and historical kiosk/QR/relay material is well aligned with the design constraints.

**Errors and omissions:** It is too compressed to stand alone as final T6.C. It omits several verified fixture consumers and boundary details, under-specifies promotion criteria, and inherits the blanket claim that generated request fixtures still need a flattened Questionnaire refresh. The canonical needs its clarity plus the fuller boundary and promotion material from Attempts 01/02/05.

### Attempt 04

**Strongest contributions:** Attempt 04 gives the best explicit validation checklist for promoted vectors, including clinical JSON checks, same-device mdoc checks, and report/trust checks. It also has a strong mapping from §16 examples to semantic vectors and optional same-device wrapping vectors.

**Errors and omissions:** It overuses checklist language that can sound normative despite the appendix being informative. It includes many useful edge-case vector ideas, but some are future conformance-suite design rather than the current fixture index. The final canonical should retain the criteria while using descriptive/advisory wording.

### Attempt 05

**Strongest contributions:** Attempt 05 has the best byte-ladder matrix. It includes the required boundaries: SMART request, `ItemsRequest`, tag-24 `ItemsRequest`, `DeviceRequest`, Digital Credentials request argument, `encryptionInfo`, `SessionTranscript`, optional `readerAuth`, SMART response, tag-24 `IssuerSignedItem`, value digest/MSO/issuerAuth, `DeviceAuthentication`, `DeviceResponse`, HPKE fields, `dcapiResponse`, Digital Credentials result, and verification report. It also explicitly says no new live capture is needed to complete the specification text.

**Errors and omissions:** It proposes index structures that are too concrete for current publication and should be softened to avoid creating new repository layout obligations or new protocol obligations.

## Contradictions resolved

- **Whether kiosk/QR/relay material is protocol fixture material:** All attempts mostly reject a normative kiosk/cross-device fixture class, but some mention QR/kiosk material more prominently. The outline, dependency tree, T1/T3/T6.B canonicals, and design constraints control: kiosk, QR, relay, staff handoff, completion-screen, and cross-device material is historical/demo/deployment-local unless the indexed bytes are the §8 same-device direct `org-iso-mdoc` artifacts.

- **Whether current generated request fixtures are stale:** Attempts 01, 03, 04, and 05 say `ts-smart-checkin-basic` and `ts-smart-checkin-readerauth` still use the legacy nested Questionnaire selector. I verified the committed fixture copies of `fixtures/dcapi-requests/ts-smart-checkin-basic/smart-request.expected.json` and `fixtures/dcapi-requests/ts-smart-checkin-readerauth/smart-request.expected.json` still contain a nested `content.questionnaire` value. The canonical therefore treats generated TS request fixtures as implementation-regression material and conformance candidates only after regeneration for flattened Questionnaire selectors, §16 alignment, and expected reports. The real Android capture and Android test-vector resource also still carry legacy nested Questionnaire content.

- **Whether real Chrome/Android captures are conformance vectors today:** The attempts vary between “conformance candidate” and “historical/diagnostic.” I resolved this as: real-platform captures are diagnostic/historical with byte-exact subfiles that can be promoted only after explicit vector-profile review, updated clinical JSON, trust labels, and expected validation reports. Verified in `fixtures/README.md`, real capture metadata, and `rp-web/src/protocol/index.test.ts`.

- **Whether §16 examples are already fixture-grade vectors:** Attempt text sometimes implies direct vector readiness. T6.B examples are semantic prose examples. §16.1 contains a placeholder SHC JWS string, and examples use minimal synthetic FHIR snippets. They need checked-in fixture-grade synthetic payloads, validation reports, and optional same-device wrapping before conformance use.

- **Whether `sample-shc/` is an insurance-card fixture:** Attempts correctly identify it as SHC payload material, but it is not a SMART Health Check-in response fixture and not a CARIN insurance-card sample. `fixtures/sample-shc/README.md` says it contains SMART Health Cards specification examples: immunization and lab content, synthetic, verified against the spec example issuer.

- **Whether SVG/HTML demo summaries are core Artifacts:** Resolved against T2.B/T5.D: core v1.0 Artifacts are `application/smart-health-card` and `application/fhir+json`; no `GenericArtifact` is revived. `fixtures/headache-summary-svgs/` remains illustrative/demo material unless a future registered extension media type defines it.

- **Whether optional `readerAuth` is mandatory:** The fixture index may discuss `readerAuth` vectors, but T3.B/T3.D keep it optional per `DocRequest`. Generated readerAuth fixtures validate structure and binding; they do not make demo certificates trusted or make readerAuth mandatory.

## Verified current fixture and consumer facts

- `fixtures/README.md` requires no PHI promotion, `.hex`/`.diag` siblings for binary CBOR, `manifest.json`/`metadata.json`, and intentionally public test private keys only when marked and PHI-free. It names current roots `dcapi-requests/`, `responses/`, `transcripts/`, and `captures/`.
- `docs/profiles/org-iso-mdoc.md` names the active identifiers: protocol `org-iso-mdoc`, docType `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, requested element `smart_health_checkin_response`, SMART request carrier `ItemsRequest.requestInfo`, HPKE suite DHKEM(P-256, HKDF-SHA256)/HKDF-SHA256/AES-128-GCM, and ES256 COSE signatures.
- `docs/PROTOCOL-EXPLAINER.md` says active SMART request JSON is carried at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, and its debug-artifact list includes request wrapper, `DeviceRequest`, `ItemsRequest`, `request-info.json`, `encryption-info.cbor`, `session-transcript.cbor`, `wallet-response.digital-credential.json`, `dcapi-response.cbor`, `device-response.cbor`, `smart-request.json`, `smart-response.json`, `pymdoc-byte-check.json`, and `verification-report.json`.
- `rp-web/src/protocol/index.test.ts` rejects legacy nested Questionnaire selectors, confirms active constants, inspects the Mattr mDL capture as non-SMART, inspects the real Chrome/Android SMART request, checks `dcapiResponse`, opens/inspects `pymdoc-minimal` and real Android `DeviceResponse` fixtures, and HPKE-opens the real Android response with the paired private JWK and `SessionTranscript`.
- `fixtures/dcapi-requests/ts-smart-checkin-basic/smart-request.expected.json` and `fixtures/dcapi-requests/ts-smart-checkin-readerauth/smart-request.expected.json` are generated same-device request fixtures, but their committed SMART request JSON still uses the legacy nested Questionnaire selector shape and should be regenerated before promotion.
- `fixtures/dcapi-requests/real-chrome-android-smart-checkin/metadata.json` records `containsPhi: false`, local origin, Chrome package context, `readerAuth`, and an intentionally public test-only HPKE private JWK. The request body still contains a legacy nested `content.questionnaire` object.
- `fixtures/responses/real-chrome-android-smart-checkin/metadata.json` records `containsPhi: false`, pairing to the real request fixture, `dcapiResponse`, HPKE-open material, readerAuth status, and hashes for response byte boundaries.
- `fixtures/responses/pymdoc-minimal/manifest.json` records `containsPhi: false`, active docType/namespace/element/protocol, pyMDOC-CBOR source, hashes, and that `value-digest-input.cbor` is the exact tag-24 issuer item digest input while `document.cbor` may contain nondeterministic ECDSA signature bytes.
- `wallet-android/app/src/test/resources/test-vectors.json` includes active identifiers, generated request vectors, rejection vectors, and `SessionTranscript` vectors; its generated request JSON still includes a legacy nested Questionnaire shape and should be regenerated before promotion.

## Follow-up gaps for T6.C and fixture work

1. Create checked-in semantic JSON vector files derived from §16.1-§16.6, with expected §5, §6, and §6.6 validation reports.
2. Replace placeholder SHC JWS strings and minimal FHIR snippets in §16-derived vectors with fixture-grade synthetic payloads; preserve `canonical|version` strings exactly where examples rely on them.
3. Regenerate or refresh real Android request/response captures after the clinical request schema and example payloads are stable, especially to eliminate legacy nested Questionnaire selectors and align with §16. A future Android capture would be useful for diagnostics and platform regression, but it is not required to complete the informative specification text.
4. Decide which same-device vector fields are byte-exact and which are structural because of nonce, signature, timestamp, certificate, key, map-order, or platform nondeterminism.
5. Add or update fixture manifests to label class, exactness level, source sections, expected outcomes, trust status, synthetic-data/PHI status, intentionally public private keys, and policy-dependent checks.
6. Keep historical Mattr, kiosk, QR, relay, OID4VP, dynamic-element, SVG/HTML, and other demo/archive materials out of positive v1.0 protocol fixtures unless future specifications define separate bindings or extension Artifact media types.
