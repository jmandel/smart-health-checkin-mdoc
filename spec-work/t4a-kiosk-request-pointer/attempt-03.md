## 9. Cross-device kiosk flow — request creation and pointer transport

The kiosk flow is a wrapper around the same clinical objects and same same-device presentation flow defined elsewhere in this specification. Sections 9.1 through 9.6 define only creation, protection, publication, and pointer carriage for a kiosk request. Phone resolution, validation, and re-entry into §8 are defined later in §9.7. Submission encryption, desktop completion, replay handling beyond the request-creation controls below, and provider-specific completion behavior are defined later in §§9.8-9.12.

### 9.1 Goals

The cross-device kiosk wrapper supports deployments where a Holder starts check-in at a desktop, kiosk, shared tablet, or staff workstation but cannot invoke the Holder's Wallet on that kiosk device. The Kiosk creator therefore prepares a protected request for use by the Holder's phone. After the phone resolves and validates the protected request, the phone re-enters the same-device presentation flow in §8 using the embedded SMART request.

The kiosk wrapper has these goals:

1. **Desktop initiation, phone-side Wallet presentation.** A Kiosk creator can start a check-in interaction on a kiosk or staff desktop, while Holder review and Wallet/Responder interaction occur on the Holder's phone.
2. **One clinical protocol.** The wrapper carries the same transport-neutral `SmartHealthCheckinRequest` object defined in §5 and expects the same `SmartHealthCheckinResponse` object defined in §6. It does not define a kiosk-specific request profile, preset wrapper, clinical topic vocabulary, or alternate response model.
3. **Same-device re-entry.** Once the phone has obtained and validated the kiosk request, the phone uses the §8 same-device `org-iso-mdoc` flow for the embedded SMART request. The kiosk wrapper is pairing and transport scaffolding, not a second presentation protocol.
4. **Untrusted relay.** The Submission service or relay can store, forward, and notify about opaque state, but it is not trusted with plaintext clinical content and is not trusted to assert requester identity, Holder consent, clinical-source provenance, or response validity.
5. **Pointer-only QR.** The QR code or equivalent short transfer mechanism carries only a pointer sufficient to locate the encrypted request. It does not carry the plaintext SMART request, FHIR content, Wallet response material, response encryption private keys, or other clinical payloads.
6. **Freshness and bounded availability.** Kiosk requests carry creation and expiration times and are intended to be short lived. Deployments SHOULD publish kiosk requests with lifetimes no longer than needed for an in-person check-in session.

A conforming Kiosk creator for this flow SHALL embed the SMART request directly as `smartRequest` in the signed kiosk request payload defined in §9.4. It SHALL NOT replace `smartRequest` with a preset name, demo helper object, wrapper label, or shortcut standing in for the clinical request object.

### 9.2 Roles

The roles below are protocol roles. One deployed product can perform more than one role, and a role can be split across components, provided that each protocol obligation is met.

#### 9.2.1 Kiosk creator

The Kiosk creator starts the cross-device kiosk flow. It constructs a §5 SMART request for the check-in session, creates a signed `KioskRequestPayload` whose `smartRequest` member is that SMART request object, encrypts the resulting request JWS into an `EncryptedKioskRequest`, publishes the encrypted request through a Submission service or relay, and displays or otherwise conveys the Pointer URL defined in §9.6.

The Kiosk creator's signature on the kiosk wrapper authenticates the wrapper payload under the configured kiosk-creator trust policy. It does not by itself prove clinical-source provenance for raw FHIR returned later by the Wallet/Responder, and it does not turn SMART request display fields such as `purpose` or item `title` into authenticated requester identity.

#### 9.2.2 Submission service / relay

The Submission service, also called the relay or transport provider, stores or serves encrypted kiosk request state and later submission state. For §9.1-§9.6, its request-side responsibility is to make an `EncryptedKioskRequest` available by `requestId` or equivalent provider routing key.

