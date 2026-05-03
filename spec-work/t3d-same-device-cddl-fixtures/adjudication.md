# T3.D adjudication — same-device CDDL and fixture material

## Inputs reviewed

I reviewed the required outline and dependency tree, drafting methodology, accepted canonical text through T3.C, the T3.A/T3.B/T3.C adjudication and orchestrator-review notes, all five T3.D attempts, the active same-device profile documentation, the protocol explainer, the TypeScript protocol implementation and tests, the Android/Kotlin request parser, request adapter, crypto code, responder, Android test vectors, and the checked-in fixture roots under `fixtures/dcapi-requests/` and `fixtures/responses/`.

The governing dependency decisions are that Appendix C/D material must derive from §8 and Appendix E/F/G without creating alternate request carriers, response carriers, HPKE parameters, trust semantics, clinical semantics, or fixture conformance classes (`spec.md.outline.dependency_tree` lines 263-270; `spec-work/t3b-org-iso-mdoc-same-device/orchestrator-review.md` lines 32-45; `spec-work/t3c-same-device-support-appendices/orchestrator-review.md` lines 49-58). The methodology requires adjudication against accepted dependencies and active behavior rather than majority vote (`spec-work/methodology.md` lines 11-23).

## Attempt-by-attempt assessment

### Attempt 01

**Strengths:** Most complete all-in-one Appendix C/D draft. It accurately labeled the CDDL as profile pseudo-CDDL, preserved SMART request placement in `ItemsRequest.requestInfo`, response placement in issuer-signed `elementValue`, `DeviceRequest.version == "1.0"`, optional per-`DocRequest.readerAuth`, `x5chain` label 33, exact `encryptionInfo` base64url transcript binding, HPKE suite, empty AAD, and tag-24 digest boundaries. Its fixture section gave the richest byte-boundary inventory.

**Weaknesses:** It over-promoted some checked-in material by calling several roots conformance-vector candidates before §13/T6.C have frozen vector policy. It also included additional roots such as `fixtures/responses/android-kotlin-generated/` and `fixtures/dcapi-requests/negative-mattr-mdl/`; those exist, but the prompt only required the core same-device fixture roots and asked for conservative classification. I did not carry those into the canonical index except as deferred fixture-refresh/conformance-suite work.

### Attempt 02

**Strengths:** Best concise distinction between profile constraints and ISO/COSE-owned base structures. It correctly said the outer DC API wrapper is JSON rather than CDDL, that processors must not interpret base64url CBOR fields as plaintext SMART JSON, and that real-platform captures should remain diagnostic/historical unless promoted explicitly.

**Weaknesses:** It used placeholder constructs such as `.within iso-device-request` that are useful editorial notes but not spec-ready without an imported ISO CDDL module. It also implied one SMART `DocRequest` in the core profile while underlying parsing and §8 allow locating a matching request/document among possible multiple entries; exact multiple-entry handling remains deferred.

### Attempt 03

**Strengths:** Cleanest technical structure and scope. It was strong on `#6.24(bstr .cbor ...)`, detached `readerAuth`, the non-mandatory 32-byte nonce, digestID consistency rather than digestID `0`, and the distinction between mdoc structural validity and production issuer or clinical-source trust.

**Weaknesses:** Its fixture guidance was thorough but somewhat more permissive about labeling generated request/readerAuth material as conformance vectors. It also kept CDDL snippets close to exact grammar despite acknowledging that ISO map labels and imported modules are not fully confirmed in this repository.

### Attempt 04

**Strengths:** Best at surfacing open issues: duplicate document/element handling, deterministic encoding, digestID convention, nonce profile, real-platform capture promotion, and fixture private-key/plaintext hygiene. It also carefully avoided moving the SMART response into `DeviceNameSpaces` and preserved raw-FHIR provenance limits.

**Weaknesses:** It included a duplicate-handling recommendation in Appendix C text. That advice is likely correct for conformance tools, but accepted §8 and active code do not yet define a core rejection rule; I moved it to the adjudication/open-issues section and canonical deferred notes.

### Attempt 05

**Strengths:** Most polished and conservative Appendix C prose. It clearly states that Appendix C is profile-level pseudo-CDDL, not complete ISO/IEC 18013-5 CDDL, and it provides a compact fixture index that avoids overclaiming. Its canonical-ready wording for the DC API wrappers, `encryptionInfo`, `dcapiResponse`, and response subset was the strongest base for synthesis.

