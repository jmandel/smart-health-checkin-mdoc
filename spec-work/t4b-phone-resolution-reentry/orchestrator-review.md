# T4.B orchestrator review

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
- `../t3d-same-device-cddl-fixtures/canonical.md`
- `../t4a-kiosk-request-pointer/canonical.md`
- active kiosk protocol, provider, submit page, demo-key, and provider-test code

Decision: T4.B is accepted as the canonical phone resolution and same-device
re-entry cutpoint.

Edits applied:

1. Tightened encrypted-envelope field validation wording so string fields are
   described as non-empty strings and timestamp fields are described as numeric
   values, matching the active TypeScript shape.

Validation notes:

- Confirmed active phone resolution parses pointer-only `#r=<requestId>` URLs,
  resolves provider state by that id, opens `EncryptedKioskRequest`, verifies
  the compact kiosk request JWS, validates the embedded `smartRequest`, and
  passes that request into the phone-local same-device presentation flow.
- Confirmed legacy fragments that inline §8 `deviceRequest` / `encryptionInfo`
  remain out of scope for the active kiosk wrapper.

Accepted decisions:

- T4.B constructs a fresh §8 `org-iso-mdoc` request on the phone after kiosk
  wrapper validation; it does not reuse §8 artifacts from QR, pointer, relay,
  envelope, or JWS state.
- The pointer, provider row, encrypted envelope, and signed payload wrapper
  `requestId` are bound together, but remain distinct from `smartRequest.id`.
- `smartRequest` is validated under §5 before same-device re-entry.
- Wrapper decryption and creator-JWS verification do not prove Holder consent,
  patient identity, requester identity through display fields, clinical-source
  provenance, mdoc issuer/device trust, downstream authorization, or production
  deployment trust.

Blocking issues:

- None.

Downstream notes:

- T4.C must define response-submission plaintext, encryption to signed
  `encryptResponseTo.desktopPublicKeyJwk`, `constraints.maxPlaintextBytes`
  enforcement, provider rows/blobs, desktop completion processing,
  replay/single-use behavior, and phone-to-desktop failure/status behavior.
- T4.D must align kiosk CDDL/schema and fixtures with T4.A/T4.B field names,
  pointer-only URLs, deterministic JSON JWS signing input, HKDF salt/info/AAD,
  request-id bindings, and failure vectors.
- §11, §12, and §13 still own production request-opening key custody, demo-key
  treatment, pointer guessing, QR substitution, metadata leakage, issuer/audience
  registries, clock-skew windows, TTLs, duplicate-member handling, and provider
  registry/conformance policy.
