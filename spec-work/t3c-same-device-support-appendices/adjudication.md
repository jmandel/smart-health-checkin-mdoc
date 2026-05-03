# T3.C adjudication — same-device support appendices

## Inputs reviewed

I reviewed the required outline, dependency tree, methodology, prerequisite canonical/adjudication/review files through T3.B, and all five T3.C attempts. I also checked the active same-device profile docs, protocol explainer, TypeScript request/inspection code and tests, Android CBOR/request/crypto/responder code, Android test vectors, and same-device fixture roots.

## Attempt-by-attempt assessment

### Attempt 01

**Strengths:** Very complete ordered byte ladder. It correctly kept Appendix E explanatory, distinguished logical values from encoded bytes, preserved the request carrier in `requestInfo`, response carrier in `IssuerSignedItem.elementValue`, exact `encryptionInfo` base64url string, direct `dcapi` `SessionTranscript`, optional detached `readerAuth`, tag-24 MSO digest input, HPKE `info`, and empty AAD.

**Weaknesses:** It is longer than necessary and occasionally reads like a second normative §8. It mentions specific fixture filenames beyond the minimum root list, which risks pre-classifying material that Appendix D owns.

### Attempt 02

**Strengths:** Strong integration of Appendix E, F, and G with clear deferrals to §8, Appendix C, and Appendix D. It accurately separates issuer/MSO, device proof, HPKE, SMART response validation, and clinical-source provenance.

**Weaknesses:** It was slightly less precise about current nonce behavior and exact fixture scope. Its Appendix G could be clearer that kiosk re-enters §8 but does not belong in Appendix G as wrapper mechanics.

### Attempt 03

**Strengths:** Cleanest compact ladder and strong statements on exact request/response placement, no generic mDL semantics, optional per-DocRequest `readerAuth`, and origin binding. It gives useful CBOR diagnostic guidance without turning examples into CDDL.

**Weaknesses:** It is comparatively terse for Appendix E and less explicit about fixture roots and `x5chain` header label 33. It leaves some HPKE and Digital Credentials API wrapper details to inference.

### Attempt 04

**Strengths:** Best at exposing disputed details: JSON serialization is not canonicalized, nonce 32 bytes should not become mandatory, digest id `0` is not a core constant, and `DeviceNameSpaces` should normally be empty in the core profile. It also gives the fullest downstream/open-issue list.

**Weaknesses:** It uses `JSON.stringify(...)` in ways that can look JavaScript-specific for spec prose. Its CDDL/diagnostic section mentions `18(...)` as a possible tag rendering; I did not carry that forward because it is more confusing than helpful for a tag-24 cheat-sheet.

### Attempt 05

**Strengths:** Most polished overall structure. It keeps the appendices subordinate to §8, avoids fabricated byte examples, cites confirmed fixture roots only, and gives a clear Appendix G compatibility posture.

**Weaknesses:** Some wording could be read as imposing new validation obligations from Appendix E. Its fixture-file suggestions are useful but remain Appendix D material, not canonical fixture classification.

## Evidence and accepted dependency constraints

