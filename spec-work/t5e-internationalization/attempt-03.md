## 14. Internationalization

This section applies internationalization requirements to SMART Health Check-in fields and displays that actually carry human-readable text. It does not create a locale-negotiation protocol, redefine FHIR localization behavior, or change exact matching rules for protocol identifiers.

Human-readable display text in the core model includes request `purpose`, item `title`, item `summary`, response `requestStatus[].message`, FHIR Questionnaire display/text content, FHIR resource human-readable or display strings, implementation-generated prompts and errors, and extension fields explicitly defined as display text. Protocol identifiers and constants are not localized, including request `type`, request `version`, request `id`, item `id`, Artifact `id`, response `requestId`, `content.kind`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, status codes, mdoc identifiers, kiosk wrapper `requestId`, provider row ids, storage paths, JWS `typ`, content types, algorithm labels, HPKE info strings, and pointer parameter `r`.

### 14.1 Language tags

SMART Health Check-in 1.0 does not define `lang`, `locale`, or per-field language-tag members for `purpose`, item `title`, item `summary`, or `requestStatus[].message`. Requesters and Wallets/Responders therefore need to treat those strings as display text whose language is established by deployment context, user preference, local policy, or the surrounding application, not by an in-band core SMART request field.

A Requester SHOULD write `purpose`, item `title`, and item `summary` in language that the expected Holder can understand for the check-in workflow. A Wallet/Responder MAY translate, summarize, or replace those strings for Holder review according to local policy, accessibility needs, and available localization resources, but it SHALL preserve item `id` values and other protocol identifiers exactly for fulfillment and status accounting.

A Wallet/Responder that includes `requestStatus[].message` SHOULD use concise language suitable for the Requester or receiver and SHOULD avoid unnecessary clinical details, secrets, stack traces, and diagnostic internals as described in §12. If a receiver displays or localizes `requestStatus[].message`, it SHALL NOT use the localized message to alter the machine-processable status semantics in `requestStatus[].status`.

FHIR content carried in SMART Health Check-in uses FHIR's own internationalization and localization mechanisms. For FHIR Questionnaires, QuestionnaireResponses, resources, code displays, narratives, `Resource.language`, translations, and related display strings, implementations should follow the applicable FHIR specification and implementation-guide rules. SMART Health Check-in does not redefine how FHIR language tags, translations, terminology displays, or Questionnaire rendering work.

An extension selector, extension Artifact media type, or deployment profile that defines new display-text fields SHOULD define whether language metadata is supported. If it defines language tags for non-FHIR display text, it SHALL use well-formed BCP 47 language tags and SHALL specify the scope of each tag. Such an extension SHALL NOT require untrusted kiosk relays or unrelated transport providers to see plaintext language preferences or localized clinical text.

### 14.2 Unicode normalization and BIDI handling

SMART request and SMART response JSON text is UTF-8 as required by §§5 and 6. Requesters, Wallets/Responders, Verifiers, Completion displays, and receivers that generate new human-readable display strings for SMART Health Check-in SHOULD generate those strings in Unicode Normalization Form C (NFC). Implementations MAY normalize implementation-generated display copies for rendering, search, or accessibility, but they SHALL NOT normalize, case-fold, strip, reorder, or otherwise transform protocol identifiers before validation or exact comparison.

Exact string equality remains the comparison rule for identifiers and constants such as SMART request `id`, item ids, Artifact ids, response `requestId`, status codes, selector kinds, media types, FHIR canonicals, mdoc identifiers, JWS `typ`, content types, algorithm labels, HPKE info strings, storage paths, and pointer parameter names. A Verifier or Wallet/Responder SHALL NOT make an otherwise mismatching identifier match by applying Unicode normalization, case folding, confusable-character mapping, BIDI reordering, percent-decoding outside the field's syntax, or display-layer transformations.

Implementations SHALL preserve the original bytes or code points needed for signature verification, hashing, encryption, mdoc digest checks, FHIR canonical preservation, SMART Health Card verification, fixture comparison, and audit. Display normalization must not be applied before cryptographic verification or byte-exact validation.

Human-readable text can legitimately use non-Latin scripts and bidirectional text. User interfaces that render untrusted or externally supplied text, including `purpose`, item `title`, item `summary`, Questionnaire text, FHIR displays, `requestStatus[].message`, Artifact payload displays, and errors, SHOULD apply the Unicode Bidirectional Algorithm with isolation appropriate to the UI framework, for example by isolating untrusted text runs from adjacent labels, identifiers, origins, and trust indicators.

