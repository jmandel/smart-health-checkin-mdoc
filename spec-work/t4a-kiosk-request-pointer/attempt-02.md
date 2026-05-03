## 9. Cross-device kiosk flow

The cross-device kiosk flow wraps the same SMART request and SMART response objects defined in §§5-6 so that a Requester operating on a desktop, kiosk, tablet, or staff workstation can ask a Holder to complete the same-device presentation flow on the Holder's phone. The kiosk flow is not a second clinical protocol. It adds request publication, pointer transport, phone-side re-entry, encrypted submission, and completion processing around the base flow in §8.

This cutpoint defines only request creation and pointer transport: §§9.1-9.6 cover goals, roles, the wrapper cryptographic suite, the signed request payload, the encrypted request envelope, and the QR/pointer URL. Phone resolution and re-entry into §8 are defined in §9.7. Response submission and completion processing are defined in §§9.8-9.11.

### 9.1 Goals

The kiosk wrapper has these goals:

1. **Desktop or kiosk initiation with phone-side presentation.** A Kiosk creator can prepare a check-in request on a device that cannot or should not invoke the Holder's Wallet directly. The Phone presenter resolves a short pointer and later runs the same-device flow from §8 on the phone.
2. **One clinical protocol.** The kiosk wrapper carries a `SmartHealthCheckinRequest` directly in the signed kiosk payload as `smartRequest`. A Kiosk creator SHALL NOT replace the SMART request with a kiosk-specific request profile, demo preset label, request-label wrapper, or alternate clinical request language.
3. **Untrusted relay.** The Submission service / relay is a transport mailbox. It routes encrypted request state by pointer and later routes encrypted submission state. It is not trusted with plaintext clinical request content, plaintext SMART responses, Wallet output, or Holder decisions.
4. **Pointer-only QR.** The QR code or other scanned URL carries only the pointer information needed to reach the phone submit page and select the stored encrypted request. It does not carry plaintext SMART request JSON, FHIR data, Wallet response data, response encryption plaintext, or same-device mdoc response material.
5. **Small, short-lived, and bound state.** The pointer identifies a signed request payload that includes freshness fields and a distinct wrapper `requestId`. The encrypted request envelope repeats enough metadata for routing and expiry checks, and the decrypted signed payload is later bound back to the pointer by exact `requestId` match.
6. **Preserve trust-layer separation.** Kiosk wrapper signatures and encryption authenticate and protect wrapper state. They do not prove clinical-source provenance for raw FHIR JSON, do not turn SMART request display text into authenticated requester identity, and do not replace origin, reader, mdoc issuer/device, or clinical-source trust decisions from §7 and §8.

### 9.2 Roles

The following roles participate in the kiosk request and pointer stage. A deployment MAY combine roles in one product, but processors SHALL preserve the trust boundaries described here.

| Role | Function in §§9.1-9.6 | Trust boundary |
| --- | --- | --- |
| **Requester / Verifier** | The relying party that needs a SMART response for check-in and will later validate it. In a kiosk deployment it typically controls or authorizes the Kiosk creator and Completion display. | Requester identity and reader trust are not self-asserted by the SMART request body. They are established, when needed, by transport evidence, reader authentication, or deployment policy. |
| **Kiosk creator** | Constructs the SMART request under §5, generates a fresh kiosk wrapper `requestId`, creates a per-request desktop response-encryption key pair, signs the `KioskRequestPayload`, encrypts the signed request JWS for the configured request-resolution recipient, stores the encrypted envelope with the relay, and displays a pointer URL. | Trusted to choose the requested clinical content and to hold the creator signing key. Its signature authenticates the kiosk wrapper payload to parties that trust the creator key; it does not by itself prove clinical-source provenance for later returned content. |
| **Submission service / relay** | Provides lookup and delivery for `requests` rows keyed by `requestId`, and later for submission rows or blobs keyed by the same `requestId`. Active implementations use an InstantDB-backed provider abstraction whose request row contains `requestId` and `encryptedRequest`. | Untrusted for plaintext and authorization. It MAY enforce anti-enumeration, allowed-field, expiry, size, or storage-path rules as defense in depth, but protocol security SHALL NOT depend on the relay seeing plaintext or making clinical trust decisions. |
| **Phone presenter** | The phone-side web page or app opened by the pointer URL. It later fetches the encrypted request, decrypts and verifies the signed payload, validates the embedded `smartRequest`, and re-enters §8 on the phone. | Phone resolution and same-device re-entry are specified in §9.7. In this cutpoint, the relevant requirement is that the pointer provide only enough information for the phone to find the opaque encrypted request. |
| **Wallet / Responder** | The Holder-controlled wallet that later receives the embedded SMART request through §8 and constructs the SMART response under §6. | The Wallet/Responder does not process the kiosk wrapper as a clinical request. It processes the `smartRequest` after phone-side validation and same-device invocation. |
| **Holder** | The person using the phone and Wallet to review request items and decide what to share. | Holder consent remains per item under §§5-6 and §8. Kiosk wrapper fields such as `required`, `purpose`, `requestId`, or relay metadata do not override Holder control. |
| **Completion display** | The kiosk desktop or associated requester UI that keeps the desktop private key corresponding to `encryptResponseTo.desktopPublicKeyJwk` and later opens encrypted submissions for display or workflow handoff. | Completion processing is specified in §§9.8-9.9. In this cutpoint, the desktop public key is included in the signed payload so the later phone submission can be encrypted end-to-end to the active kiosk session. |