- The outline assigns T3.C to Appendix E, Appendix F, and Appendix G and says these appendices should be derived from §8 without alternate normative behavior (`spec.md.outline` lines 227-281; `spec.md.outline.dependency_tree` lines 252-261).
- The methodology requires the organizer to resolve contradictions against active repo behavior, not majority vote (`spec-work/methodology.md` lines 75-88, 412-485).
- T1.A defines appendices/examples as non-normative unless explicitly scoped and defines base64url without padding, CBOR diagnostic notation, tag/byte presentation, and SMART request/response terminology (`spec-work/t1a-editorial-terminology/canonical.md` lines 61-110, 130-188).
- T1.B and T1.C establish same-device direct `org-iso-mdoc` as the base flow, with kiosk as a wrapper/re-entry flow rather than a second clinical protocol (`spec-work/t1b-purpose-scope-goals/canonical.md` lines 7-15, 105-124; `spec-work/t1c-architecture-roles-flows/canonical.md` lines 36-42, 71-89).
- T2.A and T2.B keep SMART request/response clinical semantics transport-neutral, forbid requester identity in the SMART request body, and require response `requestId` and response validation to remain clinical-layer checks (`spec-work/t2a-clinical-request-model/canonical.md` lines 1-20, 100-112; `spec-work/t2b-clinical-response-model/canonical.md` lines 33-38, 138-153).
- T3.A separates origin, readerAuth, mdoc issuer/device proof, and clinical-source provenance; raw FHIR JSON remains patient-mediated unless separately signed/provenanced (`spec-work/t3a-trust-framework/canonical.md` lines 5-15, 127-149).
- T3.B is accepted as canonical. It fixes request in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, response in issuer-signed `smart_health_checkin_response` `elementValue`, DeviceRequest version `"1.0"`, optional per-DocRequest `readerAuth`, direct `dcapi` transcript, HPKE suite/info/AAD, and verifier validation (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 9-28, 75-157, 159-179, 216-350; `spec-work/t3b-org-iso-mdoc-same-device/orchestrator-review.md` lines 32-45).
- Active docs and TypeScript constants match the fixed identifiers, request carrier, response carrier, HPKE suite, and ES256 algorithm (`docs/profiles/org-iso-mdoc.md` lines 5-16; `rp-web/src/protocol/index.ts` lines 42-46).
- Active TypeScript builds SMART request JSON into `requestInfo`, wraps `ItemsRequest` in tag 24, builds version `"1.0"` `DeviceRequest`, defaults nonce to 32 bytes but only enforces at least 16 bytes, and builds the direct `SessionTranscript` from exact base64url `encryptionInfo` and origin (`rp-web/src/protocol/index.ts` lines 272-388, 416-427).
- Active TypeScript signs detached per-DocRequest `readerAuth` with ES256, null payload, empty external AAD, and `x5chain` header label 33 (`rp-web/src/protocol/index.ts` lines 445-475). Tests assert stable request fields, exact transcript construction, detached `readerAuth`, and direct `dcapiResponse` wrapping (`rp-web/src/protocol/index.test.ts` lines 344-439, 496-520).
- Active Android parsing preserves tag-24 `ItemsRequest` bytes and extracts SMART request JSON from `requestInfo`; Android transcript construction is the same `CBOR([encryptionInfoBase64Url, origin])` / `['dcapi', SHA-256(...)]` / `CBOR([null, null, handover])` formula (`MdocCbor.kt` lines 23-58; `MdocCbor.kt` lines 226-256; `DirectMdocRequest.kt` lines 37-49, 120-124).
- Active Android readerAuth verification requires detached COSE_Sign1, alg `-7`, x5chain label 33, and verifies the Signature1 structure with empty external AAD and the detached `ReaderAuthenticationBytes` (`SmartMdocCrypto.kt` lines 108-164; `DirectMdocRequest.kt` lines 126-144).
- Active Android response construction places SMART response JSON in `IssuerSignedItem.elementValue`, computes the MSO digest over tag-24 `IssuerSignedItem`, signs the MSO as `issuerAuth`, signs `DeviceAuthentication`, HPKE-seals with `info = request.sessionTranscriptBytes`, and returns `['dcapi', {'enc', 'cipherText'}]` as base64url `data.response` (`SmartHealthMdocResponder.kt` lines 36-64, 71-88, 95-150).
- Active test vectors and fixture roots confirm the identifiers and available same-device byte-boundary material (`wallet-android/app/src/test/resources/test-vectors.json` lines 1-8; fixture root listing from `fixtures/dcapi-requests` and `fixtures/responses`).

## Contradictions resolved