Unicode and BIDI rendering SHALL NOT be allowed to spoof protocol identifiers, origins, requester identity, profile URLs, clinical-source provenance, verified reader or creator identity, issuer trust, status codes, or other clinical trust signals. Displays SHOULD visually separate code-like values from prose, avoid concatenating untrusted text directly next to verified origin or trust labels, and expose exact code-like values in a way that can be copied or inspected when needed for diagnostics. Requesters and extension authors SHOULD avoid invisible controls, bidi overrides, and confusable characters in newly generated ids and protocol-facing strings; existing §5 guidance already recommends simple ASCII item ids for newly defined request items.

### 14.3 Locale negotiation guidance

SMART Health Check-in 1.0 does not define an in-band locale negotiation exchange. A Requester SHALL NOT add ad hoc locale negotiation fields to the SMART request body and expect interoperable Wallet/Responder behavior, and a Wallet/Responder SHALL NOT infer normative selector, consent, status, or validation semantics from localized display text.

Locale choice can reveal sensitive information, including language, region, nationality, accessibility needs, immigration context, clinical-program affiliation, or household circumstances. Implementations SHOULD minimize collection, relay exposure, logging, and retention of locale preferences in the same way they minimize other request context and telemetry under §12. In the kiosk flow, locale preferences and localized plaintext SHOULD NOT be exposed to an untrusted Submission service or provider unless a deployment profile explicitly requires it and protects it.

When a web page, native application, Wallet, or EHR already has a trusted user preference, browser language setting, account locale, or deployment-specific language selection, it MAY use that information to choose display text, render FHIR Questionnaire content, or localize implementation-generated prompts and errors. Such local behavior does not change the SMART request or response shape and does not require the other protocol party to negotiate a locale.

If a deployment needs requester-selected or Holder-selected language behavior across organizational boundaries, it should use an existing trusted application channel, FHIR-defined localization facilities, or a registered extension/deployment profile that specifies privacy handling, fallback behavior, and conformance targets. That profile should define what happens when the requested language is unsupported, but it should not require broad disclosure of language choices to relays, provider dashboards, analytics systems, or unrelated receivers.

Implementations SHOULD provide safe fallbacks when localized text is unavailable: display the original supplied text with clear trust labeling, use neutral implementation-generated prompts, report `unsupported` or `error` when a Questionnaire cannot be safely rendered, or rely on local human workflow. Fallback behavior should preserve exact identifiers, status codes, media types, and FHIR canonicals for validation and should not turn a translation failure into a silent change in clinical request semantics.

## Organizer notes

### Strengths

- Keeps internationalization scoped to actual display text and explicitly excludes identifiers and protocol constants from localization.
- Aligns with §12 privacy guidance by treating language and locale metadata as potentially sensitive and by avoiding relay-visible locale negotiation.
- Defers FHIR language, translation, Questionnaire, narrative, and terminology-display behavior to FHIR instead of redefining it.
- Preserves exact-match and byte-exact validation requirements while still allowing Unicode display text and localized UI prompts.

### Caveats

- The core model has no explicit language-tag members for `purpose`, item text, or status `message`; this draft treats that as an intentional non-feature rather than proposing new fields.
- NFC generation is stated as SHOULD for new display text, not a rejection rule, to avoid invalidating existing FHIR content, signed payloads, fixtures, or user-entered text.
- BIDI guidance is UI-oriented and may need tightening if §15 later gives platform-specific rendering recommendations.

### Open issues

- Decide whether Appendix A should include separate checklist rows for display-text NFC generation, identifier exact-comparison, BIDI isolation, no in-band locale negotiation, and extension language-tag rules.
- Decide whether §13 extension-registration templates should explicitly ask registrants to identify display-text fields and any BCP 47 language-tag metadata.
- Future deployment profiles may define multilingual Holder review or locale handoff, but this should remain outside the core v1.0 SMART request/response fields.

### Downstream dependencies

- T5.F should add conformance inventory rows only for the normative requirements above and avoid broad language support certification.
- §15 can provide implementation examples for web/mobile BIDI isolation, localized prompts, and safe error rendering.
- §16 examples should avoid implying that English text is a protocol requirement and should keep identifiers ASCII and nonlocalized.
