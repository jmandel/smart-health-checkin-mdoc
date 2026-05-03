## 14. Internationalization

SMART Health Check-in carries a small number of strings whose purpose is Holder-, Requester-, receiver-, staff-, or patient-facing display. It also carries many identifiers, protocol constants, media types, URLs, status codes, cryptographic labels, and routing values whose value depends on exact comparison. Internationalization requirements in this section apply only to human-readable display text. They do not make protocol identifiers localizable and do not define a separate locale-negotiation protocol.

Human-readable display text in version 1.0 includes:

- SMART request `purpose`;
- request item `title` and `summary`;
- SMART response `requestStatus[].message`;
- FHIR `Questionnaire` display text, including fields such as `Questionnaire.title`, `Questionnaire.item[].text`, answer-option display text, and other FHIR Questionnaire strings rendered for Holder interaction;
- human-readable strings inside returned FHIR resources, such as CodeableConcept `text`, coding `display`, Reference `display`, names, labels, annotations, narrative text, and other FHIR-defined display elements;
- implementation-generated UI labels, prompts, warnings, recovery instructions, and error messages shown to Holders, staff, Requesters, or receivers; and
- extension fields that a registered selector, Artifact media type, status extension, or deployment profile explicitly defines as display text.

The following values are identifiers, selectors, protocol constants, routing values, or cryptographic/transport labels rather than localizable text: SMART request `type`, `version`, `id`, request item `id`, Artifact `id`, SMART response `type`, `version`, `requestId`, `requestStatus[].item`, `requestStatus[].status`, `content.kind`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, FHIR version strings, status codes, FHIR canonicals, FHIR `resourceType`, FHIR `id`, FHIR references, mdoc `docType`, namespace and element identifiers, `requestInfo` keys, Digital Credentials protocol identifiers, kiosk wrapper `requestId`, provider row ids, submission ids, storage paths, pointer parameter `r`, JWS `typ`, JOSE/COSE/HPKE algorithm labels, content types, and HPKE `info` strings. Implementations SHALL compare such values under the exact matching rules defined by their owning sections and SHALL NOT translate, case-fold, rewrite, normalize for display, or otherwise localize them before validation.

### 14.1 Language tags

Version 1.0 does not add `lang`, `locale`, or language-map members to the SMART request or SMART response. A Requester that includes display text in `purpose`, item `title`, item `summary`, inline Questionnaire content, or extension-defined display fields should choose text suitable for the expected Holder audience and check-in workflow. When the same request may be used across language communities, the Requester should prefer FHIR-native localization mechanisms for FHIR content and deployment-defined UI localization for implementation-generated strings rather than inventing unregistered SMART request members.

When an implementation or registered extension labels a human-readable string with a language tag, it SHOULD use BCP 47 language tags. Such language tags are metadata about display text; they are not clinical selectors, not requester identity, not trust evidence, and not a signal that all payload content is in that language.

FHIR content follows FHIR internationalization and localization behavior. This specification does not redefine how FHIR resources use `Resource.language`, CodeSystem and ValueSet displays, translation extensions, Questionnaire text, QuestionnaireResponse answers, narrative, or terminology-specific displays. A Wallet/Responder or Verifier that renders FHIR content SHOULD use FHIR-defined language and display data when available, subject to Holder safety, privacy, and local policy.

A Wallet/Responder MAY translate, substitute, or summarize `purpose`, item `title`, item `summary`, Questionnaire display text, FHIR display strings, and implementation-generated UI text for accessibility, localization, safety, or local policy. If it does so, it SHALL preserve the underlying identifiers and selector values used for response construction and validation. Translation of display text SHALL NOT change item `id`, Artifact `id`, `fulfills[]`, `requestStatus[].item`, selector values, accepted media types, or any FHIR canonical used for protocol processing.

A Requester, Wallet/Responder, Verifier, Completion display, or receiver SHOULD NOT assume that an omitted language tag means English or any other particular language. It should treat untagged display text as human-readable text whose language is unknown unless deployment context, FHIR metadata, local configuration, or user preference establishes otherwise.

### 14.2 Unicode normalization and BIDI handling

SMART request and SMART response JSON strings are Unicode strings encoded as UTF-8 when serialized as text or bytes. Human-readable display text MAY contain any Unicode characters permitted by JSON and by the applicable FHIR or extension field. Implementations that accept, store, render, search, or compare display text SHOULD handle Unicode consistently, including combining marks, emoji, non-Latin scripts, and right-to-left scripts.

Display normalization is not protocol normalization. A component MAY normalize human-readable display text, for example to Unicode Normalization Form C, for local storage, search, typography, or duplicate detection. A component SHALL NOT apply such normalization to protocol identifiers before validation unless the field definition explicitly permits it. In particular, Unicode normalization, case folding, accent folding, width folding, punycode display conversion, bidirectional reordering, or confusable-character mapping SHALL NOT be used to make distinct request ids, item ids, Artifact ids, status codes, media types, FHIR canonicals, profile-family URLs, resource types, mdoc identifiers, JWS/COSE/HPKE labels, content types, provider row ids, storage paths, or pointer values compare equal.

