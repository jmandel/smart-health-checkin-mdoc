# SMART Health Check-in 1.0

A transport-neutral clinical request and response model for patient-mediated check-in, with a version 1.0 same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API.

Short title: **SMART Health Check-in 1.0**.

Suggested citation label: **SHC-Checkin-1.0**.

Suggested document identifier: `smart-health-checkin-1.0`.

---

## 0.2 Document status, version, publication date, and change log

Status: editor's draft for implementer review.

Version: 1.0 draft.

Publication date: to be supplied by the publishing organization.

This Markdown document is assembled from the accepted canonical section drafts for SMART Health Check-in 1.0. Sections 10 and 17-19 are intentionally concise final-matter placeholders pending governance, publication, and contributor input; they do not add runtime requirements beyond the normative sections and appendices below.

---

## 0.3 Editors / contributors / IPR statement

Editors, contributors, sponsoring organizations, affiliations, and contact information will be supplied before publication.

Contributions to this specification are intended for inclusion in an openly implementable interoperability specification. The final publication will identify the governing contribution process, intellectual-property-rights policy, patent disclosure process, and any required acknowledgments or statements from contributors.

Example identifiers, URLs, names, organizations, and clinical data in this document are for interoperability illustration only unless explicitly stated otherwise. They do not imply endorsement, operational availability, certification status, or trust status.

---

## 0.4 Copyright + license

Copyright © _publication year_ _publication owner(s) and contributors_.

This specification text is intended to be published under the Creative Commons Attribution 4.0 International License (CC BY 4.0), or a successor open documentation license selected by the publishing organization before final publication.

Code fragments, schemas, CDDL fragments, pseudocode, and test-vector scaffolding included in this document are intended to be usable for implementation and conformance testing. The final publication package will identify the exact license terms for those materials.

---

## 1. Introduction

### 1.1 Abstract

SMART Health Check-in 1.0 defines a patient-mediated check-in profile in which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content and receives a structured SMART response. The specification separates the transport-neutral clinical content model from presentation transport: the SMART request describes requested items, Holder-facing context, selectors, and accepted response media types, while the SMART response returns Artifacts, fulfillment links, and per-item status. Version 1.0 defines direct `org-iso-mdoc` over the W3C Digital Credentials API as its same-device presentation flow. In-person QR, NFC, deep-link, pointer, relay, submission, and completion mechanisms are deployment-defined ways to land a Holder on a same-device Verifier page, not a separate normative protocol layer.

### 1.2 Scope

SMART Health Check-in 1.0 defines an interoperability profile for patient-mediated check-in. A Requester asks a Holder, through a Wallet, to share clinical content needed for a bounded administrative or clinical workflow, and receives a structured SMART response that can be validated and consumed by the Requester's systems.

The profile fixes the shared protocol surface that otherwise varies across EHRs, patient portals, kiosk systems, payer-facing workflows, and Wallet platforms:

1. the **clinical content model**, consisting of the transport-neutral SMART request and SMART response; and
2. the **same-device presentation flow**, using direct `org-iso-mdoc` over the W3C Digital Credentials API.

The clinical content model defines request items, user-facing purpose and item text, accepted response media types, content selectors, returned Artifacts, fulfillment links, and per-item status reporting. The same SMART request has the same clinical meaning whether it is carried by the same-device presentation flow or by a future binding. Presentation transports can add origin context, reader or Verifier information, encryption, freshness, device evidence, routing metadata, and validation rules; they do not change request item semantics, selector meaning, consent granularity, Artifact media types, or response status semantics.

Version 1.0 defines the same-device presentation flow as the base presentation flow. In that flow, a Verifier carries the SMART request and receives the SMART response through direct `org-iso-mdoc` presentation over the W3C Digital Credentials API on the same device where the Wallet is available.

In-person deployments may initiate check-in by presenting a URL through a QR code, NFC tag, deep link, or similar mechanism that lands the Holder on a same-device Verifier page. The format of that URL, any pointer or relay service behind it, and any path by which completion state returns to a kiosk, desktop, or staff workflow are deployment-defined and are not standardized by version 1.0.

The profile standardizes clinical content selection conventions so a Requester can ask for familiar FHIR-shaped data without inventing local topic vocabularies. Request items can use FHIR-native selectors, including exact profile canonicals in `profiles[]`, profile-family canonicals in `profilesFrom[]`, official FHIR resource-type names, Questionnaire references, inline Questionnaires, and registered extension selectors. `profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either can identify acceptable profile matches for an item, subject to the rest of the item definition. Later §5 defines the precise selector rules, including interaction with `resourceTypes[]`.

The profile also standardizes the response accounting needed for interoperability. A Wallet can return Artifacts with declared media types, can link each Artifact to one or more request items it fulfills, and can report status for each request item. This supports many-to-many fulfillment: one Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts.

The profile identifies trust seams needed for deployment-specific policy without hard-coding a single national, institutional, or vendor trust model. Later sections distinguish web origin trust, Verifier or reader trust, issuer and device-attestation trust, and trust in the provenance of clinical content.

### 1.3 Out of scope

SMART Health Check-in 1.0 does not define how clinical data, credentials, SMART Health Cards, FHIR resources, mdoc documents, questionnaires, or other Holder data are issued to a Wallet or made available through a Holder data source. Issuer onboarding, credential issuance APIs, credential refresh, issuer lifecycle management, and issuer accreditation are outside this specification.

The specification does not define longitudinal Wallet storage. A Wallet may use local credentials, cached FHIR resources, SMART Health Cards, connected services, issuer-provided credentials, or other Holder data sources, but synchronization, retention policy, account recovery, backup, indexing, background refresh, and permanent personal health record behavior are outside this protocol.

The specification does not define EHR write-back or downstream clinical workflow. It standardizes how a Requester asks for and receives a SMART response. How a receiving EHR, payer system, intake system, or staff workflow imports, reconciles, deduplicates, persists, routes, displays, amends, or acts on returned content is a deployment decision, subject to applicable law and local policy.

The specification does not perform identity proofing. It does not define patient matching, portal enrollment, account binding, legal identity verification, guardian verification, delegation, proxy authority, or authority to act for another person. Presentation flows and returned Artifacts can carry trust signals, but real-world identity and authorization policy remain deployment responsibilities.

The specification does not define payments, eligibility adjudication, claims submission, benefit determination, coverage enrollment, payer-provider contracting, financial authorization, collection, or settlement. Insurance verification use cases are limited to patient-mediated sharing of coverage-related clinical or administrative content as Artifacts.

The specification does not define a general-purpose credential issuance framework, universal wallet portability layer, arbitrary FHIR query language, replacement for SMART App Launch, replacement for FHIR APIs, or replacement for payer transaction standards. It profiles check-in-oriented clinical request and response semantics and the version 1.0 same-device presentation flow that carries them.

Out-of-scope behavior can be implemented by products around this protocol. Such behavior does not change the semantics of a SMART request, a SMART response, or the same-device presentation flow. SMART Health Check-in 1.0 does not define QR-code, NFC, deep-link, pointer, relay, submission, or completion-display wire formats for in-person handoff.

### 1.4 Reading guide

This specification separates clinical semantics from presentation transport.

1. The **clinical content model** defines the SMART Health Check-in JSON request and response. It describes requested clinical content, Holder review, returned Artifacts, and per-item status independently of any particular presentation transport.
2. The **same-device presentation flow** is the version 1.0 presentation flow. It carries the clinical content model through the W3C Digital Credentials API using direct `org-iso-mdoc` presentation on the same device as the Wallet.

In-person deployments can use a QR code, NFC tap, deep link, or similar mechanism to land the Holder on a same-device Verifier page. The URL shape, pointer or relay storage, and any completion handoff are deployment-defined and are not a SMART Health Check-in protocol layer.

Sections marked normative contain requirements for the conformance targets identified by those sections. Sections and examples marked informative, explanatory, or `(EX)` provide context and illustrations only. If an example conflicts with normative prose, the normative prose controls.

Implementers should read the document in this order:

- Read §§1–3 for terminology, scope, architecture, role boundaries, and payload domains.
- Read §4 to identify the conformance class or classes implemented by a product or component.
- Read §§5–6 for the transport-neutral clinical request and response model. Wallets, Verifiers, Requesters, and response consumers need these sections regardless of presentation transport.
- Read §§7–8 for trust processing and the same-device direct `org-iso-mdoc` presentation flow.
- Treat QR, NFC, deep-link, pointer, relay, submission, and completion-display mechanics for in-person check-in as deployment-defined unless a future profile standardizes them.
- Read §§11–14 for security, privacy, registry, and internationalization requirements.
- Use the appendices for conformance checklists, schemas, CDDL, byte ladders, fixtures, and FHIR mapping details.

Certification and interoperability testing should be based on the normative requirements in the body of the specification and the one-row-per-rule conformance checklist in Appendix A. Appendix A is an index of requirements, not an independent source of additional requirements.

### 1.5 Document conventions

The Markdown source is the source of truth for this specification. Any future rendered forms, extracted schemas, generated fixture indexes, and generated conformance checklists are derived artifacts unless a final publication process explicitly designates another artifact as authoritative.

Visible numbered headings are stable cross-reference targets. Cross-references in prose should use section numbers, for example “§5.4.1.2”. Do not rely on generated anchors or rendered-only metadata as the only way to identify a requirement or example.

Field names, JSON member names, JSON string values, media types, protocol identifiers, URI strings, CDDL rule names, CBOR labels, JOSE and COSE parameter names, HTTP header names, cryptographic algorithm identifiers, and code-like literals appear in backticks. Placeholder values use angle brackets, for example `<request-id>`, only when the placeholder is not a literal protocol value.

Terms defined in §1.6 appear in ordinary prose after their definition unless backticks are needed to identify an exact wire value.

Requirements should identify their conformance target. Preferred phrasing is “A Wallet SHALL …”, “A Verifier SHALL …”, “A Requester SHALL …”, “A Responder SHALL …”, or “A response consumer SHALL …”. A requirement without an explicit target applies to the implementation role that performs the described function. Informal labels for in-person deployment components, such as kiosk screens or relay services, are not protocol conformance targets in version 1.0.

The phrases **SMART request** and **SMART response** refer to the transport-neutral JSON objects defined in §§5–6. They do not refer to mdoc request envelopes, QR codes, pointer URLs, demo presets, relay records, encrypted submissions, presentation tokens, or transport acknowledgments.

Examples should be introduced with “Example” or marked `(EX)` in the heading. Example data should be internally consistent with the normative model, but example-specific identifiers, keys, dates, patient data, endpoints, and display strings are not normative unless the surrounding text says they are fixed values.

Platform-specific behavior, such as Android Credential Manager routing, iOS wallet APIs, browser diagnostics, SDK packaging, and deployment recipes, belongs in implementation guidance unless a platform detail is necessary to define an interoperable wire artifact.

#### 1.5.1 RFC 2119 / RFC 8174 keywords

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **NOT RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in BCP 14, RFC 2119 and RFC 8174, when, and only when, they appear in all capitals.

Lowercase uses of “must”, “should”, “may”, “required”, or similar words are ordinary English and do not by themselves create conformance requirements.

A conformance keyword binds the conformance target named by the sentence, paragraph, subsection, or checklist item in which it appears. If no target is named locally, the target is inherited from the nearest enclosing normative subsection heading or introductory sentence when such a target is unambiguous.

A note, example, figure caption, or informative appendix does not create a conformance requirement unless it explicitly states that a named conformance target MUST, SHALL, SHOULD, or MAY do something.

A requirement expressed for an optional feature applies only to implementations that claim support for that feature, unless §4 states that the feature is mandatory for a broader conformance class.

#### 1.5.2 JSON / CBOR / CDDL / COSE / HPKE notation

JSON objects and members are described using RFC 8259 terminology. Unless a more specific rule is stated in §5 or §6, JSON strings are Unicode strings, JSON numbers are finite JSON numbers, arrays are ordered, and object member names are unique within an object. JSON object member order is not significant unless a later section defines a byte-for-byte canonicalization step for a specific artifact or fixture. A JSON member name should identify one value shape within its defining object. Object unions should have a clear discriminator or mutually distinguishable object keys. The protocol avoids primitive-versus-object polymorphism on the same member and avoids generic catch-all carriers whose shape is hidden behind open-ended strings.

CBOR values are described using RFC 8949 terminology. CBOR diagnostic notation is used for readability and is not itself the wire encoding. Hexadecimal byte strings in CBOR diagnostic examples use `h'...'`; text strings use double quotes; arrays and maps use conventional diagnostic forms. Where deterministic encoding, tag use, or byte-exact comparison is required, the relevant section states that requirement explicitly.

CDDL fragments use RFC 8610 notation unless explicitly stated otherwise. CDDL names are local editorial labels unless a section states that a name is a registered or on-the-wire string. If CDDL and normative prose conflict, the prose controls and the conflict should be treated as a specification defect to be corrected.

COSE structures use the terminology and serialization model of RFC 9052 and related COSE specifications. For example, `COSE_Sign1` identifies the single-signer COSE signature structure. JOSE and JWS structures use RFC 7515 terminology. Algorithm identifiers are named in prose and, where needed, by their registered numeric or string values.

HPKE structures and operations use RFC 9180 terminology, including KEM, KDF, AEAD, `enc`, `info`, `aad`, plaintext, and ciphertext. Byte strings passed into HPKE are the exact serialized bytes identified by the relevant flow section, not their diagnostic, hex, base64url, or Markdown presentation.

When JSON values are carried inside CBOR, COSE, HPKE, mdoc, or another specified structure, later sections specify whether the value is carried as JSON text, a byte string containing UTF-8 JSON, a CBOR data item, a tagged CBOR data item, a JWS payload, or another representation. Implementations must not infer a representation from an example alone.

#### 1.5.3 Byte-string presentation

This document uses the following presentation forms for byte strings:

- **Hexadecimal** appears as lowercase hex octets, optionally grouped with spaces or line breaks for readability. Prefixes such as `0x` are not used for specification-authored values unless quoting an external source. Whitespace in a displayed hex string is not part of the value.
- **CBOR diagnostic byte strings** appear as `h'...'` and contain hexadecimal octets.
- **Base64url without padding** appears as URL-safe base64 using `-` and `_` and omitting `=` padding.
- **Quoted text** identifies bytes only when the surrounding text says that the bytes are the UTF-8 encoding of the quoted string.

A field defined as base64url uses base64url without padding unless the field definition explicitly permits or requires padding. Later field definitions state any parser rejection, recovery, or canonicalization rules.

Long byte strings may be wrapped across lines in the Markdown source. Such wrapping is editorial only. A byte string's value is obtained by removing Markdown line wrapping and any explicitly marked visual separators.

When this document says that a value is hashed, signed, encrypted, compared, or used as HPKE input, the operation is over the underlying bytes. It is never over the Markdown rendering, line wrapping, diagnostic notation, hex text, or base64url characters unless a section explicitly says that the textual representation is the input.

Byte-ladder examples present intermediate serialized values to make independent implementations debuggable. Such ladders are examples unless the surrounding normative text states a required construction step.

#### 1.5.4 Pseudocode and example dialect

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

### 1.6 Terminology

This section defines terms used throughout the specification. A component can play more than one role in a deployment, but each role has the responsibilities described here. Later sections may define specialized terms for a binding, but should not redefine these terms.

**Artifact**: A response object that contains clinical content or references clinical content returned by a Wallet. An Artifact has an `id`, declares a `mediaType`, and lists the request item or items it fulfills. Examples include raw FHIR JSON and SMART Health Card content.

**Browser / User Agent**: The software component that exposes the W3C Digital Credentials API surface to a Verifier page and mediates invocation of a Wallet or credential provider. This specification relies on user-agent behavior described by the same-device flow and W3C Digital Credentials API, but does not define browser conformance beyond the assumptions stated in relevant sections.

**Clinical content model**: The transport-neutral SMART Health Check-in request and response JSON model defined in §§5–6. It describes requested patient-mediated content, accepted response media types, returned Artifacts, and per-item statuses independently of W3C Digital Credentials API, mdoc, QR codes, pointer or relay mechanisms, OpenID4VP, or any other presentation transport.

**Credential Manager**: A platform service, browser feature, or operating-system component that brokers a Digital Credentials API request to an available Wallet. A Credential Manager can influence wallet discovery and invocation, but this specification defines protocol requirements at the Verifier, Wallet, and flow levels rather than as platform-specific Credential Manager APIs.

**In-person handoff**: A deployment pattern in which a kiosk, tablet, staff desktop, printed instruction, QR code, NFC tag, deep link, or other mechanism lands the Holder on a same-device Verifier page. The URL format, pointer resolution, relay storage, response routing, and completion display behavior are deployment-defined and are not version 1.0 protocol roles or wire formats.

**Demo preset**: A development-time or demonstration convenience that expands to a request. Demo presets are not protocol objects, SMART requests, SMART responses, or standardized presentation artifacts.

**FHIR canonical**: A canonical URL as used by FHIR, optionally including a `|version` suffix where permitted by the relevant field. This specification uses FHIR canonicals for exact profile selectors, profile-family selectors, Questionnaire references, and related FHIR conformance resources.

**Holder**: The person whose clinical information is being requested and who controls whether information is shared. In typical check-in scenarios the Holder is the patient, member, parent, guardian, or other authorized representative using the Wallet.

**Holder data source**: A wallet-internal or deployment-specific source of clinical data available to a Wallet for response construction. Examples include locally stored credentials, SMART Health Cards, cached FHIR resources, issuer-provided credentials, or connected services. The protocol treats the Holder data source as abstract and does not define issuance, synchronization, or longitudinal storage.

**Item** or **request item**: One entry in `SmartHealthCheckinRequest.items[]`. A request item describes one unit of requested clinical content or action, user-facing display text, an advisory required flag, accepted response media types, and a content selector.


**Pointer URL**: A deployment-defined URL, commonly encoded in a QR code, NFC tag, or deep link, that lands the Holder on a same-device Verifier page or other local check-in entry point. A Pointer URL is not a SMART request and has no version 1.0 protocol wire format.

**Profile**: An exact FHIR `StructureDefinition` canonical URL, optionally with a `|version` suffix where permitted by §5.5. In `profiles[]`, each value selects that exact profile canonical.

**Profile family**: A canonical URL identifying a published implementation guide, publication, collection, or other family of FHIR profiles. Values in `profilesFrom[]` are canonical profile-family URLs.

**Profile-selector additivity**: The rule that `profiles[]` and `profilesFrom[]` broaden the set of acceptable profile matches when both appear in a `fhir.resources` selector. Content can satisfy the selector by matching an exact profile listed in `profiles[]` or by matching a profile from a family listed in `profilesFrom[]`, subject to the rest of the item definition. The presence of one field does not narrow the other. Later §5 rules define how `resourceTypes[]` and other selector fields interact with profile selectors.

**Requester**: The relying party that asks the Holder, through a Wallet, to share clinical content. The Requester is responsible for constructing the SMART request and consuming the SMART response. In the base presentation flow, the Requester acts through the Verifier role.

**Request item id**: The `id` of a request item. Request item ids are scoped to a single SMART request and are used by response Artifacts and status entries to refer back to requested items.

**Responder**: The role that constructs and returns a SMART response after Holder review and consent decisions. In this specification, the Wallet normally acts as the Responder.

**Same-device presentation flow**: The base version 1.0 presentation flow in which a Verifier page invokes the W3C Digital Credentials API on the same device where the Wallet is available, using direct `org-iso-mdoc` presentation. The same-device flow carries the transport-neutral SMART request and returns a transport-neutral SMART response inside the mdoc/DC API binding.

**Selector**: A structured expression in a request item's `content` field that describes acceptable clinical content. Selectors can identify FHIR resource requests, exact FHIR profiles, profile families, FHIR resource types, questionnaires, or registered extension kinds.

**SMART Health Check-in**: The protocol profile defined by this specification. Version 1.0 includes the transport-neutral clinical content model and the same-device direct `org-iso-mdoc` presentation flow for patient-mediated check-in.

**SMART request**: A `SmartHealthCheckinRequest` JSON object as defined in §5. It contains the clinical content request and no requester identity metadata.

**SMART response**: A `SmartHealthCheckinResponse` JSON object as defined in §6. It binds to the SMART request by `requestId`, reports per-item status, and carries zero or more Artifacts.

**Transport-neutral**: Independent of a particular presentation API, cryptographic envelope, browser behavior, relay mechanism, or future binding. A transport-neutral SMART request or SMART response has the same clinical semantics wherever it is carried.

**Verifier**: The presentation-transport role that constructs a presentation request, invokes the same-device `org-iso-mdoc` flow, receives and opens the presentation response, validates transport artifacts as required, and applies clinical response validation. In many deployments the Verifier and Requester are components of the same EHR, portal, or check-in application.

**Wallet**: Software controlled by or acting for the Holder that receives a request, renders requested items for Holder review when appropriate, obtains consent according to its policies, gathers or constructs responsive Artifacts from Holder data sources, and returns a SMART response through the same-device presentation flow. The Wallet is the usual Responder in the clinical content model.

### 1.7 References

References are divided into normative and informative references. Normative references are required to implement this specification as written. Informative references provide background, related work, implementation context, or examples. Publication metadata and URLs should be completed during final editorial preparation.

#### 1.7.1 Normative references

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

#### 1.7.2 Informative references

- **[OpenID4VP]** OpenID Foundation. *OpenID for Verifiable Presentations*.
- **[DCQL]** IETF. *Digital Credentials Query Language*.
- **[US-CORE]** HL7. *US Core Implementation Guide*.
- **[CARIN-BB]** HL7. *CARIN Consumer Directed Payer Data Exchange Implementation Guide*.
- **[MDL-ANNEX-C]** ISO/IEC 18013-5 Annex C and related mDL ecosystem implementation guidance.
- **[SMART-APP-LAUNCH]** SMART Health IT. *SMART App Launch Framework*, for deployment background where useful.

---

## 2. Purpose, problem statement, and design goals

### 2.1 Use cases

#### 2.1.1 Same-device patient portal check-in

A patient opens an EHR portal, scheduling page, or pre-registration page on a phone or other device that can invoke the patient's Wallet. The portal acts as Requester and Verifier, constructs a SMART request for content such as demographics, coverage, medications, allergies, or a visit-specific questionnaire, and invokes the same-device presentation flow.

The Wallet displays the requested items for Holder review, applies its local policies and Holder decisions, constructs a SMART response, and returns it through direct `org-iso-mdoc` over the W3C Digital Credentials API. This use case motivates a base flow with no cross-device relay and a clinical content model that is independent of any one portal vendor or Wallet implementation.

#### 2.1.2 In-person front-desk kiosk check-in

A patient arrives at a clinic and begins check-in at a kiosk, tablet, or staff desktop. The local system presents a QR code, NFC tag, deep link, printed URL, or similar deployment-defined entry point that lands the patient on a same-device Verifier page on the patient's phone.

Once the phone reaches that page, the same-device presentation flow carries the SMART request and SMART response. The specification does not define the QR or URL format, pointer resolution, relay storage, response routing back to the clinic, or completion display behavior; those are implementation-defined in-person handoff details.

#### 2.1.3 Pre-visit intake from a patient phone

Before an appointment, a practice sends the patient a link, portal prompt, message, or other entry point to complete intake on a phone. The SMART request can ask for visit-specific content such as updated medications, allergies, problem list entries, symptoms, insurance information, consents, or completion of an inline or canonical Questionnaire.

This use case motivates per-item consent and per-item status. A Holder may approve some request items and decline others; a Wallet may fulfill some items, report that others are unavailable, and return errors for still others without collapsing the whole interaction into an all-or-nothing result.

#### 2.1.4 Insurance verification

A provider, pharmacy, laboratory, imaging center, or administrative workflow asks the Holder for coverage or payer-related information. The request can use exact FHIR profile canonicals in `profiles[]`, profile-family URLs in `profilesFrom[]`, official FHIR resource types, and accepted media types that the Requester can process.

This use case motivates FHIR-native selectors and profile-selector additivity. It does not make eligibility adjudication, claims processing, benefit determination, or payment collection part of this specification.

#### 2.1.5 Health summary share for prior-auth or referrals

A care team, specialist, payer, referral destination, second-opinion service, or similar Requester asks the Holder for a focused health summary. The SMART request can identify content using profile families, exact profiles, resource types, questionnaires, or registered extension selectors, and can accept response media types such as raw FHIR JSON or SMART Health Cards where supported.

This use case motivates transport-neutral clinical semantics, many-to-many fulfillment, and layerable trust. A single summary Artifact may fulfill several request items, while one broad request item may be fulfilled by separate medication, problem, allergy, immunization, coverage, or result Artifacts.

### 2.2 Why a check-in protocol vs. plain credential issuance/presentation

Plain credential issuance answers how data or credentials become available to a Holder or Wallet for later use. Check-in asks a different question: what a specific Requester needs for a specific workflow now, how that request is displayed to the Holder, what subset the Holder permits, and how the response is correlated back to the request.

Plain credential presentation is also insufficient by itself. Presentation protocols can prove possession, protect transport, and support Verifier trust, but they do not inherently define a FHIR-native request vocabulary, item-level Holder review, accepted clinical media types, per-item status, or fulfillment links between requested items and returned Artifacts.

Without a check-in protocol, each EHR, portal, kiosk product, and Wallet would need private conventions for request topics, profile matching, consent granularity, response packaging, and error reporting. Those conventions are difficult to certify and brittle across many Requesters and many Wallet platforms.

SMART Health Check-in supplies the missing clinical request/response layer. The Requester can express desired content using FHIR canonicals, profile families, resource types, questionnaires, and registered extension selectors. The Wallet can decide how to satisfy the request from available Holder data sources and can return Artifacts with media types the Requester advertised as acceptable. The Verifier and response consumer can validate a predictable response shape before any local ingestion or workflow processing.

The result is intentionally layered. Version 1.0 specifies the transport-neutral clinical request/response model and a same-device direct `org-iso-mdoc` flow that carries, protects, and validates that model; it does not standardize a cross-device kiosk wrapper or relay protocol.

### 2.3 Goals

#### 2.3.1 Transport-neutral clinical content

The SMART request and SMART response define clinical semantics independently of presentation transport. Request items, selectors, accepted media types, Artifacts, fulfillment links, and status semantics retain their meaning when carried by the same-device presentation flow or a future binding.

#### 2.3.2 Per-item user consent

The protocol is designed around Holder review at the granularity of request items. Each item can carry user-facing context, an advisory workflow indication, accepted response media types, and a selector describing the requested content. The SMART response can distinguish fulfilled, declined, partial, unavailable, unsupported, and error outcomes when those statuses are defined in §6. The model avoids forcing all-or-nothing disclosure merely because several check-in needs are bundled into one session.

#### 2.3.3 FHIR-native selectors

Requesters should be able to describe clinical content using FHIR-native identifiers where they fit. Exact `StructureDefinition` canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource-type names, supported FHIR versions, Questionnaire canonicals, and inline Questionnaire resources let EHRs and Wallets reason over existing implementation guides and conformance resources rather than private topic names.

#### 2.3.4 Many-to-many fulfillment

The response model supports realistic clinical packaging. One Artifact can satisfy several request items, and several Artifacts can satisfy one request item. Per-item status remains explicit even when Artifacts are shared across items or when some items have no Artifact. This avoids requiring Wallets to split, duplicate, or reshape clinical content solely to match request-item boundaries.

#### 2.3.5 Interop across multiple EHRs and multiple wallet platforms

The profile aims for many-to-many interoperability. A Requester from one EHR ecosystem should be able to create a SMART request that a Wallet from another ecosystem can understand. A Wallet should be able to construct a SMART response that multiple Requesters can validate without private agreements about field names, local topic vocabularies, in-person handoff mechanisms, or response packaging.

#### 2.3.6 Layerable trust

The profile separates trust questions so deployments can compose them. A web origin can establish where a Verifier page came from. Reader or Verifier authentication can establish properties of the requesting application or organization. mdoc issuer and device evidence can establish properties of the presentation container. Artifact signatures, provenance, or other evidence can establish properties of the clinical source. These layers are related but not interchangeable; successful transport presentation does not by itself prove that unsigned clinical content originated from a particular clinical system.

### 2.4 Non-goals

SMART Health Check-in 1.0 is not intended to solve every health-data exchange problem. In particular, it is not a goal to:

- define credential issuance, credential refresh, issuer accreditation, or Wallet enrollment;
- require or standardize longitudinal health-record storage inside Wallets;
- define EHR write-back, clinical reconciliation, deduplication, order entry, staff workflow, or persistence behavior after a SMART response is received;
- prove real-world identity, guardianship, delegation, payer membership, or authority to act for another person;
- define payments, claims, eligibility adjudication, benefit determination, coverage enrollment, financial settlement, or prior-authorization submission;
- prescribe Wallet user-interface layout, clinical wording, clinical summarization policy, or local Holder data source architecture;
- define arbitrary FHIR search, graph traversal, cohort definition, CDS logic, or computable payer-rule evaluation;
- guarantee that returned content is complete, current, clinically correct, or legally sufficient for a downstream workflow;
- make raw FHIR JSON equivalent to issuer-signed clinical credentials when no separate provenance or signature is present;
- define QR-code, NFC, deep-link, pointer, relay, submission, or completion-display mechanisms as interoperable protocol artifacts;
- define a second kiosk-specific clinical request language distinct from the SMART request; or
- make a reserved future binding, including any OpenID4VP mapping, a required version 1.0 presentation flow.

These non-goals are design constraints. Implementations can build product features around the protocol, but conformance to this specification is about interoperable request construction, Holder-mediated response construction, same-device transport binding behavior, and validation of the resulting protocol artifacts.

### 2.5 Threat model summary

SMART Health Check-in assumes that clinical and administrative check-in information is sensitive, and that request context, metadata, and Holder consent decisions can also be sensitive. Attackers may attempt to observe, replay, delay, substitute, correlate, or modify protocol messages unless protected by the relevant transport, signature, encryption, freshness, and validation rules. Later security and privacy sections provide the detailed treatment; this subsection summarizes the main threats that motivate the design. See §11 for security considerations and §12 for privacy considerations.

For the same-device presentation flow, the main threats include origin spoofing, UI redress, malicious or confused Verifier pages, reader or Verifier impersonation, malformed or replayed presentation requests, profile-confusion attacks, and failure to bind the returned SMART response to the original SMART request and presentation session. The base flow uses W3C Digital Credentials API mediation and direct `org-iso-mdoc` presentation, but those mechanisms must be paired with the validation and trust-processing rules defined later in this specification.

For in-person handoff deployments, additional threats can include QR-code substitution, misleading deep links, relay observation, confused pairing between a local workflow and a phone, completion spoofing, and metadata leakage. Version 1.0 does not standardize that handoff as a protocol layer; deployments are responsible for designing their URL, pointer, relay, response-routing, and completion mechanisms so that §7 trust processing and the §8 same-device presentation flow remain intact.

For the clinical content model, the main threats include overbroad requests, misleading item descriptions, accidental disclosure, stale or untrusted Holder data sources, response tampering, mismatched request and response identifiers, incorrect fulfillment links, unsupported media types, and overstating the assurance of unsigned clinical content. The model addresses these risks by making request items explicit, supporting per-item Holder decisions and status, declaring Artifact media types, preserving fulfillment links, and keeping transport trust distinct from clinical-source provenance.

The Holder may decline any item, provide partial information, or lack responsive content. Those outcomes are not protocol failures by themselves. They are first-class check-in outcomes that later request, response, security, and privacy sections refine into precise processing and validation rules.

---

## 3. Architectural overview

SMART Health Check-in is intentionally layered. The clinical content model defines what is requested and what is returned. The same-device presentation flow defines the version 1.0 carriage and validation path between a Verifier and a Wallet on one device. In-person deployments can use their own handoff mechanisms to get the Holder to that same-device page, but those mechanisms are outside the version 1.0 protocol surface and do not create a second clinical request language.

This section is informative architecture text with normative pointers. Later sections define conformance targets, field rules, cryptographic constructions, validation steps, security requirements, privacy requirements, registries, and examples.

### 3.1 Two payload domains: clinical content vs. presentation transport

SMART Health Check-in distinguishes two payload domains:

1. the **clinical content domain**, consisting of the SMART request and SMART response JSON objects; and
2. the **presentation transport domain**, consisting of the envelopes, APIs, cryptographic bindings, origin or reader context, routing behavior, and validation artifacts that carry or protect those JSON objects.

These domains are related but not interchangeable. Clinical-content rules determine what was requested, what was returned, which request items were fulfilled, which media types were used, and what per-item outcomes were reported. Presentation-transport rules determine how the request and response are conveyed, bound to a session, encrypted, authenticated, or routed.

A transport can add origin context, Verifier or reader information, signatures, encryption, freshness, device evidence, routing identifiers, and relay metadata. It does not change the clinical meaning of request items, selectors, accepted media types, Artifact fulfillment, or per-item status. Conversely, a syntactically valid SMART response is not sufficient by itself; the Verifier still applies the transport, trust, and response-validation rules for the same-device flow.

#### 3.1.1 Clinical content domain

The clinical content domain is the transport-neutral clinical content model defined by the SMART request and SMART response in §§5–6.

A SMART request expresses a bounded check-in need. It identifies the request, provides Holder-facing purpose and item text, lists request items, declares accepted response media types, and uses content selectors to describe acceptable clinical content. Selectors can use FHIR-native constructs where they fit, including exact profile canonicals in `profiles[]`, canonical profile-family URLs in `profilesFrom[]`, official FHIR resource type names, Questionnaire references, inline Questionnaires, and registered extension selectors.

`profilesFrom[]` is an array of canonical profile-family URLs. `profiles[]` and `profilesFrom[]` are additive profile selectors: either field can identify acceptable profile matches, subject to the rest of the item definition. They are not narrowing selectors relative to each other. Later §5 defines the precise selector rules, including how `resourceTypes[]` interacts with profile selectors.

A SMART response is the Wallet/Responder's clinical answer to a SMART request. It binds back to the request, carries zero or more Artifacts, declares Artifact media types, links Artifacts to request items they fulfill, and reports status for each request item. The model supports many-to-many fulfillment: one Artifact can fulfill multiple request items, and one request item can be fulfilled by multiple Artifacts. Per-item status remains explicit even when no Artifact is returned for an item.

The clinical content model does not include requester identity metadata in the SMART request body. Requester, Verifier, origin, reader authentication, session freshness, issuer evidence, device evidence, and deployment trust information belong to presentation transport, trust processing, or local policy. Holder-facing purpose and item text help explain the request, but the SMART request body is not a requester identity credential, a consent directive, a persistent authorization grant, or a transport transcript.

The same SMART request has the same clinical meaning whether it is carried by the same-device presentation flow or by a future binding. Likewise, the SMART response remains the same clinical response object when carried by mdoc, processed by a Verifier, or consumed by a local response consumer.

#### 3.1.2 Presentation transport domain

The presentation transport domain carries and protects the clinical content model.

For version 1.0, the base presentation transport is the same-device presentation flow using direct `org-iso-mdoc` over the W3C Digital Credentials API. In that flow, the Verifier invokes the Digital Credentials API from a page or application context on the same device as the Wallet. The SMART request is carried by the mdoc request construction, and the SMART response is returned by the mdoc presentation response. Later §8 defines the exact `org-iso-mdoc` identifiers, mdoc document type, namespace, stable response element, request carrier, response carrier, SessionTranscript construction, encryption, and Verifier validation steps.

An in-person deployment can present a QR code, NFC tag, deep link, printed URL, or similar entry point that lands the Holder on a same-device Verifier page. The format of that URL, any pointer resolution or relay storage behind it, and any response-routing or completion-display path back to a kiosk, desktop, or staff workflow are deployment-defined. They are not version 1.0 protocol envelopes and do not replace the SMART request or SMART response.

Presentation-transport objects can introduce their own identifiers, nonces, expiration values, signatures, encryption keys, origin information, and routing metadata. Those fields support routing and security for a flow; they are not substitutes for SMART request identifiers, request item identifiers, Artifact identifiers, fulfillment links, or per-item status.

### 3.2 End-to-end flow and in-person initiation

Version 1.0 standardizes one presentation flow: the **same-device presentation flow**. The transport-neutral clinical request/response model in §§5–6 is the other normative layer. In-person deployments can choose QR, NFC, deep-link, or other handoff mechanisms to bring the Holder to the same-device Verifier page, but those mechanisms are deployment-defined and not separate protocol flows.

#### 3.2.1 Same-device presentation flow

In the same-device presentation flow, the Holder is using a device that can both access the Requester's page and invoke the Wallet. The Requester and Verifier are often components of the same portal, EHR, payer workflow, intake application, scheduling application, or check-in application, but the roles remain distinct: the Requester creates and consumes the clinical content, while the Verifier invokes and validates the presentation transport.

At a high level:

1. The Requester determines the bounded check-in need and constructs a SMART request.
2. The Verifier packages the SMART request into the direct `org-iso-mdoc` W3C Digital Credentials API request defined in §8.
3. The Browser / User Agent mediates the request to an available Wallet.
4. The Wallet/Responder displays or otherwise processes the request for Holder review according to Wallet policy and applicable requirements.
5. The Wallet/Responder gathers or constructs responsive Artifacts from Holder data sources and creates a SMART response.
6. The Wallet/Responder returns the response through the same-device presentation transport.
7. The Verifier validates transport artifacts and validates the SMART response before the Requester consumes it.

This flow has no standardized kiosk pointer, submission service, or cross-device relay. It is the version 1.0 presentation flow.

#### 3.2.2 In-person landing on the same-device flow

An in-person workflow can begin on a kiosk, staff desktop, shared tablet, sign, letter, or other local surface while Holder review and Wallet presentation occur on the Holder's phone. The local surface can present a QR code, NFC tag, deep link, or other deployment-defined pointer that lands the phone on a Verifier page. Once the phone loads that page, the standardized same-device presentation flow in §8 carries the SMART request and SMART response.

This pattern is not a version 1.0 protocol flow. The URL shape, pointer lookup, relay or storage service, request preparation, response return path, and completion display are deployment decisions. Implementations can label demo or product components as kiosk creators, phone presenters, submission services, or completion displays, but those labels do not create protocol conformance roles.

### 3.3 Roles and component contracts, protocol-level only

This specification defines protocol roles, not product architectures. One product can perform several roles, and one role can be split across deployed components, provided the protocol responsibilities for each role are met. Product user interfaces, local databases, EHR ingestion pipelines, staff workflows, Wallet storage models, and platform-specific APIs are outside these role contracts unless a later normative section defines a protocol-visible effect.

#### 3.3.1 Requester / Verifier

The **Requester** asks the Holder, through a Wallet, to share clinical content for a bounded workflow and consumes the SMART response. The Requester constructs the SMART request according to §5, including request items, Holder-facing context, selectors, and accepted response media types that accurately reflect what the Requester's systems can process.

The **Verifier** is the presentation-transport role. It constructs a presentation request, invokes the same-device presentation flow, receives and opens the presentation response, validates transport artifacts, extracts the SMART response, and applies clinical response validation before passing results to the Requester or downstream systems.

In many deployments, the same EHR, portal, payer, intake, or check-in application acts as both Requester and Verifier. Keeping the names separate prevents confusion between clinical-request semantics and presentation-session proof. Requester or Verifier identity, origin, reader authentication, certificates, and trust policy belong to the presentation transport and trust layers, not to self-asserted fields in the SMART request body.

#### 3.3.2 Browser / User Agent

The **Browser / User Agent** exposes the W3C Digital Credentials API surface to the Verifier page and mediates invocation of a Wallet or credential provider. The same-device flow relies on user-agent behavior for presentation invocation and origin context as defined by W3C Digital Credentials API and by later protocol sections.

This specification does not define a general browser conformance class beyond those assumptions. The Browser / User Agent is part of the presentation transport domain; it does not interpret clinical selectors, decide which Artifacts fulfill request items, rewrite the SMART request or SMART response, or become a clinical Requester or Responder.

#### 3.3.3 Wallet / Responder

The **Wallet** is software controlled by or acting for the Holder. In this specification, the Wallet normally acts as the **Responder**. It receives a SMART request through the same-device presentation flow, renders requested items for Holder review when appropriate, applies Wallet policy and Holder decisions, obtains or constructs responsive content from Holder data sources, creates a SMART response, and returns it through the selected presentation transport.

The Wallet/Responder is responsible for preserving the clinical semantics of the request and response. It is not required by this architecture to be a longitudinal health-record store, a credential issuer, a FHIR server, or an EHR. It can use local credentials, SMART Health Cards, cached FHIR resources, connected services, issuer-provided credentials, or other Holder data sources. Issuance, synchronization, refresh, backup, account recovery, indexing, and permanent storage are outside this protocol unless a later section defines a narrow validation consequence for returned Artifacts.

#### 3.3.4 Holder data source

A **Holder data source** is a Wallet-internal or deployment-specific source of clinical data available to a Wallet for response construction. It can be a locally stored credential, SMART Health Card, cached FHIR resource, connected service, issuer-provided document, or another source available to the Wallet.

The protocol abstracts over Holder data sources. The clinical content model constrains the shape and accounting of the response; it does not dictate where the Wallet obtained the content or guarantee that the content is complete, current, clinically correct, or signed by a clinical source. A raw FHIR JSON Artifact remains patient-mediated clinical content unless it carries separate provenance or signature evidence; successful transport presentation does not by itself make unsigned clinical content equivalent to issuer-signed credentials.

#### 3.3.5 Deployment-specific in-person components

Kiosks, staff desktops, relay services, phone landing pages, and completion displays can appear in deployments or demos, but SMART Health Check-in 1.0 does not assign them protocol conformance roles. Their protocol-visible responsibility is to preserve the same two normative layers: a valid SMART request/response model and, once a Holder is on a Wallet-capable device, the same-device `org-iso-mdoc` presentation flow.

A deployment-defined in-person handoff does not make a relay the clinical Requester, does not make a completion display an EHR write-back endpoint, and does not make a URL or pointer a SMART request. Any local signing, encryption, pairing, relay, or completion design is outside this specification unless a future profile standardizes it.

### 3.4 Sequence diagrams in Markdown/text form

The diagrams in this section are explanatory. They show role relationships and payload-domain boundaries. Later normative sections define exact message formats, cryptographic constructions, validation rules, and conformance targets.

#### 3.4.1 Same-device presentation flow

```text
Requester/Verifier        Browser / User Agent        Wallet/Responder        Holder
        |                           |                         |                  |
        | Construct SMART request   |                         |                  |
        | Package as direct         |                         |                  |
        | org-iso-mdoc request      |                         |                  |
        |-------------------------->| Route/mediate request   |                  |
        |                           |------------------------>| Display request  |
        |                           |                         |----------------->|
        |                           |                         | Holder reviews   |
        |                           |                         |<-----------------|
        |                           |                         | Build SMART      |
        |                           |                         | response         |
        |                           | Return mdoc/DC API      |                  |
        |<--------------------------| presentation response   |                  |
        | Open transport response,  |                         |                  |
        | validate, extract SMART   |                         |                  |
        | response, consume result  |                         |                  |
```

Key points:

- The SMART request is constructed once by the Requester and carried by the Verifier.
- The Browser / User Agent mediates the Digital Credentials API invocation.
- The Wallet/Responder constructs the SMART response after Holder review and Wallet policy.
- Verifier-side processing validates both transport artifacts and clinical response shape before local consumption.

#### 3.4.2 In-person landing example

```text
Local surface          Holder phone / browser        Wallet/Responder        Local workflow
      |                         |                         |                    |
      | Show QR/NFC/deep link   |                         |                    |
      |------------------------>| Load Verifier page      |                    |
      |                         | Package SMART request   |                    |
      |                         | as org-iso-mdoc request |                    |
      |                         |------------------------>| Holder review /    |
      |                         |                         | SMART response     |
      |                         |<------------------------| presentation       |
      |                         | Validate SMART response |                    |
      |                         | Deployment-defined completion/return path ------>|
```

Key points:

- The QR, NFC tag, deep link, URL, pointer, relay, and completion path are deployment-defined.
- The standardized protocol begins when the Verifier page runs the same-device presentation flow.
- The clinical exchange remains the SMART request and SMART response; there is no kiosk-specific clinical exchange.

### 3.5 Trust boundaries

SMART Health Check-in separates trust boundaries so deployments can compose policy without confusing one kind of assurance for another.

The main trust boundaries are:

- **Holder boundary**: the Holder controls disclosure decisions. A request item marked important or required for a workflow does not remove Holder control.
- **Clinical content boundary**: the SMART request and SMART response carry clinical semantics, but their JSON fields are not proof of real-world identity, requester identity, issuer authority, delivery through a particular transport, or clinical correctness.
- **Origin and user-agent boundary**: the Browser / User Agent can provide origin context and mediate Wallet invocation, but browser-origin trust is not the same as clinical-source trust.
- **Reader / Verifier boundary**: reader or Verifier authentication, when present, can establish properties of the requesting application or organization, but it does not by itself prove the provenance of returned clinical content.
- **Issuer and device boundary**: mdoc issuer evidence and device-key proof can establish properties of the presentation container, issuer, or device-controlled key, but they do not automatically turn unsigned raw clinical content into issuer-signed clinical credentials.
- **Holder data source boundary**: Wallets can use multiple Holder data sources. Requesters validate returned Artifacts and their evidence rather than assuming a particular source architecture.
- **In-person handoff boundary**: QR codes, NFC tags, deep links, pointers, relays, and completion displays are deployment-defined. They are not proof of requester identity, clinical provenance, or successful response validation, and they do not change the §7 trust layers or §8 same-device validation requirements.
- **Completion and downstream workflow boundary**: successful receipt of a SMART response is not EHR write-back, patient matching, legal authorization, payment adjudication, or clinical acceptance. Those are deployment responsibilities outside this protocol unless a later section defines a narrow protocol effect.

These boundaries are related but not interchangeable. For example, a browser-origin signal does not prove clinical provenance; reader authentication does not prove that raw FHIR JSON is issuer-signed; an mdoc device proof does not by itself authorize EHR write-back; and successful in-person handoff does not make a relay or completion display a trusted clinical processor.

Later §7 defines the trust framework in more detail. Later §8 applies it to direct `org-iso-mdoc`; later §§11–12 provide security and privacy considerations.

### 3.6 Design principles and normative pointers

This section records design principles that guide the normative sections. The principles are architectural pointers; the later sections named here contain the enforceable conformance rules.

#### 3.6.1 One docType, one namespace, one stable element

The base same-device presentation flow should expose a small, stable mdoc surface for SMART Health Check-in rather than a proliferation of transport-specific clinical elements. Later §8 defines the version 1.0 direct `org-iso-mdoc` identifiers, including the document type, namespace, request carrier, and stable response element. Later §13 registers or catalogs those identifiers as appropriate.

#### 3.6.2 No requester identity in clinical request body

The SMART request body describes requested clinical content and Holder-facing purpose; it is not a requester identity credential. Requester, Verifier, reader, origin, and organizational trust signals belong in presentation transport, trust framework, or deployment policy layers. Later §5 defines prohibited requester identity metadata in the clinical request body, and later §§7–8 define relevant trust and presentation validation.

#### 3.6.3 FHIR canonicals where they fit

Clinical content selection should use FHIR canonicals when the requested content maps to FHIR conformance resources. Exact profiles belong in `profiles[]`; profile families belong in `profilesFrom[]`; official resource type names belong in `resourceTypes[]`; Questionnaire canonicals and inline Questionnaires belong in questionnaire selectors. Later §5 defines canonical handling, including `|version` behavior, the array shape of `profilesFrom[]`, and the interaction between `resourceTypes[]` and profile selectors.

#### 3.6.4 No local topic vocabularies when FHIR terms exist

Requesters should not invent local topic names for content that can be expressed using FHIR resource types, profile canonicals, profile-family canonicals, or Questionnaire identifiers. Extension selector kinds are available for real gaps, but later §§4, 5, and 13 should keep those extensions explicit, registered or reviewable, and distinguishable from FHIR-native selectors.

#### 3.6.5 Response forms expressed as media types

A request item's acceptable response forms are expressed as media types. A response Artifact declares the media type actually returned. This keeps clinical packaging explicit and avoids making transport envelopes stand in for clinical content type. Later §§5, 6, and 13 define accepted media types, Artifact media-type rules, cross-validation, and registration expectations.

#### 3.6.6 Artifact-centered response with per-item status

The response model is Artifact-centered and status-explicit. Artifacts carry or reference clinical content and identify the request items they fulfill. Separately, `requestStatus[]` accounts for request items, including declined, unavailable, unsupported, partial, and error outcomes when defined in §6. This supports realistic many-to-many fulfillment without requiring Wallets to duplicate or reshape clinical payloads solely to mirror request-item boundaries.

#### 3.6.7 Explicit FHIR version on raw FHIR JSON

When an Artifact returns raw FHIR JSON, the response needs enough information for the Verifier to interpret it under the intended FHIR release. Later §6 defines the explicit FHIR-version requirement for raw FHIR JSON and distinguishes that requirement from response forms such as SMART Health Cards whose own format defines how FHIR content is represented.

#### 3.6.8 Default-to-retention for clinical workflows

Check-in content is often needed by downstream administrative or clinical workflows after the presentation session ends, and the same-device mdoc binding can signal the Verifier's intent to retain returned content where §8 defines that behavior. This principle does not define a Wallet-storage mandate, EHR write-back rule, retention duration, or clinical-sufficiency rule. Later §12 addresses data minimization, transparency, retention, and telemetry; local law and deployment policy control downstream recordkeeping.

#### 3.6.9 Crypto agility via profile registry, not in-band negotiation

Cryptographic suites, mdoc identifiers, transport algorithms, status codes, selector kinds, and media types should be governed by applicable profiles, versions, and registries rather than by unconstrained in-band negotiation inside clinical request bodies. Later §§4, 8, 11, and 13 define versioning, conformance classes, identifiers, security requirements, and registry rules.

---

## 4. Conformance

This section defines how implementations claim conformance to SMART Health Check-in 1.0. It is a map over obligations defined in §§5-8 and the supporting appendices; it does not create alternate request, response, same-device, trust, schema, CDDL, fixture, security, privacy, or registry behavior.

A conformance claim SHALL identify the implemented conformance target or targets, the claimed feature set or profile, the specification version, and any deployment profile that changes policy choices left open by this specification. One product MAY implement multiple targets, but it SHALL satisfy the requirements for each target and feature it claims.

SMART Health Check-in 1.0 has two normative layers:

1. the transport-neutral clinical request and response model in §§5-6; and
2. the direct same-device `org-iso-mdoc` presentation flow, including trust processing, in §§7-8.

A deployment MAY use a QR code, NFC tap, deep link, desktop sign, kiosk screen, or other handoff to land the Holder on a page that runs the §8 same-device flow. That handoff is implementation-defined deployment UX, not a SMART Health Check-in conformance feature or wire protocol. Labels such as kiosk, phone presenter, kiosk creator, submission service, provider, or completion display are non-normative deployment or demo labels only.

### 4.1 Conformance targets

#### 4.1.1 Requester / Verifier

A **Requester** constructs a SMART request and consumes a SMART response under the clinical model in §§5-6. A Requester claiming core clinical conformance SHALL construct `SmartHealthCheckinRequest` objects according to §5 and SHALL request only Artifact media types it is prepared to process for the corresponding item.

A **Verifier** packages a SMART request for a claimed presentation flow, validates the returned presentation artifacts required by that flow, extracts a SMART response, and applies §6.6 cross-validation against the original SMART request before Requester use. A Verifier claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Verifier-side requirements in §8.

A Requester/Verifier SHALL keep clinical request fields distinct from trust evidence. It SHALL NOT put requester identity, organization metadata, web origin, reader credentials, deployment handoff metadata, callback endpoints, trust assertions, or production trust-anchor claims in the SMART request body as substitutes for presentation-layer or deployment-policy trust.

#### 4.1.2 Holder Wallet / Responder

A **Holder Wallet / Responder** receives a SMART request through a supported flow, applies Holder control and Wallet policy, constructs a SMART response, and returns that response through the selected flow.

A Holder Wallet/Responder claiming core clinical conformance SHALL validate SMART requests under §5 before using them for response construction, process request items as the Holder-review and response-accounting granularity, preserve request item ids for `fulfills[]` and `requestStatus[].item`, construct SMART responses under §6, and set `SmartHealthCheckinResponse.requestId` to the accepted SMART request `id`.

A Holder Wallet/Responder claiming direct same-device `org-iso-mdoc` support SHALL satisfy the Wallet/Responder requirements in §8, including request-carrier validation, `SessionTranscript` processing, optional `readerAuth` classification and verification when supported or relied upon, Holder review or equivalent Holder-control processing, mdoc response construction, and HPKE response encryption.

A Holder Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector URLs, unknown SMART request members, deployment handoff metadata, demo strings, or Artifact contents as authenticated requester identity unless the selected presentation flow, trust processing, or deployment policy establishes that fact outside the SMART request body.

#### 4.1.3 Deployment/profile authors and conformance/fixture authors

A **deployment-profile author** or **profile author** defines stricter or additional constraints for a deployment community, certification program, trust framework, extension, or fixture profile. Such an author SHALL state which conformance targets are constrained, which optional features are required, which trust layers are in scope, and which additional validation, security, privacy, or fixture expectations apply. A deployment or profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, selector semantics, Artifact media types, fulfillment links, status codes, same-device carriers, trust-layer separation, or implementation-defined handoff UX.

A **conformance-test author** or **fixture author** creates executable checks, schemas, CDDL material, byte ladders, or vectors for one or more conformance targets. Such material SHALL derive from normative requirements in the body of this specification and from appendices that explicitly restate those requirements. Test and fixture material SHALL identify the target, feature set, section reference, expected outcome, comparison mode, and trust status of any demo keys, self-signed material, synthetic data, or real-platform captures.

### 4.2 Mandatory features

The mandatory core of SMART Health Check-in 1.0 is the transport-neutral SMART request and SMART response model in §§5-6. Direct same-device presentation in §§7-8 is the normative live presentation layer for implementations that claim live SMART Health Check-in presentation support.

An implementation claiming a clinical **Requester** target SHALL support construction of SMART requests using the §5 top-level request shape, fixed `type`, fixed `version`, request `id`, request item shape, item ids, Holder-facing display fields, `content.kind` selectors, per-item `accept[]`, and the §5.5 canonical `|version` handling rules that apply to the operations it performs.

An implementation claiming a clinical **Holder Wallet / Responder** target SHALL support parsing and validation of §5 SMART requests and construction of §6 SMART responses for the role and capabilities it claims. It SHALL preserve request/item identifiers, apply Holder-controlled item-level response accounting, use core status codes, use many-to-many Artifact fulfillment only as permitted by §6, and satisfy the core media-type rules for any Artifact media type it returns.

An implementation claiming a clinical **Verifier** or receiver validation target SHALL validate SMART responses under §6 and apply §6.6 against the original SMART request before treating a response as protocol-valid for Requester or workflow use. Shape validation alone is not sufficient.

Core clinical support includes `fhir.resources` and `questionnaire` selector shapes where an implementation claims to request or process those selectors; the flattened `questionnaire` selector with `canonical` and/or `resource` directly on the selector; `profilesFrom[]` as an array of canonical profile-family URLs; additive `profiles[]` plus `profilesFrom[]` semantics; canonical `|version` resolution and verification as defined by §5.5; request `accept[]` and Artifact `mediaType` rules; the removal of a generic catch-all Artifact carrier in favor of core or registered branded Artifact variants; `application/fhir+json` Artifacts with `fhirVersion`; `application/smart-health-card` Artifacts with `value.verifiableCredential[]` and no outer Artifact-level `fhirVersion`; `requestStatus[]` coverage exactly once for every request item; and §6.6 cross-validation.

All conformance targets SHALL preserve the trust-layer separation defined in §7 for the features they implement. In particular, an implementation SHALL NOT infer clinical-source provenance for unsigned raw FHIR JSON from successful transport presentation, mdoc issuer/device evidence, reader authentication, Holder action, SMART response shape validation, deployment handoff metadata, or demo fixture keys.

The version 1.0 live presentation binding is the direct same-device `org-iso-mdoc` flow in §8. A Requester/Verifier or Holder Wallet/Responder that claims live SMART Health Check-in 1.0 presentation support SHALL implement the applicable §8 obligations. A narrower claim for transport-neutral request/response tooling, JSON Schema validation, fixture production, deployment-profile authoring, or implementation-defined handoff UX does not by itself claim live §8 presentation support.

### 4.3 Optional features

An optional feature is not required for every SMART Health Check-in component. An implementation that claims an optional feature, or operates under a deployment profile that requires it, SHALL satisfy the referenced requirements for each target it claims.

#### 4.3.1 Direct same-device `org-iso-mdoc` presentation

Direct same-device `org-iso-mdoc` is the base version 1.0 live presentation flow. A Verifier or Holder Wallet/Responder claiming this feature SHALL implement §8 for its role, including the fixed protocol id, mdoc identifiers, request carrier, stable response element, tag-24 boundaries, direct `dcapi` `SessionTranscript`, HPKE suite, mdoc validation, SMART response extraction, and §8 validation checklist.

This feature does not imply support for any implementation-defined cross-device handoff, optional `readerAuth`, a particular production issuer trust anchor, full FHIR profile validation, SMART Health Card issuer trust, or clinical-source trust for unsigned raw FHIR JSON.

#### 4.3.2 Reader authentication and deployment trust policy

`readerAuth` is optional in the core same-device flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as §8 defines. A Holder Wallet/Responder that claims support for reader authentication or relies on it for policy SHALL verify and classify it under §§7-8 and applicable deployment policy.

A deployment profile MAY require authenticated origin, privileged-caller policy, `readerAuth`, reader certificate validation, issuer trust anchors, self-attested wallet labeling, clinical-source provenance, stricter validation, size limits, replay controls, retention policy, or other deployment-specific constraints. Such constraints SHALL identify the affected targets and SHALL NOT redefine the SMART request body as a requester identity container or redefine core response semantics.

Demo certificates, self-signed keys, checked-in private test keys, reflective allow-lists, demo issuer strings, demo audience strings, and fixture keys MAY be used in test or demonstration environments only when clearly labeled. They SHALL NOT be represented as production trust anchors or production key-management patterns unless an explicit deployment policy accepts them for that environment and states the resulting assurance level.

#### 4.3.3 Extension selectors, Artifact media types, and status codes

Registered or explicitly profiled extension selector kinds, extension Artifact media types, media-type compatibility rules, future status-code extensions, and stricter deployment schemas are optional unless a deployment profile requires them. An implementation that claims support for such an extension SHALL implement the extension's defined shape, processing rules, validation rules, unsupported behavior, security considerations, privacy considerations, and interactions with §§5-8.

Extension Artifact media types SHALL be defined as branded Artifact variants with a pinned `mediaType` literal or bounded media-type pattern and media-type-defined payload fields. They SHALL NOT rely on a protocol-level `GenericArtifact` catch-all or on freestanding `value`/`url`/`data` carrier choices whose semantics are not defined by the media type.

#### 4.3.4 Schema, CDDL, fixture, and conformance-vector material

Appendix B schema conformance, Appendix C CDDL or pseudo-CDDL conformance, Appendix D fixture conformance, byte-ladder material, and future external conformance-test-suite conformance are optional unless a deployment or certification program requires them. A tool or test profile that claims one of these profiles SHALL state which schema, CDDL fragment, fixture class, vector class, or checklist row it implements and whether comparison is structural, semantic, byte-exact, diagnostic, historical, or illustrative.

Fixture and diagnostic material is not production trust material. A fixture containing demo certificates, demo issuer keys, intentionally public private keys, deterministic randomness, self-attested material, synthetic data, or historical captures SHALL be labeled accordingly and SHALL NOT be used to claim production issuer, reader, or clinical-source trust.

#### 4.3.5 Future OID4VP binding

The OpenID4VP binding in §10 is reserved and informative for SMART Health Check-in 1.0. No implementation is required to support OID4VP to claim conformance to the core request/response model or the direct same-device `org-iso-mdoc` feature. An implementation SHALL NOT claim that an OID4VP experiment satisfies §8 conformance unless a future version or explicit profile defines that mapping.

### 4.4 Profile identifiers

A profile identifier names a coherent set of conformance rules for a target and feature set. Profile identifiers are not SMART request fields, SMART response fields, clinical selectors, media types, status codes, deployment handoff labels, or substitutes for a conforming SMART request. A conformance claim SHOULD include the profile identifier or label, specification version, target role, optional features, and any deployment-profile or fixture-profile dependencies.

Version 1.0 uses the following stable wire identifiers in normative artifacts:

| Identifier kind | Value | Scope |
| --- | --- | --- |
| SMART request discriminator | `smart-health-checkin-request` | §5 `type` field. |
| SMART response discriminator | `smart-health-checkin-response` | §6 `type` field. |
| SMART request/response model version | `1` | §5 and §6 `version` fields. |
| Core selector kinds | `fhir.resources`, `questionnaire` | §5 `content.kind` values. |
| Core Artifact media types | `application/fhir+json`, `application/smart-health-card` | §5 `accept[]` and §6 Artifact `mediaType`. |
| Core status codes | `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error` | §6 `requestStatus[].status`. |
| Direct DC API protocol id | `org-iso-mdoc` | §8 Digital Credentials API protocol. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | §8 same-device mdoc document type. |
| mdoc namespace | `org.smarthealthit.checkin` | §8 same-device namespace. |
| mdoc stable element | `smart_health_checkin_response` | §8 response element. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | §8 `ItemsRequest.requestInfo` key. |

Until §13 finalizes registry syntax, this specification uses the following human-readable conformance labels. These labels are documentation and test-report labels, not in-band clinical request fields:

| Label | Summary |
| --- | --- |
| `smart-health-checkin-core-1` | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | Reserved placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, a profile label, a topic label, or negotiation metadata to bypass §5 selectors, §5 `accept[]`, §6 response validation, §7 trust processing, or §8 validation.

### 4.5 Versioning rules

SMART Health Check-in uses separate version markers at separate layers. Implementations SHALL compare and interpret the version marker for the layer they are processing and SHALL NOT substitute one layer's version for another.

| Layer | Version or discriminator | Rule |
| --- | --- | --- |
| SMART request | `type: "smart-health-checkin-request"`, `version: "1"` | Requesters produce these values for version 1.0; Holder Wallets/Responders reject incompatible values unless a future compatibility rule applies. |
| SMART response | `type: "smart-health-checkin-response"`, `version: "1"` | Holder Wallets/Responders produce these values for version 1.0; Verifiers reject incompatible values unless a future compatibility rule applies. |
| Same-device mdoc | `DeviceRequest.version` and `DeviceResponse.version` `"1.0"`; `docType` `org.smarthealthit.checkin.1` | Verifiers and Holder Wallets/Responders use the §8 version 1.0 shape. Future incompatible mdoc profile changes SHOULD use a new profile identifier and, where necessary, a new `docType` suffix. |
| FHIR content | request `fhirVersions[]`, Artifact `fhirVersion`, and FHIR canonical `|version` suffixes | These are FHIR-layer signals, not SMART Health Check-in model versions. §§5-6 and Appendix H control their handling. |

A minor revision, extension, or deployment profile MAY add optional members, stricter policy, registered selector kinds, registered media types, registered status-code extensions, fixture profiles, or trust-profile requirements only when recipients that do not understand the addition can ignore it, reject it, or report it as unsupported without changing the meaning of known required fields or bypassing required validation.

A change is breaking and requires a new version, profile identifier, or future specification revision when it changes the meaning of existing SMART request fields, SMART response fields, selector semantics, Artifact media-type rules, fulfillment/status accounting, same-device carriers, trust-layer separation, or required validation outcomes.

### 4.6 Extension model

SMART Health Check-in extension points are explicit and additive. An extension SHALL NOT redefine the semantics of core request fields, response fields, selector kinds, Artifact media-type rules, fulfillment links, status codes, same-device request or response carriers, or §7 trust-layer separation.

A content-selector extension SHALL follow §5.4.3. Its definition SHALL specify the exact `content.kind` value, JSON shape, clinical meaning, fulfillment rules, interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, validation rules, unsupported behavior, security considerations, privacy considerations, and examples. A Holder Wallet/Responder that does not support an extension selector SHALL NOT guess its semantics from display text, profile labels, local topic names, field names, deployment handoff metadata, or requester identity metadata.

An Artifact media-type extension SHALL follow §§5.6 and 6.3.3. Its definition SHALL specify a pinned `mediaType` literal or bounded media-type pattern, payload fields, carrier shape, dereferencing and integrity rules when applicable, FHIR-version semantics if any, validation rules, status behavior, security considerations, privacy considerations, and compatibility with core media types if any. The extension SHALL be modeled as an additional branded Artifact variant, not as a `GenericArtifact` catch-all. A Holder Wallet/Responder SHALL NOT claim an extension Artifact fulfills an item unless the item accepted that media type or a supported compatibility rule applies. A Verifier SHALL enforce the same rule under §6.6.

A status-code extension SHALL NOT be used in a version 1.0 SMART response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat unknown status codes as invalid for version 1.0 response validation unless such support is present.

An extension or deployment profile MAY add stricter validation, narrower accepted media types, production trust anchors, provenance requirements, size limits, duplicate-handling rules, deterministic vector encodings, or registry-controlled identifiers. It SHALL state those constraints as additional profile requirements and SHALL NOT silently change the meaning of a base SMART Health Check-in 1.0 conformance claim. Registry syntax and change-control process are defined in §13.

### 4.7 Conformance checklist cross-link

Appendix A is the conformance checklist for certification and interoperability testing. Each checklist row SHALL link to a stable requirement source section and identify the conformance target, normative keyword, applicable feature or profile, requirement summary, and test or review implication. Appendix A is an inventory of requirements defined elsewhere; it SHALL NOT create independent obligations.

Conformance-test authors SHOULD organize Appendix A and test suites around at least these groups:

1. Core SMART request construction and processing (§5).
2. Core SMART response construction and cross-validation (§6).
3. Trust-layer separation and deployment-policy seams (§7).
4. Direct same-device `org-iso-mdoc` request, response, validation, and optional `readerAuth` (§8 and supporting appendices as applicable).
5. Extension, profile, registry, schema, CDDL, fixture, and future-binding material (§§4, 10, 13 and Appendices A-D/H as applicable).
6. Security, privacy, and internationalization requirements from §§11-14 when those sections are complete.

A checklist row for an optional feature SHALL state that the row applies only to implementations claiming that feature or to deployment profiles that make the feature mandatory. A checklist row that references fixture material SHALL state whether the fixture is a conformance vector, diagnostic material, historical capture, implementation regression, or illustrative example.

---

## 5. Clinical content — request

This section defines the SMART request, the transport-neutral clinical JSON object by which a Requester asks a Holder, through a Wallet/Responder, to share workflow-bounded clinical or administrative content. The same SMART request semantics apply when the object is carried by a presentation flow or by a future binding.

Presentation transports can add origin context, Verifier or reader authentication, signatures, encryption, freshness, device evidence, routing identifiers, relay behavior, and validation artifacts. They do not change the meaning of `purpose`, request items, selectors, `accept[]`, item identifiers, or the advisory `required` flag defined here.

The SMART request body is not a requester identity credential, consent record, persistent authorization grant, or transport transcript. Requester identity, Verifier identity, web origin, reader authentication, trust anchors, certificates, session freshness, implementation-defined hand-off state, and related trust metadata belong to presentation transport, trust processing, or local policy, not to self-asserted fields in the clinical request body.

### 5.1 Encoding rules

A SMART request is a JSON object. A Requester SHALL encode a SMART request as JSON conforming to RFC 8259. When a SMART request is serialized as text or bytes by a transport binding, the serialized JSON text SHALL be UTF-8.

#### 5.1.1 JSON UTF-8, RFC 8259, and no comments

A Requester SHALL NOT include comments, trailing commas, duplicate object member names, `NaN`, `Infinity`, `-Infinity`, or any other value outside the JSON data model in a SMART request. A Wallet/Responder or Verifier that parses a SMART request SHALL reject a request whose top-level value is not a JSON object or whose representation cannot be parsed according to the selected transport's encoding rules.

Literal JSON examples in this section are examples only. They use valid RFC 8259 JSON and do not include comments, trailing commas, ellipses, or placeholder values unless explicitly marked as non-literal explanatory pseudocode.

A transport binding that carries a SMART request SHALL define whether the request is carried as JSON text, a byte string containing UTF-8 JSON, a JSON-valued member of another object, a signed payload member, or another exact representation. This section does not define a byte-for-byte JSON canonicalization for the clinical request object.

#### 5.1.2 Object key uniqueness, ordering, and non-JSON numbers

JSON object member names in a SMART request SHALL be unique within each object. A Wallet/Responder or Verifier SHALL reject a SMART request when duplicate object member names are detected during parsing or validation. Implementations SHOULD avoid parser configurations that silently apply parser-specific “first member wins” or “last member wins” behavior to security-relevant protocol data.

Object member order has no clinical meaning in the SMART request model. Array order has meaning only where a field definition states it has meaning. In this section, `fhirVersions[]` and `accept[]` are ordered by Requester preference, and `items[]` order is the Requester's preferred display or workflow order.

This section defines no numeric fields. A Requester SHALL NOT encode identifiers, versions, booleans, arrays, media types, FHIR canonicals, or display strings as JSON numbers. Because RFC 8259 JSON has no `NaN`, `Infinity`, or `-Infinity` values, those values SHALL NOT appear in a SMART request.

#### 5.1.3 Numeric, string, and identifier limits

This section does not define global maximum lengths for strings, arrays, or serialized request bytes. A Requester SHOULD keep request ids, item ids, titles, summaries, purpose text, canonicals, media type strings, and inline Questionnaire content no larger than needed for the check-in workflow and Holder review. A Wallet/Responder MAY reject a request that exceeds implementation, transport, safety, display, or policy limits, provided the rejection is reported according to the selected flow and applicable privacy requirements.

Appendix B, §8, fixture work, and conformance closure are expected to define any concrete schema or transport limits needed for interoperable testing. Until those limits are fixed, conformance to this section is based on the field-specific rules below rather than on ungrounded numeric maxima.

#### 5.1.4 Forward-compatible unknown-member handling

A Wallet/Responder MAY ignore unknown members at the top level of the SMART request, in request items, and inside known selector objects when those members do not change the meaning of known required members. Ignoring an unknown member does not make a malformed known member valid.

A Requester SHALL NOT rely on an unknown member to carry requester identity, override Holder control, change `accept[]`, change selector semantics, change `required`, or impose transport, trust, or consent behavior.

An unknown `content.kind` value is not an ignorable member. It identifies an extension selector kind and is processed according to §5.4.3 and the response status rules in §6.

### 5.2 `SmartHealthCheckinRequest`

A `SmartHealthCheckinRequest` has this top-level shape:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "<request-id>",
  "purpose": "<holder-facing purpose>",
  "fhirVersions": ["4.0.1"],
  "items": []
}
```

A Requester SHALL include `type`, `version`, `id`, and `items`. A Requester MAY include `purpose` and `fhirVersions`.

#### 5.2.1 `type`

A Requester SHALL set `type` to the exact string `"smart-health-checkin-request"`. A Wallet/Responder SHALL reject a SMART request whose `type` member is absent or is not exactly `"smart-health-checkin-request"`.

#### 5.2.2 `version`

A Requester SHALL set `version` to the exact string `"1"` for requests conforming to SMART Health Check-in 1.0. The `version` member is the SMART request-model version. It is not a FHIR version and not a presentation-transport version.

A Wallet/Responder SHALL reject a SMART request whose `version` member is absent or is not exactly `"1"`, unless a future version-negotiation rule explicitly defines compatible handling for another value.

#### 5.2.3 `id`

A Requester SHALL include `id` as a non-empty opaque Requester-generated request identifier. A Requester SHALL generate `id` values so they are unique among SMART requests created by that Requester for the same check-in session. A Requester SHOULD generate `id` values with enough unpredictability or contextual uniqueness to avoid accidental collision and cross-session guessing by parties that only observe unrelated sessions.

A Wallet/Responder SHALL preserve the request `id` value for response construction so §6 can bind the SMART response to the request using `requestId`.

The request `id` is not a patient identifier, requester identifier, proof of freshness, or clinical fact. A Wallet/Responder SHALL NOT infer requester identity, patient identity, authorization, or clinical meaning from the syntax of `id`.

#### 5.2.4 `purpose`

`purpose` is optional Holder-facing display and workflow context. Examples include `"Clinic check-in"`, `"Insurance verification"`, and `"Pre-visit intake"`.

A Requester MAY include `purpose`. If present, a Requester SHALL encode `purpose` as a string and SHALL use it only to describe the workflow context for Holder review. A Requester SHALL NOT use `purpose` to carry requester identity, organization name, web origin, logo URL, contact URL, legal attestation, proof of authority, consent language, trust status, or persistent authorization semantics.

A Wallet/Responder MAY display `purpose` to the Holder as request context. A Wallet/Responder SHALL NOT treat `purpose` as authenticated requester identity or as a transport trust signal.

#### 5.2.5 `fhirVersions[]`

`fhirVersions` is an optional ordered array of FHIR release-version strings that the Requester can consume for raw FHIR JSON Artifacts and other response forms whose registered definition relies on an outer FHIR version declaration. Examples include `"4.0.1"`, `"4.3.0"`, and `"5.0.0"`.

If a Requester includes `fhirVersions`, the Requester SHALL encode it as an array of strings ordered from most preferred to least preferred. A Requester that accepts `application/fhir+json` SHOULD include at least one FHIR release version unless the Requester can safely process any FHIR version that a conforming Wallet/Responder might return under §6.

A Wallet/Responder SHOULD use `fhirVersions[]` when choosing a FHIR version for `application/fhir+json` Artifacts, subject to Holder decision, available Holder data sources, Wallet capability, local policy, and the selected item `accept[]` media types. `fhirVersions[]` does not override FHIR version information that is intrinsic to a signed SMART Health Card or another response format defined by a registered extension.

#### 5.2.6 `items[]`

`items` is the ordered list of request items. A Requester SHALL include `items` as an array. A Requester SHOULD include at least one request item. A zero-item request has no clinical content to fulfill and is expected to be closed during Appendix B and conformance work; this section does not make non-empty `items[]` a hard requirement because current active validators accept an empty array once other required top-level fields are present.

A Requester SHALL encode each member of `items` as a `SmartHealthCheckinRequestItem` as defined in §5.3. A Wallet/Responder SHALL process `items[]` as the request's Holder-review and response-accounting granularity. The order of `items[]` is the Requester's preferred display and workflow order. A Wallet/Responder MAY group, summarize, or reorder items for accessibility, safety, or local policy, but SHALL preserve item `id` values for fulfillment and status reporting.

#### 5.2.7 Prohibited requester identity metadata

A Requester SHALL NOT include self-asserted requester identity metadata in the SMART request body. Prohibited requester identity metadata includes, but is not limited to:

- requester, clinic, practice, payer, organization, staff, or facility name fields;
- logo, image, icon, brand-color, or display-brand fields;
- requester URL, website, callback URL, endpoint URL, domain, origin, package name, application id, or certificate fields;
- signed-request, reader, Verifier, trust-framework, issuer, accreditation, or legal-entity metadata; and
- pointer, relay, completion, encryption, nonce, hand-off, or wrapper metadata from any implementation-defined initiation flow.

This prohibition applies to the clinical request object itself, including the top-level object, request items, selectors, and extension members. It does not prevent presentation transports from carrying authenticated origin, reader, Verifier, or other deployment-specific information in their own envelopes.

A Wallet/Responder SHALL NOT treat any field in the SMART request body, including unknown fields, `purpose`, `items[].title`, `items[].summary`, selector values, or extension members, as authenticated requester identity unless the same fact is established by the selected presentation transport, trust processing, or local policy outside the SMART request body.

#### 5.2.8 Examples

The examples in this subsection are illustrative. Example identifiers, display text, URLs, and clinical selections are not fixed protocol values.

Example: single FHIR-resource request.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "example-patient-request",
  "purpose": "Clinic check-in",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "patient",
      "title": "Patient demographics",
      "summary": "Demographics for check-in.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

Example: mixed FHIR-resource and inline Questionnaire request.

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "example-checkin-request",
  "purpose": "Pre-visit intake",
  "fhirVersions": ["4.0.1"],
  "items": [
    {
      "id": "coverage",
      "title": "Insurance card",
      "summary": "Coverage information for billing.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
        "resourceTypes": ["Coverage"]
      },
      "accept": ["application/fhir+json"]
    },
    {
      "id": "clinical-history",
      "title": "US Core clinical resources",
      "summary": "Problems, medications, allergies, and other available US Core records.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": ["http://hl7.org/fhir/us/core"],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
        ],
        "resourceTypes": ["Patient", "MedicationRequest", "Condition", "AllergyIntolerance"]
      },
      "accept": ["application/smart-health-card", "application/fhir+json"]
    },
    {
      "id": "intake",
      "title": "Migraine check-in",
      "content": {
        "kind": "questionnaire",
        "resource": {
          "resourceType": "Questionnaire",
          "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
          "version": "1.2.3",
          "status": "active",
          "title": "Migraine Check-in",
          "item": [{ "linkId": "headache", "text": "Are you experiencing a headache today?", "type": "boolean" }]
        }
      },
      "accept": ["application/fhir+json"]
    }
  ]
}
```

### 5.3 `SmartHealthCheckinRequestItem`

A request item describes one unit of requested clinical content or action. Request items are the unit of Holder review, accepted response media-type advertisement, fulfillment references, and per-item status reporting.

A `SmartHealthCheckinRequestItem` has this shape:

```json
{
  "id": "<item-id>",
  "title": "<holder-facing title>",
  "summary": "<holder-facing explanation>",
  "required": false,
  "content": { "kind": "fhir.resources" },
  "accept": ["application/fhir+json"]
}
```

A Requester SHALL include `id`, `title`, `content`, and `accept` for every item. A Requester MAY include `summary` and `required`.

#### 5.3.1 `id` uniqueness and character set

A Requester SHALL include `id` as a non-empty string on every request item. A Requester SHALL NOT use the same item `id` more than once within a single SMART request. A Wallet/Responder SHALL reject a SMART request with a missing, non-string, empty, or duplicate item `id`.

Item ids are scoped to one SMART request. They are not global identifiers and are not patient or requester identifiers. A Wallet/Responder and Verifier SHALL use exact string equality when comparing item ids.

A Requester SHOULD use item ids that are stable within the interaction, short enough for diagnostics, and safe for use as JSON string references in responses. Newly defined item ids SHOULD consist only of ASCII letters, digits, period (`.`), underscore (`_`), tilde (`~`), and hyphen (`-`). Until Appendix B and active validators define a stricter pattern, Wallets/Responders MAY accept other non-empty string ids when they can preserve them exactly.

A Requester SHOULD NOT include patient identifiers, requester identifiers, secrets, cross-session tracking values, or clinical facts in item `id` values.

#### 5.3.2 `title`

A Requester SHALL include `title` as a non-empty Holder-facing string on every request item. `title` names the requested item, for example `"Patient demographics"`, `"Insurance card"`, or `"Intake form"`. A Requester SHALL NOT use `title` as a substitute for authenticated requester identity metadata.

A Wallet/Responder SHOULD make `title` available in Holder review when requesting consent for the item, subject to accessibility, localization, safety, and local policy.

#### 5.3.3 `summary`

A Requester MAY include `summary` as a string that gives a Holder-facing explanation of the requested content or action. A Requester SHOULD use `summary` to clarify broad selectors, profile-family requests, or questionnaire purpose when `title` alone would be ambiguous. A Requester SHALL NOT use `summary` as a substitute for authenticated requester identity metadata.

A Wallet/Responder MAY display, summarize, or suppress `summary` according to Wallet UX policy, but SHALL preserve item ids for response accounting regardless of display choices.

#### 5.3.4 `required` advisory semantics

A Requester MAY include `required` as a boolean. If `required` is omitted, a Wallet/Responder SHALL interpret it as `false` for display and decision-support purposes. When `required` is `true`, the Requester is indicating that the item is important for the Requester's downstream workflow.

A Requester SHALL treat `required` as advisory workflow context only. `required: true` is not Holder consent, not legal authorization, not a command to the Wallet, and not a guarantee that responsive content will be returned.

A Wallet/Responder MAY display or otherwise consider `required` during Holder review. A Wallet/Responder SHALL NOT treat `required: true` as authorization to bypass Holder control, Wallet policy, applicable law, or consent UX requirements.

A Wallet/Responder MAY return declined, unavailable, unsupported, partial, or error status for an item whose `required` value is `true`. The Requester decides outside this protocol how its downstream workflow proceeds when required content is missing.

#### 5.3.5 `accept[]` ordered preference

A Requester SHALL include `accept` as a non-empty array of media type strings on every request item. A Requester SHALL order `accept[]` from most preferred to least preferred for that item. There is no separate preference field. A Requester SHALL NOT include a media type in `accept[]` unless the Requester is prepared to process a conforming Artifact of that media type for the item.

A Wallet/Responder MAY choose any media type listed in `accept[]` for the item, considering Holder decision, available Holder data sources, Wallet capability, FHIR version support, local policy, and whether the resulting Artifact can accurately fulfill the item. A Wallet/Responder SHOULD choose the earliest acceptable media type it can produce when multiple choices are otherwise equivalent.

A Wallet/Responder SHALL NOT return an Artifact as fulfilling an item unless the Artifact's `mediaType` is listed in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. If no listed media type can be produced for an item, a Wallet/Responder SHALL report the item outcome using the response status mechanism defined in §6 rather than returning an Artifact with an unaccepted media type.

#### 5.3.6 `content` selector

A Requester SHALL include `content` as a selector object on every request item. A Requester SHALL include `content.kind` as a string identifying the selector kind. The `kind` value determines the remaining selector shape and semantics.

Version 1.0 defines the selector kinds `fhir.resources` and `questionnaire`. Registered extensions can define additional selector kinds as described in §5.4.3.

A Wallet/Responder that does not understand `content.kind` SHALL NOT infer the selector's semantics from display text or unrelated fields. It SHALL treat the item as unsupported or reject the request according to the selected flow and §6 status rules.

### 5.4 Content selectors

A content selector describes what clinical content or action would satisfy a request item. Selectors are not a general FHIR query language, clinical decision support expression, patient-matching rule, authorization policy, or requester identity channel.

A Requester SHALL use a selector shape defined by this section or by a registered extension selector. A Wallet/Responder SHALL evaluate selector semantics independently for each request item, while allowing one response Artifact to fulfill multiple items where §6 permits.

#### 5.4.1 `fhir.resources`

A `fhir.resources` selector requests patient-specific FHIR resources. It has this shape:

```json
{
  "kind": "fhir.resources",
  "profiles": ["<StructureDefinition canonical>"],
  "profilesFrom": ["<profile-family canonical>"],
  "resourceTypes": ["<FHIR resourceType>"]
}
```

A Requester SHALL set `kind` to `"fhir.resources"` for this selector. A Requester MAY include `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, any combination of those fields, or none of them. If `profiles`, `profilesFrom`, or `resourceTypes` is present, a Requester SHALL encode that member as an array of strings.

##### 5.4.1.1 `profiles[]`

`profiles[]` identifies exact FHIR `StructureDefinition` profile canonical URLs acceptable for the item.

A Requester MAY include `profiles` as an array of one or more FHIR canonical strings. A Requester SHOULD use canonical `StructureDefinition` URLs in `profiles[]` values. A `profiles[]` value MAY include a `|version` suffix as defined in §5.5 when the Requester needs an exact profile version.

A Wallet/Responder MAY treat a resource as matching `profiles[]` when the resource declares one of the listed profile canonicals in `meta.profile` or when the Wallet/Responder has equivalent local knowledge or trusted conformance evidence that the resource conforms to the listed profile. This specification does not require a Wallet/Responder to perform full FHIR profile validation during request matching.

##### 5.4.1.2 `profilesFrom[]`

`profilesFrom[]` identifies one or more profile families by canonical URL. A profile family can be a FHIR publication, implementation guide, profile collection, or other published family of FHIR profiles.

A Requester MAY include `profilesFrom` as a non-empty array of canonical profile-family URL strings. A Requester SHALL encode `profilesFrom` as an array. A Requester SHALL NOT encode `profilesFrom` as a string, object, package descriptor, implementation-guide object, package id, package version, npm package name, registry alias, local topic vocabulary, or URN unless a future version or registered extension explicitly defines such a value space.

A Wallet/Responder SHALL reject a `fhir.resources` selector whose `profilesFrom` member is present but is not a non-empty array of strings. A Wallet/Responder MAY additionally reject `profilesFrom[]` values that are not canonical URLs under its validation policy.

A `profilesFrom[]` value identifies a family from which acceptable resource profiles can be drawn. It does not require the SMART request to enumerate every profile in that family. A Wallet/Responder MAY use local knowledge, FHIR package metadata available outside the request, implementation-guide definitions, configured profile-family mappings, or other deployment knowledge to determine which exact profiles are members of a `profilesFrom[]` family.

##### 5.4.1.3 `resourceTypes[]`

`resourceTypes[]` narrows a `fhir.resources` selector by official FHIR `resourceType` names, such as `"Patient"`, `"Coverage"`, `"Condition"`, `"MedicationRequest"`, `"Observation"`, or `"AllergyIntolerance"`.

A Requester MAY include `resourceTypes` as an array of one or more strings. A Requester SHALL use official FHIR resource type names appropriate to the FHIR versions it can consume. A Requester SHALL NOT use local topic labels, display strings, or implementation-specific category names such as `"care-plans"`, `"insurance"`, or `"clinical-history"` in `resourceTypes[]` unless those strings are official FHIR resource type names.

When `resourceTypes[]` is present with `profiles[]` or `profilesFrom[]`, a Wallet/Responder SHALL treat `resourceTypes[]` as an additional resource-type constraint on the profile-selected set. A resource is responsive only if it matches at least one applicable profile selector under §5.4.1.4 and its FHIR `resourceType` is listed in `resourceTypes[]`.

When `resourceTypes[]` is present without `profiles[]` and without `profilesFrom[]`, a Wallet/Responder SHALL treat the selector as requesting patient-specific FHIR resources whose `resourceType` is listed in `resourceTypes[]`, subject to Holder decision, accepted media types, FHIR version compatibility, available data, and local policy.

##### 5.4.1.4 Additivity rule when both `profiles[]` and `profilesFrom[]` are present

`profiles[]` and `profilesFrom[]` are additive profile selectors. When both fields are present in the same `fhir.resources` selector, a Wallet/Responder SHALL treat a resource as satisfying the profile-selector portion of the item if the resource matches any exact profile in `profiles[]` or any profile belonging to any profile family identified by `profilesFrom[]`, subject to `resourceTypes[]` when present and the rest of the item definition.

A Requester SHALL NOT rely on `profiles[]` to narrow a broader `profilesFrom[]` request. A Wallet/Responder SHALL NOT interpret `profiles[]` as limiting, filtering, enumerating, or narrowing the profiles available through `profilesFrom[]`.

This additivity rule applies only to `profiles[]` and `profilesFrom[]`. `resourceTypes[]`, when present, is the separate resource-type constraint defined in §5.4.1.3.

##### 5.4.1.5 No-selector default

If `content.kind` is `"fhir.resources"` and `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` are all omitted, the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision.

A Requester SHOULD avoid the no-selector default unless the workflow can safely consume broad patient-specific FHIR content and the item display text clearly explains the breadth of the request. A Wallet/Responder MAY satisfy a no-selector item with any patient-specific FHIR resources compatible with the item's `accept[]` media types. A Wallet/Responder is not required to disclose all available resources and MAY fulfill a no-selector item partially according to §6.

##### 5.4.1.6 Examples

The examples in this subsection are illustrative.

Example: exact CARIN-style Coverage profile.

```json
{
  "kind": "fhir.resources",
  "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
  "resourceTypes": ["Coverage"]
}
```

Example: US Core profile family.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

Example: additive exact profiles plus a profile family, with resource-type filtering.

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"
  ],
  "resourceTypes": ["Patient", "MedicationRequest", "Condition"]
}
```

In the last example, `profiles[]` and `profilesFrom[]` are additive profile selectors. The `resourceTypes[]` values filter the resulting profile-selected set to the listed FHIR resource types.

#### 5.4.2 `questionnaire`

A `questionnaire` selector requests completion of a FHIR Questionnaire and return of an appropriate response Artifact. For `application/fhir+json`, the expected clinical response content is a FHIR `QuestionnaireResponse`; §6 defines response Artifact shapes and response validation.

A `questionnaire` selector has this shape:

```json
{
  "kind": "questionnaire",
  "canonical": "<Questionnaire canonical>",
  "resource": { "resourceType": "Questionnaire" }
}
```

A Requester SHALL set `content.kind` to `"questionnaire"` for this selector. A Requester SHALL include `canonical`, `resource`, or both as direct members of the selector. A Requester SHALL NOT include a nested `questionnaire` member in the selector.

If `canonical` is present, the Requester SHALL encode it as a non-empty FHIR canonical string. The canonical MAY include a `|version` suffix as defined in §5.5.

If `resource` is present, the Requester SHALL encode it as an inline FHIR `Questionnaire` resource object whose `resourceType` is `"Questionnaire"`.

A Wallet/Responder SHALL reject or report unsupported for a `questionnaire` selector that has neither `canonical` nor `resource`, that has a `canonical` value that is not a non-empty string, that has a `resource` value that is not a Questionnaire resource object, or that uses a legacy nested `questionnaire` member. The legacy forms of a bare canonical string under `questionnaire`, a bare inline Questionnaire under `questionnaire`, and a wrapper object `questionnaire: { canonical, resource }` are not valid SMART Health Check-in 1.0 selector shapes.

##### 5.4.2.1 By canonical

A Requester MAY provide `canonical` as the Questionnaire identity to be resolved. The canonical MAY include a `|version` suffix as defined in §5.5.

Example:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
}
```

A Wallet/Responder MAY resolve the canonical using a configured canonical resolver, FHIR search against a configured endpoint, cached content, Holder data source, or other local mechanism that satisfies §5.5. Direct HTTP dereference of a Questionnaire canonical is permitted only for unversioned canonicals under §5.5.

If the Wallet/Responder cannot resolve, render, or otherwise use the referenced Questionnaire, it SHALL report the item outcome using the response status mechanism in §6 rather than fabricating a Questionnaire.

##### 5.4.2.2 Inline `Questionnaire`

A Requester MAY provide `resource` as an inline FHIR `Questionnaire` resource object. A Requester SHALL ensure that an inline resource used in this form has `resourceType` equal to `"Questionnaire"`.

A Wallet/Responder SHALL reject or report unsupported for an inline questionnaire resource whose `resourceType` is absent or is not `"Questionnaire"`. A Wallet/Responder MAY render or process an inline Questionnaire without fetching it from a remote endpoint, subject to Wallet policy, safety checks, language support, and Questionnaire feature support.

Example:

```json
{
  "kind": "questionnaire",
  "resource": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "title": "Migraine Check-in",
    "item": [{ "linkId": "headache", "text": "Are you experiencing a headache today?", "type": "boolean" }]
  }
}
```

##### 5.4.2.3 Combined canonical and resource

A Requester MAY provide both `canonical` and `resource` as direct members of the `questionnaire` selector. The combined form lets a Wallet/Responder render the inline resource without network retrieval while preserving a stable canonical identity for response construction and receiver interpretation.

Example:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3",
  "resource": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "title": "Migraine Check-in",
    "item": []
  }
}
```

##### 5.4.2.4 Wallet behavior when both forms supplied disagree

When both `canonical` and `resource` are supplied, the canonical is the Requester's explicit identifier for the Questionnaire, and the inline resource is the Questionnaire body the Requester is asking the Wallet/Responder to render or use.

A Requester SHOULD ensure that `canonical`, `resource.url`, and `resource.version` are consistent when these fields are present. At minimum, when `resource.url` is present, its canonical URL should match the `url` parsed from `canonical` under §5.5; when both a canonical `|version` suffix and `resource.version` are present, those values should describe the same intended Questionnaire version.

A Wallet/Responder SHALL NOT silently merge conflicting Questionnaire definitions from the inline resource and a fetched canonical resource. A Wallet/Responder SHALL NOT silently rewrite the Requester's canonical to match a conflicting inline resource.

If a Wallet/Responder detects a material disagreement between the supplied canonical and inline resource, the Wallet/Responder SHOULD treat the item as unsupported or error according to §6 rather than collecting answers against an ambiguous Questionnaire. A material disagreement includes a different canonical URL after applying §5.5 parsing and comparison rules, a different explicit version, or conflicting item structure that would change Holder answers.

##### 5.4.2.5 Example

The following inline migraine-intake request item is illustrative and does not define required clinical questions.

```json
{
  "id": "intake",
  "title": "Migraine check-in",
  "summary": "Brief intake questions before today's visit.",
  "content": {
    "kind": "questionnaire",
    "resource": {
      "resourceType": "Questionnaire",
      "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
      "version": "1.2.3",
      "status": "active",
      "title": "Migraine Check-in",
      "item": [
        { "linkId": "wellbeing", "text": "How have you been feeling since your last visit?", "type": "text" },
        { "linkId": "headache", "text": "Are you experiencing a headache today?", "type": "boolean" }
      ]
    }
  },
  "accept": ["application/fhir+json"]
}
```

#### 5.4.3 Extension selectors and registration rules

An extension selector is a selector whose `content.kind` is not one of the core selector kinds defined in §5.4.

An extension registrant SHALL define all of the following for each extension selector kind: the exact `content.kind` string; JSON shape and required and optional members; clinical meaning; content-satisfaction rules; interaction with `accept[]`, `fhirVersions[]`, FHIR canonicals, item status, and Artifact fulfillment; unsupported, unavailable, partial, and error behavior under §6; unknown-member handling; privacy and security considerations; and at least one example request item.

An extension registrant SHALL NOT define an extension selector that redefines the semantics of `type`, `version`, `id`, `purpose`, `fhirVersions[]`, `items[]`, item `id`, item `required`, item `accept[]`, `fhir.resources`, `questionnaire`, or any other core field or selector kind.

An extension registrant SHALL NOT define an extension selector that permits requester identity metadata in the SMART request body unless a future version of this specification defines an explicit trust model for doing so.

An extension registrant SHOULD choose a collision-resistant selector kind name, such as a reverse-DNS name or URI-like name, until §13 defines the formal selector-kind registry syntax.

A Requester SHALL NOT use an unregistered or privately defined extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support an extension selector kind SHALL NOT guess its semantics or satisfy it from display text alone. It SHALL either reject the request as unsupported or report the affected item as unsupported according to §6, depending on where in the selected flow the unsupported selector is discovered.

### 5.5 Canonical `|version` handling

FHIR canonicals can append a version suffix using `canonical|version`. The suffix is part of some semantic claims, but it is not a literal HTTP URL path or query string. Implementations need consistent handling so versioned canonicals do not break lookup while exact version claims are preserved where they matter.

A Requester MAY include `|version` suffixes in fields where this section permits FHIR canonicals. A Requester SHOULD NOT include a `|version` suffix in `profilesFrom[]` unless the Requester intends to identify a versioned profile family and expects the Wallet/Responder to understand that convention.

#### 5.5.1 Parsing and preservation

A Requester, Wallet/Responder, or Verifier that processes a FHIR canonical SHALL parse the canonical structurally into a non-empty `url` and an optional `version`. The `url` is the substring before the first `|`, or the whole string when no `|` is present. The `version`, when present, is the substring after the first `|`; any further `|` characters are part of the opaque version string.

Implementations SHALL preserve the original wire canonical string exactly for echoing, logging, response construction, test fixtures, returned `Resource.meta.profile` values, and generated `QuestionnaireResponse.questionnaire` values when that canonical is the Questionnaire identity being answered. Internal parsing for resolution, routing, grouping, or comparison SHALL NOT by itself rewrite the canonical that is carried or emitted.

#### 5.5.2 Resolution

A Wallet/Responder or Verifier resolving a canonical reference to a FHIR resource SHALL use a configured canonical resolver, package cache, terminology service, implementation-guide resolver, or FHIR search against a configured FHIR endpoint when such a mechanism is available. The resolver SHALL consume the parsed `(url, version)` pair, or `url` alone when no version is present, and return a matching resource.

When resolving against a FHIR endpoint, the implementation SHALL use FHIR canonical search semantics for the expected resource type: `GET [base]/{ResourceType}?url={url}&version={version}` for a versioned canonical, or `GET [base]/{ResourceType}?url={url}` for an unversioned canonical. The implementation SHALL select a single resource from the search result whose `(url, version)` matches the request and SHALL fail resolution if no such resource is present.

Direct HTTP dereference of the parsed `url` is permitted only for an unversioned canonical, only when the recipient is willing to accept the version the publisher serves at that URL, and only if the returned resource passes the verification rules below. A Wallet/Responder or Verifier SHALL NOT satisfy a versioned canonical by stripping `|version` and directly dereferencing the bare URL.

#### 5.5.3 Post-resolution verification

After resolving a canonical to a FHIR resource, the implementation SHALL verify that the resolved resource has the expected `resourceType`, has `url` equal to the parsed request `url`, and, when the request canonical was versioned, has `version` equal to the parsed request `version`.

If any of these checks fail, the implementation SHALL treat the affected request item or validation step as unsupported or error under §6 rather than proceeding with a mismatched resource.

#### 5.5.4 Profile matching and local classification

When a `profiles[]` request value includes `|version`, a Wallet/Responder SHALL NOT report `fulfilled` for a resource unless the resource's `meta.profile` includes the same versioned canonical or the Wallet/Responder has equivalent local conformance evidence for that exact profile version. A Verifier performing exact conformance checks SHALL apply the same versioned-to-versioned comparison.

When a `profiles[]` request value has no `|version`, a Wallet/Responder or Verifier MAY match resources known to conform to any supported version of the requested base canonical, subject to the evidence and validation rules applicable to the Artifact.

Wallet-side routing, broad content-kind classification, profile-family membership for `profilesFrom[]`, de-duplication, and Holder-display grouping MAY strip or ignore `|version` only for those local classification or grouping operations. Such stripping SHALL NOT affect resolution, exact-version profile matching, response construction, returned `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, or validation where exact version semantics matter.

#### 5.5.5 Decision matrix

A Requester, Wallet/Responder, or Verifier performing an operation in the following table SHALL apply the handling rule for that operation.

| Operation | Conformance target | Handling of `|version` |
| --- | --- | --- |
| Parse, carry, sign, encrypt, compare transport bytes, log, include in test fixtures, echo, or preserve in response fields | Requester, Wallet/Responder, Verifier | Preserve the canonical string exactly as it appeared in the SMART request or response, subject to privacy minimization for retained records. |
| Resolve a canonical Questionnaire or other FHIR conformance resource | Wallet/Responder, Verifier | Parse to `(url, version)`, use a configured canonical resolver or FHIR canonical search when available, permit direct HTTP dereference only for unversioned canonicals, and verify the resolved resource's `(url, version)` and `resourceType`. |
| Wallet-side item routing or broad content-kind classification | Wallet/Responder | Strip or ignore `|version` only for routing decisions so local routing to questionnaire or other handlers does not depend on version suffix syntax. |
| Profile-family membership for `profilesFrom[]` | Wallet/Responder | Strip or ignore `|version` before profile-family lookup unless a future profile-family definition explicitly defines version-sensitive membership. |
| Exact `profiles[]` matching when the request value has no `|version` | Wallet/Responder, Verifier | Match resources known to conform to a supported version of the requested base canonical, subject to the evidence and validation rules applicable to the Artifact. |
| Exact `profiles[]` matching when the request value includes `|version` | Wallet/Responder, Verifier | Require exact-version evidence; compare the versioned request canonical to versioned `meta.profile` values or equivalent local conformance evidence. |
| De-duplication or grouping for Holder display | Wallet/Responder | MAY group canonicals that differ only by `|version`, but SHALL preserve exact requested strings where exact version matters to Holder review, response construction, diagnostics, or validation. |
| `QuestionnaireResponse.questionnaire` generated for a questionnaire item | Wallet/Responder | Preserve the request canonical, including `|version`, when that canonical is the Questionnaire identity being answered and the information is known. |
| Returned FHIR `Resource.meta.profile` | Wallet/Responder | SHALL NOT remove `|version` suffixes from returned `meta.profile` values merely because request matching stripped versions for routing, family lookup, or grouping. |
| Verifier-side exact conformance checks against returned resources | Verifier | Compare at the same normalization level on both sides: versioned-to-versioned when exact version was requested and evidence is present, or unversioned-to-base-canonical when the request was unversioned. |

A Wallet/Responder SHALL NOT rewrite a requested canonical in a way that changes the semantic Questionnaire or profile being requested. A Wallet/Responder SHALL NOT strip a `|version` suffix from returned clinical content fields where the suffix communicates the profile or Questionnaire version actually used.

Appendix H should align FHIR R4/R4B/R5 canonical resolution, `meta.profile`, Bundles, and `QuestionnaireResponse.questionnaire` guidance with these rules.

### 5.6 Accepted media types and ordering semantics

Each request item has its own `accept[]` list. `accept[]` declares the response Artifact media types the Requester can consume for that item and orders them by Requester preference.

A Requester SHALL include a non-empty `accept[]` array on every request item. A Requester SHALL encode each value as a media type string. A Requester SHALL order `accept[]` from most preferred to least preferred and SHALL NOT rely on any separate preference field.

A Requester SHALL list only media types it is prepared to parse, validate, and route for the corresponding item.

A Wallet/Responder MAY return any Artifact media type listed in the fulfilled item's `accept[]`, subject to Holder decision, available Holder data sources, Wallet capability, FHIR version support, local policy, and content-source constraints. A Wallet/Responder SHOULD choose the earliest listed media type it can produce when multiple response forms are otherwise equivalent for the item.

A Wallet/Responder SHALL NOT return a media type for a request item unless that media type appears in that item's `accept[]`, except where a registered compatibility rule says that the returned media type satisfies an accepted type.

A Verifier SHALL treat an Artifact as invalid for a fulfilled item if the Artifact `mediaType` is not present in that item's `accept[]`, except where a registered compatibility rule says that the returned media type satisfies an accepted type. If one Artifact fulfills multiple request items, its `mediaType` SHALL be acceptable for every item it claims to fulfill under the preceding rule.

Version 1.0 defines the following core media types for request `accept[]` values:

| Media type | Meaning in `accept[]` | Response-model dependency |
| --- | --- | --- |
| `application/fhir+json` | The Requester can consume raw FHIR JSON for this item. For questionnaire items, this means a FHIR `QuestionnaireResponse`; for FHIR resource items, this means a FHIR Resource or Bundle as defined in §6 and Appendix H. | A corresponding response Artifact uses `mediaType: "application/fhir+json"` and declares `fhirVersion` under §6. |
| `application/smart-health-card` | The Requester can consume SMART Health Card file JSON for this item. | A corresponding response Artifact uses `mediaType: "application/smart-health-card"`; the signed health-card content carries its own FHIR-version semantics under §6. |

Extension media types MAY be used when defined by a registered extension or deployment agreement. An extension media-type registrant SHALL define the media type string, Artifact shape, processing rules, validation rules, security considerations, privacy considerations, FHIR-version handling if any, and any compatibility with core media types.

Example of ordered preference:

```text
"accept": [
  "application/smart-health-card",
  "application/fhir+json"
]
```

This example means that the Requester prefers a SMART Health Card when the Wallet/Responder can provide one, but raw FHIR JSON is also acceptable for the item. It does not require the Wallet/Responder to create a SMART Health Card when none is available, and it does not require disclosure when the Holder declines.

---

## 6. Clinical content — response

This section defines the SMART response, the transport-neutral clinical JSON object by which a Wallet/Responder answers a SMART request after Holder review, Wallet policy, and available Holder data sources have been applied. The same SMART response semantics apply when the object is returned by the same-device presentation flow or carried by a future binding.

Presentation transports can wrap, encrypt, authenticate, retain, or relay a SMART response, but they do not change the meaning of `requestId`, `artifacts[]`, `mediaType`, `fulfills[]`, or `requestStatus[]`. A SMART response is distinct from mdoc envelopes, Digital Credentials API response objects, implementation-defined hand-off records, completion acknowledgments, and downstream EHR ingestion records.

### 6.1 `SmartHealthCheckinResponse`

A `SmartHealthCheckinResponse` has this top-level shape:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "<request-id>",
  "artifacts": [],
  "requestStatus": []
}
```

A Wallet/Responder SHALL include `type`, `version`, `requestId`, `artifacts`, and `requestStatus`.

#### 6.1.1 `type`

A Wallet/Responder SHALL set `type` to the exact string `"smart-health-checkin-response"`. A Verifier SHALL reject a SMART response whose `type` member is absent or is not exactly `"smart-health-checkin-response"`.

#### 6.1.2 `version`

A Wallet/Responder SHALL set `version` to the exact string `"1"` for responses conforming to SMART Health Check-in 1.0. The `version` member is the SMART response-model version. It is not a FHIR version and not a presentation-transport version.

A Verifier SHALL reject a SMART response whose `version` member is absent or is not exactly `"1"`, unless a future version-compatibility rule explicitly defines compatible handling for another value.

#### 6.1.3 `requestId`

A Wallet/Responder SHALL set `requestId` to the exact `id` value from the SMART request being answered. A Verifier SHALL compare `requestId` to the original request `id` using exact string equality and SHALL reject a SMART response when the values differ.

`requestId` is a correlation value for the clinical exchange. It is not a patient identifier, requester identifier, presentation-session identifier, freshness proof, or clinical fact. Presentation bindings can add separate session freshness and replay controls; those controls do not replace the `requestId` binding required here.

#### 6.1.4 `artifacts[]`

`artifacts` is the list of clinical Artifacts returned by the Wallet/Responder. A Wallet/Responder SHALL encode `artifacts` as an array. The array MAY be empty when no request item produces a returned Artifact, provided `requestStatus[]` still accounts for every request item as defined in §6.4.

A Wallet/Responder SHALL encode each member of `artifacts[]` as an Artifact following §6.2 and the applicable concrete Artifact rules in §6.3.

The order of `artifacts[]` has no clinical fulfillment meaning unless a registered Artifact media type defines order-sensitive semantics inside its own payload. Requesters and receivers use Artifact `id`, `mediaType`, `fulfills[]`, status entries, and payload contents rather than array position to determine response meaning.

#### 6.1.5 `requestStatus[]`

`requestStatus` is the per-request-item outcome list. A Wallet/Responder SHALL encode `requestStatus` as an array of status objects following §6.4. The `requestStatus[]` array is required even when every item is fulfilled, because it records item-level outcomes and preserves accounting for declined, unavailable, unsupported, partial, and error outcomes.

### 6.2 Artifact common shape

An Artifact is a response object that contains clinical content or references clinical content returned by a Wallet/Responder. Every Artifact has this common shape, with media-type-specific fields as applicable:

```json
{
  "id": "<artifact-id>",
  "mediaType": "<media-type>",
  "fulfills": ["<request-item-id>"],
  "<media-type-specific-payload>": {}
}
```

A Wallet/Responder SHALL include `id`, `mediaType`, and `fulfills` on every Artifact. A Wallet/Responder SHALL also include the payload fields defined for the Artifact's media type.

#### 6.2.1 `id` uniqueness within response

A Wallet/Responder SHALL include `id` as a non-empty string on every Artifact. Artifact ids are scoped to a single SMART response and are stable only within that response.

A Wallet/Responder SHALL NOT use the same Artifact `id` more than once within a single SMART response. A Verifier SHALL reject a SMART response with a missing, non-string, empty, or duplicate Artifact `id`.

A Requester or receiver SHALL NOT treat Artifact ids as patient identifiers, requester identifiers, global document identifiers, or clinical provenance identifiers unless that meaning is separately established by the Artifact payload or deployment policy.

#### 6.2.2 `mediaType`

A Wallet/Responder SHALL include `mediaType` as a non-empty media type string on every Artifact. `mediaType` declares the clinical response form of the Artifact. Artifacts use `mediaType`; they do not use a separate Artifact-level protocol `type` discriminator.

Version 1.0 defines these core Artifact media types:

| Media type | Artifact class | Summary |
| --- | --- | --- |
| `application/smart-health-card` | SMART Health Card Artifact | `value` is a SMART Health Card file-style JSON object with `verifiableCredential[]`. |
| `application/fhir+json` | Raw FHIR JSON Artifact | `value` is a raw FHIR Resource or Bundle, and the Artifact declares `fhirVersion`. |

The version 1.0 core Artifact union is closed over these two core variants. A version 1.0 Verifier SHALL NOT treat an unrecognized `mediaType` as a generic Artifact merely because it carries a field named `value`, `url`, `data`, or another plausible carrier.

The Artifact type list is extensible by future SMART Health Check-in versions and by registered or profiled extension Artifact media types. Each extension Artifact type SHALL be a branded variant that pins a specific `mediaType` literal or clearly bounded media-type pattern and defines its own typed payload fields. The base protocol does not define generic carrier semantics for unknown media types.

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics. A Verifier SHALL enforce the same check under §6.6.

#### 6.2.3 `fulfills[]`

A Wallet/Responder SHALL include `fulfills` as a non-empty array of request item ids on every Artifact. Each value in `fulfills[]` SHALL exactly equal the `id` of an item in the original SMART request.

A Wallet/Responder MAY list more than one request item id in `fulfills[]` when one Artifact satisfies multiple items. If the same Artifact fulfills multiple items, the Artifact's `mediaType` SHALL be acceptable for every item listed in `fulfills[]`.

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not resolve to exactly one request item in the original SMART request.

#### 6.2.4 Payload fields are media-type-specific

An Artifact's payload-bearing fields are defined by its branded Artifact variant.

For the two core media types defined in this section, a Wallet/Responder SHALL use `value` as the payload field. A SMART Health Card Artifact SHALL use `value.verifiableCredential[]` as defined in §6.3.1. A raw FHIR JSON Artifact SHALL use `value` as the FHIR Resource or Bundle as defined in §6.3.2.

Registered or profiled extension Artifact types MAY define `value`, a structured locator, an encoded payload field, or any other typed fields appropriate for that media type. Such fields have only the semantics assigned by the registered or profiled extension Artifact definition. The protocol does not define a generic `value` / `url` / `data` catch-all, and it does not define a rule that allows multiple generic carrier keys to coexist with media-type-defined merge semantics.

A Verifier or receiver SHALL NOT infer dereferencing, decoding, signature, freshness, integrity, retention, or expiration rules from a field name alone. Those rules come from a recognized core Artifact definition, a supported registered or profiled extension Artifact definition, a transport binding, or local policy.

### 6.3 Concrete artifact shapes

#### 6.3.1 SMART Health Card artifact (`application/smart-health-card`)

A SMART Health Card Artifact represents one or more SMART Health Card Verifiable Credential JWS strings in the same JSON shape used by SMART Health Card file download.

A Wallet/Responder that returns a SMART Health Card Artifact SHALL set `mediaType` to `"application/smart-health-card"` and SHALL include `value` as a JSON object containing `verifiableCredential`.

A Wallet/Responder SHALL encode `value.verifiableCredential` as a non-empty array of strings. Each string SHALL be a SMART Health Card Verifiable Credential JWS. A Verifier or receiver that consumes this Artifact SHALL verify and process each JWS according to SMART Health Cards and local trust policy.

A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer `fhirVersion`. FHIR content and FHIR version semantics for this Artifact class are inside the signed SMART Health Card credential payloads, not in the SMART Health Check-in Artifact wrapper.

A SMART Health Card Artifact SHALL NOT use an Artifact-level profile summary field to claim conformance to request selectors. A Verifier validates clinical suitability by inspecting signed payload content, including FHIR resources and their `meta.profile` values where present, and by applying the original request selectors and local policy.

Example: SMART Health Card Artifact.

```json
{
  "id": "artifact-insurance-shc",
  "mediaType": "application/smart-health-card",
  "fulfills": ["insurance-card"],
  "value": {
    "verifiableCredential": [
      "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9..."
    ]
  }
}
```

#### 6.3.2 Raw FHIR JSON artifact (`application/fhir+json`)

A raw FHIR JSON Artifact represents patient-mediated FHIR JSON content. It is not independently issuer-signed unless the payload itself contains a proof, signature, Provenance, or other evidence. Successful presentation transport proves the transaction and transport binding defined by the selected flow; it does not by itself prove the clinical provenance of unsigned raw FHIR JSON.

A Wallet/Responder that returns a raw FHIR JSON Artifact SHALL set `mediaType` to `"application/fhir+json"`, SHALL include `fhirVersion` as a non-empty FHIR release-version string, and SHALL include `value` as a FHIR JSON object.

A raw FHIR JSON Artifact `value` SHALL be one of:

1. a single FHIR Resource JSON object with `resourceType` present as a string; or
2. a FHIR Bundle JSON object with `resourceType` equal to `"Bundle"` and `entry[]` resources when the Artifact packages multiple resources.

A Wallet/Responder SHOULD use a Bundle when returning multiple FHIR resources in a single `application/fhir+json` Artifact. A Wallet/Responder MAY return a single resource directly when the Artifact contains only that resource.

A Wallet/Responder SHALL interpret all FHIR resources in one `application/fhir+json` Artifact under the Artifact's `fhirVersion`. A Wallet/Responder SHALL NOT mix resources requiring different FHIR releases within the same `application/fhir+json` Artifact. When responsive content uses different FHIR releases, the Wallet/Responder SHALL return separate `application/fhir+json` Artifacts, each with its own `fhirVersion`, or report the affected item as partial, unavailable, unsupported, or error according to §6.4.

A Wallet/Responder SHOULD choose a `fhirVersion` advertised in the request's `fhirVersions[]` when the original request included that field and the Wallet/Responder can produce responsive raw FHIR JSON in an advertised version. A Verifier SHALL reject an `application/fhir+json` Artifact whose `fhirVersion` is absent or not a non-empty string. A Verifier SHOULD treat an `application/fhir+json` Artifact whose `fhirVersion` is not acceptable for the original request or receiver as unsupported for ingestion, even if the SMART response is otherwise syntactically valid.

A raw FHIR JSON Artifact SHOULD NOT include an Artifact-level profile summary field. Wallets/Responders SHALL preserve FHIR `meta.profile` strings in the returned resource or in `Bundle.entry[].resource.meta.profile` where known, including any `|version` suffixes preserved under §5.5. Wallets/Responders SHALL NOT strip or normalize version suffixes from source `meta.profile` strings when constructing a raw FHIR JSON Artifact. Verifiers and receivers SHOULD inspect the FHIR payload itself, especially `meta.profile`, rather than relying on a wrapper-level profile summary.

Example: raw FHIR JSON Bundle Artifact.

```json
{
  "id": "artifact-us-core-bundle",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["us-core-records"],
  "value": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      {
        "resource": {
          "resourceType": "Patient",
          "id": "patient-1",
          "meta": {
            "profile": [
              "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
            ]
          }
        }
      }
    ]
  }
}
```

#### 6.3.3 Extensible Artifact variants

Future SMART Health Check-in versions and registered or profiled extension Artifact media types can define additional Artifact variants beyond the two version 1.0 core variants in §6.3.1 and §6.3.2.

A Wallet/Responder MAY return an extension Artifact only when the Artifact `mediaType` is accepted by every request item listed in `fulfills[]`, subject to any registered compatibility rule, and when the Wallet/Responder can construct the Artifact according to a recognized extension Artifact definition. The extension Artifact SHALL include `id`, `mediaType`, `fulfills`, and the typed payload fields required by that definition.

An extension registrant SHALL define the exact media type string or bounded media-type pattern; the branded Artifact variant name; all required and optional typed payload fields; payload shape; encoding; dereferencing and integrity rules; FHIR-version handling if any; status behavior; validation rules; security considerations; privacy considerations; and compatibility, if any, with core media types.

An extension registrant SHALL NOT define only an unbounded `mediaType: string` catch-all and SHALL NOT rely on protocol-level generic `value`, `url`, or `data` carrier semantics for unknown media types. If an extension needs a URL pointer, inline JSON payload, encoded data blob, manifest, or combination of fields, those fields and their interaction rules SHALL be part of that extension Artifact's own typed definition.

An extension registrant SHALL NOT define an Artifact media type that redefines the semantics of `type`, `version`, `requestId`, `artifacts[]`, `requestStatus[]`, `id`, `mediaType`, or `fulfills[]`.

If an extension Artifact contains raw FHIR content, its media type or extension profile SHALL define whether an outer `fhirVersion` is required and how it is validated. If no such rule exists, a Verifier SHALL NOT assume the Artifact has the same FHIR-version semantics as `application/fhir+json`.

#### 6.3.4 Examples

The examples in this subsection are illustrative. They do not define required clinical content, required profile selections, required Holder decisions, or fixed identifiers.

Example: response with a SMART Health Card Artifact, a raw FHIR JSON Artifact, and item-level status.

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req_123",
  "artifacts": [
    {
      "id": "artifact-insurance-shc",
      "mediaType": "application/smart-health-card",
      "fulfills": ["insurance-card"],
      "value": {
        "verifiableCredential": [
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9..."
        ]
      }
    },
    {
      "id": "artifact-us-core-bundle",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": ["us-core-records"],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": []
      }
    }
  ],
  "requestStatus": [
    { "item": "insurance-card", "status": "fulfilled" },
    {
      "item": "us-core-records",
      "status": "partial",
      "message": "Shared available matching US Core resources."
    }
  ]
}
```

Example: extension Artifact with a typed document locator. This example is not a core media type and does not define a registered extension.

```json
{
  "id": "artifact-extension-document",
  "mediaType": "application/example-clinical-document+json",
  "fulfills": ["document-request"],
  "document": {
    "url": "https://example.invalid/checkin/artifacts/artifact-extension-document",
    "integrity": "sha256-..."
  }
}
```

The extension example's `document` field shape and dereferencing, authorization, integrity, retention, and expiration semantics would need to be defined by the extension media-type registration before interoperable use.

### 6.4 Status reporting

`requestStatus[]` reports the Wallet/Responder's outcome for every request item. It accounts for Holder decisions, Wallet capability, available Holder data sources, content selection, media-type support, and errors. Status is per request item, not per Artifact.

Each status entry has this shape:

```json
{
  "item": "<request-item-id>",
  "status": "fulfilled",
  "message": "<optional explanation>"
}
```

#### 6.4.1 `requestStatus[]` covers every request item exactly once

A Wallet/Responder SHALL include exactly one status entry for every item in the original SMART request. A Wallet/Responder SHALL set each `requestStatus[].item` to the exact `id` of one request item. A Wallet/Responder SHALL NOT include duplicate status entries for the same request item and SHALL NOT include a status entry for an item id that is not present in the original request.

A Verifier SHALL reject a SMART response unless `requestStatus[]` covers every request item exactly once and contains no unknown item id.

If the original SMART request contains zero items, a conforming Wallet/Responder still SHALL include `requestStatus` as an array. Appendix B and conformance closure are expected to decide whether zero-item requests become prohibited; §5.2.6 currently makes non-empty `items[]` a SHOULD rather than a hard requirement.

#### 6.4.2 Status code registry

A Wallet/Responder SHALL set `requestStatus[].status` to one of the following version 1.0 status codes unless a future registered status-code extension is explicitly supported by the receiving Verifier.

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without a Holder refusal being the relevant cause. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use `unsupported`, not `unavailable`, when it cannot process the request item because the selector kind, selector shape, requested media type, FHIR version, or Questionnaire definition is not supported. A Wallet/Responder SHALL use `unavailable`, not `unsupported`, when it understands the item but lacks matching shareable content.

A Wallet/Responder SHOULD use `unsupported` for a material Questionnaire canonical/resource disagreement detected before answers are collected or response construction begins. A Wallet/Responder SHOULD use `error` for an operational failure that occurs while rendering, collecting, converting, or constructing a response for a Questionnaire that the Wallet/Responder otherwise understood.

A Wallet/Responder SHALL use `declined` when the relevant reason for non-fulfillment is the Holder's decision not to share or complete the item. A Wallet/Responder MAY also use `declined` when local Wallet policy implements Holder preferences that prohibit disclosure for the item.

A Wallet/Responder SHALL use `partial` when it returns responsive content but does not claim complete satisfaction, including when only a subset of matching FHIR resources is shared for a broad selector or when Holder decisions or Wallet policy permit only a subset of available content.

A Wallet/Responder SHALL use `fulfilled` only when it believes the item is fully satisfied. `fulfilled` is the Wallet/Responder's response-construction claim; it does not prevent a Verifier from rejecting the response during validation or a Requester from applying stricter downstream clinical policy.

A Wallet/Responder SHALL use `error` when a processing failure prevents normal outcome classification. Error status is appropriate for transient data-source failures, internal exceptions, parsing failures in Holder data after item processing begins, failed conversion to an accepted Artifact media type, or response-construction failures. A Wallet/Responder SHOULD avoid placing sensitive diagnostics in `message`.

A `fulfilled` or `partial` status SHOULD have at least one Artifact whose `fulfills[]` includes the item id unless a registered extension explicitly defines a non-Artifact fulfillment pattern. An item with `declined`, `unavailable`, or `unsupported` status normally has no fulfilling Artifact. A Verifier SHOULD flag inconsistent status-to-Artifact combinations according to local policy or stricter deployment profiles.

A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless a future status-code registry entry is explicitly supported by that Verifier.

#### 6.4.3 Optional `message`

A Wallet/Responder MAY include `message` as a string on any status object to provide a concise explanation intended for the Requester or response consumer. A Wallet/Responder SHALL NOT include secrets, access tokens, internal stack traces, unnecessary patient details, or unrelated Holder data in `message`.

A receiver MAY display, log, route, suppress, or localize `message` according to local policy, workflow needs, and privacy requirements. The machine-processable status code is `status`; receivers SHALL NOT rely on `message` to determine the normative status semantics.

### 6.5 Many-to-many fulfillment

The SMART response model is Artifact-centered and status-explicit. Artifact boundaries do not have to mirror request item boundaries.

#### 6.5.1 One artifact may fulfill many items

A Wallet/Responder MAY return one Artifact whose `fulfills[]` contains multiple request item ids when the same clinical content satisfies multiple items. For example, a FHIR Bundle that includes patient demographics and coverage resources might fulfill both a patient-demographics item and an insurance item if `application/fhir+json` is accepted by both items and the Bundle content satisfies both selectors.

#### 6.5.2 One item may be fulfilled by many artifacts

A Wallet/Responder MAY return multiple Artifacts whose `fulfills[]` contain the same request item id when several pieces of content together satisfy or partially satisfy one item. For example, a broad clinical-history item might be fulfilled by one raw FHIR JSON Bundle and one SMART Health Card if both media types are accepted for that item.

For every claimed fulfillment edge between an Artifact and an item, the Artifact `mediaType` SHALL be accepted by that item under §5.6 and §6.6. Many-to-many fulfillment does not relax media-type, FHIR-version, selector, status, or validation rules.

A Wallet/Responder SHALL still include exactly one `requestStatus[]` entry for the item, regardless of how many Artifacts fulfill it. `requestStatus[]` reports the overall item outcome; `fulfills[]` reports which Artifact payloads support that outcome.

A Verifier SHALL evaluate all Artifacts that list an item in `fulfills[]` when validating or consuming that item. A receiver MAY choose which valid Artifacts to ingest or display according to workflow and local policy, but it SHALL NOT treat the mere presence of multiple Artifacts as a protocol error.

#### 6.5.3 Example: shared QuestionnaireResponse

The following example is illustrative. It shows one FHIR `QuestionnaireResponse` Artifact that claims to fulfill both an intake item and a broader clinical-history item. This is valid only if `application/fhir+json` is accepted by both items and the returned QuestionnaireResponse is responsive to both selectors under the original request.

```json
{
  "id": "artifact-questionnaire-response",
  "mediaType": "application/fhir+json",
  "fhirVersion": "4.0.1",
  "fulfills": ["intake", "clinical-history"],
  "value": {
    "resourceType": "QuestionnaireResponse",
    "status": "completed",
    "questionnaire": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
  }
}
```

### 6.6 Cross-validation rules Verifier SHALL apply

A Verifier validates a SMART response against the original SMART request before the Requester or downstream receiver consumes returned content. Shape validation of the SMART response alone is not sufficient.

#### 6.6.1 `requestId` match

A Verifier SHALL reject a SMART response unless `SmartHealthCheckinResponse.requestId` exactly equals the original `SmartHealthCheckinRequest.id`.

#### 6.6.2 `fulfills[]` references resolve

A Verifier SHALL reject a SMART response if any Artifact `fulfills[]` value does not exactly match one `items[].id` value in the original SMART request. A Verifier SHALL reject a SMART response if an Artifact `fulfills[]` array is absent, empty, not an array of strings, or contains an unresolved item id.

#### 6.6.3 Artifact `mediaType` is recognized and in each fulfilled item's `accept[]`

For every Artifact, a Verifier SHALL verify that the Artifact `mediaType` is one of the version 1.0 core media types or a registered or profiled extension Artifact media type that the Verifier explicitly supports. A Verifier SHALL reject an Artifact whose `mediaType` is unrecognized, even if the Artifact includes a field named `value`, `url`, `data`, or another plausible carrier.

For every Artifact and every item id in that Artifact's `fulfills[]`, a Verifier SHALL verify that the Artifact `mediaType` appears in the corresponding request item's `accept[]` list, unless a registered media-type compatibility rule supported by the Verifier defines compatible substitution semantics.

If one Artifact fulfills multiple request items, the Verifier SHALL apply this check independently to every fulfilled item.

#### 6.6.4 `requestStatus` covers items uniquely

A Verifier SHALL reject a SMART response unless `requestStatus[]` contains exactly one status object for every original request item id, contains no status object for an unknown item id, and contains no duplicate `item` value.

The Verifier SHALL NOT infer that an item with no status entry is fulfilled merely because an Artifact references it. The status entry is the required per-item accounting record.

#### 6.6.5 FHIR version consistency

For every `application/fhir+json` Artifact, a Verifier SHALL confirm that `fhirVersion` is present as a non-empty string and that `value` is a FHIR JSON object with a string `resourceType`. If the original SMART request included `fhirVersions[]`, the Verifier SHOULD verify that each raw FHIR JSON Artifact's `fhirVersion` is one of the requested FHIR versions, unless local policy or a future compatibility rule permits another version.

A Verifier SHALL interpret every non-Bundle `application/fhir+json` resource under the Artifact's `fhirVersion`. For a Bundle Artifact, a Verifier SHALL interpret the Bundle and all `Bundle.entry[].resource` resources under the Artifact's `fhirVersion`. A Verifier SHALL reject or quarantine an `application/fhir+json` Bundle when it detects mixed FHIR release versions inside one Bundle.

A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer Artifact-level `fhirVersion`. For SMART Health Card Artifacts, a Verifier determines FHIR-version semantics from each signed credential payload under SMART Health Cards rather than from an outer SMART Health Check-in wrapper field.

#### 6.6.6 Bundle and `meta.profile` guidance

A Verifier SHOULD inspect returned FHIR `resourceType`, `meta.profile`, `Bundle.entry[].resource.meta.profile`, `QuestionnaireResponse.questionnaire`, and related FHIR content when validating that returned raw FHIR JSON is responsive to the original selector. Absence of `meta.profile` is not automatically a protocol error because §5 permits Wallet/Responder matching based on equivalent local knowledge or trusted conformance evidence, but a Wallet/Responder SHALL NOT report `fulfilled` for a request item that requested a versioned profile unless the returned resource's `meta.profile` includes that exact versioned canonical or the Wallet/Responder has equivalent local conformance evidence for that exact profile version. When validating a raw FHIR JSON Artifact's claimed fulfillment of a versioned profile request, a Verifier SHALL require the same exact-version evidence before accepting that fulfillment edge. Receivers that require profile evidence for ingestion MAY reject or quarantine content that lacks the evidence they need.

A Verifier SHALL preserve returned `meta.profile` strings exactly as asserted in the FHIR payload when evaluating, recording, or forwarding them. In particular, a Verifier SHALL NOT strip a `|version` suffix from a returned `meta.profile` string in order to satisfy an exact-version profile request.

For `profilesFrom[]`, a Verifier MAY need implementation-guide, profile-family, or local policy knowledge outside the SMART response to decide whether a returned profile belongs to the requested profile family. A Verifier SHOULD treat `meta.profile` as evidence to be evaluated in context, not as an Artifact-level shortcut. A Wallet/Responder SHOULD NOT include a separate profile-summary field outside the FHIR payload for core raw FHIR JSON Artifacts.

For questionnaire items returning `application/fhir+json`, a Verifier SHOULD validate that the returned resource is a `QuestionnaireResponse` and that `QuestionnaireResponse.questionnaire`, when present, preserves the requested Questionnaire canonical and `|version` according to §5.5. If the request supplied both a Questionnaire canonical and inline resource and the Wallet/Responder reported the item as `unsupported` because of material disagreement, the Verifier SHOULD treat that as a valid item outcome rather than a transport failure.

A Verifier SHOULD preserve the distinction between response validation and downstream clinical acceptance. A SMART response can be syntactically valid and correctly bound to the original SMART request while still being incomplete, declined, unsupported, unsuitable for local ingestion, or insufficient under local clinical policy.

---

## 7. Trust framework

This section defines the trust layers that apply to SMART Health Check-in 1.0 presentation and response processing. The SMART request and SMART response are transport-neutral clinical JSON objects defined in §§5-6. Trust information is supplied by the selected presentation flow, returned Artifact payloads, deployment policy, or out-of-band trust-framework decisions; it is not supplied by self-asserted requester identity fields in the clinical request body.

The trust layers in this section are distinct:

- **Origin trust** identifies the web origin or privileged caller context from which a same-device Wallet invocation was initiated.
- **Reader / Verifier trust** authenticates the presentation requester when signed reader authentication is present and accepted by Wallet policy.
- **Issuer / device-attestation trust** evaluates mdoc issuer evidence, MSO trust, disclosed-element integrity, and device-key proof for the presentation container.
- **Clinical-source trust** evaluates provenance, signatures, or chain-of-custody evidence for the returned clinical content itself.
- **Out-of-band deployment policy** selects the trust anchors, registries, allow-lists, assurance levels, and downstream acceptance rules used in a deployment.

A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator SHALL NOT treat one trust layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and its assurance level. Successful transport presentation proves only the properties validated for that transport and session. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority to act, downstream clinical acceptance, or clinical-source provenance for unsigned content.

The version 1.0 base presentation flow is same-device direct `org-iso-mdoc` over the W3C Digital Credentials API. Section 8 defines byte-level request construction, `SessionTranscript` construction, HPKE processing, mdoc validation, and response extraction. This section defines the trust interpretation and policy seams those mechanics support. In-person initiation mechanisms such as QR codes, NFC tags, or deep links are implementation-defined ways to load a same-device Verifier page that runs §8; they do not add a normative presentation flow or trust layer in version 1.0.

### 7.1 Origin trust

Origin trust concerns the caller context supplied to a Wallet/Responder by the Browser / User Agent or platform. Origin trust is presentation-transport evidence. It is not reader authentication, mdoc issuer assurance, clinical-source provenance, Holder consent, patient matching, or downstream authorization.

A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body to substitute for origin trust. Prohibited metadata is defined in §5.2.7 and includes requester names, origins, URLs, application identifiers, package names, certificates, logos, organization metadata, signed-request metadata, and trust-framework claims. A Wallet/Responder SHALL NOT treat `purpose`, request item `title`, request item `summary`, selector values, unknown request members, extension members, or Artifact content as authenticated requester identity or authenticated origin.

A Wallet/Responder MAY use authenticated origin information for Holder display, local risk decisions, allow-list decisions, diagnostic handling, or policy enforcement. A Wallet/Responder SHALL keep any such origin decision separate from clinical-content validation under §§5-6.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

When the same-device presentation flow is invoked through the W3C Digital Credentials API and the Browser / User Agent or platform exposes an authenticated web origin to the Wallet/Responder, a Wallet/Responder that uses origin trust SHALL use that platform-provided origin as the web-origin input for origin display, origin policy, and any same-device binding defined in §8. The Wallet/Responder SHALL NOT derive authenticated origin from the SMART request JSON, `purpose`, item display text, callback-looking strings, logos, request ids, selector URLs, implementation-defined initiation metadata, or Artifact payloads.

When §8 binds the platform-provided origin into the same-device presentation session, a Wallet/Responder or Verifier that claims origin-bound processing SHALL use the §8 construction and validation rules for that binding. This section does not redefine the `SessionTranscript` bytes, HPKE context, mdoc request construction, or validation checklist.

A Wallet/Responder SHOULD make authenticated origin information available to the Holder when that information is useful for request review and safe under Wallet policy. If a Wallet/Responder displays both authenticated origin context and unauthenticated SMART request display text, it SHOULD distinguish the two.

A deployment profile MAY define how an authenticated origin maps to an organization, service, workflow, or display label. That mapping is deployment policy and SHALL NOT change the semantics of SMART request fields.

#### 7.1.2 Wallet-side privileged-caller / browser-trust policy where applicable, deployment-defined

Some platforms expose origin only through a trusted browser, privileged caller, application identity, verified-app-link relationship, enterprise configuration, allow-list, package identifier, signing certificate, entitlement, or similar platform evidence. This specification does not define a universal privileged-caller trust store.

A Wallet/Responder that relies on privileged-caller or browser-trust evidence SHALL use evidence supplied by the platform through an authenticated channel and SHALL apply Wallet or deployment policy before treating the caller as trusted to assert an origin or invoke the presentation flow. The Wallet/Responder SHALL NOT derive privileged-caller trust from the SMART request body.

A deployment profile or trust-framework operator MAY define accepted browsers, user agents, package identifiers, signing certificates, app-link relationships, enterprise controls, update procedures, revocation expectations, and failure handling for privileged-caller trust. Those requirements are out-of-band trust-framework inputs and SHALL NOT require Requesters to add self-asserted identity metadata to the SMART request body.

Development builds MAY use reflective allow-lists or demo caller evidence only when they are clearly identified as non-production behavior. A Wallet/Responder SHALL NOT treat reflective allow-lists, demo certificates, arbitrary package labels, or unauthenticated caller strings as production privileged-caller trust unless a deployment policy explicitly accepts them for that environment.

#### 7.1.3 Behavior when origin cannot be authenticated

When a Wallet/Responder cannot authenticate a web origin or privileged-caller context, it SHALL treat origin trust as absent for trust-policy purposes. The Wallet/Responder SHALL NOT infer requester identity or origin from the SMART request body to compensate for missing origin evidence.

A Wallet/Responder MAY reject the request, continue only with reduced assurance, request additional Holder confirmation, omit organization branding, require another accepted trust layer, restrict returned content, or apply other local risk controls according to Wallet policy and deployment profile. If the selected presentation flow requires authenticated origin for cryptographic session binding, the Wallet/Responder SHALL follow the failure behavior defined by that flow rather than substituting an untrusted clinical request field.

If a Wallet/Responder proceeds without authenticated origin, it SHALL NOT present unauthenticated origin or SMART request display context as verified identity. A Verifier or Requester that requires origin-authenticated presentation for a deployment workflow SHALL reject, quarantine, or avoid downstream reliance on a response when required origin evidence is absent or fails policy, even if the SMART response is otherwise valid under §6.

### 7.2 Reader / Verifier trust

Reader / Verifier trust concerns authentication of the presentation requester, independently of web-origin trust and independently of clinical-source provenance. In the same-device direct `org-iso-mdoc` flow, reader authentication can be represented by optional per-`DocRequest.readerAuth` using a `COSE_Sign1` signature over ISO-style `ReaderAuthentication`. Section 8 defines the byte-level construction and validation inputs.

A Requester or Verifier SHALL NOT place reader identity, organization identity, legal-entity identifiers, certificates, trust-framework claims, or signatures inside the SMART request body as a substitute for reader authentication. Such information belongs in the presentation transport, deployment policy, or out-of-band trust framework.

A signed reader request can help a Wallet/Responder decide whether a Verifier belongs to a trusted organization, workflow, certification program, or deployment. It does not prove that returned clinical content came from an EHR, that the Holder is the intended patient, that the Requester may write to an EHR, or that a downstream workflow must accept the response.

#### 7.2.1 Optional `readerAuth` `COSE_Sign1` over `ReaderAuthentication`

A Verifier MAY include per-`DocRequest.readerAuth` as a detached `COSE_Sign1` signature over `ReaderAuthentication` for the same-device `org-iso-mdoc` request. When a Verifier includes `readerAuth`, it SHALL construct `readerAuth` for the same presentation session and the same requested items carried in the request, using the §8 construction that binds the `SessionTranscript` and the exact `ItemsRequest` bytes. A Verifier SHALL NOT reuse `readerAuth` across different presentation sessions, different session transcripts, or different `ItemsRequest` bytes.

A Wallet/Responder that receives `readerAuth` and claims support for reader authentication SHALL verify the COSE signature, the signed `ReaderAuthentication` context, the detached-payload binding, the relevant request bytes, the protected algorithm and key type, and associated certificate or public-key material according to §8 and its configured trust-anchor policy. A Wallet/Responder SHALL treat a cryptographically invalid, malformed, mismatched, unsupported, or policy-unacceptable `readerAuth` as failed reader authentication.

A Wallet/Responder SHALL NOT treat the mere presence of `readerAuth`, a certificate chain, a common name, a logo, or a display string as successful reader authentication without signature verification and trust-policy evaluation.

Successful `readerAuth` validation proves possession of the corresponding reader private key and binds the signed reader authentication to the presentation session and request bytes accepted by the Wallet/Responder. It does not by itself prove clinical authority, patient identity, clinical-source provenance, EHR write-back authorization, or clinical appropriateness of requested items.

#### 7.2.2 Reader certificate chain and trust-anchor policy

When `readerAuth` includes certificate material, the Wallet/Responder or deployment profile SHALL define how the certificate or certificate chain is evaluated before treating the reader as trusted. The policy SHALL identify accepted trust anchors or registry sources when reader trust is required. The policy SHOULD define certificate path validation, key usage or extended key usage, policy OIDs, subject or organization identifiers, validity-time handling, revocation or status checking where available, algorithm constraints, and mapping from authenticated certificate evidence to Holder-facing display text.

A Wallet/Responder that relies on reader certificates for a policy decision SHALL validate the reader signing key against the certificate material and SHALL evaluate the certificate chain or key evidence against the applicable trust-anchor policy. A Wallet/Responder SHALL NOT treat a self-signed demo certificate, arbitrary leaf certificate, expired certificate, revoked certificate, unsupported algorithm, or untrusted chain as production reader trust unless the deployment profile explicitly authorizes that trust anchor for the relevant environment.

A Verifier that presents reader certificate material SHALL provide the material in the location and encoding required by §8 and SHALL ensure that the signing key used for `readerAuth` corresponds to the authenticated certificate or key evidence it expects the Wallet/Responder to evaluate.

This base specification does not mandate a single global reader certificate authority or reader registry. A deployment profile or trust-framework operator MAY define reader trust anchors, certificate profiles, naming constraints, organizational vetting requirements, revocation feeds, registry lookups, or federation metadata.

#### 7.2.3 Wallet handling of unsigned vs. signed reader requests

`readerAuth` is optional in the core version 1.0 trust framework unless a deployment profile makes it mandatory for a class of requests. A Wallet/Responder MAY process an unsigned reader request when local policy, origin evidence, privileged-caller evidence, Holder decision, mdoc issuer/device evidence, clinical-source evidence, and deployment requirements permit. A Wallet/Responder MAY require signed reader requests for particular origins, caller classes, workflows, requested content categories, Artifact media types, deployment profiles, or assurance levels.

When `readerAuth` is absent, a Wallet/Responder SHALL treat reader authentication as absent. It SHALL NOT report or display the Verifier as reader-authenticated.

When `readerAuth` is present but invalid, untrusted, expired, unsupported, malformed, or otherwise unacceptable under policy, a Wallet/Responder SHALL treat reader authentication as failed. The Wallet/Responder SHALL distinguish absent reader authentication from failed reader authentication for policy purposes. It MAY reject the presentation request, continue only under an explicit reduced-assurance policy, require additional Holder confirmation, or apply other restrictions, subject to deployment requirements and the selected flow.

If a Wallet/Responder proceeds with an unsigned or untrusted-reader request, it SHALL NOT represent the reader or organization as authenticated by reader authentication. A Verifier SHALL NOT assume that transport invocation alone causes a Wallet/Responder to accept unsigned reader requests or to accept any reader identity claim beyond what other trust layers established.

### 7.3 Issuer / device-attestation trust (mdoc binding)

Issuer / device-attestation trust concerns the mdoc presentation container used by the same-device flow. The mdoc layer can provide evidence that the response element was issuer-signed into an mdoc document, that MSO digests match disclosed issuer-signed items, and that the presenter possesses the device key bound to the presentation. This layer is separate from origin trust, reader authentication, clinical-source provenance, patient matching, and downstream authorization.

A Verifier SHALL apply the mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks required by §8 before relying on mdoc-layer evidence. A Verifier SHALL then apply the SMART response validation rules in §6.6 before the Requester consumes the clinical response.

#### 7.3.1 MSO issuer trust anchors, IACA-style or registry-based

A Verifier or deployment profile SHALL define the trust-anchor policy used to validate MSO issuer signatures for SMART Health Check-in mdoc documents when issuer trust is required. The policy MAY use IACA-style issuer anchors, registry-based issuer metadata, pinned issuer certificates, enterprise anchors, ecosystem test anchors, federation metadata, local allow-lists, or another out-of-band trust source.

A Verifier that relies on mdoc issuer evidence SHALL validate the MSO issuer signature, issuer certificate path or equivalent issuer key evidence, digest bindings, document type, namespace, disclosed element identifiers, and validity constraints required by §8 and the applicable trust-anchor policy. A Verifier SHALL NOT treat a syntactically valid MSO, a matching digest, a cryptographically valid signature against an included leaf certificate, or a self-signed issuer certificate as production issuer trust unless the issuer evidence chains to or otherwise matches a trust anchor accepted by the applicable deployment policy.

A deployment profile or trust-framework operator SHOULD define production-vs-test separation, issuer certificate profiles, revocation or status expectations where available, registry lookup behavior, constraints on `docType`, namespace, and element identifiers, and operational procedures for adding and removing accepted issuer anchors.

MSO issuer trust authenticates the mdoc issuer for the presentation container. It does not by itself prove clinical provenance, correctness, completeness, or downstream acceptability of SMART response Artifacts contained in the mdoc element.

#### 7.3.2 Device key proof of possession

A Verifier SHALL verify device-key proof of possession for the same-device mdoc response as required by §8 before treating the mdoc presentation as device-bound. The device-authentication verification SHALL use the same presentation session and `SessionTranscript` derived for the selected flow, including origin and encryption information where the selected flow requires them.

A Verifier SHALL NOT treat a SMART response extracted from an mdoc response as transport-valid if device-key proof fails, if device authentication is not bound to the expected presentation session, or if the disclosed response element does not match the issuer-signed digest under the selected mdoc validation rules.

Device key proof establishes possession of the device private key for the mdoc presentation container and session. It does not establish that the Holder is the intended patient, that the Wallet performed legal identity proofing, that the returned clinical content is clinically accurate, that unsigned raw FHIR JSON came from an EHR, or that the Requester may write the content to an EHR.

A Wallet/Responder that constructs an mdoc response SHALL produce the device-key proof required by §8 for the selected presentation session when the flow requires device-bound mdoc evidence.

#### 7.3.3 Self-attested wallet model

A deployment profile MAY permit a self-attested wallet model in which the Wallet/Responder creates an mdoc presentation container without an externally accredited production issuer chain, or with test, local, self-signed, or deployment-specific issuer evidence. In this model, the mdoc layer can still support session binding, response integrity, transport protection, and Holder-mediated disclosure when §8 validation succeeds, but issuer assurance is limited to the trust anchors or local policy accepted by the Verifier for that deployment.

A Verifier MAY accept self-attested Wallet presentations only under a deployment policy that explicitly permits that model and defines the resulting assurance level. A Verifier or Requester that accepts self-attested Wallet evidence SHALL treat the issuer/device layer as self-attested or deployment-local, not as production third-party issuer assurance. A Verifier, Requester, or Wallet/Responder SHALL NOT label self-attested mdoc evidence as externally issuer-accredited or production issuer-trusted unless the applicable issuer and trust-anchor policy supports that claim.

A Wallet/Responder using a self-attested model SHALL NOT claim, through the SMART response wrapper or mdoc container, that raw FHIR JSON Artifacts are issuer-signed clinical credentials. If clinical-source provenance is needed, the Wallet/Responder needs to return an Artifact that carries separate provenance or signature evidence, such as a SMART Health Card where appropriate, or the Requester needs to rely on deployment policy.

Self-attestation does not relax SMART request parsing, SMART response validation, `requestId` matching, `fulfills[]` validation, `requestStatus[]` coverage, media-type checks, FHIR-version checks, or same-device validation required elsewhere in this specification.

### 7.4 Source trust on clinical content

Clinical-source trust concerns whether returned clinical content carries evidence about where it came from, who or what signed it, and whether that evidence is acceptable to the Requester or receiving workflow. Clinical-source trust is evaluated at the Artifact payload layer and through deployment policy. It is not automatically created by successful transport presentation, web-origin trust, reader authentication, mdoc issuer signatures, device-key proof, implementation-defined initiation handling, Holder consent, or SMART response shape validation.

A Verifier or receiver SHALL evaluate clinical-source trust according to the Artifact `mediaType`, payload signatures or provenance, request selectors, FHIR evidence, SMART Health Card rules where applicable, extension-profile rules where applicable, and deployment policy. A Verifier or receiver SHALL NOT infer clinical-source provenance from successful transport presentation alone.

When request selectors depend on versioned FHIR canonicals or profiles, evidence that returned content satisfies the requested canonical version is part of clinical-content validation and deployment policy. Origin evidence, `readerAuth`, mdoc issuer evidence, and device proof do not by themselves establish FHIR profile conformance or exact-version clinical-source trust.

A Requester MAY apply stricter clinical-source, patient-match, freshness, completeness, terminology, FHIR-profile, provenance, or local-ingestion requirements before workflow use. Those downstream decisions do not change whether the SMART response is syntactically and procedurally valid under §§5-6.

#### 7.4.1 SMART Health Card chain of custody

An `application/smart-health-card` Artifact carries one or more SMART Health Card Verifiable Credential JWS strings in `value.verifiableCredential[]`. A Verifier or receiver that consumes a SMART Health Card Artifact SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on the signed clinical content or issuer claims.

For SMART Health Card Artifacts, FHIR content, FHIR version semantics, issuer identity, and signed clinical-source evidence are inside the signed credential payloads. A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact, and a Verifier SHALL reject such an outer `fhirVersion` under §6.3.1 and §6.6.5.

A Verifier or receiver SHALL evaluate signed SMART Health Card payload content against the original SMART request selectors and local policy before relying on the Artifact for a requested item. A valid SMART Health Card signature proves only the claims made by that credential under the accepted SMART Health Card trust policy. It does not by itself prove that the Artifact satisfies every request selector, that all requested content was returned, that the Holder is the intended patient, that the content is current enough for the workflow, or that downstream ingestion is authorized.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

An `application/fhir+json` Artifact is raw FHIR JSON mediated by the Holder and Wallet/Responder. A Wallet/Responder SHALL include `fhirVersion` on each raw FHIR JSON Artifact as defined in §6.3.2. A Verifier SHALL treat that `fhirVersion` as FHIR release context for interpreting the raw FHIR Artifact, not as a clinical-source signature, provenance record, issuer credential, or proof of clinical correctness.

A Verifier or receiver SHALL treat raw FHIR JSON as patient-mediated content unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof. Examples of separate evidence can include a FHIR `Provenance` resource, a FHIR digital signature, a signed Bundle, an extension Artifact media type with defined integrity rules, authenticated retrieval evidence, or another deployment-accepted attestation. These examples are illustrative and do not mandate a particular provenance technology.

A Wallet/Responder SHALL NOT use transport encryption, mdoc issuer signatures, device-key proof, `readerAuth`, origin evidence, `purpose`, item text, Artifact ids, `fulfills[]`, implementation-defined initiation fields, or successful SMART response validation to claim that unsigned raw FHIR JSON is an issuer-signed clinical credential. A Verifier or receiver MAY accept patient-mediated raw FHIR JSON for a workflow under local policy, but it SHALL NOT equate raw FHIR JSON with SMART Health Card or other signed clinical-source evidence unless separate proof is present and accepted.

A Requester that requires source-authenticated FHIR content SHOULD request media types or deployment profiles that carry suitable provenance or signature evidence and SHOULD apply local policy before downstream ingestion.

### 7.5 Identifier scoping and uniqueness

Identifiers in SMART Health Check-in are scoped protocol correlation values unless their defining payload, presentation binding, Artifact payload, or deployment policy gives them a broader meaning. A Requester, Wallet/Responder, Verifier, deployment profile, or trust-framework operator SHALL preserve identifier scopes and SHALL NOT treat an identifier from one layer as an identifier, proof, or authorization for another layer unless this specification or an explicit deployment profile defines that binding.

A Requester SHALL generate `SmartHealthCheckinRequest.id` values as defined in §5.2.3. The request `id` is scoped to SMART requests created by that Requester for the same check-in session; it is not a patient identifier, requester identifier, origin identifier, reader identifier, mdoc session identifier, issuer identifier, freshness proof, authorization proof, or clinical fact. A Wallet/Responder SHALL copy the request `id` exactly into `SmartHealthCheckinResponse.requestId` as required by §6.1.3. A Verifier SHALL validate the exact `requestId` match under §6.6.1 and SHALL NOT use that match as a substitute for transport freshness, origin trust, reader authentication, patient matching, or clinical provenance.

A Requester SHALL keep request item `id` values unique within one SMART request as required by §5.3.1. A Wallet/Responder SHALL preserve request item ids exactly when constructing `fulfills[]` and `requestStatus[].item`. A Verifier SHALL validate item references as defined in §6.6. Item ids are not global clinical identifiers or patient identifiers.

A Wallet/Responder SHALL keep Artifact `id` values unique within one SMART response as required by §6.2.1. A Requester, Verifier, receiver, Wallet/Responder, deployment profile, or trust-framework operator SHALL NOT treat Artifact ids as global document identifiers, patient identifiers, requester identifiers, clinical provenance identifiers, or source document identifiers unless that meaning is separately established by the Artifact payload, signature, provenance, or deployment policy.

Presentation-layer and implementation-defined initiation identifiers, including web origins, reader certificate subjects, issuer certificate subjects, certificate serial numbers, key ids, mdoc docTypes, namespaces, element identifiers, `SessionTranscript` components, nonces, URL tokens, relay identifiers, response-routing identifiers, and completion identifiers, have the scopes defined by their respective sections, implementation design, or deployment profiles. Identifier uniqueness at one layer does not imply uniqueness at another layer. A Wallet/Responder, Verifier, or Requester SHALL NOT use presentation or initiation identifiers to replace the SMART request `id`, request item ids, Artifact ids, `fulfills[]` links, or `requestStatus[]` accounting required by §§5-6.

A deployment profile SHOULD define collision resistance, replay handling, retention, logging, telemetry, and privacy expectations for identifiers it introduces or constrains, especially when identifiers can appear in browser history, QR codes, logs, telemetry, certificate fields, or downstream records.

### 7.6 Out-of-band trust establishment / deployment policy

SMART Health Check-in 1.0 defines protocol hooks and validation responsibilities for layered trust, but it does not define one universal production trust framework for all deployments. Trust anchors, registries, organizational accreditation, privileged-browser allow-lists, issuer onboarding, clinical-source acceptance criteria, patient matching, EHR ingestion, retention, and downstream workflow rules are deployment policy unless a normative section of this specification defines a specific interoperable requirement.

A deployment profile or trust-framework operator that adds out-of-band trust requirements SHALL document:

1. which roles are constrained, such as Wallet/Responder, Verifier, Requester, or downstream receiver;
2. which trust layer is constrained: origin, privileged caller, reader authentication, mdoc issuer, device proof, self-attested wallet evidence, clinical-source provenance, or downstream receiver policy;
3. the accepted trust anchors, registries, allow-lists, certificate policies, issuer policies, source-provenance mechanisms, or assurance labels;
4. freshness, revocation, expiration, replay, or status-check expectations;
5. required Wallet/Responder behavior when evidence is missing, invalid, expired, revoked, unsupported, ambiguous, inconsistent, or outside policy;
6. required Verifier, Requester, or receiver behavior when a presentation succeeds but clinical-source, patient-match, local-ingestion, or downstream workflow policy is not satisfied; and
7. how Holder-facing display distinguishes authenticated identity, authenticated origin, authenticated reader information, unauthenticated request text, and local policy warnings.

A deployment profile SHALL state which trust layers are mandatory for each conformance or deployment context it defines. If a deployment profile permits operation when a trust layer is absent or fails, it SHALL state the resulting assurance level and any restrictions on use of returned content.

A deployment profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, Artifact media types, selector semantics, fulfillment links, or status codes. It MAY require stricter validation, narrower accepted media types, stronger provenance, additional display, stronger trust anchors, or rejection of otherwise optional trust modes.

A Verifier or Requester SHALL apply the trust policy required by its deployment before using a SMART response for downstream workflow. A Wallet/Responder SHALL apply its local policy and any applicable deployment profile before disclosing content. A Wallet/Responder MAY refuse a request when required trust evidence is missing, unacceptable, expired, revoked, inconsistent, or not understandable.

Implementation-defined in-person initiation, relay, or completion components SHALL preserve the trust boundaries defined here and SHALL NOT redefine SMART request or SMART response clinical semantics. If such components are used to load a same-device Verifier page, the normative presentation flow remains the §8 direct `org-iso-mdoc` flow.

---

## 8. Same-device presentation flow over `org-iso-mdoc`

This section defines the base SMART Health Check-in 1.0 same-device presentation flow. A Verifier carries the transport-neutral SMART request defined in §5 to a Wallet/Responder through the W3C Digital Credentials API direct `org-iso-mdoc` path, and the Wallet/Responder returns the transport-neutral SMART response defined in §6 inside an mdoc `DeviceResponse` encrypted for the Verifier.

This section does not redefine clinical request or response semantics. A Wallet/Responder validates and uses the extracted SMART request under §5. A Verifier validates the extracted SMART response under §6, including the §6.6 cross-validation rules. Trust interpretation follows §7: origin evidence, optional reader authentication, mdoc issuer/device evidence, and clinical-source provenance are distinct.

This same-device direct `org-iso-mdoc` flow is the only normative SMART Health Check-in 1.0 presentation flow. In-person initiation mechanisms such as QR codes, NFC tags, or deep links MAY be used as implementation-defined ways to load a same-device Verifier page that runs this section; their URL formats, relay behavior, storage, and completion handling are outside this specification.

### 8.1 Identifiers and constants

The version 1.0 same-device flow uses the fixed identifiers and algorithm choices in Table 8-1.

| Purpose | Value |
| --- | --- |
| Digital Credentials protocol | `org-iso-mdoc` |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| Requested and disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| HPKE suite | DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM |
| COSE signature algorithm | ES256 / `-7` |

A Verifier SHALL use `org-iso-mdoc` as the Digital Credentials API protocol id for this flow. A Verifier SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`.

A Verifier SHALL carry the SMART request only as a JSON string in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic element names, implementation-defined initiation wrapper fields, archived claim-name experiments, or other locations as the version 1.0 request carrier for this flow.

A Wallet/Responder SHALL carry the SMART response as the `elementValue` of an issuer-signed item whose namespace is `org.smarthealthit.checkin` and whose `elementIdentifier` is `smart_health_checkin_response`.

### 8.2 Verifier-side request construction

A Verifier begins with a SMART request object that conforms to §5.

#### 8.2.1 SMART request JSON in `requestInfo`

A Verifier SHALL serialize the SMART request as UTF-8 JSON text and place the resulting string at:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]
```

The value is a CBOR text string containing the JSON serialization. It is not a CBOR map representation of the SMART request and not a base64url-encoded JSON string. This specification does not define a canonical JSON serialization for the SMART request object, although fixtures and byte ladders can preserve the exact JSON text used in a capture.

#### 8.2.2 `ItemsRequest` shape

For the core profile, a Verifier SHALL construct an `ItemsRequest` with this logical shape:

```text
ItemsRequest = {
  "docType": "org.smarthealthit.checkin.1",
  "nameSpaces": {
    "org.smarthealthit.checkin": {
      "smart_health_checkin_response": true
    }
  },
  "requestInfo": {
    "org.smarthealthit.checkin.request": JSON.stringify(SmartHealthCheckinRequest)
  }
}
```

The `true` value is the mdoc `intentToRetain` value for the requested element. A Verifier SHALL default `intentToRetain` to `true` for `smart_health_checkin_response` because ordinary clinical check-in workflows commonly ingest or route returned Artifacts. A Verifier MAY set it to `false` only when the Verifier truly intends ephemeral use and applicable deployment policy permits that signal. The flag does not override Holder choice, Wallet policy, legal requirements, §12 privacy requirements, or downstream retention policy.

A Verifier SHALL NOT model FHIR profiles, request items, questionnaires, Artifact media types, status codes, or individual clinical resources as separate mdoc elements in the core flow. The stable mdoc element carries one SMART response whose internal clinical semantics are defined by §6.

#### 8.2.3 Tag-24 wrapping

A Verifier SHALL CBOR-encode the `ItemsRequest` and wrap those bytes in CBOR tag 24 before placing it in `DocRequest.itemsRequest`:

```text
ItemsRequestBytes = tag24(CBOR(ItemsRequest))
```

The exact tag-24 value is security-relevant when `readerAuth` is present and for byte-level fixtures.

#### 8.2.4 `DeviceRequest` version 1.0 and optional `readerAuth`

A Verifier SHALL construct a `DeviceRequest` with version exactly `"1.0"` and a `docRequests` array containing the SMART Health Check-in `DocRequest`:

```text
DeviceRequest = {
  "version": "1.0",
  "docRequests": [
    {
      "itemsRequest": ItemsRequestBytes,
      "readerAuth": COSE_Sign1 / optional
    }
  ]
}
```

Version 1.0 of this specification uses per-`DocRequest.readerAuth` when reader authentication is present. A Verifier SHALL NOT use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core SMART Health Check-in 1.0 reader-authentication mechanism unless a future version or deployment profile explicitly defines that variant.

`readerAuth` is optional in the core version 1.0 flow unless a deployment profile requires it. A Verifier that includes `readerAuth` SHALL construct it as a detached `COSE_Sign1` using ES256 (`alg` `-7`) over this payload:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The `readerAuth` protected header SHALL include `{1: -7}`. The serialized `COSE_Sign1` payload field SHALL be `null`. The COSE signature input SHALL be the `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as the detached payload. For this core profile, `readerAuth` SHALL carry reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf reader certificate; deployment profiles define acceptable chains, trust anchors, revocation handling, and assurance labels.

A Verifier that includes `readerAuth` SHALL compute it for the exact `SessionTranscript` and exact `ItemsRequestBytes` used in the presentation request and SHALL NOT reuse it across sessions, origins, encryption information, SMART request serializations, or requested element sets.

#### 8.2.5 HPKE recipient public key and `encryptionInfo`

For each presentation request, a Verifier SHALL generate or select an HPKE recipient key pair for DHKEM(P-256, HKDF-SHA256). A Verifier SHOULD use a fresh recipient key pair for each presentation session. A deployment profile that permits recipient-key reuse SHALL define replay, correlation, retention, and key-compromise handling.

The public key in `encryptionInfo` SHALL be a COSE_Key for an EC2 P-256 public key, including at least:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: <x-coordinate bstr>,
  -3: <y-coordinate bstr>
}
```

A Verifier SHALL construct `encryptionInfo` as CBOR for this logical value:

```text
encryptionInfo = [
  "dcapi",
  {
    "nonce": <fresh unpredictable bytes>,
    "recipientPublicKey": <P-256 COSE_Key>
  }
]
```

A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy; active version 1.0 fixtures use 32 bytes. Appendix C, Appendix E, or a deployment profile can impose a tighter nonce-size rule for conformance vectors.

The Verifier SHALL retain the matching HPKE private key and the exact `encryptionInfo` CBOR bytes until response processing completes or the presentation session is abandoned.

#### 8.2.6 Digital Credentials API request shape

A Verifier SHALL base64url-encode the CBOR `DeviceRequest` bytes and CBOR `encryptionInfo` bytes without padding. It SHALL invoke the Digital Credentials API with a request equivalent to:

```js
await navigator.credentials.get({
  mediation: "required",
  digital: {
    requests: [{
      protocol: "org-iso-mdoc",
      data: {
        deviceRequest: "<base64url-without-padding CBOR DeviceRequest>",
        encryptionInfo: "<base64url-without-padding CBOR encryptionInfo>"
      }
    }]
  }
});
```

A Verifier SHALL preserve the exact `encryptionInfo` base64url string because §8.3 binds that string, not a re-encoded equivalent, into the `SessionTranscript`.

### 8.3 `SessionTranscript` and origin binding

Both sides SHALL compute the same direct `dcapi` `SessionTranscript` bytes for a presentation session.

Let `encryptionInfoBase64Url` be the exact unpadded base64url string placed in `navigator.credentials.get(...).digital.requests[i].data.encryptionInfo`. Let `origin` be the authenticated origin value, or deployment-defined privileged-caller origin-equivalent value, supplied by the Browser / User Agent or platform for the presentation invocation.

The construction is:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The SHA-256 input is the exact CBOR serialization of `[encryptionInfoBase64Url, origin]`. The `SessionTranscript` bytes are the exact CBOR serialization of `[null, null, handover]`.

A Wallet/Responder SHALL obtain `origin` from an authenticated Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. A Wallet/Responder SHALL NOT derive `origin` from the SMART request JSON, `purpose`, item `title`, item `summary`, selector URLs, request ids, implementation-defined initiation metadata, callback-looking strings, or Artifact contents.

A Verifier SHALL use the same origin value that the platform/requester context uses for this invocation when constructing `readerAuth`, HPKE `info`, and expected device authentication inputs. A Wallet/Responder SHALL use the same `SessionTranscript` bytes for optional `readerAuth` verification, for `DeviceAuthentication`, and for HPKE response encryption. A Verifier SHALL use the same bytes for HPKE opening and device-signature verification.

If authenticated origin or deployment-approved privileged-caller context is unavailable, the Wallet/Responder SHALL treat origin trust as absent under §7.1.3. If the Wallet/Responder cannot construct the `SessionTranscript` required for this flow, it SHALL fail the presentation or proceed only under an explicit deployment profile that defines the serialized origin-equivalent input, resulting assurance level, Holder display, and Verifier validation behavior. A Wallet/Responder SHALL NOT silently substitute a self-asserted SMART request field as the origin.

### 8.4 Wallet-side request handling

A Wallet/Responder that receives a candidate direct `org-iso-mdoc` request SHALL validate the presentation request before constructing a SMART response.

The Wallet/Responder SHALL:

1. confirm that the presentation request is for protocol `org-iso-mdoc`;
2. base64url-decode `data.deviceRequest` without padding and parse it as CBOR `DeviceRequest`;
3. confirm `DeviceRequest.version` is `"1.0"` for this core flow;
4. locate a `DocRequest.itemsRequest` that is CBOR tag 24 around CBOR `ItemsRequest` bytes;
5. preserve the exact tag-24 `ItemsRequestBytes` for `readerAuth` verification;
6. decode the enclosed `ItemsRequest`;
7. confirm `ItemsRequest.docType` is exactly `org.smarthealthit.checkin.1`;
8. confirm `ItemsRequest.nameSpaces["org.smarthealthit.checkin"]` requests `smart_health_checkin_response` and recover the `intentToRetain` value for Holder review or policy;
9. recover `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as a string;
10. parse that string as UTF-8 JSON and validate it as a SMART request under §5;
11. base64url-decode `data.encryptionInfo`, parse it as CBOR, require the direct `"dcapi"` envelope, and validate the recipient public key as P-256 COSE_Key material; and
12. recompute the `SessionTranscript` under §8.3 using the exact request `encryptionInfo` base64url string and authenticated origin or approved origin-equivalent context.

If the SMART request JSON is absent, not a string, unparsable, not a JSON object, or invalid under §5, the Wallet/Responder SHALL reject the presentation request, report failure through the selected platform mechanism, or otherwise fail safely. The Wallet/Responder SHALL NOT infer clinical request semantics from mdoc element names, display strings, archived dynamic-element encodings, unknown request fields, or implementation-defined initiation wrappers.

If `readerAuth` is present and the Wallet/Responder supports or relies on reader authentication, the Wallet/Responder SHALL verify the detached `COSE_Sign1`, protected algorithm, `ReaderAuthenticationBytes`, `SessionTranscript`, exact tag-24 `ItemsRequestBytes`, signature, `x5chain` certificate evidence, and deployment trust policy. The Wallet/Responder SHALL distinguish at least these states for policy and display purposes: absent `readerAuth`; syntactically invalid `readerAuth`; cryptographically failed `readerAuth`; cryptographically valid but untrusted or policy-unacceptable `readerAuth`; and trusted `readerAuth` under the applicable deployment policy.

After request and trust processing, the Wallet/Responder SHALL run Holder review or equivalent Holder-control processing at request-item granularity. It SHALL preserve request item `id` values for response accounting. It MAY group, summarize, reorder, or suppress display details according to accessibility, safety, localization, local policy, and applicable law, but it SHALL NOT treat `required: true` as consent and SHALL NOT present `purpose`, item `title`, item `summary`, or other SMART request fields as authenticated requester identity.

Unsupported selectors, unavailable data, Holder refusal, partial sharing, and processing errors are clinical response outcomes when the request was otherwise valid enough to answer. They are not necessarily transport failures and are reported through §6 status rules when the Wallet/Responder proceeds to construct a SMART response.

### 8.5 Wallet-side response construction

A Wallet/Responder that proceeds after request validation and Holder review SHALL construct a SMART response according to §6. The response `requestId` SHALL exactly equal the accepted SMART request `id`; `artifacts[]`, `fulfills[]`, and `requestStatus[]` SHALL follow §§6.1-6.5. This exact match is a clinical correlation check only; it is not a freshness proof, patient identity proof, requester identity proof, or clinical-source proof.

#### 8.5.1 Stable response element

The Wallet/Responder SHALL serialize the SMART response as UTF-8 JSON text. This specification does not define a canonical JSON serialization for the SMART response object.

The Wallet/Responder SHALL create an `IssuerSignedItem` for namespace `org.smarthealthit.checkin` with logical contents:

```text
IssuerSignedItem = {
  "digestID": <integer digest id>,
  "random": <random bstr>,
  "elementIdentifier": "smart_health_checkin_response",
  "elementValue": JSON.stringify(SmartHealthCheckinResponse)
}
```

The Wallet/Responder SHALL CBOR-encode the `IssuerSignedItem`, wrap those bytes in CBOR tag 24, and place that tagged item in:

```text
issuerSigned.nameSpaces["org.smarthealthit.checkin"]
```

The Wallet/Responder SHALL compute the MSO value digest over the complete tag-24-wrapped `IssuerSignedItem` bytes. The `IssuerSignedItem.digestID` SHALL match the corresponding key in `MSO.valueDigests["org.smarthealthit.checkin"]`.

#### 8.5.2 MSO and `issuerAuth`

The Wallet/Responder SHALL construct a Mobile Security Object whose `docType` is `org.smarthealthit.checkin.1`, whose `digestAlgorithm` is `SHA-256` for this profile, whose `valueDigests` cover the disclosed `smart_health_checkin_response` issuer-signed item, and whose `deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.

The Wallet/Responder SHALL sign the MSO as `issuerAuth` using `COSE_Sign1` with ES256 (`alg` `-7`). The `issuerAuth.payload` SHALL be the tag-24-wrapped MSO bytes unless Appendix C or an ISO-compatible profile defines an equivalent encoding.

A deployment profile or Verifier trust policy decides whether the issuer evidence is production issuer-trusted, registry-trusted, pinned, self-attested, test-only, or otherwise acceptable under §7.3. Demo or self-attested issuer evidence does not relax structural mdoc validation, digest validation, device authentication, SMART response validation, or §6.6 cross-validation.

#### 8.5.3 `DeviceAuthentication`, device signature, and `DeviceResponse`

The Wallet/Responder SHALL construct `DeviceAuthentication` for the same presentation session using the §8.3 `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes:

```text
DeviceAuthenticationBytes = tag24(CBOR([
  "DeviceAuthentication",
  SessionTranscript,
  "org.smarthealthit.checkin.1",
  tag24(CBOR(DeviceNameSpaces))
]))
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response element is issuer-signed; it is not moved into `DeviceNameSpaces` as a substitute for the issuer-signed element.

The Wallet/Responder SHALL produce a device `COSE_Sign1` signature using ES256 (`alg` `-7`) and the private key corresponding to `MSO.deviceKeyInfo.deviceKey`, with `DeviceAuthenticationBytes` as the device-authentication payload according to the mdoc device-authentication rules.

The Wallet/Responder SHALL construct a `DeviceResponse` with logical shape:

```text
DeviceResponse = {
  "version": "1.0",
  "documents": [
    {
      "docType": "org.smarthealthit.checkin.1",
      "issuerSigned": {
        "nameSpaces": {
          "org.smarthealthit.checkin": [tag24(CBOR(IssuerSignedItem))]
        },
        "issuerAuth": COSE_Sign1
      },
      "deviceSigned": {
        "nameSpaces": tag24(CBOR(DeviceNameSpaces)),
        "deviceAuth": { "deviceSignature": COSE_Sign1 }
      }
    }
  ],
  "status": 0
}
```

Appendix C owns the complete CDDL and any ISO/IEC 18013-5 compatibility refinements. Additional mdoc, certificate, validity, or device fields are presentation evidence; they do not change the SMART response model. A successful same-device presentation does not create clinical-source provenance for unsigned raw FHIR JSON. Production clinical-source trust must come from Artifact payload evidence, such as SMART Health Card signatures or accepted provenance, as described in §7.4.

### 8.6 HPKE encryption

The Wallet/Responder SHALL encrypt the CBOR `DeviceResponse` plaintext to the recipient public key from `encryptionInfo` using HPKE base mode with:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

The HPKE `enc` value is the encapsulated ephemeral P-256 public key for the KEM. Active fixtures encode it as the 65-byte uncompressed P-256 point. The `cipherText` value is the HPKE AEAD ciphertext including its authentication tag.

The Wallet/Responder SHALL wrap the HPKE output in the direct DC API response CBOR value:

```text
dcapiResponse = [
  "dcapi",
  {
    "enc": <HPKE enc bstr>,
    "cipherText": <HPKE ciphertext bstr>
  }
]
```

The Wallet/Responder SHALL base64url-encode the CBOR `dcapiResponse` bytes without padding and return a Digital Credentials API result equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

The Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, or a response encrypted with another HPKE suite for this core version 1.0 flow.

### 8.7 Verifier-side processing

A Verifier receiving a Digital Credentials API result SHALL process it before passing any clinical content to the Requester or downstream receiver.

The Verifier SHALL:

1. require the returned `protocol` to equal `org-iso-mdoc`;
2. require `data.response` to be an unpadded base64url string;
3. base64url-decode `data.response` and parse it as CBOR `dcapiResponse`;
4. require `dcapiResponse` to have the direct shape `["dcapi", {"enc": <bstr>, "cipherText": <bstr>}]`;
5. reconstruct the expected §8.3 `SessionTranscript` from the original `encryptionInfo` base64url string and origin used for the request;
6. HPKE-open `cipherText` using the retained recipient private key, the corresponding recipient public key from `encryptionInfo`, the received `enc`, the required HPKE suite, `info = SessionTranscript bytes`, and empty `aad`;
7. reject the response if HPKE opening fails;
8. parse the plaintext as CBOR `DeviceResponse`;
9. require `DeviceResponse.version` to be `"1.0"` and `DeviceResponse.status` to indicate success for the document being accepted;
10. locate a document whose `docType` is `org.smarthealthit.checkin.1`;
11. verify `issuerAuth` as an ES256 `COSE_Sign1`, decode and validate the MSO, verify the MSO `docType`, validity information, device key, and issuer signature, and evaluate issuer evidence under §7.3 and deployment policy before claiming production issuer trust;
12. locate the disclosed issuer-signed item in namespace `org.smarthealthit.checkin` whose `elementIdentifier` is `smart_health_checkin_response`;
13. recompute the value digest over the exact tag-24-wrapped `IssuerSignedItem` bytes and compare it to the MSO `valueDigests["org.smarthealthit.checkin"][digestID]` entry;
14. verify the device `COSE_Sign1` signature using `MSO.deviceKeyInfo.deviceKey` over `DeviceAuthentication` constructed with the expected `SessionTranscript`, `docType` `org.smarthealthit.checkin.1`, and tag-24-wrapped `DeviceNameSpaces` bytes;
15. require the `smart_health_checkin_response` `elementValue` to be a string;
16. parse that string as JSON and validate it as a `SmartHealthCheckinResponse` under §6; and
17. apply all §6.6 cross-validation rules against the original SMART request before accepting the response as protocol-valid.

A Verifier SHALL reject or quarantine the presentation response if HPKE opening fails, mdoc issuer/MSO validation fails, value-digest validation fails, device authentication fails, the stable response element is absent or malformed, SMART response JSON validation fails, or §6.6 cross-validation fails.

A Verifier SHALL keep trust decisions distinct. HPKE success, origin binding, reader authentication, issuer/MSO validation, device-key proof, syntactic SMART response validity, and SMART Health Card verification are separate checks. None of those checks, by itself, proves patient identity, request freshness beyond the selected session controls, downstream authorization, or clinical-source provenance for unsigned raw FHIR JSON.

### 8.8 Required validation checklist

#### 8.8.1 Verifier checklist

A Verifier implementing the same-device `org-iso-mdoc` flow SHALL validate at least the following before accepting the returned SMART response for Requester use:

| Layer | Required validation |
| --- | --- |
| Original request | The original SMART request is valid under §5 and retained for §6.6 cross-validation. |
| Request construction | The Verifier used protocol `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, tag-24 `ItemsRequest`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, requested element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`. |
| Session setup | `encryptionInfo` has the direct `"dcapi"` shape with fresh nonce and P-256 recipient public key; the expected `SessionTranscript` is derived from the exact `encryptionInfoBase64Url` and origin. |
| Reader authentication | If deployment policy requires `readerAuth`, it is present, cryptographically valid, bound to the same `SessionTranscript` and exact tag-24 `ItemsRequest`, and trusted under policy. If `readerAuth` is absent or fails, that state is not conflated with trusted reader authentication. |
| Response wrapper | Returned protocol is `org-iso-mdoc`; `data.response` base64url-decodes to `dcapiResponse = ["dcapi", {"enc": bstr, "cipherText": bstr}]`. |
| HPKE | HPKE opening succeeds with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty `aad`. |
| `DeviceResponse` | Plaintext parses as CBOR `DeviceResponse`; version is `"1.0"`; status is successful; a document has `docType` `org.smarthealthit.checkin.1`. |
| Issuer/MSO | `issuerAuth` verifies as ES256 `COSE_Sign1`; MSO `docType`, `digestAlgorithm`, validity information, value digests, device key, and issuer evidence satisfy §7.3 and deployment policy. |
| Digest binding | The disclosed tag-24 `IssuerSignedItem` for namespace `org.smarthealthit.checkin` hashes to the corresponding MSO value digest. |
| Stable element | The accepted disclosed element has `elementIdentifier` `smart_health_checkin_response` and a string `elementValue`. |
| Device proof | `deviceSignature` verifies with `MSO.deviceKeyInfo.deviceKey` over `DeviceAuthentication` bound to the expected `SessionTranscript`, `docType`, and `DeviceNameSpaces`. |
| SMART response | Extracted JSON validates as a SMART response under §6. |
| Request/response cross-validation | §6.6 checks pass: exact `requestId` match, `fulfills[]` references resolve, Artifact `mediaType` is accepted by each fulfilled item, `requestStatus[]` covers every request item exactly once, and FHIR/SMART Health Card checks are applied. |
| Trust interpretation | §7 and deployment policy are applied without treating transport success as clinical-source provenance or patient identity proof. |

#### 8.8.2 Wallet/Responder checklist

A Wallet/Responder implementing the same-device flow SHALL validate at least the following before disclosing content:

| Layer | Required validation |
| --- | --- |
| Request wrapper | Protocol is `org-iso-mdoc`; `data.deviceRequest` and `data.encryptionInfo` are present, base64url-decodable, and CBOR-decodable. |
| `DeviceRequest` | Version is `"1.0"`; a tag-24 `ItemsRequest` is present for `docType` `org.smarthealthit.checkin.1`; the exact tag-24 bytes are preserved for `readerAuth`. |
| `ItemsRequest` | Namespace `org.smarthealthit.checkin` requests element `smart_health_checkin_response`; `intentToRetain` is recovered for display or policy. |
| SMART request | `requestInfo["org.smarthealthit.checkin.request"]` is present as a string; parsed JSON validates under §5. |
| Session binding | `SessionTranscript` is recomputed from exact `encryptionInfoBase64Url` and authenticated origin or deployment-approved origin-equivalent context. |
| Reader authentication | Present `readerAuth` is verified or classified as syntactically invalid, cryptographically failed, valid but untrusted, or trusted; absent `readerAuth` remains distinct. |
| Holder control | Holder review or equivalent Wallet policy operates at request-item granularity and preserves item ids for response accounting. |
| Response construction | The SMART response conforms to §6, uses `requestId` equal to request `id`, and is placed as the `smart_health_checkin_response` issuer-signed element. |
| mdoc and encryption | IssuerSignedItem, MSO, `issuerAuth`, `DeviceAuthentication`, device signature, `DeviceResponse`, HPKE encryption, and outer DC API response follow §§8.5-8.6. |

#### 8.8.3 Deployment-profile items

A deployment profile that constrains this flow SHOULD define any additional requirements for authenticated origin, privileged-browser allow-lists, mandatory `readerAuth`, reader certificate path validation, revocation or status checking, issuer trust anchors, self-attested issuer labeling, nonce length, replay handling, fixture requirements, size limits, duplicate document/element handling, Holder display, logging, telemetry, and downstream clinical-source acceptance.

### 8.9 Annotated end-to-end byte capture

This section defines the construction. Appendix D is expected to provide the authoritative fixture index, and Appendix E is expected to provide the annotated byte ladder. They should derive from this section and should not introduce alternate field names, alternate request carriers, alternate response carriers, or alternate clinical semantics.

Confirmed active same-device fixture roots include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

Appendix E should annotate, where fixtures provide the bytes, the ladder from SMART request JSON to tag-24 `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `dcapiInfo`, `SessionTranscript`, optional `ReaderAuthentication`, SMART response JSON, tag-24 `IssuerSignedItem`, MSO digest, `issuerAuth`, `DeviceAuthentication`, device signature, `DeviceResponse`, HPKE `enc` and ciphertext, `dcapiResponse`, and extracted SMART response validation against the original SMART request. This section intentionally does not fabricate inline byte captures.

---

## 9. Reserved

Section 9 is intentionally reserved. Earlier drafts explored a cross-device kiosk wrapper, but SMART Health Check-in 1.0 does not define a QR-code, NFC, deep-link, pointer, relay, submission, or completion-display protocol. In-person handoff mechanisms are deployment-defined UX that can land the Holder on a same-device Verifier page running the §8 flow.

---

## 10. Reserved future OID4VP binding

This section is reserved for a future OpenID4VP binding. SMART Health Check-in 1.0 does not define an OID4VP request object mapping, `vp_token` response mapping, DCQL profile, wallet invocation contract, verifier redirect pattern, or conformance target for OID4VP.

A future binding can carry the same transport-neutral SMART request and SMART response model defined in §§5-6, but it will need its own presentation binding, trust processing, replay/freshness model, response validation profile, registry entries, examples, and fixtures. Such work must not weaken the direct same-device `org-iso-mdoc` requirements in §§7-8 or introduce requester identity metadata into the SMART request body.

---

## 11. Security considerations

This section summarizes security properties and residual risks for SMART Health Check-in 1.0. It does not introduce a new presentation protocol, clinical provenance framework, production key-custody profile, or platform-specific Android/iOS implementation guide. Implementers should read each subsection as a threat check over the normative flows defined earlier: the transport-neutral SMART request and SMART response in §§5-6, the trust framework in §7, and the same-device direct `org-iso-mdoc` flow in §8.

Security claims are layered. Origin evidence, privileged-caller policy, optional reader authentication, mdoc issuer/device evidence, SMART response validation, SMART Health Card signatures, raw-FHIR provenance, §8 HPKE confidentiality, identifier binding, and downstream clinical policy are separate controls. A component SHALL NOT describe one successful control as proof that another control succeeded unless this specification or an explicit deployment profile defines that assurance relationship.

Cross-device or in-person initiation, including QR, NFC, deep-link, paper, or badge-tap UX, is deployment behavior that may load a same-device page which then runs the §8 flow. SMART Health Check-in 1.0 does not standardize a pointer URL format, request-envelope protocol, relay/storage protocol, response-submission protocol, or cross-device cryptographic wrapper.

### 11.1 Same-device encryption requirements

In the normative §8 presentation flow, the Wallet/Responder encrypts the CBOR `DeviceResponse` to the Verifier's HPKE recipient public key from `encryptionInfo`, using DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD. The `SessionTranscript` binds the exact `encryptionInfo` base64url string and the authenticated origin or deployment-approved origin-equivalent.

A Verifier MUST NOT accept plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a substituted HPKE suite, or a response whose HPKE context is not bound to the expected transcript. A Wallet/Responder or Verifier SHALL NOT downgrade active version 1.0 ciphertexts to plaintext transport, substitute a different encryption context, or treat successful decryption as sufficient clinical validation. Encryption protects confidentiality and context binding for the encrypted bytes. It does not by itself prove Holder consent, patient identity, requester identity, reader trust, issuer trust, clinical-source provenance, response semantic validity, or downstream authorization.

Implementations SHALL keep §8 HPKE keys, recipients, transcript inputs, algorithm identifiers, ciphertext fields, plaintexts, and validation results separate from any deployment-local transport, storage, diagnostic, or cross-device initiation mechanism.

### 11.2 Replay and freshness

Freshness is supplied by same-device presentation-session mechanisms rather than by the transport-neutral SMART request or SMART response alone. `SmartHealthCheckinRequest.id`, `SmartHealthCheckinResponse.requestId`, request item ids, and Artifact ids are correlation and accounting values; they are not freshness proofs.

For §8, freshness comes from fresh unpredictable `encryptionInfo.nonce` bytes, the Verifier's retained HPKE recipient key material, the exact `encryptionInfo` base64url string, the authenticated origin or deployment-approved origin-equivalent, the resulting `SessionTranscript`, optional `readerAuth` bound to that transcript and exact tag-24 `ItemsRequest` bytes, and device authentication bound to the same transcript. A Verifier SHOULD use a fresh HPKE recipient key pair for each presentation session. A deployment profile that permits HPKE recipient-key reuse needs explicit replay, correlation, retention, and key-compromise handling.

Requesters and Verifiers should maintain workflow state sufficient to reject stale, duplicate, mismatched, or superseded SMART responses. Clinical acceptance cannot depend solely on identifier equality; it also needs §6 response validation, §7 trust interpretation, §8 validation, Holder-control semantics, and downstream policy.

### 11.3 Origin spoofing and UI redress

Origin evidence comes from the Browser / User Agent, Credential Manager, platform channel, or deployment-approved privileged-caller mechanism. It does not come from the SMART request JSON, a launch URL, a link host name, `purpose`, item `title`, item `summary`, selector URLs, callback-looking strings, package-looking strings, logos, common names, unknown extension members, or returned Artifact contents.

A Wallet/Responder that uses origin trust SHALL use authenticated platform-provided origin information, or an explicitly approved origin-equivalent defined by deployment policy, for §8 `SessionTranscript` construction and Holder display. If origin cannot be authenticated, the Wallet/Responder SHALL treat origin trust as absent and SHALL NOT silently substitute request display text, launch-page metadata, or deployment-local metadata as verified origin.

User interfaces SHOULD reduce origin spoofing and redress risk by distinguishing authenticated origin, privileged-caller evidence, trusted reader information, issuer/device evidence, and local-policy warnings from unauthenticated SMART request display text. A malicious Requester can choose misleading `purpose`, item titles, summaries, profile URLs, or Questionnaire text. A Wallet/Responder MAY display those fields as workflow context, but SHALL NOT label them as verified organization identity.

In-person initiation surfaces add UI-redress risk because the Holder may see a public display, printed code, badge, or link before a same-device page launches the §8 flow. Scanning a code, tapping an NFC tag, opening a familiar-looking page, or clicking a page button is not Holder consent. The same-device page still needs to invoke the Wallet/Responder for §8 validation and Holder review before disclosure.

### 11.4 Reader impersonation

Reader / Verifier authentication is optional in the core version 1.0 flow unless a deployment profile requires it. When present, §8 uses per-`DocRequest.readerAuth`, not `DeviceRequest` version `"1.1"` `readerAuthAll`, as the core mechanism. The `readerAuth` value is a detached `COSE_Sign1` using ES256 / COSE `alg` `-7` over tag-24 `ReaderAuthentication` that binds the exact `SessionTranscript` and exact tag-24 `ItemsRequest` bytes. The serialized `COSE_Sign1` payload is `null`; reader certificate evidence is carried in COSE header label `33` (`x5chain`) with at least the leaf certificate.

A Wallet/Responder that supports or relies on reader authentication SHALL verify the signature, detached-payload binding, protected algorithm, signing key, certificate or key evidence, `SessionTranscript`, exact `ItemsRequest` bytes, and deployment trust policy before treating the reader as authenticated. The Wallet/Responder SHALL distinguish absent `readerAuth`, malformed `readerAuth`, cryptographically failed `readerAuth`, cryptographically valid but untrusted or policy-unacceptable `readerAuth`, and trusted `readerAuth`. It SHALL NOT treat the mere presence of `readerAuth`, `x5chain`, a common name, a logo, a `kid`, a launch URL, or a demo certificate as successful reader authentication.

Successful reader authentication proves possession of the accepted reader private key for the signed request bytes and session. It does not prove patient identity, Holder consent, clinical-source provenance, EHR write-back authorization, downstream clinical appropriateness, or legal authority to consume returned content. A Wallet/Responder that proceeds after absent or failed reader authentication must not label the request as reader-authenticated.

### 11.5 Issuer trust pivots

The same-device mdoc layer can show that the SMART response element was carried in an mdoc `DeviceResponse`, that disclosed issuer-signed items hash to MSO digests, that `issuerAuth` verifies under issuer evidence, and that device authentication is bound to the expected `SessionTranscript`. These are presentation-container, issuer/device, and session-binding properties. They are not automatically production issuer accreditation and are not clinical-source provenance for every returned Artifact.

A Verifier SHALL complete the §8 mdoc validation checklist and apply §7 issuer/device trust policy before claiming production issuer trust. A syntactically valid MSO, matching digest, valid signature against an included certificate, valid device-key proof, successful HPKE opening, origin binding, readerAuth validation, or exact request-id match does not by itself prove production issuer accreditation, patient matching, clinical correctness, clinical-source provenance, downstream authorization, or EHR write-back permission.

Issuer/device trust also must not be pivoted into clinical-source trust. A Verifier or receiver SHALL treat raw `application/fhir+json` Artifacts as patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof. SMART Health Card Artifacts carry signed clinical-source evidence inside `value.verifiableCredential[]`, but receivers still need to verify those JWSs according to SMART Health Cards and local trust policy.

Self-attested, local, fixture, test, demo, or deployment-specific issuer evidence can be useful for development or local assurance, but it must not be relabeled as external production issuer trust unless the applicable trust-anchor policy supports that claim. Demo issuer keys, demo reader certificates, checked-in fixture keys, and example issuer/audience strings are intentionally non-production evidence unless a controlled test deployment explicitly says otherwise.

### 11.6 Cryptographic agility

Version 1.0 fixes active algorithm choices in named profile rules rather than negotiating arbitrary algorithms in band. The §8 direct `org-iso-mdoc` flow uses `DeviceRequest.version` `"1.0"`, ES256 / COSE `alg` `-7` where this profile signs reader, issuer, or device structures, and HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM for response encryption.

Implementations SHALL reject unsupported or unexpected algorithm labels for the version 1.0 profile they implement rather than silently downgrading, ignoring algorithm labels, substituting library defaults, accepting deployment-supplied alternatives, or treating locally available WebCrypto, COSE, HPKE, or platform algorithms as implicitly valid. Implementations should fail closed on unknown versions, malformed base64url, unexpected mdoc structures, unexpected request carriers, legacy dynamic element-name encodings, or inline same-device request encodings unless a future version or deployment profile explicitly defines compatible processing.

Future cryptographic agility should be introduced through explicit versioned profiles, registry entries, deployment profiles, and conformance vectors. Such work should define wire identifiers, key formats, transcript construction, downgrade prevention, mixed-version behavior, deprecation timelines, key-use separation, fixture coverage, and how Wallets and Verifiers report unsupported profiles. Production deployments also need key lifecycle policy for reader keys, §8 HPKE recipient keys, issuer anchors, rotation, revocation/status checks, compromise response, and test-vs-production separation.

### 11.7 Plaintext leakage

Clinical content, secrets, and sensitive metadata can leak outside cryptography through logs, developer panels, crash reports, browser storage, analytics, screenshots, public displays, database indexes, debug bundles, support exports, console output, clipboard/share flows, and fixture captures. Implementations SHOULD minimize collection, display, and retention of plaintext SMART requests, SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, §8 `DeviceResponse` plaintext, `dcapiResponse` or `deviceResponse` internals, §8 HPKE `enc` or `cipherText`, §8 `deviceRequest`, §8 `encryptionInfo`, Wallet secrets, shared secrets, access tokens, bearer URLs, full launch URLs, full QR images, and valid-id enumeration clues except under controlled diagnostic or fixture procedures.

Diagnostic fixtures can include intentionally public test private keys, demo certificates, decrypted payloads, or non-PHI sample data only when clearly labeled as fixture material and separated from production traffic. A fixture, crash bundle, debug export, or support bundle containing live PHI, production private keys, bearer credentials, or unredacted clinical content is a security incident, not a conformance artifact. Active demos may expose technical details for inspection; that behavior is useful for development but is not a production UI, logging, or key-custody pattern.

Plaintext-leakage controls should apply before and after cryptographic validation. Malformed requests, unsupported Wallet responses, and attacker-controlled display text can still contain sensitive-looking or harmful text and should be handled with bounded parsing, sanitized diagnostics, and recoverable errors that do not reveal request-id validity, deployment internals, stack traces, clinical content, or secrets.

### 11.8 Wallet UX guarantees

Wallet UX is a security control because Holder-mediated disclosure is central to the protocol. A Wallet/Responder SHALL validate the incoming §8 request before disclosure, recover the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, compute the `SessionTranscript` from authenticated origin or approved origin-equivalent context, classify reader authentication accurately, and perform Holder review or equivalent Holder-control processing at request-item granularity before disclosing content through §8 unless an explicit deployment profile defines another Holder-control mechanism and assurance level.

A Wallet/Responder SHALL preserve request item `id` values for fulfillment and status accounting and SHALL construct `requestStatus[]` so every original request item is covered exactly once when it returns a SMART response. It SHOULD make requested content, accepted media types, broad selectors, and item outcomes understandable to the Holder, subject to accessibility, localization, safety, applicable law, and local policy. It MAY group, summarize, reorder, or suppress display details for those reasons, but it SHALL NOT hide multiple items or broad selectors in a way that defeats meaningful Holder control.

The advisory `required: true` flag, mdoc `intentToRetain`, launching a page from a QR, NFC tag, deep link, or other deployment UX, invoking the Digital Credentials API, or clicking a button outside the Wallet is not Holder consent by itself. The Wallet/Responder needs to support meaningful refusal and partial sharing. Unsupported selectors, unavailable data, Holder refusal, partial fulfillment, and item-level processing errors are §6 response outcomes when the request was otherwise valid enough to answer; they are not automatically transport failures.

Wallets and same-device pages SHOULD distinguish authenticated trust signals from unauthenticated display context. They should avoid representing `purpose`, item text, selector URLs, profile URLs, link origins, demo keys, or demo branding as verified requester identity. They should also avoid overpromising clinical provenance for raw FHIR JSON or implying that successful transport encryption means a returned Artifact is clinically complete, current, source-provenanced, or suitable for downstream ingestion. If required evidence is absent, failed, untrusted, expired, revoked, unsupported, ambiguous, or inconsistent, the Wallet/Responder should follow local policy and any deployment profile: reject, proceed with reduced assurance, require additional Holder confirmation, restrict returned content, warn the Holder, or otherwise fail safely.

---

## 12. Privacy considerations

SMART Health Check-in is Holder-mediated, but Holder mediation alone is not sufficient privacy protection. Clinical payloads, request context, item choices, refusal decisions, timing, routing metadata, logs, and retained operational state can all reveal health-care activity. Privacy controls therefore need to apply to the transport-neutral SMART request and response, the same-device `org-iso-mdoc` presentation flow, and downstream workflow handling.

This section does not define a second consent protocol, requester-identity proof, retention schedule, Wallet storage model, EHR ingestion policy, cross-device transport, or platform-specific implementation guide. It identifies privacy responsibilities that follow from the version 1.0 fields and flows defined in §§5-8. Cross-device or in-person initiation, including QR, NFC, deep-link, paper, or badge-tap UX, is implementation-defined deployment behavior that may load a same-device page which then runs §8; SMART Health Check-in 1.0 specifies no pointer/envelope/relay/submission protocol for that hand-off.

### 12.1 Data minimization and per-item consent

A Requester SHOULD construct each SMART request for the minimum clinical or administrative content needed for the bounded check-in workflow. Even request selectors, `purpose`, item `title`, item `summary`, profile URLs, resource types, Questionnaire references or text, accepted media types, and FHIR version lists can disclose sensitive context. Requesters should prefer narrow request items, selectors, accepted media types, and FHIR versions over broad collection requests unless the workflow and Holder-facing explanation justify the breadth.

The request item is the protocol's Holder-review and response-accounting granularity. Each item has its own `id`, Holder-facing text, selector, `accept[]`, advisory `required` flag, and per-item result in `requestStatus[]`. A Wallet/Responder SHALL preserve item `id` values for fulfillment and status accounting and SHALL provide Holder review, or an equivalent Holder-control mechanism defined by a deployment profile, at request-item granularity before disclosing content. A Wallet/Responder MAY group, summarize, reorder, translate, or suppress details for accessibility, safety, localization, or local policy, but it SHALL NOT hide multiple items, broad selectors, accepted response forms, retention signals, or advisory `required` flags in a way that defeats meaningful Holder control.

`required: true`, mdoc `intentToRetain`, opening a launch URL, scanning a QR code, tapping an NFC tag, loading a same-device page, or clicking a page button is not Holder consent by itself. Holder refusal, partial disclosure, unavailable data, unsupported selectors, and processing errors are expected privacy-preserving outcomes when the request is otherwise valid enough to answer. Requesters and downstream receivers should treat `declined`, `partial`, `unavailable`, `unsupported`, and `error` as normal item-level outcomes and should avoid inferring undisclosed clinical facts from them.

A Wallet/Responder SHOULD return only Artifacts that satisfy approved request items, Holder choices, Wallet policy, available data, and accepted media types. It should avoid returning unrelated FHIR resources, unrelated SMART Health Cards, unnecessary Questionnaire answers, hidden diagnostics, access tokens, internal identifiers, or nonresponsive records merely because they are available in a local Bundle, cached data source, or connected system. If only a subset of matching content is disclosed, `partial` is often more accurate and privacy-preserving than claiming complete fulfillment.

### 12.2 Selective disclosure responsibilities

Selective disclosure in version 1.0 occurs primarily through request-item boundaries, Wallet policy, Holder decisions, Artifact construction, accepted media types, `fulfills[]`, and per-item status reporting. The same-device `org-iso-mdoc` binding carries one stable mdoc element, `smart_health_checkin_response`, whose value is the SMART response JSON. It does not model each FHIR profile, Questionnaire, request item, clinical resource, or Artifact as a separate mdoc element. Implementations therefore cannot rely on mdoc element selection alone to minimize clinical disclosure inside the SMART response.

A Wallet/Responder SHOULD construct the smallest set of Artifacts that accurately satisfies the approved items and accepted response forms. If one Artifact fulfills multiple items, each listed item needs to accept the Artifact `mediaType`, and the Artifact should be responsive to every listed item without over-disclosing relative to the Holder's decisions. Where separating Artifacts would materially reduce disclosure and remain interoperable, the Wallet/Responder should prefer the less-disclosing packaging.

A Verifier, Requester, or receiver is responsible for validating `requestId`, `fulfills[]`, `requestStatus[]`, Artifact ids, media types, FHIR-version context, and any clinical-source evidence before workflow use. It should reject, quarantine, suppress, or locally minimize content that is not responsive to the original request rather than retaining or redisclosing it by default.

SMART Health Card Artifacts and raw FHIR JSON Artifacts have different privacy and provenance properties. SMART Health Card Artifacts carry signed clinical-source evidence inside `value.verifiableCredential[]`, but receivers still need to verify those JWSs and apply local trust policy. Raw `application/fhir+json` Artifacts remain patient-mediated unless the payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof. A receiver should not use mdoc issuer/device evidence, HPKE opening, Artifact ids, `fulfills[]`, `requestId` matching, or Holder approval to imply clinical-source provenance for unsigned raw FHIR JSON.

Artifact ids and request item ids are accounting values, not global tracking identifiers. A Wallet/Responder SHOULD NOT place patient identifiers, requester identifiers, secrets, clinical facts, cross-session tracking values, or source-system document ids in `SmartHealthCheckinRequest.id`, item `id`, Artifact `id`, `requestStatus[].message`, extension member names, URL paths, or locators unless that meaning is separately required and protected by the Artifact payload or deployment policy. A receiver SHALL NOT treat Artifact ids as patient ids, global document ids, provenance ids, or source-system ids unless independent payload evidence or deployment policy establishes that meaning.

### 12.3 Cross-verifier linkability and identifier reuse

Identifiers and metadata in this profile are scoped by layer. `SmartHealthCheckinRequest.id` is scoped to the Requester's check-in session and is echoed as `SmartHealthCheckinResponse.requestId`. Request item ids are scoped to one request. Artifact ids are scoped to one SMART response. Same-device presentation values such as `encryptionInfo`, nonces, `SessionTranscript` inputs, reader-authentication material, origin evidence, and mdoc issuer/device evidence have presentation-session scopes.

Requesters, Verifiers, Wallets/Responders, receivers, and deployment profiles SHOULD avoid reusing these identifiers across unrelated check-in sessions, unrelated Verifiers, or unrelated Holders. They should not embed patient account numbers, medical record numbers, insurance member ids, phone numbers, email addresses, appointment ids, staff ids, clinic ids, source document ids, or predictable sequence numbers in SMART request ids, item ids, Artifact ids, telemetry event ids, or log correlation ids unless a deployment profile explicitly requires that identifier and defines its privacy controls.

High-entropy identifiers resist guessing, but they remain correlation handles while visible or retained. A Verifier SHOULD use fresh §8 HPKE recipient key material and fresh nonce values for each presentation session. A deployment profile that permits recipient-key reuse needs explicit privacy handling for correlation, retention, key compromise, replay, and logs. Deployment-local launch URLs, QR codes, NFC tags, routing identifiers, or storage handles can also become correlation handles; because they are not standardized by SMART Health Check-in, their privacy controls are deployment responsibilities.

### 12.4 Wallet rendering of requester intent

Wallet rendering is a privacy control because the Holder's decision depends on understanding both the requested content and the trust evidence. The SMART request body intentionally carries Holder-facing workflow context, not authenticated requester identity. `purpose`, item `title`, item `summary`, selector URLs, profile-family URLs, Questionnaire text, advisory `required`, unknown members, extension members, launch-page text, logos, common names, demo branding, and callback-looking strings can be chosen by a malicious or mistaken Requester or deployment page.

A Wallet/Responder MAY display those fields as request context, but SHALL NOT label them as verified requester identity, authenticated origin, trusted reader identity, clinical-source provenance, legal authority, or consent text unless the same fact is established by the selected presentation transport, accepted reader authentication, issuer/device trust evidence, or another deployment-approved trust layer. If authenticated origin, privileged-caller evidence, trusted reader authentication, or local policy warnings are available, the display SHOULD distinguish those signals from unauthenticated SMART request text.

Wallets/Responders SHOULD make privacy-relevant consequences understandable at item granularity when possible: requested categories, accepted media types such as `application/fhir+json` and `application/smart-health-card`, broad or no-selector requests, advisory required items, retention signals, partial or declined outcomes, and available Holder choices. User interfaces may summarize for accessibility, localization, safety, or local policy, but summaries should not overstate requester authenticity, provenance, completeness, retention, or clinical authority.

In-person initiation is not the consent surface. A public display, launch page, link origin, or demo brand should not be rendered as verified requester identity or as proof that the Holder agreed to disclose content. Disclosure still depends on §8 validation and Holder review or an equivalent Holder-control mechanism defined by a deployment profile.

### 12.5 Storage retention defaults

SMART Health Check-in commonly supports workflows that ingest, route, attach, reconcile, audit, or otherwise retain returned Artifacts. For that reason, the §8 `intentToRetain` value for `smart_health_checkin_response` defaults to `true`. That default is a retention signal for Holder review and Wallet policy; it does not override Holder choice, Wallet policy, applicable law, privacy notices, legal holds, audit duties, downstream EHR record-management requirements, or this section's minimization guidance.

A Verifier MAY set `intentToRetain` to `false` only when it truly intends ephemeral use and applicable deployment policy permits that signal. A Requester, Verifier, or downstream receiver that will store, import, attach, audit, reconcile, route, or retain returned content should not represent the interaction as ephemeral merely because transport ciphertext, browser state, launch-page state, or local workflow state are short-lived.

Retention policies SHOULD account for metadata as well as plaintext. SMART request ids, request item ids, Artifact ids, origins, package names, certificate subjects, IP addresses, user agents, timestamps, launch timing, QR display or scan timing, payload sizes, error strings, validation outcomes, and access patterns can reveal check-in activity even when clinical payloads are encrypted. Logs, database indexes, dashboards, analytics stores, support exports, crash reports, screenshots, browser storage, and debug panels should use the shortest useful retention and least identifying form compatible with operational, security, legal, and clinical needs.

Diagnostic fixtures may intentionally retain public test keys, demo certificates, decrypted payloads, or non-PHI sample data when clearly labeled as fixture material and separated from production systems. A live fixture, support bundle, crash report, debug export, or telemetry event containing PHI, production private keys, bearer credentials, access tokens, unredacted clinical payloads, or reusable request-opening material should be treated as sensitive production data and handled under incident, audit, or retention policy rather than as ordinary conformance evidence.

### 12.6 Sensitive category handling

Clinical and administrative check-in requests can implicate sensitive categories such as mental health, substance-use treatment, reproductive or sexual health, HIV or other infectious-disease information, genetic information, disability information, medications, immunization status, minors' records, proxy or guardian relationships, payer or coverage details, address or contact-safety information, immigration- or employment-sensitive information, and free-text Questionnaire answers. This specification does not define a universal sensitivity taxonomy, consent law, segmentation rule, or access-control policy. Implementations should assume that both content and context can be sensitive.

Requesters SHOULD avoid broad or ambiguous items when a narrower selector, Questionnaire, accepted media type, or separate request item would satisfy the workflow with less sensitive disclosure. When a workflow specifically needs sensitive-category content, the item `title`, `summary`, selector, and accepted media types should make that need understandable to the Holder without embedding unnecessary sensitive facts in ids, URL paths, telemetry labels, or deployment metadata. Combining unrelated sensitive and non-sensitive content into one broad item can pressure the Holder into over-disclosure.

Wallets/Responders SHOULD apply local sensitive-data policy, Holder preferences, jurisdictional requirements, and available labels or provenance when deciding what to show, suppress, redact, group, return, or refuse. A Wallet/Responder MAY apply stricter review, additional warnings, separate confirmation, data-source selection, redaction, suppression, refusal, or item-level `declined`, `partial`, `unavailable`, `unsupported`, or `error` status for sensitive items, broad selectors, no-selector requests, inline Questionnaires, raw FHIR JSON, or unauthenticated or untrusted contexts.

Receivers should not infer that a missing Artifact or non-fulfilled status means the Holder has, lacks, refused, or concealed a particular condition, medication, coverage status, relationship, or questionnaire answer. It can reflect Holder choice, Wallet policy, legal restriction, lack of access, unavailable source data, unsupported format, partial fulfillment, validation failure, or error. `requestStatus[].message` and user-facing errors should be concise and should avoid unnecessary patient details, sensitive diagnoses, source-system names, Holder reasoning, secrets, stack traces, or diagnostic internals.

Public and shared-device contexts need additional care. QR codes, shared screens, staff desktops, phone pages, browser histories, debug panels, queue monitors, printed materials, and photographed screens should not display patient-specific clinical details, sensitive category labels, item-level refusals, returned Artifacts, or staff-only diagnostics beyond what is necessary for safe workflow recovery and authorized review.

### 12.7 Telemetry guidance

Telemetry, analytics, logs, metrics, crash reports, support bundles, observability traces, fixtures, database indexes, browser storage, screenshots, and debug panels can undermine privacy even when protocol encryption is correct. Implementations SHOULD collect the minimum telemetry needed for reliability, security monitoring, abuse prevention, conformance testing, and support, and should prefer aggregate counts, coarse categories, sampling, redaction, scoped identifiers, and short retention over raw protocol payloads or stable per-Holder traces.

Implementations SHOULD NOT send plaintext SMART requests, plaintext SMART responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, item-level Holder decisions, §8 `DeviceResponse` plaintext, `dcapiResponse` or `deviceResponse` internals, §8 HPKE `enc` or `cipherText`, request-opening private keys, Wallet secrets, shared secrets, credentials, access tokens, bearer URLs, full launch URLs, full QR images, or unredacted stack traces containing those values to routine telemetry, analytics, crash reporting, or support systems except under controlled diagnostic, fixture, audit, or incident-response procedures with appropriate authorization and labeling.

Operational metadata should also be minimized. Potentially sensitive telemetry includes SMART request ids, request item ids, Artifact ids, origins, package names, certificate subjects, IP addresses, user agents, timestamps, QR display or scan timing, retry sequences, payload sizes, error strings, and validation outcomes. Hashing, truncation, or pseudonymization can reduce risk, but stable hashes of low-entropy or reused identifiers can still enable correlation. Deployments should prefer scoped, rotating, purpose-specific telemetry identifiers and should separate operational security logs from product analytics when possible.

User-facing and operator-facing errors SHOULD support safe recovery without revealing clinical content, secrets, stack traces, deployment internals, or valid-id enumeration clues beyond what the Holder or authorized staff need to proceed. A same-device page can guide the Holder to restart from a current launch surface or seek staff assistance without revealing whether a guessed identifier, stale URL, or malformed request was valid.

---

## 13. Registry and IANA considerations

### 13.1 Media type registrations / references

The transport-neutral SMART request discriminator is `type: "smart-health-checkin-request"` with `version: "1"`. The transport-neutral SMART response discriminator is `type: "smart-health-checkin-response"` with `version: "1"`. These are protocol constants, not media types, not mdoc identifiers, not JOSE `typ` values, and not profile identifiers.

SMART Health Check-in 1.0 uses media type strings for clinical Artifact negotiation and validation in `SmartHealthCheckinRequest.items[].accept[]` and `SmartHealthCheckinResponse.artifacts[].mediaType`. Implementations compare the string values in this section by exact, case-sensitive string equality unless a future registered extension explicitly defines other processing.

| Media type | SMART Health Check-in 1.0 use | Registry posture |
| --- | --- | --- |
| `application/fhir+json` | Core clinical Artifact media type for raw FHIR JSON Resources or Bundles. A conforming SMART Health Check-in Artifact using this media type carries `value` as FHIR JSON and carries an outer `fhirVersion`. | Externally defined by the FHIR ecosystem and referenced by this specification. SMART Health Check-in does not redefine it or request a new registration for it. |
| `application/smart-health-card` | Core clinical Artifact media type for SMART Health Card file-style JSON with `value.verifiableCredential[]`. A conforming SMART Health Check-in Artifact using this media type does not carry an outer Artifact-level `fhirVersion`. | Externally defined or governed by SMART Health Cards and referenced by this specification. SMART Health Check-in does not redefine it or claim ownership of it. |

A Wallet/Responder SHALL NOT claim that an Artifact fulfills a request item unless the Artifact `mediaType` appears in that item's `accept[]`, except where a registered media-type compatibility rule explicitly defines compatible substitution semantics and the receiving Verifier supports that rule. A Verifier SHALL apply the corresponding §6.6 validation.

The version 1.0 core Artifact union contains only the two core media types above. The Artifact type list is extensible by future revisions or registered extensions, but each extension Artifact type SHALL be a branded variant with a pinned `mediaType` literal or clearly bounded media-type pattern and its own typed fields. A future Artifact media-type registration for SMART Health Check-in use SHALL define the exact media type string; payload shape; which fields carry the payload; encoding; dereferencing and integrity rules if any; FHIR-version semantics if any; validation behavior; status-code interaction; security considerations; privacy considerations; and any compatibility with existing media types. A media-type extension SHALL NOT introduce a generic catch-all Artifact branch or redefine the semantics of SMART request or response core fields.

### 13.2 mdoc registry entries

The version-1 same-device presentation binding uses the W3C Digital Credentials API direct mdoc protocol id:

```text
org-iso-mdoc
```

SMART Health Check-in references `org-iso-mdoc` as the active Digital Credentials API protocol id for this flow. This specification does not create that protocol id and does not claim an IANA media-type registration for it.

The SMART Health Check-in mdoc profile uses these version-1 identifiers:

| Identifier kind | Value | Defined use |
| --- | --- | --- |
| Digital Credentials API protocol id | `org-iso-mdoc` | Direct same-device mdoc presentation protocol used by §8. |
| mdoc `docType` | `org.smarthealthit.checkin.1` | SMART Health Check-in 1.0 document type requested by Verifiers and returned by Wallets/Responders. |
| mdoc namespace | `org.smarthealthit.checkin` | Namespace containing the stable SMART response element. |
| Requested and disclosed element | `smart_health_checkin_response` | Issuer-signed element whose `elementValue` is the JSON text serialization of a `SmartHealthCheckinResponse`. |
| SMART request carrier key | `org.smarthealthit.checkin.request` | `ItemsRequest.requestInfo` key whose value is the JSON text serialization of a `SmartHealthCheckinRequest`. |

A Verifier claiming the version-1 direct mdoc profile SHALL use the values above exactly. It SHALL carry the SMART request only at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` and SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element `smart_health_checkin_response`.

A Wallet/Responder claiming the version-1 direct mdoc profile SHALL disclose the SMART response as the `elementValue` of `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. It SHALL NOT treat dynamic element names, archived claim-name experiments, individual FHIR profiles, request items, Artifact media types, Questionnaires, status codes, or locally chosen namespaces as alternate version-1 core carriers.

These values are SMART Health Check-in profile identifiers for use in the mdoc / ISO / Digital Credentials ecosystem. Registration, reservation, or publication in an applicable external registry may be needed for some deployments, but this specification does not assert that such external registration is complete. Future incompatible mdoc-carrier changes SHOULD use a new profile identifier and, when necessary, a new `docType` suffix rather than changing the meaning of `org.smarthealthit.checkin.1` in place.

### 13.3 Status code registry

SMART Health Check-in maintains a specification-controlled registry for `SmartHealthCheckinResponse.requestStatus[].status`. Version 1.0 defines these initial entries:

| Code | Semantics |
| --- | --- |
| `fulfilled` | The Wallet/Responder believes the request item was fully satisfied by returned Artifact content. |
| `partial` | The Wallet/Responder returned some relevant Artifact content for the item but does not claim complete fulfillment. |
| `unavailable` | The Wallet/Responder understood the item and supported the requested selector and media type, but found no matching content available or shareable under Wallet policy, without Holder refusal being the relevant cause. |
| `declined` | The Holder declined to share content for the item, or Wallet policy treated the Holder decision as a refusal for this item. |
| `unsupported` | The Wallet/Responder could not understand or support the item, selector kind, selector shape, requested media type, required Questionnaire features, canonical/resource combination, FHIR version, or extension semantics well enough to attempt fulfillment. |
| `error` | The Wallet/Responder encountered an operational or processing error while attempting to satisfy the item after it was understood and was not simply declined, unavailable, or unsupported. |

A Wallet/Responder SHALL use only these status codes in a SMART Health Check-in 1.0 response unless a future registered status-code extension is explicitly supported by the receiving Verifier. A Verifier SHALL treat an unknown status code as invalid for version 1.0 response validation unless it explicitly supports the corresponding future registry entry.

A future status-code registration SHALL define the exact code string; lifecycle status; semantics; how the code differs from the six core codes; allowed or expected relationship to returned Artifacts; interaction with `required`, selector kinds, media types, Holder choice, `message`, and §6.6 validation; Wallet/Responder construction rules; Verifier validation and display behavior; unsupported-recipient behavior; security considerations; privacy considerations; and at least one example or conformance test. New status codes SHALL NOT redefine any of the six version-1 codes or remove the requirement that `requestStatus[]` account for every request item exactly once.

### 13.4 Content-selector kind registry

SMART Health Check-in maintains a specification-controlled registry for `SmartHealthCheckinRequest.items[].content.kind`. Version 1.0 defines these initial entries:

| Selector kind | Selector shape summary | Semantics |
| --- | --- | --- |
| `fhir.resources` | `content` may include `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` as arrays of strings. | Requests patient-specific FHIR resources. `profiles[]` and `profilesFrom[]` are additive profile selectors; `resourceTypes[]` is an additional official FHIR resource-type constraint when present. |
| `questionnaire` | `content` may include `canonical` as a FHIR canonical string, `resource` as an inline FHIR `Questionnaire`, or both. | Requests completion of, or response to, a FHIR Questionnaire, with returned content represented by an accepted Artifact media type. |

A Requester SHALL use one of these selector kinds or a registered extension selector when interoperable processing by unrelated Wallets/Responders is expected. A Wallet/Responder that does not support a selector kind SHALL NOT infer its semantics from display text, profile labels, local topic names, deployment metadata, or requester identity metadata. It SHALL reject the request or report the affected item as `unsupported` according to the selected flow and §6.

A future selector-kind registration SHALL define the exact `content.kind` string; JSON shape; required and optional members; unknown-member handling; clinical meaning; content-satisfaction rules; interactions with `accept[]`, `fhirVersions[]`, FHIR canonicals and `|version`, item status, Artifact fulfillment, and §6.6 validation; unsupported, unavailable, partial, declined, and error behavior; examples; security considerations; and privacy considerations. Registrants SHOULD choose collision-resistant names, such as reverse-DNS or URI-like names, unless the registry later defines a stricter syntax.

A selector-kind registration SHALL NOT redefine SMART request top-level fields, SMART response fields, `fhir.resources`, `questionnaire`, `profiles[]`, `profilesFrom[]`, `resourceTypes[]`, `accept[]`, Holder control, requester identity handling, canonical-version handling, or trust-layer boundaries.

### 13.5 Profile-id registry

SMART Health Check-in maintains a specification-controlled registry for profile identifiers. A profile identifier names a coherent set of conformance, deployment, fixture, certification, or future-binding rules for one or more targets and feature sets.

Profile identifiers are not SMART request fields, SMART response fields, clinical selectors, Artifact media types, status codes, request presets, IPS shortcuts, “all of the above” shortcuts, topic labels, or substitutes for §5 selectors. A profile identifier SHALL NOT be placed inside a SMART request as `requestProfile`, a preset, an IPS shortcut, an “all of the above” shortcut, a profile-family shortcut, a topic label, or negotiation metadata to bypass §5 selectors, §5 `accept[]`, §6 response validation, §7 trust processing, or §8 validation.

Until final publication registry mechanics are established, SMART Health Check-in 1.0 uses these provisional human-readable labels from §4:

| Profile label | Status | Summary |
| --- | --- | --- |
| `smart-health-checkin-core-1` | Provisional label | Transport-neutral §5 SMART request and §6 SMART response support for the claimed role. |
| `smart-health-checkin-mdoc-dcapi-1` | Provisional label | Direct same-device §8 `org-iso-mdoc` presentation support for the claimed role. |
| `smart-health-checkin-readerauth-1` | Provisional label | Optional per-`DocRequest.readerAuth` construction, validation, and deployment trust-policy support. |
| `smart-health-checkin-fixtures-1` | Provisional label | Umbrella label for named schema, CDDL, fixture, byte-ladder, or conformance-vector profiles. |
| `smart-health-checkin-oid4vp-reserved` | Reserved label | Placeholder for future OID4VP work; not a SMART Health Check-in 1.0 runtime conformance profile. |

A future profile-id registration SHALL define the identifier; versioning policy; lifecycle status; target roles; required and optional features; prerequisite profiles; affected specification sections; allowed extension identifiers; validation obligations; trust-policy assumptions; fixture or conformance expectations when applicable; security considerations; privacy considerations; compatibility behavior; and whether the profile is for runtime interoperability, deployment policy, certification, fixtures, diagnostics, historical captures, or illustrative examples.

A deployment or extension profile MAY impose stricter trust, validation, media-type, selector, size, expiration, replay, duplicate-handling, retention, provenance, or fixture requirements. It SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, core selector kinds, Artifact media-type rules, fulfillment/status accounting, same-device carriers, request/response id separation, §8 cryptographic context, or the §7 trust-layer model.

### 13.6 Designated expert review process

SMART Health Check-in registry changes use designated expert review unless a future governance process or external registry operator defines a stricter process. The expert's role is to protect interoperability, privacy, security, and the architectural invariants of SMART Health Check-in; it is not to approve private business arrangements, production trust anchors, or clinical policy decisions.

Designated expert review applies before an entry is treated as an interoperable SMART Health Check-in registration for:

- new or changed status codes;
- new content-selector `kind` values;
- extension Artifact media types, branded Artifact variants, or media-type compatibility rules for SMART Health Check-in use;
- profile identifiers beyond the provisional and reserved labels in §13.5; and
- future SMART Health Check-in mdoc `docType`, namespace, element, or request-carrier changes.

External registries and specifications, including IANA media types, FHIR, SMART Health Cards, COSE, HPKE, ISO/IEC mdoc structures, Digital Credentials API protocol identifiers, issuer trust lists, and deployment trust frameworks, remain governed by their own processes. SMART Health Check-in review can reference those identifiers but does not replace their external registration or trust-policy review.

A registration request SHOULD include the requested identifier; registry category; lifecycle status; change controller; stable public specification or deployment profile; affected conformance targets, features, and versions; exact syntax; processing rules; validation rules; unsupported-recipient behavior; compatibility or deprecation behavior; examples or conformance tests; security considerations; privacy considerations; logging and retention considerations when applicable; fixture or diagnostic status when applicable; and dependencies on external standards or deployment policy.

The designated expert SHOULD approve a registration only when the request:

1. uses a syntactically clear, stable, and collision-resistant identifier for its registry;
2. identifies the exact target, feature, version, and protocol section affected;
3. preserves the transport-neutral §5/§6 SMART request and SMART response semantics unless the entry is explicitly for a future incompatible version;
4. preserves request/response validation behavior, including `requestId`, `fulfills[]`, `requestStatus[]`, media-type checks, status-code handling, and §6.6 cross-validation;
5. preserves core selector semantics, including `fhir.resources`, `questionnaire`, additive `profiles[]` plus `profilesFrom[]`, `resourceTypes[]`, per-item `accept[]` rules, and canonical `|version` handling;
6. preserves the §7 trust-layer separation among origin evidence, optional reader authentication, mdoc issuer/device evidence, Holder action, and clinical-source provenance;
7. preserves the version-1 same-device identifiers `org-iso-mdoc`, `org.smarthealthit.checkin.1`, `org.smarthealthit.checkin`, `smart_health_checkin_response`, and `org.smarthealthit.checkin.request` unless the registration is explicitly for a future mdoc profile;
8. preserves §8 HPKE transcript binding and same-device validation boundaries;
9. defines unsupported-recipient behavior that lets older implementations reject, ignore, quarantine, or report unsupported without unsafe reinterpretation;
10. includes security and privacy considerations proportionate to the clinical content and metadata involved, including URLs, key identifiers, logs, telemetry, and diagnostic artifacts;
11. avoids requiring intermediaries or deployment-local services to see plaintext SMART requests, SMART responses, raw FHIR content, SMART Health Cards, private keys, shared secrets, or clinical trust decisions merely to route state; and
12. includes enough examples, fixture expectations, or conformance guidance for independent implementation.

The designated expert SHOULD reject or request revision of a registration that redefines existing fields or identifiers; creates ambiguous synonyms for existing status codes or selector kinds; introduces requester identity, organization metadata, trust assertions, callback endpoints, production trust-anchor claims, or deployment-local routing metadata into the SMART request body; turns profile identifiers into in-band request selectors; relies on `requestProfile`, presets, IPS shortcuts, “all of the above” shortcuts, or local topic labels instead of §5 selectors; requires intermediaries to see plaintext clinical content; weakens Holder control or required validation; conflates transport, request, and clinical identifiers; treats demo keys, self-signed fixture material, example issuer/audience strings, or checked-in private keys as production trust anchors; or overclaims clinical-source provenance for unsigned raw FHIR JSON from transport success alone.

Private or deployment-local identifiers MAY be used within a controlled deployment when all participants are configured for them and the deployment accepts the interoperability risk. Such identifiers should be documented as local and must not be represented as SMART Health Check-in-wide registrations when interoperable processing by unrelated implementations is expected.

A provisional or experimental registration SHOULD state its expiration, review checkpoint, or promotion criteria. A deprecated registration remains listed with its prior semantics, replacement guidance if any, and receiver handling expectations; deprecation does not silently change the meaning of already-published SMART Health Check-in 1.0 messages.

---

## 14. Internationalization

### 14.1 Language tags

SMART Health Check-in 1.0 distinguishes human-readable display text from protocol identifiers and other machine-processable values. Internationalization requirements apply only to fields or UI strings intended for human display, including SMART request `purpose`, request item `title`, request item `summary`, SMART response `requestStatus[].message`, display or text strings inside FHIR `Questionnaire` content, human-readable or display strings inside returned FHIR resources, implementation-generated UI prompts, warnings, recovery text, and errors, and extension fields whose registered definition explicitly identifies them as display text.

Protocol identifiers and machine-processable values are not localized. This includes SMART request `type`, `version`, and `id`; request item `id`; Artifact `id`; SMART response `type`, `version`, and `requestId`; `requestStatus[].item`; `requestStatus[].status`; `content.kind`; `profiles[]`; `profilesFrom[]`; `resourceTypes[]`; `accept[]`; media types; status codes; FHIR canonicals and FHIR `resourceType` values when used for protocol validation; mdoc `docType`, namespace, element, and request-info identifiers; algorithm labels; HPKE, HKDF, and COSE label strings; and any deployment-local launch identifiers or URLs.

SMART Health Check-in 1.0 does not define `lang`, `locale`, `Accept-Language`, per-string language maps, negotiated-locale members, or locale parameters in the transport-neutral SMART request, SMART response, or same-device `org-iso-mdoc` binding. An implementation SHALL NOT rely on an unknown SMART request member, unknown SMART response member, browser language value, launch URL parameter, or HTTP header as an interoperable SMART Health Check-in locale-negotiation signal unless a future version, registered extension, or deployment profile explicitly defines that behavior.

When a FHIR resource, registered extension, deployment profile, or implementation-generated UI associates a language tag with human-readable SMART Health Check-in display text, the producer SHOULD use a well-formed BCP 47 language tag. The tag's scope, fallback behavior, and matching behavior are defined by FHIR, by the registered extension, or by the deployment profile that introduced the tag. A missing language tag does not imply English or any other particular language.

FHIR content follows FHIR internationalization and localization behavior. SMART Health Check-in does not redefine `Resource.language`, terminology displays, designations, translation extensions, Questionnaire text and rendering, QuestionnaireResponse construction, narratives, or implementation-guide-specific display rules. A Wallet/Responder, Verifier, or receiver that renders or processes FHIR content SHOULD follow the applicable FHIR version, implementation guide, and local clinical-display policy.

A Requester SHOULD author `purpose`, item `title`, item `summary`, and inline Questionnaire display text in language suitable for the expected Holder review context. A Wallet/Responder MAY translate, summarize, group, reorder, or suppress display text for accessibility, localization, safety, or local policy. If it does so, it SHALL preserve the underlying protocol values used for response construction and validation, including request ids, item ids, selector values, accepted media types, Artifact ids, `fulfills[]`, `requestStatus[].item`, and status codes.

A Wallet/Responder MAY include localized `requestStatus[].message` text, but the machine-processable status semantics remain in `requestStatus[].status`. A receiver SHALL NOT rely on localized `message` text to determine whether an item was fulfilled, partial, declined, unavailable, unsupported, or errored.

### 14.2 Unicode normalization and BIDI handling

SMART request and SMART response JSON strings are Unicode strings encoded as UTF-8 when serialized as JSON text or bytes. Producers of new human-readable display text SHOULD emit Unicode Normalization Form C (NFC). Consumers SHOULD be prepared to receive valid Unicode display strings that are not NFC, especially from FHIR resources, user-entered Questionnaire answers, copied text, or extension payloads.

Normalization is a presentation and text-processing concern, not an identifier-matching rule. A Requester, Wallet/Responder, Verifier, or receiver SHALL NOT apply Unicode normalization, case folding, accent folding, width folding, confusable-character mapping, BIDI reordering, transliteration, translated aliases, or locale-sensitive collation to make distinct protocol identifiers or constants compare equal. Exact validation remains exact validation for request and response ids, item ids, Artifact ids, selector kinds and values, FHIR canonicals used as machine values, media types, status codes, mdoc identifiers, algorithm labels, HPKE/HKDF info strings, and deployment-local launch identifiers or URLs.

Implementations MAY normalize copies of human-readable display text for local rendering, search, indexing, duplicate detection, accessibility, or typography. Such display normalization SHALL NOT change the bytes or code points used for signature verification, hashing, encryption, HPKE or HKDF inputs, COSE signing inputs, mdoc digest checks, SMART Health Card verification, FHIR canonical preservation, audit records, or byte-exact fixture comparisons.

Human-readable text can legitimately use non-Latin scripts, combining marks, emoji, right-to-left text, and bidirectional formatting. User interfaces that render untrusted or externally supplied text SHOULD apply the Unicode Bidirectional Algorithm with isolation appropriate to the UI platform. In particular, UIs SHOULD isolate `purpose`, item `title`, item `summary`, Questionnaire text, FHIR display strings, `requestStatus[].message`, demo branding, and diagnostic snippets from adjacent labels, origins, identifiers, URLs, profile canonicals, media types, status badges, trust indicators, warnings, and action buttons.

Unicode and BIDI rendering SHALL NOT allow display text to spoof or obscure protocol identifiers, web origins, requester identity, reader identity, profile URLs, FHIR canonicals, mdoc identifiers, Artifact provenance, clinical-source trust, status codes, validation outcomes, Holder decisions, or consent controls. Wallets/Responders, Verifiers, and receivers SHOULD visually distinguish unauthenticated display text from authenticated origin, reader-authentication, issuer, device, and local-policy trust signals.

When a UI cannot safely render a security- or trust-adjacent value, it SHOULD use a conservative representation such as escaped text, code-point-revealing diagnostics, clear truncation with expansion, code-style rendering for machine values, a warning, or deliberate access to the exact value. For human-readable clinical or Questionnaire text, implementations SHOULD prefer safe rendering and clear boundaries over blanket deletion of characters that may be meaningful in the Holder's language.

### 14.3 Locale negotiation guidance

SMART Health Check-in 1.0 does not define protocol-level locale negotiation. Locale choices made from application settings, OS or browser preferences, Wallet settings, account preferences, deployment configuration, staff selection, FHIR language metadata, or local accessibility configuration are local UI or deployment behavior unless a registered extension or deployment profile defines an interoperable rule. Such choices do not change request item ids, selectors, `accept[]`, response `requestStatus[]` coverage, Artifact validation, status-code semantics, trust processing, or same-device validation.

Language preferences, locale, script, region, input method, timezone, translation requests, and fallback behavior can reveal sensitive information, including nationality, ethnicity, household context, disability accommodations, immigration context, preferred language in a clinical setting, or the nature of a visit. Implementations SHOULD minimize collection, disclosure, logging, telemetry, indexing, display, and retention of locale metadata in the same way they minimize other request context and operational metadata under §12.

A Requester MAY use information it already has through a trusted application session, patient preference, local workflow, browser or app UI, or deployment policy to select display text before creating the SMART request. If cross-device or in-person initiation is used, the launch UX is implementation-defined and should not add patient-specific clinical text, stable locale identifiers, or fine-grained language preferences to public surfaces, launch URLs, logs, dashboards, analytics, screenshots, or support bundles unless a deployment profile explicitly requires and protects that disclosure.

A Wallet/Responder MAY use Holder device preferences, Wallet locale settings, accessibility settings, local translation resources, or FHIR-supported translation mechanisms to render Holder-review text. If request display text, Questionnaire text, FHIR display strings, or extension-defined display fields cannot be rendered or processed safely in a language the Holder can understand, the Wallet/Responder MAY show the original text with clear trust labeling, ask for confirmation or assistance, decline the item, report `unsupported`, report `unavailable`, report `error`, or use another valid §6 outcome according to the facts and local policy.

Receivers MAY localize implementation-generated UI labels, validation errors, workflow prompts, and operator-facing summaries. Localization of UI text does not alter response validation, clinical-source verification, provenance assessment, retention signaling, status-code semantics, Artifact routing, or downstream clinical acceptance.

---

## 15. Implementation notes

This section is informative. It describes implementation patterns for the protocol defined elsewhere and does not add conformance requirements. Interoperability requirements are defined by the transport-neutral SMART request and SMART response in §§5-6 and by the same-device direct `org-iso-mdoc` presentation and trust flow in §§7-8, with supporting security, privacy, registry, internationalization, schema, CDDL, and fixture material in later sections and appendices.

SMART Health Check-in 1.0 has two normative layers only:

1. the clinical SMART request and SMART response JSON objects; and
2. the same-device presentation flow using W3C Digital Credentials API direct `org-iso-mdoc`.

In-person QR, NFC, deep-link, kiosk, desktop, staff-handoff, relay, and completion-screen behavior can be useful deployment UX. In version 1.0 those mechanisms are not standardized pointer, envelope, relay, submission, or completion protocols. A deployment that uses them should treat them as a way to land the Holder on a same-device Verifier page that runs §8.

Implementations are easiest to test when they keep these boundaries explicit:

- a clinical model layer for request/response parsing, selectors, media types, statuses, and §6.6 cross-validation;
- a same-device presentation layer for Digital Credentials API, CBOR, COSE, mdoc, HPKE, `SessionTranscript`, and origin handling;
- a trust-policy layer that records origin, optional `readerAuth`, mdoc issuer/device evidence, and clinical-source evidence as separate decisions;
- a Wallet holder-data or receiver-data layer for local clinical records, credentials, FHIR resources, and ingestion policy; and
- diagnostic and fixture tooling that labels comparison mode and avoids leaking production secrets or clinical payloads.

### 15.1 Verifier app

A Verifier app packages a SMART request for same-device presentation, opens the returned presentation, validates the extracted SMART response against the original request, and passes only validated results to the Requester or downstream workflow. The same product often acts as both Requester and Verifier, but separating clinical request construction from presentation validation helps avoid trust and data-model confusion.

#### 15.1.1 Building the request from a UI form

Request authoring should begin with what the downstream receiver can parse, validate, route, and ingest. For each request item, a builder should collect or generate a session-scoped item `id`, Holder-facing `title` and optional `summary`, advisory `required` value, one `content` selector, and an ordered `accept[]` list containing only supported Artifact media types.

For `fhir.resources` selectors, use FHIR-native identifiers rather than local topic labels. `profiles[]` identifies exact `StructureDefinition` canonicals. `profilesFrom[]` is an array of canonical profile-family URLs, not a singleton string, package descriptor, registry alias, or local topic. `resourceTypes[]` contains official FHIR resource type names. When `profiles[]` and `profilesFrom[]` are both present, describe them as additive profile selectors; `resourceTypes[]` is a separate resource-type constraint.

For Questionnaire requests, generate only the flattened selector shape:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/intake|1.2.3",
  "resource": { "resourceType": "Questionnaire" }
}
```

At least one of `canonical` or `resource` is present, and both are direct selector members. Legacy nested forms such as `questionnaire: "..."`, `questionnaire: { "resourceType": "Questionnaire" }`, or `questionnaire: { "canonical": ..., "resource": ... }` should not be emitted, silently coerced, or used in new fixtures.

Canonical handling should use a shared utility. Parse `canonical|version` into `(url, version?)` while preserving the original string exactly where the protocol carries, emits, records, or compares it. Versioned canonicals are resolved through a configured resolver, package cache, implementation-guide resolver, terminology service, or FHIR canonical search using both `url` and `version`; do not satisfy a versioned canonical by stripping `|version` and directly fetching the bare URL.

The SMART request body should not carry requester identity or presentation metadata. Organization names, origins, logos, callback URLs, package names, certificates, trust-framework labels, pointer ids, relay ids, and completion endpoints belong to the application shell, deployment policy, or presentation transport, not to the §5 clinical JSON.

#### 15.1.2 Holding HPKE private material

The §8 flow requires the Verifier to retain the HPKE recipient private key, the exact unpadded `encryptionInfo` base64url string, the origin used for the request, and the original SMART request until response processing completes or the presentation session is abandoned.

A browser-local Verifier authority keeps this state in the page process. This is convenient for demos, static pages, and simple same-device portals because the page builds the request, invokes `navigator.credentials.get`, opens the response, and validates the SMART response. It also means debug panels, browser storage, crash reports, screenshots, and console logs need controls because request-opening key material and decrypted clinical content may be present.

A server-owned or split Verifier authority can store the HPKE private key, original request, exact `encryptionInfo` spelling, expected origin, freshness metadata, and workflow state behind an opaque application handle. The browser can invoke the Digital Credentials API with public request material and return the result for server-side opening and validation. This can support audit and EHR ingestion, but the handle is deployment state around the §8 flow; it is not a standardized SMART Health Check-in pointer or relay protocol.

Whichever model is used, use fresh HPKE recipient key material and fresh unpredictable nonces for presentation sessions unless a deployment profile defines safe reuse. Keep request state, HPKE keys, transcript inputs, optional reader-authentication evidence, decrypted plaintext, and downstream workflow records separated. Do not treat request ids, item ids, Artifact ids, launch handles, relay handles, or completion ids as freshness proofs or transcript bindings.

#### 15.1.3 Validating the response

Verifier-side validation should be layered and request-aware. A practical pipeline records separate outcomes for:

1. the original SMART request validation and retained request context;
2. the returned Digital Credentials protocol and direct `dcapiResponse` wrapper;
3. HPKE opening with DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD;
4. CBOR `DeviceResponse` parsing, version/status checks, expected `docType`, namespace, and stable response element;
5. MSO, issuer signature, value digest, disclosed issuer-signed item, and device-signature validation;
6. deployment-policy evaluation of origin, optional `readerAuth`, issuer evidence, and device evidence;
7. extraction of the `smart_health_checkin_response` element value as SMART response JSON;
8. §6 SMART response validation and §6.6 cross-validation against the original request; and
9. Artifact-specific validation, downstream patient matching, provenance review, and local ingestion policy.

Shape validation alone is insufficient. §6.6 validation checks exact `requestId`, `fulfills[]` references, media-type acceptance for every fulfillment edge, exactly one `requestStatus[]` entry per request item, raw FHIR `fhirVersion`, SMART Health Card wrapper rules, and FHIR-aware evidence where local policy requires it.

Keep trust states distinct. HPKE success does not prove reader trust. Reader authentication does not prove raw FHIR provenance. A valid mdoc digest does not prove a FHIR Bundle satisfies a requested profile. A `fulfilled` status does not force EHR ingestion.

#### 15.1.4 Surfacing fixtures for support and diagnostics

Useful diagnostics can include the SMART request JSON, Digital Credentials API argument, `DeviceRequest`, tag-24 `ItemsRequest`, `encryptionInfo`, exact `encryptionInfo` base64url string, `SessionTranscript`, optional `readerAuth`, returned `dcapiResponse`, HPKE opening result, mdoc/MSO/digest/device-signature validation report, extracted SMART response JSON, and §6.6 cross-validation report.

Production support tools should redact by default. Routine telemetry should avoid plaintext SMART requests and responses, raw FHIR resources, SMART Health Cards, Questionnaire answers, request-opening private keys, bearer URLs, access tokens, full launch or QR URLs, decrypted `DeviceResponse` bytes, and unredacted stack traces. Fixture manifests should label whether material is byte-exact, structural, semantic, diagnostic, historical, illustrative, or conformance-candidate, and should clearly mark synthetic data, demo private keys, self-signed certificates, and non-production trust material.

### 15.2 Wallet implementation guidance

A Wallet/Responder receives a presentation request, classifies trust signals, presents meaningful Holder controls, gathers responsive content, constructs a SMART response, and wraps it in the §8 same-device presentation response. These responsibilities should remain separable so platform-specific invocation code does not leak into the clinical model and clinical data policy does not depend on CBOR or HPKE internals.

#### 15.2.1 Origin allowlist maintenance

Origin, privileged-browser, verified-app-link, package identity, signing-certificate, entitlement, enterprise-configuration, or allow-list evidence should come from authenticated platform or deployment channels. Do not derive verified origin or organization identity from `purpose`, item text, selector URLs, Questionnaire text, QR contents, deep-link parameters, launch page text, unknown SMART request members, package-looking strings, logos, or returned Artifacts.

Production allow-lists and privileged-caller policies should have clear update, rollback, test/prod separation, and display policies. Development builds may use reflective allow-lists or demo caller evidence, but those states should be labeled as non-production. If origin evidence is absent or unacceptable, Wallet policy can fail, proceed with reduced assurance, require additional Holder confirmation, omit branding, restrict returned content, or report item outcomes as appropriate; it should not display unauthenticated text as verified requester identity.

#### 15.2.2 Consent screen design

The request item is the protocol's Holder-review and response-accounting unit. Wallet UI can group, summarize, reorder, translate, or suppress details for accessibility, localization, safety, and local policy, but it should preserve meaningful item-level control and exact item ids for `fulfills[]` and `requestStatus[].item`.

Consent screens should distinguish authenticated origin or privileged-caller evidence, optional reader-authentication state, issuer/device evidence, unauthenticated SMART request display text, requested selectors, accepted response forms, retention signals such as `intentToRetain`, broad or no-selector requests, sensitive-category warnings, and the Holder's available choices.

`required: true`, `intentToRetain`, scanning a QR code, tapping NFC, opening a deep link, or clicking a page button outside the Wallet is not Holder consent by itself. `declined`, `partial`, `unavailable`, `unsupported`, and `error` are normal item-level outcomes when the request is otherwise valid enough to answer. Use `unsupported` when the Wallet cannot understand or support the selector, media type, FHIR version, Questionnaire features, exact canonical version, or extension semantics. Use `unavailable` when the Wallet understands the item but lacks matching shareable data. Use `partial` when responsive content is shared but complete fulfillment is not claimed.

#### 15.2.3 Holder-store interface

Production Wallets should place patient-data lookup and source selection behind an app-owned Holder data-source interface. That boundary can receive the validated request item, accepted media types, request `fhirVersions[]`, Holder choices, Questionnaire answers, trust and policy state, and available FHIR package or canonical-resolution services. It can return candidate Artifacts or item outcomes such as `declined`, `unavailable`, `unsupported`, `partial`, or `error`.

The Holder-store boundary is where implementations decide which SMART Health Cards, cached FHIR resources, issuer-provided documents, connected services, user-entered answers, or other Holder data sources are eligible; how sensitive data is redacted or withheld; whether one Artifact can accurately fulfill several items; and whether a broad item is only partially fulfilled. Store code should not know about Digital Credentials API wrappers, tag-24 boundaries, COSE, HPKE, or mdoc MSO construction. Transport code should not query patient records or determine clinical suitability.

#### 15.2.4 Profile-family resource matching

`fhir.resources` matching should treat selectors as FHIR-native constraints, not free-text topics. Exact `profiles[]` matching can use `meta.profile[]`, signed SMART Health Card payload evidence, source metadata, or trusted local conformance evidence. Versioned `profiles[]` values need exact-version evidence before claiming full fulfillment. `profilesFrom[]` identifies profile families and usually requires package metadata, `ImplementationGuide` knowledge, configured family maps, issuer knowledge, or local policy because FHIR resources do not normally declare family membership directly. `resourceTypes[]` uses official FHIR resource type names.

Matching code can use base canonicals for local routing, broad grouping, or profile-family lookup where §5.5 permits, but it should preserve exact strings for resolution, exact-version matching, `meta.profile`, generated `QuestionnaireResponse.questionnaire`, diagnostics, fixtures, and returned content.

#### 15.2.5 QuestionnaireResponse construction

A Questionnaire selector is flat: `content.kind` is `"questionnaire"` with direct optional `canonical` and `resource` members. Wallet parsers should reject or report `unsupported` for legacy nested `questionnaire` forms so stale integrations fail visibly.

When only `canonical` is supplied, the Wallet can resolve the Questionnaire through a configured resolver, package cache, FHIR canonical search, Holder data source, or other mechanism that respects §5.5. When only `resource` is supplied, the Wallet can render the inline Questionnaire without network retrieval if it supports the required features and local policy permits. When both are supplied, the canonical is the Requester's explicit identity and the resource is the body to render. Material disagreement in URL, explicit version, or answer-changing item structure is usually better reported as `unsupported` before answers are collected; operational failure after the Questionnaire was otherwise understood is usually `error`.

When returning `application/fhir+json`, the Wallet should construct a FHIR `QuestionnaireResponse` as a single resource or inside a Bundle and include the Artifact `fhirVersion`. If the requested canonical is the Questionnaire identity being answered, preserve it exactly in `QuestionnaireResponse.questionnaire`, including `|version`. If only an inline Questionnaire was supplied, use `Questionnaire.url` and `Questionnaire.version` when they provide a clear canonical identity; do not invent a misleading canonical solely to satisfy a receiver preference.

#### 15.2.6 Android Credential Manager: matcher / handler split

On Android, a useful architecture is to keep the Credential Manager matcher small and deterministic. The matcher can inspect enough of the request to decide whether to surface the Wallet for direct `org-iso-mdoc` requests for `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request`.

The handler or Wallet activity owns the protocol work: parse `data.deviceRequest` and `data.encryptionInfo`, locate and preserve the tag-24 `ItemsRequest`, extract the SMART request only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, compute the direct `dcapi` `SessionTranscript`, classify optional `readerAuth`, run Holder review, call the Holder-store boundary, build the SMART response, place it in the issuer-signed `smart_health_checkin_response` element, and return the HPKE-sealed `dcapiResponse`.

This split is platform machinery. It should not create alternate request carriers, dynamic element encodings, plaintext response paths, Android-specific protocol fields, or a display label that is mistaken for requester identity.

#### 15.2.7 iOS / Safari considerations

SMART Health Check-in 1.0 does not define a separate iOS, Safari, native-app, browser-extension, or custom-URL binding. Implementations on other platforms should preserve the same §8 invariants when claiming live version 1.0 presentation support: direct `org-iso-mdoc`, `DeviceRequest.version` `"1.0"`, `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`, `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, stable element `smart_health_checkin_response`, direct `dcapi` `SessionTranscript`, and the specified HPKE suite with empty AAD.

If a platform cannot supply authenticated origin or an approved origin-equivalent, or cannot support the direct §8 flow, describe the gap as a platform or deployment limitation. Do not compensate by adding requester identity metadata to the SMART request body or by treating a deep link, custom URL scheme, app-to-app callback, or relay as an equivalent standardized version 1.0 presentation protocol.

### 15.3 EHR ingestion

EHR ingestion begins after the Verifier has accepted the presentation response as protocol-valid. Ingestion is local workflow, not automatic protocol success. A valid SMART Health Check-in response can still be unsuitable for automatic import because of patient-match uncertainty, missing provenance, unsupported FHIR version, insufficient profile evidence, stale data, Holder refusal, partial fulfillment, or local policy.

A receiving system should keep these decisions separate:

1. protocol validation under §§6-8;
2. trust assessment for origin, optional reader authentication, mdoc issuer/device evidence, and clinical-source evidence;
3. patient and encounter matching under local policy;
4. Artifact-specific parsing and validation;
5. clinical-source provenance assessment;
6. deduplication, reconciliation, and conflict handling; and
7. persistence, routing, audit, quarantine, deletion, or staff-review decisions.

For `application/smart-health-card` Artifacts, verify each JWS, evaluate issuer trust under local policy, inspect signed FHIR payloads, and decide whether the signed content satisfies the original selectors and workflow requirements. A valid SMART Health Card signature does not guarantee that every requested item is complete, current, patient-matched, or suitable for write-back.

For `application/fhir+json` Artifacts, use the Artifact-level `fhirVersion` to choose parsers and validators, inspect `resourceType`, `Bundle.entry[].resource`, `meta.profile[]`, `QuestionnaireResponse.questionnaire`, identifiers, references, Provenance resources, signatures, and any implementation-guide-specific constraints required locally. Treat raw FHIR JSON as patient-mediated unless separate accepted provenance, signature, source attestation, authenticated retrieval evidence, or equivalent proof is present. The mdoc issuer signature, device proof, HPKE opening, reader authentication, `requestId` match, Artifact id, `fulfills[]`, or Holder approval does not by itself prove that unsigned raw FHIR came from an EHR.

Status accounting should survive ingestion. `requestStatus[]` accounts for every requested item exactly once. `fulfills[]` identifies which Artifact payloads support one or more items. A `fulfilled` or `partial` item usually has at least one fulfilling Artifact; `declined`, `unavailable`, or `unsupported` items usually do not. Receivers should flag mismatches for review, but should not infer fulfillment from an Artifact reference without the corresponding status entry, and should not infer clinical facts from non-fulfilled statuses.

Deduplicate and reconcile using clinical payload evidence and local rules rather than SMART Health Check-in wrapper ids alone. Request ids, item ids, Artifact ids, presentation-session values, mdoc identifiers, and launch handles are scoped accounting or transport values. They are not patient identifiers, global document identifiers, source-system ids, Provenance ids, or record ids unless the Artifact payload or deployment policy independently establishes that meaning.

Telemetry and operational logs around ingestion can be as sensitive as the payload. Minimize stored plaintext requests, responses, raw FHIR, SMART Health Cards, Questionnaire answers, item-level refusal details, origins, certificate subjects, launch handles, validation failures, and support traces. Operator-facing errors should help recovery without exposing unnecessary clinical details, secrets, stack traces, token values, source-system internals, or valid-id enumeration clues.

### 15.4 SDK packaging guidance

SDKs are most useful when they preserve the protocol's layer boundaries and expose testable seams rather than a single monolithic “check-in” function.

A typical SDK family can be organized as:

- **Core clinical model package:** request and response types, parsers, duplicate-key-aware JSON handling where available, selectors, core Artifact variants, status codes, canonical parsing and preservation, schema helpers, and §6.6 cross-validation utilities. This package should not depend on browser APIs, React, Android/iOS UI, CBOR, COSE, HPKE, mdoc, relay storage, demo assets, or EHR-specific ingestion policy.
- **FHIR helper package:** canonical resolver interfaces, package-cache or FHIR-search resolution hooks, profile-family matcher interfaces, Bundle traversal, `meta.profile` and `QuestionnaireResponse.questionnaire` helpers, SMART Health Card payload inspection hooks, and optional FHIR validator adapters. It should distinguish full FHIR validation from core protocol validation.
- **Verifier same-device package:** fixed §8 identifiers, `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, optional `readerAuth`, Digital Credentials API request construction, HPKE private-material custody seams, response opening, mdoc validation, stable-element extraction, layered validation reports, and fixture import/export.
- **Wallet clinical core package:** SMART request parsing, item classification, Holder decision models, holder-store interfaces, response construction, status accounting, QuestionnaireResponse helpers, and validation of every fulfillment edge.
- **Wallet same-device transport package:** platform invocation adapters, request matching, tag-24 and CBOR handling, origin and reader-auth classification, issuer-signed item creation, MSO/digest/device-authentication construction, HPKE sealing, and platform result wrapping.
- **UI and framework bindings:** React hooks, Web Components, Compose screens, SwiftUI views, server middleware, EHR adapters, localization helpers, and debug panels that orchestrate the lower layers without redefining wire fields or trust semantics.
- **Fixture and conformance tools:** JSON Schema runners, CDDL/CBOR inspectors, byte-ladder generators, negative vectors, trust-material labeling, and diagnostic export controls.

SDK APIs should make unsafe shortcuts hard. Avoid a `GenericArtifact` class for core handling. Model `application/fhir+json` and `application/smart-health-card` as concrete variants, and require extension Artifacts to be explicit branded media-type-defined variants with their own typed fields. Do not infer dereferencing, integrity, expiration, authorization, FHIR-version, or merge semantics from fields named `value`, `url`, `data`, or `document`.

Expose structured validation reports rather than only throwing strings. Reports can distinguish request-shape errors, selector errors, canonical-resolution errors, presentation-wrapper errors, HPKE errors, mdoc validation errors, SMART response shape errors, cross-validation errors, FHIR payload errors, SMART Health Card errors, provenance status, and deployment-policy failures. Applications can map those reports to safe recovery text without logging sensitive payloads.

SDK examples and tests should stay current with the normative model. Include positive and negative coverage for flattened Questionnaire selectors, `profilesFrom[]` arrays, additive `profiles[]` plus `profilesFrom[]`, exact preservation of versioned canonicals, no `GenericArtifact` fallback, `application/fhir+json` with `fhirVersion`, `application/smart-health-card` with `value.verifiableCredential[]` and no outer `fhirVersion`, exact §8 identifiers, `DeviceRequest.version` `"1.0"`, optional per-`DocRequest.readerAuth`, exact `encryptionInfo` transcript binding, HPKE `info = SessionTranscript` with empty AAD, and §6.6 request-aware validation. Archived kiosk, pointer, relay, OID4VP, or dynamic-element experiments should be labeled historical or future work rather than exported as SMART Health Check-in 1.0 protocol APIs.

Finally, SDK documentation should state conformance scope precisely. A package can support the core clinical model without implementing live same-device presentation. A DC API verifier package can implement §8 without defining EHR ingestion. A fixture package can provide diagnostic captures without claiming production issuer trust. Clear package boundaries help implementers compose the profile without accidentally standardizing deployment-local behavior.

---

## 16. Worked examples

This section is informative. The examples are synthetic request/response pairs that illustrate the SMART Health Check-in clinical JSON model. They do not define required clinical content, fixture byte strings, trust anchors, Holder choices, EHR ingestion policy, or deployment UX.

The same request and response semantics apply when these objects are carried by the same-device direct `org-iso-mdoc` flow. QR, NFC, deep links, kiosks, staff handoff, relays, and completion screens are deployment-defined ways to reach an implementation and are not standardized by these examples.

All examples use only the two core Artifact media types: `application/smart-health-card` and `application/fhir+json`. Raw FHIR JSON in these examples is patient-mediated unless the payload separately contains accepted provenance, signature, source attestation, or equivalent evidence. Holder approval, a valid presentation wrapper, `requestId`, or `fulfills[]` does not by itself prove clinical-source provenance.

### 16.1 Insurance-card-only check-in (CARIN profile, SHC preferred)

This example asks for Coverage content conforming to the CARIN digital insurance card profile and advertises SMART Health Card first. The Wallet returns an SHC Artifact because `application/smart-health-card` appears in the item `accept[]` list.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-insurance-001",
  "purpose": "Insurance verification for check-in",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "summary": "Share current coverage information conforming to the CARIN digital insurance card profile.",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": [
          "Coverage"
        ]
      },
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-insurance-001",
  "artifacts": [
    {
      "id": "artifact-insurance-shc-001",
      "mediaType": "application/smart-health-card",
      "fulfills": [
        "insurance-card"
      ],
      "value": {
        "verifiableCredential": [
          "eyJ6aXAiOiJERUYiLCJhbGciOiJFUzI1NiJ9.synthetic-insurance-card.vc"
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "insurance-card",
      "status": "fulfilled",
      "message": "Shared a SMART Health Card containing matching Coverage content."
    }
  ]
}
```

Validation notes: `requestId` exactly matches the request `id`; the Artifact `fulfills[]` names `insurance-card`; the SHC wrapper has `value.verifiableCredential[]` and no outer `fhirVersion`. A valid SHC signature and issuer trust still have to be evaluated under SMART Health Cards and local policy; this wrapper alone does not prove that the returned credential is clinically sufficient.

### 16.2 US Core summary check-in

This example requests a small US Core summary. It includes both `profilesFrom[]` and exact `profiles[]`; those selectors are additive, and `resourceTypes[]` is the separate resource-type constraint.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-us-core-summary-001",
  "purpose": "Pre-visit chart summary",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "us-core-summary",
      "title": "US Core summary",
      "summary": "Share available patient, problem, and medication summary resources for review before the visit.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": [
          "http://hl7.org/fhir/us/core"
        ],
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0",
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-encounter-diagnosis|6.1.0"
        ],
        "resourceTypes": [
          "Patient",
          "Condition",
          "MedicationRequest"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-us-core-summary-001",
  "artifacts": [
    {
      "id": "artifact-us-core-summary-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "us-core-summary"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-synthetic-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0"
                ]
              },
              "name": [
                {
                  "family": "Rivera",
                  "given": [
                    "Alex"
                  ]
                }
              ],
              "gender": "unknown",
              "birthDate": "1980-01-01"
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-hypertension-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-encounter-diagnosis|6.1.0"
                ]
              },
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "code": {
                "text": "Hypertension"
              },
              "clinicalStatus": {
                "coding": [
                  {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": "active"
                  }
                ]
              }
            }
          },
          {
            "resource": {
              "resourceType": "MedicationRequest",
              "id": "medication-lisinopril-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest|6.1.0"
                ]
              },
              "status": "active",
              "intent": "order",
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "medicationCodeableConcept": {
                "text": "lisinopril"
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "us-core-summary",
      "status": "fulfilled",
      "message": "Shared available summary resources matching the additive profile selectors and resource-type constraint."
    }
  ]
}
```

Validation notes: the raw FHIR Artifact includes `mediaType: application/fhir+json`, `fhirVersion`, and a FHIR Bundle in `value`. The versioned `meta.profile` strings are preserved exactly. The example does not require every US Core profile to be returned; the Wallet's `fulfilled` status is its response-construction claim, and a receiver can still apply stricter clinical or ingestion policy.

### 16.3 Inline questionnaire pre-visit intake

This example uses the flattened Questionnaire selector. Both the versioned canonical and the inline `Questionnaire` are direct members of `content`; there is no nested `questionnaire` wrapper.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-inline-intake-001",
  "purpose": "Pre-visit intake",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "previsit-intake",
      "title": "Pre-visit intake questionnaire",
      "summary": "Answer two synthetic intake questions before the visit.",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
        "resource": {
          "resourceType": "Questionnaire",
          "id": "previsit-intake",
          "url": "https://example.org/fhir/Questionnaire/previsit-intake",
          "version": "2.0.0",
          "status": "active",
          "title": "Pre-visit intake",
          "item": [
            {
              "linkId": "reason",
              "text": "What is the main reason for today's visit?",
              "type": "text",
              "required": true
            },
            {
              "linkId": "symptoms",
              "text": "Do you have any new symptoms?",
              "type": "boolean"
            }
          ]
        }
      },
      "accept": [
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-inline-intake-001",
  "artifacts": [
    {
      "id": "artifact-previsit-intake-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "previsit-intake"
      ],
      "value": {
        "resourceType": "QuestionnaireResponse",
        "id": "qr-previsit-intake-001",
        "questionnaire": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
        "status": "completed",
        "subject": {
          "reference": "Patient/patient-synthetic-001"
        },
        "item": [
          {
            "linkId": "reason",
            "answer": [
              {
                "valueString": "Annual check-in"
              }
            ]
          },
          {
            "linkId": "symptoms",
            "answer": [
              {
                "valueBoolean": false
              }
            ]
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "previsit-intake",
      "status": "fulfilled",
      "message": "Collected answers using the inline Questionnaire and preserved the versioned canonical."
    }
  ]
}
```

Validation notes: the returned `QuestionnaireResponse.questionnaire` preserves `https://example.org/fhir/Questionnaire/previsit-intake|2.0.0` exactly. A Wallet that detects material disagreement between the canonical and inline resource would report `unsupported` or `error` rather than silently merging definitions. Legacy nested selector shapes are invalid and are not shown as request examples.

### 16.4 Mixed bundle: insurance + history + intake

This example shows one `application/fhir+json` Bundle fulfilling three request items: insurance, clinical history, and intake. The insurance item listed SHC first but also accepted raw FHIR JSON, so the Bundle's media type is accepted for every item in `fulfills[]`.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-mixed-checkin-001",
  "purpose": "Combined check-in package",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "insurance-card",
      "title": "Insurance card",
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
        ],
        "resourceTypes": [
          "Coverage"
        ]
      },
      "accept": [
        "application/smart-health-card",
        "application/fhir+json"
      ]
    },
    {
      "id": "clinical-history",
      "title": "Clinical history",
      "summary": "Share active problems and medications.",
      "content": {
        "kind": "fhir.resources",
        "profilesFrom": [
          "http://hl7.org/fhir/us/core"
        ],
        "resourceTypes": [
          "Condition",
          "MedicationRequest"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    },
    {
      "id": "intake",
      "title": "Intake answers",
      "content": {
        "kind": "questionnaire",
        "canonical": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
        "resource": {
          "resourceType": "Questionnaire",
          "id": "previsit-intake",
          "url": "https://example.org/fhir/Questionnaire/previsit-intake",
          "version": "2.0.0",
          "status": "active",
          "title": "Pre-visit intake",
          "item": [
            {
              "linkId": "reason",
              "text": "What is the main reason for today's visit?",
              "type": "text",
              "required": true
            },
            {
              "linkId": "symptoms",
              "text": "Do you have any new symptoms?",
              "type": "boolean"
            }
          ]
        }
      },
      "accept": [
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-mixed-checkin-001",
  "artifacts": [
    {
      "id": "artifact-mixed-bundle-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "insurance-card",
        "clinical-history",
        "intake"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-synthetic-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"
                ]
              },
              "status": "active",
              "beneficiary": {
                "reference": "Patient/patient-synthetic-001"
              },
              "payor": [
                {
                  "display": "Synthetic Health Plan"
                }
              ]
            }
          },
          {
            "resource": {
              "resourceType": "Condition",
              "id": "condition-asthma-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-encounter-diagnosis|6.1.0"
                ]
              },
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "code": {
                "text": "Asthma"
              }
            }
          },
          {
            "resource": {
              "resourceType": "QuestionnaireResponse",
              "id": "qr-mixed-intake-001",
              "questionnaire": "https://example.org/fhir/Questionnaire/previsit-intake|2.0.0",
              "status": "completed",
              "item": [
                {
                  "linkId": "reason",
                  "answer": [
                    {
                      "valueString": "Medication refill"
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "insurance-card",
      "status": "fulfilled"
    },
    {
      "item": "clinical-history",
      "status": "fulfilled"
    },
    {
      "item": "intake",
      "status": "fulfilled"
    }
  ]
}
```

Validation notes: one Artifact may fulfill several items, but every fulfillment edge must satisfy the target item's `accept[]`, selector, FHIR-version, and local validation rules. The QuestionnaireResponse again preserves the versioned Questionnaire canonical. The raw FHIR Bundle is patient-mediated unless its contents carry separate provenance or signature evidence.

### 16.5 Per-item declined / partial / error

This example shows that item status is separate from Artifact boundaries. The Wallet returns one medication Bundle but does not claim complete satisfaction, the Holder declines one item, and an operational failure affects another item.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-outcomes-001",
  "purpose": "Optional pre-visit review",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "current-medications",
      "title": "Current medications",
      "required": true,
      "content": {
        "kind": "fhir.resources",
        "profiles": [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest|6.1.0"
        ],
        "resourceTypes": [
          "MedicationRequest"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    },
    {
      "id": "sensitive-history",
      "title": "Sensitive history",
      "summary": "Optional sensitive-category history.",
      "content": {
        "kind": "fhir.resources",
        "resourceTypes": [
          "Condition"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    },
    {
      "id": "recent-vitals",
      "title": "Recent vitals",
      "content": {
        "kind": "fhir.resources",
        "resourceTypes": [
          "Observation"
        ]
      },
      "accept": [
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-outcomes-001",
  "artifacts": [
    {
      "id": "artifact-current-medications-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "current-medications"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "MedicationRequest",
              "id": "medication-albuterol-001",
              "meta": {
                "profile": [
                  "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest|6.1.0"
                ]
              },
              "status": "active",
              "intent": "order",
              "subject": {
                "reference": "Patient/patient-synthetic-001"
              },
              "medicationCodeableConcept": {
                "text": "albuterol inhaler"
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "current-medications",
      "status": "partial",
      "message": "Shared one current medication; other available medication details were withheld by policy."
    },
    {
      "item": "sensitive-history",
      "status": "declined",
      "message": "The Holder chose not to share this item."
    },
    {
      "item": "recent-vitals",
      "status": "error",
      "message": "A data-source error prevented retrieval of recent observations."
    }
  ]
}
```

Validation notes: `requestStatus[]` covers `current-medications`, `sensitive-history`, and `recent-vitals` exactly once. `partial` has a fulfilling Artifact; `declined` and `error` do not. Status `message` values are concise and avoid secrets, stack traces, and unnecessary clinical details.

### 16.6 "No selectors" — full open-ended share

This example uses `content.kind = "fhir.resources"` with no `profiles[]`, `profilesFrom[]`, or `resourceTypes[]`. It is intentionally broad and should be used only when the Requester can safely consume broad patient-specific FHIR content and the Holder-facing text explains the breadth.

Request:

```json
{
  "type": "smart-health-checkin-request",
  "version": "1",
  "id": "req-open-share-001",
  "purpose": "Open-ended record sharing",
  "fhirVersions": [
    "4.0.1"
  ],
  "items": [
    {
      "id": "open-ended-share",
      "title": "Share available health records",
      "summary": "This broad request has no profile, profile-family, or resource-type selector. The Wallet may offer any patient-specific FHIR resources it can safely share.",
      "content": {
        "kind": "fhir.resources"
      },
      "accept": [
        "application/fhir+json"
      ]
    }
  ]
}
```

Response:

```json
{
  "type": "smart-health-checkin-response",
  "version": "1",
  "requestId": "req-open-share-001",
  "artifacts": [
    {
      "id": "artifact-open-ended-share-001",
      "mediaType": "application/fhir+json",
      "fhirVersion": "4.0.1",
      "fulfills": [
        "open-ended-share"
      ],
      "value": {
        "resourceType": "Bundle",
        "type": "collection",
        "entry": [
          {
            "resource": {
              "resourceType": "Patient",
              "id": "patient-synthetic-001",
              "name": [
                {
                  "family": "Rivera",
                  "given": [
                    "Alex"
                  ]
                }
              ]
            }
          },
          {
            "resource": {
              "resourceType": "Coverage",
              "id": "coverage-synthetic-001",
              "status": "active",
              "beneficiary": {
                "reference": "Patient/patient-synthetic-001"
              }
            }
          },
          {
            "resource": {
              "resourceType": "AllergyIntolerance",
              "id": "allergy-peanut-001",
              "patient": {
                "reference": "Patient/patient-synthetic-001"
              },
              "code": {
                "text": "peanut"
              }
            }
          }
        ]
      }
    }
  ],
  "requestStatus": [
    {
      "item": "open-ended-share",
      "status": "fulfilled",
      "message": "Shared the Holder-approved open-ended set selected for this example."
    }
  ]
}
```

Validation notes: the Wallet may satisfy a no-selector item with any compatible patient-specific FHIR resources it can safely offer, but it is not required to disclose everything in other deployments. Here the Wallet marks the item `fulfilled` for the Holder-approved open-ended set selected for this example. The Artifact still needs `fhirVersion`, a FHIR Resource or Bundle in `value`, and media-type acceptance by the item.

---

## 17. Open issues and future work

The items in this section are not active SMART Health Check-in 1.0 protocol requirements. They identify areas where future revisions, deployment profiles, conformance suites, implementation guidance, or platform work may add interoperable behavior.

### 17.1 Production issuer trust anchors and registries

Production deployments need trust-anchor governance for issuer-signed mdoc content, reader-authentication credentials, and clinical-source provenance. The version 1.0 protocol distinguishes these trust layers but does not publish a production trust-list or accreditation program.

### 17.2 Privileged-browser allowlist policy

Some platforms may require Wallets to apply package, signing-certificate, browser, or user-agent policy before trusting origin evidence from Digital Credentials API invocations. Those allowlist and platform-governance details remain deployment- and platform-defined.

### 17.3 `requestInfo` size limits

The same-device flow carries the SMART request in `ItemsRequest.requestInfo`. Future fixture profiles and platform guidance should document practical request-size limits, behavior for inline Questionnaires, and safe degradation when a request is too large for a Wallet or user agent.

### 17.4 iOS and Safari feasibility

Version 1.0 defines a W3C Digital Credentials API direct mdoc profile, but platform availability and API shape can vary. iOS, Safari, and other platform-specific feasibility work belongs in implementation guidance or future bindings unless it changes interoperable wire artifacts.

### 17.5 OID4VP binding alignment

A future OID4VP binding should preserve the §§5-6 SMART request/response semantics, §7 trust-layer separation, Artifact media-type model, per-item status accounting, and conformance-registry posture while defining OID4VP-specific transport, validation, and fixture requirements.

### 17.6 External verifier conformance suite

A complete conformance suite should derive executable validators, byte fixtures, negative tests, schema checks, CDDL checks, and example-vector checks from Appendix A and the normative sections. Appendix D identifies current fixture classes and promotion gaps.

---

## 18. Acknowledgments and contributors

Editors, contributors, reviewers, sponsoring organizations, implementation projects, and fixture-capture contributors will be listed by the publishing organization before publication.

---

## 19. Change log

| Version | Change summary |
| --- | --- |
| 1.0 draft | Initial single-file Markdown draft assembled from accepted canonical section drafts. |

---

## Appendix A. Conformance checklist

This checklist indexes testable obligations defined elsewhere in SMART Health Check-in 1.0. It does not create independent requirements. Rows for optional features, optional targets, or optional deployment constraints apply only to implementations claiming that feature, target, profile, or deployment constraint, even when the source section uses `SHALL` or `SHOULD` for that claimed feature.

| ID | Target | Level | Section | Checklist item | Evidence/validation |
| --- | --- | --- | --- | --- | --- |
| A-001 | Requester / Verifier | SHALL | §4.1.1 | Identify each claimed target, feature/profile, specification version, and deployment profile. | Claim lists target, optional features, version, and policy dependencies. |
| A-002 | Holder Wallet / Responder | SHALL | §4.1.2 | Validate SMART requests under §5 before response construction and preserve item ids for `fulfills[]` and `requestStatus[].item`. | Malformed requests fail safely; valid responses reference original item ids exactly. |
| A-003 | Deployment/profile author | SHALL | §4.1.3 | State constrained targets, required optional features, trust layers, and added validation/security/privacy/fixture expectations without redefining core semantics. | Profile maps added rules to targets and sections; no base semantic override. |
| A-004 | Conformance/fixture author | SHALL | §4.1.3 | Derive tests and fixtures from normative sections and identify target, feature set, section, expected outcome, comparison mode, and demo trust status. | Fixture/test manifest records pass/fail criteria, comparison mode, PHI/test-key status. |
| A-005 | Requester / Verifier | SHALL | §5.1 | Encode SMART requests as RFC 8259 JSON and UTF-8 when serialized by a transport. | Parser/serializer tests reject invalid UTF-8, comments, trailing commas, non-JSON values, and non-object roots. |
| A-006 | Holder Wallet / Responder | SHALL | §5.1.1 | Reject unparsable or non-object SMART requests under the selected transport encoding rules. | Negative corpus includes arrays, strings, null roots, malformed JSON, and encoding errors. |
| A-007 | Holder Wallet / Responder | SHALL | §5.1.2 | Reject duplicate object member names detected during SMART request parsing or validation. | Duplicate-key fixture is rejected rather than accepted by first/last-wins behavior. |
| A-008 | Requester / Verifier | SHALL | §5.2 | Include request `type`, `version`, `id`, and `items`; set `type` to `smart-health-checkin-request` and `version` to `1`. | Schema/procedural validation verifies required top-level members and constants. |
| A-009 | Holder Wallet / Responder | SHALL | §5.2.1 | Reject requests whose `type` is absent or not exactly `smart-health-checkin-request`. | Case-sensitive discriminator mutation tests fail. |
| A-010 | Holder Wallet / Responder | SHALL | §5.2.2 | Reject requests whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-011 | Requester / Verifier | SHALL | §5.2.3 | Generate a non-empty opaque request `id` unique among that Requester's requests for the same check-in session. | Construction tests check non-empty session-local ids and no patient/requester meaning. |
| A-012 | Holder Wallet / Responder | SHALL | §5.2.3 | Preserve request `id` for later `SmartHealthCheckinResponse.requestId` construction. | Response construction asserts exact string equality to original request id. |
| A-013 | Requester / Verifier | SHALL | §5.2.4 | Use `purpose`, when present, only as Holder-facing workflow context, not requester identity, trust, consent, or authorization. | Request and UI review separate `purpose` from authenticated trust display. |
| A-014 | Requester / Verifier | SHOULD | §5.2.5 | Include `fhirVersions[]` when accepting `application/fhir+json` unless any conforming FHIR version can be safely processed. | Raw-FHIR-capable requests declare supported FHIR releases or document broad capability. |
| A-015 | Holder Wallet / Responder | SHOULD | §5.2.5 | Use `fhirVersions[]` when choosing raw FHIR JSON versions, subject to Holder decision, capability, data, and policy. | Response selection evidence shows version preference handling or justified inability. |
| A-016 | Requester / Verifier | SHALL | §5.2.6 | Encode `items` as an array of request items. | Request schema/procedural validation covers item array shape. |
| A-017 | Holder Wallet / Responder | SHALL | §5.2.6 | Process `items[]` as Holder-review and response-accounting granularity while preserving item ids even if display is grouped or reordered. | UX/state tests show per-item outcomes and exact ids in response. |
| A-018 | Requester / Verifier | SHALL NOT | §5.2.7 | Do not include self-asserted requester identity, origin, reader, certificate, callback, logo, deployment handoff, or trust metadata in the SMART request body. | Generated requests and extension fields contain no prohibited identity/trust metadata. |
| A-019 | Holder Wallet / Responder | SHALL | §5.2.7 | Do not treat any SMART request body field as authenticated requester identity. | UI/trust tests distinguish request text from origin, reader, deployment, or presentation evidence. |
| A-020 | Requester / Verifier | SHALL | §5.3 | Include item `id`, `title`, `content`, and non-empty `accept[]` on every request item. | Request validation rejects missing required item fields and empty `accept[]`. |
| A-021 | Requester / Verifier | SHALL | §5.3.1 | Use non-empty item ids and avoid duplicates within one SMART request. | Request validation rejects empty, non-string, or duplicate item ids. |
| A-022 | Holder Wallet / Responder | SHALL | §5.3.1 | Reject requests with missing, non-string, empty, or duplicate item ids. | Negative item-id fixtures fail before response construction. |
| A-023 | Holder Wallet / Responder | SHALL | §5.3.1 | Compare item ids by exact string equality. | Cross-validation rejects normalized, case-folded, localized, or transformed id variants. |
| A-024 | Requester / Verifier | SHALL | §5.3.2 | Provide non-empty Holder-facing `title` on every item and do not use it as requester identity. | Request review flags missing/empty title and identity-like title misuse. |
| A-025 | Requester / Verifier | SHALL | §5.3.4 | Treat `required` only as advisory workflow context, not consent, authorization, or a disclosure command. | Required items can still produce declined, partial, unavailable, unsupported, or error outcomes. |
| A-026 | Holder Wallet / Responder | SHALL | §5.3.4 | Treat omitted `required` as `false` and never use `required: true` to bypass Holder control or Wallet policy. | Holder-review tests allow refusal or non-fulfillment for required items. |
| A-027 | Requester / Verifier | SHALL | §5.3.5 | Order `accept[]` from most preferred to least preferred and list only media types the Requester can parse, validate, and route. | Request catalog maps each accepted media type to receiver support. |
| A-028 | Holder Wallet / Responder | SHALL | §5.3.5 | Do not return an Artifact for an item unless its `mediaType` appears in that item's `accept[]` or a supported compatibility rule applies. | Response construction rejects or status-reports unaccepted media types. |
| A-029 | Requester / Verifier | SHALL | §5.3.6 | Include `content` as a selector object with string `content.kind` on every request item. | Validator rejects missing/malformed selectors. |
| A-030 | Holder Wallet / Responder | SHALL | §5.3.6 | Do not infer unsupported selector semantics from display text or unrelated fields. | Unknown `content.kind` yields rejection or `unsupported`, not guessed fulfillment. |
| A-031 | Requester / Verifier | SHALL | §5.4 | Use a selector shape defined by §5 or a registered extension selector for interoperable processing. | Generated requests use core or registered selector kinds only. |
| A-032 | Holder Wallet / Responder | SHALL | §5.4 | Evaluate selector semantics independently per request item while allowing §6 many-to-many Artifact fulfillment. | Tests show per-item status plus valid shared Artifacts where allowed. |
| A-033 | Requester / Verifier | SHALL | §5.4.1 | For `fhir.resources`, set `kind` exactly and encode `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, when present, as arrays of strings. | Shape tests reject scalar/object selector fields. |
| A-034 | Requester / Verifier | SHALL | §5.4.1.2 | Encode `profilesFrom` as a non-empty array of canonical profile-family URL strings, not a string, package descriptor, alias, local topic, or URN. | Negative tests include stale scalar/package/local-topic encodings. |
| A-035 | Holder Wallet / Responder | SHALL | §5.4.1.2 | Reject a present `profilesFrom` member that is not a non-empty array of strings. | Selector validation fails invalid `profilesFrom` shapes. |
| A-036 | Holder Wallet / Responder | SHALL | §5.4.1.3 | Treat `resourceTypes[]` as official FHIR resource-type constraints, not local topic labels. | Matching tests require listed FHIR `resourceType` values. |
| A-037 | Holder Wallet / Responder | SHALL | §5.4.1.4 | Treat `profiles[]` and `profilesFrom[]` as additive profile selectors, not narrowing selectors. | Matching accepts resources matching either exact profile or profile-family membership. |
| A-038 | Requester / Verifier | SHALL NOT | §5.4.1.4 | Do not rely on `profiles[]` to narrow a broader `profilesFrom[]` request. | Request review flags examples/tests assuming intersection semantics. |
| A-039 | Requester / Verifier | SHOULD | §5.4.1.5 | Avoid no-selector `fhir.resources` requests unless broad patient-specific FHIR content is safe and clearly explained. | Broad selector review checks workflow justification and Holder-facing text. |
| A-040 | Holder Wallet / Responder | MAY | §5.4.1.5 | Satisfy no-selector `fhir.resources` items with patient-specific FHIR resources compatible with `accept[]`, policy, and Holder choice. | Broad-selector tests show allowed partial fulfillment and no full-export requirement. |
| A-041 | Requester / Verifier | SHALL | §5.4.2 | For `questionnaire`, set `content.kind` to `questionnaire` and include at least one of `canonical` or `resource` directly on the selector. | Validation accepts the flattened selector shape and rejects legacy nested `questionnaire` string/object forms. |
| A-042 | Holder Wallet / Responder | SHALL | §5.4.2 | Reject or report unsupported for Questionnaire selectors with neither `canonical` nor `resource`, non-string/blank `canonical`, non-Questionnaire `resource`, or legacy nested shapes. | Negative questionnaire fixtures produce rejection or `unsupported`. |
| A-043 | Holder Wallet / Responder | SHALL NOT | §5.4.2.4 | Do not silently merge conflicting Questionnaire `canonical` and inline `resource` definitions or rewrite canonical identity. | Conflict tests yield `unsupported` or `error`, not silent merge. |
| A-044 | Deployment/profile author | SHALL | §5.4.3 | Define extension selector kind string, JSON shape, clinical meaning, fulfillment, validation, unsupported behavior, security, privacy, and examples. | Extension registration checklist covers all required fields. |
| A-045 | Requester / Verifier | SHALL | §5.5 | Apply canonical version-suffix handling rules for each operation it performs, preserving exact wire strings where required. | Tests preserve exact strings for transport/fixtures and compare at defined normalization levels. |
| A-046 | Holder Wallet / Responder | SHALL | §5.5 | Resolve canonicals with a configured resolver or FHIR canonical search when versioned, verify returned `(resourceType, url, version)`, and use direct HTTP dereference only for unversioned canonicals. | Resolver tests reject version-mismatched resources and do not direct-fetch versioned canonicals by stripping a version suffix. |
| A-047 | Holder Wallet / Responder | SHALL | §5.5 | Preserve requested Questionnaire canonical in generated `QuestionnaireResponse.questionnaire` when known. | Questionnaire response fixtures retain canonical version suffixes when provided. |
| A-048 | Holder Wallet / Responder | SHALL NOT | §5.5 | Do not remove canonical version suffixes from returned FHIR `meta.profile` values or exact-version profile evidence merely due to routing or grouping. | Raw FHIR fixtures preserve versioned `meta.profile` values. |
| A-049 | Requester / Verifier | SHALL | §5.6 | Encode each `accept[]` as a non-empty ordered array of media type strings and use order as preference. | Request validation preserves order and finds no separate preference field. |
| A-050 | Holder Wallet / Responder | SHOULD | §5.6 | Choose the earliest acceptable media type it can produce when response forms are otherwise equivalent. | Media negotiation tests or policy review show preference-order handling. |
| A-051 | Holder Wallet / Responder | SHALL | §6.1 | Include response `type`, `version`, `requestId`, `artifacts`, and `requestStatus`; set constants to `smart-health-checkin-response` and `1`. | Response schema/procedural validation covers top-level fields and constants. |
| A-052 | Requester / Verifier | SHALL | §6.1.1 | Reject responses whose `type` is absent or not exactly `smart-health-checkin-response`. | Negative discriminator tests fail. |
| A-053 | Requester / Verifier | SHALL | §6.1.2 | Reject responses whose `version` is absent or not exactly `1`, unless a future compatibility rule applies. | Version mismatch tests fail under v1.0. |
| A-054 | Holder Wallet / Responder | SHALL | §6.1.3 | Set response `requestId` to the exact accepted SMART request `id`. | Response construction tests assert exact equality. |
| A-055 | Requester / Verifier | SHALL | §6.1.3 | Reject a SMART response whose `requestId` does not exactly equal the original SMART request `id`. | Cross-validation test mutates `requestId`. |
| A-056 | Holder Wallet / Responder | SHALL | §6.2 | Include Artifact `id`, `mediaType`, non-empty `fulfills[]`, and the payload fields defined by that Artifact media type on every Artifact. | Response validation rejects missing common fields and payload shapes not defined for the media type. |
| A-057 | Holder Wallet / Responder | SHALL NOT | §6.2.1 | Do not reuse the same Artifact `id` within one SMART response. | Duplicate Artifact-id validation fails. |
| A-058 | Requester / Verifier | SHALL | §6.2.1 | Reject duplicate, missing, non-string, or empty Artifact ids. | Negative Artifact-id fixtures fail. |
| A-059 | Holder Wallet / Responder | SHALL | §6.2.2 | Use `mediaType` as the Artifact clinical response form, not a separate Artifact-level protocol `type`. | Artifact fixtures use `mediaType` for clinical form. |
| A-060 | Holder Wallet / Responder | SHALL | §6.2.3 | Set every `fulfills[]` value to exactly one original request item id. | Response construction forbids unknown or empty fulfillment references. |
| A-061 | Requester / Verifier | SHALL | §6.2.3 | Reject unresolved, absent, empty, or non-string `fulfills[]` references. | Cross-validation rejects unknown or malformed fulfillment references. |
| A-062 | Requester / Verifier | SHALL | §6.2.4 | Do not infer dereferencing, decoding, signature, freshness, integrity, or generic carrier semantics from field names alone. | Extension Artifact tests require media-type-defined payload and processing rules. |
| A-063 | Holder Wallet / Responder | SHALL | §6.3.1 | For `application/smart-health-card`, include non-empty `value.verifiableCredential[]` and no outer Artifact `fhirVersion`. | Artifact validation rejects missing VC list or outer `fhirVersion`. |
| A-064 | Requester / Verifier | SHALL | §6.3.1 | Verify and process each SMART Health Card JWS according to SMART Health Cards and local trust policy. | SHC validation/trust tests run on each `verifiableCredential[]` JWS. |
| A-065 | Holder Wallet / Responder | SHALL | §6.3.2 | For `application/fhir+json`, include non-empty `fhirVersion` and FHIR JSON `value` as a Resource or Bundle. | Artifact validation rejects absent `fhirVersion` and non-FHIR object payloads. |
| A-066 | Holder Wallet / Responder | SHALL NOT | §6.3.2 | Do not mix resources requiring different FHIR releases within one `application/fhir+json` Artifact. | Mixed-release content is split or status-reported, not mixed in one Artifact. |
| A-067 | Requester / Verifier | SHOULD | §6.3.2 | Treat raw FHIR `fhirVersion` not acceptable for the original request or receiver as unsupported for ingestion. | Receiver policy checks requested FHIR versions before ingestion. |
| A-068 | Deployment/profile author | SHALL | §6.3.3 | Define extension Artifact media types as branded variants with pinned media type, typed payload fields, validation, FHIR-version handling, status behavior, security/privacy, and compatibility. | Extension registration includes all required processing and validation rules and does not rely on `GenericArtifact`. |
| A-069 | Holder Wallet / Responder | SHALL | §6.4.1 | Include exactly one `requestStatus[]` entry for every original request item and no unknown or duplicate item ids. | Response tests compare status item set exactly to request item id set. |
| A-070 | Requester / Verifier | SHALL | §6.4.1 | Reject a SMART response unless `requestStatus[]` covers every request item exactly once with no unknown item ids. | Cross-validation tests missing, duplicate, and unknown status items. |
| A-071 | Holder Wallet / Responder | SHALL | §6.4.2 | Use only v1.0 status codes unless a supported future status-code extension applies. | Status validation rejects codes outside `fulfilled`, `partial`, `unavailable`, `declined`, `unsupported`, `error`. |
| A-072 | Holder Wallet / Responder | SHALL | §6.4.2 | Use `unsupported`, `unavailable`, `declined`, `partial`, `fulfilled`, and `error` according to defined item-outcome semantics. | Outcome tests cover unsupported format, unavailable data, Holder refusal, partial sharing, full fulfillment, and processing errors. |
| A-073 | Holder Wallet / Responder | SHALL NOT | §6.4.3 | Do not put secrets, access tokens, stack traces, unnecessary patient details, or unrelated Holder data in `requestStatus[].message`. | Message lint/review inspects status messages. |
| A-074 | Requester / Verifier | SHALL | §6.4.3 | Do not rely on localized `message` text to determine normative status semantics. | Receivers process `status` code, not message text. |
| A-075 | Holder Wallet / Responder | MAY | §6.5 | Return one Artifact for multiple items or multiple Artifacts for one item only when every fulfillment edge satisfies media-type and selector rules. | Many-to-many tests validate each `fulfills[]` edge independently. |
| A-076 | Requester / Verifier | SHALL | §6.6 | Apply full request/response cross-validation before treating a response as protocol-valid; shape validation alone is insufficient. | Harness validates against original request, not response schema alone. |
| A-077 | Requester / Verifier | SHALL | §6.6.3 | Enforce that each Artifact `mediaType` is accepted by every fulfilled item unless a supported registered compatibility rule applies. | §6.6 validation rejects unaccepted media types. |
| A-078 | Requester / Verifier | SHALL | §6.6.5 | For raw FHIR JSON, verify `fhirVersion`, FHIR object shape, Bundle interpretation, and no mixed FHIR releases in one Artifact. | Raw FHIR cross-validation/quarantine tests cover each condition. |
| A-079 | Requester / Verifier | SHOULD | §6.6.6 | Inspect returned FHIR `resourceType`, `meta.profile`, Bundle entries, and `QuestionnaireResponse.questionnaire` when assessing selector responsiveness. | FHIR-aware validation or quarantine policy evaluates payload evidence. |
| A-080 | Requester / Verifier | SHALL | §7 | Preserve trust-layer separation among origin, reader, issuer/device, clinical-source, and deployment policy. | Trust report records separate pass/fail/unknown state for each layer. |
| A-081 | Holder Wallet / Responder | SHALL | §7.1.1 | Use platform-provided authenticated origin or approved origin-equivalent for origin trust, not SMART request fields or deployment handoff metadata. | Origin-binding tests reject request-body origin substitutes. |
| A-082 | Holder Wallet / Responder | SHALL | §7.1.3 | Treat origin trust as absent when web origin or privileged-caller context cannot be authenticated. | Missing-origin tests produce absent-origin state or defined flow failure. |
| A-083 | Requester / Verifier | MAY | §7.2.1 | Include optional per-`DocRequest.readerAuth` for same-device requests. | If present, request bytes include detached `COSE_Sign1` bound to §8 inputs. |
| A-084 | Requester / Verifier | Conditional | §7.2.1 | If including `readerAuth`, construct it for the same presentation session and exact requested items; do not reuse across sessions, transcripts, or `ItemsRequest` bytes. | ReaderAuth vectors bind signature to exact `SessionTranscript` and tag-24 `ItemsRequest`. |
| A-085 | Holder Wallet / Responder | Conditional | §7.2.1 | If supporting or relying on `readerAuth`, verify COSE signature, signed context, detached payload binding, relevant bytes, algorithm/key evidence, and trust policy. | Validation distinguishes absent, malformed, failed, valid-untrusted, and trusted states. |
| A-086 | Holder Wallet / Responder | SHALL | §7.2.3 | Treat absent `readerAuth` as absent reader authentication and invalid/untrusted `readerAuth` as failed authentication. | Policy/UI tests do not display failed or absent readerAuth as trusted. |
| A-087 | Requester / Verifier | SHALL | §7.3 | Complete §8 mdoc issuer, digest, device-key, encryption, `SessionTranscript`, and response-extraction checks before relying on mdoc-layer evidence. | Verifier tests fail on invalid MSO, digest, device signature, transcript, or HPKE opening. |
| A-088 | Requester / Verifier | SHALL | §7.3.1 | Apply issuer trust-anchor policy before claiming production mdoc issuer trust. | Validation report shows issuer signature/path/key evidence and policy result. |
| A-089 | Requester / Verifier | SHALL | §7.3.2 | Verify device-key proof bound to the expected presentation session before treating mdoc presentation as device-bound. | DeviceAuthentication tests fail on wrong `SessionTranscript` or device key. |
| A-090 | Requester / Verifier | SHALL | §7.4 | Evaluate clinical-source trust from Artifact media type, signatures/provenance, selectors, FHIR evidence, and deployment policy; do not infer provenance from transport success. | Raw FHIR and SHC provenance are recorded separately from mdoc validation. |
| A-091 | Requester / Verifier | SHALL | §7.4.1 | For SMART Health Card Artifacts, verify every VC JWS and evaluate payload content against original selectors and local policy. | SHC verifier logs signature/trust plus selector evaluation. |
| A-092 | Requester / Verifier | SHALL | §7.4.2 | Treat raw `application/fhir+json` as patient-mediated unless accepted separate provenance, signature, source attestation, authenticated retrieval, or equivalent proof is present. | Workflow policy does not equate raw FHIR with SHC or signed source evidence. |
| A-093 | Requester / Verifier | SHALL | §7.5 | Preserve identifier scopes and do not use an identifier from one layer as proof or authorization for another. | Tests distinguish request id, item ids, Artifact ids, and presentation-session values. |
| A-094 | Deployment/profile author | SHALL | §7.6 | Document mandatory trust layers, accepted anchors/registries, freshness/replay expectations, failure handling, assurance levels, and Holder display rules. | Deployment profile includes trust policy matrix and failure behavior. |
| A-095 | Requester / Verifier | Optional-profile | §8.1 | For direct same-device support, use `org-iso-mdoc`, `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, element `smart_health_checkin_response`, and requestInfo key `org.smarthealthit.checkin.request` exactly. | Wire capture matches all fixed identifiers. |
| A-096 | Holder Wallet / Responder | Optional-profile | §8.1 | Carry the SMART response only as `smart_health_checkin_response` `elementValue` in namespace `org.smarthealthit.checkin`. | mdoc response inspection rejects dynamic elements and alternate carriers. |
| A-097 | Requester / Verifier | SHALL | §8.2 | Serialize the SMART request as UTF-8 JSON text in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. | DeviceRequest fixture shows CBOR text string, not CBOR map or base64 JSON. |
| A-098 | Requester / Verifier | SHALL | §8.2.2 | Construct `ItemsRequest` with version-1 docType, namespace, stable response element, requestInfo, and `intentToRetain` behavior. | Byte-ladder or decoded request verifies logical shape and retention flag. |
| A-099 | Requester / Verifier | SHALL | §8.2.3 | CBOR-encode `ItemsRequest` and wrap those bytes in CBOR tag 24 in `DocRequest.itemsRequest`. | Fixture comparison checks tag-24 boundary. |
| A-100 | Requester / Verifier | SHALL | §8.2.4 | Use `DeviceRequest.version` exactly `1.0`; do not use v1.1 `readerAuthAll` as core v1.0 reader authentication. | DeviceRequest tests reject `readerAuthAll` for core profile. |
| A-101 | Requester / Verifier | Conditional | §8.2.4 | If including `readerAuth`, construct detached ES256 `COSE_Sign1` over tag-24 `ReaderAuthentication` with payload `null`, empty external AAD, protected alg `-7`, exact transcript/request bytes, and label 33 `x5chain`. | ReaderAuth vector verifies payload null, alg `-7`, label 33 certificate evidence, and signature input. |
| A-102 | Requester / Verifier | SHOULD | §8.2.5 | Use a fresh HPKE recipient key pair and fresh unpredictable nonce for each presentation session. | Session tests show new nonce/key per request or documented profile for reuse. |
| A-103 | Requester / Verifier | SHALL | §8.2.5 | Generate/select HPKE P-256 recipient key material and construct `encryptionInfo = ["dcapi", {nonce, recipientPublicKey}]`. | Decoded `encryptionInfo` has direct dcapi shape and P-256 COSE_Key. |
| A-104 | Requester / Verifier | SHALL | §8.2.6 | Base64url-encode `DeviceRequest` and `encryptionInfo` CBOR bytes without padding and preserve exact `encryptionInfo` string. | DC API request fixture checks unpadded strings and exact transcript input. |
| A-105 | Requester / Verifier | SHALL | §8.3 | Compute `SessionTranscript` from exact `encryptionInfoBase64Url` and authenticated origin as the direct `dcapi` handover. | Byte-ladder recomputes `dcapiInfo`, SHA-256 handover, and transcript bytes. |
| A-106 | Holder Wallet / Responder | SHALL | §8.3 | Obtain origin from authenticated platform or approved origin-equivalent, never from SMART request fields or deployment handoff metadata. | Wallet trace records authenticated origin source and rejects fallback substitutions. |
| A-107 | Holder Wallet / Responder | SHALL | §8.4 | Validate the `org-iso-mdoc` request wrapper, `DeviceRequest`, tag-24 `ItemsRequest`, requestInfo SMART request, `encryptionInfo`, and transcript before response construction. | Wallet-side validation checklist passes; malformed wrappers fail safely. |
| A-108 | Holder Wallet / Responder | SHALL | §8.4 | Perform Holder review or equivalent Holder-control processing at request-item granularity and preserve item ids. | UX/policy evidence shows per-item accounting and no `required`-as-consent behavior. |
| A-109 | Holder Wallet / Responder | SHALL | §8.5 | Place SMART response JSON text as `elementValue` of issuer-signed `smart_health_checkin_response` in namespace `org.smarthealthit.checkin`. | DeviceResponse inspection locates the stable issuer-signed element. |
| A-110 | Holder Wallet / Responder | SHALL | §8.5.2 | Construct MSO with docType `org.smarthealthit.checkin.1`, SHA-256 digest algorithm, value digest covering the stable element, and deviceKeyInfo. | mdoc validation verifies MSO fields, digest binding, and issuerAuth. |
| A-111 | Holder Wallet / Responder | SHALL | §8.5.3 | Produce device authentication bound to the same `SessionTranscript`, docType, and tag-24 `DeviceNameSpaces`. | Device signature fixture validates payload and MSO device key. |
| A-112 | Holder Wallet / Responder | SHALL | §8.6 | Encrypt CBOR `DeviceResponse` with HPKE DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript`, and empty AAD. | HPKE tests reject plaintext, wrong suite, wrong info, or non-empty AAD. |
| A-113 | Requester / Verifier | SHALL | §8.7 | Decode and HPKE-open `dcapiResponse`, validate DeviceResponse, issuer/MSO, digest, device proof, stable element, SMART response, and §6.6 before acceptance. | Verifier checklist covers all §8.7 steps and rejection on failure. |
| A-114 | Requester / Verifier | SHALL | §8.8 | Reject or quarantine if HPKE, mdoc issuer/MSO, digest, device-authentication, stable-element, SMART response, or §6.6 validation fails. | Negative vectors for each failure path do not reach workflow acceptance. |
| A-115 | Conformance/fixture author | SHOULD | Appendix D | Classify same-device fixture roots and byte ladders without inventing alternate carriers or clinical semantics. | Fixture metadata marks conformance candidate, diagnostic, historical, regression, or illustrative status. |
| A-116 | Requester / Verifier | SHALL | §11.1 | Keep same-device HPKE and other presentation cryptographic contexts separate. | Tests fail when keys, recipients, info/transcripts, AAD, or ciphertext fields are substituted across contexts. |
| A-117 | Holder Wallet / Responder | SHALL | §11.1 | Do not downgrade active v1.0 same-device response encryption to plaintext or alternate HPKE context. | Transport tests reject plaintext `DeviceResponse` and substituted suite/info/AAD. |
| A-118 | Requester / Verifier | SHOULD | §11.2 | Use flow-specific freshness controls and do not treat request ids, item ids, Artifact ids, or deployment handoff ids as freshness proofs. | Replay tests distinguish correlation ids from freshness evidence. |
| A-119 | Holder Wallet / Responder | SHALL | §11.4 | Do not treat mere presence of `readerAuth`, `x5chain`, names, logos, or demo certificates as successful reader authentication. | ReaderAuth policy requires cryptographic verification and trust evaluation. |
| A-120 | Requester / Verifier | SHALL | §11.5 | Do not treat mdoc issuer/device evidence, HPKE opening, readerAuth, or request-id matching as production issuer accreditation or clinical-source provenance by themselves. | Trust report separates issuer/device evidence from production trust and clinical provenance. |
| A-121 | Requester / Verifier | SHALL | §11.6 | Reject unsupported or unexpected algorithm labels for the v1.0 profile instead of downgrading or substituting library defaults. | Algorithm mutation tests fail closed for wrong COSE/HPKE labels. |
| A-122 | Requester / Verifier | SHOULD | §11.7 | Minimize collection, display, and retention of plaintext requests, responses, FHIR, SHCs, private keys, secrets, and full ciphertext except controlled diagnostics. | Logging/debug review redacts or disables sensitive plaintext outside controlled fixtures. |
| A-123 | Requester / Verifier | SHOULD | §12.1 | Request the minimum clinical or administrative content needed for the bounded check-in workflow. | Request review favors narrow items, selectors, media types, and FHIR versions. |
| A-124 | Holder Wallet / Responder | SHALL | §12.1 | Provide Holder review or equivalent Holder-control at request-item granularity before disclosing content. | UX/policy evidence shows item-level control and meaningful disclosure choices. |
| A-125 | Holder Wallet / Responder | SHOULD | §12.2 | Construct the smallest set of Artifacts that accurately satisfies approved items and accepted response forms. | Response packaging review avoids unrelated over-disclosure. |
| A-126 | Requester / Verifier | SHALL | §12.2 | Do not imply clinical-source provenance for unsigned raw FHIR from mdoc, HPKE, Artifact ids, `fulfills[]`, `requestId`, or Holder approval. | Provenance assessment requires separate accepted evidence. |
| A-127 | Requester / Verifier | SHOULD | §12.3 | Avoid reusing identifiers across unrelated sessions, Verifiers, or Holders and avoid embedding patient/requester/secrets/clinical facts in ids. | Identifier generation and logs show scoped, non-identifying values. |
| A-128 | Requester / Verifier | SHOULD | §12.7 | Do not send plaintext protocol payloads, clinical content, private keys, bearer URLs, full ciphertext blobs, or unredacted sensitive stack traces to routine telemetry. | Telemetry review confirms redaction, aggregation, sampling, or controlled diagnostic handling. |
| A-129 | Requester / Verifier | SHALL | §13.1 | Compare media/content-type strings by exact, case-sensitive equality unless a future registered extension defines otherwise. | Media type mutation tests fail by default. |
| A-130 | Holder Wallet / Responder | SHALL | §13.1 | Do not claim Artifact fulfillment unless `mediaType` appears in the fulfilled item's `accept[]`, except for supported registered compatibility rules. | Response construction enforces exact media-type acceptance. |
| A-131 | Requester / Verifier | SHALL | §13.2 | Use mdoc/DC API identifiers exactly and do not treat external registry registration as already complete unless it is. | Conformance report uses exact values and marks provisional/external status accurately. |
| A-132 | Holder Wallet / Responder | SHALL | §13.3 | Use only core status codes in v1.0 unless a future status-code extension is explicitly supported by the receiver. | Unknown status codes are absent or extension-scoped. |
| A-133 | Holder Wallet / Responder | SHALL | §13.4 | Do not infer unsupported selector semantics from display text, profile labels, local topics, deployment handoff metadata, or requester identity metadata. | Unsupported-kind tests yield rejection or `unsupported`. |
| A-134 | Deployment/profile author | SHALL | §13.5 | Do not use profile identifiers as SMART request fields, selectors, Artifact media types, status codes, request presets, or substitutes for §5 selectors and `accept[]`. | Profile review rejects `requestProfile`, preset, IPS, all-of-the-above, and topic-label shortcuts. |
| A-135 | Deployment/profile author | SHALL | §13.7 | Use designated expert review before treating new status codes, selector kinds, branded Artifact media types, profile ids, payload kinds, or mdoc changes as interoperable registrations. | Registry change record includes expert review and required metadata. |
| A-136 | Requester / Verifier | SHALL | §14.1 | Do not localize protocol identifiers or machine values, including request/response ids, item ids, media types, status codes, canonicals, and mdoc ids. | Localization tests preserve exact machine values. |
| A-137 | Requester / Verifier | SHALL | §14.1 | Do not rely on unknown members, deployment handoff parameters, browser language, or HTTP headers as interoperable locale-negotiation signals. | Locale tests find no core `lang`, `locale`, `Accept-Language`, or negotiated-locale behavior. |
| A-138 | Holder Wallet / Responder | SHOULD | §14.1 | Render or process FHIR language/localization according to FHIR version, implementation guide, and local clinical-display policy. | FHIR display tests follow applicable FHIR i18n behavior. |
| A-139 | Holder Wallet / Responder | SHALL | §14.1 | If display text is translated, summarized, grouped, reordered, or suppressed, preserve protocol values used for construction and validation. | UX tests show exact ids, selectors, media types, fulfillment links, and status codes preserved. |
| A-140 | Requester / Verifier | SHALL | §14.2 | Do not use Unicode normalization, case folding, accent folding, BIDI reordering, translation, or locale collation to make distinct protocol identifiers compare equal. | Identifier comparison tests remain exact across Unicode variants. |
| A-141 | Holder Wallet / Responder | SHOULD | §14.2 | Isolate untrusted display text from adjacent labels, identifiers, URLs, trust indicators, warnings, and action buttons for BIDI safety. | UI review covers `purpose`, item text, Questionnaire text, FHIR displays, and messages. |

---

## Appendix B. JSON Schema for `SmartHealthCheckinRequest` and `SmartHealthCheckinResponse`

This appendix provides JSON Schema snippets for the transport-neutral SMART request and SMART response objects defined in §§5-6. The snippets are intended for structural validation, fixture review, and conformance-test scaffolding. They do not define mdoc carriage, registry behavior, full FHIR validation, SMART Health Card validation, or downstream clinical ingestion policy.

If a schema rule in this appendix appears to conflict with §§5-6, §§5-6 control. Normative language in this appendix either restates §§5-6 or is scoped to conformance with these Appendix B schema snippets.

### B.1 Dialect and validation model

The schema snippets use JSON Schema 2020-12 (`https://json-schema.org/draft/2020-12/schema`). A validator that claims conformance to Appendix B SHALL evaluate these snippets using JSON Schema 2020-12 semantics, or a later dialect only when that dialect is known to preserve the semantics of the keywords used here.

The snippets intentionally keep core extension points open. Unknown members are not made schema errors solely by Appendix B, because §§5-6 allow forward-compatible unknown members and registered extension selectors. Registered extension Artifact media types are represented by additional or profiled schemas rather than by a generic core catch-all. Deployment profiles MAY publish stricter schemas, but those schemas must identify their additional constraints rather than silently changing the core protocol.

JSON Schema validation is not complete SMART Health Check-in validation. A Verifier still applies the request/response, FHIR, SMART Health Card, transport, trust, and deployment-policy checks required elsewhere in the specification. Section B.4 summarizes important checks that are not fully expressible in these standalone schemas.

The request schema requires `items[]` but does not set `minItems: 1`, because §5.2.6 currently says a Requester SHOULD include at least one request item and leaves any hard prohibition on zero-item requests to later schema/conformance closure.

### B.2 `SmartHealthCheckinRequest` schema

The request schema fixes the top-level `type` and `version`, requires the top-level fields from §5.2, validates the item shape from §5.3, and validates the two core selector shapes from §5.4 while leaving room for registered extension selector kinds.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/SmartHealthCheckinRequest.schema.json",
  "title": "SmartHealthCheckinRequest",
  "type": "object",
  "required": ["type", "version", "id", "items"],
  "properties": {
    "type": { "const": "smart-health-checkin-request" },
    "version": { "const": "1" },
    "id": { "$ref": "#/$defs/nonEmptyString" },
    "purpose": { "type": "string" },
    "fhirVersions": {
      "type": "array",
      "items": { "$ref": "#/$defs/nonEmptyString" }
    },
    "items": {
      "type": "array",
      "items": { "$ref": "#/$defs/requestItem" }
    }
  },
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "canonicalString": {
      "type": "string",
      "minLength": 1,
      "description": "FHIR canonical reference string; a |version suffix, when present, is parsed as structured canonical-reference version metadata rather than as part of a direct HTTP URL."
    },
    "canonicalUrlString": {
      "type": "string",
      "minLength": 1,
      "pattern": "^https?://\\S+$"
    },
    "mediaTypeString": { "type": "string", "minLength": 1 },
    "requestItem": {
      "type": "object",
      "required": ["id", "title", "content", "accept"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "title": { "$ref": "#/$defs/nonEmptyString" },
        "summary": { "type": "string" },
        "required": { "type": "boolean" },
        "content": { "$ref": "#/$defs/contentSelector" },
        "accept": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/mediaTypeString" }
        }
      },
      "additionalProperties": true
    },
    "contentSelector": {
      "oneOf": [
        { "$ref": "#/$defs/fhirResourcesSelector" },
        { "$ref": "#/$defs/questionnaireSelector" },
        { "$ref": "#/$defs/extensionSelector" }
      ]
    },
    "fhirResourcesSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": { "const": "fhir.resources" },
        "profiles": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalString" }
        },
        "profilesFrom": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/canonicalUrlString" }
        },
        "resourceTypes": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      },
      "additionalProperties": true
    },
    "questionnaireSelector": {
      "type": "object",
      "required": ["kind"],
      "anyOf": [
        { "required": ["canonical"] },
        { "required": ["resource"] }
      ],
      "not": { "required": ["questionnaire"] },
      "properties": {
        "kind": { "const": "questionnaire" },
        "canonical": { "$ref": "#/$defs/canonicalString" },
        "resource": { "$ref": "#/$defs/inlineQuestionnaire" }
      },
      "additionalProperties": true
    },
    "inlineQuestionnaire": {
      "type": "object",
      "required": ["resourceType"],
      "properties": {
        "resourceType": { "const": "Questionnaire" }
      },
      "additionalProperties": true
    },
    "extensionSelector": {
      "type": "object",
      "required": ["kind"],
      "properties": {
        "kind": {
          "type": "string",
          "minLength": 1,
          "not": { "enum": ["fhir.resources", "questionnaire"] }
        }
      },
      "additionalProperties": true
    }
  }
}
```

Notes on this request schema:

- `profilesFrom[]` is a non-empty array of canonical URL strings. It is not a singleton string, object, package descriptor, implementation-guide object, package id, package version, registry alias, local topic label, or URN form in version 1.0.
- `profiles[]` and `profilesFrom[]` are independently allowed in the same `fhir.resources` selector. Their combined presence is additive under §5.4.1.4; the schema does not make either array narrow the other.
- `profiles[]` and `resourceTypes[]`, when present, are arrays with at least one string. Whether a `resourceTypes[]` value is an official FHIR `resourceType` for a particular FHIR release is a FHIR-aware procedural check.
- A `fhir.resources` selector may omit all of `profiles[]`, `profilesFrom[]`, and `resourceTypes[]` to express the no-selector default from §5.4.1.5.
- A questionnaire selector is a single object shape with `kind: "questionnaire"` and one or both of the sibling members `canonical` and `resource`. The legacy nested `questionnaire` string/object/wrapper forms are not accepted by this schema.
- Canonical strings MAY include a `|version` suffix. Consumers parse the suffix as structured FHIR canonical-reference version metadata and do not treat it as part of a direct HTTP URL.
- The extension-selector branch permits syntactic validation of registered extension selector kinds without embedding a future registry in Appendix B. A core-only deployment profile can replace this branch when it intentionally rejects all extension selectors.
- The SMART request body SHALL NOT carry requester identity metadata under §5.2.7. This schema cannot reliably reject arbitrary identity-like unknown or extension members while keeping extension points open, so processors must enforce that prohibition procedurally and through extension review.

### B.3 `SmartHealthCheckinResponse` schema

The response schema fixes `type` and `version`, requires `requestId`, `artifacts[]`, and `requestStatus[]`, validates the common Artifact shape, branches on `mediaType` for the two core Artifact classes, and validates the version 1.0 status-code set. Registered extensions can publish additional profiled schemas for additional Artifact media types; the core schema does not include a generic unknown-media-type catch-all.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://smarthealth.cards/checkin/1.0/schema/SmartHealthCheckinResponse.schema.json",
  "title": "SmartHealthCheckinResponse",
  "type": "object",
  "required": ["type", "version", "requestId", "artifacts", "requestStatus"],
  "properties": {
    "type": { "const": "smart-health-checkin-response" },
    "version": { "const": "1" },
    "requestId": { "$ref": "#/$defs/nonEmptyString" },
    "artifacts": {
      "type": "array",
      "items": { "$ref": "#/$defs/artifact" }
    },
    "requestStatus": {
      "type": "array",
      "items": { "$ref": "#/$defs/itemStatus" }
    }
  },
  "additionalProperties": true,
  "$defs": {
    "nonEmptyString": { "type": "string", "minLength": 1 },
    "mediaTypeString": { "type": "string", "minLength": 1 },
    "artifactBase": {
      "type": "object",
      "required": ["id", "mediaType", "fulfills"],
      "properties": {
        "id": { "$ref": "#/$defs/nonEmptyString" },
        "mediaType": { "$ref": "#/$defs/mediaTypeString" },
        "fulfills": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/nonEmptyString" }
        }
      },
      "additionalProperties": true
    },
    "artifact": {
      "oneOf": [
        { "$ref": "#/$defs/smartHealthCardArtifact" },
        { "$ref": "#/$defs/rawFhirJsonArtifact" }
      ]
    },
    "smartHealthCardArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "required": ["value"],
          "properties": {
            "mediaType": { "const": "application/smart-health-card" },
            "value": {
              "type": "object",
              "required": ["verifiableCredential"],
              "properties": {
                "verifiableCredential": {
                  "type": "array",
                  "minItems": 1,
                  "items": { "$ref": "#/$defs/nonEmptyString" }
                }
              },
              "additionalProperties": true
            }
          },
          "not": { "required": ["fhirVersion"] },
          "additionalProperties": true
        }
      ]
    },
    "rawFhirJsonArtifact": {
      "allOf": [
        { "$ref": "#/$defs/artifactBase" },
        {
          "type": "object",
          "required": ["fhirVersion", "value"],
          "properties": {
            "mediaType": { "const": "application/fhir+json" },
            "fhirVersion": { "$ref": "#/$defs/nonEmptyString" },
            "value": {
              "type": "object",
              "required": ["resourceType"],
              "properties": {
                "resourceType": { "$ref": "#/$defs/nonEmptyString" }
              },
              "additionalProperties": true
            }
          },
          "additionalProperties": true
        }
      ]
    },
    "itemStatus": {
      "type": "object",
      "required": ["item", "status"],
      "properties": {
        "item": { "$ref": "#/$defs/nonEmptyString" },
        "status": {
          "enum": ["fulfilled", "partial", "unavailable", "declined", "unsupported", "error"]
        },
        "message": { "type": "string" }
      },
      "additionalProperties": true
    }
  }
}
```

Notes on this response schema:

- `artifacts[]` MAY be empty. Per-item outcomes are still reported through `requestStatus[]`.
- Every Artifact has `id`, `mediaType`, and non-empty `fulfills[]` at the common level. Uniqueness of Artifact ids and validity of fulfillment references require procedural validation.
- `application/smart-health-card` Artifacts use `value.verifiableCredential[]` as a non-empty array of strings and SHALL NOT carry an outer Artifact-level `fhirVersion`. FHIR-version semantics for this branch are inside each signed SMART Health Card credential payload.
- `application/fhir+json` Artifacts require `fhirVersion` and `value`. The schema checks only that `value` is a JSON object with a string `resourceType`; it does not validate the full FHIR Resource, Bundle entries, terminology, profiles, or release-specific FHIR grammar.
- The core Artifact schema accepts only the two core `mediaType` discriminator values above. Registered extension Artifacts are represented by additional schemas or deployment profiles that pin their own `mediaType` value or bounded media-type pattern and define their own payload-bearing fields.
- `requestStatus[].status` is limited to the version 1.0 status code set unless a future registered extension is explicitly supported by the receiving Verifier and by a corresponding schema/profile.

### B.4 Validation not fully expressible in JSON Schema

A conforming implementation MUST NOT treat successful validation against the snippets above as complete protocol validation. At minimum, the following constraints require procedural validation against the original request, returned payloads, FHIR knowledge, registries, presentation transport, trust policy, or deployment policy.

| Constraint | Why the standalone schema is insufficient |
| --- | --- |
| `SmartHealthCheckinResponse.requestId` equals `SmartHealthCheckinRequest.id` | The response schema has no access to the original request value. |
| Every `artifacts[].fulfills[]` value resolves to a request item id | The response schema cannot inspect the original request's `items[].id` set. |
| `requestStatus[]` covers every request item exactly once | JSON Schema cannot, in a standalone response schema, compare status `item` values to the original request's item-id set. |
| Duplicate request item ids, duplicate Artifact ids, and duplicate status items | JSON Schema 2020-12 `uniqueItems` compares whole array entries; it does not portably enforce uniqueness of a selected object member such as `id` or `item`. |
| Duplicate JSON object member names | Many validators receive an already-parsed JSON data model after duplicate-member handling has occurred. |
| Artifact `mediaType` is accepted by each fulfilled item | This requires joining each Artifact's `fulfills[]` values to request items and checking each item's `accept[]`, including any registered compatibility rule. |
| Requester identity metadata prohibition | The base schema keeps unknown members and extension points open. Detecting arbitrary self-asserted requester identity fields requires procedural policy, allow-lists, extension review, or a stricter deployment profile. |
| Bundle traversal and selector responsiveness | Raw FHIR Bundle validation requires inspecting `Bundle.entry[].resource`, resource types, profiles, and sometimes supporting resources; the outer Bundle alone is not enough. |
| Profile-family membership for `profilesFrom[]` | Membership depends on implementation-guide knowledge, package metadata, configured family mappings, registry information, or local policy outside the JSON instance. |
| Additive profile-selector semantics | The schema can allow `profiles[]` and `profilesFrom[]` together, but it cannot determine whether returned content satisfies either additive profile selector subject to `resourceTypes[]`. |
| QuestionnaireResponse comparison | A Verifier may need to compare `QuestionnaireResponse.questionnaire` with a requested questionnaire selector's `canonical`, inline Questionnaire `url`/`version`, and §5.5 structured `|version` handling. |
| Raw FHIR release consistency | The schema can require an outer `fhirVersion`, but detecting mixed-release Bundles and deciding whether a raw FHIR Artifact's release is acceptable requires FHIR-aware and request-aware checks. |
| SMART Health Card payload validation | The schema can check the wrapper's `verifiableCredential[]` shape, but JWS verification, payload inspection, issuer trust, FHIR version, and selector responsiveness are SMART Health Cards and policy checks. |
| Full FHIR profile validation | FHIR profile, terminology, invariant, Questionnaire, and implementation-guide validation require FHIR validators and deployment policy outside the core JSON Schema. |
| Limits not fixed by §§5-6 | Maximum string lengths, array sizes, byte sizes, URL dereferencing behavior, and extension payload limits belong to transport profiles, extension registrations, conformance tooling, or deployment policy unless later normative text fixes them. |

### B.5 Illustrative validation flow

The following sequence is illustrative. It shows where Appendix B schema validation fits relative to other validation; it is not a new transport binding or implementation API.

1. Parse JSON using RFC 8259 rules and reject duplicate object member names when detected.
2. Validate the SMART request against the B.2 request schema.
3. Apply §5 procedural checks, including duplicate request-item id detection, registered extension-selector handling, and requester-identity metadata review.
4. Validate the SMART response against the B.3 response schema.
5. Apply §6.6 cross-validation against the original request: exact `requestId` match, `fulfills[]` reference resolution, per-item `accept[]` compatibility, exact `requestStatus[]` coverage, and FHIR-version checks.
6. Apply FHIR, SMART Health Card, QuestionnaireResponse, transport, trust, security, privacy, and deployment-policy checks as applicable.

---

## Appendix C: Same-device CDDL and profile constraints

This appendix gives profile constraints and diagnostic pseudo-CDDL for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended to make SMART Health Check-in byte boundaries reviewable for implementers, fixture authors, and conformance-tool authors.

The profile reuses ISO/IEC 18013-5 mdoc, COSE, COSE_Key, CBOR, and HPKE structures. ISO/IEC 18013-5 and the referenced COSE/HPKE specifications own the base structures for `DeviceRequest`, `DocRequest`, `ItemsRequest`, `DeviceResponse`, `Document`, `IssuerSigned`, `IssuerSignedItem`, `MobileSecurityObject`, `DeviceSigned`, `DeviceAuthentication`, `ReaderAuthentication`, `COSE_Sign1`, and `COSE_Key`. This appendix constrains only SMART Health Check-in profile portions: fixed identifiers, carriers, tag-24 boundaries, direct `dcapi` wrappers, HPKE context, and the stable SMART response element.

The snippets below are profile pseudo-CDDL. They use field names and byte-boundary names from §8 and Appendix E. They are not a complete replacement for ISO/IEC 18013-5 CDDL, and they do not claim exactness for ISO map labels or optional fields not confirmed by the active profile. If this appendix conflicts with §8, §8 controls.

### C.1 Notation and constants

`bstr .cbor X` means a CBOR byte string containing a complete CBOR serialization of `X`. `#6.24(bstr .cbor X)` means CBOR tag 24 around that byte string. `COSE_Sign1` and `COSE_Key` are references to COSE structures.

The same-device profile uses these fixed values:

```text
smart-protocol-id        = "org-iso-mdoc"
smart-doc-type           = "org.smarthealthit.checkin.1"
smart-namespace          = "org.smarthealthit.checkin"
smart-response-element   = "smart_health_checkin_response"
smart-request-info-key   = "org.smarthealthit.checkin.request"
dcapi-label              = "dcapi"
```

A Verifier, Wallet/Responder, or Verifier-side processor that implements the same-device profile SHALL apply the §8 constraints restated in this appendix when producing or consuming the corresponding structures.

### C.2 Digital Credentials API request and result wrappers

The W3C Digital Credentials API wrappers are JSON, not CBOR. The Verifier invokes direct `org-iso-mdoc` with request data equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
    "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
  }
}
```

The Wallet/Responder returns a result equivalent to:

```json
{
  "protocol": "org-iso-mdoc",
  "data": {
    "response": "<base64url-without-padding CBOR dcapiResponse>"
  }
}
```

`data.deviceRequest`, `data.encryptionInfo`, and `data.response` are JSON strings carrying encoded CBOR bytes. Processors SHALL NOT interpret these wrapper strings as plaintext SMART request or SMART response JSON. The exact unpadded `data.encryptionInfo` base64url string is a `SessionTranscript` input; processors SHALL NOT substitute a decoded-and-re-encoded spelling when constructing or verifying the transcript.

### C.3 `DeviceRequest`, `DocRequest`, and tag-24 `ItemsRequest`

The core same-device request uses ISO/IEC 18013-5 `DeviceRequest` version `"1.0"` and `DocRequest.itemsRequest` as a tag-24-wrapped `ItemsRequest`.

```cddl
; Pseudo-CDDL profile constraints, not full ISO replacement CDDL.
smart-device-request = {
  "version" => "1.0",
  "docRequests" => [ + smart-doc-request ],
  * tstr => any
}

smart-doc-request = {
  "itemsRequest" => smart-items-request-bytes,
  ? "readerAuth" => cose-sign1-reader-auth,
  * tstr => any
}

smart-items-request-bytes = #6.24(bstr .cbor smart-items-request)

smart-items-request = {
  "docType" => "org.smarthealthit.checkin.1",
  "nameSpaces" => {
    "org.smarthealthit.checkin" => {
      "smart_health_checkin_response" => bool
    }
  },
  "requestInfo" => {
    "org.smarthealthit.checkin.request" => smart-request-json-text,
    * tstr => any
  },
  * tstr => any
}

smart-request-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinRequest
```

A Verifier SHALL set `DeviceRequest.version` to exactly `"1.0"` for the core version 1.0 flow. A Verifier SHALL request `docType` `org.smarthealthit.checkin.1`, namespace `org.smarthealthit.checkin`, and element identifier `smart_health_checkin_response`.

A Verifier SHALL carry the SMART request only as a CBOR text string at `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. A Wallet/Responder SHALL NOT treat dynamic mdoc element names, archived compressed-element experiments, implementation-defined initiation wrapper fields, other `requestInfo` keys, `readerAuth`, `encryptionInfo`, or Digital Credentials API wrapper fields as version 1.0 SMART request carriers.

The boolean at `nameSpaces["org.smarthealthit.checkin"]["smart_health_checkin_response"]` is the mdoc `intentToRetain` flag for the requested stable response element. It is not Holder consent, not authenticated requester identity, not a retention authorization, and not a clinical selector.

### C.4 Optional per-`DocRequest.readerAuth`

Core SMART Health Check-in 1.0 uses optional per-`DocRequest.readerAuth`. It does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as the core reader-authentication mechanism.

When present, `readerAuth` is a detached `COSE_Sign1` bound to the exact direct `dcapi` `SessionTranscript` bytes and the exact tag-24 `ItemsRequest` bytes:

```cddl
reader-authentication-bytes = #6.24(bstr .cbor [
  "ReaderAuthentication",
  session-transcript-bytes,
  smart-items-request-bytes
])

cose-sign1-reader-auth = COSE_Sign1
```

A Verifier that includes `readerAuth` SHALL construct a detached `COSE_Sign1` with protected header `{1: -7}` for ES256, serialized payload `null`, empty external AAD in the COSE `Signature1` structure, and `reader-authentication-bytes` as the detached payload. It SHALL include reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Wallet/Responder acceptance of a certificate chain, trust anchor, revocation status, key usage, display name, or organizational assurance label is deployment-policy work under §7.

A Wallet/Responder that supports or relies on reader authentication SHALL verify the signature over the exact `reader-authentication-bytes`, including the same `SessionTranscript` and tag-24 `ItemsRequest` bytes. It SHALL distinguish absent, syntactically invalid, cryptographically failed, cryptographically valid but untrusted, and trusted reader-authentication states for policy and display.

### C.5 `encryptionInfo`, `SessionTranscript`, and HPKE context

The direct Digital Credentials API `encryptionInfo` value is CBOR carried as unpadded base64url text in the JSON wrapper:

```cddl
smart-encryption-info = [
  "dcapi",
  {
    "nonce" => bstr,
    "recipientPublicKey" => p256-recipient-public-key,
    * tstr => any
  }
]

p256-recipient-public-key = {
   1  => 2,       ; kty = EC2
  -1  => 1,       ; crv = P-256
  -2  => bstr,    ; x-coordinate
  -3  => bstr,    ; y-coordinate
  * int => any
}
```

The `recipientPublicKey` is a COSE_Key for an EC2 P-256 public key. A Verifier SHALL use fresh unpredictable nonce bytes for each presentation request. Implementations SHOULD use at least 16 bytes of nonce entropy. Active request builders and fixtures commonly use 32 bytes, but 32 bytes is not a universal core requirement unless a later conformance-vector profile or deployment profile explicitly makes it one.

The direct `dcapi` transcript is byte-sensitive:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

`encryptionInfoBase64Url` is the exact unpadded base64url text from the request wrapper. `origin` is supplied by the Browser / User Agent, platform, or deployment-approved privileged-caller mechanism. It is not derived from the SMART request, `purpose`, item display text, selector URLs, request ids, implementation-defined initiation metadata, callback-looking strings, or returned Artifacts.

The Wallet/Responder encrypts CBOR `DeviceResponse` bytes using HPKE base mode with:

```text
KEM       = DHKEM(P-256, HKDF-SHA256)
KDF       = HKDF-SHA256
AEAD      = AES-128-GCM
info      = SessionTranscript bytes
aad       = empty byte string
plaintext = CBOR(DeviceResponse)
```

### C.6 Direct `dcapiResponse`

The HPKE output is wrapped as CBOR before being base64url-encoded in the JSON result:

```cddl
smart-dcapi-response = [
  "dcapi",
  {
    "enc" => bstr,
    "cipherText" => bstr,
    * tstr => any
  }
]
```

`enc` is the HPKE KEM encapsulated key for DHKEM(P-256, HKDF-SHA256). `cipherText` is the AEAD ciphertext, including its authentication tag, over `CBOR(DeviceResponse)`. A Wallet/Responder SHALL NOT return plaintext `DeviceResponse` bytes, plaintext SMART response JSON, a different `dcapiResponse` carrier, non-empty HPKE AAD, or another HPKE suite for the core version 1.0 flow.

### C.7 `DeviceResponse` subset and issuer-signed SMART response item

After HPKE opening, the plaintext is a CBOR `DeviceResponse` using ISO/IEC 18013-5 structures. The SMART profile constrains the accepted subset to include a successful response containing a document for `docType` `org.smarthealthit.checkin.1` with the SMART response in an issuer-signed namespace item.

```cddl
; Pseudo-CDDL profile constraints. Base structures and map labels are ISO-owned.
smart-device-response = {
  "version" => "1.0",
  "documents" => [ + smart-document ],
  "status" => 0,
  * tstr => any
}

smart-document = {
  "docType" => "org.smarthealthit.checkin.1",
  "issuerSigned" => smart-issuer-signed,
  "deviceSigned" => smart-device-signed,
  * tstr => any
}

smart-issuer-signed = {
  "nameSpaces" => {
    "org.smarthealthit.checkin" => [ + smart-issuer-signed-item-bytes ]
  },
  "issuerAuth" => COSE_Sign1,
  * tstr => any
}

smart-issuer-signed-item-bytes = #6.24(bstr .cbor smart-issuer-signed-item)

smart-issuer-signed-item = {
  "digestID" => uint,
  "random" => bstr,
  "elementIdentifier" => "smart_health_checkin_response",
  "elementValue" => smart-response-json-text,
  * tstr => any
}

smart-response-json-text = tstr ; UTF-8 JSON text for SmartHealthCheckinResponse
```

A Wallet/Responder SHALL carry the SMART response only as the `elementValue` of the issuer-signed `smart_health_checkin_response` item in namespace `org.smarthealthit.checkin`. It SHALL NOT carry the SMART response as `requestInfo`, as plaintext Digital Credentials API JSON, as plaintext `dcapiResponse` content, or as a device-signed namespace element in place of the issuer-signed item.

The `elementValue` text string contains a SMART response conforming to §6. Its `requestId`, `artifacts[]`, `fulfills[]`, media types, FHIR version fields, SMART Health Card payloads, and `requestStatus[]` are validated under §6 and §6.6, not by mdoc CDDL alone.

### C.8 MSO value digest, `issuerAuth`, and device authentication

The Mobile Security Object and `issuerAuth` are ISO/IEC 18013-5 and COSE structures. This profile constrains these relationships:

- `MSO.docType` is `org.smarthealthit.checkin.1`.
- `MSO.digestAlgorithm` is `SHA-256` for the core profile.
- `MSO.valueDigests["org.smarthealthit.checkin"][digestID]` corresponds to the disclosed `IssuerSignedItem.digestID`.
- The value-digest input is the complete tag-24-wrapped `IssuerSignedItem` bytes, not only the inner map, not only `elementValue`, and not diagnostic notation.
- `MSO.deviceKeyInfo.deviceKey` identifies the device public key used for device authentication.
- `issuerAuth` is a `COSE_Sign1` using ES256 (`alg` `-7`) over the MSO payload form required by §8 and the selected ISO-compatible encoding.

Active Android fixtures use digestID `0` for the single stable element, but the core protocol requirement is consistency between the disclosed item `digestID` and the corresponding MSO `valueDigests` entry. A fixture profile MAY freeze digestID `0` for a named vector class, but this appendix does not make that value a general protocol constant.

The device-authentication payload binds the document to the same presentation session:

```cddl
smart-device-signed = {
  "nameSpaces" => device-name-spaces-bytes,
  "deviceAuth" => {
    "deviceSignature" => COSE_Sign1,
    * tstr => any
  },
  * tstr => any
}

device-name-spaces-bytes = #6.24(bstr .cbor device-name-spaces)
device-name-spaces = { * tstr => any }

device-authentication-bytes = #6.24(bstr .cbor [
  "DeviceAuthentication",
  session-transcript-bytes,
  "org.smarthealthit.checkin.1",
  device-name-spaces-bytes
])
```

For the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The device `COSE_Sign1` SHALL use ES256 (`alg` `-7`) and the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`. The SMART response item remains issuer-signed; moving it into `DeviceNameSpaces` is not an equivalent SMART Health Check-in response carrier.

### C.9 Extraction, validation, and deferred exactness

Appendix C identifies expected carriers and byte boundaries, but it cannot by itself establish trust or clinical validity. A Verifier accepting a same-device response SHALL perform the §8.7 and §8.8 checks: decode the JSON wrapper, HPKE-open using the expected transcript, parse `DeviceResponse`, validate `issuerAuth`, validate the MSO and digest binding, validate device authentication, extract the SMART response JSON string from the stable issuer-signed item, validate it under §6, and apply §6.6 cross-validation against the original SMART request.

Successful mdoc parsing, HPKE opening, digest validation, issuer evidence, device signature validation, optional reader authentication, or `requestId` matching does not create clinical-source provenance for unsigned raw FHIR JSON. Source trust for raw FHIR JSON, SMART Health Cards, provenance-bearing FHIR, or other Artifact forms remains governed by §7.4 and the Artifact evidence itself.

The following exactness issues are intentionally unresolved here and should be closed by §11, §13, Appendix A, a deployment profile, or a future fixture-vector profile before being treated as pass/fail conformance requirements:

- duplicate CBOR or JSON map key handling;
- multiple matching `docRequests` or multiple matching `DeviceResponse.documents`;
- duplicate `smart_health_checkin_response` issuer-signed items or duplicate stable elements;
- deterministic CBOR map ordering or canonical encoding for vector generation;
- digestID conventions such as always using `0` for single-item vectors;
- fixed nonce-size constraints beyond fresh unpredictable bytes and the 16-byte recommendation; and
- complete imported ISO/IEC 18013-5 CDDL and exact base-structure map labels.

---

## Appendix D. Fixture index and example-vector alignment

This appendix is informative. It indexes checked-in fixture material and explains how current fixtures, future example vectors, and the worked examples in §16 align with SMART Health Check-in 1.0. It does not define a new presentation flow, a new clinical request or response shape, production trust anchors, or additional conformance obligations.

The only version 1.0 live presentation fixture class is the same-device direct `org-iso-mdoc` flow defined in §8. QR, NFC, deep-link, kiosk, pointer, relay, completion-screen, and staff-handoff material can be useful as historical captures, demos, deployment-local traces, or future-work evidence, but it is not SMART Health Check-in 1.0 protocol fixture material unless the indexed bytes are the §8 same-device artifacts.

### D.1 Fixture taxonomy and exactness levels

Fixture entries should identify both the class of material and the comparison mode. A single directory can contain several classes; for example, a real-platform capture can contain byte-exact subfiles while remaining diagnostic and historical overall.

| Class | Use in this specification | Typical exactness |
| --- | --- | --- |
| Byte-exact fixture | A named serialized boundary such as CBOR, COSE, HPKE output, digest input, base64url text, or hash. | Compare only the named bytes, hex, digest, or base64url string. |
| Structural fixture | A decoded object, CBOR diagnostic, inspection report, parser walk, or validation report. | Compare field presence, constants, decoded relationships, validation outcomes, and policy labels without freezing every enclosing byte. |
| Semantic example | A SMART request/response pair or Artifact payload illustrating §5, §6, or §16 clinical semantics. | Validate JSON model and request-aware semantics; presentation bytes are out of scope unless wrapped by a vector profile. |
| Diagnostic trace | A debug bundle, opened-response inspection, cross-library byte walk, or platform trace. | Useful for troubleshooting and regression analysis; not a portable pass/fail oracle unless a subset is promoted. |
| Historical archive | External, real-platform, archived, or pre-rebase material retained as evidence of behavior at a point in time. | Historical or negative context; not active v1.0 behavior by itself. |
| Illustrative example | Demo UI, rendered content, explanatory HTML, or sample assets outside the v1.0 protocol surface. | Illustrative only. |
| Implementation regression | Test data for a repository implementation, native module, SDK, or tool. | Compares what that implementation's tests name; not automatically a public conformance vector. |
| Conformance-candidate vector | Material close to pass/fail use after source sections, exact files, expected outcomes, trust assumptions, and privacy labels are frozen. | The vector profile states which checks are byte-exact, structural, semantic, or diagnostic-only. |

Every promoted entry should state the source, layer exercised, exactness level, expected validator checks, privacy status, trust-material status, current classification, and follow-up needed before public conformance use.

### D.2 Privacy, security, and trust handling

Public fixtures and example vectors use synthetic data, demo keys, demo certificates, self-attested or test-only issuer material, and non-production trust anchors. Checked-in private keys are fixture material only when intentionally public and labeled for a named validation purpose, such as reopening an encrypted fixture. They are not production key-management guidance.

Fixtures intended for publication should not contain PHI, production private keys, bearer credentials, access tokens, reusable production launch URLs, production trust anchors, or unredacted operational secrets. A live capture containing any of those values is sensitive production data, not an ordinary conformance artifact.

Diagnostic traces can contain plaintext SMART requests, plaintext SMART responses, raw FHIR JSON, decrypted `DeviceResponse` bytes, `dcapiResponse` internals, origins, package names, timestamps, certificate subjects, or HPKE fields. Those values are appropriate only when needed for the named fixture purpose; routine telemetry and support bundles should redact or omit them unless explicitly authorized.

Transport success, mdoc issuer/device proof, and `readerAuth` proof do not by themselves establish clinical-source provenance for unsigned raw FHIR JSON. SMART Health Card signatures, accepted FHIR Provenance, deployment policy, or other payload-level evidence remain separate checks.

### D.3 Same-device byte-boundary guidance

A complete same-device fixture set can expose the following boundaries. A vector does not need every boundary, but each included boundary should identify its comparison mode and expected validation purpose.

| Boundary | Common files or fields | Validation purpose |
| --- | --- | --- |
| SMART request JSON | `smart-request.json`, `smart-request.raw.json`, `smart-request.expected.json` | Validate §5 request shape, flattened `questionnaire` selectors, array `profilesFrom[]`, accepted media types, exact canonical-version preservation, and absence of requester identity metadata. |
| Navigator credentials request | `navigator-credentials-get.arg.json`, `request.json`, `credential-manager-request.json` | Confirms direct `org-iso-mdoc` invocation and base64url-no-pad `deviceRequest` and `encryptionInfo` fields. |
| `DeviceRequest` | `device-request.b64u`, `device-request.cbor`, `device-request.cbor.hex`, `device-request.diag` | Confirms `DeviceRequest.version` `"1.0"`, `docRequests[]`, tag-24 `ItemsRequest`, and optional per-`DocRequest.readerAuth`. |
| `ItemsRequest` | `items-request.cbor`, `items-request.cbor.hex`, `items-request.diag`, `items-request.decoded.json`, `items-request-tag24.cbor`, `items-request-tag24.cbor.hex` | Confirms `docType`, namespace, stable element, `intentToRetain`, exact tag-24 boundary, and request carrier key. |
| `requestInfo` SMART request | `request-info.json`, `requested-element.txt`, `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` | Confirms the SMART request is carried as a CBOR text string at the registered request-info key and the requested element is `smart_health_checkin_response`. |
| `encryptionInfo` | `encryption-info.b64u`, `encryption-info.cbor`, `encryption-info.cbor.hex`, `encryption-info.diag`, recipient public/private JWKs when present | Confirms direct `dcapi` shape, nonce, P-256 recipient public key, base64url spelling, and intentionally public offline-opening material where included. |
| `SessionTranscript` | `session-transcript.cbor`, `session-transcript.cbor.hex`, `session-transcript.diag` | Confirms `dcapiInfo = CBOR([exactEncryptionInfoBase64Url, origin])`, `handover = ["dcapi", SHA-256(dcapiInfo)]`, and `SessionTranscript = CBOR([null, null, handover])`. |
| Optional `readerAuth` | `reader-auth.cbor`, `reader-auth.cbor.hex`, `reader-auth-detached-payload.cbor`, `reader-auth-detached-payload.cbor.hex`, `reader-certificate.der`, `reader-public.jwk.json` | Confirms detached ES256 `COSE_Sign1`, payload `null`, x5chain evidence, and binding to the same `SessionTranscript` and exact tag-24 `ItemsRequest`; demo trust remains labeled. |
| SMART response JSON | `smart-response.json`, `smart-response.raw.json`, `smart-response.expected.json` | Validate §6 response shape, exact `requestId`, core Artifact media types, `fhirVersion` rules, `fulfills[]`, and complete `requestStatus[]` coverage. |
| Issuer-signed SMART response item | `issuer-signed-item.cbor`, `issuer-signed-item-tag24.cbor`, `.hex`, `.diag`, `.b64u` | Confirms stable element `smart_health_checkin_response`, string `elementValue`, tag-24 boundary, and digest input. |
| MSO, digest, and issuer proof | `value-digest-input.cbor`, `value-digest.bin`, `mso.cbor`, `mso-tag24.cbor`, `issuer-auth.cbor`, diagnostics | Confirms digest over the complete tag-24 `IssuerSignedItem`, active `docType`, digest algorithm, device key evidence, and issuer-authentication structure under the stated test trust policy. |
| `DeviceAuthentication` | `device-authentication.cbor`, `.hex`, `.b64u`, inspection fields | Confirms binding to the same `SessionTranscript`, `docType`, and tag-24 `DeviceNameSpaces`. |
| `DeviceResponse` | `device-response.cbor`, `.hex`, `.b64u`, `document.cbor`, `document.diag` | Confirms the plaintext mdoc document/response structure containing the issuer-signed SMART response element. |
| HPKE output | `hpke-enc.bin`, `hpke-ciphertext.bin`, `.hex`, `.b64u` | Confirms response encryption fields; HPKE open uses `info = SessionTranscript bytes` and empty AAD. |
| `dcapiResponse` | `dcapi-response.cbor`, `dcapi-response.cbor.hex`, `dcapi-response.cbor.b64u` | Confirms direct response envelope `CBOR(["dcapi", {"enc": bstr, "cipherText": bstr}])`. |
| Digital Credentials result | `wallet-response.digital-credential.json`, `credential.json`, `submit.json` | Confirms returned `protocol: "org-iso-mdoc"` and `data.response` base64url wrapper. |
| Verification report | `inspection.json`, `request-artifacts.json`, `dcapi-response-inspection.json`, `opened-response-inspection.json`, `hpke-opened-response-inspection.json`, `response-inspection.json`, `pymdoc-byte-check.json`, future `verification-report.json` | Records which checks passed, failed, were unsupported, or remained policy-dependent. |

Byte-exact comparison should be limited to files or fields whose fixture profile names. Diagnostic notation, pretty-printed JSON, decoded inspection order, nondeterministic ECDSA signatures, nonces, timestamps, localhost origins, package names, certificate subjects, and demo issuer strings should not become hidden requirements merely because they appear in a capture.

### D.4 Current fixture index

| Fixture/vector name | Source or example section | Layer exercised | Exactness level | Expected validator checks | Current status | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `fixtures/dcapi-requests/ts-smart-checkin-basic/` | TypeScript generator; §8 request construction | Same-device request without `readerAuth`: navigator request wrapper, `DeviceRequest`, tag-24 `ItemsRequest`, `requestInfo`, `encryptionInfo`, transcript inputs, extracted SMART request | Byte-exact for named `.cbor.hex`, `.b64u`, and transcript-bound fields; structural for `inspection.json`; semantic for `smart-request.expected.json` | Protocol `org-iso-mdoc`; `DeviceRequest.version` `"1.0"`; active docType, namespace, stable element, request-info key; tag-24 `ItemsRequest`; direct `dcapi` `encryptionInfo`; unpadded base64url spelling; SMART request validation | Synthetic structural fixture and implementation-regression material; conformance candidate after refresh | Regenerate to use flattened Questionnaire selectors and final §16 examples; freeze deterministic CBOR, nonce/key policy, exact comparison targets, and expected report before promotion. |
| `fixtures/dcapi-requests/ts-smart-checkin-readerauth/` | TypeScript generator; optional readerAuth | Same-device request with per-`DocRequest.readerAuth` | Byte-exact for tag-24 `ItemsRequest`, `session-transcript.cbor`, `reader-auth.cbor`, and detached payload where named; structural for inspection | All basic request checks plus detached ES256 `COSE_Sign1`, payload `null`, x5chain label `33`, binding to exact `SessionTranscript` and tag-24 `ItemsRequest` | Synthetic structural fixture and implementation-regression material; conformance candidate after refresh | Regenerate to use flattened Questionnaire selectors and final §16 examples. Keep demo certificate and reader material labeled non-production. Do not imply readerAuth is mandatory or that demo reader trust is accepted by all deployments. |
| `fixtures/dcapi-requests/real-chrome-android-smart-checkin/` | Real Chrome/Android Credential Manager request capture | Real-platform same-device request, request extraction, readerAuth, origin-bound `SessionTranscript` | Byte-exact for named CBOR/hex/base64url files; structural for diagnostics; historical for platform context | Same §8 request validation; preservation of exact `encryptionInfo` base64url; recorded origin source; readerAuth classification; pairing with response fixture via test-only HPKE key | Diagnostic real-platform capture and historical archive; selected subfiles are conformance candidates | Treat localhost origin, Chrome package metadata, timestamps, nonce, demo certificate, and included private JWK as fixture context. Refresh or regenerate before public v1.0 promotion because the captured SMART request still uses a legacy nested Questionnaire shape and is not a final §16 vector. |
| `fixtures/responses/pymdoc-minimal/` | pyMDOC-CBOR fixture tooling; §8 response substructure | Response-side mdoc document, issuer-signed item, tag-24 digest input, MSO, `issuerAuth`, independent parser walk | Byte-exact for declared digest inputs, tag-24 issuer-signed item, hashes, and named CBOR files; structural for `expected-walk.json`; diagnostic for full document bytes when signatures are nondeterministic | Active docType, namespace, stable element; SMART response element parses under §6; digest input equals complete tag-24 issuer-signed item; recomputed digest matches MSO; issuerAuth structure is inspectable | Diagnostic response byte-walk vector and conformance candidate for stable response substructure | Add or pair with a final request when §6.6 end-to-end cross-validation is needed. Compare stable intermediates rather than nondeterministic full-document signatures unless deterministic signing is frozen. |
| `fixtures/responses/real-chrome-android-smart-checkin/` | Real Android Wallet response paired with the real request capture | Complete same-device response: Digital Credentials result, `dcapiResponse`, HPKE fields, opened `DeviceResponse`, issuer-signed item, MSO digest, `DeviceAuthentication`, extracted SMART response | Byte-exact for named CBOR/bin/hex/base64url files; structural for inspections and byte checks; historical for live platform context | Returned protocol `org-iso-mdoc`; `dcapiResponse` shape; HPKE open using paired test private JWK and `info = SessionTranscript`; `DeviceResponse.version` `"1.0"`; docType/namespace/stable element; digest and device-authentication checks; extracted SMART response validates and cross-validates against the paired request where the paired request is accepted | Diagnostic real-platform response capture and historical archive; selected subfiles are conformance candidates | Pair only with `fixtures/dcapi-requests/real-chrome-android-smart-checkin/`. Mark HPKE private JWK and demo issuer/reader material test-only. Regenerate clinical content to align with §16 and flattened selectors before public conformance promotion. |
| `wallet-android/app/src/test/resources/test-vectors.json` | Android unit-test resource generated from protocol code | Cross-language identifiers, request parsing, rejection vectors, and `SessionTranscript` derivation | Structural and byte-exact for fields explicitly represented as hex/base64url; implementation regression otherwise | Active identifiers; request vector extraction; negative non-SMART mdoc rejection; transcript derivation from origin, `encryptionInfoHex`, and exact `encryptionInfoBase64Url` | Implementation regression and candidate source for selected request/transcript checks | Regenerate after schema/example changes; current generated request JSON still includes legacy nested Questionnaire material. Do not treat this file as the complete public fixture suite. |
| `fixtures/captures/2026-04-30-mattr-safari-org-iso-mdoc/` and `fixtures/dcapi-requests/negative-mattr-mdl/` | External Mattr/Safari-shape mdoc material | Historical `org-iso-mdoc` envelope research and negative/non-SMART mdoc rejection context | Byte-exact for external capture files where named; structural for diagnostics | Useful only for generic DC API/`org-iso-mdoc` envelope comparison or negative rejection; not checked as SMART docType, namespace, request carrier, or stable element | Historical archive / diagnostic or negative reference | Do not promote as a SMART Health Check-in positive fixture. The captured values are mDL-oriented external values, not `org.smarthealthit.checkin.1` / `org.smarthealthit.checkin`. |
| `fixtures/sample-shc/` | SMART Health Card sample generator and verifier | Artifact payload examples for the `application/smart-health-card` branch | Semantic for SHC payload handling; byte-exact only for named JWS files if a future profile freezes them | Verify JWSs under SMART Health Cards; if wrapped by SMART Health Check-in, use `mediaType: "application/smart-health-card"`, `value.verifiableCredential[]`, and no outer `fhirVersion` | Illustrative semantic source and implementation regression material | Existing samples are synthetic SHC specification examples, not CARIN insurance-card vectors and not embedded in SMART Health Check-in responses. Use only with explicit test issuer/trust labels. |
| `fixtures/headache-summary-svgs/` | Demo migraine summary rendering assets | Presentation/demo content outside core v1.0 Artifact media types | Illustrative only | No core SMART Health Check-in v1.0 Artifact validation | Illustrative demo archive | Do not treat SVG, HTML, or Markdown summaries as core Artifacts. A future extension would need a registered/branded media type and typed payload rules; do not revive `GenericArtifact`. |
| Future §16 semantic vectors | §16.1-§16.6 worked examples | Transport-neutral clinical request/response JSON model | Semantic; byte-exact JSON only if a vector profile chooses canonical serialization | §5 request validation; §6 response validation; §6.6 cross-validation; media-type acceptance; status coverage; flattened Questionnaire; exact canonical-version preservation; no `GenericArtifact` | Gap / follow-up | Create checked-in JSON vectors from §16 after example text is stable. Keep synthetic, PHI-free, and independent of kiosk/relay behavior. |
| Future same-device wrapping vectors for §16 examples | §8 plus selected §16 request/response pairs | Complete direct `org-iso-mdoc` request/response byte ladder | Byte-exact for explicitly named CBOR, tag-24, digest, HPKE, and base64url fields; structural for inspections; semantic for clinical JSON | Full §8.7/§8.8 validation plus §6.6 cross-validation against the selected §16 request | Gap / conformance-candidate work | Generate after deciding deterministic CBOR/signature/nonce/key policy, trust-material labels, and expected validator reports. These vectors wrap the same-device flow only, not QR/kiosk/relay handoff behavior. |

### D.5 Alignment with §16 worked examples

Section 16 supplies synthetic semantic examples for the clinical JSON model. Appendix D supplies fixture and vector organization for byte-oriented same-device material. The final public vector suite should validate §16 examples as JSON first, then optionally wrap selected examples in same-device mdoc bytes.

| §16 example | Candidate vector | Same-device wrapping note | Fixture-grade follow-up |
| --- | --- | --- | --- |
| §16.1 Insurance-card-only check-in | Semantic request/response JSON using CARIN Coverage selector and an SHC Artifact | Optional request-only or full request/response wrapping through §8 | Replace the placeholder SHC JWS string with a fixture-grade synthetic SMART Health Card containing appropriate coverage-like payload or a clearly scoped SHC test payload; label issuer keys as test material; keep no outer `fhirVersion`. |
| §16.2 US Core summary check-in | Semantic raw-FHIR Bundle vector | Request and response structural vector | Use synthetic FHIR resources that are sufficiently complete for the selected validation level; preserve versioned `meta.profile` strings exactly; show additive `profiles[]` plus `profilesFrom[]`. |
| §16.3 Inline questionnaire pre-visit intake | Semantic request/response vector for flattened Questionnaire selector | Request byte vector after regeneration; optional response byte vector | Keep `content.kind: "questionnaire"` with sibling `canonical` and/or `resource`; preserve exact versioned `QuestionnaireResponse.questionnaire`; exclude legacy nested `questionnaire` from positive vectors. |
| §16.4 Mixed bundle | Semantic many-to-many fulfillment vector | Good candidate for full same-device wrapping once deterministic policy is chosen | Validate every `fulfills[]` edge against the corresponding item `accept[]`, selector, and FHIR version; keep raw FHIR provenance caveats visible. |
| §16.5 Per-item declined / partial / error | Semantic edge-case response vector | Structural response vector; no live capture required | Include exact `requestStatus[]` coverage, safe `message` text, and expected validation outcomes for `partial`, `declined`, and `error`. |
| §16.6 No selectors | Semantic broad FHIR request/response vector | Request-only byte vector if broad-request handling needs platform regression coverage | Make clear that the example does not require full-record export; still validate `fhirVersion`, media-type acceptance, and Holder-approved scope. |

The current §16 prose examples are not byte-exact fixtures. Placeholder SHC JWS strings and minimal FHIR snippets are acceptable for explanatory prose, but conformance-candidate vectors need checked-in synthetic payloads, stable ids, expected validator reports, and explicit trust labels.

### D.6 Historical and demo material

Historical and demo material should remain clearly labeled:

- external mDL captures using `org-iso-mdoc` are useful envelope evidence or negative fixtures, but they are not SMART Health Check-in positive fixtures unless they use the SMART Health Check-in docType, namespace, stable element, and request-info key;
- archived dynamic element-name, OpenID4VP, `dc_api.jwt`, DCQL, and earlier compressed/pointer experiments are research or future-work material, not §8 conformance substitutes;
- kiosk, QR, relay, storage-row, completion-screen, and cross-device demo fixtures are deployment-local unless the fixture scope is limited to the same-device page's §8 invocation and response; and
- demo branding, local URLs, package names, certificate common names, sample issuer strings, and local origins are not authenticated requester identity or production trust unless a deployment policy outside the SMART request body establishes that fact.

### D.7 Promotion criteria and current gaps

A fixture should be promoted from diagnostic, historical, illustrative, or implementation-regression status to conformance-candidate status only after its manifest or adjacent index records:

- applicable profile label, target role, source section references, and expected pass/fail result;
- exact files and comparison modes: byte-exact, structural, semantic, diagnostic-only, historical, illustrative, or implementation-regression;
- synthetic-data status, PHI status, and confirmation that no production secrets or bearer credentials are present;
- intentionally public private keys, demo certificates, self-signed issuer material, local origins, sample issuer material, and non-production trust anchors;
- current request/response schema alignment, including flattened Questionnaire selectors, array `profilesFrom[]`, additive profile semantics, no `GenericArtifact`, exact canonical-version preservation, core Artifact media types, raw-FHIR `fhirVersion`, SHC `value.verifiableCredential[]`, and no SHC outer `fhirVersion`;
- byte-boundary policy for CBOR map ordering, duplicate keys, nonce/key handling, digestID conventions, deterministic or nondeterministic signatures, timestamps, and exact base64url spelling;
- validation report coverage for §5 parsing, §6 response validation, §6.6 cross-validation, §8 wrapper validation, HPKE opening, mdoc digest/device checks, optional readerAuth, Artifact-specific checks, and policy-dependent trust outcomes; and
- owner or process for regeneration when schema, CDDL, example text, tooling, browser behavior, or native-wallet behavior changes.

Current follow-up work includes creating checked-in semantic vectors for §16, adding fixture-grade synthetic SHC and FHIR payloads, refreshing real Android capture material after clinical-schema/example changes, updating Android-generated test vectors, separating conformance candidates from diagnostics in manifests, and deciding deterministic-byte policy. A future Android capture or fixture regeneration would be useful after implementation/schema changes, especially to demonstrate the flattened Questionnaire selector and final §16 payloads in a real platform path; it is not required to define the informative appendix itself.

---

## Appendix E: Same-device byte ladder and SessionTranscript derivation

This appendix is explanatory support for the same-device direct `org-iso-mdoc` flow defined in §8. It is intended to help implementers, fixture authors, and reviewers identify byte boundaries and reproduce the same hashes, signatures, HPKE context, and response extraction behavior. It does not define alternate request carriers, response carriers, field names, HPKE parameters, trust semantics, clinical semantics, CDDL, or fixture classifications. If this appendix appears to conflict with §8, §8 controls.

### E.1 Logical values, encoded bytes, and text encodings

The same-device flow crosses several representation boundaries:

- A **SMART request** and **SMART response** are clinical JSON objects defined by §§5-6. In this binding each is carried as UTF-8 JSON text at a specific CBOR text-string location. The specification does not define canonical JSON serialization for these clinical objects. Fixtures may preserve the exact JSON text used in a capture, but semantically equivalent JSON text can have different bytes.
- A **CBOR logical value** is an abstract value such as an array, map, text string, byte string, tag, boolean, or `null`.
- **CBOR bytes** are a particular serialization of a logical value. Hashes, signatures, HPKE `info`, tag-24 wrappers, base64url fields, and fixture byte comparisons use bytes, not diagnostic notation.
- **base64url without padding** is the textual encoding used by the Digital Credentials API request and result fields for selected CBOR byte strings. The direct `dcapi` `SessionTranscript` binds the exact `encryptionInfo` base64url text string from the request.

CBOR tag 24 is the “encoded CBOR data item” tag. In this appendix, `tag24(CBOR(X))` means a CBOR tag 24 whose content is a byte string containing the complete CBOR serialization of `X`. The outer tag, the byte-string header, and the enclosed bytes are part of the tagged value. Implementations can decode the inner value for inspection, but byte operations use the exact tag-24 value identified by §8.

### E.2 Ordered same-device byte ladder

The following ladder names the ordered transformations in the base same-device flow. It uses placeholders rather than fabricated hashes, signatures, or ciphertexts.

1. **SMART request JSON.** The Requester constructs a `SmartHealthCheckinRequest` under §5. The Verifier serializes it as UTF-8 JSON text.
2. **`ItemsRequest` logical value.** Section 8 carries the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`. The requested mdoc element is `smart_health_checkin_response` in namespace `org.smarthealthit.checkin` under `docType` `org.smarthealthit.checkin.1`:

   ```text
   ItemsRequest = {
     "docType": "org.smarthealthit.checkin.1",
     "nameSpaces": {
       "org.smarthealthit.checkin": {
         "smart_health_checkin_response": true / false
       }
     },
     "requestInfo": {
       "org.smarthealthit.checkin.request": <SMART request JSON text>
     }
   }
   ```

   The boolean is the mdoc `intentToRetain` value for the requested element. It is not Holder consent.

3. **`ItemsRequest` CBOR and tag 24.** The Verifier serializes `ItemsRequest` as CBOR and wraps it in tag 24:

   ```text
   ItemsRequestBytes = tag24(CBOR(ItemsRequest))
   ```

   These exact tagged bytes are placed in `DocRequest.itemsRequest` and are bound by `readerAuth` when reader authentication is present.

4. **`DeviceRequest`.** The core flow uses `DeviceRequest.version` `"1.0"` and per-`DocRequest.readerAuth` when reader authentication is present:

   ```text
   DeviceRequest = {
     "version": "1.0",
     "docRequests": [{
       "itemsRequest": ItemsRequestBytes,
       "readerAuth": COSE_Sign1 / optional
     }]
   }
   ```

   Core version 1.0 does not use `readerAuthAll` as its reader-authentication mechanism. The Verifier serializes the `DeviceRequest` as CBOR and base64url-encodes those bytes without padding as `data.deviceRequest`.

5. **`encryptionInfo`.** The Verifier prepares an HPKE recipient key pair and constructs the direct DC API encryption information:

   ```text
   encryptionInfo = [
     "dcapi",
     {
       "nonce": <fresh unpredictable bytes>,
       "recipientPublicKey": {
          1: 2,        ; kty = EC2
         -1: 1,        ; crv = P-256
         -2: <x-coordinate bstr>,
         -3: <y-coordinate bstr>
       }
     }
   ]
   ```

   The Verifier serializes `encryptionInfo` as CBOR and base64url-encodes those bytes without padding as `data.encryptionInfo`.

6. **Exact `encryptionInfo` base64url string.** Let `encryptionInfoBase64Url` be the exact unpadded string supplied as `data.encryptionInfo`. The transcript binds this text string. A component that decodes and re-encodes `encryptionInfo` into a different textual spelling has changed the transcript input.

7. **Digital Credentials API request.** The Verifier invokes direct `org-iso-mdoc` with request data equivalent to:

   ```json
   {
     "protocol": "org-iso-mdoc",
     "data": {
       "deviceRequest": "<base64url-without-padding CBOR DeviceRequest>",
       "encryptionInfo": "<base64url-without-padding CBOR encryptionInfo>"
     }
   }
   ```

8. **`dcapiInfo`, handover, and `SessionTranscript`.** Both sides use the exact `encryptionInfoBase64Url` string and the authenticated origin, or deployment-approved privileged-caller origin-equivalent, supplied by the Browser / User Agent or platform:

   ```text
   dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
   handover = ["dcapi", SHA-256(dcapiInfo)]
   SessionTranscript = CBOR([null, null, handover])
   ```

   Equivalently, the formula can be written as:

   ```text
   SessionTranscript = CBOR([null, null, ["dcapi", SHA-256(CBOR([encryptionInfoBase64Url, origin]))]])
   ```

   The origin is not derived from the SMART request body, `purpose`, item display text, selector URLs, request ids, implementation-defined initiation metadata, callback-looking strings, or returned Artifacts.

9. **Optional `ReaderAuthentication`.** If `readerAuth` is present, §8 defines the detached payload as:

   ```text
   ReaderAuthenticationBytes = tag24(CBOR([
     "ReaderAuthentication",
     SessionTranscript,
     ItemsRequestBytes
   ]))
   ```

   The `readerAuth` COSE_Sign1 uses ES256 (`alg` `-7`), has serialized payload `null`, signs the COSE `Signature1` structure with empty external AAD and `ReaderAuthenticationBytes` as the detached payload, and carries reader certificate evidence in COSE header label `33` (`x5chain`) with at least the leaf certificate. Reader authentication is optional in core v1 unless a deployment profile requires it.

10. **Wallet request extraction.** The Wallet/Responder decodes `data.deviceRequest` and `data.encryptionInfo`, parses CBOR, locates the tag-24 `DocRequest.itemsRequest`, verifies the SMART Health Check-in `docType`, namespace, and requested element, preserves the exact `ItemsRequestBytes`, and extracts the SMART request JSON string only from `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]`.

11. **Wallet transcript and readerAuth checks.** The Wallet/Responder recomputes the `SessionTranscript` from the exact `encryptionInfoBase64Url` string and platform-provided origin or origin-equivalent context. If `readerAuth` is present and relevant to policy, it verifies the detached signature over the same `ReaderAuthenticationBytes` and evaluates `x5chain` evidence under deployment policy.

12. **SMART response JSON.** After Holder review and Wallet policy, the Wallet/Responder constructs a `SmartHealthCheckinResponse` under §6. Its `requestId` is the accepted SMART request `id`. The Wallet/Responder serializes the response as UTF-8 JSON text; the clinical model does not define canonical JSON serialization.

13. **`IssuerSignedItem`.** The SMART response is carried as the `elementValue` of the issuer-signed item for the stable element:

   ```text
   IssuerSignedItem = {
     "digestID": <integer digest id>,
     "random": <random bstr>,
     "elementIdentifier": "smart_health_checkin_response",
     "elementValue": <SMART response JSON text>
   }
   ```

14. **Tag-24 `IssuerSignedItem` and MSO value digest.** The Wallet/Responder serializes the item, wraps it in tag 24, and computes the MSO value digest over the complete tagged value:

   ```text
   IssuerSignedItemBytes = tag24(CBOR(IssuerSignedItem))
   MSO.valueDigests["org.smarthealthit.checkin"][digestID]
     = SHA-256(IssuerSignedItemBytes)
   ```

   The digest input is not only `elementValue`, not only the decoded inner map, and not diagnostic notation.

15. **MSO and `issuerAuth`.** The Wallet/Responder constructs an MSO for `docType` `org.smarthealthit.checkin.1`, covering the disclosed issuer-signed item and identifying the device key. Section 8 defines `issuerAuth` as ES256 `COSE_Sign1` over the tag-24-wrapped MSO bytes unless Appendix C or an ISO-compatible profile defines an equivalent encoding.

16. **`DeviceAuthentication` and `deviceSignature`.** The Wallet/Responder constructs device authentication for the same presentation session:

   ```text
   DeviceAuthenticationBytes = tag24(CBOR([
     "DeviceAuthentication",
     SessionTranscript,
     "org.smarthealthit.checkin.1",
     tag24(CBOR(DeviceNameSpaces))
   ]))
   ```

   In the core profile, `DeviceNameSpaces` is normally empty unless a deployment profile defines additional device-signed elements. The SMART response remains the issuer-signed `smart_health_checkin_response` element; it is not moved into `DeviceNameSpaces`. The Wallet/Responder signs the device-authentication payload with the device private key corresponding to `MSO.deviceKeyInfo.deviceKey`.

17. **`DeviceResponse`.** The Wallet/Responder constructs and serializes a CBOR `DeviceResponse` containing the issuer-signed SMART Health Check-in document, issuer authentication, device-signed namespaces, and device authentication. These bytes are the HPKE plaintext.

18. **HPKE seal.** Section 8 defines HPKE response protection for the core flow as:

   ```text
   KEM       = DHKEM(P-256, HKDF-SHA256)
   KDF       = HKDF-SHA256
   AEAD      = AES-128-GCM
   info      = SessionTranscript bytes
   aad       = empty byte string
   plaintext = CBOR(DeviceResponse)
   ```

   The empty AAD is the zero-length byte string. It is not CBOR `null`, an empty text string, or an implementation-defined omitted value.

19. **`dcapiResponse`.** The Wallet/Responder wraps the HPKE output in the direct DC API response value:

   ```text
   dcapiResponse = [
     "dcapi",
     {
       "enc": <HPKE enc bstr>,
       "cipherText": <HPKE ciphertext bstr>
     }
   ]
   ```

   It serializes `dcapiResponse` as CBOR, base64url-encodes those bytes without padding, and returns a Digital Credentials API result equivalent to:

   ```json
   {
     "protocol": "org-iso-mdoc",
     "data": {
       "response": "<base64url-without-padding CBOR dcapiResponse>"
     }
   }
   ```

20. **Verifier opening and extraction.** The Verifier checks the returned protocol, decodes `data.response`, parses `dcapiResponse`, reconstructs the expected `SessionTranscript` from the original exact `encryptionInfoBase64Url` string and origin, and HPKE-opens with `info = SessionTranscript bytes` and empty AAD. It then validates the mdoc response, MSO, digest binding, issuer evidence under policy, and device signature, extracts the SMART response JSON string from the `smart_health_checkin_response` `elementValue`, validates it under §6, and applies §6.6 cross-validation against the original SMART request.

### E.3 Fixture pointers

Appendix D owns authoritative fixture classification, conformance-vector labeling, and the final fixture index. Confirmed active roots that currently contain useful same-device byte-boundary material include:

```text
fixtures/dcapi-requests/ts-smart-checkin-basic/
fixtures/dcapi-requests/ts-smart-checkin-readerauth/
fixtures/dcapi-requests/real-chrome-android-smart-checkin/
fixtures/responses/pymdoc-minimal/
fixtures/responses/real-chrome-android-smart-checkin/
wallet-android/app/src/test/resources/test-vectors.json
```

This appendix intentionally does not fabricate inline byte examples, hashes, signatures, ciphertexts, fixture metadata, or vector classifications.

## Appendix F: CBOR diagnostic notation cheat-sheet

This appendix is an explanatory notation guide for CBOR, COSE, and byte-oriented examples in this specification. It does not override §8, Appendix C CDDL, Appendix D fixtures, RFC 8949 CBOR rules, COSE rules, HPKE rules, or ISO/IEC 18013-5 structures.

### F.1 General conventions

CBOR diagnostic notation is a human-readable rendering of CBOR values. It is not the wire encoding. Byte-level operations use serialized bytes, not diagnostic text.

Common forms used in this specification include:

| Notation | Meaning in examples |
| --- | --- |
| `{ key: value }` | CBOR map. Keys can be text strings, integers, or other CBOR values as allowed by the referenced structure. |
| `[ a, b, c ]` | CBOR array. Array order is part of the value. |
| `"text"` | CBOR text string (`tstr`). When used for SMART request or response JSON text, the text string contains the JSON serialization. |
| `h'0102'` | CBOR byte string (`bstr`) containing bytes `0x01 0x02`. Whitespace in displayed hex is editorial. |
| `true` / `false` | CBOR booleans. In `ItemsRequest.nameSpaces`, the boolean is the mdoc `intentToRetain` flag. |
| `null` | CBOR simple value null. In direct `SessionTranscript`, the first two array entries are `null`. In detached `COSE_Sign1`, the payload field is `null`. |
| `; comment` | Human-readable comment in diagnostic examples. Comments are not part of CBOR, JSON, COSE, CDDL, or HPKE inputs. |
| `<placeholder>` | Non-normative placeholder for a value or bytes supplied by an implementation or fixture. |
| `...` | Omitted material for readability. It is never a literal protocol value. |

Map ordering in diagnostic notation is editorial unless an example is explicitly identified as byte-exact. Appendix C owns CDDL and any deterministic-encoding or conformance-vector encoding rules.

### F.2 Text strings, byte strings, and base64url strings

A CBOR text string (`tstr`) and a CBOR byte string (`bstr`) are different values. For example, `"{}"` is a text string containing two characters, while `h'7b7d'` is a byte string containing two bytes.

In the same-device flow:

```text
ItemsRequest.requestInfo["org.smarthealthit.checkin.request"] = <SMART request JSON tstr>
IssuerSignedItem.elementValue = <SMART response JSON tstr>
```

The Digital Credentials API request and result use JSON strings containing base64url-without-padding encodings of CBOR bytes:

```text
data.deviceRequest  = base64url(CBOR(DeviceRequest))
data.encryptionInfo = base64url(CBOR(encryptionInfo))
data.response       = base64url(CBOR(dcapiResponse))
```

The direct `dcapi` transcript is unusual because the exact `data.encryptionInfo` base64url text string is placed in a CBOR text string inside `dcapiInfo` before hashing.

### F.3 CBOR tag 24

CBOR tag 24 denotes an encoded CBOR data item. This specification commonly writes tag 24 in either construction-oriented or byte-oriented form:

```text
tag24(CBOR(ItemsRequest))
24(h'...encoded CBOR bytes...')
```

Both forms mean that the tagged value contains a byte string holding a complete encoded CBOR data item. A diagnostic renderer may decode the enclosed bytes for humans, but §8 byte operations use the tag-24 boundary where specified.

Common same-device tag-24 boundaries include:

```text
DocRequest.itemsRequest = tag24(CBOR(ItemsRequest))
ReaderAuthenticationBytes = tag24(CBOR(["ReaderAuthentication", SessionTranscript, ItemsRequestBytes]))
issuerSigned.nameSpaces["org.smarthealthit.checkin"][i] = tag24(CBOR(IssuerSignedItem))
issuerAuth payload = tag24(CBOR(MSO))
DeviceAuthenticationBytes = tag24(CBOR(["DeviceAuthentication", SessionTranscript, docType, tag24(CBOR(DeviceNameSpaces))]))
deviceSigned.nameSpaces = tag24(CBOR(DeviceNameSpaces))
```

Examples are logical or diagnostic unless explicitly identified as byte-exact. Appendix C owns accepted CDDL and Appendix E/D own byte ladders and fixtures.

### F.4 `COSE_Sign1` notation

`COSE_Sign1` is the COSE single-signer signature structure. Diagnostic examples often render it as a four-element array with explanatory labels:

```text
COSE_Sign1 = [
  protected:   <protected header bstr>,
  unprotected: <unprotected header map>,
  payload:     <payload bstr or null>,
  signature:   <signature bstr>
]
```

The labels `protected:`, `unprotected:`, `payload:`, and `signature:` are not CBOR map keys. The protected header is a byte string containing a CBOR map; diagnostic notation may decode that map for readability. For ES256 examples in this profile, the protected header map includes COSE algorithm label `1` with value `-7`:

```text
protected = bstr .cbor { 1: -7 }
```

For detached `readerAuth`, the serialized `COSE_Sign1` payload field is `null`. The signed COSE `Signature1` structure uses empty external AAD and `ReaderAuthenticationBytes` as the detached payload. `issuerAuth` and `deviceSignature` are also `COSE_Sign1` values in the core flow, but their payload and verification context are defined by §8 and Appendix C.

### F.5 COSE_Key EC2 P-256 labels

The HPKE recipient public key and mdoc device public key examples use COSE_Key EC2 P-256 labels:

```text
{
   1: 2,        ; kty = EC2
  -1: 1,        ; crv = P-256
  -2: h'...',   ; x-coordinate bstr
  -3: h'...'    ; y-coordinate bstr
}
```

The integer labels are COSE labels, not JSON property names. The coordinate values are byte strings. Diagnostic notation does not imply JWK encoding, compressed-point encoding, or textual hex in the actual CBOR value.

### F.6 Header label 33 (`x5chain`)

COSE header label `33` is used for `x5chain` certificate evidence. In this profile, when `readerAuth` is present, §8 requires it to carry reader certificate evidence under label `33` with at least the leaf reader certificate. Diagnostic examples may show the header in protected or unprotected form; the value is commonly rendered as an array of DER certificate byte strings:

```text
unprotected: { 33: [h'...reader certificate DER...'] }
```

Certificate bytes are evidence for policy evaluation. Their presence is not the same as trusted reader authentication; §7 and §8 distinguish absent, malformed, cryptographically failed, cryptographically valid but untrusted, and trusted reader-authentication states.

### F.7 JSON placeholders and non-literal examples

Some examples use `JSON.stringify(SmartHealthCheckinRequest)` or `JSON.stringify(SmartHealthCheckinResponse)` as shorthand for “the exact UTF-8 JSON text selected by the implementation or fixture.” This is explanatory shorthand, not a JavaScript API requirement and not a canonical JSON rule.

Angle-bracketed values such as `<SMART request JSON text>`, `<nonce bstr>`, `<HPKE enc bstr>`, `<P-256 x-coordinate bstr>`, and `<COSE_Sign1>` are placeholders unless a fixture explicitly replaces them with concrete bytes. Literal JSON examples do not contain comments or ellipses. Complete fixtures replace placeholders with actual values and identify which files are byte-exact under Appendix D.

## Appendix G: ISO/IEC 18013-5 and Digital Credentials API compatibility notes

This appendix explains how SMART Health Check-in 1.0 profiles ISO/IEC 18013-5-style mdoc structures and the W3C Digital Credentials API direct `org-iso-mdoc` path for the same-device SMART clinical exchange. It is compatibility guidance. Section 8 remains the source for version 1.0 same-device behavior.

### G.1 Reused mdoc and Digital Credentials API structures

The profile reuses mdoc presentation concepts rather than defining a new presentation token format. In particular, the same-device flow uses:

- a Digital Credentials API request with protocol `org-iso-mdoc`;
- `data.deviceRequest` as base64url-without-padding CBOR `DeviceRequest` bytes;
- `data.encryptionInfo` as base64url-without-padding CBOR direct `dcapi` encryption information;
- `DeviceRequest.version` `"1.0"` and `docRequests[]`;
- tag-24 `DocRequest.itemsRequest` containing an `ItemsRequest`;
- optional per-`DocRequest.readerAuth` as detached `COSE_Sign1` over `ReaderAuthenticationBytes`;
- an encrypted `DeviceResponse` containing issuer-signed namespaces, an MSO signed as `issuerAuth`, device-signed namespaces, and `deviceSignature`;
- MSO value digests over tag-24 issuer-signed item bytes;
- device authentication bound to the direct `dcapi` `SessionTranscript`; and
- HPKE response protection using the recipient public key from `encryptionInfo`.

The Wallet/Responder returns a Digital Credentials API result with protocol `org-iso-mdoc` and `data.response` containing base64url-without-padding CBOR `dcapiResponse` bytes.

### G.2 SMART-specific document type, namespace, element, and carriers

SMART Health Check-in constrains the mdoc content to one document type, one namespace, one stable response element, and one request-info key:

| Purpose | Value |
| --- | --- |
| mdoc `docType` | `org.smarthealthit.checkin.1` |
| mdoc namespace | `org.smarthealthit.checkin` |
| requested/disclosed element | `smart_health_checkin_response` |
| SMART request carrier | `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` |
| SMART response carrier | `IssuerSignedItem.elementValue` for `smart_health_checkin_response` |

The SMART request is a CBOR text string containing the §5 SMART request JSON serialization. The SMART response is a CBOR text string containing the §6 SMART response JSON serialization. The profile does not encode request items, FHIR profiles, questionnaires, Artifacts, fulfillment links, or item statuses as separate generic mdoc or mDL data elements in the core flow. Those clinical semantics remain inside the SMART request and SMART response JSON models.

### G.3 DeviceRequest version and reader authentication

Core SMART Health Check-in 1.0 uses `DeviceRequest.version` `"1.0"`. When reader authentication is present, it is per `DocRequest.readerAuth` and is computed over:

```text
ReaderAuthenticationBytes = tag24(CBOR([
  "ReaderAuthentication",
  SessionTranscript,
  ItemsRequestBytes
]))
```

The core profile does not use `DeviceRequest` version `"1.1"` `readerAuthAll` as its reader-authentication mechanism. A future version or deployment profile could define additional compatibility behavior, but that would not change the §8 core v1 byte ladder.

`readerAuth` is optional in core v1 unless a deployment profile requires it. When present, it is detached `COSE_Sign1` with ES256 (`alg` `-7`), a `null` serialized payload, empty external AAD for the COSE `Signature1` structure, and `x5chain` certificate evidence under COSE header label `33` with at least the leaf reader certificate. Trust anchors, certificate path validation, revocation, assurance labels, and required-use policy are deployment-profile or trust-framework decisions.

### G.4 Direct `dcapi` handover and origin binding

The profile uses the direct Digital Credentials API handover/session transcript defined in §8:

```text
dcapiInfo = CBOR([encryptionInfoBase64Url, origin])
handover = ["dcapi", SHA-256(dcapiInfo)]
SessionTranscript = CBOR([null, null, handover])
```

The `encryptionInfoBase64Url` input is the exact unpadded base64url string from the DC API request. The `origin` input is the authenticated origin, or deployment-approved privileged-caller origin-equivalent, supplied by the Browser / User Agent or platform. It is not copied from the SMART request body.

The resulting `SessionTranscript` binds the presentation to the caller context and to the HPKE recipient information conveyed in `encryptionInfo`. The same bytes are used for optional reader authentication, mdoc device authentication, and HPKE response sealing/opening.

### G.5 IssuerAuth, MSO value digest, deviceSignature, and HPKE roles

The reused evidence and protection layers have distinct roles:

1. **MSO value digest and `issuerAuth`.** The SMART response JSON is the `elementValue` of an issuer-signed item. The MSO value digest covers the complete tag-24 `IssuerSignedItem` bytes. `issuerAuth` signs the MSO and supplies issuer evidence for the mdoc container.
2. **Device authentication and `deviceSignature`.** The device signature proves possession of the device private key corresponding to `MSO.deviceKeyInfo.deviceKey` and binds the presentation to the expected `SessionTranscript`, `docType`, and device namespaces.
3. **HPKE transport protection.** HPKE encrypts the CBOR `DeviceResponse` to the Verifier's recipient public key from `encryptionInfo` using DHKEM(P-256, HKDF-SHA256), HKDF-SHA256, AES-128-GCM, `info = SessionTranscript bytes`, and empty AAD.
4. **SMART response validation.** After extraction, the Verifier validates the SMART response under §6 and applies §6.6 cross-validation against the original SMART request.

These roles are complementary, not interchangeable. HPKE opening does not validate the mdoc signatures or SMART response shape. A valid mdoc presentation does not by itself prove patient matching, legal authority, EHR write-back authorization, downstream clinical acceptance, or clinical-source provenance for unsigned raw FHIR JSON.

### G.6 What this profile does not define

SMART Health Check-in 1.0 is not a generic mDL profile and does not define generic mDL data elements such as family name, given name, birth date, portrait, driving privileges, age-over claims, resident address, issuing authority, or document number. It does not define a general-purpose mdoc clinical credential model, generic FHIR-resource mdoc elements, generic reader certificate PKI, universal issuer registry, or universal browser allow-list policy.

The profile also does not define clinical-source provenance beyond §7. Raw FHIR JSON Artifacts remain patient-mediated unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof.

### G.7 Relationship to in-person initiation and later appendices

In-person initiation mechanisms such as QR codes, NFC tags, or deep links are implementation-defined ways to load a same-device Verifier page that runs §8. Appendix G does not define URL formats, pointer storage, relay behavior, response routing, or completion-display processing for those mechanisms. They do not create an alternate presentation carrier, cryptographic boundary, or trust layer for SMART Health Check-in 1.0.

Appendix C owns precise same-device CDDL and any ISO compatibility refinements needed to remove ambiguity from labels, tag-24 boundaries, duplicate handling, and encoding constraints. Appendix D owns same-device fixture classification and the final vector index. Appendix G records compatibility intent and profile constraints so those appendices align with §8 without creating alternate encodings or semantics.

---

## Appendix H. Mapping to FHIR R4 idioms

This appendix explains how the SMART Health Check-in request and response model in §§5-6 maps to common FHIR R4 idioms. It is supporting implementation and test guidance; it does not define a separate FHIR API, FHIR search language, mdoc behavior, presentation initiation behavior, registry mechanism, JSON Schema rule, or downstream EHR ingestion policy.

The SMART request and SMART response remain transport-neutral clinical JSON objects. FHIR evidence described here is evidence in request selectors, raw FHIR JSON Artifacts, or signed SMART Health Card payloads. If this appendix appears to conflict with §§5-6, §§5-6 control. Requirement keywords in this appendix either restate those sections or are scoped to Appendix H processing guidance.

### H.1 FHIR release context and terms

Version 1.0 uses FHIR R4 idioms for examples and for the base interpretation of FHIR canonicals, `StructureDefinition` profiles, `Questionnaire`, `QuestionnaireResponse`, `Bundle.entry[].resource`, and `Resource.meta.profile`. The clinical model is not limited to one implementation guide. US Core, CARIN Digital Insurance Card, and similar guides are examples of profile sources that a Requester might reference; they are not required implementation guides for SMART Health Check-in 1.0.

For this appendix:

- **canonical** means a FHIR canonical URL string, optionally followed by a `|version` suffix where the relevant field permits that form.
- **parsed canonical** means the structured pair `(url, version?)` obtained by splitting a canonical at the first `|`, preserving the original wire string separately. The `url` member is the non-empty substring before the first `|` or the whole string when no suffix is present. The `version` member is the substring after the first `|`, when present, and is treated as opaque even if it contains additional `|` characters.
- **base canonical** means the parsed canonical `url`, without any `|version` suffix.
- **profile evidence** means evidence that a returned resource conforms to a requested exact profile or to a profile in a requested family. Evidence can include `meta.profile`, signed payload content, source or issuer constraints, trusted Wallet/Responder knowledge, FHIR package metadata, implementation-guide knowledge, configured family mappings, or local policy.

The SMART request `version` and SMART response `version` are SMART Health Check-in model versions, not FHIR versions. For raw FHIR JSON Artifacts, FHIR release information is carried by the Artifact-level `fhirVersion`. For SMART Health Card Artifacts, FHIR release information is inside each signed credential payload.

### H.2 Canonical URL and `canonical|version` handling

FHIR canonicals appear in `profiles[]`, `profilesFrom[]`, questionnaire selectors, returned `QuestionnaireResponse.questionnaire`, and returned `Resource.meta.profile` values. Section 5.5 defines the controlling decision matrix. The FHIR-facing summary is:

- preserve the exact wire string when carrying, signing, encrypting, comparing protocol bytes, logging, including values in fixtures, returning `QuestionnaireResponse.questionnaire`, or returning `Resource.meta.profile` values;
- parse canonicals into `(url, version?)` before resolution or conformance-resource lookup, and preserve the original canonical string separately for response construction and diagnostics;
- resolve a canonical to a FHIR resource with a configured canonical resolver or package cache that consumes `(url, version?)`, or with FHIR search semantics such as `GET [base]/{ResourceType}?url={url}&version={version}` when a version is present;
- verify the resolved resource after lookup: `resourceType` matches the expected FHIR resource type, `url` equals the requested parsed `url`, and `version` equals the requested parsed `version` when the request was versioned;
- use direct bare HTTP dereference of `url` only for unversioned canonicals, only when the recipient is willing to accept the publisher's served version, and only with post-resolution `resourceType` and `url` verification; do not satisfy a versioned canonical by stripping `|version` and dereferencing the bare URL; and
- compare at the same normalization level on both sides. A versioned request value is an exact-version claim when exact conformance is asserted or validated. An unversioned request value can match a supported version of the same base canonical when other evidence supports the match.

| Location or operation | FHIR-layer interpretation |
| --- | --- |
| `profiles[]` | Exact `StructureDefinition` profile canonicals. If the request includes `|version`, exact-version evidence must preserve and compare the suffix or provide equivalent local evidence for that exact profile version. A Wallet/Responder should not report `fulfilled` for a versioned `profiles[]` request value unless the returned resource's `meta.profile[]` includes the same versioned canonical or the Wallet/Responder has trusted evidence that the resource conforms to that exact profile version. If the request omits `|version`, evidence for a supported version of the same base canonical can be responsive, subject to §5.4.1.1 and local policy. |
| `profilesFrom[]` | Canonical profile-family URLs. Family lookup normally uses the base canonical; strip `|version` unless the family definition explicitly defines version-sensitive membership. This is a classification rule, not a resolution rule for `StructureDefinition` resources. |
| Questionnaire canonical selector | The selector's `canonical` field is the Questionnaire identity requested by the Requester. Resolve it as a parsed `(url, version?)` using a canonical resolver, package cache, or FHIR search. Direct bare HTTP dereference is permitted only for unversioned Questionnaire canonicals and requires post-resolution `Questionnaire.url` verification. A versioned Questionnaire canonical is not resolved by stripping the suffix and dereferencing the bare URL. |
| Inline `Questionnaire.url` and `Questionnaire.version` | FHIR resource fields that can support consistency checks and can provide a canonical identity when no explicit request canonical was supplied. They do not replace an explicit request canonical when both are present. |
| `QuestionnaireResponse.questionnaire` | When known and when the requested canonical is the identity being answered, preserve the requested canonical including `|version`. |
| Returned `Resource.meta.profile[]` | FHIR conformance evidence inside returned resources. Preserve known values, including `|version` suffixes; do not remove suffixes merely because request routing or grouping used an unversioned form. |

A Wallet/Responder that cannot evaluate an exact version claim can report the item outcome using §6.4 status rules rather than guessing. A Verifier should avoid asymmetric comparisons, such as stripping only the request value or only the returned `meta.profile`, when exact version conformance is the question.

Resolution failure, post-resolution mismatch, or absence of exact-version evidence for a versioned request value is not a license to substitute a different FHIR artifact. The Wallet/Responder should report `unsupported`, `unavailable`, or `error` according to §6.4, depending on whether the problem is capability, data availability, or operational failure.

### H.3 Mapping `fhir.resources` selectors

A `content.kind: "fhir.resources"` selector requests patient-specific FHIR resources. It is not a general FHIR search expression, FHIRPath expression, GraphDefinition, `$everything` operation, SMART App Launch scope, authorization policy, or instruction to contact a FHIR server.

#### H.3.1 `profiles[]`: exact profile matching

`profiles[]` contains exact `StructureDefinition` canonical URLs acceptable for the item. A returned resource can support a `profiles[]` match when:

1. the resource's `meta.profile[]` includes the requested canonical, applying §5.5 comparison rules and exact-version matching for versioned request values;
2. signed content, such as a SMART Health Card payload, includes equivalent profile evidence; or
3. the Wallet/Responder, Verifier, or receiver has trusted local evidence that the resource conforms to the requested profile.

The core protocol does not require the Wallet/Responder or Verifier to run a full FHIR profile validator for every resource. A deployment profile, certification program, or receiving system may require full validation before ingestion, but that is downstream conformance or workflow policy.

#### H.3.2 `profilesFrom[]`: profile-family membership

`profilesFrom[]` is an array of canonical profile-family URLs. A profile family can identify a FHIR publication, implementation guide, profile collection, or other known family of FHIR profiles. A `profilesFrom[]` value is not a package descriptor, package id, package version, npm package name, registry alias, object, local topic label, or singleton string field unless a future version or registered extension defines such a value space.

FHIR resources do not normally declare profile-family membership directly. To evaluate a returned resource against `profilesFrom[]`, implementations generally need knowledge outside the SMART response, such as FHIR package metadata, `ImplementationGuide` content, configured family mappings, or local policy. `meta.profile[]` is useful evidence, but a Verifier still needs to know whether the declared profile belongs to one of the requested families.

A broad profile-family request does not require the Wallet/Responder to disclose every matching resource. Holder decision, accepted media types, FHIR version compatibility, Wallet capability, available data, local policy, and §6.4 status determine the response.

#### H.3.3 Additive profile selectors and `resourceTypes[]`

`profiles[]` and `profilesFrom[]` are additive profile selectors. If both are present, the profile-selector portion of the item is satisfied by a resource that matches any exact profile in `profiles[]` or any profile that belongs to any family in `profilesFrom[]`, subject to `resourceTypes[]` and the rest of the item definition.

`resourceTypes[]` is a separate resource-type constraint. When it appears with `profiles[]` or `profilesFrom[]`, a responsive resource must satisfy the additive profile-selector portion and have a listed FHIR `resourceType`. When `resourceTypes[]` appears alone, the item requests patient-specific resources of the listed official FHIR resource types.

Example:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"],
  "profiles": [
    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
  ],
  "resourceTypes": ["Patient", "Condition"]
}
```

The exact US Core Patient profile and the US Core profile family remain additive profile matches. `resourceTypes[]` separately limits responsive resources to `Patient` or `Condition` resources.

#### H.3.4 No-selector default

When a `fhir.resources` selector omits `profiles[]`, `profilesFrom[]`, and `resourceTypes[]`, §5.4.1.5 defines the no-selector default: the item requests any patient-specific FHIR resources the Wallet/Responder can offer and the Holder chooses to share, constrained by `accept[]`, `fhirVersions[]` where applicable, Wallet capability, local policy, and Holder decision.

For FHIR mapping, a Verifier should not expect a specific `meta.profile` value or resource type solely from this selector. The default is intentionally broad; it is not a command to export a complete patient record and not a guarantee that returned content is comprehensive.

### H.4 Raw FHIR JSON Artifacts (`application/fhir+json`)

A raw FHIR JSON Artifact maps directly to a FHIR Resource or Bundle carried in the Artifact `value` field. Section 6.3.2 defines the normative Artifact shape. Core FHIR mapping in this appendix covers the core `application/fhir+json` and `application/smart-health-card` Artifact media types; extension Artifacts that carry FHIR-related content are separate branded media-type variants with their own typed payload shapes and FHIR-version rules.

#### H.4.1 Single Resource vs. Bundle

A raw FHIR JSON Artifact `value` is either:

1. a single FHIR Resource JSON object with a string `resourceType`; or
2. a FHIR Bundle with `resourceType: "Bundle"` and resources in `Bundle.entry[].resource`.

A single-resource Artifact is appropriate when one resource is being returned. A Bundle is the usual FHIR packaging idiom when several resources are returned together, when supporting resources are included, or when one Artifact fulfills several request items. A Bundle used only to package returned resources is commonly a `collection` Bundle, but this appendix does not require a specific Bundle `type` unless another profile or local policy does.

For selector validation:

- a non-Bundle Artifact is evaluated as the single FHIR resource in `value`;
- a Bundle Artifact is evaluated by inspecting `Bundle.entry[].resource` entries;
- a Bundle entry without `resource` does not provide FHIR resource content for selector matching; and
- the outer Bundle's `resourceType: "Bundle"` does not by itself satisfy a request for `Patient`, `Coverage`, `Observation`, or another non-Bundle resource type.

Bundle-level `meta.profile`, if present, may describe the Bundle profile. It does not substitute for profile evidence on entry resources when the request asked for non-Bundle clinical resources.

#### H.4.2 `fhirVersion` and mixed-version handling

An `application/fhir+json` Artifact carries an outer `fhirVersion`. That value applies to a single Resource Artifact or to the Bundle and all `Bundle.entry[].resource` resources in that Artifact. Under §§6.3.2 and 6.6.5, Wallets/Responders do not mix resources that require different FHIR releases in one raw FHIR JSON Artifact.

When responsive content exists in multiple FHIR releases, the Wallet/Responder should use separate raw FHIR JSON Artifacts, each with its own `fhirVersion`, or report the affected item as `partial`, `unavailable`, `unsupported`, or `error` under §6.4. A Verifier that detects mixed FHIR release requirements in one raw FHIR JSON Bundle rejects or quarantines the Artifact under §6.6.5. Detection may be conservative because many FHIR resources do not explicitly label their release inside the resource body.

The request-level `fhirVersions[]` is a preference and capability signal for raw FHIR JSON and other response forms with an outer FHIR version declaration. It does not override version information inside SMART Health Cards.

An extension media type that carries raw FHIR JSON or a FHIR-derived document is not automatically treated as `application/fhir+json`. Its extension definition needs to state its typed fields, whether it has an outer FHIR version declaration, how FHIR resources are located inside the payload, and how selector matching is performed.

#### H.4.3 `meta.profile` evidence

Returned FHIR resources should preserve `meta.profile[]` values where known, including `|version` suffixes. In a Bundle, this evidence appears on `Bundle.entry[].resource.meta.profile`, not as an Artifact-level profile summary.

Verifiers and receivers should inspect profile evidence in the FHIR payload itself. Absence of `meta.profile` is not automatically a core protocol error because §5 allows matching based on equivalent local knowledge or trusted conformance evidence. Contradictory profile evidence, missing evidence needed by a local workflow, or failure of full FHIR validation can lead a receiver to reject or quarantine content under deployment policy without changing the SMART request/response model.

### H.5 SMART Health Card Artifacts at the FHIR layer

An `application/smart-health-card` Artifact is a SMART Health Card file-style JSON object whose `value.verifiableCredential[]` contains one or more SMART Health Card JWS strings. The Artifact wrapper has no outer `fhirVersion` under §§6.3.1 and 6.6.5.

FHIR-version semantics for this Artifact class are inside each signed SMART Health Card payload. A Verifier validates each JWS according to SMART Health Cards and local trust policy, then evaluates the signed FHIR payload content against the original request selectors. Selector responsiveness is determined from signed payload resources, their declared FHIR version, their `resourceType` values, and profile evidence such as `meta.profile` where present.

The same selector concepts apply at the FHIR layer:

- `profiles[]` maps to exact profile evidence in signed resources;
- `profilesFrom[]` maps to membership of signed-resource profiles in a requested family;
- `resourceTypes[]` filters by signed-resource `resourceType`; and
- no-selector items can be satisfied by suitable patient-specific signed FHIR content, subject to Holder decision and local policy.

The SMART Health Check-in Artifact wrapper should not include an Artifact-level profile summary to substitute for inspecting signed content. A SMART Health Card can be validly signed yet still fail to satisfy a requested profile, resource type, Questionnaire, or local ingestion policy.

### H.6 Questionnaire selector mapping

A `content.kind: "questionnaire"` selector asks the Wallet/Responder to collect or provide answers to a FHIR Questionnaire. The selector is a flat object with `kind: "questionnaire"` and sibling optional fields `canonical` and `resource`, at least one of which is present. It does not contain a nested polymorphic `questionnaire` member. For `application/fhir+json`, the expected returned FHIR resource is a `QuestionnaireResponse`, either as a single Resource Artifact or inside a Bundle.

#### H.6.1 Questionnaire identity selection

The requested Questionnaire can be expressed as:

1. `canonical`: a non-empty FHIR canonical string, optionally with `|version`;
2. `resource`: an inline FHIR `Questionnaire` resource object; or
3. both `canonical` and `resource` on the selector object.

When selector `canonical` is supplied and is the Questionnaire identity being answered, a generated `QuestionnaireResponse.questionnaire` should preserve that canonical exactly, including any `|version` suffix. When only an inline Questionnaire `resource` is supplied, the Wallet/Responder should populate `QuestionnaireResponse.questionnaire` from the inline resource's canonical identity when known, usually `Questionnaire.url` plus `|Questionnaire.version` when both are present and the version is intended as the canonical version. If no canonical identity is known, the Wallet/Responder should not invent a misleading canonical merely to fill the field; downstream receivers may still require one by deployment policy.

Example canonical-only selector:

```json
{
  "kind": "questionnaire",
  "canonical": "https://clinic.example.org/fhir/Questionnaire/migraine-intake|1.2.3"
}
```

Example inline selector:

```json
{
  "kind": "questionnaire",
  "resource": {
    "resourceType": "Questionnaire",
    "url": "https://clinic.example.org/fhir/Questionnaire/migraine-intake",
    "version": "1.2.3",
    "status": "active",
    "item": []
  }
}
```

#### H.6.2 Inline and canonical+inline cases

When both sibling fields `canonical` and `resource` are supplied, the canonical is the Requester's explicit identity for response construction and receiver interpretation, while the inline resource is the body to render or use. The Wallet/Responder should check consistency between `canonical`, `resource.url`, `resource.version`, and material item structure. It should not silently merge conflicting definitions or rewrite the requested canonical to match a conflicting inline resource.

Material disagreement is described in §5.4.2.4 and includes different base canonical URLs after applying §5.5 comparison rules, different explicit versions, or conflicting item structure that would change Holder answers. If material disagreement is detected before answers are collected or response construction begins, §6.4 favors `unsupported`. An operational failure after a Questionnaire is otherwise understood is normally `error`. A Verifier should treat an `unsupported` status for such disagreement as a valid item outcome rather than a transport failure when the rest of the SMART response validates.

#### H.6.3 QuestionnaireResponse validation

A Verifier evaluating a questionnaire item returned as `application/fhir+json` should check that:

- the Artifact media type is accepted by the item;
- the raw FHIR Artifact includes `fhirVersion`;
- the returned FHIR content is a `QuestionnaireResponse`, or a Bundle containing the relevant `QuestionnaireResponse` in `Bundle.entry[].resource`;
- `QuestionnaireResponse.questionnaire`, when present, preserves the selector's requested `canonical` and `|version` under §5.5 when that canonical is the identity being answered;
- the response is linked to the correct request item through Artifact `fulfills[]` and item status; and
- the response status is consistent with §6.4, including valid `unsupported`, `declined`, `partial`, and `error` outcomes.

This appendix does not define universal Questionnaire rendering rules, answer validation rules, terminology validation rules, launch-context rules, Structured Data Capture behavior, or expression evaluation. Deployments that require those features should define them in a deployment profile or extension.

### H.7 Relationship to US Core, CARIN, and other implementation guides

US Core and CARIN examples are useful because they provide familiar FHIR R4 profile canonicals and profile-family concepts for demographics, clinical summaries, and insurance-card workflows. They are illustrative only.

Example exact CARIN-style Coverage selector:

```json
{
  "kind": "fhir.resources",
  "profiles": ["http://hl7.org/fhir/us/insurance-card/StructureDefinition/C4DIC-Coverage"],
  "resourceTypes": ["Coverage"]
}
```

Example US Core profile-family selector:

```json
{
  "kind": "fhir.resources",
  "profilesFrom": ["http://hl7.org/fhir/us/core"]
}
```

These examples mean that the Requester can process content matching those selectors if the Holder and Wallet/Responder can provide it. They do not make US Core, CARIN, or any other implementation guide mandatory clinical content, a mandatory Wallet storage requirement, or mandatory Verifier ingestion policy. Other jurisdictions and deployment communities can use their own FHIR canonicals, profile families, and local trust policies through the same selector and Artifact rules.

### H.8 Verifier and Wallet use of FHIR conformance evidence

SMART Health Check-in uses FHIR-native identifiers to improve interoperability, but it is intentionally lighter than a full FHIR conformance-testing pipeline. Wallets/Responders and Verifiers should use FHIR conformance evidence pragmatically:

- preserve and inspect `resourceType`, `meta.profile[]`, canonical URLs, `QuestionnaireResponse.questionnaire`, `Questionnaire.url`, and `Questionnaire.version` where known;
- use implementation-guide, package, family-map, or local policy knowledge for `profilesFrom[]` membership;
- verify SMART Health Card signatures and inspect signed FHIR payloads before relying on SMART Health Card FHIR evidence;
- avoid manufacturing profile claims or wrapper-level profile summaries that are not supported by the payload; and
- distinguish protocol validation from downstream clinical acceptance.

A response can be a valid SMART Health Check-in response and still be unsuitable for a Requester's local workflow because it lacks a required profile, profile version, issuer trust signal, provenance, patient-match confidence, terminology validation, or downstream business requirement. Conversely, a core protocol implementation is not non-conformant merely because it does not perform full FHIR profile validation, unless a deployment profile or certification program adds that requirement.