**Weaknesses:** It used “should not” in nonce text where canonical prose needed a firmer distinction: §8 requires fresh unpredictable nonce bytes and recommends at least 16 bytes; active fixtures use/default 32 bytes, but Appendix C must not make 32 a universal core requirement. Its real Chrome/Android entries also leaned toward “conformance evidence candidate”; the canonical labels them diagnostic/historical unless and until promoted.

## Active evidence and dependency constraints

- Active profile docs define the same fixed identifiers and carriers: `org-iso-mdoc`, `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, requested element `smart_health_checkin_response`, SMART request in `ItemsRequest.requestInfo`, SMART response in `IssuerSignedItem.elementValue`, HPKE P-256/HKDF-SHA256/AES-128-GCM, and ES256/alg `-7` (`docs/profiles/org-iso-mdoc.md` lines 5-16).
- Active profile docs and the protocol explainer show `DeviceRequest.version` `"1.0"`, tag-24 `itemsRequest`, optional per-`DocRequest.readerAuth`, no core version `"1.1"` `readerAuthAll`, and `requestInfo["org.smarthealthit.checkin.request"]` carrying JSON (`docs/profiles/org-iso-mdoc.md` lines 39-76; `docs/PROTOCOL-EXPLAINER.md` lines 15-33, 41-50).
- `readerAuth` evidence is detached ES256 COSE_Sign1 over `ReaderAuthenticationBytes`, with null payload, empty external AAD, and COSE header label 33 (`x5chain`) (`docs/profiles/org-iso-mdoc.md` lines 78-103; `rp-web/src/protocol/index.ts` lines 445-475; `SmartMdocCrypto.kt` lines 122-164).
- Active TypeScript constants match the profile identifiers and still retain archived dynamic-prefix constants, which supports explicitly rejecting archived alternate carriers in the canonical text (`rp-web/src/protocol/index.ts` lines 42-48).
- Active TypeScript request construction defaults nonce to 32 bytes but only rejects values shorter than 16 bytes, serializes the SMART request into `requestInfo`, tag-24 wraps `ItemsRequest`, and constructs `DeviceRequest.version` `"1.0"` (`rp-web/src/protocol/index.ts` lines 272-310, 354-388).
- TypeScript and Android both compute the direct `dcapi` transcript from the exact `encryptionInfo` base64url string and origin (`rp-web/src/protocol/index.ts` lines 416-427; `DirectMdocRequest.kt` lines 120-124). Profile docs state the origin is not from request JSON (`docs/profiles/org-iso-mdoc.md` lines 144-168).
- Android request parsing extracts the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and preserves tag-24 `ItemsRequest` bytes for `readerAuth` (`MdocCbor.kt` lines 226-256; `DirectMdocRequest.kt` lines 43-52, 126-144).
- Active response construction puts SMART response JSON in `IssuerSignedItem.elementValue`, uses `digestID` 0 in current Android output, computes valueDigest over the tag-24 item, uses an empty `DeviceNameSpaces` map, signs `DeviceAuthentication`, HPKE-seals with `info = request.sessionTranscriptBytes`, and returns `['dcapi', {'enc', 'cipherText'}]` (`SmartHealthMdocResponder.kt` lines 54-64, 79-88, 95-150, 160-170). This supports digestID consistency but not a protocol-wide digestID `0` rule.
- The protocol explainer confirms the decoded `dcapiResponse` shape, HPKE ciphertext over CBOR `DeviceResponse`, and response extraction from `issuerSigned.nameSpaces["org.smarthealthit.checkin"][0].elementValue` (`docs/PROTOCOL-EXPLAINER.md` lines 192-255).
- Active tests assert stable request fields, exact transcript construction, detached readerAuth, and direct dcapi response wrapping (`rp-web/src/protocol/index.test.ts` lines 345-440, 496-520).
- Android test vectors record the active identifiers and requestInfo key (`wallet-android/app/src/test/resources/test-vectors.json` lines 1-8).
- Fixture roots/files were listed before naming. The required roots/files exist: `fixtures/dcapi-requests/ts-smart-checkin-basic/`, `fixtures/dcapi-requests/ts-smart-checkin-readerauth/`, `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`, `fixtures/responses/pymdoc-minimal/`, `fixtures/responses/real-chrome-android-smart-checkin/`, and `wallet-android/app/src/test/resources/test-vectors.json`.

## Contradictions resolved

1. **Exact CDDL versus pseudo-CDDL:** Attempts varied from near-exact CDDL to explicitly diagnostic structures. I resolved in favor of profile pseudo-CDDL because active code/docs confirm text-string labels and byte boundaries, but not a complete imported ISO/IEC 18013-5 CDDL module or all exact ISO map-label conventions. The canonical is honest about that limitation.
2. **Request carrier:** I kept only `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. Dynamic elements, archived compressed prefixes, kiosk wrapper fields, DC API wrapper fields, and `readerAuth` are not alternate request carriers. This follows active docs/code and T3.B.
3. **Response carrier:** I kept only issuer-signed `IssuerSignedItem.elementValue` for `smart_health_checkin_response`. I rejected any wording that places the SMART response in `DeviceNameSpaces`, `requestInfo`, plaintext DC API JSON, or `dcapiResponse` outside HPKE.
4. **DeviceRequest version and readerAuth:** I kept `DeviceRequest.version` exactly `"1.0"`, optional per-`DocRequest.readerAuth`, and no core `readerAuthAll`. This matches active docs and accepted T3.B/T3.C.
5. **readerAuth x5chain and detached payload:** I adopted attempts that included label `33` (`x5chain`), at least leaf certificate evidence, ES256 alg `-7`, payload `null`, empty external AAD, and `ReaderAuthenticationBytes` over exact transcript and tag-24 `ItemsRequest` bytes.
6. **SessionTranscript input:** I rejected any decoded/re-encoded `encryptionInfo` equivalence. The canonical binds the exact unpadded base64url string plus origin, matching TypeScript and Android.
7. **Nonce size:** I did not make 32 bytes mandatory. Active builders default to 32 and fixtures often use 32, but active code only enforces at least 16 bytes. A 32-byte rule is deferred to conformance-vector profile or deployment profile decisions.
8. **Digest ID:** I did not make digestID `0` a protocol requirement. Active Android uses `0` for the single element, but accepted §8 only requires consistency between `IssuerSignedItem.digestID` and MSO `valueDigests`.
9. **Duplicate handling and multiple entries:** Attempts differed between recommending rejection and leaving selection rules open. I did not create a new Appendix C core SHALL. Duplicate map-key handling, multiple `docRequests`/documents, duplicate stable elements, duplicate digest IDs, and duplicate stable response items are deferred to §11 security, §13 conformance/registries, or a future fixture-vector profile.
10. **Fixture classification:** I did not classify every checked-in fixture as normative conformance. Generated TypeScript request and Android test-vector material are conformance candidates; real Chrome/Android captures and pymdoc response material are diagnostic/historical or diagnostic candidates until final conformance policy promotes named byte checks.
11. **Clinical-source provenance:** I preserved T3.A/T3.B: mdoc/HPKE success, origin binding, issuer/MSO validation, device key proof, readerAuth, and `requestId` matching do not create clinical-source provenance for unsigned raw FHIR JSON.
12. **Fixture path scope:** Some attempts included verified but non-required auxiliary roots. The canonical Appendix D lists the six required confirmed roots/files and avoids promoting auxiliary or negative material in this cutpoint.