A Submission service for this flow SHALL be treated as untrusted for plaintext clinical content. It MAY see routing metadata needed to store and retrieve a request, such as a request pointer, row identifier, backend application identifier, creation time, expiration time, content type, key identifiers, ciphertext size, or storage path. It SHALL NOT be required to see the plaintext `smartRequest` or request JWS payload in order to relay the request.

#### 9.2.3 Phone presenter

The Phone presenter is the phone-side component that later receives or opens the Pointer URL, fetches the encrypted request from the provider, decrypts and verifies the kiosk request, checks pointer-to-payload binding, and starts the §8 same-device flow on the phone using the embedded `smartRequest`. Those resolution and re-entry requirements are defined in §9.7, but §9.1-§9.6 define the request and pointer artifacts the Phone presenter consumes.

#### 9.2.4 Completion display

The Completion display is the kiosk-side or desktop component that later observes, decrypts, validates, and displays completion state for a phone submission. For this cutpoint, the only request-creation dependency is that the Kiosk creator includes the response-encryption public key material and routing metadata that later completion processing needs. Detailed submission ciphertext and completion processing are deferred to §§9.8-9.9.

#### 9.2.5 Requester / Verifier, Wallet / Responder, and Holder

The Requester and Verifier retain the meanings defined in §§3 and 8. The Requester defines the clinical need and consumes the validated SMART response. The Verifier invokes and validates the presentation flow. In the kiosk flow, the Kiosk creator and Completion display often belong to the same deployed Requester/Verifier application, but the kiosk wrapper fields do not alter SMART request or SMART response semantics.

The Wallet/Responder and Holder also retain their base meanings. The Wallet/Responder receives the SMART request through the phone-local §8 flow, supports Holder review according to Wallet policy, and returns a §6 SMART response. The Holder remains the person controlling the Wallet interaction. The Phone presenter is not a second Wallet and is not a substitute for Holder review.

### 9.3 Cryptographic suite for the wrapper

The kiosk wrapper uses a separate cryptographic layer from the same-device mdoc/HPKE layer in §8. Implementations SHALL keep these layers separate. A valid kiosk wrapper signature or encryption result does not replace §8 same-device validation, §6 response validation, mdoc issuer/device checks, reader-authentication checks, clinical-source trust evaluation, or deployment policy.

The active version 1.0 kiosk request wrapper uses the following request-side algorithms and context strings:

| Purpose | Active value |
| --- | --- |
| Request payload signature | Compact JWS with protected header `alg: "ES256"`, `kid`, and `typ: "smart-health-checkin+kiosk-request+jws"` |
| JWS signing input | `base64url(canonical-json(header)) || "." || base64url(canonical-json(payload))`, with the implementation's canonical JSON sorting object keys lexicographically and omitting members with `undefined` values |
| Request-envelope key agreement and encryption | ECDH over P-256, HKDF-SHA-256, AES-256-GCM, identified in JSON as `"ECDH-P256+HKDF-SHA256+AES-GCM"` and `enc: "A256GCM"` |
| Request-envelope HKDF salt | UTF-8 bytes of `requestId` |
| Request-envelope HKDF info | UTF-8 string `smart-health-checkin-kiosk-request-v1` |
| Request-envelope AES-GCM IV | 96-bit random IV, base64url-encoded in the envelope |
| Request-envelope AES-GCM AAD | UTF-8 bytes of `requestId` |
| Request-envelope plaintext | The compact kiosk request JWS string |
| Response-encryption algorithm advertised for later use | Same active suite string, `"ECDH-P256+HKDF-SHA256+AES-GCM"`, with details deferred to §9.8 |

A Kiosk creator conforming to this request wrapper SHALL sign the `KioskRequestPayload` as an ES256 compact JWS with protected header `typ` equal to `smart-health-checkin+kiosk-request+jws`. A processor that verifies this JWS SHALL reject a JWS whose protected header does not contain `alg: "ES256"`, a non-empty `kid`, and that exact `typ` value.

