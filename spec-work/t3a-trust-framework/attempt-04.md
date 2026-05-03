## 7. Trust framework

This section defines the trust layers that apply to SMART Health Check-in 1.0. It is normative for how implementations separate and process trust signals, but it does not choose a single production trust list, accreditation program, certificate authority, browser allow-list, issuer registry, patient-matching policy, or clinical-ingestion policy.

The SMART request and SMART response are transport-neutral clinical JSON objects. Presentation flows can carry origin context, reader or Verifier authentication, mdoc issuer evidence, device-key proof, encryption, freshness, relay state, and deployment policy decisions. Those signals do not change the clinical meaning of request items, selectors, accepted media types, Artifacts, fulfillment links, or per-item status.

Trust layers in this profile are distinct:

- **Origin trust** identifies the web origin or caller context from which a same-device presentation was invoked.
- **Reader / Verifier trust** identifies or authenticates the presentation requester when `readerAuth` or an equivalent deployment mechanism is used.
- **Issuer / device-attestation trust** validates the mdoc container, issuer-signed MSO, and device-key proof of possession.
- **Clinical-source trust** evaluates the provenance or signatures of returned clinical content, such as SMART Health Card JWS payloads or separately provenanced raw FHIR content.

A Wallet/Responder, Verifier, Requester, deployment profile, or trust-framework operator MUST NOT treat these layers as interchangeable. In particular, successful transport presentation does not by itself prove clinical correctness, patient matching, EHR write-back authorization, downstream clinical acceptance, or clinical-source provenance for unsigned content.

### 7.1 Origin trust

Origin trust concerns the caller context that invoked the presentation flow. In the base same-device flow, origin trust is supplied by the Browser / User Agent or platform where that information is available, not by fields inside the SMART request body.

A Requester SHALL NOT place self-asserted requester identity metadata in the SMART request body to substitute for origin trust. A Wallet/Responder SHALL NOT treat `purpose`, `items[].title`, `items[].summary`, selector values, unknown members, or extension members as authenticated origin information.

A Wallet/Responder MAY use authenticated origin information as an input to Holder display, request risk decisions, allow-list decisions, readerAuth validation policy, logging policy, or local denial policy. A Wallet/Responder MUST keep any such origin decision separate from clinical-content validation under §§5-6.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

When the W3C Digital Credentials API, Credential Manager, Browser / User Agent, or equivalent platform exposes an authenticated web origin for the presentation invocation, a Wallet/Responder that uses origin trust SHALL obtain that origin from the platform-provided caller metadata for the selected flow. The Wallet/Responder SHALL NOT derive the origin from the SMART request JSON.

When §8 binds the platform-provided origin into the same-device SessionTranscript, Wallets/Responders and Verifiers SHALL use the §8 byte-level construction for that binding. This section does not redefine the SessionTranscript bytes, HPKE context, or mdoc request construction.

A Wallet/Responder SHOULD make authenticated origin information available to the Holder when it is useful for request review and safe under Wallet UX policy. If origin information is displayed, the Wallet/Responder SHOULD distinguish it from unauthenticated display context such as `purpose`, item `title`, and item `summary`.

#### 7.1.2 Wallet-side privileged-caller / browser-trust policy where applicable, deployment-defined

Some platforms expose caller information through privileged-browser or privileged-caller mechanisms, such as application package identity, signing-certificate fingerprint, browser allow-lists, or platform-specific caller attestations. Those mechanisms are deployment-defined trust inputs.

A Wallet/Responder that relies on privileged-caller or browser-trust policy SHALL define the policy it applies, including which callers are trusted to assert web origins or invoke the presentation flow, which package or signing-certificate identifiers are accepted where applicable, and how policy updates or revocation are handled. A deployment profile MAY make such a policy mandatory for a class of Wallets/Responders.

A Wallet/Responder SHALL NOT silently upgrade an unauthenticated caller string, display label, package name, or request-body field into authenticated origin information unless the selected platform and deployment policy establish that trust. A trust-framework operator SHOULD document the caller-authentication mechanism and operational assumptions for deployments that depend on it.

