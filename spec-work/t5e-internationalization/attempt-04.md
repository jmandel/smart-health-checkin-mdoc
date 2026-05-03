## 14. Internationalization

SMART Health Check-in carries a small set of strings intended for human review, plus many identifiers, protocol constants, URLs, media types, status codes, and cryptographic labels that are not natural-language text. Internationalization requirements in this section apply only to fields that actually carry human-readable display text.

Human-readable display text includes:

- SMART request `purpose`, item `title`, and item `summary`;
- response `requestStatus[].message`;
- FHIR `Questionnaire` display text, including fields such as `title`, `description`, `text`, `prefix`, answer displays, and other FHIR-defined human-readable questionnaire content;
- human-readable or `display` strings inside returned FHIR resources, such as `CodeableConcept.text`, `Coding.display`, `Reference.display`, names, labels, comments, annotations, narrative, and extension fields explicitly defined as display text;
- implementation-generated Wallet, Verifier, Phone presenter, Completion display, and receiver UI labels, prompts, warnings, validation errors, and recovery text; and
- extension fields whose registered definition explicitly identifies them as human-readable display text.

The following are not localized by this specification and are compared or processed according to the sections that define them: SMART request `type`, `version`, `id`, item `id`, Artifact `id`, response `requestId`, `content.kind`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, status codes, mdoc identifiers, kiosk wrapper `requestId`, provider row ids, storage paths and file ids, JWS `typ`, JOSE/COSE/HPKE content types and algorithm labels, HPKE `info` strings, and Pointer URL parameter `r`. Localizing, translating, case-folding, or visually substituting those values would create interoperability, privacy, and spoofing risks.

### 14.1 Language tags

This version of SMART Health Check-in does not define a new locale-negotiation member, language-preference field, or per-string translation container in the transport-neutral SMART request or SMART response. A Requester MAY choose the language of `purpose`, item `title`, item `summary`, and inline Questionnaire display text using deployment context, user preference already known to the Requester, FHIR content, or local policy, but that choice is part of the display text supplied in the request, not a new protocol negotiation signal.

When a conforming extension, deployment profile, FHIR resource, or implementation-generated UI associates a language tag with human-readable SMART Health Check-in display text, the language tag SHOULD be a well-formed BCP 47 language tag. Implementations SHOULD preserve language tags supplied by FHIR resources according to FHIR rules rather than rewriting them into SMART-specific syntax.

FHIR resources and Questionnaires can already use FHIR-defined localization mechanisms, including `Resource.language`, displays, designations, translations, narratives, and implementation-guide-specific extensions. SMART Health Check-in does not redefine those FHIR mechanisms. A Wallet/Responder that renders, answers, packages, or returns FHIR content SHOULD follow the applicable FHIR version, implementation guide, and local clinical-display policy for language selection and preservation.

A Wallet/Responder MAY translate, summarize, group, or suppress human-readable request text for accessibility, localization, safety, or local policy, as permitted by §5 and §12. Such transformation SHALL NOT change request item `id` values, selector semantics, accepted media types, status code semantics, Artifact references, or other machine-processable protocol values. If translation or summarization could hide broad selectors, advisory `required` flags, retention signals, accepted response forms, or unauthenticated request text, the Wallet/Responder needs to preserve enough meaning for Holder control under §12.1 and §12.4.

Response `requestStatus[].message` is human-readable explanatory text. Its language does not determine the machine-processable status semantics; the `status` code does. A receiver MAY display, suppress, or localize `message` according to workflow and privacy policy, but SHALL NOT use `message` to reinterpret the normative status code.

Language tags and locale choices can reveal sensitive information, including preferred language, region, ethnicity, disability accommodation, travel, or household context. Requesters, Wallets/Responders, Phone presenters, Completion displays, Submission services, and receivers SHOULD avoid recording, relaying, or exposing language preferences or fine-grained locale metadata unless needed for the check-in workflow, Holder accessibility, safety, audit, or support.

