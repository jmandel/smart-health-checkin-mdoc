# 0. Front matter placeholders

## 0.1 Title block

# SMART Health Check-in 1.0 over W3C Digital Credentials API

This document defines SMART Health Check-in 1.0, a profile for requesting and returning patient-mediated clinical artifacts during administrative or clinical check-in. The profile combines:

- a transport-neutral SMART Health Check-in clinical request and response model;
- a same-device presentation flow using W3C Digital Credentials API with direct `org-iso-mdoc`; and
- a cross-device kiosk flow that wraps the same-device flow with pointer, relay, and submission envelopes.

The short title of this specification is **SMART Health Check-in 1.0**. The abbreviated protocol name is **SHC Check-in** when a shorter label is needed in prose, examples, or registries.

## 0.3 Editors / contributors / IPR statement

**Editors:** _To be supplied before publication._

**Contributors:** _To be supplied before publication._

Contributions to this specification are expected to be made under the intellectual-property and contribution policies selected by the publishing work group. Until that policy is finalized, draft text in this document is a technical proposal and does not by itself grant patent, trademark, certification, or conformance rights. Implementers should consult the final publication venue for applicable IPR disclosures and participation rules.

## 0.4 Copyright + license

Copyright © _year and holder to be supplied before publication_.

This specification text is intended to be published under the Creative Commons Attribution 4.0 International License (CC BY 4.0) or a materially equivalent open documentation license. Code fragments, schemas, CDDL, and test vectors included in the specification are intended to be usable for implementation and conformance testing under the same license unless a later publication note assigns a more permissive code license.

# 1. Introduction

## 1.4 Reading guide

This specification is written as a single Markdown source of truth. Numbered headings are stable reference targets. Later rendered forms MAY add generated anchors, tables of contents, indexes, or syntax highlighting, but the Markdown source is authoritative for section titles, conformance keywords, field names, and examples.

Sections marked **normative** define requirements for one or more conformance targets. Sections marked **informative** explain motivation, architecture, examples, or implementation considerations and do not by themselves add conformance requirements. If informative text appears to conflict with normative text, the normative text controls.

Readers should approach the document in layers:

1. Sections 1 through 3 establish vocabulary, scope, roles, and protocol architecture.
2. Sections 5 and 6 define the transport-neutral clinical request and response model. These sections apply regardless of whether the request is carried through same-device presentation, a kiosk wrapper, or a future binding.
3. Section 8 defines the base presentation flow: same-device direct `org-iso-mdoc` over W3C Digital Credentials API.
4. Section 9 defines the cross-device kiosk flow as a wrapper around the same-device flow. A kiosk request payload embeds the SMART request directly and, after phone-side resolution, the phone re-enters the same-device flow.
5. Appendices provide checklists, schemas, CDDL, byte ladders, fixtures, and mapping guidance. Appendices identified as normative are part of the conformance target they support.

A conformance program should test requirements by conformance target: Verifier, Wallet, Kiosk creator, Cross-device submitter, and any explicitly named optional feature. Appendix A is intended to provide one row per requirement. A requirement written with a conformance keyword in a non-appendix normative section remains binding even if Appendix A is incomplete.

## 1.5 Document conventions

Field names, JSON member names, CDDL rule names, media types, protocol identifiers, URL strings, byte strings, and code-like literals appear in backticks. Prose terms that are defined in Section 1.6 are capitalized only when capitalization improves readability or disambiguation; the definition applies regardless of capitalization unless a term is explicitly declared case-sensitive.

Examples are labeled **(EX)**. Example values are not normative unless the surrounding normative text says a value is fixed. Placeholders use angle brackets, for example `<request-id>`, and are never literal protocol values.

The words **clinical request** and **clinical response** refer to the SMART JSON payloads, not to any particular transport envelope. The words **presentation flow**, **mdoc flow**, **kiosk flow**, **JWS**, **CBOR**, **COSE**, and **HPKE** refer to transport, proof, or encryption structures that carry or protect those clinical payloads.

A section that gives a checklist such as “Verifier MUST do exactly the following” is normative when the parent section is normative. Checklist items are intended to restate requirements in executable order; they do not weaken requirements stated earlier in the same section.

