# T1.A Editorial conventions and terminology — attempt 05

## 0.1 Title block

**SMART Health Check-in 1.0 over W3C Digital Credentials API**

A transport-neutral clinical request and response model, with a base same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API and an optional cross-device kiosk wrapper that re-enters that same-device flow on the patient's phone.

Suggested short title: **SMART Health Check-in 1.0**.

Suggested document identifier: `smart-health-checkin-1.0`.

## 0.3 Editors / contributors / IPR statement

Editors, contributors, and sponsoring organizations will be listed in the final published version. Until publication, this section is a placeholder for names, affiliations, contact information, and acknowledgment of material contributions.

Contributions to this specification are intended for public standardization. Contributors are expected to make contributions under the project's applicable contribution and intellectual-property-rights policy. The final version of this section will identify the governing policy and any required patent, copyright, or contribution statements.

## 0.4 Copyright + license

Copyright © [year] [copyright holder or publishing organization].

This specification text is intended to be published under the Creative Commons Attribution 4.0 International License (CC BY 4.0), or a successor license selected by the publishing organization before final publication. Code fragments, schemas, CDDL snippets, and test-vector scaffolding in this document are intended to be available under a permissive software license compatible with implementation in open-source and proprietary products; the final publication will identify that license explicitly.

## 1.4 Reading guide

This specification defines one clinical content model and two presentation flows:

1. The **clinical request and response model** defines JSON objects for asking for patient-mediated clinical content and returning artifacts that satisfy the request. This model is transport-neutral: it is the same model whether the request is carried by the base same-device flow, by the kiosk wrapper, or by a future binding.
2. The **same-device presentation flow** is the base presentation flow for version 1.0. It uses the W3C Digital Credentials API with direct `org-iso-mdoc` presentation on the same device as the patient's wallet.
3. The **cross-device kiosk flow** is a wrapper around the same-device presentation flow. A kiosk or desktop creates a signed, encrypted pointer-mediated request; the patient's phone resolves it and then re-enters the same-device flow locally on the phone. The kiosk flow does not define a second clinical protocol.

Sections marked normative contain requirements for conformance targets. Sections and examples marked informative, explanatory, or `(EX)` provide context and illustrations only. If an example conflicts with normative prose, the normative prose controls.

Implementers should read the document in this order:

- Read §§1–3 for terminology, scope, architecture, and role boundaries.
- Read §4 to determine the conformance class or classes being implemented.
- Read §§5–6 for the transport-neutral clinical request and response model. Wallets and verifiers that process clinical content need these sections regardless of presentation transport.
- Read §§7–8 for the trust model and the required same-device `org-iso-mdoc` presentation flow.
- Read §9 only for implementations that create, resolve, submit, or complete cross-device kiosk requests.
- Read §§11–14 for cross-cutting security, privacy, registry, and internationalization requirements.
- Use Appendices A–D for conformance checklists, schemas, CDDL, and test vectors. Appendices E–H provide byte-level and implementation-supporting material.

Certification and interoperability testing should be based on the normative requirements in the body of the specification and the one-row-per-rule conformance checklist in Appendix A. Appendix A is an index of requirements, not a source of additional requirements.

## 1.5 Document conventions

This document is authored as a pure Markdown source of truth. The Markdown source is expected to render to a single stable document whose section numbers and anchors can be cited by certification programs, implementation guides, and issue trackers. Cross-references should use section numbers and, when available, stable fragment identifiers.

Normative requirements are scoped to explicit conformance targets, such as **Verifier**, **Wallet**, **Kiosk creator**, **Phone presenter**, **Submission service**, or **Completion display**. A requirement without an explicit target applies to every implementation that performs the described function.

Field names, protocol identifiers, media types, algorithms, JSON values, CBOR labels, CDDL rules, and literal strings appear in backticks. Terms defined in §1.6 appear in ordinary text after their definition unless backticks are needed to identify a wire value.

Examples are illustrative. Example JSON is formatted for readability unless the surrounding text says that a byte-for-byte representation is being shown. The order of JSON object members in examples is not significant unless a canonicalization rule explicitly says otherwise.