### 14.2 Unicode normalization and BIDI handling

SMART request and response JSON strings are Unicode strings encoded as UTF-8 when serialized as JSON text or bytes. For human-readable display text authored or transformed by an implementation, implementations SHOULD generate Unicode Normalization Form C (NFC). Implementations MAY accept display text that is not NFC, especially when it comes from FHIR resources, user-entered Questionnaire answers, or external Holder data sources, but SHOULD avoid producing multiple visually identical variants when generating new display strings.

Protocol identifiers and constants are not human-readable display text. A Wallet/Responder, Verifier, Kiosk creator, Phone presenter, Completion display, Submission service, or receiver SHALL NOT normalize, translate, case-fold, accent-fold, width-fold, or apply locale-sensitive collation when comparing or validating request `type`, `version`, `id`, item `id`, response `requestId`, Artifact `id`, `content.kind`, FHIR canonical URLs, profile-family URLs, FHIR `resourceType` names, media types, status codes, mdoc identifiers, kiosk wrapper ids, Pointer URL parameter names or values, storage paths, JWS `typ`, content types, algorithm labels, or HPKE `info` strings. Those values are compared exactly under their defining sections.

User interfaces commonly display human-readable text beside identifiers, URLs, origins, requester trust signals, profile URLs, status codes, and clinical-source evidence. Implementations that display both classes of data SHOULD visually distinguish machine values from prose, for example by using code-style rendering, truncation with explicit expansion, neutral labels, and separate trust-signal areas. Human-readable `purpose`, item `title`, item `summary`, Questionnaire text, FHIR display strings, `requestStatus[].message`, provider names, demo branding, or extension display text SHALL NOT be rendered as verified requester identity, authenticated origin, trusted reader identity, clinical-source provenance, legal authority, or consent text unless the same fact is established by the relevant trust layer under §§7, 8, 9, and 12.

Implementations SHOULD apply the Unicode Bidirectional Algorithm and isolate untrusted text runs when displaying user-, requester-, relay-, or FHIR-supplied strings next to protocol identifiers, origins, URLs, profile canonicals, media types, status codes, clinical trust indicators, or action buttons. In HTML user interfaces, this typically means using element boundaries, `dir="auto"` or explicit direction where appropriate, and isolation behavior rather than concatenating untrusted bidirectional text into one plain string with trusted labels.

Implementations SHOULD treat unexpected bidi control characters, zero-width characters, mixed-script confusables, and invisible formatting characters in identifiers, URLs, profile canonicals, media types, status codes, origin displays, trust labels, or extension-defined machine values as suspicious. They MAY reject such values when the defining field permits rejection, display them using escaped or code-point-revealing forms, or require additional confirmation. For human-readable clinical or questionnaire text, such characters can be legitimate for some languages, so implementations should prefer safe rendering and clear boundaries over blanket deletion that could alter clinical meaning.

Unicode and bidi handling MUST NOT allow display text to spoof identifiers, origins, requester identity, profile URLs, clinical-source evidence, status codes, Holder decisions, or other clinical trust signals. When a UI cannot render a value safely, it should degrade to a conservative presentation, such as escaped text, explicit code-point display, or a warning, rather than silently presenting a misleading label.

### 14.3 Locale negotiation guidance

SMART Health Check-in 1.0 does not define a locale negotiation protocol. A Requester SHALL NOT require a Wallet/Responder to honor a new SMART request locale field, HTTP `Accept-Language` value, browser language, Pointer URL parameter, kiosk provider metadata field, or relay-visible preference unless a future version or registered extension explicitly defines that mechanism. Unknown SMART request members cannot override the field semantics in §5, the response status semantics in §6, or the privacy requirements in §12.

