## 9. Cross-device kiosk flow: request creation and pointer transport

This section defines the first part of the cross-device kiosk wrapper: creation of a signed kiosk request payload, encryption of that request state for phone-side resolution, publication of the encrypted request through an untrusted relay, and construction of a pointer-only URL suitable for QR display. It does not define phone resolution and re-entry into §8, submission encryption, or desktop completion processing; those are defined by later §9 subsections.

The kiosk flow wraps the same transport-neutral SMART request and SMART response objects defined in §§5-6. It does not define a second clinical request language. A kiosk request payload embeds the SMART request directly as `smartRequest`.

### 9.1 Goals

The kiosk wrapper supports deployments where a Holder begins check-in at a desktop, kiosk, shared tablet, or staff workstation, but the Wallet/Responder is available on the Holder's phone. The Kiosk creator prepares protected request state, displays a short pointer, and lets the Phone presenter later re-enter the base same-device presentation flow defined in §8.

The goals of the request-and-pointer portion of the kiosk wrapper are:

1. **Desktop initiation, phone presentation.** A Kiosk creator can start a check-in session on a kiosk or desktop while preserving Holder review and Wallet invocation on the Holder's phone.
2. **Same clinical protocol.** The SMART request carried by the kiosk wrapper has the same meaning as the SMART request carried directly in §8. The kiosk wrapper SHALL NOT replace `SmartHealthCheckinRequest` with a kiosk-specific clinical request model.
3. **Direct embedding.** A Kiosk creator SHALL embed the SMART request object directly as `smartRequest` in the signed kiosk request payload. It SHALL NOT embed a demo preset id, request-label wrapper, request profile shortcut, SDK helper object, or an “all of the above” selector as a substitute for the SMART request.
4. **Untrusted relay.** The Submission service, storage provider, and QR transport are not trusted with plaintext clinical content. A Kiosk creator SHALL publish only encrypted request state and routing metadata needed to retrieve that state.
5. **Pointer-only QR.** The Pointer URL is intended to be small enough for reliable QR display. It carries the information needed to locate the encrypted kiosk request, not the SMART request itself.
6. **Later re-entry into §8.** The output of this section is sufficient for the Phone presenter, in §9.7, to retrieve and validate the embedded `smartRequest` and then run the same-device `org-iso-mdoc` flow from §8 on the phone.

### 9.2 Roles and trust boundaries

The kiosk wrapper uses the roles defined in §1.6 and §3.3, with the following role-specific responsibilities for request creation and pointer transport.

**Requester / Verifier.** The Requester determines the bounded clinical or administrative need and constructs a SMART request under §5. In a kiosk deployment the same product often also acts as the Verifier and Kiosk creator. The Requester/Verifier SHALL NOT use kiosk wrapper fields, `purpose`, item display text, relay URLs, or pointer metadata as authenticated requester identity.

**Kiosk creator.** The Kiosk creator creates the SMART request, generates a fresh kiosk `requestId`, signs a `KioskRequestPayload`, encrypts the resulting request JWS into an `EncryptedKioskRequest`, publishes that encrypted request through a Submission service or equivalent provider, and displays a Pointer URL. A Kiosk creator SHALL validate or construct the embedded `smartRequest` according to §5 before signing it.

**Submission service / relay.** The Submission service stores, forwards, or serves encrypted kiosk request state and provider metadata. It can enforce anti-enumeration, rate-limiting, abuse controls, and row-shape constraints, but those controls are defense in depth. The Submission service SHALL NOT be trusted to read, validate, or authorize plaintext clinical content. For this request-creation cutpoint, the Submission service needs to route by `requestId` and serve the `EncryptedKioskRequest`; response-submission rows and blobs are defined later in §9.8.

**Phone presenter.** The Phone presenter is the phone-side web or app component that later resolves the Pointer URL, retrieves the encrypted request, validates the kiosk wrapper, and re-enters §8 with the embedded `smartRequest`. This section defines the fields the Phone presenter will consume, but detailed resolution and validation steps are in §9.7.