### 1.5.1 RFC 2119 / RFC 8174 keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in all capitals.

Lowercase uses of these words have their ordinary English meaning. Informative sections should avoid capitalized conformance keywords unless they are intentionally restating a requirement from a normative section with a section reference.

For purposes of conformance:

- **MUST**, **SHALL**, and **REQUIRED** identify mandatory requirements.
- **MUST NOT** and **SHALL NOT** identify absolute prohibitions.
- **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, and **NOT RECOMMENDED** identify requirements for which a valid implementation can deviate only when it documents a specific, understood reason and preserves interoperability, security, and privacy expectations.
- **MAY** and **OPTIONAL** identify permitted behavior.

### 1.5.2 JSON / CBOR / CDDL / COSE / HPKE notation

JSON objects and members are described using RFC 8259 terminology. Unless a more specific rule is stated in §5 or §6, JSON strings are Unicode strings, JSON numbers are finite JSON numbers, arrays are ordered, and object member names are unique within an object.

CBOR values are described using RFC 8949 terminology. CBOR diagnostic notation is used for readability and is not itself the wire encoding. Hexadecimal byte strings in CBOR diagnostic examples use `h'...'`; text strings use double quotes; arrays and maps use the conventional diagnostic forms. Where deterministic encoding or tag use is required, the relevant section states that requirement explicitly.

CDDL fragments describe the intended CBOR structure. CDDL names are editorial labels unless a section states that a label is a registered or on-the-wire string. CDDL is subordinate to the normative prose if a conflict is discovered; such conflicts should be treated as specification defects to be corrected.

COSE structures are named using the terminology of RFC 9052 and related COSE specifications. For example, `COSE_Sign1` identifies the single-signer COSE signature structure. Algorithm identifiers are named in prose and, where needed, by their registered numeric or string values.

HPKE structures and operations are named using RFC 9180 terminology. This specification states the HPKE mode, KEM, KDF, AEAD, `info`, and AAD values used by each flow. Byte strings passed into HPKE are the exact serialized bytes identified by the relevant flow section, not their diagnostic or base64url presentation.

### 1.5.3 Byte-string presentation

This document uses three presentation forms for byte strings:

- **Hexadecimal** appears as lowercase hex octets, optionally grouped with spaces for readability. Prefixes such as `0x` are not used unless quoting an external source. Whitespace in a displayed hex string is not part of the value.
- **CBOR diagnostic byte strings** appear as `h'...'` and contain hexadecimal octets.
- **Base64url without padding** appears as URL-safe base64 using `-` and `_` and omitting `=` padding. When a field is defined as base64url-no-pad, encoders SHALL omit padding and decoders SHALL reject non-alphabet characters; later normative sections state any additional rejection rules.

When this document says that a value is hashed, signed, encrypted, compared, or used as HPKE input, the operation is over the underlying bytes. It is never over the Markdown rendering, line wrapping, diagnostic notation, or base64url characters unless a section explicitly says that the ASCII or UTF-8 representation is the input.

Byte-ladder examples present intermediate serialized values to make independent implementations debuggable. Such ladders are examples unless the surrounding normative text states a required construction step.

### 1.5.4 Pseudocode and example dialect

Pseudocode is written to explain protocol behavior, not to prescribe an API, threading model, storage model, or programming language. Function names such as `serializeJson`, `cborEncode`, `hpkeSeal`, and `verifySignature` are descriptive placeholders.

Pseudocode uses these conventions:

- `bytes(x)` means the exact byte serialization of `x` under the encoding rule named in the surrounding text.
- `UTF8(s)` means the UTF-8 encoding of string `s`.
- `BASE64URL_NOPAD(b)` means unpadded base64url encoding of bytes `b`.
- `SHA256(b)` means SHA-256 over bytes `b`.
- `||` means byte-string concatenation only when explicitly used in cryptographic constructions.
- `==` means byte-for-byte equality for byte strings and exact scalar equality for identifiers.

