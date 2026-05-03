## 0.1 Title block

# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a base same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API and a cross-device kiosk wrapper that re-enters that same-device flow on the patient's phone.

Short title: **SMART Health Check-in 1.0**.

Suggested citation label: **SHC-Checkin-1.0**.

Suggested document identifier: `smart-health-checkin-1.0`.

## 0.3 Editors / contributors / IPR statement

Editors, contributors, sponsoring organizations, affiliations, and contact information will be supplied before publication.

Contributions to this specification are intended for inclusion in an openly implementable interoperability specification. The final publication will identify the governing contribution process, intellectual-property-rights policy, patent disclosure process, and any required acknowledgments or statements from contributors.

Example identifiers, URLs, names, organizations, and clinical data in this document are for interoperability illustration only unless explicitly stated otherwise. They do not imply endorsement, operational availability, certification status, or trust status.

## 0.4 Copyright + license

Copyright © _publication year_ _publication owner(s) and contributors_.

This specification text is intended to be published under the Creative Commons Attribution 4.0 International License (CC BY 4.0), or a successor open documentation license selected by the publishing organization before final publication.

Code fragments, schemas, CDDL fragments, pseudocode, and test-vector scaffolding included in this document are intended to be usable for implementation and conformance testing. The final publication package will identify the exact license terms for those materials.

## 1.4 Reading guide

This specification separates clinical semantics from presentation transport.

1. The **clinical content model** defines the SMART Health Check-in JSON request and response. It describes requested clinical content, Holder review, returned Artifacts, and per-item status independently of any particular presentation transport.
2. The **same-device presentation flow** is the base presentation flow for version 1.0. It carries the clinical content model through the W3C Digital Credentials API using direct `org-iso-mdoc` presentation on the same device as the Wallet.
3. The **cross-device kiosk flow** is a wrapper around the same-device presentation flow. A kiosk or desktop creates a pointer to a signed and encrypted kiosk request. The patient's phone resolves the pointer, obtains the embedded SMART request, re-enters the same-device presentation flow locally on the phone, and submits an encrypted result for desktop completion. The kiosk flow does not define a second clinical protocol.

Sections marked normative contain requirements for the conformance targets identified by those sections. Sections and examples marked informative, explanatory, or `(EX)` provide context and illustrations only. If an example conflicts with normative prose, the normative prose controls.

Implementers should read the document in this order:

- Read §§1–3 for terminology, scope, architecture, role boundaries, and payload domains.
- Read §4 to identify the conformance class or classes implemented by a product or component.
- Read §§5–6 for the transport-neutral clinical request and response model. Wallets, Verifiers, Requesters, and response consumers need these sections regardless of presentation transport.
- Read §§7–8 for trust processing and the base same-device direct `org-iso-mdoc` presentation flow.
- Read §9 for implementations that create kiosk requests, relay encrypted state, resolve kiosk pointers on phones, submit encrypted responses, or display kiosk completion state.
- Read §§11–14 for security, privacy, registry, and internationalization requirements.
- Use the appendices for conformance checklists, schemas, CDDL, byte ladders, fixtures, and FHIR mapping details.

Certification and interoperability testing should be based on the normative requirements in the body of the specification and the one-row-per-rule conformance checklist in Appendix A. Appendix A is an index of requirements, not an independent source of additional requirements.

## 1.5 Document conventions

The Markdown source is the source of truth for this specification. Any future rendered forms, extracted schemas, generated fixture indexes, and generated conformance checklists are derived artifacts unless a final publication process explicitly designates another artifact as authoritative.

Visible numbered headings are stable cross-reference targets. Cross-references in prose should use section numbers, for example “§5.4.1.2”. Do not rely on generated anchors or rendered-only metadata as the only way to identify a requirement or example.

Field names, JSON member names, JSON string values, media types, protocol identifiers, URI strings, CDDL rule names, CBOR labels, JOSE and COSE parameter names, HTTP header names, cryptographic algorithm identifiers, and code-like literals appear in backticks. Placeholder values use angle brackets, for example `<request-id>`, only when the placeholder is not a literal protocol value.

Terms defined in §1.6 appear in ordinary prose after their definition unless backticks are needed to identify an exact wire value.

