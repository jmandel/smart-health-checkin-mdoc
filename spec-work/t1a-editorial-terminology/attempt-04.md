## 0.1 Title block

# SMART Health Check-in 1.0 over W3C Digital Credentials API

This specification defines SMART Health Check-in 1.0: a transport-neutral clinical request and response model, together with presentation bindings that allow a health care requester to ask a patient-controlled wallet for check-in artifacts such as FHIR resources, SMART Health Cards, or questionnaire responses.

Short title: **SMART Health Check-in 1.0**.

Suggested citation label: **SHC-Checkin-1.0**.

Specification status, publication date, and change history are maintained in §0.2 and §19.

## 0.3 Editors / contributors / IPR statement

Editors:

- _TBD_

Contributors:

- _TBD_

This document is prepared as an open technical specification for implementers of health care verifiers, patient wallets, browser or user-agent presentation surfaces, and kiosk check-in systems. Contributors are expected to disclose patent or other intellectual-property claims that would be necessary to implement this specification under the process selected by the publication venue. Until a final venue-specific IPR policy is recorded, contributions should be treated as offered for inclusion in an openly implementable interoperability specification.

## 0.4 Copyright + license

Copyright © _TBD_ the authors and contributors.

This specification text is intended to be published under the Creative Commons Attribution 4.0 International License (CC BY 4.0), or a publication-venue-equivalent license that permits copying, distribution, implementation, and creation of derivative works with attribution.

Code fragments, CDDL fragments, JSON Schema fragments, and example payloads included in this specification are intended to be available for implementation use under a permissive license compatible with the document license. The final publication process should replace this placeholder with the exact license grant and attribution requirements.

## 1.4 Reading guide

This specification separates clinical semantics from presentation transport.

- The **clinical content model** is the SMART Health Check-in JSON request and response model. It is transport-neutral: the same clinical request and response semantics apply whether the payloads are carried by the same-device presentation flow, by the kiosk wrapper, or by a future binding.
- The **same-device presentation flow** is the base presentation flow for this version. It uses W3C Digital Credentials API with direct `org-iso-mdoc` presentation on a device where the requester page, browser or user agent, credential manager, and wallet can cooperate locally.
- The **cross-device kiosk flow** is a wrapper around the same-device presentation flow. A kiosk creates and publishes a pointer to an encrypted request. The patient's phone resolves that pointer, obtains the embedded SMART Health Check-in request, and re-enters the same-device presentation flow on the phone. The kiosk flow is not a separate clinical protocol.

Sections marked normative define requirements for conforming implementations. Sections marked informative explain design intent, give examples, or provide implementation guidance. Examples are illustrative unless the surrounding text explicitly states that a field value, byte sequence, or validation step is required.

Implementers should read the specification in this order:

1. §1 through §3 for vocabulary, scope, roles, payload domains, and flow architecture.
2. §4 for conformance targets and optional feature structure.
3. §5 and §6 for the transport-neutral request and response models.
4. §7 and §8 for trust processing and the direct same-device `org-iso-mdoc` binding.
5. §9 for the kiosk wrapper, including pointer resolution, request decryption, phone-side re-entry into §8, and encrypted submission back to the completion display.
6. §11 through §14 for cross-cutting security, privacy, registry, and internationalization requirements.
7. Appendices for conformance checklists, schemas, CDDL, byte ladders, fixtures, and FHIR mapping details.

Certification programs should evaluate conformance against the normative requirements assigned to each conformance target in §4 and summarized in Appendix A. Appendix A is an index of requirements, not an independent source of additional requirements.

## 1.5 Document conventions

The source of truth for this specification is Markdown. Section numbers in this draft are stable editorial labels; final rendered anchors should preserve equivalent stable fragments so external certification materials can link to individual requirements.

Protocol identifiers, JSON member names, CDDL names, media types, URI strings, header names, algorithm names, and literal field values appear in backticks. Human-readable labels appear in quotation marks only when the quoted text is the value presented to a user.

Unless otherwise stated:

- JSON examples are UTF-8 JSON texts.
- CBOR examples are byte strings or CBOR diagnostic notation as identified by the surrounding text.
- Base64url values are unpadded.
- Hexadecimal octet strings use lowercase hexadecimal digits and no `0x` prefix.
- URI comparison rules are those of the referenced specification for the URI field being compared. FHIR canonical URL comparison, including `|version` handling, is specified separately in §5.5.

This specification uses the term **field** informally for a named member of a JSON object or a named element of a protocol structure. Where precision matters, the specific representation is named, such as JSON member, CBOR map entry, CDDL group entry, JWS header parameter, or COSE protected header parameter.