### 9.3 Cryptographic suite for the wrapper

The version 1.0 kiosk wrapper uses fixed algorithm identifiers for the active profile rather than in-band negotiation.

A Kiosk creator SHALL sign the `KioskRequestPayload` as a compact JWS whose protected header contains:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

The JWS payload is the `KioskRequestPayload` JSON object defined in §9.4. Active implementations serialize the JWS header and payload with deterministic object-member ordering before signing. A conforming producer and consumer for this profile SHALL use the same canonical JSON rule for kiosk-wrapper JWS signing and verification, or another serialization profile explicitly registered for the same `typ`. This canonicalization applies to the kiosk wrapper JWS inputs only; it does not define canonical JSON for the embedded SMART request model outside this wrapper.

The request envelope defined in §9.5 encrypts the compact JWS using the active wrapper content-encryption suite identified in the payload and envelope as:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite:

- the sender generates an ephemeral ECDH P-256 key pair;
- the recipient public key is the P-256 key identified by `encryptRequestTo.keyId` / `recipientKeyId`;
- the ECDH shared secret is input to HKDF with SHA-256;
- the HKDF salt is the UTF-8 wrapper `requestId`;
- the HKDF `info` string for request encryption is `smart-health-checkin-kiosk-request-v1`;
- the derived content-encryption key is AES-GCM with a 256-bit key;
- the AES-GCM IV is 96 bits; and
- AES-GCM additional authenticated data is the UTF-8 wrapper `requestId`.

The encrypted request envelope declares `enc: "A256GCM"` to identify the AES-GCM content-encryption key size used by this profile.

The signed request payload also carries `encryptResponseTo` metadata for the later phone-to-desktop submission leg. That later leg uses the same ECDH P-256 + HKDF-SHA-256 + AES-GCM construction with a different HKDF `info` string, `smart-health-checkin-kiosk-response-v1`, and is specified in §9.8. Implementations MUST NOT reuse the request-encryption `info` value for response submission encryption, and MUST NOT use the response-submission `info` value for request-envelope encryption.

The private key corresponding to the request-encryption recipient key MUST NOT be made available to the untrusted relay. If a static demonstration deploys demo private key material to browser code, it is demonstration behavior only and MUST NOT be treated as a production key-management pattern.

### 9.4 `KioskRequestPayload` JWS body

A `KioskRequestPayload` is the signed JSON object created by the Kiosk creator and embedded as the compact JWS payload. It is wrapper metadata plus the clinical SMART request. It does not replace, relabel, or wrap the SMART request in a separate clinical profile.

The version 1.0 payload has this logical shape:

```json
{
  "v": 1,
  "iss": "smart-health-checkin-demo-creator",
  "aud": "smart-health-checkin-demo-submission-service",
  "requestId": "<opaque-kiosk-wrapper-request-id>",
  "createdAt": 1777680000000,
  "expiresAt": 1777680600000,
  "submitTo": {
    "backend": "instantdb",
    "appId": "<transport-app-id>"
  },
  "smartRequest": {
    "type": "smart-health-checkin-request",
    "version": "1",
    "id": "example-checkin-request",
    "purpose": "Clinic check-in",
    "fhirVersions": ["4.0.1"],
    "items": [
      {
        "id": "patient",
        "title": "Patient demographics",
        "content": {
          "kind": "fhir.resources",
          "profiles": ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"]
        },
        "accept": ["application/fhir+json"]
      }
    ]
  },
  "encryptRequestTo": {
    "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
    "keyId": "<request-recipient-key-id>"
  },
  "encryptResponseTo": {
    "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
    "desktopPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
  },
  "constraints": {
    "maxPlaintextBytes": 26214400
  },
  "minter": {
    "keyId": "<creator-key-id>"
  }
}
```

The example is illustrative. The `iss` and `aud` strings shown above are active demo constants and are expected to be replaced or profiled before production interoperability. Their presence in this draft records active behavior; production trust semantics for issuer and audience identifiers remain an open profile issue.

A Kiosk creator SHALL set `v` to `1` for this version of the kiosk wrapper. A Phone presenter or request-resolution processor SHALL reject a payload with an unsupported `v` value.

A Kiosk creator SHALL generate `requestId` as an opaque, high-entropy, per-kiosk-session identifier. Active implementations generate 32 random bytes and base64url-encode them without padding. The wrapper `requestId` is distinct from `smartRequest.id`: the wrapper `requestId` routes and binds kiosk request state, while `smartRequest.id` is the clinical request identifier that the SMART response later echoes as `SmartHealthCheckinResponse.requestId` under §6.1.3.

A Kiosk creator SHALL include `createdAt` and `expiresAt` as numeric timestamps in milliseconds since the Unix epoch. A Kiosk creator SHOULD use a short lifetime suitable for a visible kiosk QR; active implementations use a ten-minute lifetime. A request-resolution processor SHALL reject a kiosk payload whose `expiresAt` is not in the future according to its clock and policy, and SHALL reject or treat as suspicious a payload whose `createdAt` is unreasonably far in the future.

A Kiosk creator SHALL include `submitTo` to identify the transport provider used for request lookup and later submission routing. In the active InstantDB provider, `submitTo.backend` is `"instantdb"` and `submitTo.appId` is the configured transport application identifier. A request-resolution processor SHALL verify that the signed `submitTo` descriptor matches the provider context it is using. The `submitTo` descriptor is routing metadata; it is not clinical content and is not authenticated requester identity for Holder display.

A Kiosk creator SHALL include `smartRequest` as a `SmartHealthCheckinRequest` object conforming to §5. The `smartRequest` member SHALL contain the clinical request directly. A Kiosk creator SHALL NOT use a `requestProfile`, demo preset id, "all of the above" label, IPS example shortcut, or other alternate wrapper in place of `smartRequest`. When examples need FHIR selectors, they SHOULD use the selector rules from §5, including US Core profile selectors where appropriate. If both `profiles[]` and `profilesFrom[]` appear inside the embedded SMART request, their semantics are the additive semantics defined in §5.4.1.4.

A Kiosk creator SHALL include `encryptRequestTo` with the request-envelope suite identifier and the key identifier for the public key used to encrypt the compact JWS. A request-resolution processor SHALL reject a payload whose `encryptRequestTo.alg` is not supported by the wrapper profile being used.

A Kiosk creator SHALL include `encryptResponseTo` with the response-submission suite identifier and a per-request desktop P-256 public JWK. The Kiosk creator SHALL retain the corresponding private key only for the active kiosk session and later completion processing. This public key is included in the signed payload so the later Phone presenter can encrypt the submission to the Completion display; response-submission ciphertext and completion behavior are defined in §§9.8-9.9.

A Kiosk creator SHALL include `constraints.maxPlaintextBytes` as the maximum response-submission plaintext size it is willing to accept for the later submission leg. Active implementations use 25 MiB (`26214400`) as an application maximum. A Phone presenter and Completion display SHALL enforce this value for the later submission plaintext as specified in §9.8; the value is included here because it is signed request policy needed before the phone constructs a submission.

