# T5.E orchestrator review

Reviewed:

- `adjudication.md`
- `canonical.md`
- all five `attempt-*.md` drafts
- accepted T2.A, T2.B, T5.A, T5.B, T5.C, T5.D, and relevant T3/T4
  canonical/review files
- active SDK request/response types and validators, same-device and kiosk
  protocol constants, kiosk phone/creator UI rendering, current docs, and
  fixture/example patterns as needed

Decision: T5.E is accepted as the canonical internationalization cutpoint.

Edits applied:

1. Converted two lower-case `should` statements in `canonical.md` to explicit
   `SHOULD` statements:
   - safe rendering and clear boundaries for human-readable clinical or
     Questionnaire text;
   - avoiding patient-specific clinical text, stable locale identifiers, or
     fine-grained language preferences in relay-visible kiosk metadata.

Validation notes:

- Confirmed §14 applies internationalization requirements only to actual
  human-readable display text: request `purpose`, item `title`, item `summary`,
  response `requestStatus[].message`, FHIR Questionnaire text, FHIR display
  strings, implementation UI prompts/errors, and extension-defined display
  fields.
- Confirmed §14 does not localize or relax exact comparison for protocol
  identifiers and machine values: request/response discriminators and ids,
  item ids, Artifact ids, selectors, profile URLs, FHIR canonicals used as
  machine values, media types, status codes, mdoc identifiers, kiosk wrapper
  ids, storage paths, JWS/content-type/algorithm labels, HKDF/HPKE info strings,
  or Pointer URL parameter `r`.
- Confirmed §14 does not invent core `lang`, `locale`, `Accept-Language`,
  negotiated-locale, language-map, pointer-locale, or relay-visible locale
  fields.
- Confirmed FHIR localization, `Resource.language`, terminology displays,
  translation extensions, Questionnaire rendering, QuestionnaireResponse
  construction, narratives, and implementation-guide rules are deferred to FHIR
  and deployment policy rather than redefined here.
- Confirmed Unicode normalization and BIDI handling are framed as display and
  anti-spoofing requirements, not parser normalization for signed, encrypted,
  hashed, fixture-tested, or exact-validated values.
- Confirmed language and locale metadata are handled consistently with §12
  privacy minimization and §9's untrusted kiosk relay boundary.

Accepted decisions:

- Missing language tags do not imply English or any other particular language.
- BCP 47 is guidance for tags introduced by FHIR, a registered extension,
  deployment profile, or implementation UI, not a new core SMART request field.
- Wallet/Responder localization can improve Holder comprehension, but it must
  preserve underlying protocol values for response construction, validation,
  fulfillment accounting, and status semantics.
- Localized `requestStatus[].message` text is explanatory display text; the
  machine-processable result remains `requestStatus[].status`.
- UI rendering must visually separate untrusted display text from authenticated
  origins, reader/kiosk identities, mdoc/issuer evidence, clinical provenance,
  status badges, warnings, action buttons, and consent controls.

Blocking issues:

- None.

Downstream notes:

- T5.F should add checklist rows for display-text-only i18n scope, exact
  non-localized identifier handling, no protocol-level locale negotiation,
  BCP 47 use where tags are defined, Unicode/BIDI anti-spoofing, locale-metadata
  privacy, and no untrusted relay-visible locale requirement.
- §1.7 should later include references for BCP 47 and Unicode
  normalization/Bidirectional Algorithm if final §14 keeps those references.
- §13 registry templates may later ask extension authors to identify
  display-text fields and language-tag/privacy/BIDI behavior.
- §15 can provide platform-specific guidance for `dir=auto`/isolation,
  safe truncation, exact-value reveal, local translation, and sanitized
  diagnostics.