#### 7.1.3 Behavior when origin cannot be authenticated

When authenticated origin information is unavailable, unverifiable, ambiguous, or fails Wallet policy, a Wallet/Responder SHALL treat the request as lacking authenticated origin trust. The Wallet/Responder SHALL NOT infer origin from the SMART request body, kiosk pointer metadata, relay URLs, `purpose`, item display text, or Artifact content.

A Wallet/Responder MAY decline to process the request, require additional Holder confirmation, display that the requester origin is unknown, restrict returned content, require signed reader authentication, or apply other deployment-defined risk controls. If the Wallet/Responder proceeds, it MUST NOT present unauthenticated origin or display context as verified identity.

A Verifier or Requester that requires origin-authenticated presentations for a deployment workflow SHALL reject or quarantine responses for which the required origin evidence is absent or fails the deployment policy, even if the SMART response is otherwise valid under §6.

### 7.2 Reader / Verifier trust

Reader / Verifier trust concerns authentication of the presentation requester, independently of web origin and independently of clinical-source provenance. In the same-device `org-iso-mdoc` flow, version 1.0 supports optional per-`DocRequest` `readerAuth` using COSE_Sign1 over `ReaderAuthentication`; §8 owns the exact request bytes, COSE structure, and validation mechanics.

A Requester or Verifier SHALL NOT place reader identity, organization identity, legal entity identifiers, certificates, trust-framework claims, or signatures inside the SMART request body as a substitute for reader authentication. Such information belongs in the presentation transport, deployment policy, or out-of-band trust framework.

#### 7.2.1 Optional `readerAuth` COSE_Sign1 over `ReaderAuthentication`

A Verifier MAY include `readerAuth` in a same-device mdoc request when it has a reader signing key and wants the Wallet/Responder to authenticate the presentation requester. When `readerAuth` is used in the base version 1.0 same-device flow, the Verifier SHALL construct it as specified by §8: a COSE_Sign1 signature over the `ReaderAuthentication` structure that binds the SessionTranscript and the exact `ItemsRequest` bytes.

A Wallet/Responder that receives `readerAuth` and supports reader authentication SHALL verify the COSE signature, the protected algorithm, the detached payload binding, and the included or referenced certificate material according to §8 and its trust-anchor policy. The Wallet/Responder SHALL treat a cryptographically invalid `readerAuth` as failed reader authentication.

Successful `readerAuth` validation proves possession of the corresponding reader private key and binds the signed request bytes to the presentation session. It does not by itself prove clinical authority, patient identity, EHR write-back authorization, or that every requested item is clinically appropriate.

#### 7.2.2 Reader certificate chain and trust-anchor policy

A Verifier that includes reader certificate material in `readerAuth` SHALL include certificate or chain information in the location and encoding specified by §8. A Wallet/Responder that validates reader certificates SHALL evaluate the chain, key usage or profile constraints, expiration, revocation status where available, and trust anchor according to its deployment policy or applicable deployment profile.

A deployment profile or trust-framework operator MAY define accepted reader trust anchors, certificate profiles, naming constraints, organizational vetting requirements, revocation feeds, or registry lookups. This base specification does not require a single global reader certificate authority.

A Wallet/Responder MUST NOT treat the mere presence of a certificate chain as reader trust. The chain has trust effect only when it validates to a trust anchor accepted by the Wallet/Responder or deployment profile and satisfies the applicable policy constraints.

A Verifier or Requester SHOULD be prepared for Wallets/Responders to reject, downgrade, or display warnings for reader-authenticated requests whose certificate chain is unknown to the Wallet's policy.

#### 7.2.3 Wallet handling of unsigned vs signed reader requests

A Wallet/Responder MAY process a request without `readerAuth` when its local policy, authenticated origin information, Holder decision, and deployment profile permit unsigned reader requests. A Wallet/Responder SHALL NOT describe an unsigned request as reader-authenticated.

A Wallet/Responder MAY require `readerAuth` for particular origins, caller classes, Artifact types, selectors, deployment profiles, or risk levels. If reader authentication is required and `readerAuth` is absent or invalid, the Wallet/Responder SHALL decline the presentation or otherwise avoid returning clinical content; if the Wallet/Responder produces a SMART response after the request was otherwise understood, the Wallet/Responder SHALL represent item outcomes using the §6 status mechanism where applicable.