1. **Normative appendix vs. explanatory appendix:** All attempts had useful precise language, but some phrasing risked creating a second source of requirements. I resolved this by making canonical Appendix E/F/G explanatory and by saying obligations come from §8 when restated.
2. **Request carrier:** I kept only `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. This follows T3.B and active docs/code (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 23-28; `docs/PROTOCOL-EXPLAINER.md` lines 23-33; `rp-web/src/protocol/index.ts` lines 354-371).
3. **Response carrier:** I kept only `IssuerSignedItem.elementValue` for the issuer-signed `smart_health_checkin_response` item. Android response construction confirms this (`SmartHealthMdocResponder.kt` lines 57-64, 95-108).
4. **DeviceRequest version and readerAuth:** I kept DeviceRequest version `"1.0"`, optional per-`DocRequest.readerAuth`, and no core `readerAuthAll`, matching T3.B and active profile docs (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 75-105; `docs/profiles/org-iso-mdoc.md` lines 74-76).
5. **readerAuth details:** I required Appendix E/G to describe `readerAuth` as optional in core v1, detached COSE_Sign1 ES256 over `ReaderAuthenticationBytes`, payload `null`, empty external AAD, and `x5chain` label 33 with at least the leaf certificate. This follows accepted §8 and active TypeScript/Android code (`rp-web/src/protocol/index.ts` lines 458-475; `SmartMdocCrypto.kt` lines 122-164).
6. **SessionTranscript input:** I resolved in favor of binding the exact `encryptionInfo` base64url string and origin, not decoded/re-encoded `encryptionInfo`, concatenated strings, or SMART request fields. This follows T3.B and both implementations (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 159-179; `rp-web/src/protocol/index.ts` lines 416-427; `DirectMdocRequest.kt` lines 120-124).
7. **HPKE parameters:** I kept the §8 HPKE suite, `info = SessionTranscript bytes`, and empty AAD. Android uses request transcript bytes as HPKE info and does not add AAD (`SmartHealthMdocResponder.kt` lines 118-124; `SmartMdocCrypto.kt` lines 191-235).
8. **Nonce length:** I did not make 32 bytes mandatory. Active TypeScript defaults to 32 bytes but rejects only values shorter than 16 bytes (`rp-web/src/protocol/index.ts` lines 272-273). Any fixed nonce size belongs to Appendix C/D or conformance closure.
9. **DeviceNameSpaces:** I did not place the SMART response in `DeviceNameSpaces`. Active code uses empty `DeviceNameSpaces` by default and keeps the response issuer-signed (`SmartHealthMdocResponder.kt` lines 79-108).
10. **Digest id:** I did not make digest id `0` normative, even though active Android uses `0` for the single item (`SmartHealthMdocResponder.kt` lines 57-68, 160-167). Consistency between `digestID` and MSO `valueDigests` is the relevant §8 condition; Appendix C/D can decide vector constraints.
11. **Fixture status:** I cited only confirmed active roots and did not label them as conformance vectors. Appendix D owns authoritative fixture classification.
12. **Clinical-source provenance:** I preserved T3.A/T3.B's rule that successful HPKE/mdoc presentation does not create source provenance for unsigned raw FHIR JSON (`spec-work/t3a-trust-framework/canonical.md` lines 127-149; `spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 284-285, 352).
13. **Kiosk scope:** Appendix G mentions kiosk only as re-entry into §8. Wrapper signatures, pointer binding, submission encryption, and completion mechanics remain §9/T4 work.

## Deferred issues and downstream work

- **T3.D / Appendix C:** exact CDDL, map labels, tag-24 grammar, duplicate document/element handling, deterministic encoding rules for vectors, nonce-size constraints if any, digest-id conventions if any, and exact handling of multiple documents or duplicate stable elements.
- **T3.D / Appendix D:** classify generated TypeScript request vectors, readerAuth vectors, real Chrome/Android captures, Android/Kotlin-generated responses, minimal pymdoc responses, diagnostics, and historical captures.
- **§11 security:** replay/freshness, origin spoofing, reader impersonation, reduced-assurance origin UX, HPKE recipient-key reuse, debug/fixture plaintext leakage, duplicate-element security handling, and raw-FHIR provenance overclaiming.
- **§13 conformance/registries:** final registration/checklist treatment for `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, `org.smarthealthit.checkin.request`, deployment-profile hooks, authenticated origin expectations, and any fixed fixture requirements.

No blocking issues remain for T3.C.