Implementations MAY use locale information obtained outside the SMART request/response objects, such as an application setting, OS or browser preference, account preference, kiosk deployment setting, FHIR `Resource.language`, Questionnaire translations, or local accessibility configuration. Such use is local behavior unless a deployment profile explicitly defines an interoperable rule. Locale selection should not change the request item ids, selectors, accepted media types, `requestStatus[]` coverage, Artifact validation, or other machine-processable protocol behavior.

Requesters that can provide localized display text SHOULD prefer the least privacy-revealing mechanism that gives the Holder understandable review text. For example, a Requester can choose display strings before constructing the SMART request based on a patient-portal setting already known to the Requester, or include an inline FHIR Questionnaire that uses FHIR-supported translation mechanisms. Requesters should avoid embedding fine-grained locale, region, script, disability-accommodation, or interpreter-needs metadata in ids, URLs, provider rows, telemetry labels, or Pointer URLs.

Wallets/Responders and Phone presenters SHOULD give priority to Holder comprehension and safety. If request display text, Questionnaire text, or FHIR display strings are not available in a language the Holder understands, the implementation may show the original text, offer local translation, request assistance, decline or partially fulfill the item, or report `unsupported`, `unavailable`, `declined`, or `error` as appropriate. A Wallet/Responder should not collect Questionnaire answers when a language mismatch or ambiguous translation makes the answer clinically unsafe or materially changes the Holder's understanding.

Kiosk and relay deployments SHALL NOT expose plaintext clinical requests, responses, Questionnaire text, or status messages to an untrusted relay merely to perform locale negotiation. The pointer-only kiosk model remains pointer-only: the relay can store and route encrypted request and submission state, but it does not need plaintext display text or locale preferences to choose a language. If a phone page, Completion display, or provider-specific UI localizes implementation-generated prompts, that localization should happen at the endpoint that already renders the UI, not by adding relay-visible clinical or locale metadata.

Locale fallbacks SHOULD be predictable and privacy-preserving. Implementations should prefer broad language matches before fine-grained regional disclosure when that is sufficient, should avoid logging raw locale preference lists by default, and should not treat lack of a preferred-language response as a clinical fact or Holder refusal. Where local policy requires recording language assistance or interpreter needs, that record is deployment workflow metadata, not a SMART Health Check-in protocol identifier.

## Organizer notes

### Strengths

- Separates human-readable display text from identifiers and protocol constants, matching the T5.E organizer focus and the accepted §5/§6 field model.
- Preserves privacy constraints from §12 by avoiding relay-visible locale negotiation and by treating language preferences as potentially sensitive metadata.
- References FHIR localization behavior without redefining FHIR language, translation, Questionnaire, or display-string rules.
- Calls out Unicode and bidi spoofing risks for origins, requester identity, profile URLs, status codes, and clinical trust signals.

### Caveats

- The draft intentionally avoids inventing a multilingual string container for `purpose`, item `title`, item `summary`, or `requestStatus[].message`; future profiles might want one.
- NFC is framed primarily as generation/display guidance for human-readable text, not as parser normalization, to avoid breaking exact comparisons for identifiers and canonicals.
- Bidi guidance is necessarily UI-oriented; §15 may need platform-specific rendering examples for web, Android, and iOS implementations.

### Open issues

- Decide whether §13 extension review should require an explicit i18n/privacy subsection for any extension field defined as display text.
- Appendix A should inventory the exact-comparison and no-relay-locale requirements without duplicating §5/§6 validation rules.
- Future FHIR mapping text may need examples showing preservation of `Resource.language` and FHIR translation extensions in inline Questionnaires and returned resources.

### Downstream dependencies

- T5.F should add checklist rows for: display-text-only i18n scope; exact comparison of identifiers without normalization; non-spoofing rendering of human text; and no new relay-visible locale negotiation.
- §15 implementation guidance can add concrete UI recommendations for `dir="auto"`, isolation, safe truncation, screen-reader labels, and local translation UX.
- §16 examples should avoid implying that English strings are fixed protocol values and should not localize identifiers or media/status constants.
