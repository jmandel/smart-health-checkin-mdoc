# T1.C adjudication — architecture, roles, flows, and design principles

## Attempts reviewed

- `spec-work/t1c-architecture-roles-flows/attempt-01.md`
- `spec-work/t1c-architecture-roles-flows/attempt-02.md`
- `spec-work/t1c-architecture-roles-flows/attempt-03.md`
- `spec-work/t1c-architecture-roles-flows/attempt-04.md`
- `spec-work/t1c-architecture-roles-flows/attempt-05.md`

## Strongest contributions

- **Attempt 01**: Best complete role-contract treatment, especially the Submission service and Completion display boundaries; strong statement that presentation objects do not substitute for SMART request identifiers, request item identifiers, fulfillment links, or per-item status.
- **Attempt 02**: Best concise invariant that clinical semantics are defined once; useful explanation that transport success is not clinical success; strong trust-boundary bullets.
- **Attempt 03**: Best high-level numbered flow summaries and clean Requester/Verifier distinction; strongest formulation that conformance rules belong in later normative sections and Appendix A.
- **Attempt 04**: Best compact text for two payload domains and sequence diagrams; useful caution that retention is deployment policy rather than a transport side effect.
- **Attempt 05**: Best expansion of design principles, including transport-neutral content, kiosk re-entry, FHIR canonicals, media types, Holder privacy, and keeping implementation architecture out of protocol requirements.

## Contradictions, missing pieces, and overreach

- **Whether §3 should contain enforceable SHALL/SHOULD language**: The outline labels §3 as informative architecture with normative pointers. Several attempts used requirement-like phrasing in design principles, while others avoided conformance verbs. I kept §3 as architecture and pointers, reserving precise obligations for §§4–9, §§11–13, and Appendix A.
- **Kiosk as peer flow vs. wrapper**: Some wording treated same-device and kiosk as two parallel end-to-end flows. The accepted invariant is stricter: kiosk is an optional wrapper/re-entry pattern around same-device presentation, not a second clinical protocol.
- **Kiosk payload shape**: Attempts agreed in substance but varied in detail. The active type defines `KioskRequestPayload.smartRequest: SmartCheckinRequest` (`rp-web/src/kiosk/protocol.ts` lines 20–32), request creation stores `smartRequest: input.smartRequest` directly (`rp-web/src/kiosk/protocol.ts` lines 139–162), and validation runs `validateSmartCheckinRequest(payload.smartRequest)` (`rp-web/src/kiosk/protocol.ts` lines 405–428). I therefore state direct `smartRequest` embedding and reject demo presets, preset names, SDK helper objects, or request-wrapper shortcuts as protocol substitutes.
- **Phone re-entry into same-device presentation**: The active submit page extracts `resolved.verified.payload.smartRequest` (`rp-web/src/kiosk/submit-main.tsx` lines 44–48) and passes it directly to `SmartCheckinButton` (`rp-web/src/kiosk/submit-main.tsx` lines 184–193). The same page explains that the QR carried only a pointer and the full SMART request was fetched, decrypted locally, and verified (`rp-web/src/kiosk/submit-main.tsx` lines 225–239). I resolved the kiosk flow around Phone presenter resolution followed by local same-device presentation.
- **Active same-device carrier and identifiers**: Attempts consistently named direct `org-iso-mdoc`, but some stayed abstract. Active docs identify the only active profile and list `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, `ItemsRequest.requestInfo`, and response carrier details (`docs/profiles/org-iso-mdoc.md` lines 1–16, 53–66). Implementation constants match those identifiers (`rp-web/src/protocol/index.ts` lines 1–10, 42–46). I included one docType, one namespace, one stable element as a design principle with §8/§13 pointers.
- **`profilesFrom[]` and selector additivity**: Attempts preserved the array shape, but some risked broadening additivity beyond profile selectors. Active request docs say `profilesFrom` is a profile publication/IG/collection reference with array examples and that `profiles` plus `profilesFrom` are additive (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 279–297). They describe `resourceTypes` as optional narrowing (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 299–315), and the rule summary confirms `profilesFrom` is a non-empty array and additivity applies to `profiles` plus `profilesFrom` (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 1070–1074). I limited additivity to those profile selectors and deferred `resourceTypes[]` interaction to §5.
- **Requester identity in the clinical body**: Attempt text varied between “no requester identity” and more general trust language. Active request rules say the request object SHALL NOT include self-asserted requester identity metadata such as clinic name, logo, or URL (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 1058–1065). I preserved the architectural boundary while pointing the enforceable rule to §5.
- **Retention principle**: The outline's “Default-to-retention” phrase conflicts with privacy-sensitive readings. Active mdoc notes say the checked-in implementation defaults `intentToRetain = true` for the stable response element (`docs/profiles/org-iso-mdoc.md` lines 69–72), but T1.B keeps longitudinal Wallet storage, EHR write-back, and downstream retention policy out of scope. I resolved this as “separate retention signals from storage mandates”: §8 can define transport retention signals, while §12 and deployment policy control minimization and retention.
- **Trust boundaries**: Attempts emphasized different names. I merged them into explicit boundaries for Holder, clinical content, origin/user agent, reader/Verifier, issuer/device, Holder data source, kiosk relay, and downstream workflow. This preserves T1.B layerable trust and avoids implying that one successful presentation proves identity, clinical provenance, authorization, or EHR acceptance.
- **Sequence diagram format**: Some attempts included diagrams that were useful but too compressed or alignment-fragile. The canonical diagrams are plain fenced `text` blocks with no generated assets or HTML dependency, preserving the pure-Markdown source-of-truth decision from T1.A.

## Resolutions and downstream decisions

- §1.1 can now be stated coherently and is included in `canonical.md`.
- §3 preserves the T1.B three-layer framing: clinical content model, base same-device presentation flow, optional cross-device kiosk flow.
- The SMART request and SMART response are transport-neutral clinical JSON objects; mdoc, DC API, kiosk pointer, encrypted kiosk request, encrypted submission, and completion notification artifacts are presentation transport or wrapper artifacts.
- Version 1.0 same-device presentation is direct `org-iso-mdoc` over the W3C Digital Credentials API, with exact byte-level and validation details deferred to §8.
- The cross-device kiosk flow embeds the SMART request directly as `smartRequest`, resolves it on the phone, re-enters same-device presentation locally, and returns an encrypted result for Completion display processing under §9.
- The Submission service and pointer transport are untrusted for plaintext clinical content and should be handled under the security and privacy requirements in §§9, 11, and 12.
- Role contracts are protocol-level only. They do not define product packaging, EHR write-back, patient matching, payment adjudication, Wallet storage architecture, SDK boundaries, or browser conformance beyond flow assumptions.
- `profilesFrom[]` remains an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors; `resourceTypes[]` interaction remains a §5 topic.
- Design principles are written as architectural pointers, not duplicate conformance rules. Later sections should translate them into one-row-per-rule requirements only where the detailed section owns the exact behavior.

## Open issues

- None blocking for T1.C.
- Later §8 should decide the final normative wording for the mdoc retention signal currently represented by `intentToRetain = true`, without turning it into a general storage mandate.
- Later §§11–12 should revisit kiosk relay metadata, QR substitution, replay, Holder display, telemetry, and retention using the trust boundaries summarized here.
