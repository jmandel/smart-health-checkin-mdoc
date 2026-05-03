## 9. Cross-device kiosk flow

The kiosk flow builds on the same-device presentation flow defined in §8. It is a wrapper for cases where the Requester starts on a kiosk, shared desktop, or front-desk device but Holder review and Wallet invocation happen on the Holder's phone. The wrapper protects and routes the same transport-neutral SMART request and SMART response objects defined in §§5-6; it does not define a second clinical protocol.

This cutpoint defines kiosk request creation, the signed request payload, the encrypted request envelope stored by the relay, and the pointer URL. Phone resolution, re-entry into §8, response submission, Completion display processing, replay handling, and provider abstraction are completed by later §9 subsections.

### 9.1 Goals

The kiosk wrapper has these goals:

1. **Desktop staff initiation; phone-side presentation.** A Kiosk creator can create a check-in SMART request on a desktop, kiosk, tablet, or staff workstation and hand a Holder a Pointer URL that the Holder opens on a phone. The phone later uses the embedded SMART request to re-enter the same-device presentation flow defined in §8.
2. **Preserve clinical protocol semantics.** The kiosk wrapper carries the same `SmartHealthCheckinRequest` defined in §5 and expects the same `SmartHealthCheckinResponse` defined in §6. A Kiosk creator SHALL embed the SMART request directly as `smartRequest` in the kiosk request payload. A Kiosk creator SHALL NOT replace `smartRequest` with a demo preset, preset id, request-profile label, request-label wrapper, SDK helper object, or kiosk-specific clinical request model.
3. **Treat the Submission service as untrusted.** The relay or provider can store and route encrypted state, but it is not trusted with plaintext clinical content and is not the clinical Requester merely because it relays bytes.
4. **Keep QR codes small and pointer-only.** A Pointer URL identifies where to retrieve protected kiosk request state. It is not a carrier for the SMART request, FHIR data, Wallet response material, desktop private keys, or response-submission ciphertext.
5. **Support later phone re-entry.** The request payload includes the metadata needed for a Phone presenter, in §9.7, to resolve the pointer, verify and open the kiosk request, and then run §8 locally on the phone for the embedded `smartRequest`.

### 9.2 Roles

The role definitions in §3 apply. This subsection specializes them for kiosk request creation and pointer transport.

**Kiosk creator.** The Kiosk creator is the component that starts a kiosk session. It constructs a conforming SMART request under §5, creates a per-session kiosk wrapper request, signs the `KioskRequestPayload`, encrypts the resulting compact JWS for the request recipient described by `encryptRequestTo`, publishes the `EncryptedKioskRequest` through a Submission service or equivalent provider, and displays or otherwise conveys a Pointer URL. A Kiosk creator MAY be part of the same product as the Requester/Verifier, but its wrapper signature is not a substitute for clinical-source provenance, requester identity, same-device reader authentication, or §8 mdoc validation.

**Submission service / relay.** The Submission service is an untrusted transport provider. For this cutpoint, it stores or serves an `EncryptedKioskRequest` indexed by `requestId` and exposes enough routing behavior for a Phone presenter to retrieve that encrypted envelope after scanning a Pointer URL. A Submission service MAY enforce access-control, shape, size, rate-limit, expiration, or anti-enumeration rules as defense in depth. A Submission service SHALL NOT be trusted to see, validate, rewrite, or attest to plaintext `smartRequest` content. In the active InstantDB provider, the request row shape is a lookup `requestId` and an `encryptedRequest` JSON value.

**Phone presenter.** The Phone presenter is the patient-phone component that later resolves the Pointer URL. In this cutpoint, the Pointer URL is prepared for the Phone presenter; §9.7 defines retrieval, decryption, creator-JWS verification, pointer binding, and same-device re-entry.

**Completion display.** The Completion display is the kiosk-side component that later waits for and processes an encrypted submission. In this cutpoint, the Kiosk creator includes response-encryption metadata needed by later submission processing, but §9.8-§9.9 define the submitted response ciphertext and completion behavior.

**Requester / Verifier.** The Requester creates the clinical SMART request and consumes the SMART response. The Verifier performs presentation-transport validation. In a kiosk deployment these roles can be co-located with the Kiosk creator and Completion display, but the wrapper fields defined here do not change the Requester and Verifier obligations in §§5-8.

