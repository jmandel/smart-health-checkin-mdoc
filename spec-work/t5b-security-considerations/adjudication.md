# T5.B Security considerations adjudication

## Inputs reviewed

Reviewed all five draft attempts and the drafting methodology. I checked the accepted prerequisite canonicals/reviews for T1/T2/T3/T4, with particular attention to the trust framework, same-device `org-iso-mdoc` mechanics, kiosk pointer/request resolution, kiosk submission/completion, and kiosk CDDL/fixture review. I also inspected active implementation, docs, tests, and fixtures called out in the prompt.

Key evidence used:

- T1/T2 architecture and scope separate the transport-neutral clinical model from presentation transport, make kiosk a wrapper/re-entry flow, and keep requester identity metadata out of the SMART request body (`spec-work/t1c-architecture-roles-flows/canonical.md:11-44`, `spec-work/t1b-purpose-scope-goals/canonical.md:1-21`, `spec-work/t2a-clinical-request-model/canonical.md:1-8`, `spec-work/t2a-clinical-request-model/canonical.md:100-112`).
- T2 response rules bind `SmartHealthCheckinResponse.requestId` to the original request `id`, define SMART Health Card and raw FHIR Artifact treatment, and state that raw FHIR JSON is patient-mediated unless separately provenanced (`spec-work/t2b-clinical-response-model/canonical.md:33-38`, `spec-work/t2b-clinical-response-model/canonical.md:111-121`, `spec-work/t2b-clinical-response-model/canonical.md:138-153`).
- T3.A separates origin, reader, issuer/device, clinical-source, identifier, and deployment-policy trust layers and forbids using one as a substitute for another (`spec-work/t3a-trust-framework/canonical.md:1-15`, `spec-work/t3a-trust-framework/canonical.md:17-52`, `spec-work/t3a-trust-framework/canonical.md:53-90`, `spec-work/t3a-trust-framework/canonical.md:91-125`).
- T3.B fixes §8 identifiers and mechanics: `org-iso-mdoc`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, request carrier `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, `DeviceRequest.version` `"1.0"`, optional per-`DocRequest.readerAuth`, `x5chain` label `33`, `dcapi` SessionTranscript, P-256 HPKE, and SMART response validation (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md:9-28`, `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:75-105`, `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:107-179`, `spec-work/t3b-org-iso-mdoc-same-device/canonical.md:181-210`).
- T4.A/T4.B/T4.C fix kiosk facts: direct `smartRequest`, no preset/request-profile wrapper, encrypted request envelope, pointer-only `#r=<requestId>`, Phone presenter validation before §8 re-entry, response submission encryption, desktop completion processing, single-use guidance, untrusted provider, and active limitations around §8 validation evidence (`spec-work/t4a-kiosk-request-pointer/canonical.md:1-16`, `spec-work/t4a-kiosk-request-pointer/canonical.md:38-75`, `spec-work/t4a-kiosk-request-pointer/canonical.md:78-155`, `spec-work/t4a-kiosk-request-pointer/canonical.md:198-225`, `spec-work/t4b-phone-resolution-reentry/canonical.md:1-15`, `spec-work/t4b-phone-resolution-reentry/canonical.md:34-48`, `spec-work/t4b-phone-resolution-reentry/canonical.md:49-127`, `spec-work/t4b-phone-resolution-reentry/canonical.md:137-149`, `spec-work/t4c-submission-completion/canonical.md:1-35`, `spec-work/t4c-submission-completion/canonical.md:44-82`, `spec-work/t4c-submission-completion/canonical.md:83-125`, `spec-work/t4c-submission-completion/canonical.md:127-163`).
- T4.D confirms kiosk CDDL/fixture boundaries, no tracked deterministic `fixtures/kiosk/` suite, and active code being looser on some non-id mirrored metadata while target text keeps stricter profile expectations (`spec-work/t4d-kiosk-cddl-fixtures/canonical.md:1-22`, `spec-work/t4d-kiosk-cddl-fixtures/canonical.md:89-95`, `spec-work/t4d-kiosk-cddl-fixtures/canonical.md:130-153`, `spec-work/t4d-kiosk-cddl-fixtures/canonical.md:177-213`, `spec-work/t4d-kiosk-cddl-fixtures/orchestrator-review.md:24-55`).
- Active implementation evidence: constants and crypto labels in `rp-web/src/kiosk/protocol.ts:1-13`; kiosk payload shape and direct `smartRequest` in `rp-web/src/kiosk/protocol.ts:20-46`; request JWS/encryption in `rp-web/src/kiosk/protocol.ts:138-229`; request opening/JWS validation/submission encryption in `rp-web/src/kiosk/protocol.ts:232-368`; pointer-only `#r=` in `rp-web/src/kiosk/protocol.ts:370-381`; validation gaps in `rp-web/src/kiosk/protocol.ts:403-509`; provider request/submission rows and decrypt-only completion path in `rp-web/src/kiosk/kiosk-provider.ts:103-206`; InstantDB opaque row/blob behavior in `rp-web/src/kiosk/instant-mailbox.ts:13-47` and `rp-web/src/kiosk/instant-mailbox.ts:49-113`; developer UI exposing private JWK/debug details in `rp-web/src/kiosk/creator-main.tsx:153-173` and displaying decrypted submissions without independently rerunning every validation in `rp-web/src/kiosk/creator-main.tsx:262-356`; phone submit page validates request and sends only `smartResponse` payload from the opened §8 result in `rp-web/src/kiosk/submit-main.tsx:77-99` and `rp-web/src/kiosk/submit-main.tsx:269-280`; demo keys are explicitly non-production in `rp-web/src/kiosk/demo-keys.ts:1-63`; stale URL-fragment inline §8 kiosk helper is confined to `rp-web/src/sdk/kiosk-session.ts:1-80`; provider test proves pointer/encrypted request no plaintext and no `dcapiResponse`/`deviceResponse` in submission in `rp-web/src/kiosk/kiosk-provider.test.ts:54-108`.
- Same-device implementation evidence: constants in `rp-web/src/protocol/index.ts:42-49`; request construction, nonce, requestInfo, readerAuth, SessionTranscript, and x5chain in `rp-web/src/protocol/index.ts:252-476`; HPKE-like open and SMART response validation in `rp-web/src/protocol/index.ts:568-665`; active validators and response cross-validation in `rp-web/src/sdk/core.ts:87-173` and `rp-web/src/sdk/core.ts:175-310`.
- Active docs confirm same-device identifiers and fixture roots (`docs/PROTOCOL-EXPLAINER.md:10-31`, `docs/profiles/org-iso-mdoc.md:1-14`, `docs/profiles/org-iso-mdoc.md:282-294`). Repository fixture listing shows same-device request/response fixtures but no `fixtures/kiosk/` directory.

