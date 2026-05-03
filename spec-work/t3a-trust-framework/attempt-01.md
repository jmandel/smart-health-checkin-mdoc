## 7. Trust framework

This section defines the trust layers that a SMART Health Check-in deployment evaluates before a Requester relies on a returned SMART response. The layers are intentionally separate:

- web origin or privileged-caller evidence identifies where the presentation request came from;
- reader or Verifier authentication identifies the application, service, or organization that signed a reader request;
- mdoc issuer and device evidence identifies the issuer of the mdoc container and proves possession of the device key bound to that container; and
- clinical-source evidence identifies whether a returned Artifact carries signed or otherwise provenanced clinical content.

A Verifier SHALL NOT treat one layer as a substitute for another. A successful same-device presentation proves only the presentation and binding properties validated for that flow. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, downstream clinical acceptance, or unsigned clinical-source provenance.

The SMART request and SMART response remain the transport-neutral clinical JSON objects defined in §§5-6. Trust metadata belongs in presentation transport, reader authentication, mdoc evidence, Artifact payloads, deployment profiles, or out-of-band policy. A Requester, Wallet/Responder, or Verifier SHALL NOT use the clinical request body as a requester identity credential, and SHALL treat `purpose`, `items[].title`, and `items[].summary` as Holder-facing display context only.

A deployment profile MAY define stricter trust requirements than this section, including mandatory origin allow-lists, mandatory signed reader requests, required issuer trust anchors, clinical-source provenance rules, or a rule that a Wallet/Responder refuses requests that do not meet those requirements. A deployment profile SHALL identify which trust layer each requirement constrains.

### 7.1 Origin trust

Origin trust is the evidence that a presentation request was invoked from a particular web origin or privileged caller. It is presentation-transport evidence. It is not clinical-source evidence, not mdoc issuer evidence, and not proof that a Requester is authorized to receive or use clinical content.

A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body to compensate for missing origin evidence. A Wallet/Responder SHALL NOT treat values in the SMART request body, including `purpose`, item titles, item summaries, selector URLs, unknown members, or extension members, as authenticated origin.

A Wallet/Responder SHOULD make available to the Holder the authenticated origin or privileged-caller label on which the Wallet is relying, when such evidence is available and display is consistent with platform policy and accessibility requirements. If the Wallet displays request purpose or item text near origin information, it SHOULD visually or semantically distinguish authenticated origin from unauthenticated Holder-facing request text.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

In the base same-device flow, the web origin is expected to come from the Browser / User Agent or platform credential mediation, not from the SMART request JSON. When the selected Digital Credentials API path exposes an authenticated origin to the Wallet/Responder or includes it in the presentation binding, the Wallet/Responder SHALL use that platform-provided origin as the origin input for origin-trust decisions.

When a Wallet/Responder relies on a web origin for a trust decision, it SHALL compare the origin using the scheme, host, and port form exposed by the platform or by the §8 binding. It SHALL NOT infer origin equivalence from page text, `purpose`, requester names, URL-looking selector values, favicon or logo fields, redirect targets, or other self-asserted request content.

A Verifier that constructs a same-device request in an environment where §8 requires origin-bound session construction SHALL use the origin value supplied by the user agent or platform for that construction. The exact SessionTranscript and byte-level binding are defined in §8; this section only defines the trust interpretation.

#### 7.1.2 Wallet-side privileged-caller / browser-trust policy where applicable, deployment-defined

Some platforms expose a privileged caller, installed application identity, browser package identity, verified-app-link status, allow-list result, or similar caller evidence instead of, or in addition to, a web origin. A Wallet/Responder MAY use such evidence for routing, display, or policy decisions when the platform provides it through an authenticated channel.

A Wallet/Responder that relies on privileged-caller or browser-trust evidence SHALL treat the allow-list, package-name, app-id, certificate, entitlement, or browser policy as deployment policy unless a later normative section defines a specific interoperable value. The Wallet/Responder SHALL NOT derive privileged-caller trust from the SMART request body.

A deployment profile that requires privileged-caller trust SHALL define the accepted evidence, the party that maintains the allow-list or trust store, matching rules, update and revocation expectations, and the Wallet/Responder behavior when the evidence is absent, stale, or ambiguous.

