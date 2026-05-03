# T5.D Registry / IANA considerations adjudication

## Inputs reviewed

Reviewed `spec.md.outline`, `spec.md.outline.dependency_tree`, `spec-work/methodology.md`, and all five T5.D attempts. The dependency tree scopes T5.D to §13.1-§13.7 and requires mirroring identifiers, media types, status codes, selector kinds, profile ids, and JWS `typ` values already defined by T2, T3, T4, and T5.A.

Accepted dependency evidence checked:

- Request model: `spec-work/t2a-clinical-request-model/canonical.md` fixes request `type` `smart-health-checkin-request`, `version` `1`, selector kinds `fhir.resources` and `questionnaire`, `accept[]`, `profilesFrom[]` as arrays, extension selector rules, and the prohibition on requester identity metadata in the SMART request body.
- Response model: `spec-work/t2b-clinical-response-model/canonical.md` fixes response `type` `smart-health-checkin-response`, `version` `1`, Artifact media types `application/fhir+json` and `application/smart-health-card`, status codes `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`, unknown-status rejection, and media-type compatibility extension rules.
- Same-device mdoc: `spec-work/t3b-org-iso-mdoc-same-device/canonical.md`, `spec-work/t3c-same-device-support-appendices/canonical.md`, and `spec-work/t3d-same-device-cddl-fixtures/canonical.md` fix `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`; they also reject dynamic element-name and archived request carriers as active §8 behavior.
- Kiosk flow: `spec-work/t4a-kiosk-request-pointer/canonical.md`, `spec-work/t4b-phone-resolution-reentry/canonical.md`, `spec-work/t4c-submission-completion/canonical.md`, and `spec-work/t4d-kiosk-cddl-fixtures/canonical.md` fix direct `smartRequest` embedding, pointer fragment `r`, JWS `typ` `smart-health-checkin+kiosk-request+jws`, encrypted request `contentType` `application/smart-health-checkin-kiosk-request+jws+aesgcm`, algorithm label `ECDH-P256+HKDF-SHA256+AES-GCM`, `enc` `A256GCM`, HKDF info strings `smart-health-checkin-kiosk-request-v1` and `smart-health-checkin-kiosk-response-v1`, opaque blob use of `application/octet-stream`, and successful `payload.kind` `smart-health-checkin-response`.
- Conformance: `spec-work/t5a-conformance/canonical.md` lists the stable wire identifiers and the provisional labels `smart-health-checkin-core-1`, `smart-health-checkin-mdoc-dcapi-1`, `smart-health-checkin-kiosk-1`, `smart-health-checkin-readerauth-1`, `smart-health-checkin-fixtures-1`, and `smart-health-checkin-oid4vp-reserved`; it states profile identifiers are not SMART request fields or substitutes for `smartRequest`.

Implementation and documentation evidence checked:

- `rp-web/src/sdk/core.ts` enforces request/response `type` and `version`, selector kinds, accepted media types, status codes, and response-against-request validation.
- `rp-web/src/protocol/index.ts` defines `PROTOCOL_ID`, `MDOC_DOC_TYPE`, `MDOC_NAMESPACE`, `SMART_REQUEST_INFO_KEY`, and `SMART_RESPONSE_ELEMENT_ID`; dynamic element helpers are present but explicitly not the active carrier.
- `rp-web/src/kiosk/protocol.ts`, `rp-web/src/kiosk/kiosk-provider.ts`, `rp-web/src/kiosk/instant-mailbox.ts`, and `rp-web/src/kiosk/kiosk-provider.test.ts` confirm kiosk content type, blob content type, JWS `typ`, algorithm labels, HKDF info strings, pointer `r`, direct `smartRequest`, absence of `presetId`, and active `payload.kind`.
- `docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md`, `docs/profiles/org-iso-mdoc.md`, and `docs/PROTOCOL-EXPLAINER.md` confirm one mdoc `docType`, one namespace, one stable element, the `requestInfo` carrier, core request/response fields, selector kinds, media types, and status examples. Some older docs still show prototype examples; canonical T2/T3/T4 text and active code control where docs are stale.
- Fixture material is same-device prerequisite, diagnostic, or implementation evidence. It confirms active identifiers but does not establish production registry assignments or production trust anchors.

## Five-attempt comparison

### Common agreements

All attempts correctly separated at least most of these categories: IANA media-type considerations, mdoc/ISO/Digital Credentials ecosystem identifiers, SMART Health Check-in-controlled registries, provisional profile labels, and JWS `typ` usage. All five preserved the core request/response `type` values, selector kinds, Artifact media types, status codes, mdoc identifiers, kiosk encrypted-request content type, JWS `typ`, algorithm labels, HKDF info strings, pointer `r`, and successful kiosk payload kind. All five rejected `requestProfile`, presets, IPS shortcuts, and “all of the above” shortcuts as in-band request mechanisms.

### Strongest contributions by attempt

- Attempt 01 gave a crisp category framing and a useful warning against representing placeholder registry text as proof of external assignment. Its designated-expert criteria were broad and aligned with T4 kiosk trust-boundary decisions.
- Attempt 02 provided the most complete media-type registration template and explicit distinction between `payload.kind` and JWS `typ`.
- Attempt 03 had the clearest lifecycle/status framing for status codes, selector kinds, and profile labels, and included the reserved OID4VP label from T5.A.
- Attempt 04 best separated clinical Artifact media types, kiosk encrypted request `contentType`, and opaque `application/octet-stream` blobs, and tied the blob language to Completion display validation.
- Attempt 05 gave the clearest concise wording for no external registration overclaiming and for designated-expert review criteria, including future mdoc and kiosk payload-kind changes.

### Disagreements and resolutions

