## 9. Cross-device kiosk flow

The cross-device kiosk flow is a wrapper around the same-device presentation flow defined in §8. It lets a desktop, kiosk, shared tablet, staff workstation, or server-side Requester component create a SMART request, publish encrypted request state through an untrusted transport provider, and display a small Pointer URL for the Holder's phone. The phone later resolves the pointer, validates the wrapper, and re-enters §8 with the embedded SMART request; those resolution and re-entry steps are defined in §9.7. Response submission, desktop completion, replay handling, and provider abstraction are defined in later §9 subsections.

### 9.1 Goals

The kiosk request-and-pointer wrapper has these goals:

1. **Desktop or kiosk initiation with phone-side presentation.** A Kiosk creator can start a check-in interaction on a device that cannot directly invoke the Holder's Wallet, while Holder review and Wallet/Responder interaction occur on the Holder's phone.
2. **One clinical protocol.** The wrapper carries the same transport-neutral `SmartHealthCheckinRequest` defined in §5 and expects the same `SmartHealthCheckinResponse` defined in §6. The kiosk wrapper does not define a second clinical request language, response model, profile label, or preset vocabulary.
3. **Direct SMART request embedding.** A Kiosk creator SHALL embed the SMART request object directly as `smartRequest` in the signed kiosk request payload. A Kiosk creator SHALL NOT replace `smartRequest` with a demo preset id, request-profile wrapper, profile label, broad shortcut label, example shortcut, SDK helper object, or other alternate wrapper.
4. **Untrusted relay.** The Submission service or relay can store, route, and return opaque request state and later opaque submission state. It is not trusted with plaintext SMART requests, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder choices, Wallet output, or clinical trust decisions.
5. **Pointer-only QR.** The QR code or equivalent handoff carries only pointer and routing material sufficient to locate the encrypted kiosk request. Large or sensitive request state remains in the encrypted request envelope, not in the QR.
6. **Preparation for phone re-entry into §8.** The signed and encrypted request artifacts defined here provide the fields that §9.7 uses to retrieve, open, verify, and bind the kiosk request before running the same-device `org-iso-mdoc` flow on the phone.

A Kiosk creator that implements this flow SHALL create a signed `KioskRequestPayload` as defined in §9.4, encrypt the compact request JWS into an `EncryptedKioskRequest` as defined in §9.5, publish the encrypted request through a Submission service or equivalent provider, and display or otherwise convey only a Pointer URL as defined in §9.6.

### 9.2 Roles and trust boundaries

The role definitions in §§1 and 3 apply. This subsection specializes them for kiosk request creation and pointer transport. A deployment can combine roles in one product, but it still preserves the protocol trust boundaries described here.

**Requester / Verifier.** The Requester determines the bounded check-in need, constructs the SMART request under §5, and later consumes the SMART response under §6. The Verifier performs presentation-transport validation under §8 after the phone re-enters the same-device flow. In a kiosk deployment, the same application often acts as Requester, Verifier, Kiosk creator, and Completion display, but the roles remain distinct.

**Kiosk creator.** The Kiosk creator starts a kiosk session. It constructs or receives a conforming SMART request, generates a fresh kiosk wrapper `requestId`, signs a `KioskRequestPayload`, encrypts the resulting compact JWS into an `EncryptedKioskRequest`, publishes that encrypted request through a Submission service or provider, and displays a Pointer URL. The Kiosk creator's wrapper signature authenticates the kiosk wrapper under deployment policy; it does not by itself prove clinical-source provenance for later returned Artifacts and does not turn SMART request display fields into authenticated requester identity.

**Submission service / relay.** The Submission service is an untrusted transport provider. For §9.1-§9.6, it stores or serves an `EncryptedKioskRequest` by `requestId` or equivalent provider routing key. It MAY enforce access-control, row-shape, size, rate-limit, anti-enumeration, cleanup, or coarse expiration controls as defense in depth. A conforming deployment SHALL NOT require the Submission service to see plaintext `KioskRequestPayload` or plaintext `smartRequest` in order to route the request, and SHALL NOT rely on relay access control as the only protection for clinical content.

**Phone presenter.** The Phone presenter is the phone-side web page or app opened by the Pointer URL. This section defines the request and pointer artifacts it consumes. Section 9.7 defines pointer resolution, request retrieval, request-envelope decryption, creator-JWS verification, pointer binding, SMART request validation, and same-device re-entry.