A Kiosk creator SHALL include `minter.keyId`, and the value SHOULD equal the JWS protected-header `kid`. A verifier of the kiosk request JWS SHALL select the trusted creator public key using the protected-header `kid` and SHALL treat a missing, empty, unknown, or untrusted key id as a failed kiosk-wrapper signature.

The signed kiosk payload is not the place for requester branding, authenticated organization identity, clinical-source provenance, or Wallet trust claims. The embedded `smartRequest.purpose`, item `title`, and item `summary` remain Holder-facing clinical workflow text under §5 and SHALL NOT be treated as authenticated requester identity merely because the wrapper JWS verifies.

### 9.5 `EncryptedKioskRequest` envelope

An `EncryptedKioskRequest` is the JSON envelope stored and served by the relay for the pointer `requestId`. It contains the encrypted compact JWS from §9.4 plus cleartext routing and cryptographic metadata needed to find, reject, or open the envelope. The relay can store and return this object, but cannot read the embedded `smartRequest` unless it has access to the request-recipient private key.

The version 1.0 envelope has this logical shape:

```json
{
  "v": 1,
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc": "A256GCM",
  "contentType": "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId": "<opaque-kiosk-wrapper-request-id>",
  "createdAt": 1777680000000,
  "expiresAt": 1777680600000,
  "creatorKeyId": "<creator-key-id>",
  "recipientKeyId": "<request-recipient-key-id>",
  "iv": "<base64url-96-bit-iv>",
  "ciphertext": "<base64url-aes-gcm-ciphertext-and-tag>",
  "ephemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

A producer SHALL set `v` to `1`, `alg` to `"ECDH-P256+HKDF-SHA256+AES-GCM"`, `enc` to `"A256GCM"`, and `contentType` to `"application/smart-health-checkin-kiosk-request+jws+aesgcm"` for this profile.

A producer SHALL set envelope `requestId`, `createdAt`, `expiresAt`, `creatorKeyId`, and `recipientKeyId` from the signed JWS header and payload. A request-resolution processor SHALL reject the envelope if the decrypted and verified payload `requestId` does not exactly match the envelope `requestId`. It SHOULD also reject or flag inconsistent creator or recipient key metadata according to the selected profile and key policy.

A producer SHALL encrypt the compact JWS as UTF-8 text using the §9.3 request-encryption construction. It SHALL base64url-encode the IV and ciphertext without padding. The AES-GCM additional authenticated data SHALL be the UTF-8 wrapper `requestId`, binding ciphertext authentication to the pointer and signed payload identifier.

A relay request row for this envelope SHOULD contain only the lookup key and the encrypted envelope. The active InstantDB provider uses:

```json
{
  "requestId": "<opaque-kiosk-wrapper-request-id>",
  "encryptedRequest": { "v": 1, "alg": "ECDH-P256+HKDF-SHA256+AES-GCM", "...": "..." }
}
```

Relay-visible metadata such as `requestId`, `createdAt`, `expiresAt`, key ids, content type, envelope size, provider application id, IP address, and timing can still be sensitive. A relay or provider implementation SHOULD minimize retained metadata, logs, analytics, and indexes to what is needed for routing, anti-enumeration, abuse control, and operational support.

This envelope is only the request-publication envelope. It is not the phone-to-desktop response-submission ciphertext. The submission plaintext shape, response encryption to `encryptResponseTo.desktopPublicKeyJwk`, storage pointer row, and Completion display processing are specified later in §§9.8-9.9.

### 9.6 QR / pointer URL

The Kiosk creator displays or otherwise transports a pointer URL to the Holder's phone. The pointer URL identifies the phone submit page and the stored encrypted kiosk request. It does not carry the signed payload or encrypted payload inline.

For the active profile, the pointer format is:

```text
<submit-page-url>#r=<url-encoded-wrapper-requestId>
```

For example:

```text
https://clinic.example/verifier/submit.html#r=wr17aF3Dq0l26vQ6oO5spA3vDSx4O-LrG30bkv6SybA
```

A Kiosk creator SHALL place the wrapper `requestId` in the fragment parameter `r`. A Phone presenter SHALL parse `r` from the URL fragment and treat absence of `r` as a missing kiosk request pointer. A Phone presenter SHALL use exact string equality when later comparing the pointer `requestId`, the relay row `requestId`, the envelope `requestId`, and the decrypted signed payload `requestId`.

A Kiosk creator SHALL NOT include plaintext `smartRequest`, FHIR resources, Questionnaire resources, SMART Health Card data, Wallet response material, same-device `DeviceRequest` bytes, same-device `encryptionInfo`, response-submission ciphertext, desktop private key material, request-recipient private key material, or Holder identifiers in the QR or pointer URL.

A Kiosk creator SHOULD keep the QR code short enough for reliable scanning from the expected kiosk distance and lighting conditions. Implementations SHOULD prefer a stable submit-page URL plus fragment pointer over embedding large request state. Active demonstrations generate a QR code from the submit-page URL containing only `#r=<requestId>` and use the relay to retrieve the encrypted envelope.

