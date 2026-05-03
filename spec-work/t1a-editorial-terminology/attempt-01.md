## 0.1 Title block

# SMART Health Check-in 1.0

A profile for patient-mediated clinical check-in using a transport-neutral SMART request/response model and a same-device `org-iso-mdoc` presentation binding over the W3C Digital Credentials API.

Recommended short title: **SMART Health Check-in 1.0**.

Recommended citation label: **SHC-Checkin-1.0**.

## 0.3 Editors / contributors / IPR statement

Editors:

- _Editor name, affiliation, email or persistent contact — to be supplied before publication._

Contributors:

- _Contributor names and affiliations — to be supplied before publication._

IPR status:

- _Publication venue, contribution rules, patent disclosure process, and any applicable standards-development IPR policy — to be supplied before publication._
- Contributions to this document are expected to be made with the contributor's authority to grant the document license identified in §0.4.

## 0.4 Copyright + license

Copyright © _publication year_ _publication owner(s)_.

This specification text is made available under the Creative Commons Attribution 4.0 International License (CC BY 4.0), or a successor license selected by the publication owner before final publication.

Code fragments, schemas, CDDL, and pseudocode examples in this specification are intended for implementation and testing. Unless the final publication venue requires different boilerplate, they may be used, copied, modified, and distributed without restriction for the purpose of implementing SMART Health Check-in.

## 1.4 Reading guide

This specification has three layers:

1. the **clinical content model**, consisting of the SMART Health Check-in JSON request and response;
2. the **same-device presentation flow**, which carries that clinical model through W3C Digital Credentials API using direct `org-iso-mdoc`; and
3. the **cross-device kiosk flow**, which wraps the same-device flow in a pointer, relay, and submission envelope so that a phone can complete a check-in initiated from a kiosk or desktop.

The clinical request/response model is transport-neutral. A requester and wallet can reason about requested clinical content, per-item consent, response artifacts, and fulfillment status without depending on any particular presentation transport. Transport bindings in later sections define how this model is carried, protected, and validated in specific flows.

The same-device direct `org-iso-mdoc` flow is the base presentation flow for this version of the specification. The kiosk flow is not a second clinical protocol. It packages a kiosk-created request for resolution on the patient's phone, then re-enters the same same-device presentation flow on that phone. In the kiosk request payload, the SMART request is embedded directly as the `smartRequest`; there is no demo preset, template wrapper, or indirect clinical request reference inside the signed payload.

Unless a section says otherwise:

- Sections labeled normative contain requirements for one or more conformance targets.
- Examples, diagrams, notes, and sections labeled informative illustrate the requirements but do not add requirements.
- Appendices that contain schemas, CDDL, or test vectors are normative only to the extent explicitly stated by the section that references them.
- A conformance claim is evaluated against the conformance classes in §4 and the checklist in Appendix A. A requirement applies to an implementation only when the requirement names, or is incorporated by, a conformance class implemented by that product.

Readers implementing only the clinical model should start with §§1, 3, 5, and 6. Readers implementing wallet or verifier presentation should additionally read §§7 and 8. Readers implementing kiosk initiation, relay, phone re-entry, or desktop completion should additionally read §9. Security, privacy, registries, internationalization, implementation notes, and examples are consolidated in §§11–16.

## 1.5 Document conventions

The Markdown source is the source of truth for this specification. Rendered HTML, extracted schemas, generated fixture indexes, and conformance checklists are publication artifacts derived from the Markdown source unless a publication process explicitly designates another artifact as authoritative.

Numbered headings are stable cross-reference targets. Editors should preserve section numbers once downstream sections, certification materials, or fixtures refer to them. Cross-references in prose should use section numbers, for example “§5.4.1.2”, rather than renderer-specific anchor names.