#### 7.1.3 Behavior when origin cannot be authenticated

When a Wallet/Responder cannot authenticate a web origin or privileged caller for a same-device request, it SHALL treat the request as having unauthenticated origin. The Wallet/Responder SHALL NOT display any requester identity as authenticated solely from request body fields.

For an unauthenticated-origin request, a Wallet/Responder MAY decline the request, MAY ask the Holder whether to continue with reduced assurance, or MAY continue under a deployment profile that permits unauthenticated-origin presentations. If it continues, it SHOULD disclose only according to Holder decision, Wallet policy, and any additional trust signals that are independently validated.

A Verifier or Requester SHALL NOT claim that an unauthenticated-origin presentation provides origin assurance. A deployment profile MAY prohibit unauthenticated-origin requests.

### 7.2 Reader / Verifier trust

Reader or Verifier trust is evidence about the entity that constructed or signed the presentation request. It can be useful when a Wallet needs more than web-origin evidence, or when a deployment requires organization-level authentication. Reader trust is distinct from web origin, mdoc issuer evidence, and clinical-source provenance.

A deployment profile MAY define reader or Verifier trust anchors, certificate policies, metadata registries, or organizational accreditation rules. This specification does not define one universal production reader trust registry for version 1.0.

#### 7.2.1 Optional `readerAuth` `COSE_Sign1` over `ReaderAuthentication`

A Verifier MAY include per-`DocRequest` `readerAuth` in the base `org-iso-mdoc` flow as a detached `COSE_Sign1` signature over the ISO-style `ReaderAuthentication` structure. The signature binds the reader authentication to the session transcript and to the exact `ItemsRequest` bytes. The byte-level construction is defined in §8.

A Verifier that includes `readerAuth` SHALL sign the `ReaderAuthentication` value that corresponds to the same presentation session and the same requested items carried in the request. A Verifier SHALL NOT reuse `readerAuth` across different session transcripts or different `ItemsRequest` bytes.

A Wallet/Responder that receives `readerAuth` and intends to rely on it for trust, display, or policy SHALL verify the `COSE_Sign1` signature, verify that the signed `ReaderAuthentication` is bound to the current session and requested items as defined in §8, and evaluate the signing certificate or key under the applicable reader trust policy. If any of those checks fail, the Wallet/Responder SHALL treat reader authentication as failed or absent.

A Wallet/Responder MAY ignore `readerAuth` when no deployment profile or Wallet policy requires it. Ignoring `readerAuth` means the Wallet/Responder does not obtain reader-authentication assurance from that field.

#### 7.2.2 Reader certificate chain and trust-anchor policy

When reader authentication is based on a certificate or certificate chain, a deployment profile or trust-framework operator SHALL define how the Wallet/Responder evaluates that chain before treating the reader as trusted. The deployment profile or trust-framework operator SHOULD cover trust anchors, certificate path validation, key usage or extended key usage, subject or organization identifiers, certificate freshness, revocation or status checking where available, and mapping from certificate identity to Holder-facing display text.

A Wallet/Responder that cannot build and validate the reader certificate chain according to the applicable policy SHALL NOT treat the reader as authenticated by that chain. It MAY still process the request as unsigned or untrusted if Wallet policy permits.

A Verifier that wants a Wallet/Responder to authenticate the reader by certificate chain SHOULD provide the certificate material required by §8 and by the relevant deployment profile. Demo, ephemeral, self-signed, or locally generated reader certificates SHALL NOT be treated as production reader trust unless a deployment profile explicitly trusts them for the deployment.

#### 7.2.3 Wallet handling of unsigned vs. signed reader requests

Unsigned reader requests are permitted by the core version 1.0 trust framework unless a deployment profile requires reader authentication. A Wallet/Responder MAY process an unsigned request using origin evidence, privileged-caller evidence, Holder decision, local policy, or other independently validated trust signals.

A Wallet/Responder SHALL distinguish an unsigned request from a signed request whose signature or trust-chain validation failed. A Wallet/Responder SHOULD treat a failed signed request at least as cautiously as an unsigned request and MAY reject it.