A Verifier that receives a SMART response from a flow in which it chose not to sign the request MUST NOT infer that the Wallet accepted any reader identity claim beyond what other trust layers actually established.

### 7.3 Issuer / device-attestation trust (mdoc binding)

Issuer / device-attestation trust concerns the mdoc presentation container used by the base same-device flow. It is distinct from origin trust, reader trust, and clinical-source provenance. Section 8 defines the `org-iso-mdoc` mechanics, including MSO processing, issuerAuth validation, deviceSignature validation, digest binding, SessionTranscript binding, HPKE response protection, and extraction of the SMART response.

A Verifier SHALL apply the issuer and device validation checks required by §8 before treating a returned mdoc presentation as a valid same-device presentation. A valid mdoc presentation does not make the SMART response clinically complete, clinically correct, matched to the intended patient, authorized for downstream write-back, or sourced from a particular clinical issuer unless separate clinical-source evidence supports those conclusions.

#### 7.3.1 MSO issuer trust anchors, IACA-style or registry-based

The mdoc MSO issuer signature establishes an issuer-signed container only when the Verifier validates the issuerAuth signature, digest bindings, MSO contents, and issuer certificate chain under an accepted issuer trust policy.

A Verifier SHALL NOT treat an issuerAuth signature as trusted merely because it is syntactically present or cryptographically verifies against an included leaf certificate. The Verifier SHALL determine whether the issuer chain terminates in an accepted trust anchor, such as an IACA-style authority, deployment registry, local test anchor, or other trust-framework-defined anchor.

A deployment profile or trust-framework operator MAY define production issuer trust anchors, registry lookup procedures, certificate profiles, revocation handling, issuer accreditation criteria, or test-only anchors. A Verifier, Requester, Wallet/Responder, deployment profile, or trust-framework operator MUST NOT present test anchors or self-signed demo issuers as production issuer accreditation unless accepted by the applicable deployment policy.

#### 7.3.2 Device key proof of possession

Device key proof of possession demonstrates that the presenting Wallet/Responder controls the device private key corresponding to the public key bound in the MSO. In the same-device flow, §8 defines the DeviceAuthentication structure, SessionTranscript binding, namespace binding, deviceSignature, and validation steps.

A Verifier SHALL validate the deviceSignature against the device key information bound by the MSO before accepting device-key proof for the presentation. The Verifier SHALL ensure that the proof is bound to the same presentation session and requested namespace as specified by §8.

Device key proof of possession is a transport/container proof. It does not prove that the Holder is the intended patient, that the Wallet has performed legal identity proofing, that the clinical content is correct, or that unsigned raw FHIR JSON came from an EHR.

#### 7.3.3 Self-attested wallet model

A deployment profile MAY use a self-attested wallet model in which the mdoc container and device proof are used for session binding, encryption, and Wallet response integrity, but no external production issuer trust is required for the clinical content being returned. This model can be appropriate for patient-mediated sharing where the receiving workflow treats the Wallet as the source of a patient-submitted response.

A Verifier or Requester that accepts a self-attested wallet model SHALL label or process the resulting assurance accordingly under local policy. The Verifier or Requester SHALL NOT represent self-attested mdoc issuer evidence as accreditation by an external issuer trust framework.

A Wallet/Responder using self-attested or test issuer material SHOULD avoid UI or metadata that implies production issuer accreditation. A deployment profile MAY prohibit self-attested wallet presentations or restrict them to specified use cases.

### 7.4 Source trust on clinical content

Clinical-source trust concerns whether returned clinical content carries evidence about where it came from and whether that evidence is acceptable to the Requester or receiving workflow. Clinical-source trust is evaluated at the Artifact payload level and through deployment policy. It is not automatically created by web origin, reader authentication, mdoc issuer signatures, or device-key proof.

