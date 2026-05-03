# T3.A adjudication — trust framework

## Attempts reviewed

- `spec-work/t3a-trust-framework/attempt-01.md`
- `spec-work/t3a-trust-framework/attempt-02.md`
- `spec-work/t3a-trust-framework/attempt-03.md`
- `spec-work/t3a-trust-framework/attempt-04.md`
- `spec-work/t3a-trust-framework/attempt-05.md`

## Strongest contributions

- **Attempt 01**: Best fine-grained separation of trust layers, explicit handling of unauthenticated origin, unsigned reader requests, self-attested wallets, SMART Health Card source evidence, raw FHIR provenance limits, identifier scopes, and out-of-band policy. It also avoided moving §8 byte mechanics into §7.
- **Attempt 02**: Strongest concise base-flow alignment. It clearly made `readerAuth` optional, framed certificate-chain validation as deployment policy, distinguished self-attested wallet evidence from production issuer assurance, and emphasized that §8 owns byte construction.
- **Attempt 03**: Best high-level trust inventory and policy framing. It explicitly identified web origin / privileged caller, reader authentication, mdoc issuer and device-key proof, clinical-content provenance, and out-of-band deployment policy as separate layers.
- **Attempt 04**: Strongest normative coverage. It gave concrete behavior for missing origin, failed readerAuth, untrusted reader certificates, self-attested models, raw FHIR, SMART Health Cards, and deployment-profile documentation.
- **Attempt 05**: Cleanest canonical structure matching the requested §7 subsections. It preserved accepted T1/T2 facts, especially transport-neutral clinical objects, no requester identity in the request body, display-only `purpose` / `title` / `summary`, and kiosk deferral.

## Repository and canonical evidence used

- The accepted T1.A terminology defines SMART request and SMART response as transport-neutral JSON objects and states that those terms do not refer to mdoc envelopes, kiosk pointers, encrypted submissions, or acknowledgments (`spec-work/t1a-editorial-terminology/canonical.md` lines 31-35, 61-64).
- T1.B establishes the three-layer scope: transport-neutral clinical content model, base same-device direct `org-iso-mdoc` over W3C Digital Credentials API, and optional kiosk wrapper (`spec-work/t1b-purpose-scope-goals/canonical.md` lines 1-15). It also states layerable trust and that successful transport does not prove clinical-source provenance for unsigned content (`spec-work/t1b-purpose-scope-goals/canonical.md` lines 105-108).
- T1.C makes the domain split normative architecture: transports add origin, Verifier, signature, encryption, freshness, device, routing, and relay metadata but do not change clinical semantics (`spec-work/t1c-architecture-roles-flows/canonical.md` lines 11-20). It defines direct `org-iso-mdoc` over W3C Digital Credentials API as the base flow and assigns byte mechanics to §8 (`spec-work/t1c-architecture-roles-flows/canonical.md` lines 36-42).
- T1.C also defines kiosk as wrapper/re-entry and says the Submission service is not trusted with plaintext clinical content (`spec-work/t1c-architecture-roles-flows/canonical.md` lines 71-89, 121-137). Active code confirms `KioskRequestPayload.smartRequest` embeds the SMART request directly and the phone submit page passes that request into the same `SmartCheckinButton` flow (`rp-web/src/kiosk/protocol.ts` lines 20-46, 138-175; `rp-web/src/kiosk/submit-main.tsx` lines 45-64, 185-193).
- T2.A requires the SMART request body to exclude self-asserted requester identity metadata and treats `purpose` as Holder-facing display context, not identity or trust (`spec-work/t2a-clinical-request-model/canonical.md` lines 1-8, 78-84, 100-112). Active docs make the same design principle explicit (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 50-55, 102-110).
- T2.B defines response `requestId`, Artifact-id scoping, SMART Health Card Artifact shape, and raw FHIR provenance limits (`spec-work/t2b-clinical-response-model/canonical.md` lines 33-38, 66-72, 111-121, 138-153). Active SDK validation enforces no outer `fhirVersion` for SMART Health Cards and requires `fhirVersion` for raw FHIR JSON (`rp-web/src/sdk/core.ts` lines 232-246).
- T2.C reinforces that FHIR evidence lives in request selectors, raw FHIR Artifacts, or signed SMART Health Card payloads and that protocol validation is separate from downstream clinical acceptance (`spec-work/t2c-fhir-mapping-appendix/canonical.md` lines 1-6, 123-136, 196-206).
- Active profile docs identify the direct `org-iso-mdoc` identifiers and record current readerAuth behavior: per-`DocRequest.readerAuth` is included when origin is known, DeviceRequest version `1.0` is used rather than `readerAuthAll`, and production reader trust anchors remain policy work (`docs/profiles/org-iso-mdoc.md` lines 1-16, 39-76, 98-103). Implementation constants match the active protocol identifiers (`rp-web/src/protocol/index.ts` lines 1-10, 42-46).
- The protocol explainer states that the Browser binds the request to web origin and that the RP verifies mdoc structure, MSO digests, COSE signatures in fixture oracles, and then parses the SMART response (`docs/PROTOCOL-EXPLAINER.md` lines 35-58, 60-75).

