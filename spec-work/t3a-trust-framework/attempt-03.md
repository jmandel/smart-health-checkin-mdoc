## 7. Trust framework

This section defines the trust layers that apply to SMART Health Check-in presentation and response processing. It is normative for the roles named in each requirement, but it does not choose a single national, institutional, vendor, or product trust program. A deployment profile or trust-framework operator can make the policy choices identified here, including accepted origins, reader certificates, mdoc issuer anchors, SMART Health Card issuers, and rules for local clinical use.

A Verifier, Requester, Wallet/Responder, deployment profile, and trust-framework operator SHALL keep the following trust layers distinct:

1. web origin or privileged caller trust;
2. reader or Verifier authentication;
3. mdoc issuer evidence and device-key proof;
4. provenance or signature evidence for returned clinical content; and
5. out-of-band deployment policy.

A successful presentation transport proves only the properties validated for that transport and session. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority to act for another person, payment or eligibility status, downstream clinical acceptance, or the clinical provenance of unsigned content.

The SMART request and SMART response remain the transport-neutral clinical JSON objects defined in §§5-6. Same-device direct `org-iso-mdoc` over the W3C Digital Credentials API is the base version 1.0 presentation flow, but §8 owns the byte-level construction, validation checklist, SessionTranscript details, HPKE details, and mdoc field mechanics. The cross-device kiosk flow is a later wrapper around same-device presentation; §9 owns its signed kiosk payload, pointer, relay, encryption, and completion behavior.

### 7.1 Origin trust

Origin trust establishes which web origin, application caller, or equivalent presentation invoker caused a Wallet invocation. Origin trust is not the same as Requester identity, reader authentication, mdoc issuer evidence, clinical-source provenance, Holder consent, or downstream authorization.

A Verifier SHALL NOT place self-asserted requester identity metadata in the SMART request body to compensate for missing origin trust. A Wallet/Responder SHALL NOT treat `purpose`, item `title`, item `summary`, selector values, unknown SMART request members, or extension members as authenticated requester identity merely because they are displayed to the Holder.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

When the same-device presentation flow is invoked through a Browser / User Agent that exposes an authenticated web origin to the Wallet/Responder, the Wallet/Responder SHALL treat that origin as presentation-layer context supplied by the Browser / User Agent, not as a clinical field from the SMART request.

A Wallet/Responder that receives a browser-asserted origin SHALL use the origin only according to Wallet policy and applicable deployment profile rules. The Wallet/Responder MAY display the origin to the Holder, use it for local allowlist or risk decisions, bind it into same-device cryptographic validation where §8 defines such binding, and include it in privacy-preserving diagnostics according to local policy.

A Wallet/Responder SHALL NOT infer that a browser-asserted origin proves legal organization identity, authority to request a particular item, clinical-source provenance, patient matching, or permission for downstream retention unless those properties are established by another trust layer or by deployment policy.

A Verifier SHALL expect the origin used for same-device trust processing to come from the Browser / User Agent or platform mediation layer when that layer provides it. The Verifier SHALL NOT ask the Wallet/Responder to derive authenticated origin from `purpose`, display text, callback URLs, logo URLs, request ids, or any other member of the SMART request body.

#### 7.1.2 Wallet-side privileged-caller / browser-trust policy where applicable, deployment-defined

Some platforms expose a privileged-caller mechanism, browser trust policy, application-origin allowlist, or equivalent API that lets a Wallet/Responder decide whether a calling browser or application is authorized to assert an origin. Where such a mechanism is applicable, the Wallet/Responder SHALL apply a deployment-defined or Wallet-defined policy before relying on the asserted origin for Holder display, cryptographic binding, or allowlist decisions.

A deployment profile or trust-framework operator MAY define the privileged callers, browsers, packages, app identifiers, certificates, origins, or policy artifacts that a Wallet/Responder is expected to trust. Such policy artifacts are out-of-band trust-framework inputs. They SHALL NOT be embedded as self-asserted requester identity metadata in the SMART request body.

A Wallet/Responder that cannot establish that the calling application is authorized to assert the claimed origin SHALL process the invocation under §7.1.3.

#### 7.1.3 Behavior when origin cannot be authenticated

When a Wallet/Responder cannot authenticate an origin or equivalent caller context, it SHALL NOT display or use any SMART request field as a substitute for authenticated requester identity. The Wallet/Responder SHALL choose one of the following behaviors according to Wallet policy, deployment profile, and the selected presentation flow:

