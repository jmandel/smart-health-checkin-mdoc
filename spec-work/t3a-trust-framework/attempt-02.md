## 7. Trust framework

This section defines the trust framework for SMART Health Check-in 1.0. It is normative for the roles that process trust evidence, but it deliberately separates protocol requirements from deployment policy. The clinical content model in §§5-6 remains transport-neutral: a SMART request and SMART response have the same clinical meaning whether carried by the base same-device presentation flow, embedded directly as `smartRequest` in a kiosk request, or carried by a future binding.

Trust in this specification is layered. A deployment profile MAY combine web-origin evidence, reader or Verifier authentication, mdoc issuer and device evidence, and clinical-source provenance, but it SHALL NOT treat one layer as proof of another unless the profile explicitly defines that equivalence and its risk model. In particular, successful transport presentation does not by itself prove clinical correctness, patient matching, authority for EHR write-back, or downstream clinical acceptance.

The version 1.0 base presentation flow is same-device direct `org-iso-mdoc` over the W3C Digital Credentials API. Section 8 owns the byte-level `DeviceRequest`, `SessionTranscript`, HPKE, mdoc, and validation mechanics. This section defines the trust questions those mechanics support and the policy seams that deployments need to close.

### 7.1 Origin trust

Origin trust answers: from which web origin did the same-device Verifier invocation reach the Wallet, when the platform can authenticate that fact?

A Verifier SHALL NOT place requester identity, organization identity, web origin, logo URL, callback URL, certificate data, or equivalent trust assertions in the SMART request body. The SMART request body remains governed by §5.2.7. `purpose`, item `title`, and item `summary` are Holder-facing display context only; a Wallet/Responder SHALL NOT treat them as authenticated requester identity, authenticated origin, consent, or authorization.

A Wallet/Responder that receives origin evidence from the Browser / User Agent or platform SHALL process that evidence as presentation-transport trust context, not as a clinical selector, Artifact, or SMART request field. A Verifier or Requester that relies on origin for routing, risk scoring, or display trust SHALL define its acceptable origins by deployment policy.

#### 7.1.1 Browser-asserted web origin when DC API exposes it

When the W3C Digital Credentials API or platform exposes an authenticated caller origin to the Wallet/Responder, the Wallet/Responder SHALL use the platform-provided origin value for origin trust decisions. The Wallet/Responder SHALL NOT derive the Verifier origin from the SMART request body, from `purpose`, from item display strings, from a kiosk pointer, or from an unauthenticated URL embedded in clinical content.

When the same-device flow binds an origin into the presentation session, §8 defines the exact construction and validation of the relevant `SessionTranscript` bytes. A Wallet/Responder that validates a presentation request using such a `SessionTranscript` SHALL ensure that the origin used for trust decisions is the same origin used by the binding construction for that session. A Verifier SHALL NOT claim successful origin binding unless the selected presentation flow actually provided and bound authenticated origin context.

Origin strings are identifiers for a web security boundary. A Wallet/Responder MAY display an authenticated origin to the Holder or use it in Wallet policy, but origin display is not a substitute for reader authentication, organizational trust, clinical-source provenance, or Holder consent.

#### 7.1.2 Wallet-side privileged-caller / browser-trust policy where applicable, deployment-defined

Some platforms expose the Digital Credentials API through a browser, platform component, or privileged caller whose authority to assert a web origin depends on local allowlists, application identity, operating-system policy, browser policy, or enterprise configuration. This specification does not define those allowlists.

A Wallet/Responder that depends on privileged-caller or browser-trust policy to accept an asserted origin SHALL apply a deployment-defined policy before treating the origin as authenticated. That policy SHOULD identify which browsers, user agents, package identifiers, signing certificates, enterprise configurations, or other platform evidence are trusted to assert origins for this protocol.

A trust-framework operator or deployment profile MAY define the privileged-caller policy for a jurisdiction, ecosystem, institution, or testing program. Such a policy SHALL be documented outside the SMART request body and SHALL NOT require Requesters to add self-asserted identity metadata to the clinical request.

#### 7.1.3 Behavior when origin cannot be authenticated

If a Wallet/Responder cannot authenticate the caller origin, the Wallet/Responder SHALL NOT present the origin as verified and SHALL NOT apply policy that requires authenticated origin as though it had succeeded. The Wallet/Responder MAY continue, warn the Holder, suppress origin display, require other trust evidence, restrict disclosed content, or decline the request according to Wallet policy and deployment profile.

