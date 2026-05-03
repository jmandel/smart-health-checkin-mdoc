## 14. Internationalization

SMART Health Check-in carries both protocol identifiers and human-readable display text. Internationalization requirements apply only to fields that are intended for display to a Holder, Requester, receiver, staff user, or implementer-facing diagnostic user. They do not change the exact-match rules for identifiers, constants, media types, cryptographic inputs, status codes, or registered protocol values.

Human-readable text in version 1.0 includes, at minimum, request `purpose`, request item `title`, request item `summary`, `requestStatus[].message`, display/text fields inside inline or referenced FHIR Questionnaire content, human-readable/display strings inside returned FHIR resources, implementation-generated UI prompts, warnings, errors, and extension fields whose registered definition explicitly identifies them as display text. Identifiers and protocol constants are not localized, including request `type`, request `version`, request `id`, item `id`, Artifact `id`, response `requestId`, `content.kind`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, status codes, mdoc identifiers, kiosk wrapper `requestId`, provider row ids, storage paths, JWS `typ`, content types, algorithm labels, HPKE/COSE info strings, and the Pointer URL parameter `r`.

### 14.1 Language tags

When a SMART Health Check-in implementation labels a human-readable string with a language, it SHOULD use a BCP 47 language tag. This specification does not add a top-level `locale`, `language`, `Accept-Language`, or language-negotiation member to the SMART request, SMART response, same-device `org-iso-mdoc` binding, or kiosk wrapper.

A Requester SHOULD author `purpose`, item `title`, and item `summary` in a language appropriate for the expected Holder review context. If a deployment needs to provide multiple translations for those fields, it SHOULD define that behavior in a deployment profile or registered extension instead of overloading identifiers, selector values, unknown members, or protocol constants.

FHIR content follows FHIR's own internationalization and localization behavior. Inline or referenced FHIR `Questionnaire` resources, returned FHIR resources, CodeableConcept text, coding displays, narrative text, and FHIR translation extensions are interpreted according to FHIR and the relevant implementation guides. SMART Health Check-in does not redefine FHIR language, translation, display, or narrative rules.

A Wallet/Responder MAY translate, summarize, or otherwise localize request display text for Holder review, subject to Wallet policy, accessibility, safety, and privacy requirements. If it does so, it SHALL preserve the original protocol values needed for response accounting and validation, including item ids, selector values, media types, status codes, and request ids. A Wallet/Responder SHALL NOT translate an identifier or constant and then use the translated form for `fulfills[]`, `requestStatus[].item`, media-type validation, profile matching, Questionnaire canonical matching, mdoc element selection, kiosk lookup, cryptographic input construction, or status-code processing.

A Wallet/Responder that generates `requestStatus[].message` SHOULD choose concise text suitable for the Requester or receiver's expected locale when that locale is known through deployment context. The normative status semantics remain in `requestStatus[].status`; a receiver SHALL NOT rely on localized `message` text to determine whether an item was fulfilled, partial, declined, unavailable, unsupported, or errored.

### 14.2 Unicode normalization and BIDI handling

SMART Health Check-in JSON strings are Unicode strings serialized as UTF-8 when carried as text or bytes. Implementations SHOULD generate human-readable display strings in Unicode Normalization Form C (NFC). Implementations that compare, index, cache, or de-duplicate human-readable strings MAY normalize those display strings for local processing, but normalization of display text SHALL NOT change the exact protocol values used for identifiers, URLs, media types, registered strings, signatures, hashes, HPKE inputs, COSE/JWS inputs, CBOR byte comparisons, or JSON payloads whose bytes are signed, encrypted, hashed, or fixture-tested.

Protocol identifiers and constants are compared according to the field-specific exact-match rules in §§5-9 and related appendices. A Verifier, Wallet/Responder, Kiosk creator, Phone presenter, Submission service, or Completion display SHALL NOT apply case folding, Unicode normalization, confusable-character mapping, BIDI reordering, locale-sensitive comparison, transliteration, or translated aliases when comparing request `type`, `version`, `id`, item `id`, Artifact `id`, `requestId`, `content.kind`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, media types, status codes, mdoc identifiers, kiosk wrapper ids, storage paths, JWS `typ`, content types, algorithm labels, info strings, or Pointer URL parameter names and values.

Implementations that render bidirectional text SHOULD use the Unicode Bidirectional Algorithm with appropriate isolation for each interpolated field. User interfaces SHOULD isolate untrusted or requester-supplied text such as `purpose`, item `title`, item `summary`, Questionnaire text, FHIR display strings, status messages, URLs, origins, certificate names, and diagnostic snippets so that directional controls in one field cannot visually reorder adjacent labels, identifiers, origins, trust signals, buttons, or warnings.

A renderer SHOULD display security- or trust-relevant identifiers in a way that resists visual spoofing. Examples include isolating code-like values, preserving left-to-right rendering for ASCII protocol constants and URLs, truncating only with visible boundaries, offering copy/view controls for exact values, and not mixing untrusted display text into the same visual token as an origin, requester identity signal, profile URL, mdoc docType, status code, or clinical-source trust signal.

