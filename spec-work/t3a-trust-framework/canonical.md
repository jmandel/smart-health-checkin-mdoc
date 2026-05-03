## 7. Trust framework

This section defines the trust layers that apply to SMART Health Check-in 1.0 presentation and response processing. The SMART request and SMART response are transport-neutral clinical JSON objects defined in §§5-6. Trust information is supplied by the selected presentation flow, returned Artifact payloads, deployment policy, or out-of-band trust-framework decisions; it is not supplied by self-asserted requester identity fields in the clinical request body.

The trust layers in this section are distinct:

- **Origin trust** identifies the web origin or privileged caller context from which a same-device Wallet invocation was initiated.
- **Reader / Verifier trust** authenticates the presentation requester when signed reader authentication is present and accepted by Wallet policy.
- **Issuer / device-attestation trust** evaluates mdoc issuer evidence, MSO trust, disclosed-element integrity, and device-key proof for the presentation container.
- **Clinical-source trust** evaluates provenance, signatures, or chain-of-custody evidence for the returned clinical content itself.
- **Out-of-band deployment policy** selects the trust anchors, registries, allow-lists, assurance levels, and downstream acceptance rules used in a deployment.

A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator SHALL NOT treat one trust layer as a substitute for another unless this specification or an explicit deployment profile defines the relationship and its assurance level. Successful transport presentation proves only the properties validated for that transport and session. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority to act, downstream clinical acceptance, or clinical-source provenance for unsigned content.

The version 1.0 base presentation flow is same-device direct `org-iso-mdoc` over the W3C Digital Credentials API. Section 8 defines byte-level request construction, `SessionTranscript` construction, HPKE processing, mdoc validation, and response extraction. This section defines the trust interpretation and policy seams those mechanics support. Kiosk is a later wrapper around the same clinical objects and same-device re-entry; §9 defines kiosk wrapper signatures, pointer binding, relay behavior, encrypted submission, and completion processing.

### 7.1 Origin trust

Origin trust concerns the caller context supplied to a Wallet/Responder by the Browser / User Agent or platform. Origin trust is presentation-transport evidence. It is not reader authentication, mdoc issuer assurance, clinical-source provenance, Holder consent, patient matching, or downstream authorization.

A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body to substitute for origin trust. Prohibited metadata is defined in §5.2.7 and includes requester names, origins, URLs, application identifiers, package names, certificates, logos, organization metadata, signed-request metadata, and trust-framework claims. A Wallet/Responder SHALL NOT treat `purpose`, request item `title`, request item `summary`, selector values, unknown request members, extension members, or Artifact content as authenticated requester identity or authenticated origin.

A Wallet/Responder MAY use authenticated origin information for Holder display, local risk decisions, allow-list decisions, diagnostic handling, or policy enforcement. A Wallet/Responder SHALL keep any such origin decision separate from clinical-content validation under §§5-6.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

When the same-device presentation flow is invoked through the W3C Digital Credentials API and the Browser / User Agent or platform exposes an authenticated web origin to the Wallet/Responder, a Wallet/Responder that uses origin trust SHALL use that platform-provided origin as the web-origin input for origin display, origin policy, and any same-device binding defined in §8. The Wallet/Responder SHALL NOT derive authenticated origin from the SMART request JSON, `purpose`, item display text, callback-looking strings, logos, request ids, selector URLs, kiosk pointer metadata, relay URLs, or Artifact payloads.

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

Clinical-source trust concerns whether returned clinical content carries evidence about where it came from, who or what signed it, and whether that evidence is acceptable to the Requester or receiving workflow. Clinical-source trust is evaluated at the Artifact payload layer and through deployment policy. It is not automatically created by successful transport presentation, web-origin trust, reader authentication, mdoc issuer signatures, device-key proof, kiosk wrapper validation, Holder consent, or SMART response shape validation.

A Verifier or receiver SHALL evaluate clinical-source trust according to the Artifact `mediaType`, payload signatures or provenance, request selectors, FHIR evidence, SMART Health Card rules where applicable, extension-profile rules where applicable, and deployment policy. A Verifier or receiver SHALL NOT infer clinical-source provenance from successful transport presentation alone.

