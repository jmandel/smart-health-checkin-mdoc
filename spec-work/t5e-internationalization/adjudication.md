# T5.E Internationalization adjudication

## Evidence consulted

- The outline scopes §14 to language tags, Unicode/BIDI, and locale negotiation, and says T5.E depends on §§5, 6, and 12 with organizer focus on fields that actually carry human-readable display text (`spec.md.outline:389-393`; `spec.md.outline.dependency_tree:397-405`).
- The request model defines UTF-8 JSON, exact `type`/`version`, request `id`, optional display `purpose`, item display `title`/`summary`, exact item-id accounting, and no requester identity metadata in the SMART request body (`spec-work/t2a-clinical-request-model/canonical.md:9-19`, `:60-84`, `:100-112`, `:217-239`).
- The response model defines exact `requestId`, Artifact ids/media types/`fulfills[]`, item status codes, and optional `requestStatus[].message` as concise display text whose semantics do not override `status` (`spec-work/t2b-clinical-response-model/canonical.md:21-35`, `:64-93`, `:269-310`).
- Conformance and registry sections preserve exact protocol constants: request/response discriminators, selector kinds, media types, status codes, `org-iso-mdoc`, mdoc identifiers, JWS `typ`, HKDF info strings, and pointer parameter `r` (`spec-work/t5a-conformance/canonical.md:117-139`; `spec-work/t5d-registry-iana/canonical.md:1-22`, `:54-68`, `:123-150`).
- Security and privacy sections require trust-layer separation, warn that request display text can spoof origin/requester identity, minimize plaintext/metadata leakage, and treat untrusted kiosk relays as opaque encrypted-state providers (`spec-work/t5b-security-considerations/canonical.md:31-39`, `:71-89`; `spec-work/t5c-privacy-considerations/canonical.md:7-15`, `:41-49`, `:75-82`).
- Same-device and kiosk canonicals place the SMART request as UTF-8 JSON in `ItemsRequest.requestInfo`, the response in stable mdoc element `smart_health_checkin_response`, and the kiosk request as direct `smartRequest` inside an encrypted/signed wrapper with a pointer-only `#r` URL (`spec-work/t3b-org-iso-mdoc-same-device/canonical.md:33-41`, `:159-179`, `:181-205`; `spec-work/t4a-kiosk-request-pointer/canonical.md:1-16`, `:198-225`; `spec-work/t4b-phone-resolution-reentry/canonical.md:9-15`, `:109-123`).
- Active implementation types match the display vs machine split: `purpose`, item `title`, item `summary`, and status `message` are strings, while `type`, `version`, ids, selector values, media types, and status codes are machine values validated literally (`rp-web/src/sdk/core.ts:29-51`, `:87-134`, `:175-230`, `:254-310`). The kiosk implementation uses fixed content types, JWS `typ`, HKDF info strings, `#r`, storage paths, and direct `smartRequest` embedding (`rp-web/src/kiosk/protocol.ts:3-12`, `:20-61`, `:138-187`, `:370-385`).
- Current UI code renders request item `title`/`summary`, implementation prompts/errors, request purpose, technical ids, provider rows, and status labels separately, showing these are display/UI strings rather than protocol negotiation fields (`rp-web/src/kiosk/submit-main.tsx:116-214`, `:288-337`; `rp-web/src/kiosk/creator-main.tsx:81-175`, `:276-317`).
- Active docs still contain some historical request examples, but their current design principles align with keeping requester identity out of the body and using stable mdoc/request/response carriers (`docs/SMART-HEALTH-CHECKIN-REQUEST-RESPONSE.md:50-71`, `:73-95`; `docs/profiles/org-iso-mdoc.md:5-16`, `:63-76`).

## Attempt comparison

All five attempts correctly reject broad localization of machine values and avoid inventing a core locale-negotiation protocol. The canonical text borrows the strongest common structure: display-text scoping from attempts 02/03/04, privacy-sensitive locale guidance from attempts 03/04/05, exact-comparison and byte-preservation language from attempts 01/04/05, and concise FHIR deferral from all attempts.

### Accepted claims