## Agreements across the five attempts

All five attempts broadly agreed on these points:

1. §11 must be a security-considerations section, not a new protocol design.
2. The three encryption contexts must be kept separate: §8 HPKE for CBOR `DeviceResponse`, §9 request-envelope encryption for the compact kiosk request JWS, and §9 response-submission encryption for `SubmissionPlaintext`.
3. Freshness and replay are layered; `SmartHealthCheckinResponse.requestId` is a necessary correlation check, not a replay proof.
4. Origin, optional reader authentication, mdoc issuer/device evidence, clinical-source provenance, kiosk creator signatures, provider controls, and downstream policy are separate trust layers.
5. The active QR is pointer-only with `#r=<requestId>`; inline §8 QR fragments and stale kiosk-session helpers are non-canonical.
6. The kiosk relay is untrusted/honest-but-curious for security design and must not need plaintext clinical content or private keys in correctly deployed production flows.
7. Demo keys, browser-held private JWKs, and developer UI panels are demonstration behavior, not production key custody or UX.
8. Active code and fixtures have gaps: desktop completion display does not independently rerun every validation before display, code is looser than final profile text on some schema/JWK/mirrored metadata checks, and no deterministic kiosk fixture suite is checked in.

## Disagreements adjudicated

- **Strength of new normative language.** Some attempts introduced many new SHALL/MUST statements. I kept only cross-cutting requirements that directly preserve accepted §§5-9 obligations and used SHOULD/MAY for deployment hardening. Security text must not invent a new conformance class or production trust framework.
- **Kiosk provider model.** Attempts varied between “honest-but-curious” and fully malicious/untrusted. Accepted text treats the provider as an untrusted relay for confidentiality and trust decisions, while acknowledging it can perform defense-in-depth access-control, row-shape, rate-limit, cleanup, and duplicate-suppression functions.
- **ReaderAuth detail.** Attempts sometimes over-specified certificate policy. Canonical text states the accepted byte-level facts (`DocRequest.readerAuth`, detached ES256 COSE_Sign1, x5chain label 33) and leaves trust-anchor, path, revocation, and naming policy to deployment profiles.
- **Issuer trust and clinical provenance.** Attempts agreed on separation, but some phrasing risked making mdoc issuer trust equivalent to clinical-source trust. Canonical text explicitly rejects that pivot for raw `application/fhir+json` and requires SMART Health Card verification for SHC Artifacts.
- **Active implementation vs target profile.** Attempts differed on whether to phrase active gaps as protocol weaknesses. Canonical text states the intended target model, then calls demo/private-key/display/validation gaps out as implementation or deployment cautions without weakening accepted §§8-9 requirements.
- **Platform-specific UI/browser advice.** Attempts with Android/iOS/browser allow-list details were rejected for §11. That content belongs in §15 or deployment profiles.
- **Payload size and API volatility.** I did not preserve alarmist text suggesting unresolved core security panic. Size limits are already bounded by signed/deployment constraints in §9.8/§9.10; API volatility and platform-specific integration belong in §15/future work.

## Accepted decisions