Requirements should identify their conformance target. Preferred phrasing is “A Wallet SHALL …”, “A Verifier SHALL …”, “A Kiosk creator SHALL …”, “A Phone presenter SHALL …”, “A Submission service SHALL …”, or “A Completion display SHALL …”. A requirement without an explicit target applies to the implementation role that performs the described function.

The phrases **SMART request** and **SMART response** refer to the transport-neutral JSON objects defined in §§5–6. They do not refer to mdoc request envelopes, kiosk pointers, demo presets, encrypted submissions, presentation tokens, or transport acknowledgments.

Examples should be introduced with “Example” or marked `(EX)` in the heading. Example data should be internally consistent with the normative model, but example-specific identifiers, keys, dates, patient data, endpoints, and display strings are not normative unless the surrounding text says they are fixed values.

Platform-specific behavior, such as Android Credential Manager routing, iOS wallet APIs, browser diagnostics, SDK packaging, and deployment recipes, belongs in implementation guidance unless a platform detail is necessary to define an interoperable wire artifact.

### 1.5.1 RFC 2119 / RFC 8174 keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14, RFC 2119 and RFC 8174, when, and only when, they appear in all capitals.

Lowercase uses of “must”, “should”, “may”, “required”, or similar words are ordinary English and do not by themselves create conformance requirements.

A conformance keyword binds the conformance target named by the sentence, paragraph, subsection, or checklist item in which it appears. If no target is named locally, the target is inherited from the nearest enclosing normative subsection heading or introductory sentence when such a target is unambiguous.

A note, example, figure caption, or informative appendix does not create a conformance requirement unless it explicitly states that a named conformance target MUST, SHALL, SHOULD, or MAY do something.

A requirement expressed for an optional feature applies only to implementations that claim support for that feature, unless §4 states that the feature is mandatory for a broader conformance class.

### 1.5.2 JSON / CBOR / CDDL / COSE / HPKE notation

JSON objects and members are described using RFC 8259 terminology. Unless a more specific rule is stated in §5 or §6, JSON strings are Unicode strings, JSON numbers are finite JSON numbers, arrays are ordered, and object member names are unique within an object. JSON object member order is not significant unless a later section defines a byte-for-byte canonicalization step for a specific artifact or fixture.

CBOR values are described using RFC 8949 terminology. CBOR diagnostic notation is used for readability and is not itself the wire encoding. Hexadecimal byte strings in CBOR diagnostic examples use `h'...'`; text strings use double quotes; arrays and maps use conventional diagnostic forms. Where deterministic encoding, tag use, or byte-exact comparison is required, the relevant section states that requirement explicitly.

CDDL fragments use RFC 8610 notation unless explicitly stated otherwise. CDDL names are local editorial labels unless a section states that a name is a registered or on-the-wire string. If CDDL and normative prose conflict, the prose controls and the conflict should be treated as a specification defect to be corrected.

COSE structures use the terminology and serialization model of RFC 9052 and related COSE specifications. For example, `COSE_Sign1` identifies the single-signer COSE signature structure. JOSE and JWS structures use RFC 7515 terminology. Algorithm identifiers are named in prose and, where needed, by their registered numeric or string values.

HPKE structures and operations use RFC 9180 terminology, including KEM, KDF, AEAD, `enc`, `info`, `aad`, plaintext, and ciphertext. Byte strings passed into HPKE are the exact serialized bytes identified by the relevant flow section, not their diagnostic, hex, base64url, or Markdown presentation.

When JSON values are carried inside CBOR, COSE, HPKE, mdoc, or kiosk structures, later sections specify whether the value is carried as JSON text, a byte string containing UTF-8 JSON, a CBOR data item, a tagged CBOR data item, a JWS payload, or another representation. Implementations must not infer a representation from an example alone.

### 1.5.3 Byte-string presentation

This document uses the following presentation forms for byte strings:

- **Hexadecimal** appears as lowercase hex octets, optionally grouped with spaces or line breaks for readability. Prefixes such as `0x` are not used for specification-authored values unless quoting an external source. Whitespace in a displayed hex string is not part of the value.
- **CBOR diagnostic byte strings** appear as `h'...'` and contain hexadecimal octets.
- **Base64url without padding** appears as URL-safe base64 using `-` and `_` and omitting `=` padding.
- **Quoted text** identifies bytes only when the surrounding text says that the bytes are the UTF-8 encoding of the quoted string.