A Kiosk creator conforming to this request wrapper SHALL encrypt the compact request JWS into an `EncryptedKioskRequest` using ECDH P-256, HKDF-SHA-256, and AES-256-GCM as identified above. The encryption AAD SHALL be the UTF-8 encoding of the same `requestId` that appears in the encrypted envelope. A decrypting processor SHALL use the envelope `requestId` as HKDF salt and AES-GCM AAD and SHALL reject the envelope if decryption, envelope validation, JWS verification, expiration validation, or request-id binding fails.

The algorithm name `ECDH-P256+HKDF-SHA256+AES-GCM` is the active implementation identifier for the kiosk wrapper. It is not the same identifier as the §8 HPKE suite, and it uses AES-256-GCM for the kiosk wrapper rather than §8's AES-128-GCM HPKE profile.

### 9.4 `KioskRequestPayload` JWS body

The `KioskRequestPayload` is the signed JSON payload produced by the Kiosk creator. It is the request-side control object for the kiosk wrapper. The active payload shape is:

```json
{
  "v": 1,
  "iss": "smart-health-checkin-demo-creator",
  "aud": "smart-health-checkin-demo-submission-service",
  "requestId": "<opaque-kiosk-request-pointer>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
  "submitTo": {
    "backend": "instantdb",
    "appId": "<transport-provider-app-id>"
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
    "keyId": "<submission-service-key-id>"
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

The example is illustrative. It shows the active field names and a US Core profile selector aligned with §5. It does not define fixed issuer values, transport application identifiers, SMART request ids, clinical content, provider choice, or key identifiers for production deployments.

A Kiosk creator SHALL include these members in the signed payload:

- `v`: integer kiosk-payload version. Version 1.0 uses `1`.
- `iss`: issuer identifier for the kiosk creator in the deployment's kiosk-wrapper trust policy.
- `aud`: audience identifier for the intended Submission service, relay, or provider trust domain.
- `requestId`: opaque kiosk-wrapper request identifier and pointer value.
- `createdAt`: creation time as milliseconds since the Unix epoch.
- `expiresAt`: expiration time as milliseconds since the Unix epoch.
- `submitTo`: transport descriptor. The active provider uses `{ "backend": "instantdb", "appId": "..." }`.
- `smartRequest`: the complete §5 `SmartHealthCheckinRequest` JSON object, embedded directly.
- `encryptRequestTo`: request-envelope recipient metadata, including active `alg` and recipient `keyId`.
- `encryptResponseTo`: public key material and algorithm metadata needed later to encrypt the phone submission for the desktop or Completion display.
- `constraints`: wrapper constraints. The active implementation uses `maxPlaintextBytes` to advertise a maximum later submission plaintext size; detailed enforcement for response submission is defined in §9.8.
- `minter`: creator metadata. The active implementation carries `keyId`, which is expected to match the JWS protected-header `kid` under local validation policy.

A Kiosk creator SHALL set `smartRequest` to a valid SMART request under §5. A Kiosk creator SHALL NOT put kiosk routing, relay, completion, encryption, requester identity, or trust metadata inside `smartRequest`; those fields belong to the kiosk wrapper or other presentation/trust layers. A Phone presenter or other verifier of the kiosk payload SHALL validate the embedded `smartRequest` under §5 before using it for §8 re-entry.

The kiosk `requestId` and the embedded SMART request `smartRequest.id` are distinct identifiers. The kiosk `requestId` identifies and binds the wrapper request, encrypted envelope, pointer, and later submission channel. The SMART request `id` is the clinical request identifier to which the §6 SMART response `requestId` binds. A processor SHALL NOT substitute one for the other.

A Kiosk creator SHOULD generate `requestId` with enough entropy to prevent guessing within the lifetime and namespace of the relay. The active implementation generates 32 random bytes and base64url-encodes them without padding.

A Kiosk creator SHALL set `expiresAt` later than `createdAt` and SHOULD use a short time-to-live appropriate for the check-in setting. The active implementation uses a 10-minute lifetime. A processor that validates the kiosk request SHALL reject an expired payload and SHOULD reject a payload whose `createdAt` is unreasonably in the future; the active implementation allows at most 60 seconds of future skew.

### 9.5 `EncryptedKioskRequest` envelope

An `EncryptedKioskRequest` is the JSON envelope stored or served by the Submission service for phone retrieval. It carries the encrypted compact kiosk request JWS and the metadata required for decryption and binding. The active envelope shape is:

```json
{
  "v": 1,
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc": "A256GCM",
  "contentType": "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId": "<same kiosk requestId as pointer and signed payload>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
  "creatorKeyId": "<creator-key-id>",
  "recipientKeyId": "<submission-service-key-id>",
  "iv": "<base64url-96-bit-iv>",
  "ciphertext": "<base64url-aes-gcm-ciphertext-and-tag>",
  "ephemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

A Kiosk creator SHALL construct the ciphertext over the compact kiosk request JWS string. The plaintext of the encrypted request envelope SHALL NOT be raw SMART request JSON without the creator JWS, a preset identifier, a wrapper label, a FHIR Bundle, a SMART response, or a response-submission ciphertext.

A Submission service MAY store and serve the `EncryptedKioskRequest` as a JSON object or as an equivalent provider row whose protocol-visible fields preserve the envelope. The Submission service SHALL be able to retrieve the encrypted request by the pointer's `requestId` or provider-equivalent routing key.

A request-envelope producer SHALL copy `requestId`, `createdAt`, `expiresAt`, creator key id, and recipient key id from the signed and encrypted request state so that resolvers can perform early routing, expiration, and binding checks. These envelope metadata are not clinical plaintext. Nevertheless, implementations SHOULD minimize logging and retention because request timing, key ids, provider app ids, and pointer values can still be sensitive metadata.

A decrypting processor SHALL validate at least `v`, `alg`, `enc`, `contentType`, non-empty `requestId`, non-empty `creatorKeyId`, non-empty `recipientKeyId`, `iv`, `ciphertext`, and `ephemeralPublicKeyJwk` before or during decryption. After decryption and JWS verification, it SHALL confirm that the signed payload `requestId` exactly equals the envelope `requestId`. Later §9.7 also binds this value to the Pointer URL.

The encrypted request envelope defined here is request-side state only. Response-submission ciphertext from the phone to the desktop uses related but distinct fields and is defined later in §9.8.

### 9.6 QR / pointer URL

The Pointer URL is the small value conveyed from the kiosk to the Holder's phone, commonly as a QR code. It identifies where the phone should begin resolving the kiosk request and carries the opaque kiosk `requestId` as a fragment parameter:

```text
https://clinic.example/verifier/submit.html#r=<url-encoded-kiosk-requestId>
```

The active implementation builds and parses the pointer with the URL fragment key `r`. A Kiosk creator conforming to this pointer format SHALL set `r` to the kiosk wrapper `requestId` from the signed payload and encrypted envelope. A Phone presenter using this pointer format SHALL reject a URL fragment that lacks `r`.

The QR code or equivalent pointer transfer SHALL NOT include:

- the plaintext `smartRequest`;
- FHIR resources, SMART Health Cards, Questionnaire answers, or other clinical content;
- the compact request JWS or encrypted request ciphertext, except by reference through the pointer;
- the SMART response, mdoc `DeviceResponse`, `dcapiResponse`, response-submission ciphertext, or completion result;
- private keys, shared secrets, or the desktop private key; or
- requester identity or trust claims intended to bypass the wrapper signature, §8 trust processing, or Wallet policy.

The pointer MAY include the origin, path, and static application route needed to open the phone-side presenter, because that information is inherent in a normal URL. It MAY include the `requestId` in a fragment rather than a query string to reduce routine server-log exposure by the web origin serving the phone page. Deployments SHOULD still treat the complete URL and QR image as sensitive because a party that obtains the pointer during its validity window can attempt request resolution.

A Kiosk creator SHOULD keep the Pointer URL short enough for reliable QR scanning and SHOULD keep the QR payload pointer-only. The active design keeps large and sensitive state in the encrypted request envelope stored by the provider, not in the QR code.

A Kiosk creator SHALL publish the corresponding `EncryptedKioskRequest` before displaying the Pointer URL or SHALL otherwise ensure that the Phone presenter can resolve the pointer without exposing plaintext request material. A Kiosk creator SHOULD stop displaying or accepting a pointer after `expiresAt`, after successful completion, or when the check-in session is abandoned, subject to the replay and completion rules defined later in §9.10.

## Organizer notes

### Strengths

- This draft preserves the architectural invariant from T1-T3: kiosk is a wrapper and re-entry path around the same §5 SMART request, §6 SMART response, and §8 same-device flow.
- It follows active implementation field names from `rp-web/src/kiosk/protocol.ts` and `rp-web/src/kiosk/kiosk-provider.ts`, especially direct `smartRequest` embedding, `#r=` pointer URLs, `submitTo.backend: "instantdb"`, ES256 compact JWS, and the P-256/HKDF/AES-GCM request envelope.
- It keeps the relay untrusted and restricts the QR to a pointer, matching the active tests that assert the QR and stored encrypted request do not expose request clinical text or profile strings.
- It separates wrapper signing/encryption from §7 trust layers and §8 same-device validation, avoiding overclaiming requester identity or clinical-source provenance.

### Caveats and open issues

- The active code uses demo constants for `iss` and `aud` (`smart-health-checkin-demo-creator` and `smart-health-checkin-demo-submission-service`). The canonical spec should decide whether to standardize only field semantics and leave values deployment-defined, or to define registered production value patterns.
- The active code names the wrapper encryption suite `ECDH-P256+HKDF-SHA256+AES-GCM` and `A256GCM` rather than a standard JOSE/JWE or HPKE suite name. This draft preserves that identifier but flags the distinction from §8 HPKE.
- The canonicalization rule is implementation-derived (`JSON.stringify` after lexicographic object-key sorting). Canonical text should decide whether that is normative for interoperable JWS verification or whether future fixture work should choose a referenced canonical JSON scheme.
- The request envelope is encrypted to a Submission service private key in the demo, meaning the phone/resolution component has access to that private key in the static demo configuration. Production architecture and key custody need clearer treatment in T4.B/T4.C or security considerations.
- The active provider currently stores the encrypted request row with `requestId` and `encryptedRequest`; provider authorization, single-use semantics, deletion, rate limiting, and abuse controls are mostly deferred.
- `constraints.maxPlaintextBytes` is included in the request payload but primarily affects later response submission. This draft mentions it because it is active request metadata, while leaving detailed enforcement to §9.8.

### Downstream dependencies

- T4.B (§9.7) must specify pointer fetch, decryption, JWS verification, trusted creator key selection, `requestId` binding among URL/envelope/payload/provider row, expiration checks, `submitTo` provider checks, and re-entry into §8 using `smartRequest`.
- T4.C (§§9.8-9.12) must specify response-submission plaintext and ciphertext, desktop private-key handling, Completion display validation, replay controls, provider abstraction, size limits, deletion/retention, and completion UX.
- T4.D should align kiosk CDDL/fixture material with this field set, content type, JWS `typ`, request-envelope cryptographic inputs, and pointer format.
- T5 security and privacy sections should revisit QR substitution, pointer guessing, relay metadata, creator-key trust, demo key material, request expiration, logging, and production key custody.