### 1.5.1 RFC 2119 / RFC 8174 keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14, RFC 2119 and RFC 8174, when and only when they appear in all capitals.

A conformance keyword binds the conformance target named by the sentence, paragraph, subsection, or checklist item in which it appears. If no target is named locally, the target is inherited from the nearest enclosing normative subsection heading or introductory sentence. Editorial uses of lower-case words such as “must” or “should” are ordinary English and are not conformance requirements.

Normative requirements should be phrased so that each requirement can be copied into Appendix A as a single testable row. When a requirement depends on an optional feature, the requirement applies only to implementations claiming that feature.

### 1.5.2 JSON / CBOR / CDDL / COSE / HPKE notation

JSON examples use UTF-8 JSON as defined by RFC 8259. Unless a section says otherwise, JSON object member order is insignificant, object member names are case-sensitive, duplicate member names are invalid, and strings are Unicode strings. JSON examples in this specification do not use comments or trailing commas.

CBOR notation follows RFC 8949. CBOR diagnostic notation is used only for explanation and examples; the encoded byte string is authoritative when a byte-level example includes both diagnostic notation and bytes.

CDDL follows RFC 8610 conventions. CDDL fragments in normative appendices define the intended shape of CBOR structures for this profile, subject to any additional prose constraints in the corresponding normative sections. If CDDL and prose conflict, the prose requirement controls until the conflict is resolved editorially.

COSE notation follows the COSE structures and algorithm naming used by RFC 9052 and related COSE algorithm registries. JWS notation follows RFC 7515. HPKE notation follows RFC 9180. Algorithm identifiers, suite names, and registry references are written exactly as required by their defining specifications or by this profile’s registries.

### 1.5.3 Byte-string presentation

Byte strings in examples are presented in one of three forms:

- hexadecimal strings prefixed with `0x`, used for short byte strings and byte-ladder excerpts;
- base64url without padding, used for JOSE values, compact encodings, and URL-safe values; or
- CBOR diagnostic byte strings, used only when illustrating CBOR structure.

When this specification says **base64url**, it means the URL-safe base64 alphabet with no `=` padding unless the section explicitly says otherwise. Hexadecimal examples use lower-case `a` through `f`; implementations MUST NOT rely on letter case when parsing a human-authored hexadecimal test fixture unless the fixture format says it is case-sensitive.

Line wrapping and visual indentation in byte-string examples are editorial. Implementations reconstructing bytes from an example MUST remove whitespace inserted solely for display. A byte-ladder example should state the exact transformation that each row applies, such as UTF-8 encoding, CBOR serialization, Tag 24 wrapping, COSE signing, HPKE sealing, or base64url encoding.

### 1.5.4 Pseudocode and example dialect

Pseudocode is explanatory and is not a programming-language binding. It uses JSON-like object literals, `//` comments only inside pseudocode blocks, and function names chosen for readability. A pseudocode function such as `canonicalizeCbor()` or `hpkeSeal()` names the required conceptual operation; it does not define an API signature.

Example JSON, CDDL, CBOR diagnostic notation, JOSE compact serialization, and byte ladders are written in the dialect of the referenced technology. A block labeled `(EX)` may omit fields that are irrelevant to the point being illustrated if the omission is stated or obvious from context. A complete conformance fixture MUST NOT rely on omitted fields, comments, or placeholders.

## 1.6 Terminology

**Artifact**: A clinical data object returned by a Wallet in response to one or more request items. An artifact is identified by media type and value. Examples include raw FHIR JSON, SMART Health Cards, and other registered response forms.

**Browser / User Agent**: The software component that exposes the W3C Digital Credentials API surface to a Verifier web page and mediates invocation of an available Wallet or credential provider. This specification relies on browser-origin properties but does not define browser conformance except where explicitly stated as an assumption.

**Clinical content domain**: The transport-neutral SMART Health Check-in request and response model. The clinical content domain defines what the requester asks for, how the holder is informed, how requested items are fulfilled or declined, and how returned artifacts are described.

**Clinical request**: A `SmartHealthCheckinRequest` JSON object. The clinical request is transport-neutral and does not contain requester identity metadata. In a kiosk request payload, the clinical request is embedded directly as `smartRequest`; it is not wrapped in a demo preset or other application-specific wrapper.