**Wallet / Responder and Holder.** The Wallet/Responder and Holder are not directly invoked by the request-publishing steps in this cutpoint. They participate after the Phone presenter re-enters the same-device flow on the phone. Holder review remains at request-item granularity under §§5 and 8; the kiosk wrapper does not create consent by itself.

### 9.3 Cryptographic suite for the wrapper

The active wrapper uses JOSE signing for the request payload and browser-native P-256 ECDH, HKDF-SHA-256, and AES-GCM for request-envelope encryption. These wrapper algorithms protect kiosk routing and relay confidentiality. They do not replace §8 HPKE, mdoc issuer/device validation, reader authentication, or the trust-layer separation in §7.

A Kiosk creator that creates the version 1 kiosk request payload defined here SHALL sign the payload as a compact JWS with a protected header containing:

```json
{
  "alg": "ES256",
  "kid": "<creator-key-id>",
  "typ": "smart-health-checkin+kiosk-request+jws"
}
```

The JWS payload is the `KioskRequestPayload` JSON object in §9.4. The active implementation signs the UTF-8 bytes of a recursively key-sorted canonical JSON serialization of the protected header and payload, base64url-encoded without padding, using ECDSA P-256 with SHA-256. Implementations that claim interoperability with this version 1 wrapper SHALL use the same compact-JWS serialization and SHALL identify the creator verification key by the protected-header `kid`.

A Kiosk creator SHALL encrypt the compact request JWS into an `EncryptedKioskRequest` envelope using the request-encryption parameters in §9.5. The active request-encryption suite is named in the envelope as:

```text
ECDH-P256+HKDF-SHA256+AES-GCM
```

For this suite:

- the sender generates an ephemeral ECDH P-256 key pair;
- the recipient public key is the request-opening key identified by `encryptRequestTo.keyId`; active code names this a submission-service key, but the relay storage service is not trusted with the corresponding private key;
- the shared secret is derived with ECDH P-256;
- HKDF uses SHA-256, salt `utf8(requestId)`, and info `utf8("smart-health-checkin-kiosk-request-v1")`;
- the content-encryption key is AES-GCM with 256-bit key length;
- the IV is 96 bits;
- AES-GCM additional authenticated data is `utf8(requestId)`; and
- the plaintext is the compact kiosk request JWS as UTF-8 text.

The signed payload also carries `encryptResponseTo` metadata for the later phone-to-desktop submission encryption. This cutpoint names that field because it is part of the signed request contract; §9.8 defines response-submission ciphertext. Active code uses the same named P-256 ECDH + HKDF-SHA-256 + AES-GCM construction for response submission, with a different HKDF info string, `smart-health-checkin-kiosk-response-v1`.

### 9.4 `KioskRequestPayload` JWS body

`KioskRequestPayload` is the JSON object signed by the Kiosk creator. It binds one kiosk pointer to one embedded SMART request and to the transport and cryptographic metadata needed by later resolution and completion steps.

A Kiosk creator SHALL create a `KioskRequestPayload` with this shape for version 1:

```json
{
  "v": 1,
  "iss": "smart-health-checkin-demo-creator",
  "aud": "smart-health-checkin-demo-submission-service",
  "requestId": "<random-base64url-request-id>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
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

The values shown for `iss` and `aud` are the active demo values. They identify the current request-creator and submission-service audience used by the implementation; they are not clinical requester identity and are not a substitute for §7 trust processing. A production profile can register or constrain non-demo issuer and audience values, but it MUST preserve the field semantics defined here.

The fields have these meanings:

| Field | Meaning |
| --- | --- |
| `v` | Kiosk wrapper payload version. Version 1 payloads set this to numeric `1`. |
| `iss` | Kiosk-creator issuer string for the wrapper JWS. It identifies the wrapper-signing context, not clinical-source provenance. |
| `aud` | Intended request-opening or submission-service audience for the wrapper payload. |
| `requestId` | High-entropy opaque kiosk request pointer id. Active code generates 32 random bytes and encodes them as unpadded base64url. |
| `createdAt` | Creation time as milliseconds since the Unix epoch. |
| `expiresAt` | Expiration time as milliseconds since the Unix epoch. Active code uses a 10 minute lifetime. |
| `submitTo` | Transport-provider descriptor for retrieving the encrypted request and later routing submission state. Active code supports `{ "backend": "instantdb", "appId": "..." }`. |
| `smartRequest` | The complete SMART request object defined in §5. This member is the only clinical request carried by the kiosk payload. |
| `encryptRequestTo` | Request-envelope encryption algorithm name and request-opening recipient key identifier. Active code names this a submission-service key id; deployments that treat the relay as untrusted keep the corresponding private key out of the relay. |
| `encryptResponseTo` | Response-submission encryption algorithm name and the desktop public JWK used later by §9.8. |
| `constraints.maxPlaintextBytes` | Maximum plaintext size accepted for later encrypted submission plaintext. Active code uses 25 MiB. |
| `minter.keyId` | Kiosk-creator key id corresponding to the signing key. |

A Kiosk creator SHALL set `requestId` to an unpredictable value with enough entropy to resist guessing during the request lifetime. A Kiosk creator SHALL set `expiresAt` later than `createdAt` and SHOULD use a short lifetime appropriate for in-person kiosk use. Ten minutes is the active implementation value and is a reasonable default for an unattended QR display.

A Kiosk creator SHALL ensure `smartRequest` is a conforming `SmartHealthCheckinRequest` under §5 before signing the kiosk payload. The signed `smartRequest` SHALL be the SMART request itself. It SHALL NOT contain kiosk pointer, relay, completion, encryption, requester-identity, callback, logo, or organization metadata prohibited by §5.2.7.

A processor that verifies a version 1 `KioskRequestPayload` SHALL reject the payload if `v` is not `1`, if `expiresAt` is not in the future subject to local clock-skew policy, if `createdAt` is implausibly in the future under local policy, if `submitTo` does not name an expected provider, if `encryptRequestTo.alg` or `encryptResponseTo.alg` is unsupported, if `constraints.maxPlaintextBytes` exceeds the processor's supported limit, or if `smartRequest` is not valid under §5. Active code rejects `createdAt` more than 60 seconds in the future and rejects payload limits above 25 MiB.

### 9.5 `EncryptedKioskRequest` envelope

`EncryptedKioskRequest` is the encrypted request envelope published through the Submission service. It lets the relay route by `requestId` while keeping the signed kiosk payload and embedded `smartRequest` opaque to the relay.

A Kiosk creator SHALL publish an `EncryptedKioskRequest` with this version 1 shape:

```json
{
  "v": 1,
  "alg": "ECDH-P256+HKDF-SHA256+AES-GCM",
  "enc": "A256GCM",
  "contentType": "application/smart-health-checkin-kiosk-request+jws+aesgcm",
  "requestId": "<same-request-id-as-signed-payload>",
  "createdAt": 1760000000000,
  "expiresAt": 1760000600000,
  "creatorKeyId": "<creator-key-id>",
  "recipientKeyId": "<submission-service-key-id>",
  "iv": "<base64url-96-bit-iv>",
  "ciphertext": "<base64url-aes-gcm-ciphertext-and-tag>",
  "ephemeralPublicKeyJwk": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
}
```

A Kiosk creator SHALL set envelope `requestId`, `createdAt`, and `expiresAt` to the corresponding values in the signed payload. A Kiosk creator SHALL set `creatorKeyId` to the JWS protected-header `kid` and `recipientKeyId` to `KioskRequestPayload.encryptRequestTo.keyId`. The envelope `ciphertext` SHALL be the AES-GCM result over the compact request JWS plaintext using the construction in §9.3.

A Submission service SHALL be able to store and return the `EncryptedKioskRequest` by `requestId`. It MAY also store provider-specific row ids or indexes needed for operation. It SHOULD avoid storing duplicate plaintext metadata that is already present in the signed payload or encrypted envelope unless required for defense-in-depth rules, cleanup, or operations. In the active InstantDB provider, the request row stores only `requestId` and `encryptedRequest`.

The envelope intentionally exposes limited routing and cryptographic metadata: `requestId`, timestamps, key ids, algorithm labels, IV, ciphertext length, and ephemeral public key. The Submission service can observe those values, timing, access patterns, and request existence. It SHALL NOT receive the plaintext compact JWS, the plaintext `KioskRequestPayload`, or the embedded `smartRequest` as part of this request-publication step.

This subsection does not define phone-side opening requirements beyond the envelope shape and encryption inputs. §9.7 defines how the Phone presenter retrieves the envelope, opens it, verifies the creator JWS, validates expiration and provider expectations, and binds the decrypted `requestId` to the pointer.

### 9.6 QR / pointer URL

The QR code or other cross-device handoff carries a Pointer URL. The active pointer format places the kiosk request id in the URL fragment:

```text
https://<submit-page-origin>/<path>/submit.html#r=<url-encoded-requestId>
```

A Kiosk creator SHALL put only pointer and routing material in the Pointer URL. For the active version 1 format, the pointer parameter is `r` and its value is the `requestId`. A Pointer URL SHALL NOT contain the plaintext SMART request, a compact request JWS, an `EncryptedKioskRequest` object, FHIR resources, SMART Health Card JWS strings, Wallet response material, response-submission ciphertext, private keys, desktop private-key material, or Holder data.

A Kiosk creator SHALL ensure that the `requestId` in the Pointer URL identifies the same encrypted request row or provider object as the envelope `requestId` and the signed payload `requestId`. Later §9.7 requires the Phone presenter to verify these bindings after retrieval and decryption.

A Pointer URL SHOULD be short enough to scan reliably on commodity phones. Keeping the QR pointer-only improves scan reliability and limits data leakage from cameras, screens, logs, analytics, referrers, screenshots, and shoulder surfing. The Kiosk creator SHOULD set a short expiration on the signed payload and SHOULD stop displaying or accepting a pointer after the corresponding request expires.

The fragment form `#r=...` has the useful property that ordinary HTTP requests to the submit page do not send the fragment to the web server. Implementations MAY use another pointer transport only if it preserves the same privacy and binding properties: the pointer resolves to an encrypted request envelope, the relay sees no plaintext clinical content, the pointer identifies the request with sufficient entropy, and the phone can bind the pointer to the decrypted payload before re-entering §8.

