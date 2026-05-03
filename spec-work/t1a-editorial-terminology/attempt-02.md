# 0. Front matter

## 0.1 Title block

**SMART Health Check-in 1.0 over W3C Digital Credentials API**

This document specifies the SMART Health Check-in 1.0 clinical request and response model and its initial presentation bindings. The clinical model is transport-neutral. The base presentation flow is a same-device flow using the W3C Digital Credentials API with direct `org-iso-mdoc`. The cross-device kiosk flow is a wrapper around that same-device flow: the kiosk creates a pointer, the patient resolves it on a phone, and the phone re-enters the same-device presentation flow.

Publication metadata, status, version, and date are maintained in §0.2.

## 0.3 Editors / contributors / IPR statement

Editors and contributors are listed here by the publishing work group before publication.

Contributions to this specification are made subject to the intellectual-property rules of the publishing organization. Contributors are expected to disclose any patent, copyright, trademark, or other intellectual-property claims that they believe may be essential to implementing this specification, according to that organization's process.

This specification uses examples, identifiers, URLs, and names only for interoperability illustration unless explicitly stated otherwise. Example names do not imply endorsement, operational availability, or trust status.

## 0.4 Copyright + license

Copyright © the publishing organization and contributors. The specification text is intended to be published under the Creative Commons Attribution 4.0 International Public License (CC BY 4.0), or a successor attribution license selected by the publishing organization.

Code fragments, schemas, CDDL modules, test vectors, and pseudocode in this document are intended to be available for implementation and testing under the document license unless a more permissive code license is identified in the final publication package.

# 1. Introduction

## 1.4 Reading guide

This document is organized so that implementers can separate clinical semantics from presentation transport.

* Sections marked informative describe motivation, architecture, threat-model context, and implementation guidance. They do not create independent conformance obligations.
* Sections marked normative define the behavior required for interoperable implementations. Normative requirements use the keywords defined in §1.5.1.
* Example blocks marked `(EX)` illustrate legal encodings or flows. Examples are not exhaustive and are not normative unless a normative paragraph explicitly refers to a property demonstrated by the example.
* Binding sections define how the transport-neutral SMART Health Check-in request and response are carried over a particular presentation mechanism. The direct `org-iso-mdoc` W3C Digital Credentials API binding is the base same-device presentation flow. The kiosk binding does not define a second clinical protocol; it wraps the same-device flow with pointer, relay, and completion steps and then re-enters the same-device flow on the phone.
* Conformance checklists summarize normative rules for certification. If a checklist and the prose disagree, the normative prose controls; the checklist must be corrected.

An implementation can be evaluated against one or more conformance classes, such as Verifier, Wallet, kiosk creator, submitter, or submission service. A product that implements multiple roles is evaluated independently for each role it claims. A transport binding may impose additional requirements, but it must not change the meaning of the clinical request or response model unless this specification explicitly defines such a profile.

## 1.5 Document conventions

This document is the Markdown source of truth. Diagrams, tables, JSON examples, CDDL fragments, and conformance inventories are authored directly in Markdown or in fenced code blocks embedded in Markdown. Generated HTML, PDF, and other renderings are derivative artifacts.

The following editorial conventions apply throughout the specification:

* Field names, literal string values, media types, algorithm names, protocol identifiers, and code symbols appear in backticks.
* JSON object names use `UpperCamelCase` for named data structures and `lowerCamelCase` for fields unless constrained by an external specification.
* Array-valued fields are named in the plural where doing so improves readability, for example `items`, `profiles`, and `profilesFrom`.
* The phrase "SMART request" means the transport-neutral `SmartHealthCheckinRequest` JSON object, not an mdoc request envelope, kiosk pointer, preset, or demo configuration.
* The phrase "SMART response" means the transport-neutral `SmartHealthCheckinResponse` JSON object, not a presentation token, encrypted kiosk submission, or transport acknowledgment.
* Unless otherwise stated, "FHIR" means FHIR R4 version 4.0.1 for this version of SMART Health Check-in.
* Requirements are written to protocol roles, not to specific products, operating systems, browsers, wallet frameworks, or deployment topologies.