A deployment profile MAY require Wallets/Responders to reject same-device requests without authenticated origin evidence. A deployment profile MAY also permit origin-absent operation for constrained environments, provided the profile states what other evidence or Holder warnings are required. In either case, the absence of authenticated origin does not change SMART request or SMART response clinical semantics.

### 7.2 Reader / Verifier trust

Reader or Verifier trust answers: what entity, application, or organization is requesting the mdoc presentation, and what evidence supports that claim? This layer is distinct from web-origin trust. A web origin can identify where a page came from; reader authentication can identify or authenticate a reader key, certificate, application, or organization according to a trust-anchor policy.

A Verifier that presents reader or Verifier authentication evidence SHALL bind that evidence to the presentation request defined by the selected flow. A Wallet/Responder SHALL evaluate reader or Verifier authentication evidence according to the flow rules in §8 and the deployment's trust-anchor policy. A Wallet/Responder SHALL NOT infer reader or organizational trust from the SMART request body.

#### 7.2.1 Optional `readerAuth` `COSE_Sign1` over `ReaderAuthentication`

In the direct `org-iso-mdoc` same-device flow, reader authentication MAY be supplied as a per-`DocRequest` `readerAuth` `COSE_Sign1` over the ISO `ReaderAuthentication` structure. Section 8 owns the exact bytes, detached-payload handling, `ItemsRequest` tag-24 treatment, `SessionTranscript` binding, and signature-verification procedure.

A Verifier that includes `readerAuth` SHALL sign the `ReaderAuthentication` structure for the same `ItemsRequest` and presentation session that carries the SMART request. A Wallet/Responder that processes `readerAuth` SHALL verify the COSE signature, confirm that the signature covers the expected request and session binding under §8, and evaluate the included certificate chain or key evidence under §7.2.2 before treating the reader as authenticated.

A Wallet/Responder SHALL NOT treat the mere presence of `readerAuth` bytes as successful reader authentication. Failed signature verification, mismatched session binding, malformed certificate evidence, unsupported algorithms, or an untrusted chain SHALL cause reader authentication to fail for policy purposes. The Wallet/Responder MAY still process the request as an unsigned reader request if §7.2.3 and deployment policy permit that fallback.

#### 7.2.2 Reader certificate chain and trust-anchor policy

A Verifier that uses certificate-based reader authentication SHALL provide the certificate or certificate chain required by the selected flow and trust policy. The certificate subject, issuer, SANs, policy OIDs, EKUs, validity periods, revocation status, and reader-key binding are interpreted by deployment policy unless this specification or a later deployment profile defines stricter rules.

A Wallet/Responder that relies on reader authentication SHALL validate the reader signature against the reader public key and SHALL evaluate the certificate chain or key evidence against a configured trust-anchor policy. A Wallet/Responder SHALL NOT treat a self-signed demo certificate, an arbitrary leaf certificate, or an otherwise untrusted chain as production reader trust unless the deployment profile explicitly authorizes that trust anchor for the environment.

A trust-framework operator or deployment profile SHOULD define:

- acceptable reader trust anchors and certificate profiles;
- certificate path validation and revocation expectations;
- whether test, demo, self-signed, or ephemeral reader credentials are permitted;
- how reader identity is displayed to the Holder, if displayed;
- whether authenticated web origin, reader authentication, or both are required; and
- how failures, missing evidence, and policy uncertainty affect Wallet behavior.

#### 7.2.3 Wallet handling of unsigned vs signed reader requests

A same-device presentation request can be unsigned at the reader layer even when it is carried through an authenticated origin or a platform-mediated flow. A Wallet/Responder SHALL distinguish at least these cases for policy purposes:

1. no reader authentication evidence was supplied;
2. reader authentication evidence was supplied and validated under the configured policy;
3. reader authentication evidence was supplied but failed cryptographic validation; and
4. reader authentication evidence was cryptographically valid but not trusted by the configured policy.

A Wallet/Responder MAY accept an unsigned reader request when local policy permits, especially for deployments that rely primarily on authenticated web origin and Holder review. A Wallet/Responder MAY apply different disclosure limits, Holder warnings, or workflow restrictions to unsigned reader requests. A deployment profile MAY require signed reader requests for specified media types, clinical categories, workflows, or Verifier populations.