Field names, JSON string values, CDDL rule names, media types, JOSE and COSE parameters, HTTP header names, cryptographic algorithm identifiers, and protocol identifiers are written in backticks. Placeholder values use angle brackets, for example `<request-id>`, only when the placeholder is not a literal protocol value.

Requirements should identify their conformance target. Preferred phrasing is “A Wallet SHALL …”, “A Verifier SHALL …”, “A Kiosk Creator SHALL …”, or “A Cross-device Submitter SHALL …”. Requirements that apply to multiple targets should either name each target or be factored into separate checklist rows.

Examples should be introduced with “Example” or marked `(EX)` in the heading. Example data should be internally consistent with the normative model, but example-specific values such as identifiers, keys, dates, patient data, and endpoints are not normative.

This specification avoids platform-specific requirements in the protocol core. Android Credential Manager behavior, iOS wallet APIs, browser-specific diagnostics, SDK packaging choices, and deployment recipes belong in §15 unless a platform detail is necessary to define an interoperable wire artifact.

## 1.5.1 RFC 2119 / RFC 8174 keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14, RFC 2119 and RFC 8174, when and only when they appear in all capitals as shown here.

Lowercase uses of “must”, “should”, “may”, “required”, or similar words are ordinary English and do not by themselves create conformance requirements.

A requirement expressed with a BCP 14 keyword is normative even if it appears in a paragraph that also contains explanatory text. A note, example, figure caption, or informative appendix does not create a conformance requirement unless it explicitly states that a named conformance target MUST, SHALL, SHOULD, or MAY do something.

## 1.5.2 JSON / CBOR / CDDL / COSE / HPKE notation

JSON examples use RFC 8259 JSON. JSON object member order is not significant unless a later section defines a byte-for-byte canonicalization step for a specific artifact. JSON strings are Unicode strings and are encoded as UTF-8 when serialized for protocol use.

CBOR diagnostic notation follows RFC 8949 conventions. Hex byte strings in diagnostic notation use `h'...'`; text strings use quoted strings; arrays and maps use the diagnostic notation forms from RFC 8949. When diagnostic notation and encoded bytes are both shown, the encoded bytes are authoritative for byte-level fixtures.

CDDL fragments use RFC 8610 notation unless explicitly stated otherwise. CDDL names are local to the fragment in which they appear unless a later appendix collects them into a single module.

COSE structures use the terminology and serialization model of RFC 9052 and related COSE specifications. JOSE/JWS structures use RFC 7515 terminology. HPKE operations use RFC 9180 terminology: `enc` is the encapsulated key, `info` is the context string or byte string supplied to HPKE, and `aad` is additional authenticated data supplied to AEAD operations.

When JSON values are carried inside CBOR, COSE, HPKE, or mdoc structures, later sections specify whether the value is carried as a JSON text string, a byte string containing UTF-8 JSON, a CBOR data item, or a tagged CBOR data item. Implementations must not infer a representation from an example alone.

## 1.5.3 Byte-string presentation

This specification uses the following byte-string presentations:

- `hex`: lowercase hexadecimal without spaces unless grouped for readability. Grouping spaces, line breaks, and comments are not part of the value.
- `base64url`: URL-safe Base64 using `-` and `_` as defined by RFC 4648.
- `base64url-no-pad`: base64url with trailing `=` padding omitted.
- `bstr`: a CBOR byte string value, usually shown in diagnostic notation as `h'...'`.

Protocol fields that say they contain base64url use base64url-no-pad unless the field definition explicitly permits padding. Decoders MAY accept padded base64url in diagnostic tooling, but protocol examples and generated fixtures should emit base64url-no-pad.

Long byte strings may be wrapped across lines in the Markdown source. Such wrapping is editorial only. A byte string's value is obtained by removing Markdown line wrapping and any explicitly marked visual separators.

## 1.5.4 Pseudocode and example dialect