Example JSON uses comments only when the example is explicitly labeled non-JSON explanatory pseudocode. Normative JSON examples are valid JSON and do not contain comments, trailing commas, `NaN`, `Infinity`, or duplicate object member names.

## 1.6 Terminology

This section defines terms used throughout the specification. A component can play more than one role in a deployment, but each role has the responsibilities described here.

**Artifact**: A response object, or a body referenced by a response object, that carries clinical content returned by a Wallet. Artifacts are identified by `id`, declare a `mediaType`, and list the request item or items they fulfill. Examples include raw FHIR JSON and SMART Health Card content.

**Browser / User Agent**: The software component that exposes the W3C Digital Credentials API to a verifier page and mediates calls to a wallet or platform credential provider. This specification relies on the user agent for origin-related behavior described in the same-device flow but does not define browser conformance beyond the assumptions stated in the relevant sections.

**Clinical content model**: The transport-neutral SMART Health Check-in request and response JSON model defined in §§5–6. It describes requested patient-mediated content, returned artifacts, and per-item statuses independently of any particular transport.

**Completion display**: In the kiosk flow, the desktop or kiosk-side component that receives notification of an encrypted submission, decrypts it with the desktop's per-request private key, validates the returned SMART response, and presents completion state to staff or to the patient.

**Credential Manager**: A platform service, browser feature, or operating-system component that brokers a Digital Credentials API request to an available wallet. The Credential Manager can influence wallet discovery and invocation, but this specification defines protocol requirements at the verifier, wallet, and flow levels rather than as platform-specific Credential Manager APIs.

**Cross-device kiosk flow**: The optional flow in which a Kiosk creator prepares a pointer to a signed and encrypted request for a patient's phone. After resolving and validating the pointer, the phone runs the same-device presentation flow against the embedded SMART request and submits an encrypted response for desktop completion. The kiosk flow wraps the same-device flow; it does not replace or fork the clinical request/response model.

**FHIR canonical**: A canonical URL as used by FHIR, optionally including a `|version` suffix where permitted by the relevant field. This specification uses FHIR canonicals for exact profile selectors and profile-family selectors.

**Holder**: The person whose clinical information is being requested and who controls whether information is shared. In typical check-in scenarios the Holder is the patient. The term can also refer to a legally authorized representative acting for the patient when the deployment permits such use.

**Holder data source**: A wallet-internal or deployment-specific source of clinical data available to a Wallet for response construction. Examples include locally stored credentials, SMART Health Cards, cached FHIR resources, or connected services. The protocol treats the holder data source as abstract and does not define issuance, synchronization, or longitudinal storage.

**Item**: A single requested unit within a SMART Health Check-in request. Each item has an item `id`, user-facing display text, a content selector, and accepted response media types. Per-item consent and per-item status reporting are based on item identifiers.

**Kiosk creator**: In the cross-device kiosk flow, the desktop, kiosk, or server-side component that creates the SMART request, embeds it directly as `smartRequest` in the kiosk request payload, signs the payload, encrypts the request envelope, and produces a pointer for the patient's phone. The Kiosk creator does not wrap the SMART request in a demo preset or other non-standard request wrapper.

**Phone presenter**: In the kiosk flow, the patient-phone component that resolves the pointer, decrypts and validates the kiosk request, verifies that the pointer and payload identify the same request, and invokes the same-device presentation flow on the phone for the embedded SMART request. The Phone presenter then encrypts the resulting SMART response for the Completion display.

**Profile family**: A named family or publication set of FHIR profiles identified by a canonical URL, such as an implementation guide canonical. A profile-family selector requests resources conforming to profiles from that family. In the request model, `profilesFrom` is an array of canonical profile-family URLs.

**Requester**: The relying party that asks the Holder, through a Wallet, to share clinical content. The Requester is responsible for constructing the SMART request and consuming the SMART response. In the base presentation flow, the Requester acts through the Verifier role.

**Request item id**: The `id` of an item in a SMART request. Request item ids are scoped to a single request and are used by response artifacts and status entries to refer back to requested items.

