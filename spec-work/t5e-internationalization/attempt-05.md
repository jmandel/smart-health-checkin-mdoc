# T5.E Internationalization — attempt 05

## 14. Internationalization

SMART Health Check-in carries several classes of strings. Internationalization requirements apply only to strings that are intended for human display. They do not apply to identifiers, registry values, media types, cryptographic labels, or other protocol constants except where those values are rendered to help a user or operator distinguish them from human-readable text.

Human-readable display text includes the SMART request `purpose`, request item `title`, request item `summary`, `requestStatus[].message`, display and text strings inside FHIR `Questionnaire` content, FHIR resource human-readable strings such as `display`, `text`, names, labels, and narratives, implementation-generated UI prompts, recovery text, and errors, and extension fields whose registration explicitly defines them as display text.

Identifiers and protocol constants are not localized. This includes SMART request `type`, `version`, `id`, item `id`, Artifact `id`, response `requestId`, `content.kind`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, status codes, mdoc doc types, namespaces, element identifiers, `requestInfo` keys, kiosk wrapper `requestId`, provider row ids, submission ids, storage paths, JWS `typ`, content types, algorithm labels, HPKE or COSE info strings, and the Pointer URL parameter `r`.

### 14.1 Language tags

SMART Health Check-in 1.0 does not define a top-level locale parameter, an `Accept-Language` field, or a per-string language map for the transport-neutral SMART request or response. A Requester that needs localized `purpose`, item `title`, or item `summary` text chooses the display text before constructing the SMART request. A Wallet/Responder that needs localized `requestStatus[].message` text chooses that display text before constructing the SMART response. These choices do not change request matching, Artifact fulfillment, status semantics, or response validation.

When a language tag is present because it is defined by FHIR, an extension, or a deployment profile, the producer SHOULD use a well-formed BCP 47 language tag. Consumers SHOULD preserve the supplied tag when carrying the associated content and SHOULD compare language tags using BCP 47 matching rules rather than byte-sensitive string matching unless a referenced profile requires an exact value.

FHIR resources and FHIR `Questionnaire` content retain their own language and localization behavior. This specification does not redefine FHIR `Resource.language`, translation extensions, terminology displays, Questionnaire rendering rules, or server-side localization behavior. A Wallet/Responder that renders or answers a FHIR Questionnaire SHOULD follow the applicable FHIR version and Questionnaire implementation-guide rules for localized display, answer coding, and `QuestionnaireResponse` construction.

A Requester SHOULD author Holder-facing request text in a language the intended Holder can reasonably understand, or in language-neutral terms where no preference is known. A Wallet/Responder MAY translate, summarize, reorder, group, or suppress display text for accessibility, safety, localization, or local policy, subject to the Holder-control and privacy requirements in §12. Such presentation changes do not change item ids, selectors, `accept[]`, `required`, `fulfills[]`, or `requestStatus[]` accounting.

Extension registrations that define human-readable display fields SHALL state whether those fields can carry language tags, how multiple localized alternatives are represented if supported, and which field remains machine-processable. Extension registrations SHALL NOT make localized display text the only source of selector semantics, status semantics, requester identity, origin, provenance, or trust.

### 14.2 Unicode normalization and BIDI handling

SMART requests and SMART responses are UTF-8 JSON as defined in §§5-6. Producers of human-readable display text SHOULD emit Unicode Normalization Form C (NFC). Consumers SHOULD be prepared to receive valid Unicode strings that are not NFC, because FHIR content, copied text, user-entered answers, and extension payloads can originate outside this protocol.

Normalization is a presentation and text-processing concern, not an identifier-matching rule. A Requester, Wallet/Responder, Verifier, Phone presenter, Completion display, or receiver SHALL NOT apply Unicode normalization, case folding, width folding, accent folding, confusable mapping, or BIDI-control removal before comparing or validating protocol identifiers and constants, including request ids, item ids, Artifact ids, `requestId`, status codes, media types, selector kinds, FHIR canonicals, profile URLs, mdoc identifiers, JWS `typ`, algorithm labels, storage locators, and Pointer URL parameter names or values. Those values are compared exactly as specified by their defining sections.

Implementations MAY normalize human-readable text for display, search, indexing, speech output, or local UI consistency, but they should retain the original value where it is part of a signed, encrypted, audited, or FHIR-defined payload. If normalized display text is logged or indexed, the privacy guidance in §12 applies because language, script, spelling, and normalization choices can disclose sensitive information.