**Clinical response**: A `SmartHealthCheckinResponse` JSON object. The clinical response binds to a clinical request, reports status for each request item, and returns zero or more artifacts.

**Completion display**: The kiosk-side component that receives or renders the final result after the phone submits an encrypted response through the kiosk relay path. It is distinct from the Wallet and from the phone-side same-device presentation flow.

**Conformance target**: A class of implementation to which requirements apply, such as Verifier, Wallet, Kiosk creator, or Cross-device submitter.

**Credential Manager**: A platform or browser-mediated component that routes a Digital Credentials API request to an installed or available Wallet. Platform-specific Credential Manager behavior is implementation guidance unless a normative section explicitly depends on it.

**Cross-device kiosk flow**: The flow in which a desktop, kiosk, or front-desk system creates a pointer to an encrypted kiosk request; a phone resolves that pointer; and the phone then re-enters the same-device presentation flow to obtain user consent and construct the SMART clinical response. The kiosk flow is a wrapper around the same-device flow, not an alternate clinical protocol.

**Cross-device submitter**: The phone-side component that resolves a kiosk pointer, validates and decrypts the kiosk request as required by this specification, invokes or participates in the same-device presentation flow on the phone, and submits the resulting encrypted response for desktop completion.

**Direct `org-iso-mdoc` flow**: The same-device Digital Credentials API presentation flow using direct mdoc request and response structures for this profile, rather than an OID4VP binding.

**FHIR canonical**: A canonical URL used by FHIR to identify a profile, implementation guide, value set, code system, or other canonical resource. A versioned canonical is represented with the FHIR `canonical|version` convention where allowed by the relevant field.

**Holder**: The person whose clinical information is being requested and who is expected to authorize, decline, or constrain disclosure through a Wallet-mediated user experience. In many check-in scenarios the Holder is the patient, but this specification does not require a particular legal relationship.

**Item** or **request item**: A single element of `SmartHealthCheckinRequest.items[]` describing one requested category of content or action. Each request item has an `id` that is unique within the request and is referenced by response status entries and artifact fulfillment metadata.

**Kiosk creator**: The component that constructs the cross-device kiosk request, including the embedded `smartRequest`, signing metadata, encryption parameters, expiration, and pointer state. A kiosk creator is usually associated with the relying party’s desktop or front-desk system.

**Phone presenter**: The user’s phone, acting as the environment in which the kiosk pointer is resolved and the same-device presentation flow is invoked. The phone presenter role emphasizes that the phone presents the request to the Wallet and the Holder; it does not imply that the phone is the requester.

**Presentation transport domain**: The protocol layer that carries, signs, encrypts, or proves possession of clinical request and response bytes. In this specification the base presentation transport is same-device direct `org-iso-mdoc`; the kiosk transport wraps that base flow.

**Profile family**: A named family of FHIR profiles identified by a canonical profile-family URL. A request item may name `profilesFrom[]`, an array of canonical profile-family URLs, to select any profiles in the named families. Profile-family semantics are additive with explicit `profiles[]` selectors.

**Requester**: The organization, application, or service asking the Holder to provide clinical information for check-in. The Requester is represented in protocol flows by a Verifier or Kiosk creator, but requester identity metadata is intentionally kept out of the clinical request body.

**Responder**: The component that constructs a clinical response after Holder interaction. In this specification the Responder is normally the Wallet.

**Same-device presentation flow**: The base end-to-end flow in which a Verifier page and Wallet operate on the same device through W3C Digital Credentials API using direct `org-iso-mdoc`. Cross-device kiosk processing eventually re-enters this flow on the phone.

**Submission service**: The relay or service that stores, forwards, or makes available kiosk request and submission ciphertexts. The submission service is treated as untrusted with respect to clinical plaintext unless a later section explicitly assigns a stronger trust property.

**Transport-neutral**: Independent of a particular presentation, cryptographic envelope, browser API, or relay mechanism. A transport-neutral clinical request or response can be carried by the same-device flow, by the kiosk wrapper, or by a future binding without changing its clinical semantics.