A Requester MAY apply stricter clinical-source, patient-match, freshness, completeness, terminology, FHIR-profile, provenance, or local-ingestion requirements before workflow use. Those downstream decisions do not change whether the SMART response is syntactically and procedurally valid under §§5-6.

#### 7.4.1 SMART Health Card chain of custody

An `application/smart-health-card` Artifact carries one or more SMART Health Card Verifiable Credential JWS strings in `value.verifiableCredential[]`. A Verifier or receiver that consumes a SMART Health Card Artifact SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on the signed clinical content or issuer claims.

For SMART Health Card Artifacts, FHIR content, FHIR version semantics, issuer identity, and signed clinical-source evidence are inside the signed credential payloads. A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact, and a Verifier SHALL reject such an outer `fhirVersion` under §6.3.1 and §6.6.5.

A Verifier or receiver SHALL evaluate signed SMART Health Card payload content against the original SMART request selectors and local policy before relying on the Artifact for a requested item. A valid SMART Health Card signature proves only the claims made by that credential under the accepted SMART Health Card trust policy. It does not by itself prove that the Artifact satisfies every request selector, that all requested content was returned, that the Holder is the intended patient, that the content is current enough for the workflow, or that downstream ingestion is authorized.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

An `application/fhir+json` Artifact is raw FHIR JSON mediated by the Holder and Wallet/Responder. A Wallet/Responder SHALL include `fhirVersion` on each raw FHIR JSON Artifact as defined in §6.3.2. A Verifier SHALL treat that `fhirVersion` as FHIR release context for interpreting the raw FHIR Artifact, not as a clinical-source signature, provenance record, issuer credential, or proof of clinical correctness.

A Verifier or receiver SHALL treat raw FHIR JSON as patient-mediated content unless the Artifact payload, extension profile, deployment profile, or other accepted evidence supplies separate provenance, signature, source attestation, authenticated retrieval evidence, or equivalent source proof. Examples of separate evidence can include a FHIR `Provenance` resource, a FHIR digital signature, a signed Bundle, an extension Artifact media type with defined integrity rules, authenticated retrieval evidence, or another deployment-accepted attestation. These examples are illustrative and do not mandate a particular provenance technology.

A Wallet/Responder SHALL NOT use transport encryption, mdoc issuer signatures, device-key proof, `readerAuth`, origin evidence, `purpose`, item text, Artifact ids, `fulfills[]`, kiosk wrapper fields, or successful SMART response validation to claim that unsigned raw FHIR JSON is an issuer-signed clinical credential. A Verifier or receiver MAY accept patient-mediated raw FHIR JSON for a workflow under local policy, but it SHALL NOT equate raw FHIR JSON with SMART Health Card or other signed clinical-source evidence unless separate proof is present and accepted.

A Requester that requires source-authenticated FHIR content SHOULD request media types or deployment profiles that carry suitable provenance or signature evidence and SHOULD apply local policy before downstream ingestion.

### 7.5 Identifier scoping and uniqueness

Identifiers in SMART Health Check-in are scoped protocol correlation values unless their defining payload, presentation binding, Artifact payload, or deployment policy gives them a broader meaning. A Requester, Wallet/Responder, Verifier, Kiosk creator, Phone presenter, Completion display, deployment profile, or trust-framework operator SHALL preserve identifier scopes and SHALL NOT treat an identifier from one layer as an identifier, proof, or authorization for another layer unless a later section or deployment profile explicitly defines that binding.

A Requester SHALL generate `SmartHealthCheckinRequest.id` values as defined in §5.2.3. The request `id` is scoped to SMART requests created by that Requester for the same check-in session; it is not a patient identifier, requester identifier, origin identifier, reader identifier, mdoc session identifier, issuer identifier, freshness proof, authorization proof, or clinical fact. A Wallet/Responder SHALL copy the request `id` exactly into `SmartHealthCheckinResponse.requestId` as required by §6.1.3. A Verifier SHALL validate the exact `requestId` match under §6.6.1 and SHALL NOT use that match as a substitute for transport freshness, origin trust, reader authentication, patient matching, or clinical provenance.

A Requester SHALL keep request item `id` values unique within one SMART request as required by §5.3.1. A Wallet/Responder SHALL preserve request item ids exactly when constructing `fulfills[]` and `requestStatus[].item`. A Verifier SHALL validate item references as defined in §6.6. Item ids are not global clinical identifiers or patient identifiers.