## Open issues deferred

### Defer to §11 security

- Replay/freshness expectations for presentation requests and responses.
- Origin spoofing, reduced-assurance origin UI, and privileged-caller policy.
- Reader impersonation and failed/valid-but-untrusted readerAuth UX.
- HPKE recipient-key reuse and nonce/key correlation risks.
- Plaintext debug bundle, fixture private-key, and captured ciphertext handling.
- Security treatment of duplicate documents, duplicate elements, duplicate digest IDs, and duplicate map keys if ambiguity can be exploited.
- Preventing mdoc/HPKE success from being misrepresented as clinical-source provenance for unsigned raw FHIR JSON.

### Defer to §13 conformance / registries

- Whether authenticated origin, mandatory readerAuth in any profile, fixed nonce size, duplicate rejection, deterministic CBOR, digestID conventions, or exact fixture classes are core conformance requirements, deployment-profile requirements, or conformance-suite-only rules.
- Final registration/checklist treatment for `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`.
- Whether Appendix C should import a formal ISO CDDL module or remain profile pseudo-CDDL in the published specification.

### Defer to future fixture refresh / T6.C

- Whether real Chrome/Android captures remain current conformance evidence or become historical after final §8/§11/§13 decisions.
- Whether generated TypeScript vectors should be frozen byte-exact or regenerated after final examples and clinical payloads stabilize.
- Whether to add manifests, hashes, producer metadata, PHI status, and generation commands for every fixture root before promotion.
- Whether to include auxiliary roots such as Android/Kotlin-generated response inspections or negative non-SMART mDL captures in the final Appendix D index.