1. reject or fail the presentation before Holder disclosure;
2. continue with reduced assurance while clearly treating the requester identity as unauthenticated; or
3. require another accepted trust layer, such as signed reader authentication or a kiosk wrapper identity defined by §9, before disclosure.

A deployment profile MAY prohibit reduced-assurance operation for particular workflows, origins, item kinds, accepted media types, or clinical content categories. If a Wallet/Responder continues with reduced assurance, it SHALL NOT report the resulting transport success as proof of authenticated Requester identity.

A Verifier or Requester SHALL be prepared for a Wallet/Responder to decline or fail a request when origin context is absent, unauthenticated, unavailable through the platform, or unacceptable under Wallet policy.

### 7.2 Reader / Verifier trust

Reader or Verifier trust establishes properties of the party constructing the presentation request. In the same-device mdoc flow, this can be expressed by optional `readerAuth` using a COSE signature over `ReaderAuthentication`. Reader authentication is independent of web origin trust, mdoc issuer/device evidence, and clinical-source provenance.

A Verifier that claims reader-authenticated presentation SHALL construct reader authentication only as defined by the applicable presentation flow. Section 8 owns the exact `readerAuth` placement, `ReaderAuthentication` byte construction, SessionTranscript binding, and validation checklist for the base same-device flow.

#### 7.2.1 Optional `readerAuth` `COSE_Sign1` over `ReaderAuthentication`

A Verifier MAY include per-request reader authentication in the same-device presentation flow using `COSE_Sign1` over `ReaderAuthentication`. When a Verifier includes `readerAuth`, it SHALL bind the signature to the exact presentation request and session context required by §8. In particular, reader authentication SHALL NOT sign a free-standing SMART request JSON string in a way that omits the presentation request, session binding, or request-carrier bytes required by the selected mdoc flow.

A Wallet/Responder that validates `readerAuth` SHALL verify the COSE signature, the signed `ReaderAuthentication` context, the relevant request bytes, and the certificate or key material according to §8 and deployment trust policy. A Wallet/Responder SHALL treat a syntactically valid signature from an untrusted or policy-unacceptable reader certificate as unauthenticated or unacceptable reader authentication.

A Wallet/Responder SHALL NOT treat `readerAuth` as proof that returned clinical content came from a particular clinical source, that the Holder is the patient, that the Requester may write to an EHR, or that the request is clinically appropriate. Those determinations require other trust layers or deployment policy.

#### 7.2.2 Reader certificate chain and trust-anchor policy

A deployment profile or trust-framework operator MAY define reader certificate profiles, accepted key algorithms, certificate extensions, subject naming conventions, policy OIDs, revocation mechanisms, issuance rules, root trust anchors, intermediate trust anchors, or registries for reader authentication.

A Wallet/Responder that relies on reader certificates for a policy decision SHALL validate the reader certificate chain to an accepted trust anchor or registry entry and SHALL apply the deployment profile's validity, revocation, key-usage, extended-key-usage, policy, and name-binding rules where those rules are defined.

A Verifier that presents a reader certificate chain SHALL expect Wallets/Responders to reject, ignore, or downgrade reader authentication when the chain is missing, expired, revoked, not yet valid, uses an unacceptable algorithm, lacks required policy information, fails name or origin binding required by policy, or chains only to an untrusted anchor.

If a deployment uses ephemeral, self-signed, demo, or locally generated reader certificates, a Wallet/Responder SHALL treat those certificates as trusted only when local policy or an explicit deployment profile accepts them for the relevant environment. Demo reader certificates SHALL NOT be described as production organizational identity unless an out-of-band trust framework actually confers that status.

#### 7.2.3 Wallet handling of unsigned vs signed reader requests

Reader authentication is optional in the core trust framework unless a deployment profile makes it mandatory for a class of requests. A Wallet/Responder MAY process an unsigned reader request when origin trust, Holder review, local policy, and deployment requirements permit. A Wallet/Responder MAY also reject unsigned reader requests or require reader authentication for particular origins, workflows, request items, media types, or risk categories.

A Wallet/Responder that receives an unsigned reader request SHALL NOT represent the reader as authenticated through `readerAuth`. It MAY still display browser-origin context, SMART request display text, or deployment-provided context, provided those signals are labeled or treated according to their actual assurance.

A Wallet/Responder that receives a signed reader request but cannot validate the signature, signed context, certificate chain, or policy constraints SHALL treat the reader authentication as failed. It SHALL either reject the request or continue only under an explicit reduced-assurance policy that does not rely on the failed reader authentication.

