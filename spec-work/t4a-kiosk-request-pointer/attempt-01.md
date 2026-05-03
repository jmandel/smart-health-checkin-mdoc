## 9. Cross-device kiosk flow

The cross-device kiosk flow is a wrapper around the same-device presentation flow defined in §8. It lets a desktop, kiosk, tablet, or staff workstation create a SMART request, publish an encrypted request object through an untrusted transport provider, and display a small pointer URL for the Holder's phone. The phone-resolution, same-device re-entry, encrypted response submission, and desktop completion steps are specified in later §9 subsections.

### 9.1 Goals

The kiosk wrapper has the following goals:

1. **Desktop initiation with phone-side presentation.** A Kiosk creator can initiate check-in on a desktop or kiosk that cannot directly invoke the Holder's Wallet, while the Holder uses a phone that can run the §8 same-device `org-iso-mdoc` flow.
2. **No second clinical protocol.** The clinical request remains the `SmartHealthCheckinRequest` defined in §5, and the clinical response remains the `SmartHealthCheckinResponse` defined in §6. A kiosk request payload embeds the SMART request directly as `smartRequest`; it does not wrap it in a request profile, preset label, demo selector, or kiosk-specific clinical request language.
3. **Untrusted relay.** The Submission service or relay stores and routes opaque request state and later opaque submission state. It is not trusted with plaintext SMART requests, plaintext SMART responses, raw FHIR content, SMART Health Cards, Holder choices, or Wallet output.
4. **Pointer-only QR.** The QR code or equivalent handoff carries only a pointer sufficient to locate the encrypted kiosk request. It does not carry the plaintext SMART request, FHIR data, response encryption plaintext, response material, or same-device `DeviceRequest` bytes.
5. **Re-entry into §8.** After resolving and validating the kiosk request, the Phone presenter uses the embedded `smartRequest` as the request input for the same-device presentation flow on the phone. The mechanics of this re-entry are specified in §9.7.
6. **Small, fresh, bounded requests.** Kiosk requests are short-lived and correlate one kiosk session with one phone-side resolution attempt or bounded set of attempts. Implementations SHOULD use short expiration intervals appropriate for front-desk workflows; the active implementation uses approximately ten minutes.

A Kiosk creator that conforms to this section SHALL create a signed kiosk request payload as defined in §9.4, encrypt it into an `EncryptedKioskRequest` as defined in §9.5, and publish only a pointer URL as defined in §9.6 for phone pickup.

### 9.2 Roles

The kiosk flow uses the general roles from §§1 and 3, with the following kiosk-specific components:

* **Kiosk creator.** The desktop, kiosk, or server-side component that creates the SMART request, embeds it directly as `smartRequest`, signs the kiosk payload, encrypts the request envelope, stores it with the transport provider, and displays the Pointer URL. The Kiosk creator can be part of the Requester/Verifier system, but the signature on the kiosk payload is a wrapper signature and not clinical-source provenance for returned Artifacts.
* **Submission service / relay.** The untrusted provider that stores or makes available encrypted kiosk request rows and, in later §9.8, encrypted submission rows or blobs. It MAY route by request identifier and provider-specific application id. It SHALL NOT be required to see plaintext clinical content, and a conforming deployment SHALL NOT rely on the relay's access control as the only protection for the SMART request or SMART response.
* **Phone presenter.** The phone-side component that reads the Pointer URL, fetches the encrypted kiosk request, decrypts and verifies it, checks pointer binding, and then invokes or participates in the §8 same-device flow for the embedded `smartRequest`. The exact resolution and re-entry checks are specified in §9.7.
* **Completion display.** The kiosk-side or desktop component that waits for later encrypted submission state and displays completion status. This section defines request creation fields that are needed to correlate that later completion, but §9.8 and §9.9 define submission encryption and completion processing.
* **Requester / Verifier.** The Requester constructs the transport-neutral SMART request and consumes the SMART response. The Verifier is the presentation-transport component that performs §8 validation after same-device presentation. In a kiosk deployment these can be components of the same check-in application.
* **Wallet / Responder.** The Holder-controlled software invoked on the phone through the §8 same-device flow. It reviews the embedded SMART request with the Holder, constructs the SMART response, and returns it through the selected presentation flow.
* **Holder.** The person controlling whether information is shared. The Holder's phone is the intended place for Wallet-mediated review and response construction in the kiosk flow.