### 1.5.1 RFC 2119 / RFC 8174 keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14, RFC 2119, and RFC 8174 when, and only when, they appear in all capitals.

Lowercase uses of words such as "must", "should", or "may" are ordinary English. They do not create conformance requirements.

Each normative requirement should identify its conformance target, either in the surrounding section or in the sentence that contains the requirement. For example, a sentence beginning "A Wallet SHALL..." binds Wallet implementations, while a sentence beginning "The kiosk creator SHALL..." binds kiosk-creator implementations. If a requirement is intended to bind more than one role, it should name each role explicitly.

### 1.5.2 JSON / CBOR / CDDL / COSE / HPKE notation

JSON examples use RFC 8259 JSON encoded as UTF-8. Example JSON objects are formatted for readability; insignificant whitespace and member order are not meaningful unless a section explicitly defines a canonicalization rule. JSON object member names are case-sensitive. JSON examples do not use comments, trailing commas, `NaN`, `Infinity`, or implementation-specific numeric extensions.

CBOR diagnostic notation follows RFC 8949. CDDL follows RFC 8610 and related CDDL updates cited by this document. Unless a CDDL fragment says otherwise, CDDL is descriptive of the corresponding CBOR shape and is not a replacement for the normative prose.

COSE notation follows the COSE specifications cited in §1.7. Protected headers, unprotected headers, payloads, and signatures are named according to COSE terminology. HPKE notation follows RFC 9180 and uses the RFC 9180 terms `mode`, `kem_id`, `kdf_id`, `aead_id`, `enc`, `info`, `aad`, plaintext, and ciphertext.

Where a byte string, COSE object, HPKE object, or CBOR item carries a SMART request or SMART response, the carried clinical object remains the same transport-neutral JSON data model. Transport encodings do not redefine `profiles`, `profilesFrom`, `accept`, `artifacts`, or other clinical fields.

### 1.5.3 Byte-string presentation

This document presents byte strings in one of the following forms:

* hexadecimal, prefixed with `0x`, for short byte strings and fixed test-vector components;
* base64url without padding, for JSON-embedded binary values and URL-safe presentation;
* CBOR diagnostic byte-string notation, for CBOR examples; or
* quoted text only when the bytes are the UTF-8 encoding of the quoted string.

Base64url values in this specification use the URL-safe alphabet from RFC 4648 and omit `=` padding characters unless a referenced specification requires padding. Hexadecimal examples are case-insensitive, but examples should use lowercase letters `a` through `f`.

A section that defines a signature, digest, transcript, or HPKE authenticated data value must state which exact bytes are covered. Human-readable diagrams and pretty-printed examples are not inputs to cryptographic operations unless the section explicitly says so.

### 1.5.4 Pseudocode and example dialect

Pseudocode is provided to explain protocol processing. It is not a required implementation language or algorithm unless the surrounding normative text explicitly requires equivalent behavior.

The pseudocode dialect uses the following conventions:

* `//` introduces a comment inside pseudocode blocks.
* `return error(code)` means processing stops with the named protocol error or status.
* `bytes(x)` means the exact byte representation defined by the surrounding section, not a language-specific serialization.
* `json(x)` means an RFC 8259 JSON serialization of the value `x`; a section that needs deterministic serialization states the determinism rule explicitly.
* `b64u(x)` means base64url without padding.
* `presentToUser(x)` means the implementation displays or otherwise makes `x` available for user review according to platform policy; it does not prescribe a user-interface layout.

Examples use plausible but non-operational identifiers. Unless an example states that it is a complete test vector, omitted fields are omitted only to focus the example.

## 1.6 Terminology

This section defines terms used consistently throughout the specification. A later section may define a more specialized term for a particular binding, but it should not redefine these terms.

**Artifact**: A response object that carries clinical content or a reference to clinical content. An artifact has a `mediaType` and a `fulfills` list that identifies the request items it satisfies. One artifact can satisfy multiple request items, and one request item can be satisfied by multiple artifacts.