If a Wallet/Responder proceeds with an unsigned or untrusted-reader request, it SHALL NOT represent the reader or organization as authenticated. If it rejects or declines processing because reader authentication is absent or insufficient, it SHALL report or surface the outcome according to the selected flow without changing the SMART request body or fabricating clinical status for items that were never processed.

### 7.3 Issuer / device-attestation trust (mdoc binding)

Issuer and device-attestation trust answers: what mdoc issuer signed the document or Mobile Security Object, and did the presenting device or Wallet prove possession of the device key bound into that mdoc evidence? This layer concerns the presentation container and mdoc binding. It is distinct from reader trust and from the provenance of clinical content inside returned Artifacts.

A Wallet/Responder that returns a SMART response through direct `org-iso-mdoc` SHALL construct the mdoc document, issuer-signed data, device authentication, and response encryption as defined by §8. A Verifier SHALL validate the mdoc issuer evidence, value digests, device-key binding, and session binding required by §8 before relying on mdoc issuer or device evidence.

#### 7.3.1 MSO issuer trust anchors, IACA-style or registry-based

The mdoc Mobile Security Object (MSO), `issuerAuth`, and associated certificate evidence can support issuer trust only when validated to a trust anchor accepted by the deployment. A Verifier SHALL NOT treat a syntactically valid `issuerAuth` signature as trusted issuer evidence unless the issuer certificate chain validates under an applicable trust-anchor policy.

A deployment profile or trust-framework operator MAY use IACA-style trust anchors, a registry-based issuer trust list, institution-specific anchors, ecosystem test anchors, or another documented mechanism. That policy SHOULD define certificate path validation, allowed algorithms, document-type constraints, namespace constraints, validity and revocation handling, test-vs-production separation, and operational procedures for adding and removing anchors.

Issuer trust anchors for the mdoc presentation container do not by themselves establish that every clinical fact in a returned Artifact came from the mdoc issuer. A Verifier or Requester SHALL evaluate clinical-source provenance under §7.4 and the applicable Artifact media type.

#### 7.3.2 Device key proof of possession

Device key proof of possession answers whether the responding Wallet or device controlled the private key corresponding to `MSO.deviceKeyInfo.deviceKey` for this presentation session. In the direct mdoc flow, §8 defines the `DeviceAuthentication` structure, `SessionTranscript` binding, returned namespaces, and `deviceSignature` validation.

A Verifier SHALL NOT rely on device-bound mdoc evidence unless it has verified the device signature or device MAC required by the selected flow, confirmed that the proof is bound to the current `SessionTranscript`, and confirmed that the returned mdoc namespace and element values match the issuer-signed digest evidence required by §8. Replay of a device proof from another session SHALL NOT be accepted.

Device proof of possession proves control of the bound device key for the presentation container. It does not by itself prove Holder identity, patient matching, clinical correctness, the authority of the Requester, or authorization for downstream write-back.

#### 7.3.3 Self-attested wallet model

A deployment MAY choose a self-attested wallet model in which the Wallet/Responder constructs or signs mdoc-like presentation evidence without a production issuer trust chain, or with a test, local, self-signed, or deployment-specific issuer. Such a model can be useful for pilots, local check-in, or patient-mediated sharing where Holder consent and transport binding are the primary trust signals.

A Verifier or Requester that accepts self-attested wallet evidence SHALL treat the issuer/device layer as self-attested or deployment-local, not as production third-party issuer assurance. A Wallet/Responder or Verifier SHALL NOT label self-attested evidence as issuer-trusted unless the applicable deployment profile explicitly defines the accepted trust anchor and assurance level.

In a self-attested model, clinical-source trust still depends on Artifact evidence. SMART Health Cards remain signed clinical-source artifacts under §7.4.1. Raw FHIR JSON remains patient-mediated unless separately signed or provenanced under §7.4.2.

### 7.4 Source trust on clinical content

Clinical-source trust answers: what evidence supports the origin, integrity, custody, and clinical provenance of returned Artifact content? This layer is separate from web origin, reader authentication, and mdoc issuer/device evidence.