Trust boundaries remain layered. The Kiosk creator signature authenticates the kiosk wrapper according to deployment trust policy; it does not authenticate requester identity through `purpose`, `items[].title`, or other SMART request display fields. Kiosk wrapper encryption protects the request while it is stored or relayed; it does not prove issuer trust, device-key possession, or clinical provenance for response Artifacts. The §7 trust layers and §8 validation requirements continue to apply when the phone re-enters same-device presentation.

### 9.3 Cryptographic suite for the wrapper

The version 1.0 kiosk wrapper uses the following active cryptographic suite for request creation and pointer transport:

* The Kiosk creator signs the `KioskRequestPayload` as a compact JWS with protected header `alg` equal to `ES256`, `kid` identifying the creator signing key, and `typ` equal to `smart-health-checkin+kiosk-request+jws`.
* The signed JWS payload is the canonical JSON serialization of the `KioskRequestPayload` object. The active implementation canonicalizes JSON by recursively sorting object member names and omitting members whose value is `undefined` before UTF-8 encoding the protected header and payload.
* The encrypted request envelope uses the active algorithm label `ECDH-P256+HKDF-SHA256+AES-GCM`, with P-256 ECDH, HKDF using SHA-256, an AES-GCM content-encryption key of 256 bits, and envelope `enc` value `A256GCM`.
* Request encryption uses a freshly generated P-256 ephemeral ECDH key pair, derives a key with salt equal to the UTF-8 `requestId`, and uses HKDF `info` equal to the UTF-8 string `smart-health-checkin-kiosk-request-v1`.
* AES-GCM request encryption uses a fresh 96-bit IV. The additional authenticated data (AAD) is the UTF-8 `requestId`.
* The later response-submission channel uses the same active algorithm label, salt convention, and AAD convention with HKDF `info` equal to `smart-health-checkin-kiosk-response-v1`; §9.8 defines that channel.

A conforming Kiosk creator SHALL use the JWS `typ`, algorithm labels, salt, info, and AAD conventions above unless a later registered version explicitly defines another suite. A Phone presenter or request-opening component SHALL reject a kiosk request whose JWS header, envelope algorithm fields, content type, or request-id binding is not supported by the implementation and deployment policy.

### 9.4 `KioskRequestPayload` JWS body

A `KioskRequestPayload` is the signed JSON object that carries kiosk wrapper metadata and the embedded SMART request. It has this version 1 shape:

```json
{
  "v": 1,
  "iss": "<kiosk-creator-issuer>",
  "aud": "<request-recipient-audience>",
  "requestId": "<opaque-kiosk-request-pointer-id>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
  "submitTo": {
    "backend": "instantdb",
    "appId": "<transport-provider-application-id>"
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
    "keyId": "<request-decryption-key-id>"
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

The example is illustrative. It uses a US Core profile selector consistent with §5 and does not define required clinical content.

A `KioskRequestPayload` SHALL contain these members:

| Member | Requirement |
| --- | --- |
| `v` | Version number. For this specification it SHALL be `1`. |
| `iss` | Kiosk-creator issuer identifier interpreted by deployment trust policy. It SHALL NOT be treated as clinical-source provenance or as a substitute for §8 reader or origin trust. |
| `aud` | Audience for the request-opening or relay integration. A resolver SHALL reject an audience it is not configured to accept. |
| `requestId` | Opaque kiosk request identifier used by the Pointer URL, encrypted envelope, relay row, and later submission correlation. It is distinct from `smartRequest.id`. |
| `createdAt` | Creation time as milliseconds since the Unix epoch in the active implementation. A resolver SHOULD reject values unreasonably in the future. |
| `expiresAt` | Expiration time as milliseconds since the Unix epoch in the active implementation. A resolver SHALL reject an expired kiosk request. |
| `submitTo` | Transport-provider descriptor. The active provider shape is `{ "backend": "instantdb", "appId": "..." }`. A resolver SHALL reject unsupported backends or mismatched provider application ids. |
| `smartRequest` | The complete `SmartHealthCheckinRequest` JSON object from §5. It SHALL be embedded directly. A Kiosk creator SHALL NOT replace it with a preset id, request profile wrapper, label such as “all of the above”, IPS example wrapper, or alternate kiosk clinical request model. |
| `encryptRequestTo` | Request-envelope encryption metadata. Its `alg` SHALL match the active request-envelope algorithm label, and `keyId` identifies the request-decryption recipient key. |
| `encryptResponseTo` | Public encryption metadata for the later phone-to-desktop submission channel. This section only records the field because it is signed with the request; §9.8 defines response-submission encryption. |
| `constraints` | Processing constraints signed by the Kiosk creator. The active field is `maxPlaintextBytes`, used by the later submission channel. Implementations SHALL NOT accept a value above their configured maximum. |
| `minter` | Metadata identifying the creator signing key. The active field is `keyId`, which SHOULD match or be consistent with the JWS protected-header `kid`. |

A Kiosk creator SHALL sign the complete payload with the compact JWS header defined in §9.3. A resolver SHALL validate the embedded `smartRequest` according to §5 before using it for same-device re-entry. The `smartRequest.id` remains the clinical request identifier used by the SMART response `requestId`; the kiosk `requestId` remains the wrapper pointer and relay correlation identifier.

### 9.5 `EncryptedKioskRequest` envelope

An `EncryptedKioskRequest` is the JSON envelope stored by the Submission service or relay for pickup by the Phone presenter. It contains encrypted compact JWS bytes and the metadata needed to open them; it does not contain the plaintext `KioskRequestPayload` or plaintext `smartRequest`.

The active envelope shape is:

```json
{
  "v": 1,
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc": "A256GCM",
  "contentType": "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId": "<opaque-kiosk-request-pointer-id>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
  "creatorKeyId": "<creator-signing-key-id>",
  "recipientKeyId": "<request-decryption-key-id>",
  "iv": "<base64url-96-bit-iv>",
  "ciphertext": "<base64url-aes-gcm-ciphertext>",
  "ephemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

A Kiosk creator SHALL encrypt the compact JWS, not the unsigned payload alone. The `ciphertext`, `iv`, and JWK coordinate values SHALL be encoded using base64url without padding where they are string-encoded by this envelope. The `contentType` SHALL be `application/smart-health-checkin-kiosk-request+jws+aesgcm` for this version of the envelope.

The relay MAY index or route by `requestId`, `createdAt`, `expiresAt`, `creatorKeyId`, `recipientKeyId`, provider row id, or provider-specific application id. The relay SHALL NOT need access to the plaintext JWS or embedded SMART request to perform routing. Implementations SHOULD minimize metadata visible to the relay and logs, because even pointer identifiers, timing, provider app ids, creator key ids, and row ids can be correlating metadata.

A request opener SHALL reject an `EncryptedKioskRequest` when the envelope version, `alg`, `enc`, `contentType`, required fields, expiration, or supported recipient key do not match its policy. After decryption it SHALL verify the creator JWS and SHALL require the decrypted signed payload `requestId` to equal the envelope `requestId`. Pointer-to-payload binding for the phone resolution step is completed in §9.7.

The encrypted response-submission blob and its row metadata are not `EncryptedKioskRequest` objects and are specified later in §9.8.

### 9.6 QR / pointer URL

The QR code or equivalent cross-device handoff carries a Pointer URL. The active Pointer URL format places the kiosk `requestId` in the URL fragment parameter `r`:

```text
https://requester.example/checkin/submit.html#r=<url-encoded-kiosk-request-id>
```

A Kiosk creator SHALL construct the Pointer URL so that the phone can identify the phone-side resolution endpoint and the opaque kiosk `requestId`. In the active implementation, only the fragment parameter `r` is parsed as the kiosk pointer. A Phone presenter SHALL reject a Pointer URL that lacks the required pointer parameter for the supported format.

The Pointer URL and QR code SHALL NOT contain any of the following:

* the plaintext `smartRequest`;
* FHIR resources, SMART Health Cards, QuestionnaireResponse content, or other Holder clinical data;
* a SMART response or response-submission ciphertext;
* the compact kiosk request JWS;
* the `EncryptedKioskRequest` ciphertext;
* same-device `DeviceRequest`, `encryptionInfo`, `SessionTranscript`, HPKE ciphertext, or Wallet response bytes; or
* private keys, shared secrets, or bearer credentials that would let the relay or a QR observer decrypt clinical content.

The Pointer URL MAY contain routing information inherent in the URL itself, such as host, path, and the `requestId` fragment parameter. Implementations SHOULD keep the pointer short enough for reliable QR scanning, SHOULD use high-entropy unguessable `requestId` values, SHOULD use short expirations, and SHOULD display or refresh the QR only for the active kiosk session. A relay or HTTP server might observe the URL origin, path, timing, IP metadata, and any non-fragment components; implementations SHOULD avoid putting sensitive correlation data outside the fragment unless the deployment explicitly accepts that exposure.

The Pointer URL identifies where the phone starts §9.7 resolution. It is not a clinical request, not Holder consent, not proof of requester identity, not proof of freshness by itself, and not a response submission channel.

## Organizer notes

### Strengths

* Preserves the central invariant that kiosk is a wrapper around §§5, 6, and 8, not a second clinical protocol.
* Aligns field names and algorithms with active TypeScript evidence: `KioskRequestPayload`, direct `smartRequest`, compact ES256 JWS, `EncryptedKioskRequest`, `#r=`, `submitTo.backend: "instantdb"`, and the active ECDH/HKDF/AES-GCM labels.
* Keeps the QR pointer-only and explicitly excludes plaintext SMART request, FHIR content, response material, legacy same-device request bytes, and private keying material.
* Separates kiosk wrapper signatures/encryption from T3 trust layers and clinical-source provenance.

### Caveats and open issues

* The active demo names the request-encryption recipient as the “submission service” key, and the phone demo has access to the corresponding private key. A deployable spec should clarify the production key-holder model so the untrusted relay never obtains request-decryption private keys. This draft phrases the field as a request-decryption recipient while preserving the active field names.
* The active `iss` and `aud` constants are demo-specific strings. This draft treats them as deployment-policy identifiers rather than fixed production values.
* The active compact JWS implementation uses a local sorted-key canonical JSON function, not a named RFC canonicalization scheme. Later canonicalization work should decide whether to normatively reference a standard canonical JSON profile or precisely specify the current behavior.
* An older SDK helper (`KioskSessionDescriptor`) can place `deviceRequest` and `encryptionInfo` in a URL fragment. That appears inconsistent with the current pointer-only kiosk wrapper and with this T4.A cutpoint. It should be treated as legacy or separate implementation evidence unless later organizers intentionally revive it.
* `encryptResponseTo` and `constraints.maxPlaintextBytes` are signed in the active request payload but their full semantics belong to §9.8/T4.C. This draft includes them only enough to keep the signed shape accurate.

### Downstream dependencies

* T4.B must specify pointer fetch, envelope decryption, creator JWS verification, `requestId` binding among URL, relay row, envelope, and signed payload, and same-device §8 invocation for `smartRequest`.
* T4.C must specify encrypted submission plaintext, response encryption to `encryptResponseTo.desktopPublicKeyJwk`, completion display processing, replay handling, and provider abstraction without weakening the untrusted-relay model.
* T4.D should add CDDL/schema and fixtures for the JWS payload, encrypted request envelope, and pointer URL after T4.A through T4.C are reconciled.
* T5 security and privacy sections should revisit relay metadata, QR substitution, short TTLs, request-id entropy, creator key trust, canonicalization, logging, and production separation from demo keys.