Pseudocode is descriptive. It is intended to clarify ordering, inputs, outputs, and validation logic, not to define a programming language ABI. If pseudocode conflicts with normative prose, schema, CDDL, or byte-level fixture text in the same section, the normative prose controls unless the section explicitly gives the fixture precedence for a byte value.

Pseudocode function names are written in `camelCase`. JSON object members use the exact protocol names defined in §§5 and 6. CBOR and CDDL names use the casing shown in the defining CDDL fragment. Ellipses (`...`) in examples mean omitted material and are never literal protocol values.

Example JSON may include comments only when the block is explicitly labeled as non-literal. Literal JSON blocks intended for copy/paste or fixture generation contain no comments and no trailing commas.

## 1.6 Terminology

The following terms are used consistently throughout this specification.

| Term | Definition |
| --- | --- |
| SMART Health Check-in | The protocol profile defined by this specification. It includes a transport-neutral clinical request/response model and presentation bindings for same-device and kiosk check-in flows. |
| Clinical content model | The JSON request and response structures that describe what clinical content is requested, what the holder approved, and what artifacts were returned. The model is independent of presentation transport. |
| Presentation transport | A mechanism that carries the clinical content model between components and applies transport-specific security, origin, encryption, or proof rules. Direct `org-iso-mdoc` over W3C Digital Credentials API is the base presentation transport in this version. |
| Requester | The organization, application, or service asking the patient to provide clinical content for a check-in workflow. In many flows the requester is also the verifier. |
| Verifier | The protocol actor that constructs a presentation request, receives a presentation response, decrypts or validates transport artifacts as required, and evaluates the returned SMART Health Check-in response. |
| Wallet | Software acting for the holder that receives a request, obtains holder consent, selects or creates response artifacts, and returns a SMART Health Check-in response through the active presentation transport. |
| Responder | The role that constructs the clinical response. In this specification the responder is normally the wallet; the term is used when the clinical response role matters more than wallet product behavior. |
| Holder | The person whose clinical information is being requested and who controls consent in the wallet user experience. The holder is commonly the patient, parent, guardian, or authorized representative. |
| Browser / User Agent | Software that exposes the W3C Digital Credentials API surface to a verifier page and mediates calls to a wallet or credential provider. |
| Credential Manager | A platform component, browser component, or operating-system service that brokers Digital Credentials API requests between a user agent and available wallets. |
| Artifact | A response object containing clinical content or a reference to clinical content. Examples include raw FHIR JSON and SMART Health Cards. Artifacts are identified by `artifact.id` and typed by `artifact.mediaType`. |
| Request item | One entry in `SmartHealthCheckinRequest.items[]`. A request item describes a clinical content need, human-readable display text, accepted response media types, and one content selector. |
| Request item id | The `id` of a request item. Request item ids are unique within a request and are referenced from response status rows and artifact `fulfills[]` arrays. |
| Content selector | The structured part of a request item that describes the clinical content being requested, such as FHIR resources, a profile family, an exact profile canonical, a resource type, or a questionnaire. |
| Profile | An exact FHIR `StructureDefinition` canonical URL, optionally with a `|version` suffix where permitted by §5.5. In `profiles[]`, each value selects that exact profile canonical. |
| Profile family | A canonical URL identifying a published implementation guide, package, collection, or other profile family from which member profiles may be selected. Values in `profilesFrom[]` are canonical profile-family URLs. |
| Additive selectors | Selector semantics in which multiple selector arrays broaden the set of acceptable content. `profiles[]` and `profilesFrom[]` are additive selectors: content matching any listed exact profile or any profile in any listed profile family can satisfy the selector, subject to the rest of the item definition. |
| SMART request | A `SmartHealthCheckinRequest` JSON object as defined in §5. It contains the clinical content request and no requester identity metadata. |
| SMART response | A `SmartHealthCheckinResponse` JSON object as defined in §6. It binds to the SMART request by `requestId`, reports every request item status exactly once, and carries zero or more artifacts. |
| Same-device presentation flow | The base flow in which a verifier page and wallet interaction occur on the same device using direct `org-iso-mdoc` over W3C Digital Credentials API. |
| Kiosk flow | The cross-device wrapper flow in which a kiosk or desktop creates a signed and encrypted request pointer for a phone. After resolution on the phone, the phone re-enters the same-device presentation flow using the embedded SMART request. |
| Kiosk Creator | The component that creates the kiosk request payload, signs it, arranges encryption for request delivery, and displays or otherwise conveys the pointer URL to the phone. |
| Submission Service | The relay or transport service that stores or forwards encrypted kiosk request and submission state. The submission service is not trusted with plaintext SMART requests or responses. |
| Phone Presenter | The phone-side component that resolves the kiosk pointer, validates and decrypts the kiosk request envelope, invokes the same-device presentation flow on the phone, and submits the encrypted result for desktop completion. |
| Completion Display | The kiosk or desktop component that receives the encrypted submission, decrypts and validates it as authorized for that kiosk session, and displays completion status to the user or staff workflow. |
| Pointer URL | A URL, commonly encoded in a QR code, that lets the phone locate an encrypted kiosk request. The pointer URL is transport metadata, not the clinical request itself. |
| Demo preset | A development-time or demonstration convenience that expands to a request. Demo presets are not protocol objects. A conforming kiosk request payload embeds the SMART request directly and does not embed a demo preset wrapper. |