**Wallet / Responder.** The Wallet/Responder is not invoked by the QR itself. After phone-side resolution in §9.7, the Wallet/Responder receives the embedded SMART request through the same-device presentation flow defined in §8, applies Holder review and Wallet policy, and constructs the SMART response under §6.

**Holder.** The Holder uses the phone to scan or open the Pointer URL and controls disclosure through the Wallet/Responder. Scanning a QR code is not consent to disclose clinical content.

**Completion display.** The Completion display is the kiosk-side component that later receives and processes encrypted completion state. For this cutpoint, the Kiosk creator includes response-encryption metadata needed by later submission processing; the decryption, validation, and display of submissions are defined in §9.9.

The kiosk wrapper adds a relay and QR boundary, but it does not change the trust separation from §7. Kiosk request signatures and encryption protect the wrapper. They do not prove clinical-source provenance for raw FHIR JSON, do not authenticate requester identity through SMART request display fields, and do not replace §8 transport validation or §6.6 response validation.

### 9.3 Cryptographic suite for the kiosk wrapper

The version 1.0 kiosk request wrapper uses the algorithm identifiers in Table 9-1.

| Purpose | Active identifier or value |
| --- | --- |
| Kiosk request signature | Compact JWS with `alg` `ES256` |
| Kiosk request JWS type | `smart-health-checkin+kiosk-request+jws` |
| Request-envelope algorithm label | `ECDH-P256+HKDF-SHA256+AES-GCM` |
| Request-envelope content encryption | AES-GCM with a 256-bit content-encryption key; envelope `enc` value `A256GCM` |
| ECDH curve | P-256 JWK keys |
| KDF | HKDF with SHA-256 |
| Request-envelope HKDF salt | UTF-8 encoding of `requestId` |
| Request-envelope HKDF info | UTF-8 string `smart-health-checkin-kiosk-request-v1` |
| Request-envelope AEAD AAD | UTF-8 encoding of `requestId` |
| Request-envelope IV | 12 random bytes, base64url-encoded without padding |
| Encrypted request content type | `application/smart-health-checkin-kiosk-request+jws+aesgcm` |

A Kiosk creator SHALL sign the `KioskRequestPayload` as a compact JWS whose protected header contains `alg: "ES256"`, `kid`, and `typ: "smart-health-checkin+kiosk-request+jws"`. The `kid` identifies the creator signing key. The payload of the compact JWS is the `KioskRequestPayload` JSON object.

A Kiosk creator SHALL encrypt the compact JWS as the plaintext of the request envelope. The active implementation uses browser-native ECDH over P-256, HKDF-SHA-256, and AES-GCM with a 256-bit derived AES key. The sender generates an ephemeral P-256 ECDH key pair, derives the AES-GCM key from the sender ephemeral private key and the request-resolution recipient public key, uses `requestId` as HKDF salt and AES-GCM AAD, and stores the sender ephemeral public JWK in the envelope.

A Kiosk creator SHALL use a fresh unpredictable `requestId`, fresh request-envelope ephemeral ECDH key pair, and fresh AES-GCM IV for each kiosk request. Implementations SHOULD use at least 128 bits of entropy for `requestId`; the active implementation uses 32 random bytes encoded as unpadded base64url.

A Kiosk creator SHALL NOT publish the compact JWS in plaintext through the relay or in the QR. A Submission service that is treated as untrusted SHALL NOT have access to request-envelope plaintext or to private keys that allow request-envelope decryption in a production deployment.

The response-submission encryption suite uses the same active algorithm family with `smart-health-checkin-kiosk-response-v1` as HKDF info, but response submission and Completion display processing are specified in §9.8 and §9.9 rather than here.

### 9.4 `KioskRequestPayload` JWS body

`KioskRequestPayload` is the signed JSON object that binds kiosk routing and cryptographic metadata to the embedded SMART request. It is signed by the Kiosk creator before request-envelope encryption.

A version 1.0 `KioskRequestPayload` has this logical shape:

