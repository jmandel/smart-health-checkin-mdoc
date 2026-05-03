# T3.B orchestrator review

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
- `../t3a-trust-framework/orchestrator-review.md`
- active same-device profile docs and TypeScript/Kotlin implementation evidence

Decision: T3.B is accepted as the canonical direct `org-iso-mdoc`
same-device flow cutpoint.

Edits applied:

1. Tightened `readerAuth` certificate evidence wording to require COSE header
   label `33` (`x5chain`) with at least the leaf reader certificate for the
   core profile, while leaving chain acceptance, anchors, revocation, and
   assurance labels to deployment profiles.
2. Updated Wallet/Responder `readerAuth` verification wording to refer to
   `x5chain` certificate evidence rather than generic key or certificate
   evidence.

Accepted decisions:

- The SMART request is carried only in
  `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.
- The SMART response is carried as the `elementValue` of the issuer-signed
  `smart_health_checkin_response` item.
- Core version 1.0 uses `DeviceRequest.version == "1.0"` and optional
  per-`DocRequest.readerAuth`; `readerAuthAll` is not the core mechanism.
- Both sides derive the direct `dcapi` `SessionTranscript` from the exact
  `encryptionInfo` base64url string and origin.
- HPKE uses DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, with
  `info = SessionTranscript bytes` and empty AAD.
- Verifier acceptance requires both mdoc/transport validation and §6.6 SMART
  response cross-validation.

Blocking issues:

- None.

Downstream notes:

- T3.C should derive Appendix E/F/G text from §8 without creating alternate
  field names or alternate normative behavior.
- T3.D should align same-device CDDL and fixture indexing with the accepted
  §8 shape, especially tag-24 boundaries, `x5chain`, HPKE envelope fields, and
  fixture classification.
- §11 should revisit replay/freshness, origin spoofing, reduced-assurance
  origin UX, reader impersonation, HPKE key reuse, plaintext debug bundles,
  duplicate document/element handling, and raw-FHIR source-trust overclaiming.
- §13 should decide whether authenticated origin, 32-byte nonces, duplicate
  rejection, or particular fixture classes are core conformance requirements or
  deployment-profile requirements.
