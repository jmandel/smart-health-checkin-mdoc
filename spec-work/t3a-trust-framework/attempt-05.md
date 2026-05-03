## 7. Trust framework

This section defines the trust layers that apply to SMART Health Check-in 1.0. The SMART request and SMART response are transport-neutral clinical JSON objects; trust information is supplied by the selected presentation flow, returned Artifact payloads, deployment policy, or out-of-band trust-framework decisions. A Verifier, Wallet/Responder, Requester, deployment profile, or trust-framework operator MUST NOT treat one trust layer as a substitute for another unless this specification or an explicit deployment profile defines that substitution.

The trust layers in this section are distinct:

- **Origin trust** identifies the web origin or privileged caller context from which the Wallet was invoked.
- **Reader / Verifier trust** authenticates the Verifier or reader application when a signed reader request is present and accepted by Wallet policy.
- **Issuer / device-attestation trust** evaluates mdoc issuer evidence, MSO trust, and device-key proof for the presentation container.
- **Clinical-source trust** evaluates provenance or signatures on the returned clinical content itself, such as SMART Health Card JWS chains.

A successful same-device presentation proves only the properties established by the presentation flow and the validated artifacts. It does not by itself prove clinical correctness, patient matching, EHR write-back authorization, legal authority to act, or downstream clinical acceptance.

### 7.1 Origin trust

Origin trust concerns the caller context supplied to the Wallet by the Browser / User Agent or platform. Origin trust is not carried in the SMART request body. A Requester SHALL NOT place self-asserted requester identity, origin, URL, application id, package name, certificate, logo, or organization metadata in the SMART request body, as defined in §5.2.7. A Wallet/Responder SHALL NOT treat `purpose`, `title`, `summary`, selector values, unknown request members, or extension members as authenticated requester identity.

Origin trust can help a Wallet/Responder display where a request came from, apply local policy, and bind the mdoc SessionTranscript in the same-device flow. Origin trust does not authenticate the clinical source of returned content, does not authenticate a reader certificate, and does not determine whether the Requester is authorized for downstream ingestion.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

When the same-device presentation flow is invoked through the W3C Digital Credentials API and the Browser / User Agent exposes an authenticated web origin to the Wallet, the Wallet/Responder SHALL use that browser-asserted origin, not a value from the SMART request body, as the web-origin input for origin display, origin policy, and same-device SessionTranscript processing defined in §8.

A Wallet/Responder SHALL preserve the distinction between an authenticated browser-asserted origin and unauthenticated display text. If the Wallet displays requester context to the Holder, it SHOULD display the authenticated origin, an origin-derived label from a trusted policy source, or both, rather than relying solely on `purpose`, item `title`, item `summary`, or other clinical request text.

A Verifier SHALL NOT expect a Wallet/Responder to accept a self-asserted origin in the clinical request body. A deployment profile MAY define how a Wallet maps an authenticated origin to an organization, service, or workflow label, but that mapping is deployment policy, not a SMART request-field semantic.

#### 7.1.2 Wallet-side privileged-caller / browser-trust policy where applicable, deployment-defined

Some platforms expose the web origin only when the calling browser or privileged caller satisfies a platform-specific trust policy, such as an allowlist of browser package names and signing-certificate fingerprints. Where such a policy is needed to obtain or trust the browser-asserted origin, the Wallet/Responder or trust-framework operator SHALL define and maintain that policy outside the SMART request body.

A Wallet/Responder SHALL NOT reflect the current caller's package name or signing certificate into a privileged-caller allowlist as a production trust decision. Development builds MAY use reflective allowlists or demo certificates only when they are clearly identified as non-production behavior and do not claim production trust-framework conformance.

A deployment profile MAY require particular browser packages, operating-system mediation behavior, app-link relationships, signing-certificate fingerprints, enterprise management controls, or other privileged-caller evidence. Such requirements are deployment-defined and do not change the transport-neutral clinical semantics of the SMART request or SMART response.

#### 7.1.3 Behavior when origin cannot be authenticated