- **IANA status of `application/smart-health-checkin-kiosk-request+jws+aesgcm`:** attempts varied from “registration requested” to “candidate/provisional.” Canonical text treats it as a SMART Health Check-in-defined content-type value and candidate IANA media-type registration request, not an already-completed registration. This follows the user requirement and the lack of any implementation or accepted spec evidence of completed IANA registration.
- **External status of `application/smart-health-card`:** attempts varied between existing media type and external convention. Canonical text references it as externally defined/used by SMART Health Cards and does not redefine or request it here. The spec should cite the SMART Health Cards source when final references are assembled.
- **mdoc registration claims:** attempts agreed on identifiers but differed in how strongly to claim ISO/mdoc registrations. Canonical text states these are project/profile identifiers for the mdoc/Digital Credentials ecosystem and may need applicable external allocation; no completed ISO, IANA, or platform registration is claimed.
- **Profile-id registry permanence:** attempts 01 and 03 treated labels as registered/provisional; attempts 04 and 05 omitted `smart-health-checkin-oid4vp-reserved`; T5.A controls. Canonical text lists all six T5.A labels, marks them provisional/reserved documentation/test-report labels, and does not make them wire fields.
- **Kiosk payload-kind registry placement:** attempts varied between a separate registry and expert-review coverage. Canonical text records `smart-health-checkin-response` in §13.6/§13.7 as the active successful payload kind and requires future payload kinds to go through registry/profile review without creating a full separate table in §13.1-§13.6.
- **Normative breadth of expert review:** attempts included many SHOULD/SHALL statements. Canonical text uses normative terms only where they reinforce already-accepted conformance targets or extension safety; review criteria are mostly `SHOULD` guidance.

## Accepted decisions

1. §13 is a registry mirror, not a new source of wire identifiers or clinical semantics.
2. Existing clinical Artifact media types are referenced: `application/fhir+json` and `application/smart-health-card`. They are not redefined by SMART Health Check-in.
3. The kiosk encrypted request content type is exactly `application/smart-health-checkin-kiosk-request+jws+aesgcm`; it is not a clinical Artifact media type and is not yet claimed as a completed IANA registration.
4. Opaque encrypted kiosk response-submission blobs use `application/octet-stream` as storage/transfer metadata only.
5. mdoc/DC API identifiers are exactly `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request`; dynamic element names and archived claim-name experiments are rejected for version 1.0.
6. Status-code registry entries are exactly `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, and `error`; unknown codes are invalid unless an explicitly supported future extension applies.
7. Content-selector kind registry entries are exactly `fhir.resources` and `questionnaire`; unknown kinds are extension selectors and must not be guessed from display text or profile labels.
8. Profile identifiers are conformance, deployment, fixture, or test-report labels only. They must not appear in the SMART request as `requestProfile`, presets, IPS shortcuts, “all of the above,” topic labels, or shortcuts for `smartRequest`.
9. JWS `typ` is exactly `smart-health-checkin+kiosk-request+jws` for the compact kiosk request JWS. It is distinct from SMART request/response `type`, Artifact media types, encrypted request `contentType`, profile ids, and kiosk `payload.kind`.
10. Future extensions must preserve request/response semantics, validation, trust-layer boundaries, direct kiosk `smartRequest` embedding, wrapper/SMART id separation, pointer-only `r` behavior for the active profile, untrusted relay opacity, and fixture/conformance labeling.

## Rejected or unsupported claims

- Claiming any completed IANA registration for `application/smart-health-checkin-kiosk-request+jws+aesgcm` or `smart-health-checkin+kiosk-request+jws`.
- Claiming SMART Health Check-in redefines `application/fhir+json`, `application/smart-health-card`, JOSE algorithms, COSE algorithms, ISO/IEC 18013-5 structures, or the Digital Credentials API protocol id.
- Treating `profileId`, `requestProfile`, presets, IPS shortcuts, or “all of the above” as clinical request selectors or kiosk request payload substitutes.
- Treating the active InstantDB row names, demo issuer/audience strings, demo keys, fixture captures, or provider ids as production trust anchors or standards registry assignments.
- Treating `application/octet-stream` provider blobs as SMART response Artifact media types or clinical content semantics.
- Treating individual FHIR profiles, request items, Artifact media types, Questionnaires, or status codes as separate version-1 core mdoc elements.

## Active gaps and deferred issues

- Publication governance must decide the formal change controller and contact fields for any IANA media-type template and for SMART Health Check-in registries.
- Final references must cite the external specifications for FHIR JSON, SMART Health Cards, JOSE/JWS, ISO/IEC 18013-5/mdoc, COSE/HPKE, and Digital Credentials API without implying SMART Health Check-in controls them.
- The final publication path must decide whether to submit `application/smart-health-checkin-kiosk-request+jws+aesgcm` as an IANA media type or retain it as a specification-controlled content-type discriminator until later.
- Future profile-id syntax may remain these short labels or migrate to URI/URN form; §13 preserves T5.A labels without making them in-band request fields.
- Future kiosk completion payload kinds may eventually deserve a separate registry table; for 1.0 they are covered by designated expert review and profile registration.

## Dependencies for later cutpoints

- T5.F should add checklist rows for exact registry-controlled identifiers, unknown status-code invalidity, unknown selector handling, no in-band `requestProfile`/preset/IPS shortcuts, exact mdoc carrier values, exact kiosk content type/JWS `typ`, and extension-review prerequisites.
- T6.C and fixture indexes should label fixtures and byte ladders by provisional profile labels and trust status; fixture/demo keys must not be described as production trust anchors.
- Future security/privacy sections should align logging, relay opacity, provider metadata, demo-key, and external-registration warnings with the boundaries here.