## Organizer notes

**Strengths.** This draft follows the active TypeScript implementation: compact ES256 JWS with `typ="smart-health-checkin+kiosk-request+jws"`, direct `smartRequest` embedding, P-256 ECDH + HKDF-SHA-256 + AES-256-GCM request encryption, `requestId` as HKDF salt and AES-GCM AAD, `application/smart-health-checkin-kiosk-request+jws+aesgcm`, InstantDB request rows containing only `requestId` and `encryptedRequest`, and pointer URL `#r=<requestId>`. It keeps the kiosk flow as a wrapper around §8 and avoids request-profile wrappers, “all of the above” labels, IPS examples, or alternate clinical request semantics.

**Caveats.** The active code uses demo `iss` and `aud` constants. This draft preserves them as active values but flags that production profiles need non-demo issuer/audience conventions. The active JWS canonicalization is a local recursive key sort rather than a named RFC profile such as JCS; the draft describes behavior without inventing a registered canonicalization name. The algorithm label `ECDH-P256+HKDF-SHA256+AES-GCM` is implementation-defined text, while the envelope also says `enc: "A256GCM"`.

**Open issues.** Later conformance work should decide whether to normatively require 32 random bytes for `requestId`, 96-bit IVs, 10-minute TTLs, 60-second future clock skew, 25 MiB limits, exact JSON canonicalization behavior, and the demo media type / JWS `typ` strings as permanent registry entries. It should also decide how production creator key distribution, key rotation, issuer/audience naming, and provider identifiers are registered.

**Downstream dependencies.** T4.B (§9.7) must specify pointer fetch, request-envelope decryption, creator key trust, JWS verification, expiration checks, `requestId` binding, and re-entry into §8 using `smartRequest`. T4.C (§§9.8-9.11) must specify phone-to-desktop encrypted submission, Completion display processing, replay/single-use behavior, provider abstraction, and relay abuse handling. T4.D and later fixture work should align CDDL and byte vectors with these field names and with any final canonicalization decision.