```json
{
  "v": 1,
  "iss": "<creator-issuer>",
  "aud": "<request-resolution-audience>",
  "requestId": "<unguessable-kiosk-request-id>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
  "submitTo": {
    "backend": "instantdb",
    "appId": "<provider-app-id>"
  },
  "smartRequest": {
    "type": "smart-health-checkin-request",
    "version": "1",
    "id": "demo-us-core-checkin",
    "purpose": "Clinic check-in",
    "fhirVersions": ["4.0.1"],
    "items": [
      {
        "id": "clinical-history",
        "title": "US Core clinical resources",
        "content": {
          "kind": "fhir.resources",
          "profilesFrom": ["http://hl7.org/fhir/us/core"]
        },
        "accept": ["application/fhir+json"]
      }
    ]
  },
  "encryptRequestTo": {
    "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
    "keyId": "<request-resolution-recipient-key-id>"
  },
  "encryptResponseTo": {
    "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
    "desktopPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
  },
  "constraints": {
    "maxPlaintextBytes": 26214400
  },
  "minter": {
    "keyId": "<creator-signing-key-id>"
  }
}
```

The example is illustrative. It uses a US Core profile-family selector because §5 defines `profilesFrom[]` as an array of canonical profile-family URLs and defines `profiles[]` plus `profilesFrom[]` as additive selectors.

The fields are:

| Field | Requirement |
| --- | --- |
| `v` | Version discriminator. For this profile it SHALL be `1`. |
| `iss` | Identifier for the kiosk request creator or creator-key domain. The active demo value is `smart-health-checkin-demo-creator`; production deployments define their own accepted issuer identifiers and trust policy. |
| `aud` | Audience for the component expected to resolve/open the request envelope. The active demo value is `smart-health-checkin-demo-submission-service`; deployments SHALL ensure this value is checked against the expected request-resolution context. |
| `requestId` | Unguessable kiosk pointer and request-envelope binding identifier. It is distinct from `smartRequest.id`, although implementations validate both where relevant. |
| `createdAt` | Creation time as a JSON number representing milliseconds since the Unix epoch in the active implementation. |
| `expiresAt` | Expiration time as a JSON number representing milliseconds since the Unix epoch in the active implementation. The value bounds request resolution and later use. |
| `submitTo` | Provider descriptor for resolving this kiosk session. The active provider shape is `{ "backend": "instantdb", "appId": "..." }`. A receiver SHALL reject unsupported provider descriptors. |
| `smartRequest` | The complete `SmartHealthCheckinRequest` object from §5. This member is REQUIRED. It SHALL NOT be replaced by `requestProfile`, `presetId`, `label`, `request`, or any other wrapper. |
| `encryptRequestTo` | Request-envelope recipient metadata. In the active shape it contains `alg: "ECDH-P256+HKDF-SHA256+AES-GCM"` and a `keyId` for the request-resolution recipient key. |
| `encryptResponseTo` | Response-submission recipient metadata for later §9.8 processing. The active shape contains the same `alg` string and an ephemeral desktop P-256 public JWK in `desktopPublicKeyJwk`. This section defines its presence because it is signed with the request; response encryption itself is later. |
| `constraints.maxPlaintextBytes` | Maximum plaintext size later accepted for encrypted submission. The active implementation uses `26214400` bytes. This field is signed here so the Phone presenter and Completion display can enforce it later. |
| `minter.keyId` | Creator key identifier repeated in the signed payload. It is expected to match or be consistent with the JWS protected-header `kid` under deployment policy. |

A Kiosk creator SHALL include `smartRequest` as a JSON object conforming to §5. A Kiosk creator SHALL preserve the SMART request's own `id`, `items[]`, selectors, `accept[]`, and display fields exactly as the Requester intends them to be processed by the Wallet/Responder. The kiosk `requestId` is a wrapper-routing identifier and SHALL NOT be substituted for `smartRequest.id` inside the clinical request.