A Verifier SHALL evaluate source trust according to the Artifact media type and applicable trust policy before passing returned content to the Requester as source-authenticated clinical data. A Requester that consumes returned content SHALL apply its deployment policy before relying on that content as source-authenticated clinical data. A valid SMART response can still contain content that is patient-mediated, incomplete, stale, unsuitable for local ingestion, or insufficient under local clinical policy.

#### 7.4.1 SMART Health Card chain of custody

An `application/smart-health-card` Artifact carries one or more SMART Health Card Verifiable Credential JWS strings in `value.verifiableCredential[]`. Each JWS carries its own signed clinical payload and source evidence according to SMART Health Cards.

A Verifier that relies on a SMART Health Card Artifact for clinical-source trust SHALL verify each JWS, inspect the signed payload, determine the FHIR version from inside the credential payload, evaluate issuer trust according to SMART Health Cards and local policy, and then evaluate selector responsiveness against the original SMART request. A Requester that relies on a SMART Health Card Artifact after Verifier processing SHALL apply any additional deployment policy required for its workflow.

A Wallet/Responder SHALL NOT add an outer Artifact-level `fhirVersion` or wrapper-level profile summary to a SMART Health Card Artifact to substitute for inspecting signed payload content. A Verifier SHALL NOT treat the SMART Health Check-in Artifact wrapper as the clinical issuer signature; the signature and chain of custody are inside each SMART Health Card JWS.

A valid SMART Health Card signature proves only the claims made by that credential under the accepted SMART Health Card trust policy. It does not by itself prove that the credential satisfies every requested selector, that it is current enough for the workflow, that it matches the intended patient, or that downstream ingestion is authorized.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

An `application/fhir+json` Artifact is raw FHIR JSON returned through the patient-mediated SMART Health Check-in response. Unless the Artifact payload carries separate provenance, signature, attestation, or other source evidence accepted by the applicable deployment policy, the Verifier and Requester SHALL treat the raw FHIR JSON as patient-mediated content rather than as independently source-authenticated EHR content.

A Wallet/Responder MAY return raw FHIR JSON from local credentials, cached resources, connected services, issuer-provided data, manual Holder input, or other Holder data sources, subject to §6 and Holder decision. The Wallet/Responder SHALL declare the Artifact `fhirVersion` as required by §6.3.2, but `fhirVersion` is not provenance evidence.

A Verifier or Requester MAY accept patient-mediated raw FHIR JSON for check-in, queue it for staff review, reconcile it with existing records, or reject it for ingestion according to deployment policy. The Verifier or Requester SHALL NOT treat successful mdoc presentation, authenticated origin, or readerAuth as proof that unsigned raw FHIR JSON originated from a particular clinical system.

### 7.5 Identifier scoping and uniqueness

Identifiers in the clinical content model are scoped protocol correlation values unless another layer establishes additional meaning.

A Requester SHALL scope `SmartHealthCheckinRequest.id` as defined in §5.2.3. The request `id` is unique among SMART requests created by that Requester for the same check-in session; it is not a global request identifier, patient identifier, requester identifier, freshness proof, or clinical fact.

A Wallet/Responder SHALL copy the request `id` exactly into `SmartHealthCheckinResponse.requestId` as required by §6.1.3. A Verifier SHALL use exact string equality to bind the SMART response to the original SMART request and SHALL NOT use `requestId` as a substitute for transport freshness, origin trust, reader authentication, patient matching, or clinical provenance.

A Requester SHALL keep request item `id` values unique within one SMART request as required by §5.3.1. A Wallet/Responder SHALL keep Artifact `id` values unique within one SMART response as required by §6.2.1. A Wallet/Responder, Verifier, or Requester SHALL NOT treat item ids or Artifact ids as global identifiers, patient identifiers, requester identifiers, clinical document identifiers, or source-provenance identifiers unless that meaning is separately established by the payload or deployment policy.

Kiosk pointer request identifiers, relay row identifiers, completion identifiers, mdoc nonces, certificate serial numbers, and transport session identifiers are separate presentation or wrapper identifiers. A Wallet/Responder, Verifier, Requester, Kiosk creator, Phone presenter, Completion display, deployment profile, or trust-framework operator MUST NOT use those presentation or wrapper identifiers to replace the SMART request `id`, item ids, Artifact ids, `fulfills[]` links, or `requestStatus[]` accounting required by §§5-6.

