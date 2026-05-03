# T1.B adjudication — purpose, scope, goals, and non-goals

## Attempts reviewed

- `spec-work/t1b-purpose-scope-goals/attempt-01.md`
- `spec-work/t1b-purpose-scope-goals/attempt-02.md`
- `spec-work/t1b-purpose-scope-goals/attempt-03.md`
- `spec-work/t1b-purpose-scope-goals/attempt-04.md`
- `spec-work/t1b-purpose-scope-goals/attempt-05.md`

## Strongest contributions

- **Attempt 01**: Best complete narrative through all T1.B subsections; strong articulation of the three coordinated layers, concrete use-case details, many-to-many fulfillment, and the distinction between check-in and plain credential presentation.
- **Attempt 02**: Best concise scope inventory of what the profile fixes across EHRs and Wallets; useful pure-Markdown reminder; strong language for clinical policy and platform APIs as out of scope.
- **Attempt 03**: Best threat-model structure by same-device, kiosk, and clinical-content risks; strongest description of active-network and curious-relay threats; useful warning that future bindings must not weaken version 1.0 flows.
- **Attempt 04**: Best workflow-bounded explanation of why issuance and presentation alone are insufficient; strong language that the clinical request body is not a requester identity credential, consent directive, or persistent authorization grant.
- **Attempt 05**: Most consistent use of T1.A terminology; best compact preservation of `profilesFrom[]` array shape, profile-selector additivity, kiosk re-entry, and deferred normative detail.

## Contradictions and resolutions

- **Threat-model cross-reference**: The outline line for §2.5 says “cross-references §10” (`spec.md.outline` line 61), but the dependency tree assigns security considerations to §11 and privacy considerations to §12, while §10 is reserved for OID4VP (`spec.md.outline.dependency_tree` lines 348–360, 466–475). All attempts correctly leaned toward §§11–12. I resolved this by making §2.5 point to §11 for security and §12 for privacy, with §10 treated as a reserved future-binding section unless the outline is changed.
- **Scope of `profilesFrom[]` and additivity**: Attempts agree that `profilesFrom[]` is an array, but some language risked broadening additivity beyond profile selectors. Active request docs state `profilesFrom` is a reference to FHIR publications, implementation guides, or profile collections and show an array example (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 279–297). The same docs state `profiles` and `profilesFrom` are additive (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 291–295, 1070–1072), while `resourceTypes` is optional narrowing (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md` lines 299–315). I limited “additive selectors” to `profiles[]` plus `profilesFrom[]` and deferred `resourceTypes[]` interaction to §5.
- **Kiosk payload shape**: All attempts reject demo presets, but some used generic “wrapper” language that could imply a separate clinical request object. The active type has `KioskRequestPayload.smartRequest: SmartCheckinRequest` (`rp-web/src/kiosk/protocol.ts` lines 20–46), and creation stores `smartRequest: input.smartRequest` directly (`rp-web/src/kiosk/protocol.ts` lines 139–162). I state that the kiosk request payload embeds the SMART request directly as `smartRequest`, with no demo preset, preset name, or request wrapper in its place.
- **Kiosk relationship to same-device flow**: Attempts consistently described kiosk as a wrapper, but differed in detail. The active phone submit page passes the resolved request into `SmartCheckinButton` for the same local DC API flow (`rp-web/src/kiosk/submit-main.tsx` lines 184–193). I resolved on T1.A terms: **cross-device kiosk flow**, **Kiosk creator**, **Submission service**, **Phone presenter**, and **Completion display**, and explicitly say the phone re-enters the same-device presentation flow.
- **Base presentation flow**: Attempts agree on direct `org-iso-mdoc`; repo docs identify it as the only active prototype profile and list the protocol identifiers, docType, namespace, requested element, and request/response carriers (`docs/profiles/org-iso-mdoc.md` lines 1–16, 53–66). Implementation constants match those identifiers (`rp-web/src/protocol/index.ts` lines 42–46). I preserved direct `org-iso-mdoc` over the W3C Digital Credentials API as the base version 1.0 presentation flow while keeping the clinical content model transport-neutral.
- **Plain credential presentation vs check-in**: Attempts varied between “credential issuance/presentation is insufficient” and “presentation is still important.” I retained both: issuance and generic presentation do not define clinical selectors, per-item consent/status, response accounting, or many-to-many fulfillment; version 1.0 still profiles a concrete same-device presentation flow for transport and proof.
- **Out-of-scope boundaries**: Attempts sometimes included clinical policy, platform APIs, trust governance, UI layout, or complete query-language limitations. I kept the user-requested required exclusions as primary: issuance, longitudinal storage, EHR write-back, identity proofing, and payments. I also retained closely related non-goals only where they prevent misreading T1.B as defining a general credential framework, arbitrary FHIR query language, clinical sufficiency guarantee, or production trust governance.
- **Normative overreach**: Several attempts used requirement-like wording in informative sections. The outline marks §§1–2 informative (`spec.md.outline` lines 28 and 44), and the dependency tree places detailed conformance, request/response rules, same-device, kiosk, security, and privacy obligations in later tranches (`spec.md.outline.dependency_tree` lines 150–193, 234–313, 348–379). The canonical text avoids BCP 14 keywords except when referring generally to later sections.

## Scope and non-goal decisions for downstream sections

- Preserve the three-layer framing: the **clinical content model**, the base **same-device presentation flow**, and the optional **cross-device kiosk flow**.
- Treat the SMART request and SMART response as transport-neutral clinical objects. Transport sections may define carriage, proof, encryption, and validation, but must not redefine clinical semantics.
- Keep direct `org-iso-mdoc` over W3C Digital Credentials API as the base version 1.0 same-device presentation flow.
- Define kiosk as a wrapper around the same-device flow. The Phone presenter obtains the embedded SMART request and re-enters same-device presentation on the phone.
- Keep kiosk request payloads direct: `smartRequest` embeds the SMART request; demo presets, preset names, SDK helper objects, or request-wrapper shortcuts are not protocol payloads.
- Preserve `profilesFrom[]` as an array of canonical profile-family URLs.
- Preserve profile-selector additivity only for `profiles[]` plus `profilesFrom[]`; define `resourceTypes[]` interaction separately in §5.
- Preserve per-item Holder review, consent decisions, and status as core design motivations; detailed UI and status-code requirements belong in §§5–6 and §§12.
- Preserve many-to-many fulfillment between Artifacts and request items; detailed validation belongs in §6.
- Keep issuance, longitudinal Wallet storage, EHR write-back, identity proofing, payments, payer transaction adjudication, platform-specific UI/API mechanics, production trust-anchor governance, and arbitrary FHIR query language out of scope unless a later section explicitly defines a narrow protocol effect.
- Do not make raw FHIR JSON equivalent to issuer-signed clinical credentials unless a returned Artifact carries separate provenance or signature evidence.
- Treat the Submission service and pointer transport as untrusted for plaintext clinical content; detailed kiosk encryption, replay, and metadata rules belong in §9 and §11.
- Use §11 as the security-considerations cross-reference and §12 for privacy. Treat §10 as a reserved/future binding area unless the outline is later changed.

## Open issues

None blocking for T1.B. The only editorial mismatch is the outline placeholder that says §2.5 cross-references §10; current tranche planning and section allocation make §11 the correct security cross-reference and §12 the correct privacy cross-reference.