A Wallet/Responder, Verifier, Phone presenter, or Completion display SHALL NOT allow Unicode confusables, hidden directional controls, zero-width characters, normalization differences, or localized display strings to make one requester, origin, profile URL, Questionnaire canonical, Artifact, status code, mdoc identifier, or clinical trust signal appear to be another. If an implementation cannot safely render a string in a security-sensitive context, it SHOULD show a safer representation, such as escaped text, code-point-visible diagnostics, a warning, or a suppressed display with access to the exact value through a deliberate action.

FHIR narratives, Markdown-like Questionnaire answers, and other rich text displays remain subject to the sanitization, safety, and privacy rules of their media type and deployment context. Internationalization support does not relax requirements to prevent script injection, misleading links, origin spoofing, over-disclosure, or unsafe diagnostic display.

### 14.3 Locale negotiation guidance

Version 1.0 does not define a locale negotiation protocol. A Requester, Wallet/Responder, Verifier, Kiosk creator, Phone presenter, Submission service, or Completion display SHALL NOT require an untrusted relay or intermediary to see plaintext SMART requests, SMART responses, Questionnaire content, FHIR content, or user locale preferences in order to choose a language.

Locale choices and language metadata can reveal sensitive information, including nationality, ethnicity, disability accommodations, preferred language in a clinical setting, household context, or the nature of a visit. Implementations SHOULD minimize locale metadata in SMART requests, kiosk pointers, provider rows, storage paths, logs, telemetry, analytics, support bundles, screenshots, and debug panels. When locale information is needed for rendering, it should be kept within the endpoint that renders the text or within encrypted/authenticated payloads already visible to that endpoint.

Requesters that need a particular language for Holder review SHOULD provide request display text and Questionnaire content in that language through the fields already intended for display, or through FHIR-supported translation mechanisms inside FHIR resources. Wallets/Responders SHOULD choose among available FHIR translations, local UI translations, or deployment-provided strings according to Holder preferences, local policy, and safety. If no suitable localization is available, a Wallet/Responder MAY display the available source text, warn the Holder, ask for confirmation, or report the item as unsupported or error according to §6 when language support prevents safe processing.

Kiosk deployments SHOULD keep public QR screens, phone resolution pages, completion displays, and staff prompts understandable without embedding patient-specific clinical text or stable locale identifiers in the Pointer URL, provider-visible ids, storage paths, or relay metadata. A Phone presenter can use local device or browser language preferences to render its own UI, but those preferences should not be forwarded to the Submission service or other untrusted relay unless a deployment profile explicitly requires and protects that disclosure.

Receivers MAY localize implementation-generated UI labels, validation errors, and workflow prompts. They SHALL preserve machine-processable protocol values exactly in stored records and validation logic. A localized display of a status, media type, resource type, profile, origin, or identifier is only a presentation aid; the underlying code, URL, identifier, or cryptographic value remains the protocol value.

## Organizer notes

### Strengths

- Keeps i18n requirements scoped to actual display text: `purpose`, item `title`, item `summary`, `requestStatus[].message`, FHIR Questionnaire text, FHIR display/narrative strings, UI prompts/errors, and extension fields explicitly defined as display text.
- Preserves exact-match semantics for identifiers and constants from T2.A, T2.B, same-device mdoc, and kiosk flows.
- Aligns with T5.C by treating language preference and locale metadata as potentially sensitive and avoiding plaintext exposure to untrusted relays.
- References FHIR behavior rather than redefining FHIR localization, translation, narrative, or display semantics.
- Calls out BIDI/confusable spoofing risks for requester identity, origins, profile URLs, status codes, mdoc identifiers, and clinical trust signals.

### Caveats

- This draft intentionally does not add a `language`, `locale`, or `Accept-Language` field; deployments needing multilingual payloads will need a profile or extension.
- The text recommends NFC generation for display strings but avoids byte-changing normalization rules because signed, hashed, encrypted, and fixture-tested values depend on exact bytes.
- Rich text and Markdown handling are mentioned only as safety guidance; detailed sanitization rules likely belong in security/implementation guidance or media-type-specific profiles.

### Open issues

- Appendix A should decide how many i18n/BIDI rows to include without overburdening conformance testing.
- §13 extension registration may need to require language-tag, translation, and spoofing considerations for extensions that define new display-text fields.
- §15 implementation guidance should give concrete UI patterns for bidi isolation, exact-value reveal, localized error text, and FHIR translation selection.

### Downstream dependencies

- T5.F conformance checklist should capture exact-identifier preservation, no locale negotiation protocol, privacy minimization for locale metadata, and BIDI/spoofing-safe rendering.
- T6 examples should avoid implying that identifiers, media types, profile URLs, status codes, or kiosk pointer values are localized.