## 1.7 References

References are divided into normative and informative references. Normative references are required to implement this specification as written. Informative references provide background, related work, implementation context, or examples.

### 1.7.1 Normative references

- RFC 2119, “Key words for use in RFCs to Indicate Requirement Levels”.
- RFC 8174, “Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words”.
- RFC 7515, “JSON Web Signature (JWS)”.
- RFC 8259, “The JavaScript Object Notation (JSON) Data Interchange Format”.
- RFC 8610, “Concise Data Definition Language (CDDL)”.
- RFC 8949, “Concise Binary Object Representation (CBOR)”.
- RFC 9052 and the COSE specification family, “CBOR Object Signing and Encryption (COSE)”.
- RFC 9180, “Hybrid Public Key Encryption”.
- RFC 4648, “The Base16, Base32, and Base64 Data Encodings”.
- ISO/IEC 18013-5, “Personal identification — ISO-compliant driving licence — Part 5: Mobile driving licence application”.
- W3C Digital Credentials API, current editor's draft or published recommendation referenced by the final publication.
- HL7 FHIR Release 4, version 4.0.1.
- SMART Health Cards Framework and associated VC/JWS serialization specifications referenced by §6.

### 1.7.2 Informative references

- OpenID for Verifiable Presentations (OpenID4VP).
- IETF Digital Credentials Query Language (DCQL) work in progress.
- HL7 US Core Implementation Guide.
- HL7 CARIN Consumer Directed Payer Data Exchange Implementation Guide.
- ISO/IEC 18013-5 Annex C and related mDL ecosystem implementation guidance.
- SMART App Launch and SMART Health Links background material, where useful for deployment context.

## Organizer notes

Strengths: this draft freezes reusable role names, distinguishes the clinical model from transport bindings, and states that the kiosk flow wraps and re-enters the same-device `org-iso-mdoc` flow. It also makes `profilesFrom[]` an array of profile-family canonical URLs and defines additive `profiles[]`/`profilesFrom[]` semantics for later §5 text.

Caveats: the final publication venue may require different front-matter, copyright, IPR, or reference formatting. Section §1.7 should be converted to the chosen citation syntax during the final Markdown/Bikeshed pass.

Downstream dependencies: §§3, 4, 5, 6, 8, and 9 should reuse the terms Requester, Verifier, Wallet, Holder, Artifact, Request item, Profile family, Kiosk Creator, Submission Service, Phone Presenter, and Completion Display exactly, or explicitly update this terminology section if a different term is chosen.