**Browser** or **User Agent**: The software component that exposes the W3C Digital Credentials API to a Verifier page and mediates same-device presentation to a Wallet. This specification treats browser origin assertions and user-agent behavior according to the relevant W3C Digital Credentials API binding and does not require a particular browser product.

**Clinical content model**: The transport-neutral SMART Health Check-in JSON request and response model. It defines the request items, selectors, accepted media types, artifacts, and per-item status values independently of W3C Digital Credentials API, mdoc, kiosk relay, OpenID4VP, or any other presentation transport.

**Completion display**: The kiosk-side component that receives or observes the result of a cross-device kiosk submission and displays completion state to kiosk staff, the patient, or both. The completion display is not the Wallet and does not create the patient's same-device presentation.

**Credential Manager**: A platform service or user-agent-integrated service that discovers or invokes wallets for a Digital Credentials API request. The term is used descriptively; protocol requirements are written to Verifiers, Wallets, and User Agents rather than to a particular credential-manager API.

**Holder**: The person or subject whose health information is being requested and presented. In typical check-in use, the Holder is the patient or a person authorized to act for the patient.

**Item** or **Request item**: One entry in `SmartHealthCheckinRequest.items`. A request item describes one unit of requested clinical content, user-facing text about that request, whether the requester regards it as required, acceptable response media types, and a content selector.

**Request item id**: The `id` value assigned to a request item. Request item ids are unique within a SMART request and are used by response `fulfills` arrays and `requestStatus` entries to report what happened to each item.

**Kiosk creator**: The component in a cross-device kiosk deployment that constructs the kiosk wrapper around a SMART request. The kiosk creator may run on a desktop kiosk, front-desk workstation, or server. Its wrapper embeds the SMART request directly; it does not substitute a demo preset wrapper or an indirect preset name for the request.

**Phone presenter**: The patient's phone-side component that resolves a kiosk pointer and initiates or participates in presentation on the phone. After pointer resolution, the phone presenter re-enters the base same-device presentation flow with a Wallet.

**Profile family**: A canonical URL that identifies a collection, implementation guide, publication, or other family of FHIR profiles from which acceptable exact profiles can be derived. In the request model, `profilesFrom` is an array of such canonical profile-family URLs.

**Requester**: The party asking for clinical content. The Requester defines the SMART request and consumes the SMART response. The Requester is commonly an EHR, patient portal, intake service, kiosk back end, or other relying-party service.

**Responder**: The party that constructs a SMART response after user review and consent. In this specification, the Responder role is normally implemented by a Wallet.

**Submission service**: The relay or server-side service used by the cross-device kiosk flow to carry encrypted submissions or completion state between the phone-side flow and the kiosk-side completion display. The submission service is a transport component; it is not trusted with plaintext clinical content unless a deployment explicitly makes it part of the Requester.

**Verifier**: The protocol role that initiates a presentation request and verifies the returned presentation. In same-device presentation, the Verifier is typically the web page or relying-party component using the W3C Digital Credentials API. In this document, Verifier and Requester are closely related: Requester names the party asking for clinical content, while Verifier names the party performing presentation-protocol verification.

**Wallet**: Software controlled by or acting for the Holder that receives a presentation request, presents requested items for Holder review when appropriate, obtains consent according to its policies, and constructs a response or presentation. In this specification the Wallet is the usual Responder.

**profiles**: The request selector field containing exact FHIR `StructureDefinition` canonical URLs. `profiles` identifies specific acceptable profiles.

**profilesFrom**: The request selector field containing an array of canonical profile-family URLs. Each entry identifies a source family from which acceptable exact profiles may be derived.

**Additive selector semantics**: When `profiles` and `profilesFrom` both appear in a `fhir.resources` selector, they are additive. A resource can match because it conforms to an exact profile listed in `profiles`, because it conforms to a profile derived from a family listed in `profilesFrom`, or because it otherwise matches another selector present in the same request item. The presence of both fields does not narrow either field.

## 1.7 References

The final publication should maintain stable reference labels so that citations do not change when source Markdown is reorganized.