When a Wallet/Responder cannot authenticate a web origin or privileged-caller context, it SHALL treat the origin as unauthenticated for trust-policy purposes. The Wallet/Responder SHALL NOT infer requester identity from the SMART request body to compensate for missing origin evidence.

A Wallet/Responder MAY reject the request, present a reduced-trust Holder experience, require additional Holder confirmation, omit organization branding, or apply other local policy when origin evidence is absent or unauthenticated. If the selected presentation flow requires an origin value to compute or verify cryptographic session binding, the Wallet/Responder SHALL follow the failure behavior defined by that flow rather than substituting an untrusted clinical request field.

A Verifier that requires origin-based Wallet trust SHOULD invoke the same-device flow from a context that exposes an authenticated origin under the target Wallet and platform policy. A Requester or Verifier SHALL NOT rely on `purpose`, `title`, `summary`, or extension text as a fallback authenticated identity channel.

### 7.2 Reader / Verifier trust

Reader / Verifier trust concerns authentication of the presentation requester, independent of browser-origin trust and independent of clinical-source provenance. In the same-device direct `org-iso-mdoc` flow, reader authentication can be represented by an optional per-`DocRequest` `readerAuth` COSE_Sign1 over ISO-style `ReaderAuthentication`. Section 8 defines the byte-level construction and validation inputs.

A signed reader request can help a Wallet decide whether a Verifier belongs to a trusted organization, workflow, certification program, or deployment. It does not prove that unsigned clinical content returned by the Wallet came from an EHR, and it does not by itself authorize downstream clinical acceptance.

#### 7.2.1 Optional `readerAuth` COSE_Sign1 over `ReaderAuthentication`

A Verifier MAY include per-`DocRequest.readerAuth` as a detached `COSE_Sign1` signature over `ReaderAuthentication` for the same-device `org-iso-mdoc` request. When present, the signed `ReaderAuthentication` SHALL bind the SessionTranscript and the exact `ItemsRequest` bytes as defined in §8. A Verifier SHALL NOT use `DeviceRequest` version 1.1 `readerAuthAll` as a substitute for the version 1.0 per-`DocRequest.readerAuth` unless a later section or deployment profile explicitly defines that behavior.

A Wallet/Responder that receives `readerAuth` and claims support for reader authentication SHALL verify the COSE signature over the correct `ReaderAuthentication` bytes, verify that the protected algorithm and key type are acceptable under the selected profile, and evaluate the associated certificate or public-key material under Wallet or deployment trust policy. A Wallet/Responder SHALL treat a failed `readerAuth` signature as failed reader authentication.

A Wallet/Responder MUST NOT treat mere presence of a `readerAuth` structure, a certificate chain, a common name, or a display string as successful reader authentication without signature verification and trust-policy evaluation.

#### 7.2.2 Reader certificate chain and trust-anchor policy

When `readerAuth` carries an `x5chain` or equivalent certificate material, the Wallet/Responder or deployment profile SHALL define how the chain is validated, including acceptable trust anchors, certificate path processing expectations, key usage or extended key usage requirements where applicable, validity-time handling, revocation handling if required, and mapping from authenticated certificate subject or extension data to Verifier policy.

A trust-framework operator MAY use IACA-style anchors, enterprise anchors, federation metadata, registry-based anchors, pinned reader certificates, or other out-of-band mechanisms for reader trust. This specification does not mandate a single production reader trust anchor set.

A Verifier that presents a reader certificate chain SHALL ensure that the signing key used for `readerAuth` corresponds to the authenticated certificate material and that the chain is suitable for the deployment trust framework it expects Wallets to apply. Demo self-signed or ephemeral reader certificates MAY be useful for testing, but a Wallet/Responder SHALL NOT treat them as production reader trust unless a deployment policy explicitly trusts them.

#### 7.2.3 Wallet handling of unsigned vs signed reader requests

`readerAuth` is optional in the base version 1.0 trust framework. A Wallet/Responder MAY process an unsigned reader request when local policy, origin evidence, Holder review, and deployment requirements permit. A Wallet/Responder MAY require signed reader requests for particular origins, workflows, requested content categories, deployment profiles, or assurance levels.

