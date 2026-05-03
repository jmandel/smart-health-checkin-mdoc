# T3.D orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- `../t1a-editorial-terminology/canonical.md`
- `../t1b-purpose-scope-goals/canonical.md`
- `../t1c-architecture-roles-flows/canonical.md`
- `../t2a-clinical-request-model/canonical.md`
- `../t2b-clinical-response-model/canonical.md`
- `../t2c-fhir-mapping-appendix/canonical.md`
- `../t2d-json-schema-appendix/canonical.md`
- `../t3a-trust-framework/canonical.md`
- `../t3b-org-iso-mdoc-same-device/canonical.md`
- `../t3c-same-device-support-appendices/canonical.md`
- active same-device profile docs, TypeScript/Kotlin implementation evidence,
  and referenced fixture roots/files

Decision: T3.D is accepted as the canonical same-device CDDL and fixture-index
cutpoint.

Edits applied:

1. None.

Validation notes:

- Confirmed the canonical keeps Appendix C honest as profile pseudo-CDDL rather
  than fabricated complete ISO/IEC 18013-5 CDDL.
- Confirmed named same-device fixture roots and files exist in the repository.
- Confirmed fixture classifications remain conservative and do not promote
  checked-in captures to normative conformance vectors prematurely.

Accepted decisions:

- Appendix C constrains the SMART profile portions of reused mdoc/COSE/HPKE
  structures without redefining the base ISO/IEC 18013-5 structures.
- The SMART request remains only in
  `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
- The SMART response remains only in issuer-signed
  `smart_health_checkin_response` `elementValue`.
- Core version 1.0 uses `DeviceRequest.version == "1.0"` and optional
  per-`DocRequest.readerAuth`; `readerAuthAll` is not the core mechanism.
- `readerAuth` uses detached ES256 `COSE_Sign1` with payload `null`, empty
  external AAD, `ReaderAuthenticationBytes`, and `x5chain` label `33`.
- Appendix D lists only verified same-device fixture roots/files and classifies
  real Chrome/Android captures conservatively as diagnostic/historical unless
  later conformance work promotes named checks.

Blocking issues:

- None.

Downstream notes:

- T4 can now begin because T3 is canonical.
- §11 and §13 still own duplicate handling, replay/freshness, authenticated
  origin requirements, fixture promotion, deterministic encoding, fixed nonce
  sizes, digestID conventions, and registry/conformance closure.
- A future fixture-refresh pass should revisit whether real Chrome/Android
  captures remain historical or should be replaced after §9, §11, §13, and
  worked examples stabilize.