A Wallet/Responder MAY construct a SMART response from local credentials, SMART Health Cards, cached FHIR resources, connected services, issuer-provided documents, or other Holder data sources. The SMART response shape and mdoc presentation can prove protocol binding and container integrity, but they do not automatically prove that every clinical datum originated from a particular EHR, payer, public health authority, or issuer.

A Verifier or Requester SHALL evaluate each Artifact according to its `mediaType`, payload evidence, and deployment policy before relying on clinical-source provenance. A Verifier SHALL preserve the distinction between protocol validation under §6.6 and downstream clinical acceptance.

#### 7.4.1 SMART Health Card chain of custody

An `application/smart-health-card` Artifact carries one or more SMART Health Card Verifiable Credential JWS strings in `value.verifiableCredential[]`. A Verifier or receiver that consumes a SMART Health Card Artifact SHALL verify each JWS according to SMART Health Cards and local trust policy before relying on the signed clinical-source evidence.

The SMART Health Card JWS payloads carry their own issuer, signature, FHIR content, and FHIR-version semantics. A Wallet/Responder SHALL NOT add an outer Artifact-level `fhirVersion` to an `application/smart-health-card` Artifact, and a Verifier SHALL reject such an outer `fhirVersion` under §6.3.1 and §6.6.5.

Successful verification of a SMART Health Card establishes only the claims supported by that SMART Health Card, its issuer, its payload, its chain of custody, and the Verifier's local trust policy. It does not by itself prove that unrelated raw FHIR JSON Artifacts in the same SMART response share the same source assurance.

#### 7.4.2 Raw FHIR JSON as patient-mediated unless separately signed/provenanced

An `application/fhir+json` Artifact is raw FHIR JSON carried by the patient-mediated response. A Wallet/Responder SHALL include the Artifact-level `fhirVersion` required by §6.3.2. That `fhirVersion` supports FHIR interpretation; it is not a signature, provenance record, issuer credential, or proof of clinical correctness.

A Verifier or Requester SHALL treat raw FHIR JSON as patient-mediated content unless the Artifact payload, extension profile, transport binding, or deployment policy provides separate provenance, signature, or source evidence. Examples of separate evidence can include a FHIR `Provenance` resource, a FHIR digital signature, a signed Bundle, an extension Artifact media type with defined integrity rules, or a trusted online retrieval mechanism defined outside this core profile.

A Wallet/Responder SHALL NOT imply that raw FHIR JSON has SMART Health Card-equivalent issuer assurance merely because it was returned inside an mdoc presentation, encrypted same-device response, or kiosk completion flow. A Verifier SHALL NOT infer clinical-source trust for unsigned raw FHIR JSON from successful mdoc device proof, authenticated origin, or reader authentication alone.

### 7.5 Identifier scoping and uniqueness

Identifiers in SMART Health Check-in are scoped to the layer that defines them. Wallets/Responders, Verifiers, Requesters, and kiosk-related roles SHALL compare identifiers using exact string or byte equality as specified by the owning section and SHALL NOT reuse an identifier from one layer as proof in another layer without an explicit binding rule.

For the clinical content model:

- `SmartHealthCheckinRequest.id` is a Requester-generated request identifier scoped by §5.2.3. It is not a patient identifier, requester identifier, origin, freshness proof, or clinical fact.
- `SmartHealthCheckinRequest.items[].id` values are scoped to one SMART request and are unique within that request under the Requester and Wallet/Responder requirements in §5.3.1.
- `SmartHealthCheckinResponse.requestId` SHALL exactly equal the original SMART request `id` under §6.1.3 and §6.6.1.
- `artifacts[].id` values are scoped to one SMART response and are unique within that response under the Wallet/Responder and Verifier requirements in §6.2.1.
- `artifacts[].fulfills[]` and `requestStatus[].item` values SHALL refer to request item ids from the original SMART request under §6.2.3 and §6.4.1.

For the presentation and trust layers, nonces, request ids, kiosk pointer ids, certificate serial numbers, key ids, document ids, origin strings, `SessionTranscript` bytes, mdoc docTypes, namespaces, and element identifiers have the meanings defined by their own sections or deployment policies. A Verifier SHALL NOT treat a matching clinical `requestId` as proof of presentation freshness; §8 and §9 define separate session, replay, and wrapper bindings. A Wallet/Responder SHALL NOT treat a kiosk `requestId`, certificate subject, origin string, or key id as a substitute for clinical item ids or fulfillment links.