Display components that render untrusted or requester-supplied text SHOULD apply the Unicode Bidirectional Algorithm with isolation appropriate to the UI platform, such as `dir=auto`, first-strong isolation, or equivalent plaintext isolation. Wallets, Phone presenters, Verifiers, Completion displays, and receivers SHOULD isolate untrusted display strings from adjacent labels, origins, identifiers, status badges, and trust signals so that right-to-left or left-to-right text cannot reorder surrounding UI.

Requesters and Wallets/Responders SHOULD avoid unnecessary BIDI formatting controls and other invisible control characters in `purpose`, item `title`, item `summary`, `requestStatus[].message`, and extension display fields. Consumers MAY replace, reveal, warn about, or suppress such controls in display text when needed for safety or usability, but doing so SHALL NOT change machine validation outcomes. For FHIR resources and Questionnaires, consumers should follow applicable FHIR and rendering-profile guidance before altering clinical display text.

Unicode and BIDI behavior SHALL NOT be used to spoof or obscure protocol identifiers, web origins, requester identity, reader or kiosk-creator trust, profile URLs, clinical-source provenance, status codes, or clinical trust signals. User interfaces that show both human-readable text and machine/trust values SHOULD visually separate them; display protocol identifiers and origins in a way that makes their boundaries clear, and do not concatenate untrusted display text directly into trusted labels.

### 14.3 Locale negotiation guidance

SMART Health Check-in 1.0 does not define a locale-negotiation protocol. In particular, kiosk relays, Submission services, provider rows, Pointer URLs, and encrypted request stores are not given a plaintext locale field by this specification. Language preferences, locale, script, region, input method, timezone, and translation choices can reveal sensitive information and are subject to the metadata-minimization guidance in §12.

A Requester MAY use information it already has through local workflow, authenticated session state, browser UI, patient preference, or deployment policy to select display text before creating the SMART request. If the request is sent through the kiosk flow, that selection happens inside the encrypted and signed request payload; it does not require exposing the Holder's language preference to the untrusted relay.

A Wallet/Responder MAY render the request using the Holder's Wallet locale, accessibility settings, or local translation resources. A Wallet/Responder MAY also choose localized UI prompts, warnings, consent text, recovery text, and `requestStatus[].message` text. The machine-processable fields remain the request item ids, selectors, accepted media types, Artifact metadata, and status codes; receivers SHALL NOT rely on localized messages to determine normative status semantics.

When a Wallet/Responder resolves an external FHIR Questionnaire or other FHIR conformance resource, it MAY use FHIR-defined or HTTP-defined localization mechanisms supported by the deployment. The Wallet/Responder should consider whether such requests disclose the Holder's language preference, location, or check-in context to the FHIR server or intermediary, and should apply local policy before sending additional locale metadata.

A receiver or Completion display MAY localize operator-facing rendering of a SMART response, FHIR content, validation outcomes, and recovery prompts. Localization of UI text does not alter response validation, clinical-source verification, provenance assessment, retention signaling, or downstream clinical acceptance.

## Organizer notes

### Strengths

- Scopes i18n to actual display text and explicitly excludes identifiers and constants from localization.
- Preserves the accepted T2.A/T2.B model: item ids, selectors, media types, `fulfills[]`, and status codes remain machine-processable and exact.
- Aligns with T5.C by treating language and locale as potentially sensitive metadata and avoiding plaintext locale negotiation through untrusted kiosk relays.
- References FHIR localization behavior without redefining FHIR rules.
- Adds Unicode/BIDI safeguards against spoofing requester identity, origins, profile URLs, and clinical trust signals.

### Caveats

- Because the core request/response model has no language-tag fields, §14.1 is mostly guidance plus extension requirements rather than a new wire feature.
- Exact BCP 47 reference placement should be reconciled with the final reference list in §1.7.
- UI isolation examples are intentionally platform-neutral; detailed HTML, mobile, and accessibility implementation advice belongs in §15.

### Open issues

- Appendix B may need comments or non-normative annotations identifying which schema string fields are display text versus identifiers, but no new schema fields are implied here.
- §13 extension-registration templates should include language-tag and display-text questions for any extension that adds human-readable strings.
- §16 examples could include one localized request or Questionnaire example after canonical §14 is accepted, provided it does not imply a locale-negotiation protocol.

### Downstream dependencies

- T5.F should add checklist rows for exact identifier comparison, NFC production guidance for display text, BIDI isolation of untrusted display text, no localized protocol constants, no plaintext kiosk locale negotiation, and extension i18n registration requirements.
- T6.A implementation notes can expand on `dir=auto`, plaintext isolation, accessible translation, safe logging/indexing of localized text, and platform-specific Questionnaire rendering.