A field defined as base64url uses base64url without padding unless the field definition explicitly permits or requires padding. Later field definitions state any parser rejection, recovery, or canonicalization rules.

Long byte strings may be wrapped across lines in the Markdown source. Such wrapping is editorial only. A byte string's value is obtained by removing Markdown line wrapping and any explicitly marked visual separators.

When this document says that a value is hashed, signed, encrypted, compared, or used as HPKE input, the operation is over the underlying bytes. It is never over the Markdown rendering, line wrapping, diagnostic notation, hex text, or base64url characters unless a section explicitly says that the textual representation is the input.

Byte-ladder examples present intermediate serialized values to make independent implementations debuggable. Such ladders are examples unless the surrounding normative text states a required construction step.

### 1.5.4 Pseudocode and example dialect

Pseudocode explains protocol behavior. It does not prescribe a programming language, API signature, threading model, storage model, user-interface layout, or SDK structure.

Pseudocode uses these conventions:

- `bytes(x)` means the exact byte serialization of `x` under the encoding rule named in the surrounding text.
- `utf8(s)` means the UTF-8 encoding of string `s`.
- `b64u(b)` means unpadded base64url encoding of byte string `b`.
- `sha256(b)` means SHA-256 over byte string `b`.
- `fail(reason)` means processing of the current protocol message stops and the implementation reports, displays, or logs the failure according to local policy and applicable privacy requirements.
- `||` means byte-string concatenation only when explicitly used in a cryptographic construction.
- `==` means byte-for-byte equality for byte strings and exact scalar equality for identifiers.

Example JSON uses comments only when the example is explicitly labeled non-literal explanatory pseudocode. Literal JSON blocks intended for copy/paste, schema validation, or fixture generation contain no comments, trailing commas, `NaN`, `Infinity`, or duplicate object member names.

Ellipses (`...`) in examples mean omitted material and are never literal protocol values. A complete conformance fixture must not rely on omitted fields, comments, or placeholders.

## 1.6 Terminology

This section defines terms used throughout the specification. A component can play more than one role in a deployment, but each role has the responsibilities described here. Later sections may define specialized terms for a binding, but should not redefine these terms.

**Artifact**: A response object that contains clinical content or references clinical content returned by a Wallet. An Artifact has an `id`, declares a `mediaType`, and lists the request item or items it fulfills. Examples include raw FHIR JSON and SMART Health Card content.

**Browser / User Agent**: The software component that exposes the W3C Digital Credentials API surface to a Verifier page and mediates invocation of a Wallet or credential provider. This specification relies on user-agent behavior described by the same-device flow and W3C Digital Credentials API, but does not define browser conformance beyond the assumptions stated in relevant sections.

**Clinical content model**: The transport-neutral SMART Health Check-in request and response JSON model defined in §§5–6. It describes requested patient-mediated content, accepted response media types, returned Artifacts, and per-item statuses independently of W3C Digital Credentials API, mdoc, kiosk relay, OpenID4VP, or any other presentation transport.

**Completion display**: In the kiosk flow, the kiosk-side or desktop component that receives notification of an encrypted submission, decrypts and validates the returned SMART response as authorized for the kiosk session, and presents completion state to staff, to the patient, or to another local workflow.

**Credential Manager**: A platform service, browser feature, or operating-system component that brokers a Digital Credentials API request to an available Wallet. A Credential Manager can influence wallet discovery and invocation, but this specification defines protocol requirements at the Verifier, Wallet, and flow levels rather than as platform-specific Credential Manager APIs.

**Cross-device kiosk flow**: The optional flow in which a Kiosk creator prepares a pointer to a signed and encrypted request for a patient's phone. After resolving and validating the pointer, the phone obtains the embedded SMART request, runs the same-device presentation flow locally, and submits an encrypted result for desktop completion. The kiosk flow wraps the same-device flow; it does not replace or fork the clinical content model.

**Demo preset**: A development-time or demonstration convenience that expands to a request. Demo presets are not protocol objects. A conforming kiosk request payload embeds the SMART request directly and does not embed a demo preset wrapper or indirect preset name.

**FHIR canonical**: A canonical URL as used by FHIR, optionally including a `|version` suffix where permitted by the relevant field. This specification uses FHIR canonicals for exact profile selectors, profile-family selectors, Questionnaire references, and related FHIR conformance resources.