When `readerAuth` is absent, the Wallet/Responder SHALL treat reader authentication as absent. It MAY still consider browser-asserted origin, privileged-caller evidence, Holder decision, mdoc issuer/device evidence, clinical-source evidence, and local policy. It SHALL NOT report or display the Verifier as reader-authenticated.

When `readerAuth` is present but invalid, untrusted, expired, unsupported, or otherwise unacceptable under policy, the Wallet/Responder SHALL treat reader authentication as failed. The Wallet/Responder MAY reject the presentation request, continue only under a reduced-trust policy, or ask for additional Holder confirmation, subject to deployment requirements and privacy considerations.

### 7.3 Issuer / device-attestation trust (mdoc binding)

Issuer / device-attestation trust concerns the mdoc presentation container used by the same-device flow. It is separate from origin trust, reader authentication, and clinical-source provenance. The mdoc layer can provide evidence that the response element was issuer-signed into an mdoc document, that the MSO digests match disclosed issuer-signed items, and that the presenter possesses the device key bound to the device-signed response.

A Verifier SHALL apply the mdoc issuer, digest, device-signature, encryption, SessionTranscript, and response extraction checks required by §8 before relying on mdoc-layer evidence. A Verifier SHALL then apply the SMART response validation rules in §6.6 before the Requester consumes the clinical response.

#### 7.3.1 MSO issuer trust anchors, IACA-style or registry-based

A Verifier or deployment profile SHALL define the trust-anchor policy used to validate the MSO issuer signature for SMART Health Check-in mdoc documents. The policy MAY use IACA-style issuer anchors, registry-based issuer metadata, pinned issuer certificates, enterprise anchors, or another out-of-band trust source.

A Verifier SHALL NOT treat a syntactically valid MSO, a matching digest, or a self-signed issuer certificate as production issuer trust unless the issuer chain validates to a trust anchor accepted by the applicable deployment policy. A Verifier MAY accept self-signed or locally issued mdoc documents for development, testing, or self-attested Wallet deployments only when that assurance level is explicitly allowed by policy.

MSO issuer trust authenticates the mdoc issuer for the presentation container. It does not by itself prove the clinical provenance, correctness, or completeness of the SMART response Artifacts contained in the mdoc element.

#### 7.3.2 Device key proof of possession

A Verifier SHALL verify device-key proof of possession for the same-device mdoc response as required by §8 before treating the mdoc presentation as bound to the SessionTranscript. The device-authentication verification SHALL use the same SessionTranscript derived for the presentation, including origin and encryption information where the selected flow requires them.

A Verifier SHALL NOT treat a SMART response extracted from an mdoc response as transport-valid if device-key proof fails, if the device authentication is not bound to the expected SessionTranscript, or if the disclosed response element does not match the MSO digest under the selected mdoc validation rules.

Device key proof establishes possession of the device key for the mdoc presentation. It does not establish that the Holder is the patient, that the returned clinical content is clinically accurate, or that the Requester may write the content to an EHR.

#### 7.3.3 Self-attested wallet model

SMART Health Check-in 1.0 allows deployments in which the Wallet creates an mdoc presentation container without an externally accredited clinical issuer. In this self-attested Wallet model, the mdoc layer can still bind the response to the presentation session, protect the response in transit, and support Holder-mediated disclosure, but the issuer assurance is limited to the trust anchors or local policy that the Verifier accepts for that deployment.

A Verifier MAY accept self-attested Wallet presentations only under a deployment policy that explicitly permits that model and defines the resulting assurance level. A Verifier SHALL NOT label a self-attested mdoc presentation as externally issuer-accredited unless the MSO issuer chain validates to an accepted external issuer trust anchor.

A Wallet/Responder using a self-attested model SHALL NOT claim, through the SMART response wrapper, that raw FHIR JSON Artifacts are issuer-signed clinical credentials. If clinical-source provenance is needed, the Wallet/Responder must return an Artifact that carries separate provenance or signature evidence, such as a SMART Health Card, or the Requester must rely on out-of-band policy.

### 7.4 Source trust on clinical content