**Wallet / Responder.** The Wallet/Responder is the Holder-controlled software invoked through the phone-local §8 same-device flow after kiosk request validation. It processes the embedded `smartRequest`, supports Holder review according to Wallet policy, and constructs the SMART response under §6. The Wallet/Responder does not process the QR code or relay row as a clinical request.

**Holder.** The Holder scans or opens the Pointer URL and controls disclosure through the Wallet/Responder. Scanning the QR code is not Holder consent and does not by itself authorize disclosure.

**Completion display.** The Completion display is the kiosk-side or desktop component that later receives notification of encrypted submission state and displays completion status. This cutpoint includes response-encryption metadata in the signed request because active request creation signs that metadata; §9.8 and §9.9 define response-submission encryption and completion processing.

Trust layers remain separate. Kiosk wrapper signatures and request-envelope encryption protect wrapper state and relay confidentiality. They do not replace §7 origin trust, reader/Verifier trust, mdoc issuer/device trust, clinical-source trust, §8 validation, or §6 response validation. A Wallet/Responder, Phone presenter, Verifier, or Requester SHALL NOT treat `purpose`, item `title`, item `summary`, selector values, pointer metadata, relay URLs, or provider application ids as authenticated requester identity merely because the kiosk wrapper verifies.

### 9.3 Cryptographic suite for the kiosk wrapper

Version 1.0 of the kiosk request wrapper uses fixed algorithm identifiers for the active profile rather than in-band negotiation.

A Kiosk creator SHALL sign the `KioskRequestPayload` as a compact JWS whose protected header contains:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

The compact JWS payload is the `KioskRequestPayload` JSON object defined in §9.4. For this profile, the JWS signing input uses base64url without padding over deterministic JSON for the protected header and payload. The active deterministic JSON rule recursively sorts object member names lexicographically, omits members whose value is `undefined`, preserves array order, and serializes with JSON stringification before UTF-8 encoding. This rule applies to the kiosk-wrapper JWS input only; it does not define canonical JSON for the transport-neutral SMART request or SMART response outside this wrapper.

A Kiosk creator SHALL encrypt the compact request JWS into an `EncryptedKioskRequest` using the request-envelope suite labeled:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite:

- the sender generates a fresh ephemeral ECDH P-256 key pair for each encrypted request envelope;
- the recipient public key is the request-opening P-256 key identified by `KioskRequestPayload.encryptRequestTo.keyId` and by `EncryptedKioskRequest.recipientKeyId`;
- the ECDH shared secret is input to HKDF with SHA-256;
- the HKDF salt is `utf8(requestId)`;
- the HKDF `info` string for request-envelope encryption is `utf8("smart-health-checkin-kiosk-request-v1")`;
- the derived content-encryption key is AES-GCM with a 256-bit key;
- the AES-GCM IV is 96 bits and fresh for the encrypted envelope;
- AES-GCM additional authenticated data is `utf8(requestId)`; and
- the plaintext is the compact kiosk request JWS encoded as UTF-8 text.

The encrypted request envelope declares `enc: "A256GCM"` and `contentType: "application/smart-health-checkin-kiosk-request+jws+aesgcm"` for this profile.

A Kiosk creator SHALL NOT publish the compact request JWS in plaintext through the relay or in the Pointer URL. A deployment that treats the Submission service as untrusted SHALL keep any private key capable of opening `EncryptedKioskRequest` objects out of the untrusted relay's control. Checked-in or browser-delivered demo private key material is demonstration behavior only and is not a production key-management pattern.

The signed request payload also contains `encryptResponseTo` metadata for the later phone-to-desktop submission leg. This section defines that field only as signed request metadata. Section 9.8 defines response-submission ciphertext and any response-encryption processing rules.

### 9.4 `KioskRequestPayload` JWS body

`KioskRequestPayload` is the signed JSON object created by the Kiosk creator. It binds kiosk routing and wrapper cryptographic metadata to one embedded SMART request.

A version 1 `KioskRequestPayload` has this logical shape:

```json
{
  "v": 1,
  "iss": "<kiosk-creator-issuer>",
  "aud": "<request-opening-audience>",
  "requestId": "<unguessable-kiosk-request-id>",
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
    "keyId": "<request-opening-recipient-key-id>"
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

The example is illustrative. It uses an exact US Core profile selector consistent with §5. It does not define required clinical content, fixed issuer values, fixed provider identifiers, fixed SMART request ids, or production key identifiers.

A Kiosk creator SHALL include these members in the signed payload:

| Member | Requirement |
| --- | --- |
| `v` | Kiosk payload version. For this profile, a Kiosk creator SHALL set `v` to numeric `1`. |
| `iss` | Kiosk-creator issuer or creator-key-domain identifier interpreted by deployment trust policy. It is wrapper metadata, not clinical-source provenance and not authenticated requester identity by itself. |
| `aud` | Audience identifier for the request-opening or provider trust context. Deployments define accepted audience values and validation policy. |
| `requestId` | Opaque high-entropy kiosk wrapper identifier used for the Pointer URL, provider lookup, encrypted envelope binding, and later kiosk-session correlation. It is distinct from `smartRequest.id`. |
| `createdAt` | Creation time. The active implementation encodes this as a JSON number containing milliseconds since the Unix epoch. |
| `expiresAt` | Expiration time. The active implementation encodes this as a JSON number containing milliseconds since the Unix epoch. |
| `submitTo` | Transport-provider descriptor. The active provider shape is `{ "backend": "instantdb", "appId": "..." }`. |
| `smartRequest` | The complete `SmartHealthCheckinRequest` JSON object defined in §5, embedded directly. |
| `encryptRequestTo` | Request-envelope recipient metadata. For this profile, `alg` is `ECDH-P256+HKDF-SHA256+AES-GCM`, and `keyId` identifies the request-opening recipient public key selected by the Kiosk creator. |
| `encryptResponseTo` | Public response-submission encryption metadata signed with the request. The active shape contains `alg` and `desktopPublicKeyJwk`; §9.8 defines how it is used. |
| `constraints` | Signed processing constraints. The active field is `maxPlaintextBytes`, used by later response submission; §9.8 defines enforcement. |
| `minter` | Creator metadata. The active field is `keyId`, which identifies the creator signing key and is expected to match or be consistent with the JWS protected-header `kid` under deployment policy. |

A Kiosk creator SHALL set `smartRequest` to a JSON object conforming to §5 before signing the kiosk payload. The `smartRequest` member SHALL be the clinical request itself. A Kiosk creator SHALL NOT put kiosk pointer, relay, completion, encryption, requester-identity, trust, callback, logo, origin, package, or provider metadata inside `smartRequest`.

The kiosk wrapper `requestId` and the embedded SMART request `smartRequest.id` are different identifiers. The wrapper `requestId` routes and binds kiosk wrapper state. The SMART request `id` is the clinical request identifier that the SMART response later echoes as `SmartHealthCheckinResponse.requestId` under §6. A Kiosk creator, Phone presenter, Completion display, or Verifier SHALL NOT substitute one identifier for the other.

A Kiosk creator SHOULD generate `requestId` with enough entropy to resist guessing during the request lifetime and within the relay namespace. The active implementation uses 32 random bytes encoded as base64url without padding. A Kiosk creator SHALL set `expiresAt` later than `createdAt` and SHOULD use a short lifetime suitable for an in-person kiosk session. The active implementation uses a ten-minute lifetime.

### 9.5 `EncryptedKioskRequest` envelope

`EncryptedKioskRequest` is the JSON envelope stored or served by the Submission service for request pickup. Its plaintext is the compact kiosk request JWS from §9.4. The relay sees routing and cryptographic metadata plus ciphertext; it does not see the plaintext `KioskRequestPayload` or embedded `smartRequest` unless it has access to request-opening private key material, which a conforming untrusted-relay deployment does not provide.

A version 1 `EncryptedKioskRequest` has this logical shape:

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
  "recipientKeyId": "<request-opening-recipient-key-id>",
  "iv": "<base64url-96-bit-iv>",
  "ciphertext": "<base64url-aes-gcm-ciphertext-and-tag>",
  "ephemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

A Kiosk creator SHALL set `v` to `1`, `alg` to `ECDH-P256+HKDF-SHA256+AES-GCM`, `enc` to `A256GCM`, and `contentType` to `application/smart-health-checkin-kiosk-request+jws+aesgcm` for this profile.

A Kiosk creator SHALL set envelope `requestId`, `createdAt`, and `expiresAt` to the corresponding signed payload values. A Kiosk creator SHALL set `creatorKeyId` from the JWS protected-header `kid` and `recipientKeyId` from `KioskRequestPayload.encryptRequestTo.keyId`.

A Kiosk creator SHALL encrypt the compact JWS, not the unsigned payload alone and not the raw `smartRequest` alone. A Kiosk creator SHALL use the §9.3 request-envelope construction with `salt = utf8(requestId)`, `info = utf8("smart-health-checkin-kiosk-request-v1")`, and AES-GCM `additionalData = utf8(requestId)`. The `iv` and `ciphertext` string fields SHALL use base64url without padding. The `ciphertext` value is the AES-GCM ciphertext including the authentication tag over the compact JWS plaintext.

A Submission service MAY index, route, or clean up by `requestId`, provider row id, provider application id, `createdAt`, `expiresAt`, `creatorKeyId`, `recipientKeyId`, content type, or envelope size. It SHOULD minimize retained metadata, logs, analytics, and indexes because pointer values, key ids, provider ids, timing, IP addresses, and access patterns can be sensitive even when clinical content remains encrypted.

A relay request row for this envelope SHOULD contain only the lookup key and encrypted envelope unless the provider needs additional operational metadata. The active InstantDB provider request row is equivalent to:

```json
{
  "requestId": "<unguessable-kiosk-request-id>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

The encrypted request envelope defined here is request-publication state only. It is not the phone-to-desktop response-submission ciphertext, storage blob, submission row, completion result, or same-device `DeviceResponse`; those artifacts are defined later.

### 9.6 QR / pointer URL

The Pointer URL is the short cross-device handoff value displayed by the kiosk, commonly as a QR code. It identifies the phone-side entry point and the stored encrypted kiosk request. It does not carry the signed request payload or encrypted request payload inline.

For the active profile, the Pointer URL format places the kiosk wrapper `requestId` in URL fragment parameter `r`:

```text
https://clinic.example/verifier/submit.html#r=<url-encoded-kiosk-requestId>
```

A Kiosk creator using this pointer format SHALL set fragment parameter `r` to the same wrapper `requestId` used in the signed payload, encrypted envelope, and provider lookup row. A Phone presenter that supports this pointer format will parse `r` in §9.7; absence of `r` is a missing kiosk request pointer for that format.

A Pointer URL or QR code for this profile SHALL NOT contain:

- the plaintext `smartRequest`;
- FHIR resources, SMART Health Cards, Questionnaire answers, QuestionnaireResponse content, or other Holder clinical data;
- the compact kiosk request JWS;
- the `EncryptedKioskRequest` object or ciphertext itself;
- same-device §8 `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, HPKE ciphertext, `DeviceResponse`, `dcapiResponse`, or Wallet response bytes;
- a SMART response, response-submission ciphertext, completion result, or submission storage blob;
- private keys, shared secrets, bearer credentials, request-opening private key material, desktop private key material, or Wallet secrets; or
- requester identity or trust assertions intended to bypass §7 trust processing, §8 validation, or Wallet policy.

A Pointer URL MAY contain routing information inherent in a normal URL, such as scheme, host, port, path, and the `r` fragment parameter. The fragment form reduces routine server-log exposure by the web origin serving the phone page because URL fragments are not sent in ordinary HTTP requests, but the complete URL and QR image remain visible to cameras, screen observers, browser history, local scripts, screenshots, and analytics running in the phone page.

A Kiosk creator SHOULD keep the Pointer URL short enough for reliable scanning under expected kiosk display size, distance, lighting, camera, and error-correction conditions. A Kiosk creator SHOULD display or refresh the QR only for the active kiosk session and SHOULD stop displaying it after expiration, abandonment, or successful completion subject to the replay and completion rules defined later.

The Pointer URL is routing metadata and a bearer locator for encrypted request state. Possession of the Pointer URL does not prove Holder consent, Wallet approval, requester authenticity, clinical-source provenance, request freshness by itself, or authorization to consume returned clinical content. Section 9.7 binds the pointer `requestId` to the retrieved, decrypted, and verified payload before same-device re-entry.