When a Wallet/Responder presents requester or reader information to the Holder, it SHOULD indicate whether that information is authenticated by reader authentication, authenticated by origin or platform caller evidence, or unauthenticated display context. Wallet UI details remain implementation policy, but the Wallet SHALL NOT misrepresent unsigned or untrusted reader information as authenticated.

A Verifier or Requester SHALL NOT assume that the presence of a signed reader request compels disclosure. Holder decision, Wallet policy, item status, accepted media types, and response validation still apply.

### 7.3 Issuer / device-attestation trust (mdoc binding)

The same-device presentation flow uses an mdoc binding to carry the SMART response. mdoc issuer and device evidence can prove properties of that mdoc container, such as issuer signature over the Mobile Security Object (MSO), value digests for disclosed elements, and possession of the device key bound to the presentation. That evidence is not the same as web origin, reader authentication, or clinical-source provenance.

A Verifier SHALL validate the mdoc container, disclosed element, issuer-signed value digest, and device-key proof required by §8 before treating the presentation as a successful `org-iso-mdoc` transport presentation. A Verifier SHALL then validate the extracted SMART response under §6.6 before Requester consumption.

#### 7.3.1 MSO issuer trust anchors, IACA-style or registry-based

A Verifier that relies on the mdoc issuer as a trust signal SHALL validate the MSO issuer signature and certificate path under a deployment-defined issuer trust policy. That policy MAY be IACA-style, registry-based, federation-based, local allow-list based, or defined by another trust-framework operator.

A deployment profile or trust-framework operator SHALL define the accepted issuer trust anchors or registry sources, certificate path validation rules, revocation or status expectations where available, issuer identity display rules, and any constraints on `docType`, namespace, or element identifiers that are required for the deployment.

If a Verifier cannot validate the MSO issuer under the applicable policy, it SHALL NOT treat the mdoc container as issuer-trusted. It MAY still process the presentation as a self-attested or untrusted wallet container if the deployment permits that model and if §8 structural and device-key checks that apply to that model succeed.

#### 7.3.2 Device key proof of possession

A Verifier SHALL verify proof of possession for the device key bound to the mdoc presentation as required by §8 before accepting device-bound presentation evidence. The Verifier SHALL evaluate the device-key proof against the current presentation session, including the session transcript defined for the selected flow.

Device key proof establishes that the presenter controlled the private key bound to the mdoc container for this presentation. It does not by itself prove that the Holder is the correct patient, that the Wallet is accredited, that the clinical content is issuer-signed, or that downstream use is authorized.

A Wallet/Responder that constructs an mdoc response SHALL produce device-key proof according to §8 for the selected presentation session when the flow requires device-bound mdoc evidence.

#### 7.3.3 Self-attested wallet model

Some deployments, prototypes, or test fixtures may use an mdoc container that is generated by the Wallet/Responder without a production issuer trust anchor. This self-attested wallet model can still provide session binding, encryption, value-digest integrity, and device-key possession when §8 validation succeeds, but it does not provide independent issuer assurance.

A Verifier that accepts self-attested wallet presentations SHALL treat issuer trust as absent unless another policy explicitly establishes it. The Verifier SHALL NOT label a self-attested wallet container as issuer-trusted, clinically provenanced, or equivalent to a production issuer credential merely because the transport presentation succeeded.

A deployment profile that permits self-attested wallet presentations SHOULD state the allowed use cases, user-visible assurance level, downstream handling, and any restrictions on which Artifact media types or clinical workflows may be accepted under that model.

### 7.4 Source trust on clinical content

Clinical-source trust is evidence that the clinical content inside a returned Artifact came from a particular clinical source, issuer, FHIR server, payer, provider, laboratory, pharmacy, or other source and has not been altered outside the scope of that evidence. It is distinct from the presentation transport that carries the Artifact.

A Verifier SHALL evaluate clinical-source evidence at the Artifact payload level or through deployment policy. A Verifier SHALL NOT infer clinical-source provenance for an Artifact solely from web origin, reader authentication, mdoc issuer validation, device-key proof, kiosk wrapper validation, or successful SMART response shape validation.