A Wallet/Responder SHALL keep Artifact `id` values unique within one SMART response as required by §6.2.1. A Requester, Verifier, receiver, Wallet/Responder, deployment profile, or trust-framework operator SHALL NOT treat Artifact ids as global document identifiers, patient identifiers, requester identifiers, clinical provenance identifiers, or source document identifiers unless that meaning is separately established by the Artifact payload, signature, provenance, or deployment policy.

Presentation-layer and wrapper identifiers, including web origins, reader certificate subjects, issuer certificate subjects, certificate serial numbers, key ids, mdoc docTypes, namespaces, element identifiers, `SessionTranscript` components, nonces, kiosk pointer ids, relay row ids, submission ids, and completion ids, have the scopes defined by their respective sections or deployment profiles. Identifier uniqueness at one layer does not imply uniqueness at another layer. A Wallet/Responder, Verifier, Requester, Kiosk creator, Phone presenter, or Completion display SHALL NOT use presentation or wrapper identifiers to replace the SMART request `id`, request item ids, Artifact ids, `fulfills[]` links, or `requestStatus[]` accounting required by §§5-6.

A deployment profile SHOULD define collision resistance, replay handling, retention, logging, telemetry, and privacy expectations for identifiers it introduces or constrains, especially when identifiers can appear in browser history, QR codes, logs, telemetry, certificate fields, or downstream records.

### 7.6 Out-of-band trust establishment / deployment policy

SMART Health Check-in 1.0 defines protocol hooks and validation responsibilities for layered trust, but it does not define one universal production trust framework for all deployments. Trust anchors, registries, organizational accreditation, privileged-browser allow-lists, issuer onboarding, clinical-source acceptance criteria, patient matching, EHR ingestion, retention, and downstream workflow rules are deployment policy unless a normative section of this specification defines a specific interoperable requirement.

A deployment profile or trust-framework operator that adds out-of-band trust requirements SHALL document:

1. which roles are constrained, such as Wallet/Responder, Verifier, Requester, Kiosk creator, Phone presenter, Submission service, or Completion display;
2. which trust layer is constrained: origin, privileged caller, reader authentication, mdoc issuer, device proof, self-attested wallet evidence, kiosk wrapper signature, clinical-source provenance, or downstream receiver policy;
3. the accepted trust anchors, registries, allow-lists, certificate policies, issuer policies, source-provenance mechanisms, or assurance labels;
4. freshness, revocation, expiration, replay, or status-check expectations;
5. required Wallet/Responder behavior when evidence is missing, invalid, expired, revoked, unsupported, ambiguous, inconsistent, or outside policy;
6. required Verifier, Requester, or receiver behavior when a presentation succeeds but clinical-source, patient-match, local-ingestion, or downstream workflow policy is not satisfied; and
7. how Holder-facing display distinguishes authenticated identity, authenticated origin, authenticated reader information, unauthenticated request text, and local policy warnings.

A deployment profile SHALL state which trust layers are mandatory for each conformance or deployment context it defines. If a deployment profile permits operation when a trust layer is absent or fails, it SHALL state the resulting assurance level and any restrictions on use of returned content.

A deployment profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, Artifact media types, selector semantics, fulfillment links, or status codes. It MAY require stricter validation, narrower accepted media types, stronger provenance, additional display, stronger trust anchors, or rejection of otherwise optional trust modes.

A Verifier or Requester SHALL apply the trust policy required by its deployment before using a SMART response for downstream workflow. A Wallet/Responder SHALL apply its local policy and any applicable deployment profile before disclosing content. A Wallet/Responder MAY refuse a request when required trust evidence is missing, unacceptable, expired, revoked, inconsistent, or not understandable.

A Kiosk creator, Submission service, Phone presenter, and Completion display SHALL preserve the trust boundaries defined here and SHALL NOT redefine SMART request or SMART response clinical semantics. The Submission service and pointer transport are not trusted with plaintext clinical content merely because they relay encrypted kiosk state. Section 9 owns kiosk-specific wrapper signatures, encryption, pointer binding, expiration, replay controls, and completion processing.
