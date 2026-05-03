# T4.A orchestrator review

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
- active kiosk protocol, provider, demo-key, and provider-test code

Decision: T4.A is accepted as the canonical kiosk request-creation and pointer
transport cutpoint.

Edits applied:

1. None.

Validation notes:

- Confirmed active kiosk code uses direct `smartRequest` embedding, not
  `requestProfile`, preset labels, IPS shortcuts, or legacy inline same-device
  request fragments.
- Confirmed active request creation uses ES256 compact JWS, deterministic
  key-sorted JSON signing input, the custom
  `ECDH-P256+HKDF-SHA256+AES-GCM` request envelope, and pointer-only
  `#r=<requestId>` URLs.
- Confirmed the canonical keeps phone resolution/re-entry in T4.B and
  response submission/completion in T4.C.

Accepted decisions:

- The kiosk wrapper is a cross-device wrapper around the same SMART clinical
  request and §8 same-device flow, not a second clinical protocol.
- `KioskRequestPayload.smartRequest` is the complete §5 SMART request object.
- The kiosk wrapper `requestId` is distinct from `smartRequest.id`.
- The relay/submission service is untrusted and does not need plaintext
  `KioskRequestPayload` or plaintext `smartRequest` to route request state.
- The QR/Pointer URL is pointer-only and carries `r=<requestId>` in the URL
  fragment for the active profile.

Blocking issues:

- None.

Downstream notes:

- T4.B must define pointer resolution, encrypted request retrieval/decryption,
  JWS verification, creator-key trust, payload/envelope/pointer binding,
  expiration checks, embedded `smartRequest` validation, and re-entry into §8.
- T4.C must define response-submission plaintext, encryption to
  `encryptResponseTo.desktopPublicKeyJwk`, `constraints.maxPlaintextBytes`,
  submission rows/blobs, Completion display processing, replay/single-use, and
  provider behavior.
- T4.D must align kiosk CDDL/schema and fixtures with the accepted field names,
  deterministic JSON signing input, HKDF salt/info/AAD, request pointer format,
  and conservative fixture classification.
- §11 and §13 still own production key custody, demo private-key treatment,
  QR substitution, pointer guessing, metadata leakage, issuer/audience/key
  registries, canonical JSON conformance, TTL/entropy rules, and provider
  registry closure.