A Requester MAY apply stricter clinical-source, patient-match, freshness, completeness, terminology, FHIR-profile, or provenance requirements before ingestion or workflow use. Those downstream decisions do not change whether the SMART response is syntactically and procedurally valid under §§5-6.

#### 7.4.1 SMART Health Card chain of custody

For an `application/smart-health-card` Artifact, each value in `value.verifiableCredential[]` is a SMART Health Card JWS. A Verifier that relies on SMART Health Card clinical-source evidence SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on the signed clinical content.

SMART Health Cards carry signed clinical-source evidence inside their JWS payloads. A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` in a SMART Health Check-in Artifact wrapper for this media type, and a Verifier SHALL reject such an outer `fhirVersion` under §6.6. FHIR version and FHIR content semantics are determined from each signed SMART Health Card payload.

A valid SMART Health Card signature proves only the claims covered by that SMART Health Card and accepted by the applicable trust policy. It does not by itself prove that the Artifact satisfies every request selector, that all requested content was returned, that the Holder is currently eligible for a benefit, or that a downstream EHR must accept the content.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

For an `application/fhir+json` Artifact, the raw FHIR JSON payload is patient-mediated content unless the payload itself, an extension profile, or deployment policy supplies separate provenance, signature, source attestation, or retrieval evidence. The surrounding presentation transport proves transport binding and any mdoc properties validated for the flow; it does not by itself prove clinical provenance of unsigned raw FHIR JSON.

A Wallet/Responder returning raw FHIR JSON SHALL include the Artifact-level `fhirVersion` required by §6.3.2. A Verifier SHALL treat that `fhirVersion` as the FHIR release context for the raw FHIR Artifact, not as a clinical-source signature or provenance claim.

A Verifier or Requester that requires source-authenticated FHIR content SHALL require suitable payload-level evidence, such as a recognized signature, Provenance resource, verifiable credential, authenticated retrieval evidence, or deployment-specific attestation. If that evidence is absent or insufficient, the Verifier or Requester SHALL treat the raw FHIR JSON as patient-mediated and apply local policy accordingly.

### 7.5 Identifier scoping and uniqueness

SMART Health Check-in uses several identifiers with different scopes. A Requester, Wallet/Responder, Verifier, Kiosk creator, Phone presenter, or Completion display that handles identifiers from more than one layer SHALL preserve those scopes and SHALL NOT treat identifiers from one layer as identifiers for another layer unless a later section or deployment profile explicitly defines such a binding.

A Requester SHALL generate SMART request `id` values as defined in §5.2.3. The request `id` is scoped to SMART requests created by that Requester for the same check-in session; it is not a patient identifier, requester identifier, presentation-session identifier, or proof of freshness.

A Requester SHALL generate request item `id` values that are unique within the SMART request as defined in §5.3.1. A Wallet/Responder SHALL preserve item ids exactly for Artifact `fulfills[]` and `requestStatus[].item`. A Verifier SHALL compare item ids by exact string equality.

A Wallet/Responder SHALL generate Artifact `id` values that are unique within the SMART response as defined in §6.2.1. A Requester or Verifier SHALL NOT treat Artifact ids as global document identifiers, clinical provenance identifiers, or patient identifiers unless that meaning is separately established by the Artifact payload or deployment policy.

A deployment profile MAY define separate nonces, request ids, pointer ids, submission ids, certificate serial numbers, digest ids, and session identifiers for a presentation binding, including same-device mdoc and kiosk wrapper artifacts. A Requester, Wallet/Responder, Verifier, Kiosk creator, Phone presenter, or Completion display SHALL NOT use those presentation identifiers to replace the SMART request `id`, request item ids, Artifact ids, fulfillment links, or `requestStatus[]` coverage required by §§5-6.

A Kiosk creator that creates a kiosk wrapper SHALL keep the kiosk wrapper request identifier distinct from the embedded SMART request `id` unless §9 explicitly defines a binding between them. A Phone presenter or Completion display SHALL validate any required kiosk pointer-to-payload or submission binding under §9 without changing the clinical meaning of the embedded SMART request or returned SMART response.

### 7.6 Out-of-band trust establishment / deployment policy

SMART Health Check-in 1.0 defines protocol hooks and validation responsibilities for layered trust, but it does not define one universal production trust framework for all deployments. Trust anchors, registries, organizational accreditation, privileged-browser allow-lists, issuer onboarding, clinical-source acceptance criteria, and downstream ingestion rules are deployment policy unless a normative section of this specification defines a specific interoperable requirement.

A deployment profile or trust-framework operator that adds out-of-band trust requirements SHALL document:

1. which roles are constrained, such as Wallet/Responder, Verifier, Requester, Kiosk creator, Phone presenter, Submission service, or Completion display;
2. which trust layer is constrained: origin, privileged caller, reader authentication, mdoc issuer, device proof, kiosk wrapper signature, clinical-source provenance, or downstream receiver policy;
3. the accepted trust anchors, registries, allow-lists, certificate policies, issuer policies, or source-provenance mechanisms;
4. freshness, revocation, expiration, replay, or status-check expectations;
5. required Wallet/Responder behavior when evidence is missing, invalid, expired, revoked, or outside policy;
6. required Verifier or Requester behavior when a presentation succeeds but clinical-source, patient-match, or downstream ingestion policy is not satisfied; and
7. how Holder-facing display distinguishes authenticated identity, unauthenticated request text, and local policy warnings.

A deployment profile SHALL NOT redefine the clinical semantics of SMART request fields, SMART response fields, Artifact media types, selector semantics, fulfillment links, or status codes. It MAY require stricter validation, narrower accepted media types, stronger provenance, additional display, or rejection of otherwise optional trust modes.

A kiosk deployment profile SHALL preserve the trust boundary that the Submission service and pointer transport are not trusted with plaintext clinical content unless §9 and the deployment profile explicitly define a different protected component. Kiosk wrapper trust, creator signatures, pointer binding, encrypted request retrieval, encrypted submission, and desktop completion processing belong to §9 and deployment policy; they do not redefine §§5-6 clinical semantics.

## Organizer notes

### Strengths

- Separates origin, reader authentication, mdoc issuer/device evidence, and clinical-source provenance without making any layer interchangeable.
- Preserves the T1/T2 boundary: the SMART request and SMART response remain transport-neutral clinical JSON objects, and requester identity remains outside the clinical request body.
- Gives normative behavior for missing origin, unsigned reader requests, self-attested wallet containers, SMART Health Cards, raw FHIR JSON, and identifier scoping while leaving byte-level mechanics to §8 and kiosk wrapper details to §9.

### Caveats

- The section intentionally does not choose a production reader certificate hierarchy, IACA/issuer registry, privileged-browser allow-list, or clinical-source trust registry. Those are deployment-profile or future trust-framework choices.
- Wallet UI language is limited to non-misrepresentation and display distinction; detailed UX, accessibility, and localization belong to later privacy/security and implementation guidance.
- ReaderAuth is optional here because current evidence supports both unsigned and signed paths; deployment profiles can make it mandatory.

### Open issues

- §8 must define exact `readerAuth`, `ReaderAuthentication`, SessionTranscript, MSO, device-key, and validation byte steps.
- §9 must define the kiosk creator signature, pointer-to-payload binding, encrypted request, encrypted submission, and Completion display validation without weakening this trust-layer separation.
- §11 and §12 should close threat-specific handling for origin spoofing, reader impersonation, issuer trust pivots, UI redress, raw FHIR overstatement, retention, logs, telemetry, and kiosk relay metadata.
- §13 or future deployment-profile work may define registry templates for reader trust anchors, mdoc issuer trust anchors, profile-family maps, and clinical-source provenance mechanisms.

### Downstream dependencies

- Appendix A should list each SHALL/SHOULD with the named target: Requester, Verifier, Wallet/Responder, Kiosk creator, Phone presenter, Completion display, deployment profile, or trust-framework operator.
- Appendix B remains focused on clinical JSON shape; trust validation here is procedural and cannot be represented in the request/response JSON schemas.
- Worked examples should label trust signals precisely, especially when using demo reader certificates, self-attested wallet mdoc containers, SMART Health Cards, or raw FHIR JSON.
