# T5.A Conformance adjudication

## Inputs reviewed

Reviewed the five draft attempts in `spec-work/t5a-conformance/attempt-01.md` through `attempt-05.md`, the outline and dependency tree, the methodology, all accepted T1-T4 canonical/review/adjudication files listed in the prompt, and implementation/docs evidence in:

- `rp-web/src/sdk/core.ts`
- `rp-web/src/protocol/index.ts`
- `rp-web/src/kiosk/protocol.ts`
- `rp-web/src/kiosk/kiosk-provider.ts`
- `rp-web/src/kiosk/instant-mailbox.ts`
- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`
- `docs/profiles/org-iso-mdoc.md`
- `docs/PROTOCOL-EXPLAINER.md`

## Attempt synthesis

All five attempts agreed on the major shape: §4 should be a conformance map, not a second protocol definition; conformance must be role/target-specific; the transport-neutral §5/§6 model is core; §8 `org-iso-mdoc` is the active/base version 1.0 presentation binding; §9 kiosk is optional and wraps the same §5/§6/§8 semantics; `readerAuth`, production trust policy, fixtures, extension media/selector/status forms, and OID4VP are optional or deferred.

Useful contributions by attempt:

- Attempt 01 gave detailed target prose and strong language on provider opacity, Completion display validation, and demo-key non-production status.
- Attempt 02 most explicitly separated clinical core, same-device, kiosk, trust separation, versioning, and extension registration; its downstream dependency notes were useful.
- Attempt 03 provided concise tables for targets, mandatory core features, version layers, and checklist buckets; its warning that Browser/User Agent is assumed but not a standalone class was retained conceptually.
- Attempt 04 best stated the profile-identifier/wire-identifier distinction and the exact active kiosk constants, while keeping §13 ownership of registry syntax.
- Attempt 05 clearly articulated the direct same-device feature as the base presentation flow while still allowing narrower conformance claims for pure model validators, provider relays, fixture authors, and deployment profiles.

## Contradictions and adjudication

### Mandatory vs optional direct same-device support

Some attempts described direct same-device support as mandatory, while others called it optional. The accepted architecture and trust canonicals say version 1.0's base live presentation flow is same-device direct `org-iso-mdoc`, and kiosk re-enters that same flow (`spec-work/t3a-trust-framework/canonical.md` lines 15; `spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 1-7; `spec-work/t4b-phone-resolution-reentry/canonical.md` lines 1-6). However, the conformance model also needs targets for libraries, schema validators, fixture authors, provider relays, and deployment-profile authors that do not perform live presentation. The canonical resolves this by making §5/§6 core mandatory for clinical-object roles, making §8 mandatory for any claimed live version 1.0 presentation binding or phone-local kiosk presentation role, and treating pure transport-neutral tooling/provider/fixture claims as narrower claims that do not imply live §8 support.

### Kiosk clinical protocol

All attempts rejected kiosk-specific clinical shortcuts, but some examples were more forceful. The accepted kiosk canonicals require direct `KioskRequestPayload.smartRequest`, distinguish wrapper `requestId` from `smartRequest.id`, and use pointer-only QR URLs (`spec-work/t4a-kiosk-request-pointer/canonical.md` lines 10-16, 140-152, 198-225; `spec-work/t4b-phone-resolution-reentry/canonical.md` lines 109-120, 124-139). Implementation confirms `smartRequest` is the typed payload member, `requestId` is generated separately, and pointers use `#r=<requestId>` (`rp-web/src/kiosk/protocol.ts` lines 20-46, 138-181, 370-380; `rp-web/src/kiosk/kiosk-provider.ts` lines 103-139, 208-211). The canonical therefore rejects `requestProfile`, preset, IPS shortcut, “all of the above”, SDK helper, and inline §8-fragment wrappers.

### Trust claims and raw FHIR