### 1.5.1 RFC 2119 / RFC 8174 keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14, RFC 2119 and RFC 8174, when, and only when, they appear in all capitals.

Lowercase uses of words such as "must", "should", and "may" are ordinary English and do not create conformance requirements.

Each normative requirement is intended to bind one or more explicit conformance targets, such as Verifier, Wallet, kiosk creator, phone submitter, completion display, or submission service. If a requirement does not name a target, the target is the implementation role that performs the action described by the sentence.

A requirement stated for an optional feature applies only to implementations that claim support for that optional feature, unless §4 states that the feature is mandatory for a broader conformance class.

### 1.5.2 JSON / CBOR / CDDL / COSE / HPKE notation

JSON structures are described with member names in backticks and examples in fenced code blocks labelled `json`. JSON object member order is not significant unless a later section explicitly defines an ordering rule for canonicalization, signing, hashing, or test-vector presentation.

CBOR structures are described using the data model and diagnostic notation of RFC 8949. Where byte-exact behavior matters, the specification gives the exact encoded byte string or a derivation ladder that identifies each encoded component. CDDL fragments use RFC 8610 notation and are descriptive of the corresponding normative prose; if prose and CDDL conflict, the normative prose controls until the conflict is corrected.

COSE structures use the terminology of COSE Sign1, countersignature, protected header, unprotected header, payload, and signature as defined by the COSE specifications referenced in §1.7. JWS structures use the terminology of protected header, payload, signature, compact serialization, and JSON serialization as defined by RFC 7515.

HPKE terms such as KEM, KDF, AEAD, `info`, encapsulated key, exporter secret, and ciphertext are used as defined by RFC 9180. Algorithm identifiers, when used, are the identifiers specified by the relevant JOSE, COSE, HPKE, or registry section of this specification.

The same semantic object may appear in JSON, CBOR, or signed/encrypted envelope form in different sections. A section that defines an envelope defines only that envelope's representation; it does not change the underlying clinical request or response semantics unless it explicitly says so.

### 1.5.3 Byte-string presentation

Byte strings are presented in one of the following forms:

- `h'...'` for CBOR diagnostic hexadecimal byte strings.
- Continuous lowercase hexadecimal text for byte ladders and compact test-vector tables.
- Unpadded base64url for JOSE, URL, or JSON fields that conventionally carry base64url-encoded bytes.
- Fenced blocks labelled `hex`, `base64url`, or `cbor-diag` when line wrapping or annotation is needed.

Whitespace inserted into displayed hex or base64url blocks is for readability only unless the field being described is itself a textual field that includes that whitespace. Implementations MUST NOT insert display whitespace into encoded byte strings.

When a byte string is derived from a structured value, this specification distinguishes:

- the abstract value;
- the serialization input;
- the encoded byte string;
- any base64url, hex, or diagnostic presentation of that byte string.

Test vectors should identify which layer is being shown. This is especially important for CBOR tag wrapping, SessionTranscript construction, HPKE `info` values, JWS signing input, and encrypted kiosk request envelopes.

### 1.5.4 Pseudocode and example dialect

Pseudocode is explanatory. It uses JavaScript-like syntax for object access, array iteration, byte concatenation, and error handling, but it is not executable ECMAScript unless explicitly labelled as such.

In pseudocode:

- `bytes(x)` means the specified serialization of `x`, not a platform default string encoding.
- `utf8(s)` means the UTF-8 bytes of string `s`.
- `b64u(x)` means unpadded base64url encoding of byte string `x`.
- `decodeB64u(s)` rejects padded, non-canonical, or non-base64url text unless the surrounding section explicitly allows recovery.
- `fail(reason)` means the implementation stops processing the current protocol message and reports or logs an error according to local policy and privacy requirements.

Example JSON may omit optional fields that are irrelevant to the point being illustrated. Example CDDL may omit surrounding definitions when the excerpt is clearly identified. Example byte strings may use shortened values only when marked with ellipses; unmarked byte strings are intended to be exact.

## 1.6 Terminology

**Artifact**: A clinical payload supplied by a Wallet in response to one or more request items. Examples include a FHIR JSON resource or Bundle, a SMART Health Card verifiable credential, or a questionnaire response. An artifact is described by a media type and by fields defined in §6; it is not identified by a separate protocol-specific artifact type when the media type is sufficient.

**Browser / User Agent**: The component that exposes the W3C Digital Credentials API surface to a requester page, mediates invocation of local credential presentation capabilities, and contributes origin information to the presentation flow. This term includes browser-integrated credential surfaces and equivalent user-agent components.

**Clinical content model**: The transport-neutral SMART Health Check-in request and response model defined by §5 and §6. The clinical content model does not include requester identity metadata, browser origin assertions, mdoc session transcript bytes, kiosk pointer metadata, or relay-service state.