A Verifier SHALL NOT assume that transport invocation alone causes a Wallet/Responder to accept unsigned reader requests. A deployment profile MAY require reader authentication even when a browser-origin signal is available.

### 7.3 Issuer / device-attestation trust (mdoc binding)

Issuer and device-attestation trust establish properties of the mdoc presentation container and device-controlled key material. They do not by themselves establish Requester identity, web origin, reader trust, clinical-source provenance for unsigned raw FHIR JSON, patient matching, EHR write-back authorization, or downstream clinical acceptance.

For the base same-device flow, §8 defines the exact mdoc validation steps, including issuer-signed namespaces, MSO digest validation, device-key proof of possession, SessionTranscript binding, and extraction of the SMART response. This §7.3 defines the trust-framework interpretation of those checks.

#### 7.3.1 MSO issuer trust anchors, IACA-style or registry-based

A deployment profile or trust-framework operator SHALL define how Verifiers evaluate issuer trust for SMART Health Check-in mdoc documents when issuer trust is required. A deployment profile or trust-framework operator MAY use IACA-style certificate anchors, a health-sector issuer registry, a private deployment registry, pinned issuer keys, or another explicit trust-anchor mechanism.

A Verifier that relies on mdoc issuer evidence SHALL validate the Mobile Security Object or equivalent issuer-signed structure according to the selected mdoc profile and SHALL accept issuer evidence only when it chains to, or otherwise matches, a trust anchor or registry entry accepted by deployment policy.

A Verifier SHALL reject or quarantine issuer-signed mdoc evidence when issuer signature validation, digest validation, validity-period checks, docType checks, namespace checks, or trust-anchor policy checks fail. A Verifier MAY still process the extracted SMART response under a separate reduced-assurance or self-attested model only when deployment policy explicitly permits that behavior and the Verifier does not claim issuer-backed assurance.

#### 7.3.2 Device key proof of possession

A Verifier that relies on mdoc device evidence SHALL verify device key proof of possession, including binding to the exact SessionTranscript defined by the selected presentation flow. For the same-device flow, §8 owns the exact `DeviceAuthentication`, SessionTranscript, HPKE, and response-opening mechanics.

A successful device-key proof establishes that the presentation response was produced by a holder of the device private key corresponding to the issuer-bound mdoc device key for that presentation context. It does not prove that the returned clinical Artifact content is clinically correct, current, complete, source-signed, or acceptable for downstream ingestion.

A Verifier SHALL NOT use device-key proof as a substitute for SMART response validation under §6.6, SMART Health Card verification under §7.4.1, raw FHIR provenance evaluation under §7.4.2, or deployment patient-matching policy.

#### 7.3.3 Self-attested wallet model

A deployment profile MAY permit a self-attested wallet model in which the mdoc container, issuer evidence, or reader evidence is demo, local, self-issued, or otherwise not anchored in a production trust framework. This model can be useful for development, testing, bilateral pilots, or deployments that explicitly accept Wallet self-attestation.

A deployment profile that permits a self-attested wallet model SHALL define what assurance claims are and are not made. At minimum, it SHALL state that self-attested mdoc or wallet evidence is not equivalent to issuer-backed production credential assurance unless an accepted out-of-band trust framework says so.

A Verifier using a self-attested wallet model SHALL still apply syntactic, transport, session-binding, decryption, and SMART response validation rules required by §§6 and 8. Self-attestation does not relax `requestId`, `fulfills[]`, `requestStatus[]`, media-type, FHIR-version, or response-shape validation.

A Wallet/Responder that returns self-attested mdoc evidence SHALL NOT claim that the evidence is issuer-backed or production-attested unless the applicable issuer and trust-anchor policy supports that claim.

### 7.4 Source trust on clinical content

Clinical-source trust concerns the provenance, integrity, and issuer or source assurance of the clinical content inside response Artifacts. It is distinct from transport success, origin trust, reader authentication, mdoc issuer/device evidence, and Holder consent.

A Verifier SHALL evaluate clinical-source trust at the Artifact payload level and under the Artifact's media type, extension profile, signature format, provenance format, and deployment policy. A Verifier SHALL NOT treat all Artifact media types as carrying the same source assurance.

#### 7.4.1 SMART Health Card chain of custody

An `application/smart-health-card` Artifact carries one or more SMART Health Card Verifiable Credential JWS strings in `value.verifiableCredential[]`. Each JWS carries its own signed clinical payload and source evidence according to SMART Health Cards.