## Contradictions, missing pieces, and overreach

- **Origin source and fallback**: Attempts agreed that origin does not come from the SMART request body, but attempts 03 and 04 discussed kiosk wrapper identity as a possible fallback inside §7. The canonical keeps missing-origin handling in §7.1.3 and refers kiosk-specific wrapper trust to §9, because T1.C says kiosk is a wrapper/re-entry pattern rather than a separate clinical protocol.
- **Unsigned versus failed signed reader requests**: Attempts 01, 02, and 05 allowed unsigned reader operation by policy. Attempts 03 and 04 were stricter for failed signed requests. The canonical resolves this by permitting unsigned requests by policy, requiring Wallets to distinguish absent readerAuth from failed readerAuth, and allowing continuation after failure only under explicit reduced-assurance policy.
- **Reader certificate policy**: Attempts varied between detailed certificate-profile requirements and broad deployment choice. The canonical requires policy definition before reader certificate trust is relied on, but leaves exact trust anchors, EKUs, OIDs, revocation, and registries to deployment profiles because active docs say production reader identity and trust anchors remain policy work.
- **Mdoc issuer trust**: Attempts consistently mentioned IACA-style or registry-based anchors. The canonical preserves both as examples and does not mandate a single issuer registry. It requires Verifiers not to treat a syntactically valid MSO, included leaf certificate, or self-signed issuer as production issuer trust without an accepted trust anchor.
- **Device key proof**: Attempts agreed that device proof is presentation/container evidence. The canonical states that proof of possession is required before relying on mdoc evidence but does not define `DeviceAuthentication`, `SessionTranscript`, HPKE, or byte checks; those belong to §8.
- **Self-attested wallet model**: Attempts varied in tone between permissive and restrictive. The canonical permits self-attested deployments only under explicit policy, requires accurate assurance labeling, and states that self-attestation does not relax SMART response validation or create clinical-source provenance.
- **SMART Health Cards and raw FHIR**: Attempts mostly agreed, but some expanded into downstream clinical workflows. The canonical follows T2.B/T2.C: SMART Health Cards carry signed evidence inside each JWS payload and have no outer Artifact `fhirVersion`; raw FHIR JSON is patient-mediated unless separately signed or provenanced.
- **Identifier scoping**: Attempts sometimes introduced kiosk/session identifiers in §7. The canonical mentions presentation and wrapper identifiers only to prevent conflation with SMART request ids, item ids, Artifact ids, `fulfills[]`, and `requestStatus[]`; §9 will define kiosk bindings.
- **Security/privacy closure**: Several attempts touched replay, UI warning language, retention, telemetry, and abuse controls. The canonical keeps only trust-framework seams and explicit non-misrepresentation requirements. Detailed security and privacy closure remains for §§11-12.
- **BCP 14 overuse**: Drafts mixed global requirements with deployment-policy examples. The canonical uses RFC 2119/8174 keywords only with named targets such as Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator.

