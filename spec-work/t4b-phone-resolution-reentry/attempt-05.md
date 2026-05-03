## 9.7 Phone resolution and re-entry into §8

This section defines the phone-side processing that occurs after the Holder opens a Pointer URL from §9.6. The Phone presenter resolves the pointer, retrieves and opens the encrypted kiosk request, verifies the Kiosk creator's signed payload, validates the embedded SMART request, and then runs the base same-device `org-iso-mdoc` flow from §8 on the phone.

The kiosk flow does not define a second clinical presentation protocol. After validation, the Phone presenter acts as the same-device Verifier for §8 using the embedded `smartRequest`. Response encryption, submission, Completion display processing, replay rules, and provider abstraction after the phone obtains a SMART response are defined in §§9.8-9.12.

### 9.7.1 Pointer parsing and request lookup

A Phone presenter that supports the active pointer profile SHALL parse the URL fragment as `application/x-www-form-urlencoded` parameters and SHALL read fragment parameter `r` as the kiosk wrapper request id. The Phone presenter SHALL fail safely if `r` is absent, empty, malformed for the deployment's request-id policy, or otherwise unavailable to the phone page or app.

The value of `r` is a bearer locator for encrypted request state. It is not the SMART request, not the SMART request `id`, not Holder consent, not a requester identity credential, and not a same-device `DeviceRequest`.

The Phone presenter SHALL use the parsed wrapper request id to fetch or read the provider request row, encrypted request envelope, or equivalent provider object for that request id. A Submission service or relay that implements this lookup function SHALL return either the encrypted request state associated with the requested wrapper id or an explicit not-found/error outcome. The Submission service SHALL NOT require plaintext `KioskRequestPayload` or plaintext `smartRequest` access to perform this lookup.

For the active provider row shape, the row contains:

```json
{
  "requestId": "<kiosk-wrapper-request-id>",
  "encryptedRequest": { "...": "EncryptedKioskRequest" }
}
```

A Phone presenter SHALL treat a missing row, missing `encryptedRequest`, or provider read failure as a kiosk request resolution failure.

### 9.7.2 Request-id binding before clinical use

Before using any embedded SMART request, the Phone presenter SHALL bind all available wrapper identifiers by exact string equality:

1. the Pointer URL fragment value `r`;
2. the provider request row `requestId`, when the provider row exposes one;
3. `EncryptedKioskRequest.requestId`; and
4. the decrypted and verified `KioskRequestPayload.requestId`.

If any present value differs, the Phone presenter SHALL reject the kiosk request and SHALL NOT invoke the Wallet for the embedded `smartRequest`. This binding prevents a relay, stale row, copied envelope, or substituted signed payload from confusing one kiosk session with another.

The kiosk wrapper `requestId` remains distinct from `KioskRequestPayload.smartRequest.id`. The Phone presenter, Wallet/Responder, Verifier, Requester, Submission service, and Completion display SHALL NOT substitute the kiosk wrapper `requestId` for the SMART request `id`, or substitute the SMART request `id` for the kiosk wrapper `requestId`.

### 9.7.3 Opening the encrypted request envelope

A Phone presenter SHALL validate the `EncryptedKioskRequest` envelope shape before decryption. For this profile it SHALL require:

- `v` equal to numeric `1`;
- `alg` equal to `ECDH-P256+HKDF-SHA256+AES-GCM`;
- `enc` equal to `A256GCM`;
- `contentType` equal to `application/smart-health-checkin-kiosk-request+jws+aesgcm`;
- non-empty `requestId`, `creatorKeyId`, `recipientKeyId`, `iv`, and `ciphertext` string values; and
- a P-256 `ephemeralPublicKeyJwk` usable for the request-envelope suite.

The Phone presenter SHALL decrypt the envelope using request-opening private key material authorized by the deployment profile for `EncryptedKioskRequest.recipientKeyId`. The corresponding public key is the key selected by the Kiosk creator in `KioskRequestPayload.encryptRequestTo.keyId` and represented by the envelope `recipientKeyId`. A deployment that treats the Submission service as untrusted SHALL NOT make the untrusted relay the only component capable of seeing plaintext kiosk requests.

For this profile, decryption uses the request-envelope suite from §9.3: P-256 ECDH, HKDF-SHA-256, AES-256-GCM, `salt = utf8(requestId)`, `info = utf8("smart-health-checkin-kiosk-request-v1")`, and AES-GCM additional authenticated data `utf8(requestId)`. The plaintext SHALL be interpreted as a UTF-8 compact kiosk request JWS. A Phone presenter SHALL treat base64url decoding errors, invalid P-256 key material, AES-GCM authentication failure, UTF-8 decoding failure, or non-JWS plaintext as decryption/opening failure.