A Verifier that relies on clinical-source evidence from a SMART Health Card Artifact SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on its signed clinical content. This includes signature validation, issuer trust evaluation, payload inspection, and evaluation of the signed FHIR content against the original request selectors and local policy.

A Wallet/Responder SHALL NOT add an outer Artifact-level `fhirVersion` to an `application/smart-health-card` Artifact. A Verifier SHALL reject an `application/smart-health-card` Artifact that carries an outer Artifact-level `fhirVersion` under §6.3.1 and §6.6.5. FHIR version and source evidence for SMART Health Cards are inside the signed JWS payloads, not in the SMART Health Check-in Artifact wrapper.

A valid SMART Health Card signature proves only the claims and issuer relationship established by that SMART Health Card and the Verifier's trust policy. It does not by itself prove that the Artifact satisfies every request selector, that the Holder is the patient, that content is complete or current, or that a downstream workflow must accept it.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

An `application/fhir+json` Artifact is patient-mediated raw FHIR JSON unless the Artifact payload or an applicable extension carries separate provenance, signature, or source evidence. Successful mdoc presentation, HPKE transport protection, reader authentication, origin binding, and Holder consent do not by themselves turn unsigned raw FHIR JSON into issuer-signed clinical-source evidence.

A Wallet/Responder returning `application/fhir+json` SHALL include the `fhirVersion` and FHIR JSON payload required by §6.3.2. If the Wallet/Responder includes FHIR `Provenance`, digital signatures, document signatures, Bundle signatures, or other source evidence, it SHALL preserve that evidence in the payload or in an extension Artifact format whose processing rules are defined by its media type or deployment profile.

A Verifier SHALL treat unsigned raw FHIR JSON as patient-mediated content unless separate provenance or signature evidence is present and accepted under local policy. A Verifier MAY reject, quarantine, route for manual review, or accept such content according to deployment policy, but it SHALL NOT describe it as issuer-signed or clinically source-authenticated solely because it arrived through a successful SMART Health Check-in presentation.

A Verifier SHOULD inspect returned raw FHIR payload content, including `resourceType`, `meta.profile`, `Bundle.entry[].resource`, `QuestionnaireResponse.questionnaire`, `Provenance`, and signatures where present, before deciding whether the Artifact satisfies a request item or a downstream ingestion policy.

### 7.5 Identifier scoping and uniqueness

SMART Health Check-in uses several identifiers with different scopes. A Verifier, Wallet/Responder, Requester, and kiosk-related role SHALL NOT conflate their meanings.

A Requester SHALL treat SMART request `id` as an opaque request identifier scoped as defined by §5.2.3. A Wallet/Responder SHALL copy that value into `SmartHealthCheckinResponse.requestId` exactly. A Verifier SHALL validate the exact `requestId` match under §6.6.1. The request `id` and response `requestId` are not patient identifiers, requester identifiers, origin identifiers, reader identifiers, mdoc session identifiers, issuer identifiers, freshness proofs, or clinical facts.

A Requester SHALL keep request item `id` values unique within one SMART request. A Wallet/Responder and Verifier SHALL treat item ids as scoped to that SMART request and SHALL use exact string equality for `fulfills[]` and `requestStatus[].item` processing. Item ids are not global clinical identifiers or patient identifiers.

A Wallet/Responder SHALL keep Artifact `id` values unique within one SMART response. A Verifier SHALL treat Artifact ids as scoped to that SMART response. Artifact ids do not prove clinical provenance, source document identity, or global uniqueness unless that meaning is separately established by the Artifact payload, signature, provenance, or deployment policy.

Presentation-layer identifiers, including web origins, reader certificate subjects, issuer certificate subjects, mdoc docTypes, namespaces, element identifiers, SessionTranscript components, kiosk pointer ids, submission ids, and transport nonces, have the scopes defined by their respective sections or deployment profiles. A Verifier, Wallet/Responder, Requester, and kiosk-related role SHALL NOT substitute one identifier scope for another when validating a SMART request, SMART response, presentation session, kiosk session, or clinical Artifact.

A deployment profile SHOULD define collision, replay, retention, and logging expectations for identifiers it introduces or constrains, especially when identifiers may appear in browser history, QR codes, logs, telemetry, certificate subject fields, or downstream EHR records.

### 7.6 Out-of-band trust establishment / deployment policy

This specification defines protocol hooks and validation responsibilities; it does not define a universal production trust federation. Deployment policy and out-of-band trust establishment remain necessary for real deployments.

A deployment profile or trust-framework operator MAY define, among other things:

- accepted browsers, privileged callers, origin assertion mechanisms, and origin allowlists;
- required or optional reader authentication and reader certificate trust anchors;
- reader certificate profiles, revocation rules, and organization-name binding rules;
- accepted mdoc issuer anchors, IACA-style chains, registries, key pins, or self-attested wallet rules;
- accepted SMART Health Card issuer keys, issuer directories, revocation or status mechanisms, and clinical-source trust rules;
- rules for raw FHIR provenance, FHIR signatures, document signatures, `Provenance`, profile evidence, and local clinical ingestion;
- policy for reduced-assurance operation when one trust layer is absent or fails;
- retention, minimization, audit, telemetry, replay, and Holder-display requirements; and
- kiosk-specific trust policy when §9 wrapper artifacts are used.

A deployment profile SHALL state which trust layers are mandatory for each conformance or deployment context it defines. If a deployment profile permits operation when a layer is absent, it SHALL state the resulting assurance level and any restrictions on use of returned content.

A Verifier SHALL apply the trust policy required by its deployment before using a SMART response for downstream workflow. A Requester SHALL NOT treat protocol conformance alone as proof that content is clinically correct, complete, current, patient-matched, authorized for EHR write-back, or accepted for a regulated workflow.

A Wallet/Responder SHALL apply its local policy and any applicable deployment profile before disclosing content. A Wallet/Responder MAY refuse a request when required trust evidence is missing, unacceptable, expired, revoked, inconsistent, or not understandable.

A Kiosk creator, Submission service, Phone presenter, and Completion display SHALL preserve the trust boundaries defined here and SHALL NOT redefine SMART request or SMART response clinical semantics. The Submission service and pointer transport are not trusted with plaintext clinical content merely because they relay encrypted kiosk state. Section 9 owns kiosk-specific wrapper signatures, encryption, pointer binding, expiration, replay controls, and completion processing.

## Organizer notes

### Strengths

- Separates all required trust layers: browser origin, privileged caller policy, optional reader authentication, reader certificate policy, mdoc issuer/device evidence, SMART Health Card source evidence, raw FHIR provenance, identifier scoping, and out-of-band deployment policy.
- Preserves the accepted T1/T2 boundaries: SMART request and SMART response are transport-neutral clinical JSON objects; the clinical request body does not carry self-asserted requester identity; purpose/title/summary are display context only; kiosk remains a later wrapper.
- Keeps §7 at trust-framework level and repeatedly defers byte-level same-device mechanics to §8 and kiosk wrapper mechanics to §9.
- States reduced-assurance behavior without requiring one production federation or invalidating self-attested/demo models.
- Carries forward the response-model distinction between SMART Health Cards as signed clinical-source evidence and raw FHIR JSON as patient-mediated unless separately provenanced or signed.

### Caveats

- The draft names deployment profiles and trust-framework operators as policy-setting actors, but §4 later needs to decide whether these are formal conformance targets or descriptive policy roles.
- The exact reader certificate profile, x5chain handling, revocation mechanisms, and origin-to-reader binding are intentionally left to §8 and deployment policy.
- The exact mdoc issuer validation checklist, MSO validity semantics, and device-key proof bytes are intentionally left to §8.
- Some requirements use reduced-assurance paths; conformance closure should ensure products cannot market reduced-assurance success as production trust.

### Open issues

- Decide whether version 1.0 core conformance requires any production trust anchor by default, or whether all production trust anchors remain deployment-profile requirements.
- Decide how Appendix A will represent deployment-profile obligations without implying that every Wallet or Verifier must implement every possible trust framework.
- Decide whether §13 should include registry templates for reader trust frameworks, mdoc issuer registries, SMART Health Card issuer directories, or only references to external trust programs.
- Decide whether §11 should mandate specific UI language when origin, readerAuth, mdoc issuer trust, or clinical-source provenance is missing or reduced.

### Downstream dependencies

- §8 must define exact same-device `org-iso-mdoc` validation for origin binding, SessionTranscript construction, `readerAuth`, HPKE, issuerAuth/MSO checks, device-key proof, response extraction, and failure handling.
- §9 must preserve kiosk wrapper/re-entry semantics and define kiosk creator signatures, encrypted request state, pointer binding, phone validation, encrypted submission, and Completion display trust processing without changing clinical semantics.
- §11 and §12 must revisit origin spoofing, reader impersonation, issuer-trust pivots, raw FHIR overclaiming, status-message privacy, retention, telemetry, and reduced-assurance UX.
- Appendix A must turn each normative requirement in this section into one-row-per-rule checklist entries with clear targets.