A deployment profile SHOULD define collision resistance, retention, logging, and privacy expectations for identifiers it introduces. The deployment profile SHOULD require identifiers to be no more identifying or persistent than needed for the protocol layer and workflow that use them.

### 7.6 Out-of-band trust establishment / deployment policy

SMART Health Check-in 1.0 intentionally does not hard-code a single national, institutional, or vendor trust governance model. Deployments need out-of-band policy to decide which origins, reader credentials, issuer anchors, Wallet assurance levels, Artifact sources, media types, and downstream processing rules are acceptable.

A deployment profile or trust-framework operator that claims conformance for a trust framework SHOULD document at least:

- accepted web origins and privileged-caller/browser policies;
- whether reader authentication is required, optional, or prohibited;
- reader certificate profiles, trust anchors, revocation, and display rules;
- mdoc issuer trust anchors, IACA-style or registry-based policies, and test-vs-production separation;
- whether self-attested Wallet evidence is acceptable and how it is labeled;
- accepted Artifact media types and clinical-source provenance requirements;
- SMART Health Card issuer trust and revocation policy;
- handling for raw FHIR JSON without separate provenance;
- identifier retention, replay, and correlation controls;
- Holder display and warning requirements for missing or weak trust evidence; and
- downstream patient matching, EHR ingestion, write-back authorization, and clinical acceptance policy.

A Verifier or Requester SHALL apply its deployment trust policy before downstream reliance on returned content. A Wallet/Responder SHALL apply its Wallet and deployment policy before disclosure. Kiosk-related roles SHALL treat kiosk trust artifacts as wrapper and relay controls only: the kiosk flow embeds the SMART request directly and re-enters the same-device presentation flow on the phone; it does not redefine clinical semantics or make the Submission service trusted with plaintext clinical content.

Deployment policy can make an otherwise syntactically valid presentation unacceptable for local use. Conversely, local acceptance of a presentation does not change the core protocol facts: web origin, reader authentication, mdoc issuer/device evidence, and clinical-source provenance remain distinct trust layers.

## Organizer notes

### Strengths

- Preserves the T1/T2 separation between transport-neutral clinical objects and presentation trust layers.
- Provides concrete normative targets for Wallet/Responder, Verifier, Requester, deployment profile, and trust-framework operator without moving §8 byte mechanics or §9 kiosk mechanics into this cutpoint.
- Makes unsigned raw FHIR JSON provenance limits explicit while preserving SMART Health Card chain-of-custody treatment.
- Gives downstream sections a clean policy seam for origin allowlists, reader certificates, mdoc issuer anchors, self-attested Wallets, and clinical-source evidence.

### Caveats

- The current active implementation uses demo/self-signed reader material and test-style mdoc issuer evidence; production certificate profiles and trust anchors are intentionally left to deployment policy.
- The draft uses §8 as the owner of exact `readerAuth`, `SessionTranscript`, HPKE, MSO, digest, and device-signature validation details, so §8 must later ensure its checklist maps cleanly to these trust outcomes.
- The text permits unsigned-reader operation by policy, which is appropriate for version 1.0 flexibility but may need tightening in certification profiles.

### Open issues

- Decide whether the final core conformance profile requires authenticated origin for all same-device presentations or leaves origin-absent behavior entirely to deployment profiles.
- Define production reader certificate profiles, trust-anchor distribution, revocation expectations, and Holder display requirements if a SMART Health Check-in trust framework is published.
- Define production mdoc issuer/IACA-style anchors or registry mechanics, including separation of demo, pilot, and production ecosystems.
- Decide how much raw FHIR provenance guidance belongs in §11/§12 versus in Artifact media-type extension registrations.

### Downstream dependencies

- §8 must specify exact direct `org-iso-mdoc` validation and expose validation results that correspond to origin, readerAuth, issuer/MSO, digest, device-key, and SessionTranscript trust decisions.
- §9 must keep kiosk as a wrapper that embeds `smartRequest` directly, re-enters §8 on the phone, and treats the Submission service as untrusted for plaintext clinical content.
- §11 and §12 should reuse the layered trust model for origin spoofing, reader impersonation, issuer trust pivots, metadata leakage, Holder warnings, retention, and telemetry.
- Appendix A should turn each normative SHALL/SHOULD in this section into one-row-per-rule conformance inventory entries with clear targets.