Clinical-source trust concerns the provenance, signatures, and chain of custody of the returned clinical content inside Artifacts. It is evaluated at the Artifact payload layer and is distinct from transport protection, browser-origin trust, reader authentication, and mdoc issuer/device evidence.

A Verifier or receiver SHALL evaluate clinical-source trust according to the Artifact media type, payload signatures or provenance, request selectors, FHIR evidence, SMART Health Card rules where applicable, and deployment policy. A Verifier or receiver SHALL NOT infer clinical-source provenance from successful transport presentation alone.

#### 7.4.1 SMART Health Card chain of custody

An `application/smart-health-card` Artifact carries one or more SMART Health Card Verifiable Credential JWS strings in `value.verifiableCredential[]`. A Verifier or receiver that consumes a SMART Health Card Artifact SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on the signed clinical content or issuer claims.

For SMART Health Card Artifacts, FHIR content, FHIR version semantics, issuer identity, and signed clinical-source evidence are inside the signed credential payloads. A Wallet/Responder SHALL NOT include an outer Artifact-level `fhirVersion` on an `application/smart-health-card` Artifact, and a Verifier SHALL reject such an outer `fhirVersion` under §6.3.1 and §6.6.5.

A valid SMART Health Card signature establishes only the claims made by that credential under the accepted SMART Health Card trust framework. The Verifier or receiver still applies the original SMART request selectors, item fulfillment rules, patient matching, local clinical policy, and downstream workflow requirements.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

An `application/fhir+json` Artifact is raw FHIR JSON mediated by the Holder and Wallet/Responder. A Wallet/Responder SHALL include `fhirVersion` on each raw FHIR JSON Artifact as defined in §6.3.2. A Verifier SHALL treat raw FHIR JSON as patient-mediated content unless the Artifact payload itself carries separate provenance, a digital signature, a trusted FHIR Provenance resource, or other deployment-accepted source evidence.

A Wallet/Responder SHALL NOT use transport encryption, mdoc issuer signatures, `readerAuth`, origin evidence, `purpose`, item text, Artifact ids, `fulfills[]`, or wrapper fields to claim that unsigned raw FHIR JSON is an issuer-signed clinical credential. A Verifier or receiver MAY accept raw FHIR JSON for a workflow under local policy, but it SHALL NOT equate raw FHIR JSON with SMART Health Card or other signed clinical-source evidence unless separate proof is present and accepted.

A Requester that requires clinical-source provenance SHOULD request media types or deployment profiles that carry suitable provenance or signature evidence, such as SMART Health Cards where appropriate, and SHOULD apply local policy before downstream ingestion.

### 7.5 Identifier scoping and uniqueness

Identifiers in SMART Health Check-in are scoped protocol correlation values unless their defining payload or deployment policy gives them a broader meaning.

A Requester SHALL generate `SmartHealthCheckinRequest.id` values that are unique among SMART requests created by that Requester for the same check-in session, as defined in §5.2.3. A Wallet/Responder SHALL copy that value exactly into `SmartHealthCheckinResponse.requestId`. A Verifier SHALL reject a SMART response whose `requestId` does not exactly equal the original SMART request `id`.

A Requester SHALL ensure request item ids are unique within a single SMART request. A Wallet/Responder SHALL preserve request item ids exactly when constructing `fulfills[]` and `requestStatus[]`. A Verifier SHALL reject unresolved, missing, or duplicate item references as defined in §6.6.

A Wallet/Responder SHALL ensure Artifact ids are unique within a single SMART response. A Requester, Verifier, receiver, Wallet/Responder, or deployment profile SHALL NOT treat request ids, item ids, Artifact ids, SessionTranscript inputs, kiosk identifiers, or relay identifiers as patient identifiers, requester identifiers, clinical provenance identifiers, global document identifiers, or long-term tracking identifiers unless that meaning is separately established by the payload or deployment policy.

Identifier uniqueness at one layer does not imply uniqueness at another layer. Kiosk pointer identifiers, presentation nonces, mdoc digest ids, SMART request ids, request item ids, Artifact ids, and clinical resource ids have different scopes and SHALL NOT be conflated during validation or logging.