A verifier of the JWS payload in §9.7 will reject expired payloads, future-dated payloads outside an allowed clock-skew window, unsupported `v`, unsupported `iss` or `aud`, unsupported `submitTo.backend`, unexpected `submitTo.appId`, unsupported algorithm labels, oversized `constraints.maxPlaintextBytes`, missing `minter.keyId`, or an invalid embedded `smartRequest`.

The active implementation signs a deterministic JSON serialization that sorts object member names recursively before base64url encoding the JWS protected header and payload. A conforming producer and consumer for this profile SHALL use the same deterministic serialization rule when creating or verifying fixture-grade JWS values. A future canonicalization appendix can replace this sentence with a named JSON canonicalization reference if one is adopted.

### 9.5 `EncryptedKioskRequest` envelope

`EncryptedKioskRequest` is the JSON envelope stored or served by the Submission service for request resolution. Its plaintext is the compact JWS from §9.4. The relay sees the outer routing fields and ciphertext, but not the plaintext `KioskRequestPayload` or embedded SMART request.

A version 1.0 `EncryptedKioskRequest` has this logical shape:

```json
{
  "v": 1,
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc": "A256GCM",
  "contentType": "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId": "<unguessable-kiosk-request-id>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
  "creatorKeyId": "<creator-signing-key-id>",
  "recipientKeyId": "<request-resolution-recipient-key-id>",
  "iv": "<base64url-aes-gcm-iv>",
  "ciphertext": "<base64url-aes-gcm-ciphertext-and-tag>",
  "ephemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

The fields are:

| Field | Requirement |
| --- | --- |
| `v` | Envelope version. For this profile it SHALL be `1`. |
| `alg` | Request-envelope algorithm label. For this profile it SHALL be `ECDH-P256+HKDF-SHA256+AES-GCM`. |
| `enc` | Content-encryption label. For this profile it SHALL be `A256GCM`. |
| `contentType` | Envelope content type. For this profile it SHALL be `application/smart-health-checkin-kiosk-request+jws+aesgcm`. |
| `requestId` | The kiosk request id used for lookup, HKDF salt, and AES-GCM AAD. It SHALL match the signed payload's `requestId` after decryption and JWS verification. |
| `createdAt`, `expiresAt` | Replicas of the signed payload times for routing, cleanup, or UI. They are not trusted until the signed payload is verified. |
| `creatorKeyId` | The creator signing key id, copied from the JWS header for routing or diagnostics. It is not trusted until the JWS verifies. |
| `recipientKeyId` | The request-envelope recipient key id, copied from signed payload metadata for routing or diagnostics. |
| `iv` | Unpadded base64url encoding of the 12-byte AES-GCM IV. |
| `ciphertext` | Unpadded base64url encoding of the AES-GCM ciphertext, including authentication tag, over the compact JWS plaintext. |
| `ephemeralPublicKeyJwk` | Sender ephemeral P-256 public JWK used for ECDH key agreement. |

A Kiosk creator SHALL derive the request-envelope AES-GCM key using ECDH P-256 and HKDF-SHA-256 with `salt = utf8(requestId)` and `info = utf8("smart-health-checkin-kiosk-request-v1")`. It SHALL encrypt the compact JWS with AES-GCM using `additionalData = utf8(requestId)`.

A Kiosk creator SHALL publish only the `EncryptedKioskRequest` and provider metadata needed for retrieval. For the active InstantDB provider, the request row is limited to:

```json
{
  "requestId": "<unguessable-kiosk-request-id>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

A Submission service MAY index or authorize reads by `requestId`, but it SHALL NOT be treated as authoritative for request validity, expiration, creator authenticity, SMART request validity, or clinical semantics. A receiver validates those properties after decryption and JWS verification in §9.7.

This envelope is only the encrypted request envelope. It does not define the later response-submission ciphertext, storage blob, submission row, or Completion display processing specified in §9.8 and §9.9.

### 9.6 QR / Pointer URL

The Pointer URL is the URL shown by the kiosk, commonly as a QR code. In the active shape it is a submit-page URL with the kiosk request id in the URL fragment:

```text
https://clinic.example/verifier/submit.html#r=<requestId>
```

The fragment parameter name is `r`. Its value is the kiosk `requestId` from the signed payload and encrypted envelope. A Kiosk creator SHALL use an unguessable `requestId` and SHALL bind the same value into the signed payload, the encrypted envelope, and the provider lookup row.

A Pointer URL for this profile SHALL NOT contain:

- the plaintext SMART request;
- FHIR resources, FHIR profile details, Questionnaire content, SMART Health Card content, or any other clinical content;
- the compact kiosk request JWS;
- the `EncryptedKioskRequest` ciphertext itself;
- desktop private keys, request-resolution private keys, response-submission private keys, or Wallet secrets;
- same-device §8 `DeviceResponse` bytes, `dcapiResponse` bytes, returned SMART response JSON, or response-submission ciphertext; or
- requester identity assertions intended to bypass §7 trust processing.

A Kiosk creator SHOULD keep the Pointer URL small enough for reliable QR scanning under expected device, lighting, display-size, and distance conditions. The active pointer is intentionally short because it carries only the submit URL and `#r=<requestId>`.

A Kiosk creator SHALL set a short expiration for kiosk request payloads. The active implementation uses a ten-minute time-to-live. Deployments MAY choose a different short lifetime based on clinic workflow, network reliability, abuse risk, and Holder usability, but they should avoid long-lived kiosk pointers because the QR is an unattended bearer pointer to encrypted request state.

A Pointer URL is routing metadata. Possession of the Pointer URL does not prove Holder consent, Wallet approval, requester authenticity, clinical-source provenance, or authorization to consume returned clinical content. Later §9.7 binds the pointer `requestId` to the decrypted and verified payload; later §9.8 and §9.9 bind encrypted submissions back to the same kiosk request.

## Organizer notes

**Strengths.** This draft preserves the core architectural invariant: kiosk is a wrapper around the §8 same-device flow, not a second clinical protocol. It follows active code by embedding `smartRequest` directly, using compact ES256 JWS, using a pointer-only `#r=<requestId>` QR, and storing only opaque encrypted request state in the relay. It avoids request-profile wrappers, IPS examples, and “all of the above” clinical shortcuts.

**Caveats.** The active implementation labels request-envelope encryption as `ECDH-P256+HKDF-SHA256+AES-GCM` rather than a registered JOSE, COSE, or HPKE algorithm name. The draft therefore states the actual primitive composition and active string label, but the organizer should decide whether §13 or Appendix C will register this exact label or replace it with a named profile. The active demo also uses millisecond epoch numbers for `createdAt` and `expiresAt`; the broader spec may prefer NumericDate seconds or RFC 3339 strings, but changing that would require code and fixture alignment.

**Open issues.** The demo has checked-in request-resolution private key material so a static Pages demo can decrypt the request on the phone. Production text should be careful that an untrusted relay does not hold private keys that allow decrypting `EncryptedKioskRequest`; the recipient key needs to belong to the trusted phone-side/request-resolution context or to another component not acting as the untrusted relay. The active `iss` and `aud` values are demo constants, so production issuer/audience syntax and trust-anchor discovery remain deployment-profile work. Deterministic JSON signing is implemented by recursively sorting object keys, but the spec should eventually cite a precise canonical JSON scheme or define one in Appendix C/D fixture material.

**Downstream dependencies.** T4.B should specify pointer fetch, request-envelope decryption, JWS verification, `requestId` binding across URL, row, envelope, and signed payload, expiration/freshness checks, and re-entry into §8 with `smartRequest`. T4.C should specify response-submission plaintext and ciphertext, use of `encryptResponseTo.desktopPublicKeyJwk`, `constraints.maxPlaintextBytes`, submission rows/blobs, and Completion display validation. T4.D should align CDDL/JSON shape and fixtures for `KioskRequestPayload`, compact JWS, `EncryptedKioskRequest`, and pointer examples.