**Responder**: The role that returns a SMART Health Check-in response. In this specification, the Wallet normally acts as the Responder.

**Same-device presentation flow**: The base version 1.0 presentation flow in which a verifier page invokes the W3C Digital Credentials API on the same device where the Wallet is available, using direct `org-iso-mdoc` presentation. The same-device flow carries the transport-neutral SMART request and returns a transport-neutral SMART response inside the mdoc/DC API binding.

**Selector**: A structured constraint in a request item's `content` field that describes the kind of content requested. Selectors can identify FHIR resource types, exact FHIR profiles, profile families, questionnaires, or registered extension kinds.

**Submission service**: In the kiosk flow, an untrusted relay or provider that stores and transports encrypted kiosk request and response blobs or notifications. The Submission service is not trusted with plaintext clinical content and is not the clinical Requester merely because it relays data.

**Verifier**: The presentation-transport role that constructs the same-device `org-iso-mdoc` request, invokes the Digital Credentials API, decrypts and validates the returned mdoc response, and applies clinical response validation. In many deployments the Verifier and Requester are components of the same EHR, portal, or check-in application.

**Wallet**: Software controlled by or acting for the Holder that receives a request, renders consent information, gathers or constructs responsive artifacts from holder data sources, and returns a SMART Health Check-in response through the selected presentation flow. The Wallet is the Responder in the clinical content model.

**Additive selectors**: The rule that `profiles`, `profilesFrom`, `resourceTypes`, and other selectors in the same selector object add acceptable ways to match content unless a later normative section explicitly defines a narrower relationship. In particular, `profiles` and `profilesFrom` are additive selectors: a request that includes both asks for content matching either exact listed profiles or profiles from listed profile families, subject to the rest of the item's selector and media-type constraints.

## 1.7 References

The final specification will divide references into normative and informative references. The following list identifies the expected references for this draft family; publication metadata should be completed during final editorial preparation.

### 1.7.1 Normative references

- RFC 2119, *Key words for use in RFCs to Indicate Requirement Levels*.
- RFC 8174, *Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words*.
- RFC 7515, *JSON Web Signature (JWS)*.
- RFC 8259, *The JavaScript Object Notation (JSON) Data Interchange Format*.
- RFC 8949, *Concise Binary Object Representation (CBOR)*.
- RFC 9052 and related COSE specifications, *CBOR Object Signing and Encryption (COSE)*.
- RFC 9180, *Hybrid Public Key Encryption*.
- ISO/IEC 18013-5, mobile driving licence / mdoc presentation mechanisms, as profiled by this specification.
- W3C Digital Credentials API, for browser-mediated credential presentation.
- HL7 FHIR Release 4 (4.0.1), for FHIR resources, canonicals, StructureDefinitions, and Questionnaire/QuestionnaireResponse behavior referenced by this specification.
- SMART Health Cards, for SMART Health Card artifact media type and Verifiable Credential packaging.

### 1.7.2 Informative references

- OpenID for Verifiable Presentations (OpenID4VP), for future binding alignment.
- IETF Digital Credentials Query Language (DCQL), for query-language alignment considerations.
- HL7 US Core Implementation Guide, as an example of a FHIR profile family.
- CARIN implementation guides, as examples of coverage and insurance-related FHIR profile use.
- ISO/IEC 18013-5 Annex C and related mDL implementation guidance, for background on mdoc ecosystem conventions.

## Organizer notes

**Strengths:** This draft makes the same-device `org-iso-mdoc` flow the named base flow, defines kiosk as a wrapper that re-enters same-device behavior on the phone, and gives downstream sections reusable terms for all major roles and artifacts. It also states the `profilesFrom` array shape and additive selector semantics early.

**Caveats:** Reference metadata and IPR text remain placeholders. Some conformance wording in §1.5 anticipates later sections and should be reconciled with the final Appendix A style.

**Downstream dependencies:** §§3, 5, 6, 8, and 9 should reuse these role names exactly, especially Kiosk creator, Submission service, Phone presenter, Completion display, Artifact, Item, Profile family, and Additive selectors.