### 7.6 Out-of-band trust establishment / deployment policy

SMART Health Check-in 1.0 defines the protocol seams at which trust decisions are made, but it does not mandate a single national, jurisdictional, enterprise, or vendor trust framework. Deployment profiles and trust-framework operators are responsible for selecting and publishing the policies needed for their environment.

A deployment profile or trust-framework operator SHOULD define, as applicable:

- trusted browser or privileged-caller policy for origin exposure;
- accepted web origins and mappings from origins to organizations or workflows;
- reader-authentication requirements, acceptable algorithms, certificate-chain processing, trust anchors, revocation expectations, and Verifier authorization policy;
- mdoc issuer trust anchors, IACA-style or registry-based issuer metadata, self-attested Wallet policy, and device-attestation assurance levels;
- SMART Health Card issuer trust policy and any clinical-source provenance requirements for other Artifact media types;
- requested assurance levels for sensitive workflows or content categories;
- logging, retention, telemetry, and user-interface labeling expectations for trust evidence; and
- behavior when required trust evidence is absent, expired, revoked, malformed, unsupported, or inconsistent.

A deployment profile MAY be stricter than this base specification by requiring authenticated origins, signed reader requests, particular reader or issuer trust anchors, signed clinical-source Artifacts, or rejection of self-attested Wallet presentations. A deployment profile MUST NOT change the core clinical semantics of the SMART request, SMART response, request selectors, Artifact media types, fulfillment links, or per-item statuses.

A Requester or Verifier SHALL apply its deployment trust policy before downstream clinical reliance. Passing transport validation, mdoc validation, schema validation, and §6.6 response validation is necessary for protocol processing, but it is not a guarantee of clinical correctness, patient matching, write-back authorization, legal sufficiency, payment eligibility, or local workflow acceptance.

## Organizer notes

### Strengths

- Separates the four trust layers explicitly: browser origin, reader/Verifier authentication, mdoc issuer/device evidence, and clinical-source provenance.
- Preserves the accepted T1/T2 canonicals: transport-neutral SMART request/response semantics, no requester identity in the clinical request body, purpose/title/summary as display context, kiosk as later wrapper, raw FHIR as patient-mediated, and SMART Health Card FHIR-version/provenance rules.
- Keeps §7 at the trust-framework level and leaves §8 byte construction, §9 kiosk wrapper mechanics, and §§11-12 security/privacy closure to their owning sections.
- Provides clear conformance targets for Wallet/Responder, Verifier, Requester, deployment profile, and trust-framework operator.

### Caveats

- The exact `readerAuth` byte construction, SessionTranscript derivation, mdoc validation checklist, and HPKE handling are intentionally deferred to §8.
- Production trust-anchor governance is not fixed here; deployments must choose origin, reader, mdoc issuer, and clinical-source policies.
- Browser privileged-caller policy is platform-specific. The normative text states protocol effects and production-policy expectations without standardizing Android or any other platform API.

### Open issues

- §8 should confirm whether `readerAuthAll` remains prohibited/reserved for version 1.0 or merely unsupported by the base profile.
- §8 should define the exact verifier validation checklist for MSO signatures, digest matching, device authentication, SessionTranscript binding, and extraction of the stable response element.
- §11 and §12 should revisit UI labeling, telemetry, logging, retention, origin spoofing, reader impersonation, replay, and policy-failure behavior using the trust boundaries defined here.
- §13 or a deployment-profile appendix may need registry templates for reader trust anchors, mdoc issuer trust anchors, profile-family maps, and clinical-source trust metadata.

### Downstream dependencies

- T3.B (§8) must translate these trust seams into byte-level same-device requirements without redefining clinical semantics.
- T4 (§9) must layer kiosk creator identity, pointer validation, encrypted submission, and Completion display trust on top of this framework while preserving phone re-entry into §8.
- T5.A and Appendix A should inventory each SHALL/SHOULD here with its conformance target.
- T5.B/T5.C should expand the security and privacy consequences without weakening the separation between transport proof and clinical-source proof.