A Phone presenter SHALL check expiration before clinical use. It MAY reject an envelope whose `expiresAt` has passed before attempting decryption as an early defense-in-depth check, and SHALL reject the request if the verified signed payload is expired under §9.7.4.

### 9.7.4 Verifying and validating the signed kiosk request

After decrypting the envelope, the Phone presenter SHALL verify the compact kiosk request JWS before relying on any payload member, including `smartRequest` or display text.

The Phone presenter SHALL require a compact JWS with exactly three non-empty parts. It SHALL parse the protected header and require:

- `alg` equal to `ES256`;
- `typ` equal to `smart-health-checkin+kiosk-request+jws`; and
- `kid` as a non-empty creator signing-key identifier.

The Phone presenter SHALL resolve `kid` to a trusted Kiosk creator public key under deployment policy and SHALL reject the request if the key is unknown, disabled, expired, revoked, or otherwise unacceptable. It SHALL verify the ES256 signature over the original compact JWS signing input. It SHALL reject a bad signature, an unsupported or missing `typ`, an unsupported algorithm, or a `kid` that is not trusted for kiosk request creation.

The Phone presenter SHALL parse the verified payload as a `KioskRequestPayload` and SHALL validate at least the following before invoking §8:

1. `v` is numeric `1`.
2. `requestId` matches the Pointer URL, provider row when present, and encrypted envelope under §9.7.2.
3. `iss` is acceptable for a Kiosk creator under deployment policy.
4. `aud` is acceptable for the request-opening or phone-presenter trust context under deployment policy.
5. `createdAt` and `expiresAt` are numeric millisecond timestamps, `expiresAt` is later than `createdAt`, the request has not expired, and `createdAt` is not unacceptably far in the future for the deployment's clock-skew policy.
6. `submitTo` identifies the provider/backend context from which the request was read. For the active provider shape, `submitTo.backend` is `instantdb` and `submitTo.appId` matches the configured provider application id.
7. `encryptRequestTo.alg` is `ECDH-P256+HKDF-SHA256+AES-GCM`, and `encryptRequestTo.keyId` is consistent with the envelope `recipientKeyId` and the request-opening key used.
8. `encryptResponseTo.alg`, if processed by this component before handoff to §9.8, is a supported response-submission algorithm label. Its operational use is defined in §9.8.
9. `constraints` contains only supported limits for this profile, including a `maxPlaintextBytes` value that the implementation is willing to enforce in later response-submission processing.
10. `minter.keyId`, when present as in the active profile, is consistent with the JWS protected-header `kid` or otherwise acceptable under deployment policy.
11. `smartRequest` is present as a JSON object and validates as a `SmartHealthCheckinRequest` under §5.

A Phone presenter SHALL reject the request if any required payload field is missing, malformed, unsupported, inconsistent with the envelope/header/provider context, or unacceptable under deployment policy.

Kiosk creator signatures authenticate the wrapper payload under the deployment's creator-key policy. They do not by themselves prove clinical-source provenance for later returned Artifacts, do not establish Holder consent, and do not make SMART request display fields authenticated requester identity.

### 9.7.5 Validating and using the embedded SMART request

The Phone presenter SHALL validate `KioskRequestPayload.smartRequest` as the complete SMART request object defined in §5. The signed payload embeds the SMART request directly; the Phone presenter SHALL NOT look for a `requestProfile`, preset id, IPS shortcut, broad topic label, SDK helper object, or “all of the above” wrapper in place of `smartRequest`.

The Phone presenter SHALL keep these identifiers separate:

- `KioskRequestPayload.requestId` is the kiosk wrapper id used for pointer lookup, request-envelope binding, and later kiosk-session correlation.
- `KioskRequestPayload.smartRequest.id` is the SMART request id. Under §6, a valid SMART response later echoes this value as `SmartHealthCheckinResponse.requestId`.

If the embedded SMART request is absent, not a JSON object, invalid under §5, or inconsistent with implementation or deployment policy, the Phone presenter SHALL fail safely and SHALL NOT invoke the Wallet for that request.

The Phone presenter MAY display Holder-facing context from the validated SMART request, such as `purpose`, item `title`, item `summary`, and requested item list, to help the Holder understand what will be presented to the Wallet. When doing so, the Phone presenter SHALL preserve the trust boundary from §§5 and 7: these fields are display context from the SMART request, not authenticated requester identity unless independently established by origin, reader authentication, creator trust policy, or other deployment trust evidence outside the SMART request body.

### 9.7.6 Re-entry into the same-device `org-iso-mdoc` flow