**Holder**: The person whose clinical information is being requested and who controls whether information is shared. In typical check-in scenarios the Holder is the patient, member, parent, guardian, or other authorized representative using the Wallet.

**Holder data source**: A wallet-internal or deployment-specific source of clinical data available to a Wallet for response construction. Examples include locally stored credentials, SMART Health Cards, cached FHIR resources, issuer-provided credentials, or connected services. The protocol treats the Holder data source as abstract and does not define issuance, synchronization, or longitudinal storage.

**Item** or **request item**: One entry in `SmartHealthCheckinRequest.items[]`. A request item describes one unit of requested clinical content or action, user-facing display text, an advisory required flag, accepted response media types, and a content selector.

**Kiosk creator**: In the cross-device kiosk flow, the desktop, kiosk, or server-side component that creates the SMART request, embeds it directly as `smartRequest` in the kiosk request payload, signs the payload, arranges request-envelope encryption, and produces a pointer for the patient's phone.

**Phone presenter**: In the kiosk flow, the patient-phone component that resolves the pointer, obtains and validates the kiosk request, verifies that the pointer and payload identify the same request, and invokes or participates in the same-device presentation flow on the phone for the embedded SMART request. The Phone presenter then submits the encrypted result for the Completion display.

**Pointer URL**: A URL, commonly encoded in a QR code, that lets the phone locate an encrypted kiosk request. The Pointer URL is transport metadata, not the clinical request itself.

**Profile**: An exact FHIR `StructureDefinition` canonical URL, optionally with a `|version` suffix where permitted by §5.5. In `profiles[]`, each value selects that exact profile canonical.

**Profile family**: A canonical URL identifying a published implementation guide, publication, collection, or other family of FHIR profiles. Values in `profilesFrom[]` are canonical profile-family URLs.

**Profile-selector additivity**: The rule that `profiles[]` and `profilesFrom[]` broaden the set of acceptable profile matches when both appear in a `fhir.resources` selector. Content can satisfy the selector by matching an exact profile listed in `profiles[]` or by matching a profile from a family listed in `profilesFrom[]`, subject to the rest of the item definition. The presence of one field does not narrow the other. Later §5 rules define how `resourceTypes[]` and other selector fields interact with profile selectors.

**Requester**: The relying party that asks the Holder, through a Wallet, to share clinical content. The Requester is responsible for constructing the SMART request and consuming the SMART response. In the base presentation flow, the Requester acts through the Verifier role.

**Request item id**: The `id` of a request item. Request item ids are scoped to a single SMART request and are used by response Artifacts and status entries to refer back to requested items.

**Responder**: The role that constructs and returns a SMART response after Holder review and consent decisions. In this specification, the Wallet normally acts as the Responder.

**Same-device presentation flow**: The base version 1.0 presentation flow in which a Verifier page invokes the W3C Digital Credentials API on the same device where the Wallet is available, using direct `org-iso-mdoc` presentation. The same-device flow carries the transport-neutral SMART request and returns a transport-neutral SMART response inside the mdoc/DC API binding.

**Selector**: A structured expression in a request item's `content` field that describes acceptable clinical content. Selectors can identify FHIR resource requests, exact FHIR profiles, profile families, FHIR resource types, questionnaires, or registered extension kinds.

**SMART Health Check-in**: The protocol profile defined by this specification. It includes the clinical content model and presentation flows for patient-mediated check-in.

**SMART request**: A `SmartHealthCheckinRequest` JSON object as defined in §5. It contains the clinical content request and no requester identity metadata.

**SMART response**: A `SmartHealthCheckinResponse` JSON object as defined in §6. It binds to the SMART request by `requestId`, reports per-item status, and carries zero or more Artifacts.

**Submission service**: In the kiosk flow, an untrusted relay or provider that stores, forwards, or makes available encrypted kiosk request and response blobs, rows, or notifications. The Submission service is not trusted with plaintext clinical content and is not the clinical Requester merely because it relays data.

**Transport-neutral**: Independent of a particular presentation API, cryptographic envelope, browser behavior, relay mechanism, or future binding. A transport-neutral SMART request or SMART response has the same clinical semantics wherever it is carried.