**Completion display**: The kiosk-side component that receives, decrypts, validates, and displays or forwards the submitted response after the phone presenter completes the same-device flow. In a front-desk deployment this is commonly the desktop browser or application associated with the original kiosk request.

**Credential Manager**: A platform or browser component that brokers Digital Credentials API requests between a Browser / User Agent and a Wallet. Credential Manager behavior is platform-specific except where this specification assigns protocol-level requirements to another role.

**FHIR canonical**: A canonical URL, optionally with a `|version` suffix, as used by FHIR for StructureDefinitions, ImplementationGuides, Questionnaires, and related conformance resources.

**Holder**: The person whose clinical information is being requested and who controls whether requested artifacts are released. In typical check-in use cases the Holder is the patient, member, or authorized representative using the Wallet.

**Item** or **request item**: One entry in `SmartHealthCheckinRequest.items[]`. Each item has an `id`, user-facing text, an advisory required flag, accepted response media types, and a content selector. Wallets render items for review and report per-item status in the response.

**Kiosk creator**: The component that creates a cross-device kiosk request, signs the kiosk request payload, encrypts it for phone resolution, and publishes or displays a pointer such as a QR code. The kiosk creator embeds the SMART Health Check-in request directly as the `smartRequest` value; it does not wrap the request in a demo preset or other non-protocol selector object.

**Phone presenter**: The phone-side component that resolves a kiosk pointer, decrypts and validates the kiosk request, obtains the embedded SMART Health Check-in request, and then invokes or participates in the same-device presentation flow on the phone. The phone presenter also encrypts the resulting submission for the completion display when using the kiosk wrapper.

**Profile family**: A canonical URL that names a family or publication set of FHIR profiles, such as an ImplementationGuide or other registered profile collection. In `profilesFrom`, profile families are represented as an array of canonical profile-family URLs. Profile-family selectors are additive: they add acceptable profile matches to any exact `profiles` selectors rather than narrowing them.

**Requester**: The relying party that asks for clinical artifacts. The requester is responsible for constructing the SMART Health Check-in request and for processing the response. In the presentation flow, the requester acts as the Verifier. This specification uses Requester when emphasizing clinical intent and Verifier when emphasizing presentation, cryptographic, or trust processing.

**Request item id**: The `id` value of a request item. Request item ids are scoped to a single SMART Health Check-in request and are used by response status entries and artifact fulfillment references to connect a response back to the requested items.

**Responder**: The role that constructs a SMART Health Check-in response after the Holder has reviewed the request and made consent decisions. In this specification the Wallet normally acts as the Responder.

**Selector**: A structured expression in a request item's `content` field that describes acceptable clinical content. For FHIR resources, `profiles`, `profilesFrom`, and `resourceTypes` are selectors. `profiles` and `profilesFrom` are additive selectors: an artifact can satisfy the item by matching either the exact profiles list or the profile families list, subject to the detailed rules in §5.4.

**SMART Health Check-in request**: The JSON object `SmartHealthCheckinRequest` defined in §5. It contains the request type, version, id, display purpose, supported FHIR versions, and requested items. It is independent of the transport envelope that carries it.

**SMART Health Check-in response**: The JSON object `SmartHealthCheckinResponse` defined in §6. It contains the response type, version, request binding, artifact list, and per-item status information. It is independent of the transport envelope that carries it.

**Submission service** or **relay service**: The network service used by the kiosk wrapper to store or relay encrypted request and response material between the kiosk creator, phone presenter, and completion display. The submission service is not trusted with plaintext clinical content or plaintext SMART Health Check-in requests unless a deployment explicitly adds trust outside this specification.

**Verifier**: The presentation-protocol role that requests and validates a wallet presentation. In the same-device flow, the Verifier is the web origin or application using the W3C Digital Credentials API and direct `org-iso-mdoc` profile. In the kiosk flow, verifier processing is re-entered on the phone after pointer resolution.

**Wallet**: The Holder-controlled component that receives a presentation request, renders consent choices, locates eligible clinical artifacts, constructs a SMART Health Check-in response, and returns it through the applicable presentation flow. A Wallet may obtain data from local storage, cloud synchronization, issuers, or other holder-authorized sources; those data-source mechanisms are outside this specification.

## 1.7 References

References are divided into normative and informative references. A normative reference is required to implement one or more normative requirements in this specification. An informative reference provides context, comparison points, examples, or background.

### 1.7.1 Normative references

