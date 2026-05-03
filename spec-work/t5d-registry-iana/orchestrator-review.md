# T5.D orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T1, T2, T3, T4, and T5.A canonical/review files
- active request/response validators, same-device constants, kiosk protocol
  constants, provider code, docs, and fixture policy evidence as needed

Decision: T5.D is accepted as the canonical registry / IANA considerations
cutpoint.

Edits applied:

- None.

Validation notes:

- Confirmed §13 mirrors accepted wire identifiers rather than creating new
  protocol semantics.
- Confirmed the canonical distinguishes clinical Artifact media types, kiosk
  encrypted-request `contentType`, opaque encrypted response-submission blobs,
  JWS `typ`, profile labels, mdoc identifiers, status codes, selector kinds, and
  payload kinds.
- Confirmed `application/smart-health-checkin-kiosk-request+jws+aesgcm` is
  described as a SMART Health Check-in-defined content-type value and candidate
  IANA media-type registration request, not as a completed external assignment.
- Confirmed external formats and registries such as FHIR JSON, SMART Health
  Cards, JOSE/JWS, COSE, HPKE, ISO/IEC mdoc structures, and Digital Credentials
  API identifiers are referenced rather than redefined.

Accepted decisions:

- Version 1.0 registry text preserves exact active identifiers for request and
  response discriminators, selector kinds, Artifact media types, status codes,
  mdoc/DC API identifiers, kiosk content types, kiosk JWS `typ`, kiosk payload
  kind, algorithm labels, HKDF info strings, and pointer parameter `r`.
- Profile identifiers are conformance, deployment, fixture, certification, or
  test-report labels only; they are not SMART request fields, clinical selectors,
  presets, IPS shortcuts, or substitutes for direct `smartRequest`.
- Unknown status codes and unsupported selector kinds require explicit future
  registration/profile support; recipients must not guess semantics from display
  text, local topic labels, profile labels, wrapper fields, or provider metadata.
- Designated expert review protects existing request/response semantics,
  validation rules, trust-layer separation, direct kiosk `smartRequest`
  embedding, pointer-only active QR behavior, untrusted-relay opacity, and
  conformance/fixture labeling.

Blocking issues:

- None.

Downstream notes:

- T5.F should convert exact registry-controlled identifiers and extension-review
  requirements into checklist rows.
- T6.C should label fixture vectors and captures by the provisional profile
  labels and trust status established here.
- Final publication still needs external references and governance/contact
  details for any actual IANA or project registry submission.