### 1.7.1 Normative

* **[RFC2119]** Bradner, S. *Key words for use in RFCs to Indicate Requirement Levels*. BCP 14, RFC 2119.
* **[RFC8174]** Leiba, B. *Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words*. BCP 14, RFC 8174.
* **[RFC7515]** Jones, M., Bradley, J., and N. Sakimura. *JSON Web Signature (JWS)*. RFC 7515.
* **[RFC8259]** Bray, T. *The JavaScript Object Notation (JSON) Data Interchange Format*. RFC 8259.
* **[RFC8610]** Birkholz, H., Vigano, C., and C. Bormann. *Concise Data Definition Language (CDDL): A Notational Convention to Express Concise Binary Object Representation (CBOR) and JSON Data Structures*. RFC 8610.
* **[RFC8949]** Bormann, C. and P. Hoffman. *Concise Binary Object Representation (CBOR)*. RFC 8949.
* **[RFC9052]** Schaad, J. *CBOR Object Signing and Encryption (COSE): Structures and Process*. RFC 9052.
* **[RFC9053]** Schaad, J. *CBOR Object Signing and Encryption (COSE): Initial Algorithms*. RFC 9053.
* **[RFC9180]** Barnes, R., Bhargavan, K., Lipp, B., and C. Wood. *Hybrid Public Key Encryption*. RFC 9180.
* **[ISO18013-5]** ISO/IEC 18013-5. *Personal identification — ISO-compliant driving licence — Part 5: Mobile driving licence application*.
* **[W3C-DC-API]** W3C. *Digital Credentials API*.
* **[FHIR-R4]** HL7. *FHIR Release 4, Version 4.0.1*.
* **[SMART-HEALTH-CARDS]** SMART Health IT. *SMART Health Cards Framework*.

### 1.7.2 Informative

* **[OpenID4VP]** OpenID Foundation. *OpenID for Verifiable Presentations*.
* **[DCQL]** IETF. *Digital Credentials Query Language*.
* **[US-CORE]** HL7. *US Core Implementation Guide*.
* **[CARIN-BB]** HL7. *CARIN Consumer Directed Payer Data Exchange Implementation Guide*.
* **[MDL-ANNEX-C]** ISO/IEC 18013-5 Annex C, where available to implementers under applicable ISO terms.

# Style guidance for pure Markdown source-of-truth

The specification should remain maintainable as a single Markdown source file.

* Use ATX headings (`#`, `##`, `###`) and preserve visible section numbers in heading text.
* Use stable reference labels such as `[RFC9180]`; do not rely on generated numeric bibliography labels in prose.
* Put normative data models, tables, and examples directly in the Markdown source rather than in generated images.
* Prefer fenced code blocks with explicit language tags such as `json`, `cddl`, `cbor-diag`, or `text`.
* Keep cryptographic byte inputs and outputs in text form, with an explicit encoding, so that rendered HTML and source Markdown remain equivalent.
* Do not use HTML-only anchors as the only cross-reference target; every important cross-reference should be readable in source Markdown.
* Keep platform-specific implementation notes out of protocol requirements. If platform behavior matters, state the protocol effect and cite the implementation-note section separately.

# Organizer notes

**Strengths:** This draft freezes reusable names for the clinical content model, base same-device presentation flow, kiosk wrapper, request items, artifacts, profile families, and relay components. It explicitly preserves the direct embedding of the SMART request in kiosk payloads and the additive meaning of `profiles` plus `profilesFrom`.

**Caveats:** The final copyright, IPR process, and reference metadata depend on the publishing venue. The exact W3C Digital Credentials API and `org-iso-mdoc` reference labels may need to be aligned with the final binding text.

**Downstream dependencies:** T2 request and response sections should reuse the terms `SmartHealthCheckinRequest`, `SmartHealthCheckinResponse`, request item, artifact, profile family, `profilesFrom`, and additive selector semantics. T3 and T4 should preserve the architectural rule that kiosk wraps and re-enters the same-device flow rather than defining a separate clinical protocol.