After successful pointer resolution, envelope opening, JWS verification, wrapper validation, and SMART request validation, the Phone presenter SHALL re-enter the base same-device presentation flow defined in §8 using the embedded `smartRequest` as the SMART request.

For this re-entry, the Phone presenter acts as the same-device Verifier on the phone. It SHALL construct the §8 `org-iso-mdoc` request on the phone after validation, including the §8 `ItemsRequest`, `DeviceRequest`, `encryptionInfo`, `SessionTranscript` inputs, and any optional `readerAuth` supported or required by the deployment profile. The Phone presenter SHALL carry the SMART request only in `ItemsRequest.requestInfo["org.smarthealthit.checkin.request"]` as specified by §8.

The Pointer URL, QR code, provider request row, and `EncryptedKioskRequest` do not contain the §8 `DeviceRequest`, §8 `encryptionInfo`, §8 `SessionTranscript`, HPKE response ciphertext, Wallet `DeviceResponse`, Digital Credentials API response, or SMART response. Those same-device artifacts are generated or received on the phone as part of the §8 invocation after kiosk request validation.

The Wallet/Responder processes the §8 request according to §8.4, performs Holder review and response construction according to §§5-6 and Wallet policy, and returns a same-device presentation response to the Phone presenter. The Phone presenter then proceeds to the response-submission handoff defined in §9.8. This section does not define response-submission plaintext shape, encryption to `encryptResponseTo`, provider write behavior, completion display processing, replay state, or desktop completion status.

### 9.7.7 Failure handling

A Phone presenter SHALL fail safely when kiosk request resolution or same-device re-entry cannot proceed. At a minimum, the Phone presenter SHALL distinguish failures sufficiently for local handling, user messaging, telemetry minimization, and troubleshooting without exposing plaintext clinical content or secrets in logs.

The following conditions are kiosk request resolution failures and SHALL prevent Wallet invocation for the affected request:

- missing, empty, malformed, or unsupported Pointer URL `r` parameter;
- provider unavailable, provider not configured, missing request row, or missing encrypted request envelope;
- row, envelope, pointer, or signed-payload `requestId` mismatch;
- unsupported envelope version, algorithm label, encryption label, content type, key id, or envelope shape;
- expired request, unacceptable `createdAt`, or other freshness-policy failure;
- request-opening private key unavailable or not authorized for `recipientKeyId`;
- request-envelope decryption or authentication failure;
- invalid compact JWS syntax, unsupported JWS header, untrusted creator key, or failed JWS signature;
- unacceptable `iss`, `aud`, `submitTo`, `minter`, `encryptRequestTo`, `encryptResponseTo`, or `constraints` under deployment policy;
- missing or invalid embedded `smartRequest`; and
- inability to construct or invoke the same-device §8 flow, including unavailable browser, User Agent, Credential Manager, Wallet, or Digital Credentials API support.

A Phone presenter SHOULD present a concise recoverable error to the Holder when recovery is possible, such as rescanning a current QR code, using a supported browser, or returning to the kiosk. It SHOULD avoid displaying raw cryptographic internals, keys, ciphertext, plaintext SMART request JSON beyond intentional Holder-facing request context, or clinical response content in error surfaces. A Submission service MAY report not-found, expired, rate-limited, or unavailable status at a high level, but it is not trusted to decide clinical validity or requester identity.

### Organizer notes

**Strengths.** This draft keeps T4.B narrowly scoped to phone-side pointer resolution, encrypted request opening, creator-JWS verification, SMART request validation, and re-entry into §8. It preserves the accepted T4.A field names and pointer-only QR model, states the four-way `requestId` binding, and explicitly separates the kiosk wrapper id from `smartRequest.id`.

**Caveats.** The active demo names the request-opening key as a submission-service key and ships demo private key material to the browser. This draft states the deployable requirement in terms of request-opening key material and notes that an untrusted relay must not be the plaintext access boundary. Active code validates the SMART request during JWS payload validation and again in the phone UI; the normative text treats that as one required validation outcome rather than prescribing an SDK call pattern.

**Open issues.** Later conformance work should decide exact request-id syntax, clock-skew windows, creator-key registry format, issuer/audience registry values, whether `constraints.maxPlaintextBytes` has a profile-wide maximum in core text, and how Appendix C/DDDL fixtures name the kiosk wrapper validation steps.

**Downstream dependencies.** T4.C must define response-submission plaintext, encryption using signed `encryptResponseTo` metadata, submission rows/blobs, Completion display validation, replay/single-use handling, and provider abstraction. T4.D must align kiosk schemas, CDDL, and vectors with the envelope/JWS/header/payload validation rules in this section. Security and privacy sections should revisit QR substitution, pointer guessing, metadata leakage, demo key custody, logging, and UI wording.