Attempts consistently warned against conflating transport, mdoc, kiosk, and clinical-source trust. Accepted trust text makes the layers distinct and says raw FHIR JSON remains patient-mediated unless separately provenanced or signed (`spec-work/t3a-trust-framework/canonical.md` lines 3-15, 127-149, 167-187; `spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 326-352). The response canonical and implementation require `application/fhir+json` to carry `fhirVersion` and SMART Health Card artifacts not to carry an outer `fhirVersion` (`spec-work/t2b-clinical-response-model/canonical.md` lines 138-153, 374-378; `rp-web/src/sdk/core.ts` lines 232-247). The canonical keeps the trust separation mandatory and rejects production trust claims from demo/self-signed/test keys unless a deployment profile explicitly accepts them.

### Profile identifiers and registry scope

Attempts proposed several labels: `shc-checkin-*`, `smart-health-checkin-mdoc-*`, `smart-health-checkin-dcapi-mdoc-*`, etc. The prompt required mirroring existing canonical identifiers without inventing permanent registry text beyond §13. Existing canonicals fix wire identifiers such as request/response `type` and `version`, `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, `org.smarthealthit.checkin.request`, kiosk JWS `typ`, content type, algorithms, HKDF info strings, pointer `r`, and payload kind (`spec-work/t2a-clinical-request-model/canonical.md` lines 60-68; `spec-work/t2b-clinical-response-model/canonical.md` lines 21-35; `spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 9-28; `spec-work/t4a-kiosk-request-pointer/canonical.md` lines 40-72, 156-183; `spec-work/t4c-submission-completion/canonical.md` lines 7-34, 44-64). The canonical therefore lists wire identifiers as current identifiers and uses provisional human-readable conformance labels only as documentation labels pending §13.

### Versioning and extensions

Attempts agreed that versioning is layered. Accepted sources require SMART request/response `version: "1"`, `DeviceRequest.version` and `DeviceResponse.version` `"1.0"`, and kiosk `v: 1` (`spec-work/t2a-clinical-request-model/canonical.md` lines 64-68; `spec-work/t2b-clinical-response-model/canonical.md` lines 21-35; `spec-work/t3b-org-iso-mdoc-same-device/canonical.md` lines 75-91 and 326-348; `spec-work/t4a-kiosk-request-pointer/canonical.md` lines 82-150 and 156-183; `spec-work/t4c-submission-completion/canonical.md` lines 9-34). Extension handling is explicit in T2/T3/T4 but registry process is deferred (`spec-work/t2a-clinical-request-model/canonical.md` lines 486-498; `spec-work/t2b-clinical-response-model/canonical.md` lines 187-195; `spec-work/t3a-trust-framework/canonical.md` lines 167-187). The canonical permits additive extensions only where unsupported recipients can reject/report/ignore without changing required semantics, and defers registry mechanics to §13.

## Accepted decisions

1. §4 is a conformance scoping section and checklist bridge; detailed obligations remain in §§5-9 and later security/privacy/registry sections.
2. Conformance targets are Requester/Verifier, Holder Wallet/Responder, Phone presenter, Kiosk creator, Completion display, Submission service/provider, deployment/profile author, and conformance/fixture author.
3. Core conformance for clinical roles is the transport-neutral §5 SMART request and §6 SMART response model, including §6.6 validation.
4. Direct `org-iso-mdoc` §8 is the version 1.0 live presentation binding. It is mandatory for claimed presentation roles, but not implied by pure core-model, provider-relay, profile-author, fixture-author, or schema-validator claims.
5. Kiosk §9 is optional and wraps/re-enters the §8 flow; it is not a second clinical protocol.
6. `readerAuth`, production trust registries/anchors, source provenance beyond returned artifacts, specific provider products, fixture generation, deterministic vectors, and future OID4VP are optional/deployment/future-profile matters.
7. The canonical preserves direct `smartRequest`, no request-profile/preset/IPS shortcut/all-of-the-above wrapper, wrapper `requestId` distinct from `smartRequest.id`, pointer-only QR, untrusted relay/provider, T3 trust-layer separation, patient-mediated raw FHIR unless separately provenanced/signed, and no production trust claims from demo keys.
8. Versioning is layered: SMART request/response `version: "1"`; mdoc `DeviceRequest`/`DeviceResponse` version `"1.0"`; kiosk `v: 1`; extensions must not break required validation.
9. Appendix A/T5.F should index requirements one row per stable requirement and target; it must not introduce independent obligations.

## Rejected or unsupported claims

- A kiosk-specific clinical request language, `requestProfile`, preset, IPS shortcut, “all of the above” shortcut, or inline §8 QR fragment is rejected.
- A Submission service/provider that must see plaintext SMART requests, SMART responses, raw FHIR, SMART Health Cards, Holder choices, private keys, or clinical trust decisions to route state is rejected for the untrusted-relay profile.
- Treating successful §8 transport, kiosk wrapper validation, provider metadata, `readerAuth`, mdoc issuer evidence, Holder action, or SMART response shape as clinical-source provenance for unsigned raw FHIR is rejected.
- Treating demo keys, self-signed certificates, demo issuer/audience strings, fixture keys, or current provider IDs as production trust anchors is rejected absent explicit deployment policy.
- Treating profile labels as in-band clinical selectors or as final registry URIs is unsupported; §13 owns final registry syntax.
- Requiring OID4VP for SMART Health Check-in 1.0 conformance is rejected.

## Active gaps and deferred issues

- T5.D must finalize registry/profile identifier syntax, selector/media/status/payload-kind extension registries, JWS `typ`, kiosk content types, algorithm labels, provider profiles, and fixture-profile naming.
- T5.F must expand the checklist from stable normative sections and the target taxonomy here, without adding obligations.
- T5.B/T5.C should threat-check and privacy-check the same boundaries: optional readerAuth, production trust policy, raw-FHIR provenance, relay metadata, logs/telemetry, replay/freshness, and demo/fixture material.
- T6.C should decide which fixtures become conformance vectors versus diagnostic, historical, regression, or illustrative material.
- No blocking issue remains for T5.A.