- **RFC 2119**: Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119.
- **RFC 8174**: Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174.
- **RFC 7515**: Jones, M., Bradley, J., and N. Sakimura, "JSON Web Signature (JWS)", RFC 7515.
- **RFC 8259**: Bray, T., "The JavaScript Object Notation (JSON) Data Interchange Format", RFC 8259.
- **RFC 8610**: Birkholz, H., Vigano, C., and C. Bormann, "Concise Data Definition Language (CDDL): A Notational Convention to Express Concise Binary Object Representation (CBOR) and JSON Data Structures", RFC 8610.
- **RFC 8949**: Bormann, C. and P. Hoffman, "Concise Binary Object Representation (CBOR)", RFC 8949.
- **RFC 9052** and related COSE specifications: Schaad, J., "CBOR Object Signing and Encryption (COSE): Structures and Process", RFC 9052.
- **RFC 9180**: Barnes, R., Bhargavan, K., Lipp, B., and C. Wood, "Hybrid Public Key Encryption", RFC 9180.
- **ISO/IEC 18013-5**: "Personal identification — ISO-compliant driving licence — Part 5: Mobile driving licence (mDL) application". This specification profiles the mdoc presentation model and related structures for the direct `org-iso-mdoc` flow.
- **W3C Digital Credentials API**: The W3C specification defining browser-mediated credential presentation APIs used by the same-device presentation flow.
- **HL7 FHIR Release 4 (4.0.1)**: The FHIR base specification for resources, Bundles, canonicals, `meta.profile`, and Questionnaire / QuestionnaireResponse structures used by this specification.
- **SMART Health Cards Framework**: The SMART Health Cards specification defining the verifiable credential representation and related media type conventions used for SMART Health Card artifacts.

### 1.7.2 Informative references

- **OpenID for Verifiable Presentations (OpenID4VP)**: A presentation protocol considered for future binding work but not required by the direct `org-iso-mdoc` binding in this version.
- **Digital Credentials Query Language (DCQL)**: A query-language reference point for credential selection models.
- **HL7 US Core Implementation Guide**: A common source of FHIR profile families for United States clinical data exchange examples.
- **CARIN Consumer Directed Payer Data Exchange Implementation Guide**: A common source of coverage and insurance-related FHIR profiles used in check-in examples.
- **mDL Annex C and related implementation guidance**: Background for mdoc presentation conventions and test-vector interpretation.

## Style guidance for Markdown source of truth

The specification should remain readable as plain Markdown and render deterministically to a single-page HTML artifact. Editorial conventions should support review, certification, and fixture generation without requiring hidden preprocessor state.

Recommended source conventions:

- Use one ATX heading per numbered section and keep the visible section number in the heading text.
- Keep normative requirements in ordinary prose near the data structure or processing step they constrain; do not hide requirements only in tables, schemas, examples, or appendices.
- Use fenced code blocks with language labels such as `json`, `cddl`, `cbor-diag`, `hex`, `base64url`, and `text`.
- Mark non-normative examples with `(EX)` in the heading or lead-in sentence.
- Give every requirement that uses an RFC 2119 / RFC 8174 keyword a clear conformance target.
- Prefer stable internal links to section numbers over prose such as "above" or "below".
- Keep platform-specific API advice in §15 implementation notes unless it is a protocol requirement independent of platform.
- Treat JSON Schema, CDDL, and fixture appendices as derived alignment artifacts. They should mirror normative prose, not introduce new semantics.

## Organizer notes

Strengths of this draft:

- Establishes a sharp vocabulary split between clinical content, same-device presentation, and kiosk wrapper semantics.
- Makes the same-device direct `org-iso-mdoc` flow the base presentation flow and describes kiosk as re-entry into that flow on the phone.
- Freezes reusable terminology for Requester / Verifier, Wallet / Responder, request items, artifacts, profile families, kiosk creator, phone presenter, submission service, and completion display.
- Explicitly states that `profilesFrom` is an array of canonical profile-family URLs and that `profiles` plus `profilesFrom` are additive selectors.
- Calls out that the kiosk payload embeds `smartRequest` directly and does not use a demo preset wrapper.

Caveats:

- The exact publication venue, editor list, IPR policy, and license boilerplate remain placeholders.
- Normative reference citations need final URLs, dates, and version labels.
- The CDDL-vs-prose precedence sentence is intentionally practical for drafting; the organizer may prefer a stricter final statement once Appendix C is stable.

Downstream dependencies:

- §2 and §3 should reuse the terms and payload-domain split introduced here.
- §5.4 should adopt the selector terminology and additive `profiles` / `profilesFrom` language.
- §8 should reuse the same-device base-flow terminology and byte-string presentation conventions.
- §9 should reuse kiosk creator, phone presenter, submission service, completion display, direct `smartRequest` embedding, and same-device re-entry terminology.
- Appendix A should rely on the RFC 2119 / RFC 8174 convention and conformance-target language in §1.5.1.