### 7.6 Out-of-band trust establishment / deployment policy

SMART Health Check-in 1.0 intentionally leaves several trust decisions to deployment profiles, trust-framework operators, or local policy. Out-of-band trust establishment can include browser allow-lists, privileged-caller policy, reader certificate anchors, issuer trust anchors, SMART Health Card issuer lists, profile-family registries, organization vetting, revocation sources, patient-matching rules, clinical-ingestion policy, retention policy, and staff-review workflows.

A deployment profile that adds trust requirements SHALL identify the conformance targets to which those requirements apply, the evidence that satisfies each requirement, validation and failure behavior, revocation or update mechanisms where applicable, and how the policy composes with the base §5 request rules, §6 response rules, §8 same-device flow, and §9 kiosk wrapper.

A trust-framework operator SHOULD document which trust layers are required for each use case and which are optional. For example, one deployment might require authenticated origin and readerAuth but accept patient-mediated raw FHIR JSON for staff review; another might require SMART Health Card issuer trust for specific items; another might accept self-attested wallet presentations only for low-risk administrative updates.

A Requester or Verifier SHALL NOT imply that base protocol conformance alone guarantees downstream clinical acceptance, EHR write-back authorization, legal sufficiency, payment adjudication, eligibility determination, or patient matching. Those are deployment and workflow decisions layered on top of the protocol.

## Organizer notes

### Strengths

- Keeps the four trust layers separate and explicitly prevents substitutions among origin, readerAuth, mdoc issuer/device evidence, and clinical-source provenance.
- Preserves the T1/T2 invariants: SMART request and SMART response remain transport-neutral; request body identity metadata is prohibited; purpose/title/summary are display context only; kiosk remains a wrapper and is not redefined here.
- Gives normative targets for Wallet/Responder, Verifier, Requester, deployment profile, and trust-framework operator without specifying §8 byte mechanics or §9 kiosk details.
- Aligns source-trust text with the accepted Artifact model: SMART Health Cards carry signed source evidence inside JWS payloads and raw FHIR JSON remains patient-mediated unless separately provenanced.

### Caveats

- §7.2 and §7.3 intentionally defer exact COSE, certificate-chain encoding, MSO, DeviceAuthentication, HPKE, and SessionTranscript mechanics to §8. Canonical §8 must ensure every referenced validation step is concrete.
- The draft uses policy terms such as allow-list, revocation, trust anchor, registry, and accreditation at a framework level. Later conformance and registry sections should avoid accidentally turning examples into global mandates.
- Failure behavior for invalid readerAuth may differ depending on whether the request is rejected before Holder review or represented through §6 status after a SMART request has already been understood; §8 should tighten flow-specific behavior.

### Open issues

- Production reader certificate anchors, issuer anchors, and SMART Health Card issuer trust lists remain deployment-policy work, not base-version global registries.
- The self-attested wallet model needs careful treatment in §11 and §12 so demos and patient-mediated sharing are not mistaken for production issuer accreditation.
- If future platforms expose stronger or weaker origin/caller metadata, §8 and implementation notes may need profile-specific language without weakening the base separation between origin and request-body display text.

### Downstream dependencies

- §8 must define exact `readerAuth`, `ReaderAuthentication`, SessionTranscript, certificate header, MSO, issuerAuth, deviceSignature, and validation checklist mechanics referenced here.
- §9 must preserve kiosk wrapper trust boundaries and avoid using pointer or relay metadata as requester identity or clinical provenance.
- §11 should threat-check origin spoofing, reader impersonation, issuer-trust pivots, self-attested deployments, replay, and plaintext leakage using the distinctions in this section.
- §12 should address Holder display, minimization, linkability, retention, and telemetry for origin, reader identity, trust failures, and patient-mediated content.
- Appendix A should extract separate checklist rows for each normative trust requirement and keep deployment-policy MAY/SHOULD guidance distinguishable from base protocol SHALL requirements.