**Verifier**: The relying-party web application or service that constructs a presentation request, invokes the same-device presentation flow, and validates the returned presentation and clinical response. In same-device flows the Verifier is the direct counterparty to the Wallet. In kiosk scenarios, verifier responsibilities are split across kiosk creator, phone-side same-device invocation, and completion processing as described in Section 9.

**Wallet**: Software controlled by or acting for the Holder that stores or accesses clinical artifacts, presents the request to the Holder, enforces Holder choices, and constructs the clinical response and required presentation proofs.

Selectors and request fields use the following terms consistently:

- `profiles[]` names explicit FHIR profile canonical URLs.
- `profilesFrom[]` is an array of canonical profile-family URLs.
- `profiles[]` and `profilesFrom[]` are additive selectors: content matching either selector contributes to fulfillment; one selector does not narrow the other.
- `resourceTypes[]` names FHIR resource types.
- `purpose` is display context for Holder understanding and is not requester identity.

## 1.7 References

References are grouped as normative or informative according to how they are used by this profile. A reference may move between groups during final editorial review if later normative text depends on it.

### 1.7.1 Normative references

- RFC 2119, “Key words for use in RFCs to Indicate Requirement Levels.”
- RFC 8174, “Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words.”
- RFC 8259, “The JavaScript Object Notation (JSON) Data Interchange Format.”
- RFC 8610, “Concise Data Definition Language (CDDL): A Notational Convention to Express Concise Binary Object Representation (CBOR) and JSON Data Structures.”
- RFC 8949, “Concise Binary Object Representation (CBOR).”
- RFC 9052 and related COSE specifications, “CBOR Object Signing and Encryption (COSE).”
- RFC 7515, “JSON Web Signature (JWS).”
- RFC 9180, “Hybrid Public Key Encryption.”
- ISO/IEC 18013-5, “Personal identification — ISO-compliant driving licence — Part 5: Mobile driving licence application.”
- W3C Digital Credentials API.
- HL7 FHIR Release 4, version 4.0.1.
- SMART Health Cards Framework.

### 1.7.2 Informative references

- OpenID for Verifiable Presentations (OpenID4VP).
- IETF Digital Credentials Query Language (DCQL), where applicable to future binding discussion.
- HL7 US Core Implementation Guide.
- HL7 CARIN Implementation Guide for Digital Insurance Card or successor coverage-related guidance.
- ISO/IEC 18013-5 mDL Annex C and related implementation notes.

# Style guidance for pure Markdown source-of-truth

The specification should remain reviewable and diffable as plain Markdown:

- Use one numbered heading hierarchy and do not encode section numbers in link labels unless the number is part of the visible heading.
- Prefer reference-style links for recurring external specifications so final references can be updated centrally.
- Keep normative prose close to the field, message, or algorithm it constrains.
- Put examples immediately after the rule they illustrate and label them `(EX)`.
- Avoid hidden generated content in the source; generated tables of contents, anchors, and indexes belong in the rendering pipeline.
- Do not introduce platform-specific API requirements outside implementation guidance sections.
- Preserve protocol layering in terminology: clinical request/response first, same-device direct `org-iso-mdoc` as the base presentation flow, and kiosk as a wrapper that re-enters that base flow on the phone.

# Organizer notes

## Strengths

- Establishes stable terms for roles, payload domains, selectors, kiosk components, and conformance targets.
- Makes the transport-neutral clinical model and same-device base flow explicit before later normative sections add wire details.
- Captures the important selector semantics: `profilesFrom[]` is an array of canonical profile-family URLs, and `profiles[]` plus `profilesFrom[]` are additive.

## Caveats

- Final publication metadata, editor list, contributor list, IPR policy, and exact license holder remain placeholders.
- Reference titles and versions should be normalized during final bibliography work.
- The Verifier role in kiosk scenarios may need tightening once Section 9 fixes exact responsibility boundaries.

## Downstream dependencies

- Section 3 should reuse the two-domain and role terms without renaming them.
- Sections 5 and 6 should rely on the clinical request/response terminology and selector definitions.
- Section 8 should define the direct `org-iso-mdoc` same-device flow as the base presentation flow.
- Section 9 should embed `smartRequest` directly in the kiosk request payload and describe kiosk as a wrapper that re-enters Section 8 on the phone.
- Appendix A should use the conformance-target and RFC 2119/8174 conventions defined here.
