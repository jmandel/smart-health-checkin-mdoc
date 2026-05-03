# T3.C orchestrator review

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
- active same-device profile docs, TypeScript/Kotlin implementation evidence,
  and referenced fixture roots

Decision: T3.C is accepted as the canonical same-device support-appendices
cutpoint.

Edits applied:

1. None.

Validation notes:

- Confirmed the fixture roots named in Appendix E exist.
- Confirmed Appendix E/F/G remain explanatory and do not create alternate field
  names, request carriers, response carriers, HPKE parameters, trust semantics,
  or clinical semantics.

Accepted decisions:

- Appendix E derives the same-device byte ladder from §8 and binds the direct
  `dcapi` transcript to the exact `encryptionInfo` base64url string and origin.
- Appendix F explains diagnostic notation without overriding Appendix C CDDL,
  Appendix D fixtures, or byte-exact examples.
- Appendix G describes ISO/IEC 18013-5 and Digital Credentials API compatibility
  while preserving the SMART-specific `docType`, namespace, stable response
  element, `requestInfo` carrier, optional per-`DocRequest.readerAuth`, and
  direct `dcapi` handover.

Blocking issues:

- None.

Downstream notes:

- T3.D should use T3.C's byte-boundary vocabulary when drafting Appendix C/D
  same-device CDDL and fixture-index material.
- Appendix C/D should decide whether any duplicate document/element handling,
  nonce-size constraints, digest-id conventions, deterministic encoding rules,
  or fixture classes become testable conformance requirements.
- §11 and §13 still own security/conformance closure for replay/freshness,
  origin requirements, reader trust, issuer trust, plaintext fixture/debug
  handling, and reduced-assurance behavior.