A Kiosk creator SHOULD use short-lived pointers. Active implementations set `expiresAt` ten minutes after `createdAt`. Deployments SHOULD choose lifetimes that account for check-in usability, clock skew, network delays, queueing at a kiosk, and replay risk. A relay MAY delete or hide expired request rows as defense in depth, but a Phone presenter or request-resolution processor SHALL enforce signed-payload expiration after decryption and JWS verification.

A pointer URL is a bearer locator for the encrypted request row. Knowledge of the pointer does not reveal the plaintext SMART request when encryption and key management are correct, but it can permit retrieval attempts, traffic analysis, or denial-of-service against the relay. Kiosk deployments SHOULD display QR codes in a way that reduces substitution, shoulder-surfing, and stale-code reuse, and SHOULD avoid logging full pointer URLs unless operationally necessary.

## Organizer notes

### Strengths

- The draft preserves the central invariant from T1-T3: kiosk is a wrapper around the same SMART request and the same §8 phone-side presentation flow, not a second clinical protocol.
- The active implementation shape is reflected: compact ES256 JWS with `typ: "smart-health-checkin+kiosk-request+jws"`; direct `smartRequest`; `requestId`, `createdAt`, `expiresAt`; `submitTo.backend: "instantdb"`; request encryption with ECDH P-256, HKDF-SHA-256, AES-GCM; `EncryptedKioskRequest`; and pointer URL `#r=<requestId>`.
- The relay is treated as untrusted and opaque, with only `requestId` plus `encryptedRequest` required for request publication.
- The draft avoids request-profile wrappers, demo preset labels, IPS examples, and alternate clinical request models.

### Caveats and open issues

- Active code uses demo `iss` and `aud` constants (`smart-health-checkin-demo-creator`, `smart-health-checkin-demo-submission-service`). Production issuer/audience syntax and semantics need registry or deployment-profile closure.
- The code names the request-encryption recipient as a "submission service" key, while the relay is explicitly untrusted and must not hold the private key. The final spec should choose clearer terminology for the decryption-capable request-resolution component or key holder.
- The active implementation uses a custom string algorithm label `ECDH-P256+HKDF-SHA256+AES-GCM`, not JOSE ECDH-ES/JWE names. This draft records the active label instead of inventing JOSE algorithm identifiers.
- The active JWS canonicalization helper sorts JSON object members before signing. Final Appendix C/D work should decide whether to normatively freeze that canonicalization, refer to an existing canonical JSON profile, or fixture only the active behavior.
- Key distribution, trusted creator key registry, rotation, revocation, and production storage for creator/request-recipient/desktop keys are not solved in this cutpoint.

### Downstream dependencies

- T4.B (§9.7) must define pointer fetch, decrypting `EncryptedKioskRequest`, JWS verification, `requestId` binding across pointer/row/envelope/payload, `smartRequest` validation, and re-entry into §8.
- T4.C (§§9.8-9.11) must define response-submission plaintext, response encryption to `encryptResponseTo.desktopPublicKeyJwk`, storage pointer rows, size enforcement, single-use/replay handling, and Completion display processing.
- T4.D should align kiosk CDDL/fixture material with the exact field names, content type, canonical JSON signing rule, base64url encodings, HKDF salt/info/AAD conventions, and pointer URL format used here.
- T5 security/privacy should revisit QR substitution, pointer entropy, relay metadata leakage, expiration, cleanup, production key management, and demo-key prohibitions.