- Internationalization requirements apply only to human-readable display text, including `purpose`, item `title`, item `summary`, `requestStatus[].message`, FHIR Questionnaire display/text strings, FHIR display/narrative strings, implementation UI prompts/errors, and extension-defined display fields. This is directly supported by §§5-6 field definitions and active SDK types.
- Protocol identifiers and machine-readable values are not localized. Exact processing applies to request/response discriminators and versions, ids, selector kinds and values, media types, status codes, FHIR canonicals/resource types/ids when used as machine values, mdoc identifiers, kiosk wrapper ids, provider/storage ids, JWS/content-type/algorithm labels, HKDF/HPKE info strings, and pointer parameter `r`.
- The core v1.0 model has no top-level `locale`, `lang`, `Accept-Language`, language-map, negotiated-locale member, pointer locale parameter, or relay-visible locale field. Locale information can be used locally as UI/deployment context but is not protocol-trusted evidence.
- BCP 47 is appropriate when a FHIR resource, extension, deployment profile, or UI component labels display text with a language tag. The canonical limits this to tagging guidance and does not define a new SMART language-map container.
- FHIR localization, `Resource.language`, translation extensions, terminology displays, narratives, Questionnaire rendering, and QuestionnaireResponse construction are FHIR/deployment-profile responsibilities; SMART Health Check-in does not redefine them.
- Wallets/Responders and UIs may translate, summarize, group, reorder, or suppress display text for accessibility, localization, safety, or policy, but must preserve protocol identifiers and validation inputs exactly and must not use localized message text to reinterpret status semantics.
- Generated display text should be NFC when practical; consumers should tolerate valid non-NFC display text from FHIR, user input, and external sources. Normalization must not alter signed, encrypted, hashed, fixture-tested, or exact-validated protocol values.
- BIDI and confusable handling is security-relevant: untrusted display text must not visually spoof origins, requester/reader/kiosk trust signals, profile URLs, status codes, mdoc identifiers, clinical provenance, or Holder decisions.
- Language and locale metadata can be identifying or sensitive, so kiosk relays and Submission services must not need plaintext locale preferences or localized clinical content to route active protocol state.

### Rejected or narrowed claims

- Attempt 05 said consumers should compare language tags using BCP 47 matching rules. The canonical narrows this because the core model has no language-tag field, FHIR has its own rules, and deployment profiles/extensions must define any matching behavior they require.
- Attempt 01 used a broad rule that a Requester SHALL NOT add ad hoc locale fields. The canonical instead says implementations SHALL NOT rely on unknown/ad hoc members for interoperable locale negotiation, preserving §5.1.4 forward-compatible unknown-member behavior.
- Attempt 05's extension-registration SHALLs were useful but too strong for §14 because §13's accepted registry templates do not yet include mandatory i18n fields for every extension. The canonical avoids adding a new mandatory registry template here and records the issue as a gap.
- Attempts that list FHIR `id`, references, and names together risk overclassifying all FHIR strings as protocol constants. The canonical distinguishes FHIR machine values used for validation from FHIR human-readable/display strings, and defers FHIR-specific behavior to FHIR.
- Attempt 03's rich-text/Markdown sanitization discussion is valid but mostly belongs in security/implementation guidance. The canonical keeps only the principle that i18n does not relax anti-spoofing, privacy, or safe-rendering duties.
- Attempt 02's `MUST NOT` BIDI formulation is restated with `SHALL NOT` and clear conformance targets to align with the spec's RFC 2119 style.

## Risks and implementation/spec gaps

- §1.7 should include references for BCP 47 and Unicode normalization/Bidirectional Algorithm if final §14 keeps those references.
- Appendix A should inventory only testable §14 obligations: display-text scope, BCP 47 when tags are defined, exact non-localized protocol values, no core locale negotiation, no relay-visible locale requirement, and safe rendering of untrusted display text near trust/identifier values.
- §13 registry templates do not yet explicitly require extension authors to identify display-text fields and language-tag/privacy/BIDI behavior. This is a spec gap for future registry polish, not a blocker for §14.
- Appendix B/schema may optionally annotate display strings versus identifiers, but §14 does not require new schema members.
- Active demo UI contains English-only prompts and developer panels; that is compatible with v1.0 but §15 could add platform-specific guidance for localization, `dir=auto`/isolation, safe truncation, exact-value reveal, and sanitized diagnostics.