A Wallet/Responder, Verifier, Phone presenter, Completion display, or receiver that renders untrusted display text SHOULD apply Unicode bidirectional text controls according to contemporary platform and web best practices, such as isolating untrusted runs from surrounding labels and layout. BIDI isolation is especially important when display text appears near identifiers, origins, domain names, profile URLs, requester or reader trust evidence, status labels, clinical warnings, media types, or consent/action buttons.

Unicode and BIDI handling SHALL NOT allow display text to spoof identifiers, origins, requester identity, reader identity, kiosk-creator identity, profile URLs, FHIR canonicals, Artifact provenance, clinical-source trust, status codes, or validation outcomes. User interfaces SHOULD visually distinguish untrusted request text from authenticated origin, reader-authentication, kiosk-creator, issuer, device, or local-policy trust signals. Implementations should consider script-mixing, homoglyphs, zero-width characters, directional isolates and overrides, control characters, and misleading truncation when displaying security- or trust-adjacent text.

Receivers SHOULD avoid copying untrusted display text into logs, telemetry labels, file paths, object keys, DOM identifiers, CSS selectors, SQL identifiers, or other operational identifiers. If such mapping is necessary, the mapped identifier should be generated independently or safely escaped, scoped, and labeled so localized display text cannot affect validation, routing, retention, or authorization behavior.

### 14.3 Locale negotiation guidance

SMART Health Check-in 1.0 does not define protocol-level locale negotiation. There is no SMART request member that instructs the Wallet/Responder to return a particular language, no response member that declares a negotiated locale, and no requirement for the kiosk Submission service or other untrusted relay to see plaintext language preferences. Future extensions may define localized display packages or language preferences only if they also define security, privacy, fallback, and exact-processing rules.

Implementations may use local context outside the SMART request/response model to choose display language: Holder device preferences, Wallet settings, browser or app locale, deployment configuration, a local staff selection, or FHIR-native language metadata. A Verifier or Kiosk creator that has language preferences available should consider whether transmitting them is necessary for the workflow and privacy-appropriate. Language choices, locale metadata, script preferences, translation requests, and fallback behavior can reveal sensitive information about the Holder, household, care setting, immigration status, disability accommodations, or clinical service context.

A same-device Verifier, Kiosk creator, Phone presenter, or Completion display SHOULD keep locale negotiation local when possible. In kiosk flows, an untrusted Submission service should receive only the encrypted request and submission state defined by §9 and should not receive plaintext locale preferences merely to support relay or lookup. If a deployment profile routes language preferences through infrastructure, it should minimize, scope, encrypt, retain, and log those preferences as potentially sensitive metadata under §12.

A Wallet/Responder SHOULD render Holder-review text in a language the Holder can understand when feasible, while preserving the original request and response values needed for exact validation. If the Wallet/Responder cannot safely render or process a Questionnaire, display string, or extension-defined display field in an appropriate language, it MAY decline the item, report `unsupported`, report `unavailable`, or use another valid §6 status rather than collecting answers against misunderstood text.

A Requester or receiver SHOULD NOT rely on localized `requestStatus[].message` text for machine processing. The machine-processable value is `requestStatus[].status`; `message` is optional explanatory display text and may be omitted, localized, summarized, suppressed, or redacted according to privacy and local policy.

Implementation-generated prompts and errors SHOULD be localizable independently of the SMART request/response wire model. They should support safe recovery without disclosing clinical content, secrets, stack traces, provider internals, valid-id enumeration clues, or unnecessary patient details. Localized error text should not change validation results, status-code semantics, Artifact routing, or trust decisions.

## Organizer notes

### Strengths

- Separates actual display fields from non-localizable identifiers and constants, matching accepted §§5-6 and the active SDK model.
- Preserves privacy constraints from §12 by avoiding a new locale-negotiation protocol and by treating language preferences as potentially sensitive metadata.
- References FHIR localization behavior without redefining FHIR's language, translation, Questionnaire, terminology-display, or narrative rules.
- Makes Unicode/BIDI requirements security-relevant without changing exact-comparison rules for identifiers, media types, canonicals, mdoc values, kiosk pointers, or cryptographic labels.

### Caveats

- The draft intentionally does not add schema members for language maps, `Accept-Language`, negotiated locale, or alternate display bundles; future profiles could add them through the extension/registry process.
- BCP 47 and Unicode references should be added to §1.7 if the canonical §14 keeps these requirements.
- Some UI localization guidance may overlap with §15 implementation notes; canonical text should keep §14 focused on interoperability, privacy, and anti-spoofing.

### Open issues

- Decide whether Appendix A should include separate conformance rows for exact comparison of non-localizable identifiers, BCP 47 use when language tags are present, BIDI isolation, and no protocol-level locale negotiation.
- Decide whether Appendix B should remain unchanged or add annotations that `purpose`, `title`, `summary`, and `message` are display strings but not language-tagged structures.
- Future extension registries should require any extension-defined display text to state localization, language-tagging, privacy, and BIDI expectations.

### Downstream dependencies

- T5.F should capture the small number of normative §14 requirements without duplicating every identifier list.
- T6 examples should avoid implying that English strings are required and should avoid translating identifiers or canonicals.
- §15 implementation guidance can expand on platform-specific localization, safe text rendering, DOM/CSS escaping, and UI toolkit BIDI controls.