## Resolutions and downstream decisions

- §7 preserves the accepted invariant that SMART request and SMART response are transport-neutral clinical JSON objects. Presentation trust signals do not redefine clinical request/response semantics.
- §7 keeps the clinical request body free of self-asserted requester identity and treats `purpose`, `title`, and `summary` as display context only.
- §7 defines distinct trust layers for origin, privileged-caller policy, reader authentication, mdoc issuer/device evidence, clinical-source provenance, identifier scoping, and out-of-band deployment policy.
- `readerAuth` is optional in core version 1.0. Deployment profiles can require it. Wallets must not overstate absent, failed, or untrusted reader authentication.
- Production reader trust anchors, privileged-browser allow-lists, mdoc issuer trust anchors, SMART Health Card issuer trust policy, raw-FHIR provenance policy, patient matching, and EHR ingestion acceptance remain deployment-policy choices unless a later normative section narrows them.
- §8 must define exact same-device `org-iso-mdoc` mechanics: origin binding, per-`DocRequest.readerAuth`, `ReaderAuthentication`, `SessionTranscript`, HPKE, MSO/issuerAuth checks, digest validation, device-key proof, response extraction, and failure handling.
- §9 must preserve kiosk wrapper/re-entry semantics: signed/encrypted kiosk request, pointer binding, phone validation, same-device re-entry, encrypted submission, and Completion display processing without changing SMART clinical semantics.
- §§11-12 should revisit origin spoofing, reader impersonation, issuer-trust pivots, raw FHIR overclaiming, status-message privacy, retention, telemetry, reduced-assurance UX, and kiosk relay metadata.
- Appendix A should list each §7 SHALL/SHOULD with a clear conformance target and distinguish core protocol obligations from deployment-profile obligations.
- Appendix B remains focused on clinical JSON shape; §7 trust validation is procedural and cannot be represented in standalone request/response JSON schemas.

## Open issues

- Whether a future core conformance profile requires authenticated origin for every same-device presentation remains open for §4 / §8 / Appendix A closure.
- Production reader certificate profiles, revocation mechanisms, trust-anchor distribution, and Holder display conventions remain open deployment-profile or trust-framework work.
- Production mdoc issuer/IACA-style anchor or registry mechanics remain open for deployment profiles, §13 registry considerations, or future trust-framework publications.
- Exact UI wording for reduced-assurance states should be closed in §§11-12 and implementation guidance, not in §7.

## Conformance inventory notes for Appendix A

The canonical §7 introduces Appendix A rows for, at minimum:

- no substitution between trust layers;
- no requester identity or origin inference from the SMART request body;
- use of platform-provided origin when origin trust is used;
- privileged-caller trust being authenticated and deployment-defined;
- missing-origin behavior and non-misrepresentation;
- `readerAuth` construction and non-reuse by Verifiers that include it;
- `readerAuth` verification and failed-reader handling by Wallets/Responders that support or rely on it;
- reader certificate trust-anchor policy before certificate-based trust is relied on;
- unsigned versus failed signed reader handling;
- §8 mdoc/device validation before relying on mdoc evidence;
- issuer trust-anchor policy before claiming production issuer trust;
- device-key proof verification before accepting device-bound evidence;
- self-attested Wallet assurance labeling and non-equivalence to production issuer trust;
- SMART Health Card JWS verification before relying on signed clinical-source evidence;
- no outer `fhirVersion` on SMART Health Card Artifacts;
- raw FHIR being treated as patient-mediated absent accepted separate provenance/signature evidence;
- identifier-scope preservation; and
- deployment-profile documentation and non-redefinition of SMART clinical semantics.