1. Canonical §11 starts with the actual version 1.0 flows: same-device direct `org-iso-mdoc` and kiosk wrapper/re-entry.
2. §11.1 names all three crypto contexts, their plaintexts, recipients, info/transcript inputs, and AAD, and forbids cross-context substitution.
3. §11.2 treats freshness as flow-specific and recommends single-use kiosk completion without making provider state a trust anchor.
4. §11.3 states that origin comes from platform/browser/privileged-caller evidence, not request text, pointer metadata, provider app ids, or logos.
5. §11.4 preserves optional per-`DocRequest.readerAuth` and distinguishes absent, failed, valid-but-untrusted, and trusted states.
6. §11.5 keeps issuer/device trust separate from clinical-source provenance and downstream authorization.
7. §11.6 fixes version 1.0 algorithms and defers future agility to profiles/registries/conformance vectors.
8. §11.7 covers logs, debug panels, fixtures, crash reports, browser storage, and public screens as plaintext-leakage channels.
9. §11.8 treats the Submission service/provider as an untrusted relay and requires local cryptographic/semantic validation by Phone presenter and Completion display.
10. §11.9 preserves pointer-only QR facts and explains metadata leakage without reverting to inline request fragments.
11. §11.10 makes Wallet UX a security control: validated request processing, Holder control at item granularity, no consent-by-scan, and honest trust-signal display.

## Rejected or unsupported claims

- Rejected any request-profile/preset/IPS/all-of-the-above wrapper as the kiosk clinical payload; accepted T4 requires direct `smartRequest`.
- Rejected inline §8 QR fragments (`deviceRequest`, `encryptionInfo`, return transports) as stale/non-canonical for version 1.0 kiosk.
- Rejected treating provider row presence, provider app id, storage path, upload status, or notification order as completion, consent, provenance, or response validity.
- Rejected treating `purpose`, item text, selector URLs, callback-looking strings, provider branding, common names, logos, or unknown request members as authenticated requester identity.
- Rejected treating successful HPKE opening, mdoc validation, kiosk wrapper validation, provider delivery, or request-id matching as proof of raw FHIR clinical-source provenance, patient identity, or EHR write-back authorization.
- Rejected production claims based on checked-in demo keys, browser-displayed private JWKs, fixture private keys, self-signed demo certificates, or demo issuer/audience strings.
- Rejected moving Android/iOS/browser allow-list implementation details into §11.
- Rejected suggesting deterministic kiosk vectors already exist; they do not.

## Active implementation vs production/security gaps

- The active desktop creator UI opens and displays decrypted submissions and feeds `payload.smartResponse` into review UI as `ok: true`, but the desktop path does not independently rerun every §6/§6.6/§8 validation before display (`rp-web/src/kiosk/creator-main.tsx:262-356`).
- The active phone submit path builds a payload from `completion.openedResponse.smartResponseValidation` and sends only the SMART response, so a production Completion display needs trusted evidence or state for phone-local §8 validation before clinical use (`rp-web/src/kiosk/submit-main.tsx:269-280`; accepted §9.9 notes this at `spec-work/t4c-submission-completion/canonical.md:119-123`).
- Active kiosk code validates key ids, algorithms, content type, expiration, app id, request id, and size limits, but some schema depth, public-JWK-only restrictions, private `d` rejection, exact base64url/IV constraints, and non-id mirrored metadata checks are not fully enforced in code or covered by deterministic kiosk fixtures (`rp-web/src/kiosk/protocol.ts:403-509`, `spec-work/t4d-kiosk-cddl-fixtures/canonical.md:130-153`).
- Browser-delivered request-opening private keys and desktop private JWK display are demo-only key custody (`rp-web/src/kiosk/demo-keys.ts:1-63`, `rp-web/src/kiosk/creator-main.tsx:153-173`).
- `rp-web/src/sdk/kiosk-session.ts` remains stale evidence for an old fragment format and must not define the spec (`rp-web/src/sdk/kiosk-session.ts:1-80`).
- No deterministic checked-in `fixtures/kiosk/` suite exists; current checked-in fixtures mainly prove same-device §8 boundaries.

## Open issues and deferrals

- **§12 Privacy:** expand metadata, logs, telemetry, browser history, retention, public kiosk displays, QR observation, provider rows, and identifier correlation.
- **§13 Registries:** mirror fixed media types, mdoc identifiers, JWS `typ`, profile ids, status codes, selector kinds, and future algorithm/profile agility hooks.
- **§15 Implementation guidance:** handle Android/iOS/browser integration, privileged-caller allow-lists, production key custody, operational key rotation/revocation, and production UI patterns.
- **§16.6 / T6.C fixtures:** add deterministic kiosk request JWS, encrypted request, pointer, response-submission, replay/duplicate, malformed row/JWK/IV, metadata mismatch, and no-plaintext-leakage vectors.
- **Future profiles:** define production reader/issuer trust anchors, creator-key registries, request-opening/desktop key custody, revocation/status checks, authenticated aggregation of duplicate submissions if ever needed, and optional validation-evidence payloads for Completion displays.

No blocking issue prevents canonical §11 security-considerations content.