**Verifier**: The presentation-transport role that constructs a presentation request, invokes the same-device `org-iso-mdoc` flow, receives and opens the presentation response, validates transport artifacts as required, and applies clinical response validation. In many deployments the Verifier and Requester are components of the same EHR, portal, or check-in application.

**Wallet**: Software controlled by or acting for the Holder that receives a request, renders requested items for Holder review when appropriate, obtains consent according to its policies, gathers or constructs responsive Artifacts from Holder data sources, and returns a SMART response through the selected presentation flow. The Wallet is the usual Responder in the clinical content model.

## 1.7 References

References are divided into normative and informative references. Normative references are required to implement this specification as written. Informative references provide background, related work, implementation context, or examples. Publication metadata and URLs should be completed during final editorial preparation.

### 1.7.1 Normative references

- **[RFC2119]** Bradner, S. *Key words for use in RFCs to Indicate Requirement Levels*. BCP 14, RFC 2119.
- **[RFC8174]** Leiba, B. *Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words*. BCP 14, RFC 8174.
- **[RFC7515]** Jones, M., Bradley, J., and N. Sakimura. *JSON Web Signature (JWS)*. RFC 7515.
- **[RFC8259]** Bray, T. *The JavaScript Object Notation (JSON) Data Interchange Format*. RFC 8259.
- **[RFC8610]** Birkholz, H., Vigano, C., and C. Bormann. *Concise Data Definition Language (CDDL): A Notational Convention to Express Concise Binary Object Representation (CBOR) and JSON Data Structures*. RFC 8610.
- **[RFC8949]** Bormann, C. and P. Hoffman. *Concise Binary Object Representation (CBOR)*. RFC 8949.
- **[RFC9052]** Schaad, J. *CBOR Object Signing and Encryption (COSE): Structures and Process*. RFC 9052.
- **[RFC9053]** Schaad, J. *CBOR Object Signing and Encryption (COSE): Initial Algorithms*. RFC 9053.
- **[RFC9180]** Barnes, R., Bhargavan, K., Lipp, B., and C. Wood. *Hybrid Public Key Encryption*. RFC 9180.
- **[ISO18013-5]** ISO/IEC 18013-5. *Personal identification — ISO-compliant driving licence — Part 5: Mobile driving licence application*.
- **[W3C-DC-API]** W3C. *Digital Credentials API*.
- **[FHIR-R4]** HL7. *FHIR Release 4, Version 4.0.1*.
- **[SMART-HEALTH-CARDS]** SMART Health IT. *SMART Health Cards Framework*.

### 1.7.2 Informative references

- **[OpenID4VP]** OpenID Foundation. *OpenID for Verifiable Presentations*.
- **[DCQL]** IETF. *Digital Credentials Query Language*.
- **[US-CORE]** HL7. *US Core Implementation Guide*.
- **[CARIN-BB]** HL7. *CARIN Consumer Directed Payer Data Exchange Implementation Guide*.
- **[MDL-ANNEX-C]** ISO/IEC 18013-5 Annex C and related mDL ecosystem implementation guidance.
- **[SMART-APP-LAUNCH]** SMART Health IT. *SMART App Launch Framework*, for deployment background where useful.

## Style guidance for pure Markdown source-of-truth

The specification should remain reviewable, diffable, and maintainable as plain Markdown.

- Use ATX headings (`#`, `##`, `###`) and preserve visible section numbers in heading text.
- Use stable reference labels such as `[RFC9180]`; do not rely on generated numeric bibliography labels in prose.
- Put normative data models, tables, and examples directly in the Markdown source rather than in generated images or hidden preprocessing inputs.
- Prefer fenced code blocks with explicit language tags such as `json`, `cddl`, `cbor-diag`, `hex`, `base64url`, or `text`.
- Keep cryptographic byte inputs and outputs in text form, with an explicit encoding, so rendered HTML and source Markdown remain equivalent.
- Do not use generated anchors or rendered-only metadata as the only cross-reference target; every important cross-reference should be readable in source Markdown.
- Keep platform-specific implementation notes out of protocol requirements. If platform behavior matters, state the protocol effect and cite the implementation-note section separately.
- Keep the clinical model, same-device direct `org-iso-mdoc` flow, and cross-device kiosk wrapper visibly distinct. Kiosk text should say when it re-enters the same-device flow rather than implying a second clinical protocol.
